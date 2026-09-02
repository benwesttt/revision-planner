from datetime import datetime, timedelta

import pytest

from models.course import Course
from models.plan import Plan, PlanBlock
from models.topic import Topic


@pytest.fixture()
def owned_plan_block(db_session, current_user, owned_topic):
    plan = Plan(
        user_id=current_user.id,
        start_date=datetime(2026, 9, 1).date(),
        end_date=datetime(2026, 9, 7).date(),
    )
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    block = PlanBlock(
        plan_id=plan.id,
        topic_id=owned_topic.id,
        start_time=datetime(2026, 9, 1, 9, 0),
        end_time=datetime(2026, 9, 1, 9, 30),
        method="active_recall",
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)
    return block


@pytest.fixture()
def other_users_plan_block(db_session, other_user, other_users_topic):
    plan = Plan(
        user_id=other_user.id,
        start_date=datetime(2026, 9, 1).date(),
        end_date=datetime(2026, 9, 7).date(),
    )
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    block = PlanBlock(
        plan_id=plan.id,
        topic_id=other_users_topic.id,
        start_time=datetime(2026, 9, 1, 9, 0),
        end_time=datetime(2026, 9, 1, 9, 45),
        method="active_recall",
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)
    return block


@pytest.fixture()
def owned_plan_block_other_topic(db_session, current_user, owned_topic):
    """A plan block owned by current_user but tied to a different topic."""
    other_topic = Topic(course_id=owned_topic.course_id, name="Other Topic In Same Course")
    db_session.add(other_topic)
    db_session.commit()
    db_session.refresh(other_topic)

    plan = Plan(
        user_id=current_user.id,
        start_date=datetime(2026, 9, 1).date(),
        end_date=datetime(2026, 9, 7).date(),
    )
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    block = PlanBlock(
        plan_id=plan.id,
        topic_id=other_topic.id,
        start_time=datetime(2026, 9, 1, 9, 0),
        end_time=datetime(2026, 9, 1, 9, 20),
        method="active_recall",
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)
    return block


def test_create_session_with_valid_plan_block_computes_planned_duration(
    client, owned_topic, owned_plan_block
):
    resp = client.post(
        "/revision-sessions/",
        json={
            "user_id": 1,
            "topic_id": owned_topic.id,
            "plan_block_id": owned_plan_block.id,
            "method": "active_recall",
            "duration_minutes": 20,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["plan_block_id"] == owned_plan_block.id
    assert body["planned_duration_minutes"] == 30


def test_list_sessions_includes_planned_duration_for_linked_block(
    client, owned_topic, owned_plan_block
):
    created = client.post(
        "/revision-sessions/",
        json={
            "user_id": 1,
            "topic_id": owned_topic.id,
            "plan_block_id": owned_plan_block.id,
            "method": "active_recall",
            "duration_minutes": 20,
        },
    )
    assert created.status_code == 201
    session_id = created.json()["id"]

    resp = client.get("/revision-sessions/")
    assert resp.status_code == 200
    listed = next(s for s in resp.json() if s["id"] == session_id)
    assert listed["plan_block_id"] == owned_plan_block.id
    assert listed["planned_duration_minutes"] == 30


def test_create_session_rejects_plan_block_owned_by_another_user(
    client, owned_topic, other_users_plan_block
):
    resp = client.post(
        "/revision-sessions/",
        json={
            "user_id": 1,
            "topic_id": owned_topic.id,
            "plan_block_id": other_users_plan_block.id,
            "method": "active_recall",
            "duration_minutes": 20,
        },
    )
    assert resp.status_code == 404


def test_create_session_rejects_plan_block_with_mismatched_topic(
    client, owned_topic, owned_plan_block_other_topic
):
    resp = client.post(
        "/revision-sessions/",
        json={
            "user_id": 1,
            "topic_id": owned_topic.id,
            "plan_block_id": owned_plan_block_other_topic.id,
            "method": "active_recall",
            "duration_minutes": 20,
        },
    )
    assert resp.status_code == 422


def test_session_without_plan_block_has_null_planned_duration(client, owned_topic):
    resp = client.post(
        "/revision-sessions/",
        json={
            "user_id": 1,
            "topic_id": owned_topic.id,
            "method": "active_recall",
            "duration_minutes": 20,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["plan_block_id"] is None
    assert body["planned_duration_minutes"] is None


def test_start_accepts_and_stores_plan_block_id(client, owned_topic, owned_plan_block):
    resp = client.post(
        "/revision-sessions/start",
        json={"topic_id": owned_topic.id, "plan_block_id": owned_plan_block.id},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["plan_block_id"] == owned_plan_block.id
    assert body["planned_duration_minutes"] == 30


def test_start_rejects_plan_block_owned_by_another_user(
    client, owned_topic, other_users_plan_block
):
    resp = client.post(
        "/revision-sessions/start",
        json={"topic_id": owned_topic.id, "plan_block_id": other_users_plan_block.id},
    )
    assert resp.status_code == 404


def test_start_rejects_plan_block_with_mismatched_topic(
    client, owned_topic, owned_plan_block_other_topic
):
    resp = client.post(
        "/revision-sessions/start",
        json={"topic_id": owned_topic.id, "plan_block_id": owned_plan_block_other_topic.id},
    )
    assert resp.status_code == 422
