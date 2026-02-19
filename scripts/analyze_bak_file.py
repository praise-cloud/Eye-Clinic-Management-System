#!/usr/bin/env python3
"""
Comprehensive BAK file analyzer
Identifies the format and provides detailed information about the .bak file
"""

import os
import sys
import sqlite3
import json
import struct

def read_file_header(file_path, num_bytes=512):
    """Read the first N bytes of the file."""
    try:
        with open(file_path, 'rb') as f:
            return f.read(num_bytes)
    except Exception as e:
        return None

def read_text_sample(file_path, num_lines=50):
    """Read the first N lines as text."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = []
            for i, line in enumerate(f):
                if i >= num_lines:
                    break
                lines.append(line.rstrip('\n\r'))
            return lines
    except Exception as e:
        return []

def get_file_info(file_path):
    """Get basic file information."""
    try:
        stat_info = os.stat(file_path)
        return {
            'size_bytes': stat_info.st_size,
            'size_mb': round(stat_info.st_size / (1024 * 1024), 2),
            'exists': True
        }
    except Exception as e:
        return {'error': str(e), 'exists': False}

def analyze_sqlite(file_path):
    """Check if file is SQLite database."""
    try:
        with sqlite3.connect(file_path) as conn:
            cursor = conn.cursor()
            # Get table info
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()

            # Get row counts
            table_info = {}
            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                table_info[table_name] = count

            return {
                'is_sqlite': True,
                'tables': len(tables),
                'table_details': table_info,
                'error': None
            }
    except sqlite3.DatabaseError as e:
        return {'is_sqlite': False, 'error': str(e)}
    except Exception as e:
        return {'is_sqlite': False, 'error': str(e)}

def analyze_binary_header(header):
    """Analyze binary file header."""
    if len(header) < 4:
        return None

    magic = header[:4]
    analysis = {
        'hex': magic.hex(),
        'ascii': ''.join(chr(b) if 32 <= b < 127 else '.' for b in magic)
    }

    # Check for known signatures
    if magic == b'SQLi':
        analysis['signature'] = 'SQLite Database'
    elif magic[:2] == b'BZh':
        analysis['signature'] = 'Bzip2 Compressed'
    elif magic[:2] == b'\x1f\x8b':
        analysis['signature'] = 'Gzip Compressed'
    elif magic[:4] == b'PK\x03\x04':
        analysis['signature'] = 'ZIP Archive'
    elif magic[:4] == b'\x50\x4b\x03\x04':
        analysis['signature'] = 'Office/ZIP Document'
    elif all(32 <= b < 127 or b in [9, 10, 13] for b in header[:100]):
        analysis['signature'] = 'Text File'
    else:
        analysis['signature'] = 'Unknown Binary Format'

    return analysis

def analyze_text_content(lines):
    """Analyze text file content."""
    analysis = {
        'is_text': True,
        'line_count': len(lines),
        'has_sql_keywords': False,
        'has_csv_headers': False,
        'has_json': False,
        'has_xml': False,
        'first_lines': lines[:5] if lines else []
    }

    text_content = '\n'.join(lines[:100])

    # Check for SQL
    sql_keywords = ['SELECT', 'INSERT', 'CREATE', 'UPDATE', 'DELETE', 'DROP', 'ALTER']
    if any(kw in text_content.upper() for kw in sql_keywords):
        analysis['has_sql_keywords'] = True
        analysis['detected_format'] = 'SQL Dump'

    # Check for CSV (common separators)
    if lines and any(sep in lines[0] for sep in [',', '\t', '|', ';']):
        # Check if first line looks like headers (no special SQL chars)
        if not any(char in lines[0] for char in ['(', ')', '*', '`']):
            analysis['has_csv_headers'] = True
            analysis['detected_format'] = 'CSV or Delimited Text'

            # Count columns in first line
            for sep in [',', '\t', '|', ';']:
                if sep in lines[0]:
                    col_count = len(lines[0].split(sep))
                    analysis['estimated_columns'] = col_count
                    analysis['separator'] = repr(sep)
                    break

    # Check for JSON
    if lines and lines[0].strip().startswith('{'):
        analysis['has_json'] = True
        analysis['detected_format'] = 'JSON'

    # Check for XML
    if lines and lines[0].strip().startswith('<?xml') or '<root>' in text_content:
        analysis['has_xml'] = True
        analysis['detected_format'] = 'XML'

    return analysis

def analyze_bak_file(file_path):
    """Comprehensive analysis of BAK file."""
    print(f"\n{'='*70}")
    print(f"BAK FILE ANALYZER - Detailed Report")
    print(f"{'='*70}\n")
    print(f"File Path: {file_path}\n")

    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ ERROR: File does not exist!")
        return False

    # Get file info
    print("1. FILE INFORMATION")
    print("-" * 70)
    file_info = get_file_info(file_path)
    print(f"   File Size: {file_info.get('size_bytes')} bytes ({file_info.get('size_mb')} MB)")

    # Read header
    header = read_file_header(file_path)

    print("\n2. BINARY SIGNATURE ANALYSIS")
    print("-" * 70)
    if header:
        binary_analysis = analyze_binary_header(header)
        if binary_analysis:
            print(f"   First 4 bytes (hex): {binary_analysis['hex']}")
            print(f"   First 4 bytes (ascii): {binary_analysis['ascii']}")
            print(f"   Detected Type: {binary_analysis.get('signature', 'Unknown')}")

    # Try SQLite analysis
    print("\n3. SQLITE DATABASE CHECK")
    print("-" * 70)
    sqlite_analysis = analyze_sqlite(file_path)
    if sqlite_analysis['is_sqlite']:
        print(f"   ✅ VALID SQLITE DATABASE!")
        print(f"   Tables Found: {sqlite_analysis['tables']}")
        for table_name, row_count in sqlite_analysis['table_details'].items():
            print(f"      - {table_name}: {row_count} rows")
    else:
        print(f"   ❌ NOT a valid SQLite database")
        print(f"   Reason: {sqlite_analysis.get('error', 'Unknown')}")

    # Try text analysis
    print("\n4. TEXT CONTENT ANALYSIS")
    print("-" * 70)
    text_lines = read_text_sample(file_path, 50)
    if text_lines:
        text_analysis = analyze_text_content(text_lines)
        print(f"   Lines Read: {text_analysis['line_count']}")
        print(f"   First Line: {text_analysis['first_lines'][0][:100] if text_analysis['first_lines'] else 'N/A'}")

        if text_analysis.get('has_sql_keywords'):
            print(f"   ✅ SQL Keywords Found")
            print(f"   Format: {text_analysis.get('detected_format')}")

        if text_analysis.get('has_csv_headers'):
            print(f"   ✅ CSV/Delimited Format Detected")
            print(f"   Separator: {text_analysis.get('separator')}")
            print(f"   Estimated Columns: {text_analysis.get('estimated_columns')}")
            print(f"   Format: {text_analysis.get('detected_format')}")

        if text_analysis.get('has_json'):
            print(f"   ✅ JSON Format Detected")
            print(f"   Format: {text_analysis.get('detected_format')}")

        if text_analysis.get('has_xml'):
            print(f"   ✅ XML Format Detected")
            print(f"   Format: {text_analysis.get('detected_format')}")

        if 'detected_format' not in text_analysis:
            print(f"   ⚠️  No standard format detected")
            print(f"   First few lines:")
            for i, line in enumerate(text_analysis['first_lines'][:5]):
                print(f"      Line {i+1}: {line[:100]}")
    else:
        print("   ⚠️  Could not read file as text (may be binary)")

    # Recommendations
    print("\n5. RECOMMENDATIONS")
    print("-" * 70)
    if sqlite_analysis['is_sqlite']:
        print("   ✅ File is valid SQLite - Import directly!")
    elif text_analysis and text_analysis.get('has_sql_keywords'):
        print("   ✅ File is SQL dump - Will parse and create SQLite database")
    elif text_analysis and text_analysis.get('has_csv_headers'):
        print("   ✅ File is CSV/Delimited - Will extract and create SQLite database")
    else:
        print("   ⚠️ UNKNOWN FORMAT")
        print("   Possible solutions:")
        print("      1. Export from original system as CSV instead")
        print("      2. Export from original system as SQL dump")
        print("      3. Check if file is corrupted")
        print("      4. Contact system administrator")

    print("\n" + "="*70 + "\n")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_bak_file.py <path_to_bak_file>")
        print("\nExample: python analyze_bak_file.py clinic_backup.bak")
        sys.exit(1)

    bak_file = sys.argv[1]
    analyze_bak_file(bak_file)
