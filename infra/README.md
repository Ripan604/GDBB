# Infra Notes

## Managed profile

- Frontend: Vercel (`apps/web`)
- Engine + worker: Railway (`apps/engine`, `apps/worker`)
- DB: Supabase
- Vector DB: Qdrant Cloud
- Cache/queue: Upstash Redis + BullMQ

## Environment split

Create separate project/environment variables for:

- `dev`
- `staging`
- `prod`

## SQL setup

Apply `infra/supabase/schema.sql` in Supabase SQL editor.
