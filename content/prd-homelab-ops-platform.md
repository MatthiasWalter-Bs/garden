---
publish: true
created: 2026-02-19T14:38:57.502+01:00
modified: 2026-02-19T14:39:17.086+01:00
cssclasses: ""
---

# PRD: Homelab AI Operations Platform

## Overview

Build a lightweight AI-powered operations platform for a personal homelab that runs multiple specialized agents (security, SRE, backup) on scheduled and event-driven triggers. Agents discover issues using CLI tools, produce structured findings, and feed them into a human-operated remediation center. Humans triage and approve; agents can execute approved remediations.

The platform runs on a Mac Mini M4, which also hosts Henry (OpenClaw instance), Home Assistant, and Immich. Agents run natively on macOS. The remediation center, Postgres, and Cloudflare Tunnel run as Docker containers alongside the existing Docker services.

**Key constraint:** The remediation center must be fully operable from a phone. The kanban board and approval workflows are mobile-first — designed for touch interaction on small screens, not just responsive afterthoughts.

## Architecture

```
Mac Mini M4 (macOS)
│
├── Native (macOS)
│   ├── Henry (OpenClaw)
│   ├── Security Agent ─── subfinder, httpx, naabu, nuclei, katana, dnsx
│   ├── SRE Agent ──────── systemctl, smartctl, netdata, journalctl, ss
│   ├── Backup Agent ───── restic, rclone, age
│   └── Orchestrator ───── launchd plists + webhook listener
│
├── Docker
│   ├── Home Assistant         (existing)
│   ├── Immich                 (existing)
│   ├── remediation-center     (Next.js app)
│   ├── postgres               (findings database)
│   └── cloudflared            (Cloudflare Tunnel)
│
└── Cloudflare (free tier)
    ├── Tunnel ── exposes remediation center
    └── Access ── zero-trust auth (email OTP / Google)
```

### Data Flow

```
launchd triggers agent on schedule
         │
         ▼
Tier 1: bash healthcheck (free, fast)
         │
         ├── All OK → log, exit
         │
         └── Issue found → escalate to Tier 2
                  │
                  ▼
         Tier 2: Claude Code analyzes (costs tokens)
                  │
                  ▼
         POST finding to remediation center API
                  │
                  ▼
         Kanban board: inbox → triage → resolve
                  │
                  ▼
         Human decides, agent can re-verify
```

## Project Structure

