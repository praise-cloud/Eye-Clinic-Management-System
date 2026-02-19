#!/usr/bin/env python3
"""
SQL Server .BAK to SQLite Converter
Restores a SQL Server backup and converts it to SQLite
"""

import os
import sys
import subprocess
import sqlite3
import tempfile
import shutil
from pathlib import Path

def find_sql_server_instance():
    """Find available SQL Server instance."""
    instances = [
        'localhost\\SQLEXPRESS',
        'localhost\\MSSQLSERVER',
        'SQLEXPRESS',
        '.',
        'localhost'
    ]

    for instance in instances:
        try:
            if '\\' in instance:
                cmd = f'sqlcmd -S "{instance}" -E -C -Q "SELECT @@SERVERNAME" -w 100 -t 3'
            else:
                cmd = f'sqlcmd -S {instance} -E -C -Q "SELECT @@SERVERNAME" -w 100 -t 3'

            print(f"   Trying: {instance}...")
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout.strip():
                print(f"   ✅ Found SQL Server: {instance}")
                return instance
        except:
            continue

    print("   ❌ Could not find SQL Server instance")
    return None

def restore_bak_to_sql_server(bak_path, db_name, server):
    """Restore .BAK file to SQL Server using its data directory."""
    try:
        print(f"📦 Restoring {Path(bak_path).name} to SQL Server...")

        # Build server string
        server_str = server if '\\' in server else f'localhost\\{server}'

        # Get SQL Server data directory from master database location
        cmd = f'sqlcmd -S "{server_str}" -E -C -Q "SELECT physical_name FROM sys.master_files WHERE database_id = 1 AND file_id = 1" -w 200 -h -1'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)

        data_dir = None
        if result.returncode == 0:
            master_path = result.stdout.strip()
            if master_path:
                data_dir = str(Path(master_path).parent)

        if not data_dir:
            data_dir = "C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\DATA"

        data_file = os.path.join(data_dir, f"{db_name}.mdf")
        log_file = os.path.join(data_dir, f"{db_name}_log.ldf")

        print(f"   Using data directory: {data_dir}")

        # Build RESTORE command with MOVE to SQL Server data directory
        restore_sql = f"""
RESTORE DATABASE [{db_name}]
FROM DISK = N'{bak_path}'
WITH
    REPLACE,
    RECOVERY,
    STATS = 10,
    MOVE 'MedicalAdmin' TO N'{data_file}',
    MOVE 'MedicalAdmin_log' TO N'{log_file}'
"""

        # Write SQL to temp file
        sql_file = os.path.join(tempfile.gettempdir(), f"restore_{db_name}.sql")
        with open(sql_file, 'w') as f:
            f.write(restore_sql)

        cmd = f'sqlcmd -S "{server_str}" -E -C -i "{sql_file}" -w 200'
        print(f"   Restoring from: {Path(bak_path).name}")
        print(f"   Data file: {data_file}")
        print(f"   Log file: {log_file}")

        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)

        # Clean up temp SQL file
        try:
            os.remove(sql_file)
        except:
            pass

        if result.returncode != 0:
            print(f"❌ Restore failed:")
            print(f"   Error: {result.stderr[:400]}")
            return False

        print(f"   ✅ Database restored successfully")
        return True

    except Exception as e:
        print(f"❌ Error during restore: {e}")
        return False

def export_sql_server_to_csv(server, db_name, output_dir):
    """Export all tables from SQL Server to CSV files."""
    try:
        print(f"📊 Exporting tables from SQL Server to CSV...")

        # Build server string
        server_str = server if '\\' in server else f'localhost\\{server}'

        # Get list of tables
        tables_sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'"

        cmd = f'sqlcmd -S "{server_str}" -E -C -d "{db_name}" -Q "{tables_sql}" -h -1 -W -w 100'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)

        if result.returncode != 0:
            print(f"❌ Failed to get table list: {result.stderr[:200]}")
            return False

        tables = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        print(f"   Found {len(tables)} tables")

        if not tables:
            print("⚠️  No tables found in database")
            return False

        # Export each table
        exported_count = 0
        for table in tables:
            try:
                csv_file = os.path.join(output_dir, f"{table}.csv")

                # Use sqlcmd to export with pipe delimiter
                query = f"SELECT * FROM [{db_name}].[dbo].[{table}]"
                cmd = f'sqlcmd -S "{server_str}" -E -C -d "{db_name}" -Q "{query}" -s "|" -W -w 1000 -o "{csv_file}"'

                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)

                if result.returncode == 0 and os.path.exists(csv_file):
                    file_size = os.path.getsize(csv_file)
                    print(f"   ✓ Exported: {table} ({file_size / 1024:.1f} KB)")
                    exported_count += 1
                else:
                    print(f"   ⚠ Warning: Could not export {table}")

            except Exception as e:
                print(f"   ⚠ Error exporting {table}: {str(e)[:100]}")

        print(f"   Exported {exported_count}/{len(tables)} tables")
        return True

    except Exception as e:
        print(f"❌ Error exporting CSV: {e}")
        return False

