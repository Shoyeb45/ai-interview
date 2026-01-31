"use client";
import { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Volume2, Briefcase, Building2, Clock, User } from "lucide-react";
import { envVar } from "@/lib/config";
import { toast } from "sonner";
import type { InterviewContext } from "@/lib/interviewApi";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VoiceChatProps {
  interviewId?: string;
  context?: InterviewContext | null;
}

export default function VoiceChat({ context }: VoiceChatProps = {}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
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

  // Unmute microphone
  const unmuteMicrophone = () => {
    if (pcRef.current && !isAISpeaking) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = true;
        }
      });
      setIsListening(true);
      console.log("🎤 Microphone unmuted");
    }
  };

  // Clear AI speaking state and unmute
  const clearAISpeaking = () => {
    console.log("✅ Clearing AI speaking state");
    
    // Clear any existing timeout
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
      aiSpeakingTimeoutRef.current = null;
    }
    
    setIsAISpeaking(false);
    unmuteMicrophone();
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
        console.log("⏸️ Audio paused (not ended, duration:", audio.duration, "current:", audio.currentTime, ")");
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

  const initialiseConnection = async () => {
    try {
      console.log("🚀 Initializing connection...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      console.log("✅ Got microphone access");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Add local audio track
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log(`🔊 Received track: ${event.track.kind}`);

        if (event.track.kind === "audio") {
          const remoteStream = event.streams[0] || new MediaStream([event.track]);
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
                  audioRef.current?.play()
                    .then(() => console.log("✅ Audio started after user interaction"))
                    .catch((e) => console.error("❌ Play failed:", e));
                  document.removeEventListener("click", playOnClick);
                };
                document.addEventListener("click", playOnClick, { once: true });
              });
          }
        }
      };

      const token = crypto.randomUUID();
      const wsUrl = `${envVar.webSocketUrl}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      pcRef.current = pc;
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("🔌 WebSocket connected");
        setIsConnected(true);
        setIsListening(true);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        ws.send(JSON.stringify({
          type: "offer",
          sdp: offer.sdp,
        }));
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

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
          } else {
            setCurrentTranscript(data.text);
          }
        }

        if (data.type === "processing") {
          setCurrentTranscript("Processing your speech...");
        }

        if (data.type === "ai_status") {
          muteMicrophone();
        }

        if (data.type === "llm_response") {
          setMessages((prev) => prev.filter((m) => m.content !== "💭 Thinking..."));
          addMessage("assistant", data.response);

          // Clear any existing timeout
          if (aiSpeakingTimeoutRef.current) {
            clearTimeout(aiSpeakingTimeoutRef.current);
          }

          // Mute mic immediately when AI starts responding
          muteMicrophone();
          setIsAISpeaking(true);

          // MUCH SHORTER backup timeout - just a safety net
          // Most responses will finish within 10 seconds
          // The audio 'ended' event should fire first in 99% of cases
          const BACKUP_TIMEOUT = 10000; // 10 seconds max
          
          console.log(`⏰ Setting backup timeout: ${BACKUP_TIMEOUT}ms`);

          aiSpeakingTimeoutRef.current = setTimeout(() => {
            console.log("⏰ BACKUP TIMEOUT - force unmuting (audio events may have failed)");
            clearAISpeaking();
          }, BACKUP_TIMEOUT);
        }

        if (data.type === "interviewer_tip") {
          addMessage("assistant", `💡 ${data.message}`);
        }

        if (data.type === "user_speaking") {
          if (data.speaking) {
            console.log("🗣️ User started speaking - interrupting AI");
            
            // Stop AI audio immediately
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            
            clearAISpeaking();
          }
        }

        if (data.type === "ice") {
          await pc.addIceCandidate(data.candidate);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
        toast.error('Failed to start interview.');
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed");
        setIsConnected(false);
        setIsListening(false);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "ice",
            candidate: e.candidate,
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`📡 Connection state: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          console.log("✅ Peer connection established");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.log("❌ Connection failed or disconnected");
        }
      };

    } catch (error) {
      console.error("❌ Connection error:", error);
      alert("Failed to connect. Please check microphone permissions.");
    }
  };

  const disconnect = () => {
    console.log("🔌 Disconnecting...");

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

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsAISpeaking(false);
    setCurrentTranscript("");
  };

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

      <div className="flex-1 flex flex-col">
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
                      <Clock className="h-3.5 w-3.5" />
                      ~{estimatedDuration} min
                      {totalQuestions != null && ` · ${totalQuestions} questions`}
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
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
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

        {/* Conversation area — interview feel */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border border-blue-100 mb-6">
                  <Mic className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Your interview is ready
                </h2>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                  Click &quot;Start interview&quot; and allow microphone access. Speak naturally when the interviewer asks you a question.
                </p>
                <p className="text-slate-400 text-sm mt-6 max-w-md mx-auto">
                  Your mic will mute automatically while the interviewer is speaking to avoid echo.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xl px-4 py-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1.5">
                        {message.role === "user" ? "You" : "Interviewer"}
                      </p>
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-slate-400"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-xl px-4 py-3 rounded-2xl rounded-br-md bg-blue-500/90 text-white">
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-1">
                        You (speaking…)
                      </p>
                      <p className="whitespace-pre-wrap italic text-[15px]">
                        {currentTranscript}
                      </p>
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
                aria-label={isListening ? "Mute microphone" : "Unmute microphone"}
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
                    : isListening
                    ? "You’re live — speak when ready"
                    : "Microphone off — click to unmute"}
                </p>
                {isAISpeaking && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-blue-600 mt-1">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">Listening to response</span>
                  </div>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}