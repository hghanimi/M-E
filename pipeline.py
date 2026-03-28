"""
pipeline.py
===========
M&E Portfolio AI Pipeline — Supabase Storage + OpenAI GPT-4 + Cloudflare Pages

Full-stack automated flow:
    1. You upload raw M&E files to a private Supabase Storage bucket.
    2. Module 1 (Ingestion)  — pipeline downloads only new/unprocessed files.
    3. Module 2 (AI Synthesis) — GPT-4 anonymises and extracts portfolio data.
    4. Module 3 (Output)     — privacy-checked JSON is upserted to Supabase DB.
    5. Cloudflare Pages frontend reads the DB via Supabase JS and auto-updates
       in real-time through Supabase Realtime — no redeploy needed.

PRIVACY GUARANTEE:
    Raw ingested content is NEVER persisted anywhere.
    Only the anonymised, aggregated JSON from the GPT-4 synthesis step is
    stored in the Supabase database that the public portfolio website reads.

SETUP (one-time):
    1. cp .env.example .env  — then fill in all values
    2. Run schema.sql in your Supabase SQL Editor
    3. Create a private storage bucket named  "raw-documents"  in Supabase
    4. pip install -r requirements.txt
    5. python pipeline.py             <- mock mode, single run (default)
       python pipeline.py --live      <- single run against Supabase Storage
       python pipeline.py --watch     <- watch mode (mock, polls every N secs)
       python pipeline.py --live --watch  <- production watch mode
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # reads .env from the project root

# ---------------------------------------------------------------------------
# Dependency guards
# ---------------------------------------------------------------------------
try:
    import openai
except ImportError:
    sys.exit("[ERROR] 'openai' not installed.  Run:  pip install -r requirements.txt")

try:
    import requests
except ImportError:
    sys.exit("[ERROR] 'requests' not installed.  Run:  pip install -r requirements.txt")

# ============================================================
#   CONFIGURATION  — all secrets live in .env, never hard-coded
# ============================================================

OPENAI_API_KEY       = os.getenv("OPENAI_API_KEY", "")
SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # server-side only!
STORAGE_BUCKET       = os.getenv("SUPABASE_STORAGE_BUCKET", "raw-documents")
POLL_INTERVAL_SECS   = int(os.getenv("POLL_INTERVAL_SECS", "300"))  # 5-min default

MOCK_TRANSCRIPT_PATH = "dummy_interview_transcript.txt"

# ---------------------------------------------------------------------------
# PRIVACY SENTINEL
# Extend this tuple with any term that must NEVER appear in public output.
# ---------------------------------------------------------------------------
_PRIVACY_SENTINEL_TERMS: tuple[str, ...] = (
    "confidential",
    "private",
    "name:",
    "patient id",
    "site location:",
    "bene-ke-",   # respondent codes used in raw transcripts
    "eval-0",     # evaluator codes used in raw transcripts
)


# ===========================================================================
#   MODULE 1 — INGESTION  (Supabase Storage)
# ===========================================================================


def _require_supabase_config() -> None:
    """
    Validate that the live Supabase credentials are present.

    The service-role key bypasses Row Level Security (RLS) so the pipeline can
    read private storage buckets and write to protected tables.

    Raises
    ------
    ValueError
        If SUPABASE_URL or SUPABASE_SERVICE_KEY are missing from .env.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env\n"
            "Copy .env.example to .env and fill in your Supabase project values."
        )


def _supabase_headers() -> dict[str, str]:
    """
    Build authenticated headers for Supabase REST and Storage endpoints.

    Returns
    -------
    dict[str, str]
        Headers containing the project API key and bearer token.
    """
    _require_supabase_config()
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }


def _fetch_processed_files() -> set[str]:
    """
    Read the set of previously ingested file names from Supabase.

    Returns
    -------
    set[str]
        File names already present in the ``processed_files`` table.
    """
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/processed_files",
        headers={**_supabase_headers(), "Accept": "application/json"},
        params={"select": "file_name"},
        timeout=30,
    )
    response.raise_for_status()
    rows = response.json()
    return {row["file_name"] for row in rows}


