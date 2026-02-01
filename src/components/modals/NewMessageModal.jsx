import React, { useState, useEffect } from 'react'

const NewMessageModal = ({ onClose, currentUser }) => {
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    recipientId: '',
    subject: '',
    message: '',
    priority: 'normal',
    attachments: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const priorityLevels = [
    { value: 'low', label: 'Routine', color: 'slate' },
    { value: 'normal', label: 'Standard', color: 'indigo' },
    { value: 'high', label: 'High Priority', color: 'amber' },
    { value: 'urgent', label: 'Critical / Urgent', color: 'rose' }
  ]

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      if (window.electronAPI?.getAllUsersDetailed) {
        const usersData = await window.electronAPI.getAllUsersDetailed()
        const filteredUsers = usersData.filter(user => user.id !== currentUser?.id)
        setUsers(filteredUsers)
      } else {
        // Fallback for dev if not in electron
        setUsers([
          { id: 1, first_name: 'Dr.', last_name: 'Smith', role: 'doctor' },
          { id: 2, first_name: 'Nurse', last_name: 'Joy', role: 'assistant' }
        ])
      }
    } catch (err) {
      setError('Failed to load clinical staff directory')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }))
  }

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.recipientId || !formData.subject || !formData.message) {
        throw new Error('All primary fields are required for clinical communication')
      }

      // In real app, we'd use FormData if sending true files, but for simplicity of this POC/Desktop app:
      const messagePayload = {
        recipient_id: formData.recipientId,
        subject: formData.subject,
        content: formData.message,
        priority: formData.priority,
        sender_id: currentUser?.id,
        created_at: new Date().toISOString()
      }

      if (window.electronAPI?.sendMessage) {
        await window.electronAPI.sendMessage(messagePayload)
      } else {
        // Mock success
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      onClose()
    } catch (err) {
      setError(err.message || 'Transmission failure')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
      <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Communication</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Secure internal messaging system</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-6 h-6 text-slate-400 group-hover:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
              <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* Addressing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Recipient *</label>
                <select
                  name="recipientId"
                  value={formData.recipientId}
                  onChange={handleInputChange}
                  required
                  className="input-premium appearance-none"
                >
                  <option value="">Choose contact...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} — {user.role?.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Priority Protocol</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="input-premium appearance-none"
                >
                  {priorityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message Subject *</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Brief summary of communication..."
                required
                className="input-premium"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Content / Instructions *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows="6"
                placeholder="Type your secure clinical message here..."
                required
                className="input-premium resize-none"
              />
            </div>

            {/* Attachments Area */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Diagnostic Attachments</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer group">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-3 group-hover:border-indigo-500 transition-colors">
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Select Files</span>
                    <input type="file" onChange={handleFileChange} multiple className="hidden" />
                  </div>
                </label>
              </div>

              {formData.attachments.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg animate-premium-fade">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded text-indigo-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{file.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-black">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Transmitting...</span>
              </div>
            ) : (
              'Send Clinical Message'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewMessageModal
