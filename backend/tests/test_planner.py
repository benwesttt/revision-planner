from collections import Counter
from datetime import date, datetime, time, timedelta

from models.calendar_event import CalendarEvent
from models.course import Course
from models.plan import PlanBlock
from models.revision_preference import RevisionPreference
from models.topic import Topic
from services.planner import _get_free_slots, generate_plan

# A guaranteed Monday, derived rather than hardcoded so the weekday math
# can't be wrong: pick an anchor date, then subtract back to its Monday.
_EVENT_MONDAY = date(2026, 8, 3) - timedelta(days=date(2026, 8, 3).weekday())


def _slot_overlaps(slots, day, start_t, end_t):
    window_start = datetime.combine(day, start_t)
    window_end = datetime.combine(day, end_t)
    return any(s < window_end and e > window_start for s, e in slots)


def _plan_blocks(db_session, plan):
    return (
        db_session.query(PlanBlock)
        .filter(PlanBlock.plan_id == plan.id)
        .order_by(PlanBlock.start_time)
        .all()
    )


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


def test_revision_mode_course_ignores_status_and_schedules_normally(db_session, current_user):
    # Regression guard: the Learning Mode migration defaulted every existing
    # topic's status to 'not_started', including topics that have genuinely
    # already been revised. For a revision-mode course (the default for
    # every course that existed before this feature), status must be
    # completely ignored — scheduling must be identical to before.
    course = Course(
        user_id=current_user.id, name="Rotation Course", color="#6366f1", mode='revision',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topic_a = Topic(course_id=course.id, name="Topic A", status='not_started')
    topic_b = Topic(course_id=course.id, name="Topic B", status='not_started')
    db_session.add_all([topic_a, topic_b])
    db_session.commit()
    db_session.refresh(topic_a)
    db_session.refresh(topic_b)

    start_date = date(2026, 9, 1)
    plan = generate_plan(current_user.id, start_date, db_session)

    first_day_blocks = [b for b in _plan_blocks(db_session, plan) if b.start_time.date() == start_date]
    assert len(first_day_blocks) >= 4

    # Same assertion as the pre-existing rotation regression test: both
    # topics appear, evenly, across the first 4 slots.
    counts = Counter(b.topic_id for b in first_day_blocks[:4])
    assert set(counts) == {topic_a.id, topic_b.id}
    assert set(counts.values()) == {2}


def test_learning_mode_course_hits_target_ratio_across_slots(db_session, current_user):
    # 8 of 10 topics untaught (sequenced 1-8), 2 taught -> target_ratio 0.8.
    # A single course means every slot in the day goes to it, isolating the
    # ratio-tracking logic from cross-course rotation.
    # Default MAX_REVISION_HOURS_PER_DAY (6h) caps a default-length day at 8
    # blocks; raise it so all 10 needed slots fit in a single day.
    db_session.add(RevisionPreference(user_id=current_user.id, daily_hours_target=10))

    course = Course(
        user_id=current_user.id, name="Learning Course", color="#10b981", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    learning_topics = [
        Topic(course_id=course.id, name=f"Untaught {i}", status='not_started', sequence_order=i)
        for i in range(1, 9)
    ]
    taught_topics = [
        Topic(course_id=course.id, name=f"Taught {i}", status='taught') for i in range(1, 3)
    ]
    db_session.add_all(learning_topics + taught_topics)
    db_session.commit()
    for t in learning_topics + taught_topics:
        db_session.refresh(t)

    start_date = date(2026, 9, 1)
    plan = generate_plan(current_user.id, start_date, db_session)

    first_ten = [b for b in _plan_blocks(db_session, plan) if b.start_time.date() == start_date][:10]
    assert len(first_ten) == 10

    learning_ids = {t.id for t in learning_topics}
    taught_ids = {t.id for t in taught_topics}
    learning_count = sum(1 for b in first_ten if b.topic_id in learning_ids)
    revision_count = sum(1 for b in first_ten if b.topic_id in taught_ids)

    assert learning_count + revision_count == 10
    # The greedy deficit algorithm converges exactly to 8/10 = 0.8 over 10
    # slots; +-1 tolerance for "roughly" per spec, without weakening the
    # test enough to miss a genuinely broken ratio (e.g. reversed logic).
    assert abs(learning_count - 8) <= 1
    assert abs(revision_count - 2) <= 1

    # Aggregate counts alone aren't enough to catch a real bug here: with
    # every topic tied at the same never-revised score, a naive "just march
    # through scored in order, ignoring ratio" implementation would also
    # land on 8 learning + 2 revision purely because the pools happen to be
    # sized 8 and 2 -- it would just cluster them (learning x8, then
    # revision x2) instead of interleaving them. Assert the actual sequence
    # matches the hand-traced greedy deficit pattern, which is the only
    # thing that distinguishes "ratio-aware" from "coincidentally similar
    # totals".
    pool_sequence = ['learning' if b.topic_id in learning_ids else 'revision' for b in first_ten]
    assert pool_sequence == [
        'learning', 'revision', 'learning', 'learning', 'learning',
        'revision', 'learning', 'learning', 'learning', 'learning',
    ]


def test_learning_mode_course_with_no_taught_topics_only_uses_learning_queue(db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Brand New Course", color="#f59e0b", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topics = [
        Topic(course_id=course.id, name=f"Topic {i}", status='not_started', sequence_order=i)
        for i in range(1, 6)
    ]
    db_session.add_all(topics)
    db_session.commit()
    for t in topics:
        db_session.refresh(t)

    start_date = date(2026, 9, 1)
    # Must not raise: before the fix, this course had zero representation in
    # `scored` (no taught topics) and could never win a slot at all.
    plan = generate_plan(current_user.id, start_date, db_session)

    first_day_blocks = [b for b in _plan_blocks(db_session, plan) if b.start_time.date() == start_date]
    assert len(first_day_blocks) >= 5

    topic_ids = {t.id for t in topics}
    assert all(b.topic_id in topic_ids for b in first_day_blocks[:5])


def test_learning_mode_course_with_everything_taught_behaves_like_revision(db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Fully Taught Course", color="#3b82f6", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    topic_a = Topic(course_id=course.id, name="Topic A", status='taught')
    topic_b = Topic(course_id=course.id, name="Topic B", status='taught')
    db_session.add_all([topic_a, topic_b])
    db_session.commit()
    db_session.refresh(topic_a)
    db_session.refresh(topic_b)

    start_date = date(2026, 9, 1)
    plan = generate_plan(current_user.id, start_date, db_session)

    first_day_blocks = [b for b in _plan_blocks(db_session, plan) if b.start_time.date() == start_date]
    assert len(first_day_blocks) >= 4

    # target_ratio is 0 (nothing untaught), so every pick comes from
    # revision scoring — same rotation pattern as a plain revision course,
    # never the (empty) learning queue.
    counts = Counter(b.topic_id for b in first_day_blocks[:4])
    assert set(counts) == {topic_a.id, topic_b.id}
    assert set(counts.values()) == {2}

    for b in first_day_blocks[:4]:
        assert "Pre-learning" not in b.reason


def test_topic_with_null_sequence_order_excluded_from_learning_queue(db_session, current_user):
    course = Course(
        user_id=current_user.id, name="Partial Sequence Course", color="#ec4899", mode='learning',
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    seq_1 = Topic(course_id=course.id, name="Sequenced 1", status='not_started', sequence_order=1)
    seq_2 = Topic(course_id=course.id, name="Sequenced 2", status='not_started', sequence_order=2)
    unsequenced = Topic(course_id=course.id, name="Unsequenced", status='not_started', sequence_order=None)
    db_session.add_all([seq_1, seq_2, unsequenced])
    db_session.commit()
    for t in (seq_1, seq_2, unsequenced):
        db_session.refresh(t)

    start_date = date(2026, 9, 1)
    plan = generate_plan(current_user.id, start_date, db_session)

    all_topic_ids = {b.topic_id for b in _plan_blocks(db_session, plan)}

    # The unsequenced topic is unschedulable by design (not in `scored`,
    # since this is a learning-mode course and it's not taught; not in the
    # queue, since it has no sequence_order) — it must never appear, while
    # the two sequenced topics do.
    assert unsequenced.id not in all_topic_ids
    assert seq_1.id in all_topic_ids
    assert seq_2.id in all_topic_ids
