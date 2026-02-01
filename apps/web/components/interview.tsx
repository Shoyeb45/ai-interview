"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  Briefcase,
  Building2,
  Clock,
  User,
  AlertTriangle,
} from "lucide-react";
import { envVar } from "@/lib/config";
import { toast } from "sonner";
import type { InterviewContext } from "@/lib/interviewApi";
import apiClient from "@/lib/apiClient";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VoiceChatProps {
  context?: InterviewContext | null;
}

const TAB_CHANGE_WARNING_THRESHOLD = 2; // Warn at 2, end at 3

export default function VoiceChat({ context }: VoiceChatProps = {}) {
  const router = useRouter();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [proctoringWarning, setProctoringWarning] = useState<string | null>(
    null,
  );
  const [interviewEndedByProctoring, setInterviewEndedByProctoring] =
    useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
    setTimeout(scrollToBottom, 100);
  };

  // Mute microphone
  const muteMicrophone = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = false;
        }
      });
    }
    setIsListening(false);
    console.log("🔇 Microphone muted");
  };

  // Unmute microphone (forceUnmute = true when backend says AI/user finished, so we don't rely on stale state)
  const unmuteMicrophone = (forceUnmute = false) => {
    if (!pcRef.current) return;
    if (!forceUnmute && isAISpeaking) return;
    pcRef.current.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === "audio") {
        sender.track.enabled = true;
      }
    });
    setIsListening(true);
    console.log("🎤 Microphone unmuted");
  };

  // Clear AI speaking state and unmute (backend-driven; force unmute so we don't depend on stale isAISpeaking)
  const clearAISpeaking = () => {
    console.log("✅ Clearing AI speaking state");

    // Clear any existing timeout
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
      aiSpeakingTimeoutRef.current = null;
    }

    setIsAISpeaking(false);
    unmuteMicrophone(true);
  };

  // Monitor audio playback (listeners use clearAISpeaking; intentionally run once on mount)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log("🔊 AI started speaking (audio playing)");
      setIsAISpeaking(true);
      muteMicrophone();
    };

    const handleEnded = () => {
      console.log("✅ AI finished speaking (audio ended)");
      clearAISpeaking();
    };

    const handlePause = () => {
      // Only consider it "ended" if the audio has actually finished
      // This prevents premature unmuting during brief pauses
      if (audio.ended || audio.currentTime === audio.duration) {
        console.log("✅ Audio paused at end");
        clearAISpeaking();
      } else {
        console.log(
          "⏸️ Audio paused (not ended, duration:",
          audio.duration,
          "current:",
          audio.currentTime,
          ")",
        );
      }
    };

    const handleTimeUpdate = () => {
      // Check if we're near the end (within 100ms)
      if (audio.duration > 0 && audio.duration - audio.currentTime < 0.1) {
        console.log("✅ Audio near end, preparing to unmute");
      }
    };

    const handleError = (e: Event) => {
      console.error("❌ Audio error:", e);
      clearAISpeaking();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audio listeners; clearAISpeaking is stable enough
  }, []);

  // Proctoring: detect tab change and fullscreen exit
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden || !isConnected || interviewEndedByProctoring)
        return;
      const count = tabChangeCount + 1;
      setTabChangeCount(count);
      if (count >= TAB_CHANGE_WARNING_THRESHOLD) {
        setProctoringWarning(
          count >= 3
            ? "You have exceeded the tab change limit. Interview will end."
            : `Warning: Tab change detected (${count}/3). One more will end the interview.`,
        );
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "proctoring_event", eventType: "tab_change" }),
        );
      }
    };

    const handleFullscreenChange = () => {
      if (
        !document.fullscreenElement &&
        isConnected &&
        !interviewEndedByProctoring
      ) {
        toast.warning(
          "Please return to fullscreen. The interview requires fullscreen mode.",
        );
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isConnected, interviewEndedByProctoring, tabChangeCount]);

  // Set video srcObject when connected and stream is available (video element renders only when isConnected)
  useEffect(() => {
    if (!isConnected || !localStreamRef.current || !videoPreviewRef.current) return;
    const videoEl = videoPreviewRef.current;
    const stream = localStreamRef.current;
    videoEl.srcObject = stream;
    return () => {
      videoEl.srcObject = null;
    };
  }, [isConnected]);

  const initialiseConnection = async () => {
    try {
      if (!context?.sessionId) {
        toast.error(
          "Missing session. Please start the interview from the interview page.",
        );
        return;
      }

      console.log("🚀 Initializing connection...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 },
        },
      });

      localStreamRef.current = stream;
      console.log("✅ Got microphone and camera access");

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: `turn:ws.itshemant.me:3478`,
            username: "webrtc",
            credential: "strongpassword",
          },
        ],
      });

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log(`🔊 Received track: ${event.track.kind}`);

        if (event.track.kind === "audio") {
          const remoteStream =
            event.streams[0] || new MediaStream([event.track]);
          remoteStreamRef.current = remoteStream;

          if (!audioRef.current) {
            console.error("❌ Audio ref is null!");
            return;
          }

          // Create AudioContext for better control
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }

          // Set up audio element
          audioRef.current.srcObject = remoteStream;
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          audioRef.current.autoplay = true;

          // Resume AudioContext if suspended
          if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().then(() => {
              console.log("✅ AudioContext resumed");
            });
          }

          // Attempt to play
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("✅ Audio playback started");
              })
              .catch((err) => {
                console.log(`⚠️ Autoplay blocked: ${err.message}`);
                const playOnClick = () => {
                  audioRef.current
                    ?.play()
                    .then(() =>
                      console.log("✅ Audio started after user interaction"),
                    )
                    .catch((e) => console.error("❌ Play failed:", e));
                  document.removeEventListener("click", playOnClick);
                };
                document.addEventListener("click", playOnClick, { once: true });
              });
          }
        }
      };

      const token = apiClient.getAccessToken();
      const wsUrl = `${envVar.webSocketUrl}?token=${token}&&sessionId=${context?.sessionId}`;
      const ws = new WebSocket(wsUrl);

      pcRef.current = pc;
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("🔌 WebSocket connected");
        setIsConnected(true);
        setIsListening(true);
        setProctoringWarning(null);
        setTabChangeCount(0);

        // Request fullscreen for proctoring
        try {
          const elem = document.documentElement;
          if (!document.fullscreenElement) {
            await elem.requestFullscreen();
          }
        } catch (e) {
          console.warn("Fullscreen request failed:", e);
          toast.error(
            "Please switch to fullscreen for a fair interview experience.",
          );
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        ws.send(
          JSON.stringify({
            type: "offer",
            sdp: offer.sdp,
          }),
        );
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "interview_ended") {
          console.log("✅ Interview completed successfully");
          toast.success("Interview completed! Redirecting...");
          setTimeout(() => {
            disconnect();
            const redirectUrl = `/interview/thank-you${context?.sessionId ? `?sessionId=${context.sessionId}` : ""}`;
            router.push(redirectUrl);
          }, 2000);
          return;
        }

        if (data.type === "interview_cheated") {
          setInterviewEndedByProctoring(true);
          toast.error(
            data.reason || "Interview ended due to proctoring violation.",
          );
          disconnect();
          return;
        }

        if (data.type === "error") {
          const code = data.code || "UNKNOWN";
          const message =
            data.message || "Something went wrong. Please try again.";
          if (code === "MISSING_CREDENTIALS") {
            toast.error(
              "Missing credentials. Please start the interview from the interview page.",
            );
          } else if (code === "FORBIDDEN") {
            toast.error("Access denied. Please sign in again.");
          } else if (code === "SESSION_EXPIRED") {
            toast.error(
              "Session expired or invalid. Please start the interview again.",
            );
          } else {
            toast.error(message);
          }
          disconnect();
          return;
        }

        if (data.type === "answer") {
          await pc.setRemoteDescription({
            type: "answer",
            sdp: data.sdp,
          });
          console.log("✅ Remote description set");
        }

        if (data.type === "transcript") {
          if (data.is_final) {
            addMessage("user", data.text);
            setCurrentTranscript("");
            setIsAnalyzing(false);
          } else {
            setCurrentTranscript(data.text);
          }
        }

        if (data.type === "processing") {
          const status =
            data.status === "analyzing" ? "analyzing" : data.status;
          setCurrentTranscript(
            status === "analyzing" ? "Analyzing your answer…" : "Processing…",
          );
          setIsAnalyzing(true);
        }

        if (data.type === "ai_status") {
          muteMicrophone();
        }

        // Backend is source of truth for mic: mute when AI speaking, unmute when AI finished
        if (data.type === "ai_speaking") {
          if (data.speaking) {
            console.log("🔊 Backend: AI speaking — muting mic");
            muteMicrophone();
            setIsAISpeaking(true);
            setIsAnalyzing(false);
            // Resume audio element if it was paused (e.g. after user interrupted); otherwise second TTS is silent
            if (audioRef.current?.paused) {
              audioRef.current.play().catch(() => {});
            }
            if (aiSpeakingTimeoutRef.current) {
              clearTimeout(aiSpeakingTimeoutRef.current);
              aiSpeakingTimeoutRef.current = null;
            }
            const BACKUP_TIMEOUT = 15000;
            aiSpeakingTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Backup timeout — force unmuting");
              clearAISpeaking();
            }, BACKUP_TIMEOUT);
          } else {
            console.log("🔇 Backend: AI finished — unmuting mic");
            clearAISpeaking();
          }
        }

        if (data.type === "llm_response") {
          setMessages((prev) =>
            prev.filter((m) => m.content !== "💭 Thinking..."),
          );
          addMessage("assistant", data.response);
          setIsAnalyzing(false);
          // Mic and isAISpeaking are driven by ai_speaking; only set backup timeout if not already set
          if (!aiSpeakingTimeoutRef.current) {
            muteMicrophone();
            setIsAISpeaking(true);
            aiSpeakingTimeoutRef.current = setTimeout(() => {
              console.log(
                "⏰ Backup timeout (no ai_speaking) — force unmuting",
              );
              clearAISpeaking();
            }, 15000);
          }
        }

        if (data.type === "interviewer_tip") {
          addMessage("assistant", `💡 ${data.message}`);
        }

        // User started/stopped speaking — drive mic from backend so it turns off at the right time
        if (data.type === "user_speaking") {
          if (data.speaking) {
            console.log("🗣️ Backend: user started speaking");
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            clearAISpeaking();
            setIsAnalyzing(false);
          } else {
            console.log(
              "🔇 Backend: user stopped speaking — muting mic (analyzing)",
            );
            muteMicrophone();
            setIsAnalyzing(true);
          }
        }

        if (data.type === "ice") {
          await pc.addIceCandidate(data.candidate);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
        toast.error("Failed to start interview.");
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed");
        setIsConnected(false);
        setIsListening(false);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "ice",
              candidate: e.candidate,
            }),
          );
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`📡 Connection state: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          console.log("✅ Peer connection established");
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          console.log("❌ Connection failed or disconnected");
        }
      };
    } catch (error) {
      console.error("❌ Connection error:", error);
      alert("Failed to connect. Please check microphone permissions.");
    }
  };

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting...");

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsAISpeaking(false);
    setIsAnalyzing(false);
    setCurrentTranscript("");
  }, []);

  const toggleListening = () => {
    if (isAISpeaking) {
      console.log("⚠️ Cannot toggle microphone - AI is speaking");
      return;
    }

    if (isListening) {
      muteMicrophone();
    } else {
      unmuteMicrophone();
    }
  };

  const title = context?.title ?? "Interview";
  const role = context?.role;
  const companyName = context?.companyName;
  const hiringManagerName = context?.hiringManagerName;
  const totalQuestions = context?.totalQuestions;
  const estimatedDuration = context?.estimatedDuration;
  const focusAreas = context?.focusAreas ?? [];

  return (
    <div className="flex h-full min-h-screen w-full bg-slate-50">
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {interviewEndedByProctoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-4 max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto h-14 w-14 text-amber-500" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Interview Ended
            </h2>
            <p className="mt-2 text-slate-600">
              The interview was terminated due to proctoring violations
              (multiple tab changes).
            </p>
            <button
              onClick={() => router.push("/interview")}
              className="mt-6 rounded-lg bg-slate-800 px-6 py-2.5 font-medium text-white hover:bg-slate-900"
            >
              Return to interviews
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Proctoring warning banner */}
        {proctoringWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{proctoringWarning}</span>
          </div>
        )}

        {/* Interview header: title, role, context from previous page */}
        <header className="bg-white border-b border-slate-200/80 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                  {title}
                </h1>
                {role && (
                  <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{role}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {companyName && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {companyName}
                    </span>
                  )}
                  {hiringManagerName && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {hiringManagerName}
                    </span>
                  )}
                  {estimatedDuration != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />~{estimatedDuration} min
                      {totalQuestions != null &&
                        ` · ${totalQuestions} questions`}
                    </span>
                  )}
                  {focusAreas.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {focusAreas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {area}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  {isConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-600 font-medium">Live</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-slate-500">Not connected</span>
                    </>
                  )}
                </div>
                {!isConnected ? (
                  <button
                    onClick={initialiseConnection}
                    disabled={!context?.sessionId}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start interview
                  </button>
                ) : (
                  <button
                    onClick={disconnect}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    End interview
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content: conversation area (video is fixed in corner) */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Video preview — fixed in top-right, always visible when connected */}
          {isConnected && (
            <div className="fixed top-20 right-4 z-30 w-44 h-[132px] rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shadow-lg ring-2 ring-slate-200/50">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded bg-black/60 text-xs text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Recording
              </div>
            </div>
          )}
          {/* Conversation area — leave right padding for video */}
          <div className={`max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full ${isConnected ? "pr-52" : ""}`}>
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border border-blue-100 mb-6">
                  <Mic className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Your interview is ready
                </h2>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                  Click &quot;Start interview&quot; and allow microphone access.
                  Speak naturally when the interviewer asks you a question.
                </p>
                <p className="text-slate-400 text-sm mt-6 max-w-md mx-auto">
                  Your mic will mute automatically while the interviewer is
                  speaking to avoid echo.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xl rounded-xl border ${
                        message.role === "user"
                          ? "bg-blue-600 text-white border-blue-500/30 shadow-md"
                          : "bg-white text-slate-800 border-slate-200 shadow-sm"
                      } overflow-hidden`}
                    >
                      <div className="px-4 py-2.5 border-b border-inherit/20 flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                          {message.role === "user" ? "You" : "Interviewer"}
                        </span>
                        <time
                          className={`text-xs tabular-nums ${
                            message.role === "user"
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                          dateTime={message.timestamp.toISOString()}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </time>
                      </div>
                      <div className="px-4 py-3">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-xl rounded-xl border border-blue-400/40 bg-blue-500/90 text-white shadow-md overflow-hidden">
                      <div className="px-4 py-2 border-b border-white/20">
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                          You (speaking…)
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="whitespace-pre-wrap italic text-[15px]">
                          {currentTranscript}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Microphone control — fixed at bottom when connected */}
        {isConnected && (
          <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-5">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <button
                onClick={toggleListening}
                disabled={isAISpeaking}
                className={`p-5 rounded-full transition-all duration-200 ${
                  isAISpeaking
                    ? "bg-slate-200 cursor-not-allowed"
                    : isListening
                      ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:scale-105"
                      : "bg-slate-200 hover:bg-slate-300 hover:scale-105"
                }`}
                aria-label={
                  isListening ? "Mute microphone" : "Unmute microphone"
                }
              >
                {isListening ? (
                  <Mic className="w-8 h-8 text-white" />
                ) : (
                  <MicOff className="w-8 h-8 text-slate-600" />
                )}
              </button>
              <div className="text-center sm:text-left">
                <p className="text-slate-700 font-medium">
                  {isAISpeaking
                    ? "Interviewer is speaking…"
                    : isAnalyzing
                      ? "Analyzing your answer…"
                      : isListening
                        ? "You’re live — speak when ready"
                        : "Microphone off — click to unmute"}
                </p>
                {isAISpeaking && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-600 mt-1">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">
                      Listening to response
                    </span>
                  </div>
                )}
                {isAnalyzing && !isAISpeaking && (
                  <p className="text-amber-600 text-sm mt-1">
                    We&apos;ll respond in a moment
                  </p>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
