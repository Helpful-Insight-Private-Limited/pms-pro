"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, Edit3, MessageSquare, Paperclip, Play, Plus, RefreshCcw, Save, Send, Square, Tag, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  api,
  type Id,
  type ChatThread,
  type MilestoneInput,
  type MilestoneStatus,
  type SprintInput,
  type SprintStatus,
  type TaskInput,
  type TaskPriority,
  type TaskStatus
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/lib/session";

type User = {
  id: Id;
  firstName: string;
  lastName?: string | null;
  email: string;
  avatarUrl?: string | null;
};

type Project = {
  id: Id;
  title: string;
  code: string;
  status: string;
  progressPercentage?: string | number;
  projectManagerId: Id;
  teamLeaderId?: Id | null;
  projectManager?: User;
  teamLeader?: User | null;
  members?: Array<{ userId: Id; roleInProject: string; user?: User }>;
};

type Milestone = {
  id: Id;
  title: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  responsibleUserId?: Id | null;
  responsibleUser?: User | null;
  status: MilestoneStatus;
  progressPercentage: string | number;
  notes?: string | null;
};

type Sprint = {
  id: Id;
  milestoneId: Id;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: SprintStatus;
  capacity: string | number;
  velocity: string | number;
  storyPoints: number;
  progressPercentage: string | number;
};

type Task = {
  id: Id;
  milestoneId?: Id | null;
  sprintId?: Id | null;
  title: string;
  description?: string | null;
  assignedDeveloperId?: Id | null;
  reviewerId?: Id | null;
  assignedDeveloper?: User | null;
  reviewer?: User | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedHours: string | number;
  actualHours: string | number;
  storyPoints: number;
  progressPercentage: string | number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  labels?: unknown;
  blockers?: Array<{ id: Id; description: string; isResolved: boolean }>;
  _count?: {
    attachments?: number;
    comments?: number;
    timeLogs?: number;
  };
};

type TaskComment = {
  id: Id;
  comment: string;
  createdAt: string;
  user?: User;
};

type TaskTimer = {
  id: Id;
  startedAt: string;
  description?: string | null;
};

type TaskAttachment = {
  id: Id;
  originalName: string;
  publicUrl?: string | null;
  storagePath: string;
  fileSize: string | number;
  mimeType: string;
  createdAt: string;
};

type ShareTarget =
  | { kind: "milestone"; item: Milestone }
  | { kind: "sprint"; item: Sprint }
  | { kind: "task"; item: Task };

type Tab = "milestones" | "sprints" | "tasks";

const taskColumns: Array<{ status: TaskStatus; label: string; accent: string }> = [
  { status: "TODO", label: "To do", accent: "bg-[#e4e7ec]" },
  { status: "IN_PROGRESS", label: "In progress", accent: "bg-[#2563eb]" },
  { status: "REVIEW", label: "Review", accent: "bg-[#7c3aed]" },
  { status: "TESTING", label: "Testing", accent: "bg-[#0ea5e9]" },
  { status: "BLOCKED", label: "Blocked", accent: "bg-[#dc2626]" },
  { status: "HOLD", label: "On hold", accent: "bg-[#f59e0b]" },
  { status: "COMPLETED", label: "Done", accent: "bg-[#16a34a]" }
];

const emptyMilestone = {
  title: "",
  description: "",
  startDate: "",
  dueDate: "",
  responsibleUserId: "",
  status: "PENDING" as MilestoneStatus,
  progressPercentage: "0",
  notes: ""
};

const emptySprint = {
  milestoneId: "",
  name: "",
  goal: "",
  startDate: "",
  endDate: "",
  status: "PLANNING" as SprintStatus,
  capacity: "0",
  velocity: "0",
  storyPoints: "0",
  progressPercentage: "0"
};

const emptyTask = {
  milestoneId: "",
  sprintId: "",
  title: "",
  description: "",
  assignedDeveloperId: "",
  reviewerId: "",
  priority: "MEDIUM" as TaskPriority,
  status: "TODO" as TaskStatus,
  estimatedHours: "0",
  actualHours: "0",
  storyPoints: "0",
  progressPercentage: "0",
  startDate: "",
  dueDate: "",
  labels: ""
};

function userName(user?: User | null) {
  if (!user) return "-";
  return `${user.firstName} ${user.lastName ?? ""}`.trim() || user.email;
}

