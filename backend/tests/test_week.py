from datetime import date, timedelta

import pytest

import services.planner as planner
from models.course import Course
from models.revision_preference import RevisionPreference
from models.topic import Topic
from services.planner import generate_plan
from services.week import anchor_for_week, effective_current_week, week_for_date

# A Monday that we treat as the start of a Week A. Asserted below so a typo
# in the literal can't silently turn these into Tuesday-anchored tests.
ANCHOR = date(2026, 9, 7)
assert ANCHOR.weekday() == 0


def _monday_of(d):
    return d - timedelta(days=d.weekday())


# --- week_for_date -----------------------------------------------------------

def test_anchor_week_is_A():
    assert week_for_date(ANCHOR, ANCHOR) == 'A'
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=6)) == 'A'  # Sunday


def test_following_week_is_B():
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=7)) == 'B'  # Monday
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=13)) == 'B'  # Sunday


def test_two_weeks_on_is_A_again():
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=14)) == 'A'


def test_dates_before_anchor_alternate_correctly():
    # Sunday just before the anchor belongs to the previous week (-1) → B.
    assert week_for_date(ANCHOR, ANCHOR - timedelta(days=1)) == 'B'
    # Monday of the previous week → B.
    assert week_for_date(ANCHOR, ANCHOR - timedelta(days=7)) == 'B'
    # Monday two weeks before → A.
    assert week_for_date(ANCHOR, ANCHOR - timedelta(days=14)) == 'A'


def test_sunday_to_monday_boundary_flips_week():
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=6)) == 'A'
    assert week_for_date(ANCHOR, ANCHOR + timedelta(days=7)) == 'B'


# --- effective_current_week --------------------------------------------------

def test_fallback_to_stored_week_when_anchor_is_null():
    pref = RevisionPreference(current_week='B', week_a_anchor=None)
    assert effective_current_week(pref, ANCHOR) == 'B'
    assert effective_current_week(pref, ANCHOR + timedelta(days=7)) == 'B'


def test_no_preference_row_defaults_to_A():
    assert effective_current_week(None, ANCHOR) == 'A'


def test_anchor_takes_precedence_over_stored_week():
    # Stored 'A' is stale; the anchor says next week is B.
    pref = RevisionPreference(current_week='A', week_a_anchor=ANCHOR)
    assert effective_current_week(pref, ANCHOR + timedelta(days=7)) == 'B'


# --- anchor_for_week ---------------------------------------------------------

def test_anchor_for_A_is_this_monday():
    today = date(2026, 10, 4)  # a Sunday
    assert anchor_for_week('A', today) == date(2026, 9, 28)


def test_anchor_for_B_is_previous_monday():
    today = date(2026, 10, 4)
    assert anchor_for_week('B', today) == date(2026, 9, 21)


# --- PATCH /revision-preferences/current-week --------------------------------

@pytest.mark.parametrize("requested", ['A', 'B'])
def test_patch_reanchors_so_requested_week_is_effective_today(
    client, db_session, current_user, requested
):
    today = date.today()
    response = client.patch(f"/revision-preferences/current-week?current_week={requested}")
    assert response.status_code == 200
    assert response.json()['current_week'] == requested

    pref = db_session.query(RevisionPreference).filter_by(user_id=current_user.id).one()
    assert pref.current_week == requested
    assert pref.week_a_anchor == anchor_for_week(requested, today)
    assert effective_current_week(pref, today) == requested


@pytest.mark.parametrize("requested", ['A', 'B'])
def test_patch_week_flips_next_week(client, db_session, current_user, requested):
    other = 'B' if requested == 'A' else 'A'
    client.patch(f"/revision-preferences/current-week?current_week={requested}")

    pref = db_session.query(RevisionPreference).filter_by(user_id=current_user.id).one()
    next_monday = _monday_of(date.today()) + timedelta(days=7)
    assert effective_current_week(pref, next_monday) == other


def test_patch_creates_row_when_absent(client, db_session, current_user):
    assert db_session.query(RevisionPreference).filter_by(user_id=current_user.id).count() == 0
    response = client.patch("/revision-preferences/current-week?current_week=B")
    assert response.status_code == 200
    assert db_session.query(RevisionPreference).filter_by(user_id=current_user.id).count() == 1


def test_patch_rejects_invalid_week(client):
    response = client.patch("/revision-preferences/current-week?current_week=C")
    assert response.status_code == 422


# --- GET reports effective week without persisting it -----------------------

def test_get_reports_effective_week_without_writing_it_back(client, db_session, current_user):
    # Anchor one week ago → today is B, but the stored column still says A.
    pref = RevisionPreference(
        user_id=current_user.id,
        current_week='A',
        week_a_anchor=anchor_for_week('B', date.today()),
    )
    db_session.add(pref)
    db_session.commit()

    body = client.get("/revision-preferences/").json()[0]
    assert body['current_week'] == 'B'
    assert body['week_a_anchor'] == pref.week_a_anchor.isoformat()

    db_session.refresh(pref)
    assert pref.current_week == 'A'


# --- Other endpoints that accept current_week re-anchor too -----------------

def test_put_current_week_reanchors(client, db_session, current_user):
    pref = RevisionPreference(user_id=current_user.id, current_week='A', week_a_anchor=None)
    db_session.add(pref)
    db_session.commit()
    db_session.refresh(pref)

    response = client.put(f"/revision-preferences/{pref.id}", json={'current_week': 'B'})
    assert response.status_code == 200

    db_session.refresh(pref)
    assert pref.current_week == 'B'
    assert effective_current_week(pref, date.today()) == 'B'


def test_post_creates_anchored_row(client, db_session, current_user):
    response = client.post("/revision-preferences/", json={'user_id': 0, 'current_week': 'B'})
    assert response.status_code == 201
    pref = db_session.query(RevisionPreference).filter_by(user_id=current_user.id).one()
    assert pref.week_a_anchor == anchor_for_week('B', date.today())
    assert response.json()['current_week'] == 'B'


# --- planner uses the week for start_date, not today ------------------------

def test_generate_plan_uses_week_for_start_date_not_today(db_session, current_user, monkeypatch):
    today = date.today()
    start_date = _monday_of(today) + timedelta(days=7)  # next week's Monday

    pref = RevisionPreference(
        user_id=current_user.id, current_week='A', week_a_anchor=anchor_for_week('A', today),
    )
    db_session.add(pref)
    course = Course(user_id=current_user.id, name="Week Course", color="#ffffff", mode='revision')
    db_session.add(course)
    db_session.commit()
    db_session.add(Topic(course_id=course.id, name="Week Topic"))
    db_session.commit()

    # Premise: today is Week A, so a plan starting next Monday must use Week B.
    assert effective_current_week(pref, today) == 'A'
    assert effective_current_week(pref, start_date) == 'B'

    captured = {}
    original = planner._get_free_slots

    def spy(*args, **kwargs):
        captured['current_week'] = kwargs['current_week']
        return original(*args, **kwargs)

    monkeypatch.setattr(planner, '_get_free_slots', spy)
    generate_plan(current_user.id, start_date, db_session)

    assert captured['current_week'] == 'B'
