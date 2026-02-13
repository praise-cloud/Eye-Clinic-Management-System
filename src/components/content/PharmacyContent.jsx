import React, { useEffect, useMemo, useState } from 'react';
import usePharmacy from '../../hooks/usePharmacy';

const defaultForm = {
  drug_code: '',
  drug_name: '',
  drug_form: 'tablet',
  strength: '',
  pack_size: '1',
  unit_price: '0',
  current_quantity: '0',
  minimum_quantity: '0',
  status: 'active',
  supplier_name: '',
  supplier_contact: '',
  expiry_date: '',
  notes: ''
};

const PharmacyContent = () => {
  const { drugs, loading, error, fetchDrugs, addDrug, updateDrug, deleteDrug, dispenseDrug } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [dispenseTarget, setDispenseTarget] = useState(null);
  const [dispenseData, setDispenseData] = useState({ patient_id: '', quantity: '1', notes: '' });
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseLoading, setDispenseLoading] = useState(false);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  const filteredDrugs = useMemo(() => {
    if (!searchTerm) return drugs;
    const term = searchTerm.toLowerCase();
    return drugs.filter((drug) => {
      return (
        drug.drug_name?.toLowerCase().includes(term) ||
        drug.drug_code?.toLowerCase().includes(term) ||
        drug.strength?.toLowerCase().includes(term)
      );
    });
  }, [drugs, searchTerm]);

  const openCreateForm = () => {
    setEditingDrug(null);
    setFormData(defaultForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (drug) => {
    setEditingDrug(drug);
    setFormError('');
    setFormData({
      drug_code: drug.drug_code || '',
      drug_name: drug.drug_name || '',
      drug_form: drug.drug_form || 'tablet',
      strength: drug.strength || '',
      pack_size: drug.pack_size != null ? String(drug.pack_size) : '1',
      unit_price: drug.unit_price != null ? String(drug.unit_price) : '0',
      current_quantity: drug.current_quantity != null ? String(drug.current_quantity) : '0',
      minimum_quantity: drug.minimum_quantity != null ? String(drug.minimum_quantity) : '0',
      status: drug.status || 'active',
      supplier_name: drug.supplier_name || '',
      supplier_contact: drug.supplier_contact || '',
      expiry_date: drug.expiry_date ? String(drug.expiry_date).slice(0, 10) : '',
      notes: drug.notes || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDrug(null);
    setFormData(defaultForm);
    setFormError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDrug = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        drug_code: formData.drug_code.trim(),
        drug_name: formData.drug_name.trim(),
        drug_form: formData.drug_form,
        strength: formData.strength.trim(),
        pack_size: Number(formData.pack_size || 0),
        unit_price: Number(formData.unit_price || 0),
        current_quantity: Number(formData.current_quantity || 0),
        minimum_quantity: Number(formData.minimum_quantity || 0),
        status: formData.status,
        supplier_name: formData.supplier_name || '',
        supplier_contact: formData.supplier_contact || '',
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || ''
      };

      if (!payload.drug_code || !payload.drug_name || !payload.drug_form || !payload.strength || payload.pack_size <= 0) {
        setFormError('Please fill in all required fields.');
        setSaving(false);
        return;
      }

      if (editingDrug) {
        await updateDrug(editingDrug.id, payload);
        setNotification({ type: 'success', message: 'Drug updated successfully.' });
      } else {
        await addDrug(payload);
        setNotification({ type: 'success', message: 'Drug added successfully.' });
      }
      closeForm();
    } catch (err) {
      const message = err?.message || 'Failed to save drug.';
      setFormError(message);
      setNotification({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDrug = async (drug) => {
    const confirmed = window.confirm(`Remove ${drug.drug_name} from pharmacy registry?`);
    if (!confirmed) return;
    try {
      const success = await deleteDrug(drug.id);
      if (success) {
        setNotification({ type: 'success', message: 'Drug deleted successfully.' });
      } else {
        setNotification({ type: 'error', message: 'Failed to delete drug.' });
      }
    } catch (err) {
      const message = err?.message || 'Failed to delete drug.';
      setNotification({ type: 'error', message });
    }
  };

  const openDispenseModal = (drug) => {
    setDispenseTarget(drug);
    setDispenseData({ patient_id: '', quantity: '1', notes: '' });
    setDispenseError('');
  };

  const closeDispenseModal = () => {
    setDispenseTarget(null);
    setDispenseData({ patient_id: '', quantity: '1', notes: '' });
    setDispenseError('');
  };

  const handleDispenseChange = (e) => {
    const { name, value } = e.target;
    setDispenseData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConfirmDispense = async (e) => {
    e.preventDefault();
    if (!dispenseTarget) return;
    setDispenseLoading(true);
    setDispenseError('');
    try {
      const patientId = dispenseData.patient_id.trim();
      const quantityNumber = Number(dispenseData.quantity || 0);
      if (!patientId || !Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        setDispenseError('Patient ID and a quantity greater than zero are required.');
        setDispenseLoading(false);
        return;
      }

      const result = await dispenseDrug(dispenseTarget.id, patientId, quantityNumber, dispenseData.notes || '');
      if (result) {
        setNotification({ type: 'success', message: 'Dispensation recorded successfully.' });
        closeDispenseModal();
      } else {
        setDispenseError('Failed to record dispensation.');
      }
    } catch (err) {
      const message = err?.message || 'Failed to record dispensation.';
      setDispenseError(message);
      setNotification({ type: 'error', message });
    } finally {
      setDispenseLoading(false);
    }
  };

  return (
    <>
      <div className="card-premium overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pharmacy</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Dispensing and medication stock management</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent min-w-[220px]"
                placeholder="Search by name, code, or strength"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </span>
            </div>
            <button
              onClick={openCreateForm}
              className="btn btn-primary px-6 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-bold">Add Drug</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className={`mx-8 mt-4 mb-2 p-4 rounded-xl flex items-center gap-3 animate-premium-fade ${notification.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30'
            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30'
            }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {notification.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        )}

        {error && !loading && (
          <div className="mx-8 mt-4 mb-2 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 text-sm font-medium">
            {error.message || 'Failed to load pharmacy data.'}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredDrugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h6M9 7h6a4 4 0 014 4v2M9 7V5a2 2 0 00-2-2H5M9 7H7a2 2 0 00-2 2v2m0 0v2a2 2 0 002 2h2m-4-4h2" />
                </svg>
              </div>
              <p className="text-slate-400 font-bold tracking-tight">No pharmacy records</p>
              <p className="text-sm text-slate-400 mt-1">Start by registering medications available for dispensing.</p>
            </div>
          ) : (
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Medication</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Code & Form</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pricing</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDrugs.map((drug) => {
                  const currentQty = Number(drug.current_quantity || 0);
                  const minQty = Number(drug.minimum_quantity || 0);
                  return (
                    <tr key={drug.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{drug.drug_name}</div>
                          <div className="text-xs text-slate-500 font-medium">{drug.strength}</div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{drug.drug_code}</span>
                          <span className="text-xs font-black text-indigo-500 uppercase tracking-tighter">{drug.drug_form}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{currentQty} units</span>
                          <span className="text-xs text-slate-400">Min: {minQty}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">₦{Number(drug.unit_price || 0).toLocaleString()}</span>
                          <span className="text-xs text-slate-400">Pack size: {drug.pack_size}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openDispenseModal(drug)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all flex items-center justify-center"
                            title="Dispense"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditForm(drug)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDrug(drug)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-premium-fade">
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-premium-slide">
            <div className="flex items-start justify-between p-8 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingDrug ? 'Edit Medication' : 'Add Medication'}
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Define how this medication appears in the pharmacy registry.
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveDrug} className="p-8 space-y-8">
              {formError && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 text-sm font-medium">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drug Name</label>
                  <input
                    type="text"
                    name="drug_name"
                    value={formData.drug_name}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drug Code</label>
                  <input
                    type="text"
                    name="drug_code"
                    value={formData.drug_code}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Strength</label>
                  <input
                    type="text"
                    name="strength"
                    value={formData.strength}
                    onChange={handleFormChange}
                    placeholder="e.g. 500 mg"
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drug Form</label>
                  <select
                    name="drug_form"
                    value={formData.drug_form}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="drops">Eye Drops</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pack Size</label>
                  <input
                    type="number"
                    min="1"
                    name="pack_size"
                    value={formData.pack_size}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Quantity</label>
                  <input
                    type="number"
                    min="0"
                    name="current_quantity"
                    value={formData.current_quantity}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Minimum Quantity</label>
                  <input
                    type="number"
                    min="0"
                    name="minimum_quantity"
                    value={formData.minimum_quantity}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Name</label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Contact</label>
                  <input
                    type="text"
                    name="supplier_contact"
                    value={formData.supplier_contact}
                    onChange={handleFormChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent resize-none"
                  placeholder="Usage restrictions, storage requirements, or additional notes."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingDrug ? 'Save Changes' : 'Create Drug'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dispenseTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4 animate-premium-fade">
          <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-premium-slide">
            <div className="flex items-start justify-between p-8 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Dispense Medication
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {dispenseTarget.drug_name} • {dispenseTarget.strength}
                </p>
              </div>
              <button
                onClick={closeDispenseModal}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleConfirmDispense} className="p-8 space-y-6">
              {dispenseError && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 text-sm font-medium">
                  {dispenseError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient ID</label>
                  <input
                    type="text"
                    name="patient_id"
                    value={dispenseData.patient_id}
                    onChange={handleDispenseChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    placeholder="Paste the patient ID from the clinical record"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={dispenseData.quantity}
                    onChange={handleDispenseChange}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Available stock: {Number(dispenseTarget.current_quantity || 0)} units.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dispensing Notes</label>
                  <textarea
                    name="notes"
                    value={dispenseData.notes}
                    onChange={handleDispenseChange}
                    rows={3}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent resize-none"
                    placeholder="Optional: usage instructions or additional context."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDispenseModal}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispenseLoading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {dispenseLoading ? 'Recording...' : 'Confirm Dispense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PharmacyContent;

