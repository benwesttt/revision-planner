from collections import Counter
from datetime import date

from models.course import Course
from models.plan import PlanBlock
from models.topic import Topic
from services.planner import generate_plan


def test_topics_rotate_when_slots_outnumber_topics(db_session, current_user):
    # One course, two never-revised topics with no assessments — they score
    # identically, so nothing but the rotation logic distinguishes them.
    course = Course(user_id=current_user.id, name="Rotation Course", color="#6366f1")
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topic_a = Topic(course_id=course.id, name="Topic A")
    topic_b = Topic(course_id=course.id, name="Topic B")
    db_session.add_all([topic_a, topic_b])
    db_session.commit()
    db_session.refresh(topic_a)
    db_session.refresh(topic_b)

    start_date = date(2026, 9, 1)
    plan = generate_plan(current_user.id, start_date, db_session)

    first_day_blocks = (
        db_session.query(PlanBlock)
        .filter(PlanBlock.plan_id == plan.id)
        .order_by(PlanBlock.start_time)
        .all()
    )
    first_day_blocks = [b for b in first_day_blocks if b.start_time.date() == start_date]

    # A full 8am-10pm day with no calendar events carves well over 4 slots,
    # so this scenario (2 topics, 4+ slots) is satisfied without any extra setup.
    assert len(first_day_blocks) >= 4

    first_four_topic_ids = [b.topic_id for b in first_day_blocks[:4]]
    counts = Counter(first_four_topic_ids)

    # Both topics must appear, evenly, across the first 4 slots. Before the
    # fix, the 3rd/4th slots (and every slot after) collapsed onto whichever
    # topic scored[0] was, e.g. {topic_a: 3, topic_b: 1} instead of {2, 2}.
    assert set(counts) == {topic_a.id, topic_b.id}
    assert set(counts.values()) == {2}
