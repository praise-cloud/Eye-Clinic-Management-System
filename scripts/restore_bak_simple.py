#!/usr/bin/env python3
import os, sys, subprocess, sqlite3, tempfile

def main(bak_path, sqlite_file):
    server = "PRAISE\\SQLEXPRESS"
    db_name = "EyeClinicRestore"

    print("=" * 60)
    print("SQL Server BAK to SQLite")
    print("=" * 60)
    print()

    # Create temporary SQL file for restore
    sql_restore = f"""
    RESTORE DATABASE [{db_name}]
    FROM DISK = N'{bak_path}'
    WITH REPLACE, RECOVERY, STATS = 10
    GO
    """

    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        f.write(sql_restore)
        sql_file = f.name

    try:
        # Restore backup
        print("Restoring backup...")
        print(f"  From: {bak_path}")
        cmd = f'sqlcmd -S "{server}" -E -C -i "{sql_file}" -W'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)

        if "error" in r.stdout.lower() or "error" in r.stderr.lower():
            print(f"  Error: {r.stdout[:200]}")
            return False

        print("  Done")
        print()

        # Verify database exists
        print("Verifying database...")
        cmd = f'sqlcmd -S "{server}" -E -C -d "{db_name}" -Q "SELECT 1" -W'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            print(f"  Error: {r.stderr[:100]}")
            return False
        print("  OK")
        print()

        # Get tables
        print("Reading tables...")
        cmd = f'sqlcmd -S "{server}" -E -C -d "{db_name}" -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE=\'BASE TABLE\' ORDER BY TABLE_NAME" -h -1 -W'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            print(f"  Failed: {r.stderr[:100]}")
            return False

        tables = [t.strip() for t in r.stdout.split('\n') if t.strip()]
        print(f"  Found {len(tables)} tables")
        print()

        # Import to SQLite
        print("Importing tables...")
        conn = sqlite3.connect(sqlite_file)
        c = conn.cursor()

        ok = 0
        for tbl in tables:
            try:
                # Get columns
                cmd = f'sqlcmd -S "{server}" -E -C -d "{db_name}" -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=\'{tbl}\' ORDER BY ORDINAL_POSITION" -h -1 -W'
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
                if r.returncode != 0: continue

                cols = [x.strip() for x in r.stdout.split('\n') if x.strip()]
                if not cols: continue

                # Create table
                defs = ','.join([f'"{x}" TEXT' for x in cols])
                c.execute(f'CREATE TABLE IF NOT EXISTS "{tbl}" ({defs})')

                # Export data
                cmd = f'sqlcmd -S "{server}" -E -C -d "{db_name}" -Q "SELECT * FROM [{tbl}]" -s "|" -W -h -1'
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
                if r.returncode != 0: continue

                rows = 0
                for line in r.stdout.split('\n'):
                    if line.strip() and '|' in line:
                        vals = [v.strip() for v in line.split('|')]
                        if len(vals) == len(cols):
                            ph = ','.join(['?' for _ in cols])
                            cn = ','.join([f'"{x}"' for x in cols])
                            c.execute(f'INSERT INTO "{tbl}" ({cn}) VALUES ({ph})', vals)
                            rows += 1

                conn.commit()
                print(f"  {tbl}: {rows} rows")
                ok += 1
            except:
                pass

        conn.close()

        print()
        print("=" * 60)
        size = os.path.getsize(sqlite_file) / (1024*1024)
        print(f"SUCCESS: {ok}/{len(tables)} tables imported")
        print(f"File: {sqlite_file}")
        print(f"Size: {size:.2f} MB")
        print("=" * 60)

        return True

    finally:
        # Clean up temp SQL file
        if os.path.exists(sql_file):
            os.unlink(sql_file)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python restore_bak_simple.py <input.bak> <output.sqlite>")
        sys.exit(1)

    ok = main(sys.argv[1], sys.argv[2])
    sys.exit(0 if ok else 1)
