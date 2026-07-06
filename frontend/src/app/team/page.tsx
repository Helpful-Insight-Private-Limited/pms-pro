"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type CreateUserInput, type UpdateUserInput, type UserStatus } from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type Role = {
  id: string;
  name: string;
  slug: string;
};

type User = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  status: UserStatus;
  isActive?: boolean;
  userRoles?: Array<{ role?: Role }>;
};

type UserForm = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  status: UserStatus;
  isActive: boolean;
  roleIds: string[];
};

const emptyForm: UserForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  status: "ACTIVE",
  isActive: true,
  roleIds: []
};

function roleNames(user: User) {
  return user.userRoles?.map((item) => item.role?.name ?? item.role?.slug).filter(Boolean) ?? [];
}

function roleIds(user: User) {
  return user.userRoles?.map((item) => item.role?.id).filter((id): id is string => Boolean(id)) ?? [];
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(form.id);
  const { user: sessionUser } = useSessionUser();
  const isAdmin = Boolean(sessionUser?.roles.includes("admin"));
  const canCreateUser = isAdmin || Boolean(sessionUser?.permissions.includes("user.create"));
  const canUpdateUser = isAdmin || Boolean(sessionUser?.permissions.includes("user.update"));
  const canDeleteUser = isAdmin || Boolean(sessionUser?.permissions.includes("user.delete"));
  const canAssignRoles = isAdmin || Boolean(sessionUser?.permissions.includes("permission.assign"));

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const userList = await api.users.list<User[]>();
      setUsers(userList);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load team");
    }

    try {
      const roleList = await api.roles.list<Role[]>();
      setRoles(roleList);
    } catch (requestError) {
      setRoles([]);
      setError((current) => current || (requestError instanceof Error ? requestError.message : "Unable to load roles"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate() {
    setForm({ ...emptyForm, roleIds: roles[0] ? [roles[0].id] : [] });
    setFormOpen(true);
    setNotice("");
    setError("");
  }

  function openEdit(user: User) {
    setForm({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? "",
      email: user.email,
      password: "",
      phone: user.phone ?? "",
      status: user.status,
      isActive: user.isActive ?? true,
      roleIds: roleIds(user)
    });
    setFormOpen(true);
    setNotice("");
    setError("");
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId]
    }));
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      if (isEditing && form.id) {
        const updatePayload: UpdateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName || null,
          phone: form.phone || null,
          status: form.status,
          isActive: form.isActive
        };
        await api.users.update(form.id, updatePayload);
        if (canAssignRoles) {
          await api.users.assignRoles(form.id, form.roleIds);
        }
        setNotice("User updated successfully.");
      } else {
        const createPayload: CreateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName || undefined,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          roleIds: form.roleIds
        };
        await api.users.create(createPayload);
        setNotice("User created successfully.");
      }
      setFormOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save user");
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName ?? ""}?`)) return;
    setError("");
    setNotice("");

    try {
      await api.users.remove(user.id);
      setNotice("User deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete user");
    }
  }

  const activeUsers = users.filter((user) => user.status === "ACTIVE" || user.isActive).length;
  const invitedUsers = users.filter((user) => user.status === "INVITED").length;
  const adminUsers = useMemo(() => users.filter((user) => roleNames(user).some((role) => role?.toLowerCase().includes("admin"))).length, [users]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="People operations"
        title="Team"
        description="Create, edit, deactivate, assign roles, and remove users from one management screen."
        actions={
          <>
            <button onClick={loadData} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {canCreateUser ? (
            <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563eb] px-3 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" />
              Add User
            </button>
            ) : null}
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Users" value={users.length} tone="black" />
        <MetricCard label="Active" value={activeUsers} tone="blue" />
        <MetricCard label="Invited" value={invitedUsers} tone="yellow" />
        <MetricCard label="Admins" value={adminUsers} tone="gray" />
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={saveUser} className="mx-auto flex max-h-[calc(100vh-48px)] max-w-5xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
              <div>
                <div className="text-lg font-semibold text-[#111827]">{isEditing ? "Edit User" : "Add User"}</div>
                <div className="text-sm text-[#667085]">Manage user identity, account status, and role assignments.</div>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">First name</span>
              <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Last name</span>
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input required disabled={isEditing} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none disabled:bg-[#f4f7fb]" />
            </label>
            {!isEditing ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <input required minLength={10} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Phone</span>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Status</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none">
                {["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              <span className="text-sm font-medium">Active account</span>
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <div className="mb-2 text-sm font-medium">Roles</div>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    disabled={!canAssignRoles}
                    onClick={() => toggleRole(role.id)}
                    className={`h-9 rounded-md border px-3 text-sm font-semibold disabled:opacity-50 ${form.roleIds.includes(role.id) ? "border-[#2563eb] bg-[#eaf1ff] text-[#174ea6]" : "border-[#d7dde8] bg-white text-[#667085]"}`}
                  >
                    {role.name}
                  </button>
                ))}
                {!roles.length ? <span className="text-sm text-[#b42318]">Role list is not available for this account.</span> : null}
              </div>
            </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[#d7dde8] bg-[#f8fafc] p-4">
              <button type="button" onClick={() => setFormOpen(false)} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
                <Save className="h-4 w-4" />
                Save User
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
        <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
          <div className="font-semibold text-[#111827]">{loading ? "Loading team" : `${users.length} users`}</div>
          <div className="text-sm text-[#667085]">Role-based access roster</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#667085]">
              <tr>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">User</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Role</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Phone</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#fbfcff]">
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="font-semibold text-[#111827]">{`${user.firstName} ${user.lastName ?? ""}`.trim()}</div>
                    <div className="text-xs text-[#667085]">{user.email}</div>
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {roleNames(user).length ? roleNames(user).map((role) => <span key={role} className="rounded-md bg-[#eaf1ff] px-2 py-1 text-xs font-semibold text-[#174ea6]">{role}</span>) : <span className="text-[#667085]">No role</span>}
                    </div>
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">{user.phone ?? "-"}</td>
                  <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={user.status} /></td>
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button disabled={!canUpdateUser} onClick={() => openEdit(user)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb] disabled:opacity-40" aria-label="Edit user">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button disabled={!canDeleteUser} onClick={() => deleteUser(user)} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318] disabled:opacity-40" aria-label="Delete user">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && !loading ? <div className="p-8 text-sm text-[#667085]">No users found.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
