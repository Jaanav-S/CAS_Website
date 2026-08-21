# Deploying (Docker + auto-deploy from GitHub)

The live site runs as three containers — the app, its MongoDB, and Caddy for
HTTPS — described in `docker-compose.yml`. Every push to `main` rebuilds the
image in GitHub Actions and the server pulls it. Nothing but a `.env` file is
server-specific, so **changing domain or server later means editing that file
and re-running one command.**

---

## One-time: GitHub setup

1. **Make the image registry work.** Nothing to do in code — the workflow
   (`.github/workflows/deploy.yml`) pushes to
   `ghcr.io/<your-username>/cas_website` using the built-in token.

2. **Add repository secrets** (Settings → Secrets and variables → Actions →
   *New repository secret*):

   | Secret       | Value                                                        |
   | ------------ | ------------------------------------------------------------ |
   | `SSH_HOST`   | the Vultr server's IP                                        |
   | `SSH_USER`   | the SSH user you deploy as (e.g. `deploy` or `root`)         |
   | `SSH_KEY`    | the **private** SSH key for that user (whole file contents)   |
   | `SSH_PORT`   | *(optional)* SSH port if not 22                              |
   | `DEPLOY_DIR` | *(optional)* deploy folder if not `/opt/cas`                 |

---

## One-time: server setup (Vultr)

SSH into the server, then:

```bash
# 1. Install Docker (official convenience script)
curl -fsSL https://get.docker.com | sh

# 2. Create the deploy folder and go there
sudo mkdir -p /opt/cas && cd /opt/cas

# 3. Bring over the three files the server needs
#    (copy them from the repo, or scp/paste them in):
#      - docker-compose.yml
#      - Caddyfile
#      - .env   (created from .env.production.example, see next step)
```

Create `/opt/cas/.env` from `.env.production.example` and fill in every value —
Atlas is not used; the `MONGO_USER`/`MONGO_PASSWORD` you set here become the
database's credentials. Generate the two secrets:

```bash
# AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# a strong Mongo password
openssl rand -hex 24
```

Set `MAINTAINER_KEYS` with `node scripts/maintainer-hash.mjs you@example.com`
(run locally, using the same AUTH_SECRET you put in `.env`).

**Let the server pull private images once:**

```bash
# a GitHub Personal Access Token with read:packages scope
echo YOUR_GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

**Point DNS:** add an `A` record for `texnnet.com` → the server's IP, and make
sure ports **80** and **443** are open in the Vultr firewall.

**Google OAuth:** in the Google Cloud console, add
`https://texnnet.com/api/auth/google/callback` as an authorised redirect URI.

**Start it:**

```bash
cd /opt/cas
docker compose up -d
```

Caddy fetches the certificate within a minute. Visit `https://texnnet.com`, sign
in with the `BOOTSTRAP_ADMIN_EMAIL` Google account, and you're in.

---

## From now on

Push to `main` → Actions builds and pushes the image → the server pulls and
restarts. Watch a run under the repo's **Actions** tab. You can also trigger a
deploy by hand there (*Run workflow*).

---

## Moving domain or server later

**New domain:**

1. Edit `APP_DOMAIN` in `/opt/cas/.env`.
2. Update the Google console redirect URI to the new domain.
3. `docker compose up -d` (Caddy re-issues the certificate).

Sign-up links and the OAuth redirect follow `APP_DOMAIN` automatically.

**New server (e.g. the school's local box):**

1. Install Docker, copy `docker-compose.yml`, `Caddyfile` and `.env` across,
   `docker login ghcr.io`, `docker compose up -d`.
2. Move the data: `docker compose exec -T mongo mongodump --archive` on the old
   box piped into `mongorestore --archive` on the new one, and copy the uploads
   volume (`docker run --rm -v cas_uploads:/from -v $PWD:/to alpine tar cf /to/uploads.tar -C /from .`).
3. Point DNS at the new server and add its SSH secrets to GitHub.

> **Certificates on an internal-only school network:** public Let's Encrypt
> needs 80/443 reachable from the internet. If the school box is not, either use
> a DNS-challenge issuer (e.g. Cloudflare) or, in `Caddyfile`, replace the
> domain line with `:443` and add `tls internal` for Caddy's own CA.

---

## Handy commands (on the server)

```bash
docker compose ps           # what's running
docker compose logs -f app  # app logs
docker compose pull app && docker compose up -d   # manual update
docker compose down         # stop everything (data volumes are kept)
```