function userInitials(user?: User | null) {
  if (!user) return "NA";
  const nameParts = [user.firstName, user.lastName].filter(Boolean);
  if (nameParts.length) return nameParts.map((part) => part![0]).join("").slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function nullableDate(value: string) {
  return value ? value : null;
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseLabels(labels: unknown) {
  if (Array.isArray(labels)) return labels.map(String).filter(Boolean);
  if (typeof labels === "string") return labels.split(",").map((label) => label.trim()).filter(Boolean);
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function isTaskOverdue(task: Task) {
  if (!task.dueDate || ["COMPLETED", "HOLD"].includes(task.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

function priorityClasses(priority: TaskPriority) {
  const classes: Record<TaskPriority, string> = {
    LOW: "border-l-[#16a34a] bg-[#f0fdf4] text-[#166534]",
    MEDIUM: "border-l-[#f4c430] bg-[#fffbeb] text-[#92400e]",
    HIGH: "border-l-[#f97316] bg-[#fff7ed] text-[#9a3412]",
    CRITICAL: "border-l-[#dc2626] bg-[#fef2f2] text-[#991b1b]"
  };
  return classes[priority];
}

function projectUsers(project?: Project | null) {
  const users = new Map<Id, User>();
  for (const user of [project?.projectManager, project?.teamLeader, ...(project?.members ?? []).map((member) => member.user)]) {
    if (user?.id) users.set(user.id, user);
  }
  return [...users.values()].sort((left, right) => userName(left).localeCompare(userName(right)));
}

export default function WorkPage() {
  const { user: sessionUser } = useSessionUser();
  const isAdmin = Boolean(sessionUser?.roles.includes("admin"));
  const can = (permission: string) => isAdmin || Boolean(sessionUser?.permissions.includes(permission));
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const users = useMemo(() => projectUsers(selectedProject), [selectedProject]);
  const [tab, setTab] = useState<Tab>("milestones");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestoneForm, setMilestoneForm] = useState<typeof emptyMilestone & { id?: Id }>(emptyMilestone);
  const [sprintForm, setSprintForm] = useState<typeof emptySprint & { id?: Id }>(emptySprint);
  const [taskForm, setTaskForm] = useState<typeof emptyTask & { id?: Id }>(emptyTask);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [activeTimers, setActiveTimers] = useState<Record<Id, TaskTimer | null>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<Id | null>(null);
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [shareThreadId, setShareThreadId] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [comment, setComment] = useState("");
  const [blocker, setBlocker] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({ originalName: "", publicUrl: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const projectList = await api.projects.list<Project[]>();
      setProjects(projectList);
      setProjectId((current) => current || projectList[0]?.id || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function loadWork(nextProjectId = projectId) {
    if (!nextProjectId) {
      setMilestones([]);
      setSprints([]);
      setTasks([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [milestoneList, taskList] = await Promise.all([
        can("milestone.view") ? api.projects.milestones.list<Milestone[]>(nextProjectId).catch(() => []) : Promise.resolve([]),
        can("task.view") ? api.projects.tasks.list<Task[]>(nextProjectId).catch(() => []) : Promise.resolve([])
      ]);
      const sprintLists = await Promise.all(
        milestoneList.map((milestone) => can("sprint.view") ? api.projects.sprints.list<Sprint[]>(nextProjectId, milestone.id).catch(() => []) : Promise.resolve([]))
      );
      setMilestones(milestoneList);
      setSprints(sprintLists.flat());
      setTasks(taskList);
      if (can("taskTimeLog.view")) {
        const timerPairs = await Promise.all(taskList.map(async (task) => [
          task.id,
          await api.projects.tasks.timer.active<TaskTimer | null>(nextProjectId, task.id).catch(() => null)
        ] as const));
        setActiveTimers(Object.fromEntries(timerPairs));
      } else {
        setActiveTimers({});
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load work items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    void loadWork(projectId);
  }, [projectId]);

  function openMilestone(milestone?: Milestone) {
    setMilestoneForm(milestone ? {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description ?? "",
      startDate: dateInput(milestone.startDate),
      dueDate: dateInput(milestone.dueDate),
      responsibleUserId: milestone.responsibleUserId ?? "",
      status: milestone.status,
      progressPercentage: String(milestone.progressPercentage ?? 0),
      notes: milestone.notes ?? ""
    } : { ...emptyMilestone, responsibleUserId: users[0]?.id ?? "" });
    setMilestoneOpen(true);
  }

  function openSprint(sprint?: Sprint) {
    setSprintForm(sprint ? {
      id: sprint.id,
      milestoneId: sprint.milestoneId,
      name: sprint.name,
      goal: sprint.goal ?? "",
      startDate: dateInput(sprint.startDate),
      endDate: dateInput(sprint.endDate),
      status: sprint.status,
      capacity: String(sprint.capacity ?? 0),
      velocity: String(sprint.velocity ?? 0),
      storyPoints: String(sprint.storyPoints ?? 0),
      progressPercentage: String(sprint.progressPercentage ?? 0)
    } : { ...emptySprint, milestoneId: milestones[0]?.id ?? "" });
    setSprintOpen(true);
  }

  function openTask(task?: Task) {
    setTaskForm(task ? {
      id: task.id,
      milestoneId: task.milestoneId ?? "",
      sprintId: task.sprintId ?? "",
      title: task.title,
      description: task.description ?? "",
      assignedDeveloperId: task.assignedDeveloperId ?? "",
      reviewerId: task.reviewerId ?? "",
      priority: task.priority,
      status: task.status,
      estimatedHours: String(task.estimatedHours ?? 0),
      actualHours: String(task.actualHours ?? 0),
      storyPoints: String(task.storyPoints ?? 0),
      progressPercentage: String(task.progressPercentage ?? 0),
      startDate: dateInput(task.startDate),
      dueDate: dateInput(task.dueDate),
      labels: Array.isArray(task.labels) ? task.labels.join(", ") : ""
    } : { ...emptyTask, milestoneId: milestones[0]?.id ?? "", assignedDeveloperId: users[0]?.id ?? "" });
    setTaskOpen(true);
  }

  async function saveMilestone(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;

    const payload: MilestoneInput = {
      title: milestoneForm.title,
      description: nullableText(milestoneForm.description),
      startDate: nullableDate(milestoneForm.startDate),
      dueDate: nullableDate(milestoneForm.dueDate),
      responsibleUserId: milestoneForm.responsibleUserId || null,
      status: milestoneForm.status,
      progressPercentage: Number(milestoneForm.progressPercentage),
      notes: nullableText(milestoneForm.notes)
    };

    try {
      if (milestoneForm.id) {
        await api.projects.milestones.update(projectId, milestoneForm.id, payload);
        setNotice("Milestone updated.");
      } else {
        await api.projects.milestones.create(projectId, payload);
        setNotice("Milestone created.");
      }
      setMilestoneOpen(false);
      await loadWork();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save milestone");
    }
  }

  async function saveSprint(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !sprintForm.milestoneId) return;

    const payload: SprintInput = {
      name: sprintForm.name,
      goal: nullableText(sprintForm.goal),
      startDate: nullableDate(sprintForm.startDate),
      endDate: nullableDate(sprintForm.endDate),
      status: sprintForm.status,
      capacity: Number(sprintForm.capacity),
      velocity: Number(sprintForm.velocity),
      storyPoints: Number(sprintForm.storyPoints),
      progressPercentage: Number(sprintForm.progressPercentage)
    };

    try {
      if (sprintForm.id) {
        await api.projects.sprints.update(projectId, sprintForm.milestoneId, sprintForm.id, payload);
        setNotice("Sprint updated.");
      } else {
        await api.projects.sprints.create(projectId, sprintForm.milestoneId, payload);
        setNotice("Sprint created.");
      }
      setSprintOpen(false);
      await loadWork();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save sprint");
    }
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;

    const payload: TaskInput = {
      milestoneId: taskForm.milestoneId || null,
      sprintId: taskForm.sprintId || null,
      title: taskForm.title,
      description: nullableText(taskForm.description),
      assignedDeveloperId: taskForm.assignedDeveloperId || null,
      reviewerId: taskForm.reviewerId || null,
      priority: taskForm.priority,
      status: taskForm.status,
      estimatedHours: Number(taskForm.estimatedHours),
      actualHours: Number(taskForm.actualHours),
      storyPoints: Number(taskForm.storyPoints),
      progressPercentage: Number(taskForm.progressPercentage),
      startDate: nullableDate(taskForm.startDate),
      dueDate: nullableDate(taskForm.dueDate),
      labels: taskForm.labels.split(",").map((label) => label.trim()).filter(Boolean),
      dependencyTaskIds: []
    };

    try {
      if (taskForm.id) {
        await api.projects.tasks.update(projectId, taskForm.id, payload);
        setNotice("Task updated.");
      } else {
        await api.projects.tasks.create(projectId, payload);
        setNotice("Task created.");
      }
      setTaskOpen(false);
      await loadWork();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save task");
    }
  }

  async function removeItem(kind: "milestone" | "sprint" | "task", item: Milestone | Sprint | Task) {
    if (!projectId || !window.confirm(`Delete ${"title" in item ? item.title : item.name}?`)) return;
    try {
      if (kind === "milestone") await api.projects.milestones.remove(projectId, item.id);
      if (kind === "sprint" && "milestoneId" in item) await api.projects.sprints.remove(projectId, item.milestoneId!, item.id);
      if (kind === "task") await api.projects.tasks.remove(projectId, item.id);
      setNotice(`${kind[0].toUpperCase()}${kind.slice(1)} deleted.`);
      await loadWork();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to delete ${kind}`);
    }
  }

  async function openTaskDetail(task: Task) {
    setTaskDetail(task);
    setComment("");
    setBlocker("");
    setAttachmentForm({ originalName: "", publicUrl: "" });
    if (!projectId) return;
    const [comments, attachments] = await Promise.all([
      api.projects.tasks.comments.list<TaskComment[]>(projectId, task.id).catch(() => []),
      api.projects.tasks.attachments.list<TaskAttachment[]>(projectId, task.id).catch(() => [])
    ]);
    setTaskComments(comments);
    setTaskAttachments(attachments);
  }

  async function addComment() {
    if (!projectId || !taskDetail || !comment.trim()) return;
    await api.projects.tasks.comments.create(projectId, taskDetail.id, { comment });
    setComment("");
    await openTaskDetail(taskDetail);
    await loadWork();
  }

  async function addBlocker() {
    if (!projectId || !taskDetail || !blocker.trim()) return;
    await api.projects.tasks.blockers.create(projectId, taskDetail.id, { description: blocker });
    setBlocker("");
    setNotice("Blocker added.");
    await loadWork();
    const refreshed = await api.projects.tasks.get<Task>(projectId, taskDetail.id);
    await openTaskDetail(refreshed);
  }

  async function addAttachment() {
    if (!projectId || !taskDetail || !attachmentForm.originalName.trim() || !attachmentForm.publicUrl.trim()) return;
    const fileName = attachmentForm.originalName.trim();
    const publicUrl = attachmentForm.publicUrl.trim();
    await api.projects.tasks.attachments.create(projectId, taskDetail.id, {
      fileName,
      originalName: fileName,
      mimeType: "text/uri-list",
      fileSize: 0,
      storagePath: publicUrl,
      publicUrl
    });
    setAttachmentForm({ originalName: "", publicUrl: "" });
    setNotice("Attachment added.");
    await openTaskDetail(taskDetail);
    await loadWork();
  }

  async function moveTask(taskId: Id, status: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!projectId || !task || task.status === status || !can("task.update")) {
      setDraggedTaskId(null);
      setDropStatus(null);
      return;
    }

    const previousTasks = tasks;
    setTasks((current) => current.map((item) => item.id === taskId ? {
      ...item,
      status,
      progressPercentage: status === "COMPLETED" ? 100 : item.progressPercentage,
      completedDate: status === "COMPLETED" ? new Date().toISOString() : item.completedDate
    } : item));
    try {
      await api.projects.tasks.update(projectId, taskId, { status });
      setNotice(`${task.title} moved to ${status.replaceAll("_", " ").toLowerCase()}.`);
      await loadWork();
    } catch (requestError) {
      setTasks(previousTasks);
      setError(requestError instanceof Error ? requestError.message : "Unable to move task");
    } finally {
      setDraggedTaskId(null);
      setDropStatus(null);
    }
  }

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    if (!can("task.update")) return;
    event.preventDefault();
    setDropStatus(status);
  }

  function describeThread(thread: ChatThread) {
    if (thread.type === "GROUP") return thread.name || "Group chat";
    const other = thread.participants.find((participant) => participant.userId !== sessionUser?.id)?.user ?? thread.participants[0]?.user;
    return other ? userName(other) : "Direct chat";
  }

  function composeShareMessage(target: ShareTarget) {
    const projectLine = selectedProject ? `${selectedProject.code} - ${selectedProject.title}` : "Selected project";
    if (target.kind === "milestone") {
      return [
        `Shared milestone: ${target.item.title}`,
        `Project: ${projectLine}`,
        `Status: ${target.item.status}`,
        `Progress: ${Number(target.item.progressPercentage ?? 0)}%`,
        `Dates: ${dateInput(target.item.startDate) || "-"} to ${dateInput(target.item.dueDate) || "-"}`,
        target.item.description ? `Description: ${target.item.description}` : ""
      ].filter(Boolean).join("\n");
    }
    if (target.kind === "sprint") {
      const milestone = milestones.find((item) => item.id === target.item.milestoneId);
      return [
        `Shared sprint: ${target.item.name}`,
        `Project: ${projectLine}`,
        `Milestone: ${milestone?.title ?? "-"}`,
        `Status: ${target.item.status}`,
        `Progress: ${Number(target.item.progressPercentage ?? 0)}%`,
        `Dates: ${dateInput(target.item.startDate) || "-"} to ${dateInput(target.item.endDate) || "-"}`,
        target.item.goal ? `Goal: ${target.item.goal}` : ""
      ].filter(Boolean).join("\n");
    }
    const sprint = sprints.find((item) => item.id === target.item.sprintId);
    return [
      `Shared task: ${target.item.title}`,
      `Project: ${projectLine}`,
      `Sprint: ${sprint?.name ?? "-"}`,
      `Assigned: ${userName(target.item.assignedDeveloper)}`,
      `Status: ${target.item.status}`,
      `Priority: ${target.item.priority}`,
      `Progress: ${Number(target.item.progressPercentage ?? 0)}%`,
      `Due: ${dateInput(target.item.dueDate) || "-"}`,
      target.item.description ? `Description: ${target.item.description}` : ""
    ].filter(Boolean).join("\n");
  }

  async function openShare(target: ShareTarget) {
    setShareTarget(target);
    setShareMessage(composeShareMessage(target));
    const threads = await api.chat.threads<ChatThread[]>().catch(() => []);
    setChatThreads(threads);
    setShareThreadId(threads[0]?.id ?? "");
  }

  async function sendShare() {
    if (!shareThreadId || !shareMessage.trim()) return;
    await api.chat.sendMessage(shareThreadId, { body: shareMessage.trim() });
    setShareTarget(null);
    setNotice("Shared to chat.");
  }

  async function startTimer(task: Task) {
    if (!projectId) return;
    try {
      const timer = await api.projects.tasks.timer.start<TaskTimer>(projectId, task.id, { description: `Working on ${task.title}` });
      setActiveTimers((current) => ({ ...current, [task.id]: timer }));
      setNotice("Task timer started.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start timer");
    }
  }

  async function stopTimer(task: Task) {
    if (!projectId) return;
    try {
      await api.projects.tasks.timer.stop(projectId, task.id, { description: `Timer work for ${task.title}` });
      setActiveTimers((current) => ({ ...current, [task.id]: null }));
      setNotice("Task timer stopped and time log saved.");
      await loadWork();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to stop timer");
    }
  }

  const overdueTasks = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && !["COMPLETED", "HOLD"].includes(task.status)).length;
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED").length;
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Execution workspace"
        title="Milestones, Sprints & Tasks"
        description="Plan delivery work, assign owners, update progress, and track blockers from one permission-aware workspace."
        actions={
          <>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 min-w-72 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.title}</option>)}
            </select>
            <button onClick={() => loadWork()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Milestones" value={milestones.length} tone="black" />
        <MetricCard label="Sprints" value={sprints.length} tone="blue" />
        <MetricCard label="Project Progress" value={`${Number(selectedProject?.progressPercentage ?? 0)}%`} tone="green" />
        <MetricCard label="Blocked / Overdue" value={`${blockedTasks}/${overdueTasks}`} tone={blockedTasks || overdueTasks ? "red" : "gray"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-[#d7dde8] bg-white p-1">
          {(["milestones", "sprints", "tasks"] as Tab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={cn("h-9 rounded-md px-3 text-sm font-semibold capitalize", tab === item ? "bg-[#111827] text-white" : "text-[#667085] hover:text-[#111827]")}>
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "milestones" && can("milestone.create") ? <ActionButton label="Milestone" onClick={() => openMilestone()} /> : null}
          {tab === "sprints" && can("sprint.create") ? <ActionButton label="Sprint" onClick={() => openSprint()} disabled={!milestones.length} /> : null}
          {tab === "tasks" && can("task.create") ? <ActionButton label="Task" onClick={() => openTask()} /> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
        {tab === "milestones" ? (
          <DataTable empty={loading ? "Loading milestones..." : "No milestones found."} columns={["Milestone", "Owner", "Dates", "Progress", "Status", "Actions"]}>
            {milestones.map((milestone) => (
              <tr key={milestone.id} className="hover:bg-[#fbfcff]">
                <Cell title={milestone.title} detail={milestone.description || milestone.notes || undefined} />
                <td className="border-b border-[#edf1f7] px-4 py-4 text-sm text-[#667085]">{userName(milestone.responsibleUser)}</td>
                <td className="border-b border-[#edf1f7] px-4 py-4 text-sm text-[#667085]">{dateInput(milestone.startDate) || "-"} to {dateInput(milestone.dueDate) || "-"}</td>
                <td className="border-b border-[#edf1f7] px-4 py-4"><Progress value={Number(milestone.progressPercentage ?? 0)} /></td>
                <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={milestone.status} /></td>
                <td className="border-b border-[#edf1f7] px-4 py-4">
                  <Actions
                    canEdit={can("milestone.update")}
                    canDelete={can("milestone.delete")}
                    canShare={can("chat.message")}
                    onShare={() => openShare({ kind: "milestone", item: milestone })}
                    onEdit={() => openMilestone(milestone)}
                    onDelete={() => removeItem("milestone", milestone)}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : null}

        {tab === "sprints" ? (
          <DataTable empty={loading ? "Loading sprints..." : "No sprints found."} columns={["Sprint", "Milestone", "Dates", "Capacity", "Progress", "Status", "Actions"]}>
            {sprints.map((sprint) => (
              <tr key={sprint.id} className="hover:bg-[#fbfcff]">
                <Cell title={sprint.name} detail={sprint.goal || undefined} />
                <td className="border-b border-[#edf1f7] px-4 py-4 text-sm text-[#667085]">{milestones.find((milestone) => milestone.id === sprint.milestoneId)?.title ?? "-"}</td>
                <td className="border-b border-[#edf1f7] px-4 py-4 text-sm text-[#667085]">{dateInput(sprint.startDate) || "-"} to {dateInput(sprint.endDate) || "-"}</td>
                <td className="border-b border-[#edf1f7] px-4 py-4 text-sm text-[#667085]">{Number(sprint.velocity ?? 0)}/{Number(sprint.capacity ?? 0)} hrs</td>
                <td className="border-b border-[#edf1f7] px-4 py-4"><Progress value={Number(sprint.progressPercentage ?? 0)} /></td>
                <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={sprint.status} /></td>
                <td className="border-b border-[#edf1f7] px-4 py-4">
                  <Actions
                    canEdit={can("sprint.update")}
                    canDelete={can("sprint.delete")}
                    canShare={can("chat.message")}
                    onShare={() => openShare({ kind: "sprint", item: sprint })}
                    onEdit={() => openSprint(sprint)}
                    onDelete={() => removeItem("sprint", sprint)}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : null}

        {tab === "tasks" ? (
          <KanbanBoard
            tasks={tasks}
            sprints={sprints}
            activeTimers={activeTimers}
            loading={loading}
            canUpdate={can("task.update")}
            canDelete={can("task.delete")}
            canShare={can("chat.message")}
            canTimeTrack={can("taskTimeLog.create")}
            draggedTaskId={draggedTaskId}
            dropStatus={dropStatus}
            onDragStart={setDraggedTaskId}
            onColumnDragOver={handleColumnDragOver}
            onColumnDrop={moveTask}
            onColumnLeave={() => setDropStatus(null)}
            onOpenDetail={openTaskDetail}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
            onShare={(task) => openShare({ kind: "task", item: task })}
            onEdit={openTask}
            onDelete={(task) => removeItem("task", task)}
          />
        ) : null}
      </div>

      {milestoneOpen ? (
        <Modal title={milestoneForm.id ? "Edit Milestone" : "Add Milestone"} onClose={() => setMilestoneOpen(false)}>
          <form onSubmit={saveMilestone} className="space-y-4">
            <Field label="Title"><input required value={milestoneForm.title} onChange={(event) => setMilestoneForm({ ...milestoneForm, title: event.target.value })} className="input" /></Field>
            <Field label="Description"><textarea value={milestoneForm.description} onChange={(event) => setMilestoneForm({ ...milestoneForm, description: event.target.value })} className="input min-h-24 py-2" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start Date"><input type="date" value={milestoneForm.startDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, startDate: event.target.value })} className="input" /></Field>
              <Field label="Due Date"><input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm({ ...milestoneForm, dueDate: event.target.value })} className="input" /></Field>
              <Field label="Responsible User"><UserSelect users={users} value={milestoneForm.responsibleUserId} onChange={(value) => setMilestoneForm({ ...milestoneForm, responsibleUserId: value })} /></Field>
              <Field label="Status"><Select value={milestoneForm.status} options={["PENDING", "ACTIVE", "HOLD", "COMPLETED", "DELAYED"]} onChange={(value) => setMilestoneForm({ ...milestoneForm, status: value as MilestoneStatus })} /></Field>
            </div>
            <Field label="Progress"><input type="number" min="0" max="100" value={milestoneForm.progressPercentage} onChange={(event) => setMilestoneForm({ ...milestoneForm, progressPercentage: event.target.value })} className="input" /></Field>
            <Field label="Notes"><textarea value={milestoneForm.notes} onChange={(event) => setMilestoneForm({ ...milestoneForm, notes: event.target.value })} className="input min-h-24 py-2" /></Field>
            <ModalActions onCancel={() => setMilestoneOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {sprintOpen ? (
        <Modal title={sprintForm.id ? "Edit Sprint" : "Add Sprint"} onClose={() => setSprintOpen(false)}>
          <form onSubmit={saveSprint} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Milestone"><Select value={sprintForm.milestoneId} options={milestones.map((milestone) => ({ value: milestone.id, label: milestone.title }))} onChange={(value) => setSprintForm({ ...sprintForm, milestoneId: value })} /></Field>
              <Field label="Name"><input required value={sprintForm.name} onChange={(event) => setSprintForm({ ...sprintForm, name: event.target.value })} className="input" /></Field>
            </div>
            <Field label="Goal"><textarea value={sprintForm.goal} onChange={(event) => setSprintForm({ ...sprintForm, goal: event.target.value })} className="input min-h-24 py-2" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start Date"><input type="date" value={sprintForm.startDate} onChange={(event) => setSprintForm({ ...sprintForm, startDate: event.target.value })} className="input" /></Field>
              <Field label="End Date"><input type="date" value={sprintForm.endDate} onChange={(event) => setSprintForm({ ...sprintForm, endDate: event.target.value })} className="input" /></Field>
              <Field label="Status"><Select value={sprintForm.status} options={["PLANNING", "ACTIVE", "HOLD", "COMPLETED"]} onChange={(value) => setSprintForm({ ...sprintForm, status: value as SprintStatus })} /></Field>
              <Field label="Progress"><input type="number" min="0" max="100" value={sprintForm.progressPercentage} onChange={(event) => setSprintForm({ ...sprintForm, progressPercentage: event.target.value })} className="input" /></Field>
              <Field label="Capacity Hours"><input type="number" min="0" value={sprintForm.capacity} onChange={(event) => setSprintForm({ ...sprintForm, capacity: event.target.value })} className="input" /></Field>
              <Field label="Velocity Hours"><input type="number" min="0" value={sprintForm.velocity} onChange={(event) => setSprintForm({ ...sprintForm, velocity: event.target.value })} className="input" /></Field>
              <Field label="Story Points"><input type="number" min="0" value={sprintForm.storyPoints} onChange={(event) => setSprintForm({ ...sprintForm, storyPoints: event.target.value })} className="input" /></Field>
            </div>
            <ModalActions onCancel={() => setSprintOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {taskOpen ? (
        <Modal title={taskForm.id ? "Edit Task" : "Add Task"} onClose={() => setTaskOpen(false)}>
          <form onSubmit={saveTask} className="space-y-4">
            <Field label="Title"><input required value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className="input" /></Field>
            <Field label="Description"><textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} className="input min-h-28 py-2" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Milestone"><Select value={taskForm.milestoneId} options={[{ value: "", label: "No milestone" }, ...milestones.map((milestone) => ({ value: milestone.id, label: milestone.title }))]} onChange={(value) => setTaskForm({ ...taskForm, milestoneId: value, sprintId: "" })} /></Field>
              <Field label="Sprint"><Select value={taskForm.sprintId} options={[{ value: "", label: "No sprint" }, ...sprints.filter((sprint) => !taskForm.milestoneId || sprint.milestoneId === taskForm.milestoneId).map((sprint) => ({ value: sprint.id, label: sprint.name }))]} onChange={(value) => setTaskForm({ ...taskForm, sprintId: value })} /></Field>
              <Field label="Assigned Developer"><UserSelect users={users} value={taskForm.assignedDeveloperId} onChange={(value) => setTaskForm({ ...taskForm, assignedDeveloperId: value })} /></Field>
              <Field label="Reviewer"><UserSelect users={users} value={taskForm.reviewerId} onChange={(value) => setTaskForm({ ...taskForm, reviewerId: value })} allowEmpty /></Field>
              <Field label="Priority"><Select value={taskForm.priority} options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} onChange={(value) => setTaskForm({ ...taskForm, priority: value as TaskPriority })} /></Field>
              <Field label="Status"><Select value={taskForm.status} options={["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"]} onChange={(value) => setTaskForm({ ...taskForm, status: value as TaskStatus })} /></Field>
              <Field label="Estimated Hours"><input type="number" min="0" value={taskForm.estimatedHours} onChange={(event) => setTaskForm({ ...taskForm, estimatedHours: event.target.value })} className="input" /></Field>
              <Field label="Actual Hours"><input type="number" min="0" value={taskForm.actualHours} onChange={(event) => setTaskForm({ ...taskForm, actualHours: event.target.value })} className="input" /></Field>
              <Field label="Story Points"><input type="number" min="0" value={taskForm.storyPoints} onChange={(event) => setTaskForm({ ...taskForm, storyPoints: event.target.value })} className="input" /></Field>
              <Field label="Progress"><input type="number" min="0" max="100" value={taskForm.progressPercentage} onChange={(event) => setTaskForm({ ...taskForm, progressPercentage: event.target.value })} className="input" /></Field>
              <Field label="Start Date"><input type="date" value={taskForm.startDate} onChange={(event) => setTaskForm({ ...taskForm, startDate: event.target.value })} className="input" /></Field>
              <Field label="Due Date"><input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} className="input" /></Field>
            </div>
            <Field label="Labels"><input value={taskForm.labels} onChange={(event) => setTaskForm({ ...taskForm, labels: event.target.value })} placeholder="frontend, api, urgent" className="input" /></Field>
            <ModalActions onCancel={() => setTaskOpen(false)} />
          </form>
        </Modal>
      ) : null}

      {taskDetail ? (
        <Modal title={taskDetail.title} onClose={() => setTaskDetail(null)}>
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <StatusBadge value={taskDetail.status} />
              <div className="text-sm text-[#667085]">Assigned: <span className="font-semibold text-[#111827]">{userName(taskDetail.assignedDeveloper)}</span></div>
              <div className="text-sm text-[#667085]">Due: <span className="font-semibold text-[#111827]">{dateInput(taskDetail.dueDate) || "-"}</span></div>
            </div>
            <div className="rounded-md border border-[#d7dde8] p-4">
              <div className="mb-2 font-semibold text-[#111827]">Description</div>
              <div className="whitespace-pre-wrap text-sm text-[#475467]">{taskDetail.description || "No description added."}</div>
            </div>
            <div className="rounded-md border border-[#d7dde8] p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-[#111827]"><Paperclip className="h-4 w-4" /> Attachments</div>
              <div className="mb-3 space-y-2">
                {taskAttachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.publicUrl || attachment.storagePath}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md bg-[#f8fafc] px-3 py-2 text-sm font-medium text-[#2563eb]"
                  >
                    <span className="truncate">{attachment.originalName}</span>
                    <span className="text-xs text-[#667085]">{formatDate(attachment.createdAt)}</span>
                  </a>
                ))}
                {!taskAttachments.length ? <div className="text-sm text-[#667085]">No attachments yet.</div> : null}
              </div>
              {can("task.attachment.manage") ? (
                <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                  <input value={attachmentForm.originalName} onChange={(event) => setAttachmentForm({ ...attachmentForm, originalName: event.target.value })} className="input" placeholder="Document name" />
                  <input value={attachmentForm.publicUrl} onChange={(event) => setAttachmentForm({ ...attachmentForm, publicUrl: event.target.value })} className="input" placeholder="https://..." />
                  <button onClick={addAttachment} className="h-10 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">Add</button>
                </div>
              ) : null}
            </div>
            {can("task.blocker.manage") ? (
              <div className="rounded-md border border-[#f3b4b4] p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-[#b42318]"><AlertTriangle className="h-4 w-4" /> Add Blocker</div>
                <div className="flex gap-2">
                  <input value={blocker} onChange={(event) => setBlocker(event.target.value)} className="input" placeholder="What is blocking this task?" />
                  <button onClick={addBlocker} className="h-10 rounded-md bg-[#b42318] px-4 text-sm font-semibold text-white">Add</button>
                </div>
              </div>
            ) : null}
            <div className="rounded-md border border-[#d7dde8] p-4">
              <div className="mb-3 font-semibold text-[#111827]">Comments</div>
              <div className="mb-3 max-h-52 space-y-2 overflow-auto">
                {taskComments.map((item) => (
                  <div key={item.id} className="rounded-md bg-[#f8fafc] p-3 text-sm">
                    <div className="font-semibold text-[#111827]">{userName(item.user)}</div>
                    <div className="mt-1 text-[#475467]">{item.comment}</div>
                  </div>
                ))}
                {!taskComments.length ? <div className="text-sm text-[#667085]">No comments yet.</div> : null}
              </div>
              {can("task.comment") ? (
                <div className="flex gap-2">
                  <input value={comment} onChange={(event) => setComment(event.target.value)} className="input" placeholder="Write a comment" />
                  <button onClick={addComment} className="h-10 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white">Send</button>
                </div>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {shareTarget ? (
        <Modal title={`Share ${shareTarget.kind}`} onClose={() => setShareTarget(null)}>
          <div className="space-y-4">
            <Field label="Chat">
              <select value={shareThreadId} onChange={(event) => setShareThreadId(event.target.value)} className="input">
                {!chatThreads.length ? <option value="">No chat threads available</option> : null}
                {chatThreads.map((thread) => <option key={thread.id} value={thread.id}>{describeThread(thread)}</option>)}
              </select>
            </Field>
            <Field label="Message">
              <textarea value={shareMessage} onChange={(event) => setShareMessage(event.target.value)} className="input min-h-56 py-3" />
            </Field>
            <div className="flex justify-end gap-2 border-t border-[#edf1f7] pt-4">
              <button type="button" onClick={() => setShareTarget(null)} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
              <button type="button" disabled={!shareThreadId || !shareMessage.trim()} onClick={sendShare} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:opacity-50">
                <Send className="h-4 w-4" />
                Share to Chat
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function ActionButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f4c430] px-3 text-sm font-semibold text-[#111827] disabled:cursor-not-allowed disabled:bg-[#d7dde8]">
      <Plus className="h-4 w-4" />
      Add {label}
    </button>
  );
}

function KanbanBoard({
  tasks,
  sprints,
  activeTimers,
  loading,
  canUpdate,
  canDelete,
  canShare,
  canTimeTrack,
  draggedTaskId,
  dropStatus,
  onDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnLeave,
  onOpenDetail,
  onStartTimer,
  onStopTimer,
  onShare,
  onEdit,
  onDelete
}: {
  tasks: Task[];
  sprints: Sprint[];
  activeTimers: Record<Id, TaskTimer | null>;
  loading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canShare: boolean;
  canTimeTrack: boolean;
  draggedTaskId: Id | null;
  dropStatus: TaskStatus | null;
  onDragStart: (taskId: Id) => void;
  onColumnDragOver: (event: DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  onColumnDrop: (taskId: Id, status: TaskStatus) => void;
  onColumnLeave: () => void;
  onOpenDetail: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: (task: Task) => void;
  onShare: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  if (!tasks.length) {
    return <div className="p-8 text-sm text-[#667085]">{loading ? "Loading tasks..." : "No tasks found."}</div>;
  }

  return (
    <div className="overflow-x-auto bg-[#f8fafc] p-4">
      <div className="flex min-h-[560px] gap-4">
        {taskColumns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div
              key={column.status}
              onDragOver={(event) => onColumnDragOver(event, column.status)}
              onDragLeave={onColumnLeave}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedTaskId) onColumnDrop(draggedTaskId, column.status);
              }}
              className={cn(
                "flex w-[310px] shrink-0 flex-col rounded-md border border-[#d7dde8] bg-white",
                dropStatus === column.status ? "border-[#2563eb] ring-2 ring-[#bfdbfe]" : ""
              )}
            >
              <div className="flex h-12 items-center justify-between border-b border-[#edf1f7] px-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", column.accent)} />
                  <span className="text-sm font-semibold text-[#111827]">{column.label}</span>
                </div>
                <span className="rounded-full bg-[#edf1f7] px-2 py-0.5 text-xs font-semibold text-[#475467]">{columnTasks.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {columnTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    sprintName={sprints.find((sprint) => sprint.id === task.sprintId)?.name}
                    activeTimer={activeTimers[task.id]}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    canShare={canShare}
                    canTimeTrack={canTimeTrack}
                    onDragStart={onDragStart}
                    onOpenDetail={onOpenDetail}
                    onStartTimer={onStartTimer}
                    onStopTimer={onStopTimer}
                    onShare={onShare}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
                {!columnTasks.length ? (
                  <div className="rounded-md border border-dashed border-[#d7dde8] p-4 text-center text-xs font-medium text-[#98a2b3]">
                    Drop tasks here
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanTaskCard({
  task,
  sprintName,
  activeTimer,
  canUpdate,
  canDelete,
  canShare,
  canTimeTrack,
  onDragStart,
  onOpenDetail,
  onStartTimer,
  onStopTimer,
  onShare,
  onEdit,
  onDelete
}: {
  task: Task;
  sprintName?: string;
  activeTimer?: TaskTimer | null;
  canUpdate: boolean;
  canDelete: boolean;
  canShare: boolean;
  canTimeTrack: boolean;
  onDragStart: (taskId: Id) => void;
  onOpenDetail: (task: Task) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: (task: Task) => void;
  onShare: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const labels = parseLabels(task.labels);
  const overdue = isTaskOverdue(task);
  const unresolvedBlockers = task.blockers?.filter((blockerItem) => !blockerItem.isResolved).length ?? 0;

  return (
    <article
      draggable={canUpdate}
      onDragStart={() => onDragStart(task.id)}
      className={cn(
        "rounded-md border border-l-4 border-[#d7dde8] bg-white p-3 shadow-sm transition hover:shadow-md",
        canUpdate ? "cursor-grab active:cursor-grabbing" : "",
        priorityClasses(task.priority)
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <button onClick={() => onOpenDetail(task)} className="min-w-0 text-left">
          <div className="line-clamp-2 text-sm font-semibold text-[#111827]">{task.title}</div>
          {task.description ? <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">{task.description}</div> : null}
        </button>
        <AssigneeAvatar user={task.assignedDeveloper} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">{task.priority}</span>
        {unresolvedBlockers ? <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[11px] font-bold text-[#991b1b]">{unresolvedBlockers} blocker</span> : null}
        {labels.slice(0, 3).map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2 py-0.5 text-[11px] font-semibold text-[#1d4ed8]">
            <Tag className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>

      <Progress value={Number(task.progressPercentage ?? 0)} />

      <div className="mt-3 grid gap-2 text-xs text-[#667085]">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{sprintName || "No sprint"}</span>
          <span className={cn("inline-flex items-center gap-1 font-semibold", overdue ? "text-[#b42318]" : "text-[#475467]")}>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(task.dueDate)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {Number(task.actualHours ?? 0)}/{Number(task.estimatedHours ?? 0)} hrs
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{task._count?.comments ?? 0}</span>
            <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{task._count?.attachments ?? 0}</span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#edf1f7] pt-3">
        <div className="flex gap-1.5">
          <button onClick={() => onOpenDetail(task)} className="grid h-8 w-8 place-items-center rounded-md border border-[#d7dde8] bg-white text-[#111827]" aria-label="Open task">
            <MessageSquare className="h-4 w-4" />
          </button>
          {canTimeTrack ? (
            <button
              onClick={() => activeTimer ? onStopTimer(task) : onStartTimer(task)}
              className={cn("grid h-8 w-8 place-items-center rounded-md border bg-white", activeTimer ? "border-[#f3b4b4] text-[#b42318]" : "border-[#a7dfc0] text-[#137333]")}
              aria-label={activeTimer ? "Stop timer" : "Start timer"}
            >
              {activeTimer ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        <Actions
          canEdit={canUpdate}
          canDelete={canDelete}
          canShare={canShare}
          onShare={() => onShare(task)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
        />
      </div>
    </article>
  );
}

function AssigneeAvatar({ user }: { user?: User | null }) {
  return (
    <div title={userName(user)} className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white bg-[#111827] text-xs font-bold text-white shadow-sm">
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={userName(user)} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center">{userInitials(user)}</div>}
    </div>
  );
}

function DataTable({ columns, children, empty }: { columns: string[]; children: React.ReactNode; empty: string }) {
  const hasChildren = Boolean(children && (!Array.isArray(children) || children.length));
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead className="bg-[#f8fafc] text-sm text-[#667085]">
          <tr>{columns.map((column) => <th key={column} className="border-b border-[#d7dde8] px-4 py-3 font-semibold">{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!hasChildren ? <div className="p-8 text-sm text-[#667085]">{empty}</div> : null}
    </div>
  );
}

function Cell({ title, detail }: { title: string; detail?: string }) {
  return (
    <td className="border-b border-[#edf1f7] px-4 py-4">
      <div className="font-semibold text-[#111827]">{title}</div>
      {detail ? <div className="mt-1 line-clamp-2 max-w-md text-xs text-[#667085]">{detail}</div> : null}
    </td>
  );
}

function Progress({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="w-36">
      <div className="mb-1 text-xs font-semibold text-[#475467]">{safeValue}%</div>
      <div className="h-2 rounded-full bg-[#edf1f7]"><div className="h-2 rounded-full bg-[#2563eb]" style={{ width: `${safeValue}%` }} /></div>
    </div>
  );
}

function Actions({
  canEdit,
  canDelete,
  canShare = false,
  onEdit,
  onDelete,
  onShare
}: {
  canEdit: boolean;
  canDelete: boolean;
  canShare?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      {canShare && onShare ? <button onClick={onShare} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Share to chat"><Send className="h-4 w-4" /></button> : null}
      {canEdit ? <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Edit"><Edit3 className="h-4 w-4" /></button> : null}
      {canDelete ? <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318]" aria-label="Delete"><Trash2 className="h-4 w-4" /></button> : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
      <section className="mx-auto flex max-h-[calc(100vh-48px)] max-w-4xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
          <div className="text-lg font-semibold text-[#111827]">{title}</div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </section>
    </div>
  );
}

function ModalActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#edf1f7] pt-4">
      <button type="button" onClick={onCancel} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
      <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
        <Save className="h-4 w-4" />
        Save
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#344054]">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, options, onChange }: { value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
      {options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option.replaceAll("_", " ")}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function UserSelect({ users, value, onChange, allowEmpty = true }: { users: User[]; value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
      {allowEmpty ? <option value="">Unassigned</option> : null}
      {users.map((user) => <option key={user.id} value={user.id}>{userName(user)} ({user.email})</option>)}
    </select>
  );
}
