# KORENE Eye Clinic - Frontend Documentation

**Version:** 1.0.0  
**Date:** April 18, 2026

---

## Table of Contents

1. Overview
2. Project Structure
3. Component Architecture
4. React Hooks
5. Service Layer
6. State Management
7. Routing
8. Forms & Validation
9. UI Components

---

## 1. Overview

The frontend is built with:

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router 7** - Client-side routing
- **Context API** - State management

---

## 2. Project Structure

```
src/
├── components/              # React components
│   ├── content/           # Page content components
│   │   ├── DashboardContent.jsx
│   │   ├── PatientsContent.jsx
│   │   ├── TestsContent.jsx
│   │   ├── PharmacyContent.jsx
│   │   ├── InventoryContent.jsx
│   │   ├── ReportsContent.jsx
│   │   ├── SettingsContent.jsx
│   │   ├── MessagesContent.jsx
│   │   └── CVFWorkspaceContent.jsx
│   ├── layout/            # Layout components
│   │   ├── Layout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── modals/            # Modal components
│   │   ├── AddPatientModal.jsx
│   │   ├── PrescribeModal.jsx
│   │   ├── DispenseModal.jsx
│   │   ├── UploadTestModal.jsx
│   │   ├── EditTestModal.jsx
│   │   ├── GenerateReportModal.jsx
│   │   ├── PatientQuickViewModal.jsx
│   │   └── NewMessageModal.jsx
│   ├── forms/             # Form components
│   │   ├── AdminForm.jsx
│   │   ├── DoctorForm.jsx
│   │   ├── AssistantForm.jsx
│   │   └── PasswordInput.jsx
│   ├── ui/               # Base UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Select.jsx
│   │   ├── Badge.jsx
│   │   └── Card.jsx
│   ├── common/            # Common components
│   │   └── ErrorBoundary.jsx
│   ├── MainApp.jsx        # Main app entry
│   ├── AuthApp.jsx       # Auth app entry
│   ├── Icons.jsx         # Icon components
│   └── LoadingScreen.jsx
├── hooks/                # React hooks
│   ├── useUser.js
│   ├── usePatients.js
│   ├── useTests.js
│   ├── usePrescriptions.js
│   ├── usePharmacy.js
│   ├── useInventory.js
│   ├── useVisits.js
│   ├── useCaseNotes.js
│   ├── useReminders.js
│   ├── useNotifications.js
│   ├── useMessages.js
│   ├── useServerConnection.js
│   ├── useServerEvents.js
│   ├── useIPC.js
│   ├── useDataService.js
│   └── useKeyboardShortcuts.js
├── services/              # Service layer
│   ├── patientService.js
│   ├── testService.js
│   ├── prescriptionService.js
│   ├── pharmacyService.js
│   ├── inventoryService.js
│   ├── visitService.js
│   ├── caseNoteService.js
│   ├── reminderService.js
│   ├── reportService.js
│   ├── messageService.js
│   ├── activityLogService.js
│   ├── revenueService.js
│   ├── BackupService.js
│   ├── HensonImportService.js
│   ├── DatabaseService.js
│   └── FileService.js
├── pages/                # Page components
│   ├── dashboard/
│   │   ├── AdminDashboard.jsx
│   │   ├── DoctorDashboard.jsx
│   │   └── AssistantDashboardScreen.jsx
│   ├── PatientDetailsPage.jsx
│   ├── PatientProfilePage.jsx
│   └── CreateInventoryItemScreen.jsx
├── context/               # React context
│   ├── ThemeContext.jsx
│   └── SystemConfigContext.jsx
├── utils/                # Utilities
│   ├── logger.js
│   ├── sessionUtils.js
│   ├── formatters.js
│   └── constants.js
├── App.jsx
├── App.css
├── index.jsx
└── auth.jsx
```

---

## 3. Component Architecture

### 3.1 Main App Structure

```javascript
// src/components/MainApp.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';

export default function MainApp() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/dashboard" element={<DashboardContent />} />
            <Route path="/patients" element={<PatientsContent />} />
            <Route path="/tests" element={<TestsContent />} />
            <Route path="/prescriptions" element={<PrescriptionsContent />} />
            <Route path="/pharmacy" element={<PharmacyContent />} />
            <Route path="/inventory" element={<InventoryContent />} />
            <Route path="/reports" element={<ReportsContent />} />
            <Route path="/settings" element={<SettingsContent />} />
            <Route path="/messages" element={<MessagesContent />} />
            <Route path="/case-notes" element={<CaseNotesPage />} />
            <Route path="/cvf" element={<CVFWorkspaceContent />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

### 3.2 Layout Component

```javascript
// src/components/layout/Layout.jsx
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 3.3 Page Content Example

