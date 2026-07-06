# Toolgest Catalog

Referensi harness yang tersedia. Agent: baca entry yang relevan saja, jangan load seluruh file ke context user.

**Lokasi:**
- Personal skills: `~/.cursor/skills/<name>/SKILL.md`
- Built-in: `~/.cursor/skills-cursor/<name>/SKILL.md`
- MCP descriptors: `mcps/<server>/tools/*.json`
- Project: `<repo>/.cursor/skills/`, `<repo>/.cursor/rules/`

---

## 1. Built-in Cursor skills (`skills-cursor/`)

| Name | Fungsi singkat | Trigger umum |
|------|----------------|--------------|
| `automate` | Buat Cursor Automations | workflow otomatis, trigger GitHub/Slack |
| `babysit` | PR merge-ready loop (built-in) | babysit PR |
| `canvas` | React artifact interaktif di Glass | analisis data, tabel besar, audit report |
| `create-hook` | Buat `hooks.json` + hook scripts | otomasi lint/test setelah edit |
| `create-rule` | Buat `.cursor/rules/` | encode konvensi permanen |
| `create-skill` | Author SKILL.md baru | buat skill custom |
| `create-subagent` | Definisikan subagent | workflow khusus berulang |
| `loop` | Prompt berulang interval (`/loop 5m`) | monitoring berkala |
| `migrate-to-skills` | Konversi rules lama ke skills | migrasi harness |
| `sdk` | `@cursor/sdk` / `cursor-sdk` | agent di script, CI, bot |
| `shell` | Command execution specialist | git, terminal berat |
| `split-to-prs` | Pecah perubahan jadi PR kecil | branch terlalu besar |
| `statusline` | Custom CLI status bar | prompt footer |
| `update-cursor-settings` | Edit `settings.json` | theme, format on save |
| `update-cli-config` | Konfigurasi Cursor CLI | CLI setup |

---

## 2. MCP servers

### cursor-app-control
| Tool | Fungsi |
|------|--------|
| `move_agent_to_root` | Pindah workspace ke project path |
| `move_agent_to_cloned_root` | Pindah ke sibling clone/worktree |
| `create_project` | Buat folder + init git |
| `open_resource` | Buka file/URL/terminal di Glass |
| `open_automation` | Buka UI Automations |
| `rename_chat` | Rename judul chat |
| `cursor_dialog` | CRUD user rules |

### cursor-backend-control (Automations API)
| Tool | Fungsi |
|------|--------|
| `list_automations` | List automations user |
| `get_automation` | Detail automation by ID |
| `create_automation` | Simpan automation baru |
| `update_automation` | Update automation |
| `build_automation_prefill_url` | URL prefill draft automation |

### cursor-ide-browser
| Tool | Fungsi |
|------|--------|
| `browser_navigate` | Buka URL |
| `browser_snapshot` | Accessibility tree (utama untuk interaksi) |
| `browser_click/type/fill/...` | Interaksi UI |
| `browser_take_screenshot` | Bukti visual |
| `browser_cdp` | CDP inspect, profile, evaluate |
| `browser_lock/unlock` | Lock tab untuk automation |

### user-obsidian
| Tool | Fungsi |
|------|--------|
| `search-vault` | Cari note |
| `read-note` / `edit-note` / `create-note` | CRUD note |
| `add-tags` / `remove-tags` | Tag management |
| `move-note` / `delete-note` | Organisasi vault |

### user-autoresearch
| Tool | Fungsi |
|------|--------|
| `init_experiment` | Mulai eksperimen terukur |
| `run_experiment` | Jalankan iterasi |
| `log_experiment` | Catat hasil |

### user-github
| Tool | Fungsi |
|------|--------|
| (GitHub API) | Issues, PRs, checks — pakai `gh` CLI juga |

### plugin-chatprd-ChatPRD
| Skill/tool | Fungsi |
|------------|--------|
| `write-prd` | Buat PRD dari codebase |
| `implement-from-prd` | Plan implementasi dari PRD |
| `check-prd-alignment` | Bandingkan code vs PRD |
| `update-prd` | Sync PRD setelah build |

