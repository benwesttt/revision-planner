from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from models.assessment import Assessment
from models.calendar_event import CalendarEvent
from models.course import Course
from models.plan import Plan, PlanBlock
from models.revision_preference import RevisionPreference
from models.revision_session import RevisionSession
from models.topic import Topic
from models.topic_resource import TopicResource

STUDY_START = time(8, 0)
STUDY_END = time(22, 0)
FULL_SESSION_MINUTES = 50
BREAK_MINUTES = 10
MIN_SESSION_MINUTES = 25
DEFAULT_METHODS = ["active recall", "flashcards", "notes"]


def _merge_events(
    events: List[Tuple[datetime, datetime]],
) -> List[Tuple[datetime, datetime]]:
    if not events:
        return []
    events = sorted(events, key=lambda x: x[0])
    merged = [list(events[0])]
    for start, end in events[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


def _carve_sessions(
    gap_start: datetime, gap_end: datetime
) -> List[Tuple[datetime, datetime]]:
    sessions = []
    cursor = gap_start
    while True:
        remaining_mins = int((gap_end - cursor).total_seconds() / 60)
        if remaining_mins < MIN_SESSION_MINUTES:
            break
        duration = min(FULL_SESSION_MINUTES, remaining_mins)
        sessions.append((cursor, cursor + timedelta(minutes=duration)))
        cursor += timedelta(minutes=duration + BREAK_MINUTES)
    return sessions


def _get_free_slots(
    user_id: int, start_date: date, db: Session
) -> List[Tuple[datetime, datetime]]:
    window_start = datetime.combine(start_date, time.min)
    window_end = datetime.combine(start_date + timedelta(days=7), time.min)

    events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.user_id == user_id,
            CalendarEvent.start_time < window_end,
            CalendarEvent.end_time > window_start,
        )
        .all()
    )

    slots: List[Tuple[datetime, datetime]] = []

    for day_offset in range(7):
        day = start_date + timedelta(days=day_offset)
        study_start = datetime.combine(day, STUDY_START)
        study_end = datetime.combine(day, STUDY_END)

        # Clip events to this day's study window
        day_events: List[Tuple[datetime, datetime]] = []
        for ev in events:
            clipped_start = max(ev.start_time, study_start)
            clipped_end = min(ev.end_time, study_end)
            if clipped_start < clipped_end:
                day_events.append((clipped_start, clipped_end))

        blocked = _merge_events(day_events)

        cursor = study_start
        for block_start, block_end in blocked:
            if block_start > cursor:
                slots.extend(_carve_sessions(cursor, block_start))
            cursor = max(cursor, block_end)
        if cursor < study_end:
            slots.extend(_carve_sessions(cursor, study_end))

    return slots


def _score_topic(
    topic: Topic, today: date, db: Session
) -> Tuple[int, str]:
    score = 0
    reasons: List[str] = []

    last_session: Optional[RevisionSession] = (
        db.query(RevisionSession)
        .filter(RevisionSession.topic_id == topic.id)
        .order_by(RevisionSession.created_at.desc())
        .first()
    )

    if last_session is None:
        score += 100
        reasons.append("never been revised")
    else:
        days_since = max(0, (today - last_session.created_at.date()).days)
        score += min(days_since, 30)
        if days_since == 0:
            reasons.append("revised today")
        else:
            label = "day" if days_since == 1 else "days"
            reasons.append(f"last revised {days_since} {label} ago")

        if last_session.confidence is not None:
            conf_score = (5 - last_session.confidence) * 2
            score += conf_score
            if last_session.confidence <= 2:
                reasons.append(f"low confidence ({last_session.confidence}/5)")

    next_assessment: Optional[Assessment] = (
        db.query(Assessment)
        .filter(
            Assessment.course_id == topic.course_id,
            Assessment.due_date.isnot(None),
            Assessment.due_date >= datetime.combine(today, time.min),
        )
        .order_by(Assessment.due_date)
        .first()
    )

    if next_assessment:
        days_until = (next_assessment.due_date.date() - today).days
        urgency = max(0, 30 - days_until)
        score += urgency
        if urgency > 0:
            label = "day" if days_until == 1 else "days"
            reasons.append(
                f"assessment '{next_assessment.name}' in {days_until} {label}"
            )

    reason = (
        "Chosen because: " + "; ".join(reasons)
        if reasons
        else "Scheduled for regular revision"
    )
    return score, reason


def generate_plan(user_id: int, start_date: date, db: Session) -> Plan:
    # 1. Find free time slots
    slots = _get_free_slots(user_id, start_date, db)
    if not slots:
        raise ValueError("No free time slots found in the next 7 days")

    # 2. Load and score all topics for this user
    courses = db.query(Course).filter(Course.user_id == user_id).all()
    if not courses:
        raise ValueError("No courses found for this user")

    course_ids = [c.id for c in courses]
    topics = db.query(Topic).filter(Topic.course_id.in_(course_ids)).all()
    if not topics:
        raise ValueError("No topics found for this user's courses")

    # 3. Sort by score descending
    scored: List[Tuple[int, str, Topic]] = sorted(
        [(_score_topic(topic, start_date, db) + (topic,)) for topic in topics],
        key=lambda x: x[0],
        reverse=True,
    )

    # 4. Revision methods
    pref: Optional[RevisionPreference] = (
        db.query(RevisionPreference)
        .filter(RevisionPreference.user_id == user_id)
        .first()
    )
    methods: List[str] = (pref.preferred_methods or []) if pref else []
    if not methods:
        methods = DEFAULT_METHODS

    # 5. Build the plan
    plan = Plan(
        user_id=user_id,
        start_date=start_date,
        end_date=start_date + timedelta(days=6),
    )
    db.add(plan)
    db.flush()  # assigns plan.id without committing

    # 6. Fill slots, cycling through topics and methods
    for i, (slot_start, slot_end) in enumerate(slots):
        _score, reason, topic = scored[i % len(scored)]
        method = methods[i % len(methods)]

        tr: Optional[TopicResource] = (
            db.query(TopicResource)
            .filter(TopicResource.topic_id == topic.id)
            .first()
        )

        db.add(
            PlanBlock(
                plan_id=plan.id,
                topic_id=topic.id,
                start_time=slot_start,
                end_time=slot_end,
                method=method,
                resource_id=tr.resource_id if tr else None,
                reason=reason,
            )
        )

    db.commit()
    db.refresh(plan)
    _ = plan.plan_blocks  # trigger lazy load while session is open
    return plan
