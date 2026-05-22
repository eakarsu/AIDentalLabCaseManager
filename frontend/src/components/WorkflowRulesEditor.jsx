import React, { useEffect, useState } from 'react';

// NON-VIZ 2: Workflow rules editor (CRUD for lab workflow steps).
export default function WorkflowRulesEditor({ api, addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const empty = { step_order: '', stage: 'design', name: '', description: '', required_role: 'technician', sla_hours: 4, active: true };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const refresh = () => {
    setLoading(true);
    api('/api/custom-views/workflow-rules')
      .then(r => { setItems(r.items || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); addToast && addToast('Failed to load rules', 'error'); });
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast && addToast('Name required', 'error'); return; }
    const url = editingId
      ? `/api/custom-views/workflow-rules/${editingId}`
      : '/api/custom-views/workflow-rules';
    const method = editingId ? 'PUT' : 'POST';
    api(url, { method, body: JSON.stringify(form) })
      .then(() => {
        addToast && addToast(editingId ? 'Rule updated' : 'Rule created');
        setForm(empty); setEditingId(null); refresh();
      })
      .catch(e => addToast && addToast('Save failed: ' + e.message, 'error'));
  };

  const edit = (it) => {
    setEditingId(it.id);
    setForm({
      step_order: it.step_order,
      stage: it.stage,
      name: it.name,
      description: it.description,
      required_role: it.required_role,
      sla_hours: it.sla_hours,
      active: it.active,
    });
  };

  const del = (id) => {
    api(`/api/custom-views/workflow-rules/${id}`, { method: 'DELETE' })
      .then(() => { addToast && addToast('Rule deleted'); refresh(); })
      .catch(e => addToast && addToast('Delete failed: ' + e.message, 'error'));
  };

  const inputStyle = { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%' };

  return (
    <div data-testid="workflow-rules-editor" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Workflow Rules Editor</h3>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>
        Define and order the production workflow steps for the lab.
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '80px 140px 1fr 140px 100px auto', gap: 8, marginTop: 12 }}>
        <input style={inputStyle} type="number" placeholder="Order" value={form.step_order}
          onChange={e => setForm({ ...form, step_order: e.target.value })} />
        <select style={inputStyle} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
          <option value="received">received</option>
          <option value="design">design</option>
          <option value="production">production</option>
          <option value="finishing">finishing</option>
          <option value="quality">quality</option>
          <option value="shipping">shipping</option>
          <option value="custom">custom</option>
        </select>
        <input style={inputStyle} placeholder="Step name" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
        <input style={inputStyle} placeholder="Required role" value={form.required_role}
          onChange={e => setForm({ ...form, required_role: e.target.value })} />
        <input style={inputStyle} type="number" placeholder="SLA h" value={form.sla_hours}
          onChange={e => setForm({ ...form, sla_hours: e.target.value })} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="submit" style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(empty); }}
              style={{ padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <div style={{ color: '#dc2626', marginTop: 8 }}>Error: {error}</div>}
      {loading && <div style={{ color: '#6b7280', marginTop: 8 }}>Loading...</div>}

      {!loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>#</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Stage</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Role</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>SLA (h)</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Active</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{it.step_order}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{it.stage}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 500 }}>{it.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{it.description}</div>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{it.required_role}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{it.sla_hours}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{it.active ? 'yes' : 'no'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                  <button onClick={() => edit(it)}
                    style={{ padding: '4px 8px', background: '#fff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: 4, cursor: 'pointer', marginRight: 4 }}>
                    Edit
                  </button>
                  <button onClick={() => del(it.id)}
                    style={{ padding: '4px 8px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 8, color: '#6b7280' }}>No workflow rules defined.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
