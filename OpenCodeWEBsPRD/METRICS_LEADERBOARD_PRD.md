# 📊 PRD: Contributor Leaderboard & Live Analytics Dashboard

## 1. Executive Summary & Core Objective

The **Live Analytics & Contributor Leaderboard** provides real-time visibility into the activity executed by the `OpenCodeWEBsAG` autonomous AI agent. It tracks immutable pre-mutation backups, dynamic co-authorship contributions, and automated bug repairs across repositories. 

Data is persisted securely via **Cloudflare KV (Key-Value Store)** and served edge-side via the **Cloudflare Worker Gateway** (`opencodeweb.xup.workers.dev`) directly to the frontend at `pocwu.pages.dev/AG`.

---

## 2. Key Metrics & Data Model

The system tracks three core operational metrics:

1. **Total Backups Created (`total_backups`):** Incremented whenever a `backup/opencode-ag-*` snapshot branch or fork is created.
2. **Automated Bug Fixes (`bugs_fixed`):** Incremented when an AST audit, type check, or automated fix passes CI/CD and is committed.
3. **Co-Authors & Developers (`contributors`):** A dynamic map capturing each contributor's GitHub username, avatar URL, commit count, and last active timestamp.

### 💾 Cloudflare KV Data Schema (`AG_METRICS` Namespace)

```json
{
  "system_stats": {
    "total_backups": 142,
    "bugs_fixed": 89,
    "total_commits": 231,
    "last_updated": "2026-08-01T07:43:18Z"
  },
  "contributors": [
    {
      "username": "ABsUP",
      "role": "Core Author / Co-Author",
      "avatar": "[https://github.com/ABsUP.png](https://github.com/ABsUP.png)",
      "commits_count": 120,
      "last_active": "2026-08-01T07:30:00Z"
    },
    {
      "username": "OpenCodeWEB",
      "role": "Organization Maintainer",
      "avatar": "[https://github.com/OpenCodeWEB.png](https://github.com/OpenCodeWEB.png)",
      "commits_count": 75,
      "last_active": "2026-07-31T18:20:00Z"
    }
  ]
}

```

---

## 3. Architecture & Workflow Logic

```text
[ GitHub Action / AG Agent Execution ]
                  │
                  ▼ (Sends JSON Payload)
[ Worker Endpoint: POST /api/metrics/update ]
                  │
        (HMAC SHA-256 Validated)
                  │
                  ▼
   [ Cloudflare KV: AG_METRICS Namespace ]
                  │
                  ▼ (GET /api/metrics/live)
[ Frontend Dashboard: pocwu.pages.dev/AG ]

```

### 🔄 Execution Flow Logic

1. **Trigger Event:** Whenever `OpenCodeWEBsAG` completes a workflow (backup, commit, or AST fix), the GitHub Action sends a POST request to `https://opencodeweb.xup.workers.dev/api/metrics/update`.
2. **Authentication:** The Worker verifies the `X-Hub-Signature-256` header using `WEBHOOK_SECRET`.
3. **KV Atomic Update:**
* Increments `total_backups` if action is `backup_created`.
* Increments `bugs_fixed` if action is `auto_fix_applied`.
* Parses `${{ github.actor }}` and extra co-authors, inserting or incrementing their contribution counters in Cloudflare KV.


4. **Edge Delivery:** The frontend fetches `/api/metrics/live` cached at the Cloudflare edge for zero latency rendering.

---

## 4. Cloudflare Worker Gateway Code (`index.ts` API Patch)

Add these routes to your Cloudflare Worker (`opencodeweb.xup.workers.dev`):

```typescript
export interface Env {
  AG_METRICS: KVNamespace; // Cloudflare KV Binding
  WEBHOOK_SECRET: string;
}

// Route Handling Logic Snippet
if (url.pathname === "/api/metrics/live" && request.method === "GET") {
  const data = await env.AG_METRICS.get("dashboard_data", { type: "json" });
  return new Response(JSON.stringify(data || { system_stats: {}, contributors: [] }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "[https://pocwu.pages.dev](https://pocwu.pages.dev)",
      "Cache-Control": "public, max-age=60"
    },
  });
}

if (url.pathname === "/api/metrics/update" && request.method === "POST") {
  const bodyText = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");

  if (!await verifyGitHubSignature(bodyText, signature, env.WEBHOOK_SECRET)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const payload = JSON.parse(bodyText);
  let currentData: any = (await env.AG_METRICS.get("dashboard_data", { type: "json" })) || {
    system_stats: { total_backups: 0, bugs_fixed: 0, total_commits: 0 },
    contributors: []
  };

  // 1. Metrics Increment Logic
  if (payload.event === "backup") currentData.system_stats.total_backups += 1;
  if (payload.event === "bug_fix") currentData.system_stats.bugs_fixed += 1;
  currentData.system_stats.total_commits += 1;
  currentData.system_stats.last_updated = new Date().toISOString();

  // 2. Contributor Upsert Logic
  const actorName = payload.actor || "ABsUP";
  let userObj = currentData.contributors.find((c: any) => c.username === actorName);

  if (userObj) {
    userObj.commits_count += 1;
    userObj.last_active = new Date().toISOString();
  } else {
    currentData.contributors.push({
      username: actorName,
      role: "Co-Author / Contributor",
      avatar: `[https://github.com/$](https://github.com/$){actorName}.png`,
      commits_count: 1,
      last_active: new Date().toISOString()
    });
  }

  // Save back to KV
  await env.AG_METRICS.put("dashboard_data", JSON.stringify(currentData));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

