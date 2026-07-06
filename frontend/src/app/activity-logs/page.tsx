"use client";

import { useEffect, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

type ActivityLog = {
  id: string;
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName?: string | null;
    email: string;
  } | null;
};

type ActivityLogResponse = {
  items: ActivityLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogResponse | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      setLogs(await api.activityLogs.list<ActivityLogResponse>({ pageSize: 50, search: search.trim() }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load activity logs");
      setLogs(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity Logs"
        description="Searchable audit events for auth, project, task, costing, and credential activity."
        actions={
          <>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search action, module, entity"
            className="h-10 w-64 rounded-md border border-[#d7dde8] bg-white px-3 text-sm outline-none"
          />
          <button onClick={loadLogs} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-3 text-sm font-semibold text-white">
            <RefreshCcw className="h-4 w-4" />
            Load
          </button>
          </>
        }
      />
      {error ? <div className="rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {loading ? <div className="rounded-md border border-[#d7dde8] bg-white p-6 text-sm text-[#667085]">Loading activity...</div> : null}
      {logs && !loading ? (
        <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
          <div className="flex h-14 items-center gap-2 border-b border-[#d7dde8] px-4 text-sm font-semibold text-[#111827]">
            <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
            {logs.pagination.total} events
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-[#536079]">
                <tr>
                  <th className="border-b border-[#d8dee9] px-4 py-3 font-medium">Time</th>
                  <th className="border-b border-[#d8dee9] px-4 py-3 font-medium">Action</th>
                  <th className="border-b border-[#d8dee9] px-4 py-3 font-medium">Module</th>
                  <th className="border-b border-[#d8dee9] px-4 py-3 font-medium">Actor</th>
                  <th className="border-b border-[#d8dee9] px-4 py-3 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr key={log.id}>
                  <td className="border-b border-[#edf1f7] px-4 py-3 text-[#667085]">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="border-b border-[#edf1f7] px-4 py-3 font-semibold text-[#111827]">{log.action}</td>
                    <td className="border-b border-[#edf1f7] px-4 py-3"><StatusBadge value={log.module} /></td>
                    <td className="border-b border-[#edf1f7] px-4 py-3">{log.actor?.email ?? "System"}</td>
                    <td className="border-b border-[#edf1f7] px-4 py-3 text-[#667085]">{log.entityType ?? "-"} {log.entityId ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
