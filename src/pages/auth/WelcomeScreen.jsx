import React, { useState } from 'react'
import { UsersIcon, ChartIcon, DocumentIcon, ChatIcon, ArrowRightIcon, WifiIcon } from '../../components/Icons'
import logo from '../../assets/images/logo.png'
import useServerConnection from '../../hooks/useServerConnection'

const WelcomeScreen = ({ onGetStarted }) => {
  const [showServerSetup, setShowServerSetup] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const { connect } = useServerConnection()

  const features = [
    {
      icon: <UsersIcon className="w-8 h-8 text-blue-600" />,
      title: 'Patient Management',
      description: 'Comprehensive patient records and history'
    },
    {
      icon: <ChartIcon className="w-8 h-8 text-green-600" />,
      title: 'Visual Field Tests',
      description: 'Advanced test analysis and tracking'
    },
    {
      icon: <DocumentIcon className="w-8 h-8 text-purple-600" />,
      title: 'Reports & Analytics',
      description: 'Detailed insights and PDF reports'
    },
    {
      icon: <ChatIcon className="w-8 h-8 text-orange-600" />,
      title: 'Team Communication',
      description: 'Secure doctor-assistant messaging'
    }
  ]

  const handleTestConnection = async () => {
    if (!serverUrl) return
    setTesting(true)
    setTestResult(null)
    try {
      const url = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`
      const res = await fetch(`${url}/api/health`)
      if (res.ok) {
        setTestResult({ success: true, message: 'Connected!' })
        // Save the URL
        localStorage.setItem('serverUrl', url)
      } else {
        setTestResult({ success: false, error: 'Server not responding' })
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message })
    }
    setTesting(false)
  }

  if (showServerSetup) {
    return (
      <div className="relative flex items-center justify-center min-h-screen p-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-lg">
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowServerSetup(false)} className="text-slate-500 hover:text-slate-700">
                <ArrowRightIcon className="w-5 h-5 rotate-180" />
              </button>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Connect to Server</h2>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Enter the server IP address/URL to connect to your clinic's server. 
              Leave empty if running this app as the server.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="e.g., 192.168.1.100:3001"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testing || !serverUrl}
                  className="flex-1 btn btn-secondary"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('serverUrl')
                    onGetStarted()
                  }}
                  className="flex-1 btn btn-primary"
                >
                  Continue (Local)
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg ${testResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {testResult.success ? testResult.message : testResult.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen p-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-logo-pattern opacity-[0.02] dark:opacity-[0.05]" />
      </div>

      {/* Foreground content */}
      <div className="relative w-full max-w-5xl z-10">
        <div className="text-center mb-16 animate-premium-fade">
          <div className="mb-10 relative inline-block">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <img src={logo} alt="Clinic Logo" className="w-32 h-32 mx-auto relative z-10 drop-shadow-2xl" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
            Korenye Eye Clinic <br />
            <span className="text-gradient">Management Suite</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium mb-12 max-w-3xl mx-auto leading-relaxed">
            State-of-the-art visual field diagnostics and clinical operations.
            Streamline patient care with our professional medical management architecture.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto btn btn-primary px-8 py-4 text-base font-black tracking-widest uppercase shadow-2xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 group"
            >
              <span>Initialize System</span>
              <ArrowRightIcon className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setShowServerSetup(true)}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                <WifiIcon className="w-5 h-5" />
                Connect to Server
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl mt-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Enterprise v2.4.0 <span className="text-slate-300 dark:text-slate-700 mx-2">|</span> Stable</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-premium p-8 group animate-premium-fade"
              style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}
            >
              <div className="flex flex-col items-start">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {React.cloneElement(feature.icon, { className: 'w-7 h-7 text-indigo-600' })}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">{feature.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center animate-premium-fade" style={{ animationDelay: '0.8s' }}>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
            Certified Medical Software Infrastructure
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen