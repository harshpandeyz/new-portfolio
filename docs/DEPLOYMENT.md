# Oracle Cloud production deployment

This runbook deploys the checked-out repository as a single ARM64 Compose stack:

```text
Internet → host Caddy (80/443, automatic TLS) → Web NGINX (127.0.0.1:5173)
                                               → Fastify API (private Compose network)
                                      Fastify → PostgreSQL (private Compose network)
```

The API and web maintenance ports bind only to host loopback. PostgreSQL binds
only to host loopback and the private Docker network. The browser calls `/api`
on the same HTTPS origin, so `VITE_API_URL` stays unset in production.

## 1. Oracle VM and ARM64 preparation

Create an Oracle Cloud **VM.Standard.A1.Flex** VM using Ubuntu Server 24.04
ARM64. The Always Free allowance for A1 is up to 2 OCPU and 12 GB RAM in total
for the tenancy; verify the Always Free indicator and regional capacity before
creating it. Assign a reserved public IPv4 address. Record its private VCN
subnet CIDR so the Compose subnet below can be checked for overlap.

SSH in and confirm the actual architecture and OS before installing packages:

```sh
uname -m
dpkg --print-architecture
. /etc/os-release && printf '%s %s\n' "$PRETTY_NAME" "$VERSION_CODENAME"
```

Expected values include `aarch64`, `arm64`, and `noble`. Use a dedicated
non-root deployment account with SSH keys. Disable password SSH after verifying
key login in a second terminal.

## 2. OCI network rules and host firewall

In the VCN security list or an NSG attached to the VM VNIC, allow stateful
ingress only for:

| Protocol | Port | Source |
|---|---:|---|
| TCP | 22 | Your trusted administrator IP CIDR, such as `203.0.113.8/32` |
| TCP | 80 | `0.0.0.0/0` |
| TCP | 443 | `0.0.0.0/0` |

Add equivalent IPv6 web rules only if the VM and DNS have working IPv6. Do not
create ingress rules for 4000, 5173, 5432, or any Docker bridge port. Keep the
required outbound rules for DNS, HTTPS package/API traffic, and OCI services.

After confirming that the SSH source CIDR is correct, configure Ubuntu's host
firewall. Docker-published ports can bypass ordinary UFW filtering, so retain
the OCI security rules as the public boundary and keep Compose bindings on
`127.0.0.1`:

```sh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 203.0.113.8/32 to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Replace the example SSH CIDR before applying. Verify SSH from a second terminal
before closing the current connection.

## 3. DNS and repository checkout

Create an `A` record for the canonical site hostname pointing to the reserved
public IPv4 address. Remove stale A records. Add an `AAAA` record only after
IPv6 is routed and firewall-tested. Wait until public resolvers return the
correct address:

```sh
dig +short A portfolio.your-real-domain.tld
dig +short AAAA portfolio.your-real-domain.tld
```

Transfer or check out the **current local repository revision** on the VM at
`/opt/portfolio`; do not assume an older GitHub revision contains the same
work. Check `git status` and preserve uncommitted changes before updating.

```sh
sudo install -d -o "$USER" -g "$USER" /opt/portfolio
cd /opt/portfolio
```

## 4. Install Docker and Caddy

Install Docker Engine from Docker's official Ubuntu APT repository. This
repository supports Ubuntu ARM64. The following uses the machine's actual
Ubuntu codename and architecture:

```sh
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
sudo docker buildx version
```

Add the deployment user to the Docker group only if you accept that group
membership grants root-equivalent host control. Log out and back in, then verify
`docker info` works without `sudo`.

Install Caddy from its official stable Ubuntu package repository:

```sh
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo systemctl enable caddy
```

Install the OCI CLI in a system-wide executable location so the restricted
backup service can invoke it with instance-principal auth. The CLI is not
configured with a user API key:

```sh
sudo apt install -y python3 curl
curl -fsSL https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh \
  -o /tmp/oci-cli-install.sh
