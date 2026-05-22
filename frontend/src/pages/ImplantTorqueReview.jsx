import React, { useEffect, useState } from 'react';

function ImplantTorqueReview({ api, addToast }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/api/implant-torque-review')
      .then(setData)
      .catch((err) => addToast(`Failed to load implant torque review: ${err.message}`, 'error'));
  }, [api, addToast]);

  if (!data) return <div className="loading">Loading implant torque review...</div>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Implant Torque Review</h1>
          <p className="text-muted">Release checks for implant cases, torque documentation, and quality holds.</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-info"><div className="stat-value">{data.summary.casesReviewed}</div><div className="stat-label">Cases Reviewed</div></div></div>
        <div className="stat-card"><div className="stat-info"><div className="stat-value">{data.summary.releaseReady}</div><div className="stat-label">Release Ready</div></div></div>
        <div className="stat-card"><div className="stat-info"><div className="stat-value">{data.summary.qualityHolds}</div><div className="stat-label">Quality Holds</div></div></div>
        <div className="stat-card"><div className="stat-info"><div className="stat-value">{data.summary.missingTorqueDocs}</div><div className="stat-label">Missing Docs</div></div></div>
      </div>
      <h2 className="section-title">Torque Windows</h2>
      <div className="feature-grid">
        {data.torqueWindows.map((item) => (
          <div className="feature-card" key={item.system}>
            <h3>{item.system}</h3>
            <p>{item.acceptableRange}</p>
            <strong>{item.cases} active cases</strong>
          </div>
        ))}
      </div>
      <h2 className="section-title">Review Queue</h2>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Case</th><th>Dentist</th><th>Restoration</th><th>System</th><th>Planned</th><th>Received</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {data.queue.map((item) => (
              <tr key={item.caseId}>
                <td>{item.caseId}</td>
                <td>{item.dentist}</td>
                <td>{item.restoration}</td>
                <td>{item.implantSystem}</td>
                <td>{item.plannedTorqueNcm} Ncm</td>
                <td>{item.receivedTorqueNcm ? `${item.receivedTorqueNcm} Ncm` : 'Missing'}</td>
                <td><span className="badge">{item.status}</span></td>
                <td>{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ImplantTorqueReview;
