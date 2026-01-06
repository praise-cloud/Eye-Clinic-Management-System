import React from 'react';
import useUser from '../hooks/useUser';

const LogoutTest = () => {
  const { user, logout, loading } = useUser();

  const handleTestLogout = async () => {
    console.log('Testing logout...');
    console.log('Current user:', user);
    
    try {
      await logout();
      console.log('Logout completed');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h3 className="font-bold">Logout Test Component</h3>
      <p>Current user: {user ? user.name || user.email : 'No user'}</p>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <button 
        onClick={handleTestLogout}
        disabled={loading}
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
      >
        {loading ? 'Logging out...' : 'Test Logout'}
      </button>
    </div>
  );
};

export default LogoutTest;