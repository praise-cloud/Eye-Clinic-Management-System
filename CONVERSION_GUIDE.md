# BAK to SQLite Conversion - Quick Reference

## File Location
The conversion script and output files are located in the **project root directory**:
```
c:\Users\georg\Documents\work\My Work\Eye_Clinic_Management\eye_management_software\eye-clinic-backup-safe\eye-clinic\
```

## Current Converted Database
- **File**: `converted_clinic_backup.sqlite` (27 MB)
- **Created**: Feb 19, 2026
- **Contains**: 38 tables with all clinic data
  - Patient records (PatientRegister)
  - Medical history (CaseHistory)
  - Financial records (AR_*, PurchHDR, etc.)
  - Inventory (StockTable, Equipment, etc.)
  - All other clinic operations data

## How to Convert New .BAK Files

### Simple Usage
```bash
cd "c:\Users\georg\Documents\work\My Work\Eye_Clinic_Management\eye_management_software\eye-clinic-backup-safe\eye-clinic"
python scripts/restore_bak_to_sqlite.py "PATH_TO_BAK_FILE" "output_name.sqlite"
```

### Examples

**Example 1: Convert new backup with date**
```bash
python scripts/restore_bak_to_sqlite.py "C:\Users\Public\MedicalAdmin_20260220.BAK" "clinic_backup_20260220.sqlite"
```

**Example 2: Convert from different location**
```bash
python scripts/restore_bak_to_sqlite.py "D:\backups\clinic_data.BAK" "clinic_data_converted.sqlite"
```

**Example 3: Update existing conversion**
```bash
python scripts/restore_bak_to_sqlite.py "C:\Users\Public\MedicalAdmin_20240510.BAK" "converted_clinic_backup.sqlite"
```

## What the Script Does

1. **Finds SQL Server** - Automatically detects localhost\SQLEXPRESS
2. **Restores Backup** - Restores .BAK file to temporary SQL Server database
3. **Exports Tables** - Exports all 38+ tables from SQL Server
4. **Converts to SQLite** - Creates proper SQLite database with all data
5. **Cleans Up** - Removes temporary files

## Important Notes

- ✅ **SSL Support** - Script handles SSL certificate trust (-C flag)
- ✅ **Windows Auth** - Uses Windows authentication (PRAISE\george)
- ✅ **SQL Server 2022** - Compatible with MSSQL17.SQLEXPRESS
- ✅ **Automatic Detection** - Finds SQL Server instance automatically
- ⏱️ **Processing Time** - Typical conversion takes 30-60 seconds

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not find SQL Server" | Ensure SQL Server Express is running (Services.msc) |
| "Login failed" | Use Windows auth; ensure PRAISE\george can access |
| "File not found" error | Verify .BAK file path exists |
| Slow performance | Check disk space; close other applications |

## Using the Converted Database

Once converted, the SQLite file can be:
1. Imported into Eye Clinic app (Admin Dashboard)
2. Backed up separately
3. Used as read-only archive
4. Shared with team members

---

**Script Location**: `scripts/restore_bak_to_sqlite.py`
**Last Updated**: Feb 19, 2026
**Status**: ✅ Production Ready
