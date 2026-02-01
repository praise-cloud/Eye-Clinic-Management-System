import React, { useState } from 'react'
import PasswordInput from './PasswordInput'

const AssistantForm = ({ formData, onChange }) => {
  const handleSubmit = (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.firstName || !formData.lastName) {
      alert('First and Last Name are required')
      return
    }
    if (!formData.email.includes('@')) {
      alert('Please enter a valid email')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }
  }

  return (
    <div className="space-y-6 w-full animate-premium-fade">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Professional First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold"
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Legal Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Professional Email Address</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="input-premium py-3 text-sm font-bold"
          placeholder="assistant@clinic.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold"
            placeholder="+251 ..."
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gender</label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold appearance-none bg-no-repeat bg-[right_1rem_center]"
            required
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PasswordInput
          name="password"
          value={formData.password}
          onChange={onChange}
          label="Access Password"
          required
        />
        <PasswordInput
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onChange}
          label="Confirm Password"
          required
        />
      </div>
    </div>
  )
}

export default AssistantForm