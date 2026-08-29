import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';
import { TimerContext } from './timer-context-object';

export function TimerProvider({ children }) {
  const fetchWithAuth = useApi();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth(`${API_BASE_URL}/revision-sessions/current`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled) {
          setSession(data);
          setNow(Date.now());
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!session || session.status !== 'in_progress' || session.paused_at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  const elapsedSeconds = useMemo(() => {
    if (!session?.started_at) return 0;
    const started = new Date(session.started_at).getTime();
    const end = session.paused_at ? new Date(session.paused_at).getTime() : now;
    const pausedTotal = session.paused_duration_seconds ?? 0;
    return Math.max(Math.floor((end - started) / 1000) - pausedTotal, 0);
  }, [session, now]);

  const start = async ({ topicId, method }) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/start`, {
      method: 'POST',
      body: JSON.stringify({ topic_id: topicId, method: method || undefined }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail ?? 'Failed to start session');
    }
    const data = await res.json();
    setSession(data);
    setNow(Date.now());
    return data;
  };

  const pause = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/${session.id}/pause`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to pause session');
    setSession(await res.json());
  };

  const resume = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/${session.id}/resume`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to resume session');
    setSession(await res.json());
    setNow(Date.now());
  };

  const stop = async ({ durationMinutes, confidence, notes, method }) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/${session.id}/stop`, {
      method: 'PATCH',
      body: JSON.stringify({
        duration_minutes: durationMinutes,
        confidence,
        notes: notes || undefined,
        method: method || undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail ?? 'Failed to stop session');
    }
    const data = await res.json();
    setSession(null);
    return data;
  };

  const value = { session, loading, error, elapsedSeconds, start, pause, resume, stop };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
