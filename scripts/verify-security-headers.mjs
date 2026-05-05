/**
 * Fetches a deployed URL and prints security-relevant response headers.
 * Usage: VERIFY_URL=https://voicetoaction.com npm run verify:headers
 */
const url = process.env.VERIFY_URL || process.argv[2];
if (!url) {
  console.error("Set VERIFY_URL or pass URL as first argument.");
  process.exit(1);
}

const keys = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
];

const res = await fetch(url, { redirect: "follow" });
console.log("URL:", res.url, "status:", res.status);
for (const k of keys) {
  const v = res.headers.get(k);
  console.log(`${k}: ${v || "(missing)"}`);
}