```javascript
// src/components/content/PatientsContent.jsx
import { useState, useEffect } from 'react';
import { usePatients } from '../../hooks/usePatients';
import AddPatientModal from '../modals/AddPatientModal';

export default function PatientsContent() {
  const { patients, loading, error, refetch } = usePatients();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPatients = patients?.filter(p => 
    p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (loading) return <LoadingScreen />;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patients</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          Add Patient
        </button>
      </div>
      
      <input
        type="text"
        placeholder="Search patients..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input-premium"
      />
      
      <div className="grid gap-4">
        {filteredPatients?.map(patient => (
          <div key={patient.id} className="card-premium p-4">
            {/* Patient card content */}
          </div>
        ))}
      </div>
      
      {showAddModal && (
        <AddPatientModal onClose={() => setShowAddModal(false)} onSuccess={refetch} />
      )}
    </div>
  );
}
```

### 3.4 Role-Based Navigation

```javascript
// src/components/layout/Sidebar.jsx
import { useUser } from '../../hooks/useUser';

const navigationConfig = {
  admin: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'tests', path: '/tests', icon: FileText },
    { section: 'pharmacy', path: '/pharmacy', icon: Pill },
    { section: 'inventory', path: '/inventory', icon: Package },
    { section: 'reports', path: '/reports', icon: BarChart },
    { section: 'messages', path: '/messages', icon: MessageSquare },
    { section: 'settings', path: '/settings', icon: Settings },
  ],
  doctor: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'tests', path: '/tests', icon: FileText },
    { section: 'prescriptions', path: '/prescriptions', icon: FileText },
    { section: 'case_notes', path: '/case-notes', icon: FileText },
    { section: 'cvf', path: '/cvf', icon: Scan },
    { section: 'messages', path: '/messages', icon: MessageSquare },
  ],
  assistant: [
    { section: 'overview', path: '/dashboard', icon: LayoutDashboard },
    { section: 'patients', path: '/patients', icon: Users },
    { section: 'tests', path: '/tests', icon: FileText },
    { section: 'pharmacy', path: '/pharmacy', icon: Pill },
    { section: 'inventory', path: '/inventory', icon: Package },
    { section: 'messages', path: '/messages', icon: MessageSquare },
  ],
};

export default function Sidebar() {
  const { user } = useUser();
  const navigation = navigationConfig[user?.role] || navigationConfig.assistant;
  
  return (
    <aside className="w-64 bg-white dark:bg-gray-800">
      <nav>
        {navigation.map(item => (
          <NavLink key={item.section} to={item.path}>
            <item.icon />
            {item.section}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

---

## 4. React Hooks

### 4.1 useUser Hook

```javascript
// src/hooks/useUser.js
import { useState, useEffect, useCallback } from 'react';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const login = useCallback(async (email, password) => {
    setLoading(true);
    const result = await window.electronAPI.login({ email, password });
    if (result.success) {
      setUser(result.user);
      sessionStorage.setItem('user', JSON.stringify(result.user));
    }
    setLoading(false);
    return result;
  }, []);
  
  const logout = useCallback(async () => {
    await window.electronAPI.logout();
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tokens');
  }, []);
  
  // Load user from session
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);
  
  return { user, loading, login, logout };
}
```

### 4.2 usePatients Hook

```javascript
// src/hooks/usePatients.js
import { useState, useEffect, useCallback } from 'react';
import { useServerEvents } from './useServerEvents';

export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { subscribe } = useServerEvents();
  
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getPatients();
      if (result.success) {
        setPatients(result.patients || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('patients', (data) => {
      if (data.action === 'create') {
        setPatients(prev => [data.record, ...prev]);
      } else if (data.action === 'update') {
        setPatients(prev => prev.map(p => 
          p.id === data.record.id ? data.record : p
        ));
      } else if (data.action === 'delete') {
        setPatients(prev => prev.filter(p => p.id !== data.id));
      }
    });
    return unsubscribe;
  }, [subscribe]);
  
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);
  
  return { patients, loading, error, refetch: fetchPatients };
}
```

### 4.3 useServerConnection Hook

```javascript
// src/hooks/useServerConnection.js
import { useState, useEffect, useCallback, useRef } from 'react';

