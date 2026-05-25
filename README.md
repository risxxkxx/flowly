# Flowly

Solar & BESS plant management platform built with Next.js 14 + Supabase.

## Stack

- **Next.js 14** — App Router, Server Components
- **Supabase** — Database (PostgreSQL), Auth, Row Level Security
- **Tailwind CSS** — Styling
- **Vercel** — Hosting (free tier)

---

## Setup (step by step)

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project**, give it a name (e.g. `flowly`), choose a region close to you
3. Wait ~1 minute for it to spin up
4. Go to **SQL Editor** → paste the entire contents of `supabase-schema.sql` → click **Run**

### 2. Get your Supabase keys

1. In Supabase go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public** key

### 3. Configure the app

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (free)

1. Push your code to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. In **Environment Variables** add your two Supabase variables
4. Click **Deploy** — done!

---

## Features

| Feature | Description |
|---|---|
| Auth | Email/password register & login via Supabase Auth |
| Plants | Add solar/BESS plants with kW capacity and kWh storage |
| Daily logs | Log daily production (kWh), SOC (%), and free-text notes per plant |
| Tasks | To-do lists for Work and Chores categories |
| Shared access | Invite another user by email to view a plant read-only |
| Security | Row Level Security — users only see their own data |

---

## Project structure

```
app/
  page.tsx                  ← Landing page
  auth/
    login/page.tsx          ← Login
    register/page.tsx       ← Register
  dashboard/
    page.tsx                ← Overview
    work/page.tsx           ← Work section
    chores/page.tsx         ← Chores section
    plants/[id]/page.tsx    ← Plant detail + daily logs

components/
  layout/DashboardLayout.tsx
  plants/
    AddPlantButton.tsx
    DailyLogList.tsx
    SharePlantButton.tsx
  tasks/
    TaskList.tsx

lib/supabase/
  client.ts                 ← Browser client
  server.ts                 ← Server client

types/index.ts              ← All TypeScript types
middleware.ts               ← Auth route protection
supabase-schema.sql         ← Run this in Supabase SQL Editor
```
