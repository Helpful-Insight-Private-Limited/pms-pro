import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const backendUrl = process.env.SMOKE_BACKEND_URL ?? "http://127.0.0.1:4100";
const frontendUrl = process.env.SMOKE_FRONTEND_URL ?? "http://127.0.0.1:3000";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@example.com";
const pmEmail = process.env.SMOKE_PM_EMAIL ?? "demo.pm@example.com";
const password = process.env.SMOKE_PASSWORD ?? "ChangeMeStrong123";

const results = [];
const ownedProcesses = [];

function record(check, pass, detail = "") {
  results.push({ check, pass: Boolean(pass), detail: String(detail) });
}

async function getJson(path, token) {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return body;
}

async function postJson(path, payload, token) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return body;
}

async function deleteJson(path, token) {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return body;
}

async function checkHttp(name, url) {
  try {
    const response = await fetch(url);
    record(name, response.ok, `HTTP ${response.status}`);
  } catch (error) {
    record(name, false, error.message);
  }
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function startProcess(name, args, cwd, logName) {
  mkdirSync(resolve(rootDir, ".smoke"), { recursive: true });
  const child = spawn(npmCmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
    windowsHide: true
  });

  child.stdout.pipe(process.stdout, { end: false });
  child.stderr.pipe(process.stderr, { end: false });
  ownedProcesses.push(child);
  console.log(`[smoke] started ${name} pid=${child.pid} log=${logName}`);
  return child;
}

async function waitFor(name, url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error(`${name} did not become reachable at ${url}`);
}

async function runCheck(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail ?? "OK");
    return detail;
  } catch (error) {
    record(name, false, error.message);
    return null;
  }
}

async function ensureServers() {
  if (!(await isReachable(`${backendUrl}/health`))) {
    startProcess("backend", ["--workspace", "backend", "run", "start"], rootDir, "backend");
    await waitFor("backend", `${backendUrl}/health`);
  }

  if (!(await isReachable(`${frontendUrl}/login`))) {
    startProcess("frontend", ["--workspace", "frontend", "run", "start"], rootDir, "frontend");
    await waitFor("frontend", `${frontendUrl}/login`);
  }
}

async function main() {
  await ensureServers();

  await runCheck("backend health", async () => {
    const response = await fetch(`${backendUrl}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return "OK";
  });

  await checkHttp("frontend login page", `${frontendUrl}/login`);
  await checkHttp("frontend dashboard page", `${frontendUrl}/dashboard`);

  let adminLogin = null;
  try {
    const body = await postJson("/api/auth/login", { email: adminEmail, password });
    if (!body?.data?.accessToken) throw new Error("Missing access token");
    adminLogin = body.data.accessToken;
    record("admin login", true, "OK");
  } catch (error) {
    record("admin login", false, error.message);
  }

  if (adminLogin) {
    await runCheck("auth me", async () => {
      await getJson("/api/auth/me", adminLogin);
      return "OK";
    });

    await runCheck("admin users list", async () => {
      const body = await getJson("/api/users", adminLogin);
      const count = Array.isArray(body?.data) ? body.data.length : 0;
      if (count < 1) throw new Error("No users returned");
      return `count=${count}`;
    });

    await runCheck("roles list", async () => {
      await getJson("/api/roles", adminLogin);
      return "OK";
    });

    await runCheck("projects list", async () => {
      await getJson("/api/projects", adminLogin);
      return "OK";
    });

    await runCheck("site settings", async () => {
      await getJson("/api/system/site-settings", adminLogin);
      return "OK";
    });

    await runCheck("email status", async () => {
      await getJson("/api/notifications/email-status", adminLogin);
      return "OK";
    });

    await runCheck("project reports", async () => {
      await getJson("/api/reports/projects", adminLogin);
      return "OK";
    });
  }

  let pmLogin = null;
  try {
    const body = await postJson("/api/auth/login", { email: pmEmail, password });
    if (!body?.data?.accessToken) throw new Error("Missing access token");
    pmLogin = body.data.accessToken;
    record("pm login", true, "OK");
  } catch (error) {
    record("pm login", false, error.message);
  }

  if (pmLogin) {
    let pmRoleSlugs = [];
    let teamLeaderRoleId = null;

    await runCheck("pm users visible", async () => {
      const body = await getJson("/api/users", pmLogin);
      const emails = (body?.data ?? []).map((user) => user.email);
      for (const requiredEmail of ["demo.leader@example.com", "demo.dev@example.com", "demo.qa@example.com"]) {
        if (!emails.includes(requiredEmail)) throw new Error(`Missing ${requiredEmail}`);
      }
      return emails.join(",");
    });

    await runCheck("pm roles restricted", async () => {
      const body = await getJson("/api/roles", pmLogin);
      pmRoleSlugs = (body?.data ?? []).map((role) => role.slug);
      teamLeaderRoleId = (body?.data ?? []).find((role) => role.slug === "teamLeader")?.id ?? null;
      if (!pmRoleSlugs.includes("teamLeader") || !pmRoleSlugs.includes("teamMember") || pmRoleSlugs.includes("admin")) {
        throw new Error(`Unexpected roles: ${pmRoleSlugs.join(",")}`);
      }
      return pmRoleSlugs.join(",");
    });

    await runCheck("pm-created team leader visible", async () => {
      if (!teamLeaderRoleId) throw new Error("Team Leader role not available to PM");

      const email = `smoke.pm.tl.${Date.now()}@example.com`;
      let createdUserId = null;

      try {
        const created = await postJson("/api/users", {
          firstName: "Smoke",
          lastName: "Team Leader",
          email,
          password,
          roleIds: [teamLeaderRoleId]
        }, pmLogin);

        createdUserId = created?.data?.id;
        if (!createdUserId) throw new Error("Created user id missing");

        const list = await getJson("/api/users", pmLogin);
        const emails = (list?.data ?? []).map((user) => user.email);
        if (!emails.includes(email)) {
          throw new Error("New PM-created Team Leader is missing from PM users list");
        }

        return email;
      } finally {
        if (createdUserId) {
          await deleteJson(`/api/users/${createdUserId}`, pmLogin);
        }
      }
    });
  }

  const failures = results.filter((result) => !result.pass);
  console.table(results);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  for (const child of ownedProcesses.reverse()) {
    child.stdout?.destroy();
    child.stderr?.destroy();
    if (!child.killed) {
      if (isWindows) {
        try {
          execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
        } catch {
          child.kill();
        }
      } else {
        child.kill("SIGTERM");
      }
    }
  }
  process.exit(process.exitCode ?? 0);
}
