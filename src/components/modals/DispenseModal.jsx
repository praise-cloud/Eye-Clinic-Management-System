import React, { useState, useEffect } from 'react';
import usePrescriptions from '../../hooks/usePrescriptions';
import useUser from '../../hooks/useUser';

const DispenseModal = ({ prescriptionId, prescription: initialPrescription, onClose, onDispensed }) => {
    const { fetchPrescriptionById, updateStatus, loading: hookLoading } = usePrescriptions();
    const { user } = useUser();
    const [prescription, setPrescription] = useState(initialPrescription || null);
    const [loading, setLoading] = useState(!initialPrescription);
    const [error, setError] = useState(null);
    const [dispensing, setDispensing] = useState(false);

    useEffect(() => {
        const loadPrescription = async () => {
            if (!prescriptionId || prescription) return;
            setLoading(true);
            try {
                const data = await fetchPrescriptionById(prescriptionId);
                if (data) {
                    setPrescription(data);
                } else {
                    setError('Prescription not found');
                }
            } catch (err) {
                console.error('Error loading prescription:', err);
                setError('Failed to load prescription data');
            } finally {
                setLoading(false);
            }
        };

        loadPrescription();
    }, [prescriptionId, prescription, fetchPrescriptionById]);

    const handleDispense = async () => {
        if (!prescription || !user) return;
        setDispensing(true);
        setError(null);
        try {
            const success = await updateStatus(prescription.id, 'dispensed', user.id);
            if (success) {
                if (onDispensed) onDispensed(prescription);
                onClose();
            } else {
                setError('Failed to dispense. Please check inventory stock levels.');
            }
        } catch (err) {
            console.error('Dispense error:', err);
            setError(err.message || 'System error during dispensation');
        } finally {
            setDispensing(false);
        }
    };

    if (!prescriptionId && !initialPrescription) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4 animate-premium-fade">
            <div className="card-premium bg-white dark:bg-slate-900 w-full max-w-lg shadow-2xl animate-premium-slide overflow-hidden">
                <div className="flex items-start justify-between p-8 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Dispense Medication
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Individual Prescription Fulfillment
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                    >
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving Details...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 text-sm font-medium text-center">
                            {error}
                        </div>
                    ) : prescription ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-sm">
                                    {prescription.drug_name[0]}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-900 dark:text-white">{prescription.drug_name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{prescription.strength}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Client</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {prescription.patient_first_name} {prescription.patient_last_name}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Quantity</p>
                                    <p className="text-sm font-black text-emerald-600">
                                        ×{prescription.quantity} Units
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Prescribed By</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Dr. {prescription.doctor_first_name} {prescription.doctor_last_name}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Date</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {new Date(prescription.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 leading-none">Instructional notes</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">
                                    {prescription.instructions || 'Standard dosage instructions apply for this medication.'}
                                </p>
                            </div>

                            {prescription.status !== 'pending' && (
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest">
                                        Status: {prescription.status.toUpperCase()}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-slate-50 transition-all"
                    >
                        Close
                    </button>
                    {prescription?.status === 'pending' && !loading && !error && (
                        <button
                            onClick={handleDispense}
                            disabled={dispensing}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60"
                        >
                            {dispensing ? 'Processing...' : 'Confirm Dispensed'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DispenseModal;
