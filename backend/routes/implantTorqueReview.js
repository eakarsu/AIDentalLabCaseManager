import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Implant Torque Review',
    summary: { casesReviewed: 18, releaseReady: 12, qualityHolds: 3, missingTorqueDocs: 3 },
    torqueWindows: [
      { system: 'Straumann BLX', targetNcm: 35, acceptableRange: '30-35 Ncm', cases: 6 },
      { system: 'NobelActive', targetNcm: 35, acceptableRange: '32-35 Ncm', cases: 5 },
      { system: 'Zimmer TSV', targetNcm: 30, acceptableRange: '25-30 Ncm', cases: 4 },
      { system: 'BioHorizons Tapered', targetNcm: 30, acceptableRange: '25-30 Ncm', cases: 3 }
    ],
    queue: [
      { caseId: 'LAB-7421', dentist: 'Dr. Marina Patel', restoration: 'Screw-retained zirconia crown', implantSystem: 'Straumann BLX', plannedTorqueNcm: 35, receivedTorqueNcm: 35, status: 'release ready', action: 'Attach torque certificate to final packet' },
      { caseId: 'LAB-7428', dentist: 'Dr. Evan Brooks', restoration: 'Full arch provisional', implantSystem: 'NobelActive', plannedTorqueNcm: 35, receivedTorqueNcm: 28, status: 'quality hold', action: 'Confirm low torque with prescribing office before shipment' },
      { caseId: 'LAB-7434', dentist: 'Dr. Celia Kim', restoration: 'Custom abutment', implantSystem: 'Zimmer TSV', plannedTorqueNcm: 30, receivedTorqueNcm: null, status: 'documentation needed', action: 'Request driver setting and lot traceability' }
    ]
  });
});

export default router;
