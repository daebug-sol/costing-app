"""Restore AHU catalog from legacy SQLite into current Neon org."""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[1]
SQLITE = ROOT / "tmp-restore" / "dev.db"
ORG_ID = "cmrk4x299000004k0tk6jjnz0"


def load_env() -> str:
    env_path = ROOT / ".env"
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL missing in .env")


def cuidish(prefix: str, i: int) -> str:
    return f"{prefix}_{ORG_ID[-8:]}_{i:04d}"


def main() -> None:
    if not SQLITE.exists():
        raise SystemExit(f"missing {SQLITE}")

    sq = sqlite3.connect(SQLITE)
    sq.row_factory = sqlite3.Row
    materials = [dict(r) for r in sq.execute("SELECT * FROM MaterialPrice")]
    profiles = [dict(r) for r in sq.execute("SELECT * FROM ProfileData")]
    components = [dict(r) for r in sq.execute("SELECT * FROM ComponentCatalog")]
    sq.close()

    print(f"loaded sqlite: materials={len(materials)} profiles={len(profiles)} components={len(components)}")

    url = load_env()
    # prefer pooled if present via env already
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            # ensure folders/files
            custom_id = f"folder_custom_{ORG_ID}"
            ahu_id = f"folder_ahu_{ORG_ID}"
            cur.execute(
                """
                INSERT INTO "DatabaseFolder" (id, "organizationId", scope, name, "sortOrder", "createdAt", "updatedAt")
                VALUES (%s, %s, 'custom', 'Umum', 0, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                (custom_id, ORG_ID),
            )
            cur.execute(
                """
                INSERT INTO "DatabaseFolder" (id, "organizationId", scope, name, "sortOrder", "createdAt", "updatedAt")
                VALUES (%s, %s, 'ahu', 'Umum', 0, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                (ahu_id, ORG_ID),
            )
            files = {
                "materials": (f"ahufile_materials_{ORG_ID}", "materials", "Material Prices", 0),
                "profiles": (f"ahufile_profiles_{ORG_ID}", "profiles", "Profile Data", 1),
                "components": (f"ahufile_components_{ORG_ID}", "components", "Component Catalog", 2),
            }
            for _k, (fid, kind, name, sort) in files.items():
                cur.execute(
                    """
                    INSERT INTO "AhuDatasetFile" (id, "folderId", kind, name, "sortOrder", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (fid, ahu_id, kind, name, sort),
                )

            cur.execute('DELETE FROM "MaterialPrice" WHERE "organizationId"=%s', (ORG_ID,))
            cur.execute('DELETE FROM "ProfileData" WHERE "organizationId"=%s', (ORG_ID,))
            cur.execute('DELETE FROM "ComponentCatalog" WHERE "organizationId"=%s', (ORG_ID,))

            for i, m in enumerate(materials, 1):
                cur.execute(
                    """
                    INSERT INTO "MaterialPrice"
                      (id, "organizationId", "datasetFileId", code, name, category, density, "pricePerKg", currency, unit, notes, "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                    """,
                    (
                        cuidish("mat", i),
                        ORG_ID,
                        files["materials"][0],
                        m["code"],
                        m["name"],
                        m["category"],
                        m["density"],
                        m["pricePerKg"],
                        m.get("currency") or "IDR",
                        m.get("unit") or "kg",
                        m.get("notes"),
                    ),
                )

            for i, p in enumerate(profiles, 1):
                cur.execute(
                    """
                    INSERT INTO "ProfileData"
                      (id, "organizationId", "datasetFileId", code, name, type, "weightPerM", "pricePerM", "panelThick", notes, "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                    """,
                    (
                        cuidish("prof", i),
                        ORG_ID,
                        files["profiles"][0],
                        p["code"],
                        p["name"],
                        p["type"],
                        p["weightPerM"],
                        p["pricePerM"],
                        p.get("panelThick"),
                        p.get("notes"),
                    ),
                )

            for i, c in enumerate(components, 1):
                cur.execute(
                    """
                    INSERT INTO "ComponentCatalog"
                      (id, "organizationId", "datasetFileId", code, name, category, subcategory, brand, model, spec, "unitPrice", currency, unit, moq, "leadTimeDays", supplier, notes, "createdAt", "updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                    """,
                    (
                        cuidish("comp", i),
                        ORG_ID,
                        files["components"][0],
                        c["code"],
                        c["name"],
                        c["category"],
                        c.get("subcategory"),
                        c.get("brand"),
                        c.get("model"),
                        c.get("spec"),
                        c["unitPrice"],
                        c.get("currency") or "IDR",
                        c.get("unit") or "pcs",
                        c.get("moq"),
                        c.get("leadTimeDays"),
                        c.get("supplier"),
                        c.get("notes"),
                    ),
                )

            cur.execute(
                'SELECT count(*) FROM "MaterialPrice" WHERE "organizationId"=%s', (ORG_ID,)
            )
            mc = cur.fetchone()[0]
            cur.execute(
                'SELECT count(*) FROM "ProfileData" WHERE "organizationId"=%s', (ORG_ID,)
            )
            pc = cur.fetchone()[0]
            cur.execute(
                'SELECT count(*) FROM "ComponentCatalog" WHERE "organizationId"=%s', (ORG_ID,)
            )
            cc = cur.fetchone()[0]
        conn.commit()

    print(f"restored into org {ORG_ID}: materials={mc} profiles={pc} components={cc}")
    print("Refresh Database → AHU in the browser.")


if __name__ == "__main__":
    try:
        import psycopg  # noqa: F401
    except ImportError:
        os.system(f'"{sys.executable}" -m pip install psycopg[binary] -q')
    main()
