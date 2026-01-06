import React, { useState } from 'react'
import PasswordInput from './PasswordInput'

const DoctorForm = ({ formData, onChange }) => {
  // const [formData, setFormData] = useState({
  //   firstName: '',
  //   lastName: '',
  //   email: '',
  //   phoneNumber: '',
  //   gender: '',
  //   specialization: '',
  //   licenseNumber: '',
  //   yearsOfExperience: '',
  //   password: '',
  //   confirmPassword: ''
  // })

  // const handleChange = (e) => {
  //   const { name, value } = e.target
  //   setFormData((prev) => ({ ...prev, [name]: value }))
  // }

  // const handleSubmit = (e) => {
  //   e.preventDefault()
  //   if (formData.password !== formData.confirmPassword) {
  //     alert('Passwords do not match')
  //     return
  //   }
  //   onSubmit(formData)
  // }

  return (
    <div
      className="flex flex-col space-y-6 w-full "
    >
      {/* First & Last Name */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 rounded-lg"
          required
        />
      </div>

      {/* Phone & Gender */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Gender</label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white"
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
