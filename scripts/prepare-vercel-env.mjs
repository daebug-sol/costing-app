import "dotenv/config";
import fs from "fs";

const direct = process.env.DATABASE_URL;
if (!direct) {
  console.error("DATABASE_URL missing in .env");
  process.exit(1);
}

const pooled = direct.includes("-pooler.")
  ? direct
  : direct.replace(
      /@(ep-[^.]+)\./,
      (_, ep) => `@${ep}-pooler.`
    );

const keys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
];

const lines = [];
for (const k of keys) {
  let v = process.env[k] || "";
  if (k === "DATABASE_URL") v = pooled;
  if (!v) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
  lines.push(`${k}=${JSON.stringify(v)}`);
}
// Do NOT set NODE_ENV on Vercel — it makes npm skip devDependencies (Tailwind/PostCSS).

fs.writeFileSync(".env.vercel", lines.join("\n") + "\n");
console.log("wrote .env.vercel");
console.log("pooled_host", (pooled.match(/@([^/]+)/) || [])[1]);
