"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasRoleInRoles } from "@/lib/roles";
import type { RoleCode } from "@/types/schema";

interface RoleGuardProps {
  children: ReactNode;
  /** Role required to access this route (e.g. USER, HIRING_MANAGER) */
  requiredRole: RoleCode;
  /** Where to redirect if user doesn't have the role */
  redirectTo: string;
}

/**
 * Protects routes by /auth/me roles. Redirects to redirectTo if the user
 * doesn't have the required role. Supports roles as string[] or { code }[].
 */
export default function RoleGuard({ children, requiredRole, redirectTo }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const hasRole = hasRoleInRoles(
    user?.roles as unknown[] | undefined,
    requiredRole
  );

  useEffect(() => {
    if (loading) return;
    if (!user) return; // ProtectedRoute handles unauthenticated
    if (!hasRole) {
      router.replace(redirectTo);
    }
  }, [user, loading, hasRole, redirectTo, router]);

  if (loading || !user) {
    return null;
  }

  if (!hasRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-500">Redirecting...</span>
      </div>
    );
  }

  return <>{children}</>;
}
