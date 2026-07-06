"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileDown, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type ReportFilters } from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type Person = { firstName?: string | null; lastName?: string | null; email?: string | null };
type ReportRow = Record<string, unknown>;
type UserOption = { id: string; firstName: string; lastName?: string | null; email: string };
type ReportSummary = {
  totals: Record<string, number>;
  projects?: ReportRow[];
  developers?: ReportRow[];
  members?: ReportRow[];
  tasks?: ReportRow[];
};

const reportTabs = [
  { key: "projects", label: "Projects", load: (query?: ReportFilters) => api.reports.projects<ReportSummary>(query) },
  { key: "developers", label: "Developers", load: (query?: ReportFilters) => api.reports.developers<ReportSummary>(query) },
  { key: "team", label: "Team", load: (query?: ReportFilters) => api.reports.team<ReportSummary>(query) },
  { key: "costing", label: "Costing", load: (query?: ReportFilters) => api.reports.costing<ReportSummary>(query) },
  { key: "estimated-vs-actual", label: "Estimate vs Actual", load: (query?: ReportFilters) => api.reports.estimatedVsActual<ReportSummary>(query) },
  { key: "budget-overruns", label: "Budget Overruns", load: (query?: ReportFilters) => api.reports.budgetOverruns<ReportSummary>(query) }
] as const;

type ReportTab = (typeof reportTabs)[number];

function money(value: unknown, currency = "USD") {
  return `${currency} ${Number(value ?? 0).toFixed(2)}`;
}

function numberValue(value: unknown, digits = 2) {
  return Number(value ?? 0).toFixed(digits);
}

function personName(value: unknown) {
  const person = value as Person | null | undefined;
  if (!person) return "-";
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "-";
}

function nested<T = ReportRow>(value: unknown, key: string) {
  return (value as ReportRow | null | undefined)?.[key] as T | undefined;
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(readableValue).join(", ");
  if (typeof value === "object") {
    const row = value as ReportRow;
    if ("title" in row || "name" in row || "code" in row) return [row.code, row.title ?? row.name].filter(Boolean).join(" - ");
    if ("firstName" in row || "email" in row) return personName(row);
    return JSON.stringify(row);
  }
  return String(value);
}

function reportColumns(tab: ReportTab) {
  if (tab.key === "projects") return ["title", "code", "client", "projectManager", "status", "budget", "currency", "progressPercentage"];
  if (tab.key === "developers") return ["developer", "taskCount", "completedTasks", "loggedHours", "estimatedHours", "actualHours", "actualCost", "billableAmount"];
  if (tab.key === "team") return ["user", "project", "roleInProject", "allocationPercentage", "assignedDate"];
  if (tab.key === "estimated-vs-actual") return ["title", "project", "assignedDeveloper", "status", "estimatedHours", "actualHours", "varianceHours", "estimatedCost", "actualCost"];
  return ["project", "budget", "loggedHours", "actualCost", "billableAmount", "remainingBudget", "isOverBudget"];
}

function rowsForExport(data: ReportSummary | null) {
  return data?.projects ?? data?.developers ?? data?.members ?? data?.tasks ?? [];
}

