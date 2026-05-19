# Audit Apply Notes — AIDentalLabCaseManager

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 1144-1179).

Audit status: lean (5 routes), but 6 AI endpoints already cover the full set
of audit-suggested AI features. Audit explicitly notes "Gaps—missing AI
counterparts: None — all AI functions are covered."

## Original audit recommendations

### Existing AI features (6 endpoints)
complexity-score, material-recommendation, root-cause-analysis,
draft-communication, bottleneck-prediction, history.

### Missing AI counterparts
None.

### Missing non-AI features
- Case detail model (materials, dentist contact, patient, delivery date).
- Workflow tracking (received / in-progress / completed / delivered / returned).
- Quality metrics or defect tracking.
- Dentist/customer communication templates.
- Inventory management for materials.

### Custom feature suggestions
- Predictive turnaround time.
- Defect prevention.
- Technician skill matching.
- Quality scoring.
- Supply chain optimization.

## Implemented in this pass

None — the audit-listed AI gaps are empty, and the missing items are non-AI
data-model features that would require schema decisions outside the
"mechanical" boundary for this pass.

## Backlog (prioritized)

### Mechanical, low-risk
1. `/api/ai/predict-turnaround-time` — stateless turnaround estimator.
2. `/api/ai/technician-skill-match` — match a case to candidate technicians
   from a profiles list.

### Needs product decision
- Case data-model (materials, statuses, deliveries).
- Quality-metrics schema.
- Inventory-of-materials schema.

### Needs credentials / external SDK
- Practice-management integrations (Dentrix, Eaglesoft, Open Dental).

### Too risky / large refactor
- Full ERP-style supply-chain prediction tied to live inventory.

## Apply pass 3 (frontend)

LEFT-AS-IS. Frontend already wires all backend AI endpoints (including the apply-pass-2 additions) with JWT Bearer auth from `localStorage`. No FE changes needed; idempotence rule applied. See `_AUDIT/apply3_logs/ab3_99.md`.
