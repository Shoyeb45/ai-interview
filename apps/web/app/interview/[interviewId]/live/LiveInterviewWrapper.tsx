"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import VoiceChat from "@/components/interview";

export default function LiveInterviewWrapper() {
  return (
    <ProtectedRoute>
      <VoiceChat />
    </ProtectedRoute>
  );
}