def import_csv_to_sqlite(csv_dir, sqlite_db):
    """Import CSV files into SQLite."""
    try:
        print(f"💾 Importing CSV files to SQLite...")

        conn = sqlite3.connect(sqlite_db)
        cursor = conn.cursor()

        csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
        print(f"   Found {len(csv_files)} CSV files")

        for csv_file in csv_files:
            table_name = csv_file.replace('.csv', '')
            csv_path = os.path.join(csv_dir, csv_file)

            try:
                with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
                    # Read first line to get headers
                    first_line = f.readline().strip()
                    if not first_line:
                        continue

                    # Create table with generic columns
                    columns = [col.strip() for col in first_line.split('|')]
                    col_defs = ', '.join([f'"{col}" TEXT' for col in columns])

                    cursor.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({col_defs})')

                    # Insert data rows
                    f.seek(0)
                    for i, line in enumerate(f):
                        if i == 0:  # Skip header
                            continue

                        values = [v.strip() for v in line.strip().split('|')]
                        if len(values) == len(columns):
                            placeholders = ', '.join(['?' for _ in columns])
                            col_names = ', '.join([f'"{c}"' for c in columns])
                            cursor.execute(
                                f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})',
                                values
                            )

                conn.commit()
                print(f"   ✓ Imported: {table_name}")

            except Exception as e:
                print(f"   ⚠ Warning: Could not import {table_name}: {e}")

        conn.close()
        print(f"✅ Successfully imported CSV files to SQLite")
        return True

    except Exception as e:
        print(f"❌ Error importing CSV: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python restore_bak_to_sqlite.py <input.bak> <output.sqlite>")
        sys.exit(1)

    bak_file = sys.argv[1]
    sqlite_file = sys.argv[2]

    # Validate input
    if not os.path.exists(bak_file):
        print(f"❌ Error: {bak_file} does not exist")
        sys.exit(1)

    print("=" * 60)
    print("SQL Server BAK → SQLite Converter")
    print("=" * 60)
    print(f"Input:  {bak_file}")
    print(f"Output: {sqlite_file}")
    print()

    # Step 1: Find SQL Server
    print("1️⃣  Finding SQL Server instance...")
    server = find_sql_server_instance()
    if not server:
        print("❌ Error: Could not find SQL Server instance")
        print()
        print("Troubleshooting:")
        print("  1. Ensure SQL Server Express is installed and running")
        print("  2. Check Services (services.msc) → SQL Server state")
        print("  3. Ensure network connectivity is enabled")
        print()
        sys.exit(1)

    print(f"   Using server: {server}")
    print()

    # Step 2: Restore backup
    db_name = "EyeClinicRestore"
    print(f"2️⃣  Restoring backup...")
    if not restore_bak_to_sql_server(bak_file, db_name, server):
        print()
        print("❌ Restoration failed. Possible causes:")
        print("  1. Backup file is corrupted")
        print("  2. SQL Server doesn't have sufficient disk space")
        print("  3. Incompatible SQL Server versions")
        sys.exit(1)

    print()

    # Step 3: Export to CSV
    csv_temp_dir = os.path.join(tempfile.gettempdir(), 'eye_clinic_export')
    os.makedirs(csv_temp_dir, exist_ok=True)

    print(f"3️⃣  Exporting to CSV...")
    if not export_sql_server_to_csv(server, db_name, csv_temp_dir):
        print("⚠️  Warning: CSV export had issues, data may be incomplete")

    print()

    # Step 4: Import to SQLite
    print(f"4️⃣  Creating SQLite database...")
    if not import_csv_to_sqlite(csv_temp_dir, sqlite_file):
        print()
        print("❌ SQLite import failed")
        sys.exit(1)

    print()

    # Cleanup
    print(f"5️⃣  Cleaning up temporary files...")
    shutil.rmtree(csv_temp_dir, ignore_errors=True)

    print()
    print("=" * 60)
    file_size_mb = os.path.getsize(sqlite_file) / (1024 * 1024)
    print(f"✅ SUCCESS: Created {sqlite_file}")
    print(f"   Size: {file_size_mb:.2f} MB")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Open Eye Clinic app")
    print("  2. Login as Admin")
    print("  3. Go to Admin Dashboard")
    print("  4. Click 'Import External Intelligence'")
    print(f"  5. Select: {sqlite_file}")
    print()

if __name__ == "__main__":
    main()
