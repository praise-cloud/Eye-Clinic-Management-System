// src/pages/CaseNoteEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useCaseNotes from '../hooks/useCaseNotes';
import LoadingScreen from '../components/LoadingScreen';

const CaseNoteEditorPage = () => {
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId');
    const { id } = useParams();
    const navigate = useNavigate();
    const { createCaseNote, updateCaseNote, getCaseNoteById, loading } = useCaseNotes();

    const [formData, setFormData] = useState({
        patient_id: patientId || '',
        chief_complaint: '',
        visual_acuity_od: '',
        visual_acuity_os: '',
        intraocular_pressure_od: '',
        intraocular_pressure_os: '',
        cvf_analysis_od: '',
        cvf_analysis_os: '',
        diagnosis: '',
        recommendation: '',
        next_appointment: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const isEditing = !!id;

    useEffect(() => {
        if (id) {
            const fetchNote = async () => {
                const note = await getCaseNoteById(id);
                if (note) {
                    setFormData({
                        patient_id: note.patient_id || '',
                        chief_complaint: note.chief_complaint || '',
                        visual_acuity_od: note.visual_acuity_od || '',
                        visual_acuity_os: note.visual_acuity_os || '',
                        intraocular_pressure_od: note.intraocular_pressure_od || '',
                        intraocular_pressure_os: note.intraocular_pressure_os || '',
                        cvf_analysis_od: note.cvf_analysis_od || '',
                        cvf_analysis_os: note.cvf_analysis_os || '',
                        diagnosis: note.diagnosis || '',
                        recommendation: note.recommendation || '',
                        next_appointment: note.next_appointment || ''
                    });
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
            let result;
            if (isEditing) {
                const updateData = { ...formData };
                if (signOff) updateData.status = 'signed';
                result = await updateCaseNote(id, updateData);
            } else {
                const createData = { ...formData };
                if (signOff) createData.status = 'signed';
                result = await createCaseNote(createData);
            }

            if (result) {
                navigate(-1);
            } else {
                setError('Failed to save case note');
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
                <div className="max-w-4xl mx-auto px-6 py-4">
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

            <div className="max-w-4xl mx-auto px-6 py-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chief Complaint</h2>
                        <textarea
                            name="chief_complaint"
                            value={formData.chief_complaint}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Patient's main complaint..."
                        />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visual Acuity</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <input
                                    type="text"
                                    name="visual_acuity_od"
                                    value={formData.visual_acuity_od}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., 6/6, 20/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Left Eye (OS)</label>
                                <input
                                    type="text"
                                    name="visual_acuity_os"
                                    value={formData.visual_acuity_os}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., 6/6, 20/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Intraocular Pressure</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <input
                                    type="text"
                                    name="intraocular_pressure_od"
                                    value={formData.intraocular_pressure_od}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., 16 mmHg"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CVF Analysis</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Right Eye (OD)</label>
                                <textarea
                                    name="cvf_analysis_od"
                                    value={formData.cvf_analysis_od}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="CVF findings for right eye..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Left Eye (OS)</label>
                                <textarea
                                    name="cvf_analysis_os"
                                    value={formData.cvf_analysis_os}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="CVF findings for left eye..."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis</label>
                        <textarea
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Clinical diagnosis..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendation</label>
                        <textarea
                            name="recommendation"
                            value={formData.recommendation}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Treatment recommendations..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Appointment</label>
                        <input
                            type="date"
                            name="next_appointment"
                            value={formData.next_appointment}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, false)}
                            disabled={saving}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
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
