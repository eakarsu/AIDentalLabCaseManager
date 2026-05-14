import React, { useState, useEffect, useCallback } from 'react';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfPredictiveTurnaroundTime from './pages/CfPredictiveTurnaroundTime';
import CfDefectPrevention from './pages/CfDefectPrevention';
import CfTechnicianSkillMatching from './pages/CfTechnicianSkillMatching';
import CfQualityScoring from './pages/CfQualityScoring';
import CfSupplyChainOptimization from './pages/CfSupplyChainOptimization';
import GapNoneAllAiFunctionsAreCoveredHighestAiDensity from './pages/GapNoneAllAiFunctionsAreCoveredHighestAiDensity';
import GapNoDetailedCaseDetailSchemaMaterialsDentistContactPat from './pages/GapNoDetailedCaseDetailSchemaMaterialsDentistContactPat';
import GapNoWorkflowStageTrackingReceivedInProgressCompletedDe from './pages/GapNoWorkflowStageTrackingReceivedInProgressCompletedDe';
import GapNoQualityMetricOrDefectTracker from './pages/GapNoQualityMetricOrDefectTracker';
import GapNoDentistCustomerCommunicationTemplateLibrary from './pages/GapNoDentistCustomerCommunicationTemplateLibrary';
import GapNoInventoryManagementForMaterials from './pages/GapNoInventoryManagementForMaterials';
import GapNoWebhooks from './pages/GapNoWebhooks';
import GapNoReportingBeyondStubs from './pages/GapNoReportingBeyondStubs';

// ============================================================
// DentalLab AI - Case Manager SPA
// ============================================================

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ---- Toast Notification System ----
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // ---- API Helper ----
  const api = useCallback(async (endpoint, options = {}) => {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [token]);

  // ---- Auth Check on Mount ----
  useEffect(() => {
    if (token) {
      api('/api/auth/me')
        .then(data => setUser(data))
        .catch(() => {
          setToken('');
          localStorage.removeItem('token');
        });
    }
  }, [token, api]);

  // ---- Logout ----
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('dashboard');
  };

  // ---- Login Handler ----
  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
  };

  // ---- If not logged in, show Login ----
  if (!token || !user) {
    return (
      <>
        <ToastContainer toasts={toasts} />
        <LoginPage onLogin={handleLogin} addToast={addToast} />
      </>
    );
  }

  // ---- Logged in: Sidebar + Content ----
  return (
    <div className="app-layout">
      <ToastContainer toasts={toasts} />
      <Sidebar
        user={user}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        toggleCollapsed={() => setSidebarCollapsed(c => !c)}
      />
      <main className="main-content">
        <MainContent
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          token={token}
          api={api}
          addToast={addToast}
          user={user}
        />
      </main>
    </div>
  );
}

