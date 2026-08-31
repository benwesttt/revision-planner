from collections import Counter
from datetime import date, datetime, time, timedelta

from models.calendar_event import CalendarEvent
from models.course import Course
from models.plan import PlanBlock
from models.topic import Topic
from services.planner import _get_free_slots, generate_plan

# A guaranteed Monday, derived rather than hardcoded so the weekday math
# can't be wrong: pick an anchor date, then subtract back to its Monday.
_EVENT_MONDAY = date(2026, 8, 3) - timedelta(days=date(2026, 8, 3).weekday())


def _slot_overlaps(slots, day, start_t, end_t):
    window_start = datetime.combine(day, start_t)
    window_end = datetime.combine(day, end_t)
    return any(s < window_end and e > window_start for s, e in slots)


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


def test_recurring_event_blocks_a_week_after_it_was_entered(db_session, current_user):
    later_monday = _EVENT_MONDAY + timedelta(days=14)

    db_session.add(CalendarEvent(
        user_id=current_user.id,
        title="Weekly Club",
        start_time=datetime.combine(_EVENT_MONDAY, time(9, 0)),
        end_time=datetime.combine(_EVENT_MONDAY, time(10, 0)),
        recurring=True,
        week='both',
    ))
    db_session.commit()

    slots = _get_free_slots(current_user.id, later_monday, db_session)

    # Before the fix, a recurring event outside the query's absolute date
    # window was never even fetched, so it couldn't block anything here.
    assert not _slot_overlaps(slots, later_monday, time(9, 0), time(10, 0))


def test_recurring_event_does_not_block_a_week_before_it_started(db_session, current_user):
    earlier_monday = _EVENT_MONDAY - timedelta(days=14)

    db_session.add(CalendarEvent(
        user_id=current_user.id,
        title="Weekly Club",
        start_time=datetime.combine(_EVENT_MONDAY, time(9, 0)),
        end_time=datetime.combine(_EVENT_MONDAY, time(10, 0)),
        recurring=True,
        week='both',
    ))
    db_session.commit()

    slots = _get_free_slots(current_user.id, earlier_monday, db_session)

    # A recurring event shouldn't retroactively block weeks before it
    # existed — the 9:00-9:50 slot should be free and present as normal.
    assert (
        datetime.combine(earlier_monday, time(9, 0)),
        datetime.combine(earlier_monday, time(9, 50)),
    ) in slots


def test_non_recurring_event_only_blocks_its_own_week(db_session, current_user):
    later_monday = _EVENT_MONDAY + timedelta(days=14)

    db_session.add(CalendarEvent(
        user_id=current_user.id,
        title="One-off Dentist Appointment",
        start_time=datetime.combine(_EVENT_MONDAY, time(9, 0)),
        end_time=datetime.combine(_EVENT_MONDAY, time(10, 0)),
        recurring=False,
        week='both',
    ))
    db_session.commit()

    # Regression check: still blocks its own literal week...
    same_week_slots = _get_free_slots(current_user.id, _EVENT_MONDAY, db_session)
    assert not _slot_overlaps(same_week_slots, _EVENT_MONDAY, time(9, 0), time(10, 0))

    # ...but must NOT leak into a different week two weeks later, since
    # it was never marked recurring.
    later_week_slots = _get_free_slots(current_user.id, later_monday, db_session)
    assert (
        datetime.combine(later_monday, time(9, 0)),
        datetime.combine(later_monday, time(9, 50)),
    ) in later_week_slots
