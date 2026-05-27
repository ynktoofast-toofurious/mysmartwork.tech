# MwangazaMail — Internal Business Plan (CONFIDENTIAL)
> Version 1.0 — May 2026 | Powered by YNK-Tech USA

---

## 1. Executive Summary

**MwangazaMail** is a SaaS governance intelligence platform targeting public institutions in the Democratic Republic of Congo (DRC). It enables citizens to report incidents of corruption, abuse of authority, embezzlement, and administrative misconduct through WhatsApp — the most widely used messaging platform in Central Africa.

Reported incidents are ingested in real time, stored in a cloud data warehouse, analysed with AI, and surfaced to institutional subscribers through a secure admin dashboard. Institutions pay a monthly subscription fee to access filtered analytics about incidents affecting their sector, city, and category.

The platform is currently live and production-ready.

---

## 2. Problem Statement

Governance failures in the DRC are widespread, under-documented, and rarely actioned because:

- Citizens have no safe, accessible channel to report misconduct.
- Government institutions have no real-time visibility on incidents.
- Media and NGOs lack structured, searchable data.
- Language and infrastructure barriers prevent traditional web-form reporting.

WhatsApp has 80%+ smartphone penetration in urban DRC. Text messaging is the natural language of citizen communication.

---

## 3. Solution

MwangazaMail provides a three-layer platform:

### Layer 1 — Citizen Reporting (WhatsApp)
- Citizens send reports via WhatsApp Business API.
- Each message is parsed, categorised, and geo-tagged.
- Incidents are assigned a reference number, category, severity, and status.
- No app download, no registration required.

### Layer 2 — Data Intelligence (Cloud Data Warehouse)
- All incidents stored in a star-schema data warehouse (Redshift Serverless).
- Dimensions: user, category, institution, location, severity, status, time.
- Facts: incident records, access events.
- Full audit trail of every record change.
- AI-powered trend analysis using OpenAI GPT.

### Layer 3 — Institutional Dashboard (Web Admin)
- Secure admin portal accessible via web browser.
- Features: incident list, filters (city, category, severity, status), revision tools, user management, SEO analytics, AI analysis chat.
- Role-based access: Admin, Agent, Viewer.
- Password-protected with audit trail.

---

## 4. Business Model

### Revenue: Subscription Tiers

| Plan | Monthly Price (USD) | Features |
|---|---|---|
| Pilote | $499 | 1 user, view-only access, limited incidents |
| Standard | $1,500 | Up to 5 users, full incident access, city filter |
| Premium | $7,500 | Unlimited users, full access, AI analysis, priority support |

### Target Subscribers
- Municipal governments (Mairie)
- National police, customs, and border control
- Tax authority (DGI)
- Tribunals and justice institutions
- NGOs, international aid organisations, and press
- Private compliance departments of large companies operating in DRC

### Revenue Projections (Conservative)

| Year | Subscribers | Avg Monthly | Annual Revenue |
|---|---|---|---|
| Year 1 | 5 | $1,200 | ~$72,000 |
| Year 2 | 20 | $2,000 | ~$480,000 |
| Year 3 | 60 | $2,500 | ~$1,800,000 |

---

## 5. Technology Stack (Current Production)

### Frontend
- **Static HTML/CSS/JS** hosted on **GitHub Pages** (zero hosting cost)
- Public landing page: `mwangaza.cd` (or equivalent)
- Admin dashboard: `/MwangazaMail/admin/`
- 404 security redirect: any unknown path redirects to landing
- Fonts: Google Fonts (Plus Jakarta Sans, Outfit)

### Backend API
- **Node.js + Express** running in **AWS ECS Fargate**
- Language: ES Modules (JavaScript)
- Port: 4000, exposed via ALB on 443 (HTTPS)
- API domain: `api.mysmartwork.tech`
- 2 tasks, 0.5 vCPU / 1 GB memory each
- Container registry: **AWS ECR**

### Database
- **Amazon Redshift Serverless** (workgroup: `mwangazamail`)
- Star schema with dimensions and fact tables
- Tables: `dim_user`, `dim_category`, `dim_institution`, `dim_location`, `dim_severity`, `dim_status`, `dim_time`, `fact_incident`, `fact_access_event`, `audit_trail`
- Password-based authentication for users (scrypt hash)

### AI Analysis
- **OpenAI GPT** (model: `gpt-4o-mini`)
- Used for natural language trend analysis queries
- Streaming chat interface in admin dashboard right-side drawer

