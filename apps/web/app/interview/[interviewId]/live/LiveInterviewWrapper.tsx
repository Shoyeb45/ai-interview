"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import VoiceChat from "@/components/interview";

export default function LiveInterviewWrapper() {
  return (
    <ProtectedRoute>
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-50">
        <VoiceChat />
      </div>
    </ProtectedRoute>
  );
}
