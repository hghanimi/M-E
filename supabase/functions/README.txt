Supabase Edge Functions for no-Python pipeline:

1) upload-document
- Receives multipart files from dashboard.
- Stores files in private bucket raw-documents.

2) analyze-documents
- Reads new files from bucket.
- Uses OpenAI to synthesize portfolio JSON.
- Runs privacy checks.
- Upserts public.portfolio_data and marks processed_files.

Deploy commands (from your machine with Supabase CLI):
- supabase functions deploy upload-document
- supabase functions deploy analyze-documents

Set secrets:
- supabase secrets set OPENAI_API_KEY=...
- supabase secrets set STORAGE_BUCKET=raw-documents
