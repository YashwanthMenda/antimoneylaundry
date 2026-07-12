# 🛡️ AML Intelligence Platform

> **Anti-Money Laundering (AML) Compliance & Investigation Platform** — A production-grade, role-based financial crime detection and case management system built with Next.js 15, TypeScript, and Supabase.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Role-Based Access Control](#-role-based-access-control)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Supabase Integration](#-supabase-integration)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🔍 Overview

The **AML Intelligence Platform** is a comprehensive compliance tool designed for financial institutions to detect, investigate, and report suspicious financial activity. It provides real-time alert monitoring, case management workflows, entity risk profiling, transaction network analysis, and automated SAR (Suspicious Activity Report) generation and approval workflows — all within a secure, role-gated interface.

The platform mirrors real-world AML operations with a structured 6-stage investigation pipeline:

```
Alert Generated → Triaged → Case Opened → Investigating → SAR Pending → SAR Filed
```

---

## 🌐 Live Demo

**Production URL**: [https://antimoneyl8571.builtwithrocket.new](https://antimoneyl8571.builtwithrocket.new)

| Demo Account | Email | Role |
|---|---|---|
| AML Analyst | `analyst@demo.com` | `analyst` |
| Senior Officer | `officer@demo.com` | `senior_officer` |
| Admin | `admin@demo.com` | `admin` |

---

## 🏗️ System Architecture

The platform is structured across **6 distinct layers**, each with a clear responsibility:

### Layer 1 — Authentication & Identity
- Supabase Auth with email/password sign-in and sign-up
- JWT-based session management via `@supabase/ssr`
- Middleware-enforced route protection (`src/middleware.ts`)
- `AuthContext` provides user session and profile data globally
- Role stored in `user_profiles.role` (ENUM: `analyst`, `senior_officer`, `admin`)

### Layer 2 — Data & Persistence (Supabase / PostgreSQL)
- Fully normalized relational schema with foreign key constraints
- Row-Level Security (RLS) policies enforce data isolation per role
- Real-time subscriptions for live alert and SAR status updates
- Two migration files manage the complete schema lifecycle

### Layer 3 — Service Layer (`amlService.ts`)
- Centralized data-access module — all Supabase queries live here
- Handles `snake_case` (DB) ↔ `camelCase` (app) conversion
- Schema error detection to gracefully degrade on missing tables
- Functions: `getDashboardMetrics`, `getLiveAlerts`, `getCases`, `getEntities`, `createSARReport`, `approveSAR`, `getSARReports`, and more

### Layer 4 — Application Pages (Next.js App Router)
| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Metrics overview, live alerts, alert volume chart |
| `/alerts` | Alerts | Full alert table with risk scoring and SAR generation |
| `/case-investigation-detail` | Case Detail | 6-stage timeline, transactions, SHAP chart, SAR tab |
| `/sar-reports` | SAR Reports | SAR list with approval workflow for senior officers |
| `/entities` | Entities | Entity risk profiles with KYC status |
| `/network` | Network | Transaction network graph visualization |
| `/settings` | Settings | User profile and system configuration |
| `/sign-up-login-screen` | Auth | Login and registration screen |

### Layer 5 — UI Component System
- Shared layout: `AppLayout`, `Sidebar`, `Topbar`
- Reusable primitives: `StatusBadge`, `RiskBadge`, `MetricCard`, `Modal`, `EmptyState`, `AppLogo`, `AppIcon`, `AppImage`
- Data visualizations: `AlertVolumeChart` (Recharts), `PatternBreakdownChart`, `ShapChart`
- Dashboard widgets: `MetricsBentoGrid`, `LiveAlertsTable`, `CasePipelineSidebar`, `DashboardHeader`

### Layer 6 — Role-Gated Workflows
- **Analysts** generate SARs from alerts → SAR enters `Pending Review` state
- **Senior Officers** receive SARs, review, and approve → SAR moves to `Submitted`
- On approval, the case timeline auto-completes all 6 stages with real-time updates
- Role-conditional UI: `Generate SAR` button hidden for officers; `Approve` button hidden for analysts

---

## ✨ Key Features

### 🚨 Real-Time Alert Monitoring
- Live alert feed with risk scoring (Critical / High / Medium)
- 24-hour alert volume chart bucketed by hour
- Pattern breakdown: Structuring, Layering, Smurfing, Round-Tripping, Shell Company
- One-click SAR generation from any alert

### 📁 Case Investigation Workflow
- Full 6-stage investigation pipeline with visual timeline
- Case detail view with tabbed interface: Overview, Transactions, SAR, Network
- SHAP (explainability) chart showing risk factor contributions
- Real-time timeline updates via Supabase subscriptions

### 📄 SAR Approval Workflow
- Analysts submit SARs → stored in Supabase with `Pending Review` status
- Senior Officers see all pending SARs and can approve with one click
- Approval generates a FIU (Financial Intelligence Unit) reference number
- Analyst's case timeline auto-updates to show all stages completed

### 🏢 Entity Risk Profiling
- Entity registry with risk scores, KYC status, jurisdiction, and linked accounts
- Entity types: Person, Company, Account
- KYC statuses: Verified, Pending, Failed, Enhanced Due Diligence

### 🕸️ Transaction Network Analysis
- Visual network graph of transaction relationships
- Hop-count tracking for layering detection

### 📊 Executive Dashboard
- Key metrics: Active Cases, High-Risk Alerts, SARs Filed, Entities Flagged
- Bento-grid metric cards with trend indicators
- Case pipeline sidebar with status distribution
- Export dashboard metrics as CSV

---

## 🛠️ Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.5.18 |
| Language | TypeScript | ^5.0 |
| UI Library | React | 19.0.3 |
| Styling | Tailwind CSS | 3.4.6 |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth + SSR | ^0.6.1 |
| Charts | Recharts | ^2.15.2 |
| Icons | Heroicons + Lucide React | ^2.2.0 / ^1.7.0 |
| Forms | React Hook Form | ^7.54.2 |
| Notifications | Sonner | ^1.7.4 |
| Deployment | Netlify (via `@netlify/plugin-nextjs`) | — |

---

## 👥 Role-Based Access Control

The platform enforces three roles at both the UI and database (RLS) levels:

### `analyst`
- View dashboard, alerts, cases, entities, network
- Generate SAR reports from alerts
- View SAR status (read-only after submission)
- Cannot approve SARs

### `senior_officer`
- All analyst permissions
- View all SAR reports submitted by analysts
- **Approve SARs** — triggers FIU reference generation and case timeline completion
- Cannot see `Generate SAR` button (they approve, not generate)

### `admin`
- All senior officer permissions
- Access to system settings and user management
- Full read/write access across all tables

---

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|---|---|
| `user_profiles` | Linked to `auth.users`; stores role, department, full name |
| `alerts` | Financial alerts with risk score, pattern, account, jurisdiction |
| `cases` | Investigation cases linked to alerts and entities |
| `sar_reports` | SAR submissions with status, analyst info, FIU reference |
| `entities` | Persons, companies, accounts with KYC and risk data |
| `transactions` | Individual transactions linked to cases |
| `dashboard_metrics` | Aggregated KPI metrics for the dashboard |

### ENUMs

```sql
user_role:       analyst | senior_officer | admin
alert_status:    New | Under Review | Escalated | Closed | Reviewed
case_status:     Open | Investigating | Pending SAR | Escalated | Closed
sar_status:      Draft | Pending Review | Submitted | Acknowledged
entity_type:     Person | Company | Account
kyc_status:      Verified | Pending | Failed | Enhanced
transaction_type: NEFT | RTGS | IMPS | UPI | SWIFT | Cash
```

### Migrations

| File | Description |
|---|---|
| `20260711134539_aml_platform.sql` | Full initial schema — all tables, ENUMs, RLS policies, triggers, seed data |
| `20260711150000_sar_approval_flow.sql` | Adds `approved_at` column; updates RLS for SAR approval by senior officers |

---

## 📁 Project Structure

```
antimoneylaundry/
├── public/
│   ├── assets/images/          # App logo and static images
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Dashboard (/)
│   │   ├── alerts/page.tsx                 # Alerts (/alerts)
│   │   ├── sar-reports/page.tsx            # SAR Reports (/sar-reports)
│   │   ├── case-investigation-detail/      # Case Detail (/case-investigation-detail)
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── CaseDetailHeader.tsx    # 6-stage timeline
│   │   │       ├── CaseDetailTabs.tsx
│   │   │       ├── CaseOverviewTab.tsx
│   │   │       ├── TransactionsTab.tsx
│   │   │       ├── SARTab.tsx
│   │   │       └── ShapChart.tsx
│   │   ├── entities/page.tsx               # Entities (/entities)
│   │   ├── network/page.tsx                # Network (/network)
│   │   ├── settings/page.tsx               # Settings (/settings)
│   │   ├── sign-up-login-screen/           # Auth (/sign-up-login-screen)
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── LoginForm.tsx
│   │   │       └── AuthBrandPanel.tsx
│   │   ├── auth/callback/route.ts          # OAuth callback handler
│   │   ├── layout.tsx                      # Root layout with AuthProvider
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── AppLayout.tsx                   # Main layout wrapper
│   │   ├── Sidebar.tsx                     # Navigation sidebar
│   │   ├── Topbar.tsx                      # Top navigation bar
│   │   └── ui/                             # Reusable UI primitives
│   │       ├── AppImage.tsx
│   │       ├── AppIcon.tsx
│   │       ├── AppLogo.tsx
│   │       ├── EmptyState.tsx
│   │       ├── MetricCard.tsx
│   │       ├── Modal.tsx
│   │       ├── RiskBadge.tsx
│   │       └── StatusBadge.tsx
│   ├── app/components/                     # Page-level dashboard components
│   │   ├── DashboardHeader.tsx
│   │   ├── MetricsBentoGrid.tsx
│   │   ├── LiveAlertsTable.tsx
│   │   ├── AlertVolumeChart.tsx
│   │   ├── PatternBreakdownChart.tsx
│   │   └── CasePipelineSidebar.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx                 # Global auth state provider
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Browser Supabase client
│   │   │   └── server.ts                   # Server-side Supabase client
│   │   └── services/
│   │       └── amlService.ts               # All Supabase data-access functions
│   ├── middleware.ts                        # Route protection middleware
│   └── styles/
│       ├── index.css                        # Global styles
│       └── tailwind.css                     # Tailwind directives
├── supabase/
│   └── migrations/
│       ├── 20260711134539_aml_platform.sql
│       └── 20260711150000_sar_approval_flow.sql
├── .env                                     # Environment variables
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- A **Supabase** project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/YashwanthMenda/antimoneylaundry.git
cd antimoneylaundry
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:4028
```

### 4. Run Database Migrations

Apply the migrations to your Supabase project via the Supabase CLI:

```bash
supabase db push
```

Or manually run the SQL files in order via the Supabase SQL Editor:
1. `supabase/migrations/20260711134539_aml_platform.sql`
2. `supabase/migrations/20260711150000_sar_approval_flow.sql`

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:4028](http://localhost:4028) in your browser.

---

## 🔌 Supabase Integration

### Client Setup

Two Supabase clients are configured for different rendering contexts:

```typescript
// Browser (Client Components)
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

// Server (Server Components, API Routes, Middleware)
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
```

### Authentication Flow

1. User signs in via `LoginForm` → `AuthContext.signIn()` → Supabase Auth
2. Session stored in cookies via `@supabase/ssr`
3. `src/middleware.ts` checks session on every request; redirects unauthenticated users to `/sign-up-login-screen`
4. `AuthContext` provides `user`, `session`, `loading`, `signIn`, `signOut`, `getUserProfile` globally

### Real-Time Subscriptions

The platform uses Supabase Realtime for live updates:

```typescript
// Example: Live SAR status updates in CaseDetailHeader
supabase
  .channel('sar-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'sar_reports',
    filter: `case_ref=eq.${caseRef}`
  }, handleSARChange)
  .subscribe();
```

### Row-Level Security

All tables have RLS enabled. Key policies:

| Table | Policy |
|---|---|
| `user_profiles` | Users can read/update their own profile |
| `alerts` | Authenticated users can read; analysts can update assigned alerts |
| `cases` | Authenticated users can read; assigned officers can update |
| `sar_reports` | Analysts can insert; senior officers/admins can update (approve) |
| `entities` | Authenticated users can read |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Base URL for OAuth redirects |
| `OPENAI_API_KEY` | Optional | For AI-assisted analysis features |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Google Analytics tracking |

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 4028 |
| `npm run build` | Build for production |
| `npm run serve` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type checking |

---

## 🚢 Deployment

### Netlify (Recommended)

This project is pre-configured for Netlify with `@netlify/plugin-nextjs`:

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy — the plugin handles Next.js SSR automatically

### Vercel

```bash
npx vercel --prod
```

Set the same environment variables in the Vercel project settings.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Formatting, no logic change
refactor: Code restructure without feature change
chore:    Build process or tooling changes
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new) — AI-powered full-stack development
- Powered by [Next.js](https://nextjs.org/) and [React](https://react.dev/)
- Database and auth by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts by [Recharts](https://recharts.org/)

---

<p align="center">Built with ❤️ on <a href="https://rocket.new">Rocket.new</a></p>