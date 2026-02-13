import React, { useState, useEffect } from 'react'
import usePharmacy from '../../hooks/usePharmacy'
import usePrescriptions from '../../hooks/usePrescriptions'

const PrescribeModal = ({ onClose, currentUser, initialPatientId = '' }) => {
    const { drugs, fetchDrugs, loading: drugsLoading } = usePharmacy()
    const { createMultiplePrescriptions, createPrescription } = usePrescriptions()
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const [items, setItems] = useState([])
    const [formData, setFormData] = useState({
        patientId: initialPatientId,
        drugId: '',
        quantity: 1,
        instructions: ''
    })

    useEffect(() => {
        fetchDrugs()
        loadPatients()
    }, [fetchDrugs])

    const loadPatients = async () => {
        try {
            const result = await window.electronAPI.getPatients()
            if (result.success) {
                setPatients(result.patients || [])
            }
        } catch (err) {
            console.error('Failed to load patients:', err)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addItem = () => {
        if (!formData.drugId || !formData.quantity) {
            setError('Please select a drug and quantity')
            return
        }

        const selectedDrug = drugs.find(d => d.id === formData.drugId)
        if (!selectedDrug) return

        if (formData.quantity > selectedDrug.current_quantity) {
            setError(`Insufficient stock. Only ${selectedDrug.current_quantity} available.`)
            return
        }

        // Check for duplicates
        if (items.find(item => item.drugId === formData.drugId)) {
            setError('This medication is already in the list')
            return
        }

        const newItem = {
            id: Date.now(),
            drugId: formData.drugId,
            drugName: selectedDrug.drug_name,
            strength: selectedDrug.strength,
            quantity: parseInt(formData.quantity, 10),
            instructions: formData.instructions
        }

        setItems(prev => [...prev, newItem])
        setFormData(prev => ({ ...prev, drugId: '', quantity: 1, instructions: '' }))
        setError('')
    }

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Mode 1: Multi-prescription commit
        if (items.length > 0) {
            if (!formData.patientId) {
                setError('Please select a patient')
                return
            }

            setLoading(true)
            setError('')

            try {
                const result = await createMultiplePrescriptions(
                    formData.patientId,
                    currentUser?.id,
                    items.map(i => ({
                        drugId: i.drugId,
                        quantity: i.quantity,
                        instructions: i.instructions
                    }))
                )

                if (result) {
                    setSuccess(true)
                    setTimeout(() => onClose(), 1500)
                } else {
                    throw new Error('Failed to create prescriptions')
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
            return
        }

        // Mode 2: Single direct prescription
        if (formData.drugId && formData.quantity) {
            if (!formData.patientId) {
                setError('Please select a patient')
                return
            }

            const selectedDrug = drugs.find(d => d.id === formData.drugId)
            if (selectedDrug && formData.quantity > selectedDrug.current_quantity) {
                setError(`Insufficient stock. Only ${selectedDrug.current_quantity} available.`)
                return
            }

            setLoading(true)
            setError('')

            try {
                const result = await createPrescription({
                    patientId: formData.patientId,
                    doctorId: currentUser?.id,
                    drugId: formData.drugId,
                    quantity: parseInt(formData.quantity, 10),
                    instructions: formData.instructions || ''
                })

                if (result) {
                    setSuccess(true)
                    setTimeout(() => onClose(), 1500)
                } else {
                    throw new Error('Failed to create prescription')
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
            return
        }

        setError('Please add a medication to the queue or select one to prescribe immediately')
    }

    const getButtonText = () => {
        if (loading) return 'Processing...'
        if (items.length > 0) return `Commit ${items.length} Prescriptions`
        if (formData.drugId) return 'Prescribe Now'
        return 'Prescribe'
    }

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
            <div className="card-premium w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Prescription Session</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-drug clinical request</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group"
                    >
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 rounded-r-xl flex items-center gap-3 animate-premium-slide">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Prescriptions created successfully!</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Patient Selection */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Patient *</label>
                            <select
                                name="patientId"
                                value={formData.patientId}
                                onChange={handleInputChange}
                                required
                                disabled={!!initialPatientId}
                                className="input-premium appearance-none"
                            >
                                <option value="">Choose patient...</option>
                                {patients.map(patient => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.first_name} {patient.last_name} — {patient.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Add Medication</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Drug Selection */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Drug</label>
                                    <select
                                        name="drugId"
                                        value={formData.drugId}
                                        onChange={handleInputChange}
                                        className="input-premium appearance-none py-2 text-sm"
                                    >
                                        <option value="">Choose medication...</option>
                                        {drugs.map(drug => (
                                            <option key={drug.id} value={drug.id} disabled={drug.current_quantity <= 0}>
                                                {drug.drug_name} ({drug.strength}) — {drug.current_quantity} in stock
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        className="input-premium py-2 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Usage Instructions</label>
                                <textarea
                                    name="instructions"
                                    value={formData.instructions}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="e.g., 1 tablet twice daily"
                                    className="input-premium resize-none py-2 text-sm"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={addItem}
                                className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-900/30"
                            >
                                Stage Medication
                            </button>
                        </div>

                        {/* Staged Items List */}
                        {items.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Prescription Queue ({items.length})</label>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl animate-premium-slide">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 flex items-center justify-center font-black text-[10px]">
                                                    {item.quantity}×
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{item.drugName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.strength || item.instructions}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 shrink-0">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || success || (!items.length && !formData.drugId)}
                            className={`flex-1 btn btn-primary py-3 text-[10px] font-black tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-white ${items.length > 0 ? 'bg-indigo-500' : 'bg-emerald-500'} disabled:opacity-50`}
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PrescribeModal
