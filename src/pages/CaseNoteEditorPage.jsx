// src/pages/CaseNoteEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useCaseNotes from '../hooks/useCaseNotes';
import LoadingScreen from '../components/LoadingScreen';
import useUser from '../hooks/useUser';

const CaseNoteEditorPage = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId');
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const { createCaseNote, updateCaseNote, getCaseNoteById, loading } = useCaseNotes();

    const [formData, setFormData] = useState({
        patient_id: patientId || '',
        visit_date: new Date().toISOString().split('T')[0],
        chief_complaint: '',
        history_of_present_illness: '',
        duration: '',
        affected_eye: '',
        
        // Visual Acuity
        va_distance_uncorrected_od: '',
        va_distance_uncorrected_os: '',
        va_distance_glasses_od: '',
        va_distance_glasses_os: '',
        va_distance_pinhole_od: '',
        va_distance_pinhole_os: '',
        va_near_uncorrected_od: '',
        va_near_uncorrected_os: '',
        va_near_glasses_od: '',
        va_near_glasses_os: '',
        va_best_corrected_od: '',
        va_best_corrected_os: '',
        
        // Refraction
        refraction_sphere_od: '',
        refraction_sphere_os: '',
        refraction_cylinder_od: '',
        refraction_cylinder_os: '',
        refraction_axis_od: '',
        refraction_axis_os: '',
        refraction_add_od: '',
        refraction_add_os: '',
        
        // IOP
        intraocular_pressure_od: '',
        intraocular_pressure_os: '',
        iop_method: '',
        
        // Anterior Segment
        anterior_segment_od: '',
        anterior_segment_os: '',
        
        // Posterior Segment
        posterior_segment_od: '',
        posterior_segment_os: '',
        
        // Diagnostic Tests
        diagnostic_tests: '',
        cvf_analysis_od: '',
        cvf_analysis_os: '',
        oct_findings: '',
        
        // Assessment
        diagnosis: '',
        differential_diagnosis: '',
        severity: '',
        
        // Treatment Plan
        treatment_plan: '',
        medications: '',
        procedures: '',
        follow_up_date: '',
        follow_up_instructions: ''
    });
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const isEditing = !!id;

    useEffect(() => {
        if (id) {
            const fetchNote = async () => {
                const note = await getCaseNoteById(id);
                if (note) {
                    setFormData(prev => ({
                        ...prev,
                        patient_id: note.patient_id || '',
                        visit_date: note.visit_date || '',
                        chief_complaint: note.chief_complaint || '',
                        history_of_present_illness: note.history_of_present_illness || '',
                        duration: note.duration || '',
                        affected_eye: note.affected_eye || '',
                        va_distance_uncorrected_od: note.va_distance_uncorrected_od || '',
                        va_distance_uncorrected_os: note.va_distance_uncorrected_os || '',
                        va_distance_glasses_od: note.va_distance_glasses_od || '',
                        va_distance_glasses_os: note.va_distance_glasses_os || '',
                        va_distance_pinhole_od: note.va_distance_pinhole_od || '',
                        va_distance_pinhole_os: note.va_distance_pinhole_os || '',
                        va_near_uncorrected_od: note.va_near_uncorrected_od || '',
                        va_near_uncorrected_os: note.va_near_uncorrected_os || '',
                        va_near_glasses_od: note.va_near_glasses_od || '',
                        va_near_glasses_os: note.va_near_glasses_os || '',
                        va_best_corrected_od: note.va_best_corrected_od || '',
                        va_best_corrected_os: note.va_best_corrected_os || '',
                        refraction_sphere_od: note.refraction_sphere_od || '',
                        refraction_sphere_os: note.refraction_sphere_os || '',
                        refraction_cylinder_od: note.refraction_cylinder_od || '',
                        refraction_cylinder_os: note.refraction_cylinder_os || '',
                        refraction_axis_od: note.refraction_axis_od || '',
                        refraction_axis_os: note.refraction_axis_os || '',
                        refraction_add_od: note.refraction_add_od || '',
                        refraction_add_os: note.refraction_add_os || '',
                        intraocular_pressure_od: note.intraocular_pressure_od || '',
                        intraocular_pressure_os: note.intraocular_pressure_os || '',
                        iop_method: note.iop_method || '',
                        anterior_segment_od: note.anterior_segment_od || '',
                        anterior_segment_os: note.anterior_segment_os || '',
                        posterior_segment_od: note.posterior_segment_od || '',
                        posterior_segment_os: note.posterior_segment_os || '',
                        diagnostic_tests: note.diagnostic_tests || '',
                        cvf_analysis_od: note.cvf_analysis_od || '',
                        cvf_analysis_os: note.cvf_analysis_os || '',
                        oct_findings: note.oct_findings || '',
                        diagnosis: note.diagnosis || '',
                        differential_diagnosis: note.differential_diagnosis || '',
                        severity: note.severity || '',
                        treatment_plan: note.treatment_plan || '',
                        medications: note.medications || '',
                        procedures: note.procedures || '',
                        follow_up_date: note.follow_up_date || '',
                        follow_up_instructions: note.follow_up_instructions || ''
                    }));
                }
            };
            fetchNote();
        }
    }, [id, getCaseNoteById]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e, signOff = false) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const submitData = {
                ...formData,
                doctor_id: user?.id,
                visit_date: formData.visit_date || new Date().toISOString().split('T')[0]
            };
            
            let result;
            if (isEditing) {
                const updateData = { ...submitData };
                if (signOff) updateData.status = 'signed';
                result = await updateCaseNote(id, updateData);
            } else {
                if (signOff) submitData.status = 'signed';
                result = await createCaseNote(submitData);
            }

            if (result?.success || result) {
                navigate(-1);
            } else {
                setError(result?.error || 'Failed to save case note');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {isEditing ? 'Edit Case Note' : 'New Case Note'}
                                </h1>
                                {patientId && (
                                    <p className="text-sm text-gray-500">Patient ID: {patientId}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SECTION 1: Visit Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Visit Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visit Date</label>
                                <input
                                    type="date"
                                    name="visit_date"
                                    value={formData.visit_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chief Complaint</label>
                                <input
                                    type="text"
                                    name="chief_complaint"
                                    value={formData.chief_complaint}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    placeholder="Patient's main complaint"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                                <input
                                    type="text"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    placeholder="e.g., 2 weeks, 1 month"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Affected Eye</label>
                                <select
                                    name="affected_eye"
                                    value={formData.affected_eye}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                >
                                    <option value="">Select</option>
                                    <option value="OD">Right Eye (OD)</option>
                                    <option value="OS">Left Eye (OS)</option>
                                    <option value="OU">Both Eyes (OU)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">History of Present Illness</label>
                                <textarea
                                    name="history_of_present_illness"
                                    value={formData.history_of_present_illness}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    placeholder="Detailed history..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Visual Acuity */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Visual Acuity</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Right Eye (OD)</h3>
                                <div className="space-y-3">
                                    <input type="text" name="va_distance_uncorrected_od" value={formData.va_distance_uncorrected_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance Uncorrected (e.g., 6/60)" />
                                    <input type="text" name="va_distance_glasses_od" value={formData.va_distance_glasses_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance with Glasses" />
                                    <input type="text" name="va_distance_pinhole_od" value={formData.va_distance_pinhole_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance Pinhole" />
                                    <input type="text" name="va_near_uncorrected_od" value={formData.va_near_uncorrected_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Near Uncorrected" />
                                    <input type="text" name="va_near_glasses_od" value={formData.va_near_glasses_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Near with Glasses" />
                                    <input type="text" name="va_best_corrected_od" value={formData.va_best_corrected_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 font-semibold" placeholder="Best Corrected VA" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Left Eye (OS)</h3>
                                <div className="space-y-3">
                                    <input type="text" name="va_distance_uncorrected_os" value={formData.va_distance_uncorrected_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance Uncorrected" />
                                    <input type="text" name="va_distance_glasses_os" value={formData.va_distance_glasses_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance with Glasses" />
                                    <input type="text" name="va_distance_pinhole_os" value={formData.va_distance_pinhole_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Distance Pinhole" />
                                    <input type="text" name="va_near_uncorrected_os" value={formData.va_near_uncorrected_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Near Uncorrected" />
                                    <input type="text" name="va_near_glasses_os" value={formData.va_near_glasses_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700" placeholder="Near with Glasses" />
                                    <input type="text" name="va_best_corrected_os" value={formData.va_best_corrected_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 font-semibold" placeholder="Best Corrected VA" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Refraction */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Refraction</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Right Eye (OD)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" name="refraction_sphere_od" value={formData.refraction_sphere_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Sphere" />
                                    <input type="text" name="refraction_cylinder_od" value={formData.refraction_cylinder_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Cylinder" />
                                    <input type="text" name="refraction_axis_od" value={formData.refraction_axis_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Axis" />
                                    <input type="text" name="refraction_add_od" value={formData.refraction_add_od} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Add" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Left Eye (OS)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" name="refraction_sphere_os" value={formData.refraction_sphere_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Sphere" />
                                    <input type="text" name="refraction_cylinder_os" value={formData.refraction_cylinder_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Cylinder" />
                                    <input type="text" name="refraction_axis_os" value={formData.refraction_axis_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Axis" />
                                    <input type="text" name="refraction_add_os" value={formData.refraction_add_os} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Add" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Intraocular Pressure */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Intraocular Pressure</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <input
                                    type="text"
                                    name="intraocular_pressure_od"
                                    value={formData.intraocular_pressure_od}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="e.g., 14 mmHg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Left Eye (OS)</label>
                                <input
                                    type="text"
                                    name="intraocular_pressure_os"
                                    value={formData.intraocular_pressure_os}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="e.g., 16 mmHg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                                <select
                                    name="iop_method"
                                    value={formData.iop_method}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                >
                                    <option value="">Select Method</option>
                                    <option value="GAT">GAT (Goldmann)</option>
                                    <option value="NCT">Non-Contact (NCT)</option>
                                    <option value="iCare">iCare</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: Anterior Segment */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Anterior Segment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <textarea
                                    name="anterior_segment_od"
                                    value={formData.anterior_segment_od}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Lids, Conjunctiva, Cornea, AC, Iris..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Left Eye (OS)</label>
                                <textarea
                                    name="anterior_segment_os"
                                    value={formData.anterior_segment_os}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Lids, Conjunctiva, Cornea, AC, Iris..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: Posterior Segment */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Posterior Segment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <textarea
                                    name="posterior_segment_od"
                                    value={formData.posterior_segment_od}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Optic Nerve, Macula, Retina, Vessels..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Left Eye (OS)</label>
                                <textarea
                                    name="posterior_segment_os"
                                    value={formData.posterior_segment_os}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Optic Nerve, Macula, Retina, Vessels..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 7: Diagnostic Tests */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Diagnostic Tests</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tests Performed</label>
                                <input
                                    type="text"
                                    name="diagnostic_tests"
                                    value={formData.diagnostic_tests}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="HVF, OCT, Fundus Photo, Topography..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVF Analysis OD</label>
                                    <textarea
                                        name="cvf_analysis_od"
                                        value={formData.cvf_analysis_od}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVF Analysis OS</label>
                                    <textarea
                                        name="cvf_analysis_os"
                                        value={formData.cvf_analysis_os}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OCT Findings</label>
                                <textarea
                                    name="oct_findings"
                                    value={formData.oct_findings}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 8: Assessment & Diagnosis */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Assessment & Diagnosis</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Diagnosis</label>
                                <textarea
                                    name="diagnosis"
                                    value={formData.diagnosis}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Primary diagnosis..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Differential Diagnosis</label>
                                <textarea
                                    name="differential_diagnosis"
                                    value={formData.differential_diagnosis}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Differential diagnoses..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                                <select
                                    name="severity"
                                    value={formData.severity}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                >
                                    <option value="">Select Severity</option>
                                    <option value="Mild">Mild</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Severe">Severe</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 9: Treatment Plan */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">Treatment Plan</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment Plan</label>
                                <textarea
                                    name="treatment_plan"
                                    value={formData.treatment_plan}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medications</label>
                                <textarea
                                    name="medications"
                                    value={formData.medications}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Medications prescribed..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Procedures</label>
                                <textarea
                                    name="procedures"
                                    value={formData.procedures}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    placeholder="Procedures to be done..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Date</label>
                                    <input
                                        type="date"
                                        name="follow_up_date"
                                        value={formData.follow_up_date}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Instructions</label>
                                    <input
                                        type="text"
                                        name="follow_up_instructions"
                                        value={formData.follow_up_instructions}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                                        placeholder="e.g., 1 month, 3 months"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 pb-8">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, false)}
                            disabled={saving}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                        >
                            {saving ? 'Signing...' : 'Sign & Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CaseNoteEditorPage;