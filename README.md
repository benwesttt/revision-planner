# Revisr — Academic Revision Planner

A full-stack web app that acts as a personal revision decision engine for university students. Instead of manually deciding what to study, Revisr generates a personalised day-by-day revision schedule based on your courses, topics, assessments, timetable, and revision history.

## The Problem

Most students don't struggle because they're lazy — they struggle because they constantly have to decide:
- What is most important to revise?
- When should I do it?
- How should I revise it?
- How do I balance revision around lectures, gym, and other commitments?

Revisr removes those decisions.

## Features

- **Intelligent scheduling** — generates a 7-day rolling revision plan fitted around your real timetable, scoring topics by recency, confidence, and assessment urgency
- **Learning Mode** — for courses not yet fully taught, splits topics into a learning queue and a revision queue, tracks taught/not-taught status, and warns when actual teaching pace falls behind an expected schedule
- **Live session timer** — persistent start/pause/resume/stop widget that survives page navigation, auto-suggests the topic from your current scheduled block, and confirms details before logging rather than auto-logging
- **Topic-level tracking** — logs sessions by topic with confidence ratings, so the planner improves its picks over time
- **Subject-type adaptation** — per-course subject type (e.g. essay-based vs STEM) adjusts confidence-prompt wording to fit how different subjects are actually revised
- **Week A/B timetable support** — handles fortnightly university timetables
- **Unified weekly timeline** — lectures and revision blocks interleaved in chronological order
- **Quick logging** — log completed sessions directly from the dashboard in one tap
- **Guided onboarding** — a step-by-step setup flow for courses, topics, and preferences
- **Mobile responsive** — works on phone and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL (via Supabase) |
| ORM / Migrations | SQLAlchemy + Alembic |
| Auth | Clerk (JWT verification against Clerk's JWKS) |
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |

## Security

- Every API route is scoped to the authenticated user via Clerk-verified JWTs — no endpoint trusts a client-supplied user ID
- Postgres Row-Level Security is enabled on every table, closing off the database's public REST API as a bypass path independent of the application layer

## Project Structure

```
revision-planner/
  backend/
    models/          # SQLAlchemy models
    routers/         # FastAPI route handlers (12 routers, 60+ endpoints)
    schemas/         # Pydantic request/response schemas
    services/        # Planner engine logic
    migrations/      # Alembic migration files
    main.py
  frontend/
    src/
      pages/         # React page components
      components/    # Shared components
      context/       # React context providers (session timer)
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Clerk account (for auth keys) and a PostgreSQL database (e.g. Supabase)

### Backend
```bash
cd backend
python -m venv venv
venv/bin/python -m pip install -r requirements.txt
venv/bin/python -m alembic upgrade head
venv/bin/python -m uvicorn main:app --reload --port 8001
```

Requires a `.env` with `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, and `ALLOWED_ORIGINS` (e.g. `http://localhost:5173` for local dev).

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## How It Works

The planner engine scores every topic across all your courses using:
- **Recency** — how long since you last revised it
- **Confidence** — how well you rated yourself after the last session
- **Assessment urgency** — how close an exam or test is for that course

For courses in Learning Mode, topics are additionally split into a learning queue (not yet taught) and a revision queue (already taught), so the planner never schedules revision for content you haven't seen yet.

It then fills free time gaps in your timetable with revision blocks, rotating across courses for balanced coverage, and respects a daily hour cap to keep the schedule realistic.

## Roadmap

- [ ] XP/levels gamification
- [ ] Deeper subject-type adaptation (more session templates)
- [ ] In-app feedback form
- [ ] In-app "how it works" explainer for first-time users
- [ ] Spaced repetition algorithm
- [ ] Mobile app

## Built By

Ben West — Data Science student at the University of Bristol.
Built solo, starting summer 2026, as both a personal tool and a potential product.

[@revisrapp](https://instagram.com/revisrapp)
