import type { Page, Route } from "@playwright/test";

/**
 * Fixed O2C rows for the sales order / invoice / payment tutorials. The seed
 * org has no O2C data, so the list APIs are stubbed per page (no DB writes).
 */

const customer = { id: "cust-tour", name: "Budi Santoso", company: "PT Udara Segar" };

const soRow = {
  id: "so-tour-1",
  soNumber: "SO/2026/10/001",
  tanggal: "2026-10-20T00:00:00.000Z",
  status: "open",
  grandTotal: 185_000_000,
  customer,
};

const soDetail = {
  ...soRow,
  poNumber: "PO-7781",
  paymentTerms: "30 hari",
  notes: null,
  clientAddress: "Jl. Industri 12, Bekasi",
  items: [
    {
      id: "soi-1",
      description: "AHU 5.000 CMH",
      qty: 2,
      uom: "unit",
      unitPrice: 92_500_000,
      totalPrice: 185_000_000,
      deliveredQty: 0,
    },
  ],
  deliveries: [],
  invoices: [],
};

const invRow = {
  id: "inv-tour-1",
  invNumber: null,
  tanggal: "2026-10-21T00:00:00.000Z",
  dueDate: null,
  status: "draft",
  kind: "dp",
  grandTotal: 92_500_000,
  paidTotal: 0,
  customer,
};

const invDetail = {
  ...invRow,
  notes: null,
  subtotal: 83_333_333,
  discountAmt: 0,
  dpp: 83_333_333,
  ppn: 9_166_667,
  pph: 0,
  items: [
    {
      id: "invi-1",
      description: "DP 50% AHU 5.000 CMH",
      qty: 1,
      uom: "lot",
      unitPrice: 83_333_333,
      totalPrice: 83_333_333,
    },
  ],
};

const paymentRow = {
  id: "pay-tour-1",
  payNumber: "PAY/2026/10/001",
  tanggal: "2026-10-22T00:00:00.000Z",
  amount: 92_500_000,
  method: "transfer",
  status: "posted",
  customer,
  allocations: [{ amount: 92_500_000, invoice: { invNumber: "INV/2026/10/001" } }],
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

/** Stubs `GET /api/<base>` (list) and `GET /api/<base>/<id>` (detail). */
async function stub(page: Page, base: string, list: unknown[], detail?: unknown) {
  await page.route(
    (url) => url.pathname === `/api/${base}` || new RegExp(`^/api/${base}/[^/]+$`).test(url.pathname),
    (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const isList = new URL(route.request().url()).pathname === `/api/${base}`;
      return json(route, isList ? list : detail);
    }
  );
}

export async function stubSalesOrders(page: Page, rows = [soRow]) {
  await stub(page, "sales-orders", rows, soDetail);
}

export async function stubInvoices(page: Page, rows = [invRow]) {
  await stub(page, "invoices", rows, invDetail);
}

export async function stubPayments(page: Page, rows = [paymentRow]) {
  await stub(page, "payments", rows);
}

/**
 * Resolves with the status the tour saves for `key`. The PUT is answered
 * here, so the run leaves no progress row behind.
 */
export async function expectTourSaved(page: Page, key: string): Promise<string> {
  let resolve!: (status: string) => void;
  const saved = new Promise<string>((r) => (resolve = r));
  await page.route("**/api/tutorials", (route) => {
    const req = route.request();
    if (req.method() !== "PUT") return route.continue();
    const body = req.postDataJSON() as { key: string; status: string };
    if (body.key === key) resolve(body.status);
    return json(route, { ok: true });
  });
  return Promise.race([
    saved,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`tour ${key} was never saved`)), 15_000)
    ),
  ]);
}
