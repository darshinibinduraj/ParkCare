"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

export function VoiceInput() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const wantListenRef = useRef(false);
  const restartTimer = useRef<number | null>(null);

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => {
      wantListenRef.current = false;
      if (restartTimer.current !== null) window.clearTimeout(restartTimer.current);
      recognitionRef.current?.stop();
    };
  }, []);

  function clearRestart() {
    if (restartTimer.current !== null) {
      window.clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  }

  function resume(recognition: Recognition) {
    if (!wantListenRef.current) return;
    try {
      recognition.start();
      setStatus("Listening. Tap to stop when you are done.");
    } catch {
      restartTimer.current = window.setTimeout(() => resume(recognition), 300);
    }
  }

  function stop() {
    wantListenRef.current = false;
    clearRestart();
    recognitionRef.current?.stop();
    setListening(false);
    setStatus("");
  }

  function start() {
    const Ctor = recognitionCtor();
    const textarea = document.getElementById("answer-text");
    if (!Ctor || !(textarea instanceof HTMLTextAreaElement)) {
      setStatus("Voice input is not available in this browser. You can type instead.");
      return;
    }
    wantListenRef.current = true;
    clearRestart();
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index]?.[0]?.transcript ?? "";
        if (event.results[index]?.isFinal) finalText += piece;
        else interim += piece;
      }
      if (finalText.trim()) {
        const addition = finalText.trim();
        textarea.value = textarea.value.trim() ? `${textarea.value.trim()} ${addition}` : addition;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setStatus(interim ? `Hearing: ${interim}` : "Listening. Tap to stop when you are done.");
    };
    recognition.onerror = (event) => {
      const code = event.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
        wantListenRef.current = false;
        clearRestart();
        setListening(false);
        setStatus(
          code === "audio-capture"
            ? "No microphone was found. You can type instead."
            : "Microphone permission is off. You can type instead.",
        );
      }
    };
    recognition.onend = () => {
      if (!wantListenRef.current) {
        setListening(false);
        return;
      }
      clearRestart();
      restartTimer.current = window.setTimeout(() => resume(recognition), 250);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setStatus("Listening. Tap to stop when you are done.");
    recognition.start();
  }

  if (!supported) {
    return <p>Voice input is not available in this browser. You can type or tap a short answer.</p>;
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="secondary" aria-pressed={listening} onClick={() => (listening ? stop() : start())}>
        {listening ? "Tap to stop" : "Tap to speak"}
      </Button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
