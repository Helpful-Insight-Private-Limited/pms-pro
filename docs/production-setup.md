# Production Setup Guide

This guide deploys the PMS app on a Linux production server with:

- Next.js frontend on port `3000`
- Express backend on port `4100`
- MySQL or MariaDB database
- PM2 process manager
- Nginx reverse proxy with HTTPS

Replace all example domains, passwords, and secrets before running in production.

## 1. Server Requirements

Recommended server stack:

- Ubuntu 22.04 LTS or newer
- Node.js 22 LTS
- MySQL 8 or MariaDB 10.6+
- Git
- Nginx
- PM2
- Certbot for SSL

Install common packages:

```bash
sudo apt update
sudo apt install -y git nginx mysql-server
```

Install Node.js 22 LTS from NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2:

```bash
sudo npm install -g pm2
```

## 2. Clone The Project

```bash
cd /var/www
sudo git clone https://github.com/Helpful-Insight-Private-Limited/pms-pro.git
sudo chown -R $USER:$USER /var/www/pms-pro
cd /var/www/pms-pro
```

Install dependencies:

```bash
npm ci
```

The backend uses Node's built-in `crypto.scrypt` for password hashing, so production install does not require compiling native password modules such as `argon2`. If your server previously failed while building `node_modules/argon2`, pull the latest code and run a clean install:

```bash
rm -rf node_modules package-lock.json
git checkout -- package-lock.json
npm ci
```

If you cannot remove files on shared hosting, delete `node_modules/argon2` from the hosting file manager and run `npm ci` again after pulling the latest code.

If this server already had users created with the old native `argon2` password hashes, reset those passwords after the backend build:

```bash
npm --workspace backend run build
USER_EMAIL=admin@example.com NEW_PASSWORD='ChangeMeStrong123' npm --workspace backend run user:reset-password
```

To reset every non-deleted user to the same password as `SEED_ADMIN_PASSWORD` in `backend/.env`:

```bash
RESET_ALL_USERS=true npm --workspace backend run user:reset-password
```

## 3. Create The Database

Open MySQL:

```bash
sudo mysql
```

Create the database and user:

```sql
CREATE DATABASE pms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pms_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON pms.* TO 'pms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Backend Environment

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Use production values:

```env
NODE_ENV=production
PORT=4100
DATABASE_URL="mysql://pms_user:CHANGE_THIS_STRONG_PASSWORD@localhost:3306/pms"
JWT_ACCESS_SECRET="CHANGE_THIS_LONG_RANDOM_SECRET"
JWT_REFRESH_SECRET="CHANGE_THIS_DIFFERENT_LONG_RANDOM_SECRET"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS=30
CORS_ALLOWED_ORIGINS="https://pms.example.com"
CREDENTIAL_ENCRYPTION_KEY="CHANGE_THIS_32_BYTE_BASE64_KEY"
PUBLIC_APP_URL="https://pms.example.com"
VAPID_SUBJECT="mailto:admin@example.com"
VAPID_PUBLIC_KEY="CHANGE_THIS_VAPID_PUBLIC_KEY"
VAPID_PRIVATE_KEY="CHANGE_THIS_VAPID_PRIVATE_KEY"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="CHANGE_THIS_ADMIN_PASSWORD"
SEED_ADMIN_FIRST_NAME="System"
SEED_ADMIN_LAST_NAME="Admin"
```

Generate a 32-byte base64 encryption key:

```bash
openssl rand -base64 32
```

Important: keep `CREDENTIAL_ENCRYPTION_KEY` stable after production starts. Existing encrypted project credentials cannot be decrypted if this value is lost or changed.

Generate browser push notification VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Use the generated public/private key pair in `backend/.env`. Keep the private key secret.

## 5. Frontend Environment

Create the frontend environment file:

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

For a separate API subdomain:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
NEXT_PUBLIC_SOCKET_PATH=/socket.io
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_GENERATED_VAPID_PUBLIC_KEY
```

For one domain with Nginx routing directly to the backend, use the full public backend URL that users' browsers can reach.

If your REST API is exposed under a path such as `https://pms.example.com/api`, keep that value for `NEXT_PUBLIC_API_URL`, but set `NEXT_PUBLIC_SOCKET_URL` to the origin only:

```env
NEXT_PUBLIC_API_URL=https://pms.example.com/api
NEXT_PUBLIC_SOCKET_URL=https://pms.example.com
NEXT_PUBLIC_SOCKET_PATH=/socket.io
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_GENERATED_VAPID_PUBLIC_KEY
```

## 6. Prisma Migration And Seed

Generate the Prisma client:

```bash
npm --workspace backend run prisma:generate
```

Apply production migrations:

```bash
npm --workspace backend run prisma:deploy
```

Seed the first admin, roles, permissions, and sample data on a fresh database:

```bash
npm --workspace backend run seed
```

Run seed only when you want the seeded users and demo data. On a real production launch, review demo users and passwords immediately after seeding.

## 7. Build The App

Build backend:

```bash
npm --workspace backend run build
```

Build frontend:

```bash
npm --workspace frontend run build
```

The backend build copies the generated Prisma client into `backend/dist/src/generated`, so `node dist/src/server.js` can start cleanly.

