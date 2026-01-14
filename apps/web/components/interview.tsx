"use client"
import { useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { envVar } from "@/lib/config";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function VoiceChat() {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const addMessage = (role: 'user' | 'assistant', content: string) => {
        setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
        setTimeout(scrollToBottom, 100);
    };

    const initialiseConnection = async () => {
        try {
            console.log('Initializing connection...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1,
                    // @ts-expect-error - advanced constraints
                    latency: 0,
                    googEchoCancellation: false,
                    googAutoGainControl: false,
                    googNoiseSuppression: false,
                    googHighpassFilter: false
                }
            });

            console.log('Got microphone access');
            
            const audioTrack = stream.getAudioTracks()[0];
            const settings = audioTrack.getSettings();
            console.log('🎤 Audio settings:', settings);

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302"}]
            });
            
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
            
            // get actual token from the localstorage
            const token = crypto.randomUUID();
            const ws = new WebSocket(`${envVar.webSocketUrl}?token=${token}&id=123`);
            pcRef.current = pc;
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log('WebSocket Connected');
                setIsConnected(true);
                setIsListening(true);
                
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                ws.send(JSON.stringify({
                    type: offer.type,
                    sdp: offer.sdp
                }));
            };
            
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                console.log('📨 Received:', data);
                
                if (data.type === 'answer') {
                    await pc.setRemoteDescription({
                        type: 'answer',
                        sdp: data.sdp
                    });
                }

                if (data.type === 'transcript') {
                    console.log('📝 Transcript:', data.text);
                    setCurrentTranscript(data.text);
                    // Add user message when transcript is complete
                    if (data.is_final) {
                        addMessage('user', data.text);
                        setCurrentTranscript("");
                    }
                }

                if (data.type === 'llm_response') {
                    console.log('🤖 LLM Response:', data.response);
                    addMessage('assistant', data.response);
                }

                if (data.type === 'ice') {
                    await pc.addIceCandidate(data.candidate);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
                setIsConnected(false);
                setIsListening(false);
            };

            pc.onicecandidate = (e) => {
                if (e.candidate && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'ice',
                        candidate: e.candidate
                    }));
                }
            };

            pc.onconnectionstatechange = () => {
                console.log('PC state:', pc.connectionState);
            };

        } catch (error) {
            console.error('Connection error:', error);
            alert('Failed to connect. Please check microphone permissions.');
        }
    };

    const disconnect = () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsListening(false);
        setCurrentTranscript("");
    };

    const toggleListening = () => {
        if (isListening) {
            // Mute the microphone
            if (pcRef.current) {
                pcRef.current.getSenders().forEach(sender => {
                    if (sender.track) {
                        sender.track.enabled = false;
                    }
                });
            }
            setIsListening(false);
        } else {
            // Unmute the microphone
            if (pcRef.current) {
                pcRef.current.getSenders().forEach(sender => {
                    if (sender.track) {
                        sender.track.enabled = true;
                    }
                });
            }
            setIsListening(true);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
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
                            <p className="text-gray-500 text-lg">Start speaking to begin the conversation</p>
                            <p className="text-gray-400 text-sm mt-2">Click &quot;Start Chat&quot; and allow microphone access</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-2xl px-4 py-3 rounded-2xl ${
                                        message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white text-gray-800 border border-gray-200'
                                    }`}
                                >
                                    <p className="text-sm font-medium mb-1 opacity-70">
                                        {message.role === 'user' ? 'You' : 'Assistant'}
                                    </p>
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    <p className={`text-xs mt-2 ${
                                        message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                                    }`}>
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {/* Current transcript being spoken */}
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
                    <div className="max-w-4xl mx-auto flex items-center justify-center">
                        <button
                            onClick={toggleListening}
                            className={`p-6 rounded-full transition-all transform hover:scale-105 ${
                                isListening
                                    ? 'bg-blue-500 hover:bg-blue-600 shadow-lg'
                                    : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                        >
                            {isListening ? (
                                <Mic className="w-8 h-8 text-white" />
                            ) : (
                                <MicOff className="w-8 h-8 text-gray-600" />
                            )}
                        </button>
                        <p className="ml-4 text-gray-600">
                            {isListening ? 'Listening...' : 'Microphone muted'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}