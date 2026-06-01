# Database folder / file migration

Migration `20260601120000_database_folder_file_model` adds folder-first navigation for `/database`.

## What changed

- `DatabaseFolder` — scopes `custom` and `ahu`
- `AhuDatasetFile` — file datasets per AHU kind (`materials`, `profiles`, `components`)
- `CustomDbTable.folderId`, `MaterialPrice.datasetFileId`, `ProfileData.datasetFileId`, `ComponentCatalog.datasetFileId`

## Local apply

```bash
npx prisma migrate deploy
npx prisma generate
```

Existing SQLite data is backfilled into:

- Custom: folder `Umum` (`folder_custom_default`)
- AHU: folder `Umum` with three default files (`ahufile_*_default`)

Row IDs and global `code` uniqueness are unchanged so costing references keep working.

## Rollback (dev only)

Restore a DB backup taken before migrate, or reset the dev database and re-seed. Do not run destructive commands on shared/production-like data without a backup.
