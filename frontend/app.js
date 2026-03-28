/**
 * app.js  —  M&E Portfolio frontend
 *
 * Connects to Supabase, fetches the single portfolio_data row,
 * renders every section, then subscribes to Supabase Realtime so the
 * page auto-updates whenever the AI pipeline pushes new data.
 *
 * REQUIRED: replace the two constants below with your own values.
 * Find them at: Supabase Dashboard → your project → Settings → API
 *   SUPABASE_URL      : https://your-project-id.supabase.co
 *   SUPABASE_ANON_KEY : the public "anon" key  (safe to include here)
 */

// ── Configuration (fill in before deploying) ────────────────────────────
const SUPABASE_URL      = "https://pzqztshidwvesiqhyaju.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cXp0c2hpZHd2ZXNpcWh5YWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjExNTksImV4cCI6MjA5MDI5NzE1OX0.uLr8DkUCH-VMdXdPsamzotgYF2wKr3raFjiNFANzeKg";
// ────────────────────────────────────────────────────────────────────────

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── DOM helpers ──────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (html) e.innerHTML   = html;
  return e;
};

// ── Fetch + render ───────────────────────────────────────────────────────
async function loadPortfolio() {
  try {
    const { data, error } = await db
      .from("portfolio_data")
      .select("data, updated_at")
      .eq("id", 1)
      .single();

    if (error) throw error;
    render(data.data, data.updated_at);
  } catch (err) {
    console.error("Portfolio load failed:", err);
    $("loading-banner").classList.add("hidden");
    $("error-banner").classList.remove("hidden");
  }
}

function render(d, updatedAt) {
  renderStats(d);
  renderThematic(d.thematic_areas || []);
  renderStudies(d.summary_STAR_studies || []);
  renderCountries(d.geographic_countries || []);
  renderTools(d.tool_expertise || []);
  renderDonors(d.donor_list || []);
  renderMeta(updatedAt);

  $("loading-banner").classList.add("hidden");
  $("portfolio-content").classList.remove("hidden");
}

// ── Stats ────────────────────────────────────────────────────────────────
function renderStats(d) {
  const grid = $("stats-grid");
  grid.innerHTML = "";

  const stats = [
    {
      icon: "👥",
      value: formatNumber(d.total_beneficiaries_reached),
      label: "Beneficiaries Reached",
    },
    {
      icon: "🌍",
      value: (d.geographic_countries || []).length,
      label: "Countries",
    },
    {
      icon: "📋",
      value: (d.summary_STAR_studies || []).length,
      label: "Case Studies",
    },
    {
      icon: "🔧",
      value: (d.tool_expertise || []).length,
      label: "Tools Mastered",
    },
    {
      icon: "🏷",
      value: (d.thematic_areas || []).length,
      label: "Thematic Areas",
    },
    {
      icon: "🤝",
      value: (d.donor_list || []).length,
      label: "Partners & Donors",
    },
  ];

  stats.forEach(({ icon, value, label }) => {
    const card = el("div", "stat-card");
    card.innerHTML = `
      <span class="stat-icon">${icon}</span>
      <span class="stat-value">${value || "—"}</span>
      <span class="stat-label">${label}</span>`;
    grid.appendChild(card);
  });
}

// ── Thematic areas ───────────────────────────────────────────────────────
function renderThematic(areas) {
  const wrap = $("thematic-areas");
  wrap.innerHTML = "";
  if (!areas.length) { wrap.innerHTML = "<p class='empty'>No thematic areas recorded yet.</p>"; return; }
  areas.forEach(a => {
    wrap.appendChild(el("span", "tag", a));
  });
}

// ── STAR studies ─────────────────────────────────────────────────────────
function renderStudies(studies) {
  const wrap = $("star-studies");
  wrap.innerHTML = "";
  if (!studies.length) { wrap.innerHTML = "<p class='empty'>No case studies recorded yet.</p>"; return; }

  studies.forEach(s => {
    const card = el("div", "study-card");
    card.innerHTML = `
      <div class="study-card-header">
        <h3>${esc(s.title || "Evaluation Study")}</h3>
      </div>
      <div class="study-card-body">
        ${starRow("S", s.situation || s.Situation || "")}
        ${starRow("T", s.task      || s.Task      || "")}
        ${starRow("A", s.action    || s.Action    || "")}
        ${starRow("R", s.result    || s.Result    || "")}
      </div>`;
    wrap.appendChild(card);
  });
}

function starRow(letter, text) {
  if (!text) return "";
  return `
    <div class="star-row">
      <span class="star-badge">${letter}</span>
      <span class="star-text">${esc(text)}</span>
    </div>`;
}

// ── Geographic countries ──────────────────────────────────────────────────
function renderCountries(countries) {
  const wrap = $("geo-countries");
  wrap.innerHTML = "";
  if (!countries.length) { wrap.innerHTML = "<p class='empty'>No countries recorded yet.</p>"; return; }

  countries.forEach(c => {
    const pill = el("div", "country-pill");
    pill.innerHTML = `<span class="country-flag">🌐</span><span>${esc(c)}</span>`;
    wrap.appendChild(pill);
  });
}

// ── Tools ────────────────────────────────────────────────────────────────
function renderTools(tools) {
  const wrap = $("tool-expertise");
  wrap.innerHTML = "";
  if (!tools.length) { wrap.innerHTML = "<p class='empty'>No tools recorded yet.</p>"; return; }
  tools.forEach(t => {
    wrap.appendChild(el("span", "tool-badge", esc(t)));
  });
}

// ── Donors ───────────────────────────────────────────────────────────────
function renderDonors(donors) {
  const wrap = $("donor-list");
  wrap.innerHTML = "";
  if (!donors.length) { wrap.innerHTML = "<p class='empty'>No partners recorded yet.</p>"; return; }
  donors.forEach(d => {
    const card = el("div", "donor-card");
    card.innerHTML = `<span class="donor-icon">🏛</span><span>${esc(d)}</span>`;
    wrap.appendChild(card);
  });
}

// ── Meta / last updated ───────────────────────────────────────────────────
function renderMeta(updatedAt) {
  if (!updatedAt) return;
  const d = new Date(updatedAt);
  const formatted = d.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const el = $("last-updated");
  el.textContent = `Portfolio last refreshed by AI pipeline: ${formatted}`;
  el.classList.remove("hidden");
}

// ── Realtime subscription ─────────────────────────────────────────────────
// When the Python pipeline upserts new data, this callback triggers and
// re-renders the entire page — no refresh needed.
function subscribeRealtime() {
  db.channel("portfolio-live")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "portfolio_data", filter: "id=eq.1" },
      (payload) => {
        console.log("[Realtime] New portfolio data received — re-rendering.");
        render(payload.new.data, payload.new.updated_at);
      }
    )
    .subscribe();
}

// ── Utilities ────────────────────────────────────────────────────────────
function formatNumber(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("en-US");
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Footer year ──────────────────────────────────────────────────────────
document.getElementById("year").textContent = new Date().getFullYear();

// ── Boot ─────────────────────────────────────────────────────────────────
loadPortfolio();
subscribeRealtime();
