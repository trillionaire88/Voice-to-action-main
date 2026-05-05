# Cloudflare WAF Rules (Manual Setup)

Apply these in the Cloudflare dashboard for `voicetoaction.io`.

## Managed Custom Rules

1. Block requests where URI path contains `../` or `..%2F` (path traversal).
2. Block requests where URI query string contains `<script` or `javascript:` (XSS).
3. Block requests where URI query string contains `UNION SELECT` or `DROP TABLE` (SQLi).
4. Challenge any request from a known Tor exit node.
5. Challenge any POST request from datacenter IP ranges.
6. Block requests with empty User-Agent or scanner signatures: `sqlmap`, `nikto`, `masscan`, `zgrab`.

## Rate Limiting Rules

1. `/api/*`: 100 requests per minute per IP. Action: block for 1 hour.
2. `/auth/*`: 10 requests per minute per IP. Action: block for 24 hours.

## Validation Checklist

- Verify rules are scoped to production zone.
- Confirm challenge and block actions are logged.
- Test normal traffic from browser and mobile clients.
- Revisit thresholds weekly after observing live traffic.
