"""
admin_server.py
===============
Lightweight admin server for the M&E AI pipeline.

What this service provides:
1. A dashboard UI for uploading raw files.
2. API endpoints to upload files to Supabase Storage.
3. One-click trigger to run ingestion + GPT synthesis + Supabase upsert.

Security model:
- Uses server-side .env keys (OpenAI + Supabase service_role).
- Never exposes service credentials to browser clients.
- Raw file content is uploaded directly to private Supabase Storage only.
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from pipeline import analyze_raw_data, fetch_data_from_supabase, push_to_supabase

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "raw-documents")

BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = Flask(__name__)
_run_lock = threading.Lock()


def _assert_config() -> None:
    """Validate that required credentials are available in .env."""
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")


def _supabase_headers(content_type: str | None = None) -> dict[str, str]:
    """Return authenticated headers for Supabase REST/Storage requests."""
    _assert_config()
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _list_bucket_files() -> list[dict[str, Any]]:
    """List files currently stored in the configured Supabase bucket."""
    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/list/{STORAGE_BUCKET}",
        headers=_supabase_headers("application/json"),
        json={
            "prefix": "",
            "limit": 1000,
            "offset": 0,
            "sortBy": {"column": "created_at", "order": "desc"},
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def _processed_files_set() -> set[str]:
    """Return names of already-processed files from public.processed_files."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/processed_files",
        headers={**_supabase_headers(), "Accept": "application/json"},
        params={"select": "file_name"},
        timeout=30,
    )
    response.raise_for_status()
    return {row["file_name"] for row in response.json()}


def _upload_file_to_bucket(file_storage) -> str:
    """Upload one incoming browser file to private Supabase Storage."""
    safe_name = secure_filename(file_storage.filename or "uploaded.txt")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    object_name = f"{stamp}_{safe_name}"
    object_name_q = quote(object_name, safe="")

    mime = file_storage.mimetype or "text/plain"
    payload = file_storage.read()

    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{object_name_q}",
        headers={
            **_supabase_headers(mime),
            "x-upsert": "true",
        },
        data=payload,
        timeout=60,
    )
    response.raise_for_status()
    return object_name


@app.get("/")
def root_redirect():
    """Serve the admin dashboard entry page."""
    return send_from_directory(FRONTEND_DIR, "dashboard.html")


@app.get("/dashboard")
def dashboard_page():
    """Serve the dashboard explicitly at /dashboard as well."""
    return send_from_directory(FRONTEND_DIR, "dashboard.html")


@app.get("/dashboard.css")
def dashboard_css():
    """Serve dashboard CSS."""
    return send_from_directory(FRONTEND_DIR, "dashboard.css")


@app.get("/dashboard.js")
def dashboard_js():
    """Serve dashboard JS."""
    return send_from_directory(FRONTEND_DIR, "dashboard.js")


@app.get("/api/health")
def api_health():
    """Simple health endpoint for connectivity checks."""
    return jsonify({"ok": True, "service": "admin-dashboard-api"})


@app.get("/api/files")
def api_files():
    """Return uploaded files plus whether each file has been processed."""
    try:
        files = _list_bucket_files()
        processed = _processed_files_set()

        result = []
        for item in files:
            name = item.get("name")
            if not name:
                continue
            result.append(
                {
                    "name": name,
                    "size": item.get("metadata", {}).get("size") or item.get("size") or 0,
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "processed": name in processed,
                }
            )

        return jsonify({"ok": True, "files": result})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.post("/api/upload")
def api_upload():
    """Upload one or many documents from the dashboard to Supabase Storage."""
    try:
        incoming = request.files.getlist("files")
        if not incoming:
            return jsonify({"ok": False, "error": "No files were provided."}), 400

        uploaded = []
        for file_storage in incoming:
            name = _upload_file_to_bucket(file_storage)
            uploaded.append(name)

        return jsonify(
            {
                "ok": True,
                "uploaded": uploaded,
                "count": len(uploaded),
                "bucket": STORAGE_BUCKET,
            }
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.post("/api/analyze")
def api_analyze():
    """Trigger the full pipeline against new bucket files only."""
    if not _run_lock.acquire(blocking=False):
        return jsonify({"ok": False, "error": "Analysis already running."}), 409

    try:
        raw_texts = fetch_data_from_supabase()
        if not raw_texts:
            return jsonify(
                {
                    "ok": True,
                    "updated": False,
                    "message": "No new files found to analyze.",
                }
            )

        synthesized = analyze_raw_data(raw_texts)
        push_to_supabase(synthesized, raw_texts)

        return jsonify(
            {
                "ok": True,
                "updated": True,
                "processed_files": len(raw_texts),
                "message": "Analysis complete and portfolio data updated.",
            }
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 500
    finally:
        _run_lock.release()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8787, debug=False)
