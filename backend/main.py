import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    assessments,
    calendar_events,
    courses,
    plan_blocks,
    planner,
    plans,
    resources,
    revision_preferences,
    revision_sessions,
    topic_resources,
    topics,
    users,
)

app = FastAPI(title="Revision Planner API")

_allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
allowed_origins = (
    [origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()]
    if _allowed_origins_env
    else ["https://revision-planner-lyart.vercel.app"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(courses.router)
app.include_router(topics.router)
app.include_router(assessments.router)
app.include_router(calendar_events.router)
app.include_router(revision_sessions.router)
app.include_router(revision_preferences.router)
app.include_router(resources.router)
app.include_router(topic_resources.router)
app.include_router(planner.router)
app.include_router(plans.router)
app.include_router(plan_blocks.router)
