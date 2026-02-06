import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useUser from '../../hooks/useUser'
import * as inventoryService from '../../services/inventoryService'

const InventoryContent = () => {
  const navigate = useNavigate()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [buyingItem, setBuyingItem] = useState(null)
  const [buyQuantity, setBuyQuantity] = useState(1)
  const { user } = useUser()

  useEffect(() => {
    loadInventory()
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onIpcEvent('data:update', (payload) => {
        if (payload.table === 'inventory') {
          loadInventory()
        }
      })
      return unsubscribe
    }
  }, [])

  const loadInventory = async () => {
    try {
      const result = await window.electronAPI.getInventoryItems({})
      if (result.success) {
        setInventory(result.items)
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      const result = await window.electronAPI.deleteInventoryItem(deleteConfirm.id)
      if (result.success) {
        loadInventory()
        setDeleteConfirm(null)
      } else {
        alert(result.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleBuy = async () => {
    if (!buyingItem) return
    const qty = parseInt(buyQuantity, 10)
    if (!qty || qty <= 0) {
      alert('Enter a valid quantity to buy')
      return
    }
    if (qty > buyingItem.current_quantity) {
      alert('Quantity exceeds available stock')
      return
    }
    try {
      const newQuantity = buyingItem.current_quantity - qty
      const userId = user?.id || null
      const notes = `Dispensed ${qty} ${buyingItem.unit_of_measure || ''} from inventory`
      await inventoryService.updateInventoryQuantity(buyingItem.id, newQuantity, userId, notes)
      setBuyingItem(null)
      setBuyQuantity(1)
      loadInventory()
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Failed to complete purchase')
    }
  }

  const handleExportCSV = () => {
    if (inventory.length === 0) return;
    const headers = ['Description', 'Unit Code', 'Category', 'Quantity', 'Min Stock', 'Unit Cost'];
    const csvRows = inventory.map(item => [
      `"${item.item_name || ''}"`,
      item.item_code || '',
      item.category || '',
      item.current_quantity || 0,
      item.minimum_quantity || 0,
      item.unit_cost || 0
    ].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url); // Clean up the object URL
  };

  const getStockStatus = (quantity, minStock) => {
    if (quantity <= minStock) return 'text-red-600 bg-red-100'
    if (quantity <= minStock * 1.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  return (
    <>
      <div className="card-premium overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Medical Inventory</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Stock levels and procurement management</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="btn btn-ghost px-6 flex items-center gap-3 bg-slate-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="font-bold">Export CSV</span>
            </button>
            <button
              onClick={() => navigate('/inventory/create')}
              className="btn btn-primary px-6 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              <span className="font-bold">Add New Item</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <p className="text-slate-400 font-bold tracking-tight">Inventory is empty</p>
              <p className="text-sm text-slate-400 mt-1">Start by adding your first medical item or reagent</p>
            </div>
          ) : (
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Asset</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Code & Category</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Level</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Procurement Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventory.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        {item.image_path ? (
                          <img
                            src={item.image_path.startsWith('data:') ? item.image_path : `file://${item.image_path}`}
                            alt={item.item_name}
                            className="h-14 w-14 object-cover rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm"
                          />
                        ) : (
                          <div className="h-14 w-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                          <div className="text-xs text-slate-500 font-medium">Issue Unit: {item.unit_of_measure}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.item_code}</span>
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-tighter">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{item.current_quantity} in stock</span>
                        <span className="text-xs text-slate-400">Min: {item.minimum_quantity}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${item.current_quantity <= item.minimum_quantity
                        ? 'text-rose-600 bg-rose-50 border-rose-100'
                        : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                        }`}>
                        {item.current_quantity <= item.minimum_quantity ? 'CRITICAL LOW' : 'OPTIMAL'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setBuyingItem(item); setBuyQuantity(1); }}
                          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all flex items-center justify-center"
                          title="Buy Item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l2-8H5.4M7 13L5.4 5M7 13l-2 6h2m0 0h2m8 0h2l-2-6M9 19a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setViewingItem(item)}
                          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button
                          onClick={() => navigate(`/inventory/edit/${item.id}`)}
                          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center"
                          title="Edit Asset"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center"
                          title="Delete Asset"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-premium-fade">
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-sm p-8 shadow-2xl animate-premium-slide">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-2xl flex items-center justify-center text-rose-600 mb-6 font-black scale-110">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Decommission Asset</h3>
            <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">Confirm removal of <b>{deleteConfirm.item_name}</b> from clinical inventory. This action is irreversible.</p>
            <div className="flex gap-3 mt-10">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all">Abort</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95">Purge Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-premium-fade" onClick={() => setViewingItem(null)}>
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-premium-slide" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-8 flex items-start justify-between z-10">
              <div className="flex items-start gap-6">
                {viewingItem.image_path ? (
                  <img
                    src={viewingItem.image_path.startsWith('data:') ? viewingItem.image_path : `file://${viewingItem.image_path}`}
                    alt={viewingItem.item_name}
                    className="h-24 w-24 object-cover rounded-3xl border-4 border-white dark:border-slate-700 shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{viewingItem.item_name}</h3>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mt-2">{viewingItem.category}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${viewingItem.current_quantity <= viewingItem.minimum_quantity
                      ? 'text-rose-600 bg-rose-50 border-rose-100'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                      }`}>
                      {viewingItem.current_quantity <= viewingItem.minimum_quantity ? 'CRITICAL LOW' : 'OPTIMAL STOCK'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingItem(null)} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-90">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Asset Information</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Code</label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{viewingItem.item_code}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit of Measure</label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{viewingItem.unit_of_measure}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Cost</label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">${viewingItem.unit_cost || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{viewingItem.supplier || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Stock Management</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stock</label>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{viewingItem.current_quantity}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Minimum Stock</label>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{viewingItem.minimum_quantity}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reorder Point</label>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{Math.ceil(viewingItem.minimum_quantity * 1.5)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Description</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">{viewingItem.description}</p>
                </div>
              )}

              {/* Storage Location */}
              {viewingItem.location && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Storage Location</h4>
                  <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{viewingItem.location}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 p-6 flex gap-3">
              <button onClick={() => setViewingItem(null)} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700">Close</button>
              <button onClick={() => { setViewingItem(null); navigate(`/inventory/edit/${viewingItem.id}`); }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">Edit Asset</button>
            </div>
          </div>
        </div>
      )}
      {/* Buy Item Modal */}
      {buyingItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4 animate-premium-fade" onClick={() => setBuyingItem(null)}>
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-md p-8 shadow-2xl animate-premium-slide" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Record Product Sale</h3>
            <p className="text-sm text-slate-500 mb-6">
              {buyingItem.item_name} ({buyingItem.unit_of_measure}) at ₦{parseFloat(buyingItem.unit_cost || 0).toLocaleString()}
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quantity to dispense</label>
                <input
                  type="number"
                  min="1"
                  max={buyingItem.current_quantity}
                  value={buyQuantity}
                  onChange={e => setBuyQuantity(e.target.value)}
                  className="input-premium"
                />
                <p className="text-[11px] text-slate-400 mt-1">Available: {buyingItem.current_quantity} in stock</p>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  ₦{(parseFloat(buyingItem.unit_cost || 0) * (parseInt(buyQuantity || 0, 10) || 0)).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setBuyingItem(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryContent;
