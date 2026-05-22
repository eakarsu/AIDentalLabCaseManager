import React, { useEffect, useState } from 'react';

// VIZ 2: Technician workload heatmap (technician x day-of-week, scheduled hours).
export default function TechnicianWorkloadHeatmap({ api, addToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('/api/custom-views/technician-workload-heatmap')
      .then(r => { if (alive) { setData(r); setLoading(false); } })
      .catch(e => {
        if (alive) { setError(e.message); setLoading(false); addToast && addToast('Failed to load heatmap', 'error'); }
      });
  }, [api, addToast]);

  const allHours = (data?.matrix || []).flatMap(r => r.cells.map(c => c.hours));
  const max = Math.max(1, ...allHours);

  const colorFor = h => {
    if (!h || h <= 0) return '#f3f4f6';
    const ratio = Math.min(1, h / max);
    // light -> dark indigo
    const lightness = 92 - ratio * 50;
    return `hsl(238, 70%, ${lightness}%)`;
  };

  return (
    <div data-testid="workload-heatmap" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Technician Workload Heatmap</h3>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>
        Scheduled production hours per technician per day-of-week (darker = more loaded).
      </p>
      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>Error: {error}</div>}
      {!loading && !error && data && (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ fontSize: 12, color: '#6b7280', textAlign: 'left', padding: '4px 8px' }}>Technician</th>
                {data.days.map(d => (
                  <th key={d} style={{ fontSize: 12, color: '#6b7280', padding: '4px 8px' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map(row => (
                <tr key={row.technician_id}>
                  <td style={{ fontSize: 13, color: '#111827', padding: '4px 8px', whiteSpace: 'nowrap' }}>{row.technician}</td>
                  {row.cells.map((c, i) => (
                    <td key={i}
                      title={`${row.technician} - ${c.day}: ${c.hours}h / ${c.tasks} tasks`}
                      style={{
                        background: colorFor(c.hours),
                        color: c.hours > max * 0.55 ? '#fff' : '#374151',
                        textAlign: 'center',
                        fontSize: 12,
                        padding: '8px 0',
                        width: 52,
                        borderRadius: 4,
                      }}>
                      {c.hours > 0 ? `${c.hours}h` : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {data.matrix.length === 0 && (
                <tr><td colSpan={data.days.length + 1} style={{ color: '#6b7280', padding: 8 }}>No technicians on file.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
