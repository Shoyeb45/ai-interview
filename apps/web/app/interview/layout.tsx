"use client";

import RoleGuard from "@/components/RoleGuard";

/**
 * Only users with USER role (candidates) can access /interview and sub-routes.
 * Hiring managers without USER role are redirected to dashboard.
 */
export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredRole="USER" redirectTo="/dashboard">
      {children}
    </RoleGuard>
  );
}
