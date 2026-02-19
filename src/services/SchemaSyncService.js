const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

/**
 * SchemaSyncService
 * Handles automatic schema detection, comparison, and synchronization
 * between imported databases and the main app database
 */
class SchemaSyncService {
    /**
     * Get all tables from a database
     */
    async getTables(dbPath) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) return reject(err);

                db.all(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                    (err, tables) => {
                        db.close();
                        if (err) reject(err);
                        else resolve(tables.map(t => t.name));
                    }
                );
            });
        });
    }

    /**
     * Get table schema (columns and their info)
     */
    async getTableSchema(dbPath, tableName) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) return reject(err);

                db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(columns || []);
                });
            });
        });
    }

    /**
     * Get all data from a table in the imported database
     */
    async getTableData(dbPath, tableName, limit = 10000) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) return reject(err);

                db.all(`SELECT * FROM ${tableName} LIMIT ${limit}`, (err, rows) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        });
    }

    /**
     * Analyze imported database and suggest table mappings
     */
    async analyzeImportedSchema(importedDbPath, appDb) {
        try {
            const importedTables = await this.getTables(importedDbPath);
            const analysis = {
                tables: [],
                newTables: [],
                modifiedTables: [],
                totalRows: {}
            };

            for (const tableName of importedTables) {
                const schema = await this.getTableSchema(importedDbPath, tableName);
                const columns = schema.map(col => ({
                    name: col.name,
                    type: col.type,
                    notnull: col.notnull,
                    pk: col.pk
                }));

                // Get row count
                const countResult = await new Promise((resolve) => {
                    const db = new sqlite3.Database(importedDbPath, (err) => {
                        if (err) return resolve(0);
                        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                            db.close();
                            resolve(row?.count || 0);
                        });
                    });
                });

                analysis.totalRows[tableName] = countResult;

                // Check if table exists in app database
                const existingTable = await appDb.get(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                    [tableName]
                );

                if (existingTable) {
                    // Table exists - check for schema differences
                    const existingSchema = await appDb.all(`PRAGMA table_info(${tableName})`);
                    const existingColumns = new Set(existingSchema.map(col => col.name));
                    const importedColumns = new Set(columns.map(col => col.name));

                    const newColumns = columns.filter(col => !existingColumns.has(col.name));
                    const removedColumns = existingSchema.filter(col => !importedColumns.has(col.name));

                    if (newColumns.length > 0 || removedColumns.length > 0) {
                        analysis.modifiedTables.push({
                            tableName,
                            newColumns,
                            removedColumns,
                            existingColumns: Array.from(existingColumns),
                            importedColumns: columns
                        });
                    }
                } else {
                    // Table is new
                    analysis.newTables.push({
                        tableName,
                        columns,
                        rowCount: countResult
                    });
                }

                analysis.tables.push({
                    tableName,
                    columnCount: columns.length,
                    columns,
                    rowCount: countResult,
                    exists: !!existingTable
                });
            }

            return analysis;
        } catch (error) {
            console.error('Schema analysis error:', error);
            throw error;
        }
    }

    /**
     * Create a new table in the app database based on imported schema
     */
    async createTableFromSchema(appDb, tableName, columns) {
        try {
            // Generate CREATE TABLE statement
            const columnDefs = columns.map(col => {
                let def = `"${col.name}" ${col.type}`;
                if (col.pk) def += ' PRIMARY KEY';
                if (col.notnull) def += ' NOT NULL';
                return def;
            }).join(',\n    ');

            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS "${tableName}" (
                    ${columnDefs}
                )
            `;

            await appDb.run(createTableSQL);
            return { success: true, tableName };
        } catch (error) {
            console.error(`Error creating table ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Add missing columns to an existing table
     */
    async addMissingColumns(appDb, tableName, newColumns) {
        try {
            for (const col of newColumns) {
                const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`;
                await appDb.run(alterSQL);
            }
            return { success: true, tableName, columnsAdded: newColumns.length };
        } catch (error) {
            console.error(`Error adding columns to ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Synchronize schema between imported and app database
     */
    async synchronizeSchema(appDb, importedDbPath) {
        try {
            const analysis = await this.analyzeImportedSchema(importedDbPath, appDb);
            const results = {
                created: [],
                modified: [],
                errors: []
            };

            // Create new tables
            for (const newTable of analysis.newTables) {
                try {
                    await this.createTableFromSchema(appDb, newTable.tableName, newTable.columns);
                    results.created.push({
                        tableName: newTable.tableName,
                        columnCount: newTable.columns.length
                    });
                } catch (err) {
                    results.errors.push({
                        tableName: newTable.tableName,
                        error: err.message
                    });
                }
            }

            // Add missing columns to existing tables
            for (const modTable of analysis.modifiedTables) {
                try {
                    if (modTable.newColumns.length > 0) {
                        await this.addMissingColumns(appDb, modTable.tableName, modTable.newColumns);
                        results.modified.push({
                            tableName: modTable.tableName,
                            columnsAdded: modTable.newColumns.length
                        });
                    }
                } catch (err) {
                    results.errors.push({
                        tableName: modTable.tableName,
                        error: err.message
                    });
                }
            }

            return {
                success: results.errors.length === 0,
                analysis,
                results
            };
        } catch (error) {
            console.error('Schema synchronization error:', error);
            throw error;
        }
    }

    /**
     * Import data from imported database to app database
     */
    async importTableData(appDb, importedDbPath, tableName) {
        try {
            // Get data from imported database
            const data = await this.getTableData(importedDbPath, tableName);

            if (data.length === 0) {
                return { success: true, tableName, rowsImported: 0 };
            }

            // Get schema info
            const schema = await this.getTableSchema(importedDbPath, tableName);
            const columns = schema.map(col => col.name);

            // Prepare insert statement
            const placeholders = columns.map(() => '?').join(',');
            const columnList = columns.map(col => `"${col}"`).join(',');
            const insertSQL = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`;

            // Import data
            await appDb.run('BEGIN TRANSACTION');
            let imported = 0;

            for (const row of data) {
                const values = columns.map(col => {
                    const val = row[col];
                    // Handle special cases
                    if (val === null || val === undefined) return null;
                    if (val === 'NULL') return null;
                    return val;
                });

                try {
                    await appDb.run(insertSQL, values);
                    imported++;
                } catch (err) {
                    // Log but continue on unique constraint or similar errors
                    console.warn(`Row insert error for ${tableName}:`, err.message);
                }
            }

            await appDb.run('COMMIT');
            return { success: true, tableName, rowsImported: imported };
        } catch (error) {
            try {
                await appDb.run('ROLLBACK');
            } catch {}
            console.error(`Error importing data for ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Get table metadata for UI generation
     */
    async getTableMetadata(appDb, tableName) {
        try {
            const schema = await appDb.all(`PRAGMA table_info(${tableName})`);
            const countResult = await appDb.get(`SELECT COUNT(*) as count FROM ${tableName}`);

            return {
                tableName,
                columns: schema.map(col => ({
                    name: col.name,
                    type: col.type.toUpperCase(),
                    displayName: col.name
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' '),
                    notnull: col.notnull === 1,
                    pk: col.pk === 1
                })),
                rowCount: countResult?.count || 0
            };
        } catch (error) {
            console.error(`Error getting metadata for ${tableName}:`, error);
            throw error;
        }
    }
}

module.exports = new SchemaSyncService();
