/**
 * app.js  —  Advanced M&E Portfolio frontend
 *
 * Data source:
 * - Supabase table: public.portfolio_data (id=1)
 * - Realtime subscription for automatic UI refresh
 */

const SUPABASE_URL      = "https://pzqztshidwvesiqhyaju.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cXp0c2hpZHd2ZXNpcWh5YWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjExNTksImV4cCI6MjA5MDI5NzE1OX0.uLr8DkUCH-VMdXdPsamzotgYF2wKr3raFjiNFANzeKg";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
};

const chartRegistry = {
  sector: null,
  country: null,
  tool: null,
  trajectory: null,
};

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
  renderInfographics(d);

  $("loading-banner").classList.add("hidden");
  $("portfolio-content").classList.remove("hidden");
}

function renderStats(d) {
  const grid = $("stats-grid");
  grid.innerHTML = "";

  const stats = [
    { icon: "👥", value: formatNumber(d.total_beneficiaries_reached), label: "Beneficiaries Reached" },
    { icon: "🌍", value: (d.geographic_countries || []).length, label: "Countries" },
    { icon: "📋", value: (d.summary_STAR_studies || []).length, label: "Case Studies" },
    { icon: "🔧", value: (d.tool_expertise || []).length, label: "Tools Mastered" },
    { icon: "🏷", value: (d.thematic_areas || []).length, label: "Thematic Areas" },
    { icon: "🤝", value: (d.donor_list || []).length, label: "Partners & Donors" },
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

function renderThematic(areas) {
  const wrap = $("thematic-areas");
  wrap.innerHTML = "";
  if (!areas.length) {
    wrap.innerHTML = "<p class='empty'>No thematic areas recorded yet.</p>";
    return;
  }
  areas.forEach((area) => wrap.appendChild(el("span", "tag", esc(area))));
}

function renderStudies(studies) {
  const wrap = $("star-studies");
  wrap.innerHTML = "";
  if (!studies.length) {
    wrap.innerHTML = "<p class='empty'>No case studies recorded yet.</p>";
    return;
  }

  studies.forEach((s) => {
    const card = el("div", "study-card");
    card.innerHTML = `
      <div class="study-card-header">
        <h3>${esc(s.title || "Evaluation Study")}</h3>
      </div>
      <div class="study-card-body">
        ${starRow("S", s.situation || s.Situation || "")}
        ${starRow("T", s.task || s.Task || "")}
        ${starRow("A", s.action || s.Action || "")}
        ${starRow("R", s.result || s.Result || "")}
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

function renderCountries(countries) {
  const wrap = $("geo-countries");
  wrap.innerHTML = "";
  if (!countries.length) {
    wrap.innerHTML = "<p class='empty'>No countries recorded yet.</p>";
    return;
  }
  countries.forEach((country) => {
    const pill = el("div", "country-pill");
    pill.innerHTML = `<span class="country-flag">🌐</span><span>${esc(country)}</span>`;
    wrap.appendChild(pill);
  });
}

function renderTools(tools) {
  const wrap = $("tool-expertise");
  wrap.innerHTML = "";
  if (!tools.length) {
    wrap.innerHTML = "<p class='empty'>No tools recorded yet.</p>";
    return;
  }
  tools.forEach((tool) => wrap.appendChild(el("span", "tool-badge", esc(tool))));
}

function renderDonors(donors) {
  const wrap = $("donor-list");
  wrap.innerHTML = "";
  if (!donors.length) {
    wrap.innerHTML = "<p class='empty'>No partners recorded yet.</p>";
    return;
  }
  donors.forEach((donor) => {
    const card = el("div", "donor-card");
    card.innerHTML = `<span class="donor-icon">🏛</span><span>${esc(donor)}</span>`;
    wrap.appendChild(card);
  });
}

function renderMeta(updatedAt) {
  if (!updatedAt) return;
  const d = new Date(updatedAt);
  const formatted = d.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
  const ref = $("last-updated");
  ref.textContent = `Portfolio last refreshed by AI pipeline: ${formatted}`;
  ref.classList.remove("hidden");
}

function renderInfographics(d) {
  const themes = d.thematic_areas || [];
  const countries = d.geographic_countries || [];
  const tools = d.tool_expertise || [];
  const total = Number(d.total_beneficiaries_reached || 0);

  drawSectorChart(themes);
  drawCountryChart(countries);
  drawToolChart(tools);
  drawTrajectoryChart(total);
}

function drawSectorChart(themes) {
  const labels = themes.length ? themes : ["No data yet"];
  const values = labels.map(() => 1);

  chartRegistry.sector = renderOrUpdateChart(chartRegistry.sector, "sectorChart", {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#0ea5e9", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"],
        borderWidth: 0,
      }],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      maintainAspectRatio: false,
      animation: { duration: 700 },
    },
  });
}

function drawCountryChart(countries) {
  const labels = countries.length ? countries : ["No countries"];
  const values = labels.map(() => 1);

  chartRegistry.country = renderOrUpdateChart(chartRegistry.country, "countryChart", {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Programme Presence",
        data: values,
        backgroundColor: "#22c55e",
        borderRadius: 6,
      }],
    },
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
      },
      plugins: { legend: { display: false } },
      maintainAspectRatio: false,
      animation: { duration: 700 },
    },
  });
}

function drawToolChart(tools) {
  const labels = tools.length ? tools.slice(0, 8) : ["No tools"];
  const values = labels.map((_, index) => Math.min(95, 55 + index * 7));

  chartRegistry.tool = renderOrUpdateChart(chartRegistry.tool, "toolChart", {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Capability Index",
        data: values,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.22)",
        pointBackgroundColor: "#0ea5e9",
      }],
    },
    options: {
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { stepSize: 20 },
        },
      },
      maintainAspectRatio: false,
      animation: { duration: 700 },
    },
  });
}

function drawTrajectoryChart(totalBeneficiaries) {
  const total = Number(totalBeneficiaries || 0);
  const q1 = Math.round(total * 0.22);
  const q2 = Math.round(total * 0.45);
  const q3 = Math.round(total * 0.71);
  const q4 = total;

  chartRegistry.trajectory = renderOrUpdateChart(chartRegistry.trajectory, "trajectoryChart", {
    type: "line",
    data: {
      labels: ["Q1", "Q2", "Q3", "Q4"],
      datasets: [{
        label: "Estimated Cumulative Reach",
        data: [q1, q2, q3, q4],
        borderColor: "#1d4ed8",
        backgroundColor: "rgba(37,99,235,0.16)",
        fill: true,
        tension: 0.36,
      }],
    },
    options: {
      scales: { y: { beginAtZero: true } },
      maintainAspectRatio: false,
      animation: { duration: 700 },
    },
  });
}

function renderOrUpdateChart(existing, canvasId, config) {
  const ctx = $(canvasId)?.getContext("2d");
  if (!ctx || typeof Chart === "undefined") return existing;
  if (existing) existing.destroy();
  return new Chart(ctx, config);
}

function subscribeRealtime() {
  db.channel("portfolio-live")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "portfolio_data", filter: "id=eq.1" },
      (payload) => {
        console.log("[Realtime] Portfolio update received.");
        render(payload.new.data, payload.new.updated_at);
      }
    )
    .subscribe();
}

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

$("year").textContent = new Date().getFullYear();

loadPortfolio();
subscribeRealtime();
