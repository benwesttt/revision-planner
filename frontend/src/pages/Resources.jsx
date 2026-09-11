import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';
import { useApi } from '../lib/api';

const USER_ID = 1;

const TYPES = [
  'Lecture Notes',
  'Tutorial Sheet',
  'Problem Sheet',
  'Past Paper',
  'Textbook',
  'Flashcard Deck',
  'Other',
];

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent w-full';

async function fetchTopicsForCourse(courseId, fetchWithAuth) {
  const res = await fetchWithAuth(`${API_BASE_URL}/topics/?course_id=${courseId}`);
  return res.ok ? res.json() : [];
}

async function fetchLinksForResource(resourceId, fetchWithAuth) {
  const res = await fetchWithAuth(`${API_BASE_URL}/topic-resources/?resource_id=${resourceId}`);
  return res.ok ? res.json() : [];
}

function TopicChecklist({ topics, selected, onChange }) {
  if (topics.length === 0) return <p className="text-xs text-ink-muted">No topics for this course yet.</p>;
  return (
    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
      {topics.map(t => (
        <label key={t.id} className="flex items-center gap-2 cursor-pointer text-sm text-ink-secondary hover:text-ink">
          <input
            type="checkbox"
            checked={selected.includes(t.id)}
            onChange={() => {
              onChange(
                selected.includes(t.id)
                  ? selected.filter(id => id !== t.id)
                  : [...selected, t.id]
              );
            }}
            className="w-4 h-4 rounded accent-accent"
          />
          {t.name}
        </label>
      ))}
    </div>
  );
}

