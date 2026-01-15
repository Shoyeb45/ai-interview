"use client";
import { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { envVar } from "@/lib/config";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function VoiceChat() {
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

  // Monitor audio playback to detect when AI actually finishes speaking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log("🔊 AI started speaking (audio playing)");
      setIsAISpeaking(true);
      muteMicrophone();
    };

    const handlePause = () => {
      console.log("⏸️ Audio paused");
      // Only unmute if audio is truly finished, not just paused
      if (audio.ended) {
        setIsAISpeaking(false);
        unmuteMicrophone();
      }
    };

    const handleEnded = () => {
      console.log("✅ AI finished speaking (audio ended)");
      setIsAISpeaking(false);
      unmuteMicrophone();
    };

    const handleError = (e: Event) => {
      console.error("❌ Audio error:", e);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  });

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
                // Set up click handler to start audio
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

        // Create and send offer
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
          // AI is thinking - keep mic muted
          muteMicrophone();
        }

        if (data.type === "llm_response") {
          // Clear any "thinking" messages
          setMessages((prev) => prev.filter((m) => m.content !== "💭 Thinking..."));
          addMessage("assistant", data.response);

          // Clear any existing timeout
          if (aiSpeakingTimeoutRef.current) {
            clearTimeout(aiSpeakingTimeoutRef.current);
          }

          // Mute mic immediately when AI starts responding
          muteMicrophone();
          setIsAISpeaking(true);

          // Backup timeout in case audio events don't fire
          // Calculate based on text length (more conservative estimate)
          const wordCount = data.response.split(/\s+/).length;
          const estimatedDuration = Math.max((wordCount / 2) * 1000, 3000); // At least 3 seconds
          
          console.log(`📊 Estimated AI speaking time: ${(estimatedDuration / 1000).toFixed(1)}s (${wordCount} words)`);

          aiSpeakingTimeoutRef.current = setTimeout(() => {
            console.log("⏰ Backup timeout - unmuting microphone");
            setIsAISpeaking(false);
            unmuteMicrophone();
          }, estimatedDuration + 2000);
        }

        if (data.type === "interviewer_tip") {
          addMessage("assistant", `💡 ${data.message}`);
        }

        if (data.type === "user_speaking") {
          if (data.speaking) {
            console.log("🗣️ User started speaking");
            // Ensure AI audio is stopped when user starts speaking
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
            setIsAISpeaking(false);
            unmuteMicrophone();
          }
        }

        if (data.type === "ice") {
          await pc.addIceCandidate(data.candidate);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
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

    // Clear timeout
    if (aiSpeakingTimeoutRef.current) {
      clearTimeout(aiSpeakingTimeoutRef.current);
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    // Stop remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    // Close audio context
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

  return (
    <div className="flex h-screen bg-gray-50">
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Voice Chat</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isConnected ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Connected - Natural conversation mode
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Not connected
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {!isConnected ? (
                <button
                  onClick={initialiseConnection}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Start Chat
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  End Chat
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Mic className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-gray-500 text-lg">
                  Start speaking to begin the conversation
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Click &quot;Start Chat&quot; and allow microphone access
                </p>
                <p className="text-gray-400 text-xs mt-4 max-w-md mx-auto">
                  💡 The microphone will automatically mute when the AI is speaking to prevent echo
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1 opacity-70">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user" ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {currentTranscript && (
              <div className="flex justify-end">
                <div className="max-w-2xl px-4 py-3 rounded-2xl bg-blue-400 text-white opacity-70">
                  <p className="text-sm font-medium mb-1">You (speaking...)</p>
                  <p className="whitespace-pre-wrap italic">{currentTranscript}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Microphone Control */}
        {isConnected && (
          <div className="bg-white border-t px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-6">
              <button
                onClick={toggleListening}
                disabled={isAISpeaking}
                className={`p-6 rounded-full transition-all transform ${
                  isAISpeaking
                    ? "bg-gray-200 cursor-not-allowed"
                    : isListening
                    ? "bg-blue-500 hover:bg-blue-600 shadow-lg hover:scale-105"
                    : "bg-gray-300 hover:bg-gray-400 hover:scale-105"
                }`}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 text-white" />
                ) : (
                  <MicOff className="w-8 h-8 text-gray-600" />
                )}
              </button>
              
              <div className="flex flex-col gap-1">
                <p className="text-gray-600 font-medium">
                  {isAISpeaking
                    ? "Listening paused - AI is speaking"
                    : isListening
                    ? "Listening..."
                    : "Microphone muted"}
                </p>
                {isAISpeaking && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Volume2 className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-medium">AI is speaking</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}