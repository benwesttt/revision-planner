import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from database import Base, get_db
import models  # noqa: F401 — ensures all models are registered with Base
from models.course import Course
from models.user import User
from models.topic import Topic
from auth import get_current_user
from main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def current_user(db_session):
    user = User(clerk_user_id="clerk_test_user", email="test@example.com", name="Test User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def other_user(db_session):
    user = User(clerk_user_id="clerk_other_user", email="other@example.com", name="Other User")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def owned_topic(db_session, current_user):
    course = Course(user_id=current_user.id, name="Test Course", color="#ffffff")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topic = Topic(course_id=course.id, name="Test Topic")
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)
    return topic


@pytest.fixture()
def other_users_topic(db_session, other_user):
    course = Course(user_id=other_user.id, name="Other Course", color="#000000")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topic = Topic(course_id=course.id, name="Other Topic")
    db_session.add(topic)
    db_session.commit()
    db_session.refresh(topic)
    return topic


@pytest.fixture()
def client(db_session, current_user):
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass

    def _get_current_user_override():
        return db_session.query(User).filter(User.id == current_user.id).first()

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _get_current_user_override
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
