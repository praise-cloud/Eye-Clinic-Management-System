import React from 'react'
import PasswordInput from './PasswordInput'

const AdminForm = ({ formData, onChange }) => {
  return (
    <div className="space-y-6 w-full animate-premium-fade">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold"
            placeholder="Admin"
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
            placeholder="User"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">System Management Email</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="input-premium py-3 text-sm font-bold"
          placeholder="admin@clinic.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Number (Optional)</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold"
            placeholder="+251 ..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gender (Optional)</label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={onChange}
            className="input-premium py-3 text-sm font-bold appearance-none bg-no-repeat bg-[right_1rem_center]"
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
          label="Root Password"
          required
        />
        <PasswordInput
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onChange}
          label="Verify Password"
          required
        />
      </div>
    </div>
  )
}

export default AdminForm