```
homelab-ops/
├── README.md
├── .env                           # Shared secrets, API keys
├── agents/
│   ├── security/
│   │   ├── CLAUDE.md              # Security agent instructions
│   │   ├── context/               # Memory: architecture, conventions, past findings
│   │   │   ├── architecture.md
│   │   │   ├── conventions.md
│   │   │   ├── exclusions.txt
│   │   │   ├── changelog.md
│   │   │   └── past-findings/
│   │   ├── templates/
│   │   │   └── custom/            # homelab-specific nuclei templates
│   │   └── scripts/
│   │       └── run.sh             # Entry point for security agent
│   ├── sre/
│   │   ├── CLAUDE.md              # SRE agent instructions
│   │   ├── context/               # Memory: service inventory, baselines, thresholds
│   │   │   ├── service-inventory.md
│   │   │   ├── baselines.md
│   │   │   └── thresholds.md
│   │   └── scripts/
│   │       ├── run.sh             # Entry point for SRE agent
│   │       └── healthcheck.sh     # Tier 1 cheap checks (no AI)
│   └── backup/
│       ├── CLAUDE.md              # Backup agent instructions
│       ├── context/               # Memory: backup policies, retention, targets
│       │   ├── backup-policies.md
│       │   ├── targets.md
│       │   └── restore-tests/
│       └── scripts/
│           ├── run.sh             # Entry point for backup agent
│           └── verify.sh          # Tier 1 backup verification (no AI)
├── orchestrator/
│   ├── launchd/                   # launchd plist files for scheduling
│   │   ├── ch.homelab.security-full.plist
│   │   ├── ch.homelab.security-quick.plist
│   │   ├── ch.homelab.security-compliance.plist
│   │   ├── ch.homelab.security-reverify.plist
│   │   ├── ch.homelab.sre-healthcheck.plist
│   │   ├── ch.homelab.sre-weekly.plist
│   │   ├── ch.homelab.sre-certs.plist
│   │   ├── ch.homelab.backup-verify.plist
│   │   ├── ch.homelab.backup-restore-test.plist
│   │   └── ch.homelab.backup-integrity.plist
│   ├── tier1.sh                   # Tier 1 checks — pure bash, no AI
│   ├── escalate.sh                # Escalates issues to Claude Code (Tier 2)
│   ├── webhook-listener.js        # Tiny HTTP listener for event-driven triggers
│   └── schedules.md               # Human-readable schedule overview
├── docker/
│   ├── docker-compose.yml         # Remediation center + Postgres + cloudflared
│   ├── cloudflared/
│   │   └── config.yml             # Tunnel configuration
│   └── postgres/
│       └── init.sql               # Database schema initialization
├── remediation-center/
│   ├── package.json
│   ├── next.config.js
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Dashboard: kanban board of findings
│   │   │   ├── findings/
│   │   │   │   ├── page.tsx       # Findings list with filters
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Finding detail: evidence, remediation, approval
│   │   │   ├── agents/
│   │   │   │   └── page.tsx       # Agent status: last run, next run, health
│   │   │   ├── settings/
│   │   │   │   └── page.tsx       # Schedules, thresholds, notification config
│   │   │   └── api/
│   │   │       ├── findings/
│   │   │       │   ├── route.ts   # POST (submit), GET (list)
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts  # GET (detail), PATCH (update status)
│   │   │       ├── agent-runs/
│   │   │       │   ├── route.ts   # POST (register run), GET (list)
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts  # PATCH (update run status)
│   │   │       └── stats/
│   │   │           └── route.ts   # GET dashboard statistics
│   │   ├── components/
│   │   │   ├── KanbanBoard.tsx    # Swipe-to-change-status on mobile, drag-and-drop on desktop
│   │   │   ├── FindingCard.tsx    # Summary card: severity, host, age, source (tap to expand)
│   │   │   ├── FindingDetail.tsx  # Full detail with evidence, timeline, actions
│   │   │   ├── ApprovalGate.tsx   # Large touch targets for approve/reject
│   │   │   ├── AgentStatus.tsx    # Agent health indicator
│   │   │   ├── SeverityBadge.tsx  # Color-coded severity indicator
│   │   │   ├── Timeline.tsx       # Finding lifecycle timeline
│   │   │   └── BottomNav.tsx      # Mobile bottom tab bar navigation
│   │   └── lib/
│   │       ├── db.ts              # Postgres client (use pg or drizzle-orm)
│   │       ├── types.ts           # TypeScript types for findings, agents, etc.
│   │       └── auth.ts            # API token validation middleware
│   └── public/
├── scripts/
│   ├── setup.sh                   # Full platform setup (macOS)
│   └── install-tools.sh           # Install all CLI tools via Homebrew
└── docs/
    └── runbook.md                 # Operational runbook
```

## Component 1: Docker Stack

### 1.1 Docker Compose

File: `docker/docker-compose.yml`

This compose file runs alongside the existing Home Assistant and Immich containers. It defines three services: Postgres for the findings database, the remediation center Next.js app, and cloudflared for the Cloudflare Tunnel.

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: homelab-ops-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: homelab_ops
      POSTGRES_USER: ops
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ops -d homelab_ops"]
      interval: 10s
      timeout: 5s
      retries: 5

  remediation-center:
    build:
      context: ../remediation-center
      dockerfile: Dockerfile
    container_name: homelab-ops-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://ops:${POSTGRES_PASSWORD}@postgres:5432/homelab_ops
      OPS_API_TOKEN: ${OPS_API_TOKEN}
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: homelab-ops-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}

