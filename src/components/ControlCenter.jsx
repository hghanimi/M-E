import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Upload, PlayCircle, RefreshCcw } from "lucide-react";
import { BUCKET, hasSupabaseConfig, supabase } from "../lib/supabase";

const fnBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function ControlCenter() {
  const [files, setFiles] = useState([]);
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("Ready.");

  const authHeaders = useMemo(
    () => ({
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    }),
    []
  );

  const refreshQueue = async () => {
    if (!hasSupabaseConfig || !supabase) {
      setStatus("Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare env.");
      return;
    }

    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000, offset: 0 });
    if (error) {
      setStatus(`Queue refresh failed: ${error.message}`);
      return;
    }
    setQueue(data || []);
  };

  const uploadDocs = async () => {
    if (!files.length) return;
    if (!hasSupabaseConfig) {
      setStatus("Supabase config missing. Upload is disabled until env vars are set.");
      return;
    }

    setUploading(true);
    setStatus("Uploading files...");

    try {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));

      const res = await fetch(`${fnBase}/upload-document`, {
        method: "POST",
        headers: authHeaders,
        body,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed.");

      setStatus(`Uploaded ${json.count} file(s) to private storage.`);
      setFiles([]);
      await refreshQueue();
    } catch (err) {
      setStatus(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const runAnalysis = async () => {
    if (!hasSupabaseConfig) {
      setStatus("Supabase config missing. Analyze is disabled until env vars are set.");
      return;
    }

    setAnalyzing(true);
    setStatus("Running AI analysis and updating Supabase...");

    try {
      const res = await fetch(`${fnBase}/analyze-documents`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: BUCKET }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Analysis failed.");

      setStatus(json.message || "Portfolio updated.");
      await refreshQueue();
    } catch (err) {
      setStatus(`Analyze error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section id="impact" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-teal-400">Control Center</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-100">Upload and Analyze Workflow (No Python)</h2>
          </div>
          <button
            type="button"
            onClick={refreshQueue}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-teal-400/50 hover:text-white"
          >
            <RefreshCcw size={15} /> Refresh queue
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <label htmlFor="docs" className="mb-3 block text-sm text-slate-400">Select documents</label>
            <input
              id="docs"
              type="file"
              multiple
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {files.map((file) => (
                <span key={file.name} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {file.name}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={uploadDocs}
                disabled={uploading || !files.length}
                className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                <Upload size={15} /> Upload docs
              </button>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                <PlayCircle size={15} /> Analyze and publish
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-300">{status}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Storage Queue ({queue.length})</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {queue.length === 0 ? (
                <p className="text-sm text-slate-500">No files currently in bucket.</p>
              ) : (
                queue.map((item) => (
                  <div key={item.name} className="rounded-lg border border-slate-800 px-3 py-2">
                    <p className="truncate text-sm text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.updated_at || item.created_at || "unknown date"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
