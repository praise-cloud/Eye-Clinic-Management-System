// src/pages/RemindersPage.jsx
import React, { useState, useEffect } from 'react';
import useReminders from '../hooks/useReminders';
import LoadingScreen from '../components/LoadingScreen';

const RemindersPage = () => {
    const { reminders, loading, fetchUpcomingReminders, createReminder } = useReminders();
    const [showCreate, setShowCreate] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUpcomingReminders();
    }, [fetchUpcomingReminders]);

    const filteredReminders = reminders.filter(r => {
        const search = searchTerm.toLowerCase();
        return (
            (r.patient_name || '').toLowerCase().includes(search) ||
            (r.patient_contact || '').toLowerCase().includes(search) ||
            (r.last_diagnosis || '').toLowerCase().includes(search)
        );
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString();
    };

    const getDaysUntil = (dateStr) => {
        if (!dateStr) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    };

    const getUrgencyColor = (dateStr) => {
        const days = getDaysUntil(dateStr);
        if (days < 0) return 'border-red-500 bg-red-50';
        if (days === 0) return 'border-orange-500 bg-orange-50';
        if (days <= 3) return 'border-yellow-500 bg-yellow-50';
        return 'border-gray-200 bg-white';
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointment Reminders</h1>
                        <p className="text-gray-500 mt-1">Manage patient appointment reminders</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                        + New Reminder
                    </button>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search by patient name, contact, or diagnosis..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {filteredReminders.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
                        <p className="text-gray-500">No upcoming reminders</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredReminders.map(reminder => {
                            const daysUntil = getDaysUntil(reminder.appointment_date);
                            return (
                                <div
                                    key={reminder.id}
                                    className={`rounded-xl border-l-4 p-6 ${getUrgencyColor(reminder.appointment_date)} dark:bg-gray-800`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {reminder.patient_name || 'Unknown Patient'}
                                                </h3>
                                                {daysUntil === 0 && (
                                                    <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                                                        TODAY
                                                    </span>
                                                )}
                                                {daysUntil < 0 && (
                                                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                                        OVERDUE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase">Contact</p>
                                                    <p className="text-gray-900 dark:text-white font-medium">{reminder.patient_contact || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase">Appointment</p>
                                                    <p className="text-gray-900 dark:text-white font-medium">{formatDate(reminder.appointment_date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase">Days Until</p>
                                                    <p className="text-gray-900 dark:text-white font-medium">
                                                        {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : daysUntil === 0 ? 'Today' : `${daysUntil} days`}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase">Last Diagnosis</p>
                                                    <p className="text-gray-900 dark:text-white font-medium truncate">{reminder.last_diagnosis || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => window.open(`tel:${reminder.patient_contact}`)}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                                            >
                                                Call Patient
                                            </button>
                                            <button
                                                className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs font-medium"
                                            >
                                                Mark Contacted
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemindersPage;
