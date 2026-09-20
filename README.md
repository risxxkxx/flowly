# Flowly

A full-stack productivity application for organising work and personal projects, managing tasks, tracking time, and reviewing progress.

**Live demo:** https://flowly-vert.vercel.app/

## Overview

Flowly was built as a practical workspace for keeping projects, tasks, and time tracking in one place. The goal was to create a clean interface that is easy to use while connecting a modern frontend with authentication, database logic, and protected user data.

## Features

- Email/password authentication
- Work and personal project organisation
- Task management
- Time tracking
- Project-level time statistics
- Weekly completion overview
- English and Macedonian interface
- Protected user data with Supabase
- Responsive dashboard

## Tech Stack

- **Next.js 13** — App Router and React
- **TypeScript**
- **Supabase** — PostgreSQL database and authentication
- **Tailwind CSS**
- **date-fns**
- **Vercel** — deployment

## What I worked on

I designed and implemented the application structure, frontend experience, authentication flow, database integration, project/task logic, time tracking, reporting views, localisation, and deployment.

A major part of the project was thinking about the full user flow rather than isolated screens: how a user signs in, how their projects and tasks are associated with their account, how tracked time is stored, and how that data is later presented in the dashboard.

## Project Structure

```text
app/
  auth/
  dashboard/
components/
lib/
  supabase/
messages/
types/
middleware.ts
```

## Local Development

```bash
npm install
npm run dev
```

Create a `.env.local` file with your own Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## What I learned

Flowly helped me strengthen my understanding of React/Next.js application structure, authentication, relational data, asynchronous data fetching, state handling, responsive UI development, and connecting frontend features to a real backend.

## Author

**Riste Kozarev**  
Software Engineer focused on web applications, energy technology, and practical digital products.

Portfolio: https://riste-kozarev.netlify.app/
