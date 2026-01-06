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
    { value: 'low', label: 'Low Priority' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ]

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const usersData = await window.api.getUsers()
      // Filter out current user from recipients
      const filteredUsers = usersData.filter(user => user.id !== currentUser.id)
      setUsers(filteredUsers)
    } catch (err) {
      setError('Failed to load users')
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
      attachments: files
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
      // Validate required fields
      if (!formData.recipientId || !formData.subject || !formData.message) {
        throw new Error('Recipient, subject, and message are required')
      }

      // Create FormData for file uploads if any
      const messageData = new FormData()
      messageData.append('recipientId', formData.recipientId)
      messageData.append('subject', formData.subject)
      messageData.append('message', formData.message)
      messageData.append('priority', formData.priority)
      messageData.append('senderId', currentUser.id)
      messageData.append('sentAt', new Date().toISOString())

      // Add attachments
      formData.attachments.forEach((file, index) => {
        messageData.append(`attachment_${index}`, file)
      })

      // Send message via API
      await window.api.sendMessage(messageData)

      // Close modal on success
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="modal-overlay dark:bg-opacity-70">
      <div className="modal-content large dark:bg-gray-800">
        <div className="modal-header dark:border-gray-700">
          <h2 className="dark:text-gray-100">New Message</h2>
          <button className="close-btn dark:text-gray-400 dark:hover:text-gray-200" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message dark:bg-red-900 dark:text-red-200 dark:border-red-700">{error}</div>}
          
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="recipientId" className="dark:text-gray-300">To *</label>
              <select
                id="recipientId"
                name="recipientId"
                value={formData.recipientId}
                onChange={handleInputChange}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select recipient</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group flex-1">
              <label htmlFor="priority" className="dark:text-gray-300">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {priorityLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject" className="dark:text-gray-300">Subject *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter message subject"
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message" className="dark:text-gray-300">Message *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows="8"
              placeholder="Type your message here..."
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="form-group">
            <label htmlFor="attachments" className="dark:text-gray-300">Attachments</label>
            <input
              type="file"
              id="attachments"
              name="attachments"
              onChange={handleFileChange}
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              className="dark:text-gray-300"
            />
            <small className="form-help dark:text-gray-400">
              Max 10MB per file. Accepted formats: PDF, DOC, DOCX, JPG, PNG, TXT
            </small>
            
            {formData.attachments.length > 0 && (
              <div className="attachments-list dark:bg-gray-700 dark:border-gray-600">
                <h4 className="dark:text-gray-200">Selected Files:</h4>
                {formData.attachments.map((file, index) => (
                  <div key={index} className="attachment-item dark:bg-gray-600 dark:border-gray-500">
                    <span className="attachment-name dark:text-gray-200">{file.name}</span>
                    <span className="attachment-size dark:text-gray-400">({formatFileSize(file.size)})</span>
                    <button 
                      type="button" 
                      className="remove-attachment dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => removeAttachment(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewMessageModal