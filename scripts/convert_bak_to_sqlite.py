import os
import sqlite3
import subprocess
import sys
import csv
import shutil

def is_valid_sqlite(file_path):
    """Check if the file is a valid SQLite database."""
    try:
        with sqlite3.connect(file_path) as conn:
            conn.execute("SELECT name FROM sqlite_master LIMIT 1;")
        return True
    except sqlite3.DatabaseError:
        return False

def is_sql_dump(file_path):
    """Check if the file contains SQL dump data."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(1000)
            return 'CREATE TABLE' in content or 'INSERT INTO' in content
    except Exception:
        return False

def parse_sql_dump(file_path, output_file):
    """Parse a SQL dump file and create an SQLite database."""
    try:
        conn = sqlite3.connect(output_file)
        cursor = conn.cursor()

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            sql_content = f.read()
            # Execute SQL commands
            for statement in sql_content.split(';'):
                statement = statement.strip()
                if statement:
                    try:
                        cursor.execute(statement)
                    except sqlite3.Error as e:
                        print(f"Warning: Failed to execute statement: {e}")
                        continue

        conn.commit()
        conn.close()
        print(f"Parsed SQL dump from {file_path} to {output_file}")
        return True
    except Exception as e:
        print(f"Error parsing SQL dump: {e}")
        return False

def extract_from_csv_like_format(file_path, output_file):
    """Try to extract data from CSV-like or text-based formats."""
    try:
        conn = sqlite3.connect(output_file)
        cursor = conn.cursor()

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        if len(lines) < 2:
            return False

        # Try to detect separators
        first_line = lines[0].strip()
        separators = [',', '\t', '|', ';']
        separator = None

        for sep in separators:
            if sep in first_line:
                separator = sep
                break

        if not separator:
            return False

        # Parse headers
        headers = [h.strip() for h in first_line.split(separator)]
        table_name = 'imported_data'

        # Create table
        columns_def = ', '.join([f'{h} TEXT' for h in headers])
        cursor.execute(f"CREATE TABLE {table_name} ({columns_def});")

        # Insert rows
        for line in lines[1:]:
            if not line.strip():
                continue
            values = [v.strip() for v in line.split(separator)]
            if len(values) == len(headers):
                placeholders = ', '.join(['?' for _ in values])
                cursor.execute(f"INSERT INTO {table_name} VALUES ({placeholders});", values)

        conn.commit()
        conn.close()
        print(f"Extracted data from {file_path} to {output_file}")
        return True
    except Exception as e:
        print(f"Error extracting from CSV-like format: {e}")
        return False

def try_restore_with_sql_server(bak_file, database_name, output_file):
    """Try to restore using SQL Server tools (if available)."""
    try:
        # Check if sqlcmd is available
        subprocess.check_output('where sqlcmd', shell=True, stderr=subprocess.STDOUT)

        restore_command = (
            f"sqlcmd -S localhost -Q \"RESTORE DATABASE [{database_name}] FROM DISK = '{bak_file}' WITH REPLACE\""
        )
        subprocess.check_call(restore_command, shell=True)
        print(f"Restored {bak_file} to SQL Server database {database_name}.")
        return True
    except subprocess.CalledProcessError:
        return False
    except Exception as e:
        print(f"SQL Server restore attempt failed: {e}")
        return False

def convert_bak_to_sqlite(bak_file, output_file):
    """Convert .bak file to SQLite using multiple strategies."""
    try:
        print(f"Attempting to convert {bak_file} to SQLite...")

        # Strategy 1: Check if it's already a valid SQLite database
        print("Strategy 1: Checking if file is valid SQLite...")
        if is_valid_sqlite(bak_file):
            print("File is already a valid SQLite database. Copying...")
            shutil.copy(bak_file, output_file)
            print(f"Successfully copied {bak_file} to {output_file}")
            return True

        # Strategy 2: Check if it's a SQL dump file
        print("Strategy 2: Checking if file is SQL dump...")
        if is_sql_dump(bak_file):
            print("File appears to be SQL dump. Parsing...")
            if parse_sql_dump(bak_file, output_file):
                return True

        # Strategy 3: Try to extract from CSV-like format
        print("Strategy 3: Attempting to extract from CSV-like format...")
        if extract_from_csv_like_format(bak_file, output_file):
            return True

        # Strategy 4: Try to restore with SQL Server (if available)
        print("Strategy 4: Attempting SQL Server restoration...")
        database_name = "TempDatabase"
        if try_restore_with_sql_server(bak_file, database_name, output_file):
            return True

        # All strategies failed
        print("Error: Unable to convert .bak file using any available strategy.")
        print("Please ensure the .bak file is in one of the following formats:")
        print("  - SQLite database file")
        print("  - SQL dump file (with CREATE TABLE and INSERT statements)")
        print("  - CSV or text-based format with headers")
        print("  - SQL Server backup (requires SQL Server to be installed locally)")
        return False

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_bak_to_sqlite.py <input.bak> <output.sqlite>")
        sys.exit(1)

    bak_file = sys.argv[1]
    output_file = sys.argv[2]

    if not os.path.exists(bak_file):
        print(f"Error: {bak_file} does not exist.")
        sys.exit(1)

    success = convert_bak_to_sqlite(bak_file, output_file)
    sys.exit(0 if success else 1)