"use client";

import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (transcript: string) => void;
}

// Declare SpeechRecognition interface for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onTranscript,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    setTranscript("");
    setErrorMessage(null);
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage(
        "Voice search is not supported in your current browser. Please try Chrome, Edge, or Safari."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[0] && event.results[0].isFinal) {
          const finalResult = event.results[0][0].transcript;
          setIsListening(false);
          setTimeout(() => {
            onTranscript(finalResult);
            onClose();
          }, 400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "no-speech") {
          setErrorMessage("No speech was detected. Please try speaking again.");
        } else if (event.error === "not-allowed") {
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access in browser settings."
          );
        } else if (event.error === "network") {
          setErrorMessage(
            "Voice search requires an active connection to Google Speech API (network error). Check internet or type below."
          );
        } else {
          setErrorMessage(`Voice recognition error (${event.error}). Try typing below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setIsListening(false);
      setErrorMessage("Could not access microphone. Please try typing below.");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setTranscript("");
      setErrorMessage(null);
      return;
    }

    startListening();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    } else {
      startListening();
    }
  };

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isListening
              ? "Listening..."
              : transcript
              ? "Processing..."
              : "Voice Search"}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
          {/* Pulsing Mic Button */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <span className="absolute w-24 h-24 rounded-full bg-red-500/20 animate-ping" />
                <span className="absolute w-32 h-32 rounded-full bg-red-500/10 animate-pulse" />
              </>
            )}
            <button
              onClick={handleMicClick}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                isListening
                  ? "bg-red-600 text-white scale-110 shadow-red-500/50"
                  : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-700"
              }`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 animate-pulse" />
              ) : (
                <MicOff className="w-9 h-9 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Transcript / Instructions / Error Message */}
          <div className="min-h-[50px] w-full flex flex-col items-center justify-center px-2">
            {errorMessage ? (
              <div className="flex flex-col items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900 max-w-sm">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMicClick}
                  className="mt-1 text-xs h-7 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Try Voice Again
                </Button>
              </div>
            ) : transcript ? (
              <p className="text-base font-semibold text-gray-900 dark:text-white capitalize leading-relaxed">
                &ldquo;{transcript}&rdquo;
              </p>
            ) : isListening ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                Say something to search videos...
              </p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Tap microphone to listen again
              </p>
            )}
          </div>

          {/* Fallback Search Bar inside modal */}
          <form onSubmit={handleFallbackSubmit} className="w-full flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Or type search query here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <Button
              type="submit"
              disabled={!transcript.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 rounded-xl"
            >
              Search
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceSearchModal;
