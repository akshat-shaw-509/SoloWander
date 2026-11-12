# Contributing to SoloWander

Thank you for your interest in contributing to **SoloWander**! We are building the next-generation platform for solo travelers with built-in safety, smart itinerary planning, community reviews, and offline-first SOS emergency dispatch.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- **Node.js**: `>= 20.9.0`
- **npm**: `>= 10.0.0`
- A [Supabase](https://supabase.com) project (for auth and database features)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akshat-shaw-509/SoloWander.git
   cd SoloWander
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example apps/web/.env.local
   ```
   On Windows PowerShell:
   ```powershell
   Copy-Item .env.example apps/web/.env.local
   ```
   Populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase Dashboard (`Project Settings > API`).

4. **Run the development server:**
   ```bash
   npm run dev --workspace=web
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the web application.

## Monorepo Architecture

SoloWander uses [Turborepo](https://turbo.build/repo) with npm workspaces:

```
SoloWander/
├── apps/
│   └── web/        # Next.js 16 app with React 19, Tailwind CSS v4, Lucide icons
├── packages/
│   ├── constants/  # Shared constants and configurations
│   ├── types/      # Shared TypeScript type definitions
│   └── utils/      # Shared utility functions and helpers
└── supabase/
    └── migrations/ # PostgreSQL schemas, RLS policies, and seed data
```

## Validation & Quality Gates

Before opening a pull request, ensure all checks pass:

```bash
# Run ESLint across all workspaces
npm run lint

# Run TypeScript typechecks
npm run typecheck

# Verify the production build
npm run build
```

## Pull Request Guidelines

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
2. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add safety geofencing alert notification`
   - `fix: resolve hydration warning on tourist controls`
   - `docs: update deployment guidelines`
3. Push your branch and open a pull request targeting `main`.
4. Ensure the CI pipeline passes all checks.
