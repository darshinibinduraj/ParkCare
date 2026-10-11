"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
  }, []);

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function start() {
    const Ctor = recognitionCtor();
    const textarea = document.getElementById("answer-text");
    if (!Ctor || !(textarea instanceof HTMLTextAreaElement)) {
      setStatus("Voice input is not available in this browser. You can type instead.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
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
      setStatus(interim ? `Hearing: ${interim}` : "Listening. Speak now.");
    };
    recognition.onerror = () => {
      setListening(false);
      setStatus("Voice input stopped. You can type instead.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setStatus("Listening. Speak now.");
    recognition.start();
  }

  if (!supported) {
    return <p>Voice input is not available in this browser. You can type or tap a short answer.</p>;
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="secondary" aria-pressed={listening} onClick={() => (listening ? stop() : start())}>
        {listening ? "Stop listening" : "Tap to speak"}
      </Button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
