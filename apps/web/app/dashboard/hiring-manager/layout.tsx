"use client";

import RoleGuard from "@/components/RoleGuard";

export default function HiringManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredRole="HIRING_MANAGER" redirectTo="/dashboard/candidate">
      {children}
    </RoleGuard>
  );
}
