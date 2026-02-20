import React from 'react';
import { useNavigate } from 'react-router-dom';

const PatientQuickViewModal = ({ patient, onClose }) => {
    const navigate = useNavigate();
    if (!patient) return null;

    const patientName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const patientAge = patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A');
    const patientPhone = patient.phone || patient.contact || 'N/A';

    const handleFullProfile = () => {
        navigate(`/patients/${patient.id}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-premium-fade">
            <div className="card-premium w-full max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-premium-slide">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-black text-lg flex items-center justify-center shadow-inner">
                            {patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Quick Client View
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
                                ID: {patient.patient_id || 'REGISTERED'}
                            </p>
                        </div>
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

                <div className="p-8 space-y-8">
                    {/* Personal Info */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Full Name</label>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{patientName}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Age & Gender</label>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{patientAge} yrs • {patient.gender || 'Not specified'}</p>
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    {/* Contact Info */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Communication Channels</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{patientPhone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{patient.email || 'No email provided'}</span>
                            </div>
                        </div>
                        {patient.address && (
                            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic">"{patient.address}"</p>
                            </div>
                        )}
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    {/* Clinical Context */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Clinical Snapshot</label>
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/10 text-amber-600 text-[10px] font-black rounded-full uppercase">
                                Last Visit: {patient.lastVisit || 'N/A'}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Consultation Reason</h4>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                                {patient.reason_for_visit || 'No preliminary notes recorded for this client.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    <button
                        onClick={handleFullProfile}
                        className="w-full btn btn-primary py-4 text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3"
                    >
                        <span>Access Full Client Record</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientQuickViewModal;
