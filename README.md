# MinerUpdate

A full-stack web application for discovering and managing Bitcoin/cryptocurrency ASIC miners across network ranges. Scan IP ranges to discover Antminer hardware, view detailed miner information (firmware, pools, hashrate), and perform bulk firmware updates — all through a real-time, responsive UI.

## Features

- **Network Scanning** — Discover Antminer devices across CIDR ranges, dash ranges, or single IPs with 50 concurrent probes and real-time progress updates
- **Saved Ranges** — Persist frequently-scanned IP ranges with inline editing, checkbox batch selection, and IP autocomplete
- **Miner Dashboard** — Sort, filter, and paginate discovered miners in a responsive table/card layout with detailed per-miner views
- **Bulk Firmware Update** — Upload `.bmu` container files to update firmware across multiple miners simultaneously with per-miner progress tracking
- **BMU Container Support** — Automatically parses multi-model BMU firmware containers, detects miner hardware, extracts the correct firmware image, and validates compatibility before flashing
- **Real-time Updates** — Socket.IO WebSocket connections stream scan progress, miner discoveries, and firmware update status as they happen

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 6, React Router 6, TanStack React Query 5, Tailwind CSS 3 |
| **Backend** | Node.js, Express 4, Socket.IO 4 |
| **Database** | PostgreSQL, Prisma 6 ORM |
| **Language** | TypeScript (strict mode, ES2022) across all packages |
| **Validation** | Zod |
| **Miner Auth** | HTTP Digest Auth via digest-fetch |
| **File Uploads** | Multer (max 200 MB) |

## Monorepo Structure

```
MinerUpdate/
├── packages/
│   ├── shared/          # TypeScript type definitions shared between client and server
│   │   └── src/
│   │       └── types.ts
│   ├── server/          # Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── routes/
│   │   │   │   ├── scans.ts          # Scan endpoints
│   │   │   │   ├── ranges.ts         # Saved range CRUD
│   │   │   │   └── firmware.ts       # Firmware validation & update
│   │   │   ├── services/
│   │   │   │   ├── scanner.ts        # Network scan orchestrator
│   │   │   │   ├── antminer-client.ts # Miner HTTP probe & firmware upload
│   │   │   │   └── firmware-updater.ts # Bulk update state machine
│   │   │   └── utils/
│   │   │       └── ip-range.ts       # CIDR/dash-range/single-IP parsing
│   │   └── prisma/
│   │       └── schema.prisma
│   └── client/          # React + Vite frontend
│       ├── src/
│       │   ├── main.tsx              # App entry, React Router
│       │   ├── pages/
│       │   │   ├── Scan.tsx          # Main scanner page
│       │   │   └── MinerDetail.tsx   # Single miner detail view
│       │   ├── components/           # SavedRangesList, FirmwareUpdateDialog, etc.
│       │   ├── context/              # ScanContext, FirmwareUpdateContext
│       │   ├── hooks/                # useScanSocket, useFirmwareUpdate, usePagination
│       │   └── lib/
│       │       └── api.ts            # REST API client
│       ├── vite.config.ts
│       └── tailwind.config.js
├── tsconfig.base.json
├── package.json          # Workspace root
└── CLAUDE.md
```

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)
- **PostgreSQL** — running instance with a database created

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/brady1423/MinerUpdate.git
cd MinerUpdate
npm install
```

### 2. Configure the database

Create a `.env` file in both the repo root and `packages/server/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/minerupdate
```

### 3. Run database migrations

```bash
cd packages/server
npm run db:migrate
npm run db:generate
```

### 4. Start development servers

From the repo root:

```bash
# Terminal 1 — backend (port 3001)
npm run dev:server

# Terminal 2 — frontend (port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

All scripts are run from the repo root unless noted otherwise.

| Script | Description |
|--------|-------------|
| `npm run dev:server` | Start Express server with hot reload (tsx watch, port 3001) |
| `npm run dev:client` | Start Vite dev server (port 5173, proxies API to 3001) |
| `npm run build` | Build all packages in order: shared → server → client |
| `npm run build:shared` | Build shared types package only |

