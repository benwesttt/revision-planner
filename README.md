# RevisionAI — Academic Revision Planner

A full-stack web app that acts as a personal revision decision engine for university students. Instead of manually deciding what to study, RevisionAI generates a personalised day-by-day revision schedule based on your courses, topics, assessments, timetable, and revision history.

## The Problem

Most students don't struggle because they're lazy — they struggle because they constantly have to decide:
- What is most important to revise?
- When should I do it?
- How should I revise it?
- How do I balance revision around lectures, gym, and other commitments?

RevisionAI removes those decisions.

## Features

- **Intelligent scheduling** — generates a 7-day rolling revision plan fitted around your real timetable
- **Topic-level tracking** — logs revision sessions by topic with confidence ratings, so the planner gets smarter over time
- **Priority scoring** — topics are ranked by recency, confidence, and upcoming assessment urgency
- **Specific instructions** — each block tells you what to revise, which resource to use, and exactly how to do the session
- **Week A/B timetable support** — handles fortnightly university timetables
- **Revision method preferences** — only schedules methods you actually use
- **Unified timeline** — plan view shows lectures and revision blocks interleaved in chronological order
- **Quick logging** — log completed sessions directly from the dashboard in one tap
- **Mobile responsive** — works on phone and desktop
- **Onboarding flow** — guided setup to get your courses, topics, and preferences in quickly

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | SQLite (via SQLAlchemy ORM) |
| Migrations | Alembic |
| Frontend | React + Vite |
| Styling | Tailwind CSS |

## Project Structure
```
revision-planner/
backend/
  models/          # SQLAlchemy models (11 models)
  routers/         # FastAPI route handlers
  schemas/         # Pydantic request/response schemas
  services/        # Planner engine logic
  migrations/      # Alembic migration files
  main.py
frontend/
  src/
    pages/         # React page components
    components/    # Shared components
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend
```bash
cd backend
python -m venv venv
venv/bin/python -m pip install -r requirements.txt
venv/bin/python -m alembic upgrade head
venv/bin/python -m uvicorn main:app --reload --port 8001
```

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

It then fills free time gaps in your timetable with revision blocks, rotating across courses to ensure balanced coverage, and respects a daily hour cap to keep the schedule realistic.

## Roadmap

- [ ] User authentication (Clerk)
- [ ] Cloud deployment (Railway + Vercel)
- [ ] Location-aware buffer time between events
- [ ] Spaced repetition algorithm
- [ ] Mobile app

## Built By

Ben West — Data Science student at the University of Bristol.  
Built during summer 2026 as both a personal tool and potential product.

[@benwesttt](https://github.com/benwesttt)