### Messaging (WhatsApp)
- **WhatsApp Business API** (Meta Graph API v20.0)
- Webhook for inbound message ingestion
- Verify token + access token secured in AWS Secrets Manager

### Security & Secrets
- **AWS Secrets Manager**: all env vars stored encrypted (`mwangaza/api/prod`)
- Passwords hashed with `scrypt` (Node.js native crypto, no third-party lib)
- Admin routes: no public access without valid session
- All sensitive errors stripped from user-facing messages
- Custom 404 redirects prevent fingerprinting

### Infrastructure & DevOps
- **AWS ECS Fargate**: serverless container compute
- **AWS ECR**: container image registry
- **AWS ALB**: HTTPS load balancer, SSL via ACM
- **Amazon Route 53**: DNS
- **AWS CloudWatch**: container logs
- **GitHub Actions / Manual deploy scripts**: PowerShell deploy pipeline

---

## 6. Current Infrastructure Costs (Monthly)

| Service | Cost/Month |
|---|---|
| ECS Fargate (2 tasks × 0.5 vCPU / 1 GB) | ~$36 |
| Application Load Balancer | ~$18 |
| Redshift Serverless (low usage) | ~$5–$20 |
| ECR image storage | ~$1 |
| CloudWatch logs | ~$1 |
| Secrets Manager | ~$0.40 |
| GitHub Pages (frontend) | $0 |
| **Total** | **~$61–$76/month** |

### Paused (zero-traffic) state
- ECS scaled to 0 tasks → Fargate compute drops to $0
- ALB still charges base hourly rate (~$18/mo) unless deleted
- **Minimum paused cost: ~$19–$25/month**

### At scale (50 institutions, ~1M requests/month)
- Scale ECS to 4–6 tasks → ~$72–$108 Fargate
- Redshift Serverless auto-scales → ~$50–$150
- ALB LCUs → ~$10–$30
- **Estimated total at scale: ~$150–$300/month**
- Breakeven at 1 Standard subscriber ($1,500) covers infrastructure at any realistic scale.

---

## 7. Go-To-Market Strategy

### Phase 1 — Seed (Months 1–3)
- Onboard 3–5 pilot institutions (free or Pilote tier)
- Deploy WhatsApp number targeting 2 major cities (Kinshasa, Lubumbashi)
- Seed database with historical incident reports

### Phase 2 — Growth (Months 4–9)
- Partner with anti-corruption NGOs (Transparency International DRC, etc.)
- Offer NGO press accounts for data access
- Expand to 5 additional cities

### Phase 3 — Scale (Months 10–18)
- Premium tier rollout with AI analysis SLA
- API reseller program for journalists and researchers
- Expand to neighbouring countries (Congo-Brazzaville, Burundi, Rwanda)

---

## 8. Competitive Advantage

1. **WhatsApp-native** — no app friction, meets citizens where they already are.
2. **Structured data** — not just message logs, real queryable star-schema intelligence.
3. **AI-ready** — GPT-powered trend analysis built-in from day one.
4. **Institutional SaaS** — sell access to the data, not just the reporting tool.
5. **Cloud-native** — zero on-premise hardware, near-zero downtime, scales with demand.
6. **Low burn** — total infrastructure under $100/month even while paused, profitable at first subscriber.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| WhatsApp API access revoked | Backup SMS/web form channel |
| Low institutional adoption | Free pilot tier + NGO partnerships |
| Internet access limitations in DRC | WhatsApp works on 2G/3G mobile |
| Data privacy / political sensitivity | Data anonymisation options, hosted in US region |
| Cost overruns | AWS billing alerts, scale-to-zero by default |

---

## 10. Team

- **Founder / Technical Lead**: YNK-Tech USA
- Platform: Fully built, deployed, and live.
- Roles needed for growth: Sales lead (DRC), Support agent (French/Lingala), Data analyst.

---

## 11. Funding & Use of Funds

### Seed Ask: $50,000

| Allocation | Amount |
|---|---|
| Sales & market entry (DRC travel, partnerships) | $20,000 |
| WhatsApp Business API verification & scaling | $5,000 |
| Infrastructure scaling fund (12 months) | $10,000 |
| Legal & compliance (DRC entity setup) | $8,000 |
| Operational reserve | $7,000 |

### Break-even
- **4 Standard subscribers** cover all operating costs indefinitely.
- **1 Premium subscriber** covers costs with margin.

---

*CONFIDENTIAL — Internal Use Only — YNK-Tech USA / MwangazaMail*
