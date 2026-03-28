import OpenAI from "npm:openai@4.104.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const DEFAULT_BUCKET = Deno.env.get("STORAGE_BUCKET") || "raw-documents";

const privacySentinel = ["confidential", "name:", "patient id", "site location:"];

const synthesisPrompt = `You are an expert Monitoring & Evaluation (M&E) Analyst synthesizing sensitive raw qualitative and quantitative data. Your task is to extract only high-level, aggregated metrics and non-confidential themes for a professional portfolio website. STRICTLY OBSERVE BENEFICIARY PRIVACY. Do not include individual names, specific site locations, sensitive anecdotes, or any data marked confidential. Your final output must be structured JSON.

Extract and populate ONLY these JSON keys:
- total_beneficiaries_reached
- thematic_areas
- summary_STAR_studies
- geographic_countries
- tool_expertise
- donor_list

Return only valid JSON.`;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function checkPrivacy(data: Record<string, unknown>, rawTexts: string[]) {
  const payload = JSON.stringify(data).toLowerCase();
  for (const token of privacySentinel) {
    if (payload.includes(token)) {
      throw new Error(`Privacy sentinel detected in output: ${token}`);
    }
  }

  for (const raw of rawTexts) {
    const chunks = raw
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 40);

    for (const chunk of chunks) {
      if (payload.includes(chunk.toLowerCase())) {
        throw new Error("Privacy violation: verbatim raw sentence leaked in synthesized JSON.");
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bucket = body.bucket || DEFAULT_BUCKET;

    const { data: files, error: filesErr } = await supabaseAdmin.storage.from(bucket).list("", {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (filesErr) throw filesErr;

    const { data: processedRows, error: processedErr } = await supabaseAdmin
      .from("processed_files")
      .select("file_name");
    if (processedErr) throw processedErr;

    const processed = new Set((processedRows || []).map((r) => r.file_name));
    const newFiles = (files || []).filter((f) => f.name && !processed.has(f.name));

    if (!newFiles.length) {
      return new Response(
        JSON.stringify({ ok: true, updated: false, message: "No new files found to analyze." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawTexts: string[] = [];
    for (const file of newFiles) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).download(file.name);
      if (error) throw error;
      rawTexts.push(await data.text());
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: synthesisPrompt },
        { role: "user", content: `Analyze these raw documents:\n\n${rawTexts.join("\n\n---\n\n")}` },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";
    const synthesized = JSON.parse(content);

    checkPrivacy(synthesized, rawTexts);

    const { error: upsertErr } = await supabaseAdmin.from("portfolio_data").upsert({
      id: 1,
      data: synthesized,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw upsertErr;

    for (const file of newFiles) {
      const { error } = await supabaseAdmin.from("processed_files").insert({
        file_name: file.name,
        processed_at: new Date().toISOString(),
      });
      if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        updated: true,
        processed_files: newFiles.length,
        message: "Analysis complete. Portfolio updated in Supabase.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
