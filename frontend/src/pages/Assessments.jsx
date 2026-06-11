import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';

const USER_ID = 1;

const TYPES = ['exam', 'test', 'homework', 'coursework', 'quiz'];

function daysUntil(isoStr) {
  if (!isoStr) return null;
  const diff = new Date(isoStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function urgencyClasses(days) {
  if (days === null) return { border: 'border-gray-700', badge: 'bg-gray-800 text-gray-400' };
  if (days <= 7)     return { border: 'border-red-700',  badge: 'bg-red-900/40 text-red-400' };
  if (days <= 14)    return { border: 'border-amber-700', badge: 'bg-amber-900/40 text-amber-400' };
  return               { border: 'border-green-800', badge: 'bg-green-900/40 text-green-400' };
}

function formatDueDate(isoStr) {
  if (!isoStr) return 'No due date';
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateInputValue(isoStr) {
  if (!isoStr) return '';
  return isoStr.slice(0, 10);
}

export default function Assessments() {
  const fetchWithAuth = useApi();
  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseMap, setCourseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_id: '', name: '', type: TYPES[0], due_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ course_id: '', name: '', type: TYPES[0], due_date: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [aRes, cRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/assessments/`),
        fetchWithAuth(`${API_BASE_URL}/courses/?user_id=${USER_ID}`),
      ]);
      if (!aRes.ok) throw new Error('Failed to fetch assessments');
      if (!cRes.ok) throw new Error('Failed to fetch courses');
      const [aData, cData] = await Promise.all([aRes.json(), cRes.json()]);

      aData.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      setAssessments(aData);
      setCourses(cData);
      const cMap = {};
      cData.forEach(c => { cMap[c.id] = c.name; });
      setCourseMap(cMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course_id || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        course_id: Number(form.course_id),
        name: form.name.trim(),
        type: form.type,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const res = await fetchWithAuth(`${API_BASE_URL}/assessments/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create assessment');
      setForm({ course_id: '', name: '', type: TYPES[0], due_date: '' });
      setShowForm(false);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetchWithAuth(`${API_BASE_URL}/assessments/${id}`, { method: 'DELETE' });
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  };

  const startEdit = (a) => {
    setPendingDelete(null);
    setEditingId(a.id);
    setEditForm({
      course_id: String(a.course_id),
      name: a.name,
      type: a.type,
      due_date: toDateInputValue(a.due_date),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ course_id: '', name: '', type: TYPES[0], due_date: '' });
  };

  const handleSave = async (e, id) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        course_id: Number(editForm.course_id),
        name: editForm.name.trim(),
        type: editForm.type,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
      };
      const res = await fetchWithAuth(`${API_BASE_URL}/assessments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update assessment');
      setEditingId(null);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full';

  if (loading) {
    return <p className="text-gray-400">Loading assessments…</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Assessments</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Assessment'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">New Assessment</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Course</span>
              <select
                value={form.course_id}
                onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">Select course…</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Type</span>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={`${inputCls} capitalize`}
              >
                {TYPES.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Title</span>
            <input
              type="text"
              placeholder="e.g. Chapter 5 Test"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              autoFocus
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Due date (optional)</span>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className={`${inputCls} [color-scheme:dark]`}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Assessment'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {assessments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No assessments yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Click <span className="text-indigo-400">+ Add Assessment</span> to track upcoming work
          </p>
        </div>
      )}

      {/* Assessment list */}
      {assessments.length > 0 && (
        <div className="flex flex-col gap-3">
          {assessments.map(a => {
            const days = daysUntil(a.due_date);
            const { border, badge } = urgencyClasses(days);
            const isEditing = editingId === a.id;
            const isPending = pendingDelete === a.id;

            return (
              <div
                key={a.id}
                className={`bg-gray-800 border ${border} rounded-xl px-4 py-3`}
              >
                {isEditing ? (
                  <form onSubmit={e => handleSave(e, a.id)} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Course</span>
                        <select
                          value={editForm.course_id}
                          onChange={e => setEditForm(f => ({ ...f, course_id: e.target.value }))}
                          className={inputCls}
                          required
                        >
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Type</span>
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                          className={`${inputCls} capitalize`}
                        >
                          {TYPES.map(t => (
                            <option key={t} value={t} className="capitalize">{t}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Title</span>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className={inputCls}
                        autoFocus
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Due date</span>
                      <input
                        type="date"
                        value={editForm.due_date}
                        onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                        className={`${inputCls} [color-scheme:dark]`}
                      />
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
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-white">{a.name}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">
                          {a.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{courseMap[a.course_id] ?? `Course ${a.course_id}`}</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${badge}`}>
                          {days === null
                            ? 'No due date'
                            : days < 0
                            ? 'Overdue'
                            : days === 0
                            ? 'Due today'
                            : days === 1
                            ? 'Due tomorrow'
                            : `${formatDueDate(a.due_date)} · ${days}d`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <>
                          <span className="text-xs text-gray-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deleting === a.id}
                            className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                          >
                            {deleting === a.id ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setPendingDelete(null)}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(a)}
                            className="text-gray-600 hover:text-indigo-400 transition-colors"
                            aria-label="Edit assessment"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPendingDelete(a.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                            aria-label="Delete assessment"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
