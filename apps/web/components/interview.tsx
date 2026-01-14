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
  const audioRef = useRef<HTMLAudioElement>(null); // Changed to non-null ref
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [...prev.slice(-30), `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
    setTimeout(scrollToBottom, 100);
  };

  const initialiseConnection = async () => {
    try {
      addDebugLog("🚀 Initializing connection...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
          latency: 0,
        },
      });

      addDebugLog("✅ Got microphone access");

      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      addDebugLog(`🎤 Audio settings: ${JSON.stringify(settings)}`);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Add local audio track
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        addDebugLog(`📤 Added local track: ${track.kind}`);
      });

      // Handle incoming audio track (TTS from server)

      pc.ontrack = (event) => {
        addDebugLog(
          `🔊 Received track: ${event.track.kind}, streams: ${event.streams.length}`
        );

        if (event.track.kind === "audio") {
          addDebugLog("🔊 Setting up remote audio playback...");

          const remoteStream =
            event.streams[0] || new MediaStream([event.track]);
          remoteStreamRef.current = remoteStream;

          // Log stream details
          addDebugLog(`Stream ID: ${remoteStream.id}`);
          addDebugLog(`Stream active: ${remoteStream.active}`);
          addDebugLog(`Stream tracks: ${remoteStream.getTracks().length}`);

          // Log track details
          addDebugLog(`Track ID: ${event.track.id}`);
          addDebugLog(`Track state: ${event.track.readyState}`);
          addDebugLog(`Track enabled: ${event.track.enabled}`);
          addDebugLog(`Track muted: ${event.track.muted}`);

          if (!audioRef.current) {
            addDebugLog("❌ Audio ref is null!");
            return;
          }

          // Set srcObject
          audioRef.current.srcObject = remoteStream;
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          audioRef.current.autoplay = true;

          addDebugLog(`🔊 Audio element configured`);
          addDebugLog(
            `  - srcObject set: ${audioRef.current.srcObject !== null}`
          );
          addDebugLog(`  - volume: ${audioRef.current.volume}`);
          addDebugLog(`  - muted: ${audioRef.current.muted}`);
          addDebugLog(`  - autoplay: ${audioRef.current.autoplay}`);

          // Monitor playback
          audioRef.current.onloadedmetadata = () => {
            addDebugLog("✅ Audio metadata loaded");
            addDebugLog(`  - duration: ${audioRef.current?.duration}`);
          };

          audioRef.current.oncanplay = () => {
            addDebugLog("✅ Audio can play");
          };

          audioRef.current.onplay = () => {
            addDebugLog("▶️ Audio started playing");
            setIsAISpeaking(true);
          };

          audioRef.current.onplaying = () => {
            addDebugLog("▶️ Audio is now playing");
          };

          audioRef.current.onpause = () => {
            addDebugLog("⏸️ Audio paused");
            setIsAISpeaking(false);
          };

          audioRef.current.onended = () => {
            addDebugLog("🏁 Audio ended");
            setIsAISpeaking(false);
          };

          audioRef.current.onerror = (e) => {
            const target = e.target as HTMLAudioElement;
            addDebugLog(
              `❌ Audio error: ${target.error?.message || "Unknown error"}`
            );
            addDebugLog(`  - error code: ${target.error?.code}`);
          };

          audioRef.current.onstalled = () => {
            addDebugLog("⚠️ Audio stalled");
          };

          audioRef.current.onsuspend = () => {
            addDebugLog("⚠️ Audio suspended");
          };

          audioRef.current.onwaiting = () => {
            addDebugLog("⏳ Audio waiting for data");
          };

          // Try to play
          addDebugLog("🎬 Attempting to play audio...");
          const playPromise = audioRef.current.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                addDebugLog(
                  "✅ Play promise resolved - audio should be playing"
                );
              })
              .catch((err) => {
                addDebugLog(
                  `❌ Play promise rejected: ${err.name} - ${err.message}`
                );

                if (err.name === "NotAllowedError") {
                  addDebugLog(
                    "💡 Autoplay blocked - waiting for user interaction"
                  );

                  const playOnClick = () => {
                    addDebugLog("👆 User clicked - attempting play again");
                    audioRef.current
                      ?.play()
                      .then(() => addDebugLog("✅ Play successful after click"))
                      .catch((e) =>
                        addDebugLog(`❌ Play still failed: ${e.message}`)
                      );
                    document.removeEventListener("click", playOnClick);
                  };
                  document.addEventListener("click", playOnClick, {
                    once: true,
                  });
                }
              });
          } else {
            addDebugLog("⚠️ Play promise is undefined");
          }

          // Monitor track events
          event.track.onmute = () => addDebugLog("🔇 Track muted");
          event.track.onunmute = () => addDebugLog("🔊 Track unmuted");
          event.track.onended = () => addDebugLog("🛑 Track ended");

          // Check audio context state
          const audioContext = new AudioContext();
          addDebugLog(`🎧 AudioContext state: ${audioContext.state}`);

          if (audioContext.state === "suspended") {
            addDebugLog(
              "⚠️ AudioContext is suspended, attempting to resume..."
            );
            audioContext.resume().then(() => {
              addDebugLog("✅ AudioContext resumed");
            });
          }
        }
      };

      const token = crypto.randomUUID();
      const ws = new WebSocket(`${envVar.webSocketUrl}?token=${token}`);
      pcRef.current = pc;
      wsRef.current = ws;

      ws.onopen = async () => {
        addDebugLog("✅ WebSocket Connected");
        setIsConnected(true);
        setIsListening(true);

        // CRITICAL: Request to receive audio!
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });

        addDebugLog("📝 Created offer");
        await pc.setLocalDescription(offer);

        ws.send(
          JSON.stringify({
            type: offer.type,
            sdp: offer.sdp,
          })
        );

        addDebugLog("📤 Sent offer to server");
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        addDebugLog(`📨 Received: ${data.type}`);

        if (data.type === "answer") {
          addDebugLog("📝 Setting remote description...");
          await pc.setRemoteDescription({
            type: "answer",
            sdp: data.sdp,
          });
          addDebugLog("✅ Remote description set");
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
          setCurrentTranscript("🎯 Processing your speech...");
        }

        if (data.type === "ai_status") {
          addMessage("assistant", "💭 Thinking...");
          setTimeout(() => {
            setMessages((prev) =>
              prev.filter((m) => m.content !== "💭 Thinking...")
            );
          }, 500);
        }

        if (data.type === "interviewer_tip") {
          addMessage("assistant", `💡 ${data.message}`);
        }

        if (data.type === "llm_response") {
          addDebugLog(
            `🤖 Got LLM response: ${data.response.substring(0, 50)}...`
          );
          setMessages((prev) =>
            prev.filter((m) => m.content !== "💭 Thinking...")
          );
          addMessage("assistant", data.response);

          // When AI starts responding, mute the microphone to prevent echo/interruption
          addDebugLog("🔇 AI speaking - muting microphone temporarily");
          setIsAISpeaking(true);

          // Mute mic while AI is speaking
          if (pcRef.current && isListening) {
            pcRef.current.getSenders().forEach((sender) => {
              if (sender.track && sender.track.kind === "audio") {
                sender.track.enabled = false;
              }
            });
            addDebugLog("🎤 Microphone muted during AI response");
          }

          // Estimate AI speaking duration and unmute after
          // Roughly 150 words per minute = 2.5 words per second
          // Estimate duration based on response length
          const wordCount = data.response.split(" ").length;
          const estimatedDuration = (wordCount / 2.5) * 1000; // milliseconds

          addDebugLog(
            `📊 Estimated AI speaking time: ${(
              estimatedDuration / 1000
            ).toFixed(1)}s (${wordCount} words)`
          );

          setTimeout(() => {
            if (pcRef.current && isListening) {
              pcRef.current.getSenders().forEach((sender) => {
                if (sender.track && sender.track.kind === "audio") {
                  sender.track.enabled = true;
                }
              });
              addDebugLog("🎤 Microphone unmuted - AI finished speaking");
            }
            setIsAISpeaking(false);
          }, estimatedDuration + 1000); // Add 1 second buffer
        }

        // Handle user speaking notifications from backend
        if (data.type === "user_speaking") {
          if (data.speaking) {
            addDebugLog("🎤 User started speaking - AI interrupted");
            setIsAISpeaking(false);

            // Ensure mic is enabled when user speaks
            if (pcRef.current) {
              pcRef.current.getSenders().forEach((sender) => {
                if (sender.track && sender.track.kind === "audio") {
                  sender.track.enabled = true;
                }
              });
            }
          } else {
            addDebugLog("🔇 User stopped speaking");
          }
        }

        if (data.type === "ice") {
          await pc.addIceCandidate(data.candidate);
        }
      };

      // Also update the manual microphone toggle to respect AI speaking state:

      const toggleListening = () => {
        if (isAISpeaking) {
          addDebugLog("⚠️ Cannot unmute - AI is speaking");
          return;
        }

        if (isListening) {
          if (pcRef.current) {
            pcRef.current.getSenders().forEach((sender) => {
              if (sender.track) {
                sender.track.enabled = false;
              }
            });
          }
          setIsListening(false);
          addDebugLog("🎤 Microphone muted manually");
        } else {
          if (pcRef.current) {
            pcRef.current.getSenders().forEach((sender) => {
              if (sender.track) {
                sender.track.enabled = true;
              }
            });
          }
          setIsListening(true);
          addDebugLog("🎤 Microphone unmuted manually");
        }
      };

      ws.onerror = (error) => {
        addDebugLog(`❌ WebSocket error: ${error}`);
        setIsConnected(false);
      };

      ws.onclose = () => {
        addDebugLog("🔌 WebSocket closed");
        setIsConnected(false);
        setIsListening(false);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "ice",
              candidate: e.candidate,
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        addDebugLog(`📡 PC state: ${pc.connectionState}`);
        if (pc.connectionState === "connected") {
          addDebugLog("✅ Peer connection established");
        }
      };

      pc.oniceconnectionstatechange = () => {
        addDebugLog(`🧊 ICE state: ${pc.iceConnectionState}`);
      };
    } catch (error) {
      addDebugLog(`❌ Connection error: ${error}`);
      alert("Failed to connect. Please check microphone permissions.");
    }
  };

  const disconnect = () => {
    addDebugLog("🔌 Disconnecting...");

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
    setIsConnected(false);
    setIsListening(false);
    setIsAISpeaking(false);
    setCurrentTranscript("");
  };

  const toggleListening = () => {
    if (isListening) {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.enabled = false;
          }
        });
      }
      setIsListening(false);
      addDebugLog("🎤 Microphone muted");
    } else {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.enabled = true;
          }
        });
      }
      setIsListening(true);
      addDebugLog("🎤 Microphone unmuted");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Hidden audio element for remote audio playback */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Main Chat Area */}
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
                    Connected
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
                        message.role === "user"
                          ? "text-blue-100"
                          : "text-gray-400"
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
                  <p className="whitespace-pre-wrap italic">
                    {currentTranscript}
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Microphone Control */}
        {isConnected && (
          <div className="bg-white border-t px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-center">
              <button
                onClick={toggleListening}
                className={`p-6 rounded-full transition-all transform hover:scale-105 ${
                  isListening
                    ? "bg-blue-500 hover:bg-blue-600 shadow-lg"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 text-white" />
                ) : (
                  <MicOff className="w-8 h-8 text-gray-600" />
                )}
              </button>
              <p className="ml-4 text-gray-600">
                {isListening ? "Listening..." : "Microphone muted"}
              </p>
              {isAISpeaking && (
                <div className="ml-6 flex items-center gap-2 text-blue-600">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-medium">AI speaking...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <div className="w-96 bg-gray-900 text-green-400 font-mono text-xs overflow-y-auto p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 mb-2 border-b border-gray-700">
          <h3 className="text-sm font-bold text-white">Debug Console</h3>
          <p className="text-xs text-gray-500 mt-1">
            Watch for track lifecycle events
          </p>
        </div>
        {debugInfo.map((log, i) => (
          <div key={i} className="mb-1 break-words">
            {log}
          </div>
        ))}
        {debugInfo.length === 0 && (
          <div className="text-gray-600 text-center mt-8">
            No logs yet. Click &quot;Start Chat&quot; to begin.
          </div>
        )}
      </div>
    </div>
  );
}
