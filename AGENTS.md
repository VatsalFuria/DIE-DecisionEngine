# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Decision Intelligence Engine with a FastAPI backend and a Next.js frontend. Root docs such as `DIE_BUILD_GUIDE.md`, `DIE_FILE_SPECIFICATIONS.md`, `COMPLETE_CODE_SUMMARY.md`, and `FILE_MANIFEST.md` are planning material; prefer checked-in code when they conflict.

- `backend/app/main.py` defines the FastAPI app and mounts routers.
- `backend/app/routers/` contains API endpoints for ingest, scoring, and audit flows.
- `backend/app/services/` contains deterministic decision logic such as harmonization, scoring, and auditing.
- `backend/app/models/` contains Pydantic domain models.
- `frontend/app/` contains Next.js app routes and global styles.
- `frontend/components/` contains UI components by workflow area.
- `frontend/context/` and `frontend/lib/` contain React state, API helpers, storage, constants, and shared types.
- `frontend/public/` stores static assets.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm install` installs JavaScript dependencies.
- `npm run dev` starts the Next.js dev server at `http://localhost:3000`.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint.

Run backend commands from the repository root unless noted:

- `python -m venv .venv` creates a local Python environment.
- `pip install -r backend/requirements.txt` installs backend dependencies.
- `uvicorn app.main:app --reload --app-dir backend` starts FastAPI locally.

## Coding Style & Naming Conventions

Frontend code uses TypeScript with strict mode, React function components, and the `@/*` path alias. Name React components in `PascalCase`, hooks as `useSomething`, and utilities in `camelCase`. Keep component-specific code near the relevant feature directory.

Backend code uses Python modules in `snake_case`, Pydantic models in `PascalCase`, and service functions in `snake_case`. Keep endpoint request/response contracts close to their router unless reused across modules.

## Testing Guidelines

No automated test suite is currently committed. For new backend logic, add focused tests under `backend/tests/` using `pytest` conventions such as `test_scoring.py`. For frontend behavior, prefer feature-level tests under `frontend/` if a test runner is introduced. Until then, run `npm run lint`, `npm run build`, and manually exercise changed FastAPI endpoints.

## Commit & Pull Request Guidelines

Existing history is brief and uses short imperative summaries such as `Initial Commit`. Continue with concise, action-oriented commit messages, for example `Add scoring validation tests`.

Pull requests should include a clear description, affected areas (`backend`, `frontend`, or docs), verification steps, linked issues when available, and screenshots or screen recordings for UI changes.

## Agent-Specific Instructions

Read `frontend/AGENTS.md` before changing frontend code. It flags version-specific Next.js behavior and documentation expectations.
