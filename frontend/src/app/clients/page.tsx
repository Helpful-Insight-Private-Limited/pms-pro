"use client";

import { useEffect, useState } from "react";
import { Edit3, Globe2, Mail, Phone, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type ClientInput } from "@/lib/api";
import { useSessionUser } from "@/lib/session";

type Client = ClientInput & {
  id: string;
  isActive: boolean;
  createdAt: string;
  _count?: { projects: number };
};

type ClientForm = ClientInput & { id?: string };

const emptyForm: ClientForm = {
  name: "",
  code: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  companyWebsite: "",
  billingAddress: "",
  notes: ""
};

function asNullable(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

export default function ClientsPage() {
  const { user } = useSessionUser();
  const canCreate = user?.permissions?.includes("client.create");
  const canUpdate = user?.permissions?.includes("client.update");
  const canDelete = user?.permissions?.includes("client.delete");
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isEditing = Boolean(form.id);

  async function loadClients() {
    setLoading(true);
    setError("");
    try {
      setClients(await api.clients.list<Client[]>());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function openEdit(client: Client) {
    setForm({
      id: client.id,
      name: client.name,
      code: client.code ?? "",
      contactName: client.contactName ?? "",
      contactEmail: client.contactEmail ?? "",
      contactPhone: client.contactPhone ?? "",
      companyWebsite: client.companyWebsite ?? "",
      billingAddress: client.billingAddress ?? "",
      notes: client.notes ?? ""
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  async function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload: ClientInput = {
      name: form.name,
      code: asNullable(form.code),
      contactName: asNullable(form.contactName),
      contactEmail: asNullable(form.contactEmail),
      contactPhone: asNullable(form.contactPhone),
      companyWebsite: asNullable(form.companyWebsite),
      billingAddress: asNullable(form.billingAddress),
      notes: asNullable(form.notes)
    };

    try {
      if (isEditing && form.id) {
        await api.clients.update(form.id, payload);
        setNotice("Client updated successfully.");
      } else {
        await api.clients.create(payload);
        setNotice("Client created successfully.");
      }

      setFormOpen(false);
      await loadClients();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save client");
    }
  }

  async function deleteClient(client: Client) {
    if (!window.confirm(`Delete client ${client.name}?`)) return;
    setError("");
    setNotice("");

    try {
      await api.clients.remove(client.id);
      setNotice("Client deleted successfully.");
      await loadClients();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete client");
    }
  }

  const activeClients = clients.filter((client) => client.isActive).length;
  const totalProjects = clients.reduce((sum, client) => sum + Number(client._count?.projects ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Client management"
        title="Clients"
        description="Create, edit, and maintain client records used by project setup and reporting."
        actions={
          <>
            <button onClick={loadClients} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            {canCreate ? (
              <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f4c430] px-3 text-sm font-semibold text-[#111827]">
                <Plus className="h-4 w-4" />
                New Client
              </button>
            ) : null}
          </>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Clients" value={clients.length} tone="black" />
        <MetricCard label="Active Clients" value={activeClients} tone="blue" />
        <MetricCard label="Linked Projects" value={totalProjects} tone="yellow" />
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 bg-[#111827]/60 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={saveClient} className="mx-auto flex max-h-[calc(100vh-48px)] max-w-5xl flex-col overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#d7dde8] px-5">
              <div>
                <div className="text-lg font-semibold text-[#111827]">{isEditing ? "Edit Client" : "New Client"}</div>
                <div className="text-sm text-[#667085]">Maintain client contact, billing, and project setup information.</div>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-medium">Client name</span>
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Code</span>
              <input value={form.code ?? ""} onChange={(event) => setForm({ ...form, code: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Contact name</span>
              <input value={form.contactName ?? ""} onChange={(event) => setForm({ ...form, contactName: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Contact email</span>
              <input type="email" value={form.contactEmail ?? ""} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Phone</span>
              <input value={form.contactPhone ?? ""} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium">Website</span>
              <input type="url" value={form.companyWebsite ?? ""} onChange={(event) => setForm({ ...form, companyWebsite: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium">Billing address</span>
              <input value={form.billingAddress ?? ""} onChange={(event) => setForm({ ...form, billingAddress: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block md:col-span-2 xl:col-span-4">
              <span className="mb-2 block text-sm font-medium">Notes</span>
              <textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-24 w-full rounded-md border border-[#d7dde8] px-3 py-2 outline-none focus:border-[#2563eb]" />
            </label>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[#d7dde8] bg-[#f8fafc] p-4">
              <button type="button" onClick={() => setFormOpen(false)} className="h-10 rounded-md border border-[#d7dde8] bg-white px-4 text-sm font-semibold">Cancel</button>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
                <Save className="h-4 w-4" />
                Save Client
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-[#d7dde8] bg-white">
        <div className="flex h-14 items-center justify-between border-b border-[#d7dde8] px-4">
          <div className="font-semibold text-[#111827]">{loading ? "Loading clients" : `${clients.length} clients`}</div>
          <div className="text-sm text-[#667085]">Client directory</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#667085]">
              <tr>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Client</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Contact</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Website</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Projects</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 font-semibold">Status</th>
                <th className="border-b border-[#d7dde8] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-[#fbfcff]">
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="font-semibold text-[#111827]">{client.name}</div>
                    <div className="mt-1 text-xs font-semibold uppercase text-[#2563eb]">{client.code ?? "NO CODE"}</div>
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="text-[#111827]">{client.contactName ?? "-"}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#667085]">
                      {client.contactEmail ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{client.contactEmail}</span> : null}
                      {client.contactPhone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{client.contactPhone}</span> : null}
                    </div>
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4 text-[#667085]">
                    {client.companyWebsite ? <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#2563eb]" />{client.companyWebsite}</span> : "-"}
                  </td>
                  <td className="border-b border-[#edf1f7] px-4 py-4 font-semibold text-[#111827]">{client._count?.projects ?? 0}</td>
                  <td className="border-b border-[#edf1f7] px-4 py-4"><StatusBadge value={client.isActive ? "ACTIVE" : "DEACTIVATED"} /></td>
                  <td className="border-b border-[#edf1f7] px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {canUpdate ? (
                        <button onClick={() => openEdit(client)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#2563eb]" aria-label="Edit client">
                          <Edit3 className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button onClick={() => deleteClient(client)} className="grid h-9 w-9 place-items-center rounded-md border border-[#f3b4b4] text-[#b42318]" aria-label="Delete client">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!clients.length && !loading ? <div className="p-8 text-sm text-[#667085]">No clients found. Create a client before creating projects.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
