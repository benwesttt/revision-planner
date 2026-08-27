from datetime import datetime, timezone


def test_current_returns_null_when_no_session_in_progress(client):
    resp = client.get("/revision-sessions/current")
    assert resp.status_code == 200
    assert resp.json() is None


def test_full_start_pause_resume_stop_lifecycle(client, owned_topic):
    start_resp = client.post(
        "/revision-sessions/start", json={"topic_id": owned_topic.id}
    )
    assert start_resp.status_code == 201
    session = start_resp.json()
    assert session["status"] == "in_progress"
    assert session["topic_id"] == owned_topic.id
    assert session["paused_duration_seconds"] == 0
    assert session["started_at"] is not None

    started_at = datetime.fromisoformat(session["started_at"])
    assert started_at.tzinfo is not None
    assert started_at.utcoffset() is not None

    session_id = session["id"]

    current_resp = client.get("/revision-sessions/current")
    assert current_resp.status_code == 200
    assert current_resp.json()["id"] == session_id

    pause_resp = client.patch(f"/revision-sessions/{session_id}/pause")
    assert pause_resp.status_code == 200
    paused_session = pause_resp.json()
    assert paused_session["paused_at"] is not None
    assert paused_session["status"] == "in_progress"

    resume_resp = client.patch(f"/revision-sessions/{session_id}/resume")
    assert resume_resp.status_code == 200
    resumed_session = resume_resp.json()
    assert resumed_session["paused_at"] is None
    assert resumed_session["paused_duration_seconds"] >= 0

    stop_resp = client.patch(
        f"/revision-sessions/{session_id}/stop",
        json={"duration_minutes": 25, "confidence": 4, "notes": "Covered chapter 3"},
    )
    assert stop_resp.status_code == 200
    stopped_session = stop_resp.json()
    assert stopped_session["status"] == "completed"
    assert stopped_session["duration_minutes"] == 25
    assert stopped_session["confidence"] == 4
    assert stopped_session["notes"] == "Covered chapter 3"

    current_after_stop_resp = client.get("/revision-sessions/current")
    assert current_after_stop_resp.status_code == 200
    assert current_after_stop_resp.json() is None


def test_start_rejects_topic_owned_by_another_user(client, other_users_topic):
    resp = client.post(
        "/revision-sessions/start", json={"topic_id": other_users_topic.id}
    )
    assert resp.status_code == 404


def test_start_rejects_second_session_while_one_in_progress(client, owned_topic):
    first = client.post("/revision-sessions/start", json={"topic_id": owned_topic.id})
    assert first.status_code == 201

    second = client.post("/revision-sessions/start", json={"topic_id": owned_topic.id})
    assert second.status_code == 409


def test_pause_and_resume_require_in_progress_session(client, owned_topic):
    start_resp = client.post("/revision-sessions/start", json={"topic_id": owned_topic.id})
    session_id = start_resp.json()["id"]

    resume_before_pause = client.patch(f"/revision-sessions/{session_id}/resume")
    assert resume_before_pause.status_code == 400

    client.patch(f"/revision-sessions/{session_id}/pause")
    double_pause = client.patch(f"/revision-sessions/{session_id}/pause")
    assert double_pause.status_code == 400

    client.patch(f"/revision-sessions/{session_id}/resume")
    client.patch(
        f"/revision-sessions/{session_id}/stop",
        json={"duration_minutes": 10},
    )

    stop_again = client.patch(
        f"/revision-sessions/{session_id}/stop",
        json={"duration_minutes": 10},
    )
    assert stop_again.status_code == 400
