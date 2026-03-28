import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anon);

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. App will run in view-only mode.");
}

export const supabase = hasSupabaseConfig ? createClient(url, anon) : null;
export const BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "raw-documents";
