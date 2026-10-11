"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { sectionSpeech } from "@/lib/section-speech";

const SPEAK_EVENT = "parkcare-speak";

export function SpeakSection({
  label,
  leading,
  children,
}: {
  label: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  const regionId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(false);
  const startTimer = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function onOther(event: Event) {
      const activeId = (event as CustomEvent<string>).detail;
      if (activeId !== regionId) {
        speakingRef.current = false;
        setSpeaking(false);
      }
    }
    window.addEventListener(SPEAK_EVENT, onOther);
    return () => {
      window.removeEventListener(SPEAK_EVENT, onOther);
      if (startTimer.current !== null) window.clearTimeout(startTimer.current);
      if (speakingRef.current) window.speechSynthesis?.cancel();
    };
  }, [regionId]);

  function stop() {
    speakingRef.current = false;
    setSpeaking(false);
    if (startTimer.current !== null) {
      window.clearTimeout(startTimer.current);
      startTimer.current = null;
    }
    window.speechSynthesis?.cancel();
  }

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) {
      setNotice("Speak is not available in this browser.");
      return;
    }
    if (speakingRef.current) {
      stop();
      return;
    }
    const lines = (regionRef.current?.innerText ?? "").split("\n");
    const text = sectionSpeech(lines);
    if (!text) return;
    synth.cancel();
    window.dispatchEvent(new CustomEvent(SPEAK_EVENT, { detail: regionId }));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    const finish = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speakingRef.current = true;
    setSpeaking(true);
    setNotice("");
    startTimer.current = window.setTimeout(() => {
      startTimer.current = null;
      if (speakingRef.current) synth.speak(utterance);
    }, 60);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {leading}
        <Button
          variant="secondary"
          className="no-print"
          aria-pressed={speaking}
          aria-controls={regionId}
          aria-label={speaking ? `Stop speaking ${label}` : `Speak ${label}`}
          onClick={speak}
        >
          {speaking ? "Stop" : "Speak"}
        </Button>
      </div>
      {notice ? (
        <p className="no-print" role="status">
          {notice}
        </p>
      ) : null}
      <div id={regionId} ref={regionRef} className="grid gap-3">
        {children}
      </div>
    </div>
  );
}
