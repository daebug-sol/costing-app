# Git worktree (fokus per fitur)

Satu clone repo cuma punya **satu working tree**. `git worktree` bikin **folder checkout tambahan** untuk branch lain, tanpa nambah remote GitHub. Buka **hanya folder worktree itu** di Cursor supaya context AI/indeks lebih sempit ketimbang satu repo penuh.

## Yang perlu dipahami

- **Branch fitur** di GitHub: untuk alur PR/review; worktree cuma “cara kerja lokal” yang nyaman.
- **Setiap worktree** = install dependency sendiri (`npm install`), env sendiri (salin `.env` / `.env.local` dari repo utama kalau perlu).
- **Database lokal** (`dev.db` dll.): per worktree file terpisah; aman asal tahu data uji beda per folder.

## Cepat: skrip (Windows / PowerShell)

Dari **root repo** `costing-app`:

```powershell
# Cabang baru feature/foo dari master
.\scripts\new-worktree.ps1 -Name "AHU panel"

# Cabang yang sudah ada
.\scripts\new-worktree.ps1 -Branch "feature/lain"

# Hapus worktree (setelah merge / selesai)
.\scripts\remove-worktree.ps1 -Path "D:\dae-app-projects\costing-worktrees\feature-ahu-panel"
```

Lalu di Cursor: **File → Open Folder** → pilih folder worktree (bukan `costing-app` utama).

## Manual (tanpa skrip)

Ganti path sesuai mesinmu.

```powershell
cd D:\dae-app-projects\costing-app
mkdir D:\dae-app-projects\costing-worktrees -ea 0

# Worktree + branch baru dari master
git worktree add D:\dae-app-projects\costing-worktrees\feature-ahu -b feature/ahu master

# Atau: branch sudah ada di remote
git fetch
git worktree add D:\dae-app-projects\costing-worktrees\feature-ahu feature/ahu
```

Hapus:

```powershell
git -C D:\dae-app-projects\costing-app worktree remove D:\dae-app-projects\costing-worktrees\feature-ahu
# Kalau folder masih nyangkut (uncommitted, dll.):
# git -C D:\dae-app-projects\costing-app worktree remove --force D:\...
```

## Cek worktree

```powershell
git worktree list
```

## Tips Cursor

- Pakai **@folder** / **@file** ke subfolder fitur;
- Boleh isi **`.cursorignore`** di root project untuk skip file/direktori berat (dump, build) supaya index lebih ringan.
