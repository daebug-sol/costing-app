import type { Prisma } from "@prisma/client";
import { DOC_TYPES, type DocType } from "@/lib/o2c/status";

type Tx = Prisma.TransactionClient;

type PrefixSettings = {
  quoPrefix: string;
  soPrefix: string;
  doPrefix: string;
  invPrefix: string;
  payPrefix: string;
};

function periodYYYYMM(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function prefixFor(
  docType: DocType,
  settings: PrefixSettings | null | undefined
): string {
  switch (docType) {
    case DOC_TYPES.QUO:
      return settings?.quoPrefix?.trim() || "QT";
    case DOC_TYPES.SO:
      return settings?.soPrefix?.trim() || "SO";
    case DOC_TYPES.DO:
      return settings?.doPrefix?.trim() || "SJ";
    case DOC_TYPES.INV:
      return settings?.invPrefix?.trim() || "INV";
    case DOC_TYPES.PAY:
      return settings?.payPrefix?.trim() || "PAY";
    default:
      return "DOC";
  }
}

/**
 * Atomically allocate the next document number for an org + doc type + period.
 * Format: `{PREFIX}-{YYYYMM}-{seq4}` e.g. QT-202608-0001
 */
export async function nextDocumentNumber(
  docType: DocType,
  orgId: string,
  tx: Tx,
  opts?: { at?: Date; settings?: PrefixSettings | null }
): Promise<string> {
  const at = opts?.at ?? new Date();
  const period = periodYYYYMM(at);

  let settings = opts?.settings;
  if (!settings) {
    settings = await tx.appSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        quoPrefix: true,
        soPrefix: true,
        doPrefix: true,
        invPrefix: true,
        payPrefix: true,
      },
    });
  }

  const row = await tx.documentSequence.upsert({
    where: {
      organizationId_docType_period: {
        organizationId: orgId,
        docType,
        period,
      },
    },
    create: {
      organizationId: orgId,
      docType,
      period,
      lastNumber: 1,
    },
    update: {
      lastNumber: { increment: 1 },
    },
  });

  const seq = String(row.lastNumber).padStart(4, "0");
  const prefix = prefixFor(docType, settings);
  return `${prefix}-${period}-${seq}`;
}

export function formatDocumentNumber(
  prefix: string,
  period: string,
  seq: number
): string {
  return `${prefix}-${period}-${String(seq).padStart(4, "0")}`;
}

export { periodYYYYMM };
