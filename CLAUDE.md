# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MinerUpdate is a full-stack web application for discovering and managing Bitcoin/cryptocurrency ASIC miners across network ranges. Users scan IP ranges to discover Antminer hardware and view miner details (firmware, pools, hashrate, etc.).

## Monorepo Structure

npm workspaces monorepo with three packages:

- **`packages/shared/`** — TypeScript type definitions shared between client and server (`Miner`, `ScanProgress`, `ScanRequest`, `ScanResult`, `SavedRange`)
- **`packages/server/`** — Node.js/Express backend with Socket.IO for real-time scan progress, Prisma ORM for PostgreSQL
- **`packages/client/`** — React 18 frontend with Vite, TanStack React Query, Tailwind CSS, Socket.IO client

## Build & Dev Commands

```bash
# Development (run from repo root)
npm run dev:server          # Start server with hot reload (tsx watch, port 3001)
npm run dev:client          # Start Vite dev server (port 5173, proxies /api and /socket.io to 3001)
npm run build               # Build all packages in order: shared → server → client
npm run build:shared        # Build shared types only

# Database (run from packages/server/)
npm run db:migrate          # prisma migrate dev
npm run db:generate         # prisma generate

# Individual package builds (run from package directory)
npm run build               # TypeScript compile (server/shared) or tsc + vite build (client)
```

## Architecture

**Backend request flow:** Express routes (`routes/scans.ts`, `routes/ranges.ts`) → Services (`services/scanner.ts`, `services/antminer-client.ts`) → Database (Prisma/PostgreSQL)

**Real-time scanning:** `scanner.ts` orchestrates network scans with `p-limit` (50 concurrent probes). Each probe in `antminer-client.ts` uses HTTP Digest Auth to query miner CGI endpoints. Progress and discovered miners are emitted via Socket.IO namespace `/scans` (events: `scan:progress`, `scan:found`, `scan:complete`).

**IP range parsing:** `utils/ip-range.ts` handles CIDR notation, dash ranges (e.g., `192.168.1.1-192.168.1.255`), and single IPs. Returns deduplicated IP arrays.

**Frontend state:** TanStack React Query for server state (ranges, miners). Custom `useScanSocket` hook manages WebSocket connection and accumulates scan results in local state.

**Routing:** React Router v6 — `/` (Scan page), `/miners/:ip` (MinerDetail page)

**Database:** PostgreSQL via Prisma. Schema at `packages/server/prisma/schema.prisma`. Currently one model: `SavedRange`.

## Tech Stack

- **TypeScript** (strict mode, ES2022 target) across all packages
- **Server:** Express 4, Socket.IO 4, Prisma 6, Zod for validation, digest-fetch for miner auth
- **Client:** React 18, Vite 6, React Router 6, TanStack React Query 5, Tailwind CSS 3, Socket.IO Client
- **Styling:** Dark theme (gray-950/amber-500), responsive grid layout

## Key Conventions

- Shared types package must be built before server or client (`npm run build:shared`)
- Vite dev server proxies `/api` and `/socket.io` to the backend at `localhost:3001`
- Server uses in-memory scan state (one active scan at a time)
- Request validation uses Zod schemas defined inline in route handlers
- No test framework or linter is currently configured
