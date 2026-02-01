import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDetailContent from './ClientDetailContent';
import * as patientService from '../services/patientService';
import LoadingScreen from '../components/LoadingScreen';

const PatientDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPatient = async () => {
            setLoading(true);
            try {
                // Assuming patientService has getPatientById or similar
                const res = await window.electronAPI.getPatient(id);
                if (res.success) {
                    // Transform to match ClientDetailContent expected format
                    const p = res.patient;
                    setPatient({
                        id: p.id,
                        patient_id: p.patient_id,
                        name: `${p.first_name} ${p.last_name}`,
                        first_name: p.first_name,
                        last_name: p.last_name,
                        phone: p.contact || '',
                        email: p.email || '',
                        case: p.reason_for_visit || '',
                        date: p.dob || '',
                        gender: p.gender || '',
                        address: p.address || ''
                    });
                } else {
                    setError(res.error || 'Patient not found');
                }
            } catch (err) {
                console.error('Error fetching patient:', err);
                setError('Failed to load patient details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPatient();
    }, [id]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleSave = async (updatedData) => {
        try {
            const res = await window.electronAPI.updatePatient(id, {
                first_name: updatedData.first_name || patient.first_name,
                last_name: updatedData.last_name || patient.last_name,
                dob: updatedData.date || patient.date,
                contact: updatedData.phone || patient.phone,
                email: updatedData.email || patient.email,
                reason_for_visit: updatedData.case || patient.case,
                gender: updatedData.gender || patient.gender
            });
            if (res.success) {
                // Refresh local state
                setPatient(prev => ({ ...prev, ...updatedData }));
            } else {
                alert('Update failed: ' + res.error);
            }
        } catch (err) {
            console.error('Error updating patient:', err);
            alert('Error updating patient');
        }
    };

    if (loading) return <LoadingScreen />;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p>{error}</p>
            <button onClick={handleBack} className="mt-4 text-blue-500 hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <ClientDetailContent
                client={patient}
                onBack={handleBack}
                onSave={handleSave}
            />
        </div>
    );
};

export default PatientDetailsPage;