export function useServerConnection() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const wsRef = useRef(null);
  
  const connect = useCallback(async (url) => {
    setConnecting(true);
    setServerUrl(url);
    
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        setConnected(true);
        setConnecting(false);
        // Send auth
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        wsRef.current.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          deviceName: 'KORENE PC'
        }));
      };
      
      wsRef.current.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };
      
      wsRef.current.onerror = () => {
        setConnecting(false);
      };
    } catch (err) {
      setConnecting(false);
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);
  
  // Ping/pong for keepalive
  useEffect(() => {
    if (!connected) return;
    
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [connected]);
  
  return { connected, connecting, serverUrl, connect, disconnect };
}
```

---

## 5. Service Layer

### 5.1 Service Pattern

```javascript
// src/services/patientService.js
export const patientService = {
  async getPatients(params = {}) {
    return window.electronAPI.getPatients(params);
  },
  
  async getPatientById(id) {
    return window.electronAPI.getPatientById(id);
  },
  
  async createPatient(data) {
    const patientData = {
      first_name: data.first_name,
      last_name: data.last_name,
      dob: data.dob,
      gender: data.gender,
      contact: data.contact,
      email: data.email,
      address: data.address,
      reason_for_visit: data.reason_for_visit,
      client_type: data.client_type,
      marital_status: data.marital_status,
    };
    return window.electronAPI.createPatient(patientData);
  },
  
  async updatePatient(id, data) {
    return window.electronAPI.updatePatient(id, data);
  },
  
  async deletePatient(id) {
    return window.electronAPI.deletePatient(id);
  },
  
  async searchPatients(searchTerm) {
    return window.electronAPI.searchPatients(searchTerm);
  },
};
```

---

## 6. State Management

### 6.1 Global State (Context API)

```javascript
// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');
  
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setSystemTheme(prefersDark ? 'dark' : 'light');
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## 7. Routing

### 7.1 Route Configuration

```javascript
// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  const user = JSON.parse(sessionStorage.getItem('user'));
  const isAuthenticated = !!user;
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!isAuthenticated ? <AuthApp /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <MainApp /> : <Navigate to="/auth" />} />
        <Route path="/patients" element={isAuthenticated ? <MainApp /> : <Navigate to="/auth" />} />
        {/* More routes */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 7.2 Protected Routes

```javascript
// Higher-order component for role-based access
function withRole(Component, allowedRoles) {
  return function ProtectedComponent(props) {
    const { user } = useUser();
    
    if (!allowedRoles.includes(user?.role)) {
      return <Navigate to="/dashboard" />;
    }
    
    return <Component {...props} />;
  };
}

// Usage
<Route path="/settings" element={withRole(SettingsContent, ['admin'])} />
```

---

## 8. Forms & Validation

### 8.1 Form Validation Pattern

```javascript
// Example form validation
function validatePatientForm(data) {
  const errors = {};
  
  if (!data.first_name?.trim()) {
    errors.first_name = 'First name is required';
  }
  
  if (!data.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email address';
  }
  
  if (data.contact && !/^\d{11}$/.test(data.contact.replace(/\D/g, ''))) {
    errors.contact = 'Invalid phone number';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

### 8.2 Modal with Form

```javascript
// src/components/modals/AddPatientModal.jsx
import { useState } from 'react';
import Modal from '../ui/Modal';

export default function AddPatientModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    contact: '',
    email: '',
    address: '',
    client_type: '',
    marital_status: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const validation = validatePatientForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    setLoading(true);
    const result = await window.electronAPI.createPatient(formData);
    setLoading(false);
    
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setErrors({ form: result.error });
    }
  };
  
  return (
    <Modal onClose={onClose} title="Add Patient">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="First Name"
          value={formData.first_name}
          onChange={(v) => setFormData({ ...formData, first_name: v })}
          error={errors.first_name}
        />
        <Input
          label="Last Name"
          value={formData.last_name}
          onChange={(v) => setFormData({ ...formData, last_name: v })}
          error={errors.last_name}
        />
        {/* More fields */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 9. UI Components

### 9.1 Button Component

```javascript
// src/components/ui/Button.jsx
export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading,
  disabled,
  ...props 
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger'
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`btn ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
```

### 9.2 Input Component

```javascript
// src/components/ui/Input.jsx
export default function Input({ 
  label, 
  error, 
  className = '',
  ...props 
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={`input-premium ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

### 9.3 Modal Component

```javascript
// src/components/ui/Modal.jsx
import { useEffect } from 'react';

export default function Modal({ onClose, title, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl ${sizes[size]} w-full mx-4 max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
```

---

## Appendix A: Hooks Quick Reference

| Hook | Purpose |
|------|---------|
| useUser | User authentication and session |
| usePatients | Patient CRUD operations |
| useTests | Test CRUD operations |
| usePrescriptions | Prescription management |
| usePharmacy | Pharmacy dispensing |
| useInventory | Inventory management |
| useVisits | Visit records |
| useCaseNotes | Doctor case notes |
| useReminders | Appointment reminders |
| useNotifications | User notifications |
| useMessages | Chat messaging |
| useServerConnection | Server mode connection |
| useServerEvents | WebSocket events |
| useIPC | IPC communication |
| useTheme | Theme management |

---

## Appendix B: Services Quick Reference

| Service | Purpose |
|---------|---------|
| patientService | Patient API calls |
| testService | Test/Results API |
| prescriptionService | Prescription API |
| pharmacyService | Pharmacy drugs API |
| inventoryService | Inventory API |
| visitService | Visit API |
| caseNoteService | Case note API |
| reminderService | Reminder API |
| reportService | Report generation |
| messageService | Chat API |

---

**End of Frontend Documentation**

*Last Updated: April 18, 2026*