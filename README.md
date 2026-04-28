<<<<<<< HEAD
# Merrick Monitor

Blood glucose, insulin, and carb intake tracking for Lions Camp Merrick Nanjemoy's diabetic camp program.

## Stack

- **Frontend**: React + Vite → Vercel
- **Backend**: Node.js + Express → Render
- **Database + Auth**: Supabase (PostgreSQL + RLS + Realtime)

## Setup

### 1. Supabase

1. Create a new Supabase project at https://supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Run `supabase/seed.sql` in the SQL editor
4. Copy your project URL, anon key, and service role key

### 2. Client

```bash
cd client
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Server

```bash
cd server
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

## Deploy

- **Frontend**: Connect `/client` to Vercel. Set env vars in Vercel dashboard.
- **Backend**: Connect `/server` to Render as a Web Service. Set env vars in Render dashboard.

## Creating the First Admin User

1. Go to Supabase → Authentication → Users → Add User
2. Set email + password, and in "User Metadata" set:
   ```json
   { "full_name": "Admin Name", "role": "admin" }
   ```
3. The trigger will auto-create their profile in the `users` table.

## Cabin Names

- Seminole
- Mohawk
- Iroquois
- Cherokee
- Conoy
=======
# merrick-monitor
>>>>>>> dedeac97947a31d7750a270df62b1746a72d739a
