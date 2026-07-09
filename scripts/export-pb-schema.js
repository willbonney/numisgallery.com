#!/usr/bin/env node
/**
 * Export full PocketBase collection schemas (including API rules) to
 * backend/pb_collections_schema.json for review-as-code.
 *
 * Usage:
 *   node scripts/export-pb-schema.js
 *   PB_URL=https://numisgallery-pocketbase.fly.dev node scripts/export-pb-schema.js
 *
 * Auth: ADMIN_EMAIL + ADMIN_PASSWORD, or E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD
 */
const fs = require("fs");
const path = require("path");

const PB_URL = process.env.PB_URL || process.env.POCKETBASE_URL || "http://localhost:8090";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (or E2E_ADMIN_* equivalents)",
    );
    process.exit(1);
  }

  const authRes = await fetch(
    `${PB_URL}/api/collections/_superusers/auth-with-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    },
  );

  if (!authRes.ok) {
    console.error("Auth failed:", await authRes.text());
    process.exit(1);
  }

  const { token } = await authRes.json();
  const colRes = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  });

  if (!colRes.ok) {
    console.error("List collections failed:", await colRes.text());
    process.exit(1);
  }

  const data = await colRes.json();
  const items = data.items || [];
  const outPath = path.join(
    __dirname,
    "..",
    "backend",
    "pb_collections_schema.json",
  );

  fs.writeFileSync(outPath, JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${items.length} collections to ${path.relative(process.cwd(), outPath)}`,
  );

  // Print rule summary for quick review
  for (const c of items) {
    if (c.system && c.name.startsWith("_")) continue;
    console.log(
      `  ${c.name}: list=${JSON.stringify(c.listRule)} create=${JSON.stringify(c.createRule)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
