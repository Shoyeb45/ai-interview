"use client";

import RoleGuard from "@/components/RoleGuard";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredRole="USER" redirectTo="/dashboard/hiring-manager">
      {children}
    </RoleGuard>
  );
}
