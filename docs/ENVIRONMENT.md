# Environment variables

All variables live in a single `.env` at the repository root; both apps read it. Start from [`.env.example`](../.env.example).

| Variable | Used by | Description |
|---|---|---|
| `NODE_ENV` | both | `development` / `production` / `test` |
| `API_PORT` | API | Port the API listens on (default `4000`) |
| `CORS_ORIGINS` | API | Comma-separated origins allowed to call the API with credentials |
| `API_PUBLIC_URL` | API | Public base URL of the API |
| `WEB_PUBLIC_URL` | API | Public URL of the web app — used in QR codes and password-reset links |
| `WEB_INTERNAL_URL` | API | URL the API uses to call the web app's `/api/revalidate` (defaults to `WEB_PUBLIC_URL`) |
| `REVALIDATE_SECRET` | both | Shared secret for on-demand cache revalidation. Empty disables it (ISR still refreshes every 60 s) |
| `APP_TIMEZONE` | API | Timezone for "today"/"this month" stats and order date filters (default `Asia/Damascus`) |
| `DB_HOST` `DB_PORT` `DB_USERNAME` `DB_PASSWORD` `DB_NAME` | API, docker-compose | PostgreSQL connection |
| `DATABASE_URL` | API | Optional single connection string (used by Render); overrides the `DB_*` values |
| `JWT_ACCESS_SECRET` | API | Secret for 15-minute access tokens |
| `JWT_REFRESH_SECRET` | API | Secret for 7-day refresh tokens (httpOnly cookie) |
| `JWT_ACCESS_TTL` `JWT_REFRESH_TTL` | API | Token lifetimes (`15m`, `7d`) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM` | API | Outgoing mail. With `SMTP_HOST` empty, password-reset links are printed to the API console |
| `DB_SSL` | API | `true` when the database requires TLS (managed hosts) |
| `DEMO_MODE` | API | `true` on a public showcase instance: on boot it writes demo plans and placeholder payment details (only while none are configured), creates the admin below as the single admin account, lifts any suspension on the demo stores, and re-seeds the showcase images when the host's ephemeral disk has lost them |
| `DEMO_ADMIN_EMAIL` `DEMO_ADMIN_PASSWORD` | API | The demo instance's admin login, created on first boot |
| `UPLOAD_DIR` | API | Folder for uploaded images, relative to `backend/` (default `uploads`) |
| `UPLOAD_MAX_BYTES` | API | Max upload size (default 5 MB) |
| `NEXT_PUBLIC_API_URL` | web | API base URL used by the browser (inlined at build time) |
| `API_INTERNAL_URL` | web | API base URL used by server components (defaults to `NEXT_PUBLIC_API_URL`) |
| `NEXT_PUBLIC_SITE_URL` | web | Canonical site URL for metadata and OpenGraph |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