**From `packages/server/`:**

| Script | Description |
|--------|-------------|
| `npm run db:migrate` | Run Prisma migrations (`prisma migrate dev`) |
| `npm run db:generate` | Generate Prisma client (`prisma generate`) |
| `npm start` | Start compiled server (`node dist/index.js`) |

## Architecture

### Backend Request Flow

```
Client Request
  → Express Route (Zod validation)
    → Service Layer (scanner / firmware-updater)
      → Antminer Client (HTTP Digest Auth probes)
        → Miner CGI Endpoints
  → Database (Prisma / PostgreSQL)
  → Socket.IO (real-time events to client)
```

### Network Scanning

The scanner service (`scanner.ts`) orchestrates network scans with `p-limit` at 50 concurrent probes. Each probe in `antminer-client.ts` authenticates via HTTP Digest Auth (root:root) and queries three CGI endpoints in parallel:

| Endpoint | Data Retrieved |
|----------|---------------|
| `/cgi-bin/get_system_info.cgi` | Model, hostname, firmware version |
| `/cgi-bin/get_miner_conf.cgi` | Pool URL, worker name |
| `/cgi-bin/stats.cgi` | Hashrate |

Probes time out after 5 seconds. Discovered miners are emitted in real-time via Socket.IO as they are found.

### Bulk Firmware Update

The firmware update pipeline:

1. **Upload** — Client sends a `.bmu` firmware file and list of target miner IPs
2. **BMU Parsing** — Server reads the BMU container header (magic `0xABABABAB`) and item table to identify per-model firmware images
3. **Model Detection** — Queries each miner's `miner_type.cgi` for its `subtype` field
4. **Extraction** — Extracts the correct firmware image for each miner's hardware from the BMU container
5. **Flash** — Uploads firmware via `curl` with HTTP Digest Auth to `/cgi-bin/upgrade.cgi` (5 concurrent uploads via `p-limit`)
6. **Verification** — Waits 30 seconds for reboot, then polls `get_system_info.cgi` every 10 seconds for up to 3 minutes to confirm the firmware version changed

### IP Range Parsing

The `ip-range.ts` utility supports three formats:

- **CIDR notation** — `192.168.1.0/24` (expands to all 256 IPs)
- **Dash ranges** — `192.168.1.1-192.168.1.255`
- **Single IPs** — `192.168.1.1`

All formats are parsed, validated, and deduplicated before scanning begins.

### Frontend State Management

- **TanStack React Query** — Server state (saved ranges, miners)
- **React Context** — `ScanContext` and `FirmwareUpdateContext` manage WebSocket-driven state for scan progress and firmware updates
- **Custom Hooks** — `useScanSocket()` and `useFirmwareUpdate()` provide clean interfaces to context state

## API Endpoints

### Saved Ranges

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ranges` | List all saved ranges (ordered by creation date, newest first) |
| `POST` | `/api/ranges` | Create a new saved range (`{ name, range }`) |
| `PUT` | `/api/ranges/:id` | Update a saved range (`{ name?, range? }`) |
| `DELETE` | `/api/ranges/:id` | Delete a saved range |

### Scanning

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scans` | Start a network scan (`{ ranges: string[] }`) → `{ scanId }` |
| `GET` | `/api/scans/:id` | Get scan status and progress |
| `GET` | `/api/miners` | List all discovered miners from the current scan |
| `GET` | `/api/miners/:ip` | Get detailed info for a single miner |

