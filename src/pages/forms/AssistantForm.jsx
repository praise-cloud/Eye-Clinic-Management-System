import React, { useState } from 'react'

const AssistantForm = ({ formData, onChange }) => {
  // const [formData, setFormData] = useState({
  //   firstName: '',
  //   lastName: '',
  //   email: '',
  //   phoneNumber: '',
  //   gender: '',
  //   password: '',
  //   confirmPassword: ''
  // })

  // const handleChange = (e) => {
  //   const { name, value } = e.target
  //   setFormData((prev) => ({
  //     ...prev,
  //     [name]: value
  //   }))
  // }

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

    // Send data to parent
    // onSubmit(formData)
  }

  return (
    <div
      className="flex flex-col space-y-7 w-full"
    >

      {/* First & Last Name */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          value={formData.email}
          onChange={onChange}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            value={formData.phoneNumber}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Gender</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
      </div>

      {/* Submit */}
      {/* <button
        type="submit"
        className="w-full py-3 bg-primary-500 text-white font-semibold rounded-lg shadow hover:bg-primary-600 transition"
      >
        Register Assistant
      </button> */}
    </div>
  )
}

export default AssistantForm
