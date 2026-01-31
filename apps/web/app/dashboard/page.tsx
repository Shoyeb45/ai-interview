"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    // Role-based redirect from /auth/me roles
    if (hasRole("HIRING_MANAGER")) {
      router.replace("/dashboard/hiring-manager");
    } else if (hasRole("USER")) {
      router.replace("/dashboard/candidate");
    } else {
      router.replace("/dashboard/candidate");
    }
  }, [user, loading, hasRole, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <span className="text-gray-500">Redirecting...</span>
    </div>
  );
}
