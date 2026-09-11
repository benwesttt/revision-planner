import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';

const USER_ID = 1;

const METHODS = ['flashcards', 'practice questions', 'past papers', 'blurting', 'review notes'];

function nowLocalISO() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Stars({ value }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg
          key={n}
          className={`w-3.5 h-3.5 ${n <= value ? 'text-accent' : 'text-ink-muted'}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function LogSession() {
  const fetchWithAuth = useApi();
  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Maps for displaying session history
  const [courseMap, setCourseMap] = useState({});
  const [topicMap, setTopicMap] = useState({});

  const [form, setForm] = useState({
    course_id: '',
    topic_id: '',
    method: METHODS[0],
    duration_minutes: 50,
    confidence: 3,
    logged_at: nowLocalISO(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/?user_id=${USER_ID}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.slice().reverse());
    }
  }, [fetchWithAuth]);

  // Load courses + build lookup maps on mount
  useEffect(() => {
    async function init() {
      const res = await fetchWithAuth(`${API_BASE_URL}/courses/?user_id=${USER_ID}`);
      if (!res.ok) return;
      const data = await res.json();
      setCourses(data);

      const cMap = {};
      data.forEach(c => { cMap[c.id] = c.name; });
      setCourseMap(cMap);

      const topicLists = await Promise.all(
        data.map(c =>
          fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${c.id}`)
            .then(r => (r.ok ? r.json() : []))
        )
      );
      const tMap = {};
      topicLists.flat().forEach(t => { tMap[t.id] = { name: t.name, courseId: t.course_id }; });
      setTopicMap(tMap);
    }
    init();
    fetchSessions();
  }, [fetchWithAuth, fetchSessions]);

  // Refresh topics dropdown when course changes
  useEffect(() => {
    if (!form.course_id) {
      setTopics([]);
      setForm(f => ({ ...f, topic_id: '' }));
      return;
    }
    fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${form.course_id}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setTopics(data);
        setForm(f => ({ ...f, topic_id: data[0]?.id ?? '' }));
      });
  }, [form.course_id, fetchWithAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic_id) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          topic_id: Number(form.topic_id),
          method: form.method,
          duration_minutes: Number(form.duration_minutes),
          confidence: form.confidence,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? 'Failed to log session');
      }
      setSuccess(true);
      setForm(f => ({ ...f, logged_at: nowLocalISO() }));
      await fetchSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCourses = courses.filter(c => c.is_active);
  const inactiveCourses = courses.filter(c => !c.is_active);

  const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent w-full';
  const labelCls = 'flex flex-col gap-1';
  const labelTextCls = 'text-xs text-ink-secondary';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink mb-4">Log Session</h1>

      <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-ink-secondary">
        <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Want to quickly log today's scheduled sessions?</span>
        <Link to="/" className="ml-auto text-accent hover:text-accent-hover font-medium transition-colors whitespace-nowrap">
          Go to Dashboard →
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 mb-8"
      >
        {/* Course + Topic row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Course</span>
            <select
              value={form.course_id}
              onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
              className={inputCls}
              required
            >
              <option value="">Select course…</option>
              {activeCourses.length > 0 && (
                <optgroup label="Active" className="text-ink-secondary font-normal">
                  {activeCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {inactiveCourses.length > 0 && (
                <optgroup label="Inactive" className="text-ink-muted font-normal">
                  {inactiveCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className={labelCls}>
            <span className={labelTextCls}>Topic</span>
            <select
              value={form.topic_id}
              onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}
              className={inputCls}
              required
              disabled={!form.course_id}
            >
              <option value="">Select topic…</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Method */}
        <label className={labelCls}>
          <span className={labelTextCls}>Method</span>
          <select
            value={form.method}
            onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
            className={inputCls}
          >
            {METHODS.map(m => (
              <option key={m} value={m} className="capitalize">{m}</option>
            ))}
          </select>
        </label>

        {/* Duration + Date row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Duration (minutes)</span>
            <input
              type="number"
              min={1}
              value={form.duration_minutes}
              onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
              className={inputCls}
              required
            />
          </label>

          <label className={labelCls}>
            <span className={labelTextCls}>Date &amp; time</span>
            <input
              type="datetime-local"
              value={form.logged_at}
              onChange={e => setForm(f => ({ ...f, logged_at: e.target.value }))}
              className={`${inputCls} [color-scheme:dark]`}
            />
          </label>
        </div>

        {/* Confidence */}
        <div className={labelCls}>
          <span className={labelTextCls}>Confidence</span>
          <div className="flex gap-1.5 mt-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setForm(f => ({ ...f, confidence: n }))}
                className="focus:outline-none"
                aria-label={`Confidence ${n}`}
              >
                <svg
                  className={`w-7 h-7 transition-colors ${n <= form.confidence ? 'text-accent' : 'text-ink-muted hover:text-ink-secondary'}`}
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            <span className="ml-1 text-sm text-ink-secondary self-center">{form.confidence} / 5</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-bg border border-danger/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-success bg-success-bg border border-success/40 rounded-lg px-3 py-2">
            Session logged!
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Saving…' : 'Log Session'}
          </button>
        </div>
      </form>

      {/* Recent sessions */}
      <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-widest mb-3">
        Recent Sessions
      </h2>

      {sessions.length === 0 ? (
        <p className="text-sm text-ink-muted">No sessions logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(s => {
            const topic = topicMap[s.topic_id];
            const courseName = topic ? courseMap[topic.courseId] : null;
            return (
              <div
                key={s.id}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-ink truncate">
                      {topic?.name ?? `Topic ${s.topic_id}`}
                    </span>
                    {courseName && (
                      <>
                        <span className="text-ink-muted">·</span>
                        <span className="text-sm text-ink-secondary truncate">{courseName}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span className="capitalize">{s.method}</span>
                    <span>{s.duration_minutes} min</span>
                    <span>{formatDate(s.created_at)}</span>
                  </div>
                </div>
                {s.confidence != null && <Stars value={s.confidence} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