sudo bash /tmp/oci-cli-install.sh --accept-all-defaults \
  --install-dir /opt/oci-cli --exec-dir /usr/local/bin \
  --script-dir /usr/local/share/oci-cli/scripts
rm -f /tmp/oci-cli-install.sh
command -v oci
oci --version
```

## 5. Configure TLS reverse proxy

Copy the repository template, replace `{$DOMAIN}` and `{$ACME_EMAIL}` with the
real DNS name and certificate contact address, then validate before reload:

```sh
sudo install -m 0644 deploy/Caddyfile /etc/caddy/Caddyfile
sudoedit /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

Caddy automatically redirects HTTP to HTTPS and obtains/renews certificates
after DNS and ports 80/443 are reachable. The template sets HSTS without
`includeSubDomains` or `preload`; enable either only after separately verifying
all relevant hostnames. It overwrites forwarded client IP and scheme headers
at the public edge. Caddy's default behavior ignores untrusted incoming
`X-Forwarded-*` values. The web NGINX passes those sanitized headers unchanged,
and Fastify trusts only the fixed Web NGINX address (`172.30.0.30/32`).

This setup assumes clients connect directly to Caddy. If a CDN or another
load-balancer is later placed in front, configure Caddy's trusted proxy ranges
from that provider's current authoritative ranges, verify its scheme/IP
behavior, and update the trust chain deliberately. Do not set Fastify trust to
a hop count or `true`.

## 6. Production environment and key creation

First inspect the Docker subnet in `deploy/.env.production.example`. It must not
overlap the Oracle VCN or another host Docker network. If it does, choose a new
private subnet and change `APP_SUBNET`, DB/API/Web static addresses, and
`TRUST_PROXY` together.

Create a host-only `.env`, mode 0600, and enter values in an editor. Do not
commit this file or paste secrets into shell history:

```sh
cd /opt/portfolio
cp deploy/.env.production.example .env
chmod 600 .env
openssl rand -hex 32
```

Generate a **different** 32-byte random value for each of:
`POSTGRES_PASSWORD`, `POSTGRES_APP_PASSWORD`, `POSTGRES_MIGRATOR_PASSWORD`,
`SESSION_SECRET`, `AI_CONFIG_KEY`, and `TOTP_ENCRYPTION_KEY`. Database passwords
must be exactly 64 hex characters because the Compose PostgreSQL URLs embed
them. Keep these values backed up in an operator-controlled secret store; the
encryption keys must survive VM rebuilds.

Set `APP_URL` and `VITE_SITE_URL` to the same exact public HTTPS origin, for
example `https://portfolio.your-real-domain.tld`. Do not add a path or trailing
slash. `VITE_SITE_URL` is baked into the web image; changing either canonical
origin requires rebuilding and restarting the web image. Keep
`ADMIN_EMAIL`/`ADMIN_PASSWORD` blank for routine operations. The API service
does not receive bootstrap credentials; the first administrator is prompted
for a password in a one-off container.

Do not copy real secrets into `deploy/.env.production.example` or
`deploy/.env.restore.example`. Validate values without printing them:

```sh
node scripts/validate-production-env.mjs
docker compose config --quiet
```

The validator rejects missing/weak secrets, common placeholders, insecure or
non-canonical origins, origin mismatches, broad proxy trust, and partial Resend
configuration. It prints variable names only.

### Existing persistent volumes

For a fresh install, the template names volumes `hp-os_hp_pgdata` and
`hp-os_hp_uploads`. If this VM already has data, inspect names before starting
the new project:

```sh
docker volume ls
docker volume inspect <existing-database-volume>
docker volume inspect <existing-upload-volume>
```

Set `DATABASE_VOLUME_NAME` and `UPLOAD_VOLUME_NAME` in `.env` to the exact
existing volume names. Never remove or rename an existing volume as part of an
upgrade. Do not run `docker compose down -v` on a production host.

## 7. Database roles and existing installations

