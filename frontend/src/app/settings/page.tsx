"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Edit3, KeyRound, Layers3, Plus, RefreshCcw, Save, Shield, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type CreateRoleInput, type CurrencyInput, type TechnologyStackInput, type UpdateRoleInput } from "@/lib/api";

type Permission = { id: string; key: string; module: string; action: string };
type Role = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  rolePermissions?: Array<{ permission?: Permission }>;
};
type Currency = CurrencyInput & { id: string; isActive: boolean };
type TechnologyStack = TechnologyStackInput & { id: string; isActive: boolean };
type Tab = "roles" | "currencies" | "technology";

type RoleForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  permissionIds: string[];
};

const emptyRole: RoleForm = { name: "", slug: "", description: "", isActive: true, permissionIds: [] };
const emptyCurrency: CurrencyInput & { id?: string; isActive?: boolean } = { code: "", name: "", symbol: "" };
const emptyTechnology: TechnologyStackInput & { id?: string; isActive?: boolean } = { name: "", category: "" };

function permissionIds(role: Role) {
  return role.rolePermissions?.map((item) => item.permission?.id).filter((id): id is string => Boolean(id)) ?? [];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [technologyStacks, setTechnologyStacks] = useState<TechnologyStack[]>([]);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRole);
  const [currencyForm, setCurrencyForm] = useState<typeof emptyCurrency>(emptyCurrency);
  const [technologyForm, setTechnologyForm] = useState<typeof emptyTechnology>(emptyTechnology);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [technologyModalOpen, setTechnologyModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [roleList, permissionList, currencyList, stackList] = await Promise.all([
        api.roles.list<Role[]>(),
        api.permissions.list<Permission[]>(),
        api.masters.currencies.list<Currency[]>(),
        api.masters.technologyStacks.list<TechnologyStack[]>()
      ]);
      setRoles(roleList);
      setPermissions(permissionList);
      setCurrencies(currencyList);
      setTechnologyStacks(stackList);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const permission of permissions) grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  function openCreateRole() {
    setRoleForm(emptyRole);
    setRoleModalOpen(true);
    setError("");
    setNotice("");
  }

  function openEditRole(role: Role) {
    setRoleForm({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description ?? "",
      isActive: role.isActive ?? true,
      permissionIds: permissionIds(role)
    });
    setRoleModalOpen(true);
    setError("");
    setNotice("");
  }

  function togglePermission(permissionId: string) {
    setRoleForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId]
    }));
  }

  async function saveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (roleForm.id) {
        const payload: UpdateRoleInput = {
          name: roleForm.name,
          description: roleForm.description || null,
          isActive: roleForm.isActive
        };
        await api.roles.update(roleForm.id, payload);
        await api.roles.assignPermissions(roleForm.id, roleForm.permissionIds);
        setNotice("Role updated successfully.");
      } else {
        const payload: CreateRoleInput = {
          name: roleForm.name,
          slug: roleForm.slug,
          description: roleForm.description || undefined
        };
        const created = await api.roles.create<Role>(payload);
        await api.roles.assignPermissions(created.id, roleForm.permissionIds);
        setNotice("Role created successfully.");
      }
      setRoleModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save role");
    }
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Delete role ${role.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await api.roles.remove(role.id);
      setNotice("Role deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete role");
    }
  }

  function openCreateCurrency() {
    setCurrencyForm(emptyCurrency);
    setCurrencyModalOpen(true);
    setError("");
    setNotice("");
  }

  function openEditCurrency(currency: Currency) {
    setCurrencyForm({ ...currency, symbol: currency.symbol ?? "" });
    setCurrencyModalOpen(true);
    setError("");
    setNotice("");
  }

  async function saveCurrency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        code: currencyForm.code,
        name: currencyForm.name,
        symbol: currencyForm.symbol?.trim() ? currencyForm.symbol.trim() : null
      };
      if (currencyForm.id) {
        await api.masters.currencies.update(currencyForm.id, { ...payload, isActive: currencyForm.isActive });
        setNotice("Currency updated successfully.");
      } else {
        await api.masters.currencies.create(payload);
        setNotice("Currency created successfully.");
      }
      setCurrencyModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save currency");
    }
  }

  async function deleteCurrency(currency: Currency) {
    if (!window.confirm(`Delete currency ${currency.code}?`)) return;
    setError("");
    setNotice("");
    try {
      await api.masters.currencies.remove(currency.id);
      setNotice("Currency deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete currency");
    }
  }

  function openCreateTechnology() {
    setTechnologyForm(emptyTechnology);
    setTechnologyModalOpen(true);
    setError("");
    setNotice("");
  }

  function openEditTechnology(stack: TechnologyStack) {
    setTechnologyForm({ ...stack, category: stack.category ?? "" });
    setTechnologyModalOpen(true);
    setError("");
    setNotice("");
  }

  async function saveTechnology(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        name: technologyForm.name,
        category: technologyForm.category?.trim() ? technologyForm.category.trim() : null
      };
      if (technologyForm.id) {
        await api.masters.technologyStacks.update(technologyForm.id, { ...payload, isActive: technologyForm.isActive });
        setNotice("Technology stack updated successfully.");
      } else {
        await api.masters.technologyStacks.create(payload);
        setNotice("Technology stack created successfully.");
      }
      setTechnologyModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save technology stack");
    }
  }

  async function deleteTechnology(stack: TechnologyStack) {
    if (!window.confirm(`Delete technology stack ${stack.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await api.masters.technologyStacks.remove(stack.id);
      setNotice("Technology stack deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete technology stack");
    }
  }

  const tabs = [
    { key: "roles" as const, label: "Roles", icon: Shield },
    { key: "currencies" as const, label: "Currencies", icon: Coins },
    { key: "technology" as const, label: "Technology", icon: Layers3 }
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage roles, permissions, and reusable project master data."
        actions={
          <>
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {activeTab === "roles" ? <ActionButton label="Add Role" onClick={openCreateRole} tone="yellow" /> : null}
            {activeTab === "currencies" ? <ActionButton label="Add Currency" onClick={openCreateCurrency} tone="yellow" /> : null}
            {activeTab === "technology" ? <ActionButton label="Add Stack" onClick={openCreateTechnology} tone="yellow" /> : null}
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Roles" value={roles.length} tone="black" />
        <MetricCard label="Permissions" value={permissions.length} tone="blue" />
        <MetricCard label="Currencies" value={currencies.length} tone="yellow" />
        <MetricCard label="Tech Stacks" value={technologyStacks.length} tone="gray" />
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

      {activeTab === "roles" ? <RolesTable roles={roles} loading={loading} onEdit={openEditRole} onDelete={deleteRole} /> : null}
      {activeTab === "currencies" ? <CurrenciesTable currencies={currencies} loading={loading} onEdit={openEditCurrency} onDelete={deleteCurrency} /> : null}
      {activeTab === "technology" ? <TechnologyTable stacks={technologyStacks} loading={loading} onEdit={openEditTechnology} onDelete={deleteTechnology} /> : null}

      {roleModalOpen ? (
        <Modal title={roleForm.id ? "Edit Role" : "Add Role"} subtitle="Configure role metadata and permissions." onClose={() => setRoleModalOpen(false)}>
          <form onSubmit={saveRole} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Role name</span>
                <input required value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Slug</span>
                <input required disabled={Boolean(roleForm.id)} value={roleForm.slug} onChange={(event) => setRoleForm({ ...roleForm, slug: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none disabled:bg-[#f4f7fb]" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Description</span>
                <input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={roleForm.isActive} onChange={(event) => setRoleForm({ ...roleForm, isActive: event.target.checked })} />
                <span className="text-sm font-medium">Active role</span>
              </label>
              <div className="md:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#111827]">
                  <KeyRound className="h-4 w-4 text-[#2563eb]" />
                  Permissions
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  {groupedPermissions.map(([module, modulePermissions]) => (
                    <div key={module} className="rounded-md border border-[#d7dde8] p-3">
                      <div className="mb-2 text-sm font-semibold capitalize text-[#111827]">{module}</div>
                      <div className="space-y-2">
                        {modulePermissions.map((permission) => (
                          <label key={permission.id} className="flex items-center gap-2 text-sm text-[#667085]">
                            <input type="checkbox" checked={roleForm.permissionIds.includes(permission.id)} onChange={() => togglePermission(permission.id)} />
                            <span>{permission.key}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ModalActions onCancel={() => setRoleModalOpen(false)} label={roleForm.id ? "Update Role" : "Save Role"} />
          </form>
        </Modal>
      ) : null}

      {currencyModalOpen ? (
        <Modal title={currencyForm.id ? "Edit Currency" : "Add Currency"} subtitle="Maintain currencies used in project budgets and reports." onClose={() => setCurrencyModalOpen(false)} size="small">
          <form onSubmit={saveCurrency}>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Code</span>
                <input required value={currencyForm.code} onChange={(event) => setCurrencyForm({ ...currencyForm, code: event.target.value.toUpperCase() })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Symbol</span>
                <input value={currencyForm.symbol ?? ""} onChange={(event) => setCurrencyForm({ ...currencyForm, symbol: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <input required value={currencyForm.name} onChange={(event) => setCurrencyForm({ ...currencyForm, name: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              {currencyForm.id ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={currencyForm.isActive ?? true} onChange={(event) => setCurrencyForm({ ...currencyForm, isActive: event.target.checked })} />
                  <span className="text-sm font-medium">Active currency</span>
                </label>
              ) : null}
            </div>
            <ModalActions onCancel={() => setCurrencyModalOpen(false)} label="Save Currency" />
          </form>
        </Modal>
      ) : null}

      {technologyModalOpen ? (
        <Modal title={technologyForm.id ? "Edit Technology Stack" : "Add Technology Stack"} subtitle="Maintain stack choices used during project creation." onClose={() => setTechnologyModalOpen(false)} size="small">
          <form onSubmit={saveTechnology}>
            <div className="grid gap-4 p-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <input required value={technologyForm.name} onChange={(event) => setTechnologyForm({ ...technologyForm, name: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Category</span>
                <input value={technologyForm.category ?? ""} onChange={(event) => setTechnologyForm({ ...technologyForm, category: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
              {technologyForm.id ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={technologyForm.isActive ?? true} onChange={(event) => setTechnologyForm({ ...technologyForm, isActive: event.target.checked })} />
                  <span className="text-sm font-medium">Active stack</span>
                </label>
              ) : null}
            </div>
            <ModalActions onCancel={() => setTechnologyModalOpen(false)} label="Save Stack" />
          </form>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function ActionButton({ label, onClick, tone }: { label: string; onClick: () => void; tone: "yellow" | "blue" }) {
  return (
    <button onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tone === "yellow" ? "bg-[#f4c430] text-[#111827]" : "bg-[#2563eb] text-white"}`}>
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, size = "large" }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; size?: "small" | "large" }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
      <section className={`mx-auto flex max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl ${size === "small" ? "max-w-xl" : "max-w-6xl"}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
          <div>
            <div className="text-lg font-semibold text-[#111827]">{title}</div>
            <div className="text-sm text-[#667085]">{subtitle}</div>
          </div>
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

function RolesTable({ roles, loading, onEdit, onDelete }: { roles: Role[]; loading: boolean; onEdit: (role: Role) => void; onDelete: (role: Role) => void }) {
  return (
    <DataShell title={loading ? "Loading roles" : `${roles.length} roles`} subtitle="Access control matrix" icon={Shield}>
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]">
          <tr>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Role</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Slug</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Permissions</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4">
                <div className="font-semibold text-[#111827]">{role.name}</div>
                <div className="text-xs text-[#667085]">{role.description ?? "No description"}</div>
              </td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{role.slug}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4">{permissionIds(role).length}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={role.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4">
                <RowActions onEdit={() => onEdit(role)} onDelete={() => onDelete(role)} deleteDisabled={role.isSystem} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataShell>
  );
}

function CurrenciesTable({ currencies, loading, onEdit, onDelete }: { currencies: Currency[]; loading: boolean; onEdit: (currency: Currency) => void; onDelete: (currency: Currency) => void }) {
  return (
    <DataShell title={loading ? "Loading currencies" : `${currencies.length} currencies`} subtitle="Project budget currencies" icon={Coins}>
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]">
          <tr>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Code</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Name</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Symbol</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((currency) => (
            <tr key={currency.id} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{currency.code}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{currency.name}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{currency.symbol ?? "-"}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={currency.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><RowActions onEdit={() => onEdit(currency)} onDelete={() => onDelete(currency)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataShell>
  );
}

function TechnologyTable({ stacks, loading, onEdit, onDelete }: { stacks: TechnologyStack[]; loading: boolean; onEdit: (stack: TechnologyStack) => void; onDelete: (stack: TechnologyStack) => void }) {
  return (
    <DataShell title={loading ? "Loading technology stacks" : `${stacks.length} technology stacks`} subtitle="Reusable project stack choices" icon={Layers3}>
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-[#667085]">
          <tr>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Name</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Category</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
            <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stacks.map((stack) => (
            <tr key={stack.id} className="hover:bg-[#fbfcff]">
              <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{stack.name}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{stack.category ?? "-"}</td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={stack.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
              <td className="border-b border-[#edf1f7] px-4 py-4"><RowActions onEdit={() => onEdit(stack)} onDelete={() => onDelete(stack)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataShell>
  );
}

function DataShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Shield; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
        <div className="flex items-center gap-2 font-semibold text-[#111827]">
          <Icon className="h-4 w-4 text-[#2563eb]" />
          {title}
        </div>
        <div className="text-sm text-[#667085]">{subtitle}</div>
      </div>
      <div className="overflow-auto">{children}</div>
    </div>
  );
}

function RowActions({ onEdit, onDelete, deleteDisabled = false }: { onEdit: () => void; onDelete: () => void; deleteDisabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Edit">
        <Edit3 className="h-4 w-4" />
      </button>
      <button disabled={deleteDisabled} onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318] disabled:opacity-40" aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
