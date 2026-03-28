const SUPABASE_URL = "https://pzqztshidwvesiqhyaju.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cXp0c2hpZHd2ZXNpcWh5YWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjExNTksImV4cCI6MjA5MDI5NzE1OX0.uLr8DkUCH-VMdXdPsamzotgYF2wKr3raFjiNFANzeKg";
const BUCKET = "raw-documents";

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("file-list");
const uploadBtn = document.getElementById("upload-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const statusEl = document.getElementById("status");

const stepUpload = document.getElementById("step-upload");
const stepAi = document.getElementById("step-ai");
const stepDb = document.getElementById("step-db");

let selectedFiles = [];

function setStatus(message) {
  statusEl.textContent = message;
}

function clearStepClasses(node) {
  node.classList.remove("active", "ok", "err");
}

function resetSteps() {
  [stepUpload, stepAi, stepDb].forEach(clearStepClasses);
}

function renderFiles() {
  fileList.innerHTML = "";
  if (!selectedFiles.length) {
    uploadBtn.disabled = true;
    return;
  }

  selectedFiles.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
    fileList.appendChild(li);
  });
  uploadBtn.disabled = false;
}

function setFiles(list) {
  selectedFiles = Array.from(list || []);
  renderFiles();
}

fileInput.addEventListener("change", (e) => setFiles(e.target.files));

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("drag");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  setFiles(e.dataTransfer.files);
});

async function uploadFiles() {
  if (!selectedFiles.length) return;

  resetSteps();
  stepUpload.classList.add("active");
  setStatus("Uploading files to Supabase...");

  const formData = new FormData();
  selectedFiles.forEach((f) => formData.append("files", f));

  try {
    const response = await fetch(`${FUNCTIONS_BASE}/upload-document`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Upload failed.");
    }

    stepUpload.classList.remove("active");
    stepUpload.classList.add("ok");
    setStatus(`Uploaded ${json.count} file(s) to bucket ${BUCKET}.`);

    selectedFiles = [];
    fileInput.value = "";
    renderFiles();
  } catch (error) {
    stepUpload.classList.remove("active");
    stepUpload.classList.add("err");
    setStatus(`Upload error: ${error.message}`);
  }
}

async function analyzeAndUpdate() {
  resetSteps();
  stepAi.classList.add("active");
  setStatus("Running AI analysis...");

  try {
    const response = await fetch(`${FUNCTIONS_BASE}/analyze-documents`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucket: BUCKET }),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || "Analyze failed.");
    }

    stepAi.classList.remove("active");
    stepAi.classList.add("ok");
    stepDb.classList.add("ok");

    setStatus(json.message || "Done. Supabase updated.");
  } catch (error) {
    stepAi.classList.remove("active");
    stepAi.classList.add("err");
    stepDb.classList.add("err");
    setStatus(`Analyze error: ${error.message}`);
  }
}

uploadBtn.addEventListener("click", uploadFiles);
analyzeBtn.addEventListener("click", analyzeAndUpdate);

setStatus("Ready.");
resetSteps();
