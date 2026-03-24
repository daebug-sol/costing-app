/**
 * Migrasi dev.db dari skema lama (CostingSection.projectId) ke segmen.
 * Jalankan dari root proyek: node scripts/migrate-sqlite-to-segments.mjs
 * Lalu: npx prisma db push
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const pathMatch = url.match(/^file:(.+)$/);
const dbPath = pathMatch
  ? resolve(process.cwd(), pathMatch[1])
  : resolve(process.cwd(), "dev.db");

if (!existsSync(dbPath)) {
  console.log("No database file at", dbPath, "— skip (fresh prisma db push).");
  process.exit(0);
}

const db = new Database(dbPath);

function tableExists(name) {
  const r = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    )
    .get(name);
  return !!r;
}

function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function hasColumn(table, col) {
  return columnNames(table).includes(col);
}

try {
  const segTable = tableExists("CostingSegment");
  const secCols = tableExists("CostingSection")
    ? columnNames("CostingSection")
    : [];

  if (!tableExists("CostingProject") || !tableExists("CostingSection")) {
    console.log("Missing core tables — run prisma db push first.");
    process.exit(0);
  }

  if (!segTable) {
    db.exec(`
CREATE TABLE "CostingSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL DEFAULT 0.0,
    "ahuModel" TEXT,
    "ahuRef" TEXT,
    "flowCMH" REAL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "dimH" REAL,
    "dimW" REAL,
    "dimD" REAL,
    "profileType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostingSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CostingProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CostingSegment_projectId_idx" ON "CostingSegment"("projectId");
`);
    console.log("Created CostingSegment table.");
  }

  if (!hasColumn("CostingSection", "segmentId")) {
    db.exec(`ALTER TABLE "CostingSection" ADD COLUMN "segmentId" TEXT;`);
    console.log("Added CostingSection.segmentId column.");
  }

  const projects = db.prepare(`SELECT * FROM "CostingProject"`).all();
  const insertSeg = db.prepare(`
INSERT INTO "CostingSegment" (
  "id","projectId","type","title","sortOrder","subtotal",
  "ahuModel","ahuRef","flowCMH","qty","dimH","dimW","dimD","profileType",
  "createdAt","updatedAt"
) VALUES (
  @id,@projectId,@type,@title,0,@subtotal,
  @ahuModel,@ahuRef,@flowCMH,@qty,@dimH,@dimW,@dimD,@profileType,
  datetime('now'),datetime('now')
)`);

  const pick = (row, keys) => {
    const o = {};
    for (const k of keys) {
      o[k] = row[k] !== undefined ? row[k] : null;
    }
    return o;
  };

  for (const p of projects) {
    const existing = db
      .prepare(`SELECT id FROM "CostingSegment" WHERE "projectId" = ?`)
      .all(p.id);
    if (existing.length > 0) continue;

    const id = randomUUID();
    const projKeys = columnNames("CostingProject");
    const isManual =
      projKeys.includes("mode") && String(p.mode).toLowerCase() === "manual";
    const title = isManual ? "Manual 1" : "AHU 1";
    const sub = Number(p.totalHPP) || 0;
    const payload = {
      id,
      projectId: p.id,
      type: isManual ? "manual" : "ahu",
      title,
      subtotal: sub,
      ahuModel: projKeys.includes("ahuModel") ? p.ahuModel : null,
      ahuRef: projKeys.includes("ahuRef") ? p.ahuRef : null,
      flowCMH: projKeys.includes("flowCMH") ? p.flowCMH : null,
      qty: projKeys.includes("qty") ? Math.max(1, Number(p.qty) || 1) : 1,
      dimH: projKeys.includes("dimH") ? p.dimH : null,
      dimW: projKeys.includes("dimW") ? p.dimW : null,
      dimD: projKeys.includes("dimD") ? p.dimD : null,
      profileType: projKeys.includes("profileType") ? p.profileType : null,
    };
    insertSeg.run(payload);

    db.prepare(
      `UPDATE "CostingSection" SET "segmentId" = ? WHERE "projectId" = ?`
    ).run(id, p.id);
    console.log("Migrated project", p.id, "→ segment", id);
  }

  const orphan = db
    .prepare(
      `SELECT COUNT(*) as n FROM "CostingSection" WHERE "segmentId" IS NULL`
    )
    .get();
  if (orphan.n > 0) {
    console.warn(
      "Warning:",
      orphan.n,
      "sections still have NULL segmentId (unexpected)."
    );
  }

  if (tableExists("ManualCostingGroup") && hasColumn("ManualCostingGroup", "projectId")) {
    const groups = db.prepare(`SELECT * FROM "ManualCostingGroup"`).all();
    for (const g of groups) {
      const pid = g.projectId;
      if (!pid) continue;
      let segId = db
        .prepare(
          `SELECT id FROM "CostingSegment" WHERE "projectId" = ? LIMIT 1`
        )
        .get(pid)?.id;
      if (!segId) {
        segId = randomUUID();
        db.prepare(`
INSERT INTO "CostingSegment" (
  "id","projectId","type","title","sortOrder","subtotal",
  "ahuModel","ahuRef","flowCMH","qty","dimH","dimW","dimD","profileType",
  "createdAt","updatedAt"
) VALUES (?,?,'manual','Manual',1,0,
  NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,
  datetime('now'),datetime('now'))
`).run(segId, pid);
        console.log("Created manual segment for project", pid);
      }
      if (!hasColumn("ManualCostingGroup", "segmentId")) {
        db.exec(`ALTER TABLE "ManualCostingGroup" ADD COLUMN "segmentId" TEXT;`);
      }
      db.prepare(
        `UPDATE "ManualCostingGroup" SET "segmentId" = ? WHERE "id" = ?`
      ).run(segId, g.id);
    }
    console.log("Linked ManualCostingGroup rows to segments where applicable.");
  }

  console.log("Done. Next run: npx prisma db push");
} finally {
  db.close();
}
