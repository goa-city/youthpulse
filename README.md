# YouthPulse

YouthPulse is a full-stack survey platform built with Next.js and Supabase. It includes a public survey experience for respondents and an admin panel for creating, managing, and analyzing surveys.

## Project Overview

The platform is designed to:

- Run one active survey at a time for end users
- Collect structured and free-text responses
- Help admins create and manage survey forms quickly
- Provide visual analytics and export tools for reporting

## Features

- Dynamic multi-step public survey flow
- Multiple question/block types:
  - `section_title`, `section_intro`
  - `text`, `textarea`, `number`
  - `radio`, `checkbox`, `yes_no`, `scale`
- Progress tracking and animated step transitions
- Response submission lock with localStorage and "Submit Again" reset option
- Admin authentication with Supabase Auth
- Role-aware admin access (`super_admin`, `editor`, `viewer`)
- Survey lifecycle actions: create, activate, close, clone
- Question builder with add, edit, delete, reorder controls
- Analytics dashboard with charts (ECharts)
- CSV and Excel export for collected responses

## Functions and Modules

### Public Survey Module
- Loads the currently active survey from Supabase
- Renders block-by-block question flow
- Validates and stores answers in `responses` and `answers` tables
- Supports automated test submission in development mode

### Admin Authentication Module
- Email/password sign-in with Supabase Auth
- Middleware-based protection for `/admin/*` routes
- Profile-role checks before allowing dashboard access

### Survey Management Module
- Create new survey metadata (title, description, year, region, slug)
- List all surveys with status and action controls
- Activate one survey (and close others), close surveys, clone surveys

### Question Builder Module
- Manage survey questions/blocks per survey
- Configure question text, helper text, type, required state, and options
- Reorder questions using `order_index`

### Analytics and Export Module
- Aggregate answers per question from active survey responses
- Render bar-chart insights and summary metrics
- Export response datasets to CSV and Excel (`xlsx`)

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- ECharts (`echarts`, `echarts-for-react`)
- React Hook Form
- Framer Motion
- XLSX

## Project Structure

```text
src/
  app/
    page.tsx                      # Public survey
    admin/
      login/page.tsx              # Admin login
      page.tsx                    # Admin dashboard entry
      surveys/
        page.tsx                  # Survey list + actions
        create/page.tsx           # Create survey
        [id]/page.tsx             # Question builder
      analytics/page.tsx          # Analytics + exports
  lib/
    supabase/
      client.ts                   # Browser Supabase client
      server.ts                   # Server Supabase client helper
  middleware.ts                   # Admin route protection
```

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Deployment

- Deploy via Vercel from the `main` branch
- Ensure required environment variables are set in Vercel project settings

## 👨‍💻 Developer Credits

This platform is developed and maintained by: **Stevens Dumpala**  
[stevensdumpala.com](https://stevensdumpala.com)