Fresh PostgreSQL data directories run
`deploy/postgres/create-app-roles.sql` automatically. PostgreSQL remains the
superuser for administration, `hp_migrator` owns the Prisma schema and runs
explicit migrations, and `hp_app` gets schema usage plus table CRUD and
sequence privileges. API containers use only `hp_app`; the migration profile
uses only `hp_migrator`.

For an existing database that was created before these roles existed:

1. Back up the database and media first.
2. Set distinct `POSTGRES_APP_PASSWORD` and `POSTGRES_MIGRATOR_PASSWORD` in
   `.env`, keeping the current `POSTGRES_PASSWORD` until superuser rotation is
   planned separately.
3. Stop API writes, recreate only the database container with the same named
   data volume, then apply role and ownership changes:

```sh
docker compose stop api
docker compose up -d --wait db
docker compose exec -T db psql -U postgres -d hp_os -v ON_ERROR_STOP=1 \
  < deploy/postgres/create-app-roles.sql
docker compose exec -T db psql -U postgres -d hp_os -v ON_ERROR_STOP=1 \
  < deploy/postgres/grant-existing-objects.sql
docker compose exec -T db psql -U postgres -d hp_os -Atc \
  "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname IN ('hp_app','hp_migrator') ORDER BY rolname"
```

Confirm both roles are not superusers and cannot create roles/databases. The
ownership SQL is repeatable and changes existing public-schema objects to the
migration owner. It does not drop records. Then run migrations and restart the
API through the release procedure below.

## 8. First deployment, migration, seed, and admin provisioning

Build and run natively on the A1 ARM64 host. The Dockerfiles track the
`node:24-bookworm-slim`, `nginx:1.27-alpine` and `postgres:16-alpine` floating
tags (no digest pins, no `platform:` constraint) so the same Compose file also
builds on amd64 CI/dev machines. Prisma Client is generated in the same
Debian/OpenSSL family used by the API runtime. Only
`scripts/restore-media-volume.sh` still passes `--platform linux/arm64`
(explicitly, for the ARM64 restore helper).

First deployment only, after reviewing the chosen data volumes and validating
the production environment:

```sh
cd /opt/portfolio
RELEASE_TAG="$(date -u +%Y%m%dT%H%M%S)" FIRST_DEPLOY=1 scripts/deploy.sh
```

The script builds versioned API/web images, runs `prisma migrate deploy` as
`hp_migrator`, seeds only when the content tables are empty, prompts for an
administrator email and hidden password, then starts API and web after health
checks. Admin creation is idempotent and does not reset existing credentials.
If seed content already exists, seed is skipped. Use explicit admin password
reset tooling only when an operator intentionally requests a reset.

Routine release:

```sh
cd /opt/portfolio
RELEASE_TAG="$(date -u +%Y%m%dT%H%M%S)" scripts/deploy.sh
```

The routine script validates configuration, backs up database and media,
builds unique image tags, applies migrations explicitly, restarts API/web,
checks health and public routes, then records the release tags in the host-only
`.env`. It does not automatically seed or roll back a schema.

To run an explicit migration outside the deployment script:

```sh
docker compose --profile ops run --rm --no-deps migrate
```

Never use `prisma db push` in production. Review checked-in migration SQL and
use expand/contract migrations when the old application and new schema may
overlap during release.

## 9. Start and verify the services

The deployment script waits for PostgreSQL, API readiness (including a live DB
query), and web NGINX health. Manual inspection commands:

```sh
scripts/healthcheck.sh
scripts/smoke-test.sh
docker compose ps
docker compose logs --tail=100 db api web
curl -I https://portfolio.your-real-domain.tld/
curl -fsS https://portfolio.your-real-domain.tld/api/profile >/dev/null
```

The public web NGINX returns 404 for diagnostic health/readiness routes. Host
maintenance health probes use loopback `127.0.0.1:4000`; public visitors use
the Caddy TLS endpoint. Direct routes such as `/projects/senseline` and
`/recruiter` are included in `scripts/smoke-test.sh`.

Check the Docker port bindings and firewall externally. Only Caddy should have
public listeners. Web NGINX, API, and PostgreSQL are not published on public
interfaces.