## 8. Create Upload Directory

Uploaded avatars and project files are not committed to Git. Create and protect the upload folder:

```bash
mkdir -p backend/uploads/avatars
chmod -R 775 backend/uploads
```

Include `backend/uploads` in your server backup plan.

## 9. Start With PM2

Start backend:

```bash
pm2 start "npm --workspace backend run start" --name pms-backend
```

Start frontend:

```bash
pm2 start "npm --workspace frontend run start" --name pms-frontend
```

Start the background worker if you need scheduled jobs:

```bash
pm2 start "npm --workspace backend run worker:start" --name pms-worker
```

Save PM2 processes and enable startup:

```bash
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then run `pm2 save` again.

Check status:

```bash
pm2 status
pm2 logs pms-backend
pm2 logs pms-frontend
```

## 10. Nginx Reverse Proxy

Recommended setup:

- `pms.example.com` -> frontend `127.0.0.1:3000`
- `api.example.com` -> backend `127.0.0.1:4100`

Create `/etc/nginx/sites-available/pms`:

```nginx
server {
    listen 80;
    server_name pms.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/pms
sudo nginx -t
sudo systemctl reload nginx
```

Install SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pms.example.com -d api.example.com
```

After SSL is active, update:

- `backend/.env` -> `CORS_ALLOWED_ORIGINS="https://pms.example.com"`
- `frontend/.env.local` -> `NEXT_PUBLIC_API_URL=https://api.example.com`

Then rebuild and restart:

```bash
npm --workspace frontend run build
pm2 restart pms-backend pms-frontend
```

## 11. Verify Production

Backend health:

```bash
curl https://api.example.com/health
```

Frontend:

```bash
curl -I https://pms.example.com
```

Browser checks:

- Login page opens
- Admin login works
- Dashboard loads without `Failed to fetch`
- Profile image loads from the backend URL
- Realtime chat connects
- Notifications appear without refreshing
- Browser push notifications can be enabled from the notification panel
- Push notification click opens the dashboard, and chat push clicks open the chat thread
- File upload works

## 12. Deployment Updates

Use this flow for future updates:

```bash
cd /var/www/pms-pro
git pull
npm ci
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:deploy
npm --workspace backend run build
npm --workspace frontend run build
pm2 restart pms-backend pms-frontend pms-worker
```

If the worker is not enabled:

```bash
pm2 restart pms-backend pms-frontend
```

## 13. Backup Plan

Back up these items:

- MySQL database `pms`
- `backend/.env`
- `frontend/.env.local`
- `backend/uploads`

Example database backup:

```bash
mkdir -p ~/pms-backups
mysqldump -u pms_user -p pms > ~/pms-backups/pms-$(date +%F).sql
```

## 14. Security Checklist

Before opening the app to users:

- Use HTTPS only.
- Replace all seed/demo passwords.
- Remove demo users if they are not needed.
- Use long random JWT secrets.
- Store `CREDENTIAL_ENCRYPTION_KEY` securely.
- Do not commit `.env` files.
- Restrict MySQL to localhost unless a private network is required.
- Open only ports `22`, `80`, and `443` publicly.
- Keep Node.js, MySQL, Nginx, and OS packages updated.
- Enable regular DB and upload backups.
- Review role permissions from the admin panel.

## 15. Troubleshooting

`Failed to fetch` on login:

- Confirm backend is running: `pm2 status`
- Confirm health URL: `curl https://api.example.com/health`
- Confirm `NEXT_PUBLIC_API_URL` is the public backend URL.
- Confirm `CORS_ALLOWED_ORIGINS` contains the frontend domain.

Profile image blocked or not loading:

- Confirm the image URL points to the backend public domain.
- Confirm Nginx proxies backend uploads through `api.example.com`.
- Confirm backend has `cross-origin` resource policy enabled.

Realtime chat or notifications not working:

- Confirm Nginx includes `Upgrade` and `Connection` proxy headers.
- Confirm `NEXT_PUBLIC_SOCKET_URL` points to the public backend origin.
- If REST uses `/api`, confirm `NEXT_PUBLIC_SOCKET_URL` is the origin only, not a URL ending with `/api`.
- Check `pm2 logs pms-backend` for Socket.IO errors.

Browser push notifications not working:

- Confirm the production site uses HTTPS. Browser push does not work on plain HTTP production domains.
- Confirm `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set in `backend/.env`.
- Confirm `NEXT_PUBLIC_VAPID_PUBLIC_KEY` matches the backend public key.
- Confirm `PUBLIC_APP_URL` is the public frontend URL.
- Run `npm --workspace backend run prisma:deploy` so the `pushSubscriptions` table exists.
- Rebuild frontend after changing `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Check DevTools Application -> Service Workers and Push Messaging for subscription state.

Backend starts locally but fails after build:

- Run `npm --workspace backend run prisma:generate`.
- Run `npm --workspace backend run build`.
- Confirm `backend/dist/src/generated/prisma/index.js` exists.

Migration fails:

- Confirm `DATABASE_URL` is correct.
- Confirm the DB user has privileges on the `pms` database.
- Use `prisma:deploy` on production, not `prisma:migrate`.
