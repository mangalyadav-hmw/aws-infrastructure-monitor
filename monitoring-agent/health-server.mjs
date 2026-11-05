import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.AGENT_PORT ?? 9443);
const secret = process.env.SSH_AGENT_SECRET;

async function collectHealth() {
  const script = `hostname -f 2>/dev/null || hostname
uptime -p 2>/dev/null || uptime
grep -m1 '^PRETTY_NAME=' /etc/os-release | cut -d= -f2- | tr -d '"'
awk '/^cpu / {u=$2+$4; t=$2+$4+$5; print (t>0)?100*(1-u/t):0}' /proc/stat
free | awk '/Mem:/ {printf "%.1f", ($3/$2)*100}'
df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}'`;

  const { stdout } = await execFileAsync('bash', ['-lc', script]);
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    hostname: lines[0],
    uptime: lines[1],
    operatingSystem: lines[2],
    cpuUsagePercent: Number(lines[3]),
    memoryUsagePercent: Number(lines[4]),
    diskUsagePercent: Number(lines[5]),
  };
}

const server = http.createServer(async (request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404);
    response.end();
    return;
  }

  if (secret && request.headers['x-agent-secret'] !== secret) {
    response.writeHead(401);
    response.end();
    return;
  }

  try {
    const payload = await collectHealth();
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(payload));
  } catch {
    response.writeHead(500);
    response.end();
  }
});

server.listen(port, '127.0.0.1', () => {
  // Bind locally and expose through a reverse proxy / TLS terminator only.
  console.log(`Monitoring agent listening on 127.0.0.1:${port}`);
});
