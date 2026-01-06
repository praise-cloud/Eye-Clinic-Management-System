import React, { useState } from 'react'
import PasswordInput from './PasswordInput'

const DoctorForm = ({ formData, onChange }) => {
  return (
    <div className="flex flex-col space-y-6 w-full">
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

      {/* Phone & Gender */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
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

export default DoctorForm