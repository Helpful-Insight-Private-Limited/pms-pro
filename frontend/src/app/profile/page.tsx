"use client";

import { useEffect, useState } from "react";
import { Camera, KeyRound, RefreshCcw, Save, ShieldCheck, Upload, UserCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, type AuthUser, type UpdateProfileInput } from "@/lib/api";

type ProfileUser = AuthUser & {
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  developerProfile?: {
    designation?: string | null;
    experienceYears?: string | number | null;
    skills?: unknown;
  } | null;
};

type ProfileForm = UpdateProfileInput;

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<ProfileForm>({ firstName: "", lastName: "", phone: "", avatarUrl: "" });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const user = await api.auth.me<ProfileUser>();
      setProfile(user);
      setForm({
        firstName: user.firstName,
        lastName: user.lastName ?? "",
        phone: user.phone ?? "",
        avatarUrl: user.avatarUrl ?? ""
      });
      window.localStorage.setItem("pms.user", JSON.stringify(user));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const updated = await api.auth.updateProfile<ProfileUser>({
        firstName: form.firstName,
        lastName: form.lastName?.trim() ? form.lastName.trim() : null,
        phone: form.phone?.trim() ? form.phone.trim() : null,
        avatarUrl: form.avatarUrl?.trim() ? form.avatarUrl.trim() : null
      });
      setProfile(updated);
      window.localStorage.setItem("pms.user", JSON.stringify(updated));
      setNotice("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update profile");
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await api.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm(emptyPasswordForm);
      setNotice("Password changed successfully. Please log in again if your session expires.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password");
    }
  }

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setError("");
    setNotice("");
    setAvatarUploading(true);

    try {
      const body = new FormData();
      body.append("avatar", file);
      const updated = await api.auth.uploadAvatar<ProfileUser>(body);
      setProfile(updated);
      setForm((current) => ({ ...current, avatarUrl: updated.avatarUrl ?? "" }));
      window.localStorage.setItem("pms.user", JSON.stringify(updated));
      setNotice("Profile picture updated successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload profile picture");
    } finally {
      setAvatarUploading(false);
    }
  }

  const skills = Array.isArray(profile?.developerProfile?.skills) ? profile.developerProfile.skills.join(", ") : "";
  const initials = profile ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "U" : "U";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account settings"
        title="Profile"
        description="Manage your contact details, role context, and password."
        actions={
          <button onClick={loadProfile} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 text-sm font-semibold text-[#111827]">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-4 text-sm text-[#b42318]">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-[#a7dfc0] bg-[#edf9f1] p-4 text-sm text-[#137333]">{notice}</div> : null}
      {loading && !profile ? <div className="rounded-md border border-[#d7dde8] bg-white p-6 text-sm text-[#667085]">Loading profile...</div> : null}

      {profile ? (
        <div className="space-y-6">
          <section className="rounded-md border border-[#111827] bg-[#111827] p-5 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-md bg-[#f4c430] text-xl font-black text-[#111827]">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.firstName} ${profile.lastName ?? ""}`.trim()} className="h-full w-full object-cover" /> : initials}
                </div>
                <div>
                  <div className="text-2xl font-semibold">{profile.firstName} {profile.lastName ?? ""}</div>
                  <div className="mt-1 text-sm text-white/60">{profile.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(profile.roles ?? []).map((role) => <StatusBadge key={role} value={role} className="border-[#f4c430] bg-[#fff5cc] text-[#111827]" />)}
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Permissions" value={profile.permissions?.length ?? 0} tone="black" />
            <MetricCard label="Status" value={profile.status ?? "ACTIVE"} tone="blue" />
            <MetricCard label="Designation" value={profile.developerProfile?.designation ?? "Not set"} tone="yellow" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={saveProfile} className="rounded-md border border-[#d7dde8] bg-white">
              <div className="flex h-14 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
                <UserCircle className="h-4 w-4 text-[#2563eb]" />
                Personal Details
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-4 md:col-span-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-md bg-[#111827] text-xl font-black text-[#f4c430]">
                        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile picture" className="h-full w-full object-cover" /> : <Camera className="h-7 w-7" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#111827]">Profile Picture</div>
                        <div className="mt-1 text-sm text-[#667085]">JPG, PNG, WebP, or GIF. Maximum 2 MB.</div>
                      </div>
                    </div>
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white">
                      <Upload className="h-4 w-4" />
                      {avatarUploading ? "Uploading..." : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={(event) => {
                          void uploadAvatar(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">First name</span>
                  <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Last name</span>
                  <input value={form.lastName ?? ""} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Phone</span>
                  <input value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
              </div>
              <div className="flex justify-end border-t border-[#d7dde8] p-4">
                <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white">
                  <Save className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </form>

            <form onSubmit={changePassword} className="rounded-md border border-[#d7dde8] bg-white">
              <div className="flex h-14 items-center gap-2 border-b border-[#d7dde8] px-4 font-semibold text-[#111827]">
                <KeyRound className="h-4 w-4 text-[#2563eb]" />
                Password
              </div>
              <div className="space-y-4 p-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Current password</span>
                  <input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">New password</span>
                  <input type="password" required minLength={10} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Confirm password</span>
                  <input type="password" required minLength={10} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="h-10 w-full rounded-md border border-[#d7dde8] px-3 outline-none focus:border-[#2563eb]" />
                </label>
              </div>
              <div className="flex justify-end border-t border-[#d7dde8] p-4">
                <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4" />
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {profile.developerProfile ? (
            <section className="rounded-md border border-[#d7dde8] bg-white p-4">
              <div className="font-semibold text-[#111827]">Developer Profile</div>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <MetricCard label="Experience" value={`${profile.developerProfile.experienceYears ?? 0} years`} tone="gray" />
                <MetricCard label="Working Role" value={profile.developerProfile.designation ?? "Not set"} tone="blue" />
                <MetricCard label="Skills" value={skills || "Not set"} tone="yellow" />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
