"use client";

import { useCallback, useEffect, useState } from "react";
import { getHiringManagerProfile, updateHiringManagerProfile } from "@/lib/hiringManagerApi";
import type { HiringManagerInformation, CompanySize } from "@/types/schema";
import { toast } from "sonner";
import { Building2, Pencil, X } from "lucide-react";

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: "STARTUP", label: "1–10" },
  { value: "SMALL", label: "11–50" },
  { value: "MEDIUM", label: "51–200" },
  { value: "LARGE", label: "201–1000" },
  { value: "ENTERPRISE", label: "1000+" },
];

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function HiringManagerProfilePage() {
  const [profile, setProfile] = useState<HiringManagerInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<HiringManagerInformation>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHiringManagerProfile();
      setProfile(data ?? null);
      if (data) setForm(data);
    } catch (error: any) {
      // Handle 404 or other errors gracefully
      if (error?.response?.status === 404) {
        setProfile(null);
        toast.error("Profile not found. Please create your profile.");
      } else {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await updateHiringManagerProfile(form);
      toast.success("Profile updated");
      setEditing(false);
      load();
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) setForm(profile);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No hiring manager profile found. This view is for hiring managers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Company and role context</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              type="text"
              value={form.companyName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company size</label>
            <select
              value={form.companySize ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value as CompanySize }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {COMPANY_SIZES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input
              type="text"
              value={form.industry ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={form.department ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team name (optional)</label>
            <input
              type="text"
              value={form.teamName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
            <input
              type="url"
              value={form.linkedinUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max active interviews</label>
            <input
              type="number"
              min={1}
              value={form.maxActiveInterviews ?? 10}
              onChange={(e) => setForm((f) => ({ ...f, maxActiveInterviews: parseInt(e.target.value, 10) || 10 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{profile.companyName}</h2>
              <p className="text-sm text-gray-500">
                {COMPANY_SIZES.find((c) => c.value === profile.companySize)?.label ?? profile.companySize} · {profile.industry}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-0.5 text-gray-900">{profile.department}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Team name</dt>
              <dd className="mt-0.5 text-gray-900">{profile.teamName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
              <dd className="mt-0.5">
                {profile.linkedinUrl ? (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {profile.linkedinUrl}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="mt-0.5">
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {profile.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Max active interviews</dt>
              <dd className="mt-0.5 text-gray-900">{profile.maxActiveInterviews}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-0.5 text-gray-600 text-sm">{formatDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last updated</dt>
              <dd className="mt-0.5 text-gray-600 text-sm">{formatDate(profile.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
