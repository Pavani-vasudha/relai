# AI Asset Validator

## Overview

Full-stack AI SaaS application for validating AI-generated assets (images, text, audio, video) against configurable quality rules. Features JWT authentication with role-based access control, project-based organization, AI-powered validation via OpenAI (Replit AI Integrations), and observability dashboards.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (light theme)
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **AI Integration**: OpenAI via Replit AI Integrations (no API key needed)
- **Auth**: JWT-based (bcryptjs for passwords, jsonwebtoken for tokens)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Artifacts
- `artifacts/ai-asset-validator` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server` — Express API server (preview path: `/api`)

### Libraries
- `lib/api-spec` — OpenAPI spec + codegen config
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod validation schemas
- `lib/db` — Drizzle ORM schema + client
- `lib/integrations-openai-ai-server` — OpenAI server client

### Database Schema
- `users` — Users with roles (admin/user)
- `projects` — User projects with asset type (image/text/audio/video)
- `project_configs` — Per-project validation configuration
- `asset_validations` — Validation results + observability data
- `system_prompts` — AI system prompts per modality

## Features

1. **Authentication** — Email/password login/signup, JWT tokens, Admin/User roles
2. **Projects** — Create and manage validation projects per asset type
3. **Project Dashboard** — Stats: total assets, pass %, tokens, cost, avg latency
4. **Playground** — Upload assets and run live AI validation with configurable rules
5. **Project Configuration** — Set validation rules, enable PII/blur/duplication checks
6. **Validation Engine** — Pre-checks (PII, blur, duplication) + OpenAI AI validation
7. **Observability** — Global table view with metrics and project/result filters
8. **System Prompts** — Admin-only prompt management per modality with versioning
9. **User Management** — Admin-only CRUD for team members

## Default Admin Credentials
- Email: `admin@example.com`
- Password: `admin123`

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — JWT signing secret (set in Replit secrets)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI proxy URL (auto-set)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI proxy key (auto-set)