```

---

## 5. Frontend UI Component Code (`pocwu.pages.dev/AG`)

Paste this component inside `public/AG/index.html` to render the Live Analytics Cards & Contributor Leaderboard Table:

```html
<!-- Live Metrics Counter Cards -->
<section class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="glass-card p-6 rounded-2xl border border-slate-800 text-center glow-blue">
    <div class="text-3xl font-extrabold text-blue-400 font-mono" id="metric-backups">--</div>
    <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
      <i class="fa-solid fa-box-archive mr-1"></i> Pre-Mutation Backups
    </div>
  </div>

  <div class="glass-card p-6 rounded-2xl border border-slate-800 text-center glow-blue">
    <div class="text-3xl font-extrabold text-green-400 font-mono" id="metric-bugs">--</div>
    <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
      <i class="fa-solid fa-bug-slash mr-1"></i> Autonomous Bug Fixes
    </div>
  </div>

  <div class="glass-card p-6 rounded-2xl border border-slate-800 text-center glow-blue">
    <div class="text-3xl font-extrabold text-purple-400 font-mono" id="metric-commits">--</div>
    <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
      <i class="fa-solid fa-code-commit mr-1"></i> Total AG Commits
    </div>
  </div>
</section>

<!-- Contributors Leaderboard Table -->
<section class="mt-12 glass-card rounded-2xl p-8 border border-slate-800">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-2xl font-bold text-white">🏆 Active Contributors & Co-Authors</h2>
      <p class="text-xs text-slate-400">Tracked in real-time via Cloudflare KV Gateway</p>
    </div>
    <span class="text-xs font-mono text-blue-400 px-3 py-1 rounded-full glass-card border border-blue-500/30">
      Live Leaderboard
    </span>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm text-slate-300">
      <thead class="bg-slate-900/80 text-slate-400 uppercase font-mono text-xs border-b border-slate-800">
        <tr>
          <th class="py-3 px-4">Contributor</th>
          <th class="py-3 px-4">Role</th>
          <th class="py-3 px-4 text-center">Co-Authored Commits</th>
          <th class="py-3 px-4 text-right">Last Active</th>
        </tr>
      </thead>
      <tbody id="leaderboard-body" class="divide-y divide-slate-800/60 font-mono">
        <!-- Injected via JavaScript -->
      </tbody>
    </table>
  </div>
</section>

<script>
  async function loadLiveMetrics() {
    try {
      const res = await fetch('[https://opencodeweb.xup.workers.dev/api/metrics/live](https://opencodeweb.xup.workers.dev/api/metrics/live)');
      if (!res.ok) return;
      const data = await res.json();

      // Render Metrics
      document.getElementById('metric-backups').textContent = data.system_stats?.total_backups || 0;
      document.getElementById('metric-bugs').textContent = data.system_stats?.bugs_fixed || 0;
      document.getElementById('metric-commits').textContent = data.system_stats?.total_commits || 0;

      // Render Leaderboard
      const tbody = document.getElementById('leaderboard-body');
      tbody.innerHTML = '';

      const sortedContributors = (data.contributors || []).sort((a, b) => b.commits_count - a.commits_count);

      sortedContributors.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/30 transition-colors';
        tr.innerHTML = `
          <td class="py-3 px-4 flex items-center gap-3">
            <img src="${c.avatar}" class="w-8 h-8 rounded-full border border-blue-500/40" alt="${c.username}">
            <span class="font-bold text-white">${c.username}</span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-400">${c.role}</td>
          <td class="py-3 px-4 text-center font-bold text-blue-400">${c.commits_count}</td>
          <td class="py-3 px-4 text-right text-xs text-slate-500">${new Date(c.last_active).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', loadLiveMetrics);
</script>
