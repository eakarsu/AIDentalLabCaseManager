import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop all tables
    await client.query(`
      DROP TABLE IF EXISTS ai_results CASCADE;
      DROP TABLE IF EXISTS invoice_items CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS shipments CASCADE;
      DROP TABLE IF EXISTS remakes CASCADE;
      DROP TABLE IF EXISTS quality_checkpoints CASCADE;
      DROP TABLE IF EXISTS oven_schedules CASCADE;
      DROP TABLE IF EXISTS milling_schedules CASCADE;
      DROP TABLE IF EXISTS shade_records CASCADE;
      DROP TABLE IF EXISTS materials CASCADE;
      DROP TABLE IF EXISTS production_schedules CASCADE;
      DROP TABLE IF EXISTS technicians CASCADE;
      DROP TABLE IF EXISTS digital_impressions CASCADE;
      DROP TABLE IF EXISTS cases CASCADE;
      DROP TABLE IF EXISTS dentists CASCADE;
      DROP TABLE IF EXISTS pricing CASCADE;
      DROP TABLE IF EXISTS equipment_calibrations CASCADE;
      DROP TABLE IF EXISTS compliance_records CASCADE;
      DROP TABLE IF EXISTS continuing_education CASCADE;
      DROP TABLE IF EXISTS photo_documentation CASCADE;
      DROP TABLE IF EXISTS design_files CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create tables
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE dentists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        practice_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        preferred_lab_contact VARCHAR(255),
        account_status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        satisfaction_score DECIMAL(3,1) DEFAULT 0,
        total_cases INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cases (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(50) UNIQUE NOT NULL,
        dentist_id INT REFERENCES dentists(id) ON DELETE CASCADE,
        patient_name VARCHAR(255) NOT NULL,
        rx_details TEXT,
        tooth_numbers VARCHAR(100),
        restoration_type VARCHAR(100),
        material_requested VARCHAR(100),
        shade VARCHAR(50),
        status VARCHAR(50) DEFAULT 'received',
        priority VARCHAR(20) DEFAULT 'normal',
        complexity_score DECIMAL(3,1),
        estimated_turnaround INT,
        due_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE digital_impressions (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        scanner_type VARCHAR(100),
        quality_rating VARCHAR(50) DEFAULT 'good',
        notes TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE technicians (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialization VARCHAR(100),
        skill_level VARCHAR(50),
        current_workload INT DEFAULT 0,
        max_workload INT DEFAULT 10,
        status VARCHAR(50) DEFAULT 'available',
        phone VARCHAR(50),
        email VARCHAR(255),
        hire_date DATE,
        certifications TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE production_schedules (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        technician_id INT REFERENCES technicians(id) ON DELETE SET NULL,
        stage VARCHAR(100) NOT NULL,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE materials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        manufacturer VARCHAR(255),
        lot_number VARCHAR(100),
        quantity DECIMAL(10,2),
        unit VARCHAR(50),
        reorder_level DECIMAL(10,2),
        cost_per_unit DECIMAL(10,2),
        expiry_date DATE,
        location VARCHAR(100),
        status VARCHAR(50) DEFAULT 'in_stock',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE shade_records (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        shade_system VARCHAR(100),
        base_shade VARCHAR(50),
        cervical_shade VARCHAR(50),
        body_shade VARCHAR(50),
        incisal_shade VARCHAR(50),
        custom_staining TEXT,
        photo_reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE milling_schedules (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        machine_name VARCHAR(100) NOT NULL,
        material VARCHAR(100),
        program VARCHAR(100),
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        status VARCHAR(50) DEFAULT 'queued',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE oven_schedules (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        oven_name VARCHAR(100) NOT NULL,
        cycle_type VARCHAR(100),
        temperature DECIMAL(6,1),
        duration_minutes INT,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        status VARCHAR(50) DEFAULT 'queued',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE quality_checkpoints (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        checkpoint_name VARCHAR(100) NOT NULL,
        inspector VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        result VARCHAR(50),
        measurements TEXT,
        issues_found TEXT,
        corrective_action TEXT,
        inspected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE remakes (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        original_case_number VARCHAR(50),
        reason VARCHAR(255) NOT NULL,
        fault_category VARCHAR(100),
        cost_impact DECIMAL(10,2),
        new_due_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        root_cause TEXT,
        corrective_action TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE shipments (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        tracking_number VARCHAR(100),
        carrier VARCHAR(100),
        ship_date DATE,
        estimated_delivery DATE,
        actual_delivery DATE,
        shipping_method VARCHAR(100),
        cost DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'preparing',
        recipient_name VARCHAR(255),
        recipient_address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE pricing (
        id SERIAL PRIMARY KEY,
        procedure_name VARCHAR(255) NOT NULL,
        procedure_code VARCHAR(50),
        category VARCHAR(100),
        base_price DECIMAL(10,2) NOT NULL,
        rush_surcharge DECIMAL(5,2) DEFAULT 0,
        complexity_surcharge DECIMAL(5,2) DEFAULT 0,
        material_tier VARCHAR(50),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        dentist_id INT REFERENCES dentists(id) ON DELETE CASCADE,
        case_id INT REFERENCES cases(id) ON DELETE SET NULL,
        subtotal DECIMAL(10,2),
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'draft',
        due_date DATE,
        paid_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
        description VARCHAR(255),
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10,2),
        total DECIMAL(10,2)
      );

      CREATE TABLE equipment_calibrations (
        id SERIAL PRIMARY KEY,
        equipment_name VARCHAR(255) NOT NULL,
        equipment_type VARCHAR(100),
        serial_number VARCHAR(100),
        last_calibration DATE,
        next_calibration DATE,
        calibrated_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'current',
        results TEXT,
        certificate_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE compliance_records (
        id SERIAL PRIMARY KEY,
        record_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'compliant',
        last_review DATE,
        next_review DATE,
        responsible_person VARCHAR(255),
        documentation_link VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE continuing_education (
        id SERIAL PRIMARY KEY,
        technician_id INT REFERENCES technicians(id) ON DELETE CASCADE,
        course_name VARCHAR(255) NOT NULL,
        provider VARCHAR(255),
        completion_date DATE,
        expiry_date DATE,
        credits DECIMAL(5,1),
        certificate_number VARCHAR(100),
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE photo_documentation (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        photo_type VARCHAR(100),
        stage VARCHAR(100),
        file_name VARCHAR(255),
        description TEXT,
        taken_by VARCHAR(255),
        taken_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE design_files (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        software VARCHAR(100),
        version VARCHAR(50),
        designer VARCHAR(255),
        status VARCHAR(50) DEFAULT 'in_progress',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_results (
        id SERIAL PRIMARY KEY,
        case_id INT REFERENCES cases(id) ON DELETE SET NULL,
        ai_type VARCHAR(100) NOT NULL,
        input_data TEXT,
        result TEXT,
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed Users
    const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@dentallab.com', $1, 'Lab Administrator', 'admin')
    `, [hashedPassword]);

    // Seed Dentists (15 items)
    await client.query(`
      INSERT INTO dentists (name, practice_name, email, phone, address, preferred_lab_contact, account_status, satisfaction_score, total_cases) VALUES
      ('Dr. Sarah Mitchell', 'Mitchell Family Dentistry', 'sarah@mitchelldental.com', '(555) 101-0001', '123 Oak St, Springfield, IL', 'Lab Front Desk', 'active', 4.8, 142),
      ('Dr. James Chen', 'Chen Dental Arts', 'jchen@chendentalarts.com', '(555) 101-0002', '456 Maple Ave, Portland, OR', 'Mark - CAD Tech', 'active', 4.5, 98),
      ('Dr. Maria Rodriguez', 'Bright Smile Clinic', 'maria@brightsmile.com', '(555) 101-0003', '789 Pine Rd, Austin, TX', 'Lab Front Desk', 'active', 4.9, 215),
      ('Dr. Robert Kim', 'Kim Prosthodontics', 'rkim@kimprostho.com', '(555) 101-0004', '321 Elm Blvd, Seattle, WA', 'Julie - Ceramist', 'active', 4.7, 176),
      ('Dr. Emily Watson', 'Watson Dental Group', 'ewatson@watsondental.com', '(555) 101-0005', '654 Cedar Ln, Denver, CO', 'Lab Front Desk', 'active', 4.3, 67),
      ('Dr. Michael Brown', 'Brown & Associates', 'mbrown@browndental.com', '(555) 101-0006', '987 Birch Dr, Boston, MA', 'Mark - CAD Tech', 'active', 4.6, 134),
      ('Dr. Lisa Park', 'Park Dental Excellence', 'lpark@parkdental.com', '(555) 101-0007', '147 Spruce Way, Miami, FL', 'Lab Front Desk', 'active', 4.8, 189),
      ('Dr. David Thompson', 'Thompson Dental Care', 'dthompson@thompsondental.com', '(555) 101-0008', '258 Willow St, Chicago, IL', 'Julie - Ceramist', 'active', 4.4, 88),
      ('Dr. Jennifer Lee', 'Lee Cosmetic Dentistry', 'jlee@leecosmetic.com', '(555) 101-0009', '369 Ash Ave, San Francisco, CA', 'Lab Front Desk', 'active', 4.9, 201),
      ('Dr. William Harris', 'Harris Family Dental', 'wharris@harrisdental.com', '(555) 101-0010', '741 Poplar Rd, Nashville, TN', 'Mark - CAD Tech', 'active', 4.2, 56),
      ('Dr. Amanda White', 'White Dental Studio', 'awhite@whitedental.com', '(555) 101-0011', '852 Walnut Blvd, Phoenix, AZ', 'Lab Front Desk', 'active', 4.7, 145),
      ('Dr. Christopher Davis', 'Davis Oral Surgery', 'cdavis@davisoral.com', '(555) 101-0012', '963 Hickory Ln, Atlanta, GA', 'Julie - Ceramist', 'active', 4.5, 112),
      ('Dr. Jessica Taylor', 'Taylor Pediatric Dental', 'jtaylor@taylorpedo.com', '(555) 101-0013', '159 Chestnut Dr, Minneapolis, MN', 'Lab Front Desk', 'active', 4.6, 78),
      ('Dr. Andrew Martinez', 'Martinez Dental Implants', 'amartinez@martinezdental.com', '(555) 101-0014', '357 Sycamore St, Dallas, TX', 'Mark - CAD Tech', 'active', 4.8, 167),
      ('Dr. Rachel Green', 'Green Endodontics', 'rgreen@greenendo.com', '(555) 101-0015', '468 Magnolia Ave, Philadelphia, PA', 'Lab Front Desk', 'active', 4.4, 93)
    `);

    // Seed Cases (15 items)
    await client.query(`
      INSERT INTO cases (case_number, dentist_id, patient_name, rx_details, tooth_numbers, restoration_type, material_requested, shade, status, priority, complexity_score, estimated_turnaround, due_date, notes) VALUES
      ('DL-2024-001', 1, 'John Anderson', 'Full contour zirconia crown', '#14', 'Crown', 'Zirconia', 'A2', 'in_production', 'normal', 3.5, 7, '2024-12-20', 'Patient prefers natural look'),
      ('DL-2024-002', 2, 'Mary Johnson', 'PFM bridge 3 units', '#3-#5', 'Bridge', 'PFM', 'B1', 'design', 'high', 7.2, 10, '2024-12-22', 'Complex shade matching required'),
      ('DL-2024-003', 3, 'Robert Williams', 'E.max veneer', '#8', 'Veneer', 'E.max', 'BL2', 'received', 'rush', 4.0, 5, '2024-12-18', 'Rush case - wedding weekend'),
      ('DL-2024-004', 4, 'Patricia Davis', 'Implant abutment + crown', '#19', 'Implant Crown', 'Titanium/Zirconia', 'A3', 'in_production', 'normal', 6.5, 12, '2024-12-28', 'Nobel Biocare compatible'),
      ('DL-2024-005', 5, 'Michael Miller', 'Full arch denture upper', 'Upper Arch', 'Denture', 'Acrylic', 'A2', 'wax_try_in', 'normal', 5.0, 14, '2025-01-05', 'Patient wants natural gum shade'),
      ('DL-2024-006', 6, 'Linda Wilson', 'Inlay MOD', '#30', 'Inlay', 'E.max', 'A3.5', 'milling', 'normal', 2.5, 6, '2024-12-19', 'Conservative preparation'),
      ('DL-2024-007', 7, 'David Moore', 'Zirconia bridge anterior', '#7-#10', 'Bridge', 'Zirconia', 'B1', 'design', 'high', 8.5, 14, '2025-01-02', '4-unit bridge, high esthetic zone'),
      ('DL-2024-008', 8, 'Barbara Taylor', 'Night guard', 'Full Arch Upper', 'Night Guard', 'Acrylic', 'Clear', 'shipped', 'low', 1.5, 5, '2024-12-15', 'Hard-soft combination'),
      ('DL-2024-009', 9, 'James Thomas', 'Crown lengthening guide + temp', '#9', 'Surgical Guide', 'Resin', 'N/A', 'received', 'high', 5.5, 8, '2024-12-23', 'Surgical guide for periodontist'),
      ('DL-2024-010', 10, 'Susan Jackson', 'Partial denture lower', 'Lower Partial', 'Partial Denture', 'Chrome Cobalt', 'A2', 'in_production', 'normal', 6.0, 12, '2024-12-30', 'Kennedy Class II design'),
      ('DL-2024-011', 11, 'Richard Martin', 'All-on-4 hybrid prosthesis', 'Lower Arch', 'Hybrid Prosthesis', 'Zirconia/Titanium', 'A1', 'design', 'rush', 9.5, 21, '2025-01-10', 'Complex full arch rehabilitation'),
      ('DL-2024-012', 12, 'Karen Garcia', 'Porcelain onlay', '#18', 'Onlay', 'Porcelain', 'C2', 'quality_check', 'normal', 3.0, 7, '2024-12-21', 'Matching existing restorations'),
      ('DL-2024-013', 13, 'Charles Robinson', 'Pediatric stainless steel crown', '#T', 'SSC', 'Stainless Steel', 'N/A', 'completed', 'low', 1.0, 3, '2024-12-14', 'Primary molar'),
      ('DL-2024-014', 14, 'Dorothy Clark', 'Screw-retained implant bridge', '#12-#14', 'Implant Bridge', 'Zirconia', 'A2', 'in_production', 'high', 8.0, 16, '2025-01-08', 'Straumann system, multi-unit abutments'),
      ('DL-2024-015', 15, 'Daniel Lewis', 'Composite bonding mockup', '#6-#11', 'Diagnostic Waxup', 'Wax/Resin', 'BL3', 'received', 'normal', 4.5, 7, '2024-12-24', 'Smile design preview')
    `);

    // Seed Digital Impressions (15 items)
    await client.query(`
      INSERT INTO digital_impressions (case_id, file_name, file_type, scanner_type, quality_rating, notes) VALUES
      (1, 'DL-2024-001_upper.stl', 'STL', 'iTero Element 5D', 'excellent', 'Full arch scan, great detail'),
      (1, 'DL-2024-001_lower.stl', 'STL', 'iTero Element 5D', 'good', 'Opposing arch scan'),
      (2, 'DL-2024-002_bridge.dcm', 'DCM', '3Shape TRIOS 4', 'excellent', 'Bridge prep area captured well'),
      (3, 'DL-2024-003_veneer.stl', 'STL', 'Medit i700', 'good', 'Minimal prep veneer scan'),
      (4, 'DL-2024-004_implant.stl', 'STL', 'iTero Element 5D', 'excellent', 'Scan body captured accurately'),
      (5, 'DL-2024-005_upper_edentulous.stl', 'STL', '3Shape TRIOS 4', 'fair', 'Edentulous ridge - some distortion'),
      (6, 'DL-2024-006_inlay.stl', 'STL', 'CEREC Primescan', 'excellent', 'MOD prep clearly defined'),
      (7, 'DL-2024-007_anterior.ply', 'PLY', '3Shape TRIOS 4', 'excellent', 'Color scan included for shade reference'),
      (8, 'DL-2024-008_nightguard.stl', 'STL', 'Medit i700', 'good', 'Full arch for night guard fabrication'),
      (9, 'DL-2024-009_surgical.stl', 'STL', 'iTero Element 5D', 'excellent', 'CBCT integrated scan'),
      (10, 'DL-2024-010_partial.stl', 'STL', 'CEREC Primescan', 'good', 'Partial denture framework design scan'),
      (11, 'DL-2024-011_allon4.dcm', 'DCM', '3Shape TRIOS 4', 'excellent', 'Multi-implant scan with scan bodies'),
      (12, 'DL-2024-012_onlay.stl', 'STL', 'Medit i700', 'excellent', 'Onlay preparation detail clear'),
      (14, 'DL-2024-014_implant_bridge.stl', 'STL', 'iTero Element 5D', 'good', 'Screw-retained bridge scan'),
      (15, 'DL-2024-015_mockup.stl', 'STL', '3Shape TRIOS 4', 'excellent', 'Diagnostic waxup reference scan')
    `);

    // Seed Technicians (15 items)
    await client.query(`
      INSERT INTO technicians (name, specialization, skill_level, current_workload, max_workload, status, phone, email, hire_date, certifications) VALUES
      ('Mark Stevens', 'CAD/CAM Design', 'senior', 7, 10, 'available', '(555) 201-0001', 'mstevens@lab.com', '2018-03-15', 'CDT, 3Shape Certified'),
      ('Julie Park', 'Ceramics/Porcelain', 'master', 8, 10, 'available', '(555) 201-0002', 'jpark@lab.com', '2015-06-01', 'CDT, Master Ceramist'),
      ('Carlos Mendez', 'Removable Prosthetics', 'senior', 5, 8, 'available', '(555) 201-0003', 'cmendez@lab.com', '2019-01-10', 'CDT'),
      ('Anna Schmidt', 'Implant Work', 'senior', 6, 10, 'available', '(555) 201-0004', 'aschmidt@lab.com', '2017-09-20', 'CDT, Nobel Biocare Certified'),
      ('Tom Bradley', 'CAD/CAM Design', 'intermediate', 4, 8, 'available', '(555) 201-0005', 'tbradley@lab.com', '2021-04-01', '3Shape Certified'),
      ('Yuki Tanaka', 'Ceramics/Porcelain', 'senior', 9, 10, 'busy', '(555) 201-0006', 'ytanaka@lab.com', '2016-11-15', 'CDT, Vita Shade Certified'),
      ('Mike OBrien', 'Model/Die Work', 'intermediate', 3, 8, 'available', '(555) 201-0007', 'mobrien@lab.com', '2022-02-01', 'In Training'),
      ('Sarah Kim', 'Orthodontics', 'senior', 6, 10, 'available', '(555) 201-0008', 'skim@lab.com', '2018-08-12', 'CDT, Invisalign Certified'),
      ('David Rodriguez', 'Milling/Finishing', 'senior', 7, 10, 'available', '(555) 201-0009', 'drodriguez@lab.com', '2017-05-01', 'CDT, Roland Certified'),
      ('Lisa Chang', 'Waxing/Sculpting', 'master', 5, 8, 'available', '(555) 201-0010', 'lchang@lab.com', '2014-12-01', 'CDT, Master Technician'),
      ('Ryan Foster', 'Quality Control', 'senior', 4, 10, 'available', '(555) 201-0011', 'rfoster@lab.com', '2019-07-15', 'CDT, ISO 13485 Auditor'),
      ('Emma Wilson', 'Digital Design', 'intermediate', 6, 8, 'available', '(555) 201-0012', 'ewilson@lab.com', '2022-09-01', 'exocad Certified'),
      ('Jorge Alvarez', 'Removable Prosthetics', 'senior', 5, 10, 'available', '(555) 201-0013', 'jalvarez@lab.com', '2016-03-20', 'CDT'),
      ('Nina Patel', 'Implant Work', 'intermediate', 3, 8, 'available', '(555) 201-0014', 'npatel@lab.com', '2023-01-15', 'Straumann Certified'),
      ('Kevin Murphy', 'Shipping/Receiving', 'senior', 8, 12, 'available', '(555) 201-0015', 'kmurphy@lab.com', '2020-06-01', 'Logistics Certified')
    `);

    // Seed Production Schedules (15 items)
    await client.query(`
      INSERT INTO production_schedules (case_id, technician_id, stage, scheduled_start, scheduled_end, status, notes) VALUES
      (1, 1, 'CAD Design', '2024-12-16 08:00', '2024-12-16 12:00', 'completed', 'Design approved by dentist'),
      (1, 9, 'Milling', '2024-12-16 13:00', '2024-12-16 15:00', 'in_progress', 'Zirconia disc loaded'),
      (2, 1, 'CAD Design', '2024-12-16 13:00', '2024-12-17 12:00', 'in_progress', 'Complex 3-unit bridge design'),
      (3, 5, 'CAD Design', '2024-12-16 08:00', '2024-12-16 10:00', 'pending', 'Rush priority'),
      (4, 4, 'Implant Abutment', '2024-12-17 08:00', '2024-12-17 16:00', 'pending', 'Custom titanium abutment'),
      (5, 3, 'Denture Setup', '2024-12-18 08:00', '2024-12-19 16:00', 'in_progress', 'Wax try-in preparation'),
      (6, 9, 'Milling', '2024-12-16 15:00', '2024-12-16 17:00', 'pending', 'E.max block ready'),
      (7, 1, 'CAD Design', '2024-12-18 08:00', '2024-12-19 16:00', 'pending', 'Anterior bridge - extra design time'),
      (10, 3, 'Framework Design', '2024-12-17 08:00', '2024-12-18 12:00', 'pending', 'Chrome cobalt partial framework'),
      (11, 4, 'Implant Planning', '2024-12-16 08:00', '2024-12-17 16:00', 'in_progress', 'All-on-4 complex case'),
      (12, 2, 'Porcelain Layering', '2024-12-17 08:00', '2024-12-17 16:00', 'pending', 'Onlay layering technique'),
      (14, 4, 'Abutment Design', '2024-12-18 08:00', '2024-12-19 12:00', 'pending', 'Multi-unit abutment design'),
      (14, 1, 'Bridge CAD', '2024-12-19 13:00', '2024-12-20 16:00', 'pending', 'Screw-retained bridge design'),
      (15, 10, 'Diagnostic Waxup', '2024-12-17 08:00', '2024-12-18 12:00', 'pending', 'Smile design waxup'),
      (9, 12, 'Surgical Guide Design', '2024-12-17 08:00', '2024-12-17 16:00', 'pending', 'CBCT-based design')
    `);

    // Seed Materials (15 items)
    await client.query(`
      INSERT INTO materials (name, category, manufacturer, lot_number, quantity, unit, reorder_level, cost_per_unit, expiry_date, location, status) VALUES
      ('Katana UTML Zirconia Disc 98mm', 'Zirconia', 'Kuraray Noritake', 'KN-2024-1156', 25, 'disc', 10, 85.00, '2026-06-15', 'Milling Room - Shelf A', 'in_stock'),
      ('IPS e.max CAD LT Block A2', 'Lithium Disilicate', 'Ivoclar Vivadent', 'IV-2024-8834', 40, 'block', 15, 42.50, '2026-03-20', 'Milling Room - Shelf B', 'in_stock'),
      ('Vita VM13 Body Powder A2', 'Porcelain', 'VITA Zahnfabrik', 'VT-2024-3321', 8, 'bottle', 3, 65.00, '2025-12-01', 'Ceramics Station', 'in_stock'),
      ('Wironit Extra Chrome Cobalt', 'Alloy', 'BEGO', 'BG-2024-5567', 5, 'kg', 2, 120.00, '2027-01-01', 'Casting Room', 'in_stock'),
      ('Lucitone 199 Denture Base Resin', 'Acrylic', 'Dentsply Sirona', 'DS-2024-7712', 12, 'kit', 4, 95.00, '2025-09-30', 'Removable Dept', 'in_stock'),
      ('Titanium Grade 5 Blanks', 'Titanium', 'Straumann', 'ST-2024-2298', 15, 'blank', 5, 155.00, '2028-01-01', 'Implant Station', 'in_stock'),
      ('GC Pattern Resin', 'Resin', 'GC America', 'GC-2024-4456', 6, 'cartridge', 3, 38.00, '2025-08-15', 'Waxing Station', 'in_stock'),
      ('IPS e.max Press Ingot HO', 'Lithium Disilicate', 'Ivoclar Vivadent', 'IV-2024-9915', 30, 'ingot', 10, 28.00, '2026-01-20', 'Press Room', 'in_stock'),
      ('Noritake CZR Zirconia Ceramic', 'Porcelain', 'Kuraray Noritake', 'KN-2024-6643', 4, 'kit', 2, 185.00, '2025-11-30', 'Ceramics Station', 'low_stock'),
      ('Ivocap High Impact Acrylic', 'Acrylic', 'Ivoclar Vivadent', 'IV-2024-1127', 8, 'flask', 3, 72.00, '2025-10-15', 'Removable Dept', 'in_stock'),
      ('Nobel Biocare Multi-Unit Abutment', 'Implant Component', 'Nobel Biocare', 'NB-2024-8801', 10, 'piece', 5, 210.00, '2029-01-01', 'Implant Station', 'in_stock'),
      ('Precious Metal Alloy (High Noble)', 'Alloy', 'Jensen Dental', 'JD-2024-3345', 2, 'oz', 1, 850.00, '2030-01-01', 'Secure Cabinet', 'in_stock'),
      ('Flexcera Smile Ultra+ Resin', 'Resin', 'Desktop Health', 'DH-2024-5523', 3, 'cartridge', 2, 299.00, '2025-07-01', '3D Print Station', 'low_stock'),
      ('Impression Plaster Type III', 'Gypsum', 'Whip Mix', 'WM-2024-1189', 20, 'bag', 8, 22.00, '2025-12-31', 'Model Room', 'in_stock'),
      ('Spray Opaque Paint', 'Finishing', 'Renfert', 'RF-2024-7765', 10, 'can', 4, 18.50, '2025-06-15', 'Finishing Station', 'in_stock')
    `);

    // Seed Shade Records (15 items)
    await client.query(`
      INSERT INTO shade_records (case_id, shade_system, base_shade, cervical_shade, body_shade, incisal_shade, custom_staining, photo_reference, notes) VALUES
      (1, 'VITA Classical', 'A2', 'A3', 'A2', 'A1', 'Light amber translucency at incisal', 'case001_shade.jpg', 'Match adjacent #13 crown'),
      (2, 'VITA 3D-Master', '2M2', '3M2', '2M2', '1M1', 'Slight mammelon effect', 'case002_shade.jpg', 'Bridge must match existing teeth'),
      (3, 'VITA Classical', 'BL2', 'BL3', 'BL2', 'BL1', 'High value, minimal characterization', 'case003_shade.jpg', 'Patient wants bright white'),
      (4, 'VITA 3D-Master', '2R2.5', '3R2.5', '2R2.5', '2L1.5', 'Standard opacity', 'case004_shade.jpg', 'Match natural dentition'),
      (7, 'VITA Classical', 'B1', 'A2', 'B1', 'B1', 'Blue-grey translucency incisal third', 'case007_shade.jpg', 'High esthetic anterior bridge'),
      (6, 'VITA 3D-Master', '3M3', '4M3', '3M3', '2M2', 'No custom staining needed', 'case006_shade.jpg', 'Conservative shade for posterior'),
      (9, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Surgical guide - no shade needed'),
      (11, 'VITA Classical', 'A1', 'A2', 'A1', 'B1', 'Natural translucency pattern', 'case011_shade.jpg', 'Full arch - natural progression'),
      (12, 'VITA 3D-Master', '3R2.5', '4R2.5', '3R2.5', '2L2.5', 'Match existing PFM on #19', 'case012_shade.jpg', 'Must blend with older restorations'),
      (14, 'VITA Classical', 'A2', 'A3', 'A2', 'A1', 'Cervical warm tones', 'case014_shade.jpg', 'Implant bridge shade matching'),
      (15, 'VITA Classical', 'BL3', 'BL4', 'BL3', 'BL2', 'Preview shade for mockup', 'case015_shade.jpg', 'Smile design target shade'),
      (5, 'VITA Classical', 'A2', 'A3', 'A2', 'A1', 'Standard denture tooth shade', 'case005_shade.jpg', 'Denture teeth selection'),
      (10, 'VITA 3D-Master', '2M2', '3M2', '2M2', '1M2', 'N/A - framework only', 'case010_shade.jpg', 'Partial denture clasps visible'),
      (8, 'N/A', 'Clear', 'N/A', 'Clear', 'N/A', 'Crystal clear acrylic', 'case008_shade.jpg', 'Night guard - clear material'),
      (13, 'N/A', 'Silver', 'N/A', 'Silver', 'N/A', 'Stainless steel - no shade', 'case013_shade.jpg', 'Pediatric SSC')
    `);

    // Seed Milling Schedules (15 items)
    await client.query(`
      INSERT INTO milling_schedules (case_id, machine_name, material, program, scheduled_start, scheduled_end, status, notes) VALUES
      (1, 'Roland DWX-52D #1', 'Katana UTML Zirconia', 'Full Crown Standard', '2024-12-16 13:00', '2024-12-16 14:30', 'in_progress', 'Disc position A3'),
      (2, 'Roland DWX-52D #2', 'Katana UTML Zirconia', 'Bridge 3-Unit', '2024-12-17 08:00', '2024-12-17 11:00', 'queued', '3-unit bridge program'),
      (3, 'CEREC MC X5', 'IPS e.max CAD LT', 'Veneer Thin', '2024-12-16 15:00', '2024-12-16 15:45', 'queued', 'Rush - priority queue'),
      (6, 'CEREC MC X5', 'IPS e.max CAD LT', 'Inlay MOD', '2024-12-16 16:00', '2024-12-16 16:30', 'queued', 'After case 003'),
      (4, 'Imes-icore 350i', 'Titanium Grade 5', 'Custom Abutment', '2024-12-17 08:00', '2024-12-17 10:00', 'queued', 'Titanium abutment milling'),
      (7, 'Roland DWX-52D #1', 'Katana UTML Zirconia', 'Bridge 4-Unit Anterior', '2024-12-19 08:00', '2024-12-19 12:00', 'queued', 'Large anterior bridge'),
      (11, 'Imes-icore 350i', 'Titanium Grade 5', 'Full Arch Bar', '2024-12-20 08:00', '2024-12-20 16:00', 'queued', 'All-on-4 titanium bar'),
      (12, 'CEREC MC X5', 'IPS e.max CAD LT', 'Onlay Standard', '2024-12-17 08:00', '2024-12-17 08:45', 'queued', 'Porcelain onlay blank'),
      (14, 'Roland DWX-52D #2', 'Katana UTML Zirconia', 'Bridge 3-Unit', '2024-12-20 08:00', '2024-12-20 11:00', 'queued', 'Implant bridge framework'),
      (15, 'Formlabs Form 3B', 'Flexible Resin', 'Diagnostic Model', '2024-12-17 10:00', '2024-12-17 14:00', 'queued', '3D printed waxup model'),
      (9, 'Formlabs Form 3B', 'Surgical Guide Resin', 'Surgical Guide', '2024-12-17 14:00', '2024-12-17 18:00', 'queued', 'Surgical guide printing'),
      (5, 'Roland DWX-52D #1', 'Acrylic Disc', 'Denture Base', '2024-12-19 13:00', '2024-12-19 15:00', 'queued', 'Denture base milling'),
      (10, 'Imes-icore 350i', 'Chrome Cobalt Disc', 'Partial Framework', '2024-12-18 08:00', '2024-12-18 12:00', 'queued', 'CoCr framework milling'),
      (8, 'Roland DWX-52D #2', 'Clear Acrylic', 'Night Guard', '2024-12-15 08:00', '2024-12-15 09:00', 'completed', 'Night guard completed'),
      (13, 'N/A', 'Stainless Steel', 'Prefabricated', '2024-12-14 08:00', '2024-12-14 08:15', 'completed', 'SSC - no milling needed')
    `);

    // Seed Oven Schedules (15 items)
    await client.query(`
      INSERT INTO oven_schedules (case_id, oven_name, cycle_type, temperature, duration_minutes, scheduled_start, scheduled_end, status, notes) VALUES
      (1, 'Programat P710', 'Zirconia Sintering', 1530.0, 480, '2024-12-16 15:00', '2024-12-16 23:00', 'queued', 'Full sintering cycle overnight'),
      (2, 'Programat P710', 'Zirconia Sintering', 1530.0, 480, '2024-12-17 12:00', '2024-12-17 20:00', 'queued', 'Bridge sintering cycle'),
      (3, 'Programat EP 5010', 'Crystallization', 850.0, 25, '2024-12-16 16:00', '2024-12-16 16:25', 'queued', 'E.max crystallization fire'),
      (6, 'Programat EP 5010', 'Crystallization', 850.0, 25, '2024-12-16 17:00', '2024-12-16 17:25', 'queued', 'E.max inlay crystallization'),
      (2, 'Programat P510', 'Opaque Fire', 950.0, 12, '2024-12-18 08:00', '2024-12-18 08:12', 'queued', 'PFM opaque layer'),
      (2, 'Programat P510', 'Body Fire 1', 900.0, 15, '2024-12-18 09:00', '2024-12-18 09:15', 'queued', 'First body porcelain fire'),
      (2, 'Programat P510', 'Body Fire 2', 890.0, 15, '2024-12-18 10:00', '2024-12-18 10:15', 'queued', 'Second body correction fire'),
      (7, 'Programat P710', 'Zirconia Sintering', 1530.0, 480, '2024-12-19 13:00', '2024-12-19 21:00', 'queued', 'Anterior bridge sintering'),
      (12, 'Programat EP 5010', 'Crystallization', 850.0, 25, '2024-12-17 09:00', '2024-12-17 09:25', 'queued', 'Onlay crystallization'),
      (12, 'Programat P510', 'Stain/Glaze', 780.0, 8, '2024-12-17 14:00', '2024-12-17 14:08', 'queued', 'Final glaze fire'),
      (11, 'Programat P710', 'Zirconia Sintering', 1530.0, 600, '2024-12-21 08:00', '2024-12-21 18:00', 'queued', 'Full arch zirconia sintering - extended'),
      (14, 'Programat P710', 'Zirconia Sintering', 1530.0, 480, '2024-12-20 12:00', '2024-12-20 20:00', 'queued', 'Implant bridge sintering'),
      (1, 'Programat P510', 'Stain/Glaze', 780.0, 8, '2024-12-17 08:00', '2024-12-17 08:08', 'queued', 'Crown final glaze'),
      (3, 'Programat P510', 'Stain/Glaze', 780.0, 8, '2024-12-17 09:00', '2024-12-17 09:08', 'queued', 'Veneer characterization glaze'),
      (5, 'Ivomat IP3', 'Acrylic Cure', 100.0, 90, '2024-12-20 08:00', '2024-12-20 09:30', 'queued', 'Denture base polymerization')
    `);

    // Seed Quality Checkpoints (15 items)
    await client.query(`
      INSERT INTO quality_checkpoints (case_id, checkpoint_name, inspector, status, result, measurements, issues_found, corrective_action, inspected_at) VALUES
      (1, 'Marginal Fit Check', 'Ryan Foster', 'passed', 'pass', 'Marginal gap: 35μm (acceptable <50μm)', NULL, NULL, '2024-12-16 14:00'),
      (1, 'Shade Verification', 'Julie Park', 'passed', 'pass', 'Spectrophotometer ΔE: 1.2 (acceptable <2.0)', NULL, NULL, '2024-12-16 14:30'),
      (2, 'Design Review', 'Mark Stevens', 'in_progress', 'pending', NULL, NULL, NULL, NULL),
      (3, 'Incoming Impression QC', 'Ryan Foster', 'passed', 'pass', 'Accuracy: within tolerance', NULL, NULL, '2024-12-16 09:00'),
      (8, 'Final Inspection', 'Ryan Foster', 'passed', 'pass', 'Occlusion verified, fit confirmed', NULL, NULL, '2024-12-15 15:00'),
      (12, 'Marginal Fit Check', 'Ryan Foster', 'pending', 'pending', NULL, NULL, NULL, NULL),
      (5, 'Wax Try-in Verification', 'Carlos Mendez', 'passed', 'pass', 'Teeth position verified, midline centered', NULL, NULL, '2024-12-18 16:00'),
      (4, 'Implant Compatibility', 'Anna Schmidt', 'passed', 'pass', 'Nobel Biocare connection verified', NULL, NULL, '2024-12-17 10:00'),
      (6, 'Contact Point Check', 'Ryan Foster', 'pending', 'pending', NULL, NULL, NULL, NULL),
      (13, 'Final Inspection', 'Ryan Foster', 'passed', 'pass', 'SSC adaptation confirmed', NULL, NULL, '2024-12-14 10:00'),
      (11, 'Design Approval', 'Anna Schmidt', 'in_progress', 'pending', NULL, 'Screw access hole position needs adjustment', 'Redesigning access hole angulation', NULL),
      (7, 'Esthetic Preview', 'Julie Park', 'pending', 'pending', NULL, NULL, NULL, NULL),
      (10, 'Framework Try-in', 'Carlos Mendez', 'pending', 'pending', NULL, NULL, NULL, NULL),
      (14, 'Passive Fit Test', 'Anna Schmidt', 'pending', 'pending', NULL, NULL, NULL, NULL),
      (9, 'Surgical Guide Accuracy', 'Ryan Foster', 'pending', 'pending', NULL, NULL, NULL, NULL)
    `);

    // Seed Remakes (15 items)
    await client.query(`
      INSERT INTO remakes (case_id, original_case_number, reason, fault_category, cost_impact, new_due_date, status, root_cause, corrective_action, notes) VALUES
      (1, 'DL-2024-001-R1', 'Shade mismatch - too opaque', 'Shade', 85.00, '2024-12-22', 'completed', 'Incorrect opacity selection in CAD', 'Updated shade protocol for zirconia', 'Remade with higher translucency disc'),
      (2, 'DL-2024-050', 'Open margin on #4', 'Fit', 120.00, '2024-12-20', 'in_progress', 'Die trimming error', 'Retrained technician on die trimming', 'Second attempt with new impression'),
      (3, 'DL-2024-078', 'Porcelain chipping during try-in', 'Fracture', 42.50, '2024-12-19', 'completed', 'Thin porcelain at incisal edge', 'Minimum thickness protocol enforced', 'Redesigned with more bulk'),
      (4, 'DL-2024-092', 'Wrong implant connection', 'Lab Error', 155.00, '2024-12-25', 'pending', 'Incorrect component ordered', 'Double-check implant system protocol', 'Nobel vs Straumann mixup'),
      (5, 'DL-2024-033', 'Bite too high', 'Occlusion', 95.00, '2024-12-28', 'completed', 'Articulator mounting error', 'Recalibrated articulators', 'Reset with facebow transfer'),
      (6, 'DL-2024-101', 'Tooth shade request changed', 'Dentist Change', 0.00, '2024-12-22', 'in_progress', 'N/A - shade change requested', 'N/A', 'No fault - dentist requested different shade'),
      (7, 'DL-2024-045', 'Framework doesnt seat', 'Fit', 210.00, '2024-12-30', 'pending', 'Distorted impression scan', 'Requested new impression', 'Waiting for new digital impression'),
      (8, 'DL-2024-067', 'Night guard too thick', 'Design', 38.00, '2024-12-18', 'completed', 'CAD design parameters incorrect', 'Updated night guard design template', 'Remilled with correct thickness'),
      (9, 'DL-2024-088', 'Guide holes misaligned', 'Design', 45.00, '2024-12-24', 'in_progress', 'CBCT to STL alignment error', 'Updated alignment software protocol', 'Re-printing with corrected alignment'),
      (10, 'DL-2024-055', 'Clasp too tight', 'Fit', 60.00, '2024-12-26', 'pending', 'Undercut depth miscalculated', 'Updated surveyor calibration', 'Adjusting clasp design'),
      (11, 'DL-2024-023', 'Screw access hole wrong angle', 'Design', 350.00, '2025-01-15', 'in_progress', 'Implant angulation misread', 'Multi-angle verification protocol', 'Expensive remake - full arch'),
      (12, 'DL-2024-110', 'Surface texture rough', 'Finishing', 28.00, '2024-12-22', 'completed', 'Glazing temperature too low', 'Calibrated oven temperature', 'Re-glazed successfully'),
      (13, 'DL-2024-099', 'Wrong tooth size selected', 'Lab Error', 15.00, '2024-12-16', 'completed', 'Mislabeled SSC inventory', 'Reorganized SSC inventory system', 'Replaced with correct size'),
      (14, 'DL-2024-072', 'Zirconia sintering crack', 'Material', 180.00, '2025-01-10', 'pending', 'Oven temperature spike', 'Oven maintenance scheduled', 'Sintering oven needs calibration'),
      (15, 'DL-2024-115', 'Waxup proportions incorrect', 'Design', 35.00, '2024-12-26', 'in_progress', 'Golden proportion not followed', 'Updated smile design checklist', 'Redoing waxup with corrected proportions')
    `);

    // Seed Shipments (15 items)
    await client.query(`
      INSERT INTO shipments (case_id, tracking_number, carrier, ship_date, estimated_delivery, actual_delivery, shipping_method, cost, status, recipient_name, recipient_address, notes) VALUES
      (8, 'UPS1Z999AA10012345', 'UPS', '2024-12-15', '2024-12-16', '2024-12-16', 'Next Day Air', 25.00, 'delivered', 'Dr. David Thompson', '258 Willow St, Chicago, IL', 'Night guard delivered'),
      (13, 'FDX789012345678', 'FedEx', '2024-12-14', '2024-12-15', '2024-12-15', 'Priority Overnight', 28.00, 'delivered', 'Dr. Jessica Taylor', '159 Chestnut Dr, Minneapolis, MN', 'SSC delivered same day'),
      (1, 'UPS1Z999AA10012400', 'UPS', '2024-12-18', '2024-12-19', NULL, 'Next Day Air', 25.00, 'in_transit', 'Dr. Sarah Mitchell', '123 Oak St, Springfield, IL', 'Crown shipping today'),
      (3, 'FDX789012345700', 'FedEx', '2024-12-17', '2024-12-18', NULL, 'Priority Overnight', 35.00, 'preparing', 'Dr. Maria Rodriguez', '789 Pine Rd, Austin, TX', 'Rush case - expedited shipping'),
      (5, NULL, 'Local Courier', '2024-12-22', '2024-12-22', NULL, 'Same Day Courier', 15.00, 'pending', 'Dr. Emily Watson', '654 Cedar Ln, Denver, CO', 'Wax try-in for patient approval'),
      (6, NULL, 'UPS', '2024-12-19', '2024-12-20', NULL, 'Ground', 12.00, 'pending', 'Dr. Michael Brown', '987 Birch Dr, Boston, MA', 'Standard ground shipping'),
      (2, NULL, 'FedEx', '2024-12-22', '2024-12-23', NULL, 'Express Saver', 18.00, 'pending', 'Dr. James Chen', '456 Maple Ave, Portland, OR', 'Bridge will ship after QC'),
      (12, NULL, 'UPS', '2024-12-20', '2024-12-21', NULL, 'Next Day Air', 25.00, 'pending', 'Dr. Christopher Davis', '963 Hickory Ln, Atlanta, GA', 'Onlay after final inspection'),
      (4, NULL, 'FedEx', '2024-12-28', '2024-12-29', NULL, 'Priority Overnight', 28.00, 'pending', 'Dr. Robert Kim', '321 Elm Blvd, Seattle, WA', 'Implant crown and abutment'),
      (9, NULL, 'UPS', '2024-12-23', '2024-12-24', NULL, 'Next Day Air', 25.00, 'pending', 'Dr. Jennifer Lee', '369 Ash Ave, San Francisco, CA', 'Surgical guide priority'),
      (7, NULL, 'FedEx', '2025-01-02', '2025-01-03', NULL, 'Express Saver', 18.00, 'pending', 'Dr. Lisa Park', '147 Spruce Way, Miami, FL', 'Anterior bridge - careful packing'),
      (10, NULL, 'UPS', '2024-12-30', '2024-12-31', NULL, 'Ground', 12.00, 'pending', 'Dr. William Harris', '741 Poplar Rd, Nashville, TN', 'Partial denture framework'),
      (11, NULL, 'FedEx', '2025-01-10', '2025-01-11', NULL, 'Priority Overnight', 45.00, 'pending', 'Dr. Amanda White', '852 Walnut Blvd, Phoenix, AZ', 'Full arch - premium packaging'),
      (14, NULL, 'UPS', '2025-01-08', '2025-01-09', NULL, 'Next Day Air', 25.00, 'pending', 'Dr. Andrew Martinez', '357 Sycamore St, Dallas, TX', 'Implant bridge - insured'),
      (15, NULL, 'Local Courier', '2024-12-24', '2024-12-24', NULL, 'Same Day Courier', 15.00, 'pending', 'Dr. Rachel Green', '468 Magnolia Ave, Philadelphia, PA', 'Diagnostic waxup for consult')
    `);

    // Seed Pricing (15 items)
    await client.query(`
      INSERT INTO pricing (procedure_name, procedure_code, category, base_price, rush_surcharge, complexity_surcharge, material_tier, description, is_active) VALUES
      ('Full Contour Zirconia Crown', 'D2740', 'Crowns', 149.00, 50.00, 25.00, 'Premium', 'Monolithic zirconia crown, full contour design', true),
      ('PFM Crown', 'D2750', 'Crowns', 175.00, 50.00, 30.00, 'Standard', 'Porcelain fused to high noble metal crown', true),
      ('E.max Crown', 'D2740', 'Crowns', 165.00, 50.00, 25.00, 'Premium', 'IPS e.max lithium disilicate crown', true),
      ('Porcelain Veneer', 'D2962', 'Veneers', 185.00, 60.00, 35.00, 'Premium', 'Pressed or milled porcelain veneer', true),
      ('3-Unit Bridge (Zirconia)', 'D6245', 'Bridges', 425.00, 100.00, 75.00, 'Premium', 'Full contour zirconia 3-unit bridge', true),
      ('Implant Custom Abutment', 'D6057', 'Implants', 225.00, 75.00, 50.00, 'Premium', 'Custom titanium or zirconia abutment', true),
      ('Screw-Retained Implant Crown', 'D6065', 'Implants', 295.00, 75.00, 50.00, 'Premium', 'Implant crown with screw access', true),
      ('Full Denture', 'D5110', 'Removables', 350.00, 80.00, 40.00, 'Standard', 'Complete denture upper or lower', true),
      ('Partial Denture (CoCr)', 'D5213', 'Removables', 425.00, 80.00, 60.00, 'Standard', 'Chrome cobalt framework partial denture', true),
      ('Night Guard', 'D9944', 'Appliances', 95.00, 30.00, 15.00, 'Economy', 'Hard-soft combination night guard', true),
      ('Inlay/Onlay (E.max)', 'D2542', 'Inlays/Onlays', 145.00, 45.00, 20.00, 'Premium', 'Lithium disilicate inlay or onlay', true),
      ('Diagnostic Waxup (per tooth)', 'D9999', 'Diagnostics', 45.00, 15.00, 10.00, 'Economy', 'Diagnostic waxup per tooth unit', true),
      ('Surgical Guide', 'D9999', 'Surgical', 275.00, 75.00, 50.00, 'Premium', 'CBCT-based surgical guide', true),
      ('All-on-4 Hybrid Prosthesis', 'D6114', 'Implants', 2800.00, 500.00, 400.00, 'Premium', 'Full arch screw-retained prosthesis', true),
      ('Stainless Steel Crown', 'D2930', 'Crowns', 35.00, 10.00, 0.00, 'Economy', 'Prefabricated pediatric SSC', true)
    `);

    // Seed Invoices (15 items)
    await client.query(`
      INSERT INTO invoices (invoice_number, dentist_id, case_id, subtotal, tax, total, status, due_date, paid_date, notes) VALUES
      ('INV-2024-001', 1, 1, 149.00, 0, 149.00, 'paid', '2025-01-15', '2024-12-20', 'Zirconia crown - standard'),
      ('INV-2024-002', 2, 2, 525.00, 0, 525.00, 'pending', '2025-01-15', NULL, 'PFM bridge + rush surcharge'),
      ('INV-2024-003', 3, 3, 245.00, 0, 245.00, 'pending', '2025-01-15', NULL, 'E.max veneer + rush fee'),
      ('INV-2024-004', 4, 4, 520.00, 0, 520.00, 'draft', '2025-01-20', NULL, 'Implant abutment + crown'),
      ('INV-2024-005', 5, 5, 350.00, 0, 350.00, 'pending', '2025-01-20', NULL, 'Full upper denture'),
      ('INV-2024-006', 6, 6, 145.00, 0, 145.00, 'draft', '2025-01-15', NULL, 'E.max inlay'),
      ('INV-2024-007', 7, 7, 525.00, 0, 525.00, 'draft', '2025-01-25', NULL, '4-unit anterior bridge + complexity'),
      ('INV-2024-008', 8, 8, 95.00, 0, 95.00, 'paid', '2025-01-10', '2024-12-16', 'Night guard - standard'),
      ('INV-2024-009', 9, 9, 350.00, 0, 350.00, 'pending', '2025-01-20', NULL, 'Surgical guide + rush'),
      ('INV-2024-010', 10, 10, 425.00, 0, 425.00, 'draft', '2025-01-25', NULL, 'CoCr partial denture'),
      ('INV-2024-011', 11, 11, 3700.00, 0, 3700.00, 'draft', '2025-02-01', NULL, 'All-on-4 hybrid + rush + complexity'),
      ('INV-2024-012', 12, 12, 145.00, 0, 145.00, 'pending', '2025-01-15', NULL, 'Porcelain onlay'),
      ('INV-2024-013', 13, 13, 35.00, 0, 35.00, 'paid', '2025-01-10', '2024-12-14', 'Pediatric SSC'),
      ('INV-2024-014', 14, 14, 720.00, 0, 720.00, 'draft', '2025-02-01', NULL, 'Implant bridge 3-unit'),
      ('INV-2024-015', 15, 15, 270.00, 0, 270.00, 'pending', '2025-01-20', NULL, 'Diagnostic waxup 6 teeth')
    `);

    // Seed Equipment Calibrations (15 items)
    await client.query(`
      INSERT INTO equipment_calibrations (equipment_name, equipment_type, serial_number, last_calibration, next_calibration, calibrated_by, status, results, certificate_number, notes) VALUES
      ('Roland DWX-52D #1', 'Milling Machine', 'RDW-52D-2019-001', '2024-11-15', '2025-02-15', 'Roland Service Tech', 'current', 'All axes within 10μm tolerance', 'CAL-2024-001', 'Quarterly calibration'),
      ('Roland DWX-52D #2', 'Milling Machine', 'RDW-52D-2020-002', '2024-11-15', '2025-02-15', 'Roland Service Tech', 'current', 'All axes within 10μm tolerance', 'CAL-2024-002', 'Quarterly calibration'),
      ('CEREC MC X5', 'Milling Machine', 'CMX5-2021-003', '2024-10-20', '2025-01-20', 'Dentsply Service', 'current', 'Spindle runout: 3μm', 'CAL-2024-003', 'Quarterly calibration'),
      ('Imes-icore 350i', 'Milling Machine', 'IC350-2022-004', '2024-11-01', '2025-02-01', 'Imes Service Tech', 'current', 'Tool changer aligned, axes calibrated', 'CAL-2024-004', 'Quarterly calibration'),
      ('Programat P710', 'Sintering Furnace', 'PP710-2020-005', '2024-12-01', '2025-03-01', 'Ivoclar Service', 'current', 'Temperature accuracy ±2°C at 1530°C', 'CAL-2024-005', 'Quarterly calibration'),
      ('Programat EP 5010', 'Press Furnace', 'PEP5010-2019-006', '2024-12-01', '2025-03-01', 'Ivoclar Service', 'current', 'Vacuum and temp verified', 'CAL-2024-006', 'Quarterly calibration'),
      ('Programat P510', 'Porcelain Furnace', 'PP510-2018-007', '2024-12-01', '2025-03-01', 'Ivoclar Service', 'current', 'Temperature curves validated', 'CAL-2024-007', 'Quarterly calibration'),
      ('Formlabs Form 3B', '3D Printer', 'FF3B-2023-008', '2024-11-20', '2025-02-20', 'Formlabs Service', 'current', 'Laser calibrated, build platform level', 'CAL-2024-008', 'Quarterly calibration'),
      ('Ivomat IP3', 'Acrylic Curing Unit', 'IIP3-2021-009', '2024-10-15', '2025-01-15', 'Ivoclar Service', 'due_soon', 'Pressure and temp within spec', 'CAL-2024-009', 'Due for calibration next month'),
      ('VITA Easyshade V', 'Spectrophotometer', 'VEV-2022-010', '2024-12-10', '2025-06-10', 'VITA Service', 'current', 'Color accuracy within ΔE 0.5', 'CAL-2024-010', 'Semi-annual calibration'),
      ('Whip Mix Articulator', 'Articulator', 'WMA-2020-011', '2024-09-15', '2024-12-15', 'In-House QC', 'overdue', 'Condylar elements need adjustment', 'CAL-2024-011', 'Overdue - schedule immediately'),
      ('Renfert Dental Surveyor', 'Surveyor', 'RDS-2019-012', '2024-11-01', '2025-05-01', 'In-House QC', 'current', 'Vertical rod perpendicularity confirmed', 'CAL-2024-012', 'Semi-annual calibration'),
      ('Autoclave - Statim 5000', 'Sterilizer', 'ST5000-2021-013', '2024-12-05', '2025-01-05', 'SciCan Service', 'current', 'Spore test negative, temp/pressure OK', 'CAL-2024-013', 'Monthly verification'),
      ('Vacuum Mixer KV-36', 'Vacuum Mixer', 'KV36-2020-014', '2024-10-01', '2025-01-01', 'In-House QC', 'due_soon', 'Vacuum seal integrity verified', 'CAL-2024-014', 'Quarterly calibration'),
      ('Digital Caliper Mitutoyo', 'Measuring Tool', 'MIT-2023-015', '2024-12-01', '2025-12-01', 'External Lab', 'current', 'Accuracy within 0.01mm', 'CAL-2024-015', 'Annual calibration')
    `);

    // Seed Compliance Records (15 items)
    await client.query(`
      INSERT INTO compliance_records (record_type, title, description, status, last_review, next_review, responsible_person, notes) VALUES
      ('OSHA', 'Bloodborne Pathogen Exposure Control Plan', 'Annual review of BBP exposure control plan per OSHA 29 CFR 1910.1030', 'compliant', '2024-06-15', '2025-06-15', 'Lab Safety Officer', 'Updated with new PPE requirements'),
      ('OSHA', 'Hazard Communication Program', 'GHS-compliant HazCom program with SDS management', 'compliant', '2024-07-01', '2025-07-01', 'Lab Safety Officer', 'All SDS sheets current'),
      ('OSHA', 'Respiratory Protection Program', 'Dust and chemical vapor respiratory protection', 'compliant', '2024-08-15', '2025-08-15', 'Lab Safety Officer', 'All fit tests current'),
      ('Infection Control', 'Sterilization Protocol', 'Autoclave sterilization procedures and monitoring', 'compliant', '2024-12-01', '2025-03-01', 'QC Manager', 'Weekly spore tests documented'),
      ('Infection Control', 'Case Disinfection Protocol', 'Incoming and outgoing case disinfection procedures', 'compliant', '2024-11-15', '2025-02-15', 'QC Manager', 'EPA-registered disinfectants used'),
      ('OSHA', 'Personal Protective Equipment Assessment', 'Workplace PPE hazard assessment and training', 'compliant', '2024-09-01', '2025-09-01', 'Lab Safety Officer', 'Safety glasses, gloves, masks provided'),
      ('Quality', 'ISO 13485 Quality Management System', 'Medical device quality management system compliance', 'compliant', '2024-10-01', '2025-10-01', 'Quality Director', 'External audit passed'),
      ('Environmental', 'Waste Disposal Procedures', 'Hazardous and medical waste disposal protocols', 'compliant', '2024-11-01', '2025-05-01', 'Lab Safety Officer', 'Licensed waste hauler contracted'),
      ('OSHA', 'Emergency Action Plan', 'Fire, chemical spill, and medical emergency procedures', 'compliant', '2024-07-15', '2025-07-15', 'Lab Manager', 'Fire drill conducted quarterly'),
      ('Infection Control', 'Hand Hygiene Protocol', 'Hand washing and sanitization procedures', 'compliant', '2024-12-10', '2025-06-10', 'QC Manager', 'Compliance audit: 98%'),
      ('OSHA', 'Noise Exposure Monitoring', 'Hearing conservation program for milling areas', 'needs_review', '2024-03-15', '2024-12-15', 'Lab Safety Officer', 'Overdue for annual audiometric testing'),
      ('Quality', 'Complaint Handling Procedure', 'Process for documenting and resolving complaints', 'compliant', '2024-10-15', '2025-04-15', 'Quality Director', 'Linked to remake tracking system'),
      ('Regulatory', 'FDA Device Registration', 'Annual dental lab FDA establishment registration', 'compliant', '2024-10-01', '2025-10-01', 'Lab Manager', 'Registration #FEI-1234567'),
      ('Environmental', 'Chemical Inventory Management', 'Tracking of all chemicals per EPA requirements', 'compliant', '2024-11-15', '2025-05-15', 'Lab Safety Officer', 'Inventory updated monthly'),
      ('OSHA', 'Ergonomics Program', 'Workstation ergonomic assessments for technicians', 'compliant', '2024-09-15', '2025-09-15', 'Lab Manager', 'Standing desks offered at bench stations')
    `);

    // Seed Continuing Education (15 items)
    await client.query(`
      INSERT INTO continuing_education (technician_id, course_name, provider, completion_date, expiry_date, credits, certificate_number, category, status, notes) VALUES
      (1, 'Advanced CAD Design for Implant Prosthetics', '3Shape Academy', '2024-09-15', '2026-09-15', 12.0, 'CE-3S-2024-001', 'Technical', 'completed', 'Online + hands-on workshop'),
      (2, 'Master Class in Anterior Ceramics', 'Ivoclar Academy', '2024-06-20', '2026-06-20', 16.0, 'CE-IV-2024-002', 'Technical', 'completed', '3-day intensive course'),
      (3, 'Complete Denture Fabrication Techniques', 'NADL Annual Session', '2024-07-15', '2026-07-15', 8.0, 'CE-NADL-2024-003', 'Technical', 'completed', 'Conference workshop'),
      (4, 'Guided Implant Surgery Planning', 'Nobel Biocare Institute', '2024-10-01', '2026-10-01', 12.0, 'CE-NB-2024-004', 'Technical', 'completed', 'Certification renewal'),
      (5, 'Introduction to Dental CAD/CAM', '3Shape Academy', '2024-11-10', '2026-11-10', 8.0, 'CE-3S-2024-005', 'Technical', 'completed', 'Entry-level certification'),
      (6, 'Vita Shade System Advanced Training', 'VITA Academy', '2024-08-20', '2026-08-20', 6.0, 'CE-VT-2024-006', 'Technical', 'completed', 'Shade matching certification'),
      (11, 'ISO 13485 Internal Auditor Training', 'BSI Training', '2024-05-15', '2026-05-15', 16.0, 'CE-BSI-2024-007', 'Quality', 'completed', 'Auditor certification'),
      (1, 'OSHA Bloodborne Pathogen Training', 'Safety First LLC', '2024-01-15', '2025-01-15', 2.0, 'CE-OSHA-2024-008', 'Safety', 'expiring_soon', 'Annual renewal required'),
      (9, 'Advanced Milling Techniques for Zirconia', 'Roland DG Academy', '2024-04-20', '2026-04-20', 8.0, 'CE-RDG-2024-009', 'Technical', 'completed', 'Machine-specific training'),
      (10, 'Artistic Waxing for Smile Design', 'LMT Lab Day', '2024-02-15', '2026-02-15', 6.0, 'CE-LMT-2024-010', 'Technical', 'completed', 'Hands-on waxing workshop'),
      (12, 'exocad DentalCAD Basic Certification', 'exocad Academy', '2024-09-01', '2026-09-01', 16.0, 'CE-EXO-2024-011', 'Technical', 'completed', 'Full software certification'),
      (7, 'Model Fabrication Best Practices', 'NADL Webinar', '2024-10-15', '2026-10-15', 2.0, 'CE-NADL-2024-012', 'Technical', 'completed', 'Online webinar'),
      (8, 'Clear Aligner Fabrication', 'Invisalign Institute', '2024-03-10', '2026-03-10', 12.0, 'CE-INV-2024-013', 'Technical', 'completed', 'Advanced aligner training'),
      (14, 'Straumann Digital Solutions', 'Straumann Academy', '2024-11-20', '2026-11-20', 8.0, 'CE-STR-2024-014', 'Technical', 'completed', 'Digital implant workflow'),
      (2, 'Infection Control & OSHA Compliance', 'OSAP', '2024-06-01', '2025-06-01', 4.0, 'CE-OSAP-2024-015', 'Safety', 'completed', 'Annual compliance training')
    `);

    // Seed Photo Documentation (15 items)
    await client.query(`
      INSERT INTO photo_documentation (case_id, photo_type, stage, file_name, description, taken_by) VALUES
      (1, 'Clinical', 'Pre-treatment', 'DL-2024-001_pre_op.jpg', 'Pre-operative photo of tooth #14', 'Dr. Sarah Mitchell'),
      (1, 'Lab', 'Design', 'DL-2024-001_cad_design.jpg', 'CAD design screenshot - buccal view', 'Mark Stevens'),
      (1, 'Lab', 'Post-milling', 'DL-2024-001_milled.jpg', 'Milled zirconia crown on die', 'David Rodriguez'),
      (2, 'Clinical', 'Pre-treatment', 'DL-2024-002_pre_op.jpg', 'Bridge prep photo #3-#5', 'Dr. James Chen'),
      (3, 'Clinical', 'Pre-treatment', 'DL-2024-003_smile.jpg', 'Full smile photo for shade reference', 'Dr. Maria Rodriguez'),
      (3, 'Lab', 'Shade Reference', 'DL-2024-003_shade_tab.jpg', 'Shade tab comparison photo', 'Julie Park'),
      (5, 'Lab', 'Wax Try-in', 'DL-2024-005_wax_tryin.jpg', 'Wax try-in frontal view', 'Carlos Mendez'),
      (7, 'Lab', 'Design', 'DL-2024-007_design_anterior.jpg', 'Anterior bridge design - facial view', 'Mark Stevens'),
      (8, 'Lab', 'Completed', 'DL-2024-008_nightguard.jpg', 'Completed night guard on model', 'Tom Bradley'),
      (11, 'Lab', 'Design', 'DL-2024-011_allon4_design.jpg', 'All-on-4 CAD design overview', 'Anna Schmidt'),
      (12, 'Lab', 'Quality Check', 'DL-2024-012_onlay_fit.jpg', 'Onlay marginal fit check photo', 'Ryan Foster'),
      (13, 'Lab', 'Completed', 'DL-2024-013_ssc.jpg', 'Stainless steel crown adapted', 'Mike OBrien'),
      (14, 'Clinical', 'Pre-treatment', 'DL-2024-014_implant_xray.jpg', 'Panoramic X-ray showing implant positions', 'Dr. Andrew Martinez'),
      (15, 'Lab', 'Design', 'DL-2024-015_smile_design.jpg', 'Digital smile design overlay', 'Emma Wilson'),
      (4, 'Lab', 'Implant Component', 'DL-2024-004_abutment.jpg', 'Custom abutment on implant analog', 'Anna Schmidt')
    `);

    // Seed Design Files (15 items)
    await client.query(`
      INSERT INTO design_files (case_id, file_name, file_type, software, version, designer, status, notes) VALUES
      (1, 'DL-2024-001_crown_14.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Mark Stevens', 'approved', 'Full contour design approved'),
      (2, 'DL-2024-002_bridge_3-5.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Mark Stevens', 'in_review', 'Awaiting dentist approval'),
      (3, 'DL-2024-003_veneer_8.exo', 'EXO', 'exocad DentalCAD', '3.1', 'Emma Wilson', 'in_progress', 'Minimal prep veneer design'),
      (4, 'DL-2024-004_abutment_19.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Anna Schmidt', 'approved', 'Custom abutment with emergence profile'),
      (5, 'DL-2024-005_denture_upper.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Carlos Mendez', 'in_progress', 'Full denture tooth arrangement'),
      (6, 'DL-2024-006_inlay_30.exo', 'EXO', 'exocad DentalCAD', '3.1', 'Tom Bradley', 'approved', 'MOD inlay design exported to mill'),
      (7, 'DL-2024-007_bridge_7-10.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Mark Stevens', 'in_progress', 'Anterior bridge - working on esthetics'),
      (9, 'DL-2024-009_guide.dcm', 'DCM', 'BlueSkyPlan', '4.8', 'Emma Wilson', 'in_progress', 'Surgical guide with sleeve positions'),
      (10, 'DL-2024-010_partial.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Carlos Mendez', 'in_progress', 'Partial framework design'),
      (11, 'DL-2024-011_allon4.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Anna Schmidt', 'in_review', 'Full arch design - screw access review'),
      (12, 'DL-2024-012_onlay_18.exo', 'EXO', 'exocad DentalCAD', '3.1', 'Tom Bradley', 'approved', 'Onlay design finalized'),
      (14, 'DL-2024-014_implant_bridge.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Anna Schmidt', 'in_progress', 'Screw-retained bridge design'),
      (15, 'DL-2024-015_waxup.3oxz', '3OXZ', '3Shape Dental System', '2024.1', 'Lisa Chang', 'in_progress', 'Digital waxup for smile design'),
      (8, 'DL-2024-008_nightguard.stl', 'STL', '3Shape Dental System', '2024.1', 'Tom Bradley', 'approved', 'Night guard STL exported'),
      (13, 'DL-2024-013_ssc.pdf', 'PDF', 'N/A', 'N/A', 'Mike OBrien', 'approved', 'SSC selection guide - no CAD needed')
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with all data!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
