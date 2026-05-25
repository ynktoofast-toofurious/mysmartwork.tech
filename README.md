# MwangazaMail (Landing + Admin + Redshift API)

This repository contains:

- A public landing page (`index.html`, `script.js`, `styles.css`)
- A protected admin front-end (`admin/`)
- A Node.js API (`api/`) designed for AWS Redshift-backed analytics and governance
- Docker setup for running web + API together

## 1) Configure API Environment

Copy `api/.env.example` to `api/.env` and provide your Redshift credentials.

Required variables are defined in `api/src/config.js` and include:

- `PORT`
- `REDSHIFT_HOST`
- `REDSHIFT_PORT`
- `REDSHIFT_DB`
- `REDSHIFT_USER`
- `REDSHIFT_PASSWORD`
- `REDSHIFT_SCHEMA`
- `REDSHIFT_SSL`

## 2) Create Star Schema in Redshift

Run the SQL in `api/sql/star_schema.sql` against your Redshift database.

This creates the data warehouse objects, including:

- Dimension tables (`dim_user`, `dim_category`, `dim_institution`, etc.)
- Fact tables (`fact_incident`, `fact_access_event`)
- Governance table (`audit_trail`)

## 3) Load Static Seed Data

From the `api/` folder:

```bash
npm install
npm run check
npm run seed
```

- `npm run check` verifies connectivity.
- `npm run seed` loads initial records in star-schema tables.

## 4) Run API Locally

From the `api/` folder:

```bash
npm run dev
```

Health check:

- `GET http://localhost:4000/health`

Admin API base:

- `http://localhost:4000/api/admin`

## 5) Run Frontend Locally

Serve project root with any static server. Example:

```bash
npx serve .
```

Open:

- Landing: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin/`

Admin UI attempts API in this order:

1. `/api/admin` (same origin, for reverse proxy/container setups)
2. `http://localhost:4000/api/admin` (local development fallback)

## 6) Docker Run

From repository root:

```bash
docker compose up --build
```

- Web container serves static site via Nginx.
- API container runs Node service.
- Nginx proxies `/api/*` requests to API service.

## 7) Implemented Admin Capabilities

- Incident filters: category, city, severity, status, search
- Incident revision save (status/severity updates)
- SEO tab:
  - Access events table (`fact_access_event`)
  - Audit trail table (`audit_trail`)
  - KPI cards for events/routes/users/locations

## 8) Landing Governance Additions

- Cookies disclosure popup with explicit accept/reject
- Consent persistence in `localStorage`
- Public route access tracking request to admin API

## 9) Auth Guard (Current)

Admin access remains local-storage based (`mwangaza_auth`) for lightweight demo use.
For production, replace with server-side auth and signed session/JWT controls.

## 10) WhatsApp Claim Intake (Webhook + OpenAI + Redshift)

The API now supports WhatsApp Business incoming chat intake:

- Webhook verification endpoint: `GET /api/whatsapp/webhook`
- Webhook receive endpoint: `POST /api/whatsapp/webhook`

Processing flow:

1. Receive incoming WhatsApp text message
2. Extract structured claim fields using OpenAI
3. Generate a unique reference number (`WM-YYYYMMDD-XXXXXX`)
4. Save claim into Redshift `fact_incident`
5. Log governance records in `audit_trail`
6. Reply to WhatsApp with the generated reference number

Required environment variables in `api/.env`:

- `PUBLIC_BASE_URL` (public API base URL, e.g. `https://api.yourdomain.com`)
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_VERSION` (default `v20.0`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)

Meta webhook setup values:

- Callback URL: `${PUBLIC_BASE_URL}/api/whatsapp/webhook`
- Verify Token: `${WHATSAPP_VERIFY_TOKEN}`

When Meta sends the verification challenge, API responds with the challenge only when token matches.