volumes:
  postgres_data:
```

### 1.2 Cloudflare Tunnel Setup

Prerequisites: a Cloudflare account (free) and a domain with Cloudflare DNS.

Setup steps (one-time, done manually before first deployment):

1. In Cloudflare Zero Trust dashboard → Networks → Tunnels → Create a tunnel
2. Name it `homelab-ops`
3. Copy the tunnel token → save as `CLOUDFLARE_TUNNEL_TOKEN` in `.env`
4. Add a public hostname: `ops.yourdomain.ch` → Service: `http://remediation-center:3000`
5. In Access → Applications → Add an application:
   - Name: `homelab Ops`
   - Domain: `ops.yourdomain.ch`
   - Policy: Allow → email equals `matthias@yourdomain.ch` (or Google/GitHub SSO)
   - Session duration: 24 hours

This gives you: public URL with auto TLS, zero-trust authentication before any request reaches the app, DDoS protection, and your Mac Mini's IP is never exposed. All free.

### 1.3 Database Schema

File: `docker/postgres/init.sql`

```sql
-- Findings table
create table findings (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  status text not null default 'inbox' check (status in ('inbox', 'triaged', 'in_progress', 'resolved', 'suppressed')),
  title text not null,
  host text,
  description text not null,
  evidence text,
  suggested_action text,
  template_id text,
  raw_output jsonb,
  detected_at timestamptz not null default now(),
  triaged_at timestamptz,
  resolved_at timestamptz,
  triaged_by text,
  resolved_by text,
  resolution_notes text,
  reverification_status text,
  reverification_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_findings_status on findings(status);
create index idx_findings_severity on findings(severity);
create index idx_findings_source on findings(source);
create index idx_findings_host on findings(host);

-- Finding timeline (audit trail)
create table finding_timeline (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references findings(id) on delete cascade,
  action text not null,
  actor text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_timeline_finding on finding_timeline(finding_id);

-- Agent run tracking
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  workflow text not null,
  trigger_type text not null,
  tier text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  findings_count int default 0,
  summary text,
  log_path text
);

create index idx_runs_agent on agent_runs(agent);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger findings_updated_at
  before update on findings
  for each row execute function update_updated_at();
```

## Component 2: Agent Framework

### 2.1 Agent Structure

Each agent lives in its own directory under `agents/` and follows the same pattern:

- `CLAUDE.md` — Instructions, available tools, workflows, safety rules, reporting format
- `context/` — Persistent memory (markdown files updated after each run)
- `scripts/run.sh` — Entry point that handles tiered invocation

### 2.2 Tiered Invocation

Every agent uses a two-tier execution model to minimize API costs:

**Tier 1 (bash, free):** Quick checks that don't need AI reasoning. Pure bash scripts that check binary conditions: is the service up? Is disk usage under threshold? Did the backup complete? Did the scan find zero critical issues?

**Tier 2 (Claude Code, costs tokens):** Invoked only when Tier 1 detects something that needs analysis. The AI agent investigates, correlates, and produces a structured finding for the remediation center.

```bash
#!/bin/bash
# Generic agent run pattern

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPS_DIR="$(cd "${AGENT_DIR}/../.." && pwd)"
source "${OPS_DIR}/.env"
ISSUES=""

# --- Tier 1: cheap checks ---
source "${AGENT_DIR}/scripts/healthcheck.sh"
# healthcheck.sh appends to $ISSUES if problems found

# --- Tier 2: AI analysis (only if needed) ---
if [[ -n "$ISSUES" ]]; then
    cd "$AGENT_DIR"
    claude -p "Issues detected:
$ISSUES

Investigate following the workflows in CLAUDE.md.
Submit findings to the remediation center API at http://127.0.0.1:3000/api/findings
using curl with POST, Content-Type application/json, and Authorization header Bearer ${OPS_API_TOKEN}.
Use the finding JSON schema defined in CLAUDE.md."
fi
```

