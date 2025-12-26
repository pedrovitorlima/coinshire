# Coinshire

A simple app to manage bill split between two people. Very useful if you live with someone and share household bills and other things. It supports percentage quota, in case a person wants to record a bill payment with different "weight" for each user.

# Pre-requisites
- Docker and Docker Compose (recommended to run everything)
- Node.js 18+ and npm (only needed for running frontend/backend locally without Docker)
- Open local ports:
  - 3020 (frontend)
  - 3021 (backend)
  - 3022 (postgres)

# Running the application

## Option A: Docker Compose (recommended)
1) Copy the env template and set the two user names:
   - `cp .env.copy .env`
   - Edit `.env` and set:
     - `VITE_USER1_NAME` (e.g., "You")
     - `VITE_USER2_NAME` (e.g., "Alex")
2) Build and start:
   - `docker compose up -d --build`
3) Open:
   - Frontend: http://localhost:3020
   - Backend health: http://localhost:3021/api/health

Notes:
- If you change the names in `.env`, rebuild the frontend image:
  - `docker compose build frontend && docker compose up -d frontend`
- Stop and remove containers (and DB volume):
  - `docker compose down -v`

## Option B: Local development without Docker (DB via Docker)
1) Start only the database with Docker (runs on localhost:3022):
   - `docker compose up -d db`
2) Backend (port 3021):
   - `cd backend`
   - `DATABASE_URL=postgres://postgres:postgres@localhost:3022/coinshire npm run dev`
3) Frontend (port 3020):
   - `cd frontend`
   - Optional: set names for dev (Vite reads .env.development):
     - Create `frontend/.env.development` with:
       - `VITE_USER1_NAME=You`
       - `VITE_USER2_NAME=Alex`
   - `npm run dev`
4) Open http://localhost:3020

## Option C: Fully local (your own Postgres on 5432)
- Ensure a database `coinshire` exists, and adjust credentials or use the default `postgres/postgres`.
- Backend:
  - `cd backend`
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/coinshire npm run dev`
- Frontend:
  - `cd frontend && npm run dev`

Environment configuration summary:
- Docker route: project-root `.env` supplies `VITE_USER1_NAME` and `VITE_USER2_NAME` at build time for the frontend.
- Local Vite dev: use `frontend/.env.development` or set env vars before `npm run dev`.
- Backend uses `DATABASE_URL`. Default ports are wired for the compose setup.

