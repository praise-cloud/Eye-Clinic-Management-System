import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const ViewInventoryItemScreen = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItem()
  }, [id])

  const loadItem = async () => {
    try {
      const result = await window.electron.invoke('inventory:getById', parseInt(id))
      if (result.success) {
        setItem(result.item)
      }
    } catch (error) {
      console.error('Error loading item:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      const result = await window.electron.invoke('inventory:delete', parseInt(id))
      if (result.success) {
        navigate('/inventory')
      } else {
        alert(result.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
          <p className="text-xl text-gray-700">Item not found</p>
          <button
            onClick={() => navigate('/inventory')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    )
  }

  const getStockStatusColor = () => {
    if (item.current_quantity <= item.minimum_quantity) return 'text-red-600 bg-red-100'
    if (item.current_quantity <= item.minimum_quantity * 1.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Item Details</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Inventory
            </button>
            <button
              onClick={() => navigate(`/inventory/edit/${id}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <i className="fas fa-edit"></i>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <i className="fas fa-trash"></i>
              Delete
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Image */}
            <div className="lg:col-span-1">
              {item.image_path ? (
                <img
                  src={item.image_path.startsWith('data:') ? item.image_path : `file://${item.image_path}`}
                  alt={item.item_name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <i className="fas fa-box text-6xl text-gray-400 dark:text-gray-500"></i>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Unit Cost</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ₦{parseFloat(item.unit_cost || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₦{(parseFloat(item.unit_cost || 0) * parseInt(item.current_quantity || 0)).toLocaleString()}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${getStockStatusColor()}`}>
                  <p className="text-xs mb-1">Stock Status</p>
                  <p className="text-lg font-bold">
                    {item.current_quantity <= item.minimum_quantity ? 'Low Stock' : 'In Stock'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{item.item_name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code: {item.item_code}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{item.status}</p>
                </div>
              </div>

              {item.description && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Quantity</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.current_quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum Quantity</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.minimum_quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum Quantity</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.maximum_quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unit of Measure</p>
                  <p className="text-sm text-gray-900 dark:text-white">{item.unit_of_measure}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</p>
                  <p className="text-sm text-gray-900 dark:text-white">{item.location || 'N/A'}</p>
                </div>
              </div>

              {(item.manufacturer || item.model_number || item.serial_number) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Product Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {item.manufacturer && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Manufacturer</p>
                        <p className="text-sm text-gray-900 dark:text-white">{item.manufacturer}</p>
                      </div>
                    )}
                    {item.model_number && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Model Number</p>
                        <p className="text-sm text-gray-900 dark:text-white">{item.model_number}</p>
                      </div>
                    )}
                    {item.serial_number && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial Number</p>
                        <p className="text-sm text-gray-900 dark:text-white">{item.serial_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(item.supplier_name || item.supplier_contact) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Supplier Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {item.supplier_name && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Supplier Name</p>
                        <p className="text-sm text-gray-900">{item.supplier_name}</p>
                      </div>
                    )}
                    {item.supplier_contact && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Supplier Contact</p>
                        <p className="text-sm text-gray-900">{item.supplier_contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(item.purchase_date || item.expiry_date) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {item.purchase_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Purchase Date</p>
                        <p className="text-sm text-gray-900">{new Date(item.purchase_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {item.expiry_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                        <p className="text-sm text-gray-900">{new Date(item.expiry_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.notes && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{item.notes}</p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-gray-500">
                <p>Last updated: {new Date(item.updated_at).toLocaleString()}</p>
                {item.last_updated_by_name && <p>By: {item.last_updated_by_name}</p>}
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

export default ViewInventoryItemScreen
