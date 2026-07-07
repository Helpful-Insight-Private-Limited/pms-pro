"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Edit3, Plus, RefreshCcw, Save, Trash2, Users, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  api,
  type CalendarEventInput,
  type CalendarEventType,
  type DeveloperLeaveInput,
  type HolidayInput,
  type LeaveStatus,
  type LeaveType
} from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type User = { id: string; firstName: string; lastName?: string | null; email: string };
type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: CalendarEventType;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  source?: string;
  projectId?: string | null;
  taskId?: string | null;
};
type Leave = {
  id: string;
  developerId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason?: string | null;
  developer?: User;
  teamLeaderApprovalStatus?: string;
  teamLeaderApprovalNote?: string | null;
  projectManagerApprovalStatus?: string;
  projectManagerApprovalNote?: string | null;
  adminApprovalStatus?: string;
  adminApprovalNote?: string | null;
};
type Holiday = {
  id: string;
  name: string;
  holidayDate: string;
  region?: string | null;
  description?: string | null;
};
type Availability = {
  developer: { id: string; name: string; email: string };
  designation?: string | null;
  dailyHours: number;
  workingDays: number;
  holidayDays: number;
  leaveDays: number;
  availableHours: number;
};
type Workload = Availability & {
  assignedEstimatedHours: number;
  allocatedByMembershipHours: number;
  utilizationPercentage: number;
  status: "OVER_ALLOCATED" | "HEAVY" | "BALANCED" | "AVAILABLE";
};
type Tab = "events" | "leaves" | "holidays" | "availability" | "workload";
type CalendarDetail =
  | { kind: "event"; item: CalendarEvent }
  | { kind: "leave"; item: Leave }
  | { kind: "holiday"; item: Holiday };

const eventTypes: CalendarEventType[] = ["MEETING", "OTHER", "PROJECT", "MILESTONE", "SPRINT", "TASK", "LEAVE", "HOLIDAY"];
const leaveTypes: LeaveType[] = ["FULL_DAY", "HALF_DAY", "SICK", "CASUAL", "VACATION", "UNPAID"];
const leaveStatuses: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDateTimeInput(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function userName(user?: User) {
  return user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User";
}

const now = new Date();
const initialFilters = {
  fromDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
  toDate: dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)))
};
const emptyEvent: CalendarEventInput & { id?: string } = {
  title: "",
  description: "",
  type: "MEETING",
  startAt: `${initialFilters.fromDate}T10:00`,
  endAt: `${initialFilters.fromDate}T11:00`,
  allDay: false,
  projectId: "",
  taskId: ""
};
const emptyLeave: DeveloperLeaveInput & { id?: string } = {
  developerId: "",
  type: "FULL_DAY",
  status: "PENDING",
  startDate: initialFilters.fromDate,
  endDate: initialFilters.fromDate,
  reason: ""
};
const emptyHoliday: HolidayInput & { id?: string } = {
  name: "",
  holidayDate: initialFilters.fromDate,
  region: "",
  description: ""
};

