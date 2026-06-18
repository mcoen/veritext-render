# Veritext Convert

A full-stack document conversion service that converts Office documents (Word, Excel, PowerPoint, and more) to PDF. Built as a monorepo with a GraphQL API and a Next.js 15 web UI. Conversion is handled by [Gotenberg](https://gotenberg.dev) — a stateless Docker microservice wrapping LibreOffice — keeping the API server free of any native binary dependencies.

---

## Features

- **GraphQL API** — Apollo Server 4 with file upload support (multipart spec)
- **Document conversion** — Converts `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`, `.odt`, `.ods`, `.odp`, `.rtf`, `.csv`, `.txt` to PDF via Gotenberg (LibreOffice)
- **JWT authentication** — Register/login with Bearer token auth, 7-day expiry
- **Job tracking** — Async conversion pipeline with PENDING → PROCESSING → COMPLETED/FAILED status
- **Next.js 15 UI** — Dashboard with stats, drag-and-drop upload, job table with download links
- **Persistent storage** — LowDB JSON file database (zero-setup)
- **Tailwind CSS v4** — Custom Veritext brand theme with dark mode support

---

## Prerequisites

- **Node.js 20+** (ESM support required)
- **Docker** — Gotenberg runs as a sidecar container; no native binaries needed on the host

---

## Setup

### 1. Install dependencies

```bash
cd /path/to/veritext-convert
npm install
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

---

## Development

### Start Gotenberg (required for conversion)

```bash
docker compose up -d
```

This starts Gotenberg on `http://localhost:3000`. It restarts automatically and requires no further configuration.

### Start the app

```bash
npm run dev
```

Or individually:

```bash
# API only (http://localhost:4000/graphql)
cd apps/api && npm run dev

# Web only (http://localhost:3001)
cd apps/web && npm run dev
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│         Next.js 15 UI  :3001                     │
│   (Apollo Client + Tailwind CSS v4)              │
└───────────────────┬─────────────────────────────┘
                    │ GraphQL + multipart upload
                    │ Authorization: Bearer <jwt>
┌───────────────────▼─────────────────────────────┐
│         Apollo Server 4 + Express  :4000         │
│                  GraphQL API                     │
│   ┌─────────────────┐  ┌──────────────────────┐ │
│   │  Auth resolvers  │  │   Job resolvers      │ │
│   │  (JWT / bcrypt)  │  │  (upload + convert)  │ │
│   └────────┬────────┘  └──────────┬───────────┘ │
│            │                      │              │
│   ┌────────▼──────────────────────▼───────────┐ │
│   │           LowDB (data/db.json)             │ │
│   └───────────────────────────────────────────┘ │
│                      │                           │
│   ┌───────────────────▼───────────────────────┐ │
│   │      Gotenberg HTTP API  :3000             │ │
│   │   POST /forms/libreoffice/convert          │ │
│   │   (Docker sidecar, stateless)              │ │
│   └───────────────────────────────────────────┘ │
│                      │                           │
│   ┌───────────────────▼───────────────────────┐ │
│   │     uploads/pdfs/{jobId}.pdf               │ │
│   │   (served as static files via Express)     │ │
│   └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port for the API server |
| `JWT_SECRET` | `veritext-convert-secret` | Secret for signing JWT tokens — **change in production** |
| `GOTENBERG_URL` | `http://localhost:3000` | Gotenberg service URL |

### Web (`apps/web/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/graphql` | GraphQL endpoint URL |

---

## Demo Accounts

Two accounts are seeded automatically on first start:

| Name | Email | Password |
|------|-------|----------|
| Matt Coen | `mcoen@veritext.com` | `demo1234` |
| Demo User | `demo@veritext.com` | `demo1234` |

Both are available as quick-login buttons on the login page.

---

## API Quick Reference

**Endpoint:** `POST http://localhost:4000/graphql`

| Operation | Type | Auth | Description |
|-----------|------|------|-------------|
| `login` | Mutation | No | Get a JWT token |
| `register` | Mutation | No | Create account + get token |
| `me` | Query | Yes | Current user profile |
| `myConversionJobs` | Query | Yes | Your conversion history |
| `allConversionJobs` | Query | Yes | All jobs (all users) |
| `conversionJob(id)` | Query | Yes | Single job by ID |
| `convertDocument` | Mutation | Yes | Upload + start conversion |
| `deleteConversionJob` | Mutation | Yes | Remove a job record |

See [docs/API.md](docs/API.md) for full documentation with cURL examples and TypeScript client code.

---

## Project Structure

```
veritext-convert/
├── apps/
│   ├── api/                        # GraphQL API
│   │   └── src/
│   │       ├── index.ts            # Express + Apollo entry point
│   │       ├── context.ts          # JWT context extraction
│   │       ├── schema/typeDefs.ts  # GraphQL schema
│   │       ├── resolvers/          # auth + job resolvers
│   │       ├── db/index.ts         # LowDB setup + seed
│   │       └── services/conversion.ts  # LibreOffice wrapper
│   └── web/                        # Next.js 15 UI
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── providers.tsx   # Auth + Apollo context
│           │   ├── login/          # Login page
│           │   └── (platform)/     # Authenticated routes
│           │       ├── dashboard/  # Stats + recent jobs
│           │       └── conversions/ # Upload + full job table
│           ├── components/Shell.tsx # Sidebar layout
│           └── lib/
│               ├── auth.ts         # localStorage helpers
│               └── graphql/queries.ts  # GQL query definitions
├── packages/
│   └── shared/src/index.ts         # Shared TypeScript types
├── docs/API.md
├── docker-compose.yml              # Gotenberg sidecar
├── turbo.json
└── package.json
```