// ============================================================
// Toast Container
// ============================================================
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Login Page
// ============================================================
function LoginPage({ onLogin, addToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const autoFill = () => {
    setEmail('admin@dentallab.com');
    setPassword('admin123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      onLogin(data.token, data.user);
      addToast('Login successful!', 'success');
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <i className="fas fa-tooth login-icon"></i>
          <h1>DentalLab AI</h1>
          <p>Case Management System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={autoFill}>
            <i className="fas fa-magic"></i> Auto-fill Credentials
          </button>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Sidebar
// ============================================================
const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    ]
  },
  {
    title: 'CASE MANAGEMENT',
    items: [
      { key: 'cases', label: 'Cases', icon: 'fa-briefcase-medical' },
      { key: 'digital-impressions', label: 'Digital Impressions', icon: 'fa-cube' },
      { key: 'shades', label: 'Shade Management', icon: 'fa-palette' },
      { key: 'photos', label: 'Photo Documentation', icon: 'fa-camera' },
      { key: 'design-files', label: 'Design Files', icon: 'fa-drafting-compass' },
    ]
  },
  {
    title: 'PRODUCTION',
    items: [
      { key: 'production-schedules', label: 'Production Schedule', icon: 'fa-calendar-alt' },
      { key: 'milling-schedules', label: 'Milling Machines', icon: 'fa-cogs' },
      { key: 'oven-schedules', label: 'Oven/Furnace', icon: 'fa-fire' },
      { key: 'technicians', label: 'Technicians', icon: 'fa-users-cog' },
    ]
  },
  {
    title: 'QUALITY & COMPLIANCE',
    items: [
      { key: 'quality-checkpoints', label: 'Quality Control', icon: 'fa-clipboard-check' },
      { key: 'remakes', label: 'Remakes/Adjustments', icon: 'fa-redo' },
      { key: 'equipment-calibrations', label: 'Equipment Calibration', icon: 'fa-tools' },
      { key: 'compliance', label: 'OSHA/Compliance', icon: 'fa-shield-alt' },
      { key: 'continuing-education', label: 'Continuing Education', icon: 'fa-graduation-cap' },
    ]
  },
  {
    title: 'BUSINESS',
    items: [
      { key: 'dentists', label: 'Dentist Accounts', icon: 'fa-user-md' },
      { key: 'pricing', label: 'Pricing', icon: 'fa-tags' },
      { key: 'invoices', label: 'Invoices', icon: 'fa-file-invoice-dollar' },
      { key: 'shipments', label: 'Shipping', icon: 'fa-shipping-fast' },
    ]
  },
  {
    title: 'AI ASSISTANT',
    items: [
      { key: 'ai-tools', label: 'AI Tools', icon: 'fa-robot' },
      { key: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    ]
  }
];

function Sidebar({ user, currentPage, setCurrentPage, onLogout, collapsed, toggleCollapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <i className="fas fa-tooth"></i>
          {!collapsed && <span>DentalLab AI</span>}
        </div>
        <button className="sidebar-toggle" onClick={toggleCollapsed}>
          <i className={`fas ${collapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
        </button>
      </div>

      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="user-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="user-info">
            <div className="user-name">{user.name || user.email}</div>
            <div className="user-role">{user.role || 'Staff'}</div>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.title} className="nav-section">
            {!collapsed && <div className="nav-section-title">{section.title}</div>}
            {section.items.map(item => (
              <button
                key={item.key}
                className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.key)}
                title={item.label}
              >
                <i className={`fas ${item.icon}`}></i>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// Main Content Router
// ============================================================
function MainContent({ currentPage, setCurrentPage, token, api, addToast, user }) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage api={api} addToast={addToast} setCurrentPage={setCurrentPage} user={user} />;
    case 'cases':
      return <DataPage title="Cases" apiEndpoint="/api/cases" columns={CASES_COLUMNS} formFields={CASES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'digital-impressions':
      return <DataPage title="Digital Impressions" apiEndpoint="/api/digital-impressions" columns={DIGITAL_IMPRESSIONS_COLUMNS} formFields={DIGITAL_IMPRESSIONS_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'shades':
      return <DataPage title="Shade Records" apiEndpoint="/api/shades" columns={SHADES_COLUMNS} formFields={SHADES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'photos':
      return <DataPage title="Photo Documentation" apiEndpoint="/api/photo-documentation" columns={PHOTOS_COLUMNS} formFields={PHOTOS_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'design-files':
      return <DataPage title="Design Files" apiEndpoint="/api/design-files" columns={DESIGN_FILES_COLUMNS} formFields={DESIGN_FILES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'production-schedules':
      return <DataPage title="Production Schedules" apiEndpoint="/api/production-schedules" columns={PRODUCTION_SCHEDULES_COLUMNS} formFields={PRODUCTION_SCHEDULES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'milling-schedules':
      return <DataPage title="Milling Schedules" apiEndpoint="/api/milling-schedules" columns={MILLING_COLUMNS} formFields={MILLING_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'oven-schedules':
      return <DataPage title="Oven/Furnace Schedules" apiEndpoint="/api/oven-schedules" columns={OVEN_COLUMNS} formFields={OVEN_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'technicians':
      return <DataPage title="Technicians" apiEndpoint="/api/technicians" columns={TECHNICIANS_COLUMNS} formFields={TECHNICIANS_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'quality-checkpoints':
      return <DataPage title="Quality Checkpoints" apiEndpoint="/api/quality-checkpoints" columns={QUALITY_COLUMNS} formFields={QUALITY_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'remakes':
      return <DataPage title="Remakes/Adjustments" apiEndpoint="/api/remakes" columns={REMAKES_COLUMNS} formFields={REMAKES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'equipment-calibrations':
      return <DataPage title="Equipment Calibrations" apiEndpoint="/api/equipment-calibrations" columns={EQUIPMENT_COLUMNS} formFields={EQUIPMENT_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'compliance':
      return <DataPage title="OSHA/Compliance" apiEndpoint="/api/compliance" columns={COMPLIANCE_COLUMNS} formFields={COMPLIANCE_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'continuing-education':
      return <DataPage title="Continuing Education" apiEndpoint="/api/continuing-education" columns={CE_COLUMNS} formFields={CE_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'dentists':
      return <DataPage title="Dentist Accounts" apiEndpoint="/api/dentists" columns={DENTISTS_COLUMNS} formFields={DENTISTS_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'pricing':
      return <DataPage title="Pricing" apiEndpoint="/api/pricing" columns={PRICING_COLUMNS} formFields={PRICING_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'invoices':
      return <DataPage title="Invoices" apiEndpoint="/api/invoices" columns={INVOICES_COLUMNS} formFields={INVOICES_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'shipments':
      return <DataPage title="Shipments" apiEndpoint="/api/shipments" columns={SHIPMENTS_COLUMNS} formFields={SHIPMENTS_FIELDS} token={token} api={api} addToast={addToast} />;
    case 'ai-tools':
      return <AIToolsPage api={api} addToast={addToast} />;
    case 'notifications':
      return <NotificationsPage api={api} addToast={addToast} />;
    default:
      return <DashboardPage api={api} addToast={addToast} setCurrentPage={setCurrentPage} user={user} />;
  }
}

// ============================================================
// Dashboard Page
// ============================================================
const FEATURE_CARDS = [
  { key: 'cases', icon: 'fa-briefcase-medical', title: 'Cases', desc: 'Manage dental lab cases from intake to delivery', color: '#4f46e5' },
  { key: 'digital-impressions', icon: 'fa-cube', title: 'Digital Impressions', desc: 'Handle digital scans and impression files', color: '#0891b2' },
  { key: 'shades', icon: 'fa-palette', title: 'Shade Management', desc: 'Track and match dental shades accurately', color: '#d946ef' },
  { key: 'photos', icon: 'fa-camera', title: 'Photo Documentation', desc: 'Capture and organize case photography', color: '#f59e0b' },
  { key: 'design-files', icon: 'fa-drafting-compass', title: 'Design Files', desc: 'Manage CAD/CAM design files and versions', color: '#10b981' },
  { key: 'production-schedules', icon: 'fa-calendar-alt', title: 'Production Schedule', desc: 'Plan and track production workflows', color: '#6366f1' },
  { key: 'milling-schedules', icon: 'fa-cogs', title: 'Milling Machines', desc: 'Schedule and monitor CNC milling operations', color: '#64748b' },
  { key: 'oven-schedules', icon: 'fa-fire', title: 'Oven/Furnace', desc: 'Manage sintering and firing schedules', color: '#ef4444' },
  { key: 'technicians', icon: 'fa-users-cog', title: 'Technicians', desc: 'Staff management and workload tracking', color: '#8b5cf6' },
  { key: 'quality-checkpoints', icon: 'fa-clipboard-check', title: 'Quality Control', desc: 'Inspect and verify production quality', color: '#22c55e' },
  { key: 'remakes', icon: 'fa-redo', title: 'Remakes/Adjustments', desc: 'Track remakes and root cause analysis', color: '#f97316' },
  { key: 'equipment-calibrations', icon: 'fa-tools', title: 'Equipment Calibration', desc: 'Maintain equipment accuracy and compliance', color: '#71717a' },
  { key: 'compliance', icon: 'fa-shield-alt', title: 'OSHA/Compliance', desc: 'Regulatory compliance and safety records', color: '#dc2626' },
  { key: 'continuing-education', icon: 'fa-graduation-cap', title: 'Continuing Education', desc: 'Track technician training and certifications', color: '#2563eb' },
  { key: 'dentists', icon: 'fa-user-md', title: 'Dentist Accounts', desc: 'Manage dentist relationships and accounts', color: '#0d9488' },
  { key: 'pricing', icon: 'fa-tags', title: 'Pricing', desc: 'Configure procedure pricing and tiers', color: '#ca8a04' },
  { key: 'invoices', icon: 'fa-file-invoice-dollar', title: 'Invoices', desc: 'Generate and track invoices and payments', color: '#16a34a' },
  { key: 'shipments', icon: 'fa-shipping-fast', title: 'Shipping', desc: 'Manage shipments and delivery tracking', color: '#7c3aed' },
  { key: 'ai-tools', icon: 'fa-robot', title: 'AI Tools', desc: 'AI-powered analysis and recommendations', color: '#ec4899' },
];

function DashboardPage({ api, addToast, setCurrentPage, user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/api/dashboard')
      .then(data => setStats(data))
      .catch(() => addToast('Failed to load dashboard stats', 'error'));
  }, [api, addToast]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
          <p className="text-muted">{today}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <i className="fas fa-briefcase-medical"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.active_cases ?? '--'}</div>
            <div className="stat-label">Active Cases</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <i className="fas fa-users-cog"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.available_technicians ?? '--'}</div>
            <div className="stat-label">Available Technicians</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3', color: '#ca8a04' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.low_stock_materials ?? '--'}</div>
            <div className="stat-label">Low Stock Materials</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <i className="fas fa-redo"></i>
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.pending_remakes ?? '--'}</div>
            <div className="stat-label">Pending Remakes</div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Features</h2>
      <div className="feature-grid">
        {FEATURE_CARDS.map(card => (
          <div
            key={card.key}
            className="feature-card"
            onClick={() => setCurrentPage(card.key)}
            style={{ cursor: 'pointer' }}
          >
            <div className="feature-icon" style={{ background: card.color + '18', color: card.color }}>
              <i className={`fas ${card.icon}`}></i>
            </div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Utility Functions
// ============================================================
function formatValue(val, key) {
  if (val === null || val === undefined || val === '') return '--';
  if (key === 'is_active') return val === true || val === 'true' ? 'Active' : 'Inactive';
  if (['base_price', 'rush_surcharge', 'complexity_surcharge', 'cost_impact', 'total', 'subtotal', 'tax', 'cost'].includes(key)) {
    return '$' + Number(val).toFixed(2);
  }
  if (['due_date', 'ship_date', 'estimated_delivery', 'actual_delivery', 'last_calibration', 'next_calibration', 'last_review', 'next_review', 'completion_date', 'expiry_date', 'hire_date', 'new_due_date', 'paid_date'].includes(key)) {
    try { return new Date(val).toLocaleDateString(); } catch { return val; }
  }
  if (['scheduled_start', 'scheduled_end', 'inspected_at'].includes(key)) {
    try { return new Date(val).toLocaleString(); } catch { return val; }
  }
  if (typeof val === 'string' && val.length > 50) return val.substring(0, 50) + '...';
  return String(val);
}

function Badge({ value }) {
  if (!value) return <span>--</span>;
  const cls = String(value).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return <span className={`badge badge-${cls}`}>{value}</span>;
}

// ============================================================
// Generic DataPage Component
// ============================================================
function DataPage({ title, apiEndpoint, columns, formFields, token, api, addToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api(apiEndpoint)
      .then(result => {
        setData(Array.isArray(result) ? result : (result.data || result.items || []));
      })
      .catch(err => addToast('Failed to load data: ' + err.message, 'error'))
      .finally(() => setLoading(false));
  }, [api, apiEndpoint, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setFormData({});
    setEditMode(false);
    setShowFormModal(true);
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    setDeleteConfirm(false);
  };

  const openEdit = () => {
    setFormData({ ...selectedItem });
    setEditMode(true);
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      await api(`${apiEndpoint}/${selectedItem.id}`, { method: 'DELETE' });
      addToast(`${title} item deleted successfully`, 'success');
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      addToast('Delete failed: ' + err.message, 'error');
    }
    setDeleteConfirm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMode && selectedItem?.id) {
        await api(`${apiEndpoint}/${selectedItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        addToast(`${title} item updated successfully`, 'success');
      } else {
        await api(apiEndpoint, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        addToast(`${title} item created successfully`, 'success');
      }
      setShowFormModal(false);
      fetchData();
    } catch (err) {
      addToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="data-page">
      <div className="page-header">
        <h1>{title}</h1>
        <button className="btn btn-primary" onClick={openNew}>
          <i className="fas fa-plus"></i> New Item
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p>Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox fa-3x"></i>
          <p>No records found. Click "New Item" to create one.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={row.id || idx} onClick={() => openDetail(row)} style={{ cursor: 'pointer' }}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row)
                        : ['status', 'priority', 'result', 'skill_level', 'account_status', 'fault_category'].includes(col.key)
                          ? <Badge value={row[col.key]} />
                          : formatValue(row[col.key], col.key)
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal modal-detail" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{title} - Detail</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selectedItem).map(([key, val]) => (
                  <div key={key} className="detail-field">
                    <label>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                    <div className="detail-value">
                      {['status', 'priority', 'result', 'skill_level', 'account_status', 'fault_category'].includes(key)
                        ? <Badge value={val} />
                        : formatValue(val, key)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={openEdit}>
                <i className="fas fa-edit"></i> Edit
              </button>
              <button className={`btn ${deleteConfirm ? 'btn-danger' : 'btn-secondary'}`} onClick={handleDelete}>
                <i className="fas fa-trash"></i> {deleteConfirm ? 'Confirm Delete?' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal modal-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? `Edit ${title}` : `New ${title}`}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {formFields.map(field => (
                    <div key={field.key} className={`form-group ${field.type === 'textarea' ? 'full-width' : ''}`}>
                      <label>
                        {field.label}
                        {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          required={field.required}
                        >
                          <option value="">Select...</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          required={field.required}
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI Tools Page
// ============================================================
function renderAIContent(text) {
  if (!text) return null;
  const lines = String(text).split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(<ol key={key++}>{listItems.map((li, i) => <li key={i}>{li}</li>)}</ol>);
      } else {
        elements.push(<ul key={key++}>{listItems.map((li, i) => <li key={i}>{li}</li>)}</ul>);
      }
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (str) => {
    const parts = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
      if (match.index > last) parts.push(str.slice(last, match.index));
      parts.push(<strong key={`b${match.index}`}>{match[1]}</strong>);
      last = regex.lastIndex;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length > 0 ? parts : str;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      continue;
    }

    // Headers
    if (/^###\s/.test(trimmed)) {
      flushList();
      elements.push(<h4 key={key++}>{formatInline(trimmed.replace(/^###\s*/, ''))}</h4>);
      continue;
    }
    if (/^##\s/.test(trimmed)) {
      flushList();
      elements.push(<h3 key={key++}>{formatInline(trimmed.replace(/^##\s*/, ''))}</h3>);
      continue;
    }
    if (/^#\s/.test(trimmed)) {
      flushList();
      elements.push(<h3 key={key++}>{formatInline(trimmed.replace(/^#\s*/, ''))}</h3>);
      continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(formatInline(trimmed.replace(/^\d+[\.\)]\s*/, '')));
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(formatInline(trimmed.replace(/^[-*]\s*/, '')));
      continue;
    }

    flushList();
    elements.push(<p key={key++}>{formatInline(trimmed)}</p>);
  }
  flushList();
  return elements;
}

function AIToolsPage({ api, addToast }) {
  const [cases, setCases] = useState([]);
  const [remakes, setRemakes] = useState([]);

  // State for each AI tool
  const [complexityCase, setComplexityCase] = useState('');
  const [complexityResult, setComplexityResult] = useState('');
  const [complexityLoading, setComplexityLoading] = useState(false);

  const [materialCase, setMaterialCase] = useState('');
  const [materialResult, setMaterialResult] = useState('');
  const [materialLoading, setMaterialLoading] = useState(false);

  const [rcaRemake, setRcaRemake] = useState('');
  const [rcaResult, setRcaResult] = useState('');
  const [rcaLoading, setRcaLoading] = useState(false);

  const [commCase, setCommCase] = useState('');
  const [commType, setCommType] = useState('status_update');
  const [commContext, setCommContext] = useState('');
  const [commResult, setCommResult] = useState('');
  const [commLoading, setCommLoading] = useState(false);

  const [bottleneckResult, setBottleneckResult] = useState('');
  const [bottleneckLoading, setBottleneckLoading] = useState(false);

  // New AI tools
  const [qaResult, setQaResult] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);

  const [kanbanResult, setKanbanResult] = useState(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);

  const [orderResult, setOrderResult] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // New: predict-turnaround-time
  const [turnaroundCase, setTurnaroundCase] = useState('');
  const [turnaroundResult, setTurnaroundResult] = useState(null);
  const [turnaroundLoading, setTurnaroundLoading] = useState(false);

  // New: technician-skill-match
  const [skillCase, setSkillCase] = useState('');
  const [skillResult, setSkillResult] = useState(null);
  const [skillLoading, setSkillLoading] = useState(false);

  useEffect(() => {
    api('/api/cases').then(r => setCases(Array.isArray(r) ? r : (r.data || []))).catch(() => {});
    api('/api/remakes').then(r => setRemakes(Array.isArray(r) ? r : (r.data || []))).catch(() => {});
  }, [api]);

  const runQualityAnalytics = async () => {
    setQaLoading(true); setQaResult(null);
    try {
      const res = await api('/api/ai/quality-analytics', { method: 'POST', body: JSON.stringify({}) });
      setQaResult(res);
    } catch (err) { addToast('Quality analytics failed: ' + err.message, 'error'); }
    finally { setQaLoading(false); }
  };

  const runKanban = async () => {
    setKanbanLoading(true); setKanbanResult(null);
    try {
      const res = await api('/api/ai/case-kanban', { method: 'POST', body: JSON.stringify({}) });
      setKanbanResult(res);
    } catch (err) { addToast('Kanban analysis failed: ' + err.message, 'error'); }
    finally { setKanbanLoading(false); }
  };

  const runOrderAdvisor = async () => {
    setOrderLoading(true); setOrderResult(null);
    try {
      const res = await api('/api/ai/material-order-advisor', { method: 'POST', body: JSON.stringify({}) });
      setOrderResult(res);
    } catch (err) { addToast('Order advisor failed: ' + err.message, 'error'); }
    finally { setOrderLoading(false); }
  };

  const analyzeComplexity = async () => {
    if (!complexityCase) { addToast('Please select a case', 'error'); return; }
    setComplexityLoading(true);
    setComplexityResult('');
    try {
      const res = await api('/api/ai/complexity-score', { method: 'POST', body: JSON.stringify({ caseId: complexityCase }) });
      setComplexityResult(res.result || JSON.stringify(res));
    } catch (err) { addToast('Analysis failed: ' + err.message, 'error'); }
    finally { setComplexityLoading(false); }
  };

  const analyzeMaterial = async () => {
    if (!materialCase) { addToast('Please select a case', 'error'); return; }
    setMaterialLoading(true);
    setMaterialResult('');
    try {
      const res = await api('/api/ai/material-recommendation', { method: 'POST', body: JSON.stringify({ caseId: materialCase }) });
      setMaterialResult(res.result || JSON.stringify(res));
    } catch (err) { addToast('Analysis failed: ' + err.message, 'error'); }
    finally { setMaterialLoading(false); }
  };

  const analyzeRCA = async () => {
    if (!rcaRemake) { addToast('Please select a remake', 'error'); return; }
    setRcaLoading(true);
    setRcaResult('');
    try {
      const res = await api('/api/ai/root-cause-analysis', { method: 'POST', body: JSON.stringify({ remakeId: rcaRemake }) });
      setRcaResult(res.result || JSON.stringify(res));
    } catch (err) { addToast('Analysis failed: ' + err.message, 'error'); }
    finally { setRcaLoading(false); }
  };

  const draftCommunication = async () => {
    if (!commCase) { addToast('Please select a case', 'error'); return; }
    setCommLoading(true);
    setCommResult('');
    try {
      const res = await api('/api/ai/draft-communication', {
        method: 'POST',
        body: JSON.stringify({ caseId: commCase, communicationType: commType, context: commContext })
      });
      setCommResult(res.result || JSON.stringify(res));
    } catch (err) { addToast('Draft failed: ' + err.message, 'error'); }
    finally { setCommLoading(false); }
  };

  const analyzeBottleneck = async () => {
    setBottleneckLoading(true);
    setBottleneckResult('');
    try {
      const res = await api('/api/ai/bottleneck-prediction', { method: 'POST' });
      setBottleneckResult(res.result || JSON.stringify(res));
    } catch (err) { addToast('Analysis failed: ' + err.message, 'error'); }
    finally { setBottleneckLoading(false); }
  };

  const runTurnaround = async () => {
    if (!turnaroundCase) { addToast('Please select a case', 'error'); return; }
    setTurnaroundLoading(true); setTurnaroundResult(null);
    try {
      const res = await api('/api/ai/predict-turnaround-time', { method: 'POST', body: JSON.stringify({ caseId: turnaroundCase }) });
      setTurnaroundResult(res);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('openrouter') || msg.includes('503') || msg.toLowerCase().includes('unavailable')) {
        addToast('AI not configured (no OPENROUTER_API_KEY). Backend returned 503.', 'error');
      } else {
        addToast('Turnaround prediction failed: ' + msg, 'error');
      }
    }
    finally { setTurnaroundLoading(false); }
  };

  const runSkillMatch = async () => {
    if (!skillCase) { addToast('Please select a case', 'error'); return; }
    setSkillLoading(true); setSkillResult(null);
    try {
      const res = await api('/api/ai/technician-skill-match', { method: 'POST', body: JSON.stringify({ caseId: skillCase }) });
      setSkillResult(res);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('openrouter') || msg.includes('503') || msg.toLowerCase().includes('unavailable')) {
        addToast('AI not configured (no OPENROUTER_API_KEY). Backend returned 503.', 'error');
      } else {
        addToast('Skill match failed: ' + msg, 'error');
      }
    }
    finally { setSkillLoading(false); }
  };

  return (
    <div className="ai-tools-page">
      <div className="page-header">
        <h1><i className="fas fa-robot"></i> AI Tools</h1>
      </div>

      <div className="ai-cards-grid">
        {/* Case Complexity Scoring */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-chart-bar"></i>
            <h3>Case Complexity Scoring</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Case</label>
              <select value={complexityCase} onChange={e => setComplexityCase(e.target.value)}>
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.patient_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={analyzeComplexity} disabled={complexityLoading}>
              {complexityLoading ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-brain"></i> Analyze Complexity</>}
            </button>
            {complexityResult && (
              <div className="ai-result">
                <div className="ai-result-content">{renderAIContent(complexityResult)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Material Recommendation */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-gem"></i>
            <h3>Material Recommendation</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Case</label>
              <select value={materialCase} onChange={e => setMaterialCase(e.target.value)}>
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.patient_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={analyzeMaterial} disabled={materialLoading}>
              {materialLoading ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-brain"></i> Get Recommendation</>}
            </button>
            {materialResult && (
              <div className="ai-result">
                <div className="ai-result-content">{renderAIContent(materialResult)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Issue Root Cause Analysis */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-search"></i>
            <h3>Quality Issue Root Cause Analysis</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Remake</label>
              <select value={rcaRemake} onChange={e => setRcaRemake(e.target.value)}>
                <option value="">Select a remake...</option>
                {remakes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.original_case_number || r.case_number || `Remake #${r.id}`} - {r.reason || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={analyzeRCA} disabled={rcaLoading}>
              {rcaLoading ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-brain"></i> Analyze Root Cause</>}
            </button>
            {rcaResult && (
              <div className="ai-result">
                <div className="ai-result-content">{renderAIContent(rcaResult)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Lab-to-Dentist Communication */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-envelope"></i>
            <h3>Lab-to-Dentist Communication</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Case</label>
              <select value={commCase} onChange={e => setCommCase(e.target.value)}>
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.patient_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Communication Type</label>
              <select value={commType} onChange={e => setCommType(e.target.value)}>
                <option value="status_update">Status Update</option>
                <option value="case_question">Case Question</option>
                <option value="issue_notification">Issue Notification</option>
                <option value="completion_notification">Completion Notification</option>
                <option value="remake_notification">Remake Notification</option>
                <option value="design_approval_request">Design Approval Request</option>
                <option value="shade_clarification">Shade Clarification</option>
              </select>
            </div>
            <div className="form-group">
              <label>Additional Context</label>
              <textarea
                value={commContext}
                onChange={e => setCommContext(e.target.value)}
                rows={3}
                placeholder="Add any additional context..."
              />
            </div>
            <button className="btn btn-primary" onClick={draftCommunication} disabled={commLoading}>
              {commLoading ? <><i className="fas fa-spinner fa-spin"></i> Drafting...</> : <><i className="fas fa-pen-fancy"></i> Draft Communication</>}
            </button>
            {commResult && (
              <div className="ai-result">
                <div className="ai-result-content">{renderAIContent(commResult)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Production Bottleneck Prediction */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-traffic-light"></i>
            <h3>Production Bottleneck Prediction</h3>
          </div>
          <div className="ai-card-body">
            <p className="text-muted">Analyze current production data to predict potential bottlenecks.</p>
            <button className="btn btn-primary" onClick={analyzeBottleneck} disabled={bottleneckLoading}>
              {bottleneckLoading ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-brain"></i> Analyze Bottlenecks</>}
            </button>
            {bottleneckResult && (
              <div className="ai-result">
                <div className="ai-result-content">{renderAIContent(bottleneckResult)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Quality Analytics Dashboard */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-chart-line"></i>
            <h3>Quality Analytics (Last 90 Days)</h3>
          </div>
          <div className="ai-card-body">
            <p className="text-muted">Aggregate remakes by technician, material, and restoration type with AI commentary.</p>
            <button className="btn btn-primary" onClick={runQualityAnalytics} disabled={qaLoading}>
              {qaLoading ? <><i className="fas fa-spinner fa-spin"></i> Analyzing...</> : <><i className="fas fa-brain"></i> Run Quality Analytics</>}
            </button>
            {qaResult && (
              <div className="ai-result">
                <div className="ai-result-content">
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    Total Cases: <b>{qaResult.stats?.total_cases}</b> · Total Remakes: <b>{qaResult.stats?.total_remakes}</b> · Rate: <b>{qaResult.stats?.remake_rate}</b>
                  </div>
                  <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 320 }}>{JSON.stringify(qaResult.analysis, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Case Kanban */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-columns"></i>
            <h3>Case Kanban with AI Estimates</h3>
          </div>
          <div className="ai-card-body">
            <p className="text-muted">Pull current case board grouped by stage with AI completion estimates and bottleneck callouts.</p>
            <button className="btn btn-primary" onClick={runKanban} disabled={kanbanLoading}>
              {kanbanLoading ? <><i className="fas fa-spinner fa-spin"></i> Building...</> : <><i className="fas fa-brain"></i> Generate Kanban</>}
            </button>
            {kanbanResult && (
              <div className="ai-result">
                <div className="ai-result-content">
                  <div style={{ marginBottom: 8, fontSize: 13 }}>Statuses shown: {(kanbanResult.statuses_shown || []).join(', ')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
                    {Object.entries(kanbanResult.raw_kanban || {}).map(([status, items]) => (
                      <div key={status} style={{ background: '#f1f5f9', borderRadius: 6, padding: 8 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#475569', fontWeight: 600 }}>{status} ({items.length})</div>
                        {items.slice(0, 5).map(it => (
                          <div key={it.id} style={{ background: 'white', padding: 6, marginTop: 4, borderRadius: 4, fontSize: 11 }}>
                            <div style={{ fontWeight: 600 }}>{it.case_number}</div>
                            <div style={{ color: '#64748b' }}>{it.patient_name}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 240 }}>{JSON.stringify(kanbanResult.ai_analysis, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Material Order Advisor */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-shopping-cart"></i>
            <h3>Material Order Advisor</h3>
          </div>
          <div className="ai-card-body">
            <p className="text-muted">Prioritized reorder list based on stock levels with AI cost estimates.</p>
            <button className="btn btn-primary" onClick={runOrderAdvisor} disabled={orderLoading}>
              {orderLoading ? <><i className="fas fa-spinner fa-spin"></i> Calculating...</> : <><i className="fas fa-brain"></i> Get Reorder Plan</>}
            </button>
            {orderResult && (
              <div className="ai-result">
                <div className="ai-result-content">
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    Critical: <b style={{ color: '#dc2626' }}>{orderResult.inventory_summary?.critical}</b> · Urgent: <b style={{ color: '#ea580c' }}>{orderResult.inventory_summary?.urgent}</b> · Needed: <b style={{ color: '#ca8a04' }}>{orderResult.inventory_summary?.needed}</b> · OK: <b style={{ color: '#16a34a' }}>{orderResult.inventory_summary?.ok}</b>
                  </div>
                  <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 320 }}>{JSON.stringify(orderResult.ai_order_plan, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Predict Turnaround Time */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-clock"></i>
            <h3>Predict Turnaround Time</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Case</label>
              <select value={turnaroundCase} onChange={e => setTurnaroundCase(e.target.value)}>
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.patient_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={runTurnaround} disabled={turnaroundLoading}>
              {turnaroundLoading ? <><i className="fas fa-spinner fa-spin"></i> Predicting...</> : <><i className="fas fa-brain"></i> Predict Turnaround</>}
            </button>
            {turnaroundResult && (
              <div className="ai-result">
                <div className="ai-result-content">
                  <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 320 }}>{JSON.stringify(turnaroundResult.prediction, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Technician Skill Match */}
        <div className="ai-card">
          <div className="ai-card-header">
            <i className="fas fa-user-check"></i>
            <h3>Technician Skill Match</h3>
          </div>
          <div className="ai-card-body">
            <div className="form-group">
              <label>Select Case</label>
              <select value={skillCase} onChange={e => setSkillCase(e.target.value)}>
                <option value="">Select a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.patient_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={runSkillMatch} disabled={skillLoading}>
              {skillLoading ? <><i className="fas fa-spinner fa-spin"></i> Matching...</> : <><i className="fas fa-brain"></i> Match Technician</>}
            </button>
            {skillResult && (
              <div className="ai-result">
                <div className="ai-result-content">
                  <div style={{ marginBottom: 8, fontSize: 13 }}>Candidate pool: <b>{skillResult.candidate_count}</b></div>
                  <pre style={{ fontSize: 11, background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 320 }}>{JSON.stringify(skillResult.match, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Notifications Page
// ============================================================
function NotificationsPage({ api, addToast }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await api(`/api/notifications?page=${page}&limit=20${unreadOnly ? '&unread=true' : ''}`);
      setItems(r.data || []);
      setPagination(r.pagination || { page, totalPages: 1, total: 0 });
    } catch (err) { addToast('Failed to load notifications: ' + err.message, 'error'); }
    finally { setLoading(false); }
  }, [api, addToast, unreadOnly]);

  useEffect(() => { load(1); }, [load]);

  const markRead = async (id) => {
    try { await api(`/api/notifications/${id}/read`, { method: 'PUT' }); load(pagination.page); }
    catch (err) { addToast('Failed: ' + err.message, 'error'); }
  };

  const markAllRead = async () => {
    try { await api('/api/notifications/read-all', { method: 'PUT' }); load(pagination.page); addToast('All notifications marked read'); }
    catch (err) { addToast('Failed: ' + err.message, 'error'); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="page-header">
        <h1><i className="fas fa-bell"></i> Notifications</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
            Unread only
          </label>
          <button className="btn btn-secondary" onClick={markAllRead}>Mark all read</button>
          <button className="btn btn-primary" onClick={() => load(pagination.page)}>Refresh</button>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && <div style={{ color: '#64748b' }}>No notifications.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(n => (
          <li key={n.id} style={{
            background: n.is_read ? '#f8fafc' : '#fef3c7',
            border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{n.type} · {new Date(n.created_at).toLocaleString()}</div>
            </div>
            {!n.is_read && (
              <button className="btn btn-secondary" onClick={() => markRead(n.id)} style={{ alignSelf: 'flex-start' }}>Mark read</button>
            )}
          </li>
        ))}
      </ul>
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
          <div style={{ alignSelf: 'center', fontSize: 13 }}>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</div>
          <button className="btn btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Column & Field Configurations
// ============================================================

// Cases
const CASES_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'dentist_name', label: 'Dentist' },
  { key: 'restoration_type', label: 'Restoration Type' },
  { key: 'material_requested', label: 'Material' },
  { key: 'shade', label: 'Shade' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'due_date', label: 'Due Date' },
];
const CASES_FIELDS = [
  { key: 'case_number', label: 'Case Number', type: 'text', required: true },
  { key: 'dentist_id', label: 'Dentist ID', type: 'number' },
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'rx_details', label: 'RX Details', type: 'textarea' },
  { key: 'tooth_numbers', label: 'Tooth Numbers', type: 'text' },
  { key: 'restoration_type', label: 'Restoration Type', type: 'select', options: ['Crown', 'Bridge', 'Veneer', 'Inlay', 'Onlay', 'Denture', 'Partial Denture', 'Implant Crown', 'Implant Bridge', 'Night Guard', 'Surgical Guide', 'Diagnostic Waxup', 'Hybrid Prosthesis', 'SSC', 'Other'] },
  { key: 'material_requested', label: 'Material Requested', type: 'text' },
  { key: 'shade', label: 'Shade', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['received', 'design', 'in_production', 'milling', 'wax_try_in', 'quality_check', 'completed', 'shipped'] },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'rush'] },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Digital Impressions
const DIGITAL_IMPRESSIONS_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'file_name', label: 'File Name' },
  { key: 'file_type', label: 'File Type' },
  { key: 'scanner_type', label: 'Scanner' },
  { key: 'quality_rating', label: 'Quality' },
];
const DIGITAL_IMPRESSIONS_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'file_name', label: 'File Name', type: 'text', required: true },
  { key: 'file_type', label: 'File Type', type: 'select', options: ['STL', 'DCM', 'PLY', 'OBJ'] },
  { key: 'scanner_type', label: 'Scanner Type', type: 'select', options: ['iTero Element 5D', '3Shape TRIOS 4', 'Medit i700', 'CEREC Primescan', 'Other'] },
  { key: 'quality_rating', label: 'Quality Rating', type: 'select', options: ['excellent', 'good', 'fair', 'poor'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Shade Records
const SHADES_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'shade_system', label: 'Shade System' },
  { key: 'base_shade', label: 'Base Shade' },
  { key: 'body_shade', label: 'Body Shade' },
  { key: 'incisal_shade', label: 'Incisal Shade' },
];
const SHADES_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'shade_system', label: 'Shade System', type: 'select', options: ['VITA Classical', 'VITA 3D-Master', 'N/A'] },
  { key: 'base_shade', label: 'Base Shade', type: 'text' },
  { key: 'cervical_shade', label: 'Cervical Shade', type: 'text' },
  { key: 'body_shade', label: 'Body Shade', type: 'text' },
  { key: 'incisal_shade', label: 'Incisal Shade', type: 'text' },
  { key: 'custom_staining', label: 'Custom Staining', type: 'textarea' },
  { key: 'photo_reference', label: 'Photo Reference', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Photo Documentation
const PHOTOS_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'photo_type', label: 'Photo Type' },
  { key: 'stage', label: 'Stage' },
  { key: 'file_name', label: 'File Name' },
  { key: 'taken_by', label: 'Taken By' },
];
const PHOTOS_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'photo_type', label: 'Photo Type', type: 'select', options: ['Clinical', 'Lab', 'Shade Reference'] },
  { key: 'stage', label: 'Stage', type: 'select', options: ['Pre-treatment', 'Design', 'Post-milling', 'Wax Try-in', 'Quality Check', 'Completed', 'Shade Reference', 'Implant Component'] },
  { key: 'file_name', label: 'File Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'taken_by', label: 'Taken By', type: 'text' },
];

// Design Files
const DESIGN_FILES_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'file_name', label: 'File Name' },
  { key: 'file_type', label: 'File Type' },
  { key: 'software', label: 'Software' },
  { key: 'designer', label: 'Designer' },
  { key: 'status', label: 'Status' },
];
const DESIGN_FILES_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'file_name', label: 'File Name', type: 'text', required: true },
  { key: 'file_type', label: 'File Type', type: 'select', options: ['3OXZ', 'EXO', 'STL', 'DCM', 'PDF', 'Other'] },
  { key: 'software', label: 'Software', type: 'select', options: ['3Shape Dental System', 'exocad DentalCAD', 'BlueSkyPlan', 'Other', 'N/A'] },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'designer', label: 'Designer', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['in_progress', 'in_review', 'approved', 'rejected'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Production Schedules
const PRODUCTION_SCHEDULES_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'technician_name', label: 'Technician' },
  { key: 'stage', label: 'Stage' },
  { key: 'scheduled_start', label: 'Scheduled Start' },
  { key: 'status', label: 'Status' },
];
const PRODUCTION_SCHEDULES_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'technician_id', label: 'Technician ID', type: 'number' },
  { key: 'stage', label: 'Stage', type: 'select', options: ['CAD Design', 'Milling', 'Porcelain Layering', 'Waxing', 'Framework Design', 'Implant Abutment', 'Denture Setup', 'Finishing', 'Quality Check', 'Surgical Guide Design', 'Implant Planning', 'Diagnostic Waxup', 'Bridge CAD', 'Abutment Design'] },
  { key: 'scheduled_start', label: 'Scheduled Start', type: 'datetime-local' },
  { key: 'scheduled_end', label: 'Scheduled End', type: 'datetime-local' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed', 'on_hold'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Milling Schedules
const MILLING_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'machine_name', label: 'Machine' },
  { key: 'material', label: 'Material' },
  { key: 'program', label: 'Program' },
  { key: 'status', label: 'Status' },
  { key: 'scheduled_start', label: 'Scheduled Start' },
];
const MILLING_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'machine_name', label: 'Machine', type: 'select', options: ['Roland DWX-52D #1', 'Roland DWX-52D #2', 'CEREC MC X5', 'Imes-icore 350i', 'Formlabs Form 3B', 'N/A'] },
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'program', label: 'Program', type: 'text' },
  { key: 'scheduled_start', label: 'Scheduled Start', type: 'datetime-local' },
  { key: 'scheduled_end', label: 'Scheduled End', type: 'datetime-local' },
  { key: 'status', label: 'Status', type: 'select', options: ['queued', 'in_progress', 'completed', 'cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Oven Schedules
const OVEN_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'oven_name', label: 'Oven' },
  { key: 'cycle_type', label: 'Cycle Type' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'duration_minutes', label: 'Duration (min)' },
  { key: 'status', label: 'Status' },
];
const OVEN_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'oven_name', label: 'Oven', type: 'select', options: ['Programat P710', 'Programat EP 5010', 'Programat P510', 'Ivomat IP3', 'Other'] },
  { key: 'cycle_type', label: 'Cycle Type', type: 'select', options: ['Zirconia Sintering', 'Crystallization', 'Opaque Fire', 'Body Fire 1', 'Body Fire 2', 'Stain/Glaze', 'Acrylic Cure', 'Other'] },
  { key: 'temperature', label: 'Temperature', type: 'number' },
  { key: 'duration_minutes', label: 'Duration (min)', type: 'number' },
  { key: 'scheduled_start', label: 'Scheduled Start', type: 'datetime-local' },
  { key: 'scheduled_end', label: 'Scheduled End', type: 'datetime-local' },
  { key: 'status', label: 'Status', type: 'select', options: ['queued', 'in_progress', 'completed', 'cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Technicians
const TECHNICIANS_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'skill_level', label: 'Skill Level' },
  { key: 'current_workload', label: 'Workload', render: (row) => `${row.current_workload || 0}/${row.max_workload || 0}` },
  { key: 'status', label: 'Status' },
  { key: 'phone', label: 'Phone' },
];
const TECHNICIANS_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'specialization', label: 'Specialization', type: 'select', options: ['CAD/CAM Design', 'Ceramics/Porcelain', 'Removable Prosthetics', 'Implant Work', 'Model/Die Work', 'Orthodontics', 'Milling', 'Finishing', 'Waxing/Sculpting', 'Quality Control', 'Digital Design', 'Shipping/Receiving'] },
  { key: 'skill_level', label: 'Skill Level', type: 'select', options: ['junior', 'intermediate', 'senior', 'master'] },
  { key: 'current_workload', label: 'Current Workload', type: 'number' },
  { key: 'max_workload', label: 'Max Workload', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['available', 'busy', 'off', 'vacation'] },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'hire_date', label: 'Hire Date', type: 'date' },
  { key: 'certifications', label: 'Certifications', type: 'textarea' },
];

// Quality Checkpoints
const QUALITY_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'checkpoint_name', label: 'Checkpoint' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'status', label: 'Status' },
  { key: 'result', label: 'Result' },
];
const QUALITY_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'checkpoint_name', label: 'Checkpoint Name', type: 'text', required: true },
  { key: 'inspector', label: 'Inspector', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'passed', 'failed'] },
  { key: 'result', label: 'Result', type: 'select', options: ['pending', 'pass', 'fail', 'conditional'] },
  { key: 'measurements', label: 'Measurements', type: 'textarea' },
  { key: 'issues_found', label: 'Issues Found', type: 'textarea' },
  { key: 'corrective_action', label: 'Corrective Action', type: 'textarea' },
  { key: 'inspected_at', label: 'Inspected At', type: 'datetime-local' },
];

// Remakes
const REMAKES_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'reason', label: 'Reason' },
  { key: 'fault_category', label: 'Fault Category' },
  { key: 'cost_impact', label: 'Cost Impact' },
  { key: 'status', label: 'Status' },
  { key: 'new_due_date', label: 'New Due Date' },
];
const REMAKES_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'original_case_number', label: 'Original Case #', type: 'text' },
  { key: 'reason', label: 'Reason', type: 'text', required: true },
  { key: 'fault_category', label: 'Fault Category', type: 'select', options: ['Shade', 'Fit', 'Fracture', 'Lab Error', 'Occlusion', 'Dentist Change', 'Design', 'Material', 'Finishing'] },
  { key: 'cost_impact', label: 'Cost Impact', type: 'number' },
  { key: 'new_due_date', label: 'New Due Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'completed'] },
  { key: 'root_cause', label: 'Root Cause', type: 'textarea' },
  { key: 'corrective_action', label: 'Corrective Action', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Equipment Calibrations
const EQUIPMENT_COLUMNS = [
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'equipment_type', label: 'Type' },
  { key: 'last_calibration', label: 'Last Calibration' },
  { key: 'next_calibration', label: 'Next Calibration' },
  { key: 'status', label: 'Status' },
  { key: 'calibrated_by', label: 'Calibrated By' },
];
const EQUIPMENT_FIELDS = [
  { key: 'equipment_name', label: 'Equipment Name', type: 'text', required: true },
  { key: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Milling Machine', 'Sintering Furnace', 'Press Furnace', 'Porcelain Furnace', '3D Printer', 'Acrylic Curing Unit', 'Spectrophotometer', 'Articulator', 'Surveyor', 'Sterilizer', 'Vacuum Mixer', 'Measuring Tool'] },
  { key: 'serial_number', label: 'Serial Number', type: 'text' },
  { key: 'last_calibration', label: 'Last Calibration', type: 'date' },
  { key: 'next_calibration', label: 'Next Calibration', type: 'date' },
  { key: 'calibrated_by', label: 'Calibrated By', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['current', 'due_soon', 'overdue'] },
  { key: 'results', label: 'Results', type: 'textarea' },
  { key: 'certificate_number', label: 'Certificate Number', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Compliance
const COMPLIANCE_COLUMNS = [
  { key: 'record_type', label: 'Record Type' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'last_review', label: 'Last Review' },
  { key: 'next_review', label: 'Next Review' },
  { key: 'responsible_person', label: 'Responsible Person' },
];
const COMPLIANCE_FIELDS = [
  { key: 'record_type', label: 'Record Type', type: 'select', options: ['OSHA', 'Infection Control', 'Quality', 'Environmental', 'Regulatory'] },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ['compliant', 'needs_review', 'non_compliant'] },
  { key: 'last_review', label: 'Last Review', type: 'date' },
  { key: 'next_review', label: 'Next Review', type: 'date' },
  { key: 'responsible_person', label: 'Responsible Person', type: 'text' },
  { key: 'documentation_link', label: 'Documentation Link', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Continuing Education
const CE_COLUMNS = [
  { key: 'technician_name', label: 'Technician' },
  { key: 'course_name', label: 'Course' },
  { key: 'provider', label: 'Provider' },
  { key: 'completion_date', label: 'Completed' },
  { key: 'credits', label: 'Credits' },
  { key: 'status', label: 'Status' },
];
const CE_FIELDS = [
  { key: 'technician_id', label: 'Technician ID', type: 'number', required: true },
  { key: 'course_name', label: 'Course Name', type: 'text', required: true },
  { key: 'provider', label: 'Provider', type: 'text' },
  { key: 'completion_date', label: 'Completion Date', type: 'date' },
  { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
  { key: 'credits', label: 'Credits', type: 'number' },
  { key: 'certificate_number', label: 'Certificate Number', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: ['Technical', 'Safety', 'Quality', 'Regulatory'] },
  { key: 'status', label: 'Status', type: 'select', options: ['completed', 'in_progress', 'expiring_soon', 'expired'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Dentists
const DENTISTS_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'practice_name', label: 'Practice' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'account_status', label: 'Status' },
  { key: 'satisfaction_score', label: 'Satisfaction' },
  { key: 'total_cases', label: 'Total Cases' },
];
const DENTISTS_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'practice_name', label: 'Practice Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'preferred_lab_contact', label: 'Preferred Lab Contact', type: 'text' },
  { key: 'account_status', label: 'Account Status', type: 'select', options: ['active', 'inactive', 'suspended'] },
  { key: 'satisfaction_score', label: 'Satisfaction Score', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Pricing
const PRICING_COLUMNS = [
  { key: 'procedure_name', label: 'Procedure' },
  { key: 'procedure_code', label: 'Code' },
  { key: 'category', label: 'Category' },
  { key: 'base_price', label: 'Base Price' },
  { key: 'rush_surcharge', label: 'Rush Surcharge' },
  { key: 'material_tier', label: 'Material Tier' },
  { key: 'is_active', label: 'Active' },
];
const PRICING_FIELDS = [
  { key: 'procedure_name', label: 'Procedure Name', type: 'text', required: true },
  { key: 'procedure_code', label: 'Procedure Code', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: ['Crowns', 'Bridges', 'Veneers', 'Implants', 'Removables', 'Appliances', 'Inlays', 'Onlays', 'Diagnostics', 'Surgical'] },
  { key: 'base_price', label: 'Base Price', type: 'number', required: true },
  { key: 'rush_surcharge', label: 'Rush Surcharge', type: 'number' },
  { key: 'complexity_surcharge', label: 'Complexity Surcharge', type: 'number' },
  { key: 'material_tier', label: 'Material Tier', type: 'select', options: ['Economy', 'Standard', 'Premium'] },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'is_active', label: 'Is Active', type: 'select', options: ['true', 'false'] },
];

// Invoices
const INVOICES_COLUMNS = [
  { key: 'invoice_number', label: 'Invoice #' },
  { key: 'dentist_name', label: 'Dentist' },
  { key: 'case_number', label: 'Case #' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'due_date', label: 'Due Date' },
];
const INVOICES_FIELDS = [
  { key: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
  { key: 'dentist_id', label: 'Dentist ID', type: 'number', required: true },
  { key: 'case_id', label: 'Case ID', type: 'number' },
  { key: 'subtotal', label: 'Subtotal', type: 'number' },
  { key: 'tax', label: 'Tax', type: 'number' },
  { key: 'total', label: 'Total', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'pending', 'paid', 'overdue'] },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'paid_date', label: 'Paid Date', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Shipments
const SHIPMENTS_COLUMNS = [
  { key: 'case_number', label: 'Case #' },
  { key: 'tracking_number', label: 'Tracking #' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'ship_date', label: 'Ship Date' },
  { key: 'estimated_delivery', label: 'Est. Delivery' },
  { key: 'status', label: 'Status' },
];
const SHIPMENTS_FIELDS = [
  { key: 'case_id', label: 'Case ID', type: 'number', required: true },
  { key: 'tracking_number', label: 'Tracking Number', type: 'text' },
  { key: 'carrier', label: 'Carrier', type: 'select', options: ['UPS', 'FedEx', 'Local Courier', 'USPS', 'DHL'] },
  { key: 'ship_date', label: 'Ship Date', type: 'date' },
  { key: 'estimated_delivery', label: 'Estimated Delivery', type: 'date' },
  { key: 'actual_delivery', label: 'Actual Delivery', type: 'date' },
  { key: 'shipping_method', label: 'Shipping Method', type: 'select', options: ['Next Day Air', 'Priority Overnight', 'Express Saver', 'Ground', 'Same Day Courier'] },
  { key: 'cost', label: 'Cost', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['preparing', 'in_transit', 'delivered', 'pending'] },
  { key: 'recipient_name', label: 'Recipient Name', type: 'text' },
  { key: 'recipient_address', label: 'Recipient Address', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default App;
