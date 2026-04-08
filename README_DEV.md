# Development Workflow

## 🚀 Quick Start for Development (Hot Reload)

**Always use this for development with live changes:**

```bash
# Kill all terminals first
# Then run:
npm run dev
```

This starts:
- Vite dev server: http://localhost:5173 (Hot Module Replacement ✅)
- Electron: Loads dev server URL, auto-reloads on code changes

**Changes appear instantly** in the app without rebuild.

## ❌ Don't Use These for Development
- `npm run electron` or `electron-dev`: No dev server, no reload
- Manual `electron .`: Same issue

## 🧪 Test Production Build
```bash
npm run build  # Build dist/
npm run dist:win  # Create installer
```

## 📱 Installer Testing
- Generated in `installer-output/KORENE-1.0.0.exe`
- Copy to Desktop/other PC
- Install/run as regular user
- Database auto-creates in `%APPDATA%/eye-clinic/`

## Troubleshooting
**Changes not showing?**
1. Kill all terminals (`Ctrl+C`)
2. `npm run dev`
3. Edit `src/App.jsx` (add console.log)
4. Save - should reload automatically
5. Check DevTools console (auto-opens)

**Installer crashes on other PC?**
- Run `npm run dist:win` after `npm run build`
- Test the .exe installer
- Check Windows Event Viewer for errors

Updated: Use `npm run dev` for ALL development!
