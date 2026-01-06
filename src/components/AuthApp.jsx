import React, { useState, useEffect } from 'react'
<<<<<<< HEAD
import WelcomeScreen from '../pages/auth/WelcomeScreen'
import SetupScreen from '../pages/auth/SetupScreen'
import LoginScreen from '../pages/auth/LoginScreen'
import LoadingScreen from './LoadingScreen'
import SignupScreen from '../pages/auth/SignupScreen'
=======
import WelcomeScreen from '../pages/WelcomeScreen'
import SetupScreen from '../pages/SetupScreen'
import LoginScreen from '../pages/LoginScreen'
import LoadingScreen from './LoadingScreen'
import SignupScreen from '../pages/SignupScreen'  // Fixed typo: SigupScreen → SignupScreen
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9

const AuthApp = () => {
  const [currentScreen, setCurrentScreen] = useState('loading')
  const [isFirstRun, setIsFirstRun] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [selectedRole, setSelectedRole] = useState(null)
  const [isAddingUser, setIsAddingUser] = useState(false)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      setLoadingMessage('Checking system status...')

      // Check if this is first run
      console.log('Calling IPC isFirstRun...');  // Debug: Start of call
      const response = await window.electronAPI?.isFirstRun();
      console.log('IPC response:', response);  // Debug: Full response object

      if (!response || !response.success) {
        console.warn('IPC failed or no success—falling back to setup');  // Debug: Why fallback?
        throw new Error(response?.error || 'IPC call failed');
      }

      const firstRun = response.isFirstRun;  // Direct extract—no || true here
      console.log('Extracted firstRun:', firstRun);  // Debug: Boolean value
      setIsFirstRun(firstRun);

      setTimeout(() => {
        setLoading(false)
        if (firstRun) {
          console.log('Setting screen to welcome (firstRun true)');  // Debug
          setCurrentScreen('welcome')
        } else {
          console.log('Setting screen to login (data exists)');  // Debug
          setCurrentScreen('login')
        }
      }, 1500)

    } catch (error) {
      console.error('Error initializing app:', error)  // Will log full error
      setLoading(false)
      console.log('Fallback to welcome due to error');  // Debug
      setCurrentScreen('welcome') // Fallback to welcome
    }
  }

  const handleScreenChange = (screen, message = 'Loading...') => {
    if (screen === 'loading') {
      setLoadingMessage(message)
      setLoading(true)
      setCurrentScreen('loading')
    } else {
      setLoading(false)
      setCurrentScreen(screen)
    }
  }

  const handleSetupComplete = async (clinicData, adminData) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    // Add the selected role to adminData
    adminData.role = selectedRole;

    try {
      handleScreenChange('loading', 'Setting up your clinic...')

      const result = await window.electronAPI.completeSetup(clinicData, adminData);

      if (result?.success) {
<<<<<<< HEAD
        setLoadingMessage('Setup completed successfully! Opening dashboard...')
        localStorage.setItem('currentUser', JSON.stringify(result.user)) // Store user
        await window.electronAPI?.openMainWindow() // Open main window directly
=======
        setLoadingMessage('Setup completed successfully!')
        // Store user in localStorage for the main app
        localStorage.setItem('currentUser', JSON.stringify(result.user))
        // Open main window
        setTimeout(() => {
          window.electronAPI?.openMainWindow()
        }, 500)
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
      } else {
        throw new Error(result?.error || 'Setup failed')
      }
    } catch (error) {
      console.error('Setup error:', error)
      alert(error.message || 'Setup failed. Please try again.')
      setCurrentScreen('setup')
    }
  }

  const handleLogin = async (credentials) => {
    try {
      setLoading(true)
      setLoadingMessage('Signing you in...')
      setCurrentScreen('loading')

      const result = await window.electronAPI.login(credentials.email, credentials.password)

      if (result?.success) {
        setLoadingMessage('Login successful! Opening dashboard...')
        // Set user in localStorage for the main app
        localStorage.setItem('currentUser', JSON.stringify(result.user))
        await window.electronAPI.openMainWindow()
      } else {
        setLoading(false)
        setCurrentScreen('login')
        alert(result?.error || 'Login failed')
      }
    } catch (error) {
      setLoading(false)
      setCurrentScreen('login')
      alert('Login failed: ' + error.message)
    }
  }

  const handleAddUser = () => {
    setIsAddingUser(true)
    setCurrentScreen('setup')
  }

  const handleAddUserComplete = async (clinicData, adminData) => {
    try {
      handleScreenChange('loading', 'Creating new user...')

<<<<<<< HEAD
      // Normalize role to lowercase for database
      let dbRole = selectedRole.toLowerCase().trim()
      if (dbRole === 'clinic assistant') {
        dbRole = 'assistant'
      }

      const userData = {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: adminData.password,
        role: dbRole,
        phoneNumber: adminData.phoneNumber || null,
        gender: adminData.gender || 'other'
      }

      console.log('Creating user with data:', userData)
      const result = await window.electronAPI.createUser(userData)
      console.log('Create user result:', result)

      if (result?.success) {
        setLoadingMessage('User created successfully! Opening dashboard...')
        localStorage.setItem('currentUser', JSON.stringify(result.user)) // Store user
        await window.electronAPI?.openMainWindow() // Open main window directly
=======
      const result = await window.electronAPI.createUser({ role: selectedRole, ...adminData })

      if (result?.success) {
        setLoadingMessage('User created successfully!')
        setTimeout(() => {
          setIsAddingUser(false)
          setSelectedRole(null)
          setCurrentScreen('login')
          alert('User created successfully! They can now log in.')
        }, 1000)
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
      } else {
        throw new Error(result?.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Add user error:', error)
<<<<<<< HEAD
      const errorMessage = error?.message || error?.error || 'Failed to create user. Please try again.'
      alert(errorMessage)
=======
      alert(error.message || 'Failed to create user. Please try again.')
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
      setCurrentScreen('setup')
    }
  }

  if (loading) {
    return <LoadingScreen message={loadingMessage} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {currentScreen === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setCurrentScreen('setup')} />
      )}

      {/* Role Selection and Signup Flow */}
      {currentScreen === 'setup' && !selectedRole && (
        <SetupScreen
          onSelectRole={(role) => setSelectedRole(role)}
          onBack={() => {
            setIsAddingUser(false)
            setCurrentScreen(isAddingUser ? 'login' : 'welcome')
          }}
        />
      )}

      {currentScreen === 'setup' && selectedRole && (
        <SignupScreen
          selectedRole={selectedRole}
          onComplete={isAddingUser ? handleAddUserComplete : handleSetupComplete}
          onBack={() => setSelectedRole(null)}
          onBackToWelcome={() => {
            console.log('onBackToWelcome called - navigating to login screen');
            setSelectedRole(null)
            setIsAddingUser(false)
            setCurrentScreen('login')
            console.log('Current screen set to: login');
          }}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onLogin={handleLogin}
          onAddUser={handleAddUser}
        />
      )}
    </div>
  )
}

<<<<<<< HEAD
export default AuthApp
=======
export default AuthApp
>>>>>>> d7adb94f093a3e0b1314671557a7ee3c3ed7e9e9
