import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../api';

const USER_ID = 1;

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDayHeading(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dayWeek(startDateStr, dayOffset, currentWeek) {
  const jsDay = new Date(startDateStr + 'T12:00:00').getDay();
  const daysInStartWeek = jsDay === 0 ? 1 : 7 - jsDay + 1;
  const inStartWeek = dayOffset < daysInStartWeek;
  return inStartWeek ? currentWeek : (currentWeek === 'A' ? 'B' : 'A');
}

export default function WeeklyPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState('A');

  const [courseMap, setCourseMap] = useState({});
  const [topicMap, setTopicMap] = useState({});
  const [resourceMap, setResourceMap] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Load metadata: courses, topics, resources, calendar events
  useEffect(() => {
    async function loadMeta() {
      try {
        const [coursesRes, resourcesRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/courses/?user_id=${USER_ID}`),
          fetch(`${API_BASE_URL}/resources/`),
          fetch(`${API_BASE_URL}/calendar-events/?user_id=${USER_ID}`),
        ]);
        const courses = coursesRes.ok ? await coursesRes.json() : [];
        const resources = resourcesRes.ok ? await resourcesRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];

        const cMap = {};
        courses.forEach(c => { cMap[c.id] = { name: c.name, color: c.color }; });
        setCourseMap(cMap);

        const rMap = {};
        resources.forEach(r => { rMap[r.id] = { name: r.name }; });
        setResourceMap(rMap);

        const topicLists = await Promise.all(
          courses.map(c =>
            fetch(`${API_BASE_URL}/topics/?course_id=${c.id}`)
              .then(r => (r.ok ? r.json() : []))
          )
        );
        const tMap = {};
        topicLists.flat().forEach(t => {
          tMap[t.id] = { name: t.name, courseId: t.course_id };
        });
        setTopicMap(tMap);
        setCalendarEvents(events);
      } catch {
        // Non-fatal
      }
    }
    loadMeta();
  }, []);

  // Auto-load the most recently generated plan and current_week on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/revision-preferences/?user_id=${USER_ID}`)
      .then(r => r.ok ? r.json() : [])
      .then(prefs => { if (prefs.length > 0) setCurrentWeek(prefs[0].current_week ?? 'A'); })
      .catch(() => {});

    async function loadLatestPlan() {
      try {
        const plansRes = await fetch(`${API_BASE_URL}/plans/?user_id=${USER_ID}`);
        if (!plansRes.ok) return;
        const plans = await plansRes.json();
        if (plans.length === 0) return;

        const latest = plans.reduce((a, b) =>
          new Date(a.generated_at) > new Date(b.generated_at) ? a : b
        );

        const blocksRes = await fetch(`${API_BASE_URL}/plan-blocks/?plan_id=${latest.id}`);
        const blocks = blocksRes.ok ? await blocksRes.json() : [];

        setPlan({ ...latest, plan_blocks: blocks });
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    }
    loadLatestPlan();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: USER_ID, start_date: todayISO() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Failed to generate plan');
      setPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const days = plan
    ? Array.from({ length: 7 }, (_, i) => addDays(plan.start_date, i))
    : [];

  // Build per-day timeline: revision blocks + calendar events, sorted by time
  const itemsByDay = useMemo(() => {
    if (!plan) return {};
    const groups = {};

    // Seed with revision blocks
    for (const block of plan.plan_blocks) {
      const day = block.start_time.slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push({ _type: 'block', _data: block, _sortKey: block.start_time });
    }

    // Interleave calendar events by day-of-week match
    days.forEach((day, i) => {
      if (!groups[day]) groups[day] = [];
      const jsDay = new Date(day + 'T12:00:00').getDay();
      const wk = dayWeek(plan.start_date, i, currentWeek);

      for (const ev of calendarEvents) {
        const evJsDay = new Date(ev.start_time).getDay();
        if (evJsDay !== jsDay) continue;
        if (ev.week !== 'both' && ev.week !== wk) continue;
        // Sort key: plan day date + event's time component
        const timeStr = ev.start_time.slice(11);
        groups[day].push({ _type: 'event', _data: ev, _sortKey: `${day}T${timeStr}` });
      }

      groups[day].sort((a, b) => a._sortKey.localeCompare(b._sortKey));
    });

    return groups;
  }, [plan, calendarEvents, currentWeek]);

  const showSkeleton = loading || generating;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Weekly Plan</h1>
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {generating ? 'Generating…' : plan ? 'Regenerate Plan' : 'Generate Plan'}
        </button>
      </div>

      {error && (
        <p className="mb-6 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Loading / generating skeleton */}
      {showSkeleton && (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-36 bg-gray-800 rounded mb-3" />
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }, (_, j) => (
                  <div key={j} className="h-20 bg-gray-800 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showSkeleton && !plan && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No plan yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Click <span className="text-indigo-400">Generate Plan</span> to build your 7-day revision schedule
          </p>
        </div>
      )}

      {/* 7-day timeline */}
      {!showSkeleton && plan && (
        <div className="flex flex-col gap-8">
          {days.map((day, i) => {
            const items = itemsByDay[day] ?? [];
            const wk = dayWeek(plan.start_date, i, currentWeek);
            return (
              <section key={day}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                  {formatDayHeading(day)}
                  <span className="text-indigo-500">· Week {wk}</span>
                </h2>

                {items.length === 0 ? (
                  <p className="text-sm text-gray-700 pl-1">No sessions scheduled</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map(({ _type, _data }) => {
                      if (_type === 'event') {
                        return (
                          <div
                            key={`event-${_data.id}`}
                            className="bg-gray-700 rounded-xl px-4 py-3 border border-gray-600 flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-white tabular-nums">
                                {formatTime(_data.start_time)} – {formatTime(_data.end_time)}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-600 text-gray-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Scheduled
                              </span>
                            </div>
                            <span className="text-sm text-gray-300">{_data.title}</span>
                            {_data.recurring && (
                              <span className="text-xs text-gray-500">Recurring weekly</span>
                            )}
                          </div>
                        );
                      }

                      // Revision block
                      const block = _data;
                      const topic = topicMap[block.topic_id];
                      const course = topic ? courseMap[topic.courseId] : null;
                      const resource = block.resource_id ? resourceMap[block.resource_id] : null;
                      const borderColor = course?.color ?? '#6366f1';

                      return (
                        <div
                          key={`block-${block.id}`}
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
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: course.color }}
                              />
                            )}
                            <span className="text-sm text-gray-200">
                              {course?.name ?? `Course ${block.topic_id}`}
                              <span className="text-gray-500 mx-1">·</span>
                              {topic?.name ?? `Topic ${block.topic_id}`}
                            </span>
                          </div>

                          {resource && (
                            <span className="text-xs text-indigo-400">{resource.name}</span>
                          )}

                          {block.reason && (() => {
                            const howIdx = block.reason.indexOf(' How:');
                            const chosen = howIdx === -1 ? block.reason : block.reason.slice(0, howIdx);
                            const how    = howIdx === -1 ? null : block.reason.slice(howIdx + 1);
                            return (
                              <>
                                {chosen && <p className="text-xs text-gray-500 mt-0.5">{chosen}</p>}
                                {how    && <p className="text-xs text-gray-600 mt-0.5">{how}</p>}
                              </>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
