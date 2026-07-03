import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';

const USER_ID = 1;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(isoStr) {
  if (!isoStr) return null;
  const diff = new Date(isoStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function Stars({ value }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg
          key={n}
          className={`w-3 h-3 ${n <= value ? 'text-yellow-400' : 'text-gray-700'}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function Dashboard() {
  const fetchWithAuth = useApi();
  const [todayBlocks, setTodayBlocks] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [todayLoggedCount, setTodayLoggedCount] = useState(0);
  const [courseMap, setCourseMap] = useState({});
  const [topicMap, setTopicMap] = useState({});
  const [hasPlan, setHasPlan] = useState(null);
  const [error, setError] = useState(null);

  const [loggingBlockId, setLoggingBlockId] = useState(null);
  const [logConfidence, setLogConfidence] = useState(3);
  const [loggedBlockIds, setLoggedBlockIds] = useState(new Set());

  const [neglectedTopics, setNeglectedTopics] = useState([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        // Courses + topics
        const coursesRes = await fetchWithAuth(`${API_BASE_URL}/courses/?user_id=${USER_ID}`);
        const courses = coursesRes.ok ? await coursesRes.json() : [];
        const cMap = {};
        courses.forEach(c => { cMap[c.id] = { name: c.name, color: c.color, is_active: c.is_active }; });
        setCourseMap(cMap);

        const topicLists = await Promise.all(
          courses.map(c =>
            fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${c.id}`)
              .then(r => (r.ok ? r.json() : []))
          )
        );
        const allTopics = topicLists.flat();
        const tMap = {};
        allTopics.forEach(t => { tMap[t.id] = { name: t.name, courseId: t.course_id }; });
        setTopicMap(tMap);

        // Revision sessions
        const sessRes = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/?user_id=${USER_ID}`);
        const sessions = sessRes.ok ? await sessRes.json() : [];
        const todayStr = todayISO();
        setTodayLoggedCount(sessions.filter(s => s.created_at.slice(0, 10) === todayStr).length);
        setRecentSessions(sessions.slice(-3).reverse());

        // Compute neglected topics
        const latestByTopic = {};
        sessions.forEach(s => {
          if (!latestByTopic[s.topic_id] || new Date(s.created_at) > new Date(latestByTopic[s.topic_id])) {
            latestByTopic[s.topic_id] = s.created_at;
          }
        });
        const neglected = allTopics
          .filter(t => cMap[t.course_id]?.is_active !== false)
          .map(t => ({ id: t.id, name: t.name, courseId: t.course_id, lastRevised: latestByTopic[t.id] ?? null }))
          .sort((a, b) => {
            if (!a.lastRevised && !b.lastRevised) return 0;
            if (!a.lastRevised) return -1;
            if (!b.lastRevised) return 1;
            return new Date(a.lastRevised) - new Date(b.lastRevised);
          })
          .slice(0, 5);
        setNeglectedTopics(neglected);

        // Upcoming assessments
        const assessRes = await fetchWithAuth(`${API_BASE_URL}/assessments/`);
        const assessments = assessRes.ok ? await assessRes.json() : [];
        const upcoming = assessments
          .filter(a => a.due_date && cMap[a.course_id]?.is_active !== false)
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 5);
        setUpcomingAssessments(upcoming);

        // Plans
        const plansRes = await fetchWithAuth(`${API_BASE_URL}/plans/?user_id=${USER_ID}`);
        const plans = plansRes.ok ? await plansRes.json() : [];

        if (plans.length === 0) {
          setHasPlan(false);
          return;
        }

        const latest = plans.reduce((a, b) =>
          new Date(a.generated_at) > new Date(b.generated_at) ? a : b
        );
        setHasPlan(true);

        const blocksRes = await fetchWithAuth(`${API_BASE_URL}/plan-blocks/?plan_id=${latest.id}`);
        const blocks = blocksRes.ok ? await blocksRes.json() : [];
        const today = todayISO();
        const filtered = blocks
          .filter(b => b.start_time.slice(0, 10) === today)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        setTodayBlocks(filtered);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [fetchWithAuth]);

  const stats = useMemo(() => {
    const courseIds = new Set(
      todayBlocks.map(b => topicMap[b.topic_id]?.courseId).filter(Boolean)
    );
    return {
      completed: todayLoggedCount,
      scheduled: todayBlocks.length,
      courses: courseIds.size,
    };
  }, [todayBlocks, todayLoggedCount, topicMap]);

  const handleQuickLog = async (block) => {
    const durationMins = Math.round(
      (new Date(block.end_time) - new Date(block.start_time)) / 60000
    );
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/revision-sessions/`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: USER_ID,
          topic_id: block.topic_id,
          method: block.method,
          duration_minutes: durationMins,
          confidence: logConfidence,
        }),
      });
      if (!res.ok) throw new Error('Failed to log session');
      setLoggedBlockIds(prev => new Set([...prev, block.id]));
      setTodayLoggedCount(c => c + 1);
      setLoggingBlockId(null);
      setLogConfidence(3);
    } catch (err) {
      setError(err.message);
    }
  };

  if (hasPlan === null && !error) {
    return <p className="text-gray-400">Loading…</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">
          {greeting()}, here's your revision plan for today
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* No plan state */}
      {!hasPlan && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No plan generated yet</p>
          <p className="text-gray-600 text-sm mt-1 mb-4">
            Generate a weekly plan to see today's sessions here
          </p>
          <Link
            to="/weekly-plan"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Weekly Plan
          </Link>
        </div>
      )}

      {hasPlan && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
            {[
              { label: 'Completed', value: stats.completed },
              { label: 'Scheduled', value: stats.scheduled },
              { label: 'Courses', value: stats.courses },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats.scheduled > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">
                  {stats.completed} of {stats.scheduled} blocks completed today
                </span>
                <span className="text-xs font-medium text-indigo-400">
                  {Math.round(Math.min(stats.completed / stats.scheduled, 1) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(stats.completed / stats.scheduled, 1) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Today's blocks */}
          {todayBlocks.length === 0 ? (
            <p className="text-sm text-gray-600 mb-8">No sessions scheduled for today.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-8">
              {todayBlocks.map(block => {
                const topic = topicMap[block.topic_id];
                const course = topic ? courseMap[topic.courseId] : null;
                const borderColor = course?.color ?? '#6366f1';
                return (
                  <div
                    key={block.id}
                    className="bg-gray-800 rounded-xl pl-4 pr-4 py-3 border-l-4 border border-gray-700 flex flex-col gap-1"
                    style={{ borderLeftColor: borderColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white tabular-nums">
                        {formatTime(block.start_time)} – {formatTime(block.end_time)}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">
                        {block.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {course && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                      )}
                      <span className="text-sm text-gray-200">
                        {course?.name ?? `Course ${block.topic_id}`}
                        <span className="text-gray-500 mx-1">·</span>
                        {topic?.name ?? `Topic ${block.topic_id}`}
                      </span>
                    </div>
                    {block.reason && (() => {
                      const howIdx = block.reason.indexOf(' How:');
                      const whyBlock = howIdx === -1 ? block.reason : block.reason.slice(0, howIdx);
                      const howText = howIdx === -1 ? null : block.reason.slice(howIdx + ' How:'.length).trim();
                      const chosenIdx = whyBlock.indexOf('Chosen because: ');
                      const whyText = chosenIdx === -1 ? whyBlock : whyBlock.slice(chosenIdx + 'Chosen because: '.length);
                      return (
                        <div className="flex flex-col gap-0.5 mt-1">
                          {whyText && (
                            <p className="text-xs">
                              <span className="font-semibold text-indigo-400">Why: </span>
                              <span className="text-gray-500">{whyText}</span>
                            </p>
                          )}
                          {howText && (
                            <p className="text-xs">
                              <span className="font-semibold text-indigo-400">How: </span>
                              <span className="text-gray-400">{howText}</span>
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    {!loggingBlockId || loggingBlockId !== block.id ? (
                      <div className="flex justify-end mt-1">
                        {loggedBlockIds.has(block.id) ? (
                          <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-900/50 text-green-400 border border-green-800">
                            ✓ Logged
                          </span>
                        ) : (
                          <button
                            onClick={() => { setLoggingBlockId(block.id); setLogConfidence(3); }}
                            className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                          >
                            Log
                          </button>
                        )}
                      </div>
                    ) : null}
                    {loggingBlockId === block.id && (
                      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-gray-400">Confidence</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setLogConfidence(n)}
                              className="focus:outline-none"
                              aria-label={`Confidence ${n}`}
                            >
                              <svg
                                className={`w-5 h-5 transition-colors ${n <= logConfidence ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-500'}`}
                                viewBox="0 0 20 20" fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleQuickLog(block)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setLoggingBlockId(null)}
                          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recently logged */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Recently Logged
          </h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-gray-600">No sessions logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentSessions.map(s => {
                const topic = topicMap[s.topic_id];
                const course = topic ? courseMap[topic.courseId] : null;
                return (
                  <div
                    key={s.id}
                    className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-medium text-white truncate">
                          {topic?.name ?? `Topic ${s.topic_id}`}
                        </span>
                        {course && (
                          <>
                            <span className="text-gray-600">·</span>
                            <span className="text-sm text-gray-400 truncate">{course.name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="capitalize">{s.method}</span>
                        <span>{s.duration_minutes} min</span>
                        <span>{formatRelative(s.created_at)}</span>
                      </div>
                    </div>
                    {s.confidence != null && <Stars value={s.confidence} />}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Most Neglected Topics */}
      {neglectedTopics.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Most Neglected Topics
          </h2>
          <div className="flex flex-col gap-2">
            {neglectedTopics.map(t => {
              const course = courseMap[t.courseId];
              const daysAgoVal = t.lastRevised
                ? Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t.lastRevised).setHours(0, 0, 0, 0)) / 86400000)
                : null;
              const lastRevisedLabel = daysAgoVal === null
                ? 'Never revised'
                : daysAgoVal === 0
                ? 'Today'
                : daysAgoVal === 1
                ? 'Yesterday'
                : `${daysAgoVal} days ago`;
              return (
                <div
                  key={t.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {course && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                      )}
                      <span className="text-sm font-medium text-white truncate">{t.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{course?.name ?? ''}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${daysAgoVal === null ? 'text-amber-400' : 'text-gray-400'}`}>
                    {lastRevisedLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Assessments */}
      {upcomingAssessments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Upcoming Assessments
          </h2>
          <div className="flex flex-col gap-2">
            {upcomingAssessments.map(a => {
              const days = daysUntil(a.due_date);
              const borderCls = days < 0 ? 'border-red-700' : days <= 7 ? 'border-red-700' : days <= 14 ? 'border-amber-700' : 'border-green-800';
              const labelCls = days < 0 ? 'text-red-400' : days <= 7 ? 'text-red-400' : days <= 14 ? 'text-amber-400' : 'text-green-400';
              const dueLabel = days < 0
                ? 'Overdue'
                : days === 0
                ? 'Due today'
                : days === 1
                ? 'Due tomorrow'
                : `${days} days away`;
              const course = courseMap[a.course_id];
              return (
                <div
                  key={a.id}
                  className={`bg-gray-800 border ${borderCls} rounded-xl px-4 py-3 flex items-center justify-between gap-4`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{a.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">{a.type}</span>
                    </div>
                    <span className="text-xs text-gray-500">{course?.name ?? ''}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${labelCls}`}>{dueLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