---

## 3. Personal skills — Development & quality

| Skill | Fungsi | Kapan |
|-------|--------|-------|
| `grinding-until-pass` | Loop fix sampai test/build/lint hijau | setelah edit, CI lokal gagal |
| `systematic-debugging` | Repro → isolate → verify | bug tidak jelas |
| `parallel-exploring` | Multi subagent explore codebase | repo besar, onboarding |
| `codebase-onboarding` | Onboarding doc dari explore paralel | baru join project |
| `best-of-n-solving` | N pendekatan di worktree terisolasi | refactor/bug sulit |
| `writing-tests` | Generate unit/integration tests | coverage, TDD |
| `python-tdd-with-uv` | TDD Python dengan uv | project Python |
| `parallel-test-fixing` | 1 subagent per test file gagal | banyak test merah |
| `parallel-code-review` | Review 4 lensa paralel | pre-merge risky |
| `reviewing-code` | Code review single-agent | review cepat |
| `parallel-ci-triage` | Fix CI jobs paralel | GitHub Actions merah |
| `babysitting-pr` | PR merge-ready loop | PR open |
| `creating-pr` | PR rapi dengan deskripsi | siap open PR |
| `auto-type-checking` | Typecheck setelah edit | TypeScript |
| `monitoring-terminal-errors` | Watch terminal crash | dev server error |

---

## 4. Personal skills — UI / Browser QA

| Skill | Fungsi | Kapan |
|-------|--------|-------|
| `visual-qa-testing` | Screenshot + console + network | setelah UI change |
| `verifying-in-browser` | Start dev server + verify | post-change smoke |
| `accessibility-auditing` | ARIA audit via snapshot | a11y |
| `responsive-testing` | Multi viewport screenshot | layout |
| `dark-mode-testing` | Light/dark compare | theme |
| `form-testing` | Fill/submit semua form | form-heavy app |
| `network-request-auditing` | Audit fetch/XHR | API-heavy page |
| `profiling-performance` | CPU profile browser | page lambat |
| `finding-dev-server-url` | Scan terminal untuk localhost | cari port |
| `detecting-port-conflicts` | Resolve EADDRINUSE | port bentrok |
| `recording-browser-flow-as-test` | Rekam flow → Playwright test | e2e dari manual flow |
| `screenshotting-changelog` | Before/after untuk PR | visual PR |
| `comparing-branches-visually` | Diff 2 branch di browser | compare UI |
| `using-ui-stack` | Design system config-driven | generate UI konsisten |
| `converting-css-to-tailwind` | CSS → Tailwind | migrasi styling |
| `converting-css-modules-to-tailwind` | CSS modules → Tailwind | migrasi modules |

---

## 5. Personal skills — Infra, security, SaaS

| Skill | Fungsi |
|-------|--------|
| `auditing-security` | OWASP, secrets, insecure patterns |
| `auditing-performance` | Bundle, DB, Core Web Vitals |
| `adding-auth` | Auth.js / NextAuth |
| `adding-stripe` | Stripe checkout + webhooks |
| `adding-docker` | Dockerfile + compose |
| `adding-e2e-tests` | Playwright setup + CI |
| `adding-error-tracking` | Sentry |
| `adding-analytics` | PostHog |
| `adding-feature-flags` | Flags rollout |
| `adding-api-docs` | OpenAPI/Swagger |
| `setting-up-ci` | GitHub Actions |
| `setting-up-terraform` | Terraform IaC |
| `kubernetes-deploying` | K8s deploy |
| `database-design` | Schema + ORM |
| `incident-response` | Prod incident + postmortem |
| `api-smoke-testing` | Hit semua API routes |
| `seo-auditing` | Technical SEO |
| `fixing-broken-links` | Crawl + fix links |
| `updating-npm-package` | Safe npm upgrade |

---

## 6. Personal skills — Cursor meta & workflow

