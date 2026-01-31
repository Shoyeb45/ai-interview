"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const PREPARING_MESSAGES = [
  "Preparing interview…",
  "Preparing environment…",
  "Setting up your session…",
  "Loading questions…",
  "Connecting to the interview room…",
  "Almost ready…",
];

const MESSAGE_INTERVAL_MS = 2200;

export default function PreparingInterviewScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PREPARING_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 text-white">
      <div className="flex flex-col items-center gap-8 max-w-sm px-6 text-center">
        <div className="relative">
          <Loader2 className="h-16 w-16 text-blue-400 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-blue-300/80">
            …
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium text-slate-100">
            {PREPARING_MESSAGES[messageIndex]}
          </p>
          <p className="text-sm text-slate-400">
            Please wait. This usually takes a few seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
