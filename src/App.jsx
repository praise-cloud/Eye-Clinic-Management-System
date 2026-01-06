import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainApp from './components/MainApp';
import LoginScreen from './pages/auth/LoginScreen';
import SetupScreen from './pages/auth/SetupScreen';
import SignupScreen from './pages/auth/SignupScreen';
import WelcomeScreen from './pages/auth/WelcomeScreen';
import LoadingScreen from './components/LoadingScreen';
import useUser from './hooks/useUser';

const App = () => {
  const { user, login, createUser, loading } = useUser();
  const navigate = useNavigate();
  const [isFirstRun, setIsFirstRun] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Check if this is first run
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const response = await window.electronAPI?.isFirstRun();
        setIsFirstRun(response?.success ? response.isFirstRun : true);
      } catch (error) {
        console.error('Error checking first run:', error);
        setIsFirstRun(true);
      }
    };
    checkFirstRun();
  }, []);

  console.log('App render - user:', user, 'loading:', loading, 'isFirstRun:', isFirstRun);

  if (loading || isFirstRun === null) {
    return <LoadingScreen />;
  }

  const handleSetupComplete = async (clinicData, adminData) => {
    try {
      adminData.role = selectedRole;
      const result = await window.electronAPI.completeSetup(clinicData, adminData);
      if (result?.success) {
        // User will be set by useUser hook automatically
        navigate('/');
      } else {
        throw new Error(result?.error || 'Setup failed');
      }
    } catch (error) {
      console.error('Setup error:', error);
      alert(error.message || 'Setup failed. Please try again.');
    }
  };

  const handleUserCreation = async (clinicData, adminData) => {
    try {
      const userData = {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: adminData.password,
        role: selectedRole?.toLowerCase().replace('clinic assistant', 'assistant'),
        phoneNumber: adminData.phoneNumber || null,
        gender: adminData.gender || 'other'
      };
      
      await createUser(userData);
      setSelectedRole(null);
      setIsAddingUser(false);
      navigate('/');
    } catch (error) {
      console.error('User creation error:', error);
      alert(error.message || 'Failed to create user. Please try again.');
    }
  };

  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          user ? <Navigate to="/" replace /> : <WelcomeScreen onGetStarted={() => navigate('/setup')} />
        }
      />
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : 
          <LoginScreen 
            onLogin={login} 
            onAddUser={() => {
              setIsAddingUser(true);
              navigate('/setup');
            }} 
          />
        }
      />
      <Route
        path="/setup"
        element={
          user ? <Navigate to="/" replace /> : 
          !selectedRole ? 
            <SetupScreen 
              onSelectRole={(role) => setSelectedRole(role)}
              onBack={() => navigate(isAddingUser ? '/login' : '/welcome')}
            /> :
            <SignupScreen
              selectedRole={selectedRole}
              onComplete={isAddingUser ? handleUserCreation : handleSetupComplete}
              onBack={() => setSelectedRole(null)}
              onBackToWelcome={() => {
                setSelectedRole(null);
                setIsAddingUser(false);
                navigate('/login');
              }}
            />
        }
      />
      <Route
        path="/*"
        element={
          user ? <MainApp /> : 
          <Navigate to={isFirstRun ? "/welcome" : "/login"} replace />
        }
      />
    </Routes>
  );
};

export default App;
