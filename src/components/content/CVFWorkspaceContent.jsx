import React, { useEffect, useMemo, useState } from 'react';
import useUser from '../../hooks/useUser';

const RESULT_OPTIONS = ['Pending', 'Normal', 'Abnormal', 'Needs Review'];

const parseRaw = (raw) => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch {
    return {};
  }
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const getSignoffStatus = (raw = {}) => {
  if (raw?.signoff?.status === 'signed_off' || raw?.signoff?.signedOffAt) {
    return 'Signed Off';
  }
  return 'Pending';
};

const pushAuditEntry = (raw = {}, entry = {}) => {
  const trail = Array.isArray(raw.auditTrail) ? raw.auditTrail : [];
  return {
    ...raw,
    auditTrail: [
      {
        action: entry.action,
        at: new Date().toISOString(),
        by: entry.by || null,
        role: entry.role || null,
        note: entry.note || ''
      },
      ...trail
    ].slice(0, 100)
  };
};

const CVFWorkspaceContent = () => {
  const { user } = useUser();
  const role = String(user?.role || '').toLowerCase();
  const canEditCaseStudy = role === 'assistant' || role === 'doctor';
  const canBatchUpdate = role === 'assistant';
  const canDoctorSignOff = role === 'doctor';

  const [activeTab, setActiveTab] = useState('workspace');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [attachingDocument, setAttachingDocument] = useState(false);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [form, setForm] = useState({ result: '', diagnosis: '', caseStudy: '', notes: '' });
  const [batchForm, setBatchForm] = useState({ result: '', diagnosis: '', notes: '' });
  const [boardFilters, setBoardFilters] = useState({
    search: '', result: 'all', signoff: 'all', eye: 'all', from: '', to: ''
  });
  const [folderPath, setFolderPath] = useState('');

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) || null,
    [records, selectedId]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const lowerSearch = boardFilters.search.trim().toLowerCase();
      if (lowerSearch) {
        const searchBucket = [
          r.patientName,
          r.patientId,
          r.raw?.diagnosis,
          r.raw?.result,
          r.raw?.caseStudy,
          r.raw?.notes
        ].join(' ').toLowerCase();
        if (!searchBucket.includes(lowerSearch)) return false;
      }

      if (boardFilters.result !== 'all' && String(r.raw?.result || 'Pending') !== boardFilters.result) {
        return false;
      }

      if (boardFilters.signoff !== 'all') {
        const status = getSignoffStatus(r.raw);
        if (boardFilters.signoff === 'signed' && status !== 'Signed Off') return false;
        if (boardFilters.signoff === 'pending' && status !== 'Pending') return false;
      }

      if (boardFilters.eye !== 'all' && String(r.eye || '').toLowerCase() !== boardFilters.eye) {
        return false;
      }

      if (boardFilters.from) {
        const fromDate = new Date(boardFilters.from);
        const recordDate = new Date(r.testDate || 0);
        if (recordDate < fromDate) return false;
      }

      if (boardFilters.to) {
        const toDate = new Date(boardFilters.to);
        toDate.setHours(23, 59, 59, 999);
        const recordDate = new Date(r.testDate || 0);
        if (recordDate > toDate) return false;
      }

      return true;
    });
  }, [records, boardFilters]);

  const selectedBoardRecords = useMemo(
    () => filteredRecords.filter((r) => selectedRowIds[r.id]),
    [filteredRecords, selectedRowIds]
  );

  const searchSuggestions = useMemo(() => {
    const seen = new Set();
    const suggestions = [];
    for (const record of records) {
      const label = `${record.patientName || 'Unknown Client'} (ID: ${record.patientId || 'N/A'})`;
      if (!seen.has(label)) {
        seen.add(label);
        suggestions.push(label);
      }
    }
    return suggestions.slice(0, 100);
  }, [records]);

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
            patientName: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown Client',
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
      setSelectedRowIds((prev) => {
        const next = {};
        for (const record of normalized) {
          if (prev[record.id]) next[record.id] = true;
        }
        return next;
      });
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
  const buildUpdatePayload = (record, rawData) => ({
    machine_type: record.machineType || 'henson_8000',
    eye: record.eye || 'both',
    test_date: record.testDate || new Date().toISOString(),
    raw_data: JSON.stringify(rawData)
  });

  const saveCaseStudy = async () => {
    if (!selectedRecord) return;
    if (!canEditCaseStudy) {
      setMessage('Only assistant and doctor can update case study content.');
      return;
    }
    try {
      setSaving(true);
      setMessage('');

      const withAudit = pushAuditEntry(selectedRecord.raw, {
        action: 'case-study-updated',
        by: user?.id,
        role,
        note: `Result set to ${form.result || 'Pending'}`
      });

      const mergedRaw = {
        ...withAudit,
        source: 'henson_8000',
        result: form.result || 'Pending',
        diagnosis: form.diagnosis,
        caseStudy: form.caseStudy,
        notes: form.notes,
        lastUpdatedBy: user?.id || null,
        lastUpdatedByRole: role || null,
        lastUpdatedAt: new Date().toISOString()
      };

      const updated = await window.electronAPI.updateTest(selectedRecord.id, buildUpdatePayload(selectedRecord, mergedRaw));
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

  const signOffCaseStudy = async (record, shouldSignOff) => {
    if (!record) return;
    if (!canDoctorSignOff) {
      setMessage('Only doctors can sign off case studies.');
      return;
    }

    try {
      setSigningOff(true);
      setMessage('');

      const now = new Date().toISOString();
      const action = shouldSignOff ? 'case-study-signed-off' : 'case-study-sign-off-revoked';
      const note = shouldSignOff ? 'Doctor sign off completed' : 'Doctor sign off revoked';
      const withAudit = pushAuditEntry(record.raw, { action, by: user?.id, role, note });

      const mergedRaw = {
        ...withAudit,
        source: 'henson_8000',
        signoff: shouldSignOff
          ? {
              status: 'signed_off',
              signedOffBy: user?.id || null,
              signedOffRole: role,
              signedOffAt: now
            }
          : {
              status: 'pending',
              signedOffBy: null,
              signedOffRole: null,
              signedOffAt: null
            },
        lastUpdatedBy: user?.id || null,
        lastUpdatedByRole: role || null,
        lastUpdatedAt: now
      };

      const updated = await window.electronAPI.updateTest(record.id, buildUpdatePayload(record, mergedRaw));
      if (!updated?.success) {
        setMessage(updated?.error || 'Failed to update sign-off status.');
        return;
      }

      setMessage(shouldSignOff ? 'Case study signed off.' : 'Case study sign-off revoked.');
      await loadCvfRecords();
    } catch (error) {
      console.error('CVF sign-off error:', error);
      setMessage('Failed to update sign-off: ' + error.message);
    } finally {
      setSigningOff(false);
    }
  };

  const applyBatchUpdate = async () => {
    if (!canBatchUpdate) {
      setMessage('Only assistants can run batch updates from Case Study Board.');
      return;
    }
    if (!selectedBoardRecords.length) {
      setMessage('Select at least one record from the Case Study Board.');
      return;
    }

    try {
      setBatchSaving(true);
      setMessage('');

      let successCount = 0;
      let failedCount = 0;

      for (const record of selectedBoardRecords) {
        const nextRaw = {
          ...record.raw,
          source: 'henson_8000',
          result: batchForm.result || record.raw?.result || 'Pending',
          diagnosis: batchForm.diagnosis || record.raw?.diagnosis || '',
          notes: batchForm.notes || record.raw?.notes || '',
          lastUpdatedBy: user?.id || null,
          lastUpdatedByRole: role || null,
          lastUpdatedAt: new Date().toISOString()
        };

        const withAudit = pushAuditEntry(nextRaw, {
          action: 'case-study-batch-updated',
          by: user?.id,
          role,
          note: 'Assistant batch update'
        });

        const updated = await window.electronAPI.updateTest(record.id, buildUpdatePayload(record, withAudit));
        if (updated?.success) {
          successCount += 1;
        } else {
          failedCount += 1;
        }
      }

      setMessage(`Batch update complete. Updated: ${successCount}, Failed: ${failedCount}.`);
      await loadCvfRecords();
    } catch (error) {
      console.error('CVF batch update error:', error);
      setMessage('Batch update failed: ' + error.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleAllFiltered = (checked) => {
    if (!filteredRecords.length) return;
    setSelectedRowIds((prev) => {
      const next = { ...prev };
      for (const record of filteredRecords) {
        if (checked) next[record.id] = true;
        else delete next[record.id];
      }
      return next;
    });
  };

  const attachSelectedCvfToDocuments = async () => {
    if (!selectedRecord) return;
    if (!canEditCaseStudy) {
      setMessage('Only assistant and doctor can attach CVF results to client documents from this page.');
      return;
    }
    try {
      setAttachingDocument(true);
      setMessage('');
      const res = await window.electronAPI.attachCvfToPatientDocuments(selectedRecord.id, {
        title: `CVF Case Study - ${selectedRecord.patientName}`
      });
      if (!res?.success) {
        setMessage(res?.error || 'Failed to attach CVF result to client documents.');
        return;
      }
      setMessage('CVF result attached to client documents successfully.');
    } catch (error) {
      console.error('Attach CVF document error:', error);
      setMessage('Failed to attach CVF document: ' + error.message);
    } finally {
      setAttachingDocument(false);
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
        `Created ${result?.summary?.patients_created || 0} clients, ` +
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

  const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedRowIds[r.id]);

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">CVF Workspace</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          Shared doctor-assistant workflow for Henson 8000 import, case study collaboration, and sign-off.
        </p>
      </div>

      <div className="card-premium p-2 inline-flex gap-2">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
            activeTab === 'workspace'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
          }`}
        >
          CVF Workspace
        </button>
        <button
          onClick={() => setActiveTab('board')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${
            activeTab === 'board'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
          }`}
        >
          Case Study Board
        </button>
      </div>

      {message && (
        <div className="card-premium p-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
          {message}
        </div>
      )}

      {activeTab === 'workspace' && (
        <>
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
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{r.patientName}</p>
                        <span className="text-[10px] px-2 py-1 rounded-full border border-slate-300 dark:border-slate-600 uppercase tracking-wider">
                          {getSignoffStatus(r.raw)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {String(r.eye || 'both').toUpperCase()} | {formatDateTime(r.testDate)}
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
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Client</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedRecord.patientName}</p>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Client ID: {selectedRecord.patientId || 'N/A'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Result</label>
                      <select
                        value={form.result}
                        onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
                      >
                        {RESULT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
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

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Doctor Sign-Off</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Status: <span className="font-bold">{getSignoffStatus(selectedRecord.raw)}</span>
                    </p>
                    {selectedRecord.raw?.signoff?.signedOffAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Signed at {formatDateTime(selectedRecord.raw.signoff.signedOffAt)} by {selectedRecord.raw.signoff.signedOffBy || 'Unknown'}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => signOffCaseStudy(selectedRecord, true)}
                        disabled={!canDoctorSignOff || signingOff}
                        className="btn btn-primary py-2 px-3 text-[10px] font-black uppercase tracking-widest"
                      >
                        {signingOff ? 'Saving...' : 'Doctor Sign Off'}
                      </button>
                      <button
                        onClick={() => signOffCaseStudy(selectedRecord, false)}
                        disabled={!canDoctorSignOff || signingOff}
                        className="btn btn-secondary py-2 px-3 text-[10px] font-black uppercase tracking-widest"
                      >
                        Revoke Sign Off
                      </button>
                    </div>
                    {!canDoctorSignOff && (
                      <p className="text-[11px] text-slate-500 mt-2">Only doctors can sign off or revoke sign-off.</p>
                    )}
                  </div>

              <button
                onClick={saveCaseStudy}
                disabled={saving || !canEditCaseStudy}
                className="btn btn-primary w-full py-3 text-xs font-black uppercase tracking-widest"
              >
                {saving ? 'Saving...' : 'Save Case Study'}
              </button>
              <button
                onClick={attachSelectedCvfToDocuments}
                disabled={attachingDocument || !canEditCaseStudy}
                className="btn btn-secondary w-full py-3 text-xs font-black uppercase tracking-widest"
              >
                {attachingDocument ? 'Attaching...' : 'Attach CVF To Client Documents'}
              </button>
              {!canEditCaseStudy && (
                <p className="text-[11px] text-slate-500">Admin is view-only here. Updates are allowed for assistant and doctor roles.</p>
              )}
            </div>
              ) : (
                <p className="text-sm text-slate-500">Select a CVF record to edit case study and result fields.</p>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Case Study Board Filters</h3>
              <button onClick={loadCvfRecords} className="text-xs font-black text-indigo-600 uppercase tracking-wider">Refresh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={boardFilters.search}
                onChange={(e) => setBoardFilters((p) => ({ ...p, search: e.target.value }))}
                placeholder="Search client name, client ID, diagnosis"
                list="cvf-client-search-list"
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <datalist id="cvf-client-search-list">
                {searchSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
              <select
                value={boardFilters.result}
                onChange={(e) => setBoardFilters((p) => ({ ...p, result: e.target.value }))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Results</option>
                {RESULT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={boardFilters.signoff}
                onChange={(e) => setBoardFilters((p) => ({ ...p, signoff: e.target.value }))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Sign-Off States</option>
                <option value="signed">Signed Off</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={boardFilters.eye}
                onChange={(e) => setBoardFilters((p) => ({ ...p, eye: e.target.value }))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              >
                <option value="all">All Eyes</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="both">Both</option>
              </select>
              <input
                type="date"
                value={boardFilters.from}
                onChange={(e) => setBoardFilters((p) => ({ ...p, from: e.target.value }))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <input
                type="date"
                value={boardFilters.to}
                onChange={(e) => setBoardFilters((p) => ({ ...p, to: e.target.value }))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="card-premium p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                {filteredRecords.length} record(s) found | {selectedBoardRecords.length} selected
              </p>
              <label className="text-xs font-semibold text-slate-500 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => toggleAllFiltered(e.target.checked)}
                />
                Select all filtered
              </label>
            </div>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3">Sel</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Client ID</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Eye</th>
                  <th className="py-2 pr-3">Result</th>
                  <th className="py-2 pr-3">Sign-Off</th>
                  <th className="py-2 pr-3">Last Update</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`border-b border-slate-100 dark:border-slate-800 ${selectedId === record.id ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''}`}
                    onClick={() => setSelectedId(record.id)}
                  >
                    <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedRowIds[record.id]}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedRowIds((prev) => {
                            const next = { ...prev };
                            if (checked) next[record.id] = true;
                            else delete next[record.id];
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 pr-3 font-semibold">{record.patientName}</td>
                    <td className="py-2 pr-3">{record.patientId || 'N/A'}</td>
                    <td className="py-2 pr-3">{formatDateTime(record.testDate)}</td>
                    <td className="py-2 pr-3 uppercase">{String(record.eye || 'both')}</td>
                    <td className="py-2 pr-3">{record.raw?.result || 'Pending'}</td>
                    <td className="py-2 pr-3">{getSignoffStatus(record.raw)}</td>
                    <td className="py-2 pr-3">{formatDateTime(record.raw?.lastUpdatedAt)}</td>
                    <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedId(record.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredRecords.length && <p className="text-sm text-slate-500 mt-3">No records match current filters.</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-premium p-6 space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Assistant Batch Update</h4>
              <p className="text-xs text-slate-500">
                Update selected records at once. Empty fields keep existing values. Only assistant role can apply this action.
              </p>
              <select
                value={batchForm.result}
                onChange={(e) => setBatchForm((p) => ({ ...p, result: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">Keep current result</option>
                {RESULT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                value={batchForm.diagnosis}
                onChange={(e) => setBatchForm((p) => ({ ...p, diagnosis: e.target.value }))}
                placeholder="Batch diagnosis (optional)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <textarea
                value={batchForm.notes}
                onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Batch notes (optional)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <button
                onClick={applyBatchUpdate}
                disabled={!canBatchUpdate || batchSaving}
                className="btn btn-primary w-full py-3 text-xs font-black uppercase tracking-widest"
              >
                {batchSaving ? 'Applying...' : 'Apply Batch Update'}
              </button>
              {!canBatchUpdate && (
                <p className="text-[11px] text-slate-500">This action is reserved for assistant role.</p>
              )}
            </div>

            <div className="card-premium p-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Audit Trail</h4>
              {selectedRecord ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {(Array.isArray(selectedRecord.raw?.auditTrail) ? selectedRecord.raw.auditTrail : []).map((entry, idx) => (
                    <div key={`${entry.at || 'na'}-${idx}`} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{entry.action || 'update'}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(entry.at)} | {entry.role || 'unknown-role'} | {entry.by || 'unknown-user'}
                      </p>
                      {entry.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{entry.note}</p>}
                    </div>
                  ))}
                  {!selectedRecord.raw?.auditTrail?.length && (
                    <p className="text-sm text-slate-500">No audit entries yet for this record.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a record from the board to view audit history.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVFWorkspaceContent;
