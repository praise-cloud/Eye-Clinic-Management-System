import React, { useState, useEffect } from 'react';

/**
 * DynamicTableView Component
 * Displays table data dynamically based on schema metadata
 * Used for displaying newly imported tables from external databases
 */
const DynamicTableView = ({ tableName, metadata, onClose }) => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 });
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    loadTableData();
  }, [tableName, pagination.page, pagination.pageSize]);

  const loadTableData = async () => {
    if (!tableName) {
      setError('No table selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call Electron API to get table data
      if (!window.electronAPI || !window.electronAPI.getTableData) {
        setError('Table data retrieval not available');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.getTableData({
        tableName,
        limit: pagination.pageSize,
        offset: pagination.page * pagination.pageSize
      });

      if (!result?.success) {
        setError(result?.error || 'Failed to load table data');
      } else {
        setTableData(result.data || []);
        setTotalRows(Number(result.total || 0));
      }
    } catch (err) {
      console.error('Error loading table data:', err);
      setError(err.message || 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  if (!tableName) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">No table selected. Please select a table to view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Table: <span className="text-indigo-600 dark:text-indigo-400">{tableName}</span>
          </h3>
          {metadata && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {metadata.columnCount || 0} columns • {metadata.rowCount || 0} rows
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border border-indigo-300 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading table data...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && tableData.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  {Object.keys(tableData[0]).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {Object.values(row).map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate"
                        title={String(value)}
                      >
                        {value === null || value === undefined ? (
                          <span className="text-slate-400 dark:text-slate-500 italic">NULL</span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tableData.length === 0 && (
        <div className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-lg">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400">No data available in this table</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && tableData.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          {(() => {
            const rowCount = Number(metadata?.rowCount ?? totalRows ?? 0);
            return (
              <>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing {pagination.page * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.page + 1) * pagination.pageSize, rowCount)} of{' '}
            {rowCount} rows
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: Math.max(0, pagination.page - 1) })}
              disabled={pagination.page === 0}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={(pagination.page + 1) * pagination.pageSize >= rowCount}
              className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Next
            </button>
          </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default DynamicTableView;
