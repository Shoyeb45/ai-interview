"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, User, Briefcase, LogOut, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navCandidate = [
  { href: "/dashboard/candidate", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interview", label: "Available Interviews", icon: Briefcase },
  { href: "/dashboard/candidate/sessions", label: "My Sessions", icon: User },
  { href: "/dashboard/candidate/results", label: "My Results", icon: BarChart3 },
];

const navHiringManager = [
  { href: "/dashboard/hiring-manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/hiring-manager/agents", label: "Interview Agents", icon: Briefcase },
  { href: "/dashboard/hiring-manager/profile", label: "Profile", icon: User },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout, isHiringManager, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show nav based on roles from /auth/me (role-based access)
  const showCandidateNav = hasRole('USER');
  const showHmNav = hasRole('HIRING_MANAGER');
  const nav = [
    ...(showCandidateNav ? navCandidate : []),
    ...(showHmNav ? navHiringManager : []),
  ];
  const defaultDashboardHref = showHmNav ? '/dashboard/hiring-manager' : '/dashboard/candidate';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href={defaultDashboardHref} className="flex items-center gap-2 text-gray-900 font-semibold">
                <Brain className="h-7 w-7 text-blue-600" />
                <span>InterviewAI</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