def _mark_file_processed(file_name: str) -> None:
    """
    Insert a file marker into the ``processed_files`` table.

    Parameters
    ----------
    file_name : str
        Name of the storage object that was successfully downloaded.
    """
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/processed_files",
        headers={
            **_supabase_headers(),
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
        json={
            "file_name": file_name,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        },
        timeout=30,
    )
    response.raise_for_status()


def _list_storage_objects(bucket: str) -> list[dict]:
    """
    List objects in the private Supabase Storage bucket root.

    Parameters
    ----------
    bucket : str
        Supabase storage bucket name.

    Returns
    -------
    list[dict]
        Raw object metadata returned by the storage API.
    """
    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/list/{bucket}",
        headers={**_supabase_headers(), "Content-Type": "application/json"},
        json={
            "prefix": "",
            "limit": 1000,
            "offset": 0,
            "sortBy": {"column": "name", "order": "asc"},
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def _download_storage_object(bucket: str, file_name: str) -> bytes:
    """
    Download one private object from Supabase Storage.

    Parameters
    ----------
    bucket : str
        Supabase storage bucket name.
    file_name : str
        Path/name of the object inside the bucket.

    Returns
    -------
    bytes
        Raw file bytes returned by the storage API.
    """
    response = requests.get(
        f"{SUPABASE_URL}/storage/v1/object/authenticated/{bucket}/{file_name}",
        headers=_supabase_headers(),
        timeout=60,
    )
    response.raise_for_status()
    return response.content


def fetch_data_from_supabase(
    bucket: str = STORAGE_BUCKET,
) -> list[str]:
    """
    Download every unprocessed file from the Supabase Storage *bucket*.

    Workflow
    --------
    1. Lists all objects in the bucket root.
    2. Queries the ``processed_files`` table to skip already-handled files.
    3. Downloads each new file and decodes its text.
    4. Inserts the file name into ``processed_files`` so it is skipped
       on the next pipeline run.

    Parameters
    ----------
    bucket : str
        Storage bucket name; defaults to ``STORAGE_BUCKET`` from .env.

    Returns
    -------
    list[str]
        Plain-text contents of each new file.  Empty list if nothing is new.
    """
    objects = _list_storage_objects(bucket)
    if not objects:
        print("[Module 1] Bucket is empty.")
        return []

    all_names: list[str] = [
        obj["name"]
        for obj in objects
        if obj.get("name") and not obj["name"].endswith("/")
    ]

    processed = _fetch_processed_files()

    new_names = [n for n in all_names if n not in processed]
    if not new_names:
        print("[Module 1] No new files to process.")
        return []

    print(f"[Module 1] {len(new_names)} new file(s) found: {new_names}")

    raw_texts: list[str] = []
    for name in new_names:
        raw_bytes = _download_storage_object(bucket, name)
        raw_texts.append(raw_bytes.decode("utf-8", errors="replace"))

        _mark_file_processed(name)
        print(f"[Module 1] Downloaded & marked processed: {name}")

    return raw_texts


def get_mock_raw_data(file_path: str = MOCK_TRANSCRIPT_PATH) -> list[str]:
    """
    Fallback ingestion for local development — reads a single local file.

    Returns the same structure as ``fetch_data_from_supabase`` so the
    rest of the pipeline runs identically in both modes.

    Parameters
    ----------
    file_path : str
        Path to the local dummy transcript file.

    Returns
    -------
    list[str]
        Single-element list containing the file's full text.

    Raises
    ------
    FileNotFoundError
        If *file_path* does not exist.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(
            f"Mock file not found: '{file_path}'. "
            "Ensure 'dummy_interview_transcript.txt' is in the project root."
        )
    with open(file_path, "r", encoding="utf-8") as fh:
        content = fh.read()
    print(f"[Module 1] MOCK — loaded '{file_path}' ({len(content)} chars).")
    return [content]


# ===========================================================================
#   MODULE 2 — AI SYNTHESIS
# ===========================================================================

# Synthesis prompt — kept as a module-level constant so it is easy to
# version-control and update independently of the pipeline logic.
_SYNTHESIS_PROMPT: str = (
    "You are an expert Monitoring & Evaluation (M&E) Analyst synthesizing "
    "sensitive raw qualitative and quantitative data. Your task is to extract "
    "only high-level, aggregated metrics and non-confidential themes for a "
    "professional portfolio website. STRICTLY OBSERVE BENEFICIARY PRIVACY. "
    "Do not include individual names, specific site locations, sensitive "
    "anecdotes, or any data marked confidential. "
    "Your final output must be structured JSON.\n\n"
    "Extract and populate ONLY these JSON keys:\n"
    "  total_beneficiaries_reached: [Sum an anonymized large number]\n"
    "  thematic_areas: [List of broad sectors, e.g., Public Health, Gender]\n"
    "  summary_STAR_studies: [STAR method summaries of 2 main studies]\n"
    "  geographic_countries: [List of distinct countries]\n"
    "  tool_expertise: [List of software tools used, e.g., Kobo]\n"
    "  donor_list: [List of anonymized or public partners]\n\n"
    "Return ONLY valid JSON — no markdown fences, no extra commentary."
)


def analyze_raw_data(raw_texts: list[str], api_key: str = OPENAI_API_KEY) -> dict:
    """
    Send *raw_texts* to OpenAI GPT-4 and return a structured portfolio dict.

    The model is instructed (via ``_SYNTHESIS_PROMPT``) to:
    - Aggregate metrics anonymously.
    - Strip all personally identifiable information (PII).
    - Return strict JSON conforming to the portfolio schema.

    Parameters
    ----------
    raw_texts : list[str]
        Raw document strings returned by the ingestion module.
    api_key : str
        OpenAI API key.  Defaults to the ``OPENAI_API_KEY`` constant.
        Replace the constant value at the top of this file before use.
        [INSERT_OPENAI_API_KEY_HERE]

    Returns
    -------
    dict
        Parsed JSON dictionary containing only anonymized portfolio data.

    Raises
    ------
    ValueError
        If the API response cannot be parsed as valid JSON.
    openai.AuthenticationError
        If the API key is missing or invalid.
    """
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is not set.  Add it to your .env file."
        )

    # Combine all raw documents into a single user message.
    combined_raw: str = "\n\n---DOCUMENT BREAK---\n\n".join(raw_texts)

    user_message: str = (
        "Below is the raw M&E data to synthesize:\n\n"
        f"{combined_raw}"
    )

    print("[Module 2] Sending data to OpenAI GPT-4 for synthesis …")

    client = openai.OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": _SYNTHESIS_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,  # Low temperature → more deterministic, factual output
        max_tokens=1024,
    )

    raw_response_text: str = response.choices[0].message.content.strip()

    try:
        synthesized: dict = json.loads(raw_response_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"OpenAI response was not valid JSON.\n"
            f"Raw response:\n{raw_response_text}"
        ) from exc

    print("[Module 2] AI synthesis complete. Portfolio data extracted.")
    return synthesized


# ===========================================================================
#   MODULE 3 — OUTPUT: SUPABASE UPSERT
# ===========================================================================


def _check_privacy(data: dict, raw_texts: list[str]) -> None:
    """
    Privacy firewall — must be cleared before any data is persisted.

    Checks
    ------
    1. None of ``_PRIVACY_SENTINEL_TERMS`` appear in the serialized output.
    2. No verbatim sentence longer than 40 chars from raw source is in output.

    Parameters
    ----------
    data : dict
        The synthesized portfolio dictionary to be written to the database.
    raw_texts : list[str]
        The original raw documents from the ingestion step.

    Raises
    ------
    RuntimeError
        If a violation is detected.  Nothing is written to the database.
    """
    output_serialized: str = json.dumps(data, ensure_ascii=False).lower()

    for term in _PRIVACY_SENTINEL_TERMS:
        if term.lower() in output_serialized:
            raise RuntimeError(
                f"[PRIVACY VIOLATION] Sentinel term '{term}' detected in "
                "the synthesized output. Database will NOT be updated. "
                "Adjust the synthesis prompt and re-run."
            )

    for doc in raw_texts:
        sentences = [s.strip() for s in doc.split(".") if len(s.strip()) > 40]
        for sentence in sentences:
            if sentence.lower() in output_serialized:
                raise RuntimeError(
                    "[PRIVACY VIOLATION] Verbatim raw sentence found in output.\n"
                    f"  '{sentence[:80]}...'\n"
                    "Database will NOT be updated."
                )

    print("[Module 3] Privacy check passed.")


def push_to_supabase(
    synthesized_data: dict,
    raw_texts: list[str],
) -> None:
    """
    Upsert anonymised portfolio data into the ``portfolio_data`` Supabase table.

    The table holds exactly ONE row (id = 1).  Every pipeline run overwrites it.
    The Cloudflare Pages frontend subscribes via Supabase Realtime and
    re-renders automatically — no manual redeploy or page refresh needed.

    Raw text is passed in ONLY for the privacy firewall; it is never stored.

    Parameters
    ----------
    synthesized_data : dict
        Anonymised JSON from ``analyze_raw_data``.
    raw_texts : list[str]
        Original raw content used solely for the privacy check.

    Raises
    ------
    RuntimeError
        Propagated from ``_check_privacy`` on any privacy violation.
    """
    _check_privacy(synthesized_data, raw_texts)

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/portfolio_data",
        headers={
            **_supabase_headers(),
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json={
            "id": 1,
            "data": synthesized_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        timeout=30,
    )
    response.raise_for_status()

    print("[Module 3] Upserted to Supabase  portfolio_data  table.")
    print("[Module 3] Cloudflare Pages site will auto-update via Realtime.")


# ===========================================================================
#   MAIN ENTRY POINT
# ===========================================================================


def _run_once(use_live: bool) -> bool:
    """
    Execute one full pipeline pass (Ingest → Synthesise → Push).

    Parameters
    ----------
    use_live : bool
        True  — fetch new files from Supabase Storage (production).
        False — read the local mock file (development / testing).

    Returns
    -------
    bool
        True if data was synthesised and pushed; False if nothing was new.
    """
    if use_live:
        raw_texts = fetch_data_from_supabase()
        if not raw_texts:
            return False
    else:
        raw_texts = get_mock_raw_data()

    synthesized_data = analyze_raw_data(raw_texts, api_key=OPENAI_API_KEY)

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        push_to_supabase(synthesized_data, raw_texts)
    else:
        _check_privacy(synthesized_data, raw_texts)
        with open("portfolio-data.json", "w", encoding="utf-8") as fh:
            json.dump(synthesized_data, fh, indent=2, ensure_ascii=False)
        print("[Module 3] No Supabase creds found — written to portfolio-data.json.")

    return True


def main() -> None:
    """
    CLI entry point.

    Usage::

        python pipeline.py                  # mock mode, single run
        python pipeline.py --live           # Supabase Storage, single run
        python pipeline.py --watch          # mock + polling loop
        python pipeline.py --live --watch   # production polling loop
    """
    parser = argparse.ArgumentParser(
        description="M&E Portfolio AI Pipeline — Supabase + OpenAI"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Fetch files from Supabase Storage instead of the local mock file.",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help=f"Poll continuously every {POLL_INTERVAL_SECS}s (Ctrl+C to stop).",
    )
    args = parser.parse_args()

    mode_label = "LIVE (Supabase Storage)" if args.live else "MOCK (local file)"
    run_label  = "WATCH MODE" if args.watch else "SINGLE RUN"

    print("=" * 60)
    print(f"  M&E Portfolio Pipeline  |  {run_label}")
    print(f"  Ingestion : {mode_label}")
    print("=" * 60)

    if args.watch:
        run_count = 0
        while True:
            run_count += 1
            ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n[{ts} UTC]  Run #{run_count}")
            try:
                processed = _run_once(use_live=args.live)
                print("  Pipeline complete." if processed else "  Nothing new.")
            except Exception as exc:  # noqa: BLE001
                print(f"  [ERROR] {exc}")
            print(f"  Next check in {POLL_INTERVAL_SECS}s  (Ctrl+C to stop)")
            time.sleep(POLL_INTERVAL_SECS)
    else:
        _run_once(use_live=args.live)
        print("\n" + "=" * 60)
        print("  Pipeline complete.")
        print("=" * 60)


if __name__ == "__main__":
    main()
