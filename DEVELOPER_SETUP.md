# Developer Setup Guide

## 🚀 First Time Setup (After Cloning)

When you clone this project for the first time, follow these steps to get the application running:

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```bash
# Copy the example file
cp .env.example .env
```

**OR** create `.env` manually with this content:
```env
# Supabase Configuration (Optional - for cloud sync)
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key_here

# Application Configuration
REACT_APP_NAME=Eye Clinic Management System
REACT_APP_VERSION=1.0.0

# Environment
NODE_ENV=development

# Optional: Database backup settings
REACT_APP_AUTO_BACKUP=true
REACT_APP_BACKUP_INTERVAL=3600000

# Optional: Sync settings
REACT_APP_SYNC_ENABLED=true
REACT_APP_SYNC_INTERVAL=30000
```

### 3. Initialize Development Database

The database will be created automatically on first run, **BUT** it will be empty (no users).

**Option A: Use the application's built-in setup (Recommended)**
1. Run the dev server: `npm run dev`
2. The app will detect it's first run and show you the Welcome/Setup screen
3. Follow the on-screen prompts to create your admin account

**Option B: Pre-create test users via script**
```bash
node scripts/setup-database.js
```

This will create a database in the project root with these default users:
- **Admin**: `admin@clinic.com` / `admin123`
- **Doctor**: `doctor@clinic.com` / `doctor123`
- **Assistant**: `assistant@clinic.com` / `assistant123`

### 4. Run Development Server
```bash
npm run dev
```

This will:
- Start Vite dev server on `http://localhost:3000`
- Launch Electron app automatically
- Enable hot-reload for development

---

## 🔧 Common Issues & Solutions

### Issue 1: "Cannot login with shared credentials"

**Problem**: Each developer has their own local SQLite database. The database file (`*.db`) is gitignored, so it's not shared between developers.

**Solution**: 
- Either run the setup wizard in the app (first time)
- OR run: `node scripts/setup-database.js` to create default test users

### Issue 2: "Errors when creating user account"

**Problem**: Database might not be initialized properly, or there are permission issues.

**Solution**:
1. Delete the local database:
   ```bash
   # On Windows (PowerShell)
   Remove-Item -Path "$env:APPDATA\eye-clinic\eye_clinic.db" -ErrorAction SilentlyContinue
   
   # On Mac/Linux
   rm ~/Library/Application\ Support/eye-clinic/eye_clinic.db
   ```

2. Restart the application - it will auto-create a fresh database

3. If errors persist, check the console output for specific error messages

### Issue 3: "Blank screen after npm run dev"

**Problem**: Vite dev server hasn't started yet, or port 3000 is in use.

**Solution**:
- Wait 5-10 seconds for Vite to start
- Check if port 3000 is available: `netstat -ano | findstr :3000`
- Kill any process using port 3000 and try again

### Issue 4: "Module not found" errors

**Problem**: Dependencies not installed properly.

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue 5: "Database locked" error

**Problem**: Multiple instances of the app are running.

**Solution**:
- Close all Electron app instances
- Restart the dev server

---

## 📁 Important Locations

### Development Database Location:
- **Windows**: `%APPDATA%\eye-clinic\eye_clinic.db`
- **Mac**: `~/Library/Application Support/eye-clinic/eye_clinic.db`
- **Linux**: `~/.config/eye-clinic/eye_clinic.db`

### Project Database (from script):
- `./eye_clinic.db` (project root - only if you run setup-database.js)

---

## 🧪 Testing Accounts

After running `setup-database.js`, use these credentials:

| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Admin     | admin@clinic.com         | admin123      |
| Doctor    | doctor@clinic.com        | doctor123     |
| Assistant | assistant@clinic.com     | assistant123  |

**⚠️ IMPORTANT**: Change these passwords in production!

---

## 🏗️ Building for Production

### Build Installer:
```bash
# Build renderer + create Windows installer
npm run dist:win

# Or build for all platforms
npm run dist
```

**Output**: `release/Eye Clinic Management Setup 1.0.0.exe`

---

## 🔄 Database Sync (Optional)

If you want to enable cloud sync with Supabase:

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema: `database/supabase-schema.sql`
3. Get your project URL and anon key from Supabase dashboard
4. Add to `.env` file:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```
5. Restart the app

---

## 📝 Development Tips

1. **Console Logging**: Check Electron console and browser DevTools for errors
2. **Database Inspection**: Use DB Browser for SQLite to inspect the database
3. **Hot Reload**: Save files in `src/` to see changes instantly
4. **IPC Debugging**: Check `electron/ipc/handlers.js` for API calls
5. **Fresh Start**: Delete database + `node_modules` for complete reset

---

## 🆘 Getting Help

If you encounter issues:
1. Check the console output for error messages
2. Look in this DEVELOPER_SETUP.md file
3. Check the main README.md for additional documentation
4. Contact the project maintainer

---

## 📚 Additional Resources

- **Main README**: See `README.md` for full feature documentation
- **Database Schema**: See `database/supabase-schema.sql`
- **Scripts**: Check `scripts/` folder for utility scripts
- **IPC API**: See `electron/preload.js` for available APIs

---

**Happy Coding! 🎉**
