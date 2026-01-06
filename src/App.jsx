import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainApp from './components/MainApp';
import LoginScreen from './pages/auth/LoginScreen';
import SetupScreen from './pages/auth/SetupScreen';
import SignupScreen from './pages/auth/SignupScreen';
import LoadingScreen from './components/LoadingScreen';
import useUser from './hooks/useUser';

const App = () => {
  const { user, login, loading } = useUser();
  const navigate = useNavigate();

  console.log('App render - user:', user, 'loading:', loading);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <LoginScreen onLogin={login} onAddUser={() => navigate('/signup')} />
        }
      />
      <Route
        path="/signup"
        element={
          <SignupScreen
            onComplete={() => navigate('/')}
            onBack={() => navigate('/login')}
            onBackToWelcome={() => navigate('/login')}
          />
        }
      />
      <Route
        path="/setup"
        element={<SetupScreen onComplete={() => navigate('/')} />}
      />
      <Route
        path="/*"
        element={
          user ? <MainApp /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

export default App;
