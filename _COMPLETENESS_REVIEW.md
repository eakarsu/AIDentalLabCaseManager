# Completeness Review: AIDentalLabCaseManager

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad dental laboratory workflow surface (49 source files and 20 route modules), but static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path to link prescriptions, scans/impressions, design, materials, production stages, quality checks, shipping, and remakes.

## Why it is not complete

- 16 files are explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- The route/page inventory includes `ai`, `ai new`, `crud`, `custom views`; these surfaces show breadth but not durable execution against authoritative systems.
- 16 files reference model-provider or chat-completion behavior; generic LLM calls are not a substitute for deterministic domain execution, grounding, or evaluation.
- 21 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- Only 1 recognizable test file was found, insufficient to prove the full workflow and failure modes.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to link prescriptions, scans/impressions, design, materials, production stages, quality checks, shipping, and remakes.
- 2. Connect practice/lab systems, CAD/CAM, scanners/printers/mills, inventory, shipping, and billing; replace seed/demo records with durable synchronized data and explicit failure handling.
- 3. Validate case identity, dimensions/materials, stage transitions, quality evidence, turnaround, and remake causes.
- 4. Protect patient data, preserve device/material lot traceability, and require technician/clinician approval.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `frontend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/server.js` — service composition, middleware, and registered routes.
- `backend/routes/ai.js` — implemented API surface and domain/AI request handling.
- `backend/routes/aiNew.js` — implemented API surface and domain/AI request handling.
- `backend/routes/auth.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: use ai and ai new to select one narrow dental laboratory workflow outcome, quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress (2026-07-18)

- **Needed feature 1 — implemented locally:** `backend/domain/governedWorkflow.js`, `backend/routes/governedWorkflow.js`, and `backend/migrations/002_governed_workflow.sql` add a linked case lifecycle from prescription/identity verification through design, production approval, manufacturing, quality evidence, clinician approval, shipping, remake, and closure with idempotency, optimistic versions, evidence hashes, approvals, and immutable audit.
- **Needed feature 2 — local boundary implemented; providers blocked:** practice, CAD/CAM, device gateway, inventory, shipping, and billing jobs are allowlisted, tenant-scoped, vault-reference-only, and quarantined unless an external worker is explicitly enabled. No practice system, scanner, printer, mill, inventory, carrier, billing, or device was contacted.
- **Needed features 3–4 — implemented locally:** typed observations cover dimensions, quality pass rate, turnaround, remakes, material-lot traceability, and calibration. Patient mismatch, incomplete prescriptions, missing lots, expired calibration, and out-of-range dimensions are hard holds; technician/quality/clinician/shipping approvals and evidence are required at high-impact transitions. Previously unprotected AI routes now require authentication, and credential autofill was removed.
- **Needed feature 5 / launch risks — implemented locally:** required JWT/database configuration, verified TLS option, tenant-bearing authentication, CI, policy tests, additive migration, environment/operations documentation, nondestructive startup, separate bootstrap/migrate, and production-disabled confirmed seed scripts were added. Generated gap routes remain disabled.
- **Validation:** 4 policy tests passed; changed JavaScript/ESM, JSON, shell syntax, migration controls, and launcher exclusions passed static verification. No database, case, CAD/CAM, device, material, shipment, billing, provider, or end-to-end workflow was run. This is not clinician approval, device calibration/certification, material validation, patient-privacy compliance, or manufacturing quality validation.
