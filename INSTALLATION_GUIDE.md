# Eye Clinic Management System - Installation & Deployment Guide

## Overview

This guide covers deploying the Eye Clinic Management System across multiple computers using a shared network database.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVER COMPUTER                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Shared Folder: C:\EyeClinicDB                      │  │
│  │  ├── eye_clinic.db (SQLite database)                │  │
│  │  └── sync_*.json (sync files)                      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Computer │    │ Computer │    │ Computer │
        │    1    │    │    2    │    │    3    │
        │ (Admin) │    │(Doctor) │    │(Assistant)│
        └──────────┘    └──────────┘    └──────────┘
```

---

## Prerequisites

### Server Computer Requirements
- Windows 10/11
- Network connection (LAN)
- Static IP or computer name that other PCs can access
- At least 500MB free disk space

### Client Computer Requirements
- Windows 10/11
- Network access to server computer
- At least 500MB free disk space

---

## Step 1: Server Setup (One-Time)

### 1.1 Create Shared Folder

1. On the **server computer**, create a new folder:
   ```
   C:\EyeClinicDB
   ```

2. Right-click the folder → **Properties** → **Sharing** tab

3. Click **Share** button

4. Add users who need access:
   - Click **Add** → Enter user names (or "Everyone" for simplicity)
   - Set permission level to **Read/Write**
   - Click **Share**

5. Click **Done** when finished

### 1.2 Configure Folder Permissions

1. Right-click the folder → **Properties** → **Security** tab

2. Click **Edit** → **Add**

3. Enter user names or "Everyone" and click **OK**

4. Grant **Full Control** permissions

5. Click **Apply** and **OK**

### 1.3 Note the Network Path

The network path will be:
```
\\COMPUTERNAME\EyeClinicDB
```
or
```
\\IP-ADDRESS\EyeClinicDB
```

Example:
```
\\DESKTOP-SERVER\EyeClinicDB
```

---

## Step 2: Install Application (All Computers)

### 2.1 Copy Application Files

1. Copy the entire `installer-output/win-unpacked` folder to each computer

2. Location on each computer (recommended):
   ```
   C:\Program Files\Eye Clinic
   ```

3. Create a shortcut to `KORENE EYE CLINIC NIG. LTD.exe` on the desktop

### 2.2 First Run - Initial Setup

1. Launch the application

2. If first run (no users exist), you'll see the **Setup Screen**

3. Create the **Admin account**:
   - First Name: `Admin`
   - Last Name: `User`
   - Email: `admin@clinic.com`
   - Password: `********` (choose a strong password)
   - Role: `Admin`

4. Click **Create Account**

---

## Step 3: Configure Network Database (Admin Computer Only)

### 3.1 Open Network Configuration

1. Log in as **Admin**

2. Click the **Settings** (gear icon) in the sidebar

3. Find **System Settings** section

4. Click **Configure Network**

### 3.2 Enable Network Mode

1. Toggle **Network Mode** to **ON**

2. Enter the **Server Network Path**:
   ```
   \\SERVERNAME\EyeClinicDB
   ```
   (Replace with actual server computer name)

3. Click **Test Connection** to verify

4. If successful, click **Save Configuration**

### 3.3 Initial Database Transfer (First Setup Only)

**Option A: Start Fresh (Recommended for new clinics)**
- Click **Save** - database will be created in shared folder
- All other computers will connect to this new database

**Option B: Import Existing Data**
1. Export data from old system to CSV files
2. Admin imports data after network setup

---

## Step 4: Configure Client Computers

### 4.1 Connect to Network Database

1. On each **client computer**, log in as **Admin**

2. Go to **Settings** → **System Settings** → **Configure Network**

3. Toggle **Network Mode** to **ON**

4. Enter the same **Server Network Path**:
   ```
   \\SERVERNAME\EyeClinicDB
   ```

5. Click **Test Connection**

6. Click **Save Configuration**

### 4.2 Create User Accounts

1. Go to **User Management**

2. Create accounts for each staff member:
   - Doctors
   - Assistants

3. Each user will log in with their own credentials from any computer

---

## Step 5: Verify Everything Works

### 5.1 Test Connection Status

In Network Configuration screen, verify:
- Status shows "Connected"
- Last Sync shows recent time
- Auto-sync indicator is active

### 5.2 Test Data Sync

1. On Computer 1: Add a new patient

2. Wait 30 seconds (or click **Sync Now**)

3. On Computer 2: Refresh patient list

4. Verify the patient appears

### 5.3 Test Multi-User Access

1. Have two users log in simultaneously from different computers

2. Test concurrent operations:
   - View patients
   - Update records
   - Send messages

---

## User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: Users, Settings, Network Config, Import/Export |
| **Doctor** | Patients, Tests, Prescriptions, Case Notes, CVF Workspace |
| **Assistant** | Patients, Inventory, Chat, CVF Workspace (limited) |

---

## Troubleshooting

### "Network path not accessible"

**Cause:** Cannot reach server computer

**Solutions:**
1. Verify server computer is on
2. Check network cable/WiFi connection
3. Ping server: Open CMD → `ping SERVERNAME`
4. Check Windows Firewall settings
5. Verify folder sharing is enabled

### "Database is locked"

**Cause:** Another computer is writing to database

**Solutions:**
1. Wait a few seconds and try again
2. Click **Sync Now** to force synchronization
3. Ensure only one person is editing same record

### "Sync conflicts"

**Cause:** Same record edited on multiple computers

**Solutions:**
1. Open Network Configuration
2. View pending conflicts
3. Choose "Keep Local" or "Use Remote" for each
4. Contact admin if unsure

### "Connection timeout"

**Cause:** Network latency or server overload

**Solutions:**
1. Check network connection quality
2. Ensure server computer has good performance
3. Consider reducing sync frequency

---

## Maintenance

### Backup Database (Weekly)

1. Go to **Settings** → **System Settings**

2. Click **Create Backup**

3. Save to local drive (not network)

### Update Application

1. Download new version

2. Close application on ALL computers

3. Copy new files to each computer

4. Restart application

### Monitor Sync Issues

Check Network Configuration screen regularly for:
- Last sync time
- Pending conflicts
- Error messages

---

## File Locations

| Item | Location |
|------|----------|
| Application | `C:\Program Files\Eye Clinic\` |
| Local Config | `%APPDATA%\eye-clinic\` |
| Network Database | `\\SERVERNAME\EyeClinicDB\` |
| Logs | `%APPDATA%\eye-clinic\logs\` |

---

## Support Contacts

For technical support:
- Email: [Your support email]
- Phone: [Your support number]

---

## Quick Reference Card (Print This)

```
╔══════════════════════════════════════════════════════════╗
║          EYE CLINIC - NETWORK SETUP QUICK REFERENCE     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  SERVER SETUP:                                          ║
║  1. Create folder: C:\EyeClinicDB                       ║
║  2. Right-click → Properties → Sharing → Share          ║
║  3. Add users with Read/Write access                    ║
║                                                          ║
║  NETWORK PATH:                                           ║
║  \\COMPUTERNAME\EyeClinicDB                              ║
║                                                          ║
║  CLIENT SETUP:                                          ║
║  1. Install app                                          ║
║  2. Admin → Settings → Configure Network                ║
║  3. Enable Network Mode                                 ║
║  4. Enter: \\COMPUTERNAME\EyeClinicDB                   ║
║  5. Test Connection → Save                              ║
║                                                          ║
║  SYNC: Auto-sync every 30 seconds                       ║
║  MANUAL SYNC: Click "Sync Now" button                   ║
║                                                          ║
║  CONFLICTS: Resolve in Network Configuration screen     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Current | Initial network deployment support |

---

*Last Updated: March 2026*