## 10. Upload limit and HTTPS/proxy checks

NGINX accepts requests up to 26 MiB to provide multipart overhead above the
API's 25 MiB per-file cap. Fastify enforces the actual file limit and removes
partial files when a request is rejected. On a live HTTPS deployment with an
administrator test account, run:

```sh
read -r -p 'Disposable administrator email: ' UPLOAD_TEST_EMAIL
read -r -s -p 'Disposable administrator password: ' UPLOAD_TEST_PASSWORD
printf '\n'
export UPLOAD_TEST_EMAIL UPLOAD_TEST_PASSWORD
UPLOAD_TEST_ORIGIN=https://portfolio.your-real-domain.tld scripts/test-upload-proxy.sh
unset UPLOAD_TEST_EMAIL UPLOAD_TEST_PASSWORD
```

Set `UPLOAD_TEST_TOTP` for an administrator with 2FA enabled. The script checks
the Secure/HttpOnly/SameSite cookie flags and uploads 1 KiB, 2 MiB, 10 MiB,
25 MiB, 25 MiB + 1 byte, and a request over NGINX's 26 MiB ceiling. Successful
assets are deleted; rejected files must not change the upload file count. Use
a disposable admin account where possible. The script may use
`ALLOW_INSECURE_TLS=1` for a local self-signed TLS test only; never use that
flag for a public deployment check.

To verify client IP anti-spoofing through the actual Caddy → NGINX → Fastify
path, run:

```sh
PROXY_TEST_ORIGIN=https://portfolio.your-real-domain.tld scripts/test-proxy-headers.sh
```

It sends forged `X-Forwarded-For`, `X-Real-IP`, and `X-Forwarded-Proto` values,
checks the stored request IP is not the forged address, then deletes its
uniquely identified test messages. If email notifications are configured,
this may send two notifications to the configured admin inbox.

## 11. Contact email, AI, and GitHub integrations

Email uses Resend's HTTPS API. Set `RESEND_API_KEY`, a Resend-verified
`EMAIL_FROM`, and (to receive notifications) `CONTACT_NOTIFY_EMAIL`. These
three values should be tested with a real delivery after DNS authentication
(SPF/DKIM) is complete. Admin replies use the same sender configuration. If
email is absent, the public contact form still saves messages in PostgreSQL
and reports that notifications are unavailable; admin reply attempts return a
clear configuration error.

The AI assistant works without a third-party model: the deterministic
knowledge-base fallback remains available with `LLM_PROVIDER=none`. Configure
external model credentials through the authenticated admin AI provider screen;
provider secrets are encrypted at rest using `AI_CONFIG_KEY` and never returned
to the frontend. Keep that key stable and backed up. Test configured-provider
success, invalid credentials, timeout, and provider failure fallback from the
admin UI. Optional GitHub API token absence/upstream failures degrade to the
site's fallback state.

## 12. Encrypted PostgreSQL and media backups

Backups contain both a PostgreSQL custom-format dump and the complete uploads
volume. The script briefly stops API writes while collecting both so their
contents describe the same point in time, encrypts the archive with `age`,
uploads the ciphertext to OCI Object Storage using instance principal auth,
and keeps a local encrypted 30-day cache. Schedule during a quiet period.

Install `age` and the OCI CLI. Generate an age key on an operator-controlled
secure machine, not in the repository. Keep the private identity offline or in
a separate secret manager; only the public recipient is on the VM:

```sh
age-keygen -o /secure/path/hp-os-backup.agekey
chmod 600 /secure/path/hp-os-backup.agekey
age-keygen -y /secure/path/hp-os-backup.agekey
```

Create a private Object Storage bucket in the intended region. Configure an
instance principal/dynamic group with object-write permission scoped to that
bucket, then verify `oci os ns get --auth instance_principal`. Put the backup
recipient and bucket name in `/etc/hp-os-backup.env` using
`deploy/backup.env.example`; do not put the private identity on the VM. The
backup script uses `--auth instance_principal`, so it needs no API signing key
in `.env`.