### Firmware

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/firmware/validate` | Validate firmware compatibility (FormData: `firmware` file + `minerIps` JSON) |
| `POST` | `/api/firmware/update` | Upload firmware and start bulk update (FormData: `firmware` file + `minerIps` JSON) |
| `GET` | `/api/firmware/update/:id` | Get firmware update status |

## WebSocket Events

Real-time events are delivered via Socket.IO on two namespaces:

### `/scans` Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `scan:progress` | `ScanProgress` | Emitted after each IP is probed (total, scanned, found, currentIp) |
| `scan:found` | `Miner` | Emitted when a miner is discovered |
| `scan:complete` | `ScanResult` | Emitted when the scan finishes (all miners, duration) |

### `/firmware` Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `firmware:progress` | `FirmwareUpdateProgress` | Overall update progress (total, completed, succeeded, failed) |
| `firmware:miner-status` | `FirmwareUpdateMinerProgress` | Per-miner status change (pending → uploading → verifying → success/failed) |
| `firmware:complete` | `FirmwareUpdateResult` | Final results when all updates finish |

## Type Definitions

All shared types live in `packages/shared/src/types.ts`:

```typescript
// Core miner data returned by probes
interface Miner {
  ip: string
  model: string
  hostname: string
  firmwareVersion: string
  poolUrl: string
  workerName: string
  hashrate: number
  status: 'online' | 'offline' | 'error'
  lastSeen: string       // ISO 8601
  subnet: string
}

// Persistent IP range
interface SavedRange {
  id: number
  name: string
  range: string
  createdAt: string      // ISO 8601
}

// Scan lifecycle
interface ScanRequest   { ranges: string[] }
interface ScanProgress  { scanId: string; total: number; scanned: number; found: number; currentIp: string; status: 'running' | 'completed' | 'failed' }
interface ScanResult    { scanId: string; miners: Miner[]; totalScanned: number; totalFound: number; duration: number }

// Firmware update lifecycle
interface FirmwareUpdateRequest       { minerIps: string[]; firmwareFilename: string }
type FirmwareUpdateMinerStatus        = 'pending' | 'uploading' | 'success' | 'failed' | 'rebooting' | 'verifying'
interface FirmwareUpdateMinerProgress { ip: string; status: FirmwareUpdateMinerStatus; error?: string; newVersion?: string }
interface FirmwareUpdateProgress      { updateId: string; total: number; completed: number; succeeded: number; failed: number; status: 'running' | 'completed' | 'failed' }
interface FirmwareUpdateResult        { updateId: string; total: number; succeeded: number; failed: number; minerResults: FirmwareUpdateMinerProgress[]; duration: number }

// Firmware validation
interface FirmwareValidationResult { valid: boolean; detectedModel: string | null; compatibleMiners: string[]; incompatibleMiners: string[] }
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `PORT` | `3001` | Server listen port |

### Vite Dev Proxy

The Vite dev server (port 5173) proxies API and WebSocket traffic to the backend:

```typescript
// vite.config.ts
proxy: {
  '/api': 'http://localhost:3001',
  '/socket.io': {
    target: 'http://localhost:3001',
    ws: true
  }
}
```

### CORS

The server allows requests from the Vite dev server origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

## Database

PostgreSQL with Prisma ORM. Schema at `packages/server/prisma/schema.prisma`:

```prisma
model SavedRange {
  id        Int      @id @default(autoincrement())
  name      String
  range     String
  createdAt DateTime @default(now())
}
```

## UI / UX

- **Dark theme** — `gray-950` background with `amber-500` accents
- **Responsive layout** — Single column on mobile; sidebar (340px) + main content grid on large screens
- **Scan page** — Left sidebar with saved ranges and scan controls; main area with sortable/filterable miner table (desktop) or card view (mobile)
- **Miner detail** — Grid display of all miner properties with a link to open the miner's web UI
- **Firmware dialog** — Multi-step wizard: select miners → upload & validate → confirm compatibility → monitor per-miner progress
- **Pagination** — Configurable page sizes (25 / 50 / 100)
- **Sorting** — 8 sort keys: IP, model, firmware version, pool URL, worker name, hashrate, status

## Frontend Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Scan | Main scanner dashboard with saved ranges, scan controls, and miner results |
| `/miners/:ip` | MinerDetail | Detailed view of a single discovered miner |
