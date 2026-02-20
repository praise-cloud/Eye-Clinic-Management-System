import React, { useEffect, useMemo, useState } from 'react';
import useUser from '../../hooks/useUser';

const parseRaw = (raw) => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch {
    return {};
  }
};

const CVFWorkspaceContent = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    result: '',
    diagnosis: '',
    caseStudy: '',
    notes: ''
  });
  const [folderPath, setFolderPath] = useState('');

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) || null,
    [records, selectedId]
  );

  const loadCvfRecords = async () => {
    try {
      setLoading(true);
      setMessage('');
      const res = await window.electronAPI.getTests({});
      if (!res?.success) {
        setMessage(res?.error || 'Failed to load CVF records.');
        return;
      }

      const normalized = (res.tests || [])
        .map((t) => {
          const raw = parseRaw(t.raw_data);
          return {
            id: t.id,
            patientId: t.patient_id,
            patientName: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown Patient',
            testDate: t.test_date,
            eye: t.eye || 'both',
            machineType: t.machine_type || '',
            raw
          };
        })
        .filter((t) => t.machineType === 'henson_8000' || t.raw?.source === 'henson_8000')
        .sort((a, b) => new Date(b.testDate || 0) - new Date(a.testDate || 0));

      setRecords(normalized);
      if (!selectedId && normalized.length) {
        setSelectedId(normalized[0].id);
      }
    } catch (error) {
      console.error('CVF load error:', error);
      setMessage('Failed to load CVF records: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCvfRecords();
  }, []);

  useEffect(() => {
    if (!selectedRecord) {
      setForm({ result: '', diagnosis: '', caseStudy: '', notes: '' });
      return;
    }
    setForm({
      result: selectedRecord.raw?.result || 'Pending',
      diagnosis: selectedRecord.raw?.diagnosis || '',
      caseStudy: selectedRecord.raw?.caseStudy || '',
      notes: selectedRecord.raw?.notes || ''
    });
  }, [selectedRecord?.id]);

  const saveCaseStudy = async () => {
    if (!selectedRecord) return;
    try {
      setSaving(true);
      setMessage('');
      const mergedRaw = {
        ...selectedRecord.raw,
        source: 'henson_8000',
        result: form.result || 'Pending',
        diagnosis: form.diagnosis,
        caseStudy: form.caseStudy,
        notes: form.notes,
        lastUpdatedBy: user?.id || null,
        lastUpdatedByRole: user?.role || null,
        lastUpdatedAt: new Date().toISOString()
      };

      const payload = {
        machine_type: selectedRecord.machineType || 'henson_8000',
        eye: selectedRecord.eye || 'both',
        test_date: selectedRecord.testDate || new Date().toISOString(),
        raw_data: JSON.stringify(mergedRaw)
      };

      const updated = await window.electronAPI.updateTest(selectedRecord.id, payload);
      if (!updated?.success) {
        setMessage(updated?.error || 'Failed to update case study.');
        return;
      }

      setMessage('Case study updated successfully.');
      await loadCvfRecords();
    } catch (error) {
      console.error('CVF update error:', error);
      setMessage('Failed to update case study: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const analyzeHensonFile = async () => {
    try {
      const selection = await window.electronAPI.selectFile({
        title: 'Select Henson 8000 Export File',
        filters: [{ name: 'Henson Export Files', extensions: ['csv', 'txt', 'json', 'sqlite', 'db', 'pdf'] }]
      });
      const filePath = selection?.filePath || null;
      if (!filePath) return;
      const result = await window.electronAPI.analyzeHensonExport(filePath);
      if (!result?.success) {
        setMessage(result?.error || 'Analysis failed.');
        return;
      }
      setMessage(
        `Analyzed ${result.file?.name}: ${result.source_type}, ` +
        `estimated records ${result.estimate_records}, compatible=${result.henson_compatible ? 'yes' : 'no'}`
      );
    } catch (error) {
      setMessage('Analyze failed: ' + error.message);
    }
  };

  const importHensonFile = async () => {
    try {
      const selection = await window.electronAPI.selectFile({
        title: 'Import Henson 8000 Export',
        filters: [{ name: 'Henson Export Files', extensions: ['csv', 'txt', 'json', 'sqlite', 'db', 'pdf'] }]
      });
      const filePath = selection?.filePath || null;
      if (!filePath) return;
      const result = await window.electronAPI.importHensonExport({ filePath });
      if (!result?.success) {
        setMessage(result?.error || 'Import failed.');
        return;
      }
      setMessage(
        `Imported ${result?.summary?.imported_tests || 0} CVF tests. ` +
        `Created ${result?.summary?.patients_created || 0} patients, ` +
        `skipped ${result?.summary?.skipped_duplicates || 0} duplicates.`
      );
      await loadCvfRecords();
    } catch (error) {
      setMessage('Import failed: ' + error.message);
    }
  };

  const importHensonFolder = async () => {
    try {
      let chosen = folderPath;
      if (!chosen) {
        const selection = await window.electronAPI.selectFile({
          title: 'Select Henson Export Folder',
          properties: ['openDirectory']
        });
        chosen = selection?.filePath || null;
        if (!chosen) return;
        setFolderPath(chosen);
      }
      const result = await window.electronAPI.importHensonFolder({ folderPath: chosen });
      if (!result?.summary) {
        setMessage(result?.error || 'Folder import failed.');
        return;
      }
      setMessage(
        `Folder import done: ${result.summary.success_files}/${result.summary.total_files} files, ` +
        `${result.summary.imported_tests || 0} tests imported.`
      );
      await loadCvfRecords();
    } catch (error) {
      setMessage('Folder import failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">CVF Workspace</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          Shared doctor-assistant workflow for Henson 8000 import, result review, and case study updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={analyzeHensonFile} className="btn btn-secondary py-3 text-xs font-black uppercase tracking-widest">
          Analyze Henson Export
        </button>
        <button onClick={importHensonFile} className="btn btn-primary py-3 text-xs font-black uppercase tracking-widest">
          Import Henson File
        </button>
        <button onClick={importHensonFolder} className="btn btn-primary py-3 text-xs font-black uppercase tracking-widest">
          Import Henson Folder
        </button>
      </div>

      <div className="card-premium p-6">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Optional Folder Path</label>
        <input
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm"
          placeholder="C:\\Henson\\Exports"
        />
      </div>

      {message && (
        <div className="card-premium p-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Imported CVF Records</h3>
            <button onClick={loadCvfRecords} className="text-xs font-black text-indigo-600 uppercase tracking-wider">Refresh</button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading records...</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {records.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedId === r.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{r.patientName}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.eye.toUpperCase()} · {new Date(r.testDate || Date.now()).toLocaleString()}
                  </p>
                </button>
              ))}
              {!records.length && <p className="text-sm text-slate-500">No Henson CVF records yet.</p>}
            </div>
          )}
        </div>

        <div className="card-premium p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Case Study Editor</h3>
          {selectedRecord ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Patient</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedRecord.patientName}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Result</label>
                  <select
                    value={form.result}
                    onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  >
                    <option>Pending</option>
                    <option>Normal</option>
                    <option>Abnormal</option>
                    <option>Needs Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</label>
                  <input
                    value={form.diagnosis}
                    onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Case Study</label>
                <textarea
                  value={form.caseStudy}
                  onChange={(e) => setForm((p) => ({ ...p, caseStudy: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  placeholder="Clinical interpretation, progression, and treatment plan."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Assistant/Doctor Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <button
                onClick={saveCaseStudy}
                disabled={saving}
                className="btn btn-primary w-full py-3 text-xs font-black uppercase tracking-widest"
              >
                {saving ? 'Saving...' : 'Save Case Study'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a CVF record to edit case study and result fields.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVFWorkspaceContent;