Create a bucket lifecycle policy to delete backup objects after 180 days (or
the retention period approved for the data). Lifecycle policies execute on a
best-effort basis; check the policy and object listing during monthly review.
Use object versioning/retention only with a separately reviewed policy.

Install the systemd unit and timer:

```sh
sudo install -d -o deploy -g docker -m 0700 /var/backups/hp-os
sudo install -m 0644 deploy/backup.env.example /etc/hp-os-backup.env
sudoedit /etc/hp-os-backup.env
sudo chown root:docker /etc/hp-os-backup.env
sudo chmod 640 /etc/hp-os-backup.env
sudo install -m 0644 deploy/hp-os-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/hp-os-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hp-os-backup.timer
systemctl list-timers hp-os-backup.timer
```

Run a manual backup and verify the encrypted object exists:

```sh
sudo systemctl start hp-os-backup.service
sudo systemctl status hp-os-backup.service --no-pager
sudo journalctl -u hp-os-backup.service --since today --no-pager
ls -lh /var/backups/hp-os
```

Restore requires the matching private age identity and the separate disposable
restore Compose environment. Copy `deploy/.env.restore.example` to a
host-only file, generate distinct random values for the three DB passwords,
and keep its fixed project, port, subnet, and named volumes exactly as shown.
Provision the matching age identity to a restricted path only for the restore
window (mode 0600, owned by the deployment account). Remove the staged identity
after the restore is verified. Then download the encrypted backup:

```sh
cp deploy/.env.restore.example /secure/path/.env.restore
chmod 600 /secure/path/.env.restore
```

Replace all `REPLACE` values with distinct random values. Then restore into a
new database and media directory in that disposable project:

```sh
export RESTORE_COMPOSE_ENV_FILE=/secure/path/.env.restore
export RESTORE_DATABASE=hp_os_restore_20261104
export RESTORE_MEDIA_DIR=/opt/portfolio/restore-media-20261104
oci os object get --auth instance_principal --namespace-name "$OCI_NAMESPACE" \
  --bucket-name "$OCI_BUCKET" --name '<backup-object-name>' \
  --file /secure/path/portfolio-backup.tar.gz.age
AGE_IDENTITY=/secure/path/hp-os-backup.agekey scripts/restore.sh \
  /secure/path/portfolio-backup.tar.gz.age
```

`restore.sh` refuses the production Compose project. It starts only the
`hp-os-restore` PostgreSQL service with separate volumes and port 55433,
decrypts and checks archive checksums, restores to a **new database name**,
checks runtime CRUD permissions, and extracts media to a new local directory.
It never drops a database or writes the production upload volume. Verify the
restored profile count and media file count from the command output, then
inspect the disposable database and media files before approving recovery.
After a recovery exercise, remove the disposable resources only after retaining
any evidence required by policy; do not remove the production volumes.

### Controlled production recovery after review

Only continue after the disposable restore has passed checksum, row-count,
permissions, and media checks. Choose unique identifiers and save the current
upload volume name from `.env` for rollback. This copies recovered data into a
new production database and volume; it does not alter the live `hp_os`
database:

```sh
export RESTORE_COMPOSE_ENV_FILE=/secure/path/.env.restore
export RESTORE_DATABASE=hp_os_restore_20261104
TARGET_DATABASE=hp_os_recovered_20261104 scripts/copy-restored-db.sh
RESTORE_UPLOAD_VOLUME=hp-os-recovered-20261104
scripts/restore-media-volume.sh "$RESTORE_MEDIA_DIR" "$RESTORE_UPLOAD_VOLUME"
```

Review the staged database and media volume. Before the cutover, record the old
upload volume name and make a fresh encrypted backup while `.env` still points
to the current live volume. Do not switch `UPLOAD_VOLUME_NAME` before this
backup. Then stop API/web and rename the current database rather than dropping
it; the old database and media volume remain available for rollback:

```sh
OLD_UPLOAD_VOLUME="$(sed -n 's/^UPLOAD_VOLUME_NAME=//p' .env | tail -n 1)"
test -n "$OLD_UPLOAD_VOLUME"
scripts/backup.sh
docker compose stop api web
docker compose exec -T db psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -v old_database=hp_os_before_restore_20261104 \
  -v recovered_database=hp_os_recovered_20261104 <<'SQL'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'hp_os' AND pid <> pg_backend_pid();
ALTER DATABASE hp_os WITH ALLOW_CONNECTIONS false;
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'hp_os' AND pid <> pg_backend_pid();
SELECT format('ALTER DATABASE hp_os RENAME TO %I', :'old_database') \gexec
SELECT format('ALTER DATABASE %I RENAME TO hp_os', :'recovered_database') \gexec
SQL
node scripts/set-upload-volume.mjs "$RESTORE_UPLOAD_VOLUME"
docker compose up -d --wait api web
scripts/healthcheck.sh
scripts/smoke-test.sh
```

If the restored release fails validation, stop API/web, rename the failed
`hp_os` database to a new `hp_os_failed_restore_*` name, re-enable connections
on `hp_os_before_restore_20261104`, rename that preserved database back to
`hp_os`, restore the previous `UPLOAD_VOLUME_NAME` with
`scripts/set-upload-volume.mjs`, then start API/web and check health. Keep the
failed restore database and volume for investigation. Never drop either copy
as part of rollback.

## 13. Operations, monitoring, and logs

Use the provided scripts:

```sh
scripts/healthcheck.sh
scripts/smoke-test.sh
TAIL=100 scripts/logs.sh
docker compose ps
df -h
docker system df
```

Container logs use bounded `json-file` rotation (10 MiB × 3 files per service).
Review Caddy and systemd logs as well:

```sh
sudo journalctl -u caddy --since today --no-pager
sudo journalctl -u docker --since today --no-pager
sudo journalctl -u hp-os-backup.service --since today --no-pager
```

Monitor disk space, RAM/swap, failed systemd backups, HTTPS renewal errors,
application 5xx/rate-limit logs, and OCI backup object age. Keep external
uptime monitoring pointed only at the public HTTPS origin; do not expose health
endpoints publicly.

## 14. Upgrade and rollback

`scripts/deploy.sh` follows this sequence: validate configuration; back up DB
and media; build unique image tags; apply migrations as `hp_migrator`; restart
API/web after dependency health; check health and smoke routes; store active
image tags. Keep at least the previous API and web images on disk.

If an application release fails but its migration is backward compatible, set
`API_IMAGE` and `WEB_IMAGE` to the previous image tags and run
`docker compose up -d --wait api web`, then check health/smoke tests. Do not
roll a database schema backward automatically. If a migration is not compatible
with the previous code, follow the migration's reviewed recovery plan or
restore into a separate database and perform a planned cutover.

Changing `APP_URL`/`VITE_SITE_URL` requires a new web build. Routine key changes
also require a planned rotation. Keep previous decryption keys in
`AI_CONFIG_KEY_PREVIOUS`, `TOTP_ENCRYPTION_KEY_PREVIOUS`, and
`SESSION_SECRET_PREVIOUS` until stored provider/TOTP secrets and recovery codes
are migrated or regenerated and verified. The legacy TOTP/provider ciphertext
may depend on the old session secret. Replacing keys without a backup and
compatibility plan can make stored credentials unrecoverable. Changing
`SESSION_SECRET` invalidates existing CSRF tokens; users may need a fresh CSRF
token/login. Do not remove the prior secret until recovery-code and legacy
ciphertext dependencies have been addressed.

## 15. External checks not proven by local builds

This repository cannot prove Oracle account eligibility, regional A1 capacity,
public routing, DNS propagation, certificate issuance/renewal, real Resend
sender verification/delivery, OCI IAM permissions/Object Storage lifecycle, or
real-world HTTPS cookie behavior until those external resources are configured
and exercised. Record each as **NOT VERIFIED** until tested on the actual VM and
domain. The local ARM64 build and disposable restore test do not constitute a
cloud deployment.
