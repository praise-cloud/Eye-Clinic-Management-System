import os
import sqlite3
import subprocess
import csv
import sys

def restore_bak_to_sql_server(bak_file, database_name):
    """Restore the .bak file to a SQL Server database."""
    try:
        restore_command = (
            f"sqlcmd -S localhost -Q \"RESTORE DATABASE [{database_name}] FROM DISK = '{bak_file}' WITH REPLACE\""
        )
        subprocess.check_call(restore_command, shell=True)
        print(f"Restored {bak_file} to SQL Server database {database_name}.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error restoring .bak file: {e}")
        return False

def export_sql_server_to_csv(database_name, export_dir):
    """Export tables from SQL Server database to CSV files."""
    try:
        os.makedirs(export_dir, exist_ok=True)

        # Fetch table names
        fetch_tables_command = (
            f"sqlcmd -S localhost -Q \"SELECT TABLE_NAME FROM {database_name}.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'\""
        )
        tables = subprocess.check_output(fetch_tables_command, shell=True, text=True).splitlines()

        for table in tables:
            if not table.strip():
                continue

            # Export each table to a CSV file
            export_command = (
                f"bcp {database_name}.dbo.{table} out {export_dir}/{table}.csv -c -t, -S localhost -T"
            )
            subprocess.check_call(export_command, shell=True)
            print(f"Exported table {table} to {export_dir}/{table}.csv")

        return True
    except subprocess.CalledProcessError as e:
        print(f"Error exporting tables to CSV: {e}")
        return False

def import_csv_to_sqlite(export_dir, sqlite_file):
    """Import CSV files into SQLite database."""
    try:
        conn = sqlite3.connect(sqlite_file)
        cursor = conn.cursor()

        for csv_file in os.listdir(export_dir):
            if not csv_file.endswith(".csv"):
                continue

            table_name = os.path.splitext(csv_file)[0]
            csv_path = os.path.join(export_dir, csv_file)

            # Read CSV headers to create table
            with open(csv_path, "r") as f:
                reader = csv.reader(f)
                headers = next(reader)
                columns = ", ".join([f"{header} TEXT" for header in headers])
                cursor.execute(f"CREATE TABLE {table_name} ({columns});")

                # Insert rows into the table
                for row in reader:
                    placeholders = ", ".join(["?" for _ in row])
                    cursor.execute(f"INSERT INTO {table_name} VALUES ({placeholders});", row)

        conn.commit()
        conn.close()
        print(f"Imported CSV files into SQLite database {sqlite_file}.")
        return True
    except sqlite3.Error as e:
        print(f"Error importing CSV to SQLite: {e}")
        return False

def convert_bak_to_sqlite(bak_file, sqlite_file):
    database_name = "TempDatabase"  # Temporary database name for restoration
    export_dir = "exported_csv"  # Directory to store exported CSV files

    # Step 1: Restore the .bak file to SQL Server
    if not restore_bak_to_sql_server(bak_file, database_name):
        return False

    # Step 2: Export the SQL Server database to CSV files
    if not export_sql_server_to_csv(database_name, export_dir):
        return False

    # Step 3: Import the CSV files into SQLite
    if not import_csv_to_sqlite(export_dir, sqlite_file):
        return False

    print(f"Successfully converted {bak_file} to {sqlite_file}.")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_bak_to_sqlite.py <input.bak> <output.sqlite>")
        sys.exit(1)

    bak_file = sys.argv[1]
    sqlite_file = sys.argv[2]

    if not os.path.exists(bak_file):
        print(f"Error: {bak_file} does not exist.")
        sys.exit(1)

    success = convert_bak_to_sqlite(bak_file, sqlite_file)
    sys.exit(0 if success else 1)