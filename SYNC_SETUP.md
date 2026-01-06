# Database Sync Setup

## Overview
Hybrid sync system: SQLite (offline) ↔ Supabase (online)

## Setup Steps

### 1. Run Supabase Schema
Execute `supabase-schema.sql` in Supabase SQL Editor

### 2. Usage

```javascript
const SyncService = require('./src/services/SyncService');

// Initialize
await SyncService.initialize();

// Manual sync
const result = await SyncService.syncAll();
console.log(result);

// Auto-sync every 5 minutes
SyncService.startAutoSync(5);

// Stop auto-sync
SyncService.stopAutoSync();
```

### 3. How It Works

- **Offline**: All operations use SQLite
- **Online**: Auto-syncs every 5 minutes
- **Conflict Resolution**: Newest record wins (based on `updated_at`)
- **Bidirectional**: Local → Remote and Remote → Local

### 4. Sync Logic

1. Compare local vs remote records by ID
2. Upload local records that are new or newer
3. Download remote records that are new or newer
4. Track sync time in `sync_metadata` table

### 5. Integration Example

```javascript
// In main.js or app initialization
const SyncService = require('./src/services/SyncService');

app.on('ready', async () => {
    await SyncService.initialize();
    SyncService.startAutoSync(5); // Sync every 5 minutes
});

app.on('window-all-closed', () => {
    SyncService.close();
});
```

## Key Changes

- **IDs**: Changed from INTEGER to TEXT (UUID) for sync compatibility
- **Schemas**: Aligned SQLite and Supabase structures
- **Timestamps**: Used for conflict resolution
