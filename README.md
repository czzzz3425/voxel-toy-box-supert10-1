[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/MlYCdgDq)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23454891&assignment_repo_type=AssignmentRepo)
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voxel Toy Box

Vercel-first voxel generation app with a React frontend, a server-side Kimi API, and Postgres-backed generation logging.

## Local Development

Prerequisites:
- Node.js 20+
- PowerShell users should prefer `npm.cmd`
- Optional local Postgres if you want persistent generation logs
- Optional `LOCAL_DB_MODE=memory` if you want a local in-memory Postgres-compatible test database

Setup:
1. Copy `.env.example` to `.env.local`
2. Fill in `KIMI_API_KEY`
3. Choose one database path for local testing:
	- Fill in `DATABASE_URL` for a real Postgres instance
	- Or set `LOCAL_DB_MODE=memory` for the in-memory database used in local connectivity tests
4. Install dependencies with `npm.cmd install`

Frontend-only dev server:
```powershell
npm.cmd run dev
```

Full Vercel-style local server:
```powershell
npm.cmd run dev:vercel
```

## First Local Test Runbook

Use this sequence for first-time verification on this machine, then move to Vercel deployment.

1. Prepare `.env.local`
	- Set `KIMI_API_KEY` (required)
	- Keep `DATABASE_URL` optional for first pass
2. Install dependencies
	- `npm.cmd install`
3. Run local full chain first
	- `npm.cmd run dev` (frontend + local API)
4. Validate API routing and error visibility
	- Open the app and trigger one generation request
	- Confirm failures are explicit in UI if key/quota is invalid
5. Run static checks before deploy
	- `npm.cmd run typecheck`
	- `npm.cmd run build`
6. Only after local pass, start Vercel-style verification
	- `npm.cmd run dev:vercel`

## Verification Commands

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## API

Primary backend endpoint:
```text
/api/lego-kimi
```

Debug endpoints:
```text
/api/debug/db-health
/api/debug/generation-logs
```

## Environment Variables

- `KIMI_API_KEY`: required for server-side Kimi generation
- `KIMI_MODEL`: optional override for the Kimi model, defaults to `moonshot-v1-8k`
- `DATABASE_URL`: optional Postgres connection string for persistent generation logs
- `LOCAL_DB_MODE=memory`: enables the embedded local database when no real Postgres is available
- `LOCAL_PROXY_URL`: optional explicit outbound proxy for local Node server calls; if omitted on Windows, the app will also try to detect the user-level system proxy
- `VITE_API_BASE_URL`: optional frontend override, defaults to `/api/`

## Kimi Vercel Route

Kimi is exposed as the server-side Vercel route at:

```text
/api/lego-kimi
```

It is the primary generation route and returns the shared backend response shape used by the frontend.

## Failure Log Reporting

Database-backed generation logs can be queried through:

```text
/api/debug/generation-logs
```

Supported examples:

```text
/api/debug/generation-logs?limit=10
/api/debug/generation-logs?status=failure
/api/debug/generation-logs?success=false&limit=20
```

Failure reports include stored `error_message`, `warnings`, and the original generation options.

## Proxy Notes

If Kimi requests fail with network errors such as `fetch failed sending request`, check the local proxy guidance in [harness/PROXY_GUIDE.md](./harness/PROXY_GUIDE.md).

Current local behavior:
- On Windows, the server will try to auto-detect the user-level system proxy from Internet Settings
- You can override that behavior explicitly with `LOCAL_PROXY_URL`
- The proxy is only used for server-side outbound model calls, not for browser-side routing

Current status on this machine:
- Kimi outbound network access is no longer blocked at transport layer
- `fetch failed sending request` is treated as a network/proxy issue
- `API_KEY_INVALID` means network is working and the blocker has moved to key validity

## Notes

- Netlify is no longer the target runtime for this project.
- Harness docs for task execution and verification live under [harness](./harness).
- debug redeploy trigger

  