export default function Resources() {
  const fetchWithAuth = useApi();
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseMap, setCourseMap] = useState({});        // id → { name, color }
  const [topicMap, setTopicMap] = useState({});          // topicId → { name, courseId }
  const [courseTopics, setCourseTopics] = useState({});  // courseId → [topic]
  const [resourceLinks, setResourceLinks] = useState({}); // resourceId → [{ id, topicId }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterCourse, setFilterCourse] = useState(null);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: TYPES[0], course_id: '' });
  const [formTopicList, setFormTopicList] = useState([]);
  const [formTopicSel, setFormTopicSel] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: TYPES[0], course_id: '' });
  const [editTopicList, setEditTopicList] = useState([]);
  const [editTopicSel, setEditTopicSel] = useState([]);
  const [saving, setSaving] = useState(false);

  // Delete
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [resRes, cRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/resources/`),
        fetchWithAuth(`${API_BASE_URL}/courses/?user_id=${USER_ID}`),
      ]);
      if (!resRes.ok) throw new Error('Failed to fetch resources');
      if (!cRes.ok) throw new Error('Failed to fetch courses');

      // /resources/ and /courses/ are both scoped to the caller server-side,
      // so no client-side ownership filtering is needed here.
      const [userResources, allCourses] = await Promise.all([resRes.json(), cRes.json()]);

      setCourses(allCourses);
      setResources(userResources);

      const cMap = {};
      allCourses.forEach(c => { cMap[c.id] = { name: c.name, color: c.color }; });
      setCourseMap(cMap);

      const topicResults = await Promise.all(
        allCourses.map(c => fetchTopicsForCourse(c.id, fetchWithAuth))
      );
      const ctMap = {};
      const tMap = {};
      allCourses.forEach((c, i) => {
        ctMap[c.id] = topicResults[i];
        topicResults[i].forEach(t => { tMap[t.id] = { name: t.name, courseId: c.id }; });
      });
      setCourseTopics(ctMap);
      setTopicMap(tMap);

      const linkResults = await Promise.all(
        userResources.map(r => fetchLinksForResource(r.id, fetchWithAuth))
      );
      const rlMap = {};
      userResources.forEach((r, i) => {
        rlMap[r.id] = linkResults[i].map(tr => ({ id: tr.id, topicId: tr.topic_id }));
      });
      setResourceLinks(rlMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // When add-form course changes, load its topics
  useEffect(() => {
    if (!form.course_id) { setFormTopicList([]); setFormTopicSel([]); return; }
    const existing = courseTopics[form.course_id];
    if (existing) {
      setFormTopicList(existing);
      setFormTopicSel([]);
    } else {
      fetchTopicsForCourse(form.course_id, fetchWithAuth).then(ts => {
        setCourseTopics(prev => ({ ...prev, [form.course_id]: ts }));
        setFormTopicList(ts);
        setFormTopicSel([]);
      });
    }
  }, [form.course_id, courseTopics, fetchWithAuth]);

  // When edit-form course changes, load its topics
  useEffect(() => {
    if (!editForm.course_id) { setEditTopicList([]); return; }
    const existing = courseTopics[editForm.course_id];
    if (existing) {
      setEditTopicList(existing);
    } else {
      fetchTopicsForCourse(editForm.course_id, fetchWithAuth).then(ts => {
        setCourseTopics(prev => ({ ...prev, [editForm.course_id]: ts }));
        setEditTopicList(ts);
      });
    }
  }, [editForm.course_id, courseTopics, fetchWithAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.course_id) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/resources/`, {
        method: 'POST',
        body: JSON.stringify({ course_id: Number(form.course_id), name: form.name.trim(), type: form.type }),
      });
      if (!res.ok) throw new Error('Failed to create resource');
      const created = await res.json();

      await Promise.all(
        formTopicSel.map(topicId =>
          fetchWithAuth(`${API_BASE_URL}/topic-resources/`, {
            method: 'POST',
            body: JSON.stringify({ topic_id: topicId, resource_id: created.id }),
          })
        )
      );

      setForm({ name: '', type: TYPES[0], course_id: '' });
      setFormTopicSel([]);
      setShowForm(false);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (r) => {
    setPendingDelete(null);
    setEditingId(r.id);
    setEditForm({ name: r.name, type: r.type, course_id: String(r.course_id) });
    const existing = courseTopics[r.course_id] ?? [];
    setEditTopicList(existing);
    setEditTopicSel((resourceLinks[r.id] ?? []).map(l => l.topicId));
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (e, r) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/resources/${r.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          course_id: Number(editForm.course_id),
          name: editForm.name.trim(),
          type: editForm.type,
        }),
      });
      if (!res.ok) throw new Error('Failed to update resource');

      const existingLinks = resourceLinks[r.id] ?? [];
      const existingTopicIds = existingLinks.map(l => l.topicId);
      const toRemove = existingLinks.filter(l => !editTopicSel.includes(l.topicId));
      const toAdd = editTopicSel.filter(id => !existingTopicIds.includes(id));

      await Promise.all([
        ...toRemove.map(l =>
          fetchWithAuth(`${API_BASE_URL}/topic-resources/${l.id}`, { method: 'DELETE' })
        ),
        ...toAdd.map(topicId =>
          fetchWithAuth(`${API_BASE_URL}/topic-resources/`, {
            method: 'POST',
            body: JSON.stringify({ topic_id: topicId, resource_id: r.id }),
          })
        ),
      ]);

      setEditingId(null);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetchWithAuth(`${API_BASE_URL}/resources/${id}`, { method: 'DELETE' });
      setResources(prev => prev.filter(r => r.id !== id));
      setPendingDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const activeCourses = courses.filter(c => c.is_active);
  const inactiveCourses = courses.filter(c => !c.is_active);

  const displayed = filterCourse
    ? resources.filter(r => r.course_id === filterCourse)
    : resources;

  if (loading) return <p className="text-ink-secondary">Loading resources…</p>;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">Resources</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-background text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Resource'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/40 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Course filter */}
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mb-6">
          <button
            onClick={() => setFilterCourse(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filterCourse === null
                ? 'bg-accent border-accent text-background'
                : 'bg-surface border-border text-ink-secondary hover:text-ink'
            }`}
          >
            All Courses
          </button>
          {activeCourses.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCourse(filterCourse === c.id ? null : c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filterCourse === c.id
                  ? 'bg-accent border-accent text-background'
                  : 'bg-surface border-border text-ink-secondary hover:text-ink'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
          {inactiveCourses.length > 0 && (
            <>
              <span className="basis-full text-[10px] font-semibold uppercase tracking-wide text-ink-muted mt-1">
                Inactive
              </span>
              {inactiveCourses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterCourse(filterCourse === c.id ? null : c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors opacity-60 ${
                    filterCourse === c.id
                      ? 'bg-accent border-accent text-background'
                      : 'bg-surface border-border text-ink-secondary hover:text-ink'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-surface border border-border rounded-xl flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">New Resource</h2>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-secondary">Name</span>
            <input
              type="text"
              placeholder="e.g. Week 3 Lecture Notes"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              autoFocus
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-secondary">Type</span>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inputCls}
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-secondary">Course</span>
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
          </div>

          {form.course_id && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-secondary">Topics</span>
              <div className="bg-background border border-border rounded-lg px-3 py-2">
                <TopicChecklist
                  topics={formTopicList}
                  selected={formTopicSel}
                  onChange={setFormTopicSel}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Resource'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-ink-secondary text-sm font-medium">No resources yet</p>
          <p className="text-ink-muted text-sm mt-1">
            Click <span className="text-accent">+ Add Resource</span> to get started
          </p>
        </div>
      )}

      {/* Resource list */}
      {displayed.length > 0 && (
        <div className="flex flex-col gap-3">
          {displayed.map(r => {
            const course = courseMap[r.course_id];
            const links = resourceLinks[r.id] ?? [];
            const linkedTopics = links.map(l => topicMap[l.topicId]?.name).filter(Boolean);
            const isEditing = editingId === r.id;
            const isPending = pendingDelete === r.id;

            return (
              <div
                key={r.id}
                className="bg-surface border border-border rounded-xl px-4 py-3"
              >
                {isEditing ? (
                  <form onSubmit={e => handleSave(e, r)} className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-ink-secondary">Name</span>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className={inputCls}
                        autoFocus
                        required
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-ink-secondary">Type</span>
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                          className={inputCls}
                        >
                          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-ink-secondary">Course</span>
                        <select
                          value={editForm.course_id}
                          onChange={e => {
                            setEditForm(f => ({ ...f, course_id: e.target.value }));
                            setEditTopicSel([]);
                          }}
                          className={inputCls}
                        >
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
                    </div>

                    {editForm.course_id && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-ink-secondary">Topics</span>
                        <div className="bg-background border border-border rounded-lg px-3 py-2">
                          <TopicChecklist
                            topics={editTopicList}
                            selected={editTopicSel}
                            onChange={setEditTopicSel}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1 border-t border-border">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-background text-xs font-medium rounded-lg transition-colors"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{r.name}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-border text-ink-secondary">
                          {r.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-muted flex-wrap">
                        {course && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                            {course.name}
                          </span>
                        )}
                        {linkedTopics.length > 0 && (
                          <>
                            <span className="text-ink-muted">·</span>
                            <span>{linkedTopics.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <>
                          <span className="text-xs text-ink-secondary">Delete?</span>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="text-xs px-2 py-1 bg-danger hover:bg-danger/90 disabled:opacity-50 text-ink rounded-lg transition-colors"
                          >
                            {deleting === r.id ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setPendingDelete(null)}
                            className="text-xs px-2 py-1 bg-border hover:bg-white/5 text-ink-secondary rounded-lg transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="text-ink-muted hover:text-accent transition-colors"
                            aria-label="Edit resource"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPendingDelete(r.id)}
                            className="text-ink-muted hover:text-danger transition-colors"
                            aria-label="Delete resource"
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
