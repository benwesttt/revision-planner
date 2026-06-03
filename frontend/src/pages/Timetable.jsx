import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

const USER_ID = 1;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

const WEEK_OPTIONS = [
  { value: 'A',    label: 'Week A' },
  { value: 'B',    label: 'Week B' },
  { value: 'both', label: 'Every Week' },
];

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function toDatetimeLocalValue(isoStr) {
  if (!isoStr) return '';
  return isoStr.slice(0, 16);
}

function WeekToggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {['A', 'B'].map(w => (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              value === w
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Timetable() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which week the user is viewing/editing
  const [viewWeek, setViewWeek] = useState('A');
  // Which week the planner treats as current
  const [currentWeek, setCurrentWeek] = useState('A');
  const [savingWeek, setSavingWeek] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', start_time: '', end_time: '', recurring: false, week: 'A' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', start_time: '', end_time: '', recurring: false, week: 'both' });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/calendar-events/?user_id=${USER_ID}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      setEvents(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load events and the user's current_week preference on mount
  useEffect(() => {
    fetchEvents();
    fetch(`${API_BASE_URL}/revision-preferences/?user_id=${USER_ID}`)
      .then(r => r.ok ? r.json() : [])
      .then(prefs => {
        if (prefs.length > 0) {
          setCurrentWeek(prefs[0].current_week ?? 'A');
        }
      })
      .catch(() => {});
  }, [fetchEvents]);

  // Keep the form's default week in sync with the view week
  useEffect(() => {
    setForm(f => ({ ...f, week: viewWeek }));
  }, [viewWeek]);

  const handleSetCurrentWeek = async (week) => {
    setSavingWeek(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/revision-preferences/current-week?user_id=${USER_ID}&current_week=${week}`,
        { method: 'PATCH' }
      );
      if (!res.ok) throw new Error('Failed to update current week');
      setCurrentWeek(week);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingWeek(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time || !form.end_time) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/calendar-events/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          title: form.title.trim(),
          start_time: form.start_time,
          end_time: form.end_time,
          recurring: form.recurring,
          week: form.week,
        }),
      });
      if (!res.ok) throw new Error('Failed to create event');
      setForm(f => ({ ...f, title: '', start_time: '', end_time: '', recurring: false }));
      setShowForm(false);
      await fetchEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditForm({
      title: ev.title,
      start_time: toDatetimeLocalValue(ev.start_time),
      end_time: toDatetimeLocalValue(ev.end_time),
      recurring: ev.recurring,
      week: ev.week,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (e, id) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/calendar-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          recurring: editForm.recurring,
          week: editForm.week,
        }),
      });
      if (!res.ok) throw new Error('Failed to update event');
      setEditingId(null);
      await fetchEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetch(`${API_BASE_URL}/calendar-events/${id}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Filter events to those visible in the current view week
  const visibleEvents = events.filter(ev => ev.week === viewWeek || ev.week === 'both');

  const byDay = {};
  for (const event of visibleEvents) {
    const day = new Date(event.start_time).getDay();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(event);
  }
  for (const day of Object.keys(byDay)) {
    byDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const inputCls = 'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500';

  if (loading) {
    return <p className="text-gray-400">Loading timetable…</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-white">Timetable</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {/* Week controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">Viewing</span>
          <WeekToggle value={viewWeek} onChange={setViewWeek} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">
            Planner uses
            <span className={`ml-1.5 font-semibold ${savingWeek ? 'text-gray-500' : 'text-indigo-400'}`}>
              Week {currentWeek}
            </span>
          </span>
          <WeekToggle
            value={currentWeek}
            onChange={handleSetCurrentWeek}
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Add Event form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">New Event</h2>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={`${inputCls} w-full`}
            autoFocus
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Start time</span>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className={`${inputCls} [color-scheme:dark]`}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">End time</span>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className={`${inputCls} [color-scheme:dark]`}
                required
              />
            </label>
          </div>

          {/* Week selector */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Week</span>
            <div className="flex gap-2">
              {WEEK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, week: opt.value }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    form.week === opt.value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            Repeats every week
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {visibleEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No events for Week {viewWeek}</p>
          <p className="text-gray-600 text-sm mt-1">
            Click <span className="text-indigo-400">+ Add Event</span> to block out this week
          </p>
        </div>
      )}

      {/* Days */}
      {visibleEvents.length > 0 && (
        <div className="flex flex-col gap-6">
          {DAY_ORDER.map(dayIndex => {
            const dayEvents = byDay[dayIndex];
            if (!dayEvents) return null;
            return (
              <section key={dayIndex}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                  {DAYS[dayIndex]}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {dayEvents.map(event => {
                    const isEditing = editingId === event.id;

                    if (isEditing) {
                      return (
                        <form
                          key={event.id}
                          onSubmit={e => handleSave(e, event.id)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col gap-3"
                        >
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            className={`${inputCls} w-full`}
                            autoFocus
                            required
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400">Start time</span>
                              <input
                                type="datetime-local"
                                value={editForm.start_time}
                                onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                                className={`${inputCls} [color-scheme:dark]`}
                                required
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400">End time</span>
                              <input
                                type="datetime-local"
                                value={editForm.end_time}
                                onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                                className={`${inputCls} [color-scheme:dark]`}
                                required
                              />
                            </label>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400">Week</span>
                            <div className="flex gap-2">
                              {WEEK_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEditForm(f => ({ ...f, week: opt.value }))}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                    editForm.week === opt.value
                                      ? 'bg-indigo-600 border-indigo-500 text-white'
                                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editForm.recurring}
                              onChange={e => setEditForm(f => ({ ...f, recurring: e.target.checked }))}
                              className="w-4 h-4 rounded accent-indigo-500"
                            />
                            Repeats every week
                          </label>

                          <div className="flex justify-end gap-2 pt-1 border-t border-gray-700">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm"
                      >
                        <span className="text-white font-medium">{event.title}</span>
                        <span className="text-gray-400 tabular-nums">
                          {formatTime(event.start_time)}–{formatTime(event.end_time)}
                        </span>
                        {event.week !== 'both' && (
                          <span className="text-xs text-indigo-400">Wk {event.week}</span>
                        )}
                        {event.recurring && (
                          <span className="text-xs text-gray-500" title="Recurring">↻</span>
                        )}
                        <button
                          onClick={() => startEdit(event)}
                          className="ml-0.5 text-gray-600 hover:text-indigo-400 transition-colors"
                          aria-label="Edit event"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting === event.id}
                          className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                          aria-label="Delete event"
                        >
                          {deleting === event.id ? (
                            <span className="text-xs leading-none">…</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