### 2.3 Finding Schema

All agents submit findings in the same JSON format via curl to the remediation center API:

```json
{
  "source": "security-agent",
  "severity": "high",
  "title": "Exposed WordPress admin panel",
  "host": "dev.homelab.ch",
  "description": "The wp-admin interface is accessible from the public internet without IP restriction.",
  "evidence": "httpx returned 302 redirect to wp-login.php on dev.homelab.ch/wp-admin",
  "suggested_action": "Restrict wp-admin to VPN IP range in Caddy/nginx config.",
  "template_id": "homelab-exposed-admin",
  "detected_at": "2026-02-19T03:15:00Z",
  "raw_output": {}
}
```

### 2.4 Security Agent — CLAUDE.md Scope

The security agent CLAUDE.md should define:

**Tools available:**
- subfinder — passive subdomain enumeration
- httpx — HTTP probing, tech fingerprinting
- naabu — port scanning
- nuclei — template-based vulnerability scanning
- katana — web crawling and endpoint discovery
- dnsx — DNS resolution and record queries
- testssl.sh — TLS/SSL configuration analysis
- lynis — host security hardening audit
- curl, jq — utilities

**Workflows to implement:**
- Full attack surface scan (discovery → probing → port scan → vuln scan → report)
- Quick critical-only scan (nuclei with critical/high templates against known hosts)
- CVE response (check all hosts for a specific CVE)
- Compliance check (TLS, headers, exposed services, admin panels)
- Targeted service review (deep scan of a specific application)
- Re-verification (re-scan resolved findings to confirm fixes)

**Context files to read before each run:**
- architecture.md — infrastructure inventory, service owners, tech stacks
- conventions.md — naming patterns, schedules, severity-to-SLA mapping
- exclusions.txt — hosts and paths to never scan
- past-findings/ — historical data for deduplication

**Safety rules:**
- Never scan hosts in exclusions.txt
- Max 50 requests/second against production
- Detection only, never attempt exploitation
- Never store or exfiltrate sensitive data found during scans
- Verify critical findings before submitting (reduce false positives)

**Output:** Submit findings via curl POST to `http://127.0.0.1:3000/api/findings` with the finding JSON schema and the `Authorization: Bearer $OPS_API_TOKEN` header.

### 2.5 SRE Agent — CLAUDE.md Scope

**Tools available:**
- System: ps, top, df, free, uptime, sw_vers, diskutil, system_profiler
- Services: launchctl (macOS equivalent of systemctl), docker ps/stats
- Monitoring: netdata API (`curl http://localhost:19999/api/...`)
- Disk health: smartctl (via smartmontools)
- Network: ss/lsof (open ports), mtr, dig, tailscale status
- Logs: log show (macOS unified log), docker logs
- Certs: step certificate inspect, testssl.sh
- Traffic: vnstat or nettop

Note: macOS uses launchctl instead of systemctl, unified logging instead of journalctl, diskutil instead of lsblk. The CLAUDE.md must specify macOS-native commands.

**Workflows:**
- Healthcheck (services, disk, memory, load, Docker containers)
- Certificate expiry check
- Log anomaly analysis
- Weekly status report (summary of all systems)
- Incident investigation (triggered by Tier 1 failure or webhook)

**Tier 1 checks in healthcheck.sh (bash, no AI):**
- Docker containers running: `docker ps --format '{{.Names}} {{.Status}}' | grep -v "Up"`
- Disk usage on all volumes < 85%: `df -H | awk '$5+0 > 85'`
- Memory pressure acceptable: `memory_pressure` or `vm_stat`
- Load average reasonable: `sysctl -n vm.loadavg`
- Key services responsive: curl localhost ports for HA, Immich, Henry
- No abnormal network connections: `lsof -i -P | grep LISTEN`
- smartctl status on internal drive

