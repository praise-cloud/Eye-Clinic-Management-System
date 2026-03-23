# Quick Start Guide - Eye Clinic Network Setup

## For IT/Setup Technician

### 1. Prepare Server (30 minutes)
```
□ Create folder: C:\EyeClinicDB
□ Right-click → Properties → Sharing → Share
□ Add "Everyone" with Read/Write
□ Note computer name (e.g., DESKTOP-SERVER)
```

### 2. Install App on All Computers (10 min each)
```
□ Copy installer-output\win-unpacked to C:\Program Files\Eye Clinic
□ Create desktop shortcut
□ Launch app and create admin account
```

### 3. Configure Network (Admin Only - First Time)
```
□ Login as Admin
□ Settings → System Settings → Configure Network
□ Enable Network Mode
□ Enter path: \\SERVERNAME\EyeClinicDB
□ Test Connection → Save
```

### 4. Other Computers Connect
```
□ Login as Admin on each computer
□ Settings → Configure Network
□ Enter same path: \\SERVERNAME\EyeClinicDB
□ Test → Save
□ Create user accounts for staff
```

### 5. Verify & Test
```
□ Add test patient on Computer 1
□ Wait 30 seconds or click "Sync Now"
□ Verify patient appears on Computer 2
□ Test concurrent login from 2 computers
```

## Daily Use Notes

- **Auto-sync** runs every 30 seconds
- **Manual sync**: Click "Sync Now" button
- **Conflicts**: Shown in Network Config screen
- **Backup**: Settings → Create Backup weekly

## Common Issues

| Problem | Quick Fix |
|---------|-----------|
| Can't connect | Check server is on, ping server name |
| Database locked | Wait 5 seconds, try again |
| Sync not working | Click "Sync Now" manually |
| Conflict | Resolve in Network Config → Conflicts |

---

Full guide: See `INSTALLATION_GUIDE.md`
