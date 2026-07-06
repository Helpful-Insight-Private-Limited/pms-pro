"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Edit3, FileText, Italic, LinkIcon, List, ListOrdered, Plus, RefreshCcw, Save, Trash2, Users, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type CreateProjectInput, type ProjectMemberInput, type ProjectMemberRole, type ProjectStatus, type UpdateProjectInput } from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type User = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
};

type Project = {
  id: string;
  title: string;
  code: string;
  clientId: string;
  description?: string | null;
  technologyStack?: unknown;
  gitRepositoryUrl?: string | null;
  stagingUrl?: string | null;
  productionUrl?: string | null;
  apiDocumentationUrl?: string | null;
  notes?: string | null;
  status: ProjectStatus;
  budget: string | number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  projectManagerId: string;
  teamLeaderId?: string | null;
  client?: { id: string; name: string };
  projectManager?: User;
  teamLeader?: User | null;
  members?: Array<{ userId: string; roleInProject: ProjectMemberRole; allocationPercentage: string | number; user?: User }>;
};

type Client = {
  id: string;
  name: string;
  code?: string | null;
};

type CurrencyMaster = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
};

type TechnologyStackMaster = {
  id: string;
  name: string;
  category?: string | null;
};

type ProjectForm = {
  id?: string;
  title: string;
  code: string;
  clientId: string;
  description: string;
  technologyStack: string[];
  gitRepositoryUrl: string;
  stagingUrl: string;
  productionUrl: string;
  apiDocumentationUrl: string;
  notes: string;
  budget: string;
  currency: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  projectManagerId: string;
  teamLeaderId: string;
  teamMemberIds: string[];
};

const emptyForm: ProjectForm = {
  title: "",
  code: "",
  clientId: "",
  description: "",
  technologyStack: [],
  gitRepositoryUrl: "",
  stagingUrl: "",
  productionUrl: "",
  apiDocumentationUrl: "",
  notes: "",
  budget: "0",
  currency: "USD",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  projectManagerId: "",
  teamLeaderId: "",
  teamMemberIds: []
};

function usersFromProjects(projects: Project[]) {
  const users = new Map<string, User>();
  for (const project of projects) {
    for (const user of [project.projectManager, project.teamLeader, ...(project.members ?? []).map((member) => member.user)]) {
      if (user?.id) users.set(user.id, user);
    }
  }
  return [...users.values()].sort((left, right) => `${left.firstName} ${left.lastName ?? ""}`.localeCompare(`${right.firstName} ${right.lastName ?? ""}`));
}

