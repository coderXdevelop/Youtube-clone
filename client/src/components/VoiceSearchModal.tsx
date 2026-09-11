"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Mic, MicOff, X, AlertCircle, Globe, Sparkles, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import axiosInstance from "@/lib/AxiosInstance";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (transcript: string) => void;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
  { code: "es-ES", label: "Spanish (Español)" },
  { code: "fr-FR", label: "French (Français)" },
  { code: "de-DE", label: "German (Deutsch)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
];

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-US");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimText, setInterimText] = useState<string>("");
  const [statusText, setStatusText] = useState<string>("Listening...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<"webspeech" | "whisper">("webspeech");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Audio Context & Visualizer references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Recognition and Recorder references
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all audio streams and animation loops
  const cleanupAudio = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (autoSearchTimerRef.current) {
      clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Visualizer loop rendering animated frequency bars
  const startVisualizer = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 24;
        const barWidth = 3;
        const gap = (canvas.width - barCount * barWidth) / (barCount - 1);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * bufferLength);
          const rawHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.9;
          const barHeight = Math.max(4, rawHeight);

          const x = i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          // Gradient color: Red -> Orange -> Vibrant Red
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, "#ef4444");
          gradient.addColorStop(0.5, "#f97316");
          gradient.addColorStop(1, "#dc2626");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 2, 2]);
          ctx.fill();
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.warn("Audio Visualizer initialization error:", err);
    }
  }, []);

  // Send audio recorded by MediaRecorder to backend Whisper fallback
  const sendAudioToWhisperFallback = async (audioBlob: Blob) => {
    setIsAiProcessing(true);
    setStatusText("Transcribing with Whisper AI...");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice_query.webm");

      const res = await axiosInstance.post("/api/video/voice-transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.success && res.data.text) {
        const resultText = res.data.text.trim();
        setTranscript(resultText);
        setStatusText("Search query detected!");
        setTimeout(() => {
          onTranscript(resultText);
          onClose();
        }, 500);
      } else {
        setErrorMessage("Could not transcribe speech. Please try speaking again or type below.");
      }
    } catch (err: any) {
      console.error("Whisper Fallback STT error:", err);
      setErrorMessage("Voice transcription server unavailable. Please type your query below.");
    } finally {
      setIsAiProcessing(false);
      setIsListening(false);
    }
  };

  // Start Whisper AI Recording Fallback Engine
  const startWhisperAiRecording = async () => {
    cleanupAudio();
    setErrorMessage(null);
    setTranscript("");
    setInterimText("");
    setEngineMode("whisper");
    setStatusText("Listening (Whisper AI mode)...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      startVisualizer(stream);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await sendAudioToWhisperFallback(audioBlob);
        }
      };

      mediaRecorder.start(250);
      setIsListening(true);

      // Auto-stop after 7 seconds max for voice search queries
      silenceTimerRef.current = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 7000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setIsListening(false);
      setErrorMessage("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  // Primary Web Speech API Engine with smart debounce and auto-fallback
  const startWebSpeechListening = useCallback(async () => {
    cleanupAudio();
    setErrorMessage(null);
    setTranscript("");
    setInterimText("");
    setEngineMode("webspeech");
    setStatusText("Listening...");

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.info("Web Speech API not supported. Switching to Whisper AI engine...");
      startWhisperAiRecording();
      return;
    }

    try {
      // Connect visualizer stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      startVisualizer(stream);

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      let finalAccumulated = "";

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText("Listening...");
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const part = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalAccumulated = `${finalAccumulated} ${part}`.trim();
          } else {
            interim += part;
          }
        }

        const currentDisplay = (finalAccumulated ? `${finalAccumulated} ` : "") + interim;
        setTranscript(finalAccumulated || currentDisplay);
        setInterimText(interim);

        // Reset silence timer on speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        const recognizedText = (finalAccumulated || currentDisplay).trim();
        if (recognizedText) {
          setStatusText("Processing...");
          // Wait 1.4 seconds of silence before auto-submitting
          silenceTimerRef.current = setTimeout(() => {
            setIsListening(false);
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (e) {}
            }
            onTranscript(recognizedText);
            onClose();
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Web Speech API event error:", event.error);
        if (event.error === "network" || event.error === "service-not-allowed") {
          // Automatic seamless switch to Whisper AI fallback
          console.log("Switching to Whisper AI recording mode due to Speech API network limitation...");
          startWhisperAiRecording();
        } else if (event.error === "not-allowed") {
          setIsListening(false);
          setErrorMessage("Microphone permission was denied. Please allow microphone access in browser settings.");
        } else if (event.error === "no-speech") {
          // Don't terminate abruptly, prompt user gently
          setStatusText("Didn't catch that. Say something...");
        } else {
          setIsListening(false);
          setErrorMessage(`Voice recognition error (${event.error}). Try again or type below.`);
        }
      };

      recognition.onend = () => {
        if (!finalAccumulated && isListening) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn("Could not start Web Speech, falling back to Whisper AI:", err);
      startWhisperAiRecording();
    }
  }, [selectedLanguage, cleanupAudio, startVisualizer, onTranscript, onClose]);

  // Restart speech engine when modal opens or language changes
  useEffect(() => {
    if (!isOpen) {
      cleanupAudio();
      setIsListening(false);
      setTranscript("");
      setInterimText("");
      setErrorMessage(null);
      return;
    }

    startWebSpeechListening();

    return () => {
      cleanupAudio();
    };
  }, [isOpen, selectedLanguage]);

  const handleMicToggle = () => {
    if (isListening || isAiProcessing) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupAudio();
      setIsListening(false);
      setStatusText("Paused. Tap microphone to speak.");
    } else {
      startWebSpeechListening();
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = (transcript || interimText).trim();
    if (query) {
      cleanupAudio();
      onTranscript(query);
      onClose();
    }
  };

  const activeText = transcript || interimText;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-2xl transition-all overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Voice Search</span>
            </div>
            {engineMode === "whisper" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Whisper AI Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector Dropdown */}
            <div className="relative flex items-center">
              <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer transition-colors"
                title="Select Spoken Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Center Microphone & Visualizer */}
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <span
                  className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <span
                  className="absolute w-36 h-36 rounded-full bg-red-500/10 animate-pulse"
                  style={{ transform: `scale(${1 + Math.min(audioLevel / 80, 0.4)})` }}
                />
              </>
            )}

            <button
              onClick={handleMicToggle}
              disabled={isAiProcessing}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                isAiProcessing
                  ? "bg-indigo-600 text-white animate-pulse"
                  : isListening
                  ? "bg-red-600 text-white scale-105 shadow-red-500/40 hover:scale-110"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {isAiProcessing ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : isListening ? (
                <Mic className="w-10 h-10 animate-pulse" />
              ) : (
                <MicOff className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Real-time Frequency Soundwave Visualizer Canvas */}
          <div className="w-full flex items-center justify-center h-10 px-8">
            {isListening ? (
              <canvas
                ref={canvasRef}
                width={260}
                height={36}
                className="w-full max-w-[260px] h-9 block"
              />
            ) : (
              <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span>Microphone paused</span>
              </div>
            )}
          </div>

          {/* Dynamic Transcript / Status Box */}
          <div className="min-h-[56px] w-full flex flex-col items-center justify-center px-4">
            {errorMessage ? (
              <div className="flex flex-col items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 max-w-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startWebSpeechListening}
                    className="text-xs h-7 gap-1 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try Again
                  </Button>
                  {engineMode === "webspeech" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startWhisperAiRecording}
                      className="text-xs h-7 gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                    >
                      <Sparkles className="w-3 h-3" />
                      Use Whisper AI
                    </Button>
                  )}
                </div>
              </div>
            ) : activeText ? (
              <div className="space-y-1">
                <p className="text-lg font-bold text-zinc-900 dark:text-white capitalize leading-relaxed tracking-tight">
                  &ldquo;{activeText}&rdquo;
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {statusText}
                </p>
              </div>
            ) : isListening ? (
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 animate-pulse">
                {statusText}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Tap microphone to start speaking
              </p>
            )}
          </div>

          {/* Quick Action Search / Direct Edit Form */}
          <form onSubmit={handleManualSearch} className="w-full flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Search or edit query..."
              value={activeText}
              onChange={(e) => {
                setTranscript(e.target.value);
                setInterimText("");
              }}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
            />
            <Button
              type="submit"
              disabled={!activeText.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-red-500/20 cursor-pointer disabled:opacity-50"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceSearchModal;
