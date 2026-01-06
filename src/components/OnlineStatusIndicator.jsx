import React, { useState, useEffect } from 'react'

const OnlineStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await window.electronAPI?.checkOnlineStatus()
        setIsOnline(result?.isOnline || false)
      } catch {
        setIsOnline(false)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-gray-600 dark:text-gray-400">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

export default OnlineStatusIndicator
