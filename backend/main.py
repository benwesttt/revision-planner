from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import SessionLocal
from models.user import User
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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_default_user():
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            default_user = User(id=1, email="default@revisionai.app", name="Default User")
            db.add(default_user)
            db.commit()
    finally:
        db.close()


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
