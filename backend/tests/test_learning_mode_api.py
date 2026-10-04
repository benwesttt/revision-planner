from datetime import date, timedelta

from models.course import Course
from models.topic import Topic


def test_update_topic_rejects_invalid_status(client, db_session, owned_topic):
    resp = client.put(f"/topics/{owned_topic.id}", json={"status": "bogus"})
    assert resp.status_code == 422

    db_session.refresh(owned_topic)
    assert owned_topic.status == 'not_started'


def test_update_topic_persists_taught_status(client, db_session, owned_topic):
    resp = client.put(f"/topics/{owned_topic.id}", json={"status": "taught"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "taught"

    db_session.refresh(owned_topic)
    assert owned_topic.status == 'taught'


def test_create_topic_auto_assigns_sequence_after_highest_existing(client, db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Sequenced Course", color="#10b981", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Gap at 3-4 and an unsequenced topic: the new topic must follow the
    # highest value (5), not fill the gap or count the NULL row.
    db_session.add_all([
        Topic(course_id=course.id, name="Seq 1", sequence_order=1),
        Topic(course_id=course.id, name="Seq 2", sequence_order=2),
        Topic(course_id=course.id, name="Seq 5", sequence_order=5),
        Topic(course_id=course.id, name="Unsequenced", sequence_order=None),
    ])
    db_session.commit()

    resp = client.post("/topics/", json={"course_id": course.id, "name": "New Topic"})
    assert resp.status_code == 201
    assert resp.json()["sequence_order"] == 6


def test_create_topic_in_empty_course_starts_sequence_at_one(client, db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Empty Course", color="#10b981", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    resp = client.post("/topics/", json={"course_id": course.id, "name": "First Topic"})
    assert resp.status_code == 201
    assert resp.json()["sequence_order"] == 1


def test_create_topic_honors_explicit_sequence_order(client, db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Explicit Course", color="#10b981", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    db_session.add(Topic(course_id=course.id, name="Seq 1", sequence_order=1))
    db_session.commit()

    resp = client.post(
        "/topics/", json={"course_id": course.id, "name": "Placed Topic", "sequence_order": 1},
    )
    assert resp.status_code == 201
    assert resp.json()["sequence_order"] == 1


def test_learning_status_returns_422_for_revision_mode_course(client, db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Revision Course", color="#6366f1", mode='revision',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    resp = client.get(f"/courses/{course.id}/learning-status")
    assert resp.status_code == 422


def test_learning_status_lists_topics_behind_pace(client, db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Learning Course", color="#10b981", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    yesterday = date.today() - timedelta(days=1)
    tomorrow = date.today() + timedelta(days=1)

    behind = Topic(
        course_id=course.id, name="Behind Topic", status='not_started',
        sequence_order=1, expected_taught_by=yesterday,
    )
    on_track = Topic(
        course_id=course.id, name="On Track Topic", status='not_started',
        sequence_order=2, expected_taught_by=tomorrow,
    )
    # Overdue but already taught -- must not count as behind pace.
    taught = Topic(
        course_id=course.id, name="Taught Topic", status='taught',
        sequence_order=3, expected_taught_by=yesterday,
    )
    no_target = Topic(
        course_id=course.id, name="No Target Topic", status='not_started', sequence_order=4,
    )
    db_session.add_all([behind, on_track, taught, no_target])
    db_session.commit()
    for t in (behind, on_track, taught, no_target):
        db_session.refresh(t)

    resp = client.get(f"/courses/{course.id}/learning-status")
    assert resp.status_code == 200
    data = resp.json()

    assert data["course_id"] == course.id
    assert data["total_count"] == 4
    assert data["taught_count"] == 1

    behind_ids = {t["id"] for t in data["behind_pace"]}
    assert behind_ids == {behind.id}
