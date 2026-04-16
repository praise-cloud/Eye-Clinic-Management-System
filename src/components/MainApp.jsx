import React, { useState, useRef } from '\''react'\''
import { Routes, Route, useNavigate, useLocation, Navigate } from '\''react-router-dom'\''
import Layout from '\''./layout/Layout'\''
import DashboardContent from '\''./content/DashboardContent'\''
import MessagesContent from '\''./content/MessagesContent'\''
import PatientsContent from '\''./content/PatientsContent'\''
import TestsContent from '\''./content/TestsContent'\''
import ReportsContent from '\''./content/ReportsContent'\''
import InventoryContent from '\''./content/InventoryContent'\''
import PharmacyContent from '\''./content/PharmacyContent'\''
import SettingsContent from '\''./content/SettingsContent'\''
import AddPatientModal from '\''./modals/AddPatientModal'\''
import UploadTestModal from '\''./modals/UploadTestModal'\''
import GenerateReportModal from '\''./modals/GenerateReportModal'\''
import NewMessageModal from '\''./modals/NewMessageModal'\''
import useUser from '\''../hooks/useUser'\''
import useKeyboardShortcuts from '\''../hooks/useKeyboardShortcuts'\''
import DoctorsDashboard from '\''../pages/dashboard/DoctorsDashboard'\''
import AssistantDashboardScreen from '\''../pages/dashboard/AssistantDashboardScreen'\''
import AdminDashboard from '\''../pages/dashboard/AdminDashboard'\''
import CreateInventoryItemScreen from '\''../pages/CreateInventoryItemScreen'\''
import ViewInventoryItemScreen from '\''../pages/ViewInventoryItemScreen'\''
import PatientDetailsPage from '\''../pages/PatientDetailsPage'\''
import PatientProfilePage from '\''../pages/PatientProfilePage'\''
import CaseNotesPage from '\''../pages/CaseNotesPage'\''
import CaseNoteEditorPage from '\''../pages/CaseNoteEditorPage'\''
import RemindersPage from '\''../pages/RemindersPage'\''
import DispenseModal from '\''./modals/DispenseModal'\''
import logger from '\''../utils/logger'\''

