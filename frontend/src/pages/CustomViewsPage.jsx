import React from 'react';
import TurnaroundChart from '../components/TurnaroundChart';
import TechnicianWorkloadHeatmap from '../components/TechnicianWorkloadHeatmap';
import CaseSpecificationPDF from '../components/CaseSpecificationPDF';
import WorkflowRulesEditor from '../components/WorkflowRulesEditor';

// CustomViewsPage: Lab Views — 4 dental-lab insight widgets.
export default function CustomViewsPage({ api, addToast }) {
  return (
    <div data-testid="custom-views-page" style={{ padding: 0 }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827' }}>Lab Views</h1>
          <p className="text-muted" style={{ color: '#6b7280', margin: '4px 0 0' }}>
            Operational insights for the dental laboratory.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <TurnaroundChart api={api} addToast={addToast} />
        <TechnicianWorkloadHeatmap api={api} addToast={addToast} />
        <CaseSpecificationPDF api={api} addToast={addToast} />
        <WorkflowRulesEditor api={api} addToast={addToast} />
      </div>
    </div>
  );
}
