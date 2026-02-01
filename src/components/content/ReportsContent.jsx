import React, { useState, useEffect, useMemo } from 'react'
import useTests from '../../hooks/useTests';
import usePatients from '../../hooks/usePatients';

const ReportsContent = () => {
  const { tests, fetchTests, loading: testsLoading } = useTests();
  const { patients, fetchPatients } = usePatients();

  useEffect(() => {
    fetchTests();
    fetchPatients();
  }, [fetchTests, fetchPatients]);

  // Derive reports from completed tests
  const reports = useMemo(() => {
    return tests.map(test => {
      const patient = patients.find(p => p.id === test.patient_id);
      return {
        id: test.id,
        patient: patient ? (patient.name || `${patient.first_name} ${patient.last_name}`) : 'Unknown Patient',
        type: `${test.machine_type || 'Eye'} Test`,
        date: test.test_date ? new Date(test.test_date).toLocaleDateString() : 'N/A',
        status: test.result === 'Scheduled' ? 'Pending' : 'Generated',
        patientId: test.patient_id
      };
    });
  }, [tests, patients]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Generated': return 'text-green-600 bg-green-100'
      case 'Draft': return 'text-yellow-600 bg-yellow-100'
      case 'Pending': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Archive</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Generated medical reports and test outcomes</p>
        </div>
        <button
          onClick={() => {
            const headers = ['Patient', 'Type', 'Date', 'Status'];
            const csv = [headers.join(','), ...reports.map(r => [r.patient, r.type, r.date, r.status].join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }}
          className="btn btn-primary px-6 flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span className="font-bold">Download Database</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        {testsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reports.length > 0 ? (
          <table className="min-w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Case</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostics Type</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fulfillment</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((report) => (
                <tr key={report.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{report.patient}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{report.type}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{report.date}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-black">Electronic Signature OK</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${report.status === 'Generated'
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                        : 'text-amber-600 bg-amber-50 border-amber-100'
                      }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center" title="Print Report">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </button>
                      <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center" title="Download Vault">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-slate-400 font-bold tracking-tight">Archive Empty</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">Complete a clinical test to generate a verified medical report for the patient.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsContent