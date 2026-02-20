import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../src/hooks/useUser', () => ({
  __esModule: true,
  default: () => ({
    user: { id: 1, first_name: 'Admin', last_name: 'User', role: 'admin' },
    logout: jest.fn()
  })
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn()
  })
}));

jest.mock('../src/context/SystemConfigContext', () => ({
  useSystemConfig: () => ({
    config: {
      clinicName: 'Test Clinic',
      clinicEmail: 'clinic@test.com',
      clinicPhone: '000',
      clinicAddress: 'Address',
      appointmentDuration: 30,
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00'
    },
    toggleConfig: jest.fn(),
    updateMultipleConfig: jest.fn()
  })
}));

jest.mock('../src/services/patientService', () => ({
  getAllPatients: jest.fn().mockResolvedValue([])
}));
jest.mock('../src/services/inventoryService', () => ({
  getInventoryItems: jest.fn().mockResolvedValue([])
}));
jest.mock('../src/services/testService', () => ({
  getAllTests: jest.fn().mockResolvedValue([])
}));

jest.mock('../src/components/content/MessagesContent', () => ({
  __esModule: true,
  default: () => <div>Messages Content Stub</div>
}));

jest.mock('../src/components/DynamicTableView', () => ({
  __esModule: true,
  default: () => <div>Dynamic Table Stub</div>
}));

jest.mock('../src/components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children, onSectionClick }) => (
    <div>
      <button onClick={() => onSectionClick('messages')}>Open Messages</button>
      <button onClick={() => onSectionClick('doctor-case-studies')}>Open Case Studies</button>
      {children}
    </div>
  )
}));

import AdminDashboard from '../src/pages/dashboard/AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI = {
      getActivityStatistics: jest.fn().mockResolvedValue({ success: true, stats: {} }),
      getActivityLogs: jest.fn().mockResolvedValue({ success: true, logs: [] }),
      getAllUsersDetailed: jest.fn().mockResolvedValue({ success: true, users: [] }),
      onIpcEvent: jest.fn().mockImplementation(() => () => {}),
      getNetworkDbPath: jest.fn().mockResolvedValue({ success: true, path: 'C:\\clinic\\db.sqlite' }),
      getDoctorCaseStudies: jest.fn().mockResolvedValue({
        success: true,
        data: [
          {
            case_id: 1,
            patient_name: 'Patient One',
            doctor_name: 'Dr Smith',
            diagnosis: 'Cataract',
            treatment_date: '2026-02-15',
            next_visit_date: '2026-03-01'
          }
        ],
        total: 1,
        doctors: ['Dr Smith']
      })
    };
  });

  it('shows messages section and dedicated doctor case studies page', async () => {
    render(<AdminDashboard />);

    await userEvent.click(screen.getByText('Open Messages'));
    expect(screen.getByText('Messages Content Stub')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Open Case Studies'));
    await waitFor(() => {
      expect(screen.getByText('Doctor Case Studies')).toBeInTheDocument();
      expect(screen.getByText('Patient One')).toBeInTheDocument();
    });
  });
});