const MainApp = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('\'''\'');
  const [modals, setModals] = useState({
    addPatient: false,
    uploadTest: false,
    generateReport: false,
    newMessage: false
  });
  const [dispensePrescriptionId, setDispensePrescriptionId] = useState(null);

  const patientsContentRef = useRef(null);

  const getActiveSection = () => {
    const path = location.pathname;
    if (path.startsWith('\''/inventory'\'')) return '\''inventory'\'';
    if (path.startsWith('\''/pharmacy'\'')) return '\''pharmacy'\'';
    if (path.startsWith('\''/patients'\'')) return '\''patients'\'';
    if (path.startsWith('\''/messages'\'')) return '\''messages'\'';
    if (path.startsWith('\''/tests'\'')) return '\''tests'\'';
    if (path.startsWith('\''/case-notes'\'')) return '\''case-notes'\'';
    if (path.startsWith('\''/reminders'\'')) return '\''reminders'\'';
    if (path.startsWith('\''/reports'\'')) return '\''reports'\'';
    if (path.startsWith('\''/settings'\'')) return '\''settings'\'';
    return '\''dashboard'\'';
  };

  const activeSection = getActiveSection();

  useKeyboardShortcuts([
    {
      key: '\''l'\'',
      ctrlKey: true,
      shiftKey: true,
      callback: async () => {
        if (window.confirm('\''Are you sure you want to logout?'\'')) {
          try {
            await logout();
          } catch (error) {
            logger.error('\''Logout failed'\'', error);
            alert('\''Failed to logout. Please try again.'\'');
          }
        }
      }
    }
  ]);

  const handleSectionClick = (section) => {
    setSearchTerm('\'''\'');
    navigate(`/${section === '\''dashboard'\'' ? '\'''\'' : section}`);
  };

  const handleActionClick = (type, data) => {
    if (type === '\''dispense'\'') {
      setDispensePrescriptionId(data);
      return;
    }

    if (activeSection === '\''tests'\'' && user?.role !== '\''doctor'\'') {
      alert('\''Only doctors can create test results.'\'');
      return;
    }

    const modalMap = {
      patients: '\''addPatient'\'',
      tests: '\''uploadTest'\'',
      reports: '\''generateReport'\'',
      messages: '\''newMessage'\''
    };
    const modalKey = modalMap[activeSection];
    if (modalKey) {
      setModals((prev) => ({ ...prev, [modalKey]: true }));
    }
  };

  const closeModal = (modalKey) => {
    setModals((prev) => ({ ...prev, [modalKey]: false }));
  };

  const handlePatientAdded = () => {
    logger.debug('\''Patient added, triggering refresh'\'');
    if (patientsContentRef.current?.refreshPatients) {
      logger.debug('\''Calling refreshPatients via ref'\'');
      patientsContentRef.current.refreshPatients();
    } else {
      logger.debug('\''refreshPatients not available, using event fallback'\'');
    }
    window.dispatchEvent(new CustomEvent('\''patientAdded'\''));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('\''Logout failed'\'', error);
      alert('\''Failed to logout. Please try again.'\'');
    }
  };

  const renderContent = () => {
    if (!user) {
      return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Loading...</div>;
    }

    return (
      <Routes>
        <Route
          path="/"
          element={
            user?.role === '\''doctor'\''
              ? <DoctorsDashboard activeSection={activeSection} />
              : user?.role === '\''assistant'\''
                ? <AssistantDashboardScreen />
                : <DashboardContent />
          }
        />
        <Route path="/messages" element={<MessagesContent />} />
        <Route path="/case-notes" element={<CaseNotesPage />} />
        <Route path="/patients" element={<PatientsContent searchTerm={searchTerm} ref={patientsContentRef} />} />
        <Route path="/tests" element={<TestsContent />} />
        <Route path="/reports" element={<ReportsContent />} />
        <Route path="/inventory" element={<InventoryContent />} />
        <Route path="/inventory/create" element={<CreateInventoryItemScreen />} />
        <Route path="/inventory/edit/:id" element={<CreateInventoryItemScreen />} />
        <Route path="/inventory/view/:id" element={<ViewInventoryItemScreen />} />
        <Route path="/pharmacy" element={user?.role === '\''assistant'\'' ? <PharmacyContent /> : <Navigate to="/" replace />} />
        <Route path="/reminders" element={user?.role === '\''assistant'\'' ? <RemindersPage /> : <Navigate to="/" replace />} />
        <Route path="/patients/:id" element={<PatientDetailsPage />} />
        <Route path="/patient-profile/:id" element={<PatientProfilePage />} />
        <Route path="/case-note/new" element={<CaseNoteEditorPage />} />
        <Route path="/case-note/edit/:id" element={<CaseNoteEditorPage />} />
        <Route path="/settings" element={<SettingsContent />} />
      </Routes>
    );
  };

  if (user?.role === '\''admin'\'') {
    return <AdminDashboard />;
  }

  return (
    <>
      <Layout
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onActionClick={handleActionClick}
      >
        {renderContent()}
      </Layout>

      {modals.addPatient && <AddPatientModal onClose={() => closeModal('\''addPatient'\'')} onPatientAdded={handlePatientAdded} />}
      {modals.uploadTest && <UploadTestModal onClose={() => closeModal('\''uploadTest'\'')} currentUser={user} />}
      {modals.generateReport && <GenerateReportModal onClose={() => closeModal('\''generateReport'\'')} />}
      {modals.newMessage && <NewMessageModal onClose={() => closeModal('\''newMessage'\'')} />}

      {dispensePrescriptionId && (
        <DispenseModal
          prescriptionId={dispensePrescriptionId}
          onClose={() => setDispensePrescriptionId(null)}
          onDispensed={() => {
          }}
        />
      )}
    </>
  );
}

export default MainApp