**Context files:**
- service-inventory.md — what runs on the Mac Mini (Henry, HA, Immich, agents)
- baselines.md — normal values for key metrics
- thresholds.md — when to alert

### 2.6 Backup Agent — CLAUDE.md Scope

**Tools available:**
- restic — snapshots, check, restore, forget, prune, stats
- rclone — sync, check, ls, size
- age — file encryption

**Workflows:**
- Verify latest backup completed and is within expected window
- Test restore of a random file (prove backups are usable)
- Check backup integrity (restic check)
- Verify offsite sync completed (rclone check)
- Storage usage report
- Retention policy enforcement (restic forget --prune)

**Tier 1 checks in verify.sh (bash, no AI):**
- `restic snapshots --latest 1 --json` shows snapshot within expected window
- `restic check` returns clean (run weekly, not every time — it's slow)
- Backup repo size within expected range
- rclone remote reachable: `rclone lsd remote:`

**Context files:**
- backup-policies.md — what gets backed up, how often, retention rules
- targets.md — restic repos, rclone remotes (no passwords — reference env vars)
- restore-tests/ — log of past restore tests with results

## Component 3: Orchestrator

### 3.1 Schedules (launchd)

macOS uses launchd instead of cron. Each schedule is a plist file installed to `~/Library/LaunchAgents/`.

Example plist for the weekly full security scan:

File: `orchestrator/launchd/ch.homelab.security-full.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ch.homelab.security-full</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homelab-ops/agents/security/scripts/run.sh</string>
        <string>full</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/opt/homelab-ops/logs/security-full.log</string>
    <key>StandardErrorPath</key>
    <string>/opt/homelab-ops/logs/security-full.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

All plists follow this pattern. The setup script generates them from `orchestrator/schedules.md`.

### 3.2 Schedule Overview

File: `orchestrator/schedules.md`

```markdown
| Agent    | Workflow        | Frequency          | Tier | Time       |
|----------|----------------|-------------------|------|------------|
| Security | Full scan       | Weekly, Sunday     | 1+2  | 02:00      |
| Security | Quick scan      | Daily              | 1+2  | 03:00      |
| Security | Compliance      | Monthly, 1st       | 1+2  | 02:00      |
| Security | Re-verify       | Weekly, Wednesday  | 2    | 04:00      |
| SRE      | Healthcheck     | Every 15 minutes   | 1    | */15       |
| SRE      | Weekly report   | Weekly, Monday     | 2    | 07:00      |
| SRE      | Cert check      | Monthly, 1st       | 2    | 04:00      |
| Backup   | Verify          | Daily              | 1    | 06:00      |
| Backup   | Restore test    | Weekly, Sunday     | 2    | 08:00      |
| Backup   | Integrity check | Monthly, 1st       | 1+2  | 05:00      |
```

### 3.3 Tier 1 Runner

File: `orchestrator/tier1.sh`

```bash
#!/bin/bash
# Runs Tier 1 checks for a given agent. Escalates to Claude Code only if issues found.
AGENT=$1
AGENT_DIR="/opt/homelab-ops/agents/${AGENT}"
LOGDIR="/opt/homelab-ops/logs"
LOGFILE="${LOGDIR}/${AGENT}-tier1-$(date +%F).log"

mkdir -p "$LOGDIR"

# Source the agent's healthcheck script
ISSUES=""
source "${AGENT_DIR}/scripts/healthcheck.sh" 2>&1 | tee -a "$LOGFILE"

if [[ -n "$ISSUES" ]]; then
    echo "[$(date)] Tier 1 issues detected, escalating to Tier 2" | tee -a "$LOGFILE"
    /opt/homelab-ops/orchestrator/escalate.sh "$AGENT" "$ISSUES" 2>&1 | tee -a "$LOGFILE"
else
    echo "[$(date)] All checks passed" >> "$LOGFILE"
fi
```

### 3.4 Escalation Script

File: `orchestrator/escalate.sh`

```bash
#!/bin/bash
AGENT=$1
ISSUES=$2
AGENT_DIR="/opt/homelab-ops/agents/${AGENT}"
source /opt/homelab-ops/.env

cd "$AGENT_DIR"
claude -p "Tier 1 checks detected the following issues:

${ISSUES}

Investigate following the workflows in CLAUDE.md.
For each confirmed issue, submit a finding via:
curl -X POST http://127.0.0.1:3000/api/findings \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${OPS_API_TOKEN}' \\
  -d '<finding JSON per the schema in CLAUDE.md>'

Use the finding JSON schema defined in CLAUDE.md."
```

### 3.5 Webhook Listener

File: `orchestrator/webhook-listener.js`

A minimal Node.js HTTP server (no framework, just `node:http`) that accepts event-driven triggers from monitoring or manual invocation.

**Supported endpoints:**
- `POST /trigger/security/cve` — Body: `{ "cve_id": "CVE-2025-XXXXX" }` → Security agent CVE response
- `POST /trigger/security/scan` — Body: `{ "target": "https://app.homelab.ch" }` → Targeted security review
- `POST /trigger/sre/investigate` — Body: `{ "service": "immich", "issue": "unresponsive" }` → SRE investigation
- `POST /trigger/backup/verify` — Body: `{ "repo": "default" }` → Backup verification

**Behavior:**
- Listen on `127.0.0.1:9090` only (not internet-facing)
- Validate `Authorization: Bearer $OPS_API_TOKEN` header
- Spawn the relevant agent as a background process using `child_process.spawn`
- Return `202 Accepted` immediately with a run ID
- Log all triggers to `/opt/homelab-ops/logs/webhook.log`

The webhook listener runs as a launchd service so it starts on boot.

## Component 4: Remediation Center (Next.js)

### 4.1 Tech Stack

- Next.js 14+ with App Router
- TypeScript
- shadcn/ui components
- pg (node-postgres) for database access — keep it simple, no ORM unless drizzle adds clear value
- Tailwind CSS
- Docker deployment

### 4.2 API Routes

All API routes validate `Authorization: Bearer $OPS_API_TOKEN` header. The same token is used by agents and by the UI (stored in an httpOnly cookie after Cloudflare Access authenticates the user).

**POST /api/findings** — Submit a new finding.
- Deduplicates: if an open finding exists with same `template_id` and `host`, update `detected_at` and add a timeline entry "Re-detected by {source}" instead of creating a duplicate
- If a `resolved` finding matches, create a new finding with timeline note "Previously resolved on {date}, re-detected"
- Returns the finding ID

**GET /api/findings** — List findings.
- Query params: `status`, `severity`, `source`, `host`, `from`, `to`, `page`, `limit`
- Returns paginated results with total count

**GET /api/findings/[id]** — Finding detail with full timeline.

**PATCH /api/findings/[id]** — Update finding.
- Used by UI for status changes (triage, resolve, suppress)
- Used by agents for re-verification results
- Always creates a timeline entry

**POST /api/agent-runs** — Register an agent run starting. Returns run ID.

**PATCH /api/agent-runs/[id]** — Update run status on completion.

**GET /api/agent-runs** — List recent runs. Query params: `agent`, `limit`.

**GET /api/stats** — Dashboard statistics:
- Findings count by status and severity
- Open critical and high counts
- Mean time to resolve (for resolved findings)
- Per-agent: last run time, status, findings generated
- Findings trend (last 30 days)

### 4.3 UI Pages

**Dashboard (/)** — Primary view showing:
- Kanban board with columns: Inbox, Triaged, In Progress, Resolved
- Each card shows: severity badge (colored), title, host, source icon, time since detection
- Swipe cards left/right to change status on mobile; drag-and-drop on desktop
- Top bar: open criticals count, open highs count, last agent run times
- Bottom tab bar: Dashboard, Findings, Agents, Settings

**Findings List (/findings)** — Filterable, sortable table:
- Columns: severity, title, host, source, status, detected date, age
- Filters: status, severity, source, host, date range
- Click row to navigate to detail view
- Bulk actions: suppress selected, export as CSV

**Finding Detail (/findings/[id])** — Full view:
- Description, evidence (rendered as code block or pre), raw output (collapsible accordion)
- Suggested remediation action (highlighted box)
- Timeline showing all state changes with timestamps and actors
- Action buttons fixed at bottom of viewport on mobile: Triage, Start Work, Resolve (with notes field), Suppress, Request Re-verification
- If re-verification data exists, show status and last check date

**Agent Status (/agents)** — Operational view:
- Per agent card: name, last run time, next scheduled run, last run status (green/red), findings count from last run
- Run history table: last 20 runs with expandable summary
- Manual trigger button per agent workflow (calls webhook listener)

**Settings (/settings)** — Configuration reference:
- Schedule table (read from schedules.md, display only)
- Link to edit context files (opens in separate tool or shows current content)
- API token display (masked, copy button)

### 4.4 UI Design

**Mobile-first design.** The primary interaction mode is operating from a phone — triaging findings, approving actions, checking agent status while away from the desk. Desktop is secondary.

**Mobile interaction patterns:**
- Kanban board: swipe cards left/right to change status (inbox → triaged → in_progress → resolved). No drag-and-drop on mobile — swipe gestures instead, with haptic-style visual feedback
- Finding cards: tap to expand inline, long-press for quick actions (triage, suppress)
- Approval gate: large touch targets, confirm/reject buttons sized for thumb interaction (min 48px tap targets)
- Finding detail: stacked layout, evidence in collapsible accordion, action buttons fixed at bottom of viewport
- Navigation: bottom tab bar (Dashboard, Findings, Agents, Settings) — not a sidebar
- Pull-to-refresh on all list views

**Desktop enhancements (additive, not required):**
- Kanban board gains drag-and-drop in addition to swipe
- Side-by-side panels (list + detail)
- Wider table views with more visible columns

**General styling:**
- Use shadcn/ui components throughout
- Dark mode default, light mode toggle
- Information-dense: prioritize data over whitespace
- Severity colors: critical = red-500, high = orange-500, medium = yellow-500, low = blue-500, info = gray-500
- Status colors: inbox = neutral, triaged = blue, in_progress = yellow, resolved = green, suppressed = gray
- Agent colors: security = purple, sre = blue, backup = green
- Compact cards, expand for detail
- No unnecessary animations
- Monospace font for evidence and raw output sections
- Install as PWA (add manifest.json, service worker for offline shell) so it feels native on phone

### 4.5 Dockerfile

File: `remediation-center/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Next.js config must enable `output: 'standalone'` for the Docker build.

## Component 5: Setup & Installation

### 5.1 Prerequisites

- macOS on Mac Mini M4 (already running Docker, HA, Immich, Henry)
- Homebrew installed
- Docker Desktop running
- Claude Code CLI installed and authenticated (`npm install -g @anthropic-ai/claude-code`)
- Cloudflare account with a domain (free tier)

### 5.2 Tool Installation

File: `scripts/install-tools.sh`

Install via Homebrew where possible, Go install for PD tools:

```bash
#!/bin/bash
set -euo pipefail

echo "=== Installing homelab Ops Tools ==="

# Go (needed for ProjectDiscovery tools)
brew install go

# ProjectDiscovery tools
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/projectdiscovery/katana/cmd/katana@latest
go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest

# Update nuclei templates
nuclei -update-templates

# Backup tools
brew install restic rclone age

# Security tools
brew install testssl lynis

# Monitoring tools
brew install smartmontools vnstat

# Certificate tools
brew install step

# Network tools
brew install mtr

# Utilities
brew install jq node

echo "=== All tools installed ==="
```

### 5.3 Setup Script

File: `scripts/setup.sh`

Full platform setup:

1. Run `install-tools.sh`
2. Create directory structure at `/opt/homelab-ops/`
3. Generate random `OPS_API_TOKEN` and `POSTGRES_PASSWORD`, save to `.env`
4. Prompt for `CLOUDFLARE_TUNNEL_TOKEN`
5. Create log directory `/opt/homelab-ops/logs/`
6. Build and start Docker containers (`docker compose up -d --build`)
7. Wait for Postgres to be healthy, verify schema was created
8. Install all launchd plists to `~/Library/LaunchAgents/` and load them
9. Start webhook listener via launchd
10. Run a test finding submission to verify API is working
11. Print summary: installed tools, running services, access URL, next scheduled runs

### 5.4 Environment Variables

File: `.env`

```bash
# Database
POSTGRES_PASSWORD=<generated-during-setup>

# API authentication (shared between agents and remediation center)
OPS_API_TOKEN=<generated-during-setup>

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=<from-cloudflare-dashboard>

# Claude Code (should already be set in shell environment)
# ANTHROPIC_API_KEY=<your-key>
```

## Implementation Order

Build in this sequence. Each step should be testable before moving to the next.

1. **Docker stack** — docker-compose.yml with Postgres + init.sql. Verify database is running: `docker exec homelab-ops-db psql -U ops -d homelab_ops -c '\dt'`
2. **API routes** — Next.js app with POST/GET/PATCH for findings. Test with curl. No UI yet.
3. **Dockerfile** — Containerize the Next.js app, add to docker-compose. Verify API works through container.
4. **Cloudflared** — Add to docker-compose, configure tunnel. Verify public access with Cloudflare Access auth.
5. **Remediation center UI** — Dashboard with kanban, finding list, finding detail, agent status.
6. **Security agent** — CLAUDE.md, context files, tier 1 checks, run.sh. Test manually: `cd agents/security && claude` then ask it to run a scan.
7. **SRE agent** — CLAUDE.md, context files, healthcheck.sh, run.sh. Test manually.
8. **Backup agent** — CLAUDE.md, context files, verify.sh, run.sh. Test manually.
9. **Orchestrator** — tier1.sh, escalate.sh, launchd plists. Install and verify schedules fire.
10. **Webhook listener** — Event-driven triggers. Test with curl to localhost:9090.
11. **Re-verification workflow** — Security agent re-checks resolved findings, updates via API.
12. **Setup script** — Automate the full installation for reproducibility.

## Non-Goals (Out of Scope for v1)

- Multi-user authentication (Cloudflare Access handles auth, single operator inside the app)
- Email/Slack notifications (add later — simple webhook from Postgres trigger or API middleware)
- Agent-executed remediation (v1 is detect + recommend only, human executes)
- Historical trend charts (raw data for now, charts in v2)
- Integration with external ticketing (Jira, Linear)
- Monitoring of non-Mac-Mini infrastructure (agents only watch local + homelab external surface)

## Future Extensions (v2+)

- **Agent-executed remediation with approval gate:** Agent proposes a command or Ansible playbook. Human clicks "approve" in UI. Agent executes and reports back.
- **Notifications:** New critical finding → Slack webhook, email, or push notification.
- **Trend dashboard:** Findings over time, mean time to resolve, recurring issues, severity distribution charts.
- **CVE feed integration:** Watch NVD/CISA KEV RSS feeds, auto-trigger security agent when relevant CVEs drop.
- **Home Assistant integration:** HA can trigger agents via webhook listener (e.g., on network changes detected by HA).
- **Multi-environment:** Extend agents to monitor additional infrastructure beyond the Mac Mini.
