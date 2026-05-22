import React, { useEffect, useState } from 'react';

// NON-VIZ 1: Case specification PDF generator (server-rendered structured document
// with copy-to-clipboard + browser-print fallback).
export default function CaseSpecificationPDF({ api, addToast }) {
  const [caseId, setCaseId] = useState('');
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = (id) => {
    setLoading(true);
    setError(null);
    const qs = id ? `?case_id=${encodeURIComponent(id)}` : '';
    api(`/api/custom-views/case-spec-pdf${qs}`)
      .then(r => { setDoc(r.document); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); addToast && addToast('Failed to load case spec', 'error'); });
  };

  useEffect(() => { load(''); /* default: latest case */ }, []); // eslint-disable-line

  const copy = () => {
    if (!doc?.text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(doc.text);
      addToast && addToast('Copied spec to clipboard');
    }
  };

  const printDoc = () => {
    const w = window.open('', '_blank');
    if (!w || !doc) return;
    w.document.write(`<html><head><title>${doc.title}</title>
      <style>body{font-family:monospace;padding:24px;white-space:pre-wrap;color:#111}</style>
      </head><body>${(doc.text || '').replace(/</g, '&lt;')}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div data-testid="case-spec-pdf" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Case Specification PDF</h3>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 13 }}>
        Generate a print-ready specification document for a dental lab case.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          type="number"
          value={caseId}
          placeholder="Case ID (blank = latest)"
          onChange={e => setCaseId(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 200 }}
        />
        <button onClick={() => load(caseId)} disabled={loading}
          style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Generate'}
        </button>
        <button onClick={copy} disabled={!doc}
          style={{ padding: '6px 12px', background: '#fff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: 6, cursor: 'pointer' }}>
          Copy
        </button>
        <button onClick={printDoc} disabled={!doc}
          style={{ padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
          Print
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', marginTop: 8 }}>Error: {error}</div>}
      {doc && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>{doc.title}</div>
          <pre style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 12,
            maxHeight: 360,
            overflow: 'auto',
            fontSize: 12,
            color: '#111827',
            whiteSpace: 'pre-wrap',
          }}>{doc.text}</pre>
        </div>
      )}
    </div>
  );
}
