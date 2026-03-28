import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = Deno.env.get("STORAGE_BUCKET") || "raw-documents";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const form = await req.formData();
    const files = form.getAll("files").filter((f) => f instanceof File) as File[];

    if (!files.length) {
      return new Response(JSON.stringify({ ok: false, error: "No files provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uploaded: string[] = [];

    for (const file of files) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const name = `${ts}_${file.name}`;

      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(name, await file.arrayBuffer(), {
          contentType: file.type || "text/plain",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      uploaded.push(name);
    }

    return new Response(
      JSON.stringify({ ok: true, count: uploaded.length, uploaded, bucket: BUCKET }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
