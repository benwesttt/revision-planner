import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';
import { useTimer } from '../context/useTimer';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The plan block whose start/end window contains right now, if any.
function findCurrentBlock(blocks) {
  const now = new Date();
  return blocks.find(b => new Date(b.start_time) <= now && now <= new Date(b.end_time)) ?? null;
}

export default function StartSessionModal({ onClose }) {
  const fetchWithAuth = useApi();
  const { start } = useTimer();

  const [courses, setCourses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [suggested, setSuggested] = useState(false);
  const [suggestedBlockId, setSuggestedBlockId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const coursesRes = await fetchWithAuth(`${API_BASE_URL}/courses/`);
      const courseData = coursesRes.ok ? await coursesRes.json() : [];
      if (cancelled) return;
      setCourses(courseData);

      const topicLists = await Promise.all(
        courseData.map(c =>
          fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${c.id}`).then(r => (r.ok ? r.json() : []))
        )
      );
      const allTopics = topicLists.flat();
      if (cancelled) return;
      setTopics(allTopics);

      // Auto-suggest from whichever plan block is scheduled right now, if any.
      const plansRes = await fetchWithAuth(`${API_BASE_URL}/plans/`);
      const plans = plansRes.ok ? await plansRes.json() : [];
      if (plans.length > 0) {
        const latest = plans.reduce((a, b) => (new Date(a.generated_at) > new Date(b.generated_at) ? a : b));
        const blocksRes = await fetchWithAuth(`${API_BASE_URL}/plan-blocks/?plan_id=${latest.id}`);
        const blocks = blocksRes.ok ? await blocksRes.json() : [];
        const today = todayISO();
        const todayBlocks = blocks.filter(b => b.start_time.slice(0, 10) === today);
        const current = findCurrentBlock(todayBlocks);
        if (current && !cancelled) {
          const topic = allTopics.find(t => t.id === current.topic_id);
          if (topic) {
            setCourseId(String(topic.course_id));
            setTopicId(String(topic.id));
            setSuggested(true);
            setSuggestedBlockId(current.id);
          }
        }
      }
      if (!cancelled) setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth]);

  const topicsForCourse = topics.filter(t => String(t.course_id) === String(courseId));
  const activeCourses = courses.filter(c => c.is_active);
  const inactiveCourses = courses.filter(c => !c.is_active);

  const handleCourseChange = value => {
    setCourseId(value);
    setSuggested(false);
    setSuggestedBlockId(null);
    const firstTopic = topics.find(t => String(t.course_id) === String(value));
    setTopicId(firstTopic ? String(firstTopic.id) : '');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!topicId) return;
    setSubmitting(true);
    setError(null);
    try {
      await start({ topicId: Number(topicId), planBlockId: suggested ? suggestedBlockId : null });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent w-full';
  const labelCls = 'flex flex-col gap-1';
  const labelTextCls = 'text-xs text-ink-secondary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-surface border border-border rounded-xl p-5 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-ink mb-4">Start a Session</h2>

        {loading ? (
          <p className="text-sm text-ink-muted mb-4">Loading your courses…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {suggested && (
              <p className="text-xs text-accent bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                Suggested from your current scheduled block — change it if you're doing something else.
              </p>
            )}

            <label className={labelCls}>
              <span className={labelTextCls}>Course</span>
              <select
                value={courseId}
                onChange={e => handleCourseChange(e.target.value)}
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
                value={topicId}
                onChange={e => { setTopicId(e.target.value); setSuggested(false); setSuggestedBlockId(null); }}
                className={inputCls}
                required
                disabled={!courseId}
              >
                <option value="">Select topic…</option>
                {topicsForCourse.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            {error && (
              <p className="text-sm text-danger bg-danger-bg border border-danger/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !topicId}
                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Starting…' : 'Start'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
