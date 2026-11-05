# AWS Infrastructure Monitoring Dashboard

Read-only monitoring dashboard for AWS EC2, PostgreSQL RDS, and Ubuntu server health checks. This project is **independent** from Connect, chat-app, and other applications.

## Features

- EC2 instance status, status checks, CPU, and network metrics
- RDS availability, engine details, CPU, storage, and connections
- SSH or on-host agent health checks (CPU, memory, disk, uptime)
- Automatic refresh every 45 seconds with stale-data handling
- Dark/light dashboard theme and local monitoring history charts
- Server-side AWS SDK integration (credentials never exposed to the browser)

## Project structure

```
src/
  app/api/monitoring/     # Server API routes
  components/             # Dashboard UI
  services/               # EC2, RDS, SSH monitoring services
  lib/                    # AWS clients, cache, config, security helpers
monitoring-agent/         # Optional on-host read-only agent for Vercel deployments
docs/IAM_POLICY.json      # Least-privilege read-only IAM policy example
```

## Security model

This application is monitoring-only. It never starts/stops instances, modifies RDS, changes security groups, or runs administrative SSH commands.

Configure credentials only as server environment variables:

- Prefer IAM roles (EC2 instance role, Vercel OIDC to AWS, or another short-lived credential flow)
- Never commit `.env`, private keys, or database passwords
- Rotate any previously exposed secrets before production use

Optional API protection:

- Set `DASHBOARD_API_SECRET`
- Send `x-dashboard-secret` from your frontend/proxy if you add an edge layer

## Local development

```bash
cd aws-infrastructure-monitor
cp .env.example .env
# Fill in AWS credentials and SSH/agent settings locally only
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

## SSH monitoring on Vercel (important)

Vercel serverless functions **cannot reliably SSH** to private VPC addresses such as `172.31.9.87`.

Recommended production approach:

1. Run the optional read-only agent on the Ubuntu EC2 host (`monitoring-agent/health-server.mjs`)
2. Expose it through HTTPS on a restricted endpoint (reverse proxy / security group / IP allowlist)
3. Configure:
   - `SSH_AGENT_URL=https://your-monitoring-endpoint.example.com`
   - `SSH_AGENT_SECRET=...`

For local development or a VPS deployment with network reachability, configure `SSH_USERNAME` and `SSH_PRIVATE_KEY` instead.

## AWS configuration

Default monitoring targets (override via env):

| Variable | Default |
| --- | --- |
| `AWS_REGION` | `ap-south-1` |
| `AWS_EC2_PRIVATE_IP` | `172.31.9.87` |
| `AWS_RDS_DB_IDENTIFIER` | `whibedev-db` |

Attach the policy in `docs/IAM_POLICY.json` to a dedicated read-only IAM user/role.

## API routes

- `GET /api/monitoring/overview`
- `GET /api/monitoring/ec2`
- `GET /api/monitoring/rds`
- `GET /api/monitoring/ssh`

## Testing

```bash
npm test
npm run lint
npm run build
```

## Deploy to Vercel (separate project)

1. Create a **new** GitHub repository and import it into a **new** Vercel project
2. Do not link this repo to `connect-chat` or `chat-app`
3. Configure environment variables in Vercel (AWS + SSH agent settings)
4. Attach AWS credentials using Vercel OIDC/IAM or encrypted env vars
5. Deploy

`vercel.json` keeps monitoring routes on the Node.js runtime with an extended duration budget.

## On-host monitoring agent (optional)

```bash
export AGENT_PORT=9443
export SSH_AGENT_SECRET=replace-me
node monitoring-agent/health-server.mjs
```

Bind locally (`127.0.0.1`) and terminate TLS at your reverse proxy. Restrict inbound access to trusted sources only.

## License

Private/internal use.
