const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const selectedFilesEl = document.getElementById("selected-files");
const uploadBtn = document.getElementById("upload-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const refreshBtn = document.getElementById("refresh-files");
const uploadStatus = document.getElementById("upload-status");
const analyzeStatus = document.getElementById("analyze-status");
const filesTbody = document.getElementById("files-tbody");

// If dashboard is hosted separately from admin_server.py, set this in browser console:
//   window.ADMIN_API_BASE = "https://your-admin-api-domain"
const API_BASE = (window.ADMIN_API_BASE || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE}${path}`;

let selectedFiles = [];

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function setStep(stepName, state) {
  const step = document.querySelector(`.step[data-step='${stepName}']`);
  if (!step) return;
  step.classList.remove("pending", "active", "done", "failed");
  step.classList.add(state);
}

function resetSteps() {
  ["upload", "ingest", "ai", "publish"].forEach((s) => setStep(s, "pending"));
}

function renderSelectedFiles() {
  selectedFilesEl.innerHTML = "";
  if (!selectedFiles.length) {
    uploadBtn.disabled = true;
    return;
  }

  selectedFiles.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = `${f.name} (${formatSize(f.size)})`;
    selectedFilesEl.appendChild(li);
  });
  uploadBtn.disabled = false;
}

function collectFiles(files) {
  selectedFiles = [...files];
  renderSelectedFiles();
}

fileInput.addEventListener("change", () => collectFiles(fileInput.files));

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragging");
  collectFiles(e.dataTransfer.files);
});

uploadBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;

  const body = new FormData();
  selectedFiles.forEach((f) => body.append("files", f));

  uploadBtn.disabled = true;
  uploadStatus.textContent = "Uploading files...";
  setStep("upload", "active");

  try {
    const res = await fetch(apiUrl("/api/upload"), { method: "POST", body });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Upload failed.");
    }

    uploadStatus.textContent = `Uploaded ${json.count} file(s) successfully.`;
    setStep("upload", "done");
    selectedFiles = [];
    fileInput.value = "";
    renderSelectedFiles();
    await loadFilesTable();
  } catch (err) {
    uploadStatus.textContent = `Upload error: ${err.message}`;
    setStep("upload", "failed");
  } finally {
    uploadBtn.disabled = false;
  }
});

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  analyzeStatus.textContent = "Running ingestion and AI synthesis...";

  setStep("ingest", "active");

  try {
    const res = await fetch(apiUrl("/api/analyze"), { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Analysis failed.");
    }

    if (!json.updated) {
      setStep("ingest", "done");
      analyzeStatus.textContent = "No new files to analyze."
      return;
    }

    setStep("ingest", "done");
    setStep("ai", "done");
    setStep("publish", "done");
    analyzeStatus.textContent = `Done. Processed ${json.processed_files} file(s) and published to portfolio.`;
    await loadFilesTable();
  } catch (err) {
    ["ingest", "ai", "publish"].forEach((s) => {
      const stepEl = document.querySelector(`.step[data-step='${s}']`);
      if (stepEl && stepEl.classList.contains("active")) {
        setStep(s, "failed");
      }
    });
    analyzeStatus.textContent = `Analyze error: ${err.message}`;
  } finally {
    analyzeBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", loadFilesTable);

async function loadFilesTable() {
  filesTbody.innerHTML = "<tr><td colspan='3' class='empty'>Loading files...</td></tr>";
  try {
    const res = await fetch(apiUrl("/api/files"));
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Could not load files.");
    }

    filesTbody.innerHTML = "";
    if (!json.files.length) {
      filesTbody.innerHTML = "<tr><td colspan='3' class='empty'>No files found in bucket.</td></tr>";
      return;
    }

    json.files.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.name}</td>
        <td>${formatSize(Number(f.size || 0))}</td>
        <td>
          <span class="badge ${f.processed ? "processed" : "pending"}">
            ${f.processed ? "Processed" : "Pending"}
          </span>
        </td>
      `;
      filesTbody.appendChild(tr);
    });
  } catch (err) {
    filesTbody.innerHTML = `<tr><td colspan='3' class='empty'>${err.message}</td></tr>`;
  }
}

resetSteps();
loadFilesTable();
