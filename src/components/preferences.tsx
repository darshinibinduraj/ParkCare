"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TEXT_SIZES,
  TEXT_SIZE_LABEL,
  THEMES,
  applyPreferences,
  isTextSize,
  isTheme,
  preferredTheme,
  type TextSizeName,
  type ThemeName,
} from "@/lib/theme";

const THEME_LABEL: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  contrast: "Contrast",
};

export function PreferenceControls() {
  const [theme, setTheme] = useState<ThemeName>("light");
  const [textSize, setTextSize] = useState<TextSizeName>("md");

  useEffect(() => {
    const storedTheme = localStorage.getItem("parkcare-theme") ?? undefined;
    const storedSize = localStorage.getItem("parkcare-text-size") ?? undefined;
    const nextTheme = isTheme(storedTheme) ? storedTheme : preferredTheme();
    const nextSize = isTextSize(storedSize) ? storedSize : "md";
    setTheme(nextTheme);
    setTextSize(nextSize);
    applyPreferences(nextTheme, nextSize, false);
    void fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: nextTheme, textSize: nextSize }),
    });
  }, []);

  function chooseTheme(next: ThemeName) {
    setTheme(next);
    applyPreferences(next, textSize, true);
    void fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: next, textSize }),
    });
  }

  function chooseSize(next: TextSizeName) {
    setTextSize(next);
    applyPreferences(theme, next, true);
    void fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme, textSize: next }),
    });
  }

  return (
    <>
      <div role="group" aria-label="Text size" className="flex flex-wrap gap-4">
        {TEXT_SIZES.map((size) => (
          <Button
            key={size}
            variant={textSize === size ? "primary" : "secondary"}
            aria-pressed={textSize === size}
            onClick={() => chooseSize(size)}
            style={{ fontSize: size === "md" ? "20px" : size === "lg" ? "24px" : "28px" }}
          >
            A<span className="sr-only">, {TEXT_SIZE_LABEL[size]}</span>
          </Button>
        ))}
      </div>
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-4">
        {THEMES.map((item) => (
          <Button
            key={item}
            className="px-3"
            variant={theme === item ? "primary" : "secondary"}
            aria-pressed={theme === item}
            onClick={() => chooseTheme(item)}
          >
            {THEME_LABEL[item]}
          </Button>
        ))}
      </div>
    </>
  );
}
