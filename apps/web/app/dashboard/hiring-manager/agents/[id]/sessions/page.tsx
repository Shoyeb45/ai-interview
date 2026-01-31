"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Redirect legacy /sessions to /leaderboard */
export default function SessionsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/hiring-manager/agents/${id}/leaderboard`);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <span className="text-gray-500">Redirecting to leaderboard...</span>
    </div>
  );
}
