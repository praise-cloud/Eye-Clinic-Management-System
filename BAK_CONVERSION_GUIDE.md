# .BAK File Conversion & Import Guide

## Overview
This guide explains how to import legacy clinic data from `.bak` files created by the previous .NET/C# system.

## Supported File Formats

The application now supports the following formats for importing legacy data:

### 1. **SQLite Database Files** (Recommended)
- **File Extensions**: `.db`, `.sqlite`, `.bak`
- **How it works**: If the `.bak` file is already an SQLite database, it will be copied directly.
- **Requirements**: None - works immediately

### 2. **SQL Dump Files**
- **File Extensions**: `.sql`, `.bak`, `.txt`
- **How it works**: Files containing SQL CREATE TABLE and INSERT statements
- **Requirements**: None - the system will parse and execute the SQL statements

### 3. **CSV or Text-Based Files**
- **File Extensions**: `.csv`, `.tsv`, `.txt`, `.bak`
- **How it works**: Files with headers in the first row and data rows below
- **Supported Separators**: Comma (,), Tab (	), Pipe (|), Semicolon (;)
- **Requirements**: None - the system will detect the format and create tables automatically

### 4. **SQL Server Backups** (Advanced)
- **File Extensions**: `.bak`
- **How it works**: True SQL Server backup files (requires SQL Server to be installed locally)
- **Requirements**:
  - SQL Server installed on the same machine
  - `sqlcmd` and `bcp` tools in system PATH

## Step-by-Step Import Process

### Method 1: Direct Import (Easiest)
1. Click **"Import External Intelligence"** button in Admin Dashboard
2. Select your `.bak` file
3. The system will automatically detect the format and convert it
4. If successful, you'll see: "Database imported successfully. Please restart the application."
5. Restart the application

### Method 2: Manual Conversion (If Auto-Conversion Fails)

#### If your .bak file is from the old .NET/C# system:

**Option A: Export as SQL Dump**
1. Use the original system to export data as SQL dump (`.sql` file)
2. Follow Method 1 with the SQL dump file
3. The system will parse and import it automatically

**Option B: Export as CSV**
1. Use the original system to export data as CSV
2. Ensure the first row contains column headers
3. Use any common separator (comma, tab, etc.)
4. Follow Method 1 with the CSV file
5. Data will be imported to a table called `imported_data`

**Option C: Convert using Database Tool**
1. If you have access to the original database system
2. Use a migration tool to convert to SQLite directly
3. Then import using the application

## Troubleshooting

### Error: "not an SQLite database"
**Cause**: The `.bak` file is not in a recognized format.

**Solutions**:
1. **Verify file format**:
   - Check if it's truly a SQLite database using a database explorer
   - Open the file with a hex editor to check the header (should start with `SQLite format`)

2. **Convert the file manually**:
   - Export from the original system as CSV or SQL dump
   - Use Python tools or online converters if needed
   - Re-import the converted file

3. **Check SQL Server option**:
   - If it's a SQL Server backup, ensure SQL Server is installed locally
   - Run: `where sqlcmd` in Command Prompt to verify tool availability
   - Try importing again

### Error: "No file selected"
**Cause**: User canceled the file selection dialog.

**Solution**: Try again and select a valid file.

### Error: "Failed to convert the .bak file"
**Cause**: The conversion process encountered an issue.

**Debug Steps**:
1. Check the browser console for detailed error messages
2. Verify the file is not corrupted
3. Try exporting from the original system in a different format
4. Check if the file has proper read permissions

## Data Mapping

When importing legacy data, the following tables are automatically recognized and mapped:

| Legacy Table Name | New Table Name | Mapped To |
|--|--|--|
| patients, clients, customer | patients | Clinic patients |
| users, staff, employees | users | System users |
| tests, exams, examinations | tests | Patient test results |
| inventory, items, stock | inventory | Clinic inventory |
| chat, messages | chat | Messages |

## File Size Limits
- Maximum file size: Limited by available disk space
- Recommended: Files under 500MB for optimal performance

## Post-Import Steps

1. **Verify Data**:
   - Check patients, users, inventory records
   - Ensure data integrity

2. **Restart Application**:
   - Close and reopen the application
   - Changes will take effect

3. **Backup New Database**:
   - Create a backup immediately after import
   - Use the "Create Backup" button in Admin Dashboard

## Advanced: Manual Python Script Usage

If you need to convert files outside the application:

```bash
python scripts/convert_bak_to_sqlite.py input_file.bak output_file.sqlite
```

This will:
1. Check if file is valid SQLite → copy it
2. Try to parse as SQL dump → create SQLite database
3. Try to extract from CSV/text format → create SQLite database
4. Try SQL Server restoration → export to SQLite
5. Report failure with specific format requirements

## Contact Support

If you encounter issues:
1. Note the exact error message
2. Check the file format with a database tool
3. Try converting to CSV first
4. Contact support with the error details

## Success Indicators

After successful import, you should see:
- ✅ No error messages in the dialog
- ✅ "Database imported successfully" message
- ✅ Data appears after restart in respective sections
- ✅ Users, patients, and inventory records are accessible
