const { ipcMain } = require('electron');

const mapDatabaseError = (error, context = {}) => {
  const rawMessage = String(error && error.message ? error.message : '').trim();
  const base = { code: 'error.generic', table: null, column: null, raw: rawMessage, message: rawMessage || 'An unexpected error occurred while accessing the database.' };

  if (!rawMessage || !rawMessage.includes('SQLITE_CONSTRAINT')) return base;

  let table = null, column = null;
  const uniqueMatch = rawMessage.match(/UNIQUE constraint failed: ([\w_]+)\.([\w_]+)/i);
  if (uniqueMatch) {
    table = uniqueMatch[1]; column = uniqueMatch[2];
    let userMessage = 'This value is already used. Please choose a different value.';
    if (`${table}.${column}` === 'users.email') userMessage = 'A user with this email already exists.';
    else if (`${table}.${column}` === 'patients.patient_id') userMessage = 'A patient with this ID already exists.';
    else if (`${table}.${column}` === 'inventory.item_code') userMessage = 'An inventory item with this Unit Code already exists.';
    else if (`${table}.${column}` === 'pharmacy_drugs.drug_code') userMessage = 'A drug with this code already exists.';
    else if (`${table}.${column}` === 'settings.key') userMessage = 'A setting with this key already exists.';
    return { code: `constraint.unique.${table}.${column}`, table, column, raw: rawMessage, message: userMessage };
  }

  if (/FOREIGN KEY constraint failed/i.test(rawMessage)) {
    let userMessage = 'This record is linked to other data and cannot be changed.';
    if (context.entity === 'patient') userMessage = 'This patient has related tests or reports and cannot be deleted.';
    else if (context.entity === 'user') userMessage = 'This user is linked to other records and cannot be deleted.';
    return { code: 'constraint.foreign_key', table: null, column: null, raw: rawMessage, message: userMessage };
  }

  const notNullMatch = rawMessage.match(/NOT NULL constraint failed: ([\w_]+)\.([\w_]+)/i);
  if (notNullMatch) {
    table = notNullMatch[1]; column = notNullMatch[2];
    return { code: `constraint.not_null.${table}.${column}`, table, column, raw: rawMessage, message: `The field "${column.replace(/_/g, ' ')}" is required.` };
  }

  if (rawMessage.includes('CHECK constraint failed')) {
    let userMessage = 'One of the values is not allowed.';
    if (rawMessage.includes('users.role')) userMessage = 'The selected role is not valid. Choose admin, doctor, or assistant.';
    return { code: 'constraint.check', table: null, column: null, raw: rawMessage, message: userMessage };
  }

  return base;
};

const buildErrorResponse = (error, context = {}, extra = {}) => ({
  success: false,
  error: mapDatabaseError(error, context).message,
  ...extra
});

const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

module.exports = { mapDatabaseError, buildErrorResponse, getTimeAgo };
