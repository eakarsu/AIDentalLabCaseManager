import React, { useEffect, useState } from 'react';

// VIZ 1: Case turnaround time chart (avg turnaround days per restoration type).
// Pure inline CSS bar chart, no external chart deps.
export default function TurnaroundChart({ api, addToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('/api/custom-views/turnaround-by-type')
      .then(r => { if (alive) { setRows(r.data || []); setLoading(false); } })
      .catch(e => {
        if (alive) { setError(e.message); setLoading(false); addToast && addToast('Failed to load turnaround chart', 'error'); }
      });
    return () => { alive = false; };
  }, [api, addToast]);

  const max = Math.max(1, ...rows.map(r => Number(r.avg_turnaround_days) || 0));

  return (
    <div data-testid="turnaround-chart" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Case Turnaround Time</h3>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>
        Average estimated turnaround (days) per restoration type.
      </p>
      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>Error: {error}</div>}
      {!loading && !error && rows.length === 0 && <div style={{ color: '#6b7280' }}>No cases recorded yet.</div>}
      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 130px', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.case_type}
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 22, position: 'relative' }}>
                <div
                  style={{
                    width: `${Math.max(2, (Number(r.avg_turnaround_days) / max) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg,#6366f1,#4f46e5)',
                    borderRadius: 4,
                    transition: 'width .3s',
                  }}
                />
              </div>
              <div style={{ fontSize: 13, color: '#111827', textAlign: 'right' }}>
                {Number(r.avg_turnaround_days).toFixed(1)} d <span style={{ color: '#6b7280' }}>({r.case_count})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