function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportExcel(tab: ReportTab, data: ReportSummary | null) {
  if (!data) return;
  const rows = rowsForExport(data);
  const columns = reportColumns(tab);
  const table = `<table><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${readableValue(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  download(`${tab.key}-report.xls`, `\uFEFF${table}`, "application/vnd.ms-excel;charset=utf-8");
}

function exportPdf(tab: ReportTab, data: ReportSummary | null) {
  if (!data) return;
  const rows = rowsForExport(data);
  const columns = reportColumns(tab);
  const printable = window.open("", "_blank", "width=1200,height=800");
  if (!printable) return;
  printable.document.write(`
    <html>
      <head>
        <title>${tab.label} Report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          .meta { color: #667085; margin-bottom: 18px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; background: #f4f7fb; color: #344054; }
          th, td { border: 1px solid #d7dde8; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>${tab.label} Report</h1>
        <div class="meta">Generated ${new Date().toLocaleString()}</div>
        <table><thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${readableValue(row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table>
      </body>
    </html>
  `);
  printable.document.close();
  printable.focus();
  printable.print();
}

export default function ReportsPage() {
  const { user } = useSessionUser();
  const availableTabs = reportTabs.filter((tab) => {
    if (["costing", "estimated-vs-actual", "budget-overruns"].includes(tab.key)) {
      return user?.permissions?.includes("costing.view");
    }

    return user?.permissions?.includes("report.view");
  });
  const [active, setActive] = useState<ReportTab>(availableTabs[0] ?? reportTabs[0]);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [users, setUsers] = useState<UserOption[]>([]);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReport(loader = active.load, query = filters) {
    setLoading(true);
    setError("");
    try {
      setData(await loader(query));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.users.list<UserOption[]>().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.key === active.key) && availableTabs[0]) {
      setActive(availableTabs[0]);
      return;
    }

    void loadReport(active.load, filters);
  }, [active, filters]);

  const rows = useMemo(() => data?.projects ?? data?.developers ?? data?.members ?? data?.tasks ?? [], [data]);
  const totals = data?.totals ?? {};

  return (
    <AppShell>
      <PageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="Project, developer, team, costing, variance, and budget overrun reporting for managers and admins."
        actions={
          <>
            <button onClick={() => loadReport()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={() => exportExcel(active, data)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f4c430] px-3 text-sm font-semibold text-[#111827]">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button onClick={() => exportPdf(active, data)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563eb] px-3 text-sm font-semibold text-white">
              <FileDown className="h-4 w-4" />
              PDF
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 rounded-md border border-[#d7dde8] bg-white p-4 md:grid-cols-[1fr_1fr_1.4fr_auto]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-[#667085]">From</span>
          <input type="date" value={filters.fromDate ?? ""} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value || undefined }))} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-[#667085]">To</span>
          <input type="date" value={filters.toDate ?? ""} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value || undefined }))} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-[#667085]">Developer</span>
          <select value={filters.developerId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, developerId: event.target.value || undefined }))} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 text-sm">
            <option value="">All developers</option>
            {users.map((option) => <option key={option.id} value={option.id}>{personName(option)} - {option.email}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={() => setFilters({})} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold text-[#111827]">Reset</button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-[#d7dde8] bg-white p-2">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab)}
            className={`h-9 rounded-md px-3 text-sm font-semibold ${active.key === tab.key ? "bg-[#111827] text-white" : "text-[#536079] hover:bg-[#f4f7fb]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {loading ? <div className="rounded-md border border-[#d7dde8] bg-white p-6 text-sm text-[#667085]">Loading report...</div> : null}

      {data && !loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Rows" value={rows.length} tone="black" />
            <MetricCard label="Budget" value={numberValue(totals.budget ?? totals.projects, 0)} tone="blue" />
            <MetricCard label="Logged Hours" value={numberValue(totals.hours ?? totals.loggedHours ?? totals.estimatedHours)} tone="gray" />
            <MetricCard label="Actual Cost" value={numberValue(totals.actualCost)} tone="yellow" />
          </div>

          <section className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
            <div className="flex h-12 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
              <BarChart3 className="h-4 w-4 text-[#2563eb]" />
              {active.label}
            </div>
            <div className="overflow-auto">
              {active.key === "projects" ? <ProjectReport rows={data.projects ?? []} /> : null}
              {active.key === "developers" ? <DeveloperReport rows={data.developers ?? []} /> : null}
              {active.key === "team" ? <TeamReport rows={data.members ?? []} /> : null}
              {active.key === "costing" || active.key === "budget-overruns" ? <CostingReport rows={data.projects ?? []} /> : null}
              {active.key === "estimated-vs-actual" ? <EstimateReport rows={data.tasks ?? []} /> : null}
            </div>
            {!rows.length ? <div className="p-8 text-sm text-[#667085]">No rows found for this report.</div> : null}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function ProjectReport({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return null;

  return (
    <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#667085]">
        <tr>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Project</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Client</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Manager</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Tasks</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Budget</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((project) => {
          const client = nested(project, "client");
          const counts = nested(project, "_count");
          return (
            <tr key={String(project.id)} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4">
                <div className="font-semibold text-[#111827]">{String(project.title ?? "-")}</div>
                <div className="mt-1 text-xs font-semibold uppercase text-[#2563eb]">{String(project.code ?? "")}</div>
              </td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{String(client?.name ?? "-")}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{personName(project.projectManager)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{String(counts?.tasks ?? 0)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{money(project.budget, String(project.currency ?? "USD"))}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={String(project.status ?? "")} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DeveloperReport({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return null;

  return (
    <table className="w-full min-w-[980px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#667085]">
        <tr>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Developer</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Tasks</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Completed</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Logged</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Estimated</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Actual Cost</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Billable</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(nested(row, "developer")?.id ?? index)} className="hover:bg-[#fbfcff]">
            <td className="border-b border-[#edf1f7] px-4 py-4">{personName(row.developer)}</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{String(row.taskCount ?? 0)}</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{String(row.completedTasks ?? 0)}</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(row.loggedHours)}h</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(row.estimatedHours)}h</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{money(row.actualCost)}</td>
            <td className="border-b border-[#edf1f7] px-4 py-4">{money(row.billableAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeamReport({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return null;

  return (
    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#667085]">
        <tr>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Member</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Project</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Role</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Allocation</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Assigned</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((member) => {
          const project = nested(member, "project");
          return (
            <tr key={String(member.id)} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4">{personName(member.user)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">
                <div className="font-semibold text-[#111827]">{String(project?.title ?? "-")}</div>
                <div className="mt-1 text-xs text-[#667085]">{String(project?.code ?? "")}</div>
              </td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={String(member.roleInProject ?? "")} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(member.allocationPercentage, 0)}%</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{member.assignedDate ? new Date(String(member.assignedDate)).toLocaleDateString() : "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CostingReport({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return null;

  return (
    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#667085]">
        <tr>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Project</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Budget</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Logged</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Actual Cost</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Remaining</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Health</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const project = nested(row, "project");
          const currency = String(project?.currency ?? "USD");
          return (
            <tr key={String(project?.id ?? row.id)} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4">
                <div className="font-semibold text-[#111827]">{String(project?.title ?? row.title ?? "-")}</div>
                <div className="mt-1 text-xs text-[#667085]">{String(project?.code ?? row.code ?? "")}</div>
              </td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{money(row.budget ?? project?.budget, currency)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(row.loggedHours)}h</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{money(row.actualCost, currency)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{money(row.remainingBudget, currency)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={row.isOverBudget ? "DELAYED" : "ACTIVE"} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EstimateReport({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return null;

  return (
    <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#667085]">
        <tr>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Task</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Project</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Developer</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Estimate</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Actual</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Variance</th>
          <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((task) => {
          const project = nested(task, "project");
          return (
            <tr key={String(task.id)} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{String(task.title ?? "-")}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{String(project?.code ?? "")} · {String(project?.title ?? "")}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{personName(task.assignedDeveloper)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(task.estimatedHours)}h</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{numberValue(task.actualHours)}h</td>
              <td className={`border-b border-[#edf1f7] px-4 py-4 font-semibold ${Number(task.varianceHours ?? 0) > 0 ? "text-[#b42318]" : "text-[#137333]"}`}>{numberValue(task.varianceHours)}h</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={String(task.status ?? "")} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
