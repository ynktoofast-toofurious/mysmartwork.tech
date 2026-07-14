# ALKASH-TRANS deployment project

This project is prepared to be deployed separately under the existing domain path:

- `https://www.mysmartwork.tech/MwangazaMail/` for Joel#1
- `https://www.mysmartwork.tech/ALKASH-TRANS/` for this project

## Local development

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

## Production build

```bash
npm run build
```

## Docker deployment

```bash
docker compose up --build
```

The built site is served under `/ALKASH-TRANS/` on port `8080`.

## No-Docker VM deployment

Use:

```powershell
.\tools\deploy-nodocker.ps1 -ServerHost <server-ip-or-hostname> -ServerUser ubuntu -KeyPath C:\path\to\key.pem
```

## Production path setup

This project is configured to build and run from:

- `/ALKASH-TRANS/`

That includes:

- Vite base path
- masked internal links
- direct `*.html` redirects back to `/ALKASH-TRANS/`

## Nginx integration with existing mysmartwork.tech site

This repo includes [deploy/nodocker/nginx-alkash.conf](deploy/nodocker/nginx-alkash.conf), which is a location snippet for the existing `mysmartwork.tech` server block.

It should be included inside the same Nginx `server { ... }` that already serves the main domain.

Example:

```nginx
include /etc/nginx/snippets/alkash-trans-subpath.conf;
```

The no-Docker deploy script uploads the built site to:

- `/var/www/alkash-trans-site`

and installs the snippet to:

- `/etc/nginx/snippets/alkash-trans-subpath.conf`

## Included deployment files

- `Dockerfile`
- `docker-compose.yml`
- `nginx.conf`
- `deploy/nodocker/nginx-alkash.conf`
- `tools/deploy-nodocker.ps1`
- `CNAME` (not used for subpath hosting, kept only as reference)
