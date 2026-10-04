from datetime import date, timedelta
from typing import Optional

from models.revision_preference import RevisionPreference


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def week_for_date(anchor: date, d: date) -> str:
    """Return 'A' or 'B' for the Mon–Sun week containing `d`.

    `anchor` is any date inside a Week A; its Monday is the reference point.
    Whole weeks are counted from that Monday: even → 'A', odd → 'B'. Floor
    division keeps dates before the anchor correct (-1 week → odd → 'B').
    """
    weeks_since_anchor = (_monday_of(d) - _monday_of(anchor)).days // 7
    return 'A' if weeks_since_anchor % 2 == 0 else 'B'


def anchor_for_week(week: str, today: date) -> date:
    """Return the Monday that makes `week` the effective week on `today`."""
    this_monday = _monday_of(today)
    return this_monday if week == 'A' else this_monday - timedelta(days=7)


def apply_current_week(pref: RevisionPreference, week: str, today: date) -> None:
    """Set the stored week and re-anchor so both always agree."""
    pref.current_week = week
    pref.week_a_anchor = anchor_for_week(week, today)


def effective_current_week(pref: Optional[RevisionPreference], today: date) -> str:
    """Week for `today`, derived from the anchor when one is set.

    Rows without an anchor fall back to the stored `current_week` (default 'A'),
    so existing preferences behave as they did before anchoring existed.
    """
    if pref is not None and pref.week_a_anchor is not None:
        return week_for_date(pref.week_a_anchor, today)
    if pref is not None and pref.current_week:
        return pref.current_week
    return 'A'
