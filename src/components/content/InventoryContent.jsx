import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const InventoryContent = () => {
  const navigate = useNavigate()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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
                        onClick={() => navigate(`/inventory/view/${item.id}`)}
                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center"
                        title="View Audit Trail"
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
    </div>
  );
};

export default InventoryContent;
