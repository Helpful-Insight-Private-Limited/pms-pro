"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type Dashboard = {
  role: string;
  totals: Record<string, number>;
  projectStatus: Record<string, number>;
  taskStatus: Record<string, number>;
  financial: {
    totalBudget: number;
    totalLoggedHours: number;
    totalEstimatedHours: number;
    totalActualHours: number;
  };
  recentProjects?: Array<{ id: string; title: string; code: string; status: string; budget: string | number; currency: string; client?: { name: string } }>;
  upcomingTasks?: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string; project?: { title: string; code: string } }>;
  latestJobRuns?: Array<{ id: string; jobName: string; status: string; startedAt: string }>;
};

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  startAt: string;
  endAt: string;
  source?: string;
};

type Leave = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  developer?: { firstName: string; lastName?: string | null; email: string };
};

type Availability = {
  developer: { id: string; name: string; email: string };
  designation?: string | null;
  availableHours: number;
  leaveDays: number;
  holidayDays: number;
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function calendarRange() {
  const now = new Date();
  return {
    fromDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    toDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)))
  };
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(value));
}

function monthLabel() {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date());
}

function monthCells() {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const cells: Array<{ date: Date; inMonth: boolean; key: string }> = [];
  const startOffset = firstDay.getUTCDay();
  const totalVisibleDays = Math.ceil((startOffset + lastDay.getUTCDate()) / 7) * 7;

  for (let index = 0; index < totalVisibleDays; index += 1) {
    const date = new Date(firstDay);
    date.setUTCDate(1 - startOffset + index);
    cells.push({ date, inMonth: date.getUTCMonth() === now.getUTCMonth(), key: dateOnly(date) });
  }

  return cells;
}

function eventsForDay(events: CalendarEvent[], key: string) {
  return events.filter((event) => dateOnly(new Date(event.startAt)) <= key && dateOnly(new Date(event.endAt)) >= key);
}

