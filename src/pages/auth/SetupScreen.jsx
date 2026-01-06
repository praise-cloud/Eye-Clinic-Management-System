import React from 'react';
import { ArrowLeftIcon } from '../../components/Icons';
import logo from '../../assets/images/logo.png';

const SetupScreen = ({ onSelectRole, onBack }) => {
  const roles = [
    { id: 'doctor', name: 'Doctor', description: 'Medical practitioner with full access' },
    { id: 'assistant', name: 'Clinic Assistant', description: 'Administrative and patient care support' },
    { id: 'admin', name: 'Admin', description: 'System administrator with management access' }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="mb-6">
            <img src={logo} alt="Clinic Logo" className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Role</h1>
          <p className="text-gray-600 dark:text-gray-400">Select the role for the new team member</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 animate-fade-in">
          <div className="grid gap-4">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.name)}
                className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{role.name}</h3>
                <p className="text-gray-600 dark:text-gray-400">{role.description}</p>
              </button>
            ))}
          </div>

          {onBack && (
            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center mx-auto text-sm font-medium"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Welcome
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
