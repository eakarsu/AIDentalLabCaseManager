-- Non-destructive, idempotent top-up seed for primary domain tables.
-- Every primary table to >= 15 rows. No DELETE/UPDATE. Unique keys use ON CONFLICT;
-- others use NOT EXISTS marker guards. Safe to run repeatedly.

-- invoice_items (FK -> invoices)
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
SELECT i.id,
       (ARRAY['Zirconia crown','PFM bridge','E.max veneer','Full denture','Implant abutment','Night guard'])[1 + (i.id % 6)],
       1 + (i.id % 3),
       round((75 + (i.id * 37))::numeric, 2),
       round(((75 + (i.id * 37)) * (1 + (i.id % 3)))::numeric, 2)
FROM invoices i
WHERE i.id <= 15
  AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id)
LIMIT 15;

-- notifications
INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read)
SELECT 1 + (i % 2), (ARRAY['info','warning','success','alert'])[1 + (i % 4)],
       'Seed notification ' || i, 'Lab case workflow update ' || i,
       (ARRAY['case','invoice','shipment'])[1 + (i % 3)], i, (i % 2 = 0)
FROM generate_series(1, 15) i
WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.title = 'Seed notification ' || i);

-- ai_results (FK -> cases)
INSERT INTO ai_results (case_id, ai_type, input_data, result, model_used)
SELECT 1 + (i % 15), (ARRAY['material_recommendation','turnaround_forecast','defect_risk','shade_match','tech_skill_match'])[1 + (i % 5)],
       'seed input payload ' || i, 'seed ai result ' || i, 'anthropic/claude-haiku-4.5'
FROM generate_series(1, 15) i
WHERE NOT EXISTS (SELECT 1 FROM ai_results a WHERE a.input_data = 'seed input payload ' || i);

-- governed_cases (unique: tenant_id, business_key)
INSERT INTO governed_cases (tenant_id, case_kind, business_key, state, payload, safety_flags, version, created_by)
SELECT 'runtime-tenant', 'lab_case', 'seed-labcase-' || lpad(i::text, 3, '0'),
       (ARRAY['received','identity_verified','design','production_approved','manufacturing','quality_review','clinician_approval','shipped','remade','closed','received','quality_review','closed','shipped','closed'])[i],
       jsonb_build_object('title', 'Governed lab case ' || i, 'restoration', 'zirconia_crown'),
       '[]'::jsonb, 1, 'runtime-admin@example.com'
FROM generate_series(1, 15) i
ON CONFLICT (tenant_id, business_key) DO NOTHING;

-- governed_evidence (unique: tenant_id, case_id, kind, sha256)
INSERT INTO governed_evidence (tenant_id, case_id, kind, sha256, storage_ref, detector_or_schema_version, metadata, recorded_by)
SELECT 'runtime-tenant', c.id, 'design_file', lpad((10000 + c.id)::text, 64, '0'),
       'vault://evidence/' || c.business_key || '.stl', 'schema-v1', '{}'::jsonb, 'runtime-admin@example.com'
FROM governed_cases c
WHERE c.business_key LIKE 'seed-labcase-%'
ON CONFLICT (tenant_id, case_id, kind, sha256) DO NOTHING;

-- governed_approvals (unique: tenant_id, case_id, target_state, approver_id)
INSERT INTO governed_approvals (tenant_id, case_id, target_state, approver_id, approver_role, reason, decision)
SELECT 'runtime-tenant', c.id, 'production_approved', 'runtime-admin@example.com', 'admin',
       'Seed approval for ' || c.business_key,
       CASE WHEN c.id % 5 = 0 THEN 'rejected' ELSE 'approved' END
FROM governed_cases c
WHERE c.business_key LIKE 'seed-labcase-%'
ON CONFLICT (tenant_id, case_id, target_state, approver_id) DO NOTHING;

-- governed_events (append-only; unique: tenant_id, idempotency_key)
INSERT INTO governed_events (tenant_id, case_id, idempotency_key, event_type, from_state, to_state, actor_id, actor_role, request_hash, detail)
SELECT 'runtime-tenant', c.id, 'seed-evt-' || c.business_key, 'state_transition', 'received', c.state,
       'runtime-admin@example.com', 'admin', lpad((20000 + c.id)::text, 64, '0'), '{}'::jsonb
FROM governed_cases c
WHERE c.business_key LIKE 'seed-labcase-%'
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

-- governed_integration_runs (unique: tenant_id, connector, idempotency_key)
INSERT INTO governed_integration_runs (tenant_id, connector, operation, idempotency_key, credential_ref, status, external_cursor, records_seen, records_applied, started_by, completed_at)
SELECT 'runtime-tenant',
       (ARRAY['practice_system','cad_cam','device_gateway','inventory','shipping','billing'])[1 + (i % 6)],
       (ARRAY['pull','push','verify'])[1 + (i % 3)],
       'seed-run-' || lpad(i::text, 3, '0'),
       'vault://integrations/connector-' || i, 'succeeded', 'cursor-' || i,
       50 + i * 5, 50 + i * 5, 'runtime-admin@example.com', NOW()
FROM generate_series(1, 15) i
ON CONFLICT (tenant_id, connector, idempotency_key) DO NOTHING;

-- governed_quality_observations (no unique key; guard by evidence_sha256)
INSERT INTO governed_quality_observations (tenant_id, case_id, metric_name, metric_value, sample_size, cohort, evaluator_version, evidence_sha256, observed_at)
SELECT 'runtime-tenant', c.id,
       (ARRAY['dimension_conformance','quality_pass_rate','turnaround_hours','remake_rate','lot_traceability','device_calibration'])[1 + (i % 6)],
       round((random() * 100)::numeric, 2), 10 + i, '{}'::jsonb, 'evaluator-v1',
       lpad((30000 + i)::text, 64, '0'), NOW()
FROM generate_series(1, 15) i
JOIN governed_cases c ON c.business_key = 'seed-labcase-' || lpad(i::text, 3, '0')
WHERE NOT EXISTS (SELECT 1 FROM governed_quality_observations q WHERE q.evidence_sha256 = lpad((30000 + i)::text, 64, '0'));
