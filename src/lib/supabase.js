import { createClient } from "@supabase/supabase-js";

const FALLBACK_SUPABASE_URL = "https://pzqztshidwvesiqhyaju.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cXp0c2hpZHd2ZXNpcWh5YWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjExNTksImV4cCI6MjA5MDI5NzE1OX0.uLr8DkUCH-VMdXdPsamzotgYF2wKr3raFjiNFANzeKg";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anon);

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. App will run in view-only mode.");
}

export const supabase = hasSupabaseConfig ? createClient(url, anon) : null;
export const BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "raw-documents";
