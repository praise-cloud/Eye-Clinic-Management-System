import React from 'react'
import PasswordInput from './PasswordInput'

const AdminForm = ({ formData, onChange }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 text-center">
        Admin Registration
      </h2>

      {/* First & Last Name */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      {/* Phone & Gender – Optional for Admin */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (Optional)</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender (Optional)</label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Permissions – Required for Admin */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Permissions (Required: Comma-separated, e.g., users,patients)</label>
        <input
          type="text"
          name="permissions"
          value={formData.permissions || ''}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="users,patients,reports"
          required
        />
      </div>

      {/* Passwords */}
      <div className="flex gap-4 w-full">
        <div className="w-1/2">
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={onChange}
            label="Password"
            required
          />
        </div>
        <div className="w-1/2">
          <PasswordInput
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onChange}
            label="Confirm Password"
            required
          />
        </div>
      </div>
    </div>
  )
}

export default AdminForm