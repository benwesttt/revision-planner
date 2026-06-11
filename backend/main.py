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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://revision-planner-lyart.vercel.app"],
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