| Skill | Fungsi |
|-------|--------|
| `toolgest` | Router harness (skill ini) |
| `quality-vibecoding-router` | Quality-first subset router |
| `switching-projects` | Pindah workspace via MCP |
| `suggesting-cursor-rules` | Saran rule dari pola koreksi |
| `suggesting-cursor-hooks` | Saran hook otomasi |
| `suggesting-skills` | Saran install skill |
| `building-skills-from-patterns` | Skill baru dari pola berulang |
| `saving-workspace-context` | Persist context ke file |
| `obsidian-project-notes` | Progress note ke Obsidian vault |
| `architecture-decision-records` | ADR dokumentasi |
| `prompt-engineering` | Prompt LLM efektif |
| `writing-commit-messages` | Commit message conventional |
| `writing-copy` | Marketing/UI copy |
| `exporting-to-png` | Export diagram/output ke PNG |
| `verifying-markdown-formatting` | Validasi Markdown |
| `tailing-build-output` | Monitor build stream |
| `react-native-patterns` | Expo/RN patterns |
| `generating-images` | OpenAI image API |
| `autoresearch` | Goal-directed iteration loop |

---

## 7. Subagents (Task tool)

| Type | Fungsi | Kapan |
|------|--------|-------|
| `explore` | Cari file/pattern cepat | needle search, struktur |
| `shell` | Git, terminal, CI commands | eksekusi command |
| `generalPurpose` | Research multi-step | tugas campuran |
| `ci-investigator` | Diagnosa 1 CI check gagal | PR check merah |
| `best-of-n-runner` | Isolated worktree attempt | best-of-n |
| `product-reviewer` | Review vs PRD/requirements | product alignment |
| `cursor-guide` | Dokumentasi produk Cursor | how-to Cursor |

---

## 8. Built-in agent tools (non-skill)

| Tool | Fungsi |
|------|--------|
| `Shell` | Run terminal commands |
| `Grep` / `Glob` / `Read` | Search & read codebase |
| `Task` | Launch subagents |
| `CallMcpTool` | Invoke MCP |
| `SwitchMode` | Agent ↔ Plan mode (code planning, bukan toolgest) |
| `AskQuestion` | Pilihan ganda user (wajib di recommend-tool-plan) |
| `Write` / `StrReplace` | Edit files |
| `WebSearch` / `WebFetch` | Research eksternal |
| `GenerateImage` | Generate image (explicit request only) |

---

## 9. Intent → quick lookup

| Task keywords | Mulai dari |
|---------------|------------|
| test fail, build fail, lint | `grinding-until-pass` |
| bug, error, crash | `systematic-debugging` |
| PR, merge, CI | `babysitting-pr`, `parallel-ci-triage` |
| review, security audit | `parallel-code-review`, `auditing-security` |
| UI, tampilan, layout | `visual-qa-testing`, `using-ui-stack` |
| explore, arsitektur, onboarding | `parallel-exploring`, `codebase-onboarding` |
| API endpoint | `api-smoke-testing` |
| deploy, docker, k8s | `adding-docker`, `kubernetes-deploying` |
| stripe, payment | `adding-stripe` |
| auth, login | `adding-auth` |
| PRD, spec | ChatPRD skills |
| automation, bot, SDK | `sdk`, `automate` |
| obsidian, vault, notes | `obsidian-project-notes`, MCP obsidian |
| pindah project | `switching-projects` |
| skill/rule/hook baru | `create-skill`, `create-rule`, `create-hook` |
| sulit, tidak yakin | `best-of-n-solving` |
| quality umum | `quality-vibecoding-router` |
| harness apa? | `toolgest` |

---

## 10. Maintenance

Katalog ini statis. Saat user install skill/MCP baru:
1. Update `catalog.md` (section yang sesuai)
2. Atau jalankan `building-skills-from-patterns` jika harness baru muncul dari workflow berulang

Update awesome-cursor-skills: lihat `~/.cursor/skills/README-AWESOME-SKILLS-SETUP.md`
