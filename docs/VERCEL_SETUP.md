# Deploy on Vercel

## 1. Import the GitHub repo

Create a **new** Vercel project from `mangalyadav-hmw/aws-infrastructure-monitor` (not connect-chat or chat-app).

## 2. Required environment variables

In **Project → Settings → Environment Variables**, add these for **Production** (and Preview if you use preview URLs):

| Name | Example | Notes |
| --- | --- | --- |
| `AWS_REGION` | `ap-south-1` | Must match your infrastructure |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Read-only IAM user |
| `AWS_SECRET_ACCESS_KEY` | *(secret)* | Mark as **Sensitive** in Vercel |

Attach the policy in `docs/IAM_POLICY.json` to that IAM user.

Optional targets (defaults are fine for your setup):

- `AWS_EC2_PRIVATE_IP=172.31.9.87`
- `AWS_RDS_DB_IDENTIFIER=whibedev-db`

## 3. SSH monitoring on Vercel

Direct SSH to private IP `172.31.9.87` does **not** work from Vercel. Use the on-host agent:

- `SSH_AGENT_URL` — HTTPS URL to `monitoring-agent/health-server.mjs` (via reverse proxy)
- `SSH_AGENT_SECRET` — shared secret header

Or accept SSH card as “not configured” until the agent is set up.

## 4. Redeploy

After saving environment variables, open **Deployments → Redeploy** (or push to `main`).

If credentials are missing, the dashboard shows a clear setup message instead of a generic AWS SDK error.
