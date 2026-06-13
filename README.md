# GO Aircon Services — Web App

Full-stack booking website: React + Vite frontend, Supabase PostgreSQL backend, deployed on Vercel.

## Stack
- **Frontend**: React 18 + Vite 5
- **Database**: Supabase (PostgreSQL, schema: `go_aircon`)
- **Hosting**: Vercel

## Local development

```bash
npm install
npm run dev
```

Requires `.env` with:
```
VITE_SUPABASE_URL=https://qnvpqhunzcjwqbxrbjos.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Deploy

Push to GitHub → Import on [vercel.com/new](https://vercel.com/new) → add env vars → Deploy.

## Default admin login
- Username: `admin`
- Password: `goaircon2025`

Change after first login via Staff Management.
