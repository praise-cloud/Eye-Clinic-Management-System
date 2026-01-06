// Date formatters
export const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Name formatters
export const formatName = (firstName, lastName) => {
  return `${firstName || ''} ${lastName || ''}`.trim()
}

export const getInitials = (name) => {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Number formatters
export const formatAge = (birthDate) => {
  if (!birthDate) return ''
  const today = new Date()
  const birth = new Date(birthDate)
  const age = today.getFullYear() - birth.getFullYear()
  return age
}

// Status formatters
export const formatStatus = (status) => {
  return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase()
}