export default function CalendarPage() {
  const { user: sessionUser } = useSessionUser();
  const isAdmin = Boolean(sessionUser?.roles.includes("admin"));
  const isApproverRole = Boolean(sessionUser?.roles.some((role) => ["admin", "projectManager", "teamLeader"].includes(role)));
  const hasPermission = (permission: string) => Boolean(isAdmin || sessionUser?.permissions.includes(permission));
  const canViewCalendar = hasPermission("calendar.view");
  const canViewLeave = hasPermission("leave.view");
  const canViewHoliday = hasPermission("holiday.view");
  const canViewAvailability = hasPermission("availability.view");
  const canManageCalendar = sessionUser?.permissions.includes("calendar.manage") || sessionUser?.roles.includes("admin");
  const canManageLeave = sessionUser?.permissions.includes("leave.manage") || sessionUser?.roles.includes("admin");
  const canApproveLeave = Boolean(canManageLeave && isApproverRole);
  const canManageHoliday = sessionUser?.permissions.includes("holiday.manage") || sessionUser?.roles.includes("admin");
  const [activeTab, setActiveTab] = useState<Tab>(canViewCalendar ? "events" : canViewLeave ? "leaves" : canViewHoliday ? "holidays" : canViewAvailability ? "availability" : "events");
  const [filters, setFilters] = useState(initialFilters);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [eventForm, setEventForm] = useState<typeof emptyEvent>(emptyEvent);
  const [leaveForm, setLeaveForm] = useState<typeof emptyLeave>(emptyLeave);
  const [holidayForm, setHolidayForm] = useState<typeof emptyHoliday>(emptyHoliday);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [detail, setDetail] = useState<CalendarDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => ({ fromDate: filters.fromDate, toDate: filters.toDate }), [filters]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [eventList, leaveList, holidayList, availabilityList, workloadList] = await Promise.all([
        canViewCalendar ? api.calendar.events.list<CalendarEvent[]>(query) : Promise.resolve([]),
        canViewLeave ? api.calendar.leaves.list<Leave[]>(query) : Promise.resolve([]),
        canViewHoliday ? api.calendar.holidays.list<Holiday[]>(query) : Promise.resolve([]),
        canViewAvailability ? api.calendar.availability<Availability[]>(query) : Promise.resolve([]),
        canViewAvailability ? api.calendar.workload<Workload[]>(query) : Promise.resolve([])
      ]);
      setEvents(eventList);
      setLeaves(leaveList);
      setHolidays(holidayList);
      setAvailability(availabilityList);
      setWorkload(workloadList);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load calendar");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setUsers(await api.users.list<User[]>());
    } catch {
      setUsers([]);
    }
  }

  useEffect(() => {
    void loadData();
    void loadUsers();
  }, [query, canViewCalendar, canViewLeave, canViewHoliday, canViewAvailability]);

  function openCreateEvent() {
    setEventForm({ ...emptyEvent, startAt: `${filters.fromDate}T10:00`, endAt: `${filters.fromDate}T11:00` });
    setEventModalOpen(true);
  }

  function openEditEvent(event: CalendarEvent) {
    setEventForm({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      type: event.type,
      startAt: toDateTimeInput(event.startAt),
      endAt: toDateTimeInput(event.endAt),
      allDay: event.allDay ?? false,
      projectId: event.projectId ?? "",
      taskId: event.taskId ?? ""
    });
    setEventModalOpen(true);
  }

  async function saveEvent(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    setNotice("");
    const payload = {
      ...eventForm,
      description: eventForm.description?.trim() ? eventForm.description.trim() : null,
      projectId: eventForm.projectId?.trim() ? eventForm.projectId.trim() : null,
      taskId: eventForm.taskId?.trim() ? eventForm.taskId.trim() : null
    };
    try {
      if (eventForm.id) {
        await api.calendar.events.update(eventForm.id, payload);
        setNotice("Calendar event updated.");
      } else {
        await api.calendar.events.create(payload);
        setNotice("Calendar event created.");
      }
      setEventModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save event");
    }
  }

  async function deleteEvent(event: CalendarEvent) {
    if (!event.source || event.source !== "custom") {
      setError("Only manually added calendar events can be deleted from this screen.");
      return;
    }
    if (!window.confirm(`Delete ${event.title}?`)) return;
    await api.calendar.events.remove(event.id);
    setNotice("Calendar event deleted.");
    await loadData();
  }

  function openCreateLeave() {
    setLeaveForm({ ...emptyLeave, startDate: filters.fromDate, endDate: filters.fromDate, developerId: canApproveLeave ? users[0]?.id ?? "" : "" });
    setLeaveModalOpen(true);
  }

  function openEditLeave(leave: Leave) {
    setLeaveForm({
      id: leave.id,
      developerId: leave.developerId,
      type: leave.type,
      status: leave.status,
      startDate: toDateInput(leave.startDate),
      endDate: toDateInput(leave.endDate),
      reason: leave.reason ?? ""
    });
    setLeaveModalOpen(true);
  }

  async function decideLeave(leave: Leave, status: "APPROVED" | "REJECTED") {
    const approvalNote = window.prompt(`${status === "APPROVED" ? "Approve" : "Reject"} leave note`, "");
    if (approvalNote === null) return;
    setError("");
    setNotice("");
    try {
      await api.calendar.leaves.update(leave.id, {
        startDate: toDateInput(leave.startDate),
        endDate: toDateInput(leave.endDate),
        status,
        approvalNote: approvalNote.trim() || null
      });
      setNotice(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to ${status.toLowerCase()} leave`);
    }
  }

  async function saveLeave(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    setNotice("");
    const payload = {
      ...leaveForm,
      developerId: canApproveLeave && leaveForm.developerId ? leaveForm.developerId : undefined,
      status: canApproveLeave && leaveForm.id ? leaveForm.status : undefined,
      approvalNote: undefined,
      reason: leaveForm.reason?.trim() ? leaveForm.reason.trim() : null
    };
    try {
      if (leaveForm.id) {
        await api.calendar.leaves.update(leaveForm.id, payload);
        setNotice("Leave updated.");
      } else {
        await api.calendar.leaves.create(payload);
        setNotice("Leave request created.");
      }
      setLeaveModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save leave");
    }
  }

  async function deleteLeave(leave: Leave) {
    if (!window.confirm("Delete this leave request?")) return;
    await api.calendar.leaves.remove(leave.id);
    setNotice("Leave request deleted.");
    await loadData();
  }

  function openCreateHoliday() {
    setHolidayForm({ ...emptyHoliday, holidayDate: filters.fromDate });
    setHolidayModalOpen(true);
  }

  function openEditHoliday(holiday: Holiday) {
    setHolidayForm({
      id: holiday.id,
      name: holiday.name,
      holidayDate: toDateInput(holiday.holidayDate),
      region: holiday.region ?? "",
      description: holiday.description ?? ""
    });
    setHolidayModalOpen(true);
  }

  async function saveHoliday(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    setNotice("");
    const payload = {
      ...holidayForm,
      region: holidayForm.region?.trim() ? holidayForm.region.trim() : null,
      description: holidayForm.description?.trim() ? holidayForm.description.trim() : null
    };
    try {
      if (holidayForm.id) {
        await api.calendar.holidays.update(holidayForm.id, payload);
        setNotice("Holiday updated.");
      } else {
        await api.calendar.holidays.create(payload);
        setNotice("Holiday created.");
      }
      setHolidayModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save holiday");
    }
  }

  async function deleteHoliday(holiday: Holiday) {
    if (!window.confirm(`Delete ${holiday.name}?`)) return;
    await api.calendar.holidays.remove(holiday.id);
    setNotice("Holiday deleted.");
    await loadData();
  }

  const tabs = [
    { key: "events" as const, label: "Calendar", icon: CalendarDays, visible: canViewCalendar },
    { key: "leaves" as const, label: "Leave", icon: Clock, visible: canViewLeave },
    { key: "holidays" as const, label: "Holidays", icon: CheckCircle2, visible: canViewHoliday },
    { key: "availability" as const, label: "Availability", icon: Users, visible: canViewAvailability },
    { key: "workload" as const, label: "Workload", icon: Users, visible: canViewAvailability }
  ].filter((tab) => tab.visible);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Planning"
        title="Calendar & Availability"
        description="View project timelines, manage leave and holidays, and check team capacity."
        actions={
          <>
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {activeTab === "events" && canManageCalendar ? <ActionButton label="Add Event" onClick={openCreateEvent} /> : null}
            {activeTab === "leaves" && canViewLeave ? <ActionButton label="Request Leave" onClick={openCreateLeave} /> : null}
            {activeTab === "holidays" && canManageHoliday ? <ActionButton label="Add Holiday" onClick={openCreateHoliday} /> : null}
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-[#667085]">From</span>
          <input type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-[#667085]">To</span>
          <input type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3" />
        </label>
        <div className="flex items-end">
          <button onClick={loadData} className="h-10 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">Apply</button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <MetricCard label="Events" value={events.length} tone="black" />
        <MetricCard label="Leaves" value={leaves.length} tone="blue" />
        <MetricCard label="Holidays" value={holidays.length} tone="yellow" />
        <MetricCard label="Available Hrs" value={Math.round(availability.reduce((total, item) => total + item.availableHours, 0))} tone="gray" />
        <MetricCard label="Heavy Loads" value={workload.filter((item) => item.status === "HEAVY" || item.status === "OVER_ALLOCATED").length} tone="blue" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-md border border-[#d7dde8] bg-white p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${activeTab === tab.key ? "bg-[#111827] text-white" : "text-[#536079] hover:bg-[#f4f7fb]"}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "events" ? <EventsTable events={events} loading={loading} canManage={Boolean(canManageCalendar)} onView={(event) => setDetail({ kind: "event", item: event })} onEdit={openEditEvent} onDelete={deleteEvent} /> : null}
      {activeTab === "leaves" ? <LeavesTable leaves={leaves} loading={loading} currentUserId={sessionUser?.id ?? ""} canApprove={canApproveLeave} onApprove={(leave) => decideLeave(leave, "APPROVED")} onReject={(leave) => decideLeave(leave, "REJECTED")} onView={(leave) => setDetail({ kind: "leave", item: leave })} onEdit={openEditLeave} onDelete={deleteLeave} /> : null}
      {activeTab === "holidays" ? <HolidaysTable holidays={holidays} loading={loading} canManage={Boolean(canManageHoliday)} onView={(holiday) => setDetail({ kind: "holiday", item: holiday })} onEdit={openEditHoliday} onDelete={deleteHoliday} /> : null}
      {activeTab === "availability" ? <AvailabilityTable rows={availability} loading={loading} /> : null}
      {activeTab === "workload" ? <WorkloadTable rows={workload} loading={loading} /> : null}

      {eventModalOpen ? (
        <Modal title={eventForm.id ? "Edit Event" : "Add Event"} onClose={() => setEventModalOpen(false)}>
          <form onSubmit={saveEvent} className="flex min-h-0 flex-1 flex-col">
            <div className="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2">
              <TextInput label="Title" value={eventForm.title} required onChange={(value) => setEventForm({ ...eventForm, title: value })} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Type</span>
                <select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value as CalendarEventType })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3">
                  {eventTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <TextInput label="Start" type="datetime-local" value={eventForm.startAt} required onChange={(value) => setEventForm({ ...eventForm, startAt: value })} />
              <TextInput label="End" type="datetime-local" value={eventForm.endAt} required onChange={(value) => setEventForm({ ...eventForm, endAt: value })} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Description</span>
                <textarea value={eventForm.description ?? ""} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} className="min-h-24 w-full rounded-md border border-[#d7dde8] p-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={eventForm.allDay ?? false} onChange={(event) => setEventForm({ ...eventForm, allDay: event.target.checked })} />
                <span className="text-sm font-medium">All day event</span>
              </label>
            </div>
            <ModalActions label="Save Event" onCancel={() => setEventModalOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {leaveModalOpen ? (
        <Modal title={leaveForm.id ? "Edit Leave" : "Add Leave"} onClose={() => setLeaveModalOpen(false)} size="small">
          <form onSubmit={saveLeave} className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-4 overflow-auto p-5 md:grid-cols-2">
              {canApproveLeave ? <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">User</span>
                <select value={leaveForm.developerId ?? ""} onChange={(event) => setLeaveForm({ ...leaveForm, developerId: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3">
                  <option value="">Current user</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{userName(user)} - {user.email}</option>)}
                </select>
              </label> : null}
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Type</span>
                <select value={leaveForm.type} onChange={(event) => setLeaveForm({ ...leaveForm, type: event.target.value as LeaveType })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3">
                  {leaveTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              {canApproveLeave && leaveForm.id ? <label className="block">
                <span className="mb-2 block text-sm font-medium">Status</span>
                <select value={leaveForm.status} onChange={(event) => setLeaveForm({ ...leaveForm, status: event.target.value as LeaveStatus })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3">
                  {leaveStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label> : null}
              <TextInput label="Start date" type="date" value={leaveForm.startDate} required onChange={(value) => setLeaveForm({ ...leaveForm, startDate: value })} />
              <TextInput label="End date" type="date" value={leaveForm.endDate} required onChange={(value) => setLeaveForm({ ...leaveForm, endDate: value })} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Reason</span>
                <textarea value={leaveForm.reason ?? ""} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} className="min-h-24 w-full rounded-md border border-[#d7dde8] p-3 outline-none focus:border-[#2563eb]" />
              </label>
            </div>
            <ModalActions label="Save Leave" onCancel={() => setLeaveModalOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {holidayModalOpen ? (
        <Modal title={holidayForm.id ? "Edit Holiday" : "Add Holiday"} onClose={() => setHolidayModalOpen(false)} size="small">
          <form onSubmit={saveHoliday} className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-4 overflow-auto p-5">
              <TextInput label="Holiday name" value={holidayForm.name} required onChange={(value) => setHolidayForm({ ...holidayForm, name: value })} />
              <TextInput label="Date" type="date" value={holidayForm.holidayDate} required onChange={(value) => setHolidayForm({ ...holidayForm, holidayDate: value })} />
              <TextInput label="Region" value={holidayForm.region ?? ""} onChange={(value) => setHolidayForm({ ...holidayForm, region: value })} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Description</span>
                <textarea value={holidayForm.description ?? ""} onChange={(event) => setHolidayForm({ ...holidayForm, description: event.target.value })} className="min-h-24 w-full rounded-md border border-[#d7dde8] p-3 outline-none focus:border-[#2563eb]" />
              </label>
            </div>
            <ModalActions label="Save Holiday" onCancel={() => setHolidayModalOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {detail ? (
        <Modal title={detail.kind === "event" ? detail.item.title : detail.kind === "leave" ? "Leave Details" : detail.item.name} onClose={() => setDetail(null)} size="small">
          <div className="space-y-4 p-5">
            {detail.kind === "event" ? (
              <>
                <DetailRow label="Type" value={detail.item.type} />
                <DetailRow label="Start" value={displayDateTime(detail.item.startAt)} />
                <DetailRow label="End" value={displayDateTime(detail.item.endAt)} />
                <DetailRow label="Source" value={detail.item.source ?? "custom"} />
                <DetailRow label="All Day" value={detail.item.allDay ? "Yes" : "No"} />
                <DetailText label="Description" value={detail.item.description} />
              </>
            ) : null}
            {detail.kind === "leave" ? (
              <>
                <DetailRow label="User" value={userName(detail.item.developer)} />
                <DetailRow label="Type" value={detail.item.type} />
                <DetailRow label="Status" value={detail.item.status} />
                <DetailRow label="Dates" value={`${displayDate(detail.item.startDate)} - ${displayDate(detail.item.endDate)}`} />
                <DetailRow label="TL Approval" value={`${detail.item.teamLeaderApprovalStatus ?? "PENDING"}${detail.item.teamLeaderApprovalNote ? ` - ${detail.item.teamLeaderApprovalNote}` : ""}`} />
                <DetailRow label="PM Approval" value={`${detail.item.projectManagerApprovalStatus ?? "PENDING"}${detail.item.projectManagerApprovalNote ? ` - ${detail.item.projectManagerApprovalNote}` : ""}`} />
                <DetailRow label="Admin Approval" value={`${detail.item.adminApprovalStatus ?? "NOT_REQUIRED"}${detail.item.adminApprovalNote ? ` - ${detail.item.adminApprovalNote}` : ""}`} />
                <DetailText label="Reason" value={detail.item.reason} />
              </>
            ) : null}
            {detail.kind === "holiday" ? (
              <>
                <DetailRow label="Date" value={displayDate(detail.item.holidayDate)} />
                <DetailRow label="Region" value={detail.item.region ?? "-"} />
                <DetailText label="Description" value={detail.item.description} />
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f4c430] px-3 text-sm font-semibold text-[#111827]">
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function Modal({ title, onClose, children, size = "large" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "small" | "large" }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
      <section className={`mx-auto flex max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl ${size === "small" ? "max-w-2xl" : "max-w-5xl"}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
          <div className="text-lg font-semibold text-[#111827]">{title}</div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ModalActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="flex shrink-0 justify-end gap-2 border-t border-[#d7dde8] bg-[#f8fafc] p-4">
      <button type="button" onClick={onCancel} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
      <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
        <Save className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-[#edf1f7] p-3 sm:grid-cols-[140px_1fr]">
      <div className="text-xs font-semibold uppercase text-[#667085]">{label}</div>
      <div className="text-sm font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

function DetailText({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-[#edf1f7] p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-[#667085]">{label}</div>
      <div className="whitespace-pre-wrap text-sm text-[#475467]">{value || "No details added."}</div>
    </div>
  );
}

function DataShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
        <div className="font-semibold text-[#111827]">{title}</div>
        <div className="text-sm text-[#667085]">{subtitle}</div>
      </div>
      <div className="overflow-auto">{children}</div>
    </div>
  );
}

function RowActions({ onEdit, onDelete, disabled = false }: { onEdit: () => void; onDelete: () => void; disabled?: boolean }) {
  if (disabled) return null;

  return (
    <div className="flex justify-end gap-2">
      <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Edit">
        <Edit3 className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318]" aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EventsTable({ events, loading, canManage, onView, onEdit, onDelete }: { events: CalendarEvent[]; loading: boolean; canManage: boolean; onView: (event: CalendarEvent) => void; onEdit: (event: CalendarEvent) => void; onDelete: (event: CalendarEvent) => void }) {
  return (
    <DataShell title={loading ? "Loading calendar" : `${events.length} calendar items`} subtitle="Projects, milestones, sprints, tasks, leave, holidays and meetings">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]"><tr><th className="border-b border-[#d7dde8] px-4 py-3">Title</th><th className="border-b border-[#d7dde8] px-4 py-3">Type</th><th className="border-b border-[#d7dde8] px-4 py-3">Start</th><th className="border-b border-[#d7dde8] px-4 py-3">End</th><th className="border-b border-[#d7dde8] px-4 py-3">Source</th><th className="border-b border-[#d7dde8] px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} onClick={() => onView(event)} className="cursor-pointer hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4"><div className="font-semibold text-[#111827]">{event.title}</div><div className="text-xs text-[#667085]">{event.description ?? ""}</div></td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={event.type} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{displayDateTime(event.startAt)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{displayDateTime(event.endAt)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{event.source ?? "custom"}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4" onClick={(clickEvent) => clickEvent.stopPropagation()}><RowActions disabled={!canManage || event.source !== "custom"} onEdit={() => onEdit(event)} onDelete={() => onDelete(event)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!events.length && !loading ? <EmptyState label="No calendar items found for this date range." /> : null}
    </DataShell>
  );
}

function LeavesTable({
  leaves,
  loading,
  currentUserId,
  canApprove,
  onApprove,
  onReject,
  onView,
  onEdit,
  onDelete
}: {
  leaves: Leave[];
  loading: boolean;
  currentUserId: string;
  canApprove: boolean;
  onApprove: (leave: Leave) => void;
  onReject: (leave: Leave) => void;
  onView: (leave: Leave) => void;
  onEdit: (leave: Leave) => void;
  onDelete: (leave: Leave) => void;
}) {
  return (
    <DataShell title={loading ? "Loading leave" : `${leaves.length} leave requests`} subtitle="Approved and pending leave by user">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]"><tr><th className="border-b border-[#d7dde8] px-4 py-3">User</th><th className="border-b border-[#d7dde8] px-4 py-3">Type</th><th className="border-b border-[#d7dde8] px-4 py-3">Dates</th><th className="border-b border-[#d7dde8] px-4 py-3">Status</th><th className="border-b border-[#d7dde8] px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody>{leaves.map((leave) => {
          const canEditOwnPending = leave.developerId === currentUserId && leave.status === "PENDING";
          const canDecide = canApprove && leave.status === "PENDING";
          return (
            <tr key={leave.id} onClick={() => onView(leave)} className="cursor-pointer hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4"><div className="font-semibold text-[#111827]">{userName(leave.developer)}</div><div className="text-xs text-[#667085]">{leave.reason ?? ""}</div></td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{leave.type}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{displayDate(leave.startDate)} - {displayDate(leave.endDate)}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={leave.status} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  {canDecide ? <button type="button" onClick={() => onApprove(leave)} className="h-9 rounded-md bg-[#137333] px-3 text-xs font-semibold text-white">Approve</button> : null}
                  {canDecide ? <button type="button" onClick={() => onReject(leave)} className="h-9 rounded-md bg-[#b42318] px-3 text-xs font-semibold text-white">Reject</button> : null}
                  {canEditOwnPending ? <RowActions onEdit={() => onEdit(leave)} onDelete={() => onDelete(leave)} /> : null}
                </div>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
      {!leaves.length && !loading ? <EmptyState label="No leave requests found for this date range." /> : null}
    </DataShell>
  );
}

function HolidaysTable({ holidays, loading, canManage, onView, onEdit, onDelete }: { holidays: Holiday[]; loading: boolean; canManage: boolean; onView: (holiday: Holiday) => void; onEdit: (holiday: Holiday) => void; onDelete: (holiday: Holiday) => void }) {
  return (
    <DataShell title={loading ? "Loading holidays" : `${holidays.length} holidays`} subtitle="Company and regional holidays">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]"><tr><th className="border-b border-[#d7dde8] px-4 py-3">Holiday</th><th className="border-b border-[#d7dde8] px-4 py-3">Date</th><th className="border-b border-[#d7dde8] px-4 py-3">Region</th><th className="border-b border-[#d7dde8] px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody>{holidays.map((holiday) => <tr key={holiday.id} onClick={() => onView(holiday)} className="cursor-pointer hover:bg-[#fbfcff]"><td className="border-b border-[#edf1f7] px-4 py-4"><div className="font-semibold text-[#111827]">{holiday.name}</div><div className="text-xs text-[#667085]">{holiday.description ?? ""}</div></td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{displayDate(holiday.holidayDate)}</td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{holiday.region ?? "-"}</td><td className="border-b border-[#edf1f7] px-4 py-4" onClick={(clickEvent) => clickEvent.stopPropagation()}><RowActions disabled={!canManage} onEdit={() => onEdit(holiday)} onDelete={() => onDelete(holiday)} /></td></tr>)}</tbody>
      </table>
      {!holidays.length && !loading ? <EmptyState label="No holidays found for this date range." /> : null}
    </DataShell>
  );
}

function AvailabilityTable({ rows, loading }: { rows: Availability[]; loading: boolean }) {
  return (
    <DataShell title={loading ? "Loading availability" : `${rows.length} people`} subtitle="Working days minus holidays and approved leave">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]"><tr><th className="border-b border-[#d7dde8] px-4 py-3">User</th><th className="border-b border-[#d7dde8] px-4 py-3">Designation</th><th className="border-b border-[#d7dde8] px-4 py-3">Working Days</th><th className="border-b border-[#d7dde8] px-4 py-3">Leave</th><th className="border-b border-[#d7dde8] px-4 py-3">Available Hours</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.developer.id} className="hover:bg-[#fbfcff]"><td className="border-b border-[#edf1f7] px-4 py-4"><div className="font-semibold text-[#111827]">{row.developer.name}</div><div className="text-xs text-[#667085]">{row.developer.email}</div></td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{row.designation ?? "-"}</td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{row.workingDays}</td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{row.leaveDays}</td><td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{row.availableHours}</td></tr>)}</tbody>
      </table>
      {!rows.length && !loading ? <EmptyState label="No availability rows found." /> : null}
    </DataShell>
  );
}

function WorkloadTable({ rows, loading }: { rows: Workload[]; loading: boolean }) {
  return (
    <DataShell title={loading ? "Loading workload" : `${rows.length} workload rows`} subtitle="Estimated task load and project allocation">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]"><tr><th className="border-b border-[#d7dde8] px-4 py-3">User</th><th className="border-b border-[#d7dde8] px-4 py-3">Available</th><th className="border-b border-[#d7dde8] px-4 py-3">Task Estimate</th><th className="border-b border-[#d7dde8] px-4 py-3">Allocated</th><th className="border-b border-[#d7dde8] px-4 py-3">Utilization</th><th className="border-b border-[#d7dde8] px-4 py-3">Status</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.developer.id} className="hover:bg-[#fbfcff]"><td className="border-b border-[#edf1f7] px-4 py-4"><div className="font-semibold text-[#111827]">{row.developer.name}</div><div className="text-xs text-[#667085]">{row.developer.email}</div></td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{row.availableHours}</td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{row.assignedEstimatedHours}</td><td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{Math.round(row.allocatedByMembershipHours)}</td><td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{row.utilizationPercentage}%</td><td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={row.status} /></td></tr>)}</tbody>
      </table>
      {!rows.length && !loading ? <EmptyState label="No workload rows found." /> : null}
    </DataShell>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="p-8 text-sm text-[#667085]">{label}</div>;
}