export default function DashboardPage() {
  const { user: sessionUser } = useSessionUser();
  const canViewBudget = Boolean(sessionUser?.roles.includes("admin") || sessionUser?.permissions.includes("project.viewBudget") || sessionUser?.permissions.includes("project.viewCosting") || sessionUser?.permissions.includes("costing.view"));
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [calendarError, setCalendarError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboards.me<Dashboard>().then(setDashboard).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard");
    });

    const range = calendarRange();
    Promise.all([
      api.calendar.events.list<CalendarEvent[]>(range),
      api.calendar.leaves.list<Leave[]>(range),
      api.calendar.availability<Availability[]>(range)
    ])
      .then(([events, leaveList, availabilityList]) => {
        setCalendarEvents(events);
        setLeaves(leaveList);
        setAvailability(availabilityList);
      })
      .catch((requestError) => {
        setCalendarError(requestError instanceof Error ? requestError.message : "Unable to load calendar summary");
      });
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow={dashboard?.role ? `${dashboard.role.replace(/([a-z])([A-Z])/g, "$1 $2")} view` : "Workspace"}
        title="Command Dashboard"
        description="Role-aware delivery, budget, sprint, task, and notification summary for daily operations."
      />
      {error ? <div className="rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {!dashboard && !error ? <div className="rounded-md border border-[#d7dde8] bg-white p-6 text-sm text-[#667085]">Loading dashboard...</div> : null}
      {dashboard ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Projects" value={dashboard.totals.projects ?? 0} tone="black" detail="Accessible portfolio" />
            <MetricCard label="Tasks" value={dashboard.totals.tasks ?? 0} tone="blue" detail="Active work items" />
            <MetricCard label="Overdue" value={dashboard.totals.overdueTasks ?? 0} tone={(dashboard.totals.overdueTasks ?? 0) > 0 ? "red" : "gray"} detail="Needs attention" />
            <MetricCard label="Blockers" value={dashboard.totals.openBlockers ?? 0} tone={(dashboard.totals.openBlockers ?? 0) > 0 ? "yellow" : "gray"} detail="Open impediments" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-md border border-[#d7dde8] bg-white">
              <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
                <div className="flex items-center gap-2 font-semibold text-[#111827]">
                  <FolderKanban className="h-4 w-4 text-[#2563eb]" />
                  Recent Projects
                </div>
                <StatusBadge value={`${dashboard.totals.projects ?? 0} total`} />
              </div>
              <div className="divide-y divide-[#edf1f7]">
                {(dashboard.recentProjects ?? []).slice(0, 6).map((project) => (
                  <div key={project.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_120px] md:items-center">
                    <div>
                      <div className="font-semibold text-[#111827]">{project.title}</div>
                      <div className="mt-1 text-sm text-[#667085]">{project.code} · {project.client?.name ?? "No client"}</div>
                    </div>
                    <StatusBadge value={project.status} />
                    {canViewBudget ? <div className="text-sm font-semibold text-[#111827]">{project.currency} {Number(project.budget ?? 0).toFixed(0)}</div> : null}
                  </div>
                ))}
                {(dashboard.recentProjects ?? []).length === 0 ? <div className="p-6 text-sm text-[#667085]">No projects available for this role.</div> : null}
              </div>
            </section>

            {canViewBudget ? <section className="rounded-md border border-[#111827] bg-[#111827] text-white">
              <div className="border-b border-white/10 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-[#f4c430]" />
                  Financial Pulse
                </div>
              </div>
              <div className="space-y-4 p-4">
                <MetricCard label="Total Budget" value={dashboard.financial.totalBudget.toFixed(2)} tone="yellow" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-white/10 p-3">
                    <div className="text-xs text-white/55">Logged</div>
                    <div className="mt-1 font-semibold">{dashboard.financial.totalLoggedHours.toFixed(2)}h</div>
                  </div>
                  <div className="rounded-md border border-white/10 p-3">
                    <div className="text-xs text-white/55">Actual</div>
                    <div className="mt-1 font-semibold">{dashboard.financial.totalActualHours.toFixed(2)}h</div>
                  </div>
                </div>
              </div>
            </section> : null}
          </div>

          <section className="rounded-md border border-[#d7dde8] bg-white">
            <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
              <div className="flex items-center gap-2 font-semibold text-[#111827]">
                <CalendarDays className="h-4 w-4 text-[#2563eb]" />
                Calendar & Availability
              </div>
              <StatusBadge value={monthLabel()} />
            </div>
            {calendarError ? <div className="border-b border-[#f3b4b4] bg-[#fff7ed] p-4 text-sm text-[#b45309]">{calendarError}</div> : null}
            <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="border-b border-[#edf1f7] lg:border-b-0 lg:border-r">
                <div className="flex h-11 items-center justify-between bg-[#f8fafc] px-4 text-sm font-semibold text-[#111827]">
                  Month calendar
                  <span className="text-xs font-medium text-[#667085]">{calendarEvents.length} accessible items</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 border-l border-t border-[#edf1f7] text-center text-xs font-semibold uppercase text-[#667085]">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="border-b border-r border-[#edf1f7] bg-[#fbfcff] py-2">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 border-l border-[#edf1f7]">
                    {monthCells().map((cell) => {
                      const dayEvents = eventsForDay(calendarEvents, cell.key);
                      const today = cell.key === dateOnly(new Date());
                      return (
                        <div key={cell.key} className={`min-h-28 border-b border-r border-[#edf1f7] p-2 ${cell.inMonth ? "bg-white" : "bg-[#f8fafc] text-[#98a2b3]"}`}>
                          <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${today ? "bg-[#2563eb] text-white" : "text-[#667085]"}`}>{cell.date.getUTCDate()}</div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div key={`${cell.key}-${event.id}`} className={`truncate rounded-md px-2 py-1 text-[11px] font-semibold ${event.type === "HOLIDAY" ? "bg-[#fff5cc] text-[#7a5a00]" : event.type === "LEAVE" ? "bg-[#fff0ee] text-[#b42318]" : event.type === "TASK" ? "bg-[#eaf1ff] text-[#174ea6]" : "bg-[#111827] text-white"}`} title={event.title}>
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 ? <div className="text-[11px] font-semibold text-[#667085]">+{dayEvents.length - 3} more</div> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!calendarEvents.length && !calendarError ? <div className="mt-4 rounded-md border border-[#d7dde8] p-4 text-sm text-[#667085]">No accessible calendar items in this month.</div> : null}
                </div>
                <div className="border-t border-[#edf1f7] p-4">
                  <div className="mb-3 text-sm font-semibold text-[#111827]">Upcoming this month</div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {calendarEvents.slice(0, 6).map((event) => (
                      <div key={event.id} className="grid gap-3 rounded-md border border-[#d7dde8] p-3 md:grid-cols-[72px_1fr] md:items-center">
                        <div className="text-sm font-semibold text-[#2563eb]">{displayDate(event.startAt)}</div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#111827]">{event.title}</div>
                          <div className="mt-1 flex items-center gap-2"><StatusBadge value={event.type} /><span className="truncate text-xs text-[#667085]">{event.source ?? "custom"}</span></div>
                        </div>
                      </div>
                    ))}
                    {!calendarEvents.length && !calendarError ? <div className="text-sm text-[#667085]">No upcoming items.</div> : null}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex h-11 items-center gap-2 bg-[#f8fafc] px-4 text-sm font-semibold text-[#111827]">
                  <Users className="h-4 w-4 text-[#2563eb]" />
                  Availability
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-1">
                  {availability.slice(0, 5).map((item) => (
                    <div key={item.developer.id} className="rounded-md border border-[#d7dde8] bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#111827]">{item.developer.name}</div>
                          <div className="text-xs text-[#667085]">{item.designation ?? item.developer.email}</div>
                        </div>
                        <div className="rounded-md bg-[#111827] px-2 py-1 text-right text-sm font-semibold text-white">{Math.round(item.availableHours)}h</div>
                      </div>
                      <div className="mt-3 flex gap-2 text-xs text-[#667085]">
                        <span className="rounded-md bg-[#eaf1ff] px-2 py-1">Leave {item.leaveDays}</span>
                        <span className="rounded-md bg-[#fff7d6] px-2 py-1">Holiday {item.holidayDays}</span>
                      </div>
                    </div>
                  ))}
                  {!availability.length && !calendarError ? <div className="text-sm text-[#667085]">No availability data available.</div> : null}
                </div>
              </div>
            </div>
            {leaves.length ? (
              <div className="border-t border-[#edf1f7] p-4">
                <div className="mb-3 text-sm font-semibold text-[#111827]">Leave in this period</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {leaves.slice(0, 3).map((leave) => (
                    <div key={leave.id} className="rounded-md border border-[#d7dde8] p-3 text-sm">
                      <div className="font-semibold text-[#111827]">{leave.developer ? `${leave.developer.firstName} ${leave.developer.lastName ?? ""}`.trim() : "User"}</div>
                      <div className="mt-1 text-[#667085]">{displayDate(leave.startDate)} - {displayDate(leave.endDate)}</div>
                      <div className="mt-2 flex gap-2"><StatusBadge value={leave.type} /><StatusBadge value={leave.status} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-md border border-[#d7dde8] bg-white">
              <div className="flex h-14 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
                <Clock3 className="h-4 w-4 text-[#2563eb]" />
                Upcoming Tasks
              </div>
              <div className="divide-y divide-[#edf1f7]">
                {(dashboard.upcomingTasks ?? []).slice(0, 7).map((task) => (
                  <div key={task.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_110px_120px] md:items-center">
                    <div>
                      <div className="font-medium text-[#111827]">{task.title}</div>
                      <div className="mt-1 text-sm text-[#667085]">{task.project?.code ?? "Project"} · {task.project?.title ?? ""}</div>
                    </div>
                    <StatusBadge value={task.status} />
                    <div className="text-sm text-[#667085]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</div>
                  </div>
                ))}
                {(dashboard.upcomingTasks ?? []).length === 0 ? <div className="p-6 text-sm text-[#667085]">No upcoming task deadlines.</div> : null}
              </div>
            </section>

            <section className="rounded-md border border-[#d7dde8] bg-white">
              <div className="flex h-14 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
                <AlertTriangle className="h-4 w-4 text-[#f4c430]" />
                Status Mix
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {Object.entries(dashboard.taskStatus ?? {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-md border border-[#d7dde8] p-3">
                    <StatusBadge value={status} />
                    <span className="font-semibold text-[#111827]">{count}</span>
                  </div>
                ))}
                {Object.keys(dashboard.taskStatus ?? {}).length === 0 ? <div className="text-sm text-[#667085]">No task status data yet.</div> : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
