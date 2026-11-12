# SoloWander

<div align="center">

[![CI Pipeline](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/ci.yml/badge.svg)](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/ci.yml)
[![Docker Build & Publish](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/docker-build.yml/badge.svg)](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/docker-build.yml)
[![Security (CodeQL)](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/codeql.yml/badge.svg)](https://github.com/akshat-shaw-509/SoloWander/actions/workflows/codeql.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**The intelligent travel companion built specifically for solo adventurers.**  
Empowering solo travelers with real-time safety monitoring, offline-first emergency dispatch, budget tracking, hostel recommendations, and community support.

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fakshat-shaw-509%2FSoloWander&root-directory=apps%2Fweb&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

[Key Features](#-key-features) • [Architecture](#-system-architecture) • [Getting Started](#-quick-start) • [Deployment](#-deployment) • [Releases](https://github.com/akshat-shaw-509/SoloWander/releases)

</div>

---

## 🌟 Key Features

### 🛡️ Mission-Critical Safety System
- **Real-Time Location Tracking**: Continuous GPS coordinates sync with configurable intervals and battery awareness.
- **Offline-First SOS Dispatch**: Queue emergency signals locally in IndexedDB when connection drops; syncs automatically once reconnected.
- **Multi-Channel Emergency Broadcast**: Multi-target alerts dispatched automatically via:
  - 💬 **Discord Webhooks** (Free instant channel broadcast)
  - 🤖 **Telegram Bot API**
  - 📱 **Twilio SMS & Voice**
- **Authority Command Center**: Dedicated dashboard for emergency responders and trip coordinators to monitor live status, view geofence breaches, and resolve active incidents.

### 🗺️ Smart Trip & Route Planning
- Dynamic itinerary builder with day-by-day activity planning.
- Intelligent transit suggestions customized for solo travelers.

### 💰 Affordability & Budget Engine
- Live expense tracking with category breakdowns (Accommodation, Food, Transit, Activities).
- Multi-currency support and real-time total budget burn-rate calculations.

### 🏨 Solo-Rated Stays & Hostels
- Curated solo-traveler friendly stays.
- Filter and sort by solo-safety rating, social vibe, and nightly price.

---

## 🏗️ System Architecture

SoloWander is engineered as a modern, modular monorepo powered by **Turborepo** and **Next.js 16 (App Router + Turbopack)**:

```
SoloWander/
├── .github/
│   ├── workflows/             # CI, CodeQL, Docker Build & GHCR Publish, Releases
│   ├── ISSUE_TEMPLATE/        # Standardized GitHub issue reporting
│   └── dependabot.yml         # Automated dependency vulnerability scanning
├── apps/
│   └── web/                   # Next.js 16 Web Application (Standalone Mode)
│       ├── src/app/           # Routes (Dashboard, Safety, Trips, Auth)
│       ├── src/components/    # Reusable UI & Safety Controls
│       └── src/lib/           # Supabase client, safety sync, dispatch
├── packages/
│   ├── constants/             # Shared constants and configurations
│   ├── types/                 # Shared TypeScript models and interfaces
│   └── utils/                 # Formatting and calculation utilities
├── supabase/
│   └── migrations/            # SQL migrations, RLS policies, seeds
├── Dockerfile                 # Multi-stage production container build
├── docker-compose.yml         # Container orchestration configuration
├── vercel.json                # Vercel deployment configuration
└── turbo.json                 # Turborepo task pipeline
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `>= 20.9.0`
- **npm**: `>= 10.0.0`
- A [Supabase](https://supabase.com) project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akshat-shaw-509/SoloWander.git
   cd SoloWander
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example apps/web/.env.local
   ```
   *(On Windows PowerShell, run: `Copy-Item .env.example apps/web/.env.local`)*

   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Initialize Database Schema:**
   Apply migrations from `supabase/migrations/` in your Supabase SQL Editor:
   - `001_init.sql` (Tables and relationships)
   - `002_rls.sql` (Row-Level Security policies)
   - `004_tourist_safety_system.sql` (SOS and incident logs)
   - `005_authority_command_center.sql` (Authority views)
   - `006_offline_first_sos.sql` (Offline sync idempotency)

5. **Start Development:**
   ```bash
   npm run dev --workspace=web
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Quality Gates & Testing

SoloWander enforces strict automated quality gates:

```bash
# Lint all workspaces with zero tolerance
npm run lint

# TypeScript static type check
npm run typecheck

# Full production build verification
npm run build
```

---

## 🚢 Deployment

### Option 1: One-Click Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fakshat-shaw-509%2FSoloWander&root-directory=apps%2Fweb&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

1. Click the button above to import into [Vercel](https://vercel.com).
2. Root directory is automatically detected as `apps/web`.
3. Provide your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy!

### Option 2: Docker / GitHub Container Registry (`ghcr.io`)

The production container image is automatically built and published to GitHub Container Registry on every release:

```bash
# Pull and run the pre-built container from GitHub Container Registry
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  ghcr.io/akshat-shaw-509/solowander:latest
```

Or build and run locally with Docker Compose:

```bash
docker compose up --build -d
```

Verify service health:
```bash
curl http://localhost:3000/api/health
```

### Option 3: Railway / Render / Fly.io

Use the included [`Dockerfile`](Dockerfile) which exposes port `3000` and configures non-root system permissions with integrated health checks.

---

## 🔐 Environment Variables

| Variable | Description | Required | Scope |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anon key | Yes | Client & Server |
| `DISCORD_SOS_WEBHOOK_URL` | Discord webhook for emergency alerts | Optional | Server-side |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for SOS alerts | Optional | Server-side |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for emergency alerts | Optional | Server-side |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID for SMS dispatch | Optional | Server-side |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token for SMS dispatch | Optional | Server-side |
| `TWILIO_FROM_PHONE_NUMBER` | Twilio phone number for SMS dispatch | Optional | Server-side |
| `TWILIO_TO_PHONE_NUMBER` | Emergency recipient phone number | Optional | Server-side |

---

## 🤝 Contributing

Contributions make the open-source community thrive! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for full contribution guidelines, coding standards, and branch policies.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.