export default function ProjectsPage() {
  const { user: sessionUser } = useSessionUser();
  const isAdmin = Boolean(sessionUser?.roles?.includes("admin"));
  const canManageMasters = isAdmin || Boolean(sessionUser?.permissions?.includes("master.manage"));
  const canCreateProject = isAdmin || Boolean(sessionUser?.permissions?.includes("project.create"));
  const canUpdateProject = isAdmin || Boolean(sessionUser?.permissions?.includes("project.update"));
  const canDeleteProject = isAdmin || Boolean(sessionUser?.permissions?.includes("project.delete"));
  const canAssignTeam = isAdmin || Boolean(sessionUser?.permissions?.includes("project.assignTeam"));
  const canViewBudget = isAdmin || Boolean(sessionUser?.permissions?.includes("project.viewBudget") || sessionUser?.permissions?.includes("project.viewCosting"));
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyMaster[]>([]);
  const [technologyStacks, setTechnologyStacks] = useState<TechnologyStackMaster[]>([]);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "" });
  const [newTechnologyStack, setNewTechnologyStack] = useState({ name: "", category: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [briefProject, setBriefProject] = useState<Project | null>(null);
  const [memberProject, setMemberProject] = useState<Project | null>(null);
  const [memberRows, setMemberRows] = useState<ProjectMemberInput[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(form.id);

  function formatProjectStack(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  function nullableUrl(value: string) {
    return value.trim() ? value.trim() : null;
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [projectList, userList, clientList, currencyList, technologyStackList] = await Promise.all([
        api.projects.list<Project[]>(),
        api.users.list<User[]>().catch(() => []),
        api.clients.list<Client[]>().catch(() => []),
        api.masters.currencies.list<CurrencyMaster[]>().catch(() => []),
        api.masters.technologyStacks.list<TechnologyStackMaster[]>().catch(() => [])
      ]);
      setProjects(projectList);
      setUsers(userList.length ? userList : usersFromProjects(projectList));
      setClients(clientList);
      setCurrencies(currencyList);
      setTechnologyStacks(technologyStackList);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate() {
    setForm({
      ...emptyForm,
      projectManagerId: users[0]?.id ?? "",
      clientId: clients[0]?.id ?? projects[0]?.clientId ?? "",
      currency: currencies[0]?.code ?? "USD"
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function openEdit(project: Project) {
    setForm({
      id: project.id,
      title: project.title,
      code: project.code,
      clientId: project.clientId,
      description: project.description ?? "",
      technologyStack: formatProjectStack(project.technologyStack),
      gitRepositoryUrl: project.gitRepositoryUrl ?? "",
      stagingUrl: project.stagingUrl ?? "",
      productionUrl: project.productionUrl ?? "",
      apiDocumentationUrl: project.apiDocumentationUrl ?? "",
      notes: project.notes ?? "",
      budget: String(project.budget ?? 0),
      currency: project.currency,
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
      status: project.status,
      projectManagerId: project.projectManagerId,
      teamLeaderId: project.teamLeaderId ?? "",
      teamMemberIds: project.members?.map((member) => member.userId).filter((id) => id !== project.projectManagerId && id !== project.teamLeaderId) ?? []
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function toggleTeamMember(userId: string) {
    setForm((current) => ({
      ...current,
      teamMemberIds: current.teamMemberIds.includes(userId)
        ? current.teamMemberIds.filter((id) => id !== userId)
        : [...current.teamMemberIds, userId]
    }));
  }

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const basePayload = {
        title: form.title,
        code: form.code,
        clientId: form.clientId,
        description: form.description || null,
        technologyStack: form.technologyStack,
        gitRepositoryUrl: nullableUrl(form.gitRepositoryUrl),
        stagingUrl: nullableUrl(form.stagingUrl),
        productionUrl: nullableUrl(form.productionUrl),
        apiDocumentationUrl: nullableUrl(form.apiDocumentationUrl),
        notes: form.notes || null,
        budget: Number(form.budget),
        currency: form.currency,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        projectManagerId: form.projectManagerId,
        teamLeaderId: form.teamLeaderId || null
      };

      if (isEditing && form.id) {
        await api.projects.update(form.id, basePayload as UpdateProjectInput);
        setNotice("Project updated successfully.");
      } else {
        await api.projects.create({ ...basePayload, teamMemberIds: form.teamMemberIds } as CreateProjectInput);
        setNotice("Project created successfully.");
      }

      setFormOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save project");
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete project ${project.title}?`)) return;
    setError("");
    setNotice("");

    try {
      await api.projects.remove(project.id);
      setNotice("Project deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete project");
    }
  }

  function toggleTechnologyStack(name: string) {
    setForm((current) => ({
      ...current,
      technologyStack: current.technologyStack.includes(name)
        ? current.technologyStack.filter((item) => item !== name)
        : [...current.technologyStack, name]
    }));
  }

  async function createCurrency() {
    setError("");
    setNotice("");
    try {
      const currency = await api.masters.currencies.create<CurrencyMaster>({
        code: newCurrency.code,
        name: newCurrency.name,
        symbol: newCurrency.symbol.trim() ? newCurrency.symbol.trim() : null
      });
      setCurrencies((current) => [...current.filter((item) => item.id !== currency.id), currency].sort((a, b) => a.code.localeCompare(b.code)));
      setForm((current) => ({ ...current, currency: currency.code }));
      setNewCurrency({ code: "", name: "", symbol: "" });
      setNotice("Currency added successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add currency");
    }
  }

  async function createTechnologyStack() {
    setError("");
    setNotice("");
    try {
      const stack = await api.masters.technologyStacks.create<TechnologyStackMaster>({
        name: newTechnologyStack.name,
        category: newTechnologyStack.category.trim() ? newTechnologyStack.category.trim() : null
      });
      setTechnologyStacks((current) => [...current.filter((item) => item.id !== stack.id), stack].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({
        ...current,
        technologyStack: current.technologyStack.includes(stack.name) ? current.technologyStack : [...current.technologyStack, stack.name]
      }));
      setNewTechnologyStack({ name: "", category: "" });
      setNotice("Technology stack added successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add technology stack");
    }
  }

  function openMembers(project: Project) {
    setMemberProject(project);
    setMemberRows((project.members ?? []).map((member) => ({
      userId: member.userId,
      roleInProject: member.roleInProject,
      allocationPercentage: Number(member.allocationPercentage ?? 100)
    })));
  }

  function updateMember(index: number, field: keyof ProjectMemberInput, value: string | number) {
    setMemberRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function addMemberRow() {
    setMemberRows((rows) => [...rows, { userId: users[0]?.id ?? "", roleInProject: "DEVELOPER", allocationPercentage: 100 }]);
  }

  async function saveMembers() {
    if (!memberProject) return;
    setError("");
    setNotice("");

    try {
      await api.projects.assignMembers(memberProject.id, memberRows);
      setMemberProject(null);
      setNotice("Project team updated successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to assign team");
    }
  }

  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length;
  const delayedProjects = projects.filter((project) => project.status === "DELAYED").length;
  const budget = projects.reduce((sum, project) => sum + Number(project.budget ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Delivery portfolio"
        title="Projects"
        description="Create, edit, delete, and assign teams to client delivery projects."
        actions={
          <>
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {canCreateProject ? (
            <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f4c430] px-3 text-sm font-semibold text-[#111827]">
              <Plus className="h-4 w-4" />
              New Project
            </button>
            ) : null}
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className={`mb-6 grid gap-4 ${canViewBudget ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <MetricCard label="Total Projects" value={projects.length} tone="black" />
        <MetricCard label="Active" value={activeProjects} tone="blue" />
        <MetricCard label="Delayed" value={delayedProjects} tone={delayedProjects ? "red" : "gray"} />
        {canViewBudget ? <MetricCard label="Budget" value={budget.toFixed(0)} tone="yellow" /> : null}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={saveProject} className="mx-auto flex max-h-[calc(100vh-48px)] max-w-6xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
              <div>
                <div className="text-lg font-semibold text-[#111827]">{isEditing ? "Edit Project" : "New Project"}</div>
                <div className="text-sm text-[#667085]">Add delivery context, documents, scope, and requirement details for the team.</div>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <div className="space-y-5">
                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="flex h-12 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                      Project Brief
                    </div>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Title</span>
                        <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Code</span>
                        <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Client</span>
                        <select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]">
                          <option value="">Select client</option>
                          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.code ? ` (${client.code})` : ""}</option>)}
                        </select>
                      </label>
                      <div className="block">
                        <span className="mb-2 block text-sm font-medium">Technology stack</span>
                        <div className="max-h-36 overflow-auto rounded-md border border-[#d7dde8] p-2">
                          <div className="flex flex-wrap gap-2">
                            {technologyStacks.map((stack) => (
                              <button
                                key={stack.id}
                                type="button"
                                onClick={() => toggleTechnologyStack(stack.name)}
                                className={`h-9 rounded-md border px-3 text-sm font-semibold ${form.technologyStack.includes(stack.name) ? "border-[#2563eb] bg-[#eaf1ff] text-[#174ea6]" : "border-[#d7dde8] bg-white text-[#667085]"}`}
                              >
                                {stack.name}
                              </button>
                            ))}
                            {!technologyStacks.length ? <span className="px-2 py-1 text-sm text-[#667085]">No stacks available.</span> : null}
                          </div>
                        </div>
                        {canManageMasters ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_44px]">
                            <input value={newTechnologyStack.name} onChange={(event) => setNewTechnologyStack({ ...newTechnologyStack, name: event.target.value })} placeholder="Add stack" className="h-10 rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                            <input value={newTechnologyStack.category} onChange={(event) => setNewTechnologyStack({ ...newTechnologyStack, category: event.target.value })} placeholder="Category" className="h-10 rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                            <button type="button" onClick={createTechnologyStack} disabled={!newTechnologyStack.name.trim()} className="grid h-10 w-10 place-items-center rounded-md bg-[#2563eb] text-white disabled:cursor-not-allowed disabled:bg-[#9fb7e8]" aria-label="Add technology stack">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="border-b border-[#d7dde8] px-4 py-3">
                      <div className="font-semibold text-[#111827]">Requirement Description</div>
                      <div className="text-sm text-[#667085]">Use this area for project goals, user flows, acceptance notes, and implementation guidance.</div>
                    </div>
                    <div className="p-4">
                      <RichTextEditor value={form.description} onChange={(description) => setForm({ ...form, description })} />
                    </div>
                  </section>

                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="border-b border-[#d7dde8] px-4 py-3">
                      <div className="font-semibold text-[#111827]">Scope</div>
                      <div className="text-sm text-[#667085]">Define inclusions, exclusions, assumptions, dependencies, and delivery boundaries.</div>
                    </div>
                    <div className="p-4">
                      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-40 w-full rounded-md border border-[#d7dde8] px-3 py-2 outline-none focus:border-[#2563eb]" />
                    </div>
                  </section>
                </div>

                <aside className="space-y-5">
                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="border-b border-[#d7dde8] px-4 py-3 font-semibold text-[#111827]">Planning</div>
                    <div className="space-y-4 p-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Status</span>
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none">
                          {["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "DELAYED"].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Budget</span>
                          <input type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Currency</span>
                          <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]">
                            {currencies.map((currency) => <option key={currency.id} value={currency.code}>{currency.code} - {currency.name}</option>)}
                            {!currencies.length ? <option value="USD">USD</option> : null}
                          </select>
                        </label>
                      </div>
                      {canManageMasters ? (
                        <div className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3">
                          <div className="mb-2 text-sm font-semibold text-[#111827]">Add currency</div>
                          <div className="grid gap-2 sm:grid-cols-[80px_1fr_80px_44px]">
                            <input value={newCurrency.code} onChange={(event) => setNewCurrency({ ...newCurrency, code: event.target.value.toUpperCase() })} placeholder="Code" className="h-10 rounded-md border border-[#d7dde8] bg-white px-3 outline-none focus:border-[#2563eb]" />
                            <input value={newCurrency.name} onChange={(event) => setNewCurrency({ ...newCurrency, name: event.target.value })} placeholder="Currency name" className="h-10 rounded-md border border-[#d7dde8] bg-white px-3 outline-none focus:border-[#2563eb]" />
                            <input value={newCurrency.symbol} onChange={(event) => setNewCurrency({ ...newCurrency, symbol: event.target.value })} placeholder="Symbol" className="h-10 rounded-md border border-[#d7dde8] bg-white px-3 outline-none focus:border-[#2563eb]" />
                            <button type="button" onClick={createCurrency} disabled={!newCurrency.code.trim() || !newCurrency.name.trim()} className="grid h-10 w-10 place-items-center rounded-md bg-[#2563eb] text-white disabled:cursor-not-allowed disabled:bg-[#9fb7e8]" aria-label="Add currency">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Start date</span>
                          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none" />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">End date</span>
                          <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none" />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="border-b border-[#d7dde8] px-4 py-3 font-semibold text-[#111827]">Ownership</div>
                    <div className="space-y-4 p-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Project manager</span>
                        <select required value={form.projectManagerId} onChange={(event) => setForm({ ...form, projectManagerId: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none">
                          <option value="">Select manager</option>
                          {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName ?? ""} ({user.email})</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Team leader</span>
                        <select value={form.teamLeaderId} onChange={(event) => setForm({ ...form, teamLeaderId: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none">
                          <option value="">No leader</option>
                          {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName ?? ""} ({user.email})</option>)}
                        </select>
                      </label>
                      {!isEditing ? (
                        <div>
                          <div className="mb-2 text-sm font-medium">Initial team members</div>
                          <div className="flex max-h-44 flex-wrap gap-2 overflow-auto rounded-md border border-[#d7dde8] p-2">
                            {users.map((user) => (
                              <button type="button" key={user.id} onClick={() => toggleTeamMember(user.id)} className={`h-9 rounded-md border px-3 text-sm font-semibold ${form.teamMemberIds.includes(user.id) ? "border-[#2563eb] bg-[#eaf1ff] text-[#174ea6]" : "border-[#d7dde8] bg-white text-[#667085]"}`}>
                                {user.firstName} {user.lastName ?? ""}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-md border border-[#d7dde8]">
                    <div className="flex items-center gap-2 border-b border-[#d7dde8] px-4 py-3 font-semibold text-[#111827]">
                      <LinkIcon className="h-4 w-4 text-[#2563eb]" />
                      Documents and Links
                    </div>
                    <div className="space-y-4 p-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Git repository</span>
                        <input type="url" value={form.gitRepositoryUrl} onChange={(event) => setForm({ ...form, gitRepositoryUrl: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Staging URL</span>
                        <input type="url" value={form.stagingUrl} onChange={(event) => setForm({ ...form, stagingUrl: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Production URL</span>
                        <input type="url" value={form.productionUrl} onChange={(event) => setForm({ ...form, productionUrl: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">API / requirement docs URL</span>
                        <input type="url" value={form.apiDocumentationUrl} onChange={(event) => setForm({ ...form, apiDocumentationUrl: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                      </label>
                    </div>
                  </section>
                </aside>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-[#d7dde8] bg-[#f8fafc] p-4">
              <button type="button" onClick={() => setFormOpen(false)} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
                <Save className="h-4 w-4" />
                Save Project
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {memberProject ? (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
          <section className="mx-auto flex max-h-[calc(100vh-48px)] max-w-4xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
            <div className="font-semibold text-[#111827]">Assign Team · {memberProject.title}</div>
            <button type="button" onClick={() => setMemberProject(null)} className="grid h-8 w-8 place-items-center rounded-md border border-[#d7dde8]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-5">
            {memberRows.map((row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_180px_140px_44px]">
                <select value={row.userId} onChange={(event) => updateMember(index, "userId", event.target.value)} className="h-10 rounded-md border border-[#d7dde8] px-3">
                  {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName ?? ""} ({user.email})</option>)}
                </select>
                <select value={row.roleInProject} onChange={(event) => updateMember(index, "roleInProject", event.target.value)} className="h-10 rounded-md border border-[#d7dde8] px-3">
                  {["PROJECT_MANAGER", "TEAM_LEADER", "DEVELOPER", "REVIEWER", "QA", "DESIGNER", "OBSERVER"].map((role) => <option key={role}>{role}</option>)}
                </select>
                <input type="number" min="0" max="100" value={row.allocationPercentage ?? 100} onChange={(event) => updateMember(index, "allocationPercentage", Number(event.target.value))} className="h-10 rounded-md border border-[#d7dde8] px-3" />
                <button onClick={() => setMemberRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid h-10 w-10 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 justify-between border-t border-[#d7dde8] bg-[#f8fafc] p-4">
            <button onClick={addMemberRow} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Add Member</button>
            <button onClick={saveMembers} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white">
              <Save className="h-4 w-4" />
              Save Team
            </button>
          </div>
          </section>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
        <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
          <div className="font-semibold text-[#111827]">{loading ? "Loading projects" : `${projects.length} projects`}</div>
          <div className="text-sm text-[#667085]">Client delivery pipeline</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#667085]">
              <tr>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Project</th>
                {canViewBudget ? <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Client</th> : null}
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Manager</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Leader</th>
                {canViewBudget ? <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Budget</th> : null}
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-[#fbfcff]">
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="font-semibold text-[#111827]">{project.title}</div>
                    <div className="mt-1 text-xs font-semibold uppercase text-[#2563eb]">{project.code}</div>
                  </td>
                  {canViewBudget ? <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{project.client?.name ?? project.clientId}</td> : null}
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="text-[#111827]">{project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName ?? ""}`.trim() : "-"}</div>
                    <div className="text-xs text-[#667085]">{project.projectManager?.email}</div>
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{project.teamLeader ? `${project.teamLeader.firstName} ${project.teamLeader.lastName ?? ""}`.trim() : "-"}</td>
                  {canViewBudget ? <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{project.currency} {Number(project.budget ?? 0).toFixed(0)}</td> : null}
                  <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={project.status} /></td>
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {canAssignTeam ? <button onClick={() => openMembers(project)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#111827]" aria-label="Assign team">
                        <Users className="h-4 w-4" />
                      </button> : null}
                      <button onClick={() => setBriefProject(project)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#111827]" aria-label="View project brief">
                        <FileText className="h-4 w-4" />
                      </button>
                      {canUpdateProject ? <button onClick={() => openEdit(project)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Edit project">
                        <Edit3 className="h-4 w-4" />
                      </button> : null}
                      {canDeleteProject ? <button onClick={() => deleteProject(project)} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318]" aria-label="Delete project">
                        <Trash2 className="h-4 w-4" />
                      </button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!projects.length && !loading ? <div className="p-8 text-sm text-[#667085]">No projects found for this account.</div> : null}
        </div>
      </div>

      {briefProject ? (
        <ProjectBriefModal project={briefProject} canViewBudget={canViewBudget} onClose={() => setBriefProject(null)} />
      ) : null}
    </AppShell>
  );
}

function ProjectBriefModal({ project, canViewBudget, onClose }: { project: Project; canViewBudget: boolean; onClose: () => void }) {
  const documentLinks = [
    { label: "Git repository", value: project.gitRepositoryUrl },
    { label: "Staging", value: project.stagingUrl },
    { label: "Production", value: project.productionUrl },
    { label: "API / requirement docs", value: project.apiDocumentationUrl }
  ].filter((link) => link.value);

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
      <section className="mx-auto flex max-h-[calc(100vh-48px)] max-w-5xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
          <div>
            <div className="text-lg font-semibold text-[#111827]">{project.title}</div>
            <div className="text-sm text-[#667085]">{project.code} · {project.client?.name ?? "No client"}</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Requirement Description</div>
                {project.description ? (
                  <div className="prose prose-sm max-w-none text-[#344054]" dangerouslySetInnerHTML={{ __html: project.description }} />
                ) : (
                  <div className="text-sm text-[#667085]">No description added yet.</div>
                )}
              </section>
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Scope</div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-[#344054]">{project.notes || "No scope added yet."}</div>
              </section>
            </div>
            <aside className="space-y-5">
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Planning</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-[#667085]">Status</span><StatusBadge value={project.status} /></div>
                  {canViewBudget ? <div className="flex items-center justify-between gap-3"><span className="text-[#667085]">Budget</span><span className="font-semibold text-[#111827]">{project.currency} {Number(project.budget ?? 0).toFixed(0)}</span></div> : null}
                  <div className="flex items-center justify-between gap-3"><span className="text-[#667085]">Manager</span><span className="text-right font-semibold text-[#111827]">{project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName ?? ""}`.trim() : "-"}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-[#667085]">Leader</span><span className="text-right font-semibold text-[#111827]">{project.teamLeader ? `${project.teamLeader.firstName} ${project.teamLeader.lastName ?? ""}`.trim() : "-"}</span></div>
                </div>
              </section>
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Technology Stack</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(project.technologyStack) && project.technologyStack.length ? project.technologyStack.map((item) => (
                    <span key={String(item)} className="rounded-md border border-[#d7dde8] bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-[#475467]">{String(item)}</span>
                  )) : <span className="text-sm text-[#667085]">No stack added.</span>}
                </div>
              </section>
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Documents and Links</div>
                <div className="space-y-2">
                  {documentLinks.map((link) => (
                    <a key={link.label} href={link.value ?? "#"} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md border border-[#d7dde8] px-3 py-2 text-sm font-semibold text-[#2563eb]">
                      {link.label}
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  ))}
                  {!documentLinks.length ? <div className="text-sm text-[#667085]">No document links added.</div> : null}
                </div>
              </section>
              <section className="rounded-md border border-[#d7dde8] p-4">
                <div className="mb-3 font-semibold text-[#111827]">Project Team</div>
                <div className="space-y-2">
                  {(project.members ?? []).map((member) => (
                    <div key={member.userId} className="rounded-md border border-[#edf1f7] px-3 py-2 text-sm">
                      <div className="font-semibold text-[#111827]">{member.user ? `${member.user.firstName} ${member.user.lastName ?? ""}`.trim() : member.userId}</div>
                      <div className="text-xs text-[#667085]">{member.roleInProject.replaceAll("_", " ")}</div>
                    </div>
                  ))}
                  {!(project.members ?? []).length ? <div className="text-sm text-[#667085]">No team members assigned.</div> : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function addLink() {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runCommand("createLink", url);
  }

  const tools = [
    { label: "Bold", icon: Bold, action: () => runCommand("bold") },
    { label: "Italic", icon: Italic, action: () => runCommand("italic") },
    { label: "Bullet list", icon: List, action: () => runCommand("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => runCommand("insertOrderedList") },
    { label: "Link", icon: LinkIcon, action: addLink }
  ];

  return (
    <div className="overflow-hidden rounded-md border border-[#d7dde8]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#d7dde8] bg-[#f8fafc] p-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              onClick={tool.action}
              title={tool.label}
              className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] bg-white text-[#111827] hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="prose prose-sm min-h-72 max-w-none overflow-auto px-4 py-3 text-sm leading-6 text-[#111827] outline-none focus:bg-[#fbfcff]"
        suppressContentEditableWarning
      />
    </div>
  );
}
