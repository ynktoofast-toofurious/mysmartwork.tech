# mysmartwork.tech (Mwangaza + ALKASH + Portal + API)

This repository contains:

- A shared root portal (`index.html`) for project-code access
- A Mwangaza project folder (`Mwangaza/`)
- An ALKASH project folder (`ALKASH/`)
- A public landing page (`index.html`, `script.js`, `styles.css`)
- A protected admin front-end (`admin/`)
- A Node.js API (`api/`) designed for Neon PostgreSQL-backed analytics and governance
- A no-Docker deployment path (PM2 + Nginx on a Linux VM)
- Optional Docker setup for running web + API together

## Repository Structure

- `Mwangaza/` contains the Mwangaza project files served publicly under `/MwangazaMail/`
- `ALKASH/` contains the ALKASH project source and build served publicly under `/ALKASH-TRANS/`
- Root files power the shared portal and operational assets for `mysmartwork.tech`

## 1) Configure API Environment

Copy `api/.env.example` to `api/.env` and provide your Neon PostgreSQL connection details.

The API supports either a Neon connection string or individual PostgreSQL fields.

Required variables are defined in `api/src/config.js` and include:

- `PORT`
- `DATABASE_URL` or `NEON_DATABASE_URL` (also accepts `MWANGAZAMAIL_DATABASE_URL` / `MWANGAZA_DATABASE_URL`)
- `NEON_HOST`
- `NEON_PORT`
- `NEON_DB`
- `NEON_USER`
- `NEON_PASSWORD`
- `NEON_SSL`
- `DB_POOL_MAX`

## 2) Create Star Schema in Neon PostgreSQL

Run the SQL in `api/sql/star_schema.sql` against your Neon database.

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

### AWS Deployment Target

API deployment uses AWS account `rnbevents716` (`8904-3938-9718`) only for runtime/API activity.

### Low-Cost Deployment Mode

The deploy script supports a low-cost baseline by default:

- `DesiredCount=1`
- Auto scaling disabled unless explicitly enabled
- CloudWatch log retention set to 7 days

Run:

```powershell
.\tools\deploy-aws-api.ps1 -ProfileName rnbevents716 -Region us-east-1
```

Optional (only if you want scaling):

```powershell
.\tools\deploy-aws-api.ps1 -ProfileName rnbevents716 -Region us-east-1 -EnableAutoScaling -MinCapacity 1 -MaxCapacity 2
```

Note: there is no fully free always-on ECS/ALB option on AWS.

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

## 6) No-Docker Deployment (Recommended)

This path deploys directly to a Linux VM (Ubuntu/Debian) without ECS/ECR/Docker.

### 6.1 One-time server bootstrap

Run on the server:

```bash
bash tools/bootstrap-nodocker-server.sh
```

Then edit runtime secrets:

```bash
sudo nano /etc/mwangaza/api.env
```

Enable PM2 to restart apps after reboot (run once on server):

```bash
pm2 startup
pm2 save
```

### 6.2 Deploy from local Windows machine

From repository root:

```powershell
.\tools\deploy-nodocker.ps1 -ServerHost <server-ip-or-hostname> -ServerUser ubuntu -KeyPath C:\path\to\key.pem
```

Optional domain overrides:

```powershell
.\tools\deploy-nodocker.ps1 -ServerHost <server> -SiteDomain mysmartwork.tech -SiteDomainAlias www.mysmartwork.tech -ApiDomain api.mysmartwork.tech
```

What this script does:

- Uploads a release archive
- Installs API dependencies on the server (`npm ci --omit=dev`)
- Switches `/opt/mwangaza/current` to the new release
- Reloads PM2 app (`deploy/nodocker/ecosystem.config.cjs`)
- Publishes Nginx config from `deploy/nodocker/nginx-mwangaza.conf`
- Reloads Nginx

### 6.3 Enable HTTPS

After DNS points to the server, run on the server:

```bash
sudo certbot --nginx -d mysmartwork.tech -d www.mysmartwork.tech -d api.mysmartwork.tech
```

## 7) Docker Run (Optional)

From repository root:

```bash
docker compose up --build
```

- Web container serves static site via Nginx.
- API container runs Node service.
- Nginx proxies `/api/*` requests to API service.

## 8) Implemented Admin Capabilities

- Incident filters: category, city, severity, status, search
- Incident revision save (status/severity updates)
- SEO tab:
  - Access events table (`fact_access_event`)
  - Audit trail table (`audit_trail`)
  - KPI cards for events/routes/users/locations

## 9) Landing Governance Additions

- Cookies disclosure popup with explicit accept/reject
- Consent persistence in `localStorage`
- Public route access tracking request to admin API

## 10) Auth Guard (Current)

Admin access remains local-storage based (`mwangaza_auth`) for lightweight demo use.
For production, replace with server-side auth and signed session/JWT controls.

## 11) WhatsApp Claim Intake (Webhook + OpenAI + Neon PostgreSQL)

The API now supports WhatsApp Business incoming chat intake:

- Webhook verification endpoint: `GET /api/whatsapp/webhook`
- Webhook receive endpoint: `POST /api/whatsapp/webhook`

Processing flow:

1. Receive incoming WhatsApp text message
2. Keep a per-phone conversation session (stored in `audit_trail`) to collect all required details
3. OpenAI drives follow-up questions until required fields are complete: reporter reference, institution, city, description
4. OpenAI classifies/category + severity suggestion for the completed incident
5. Generate a unique reference number (`WM-YYYYMMDD-XXXXXX`)
6. Save claim into PostgreSQL `fact_incident`
7. Log governance records in `audit_trail`
8. Reply to WhatsApp with the generated reference number

Conversation guardrails:

- The assistant is restricted to incident intake only.
- Off-topic messages trigger warnings.
- After repeated off-topic attempts, chat is discontinued and user must send `RESTART`.

Required environment variables in `api/.env`:

- `PUBLIC_BASE_URL` (public API base URL, e.g. `https://api.yourdomain.com`)
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_VERSION` (default `v20.0`)
- `WHATSAPP_DAILY_MESSAGE_LIMIT` (optional, rolling 24h safety cap, default `300`)
- `WHATSAPP_DAILY_MESSAGE_ALERT_THRESHOLD` (optional early warning level, default `240`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)

Meta webhook setup values:

- Callback URL: `${PUBLIC_BASE_URL}/api/whatsapp/webhook`
- Verify Token: `${WHATSAPP_VERIFY_TOKEN}`

When Meta sends the verification challenge, API responds with the challenge only when token matches.

## 12) Shared-Domain Path Routing

This domain can serve both projects under `www.mysmartwork.tech` with path-based routing:

- `https://www.mysmartwork.tech/MwangazaMail/` -> Joel app path
- `https://www.mysmartwork.tech/ALKASH-TRANS/` -> ALKASH-TRANS app path

Nginx config `deploy/nodocker/nginx-mwangaza.conf` includes both location blocks.

Expected ALKASH-TRANS static path on server:

- `/var/www/alkash-trans-site`

### Legacy URL Protection

Nginx now redirects legacy/old page-name links to the domain root:

- `/*.html` -> `https://www.mysmartwork.tech/`
- `/MwangazaMail/*.html` -> `https://www.mysmartwork.tech/`
- `/ALKASH-TRANS/*.html` -> `https://www.mysmartwork.tech/`
- old admin links (`/admin`, `/MwangazaMail/admin`) -> `https://www.mysmartwork.tech/`
