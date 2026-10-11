export const THEMES = ["light", "dark", "contrast"] as const;
export const TEXT_SIZES = ["md", "lg", "xl"] as const;

export type ThemeName = (typeof THEMES)[number];
export type TextSizeName = (typeof TEXT_SIZES)[number];

export const TEXT_SIZE_LABEL: Record<TextSizeName, string> = {
  md: "Text size 20 pixels",
  lg: "Text size 24 pixels",
  xl: "Text size 28 pixels",
};

export function isTheme(value: string | undefined): value is ThemeName {
  return value === "light" || value === "dark" || value === "contrast";
}

export function isTextSize(value: string | undefined): value is TextSizeName {
  return value === "md" || value === "lg" || value === "xl";
}

export const THEME_BOOT_SCRIPT = `(function(){try{var theme=localStorage.getItem("parkcare-theme");var size=localStorage.getItem("parkcare-text-size")||"md";if(!theme){if(window.matchMedia("(prefers-contrast: more)").matches)theme="contrast";else if(window.matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";else theme="light";}document.documentElement.dataset.theme=theme;document.documentElement.dataset.textSize=size;}catch(e){}})();`;

export function preferredTheme(): ThemeName {
  if (window.matchMedia("(prefers-contrast: more)").matches) return "contrast";
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function applyPreferences(theme: ThemeName, textSize: TextSizeName, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.textSize = textSize;
  if (!persist) return;
  localStorage.setItem("parkcare-theme", theme);
  localStorage.setItem("parkcare-text-size", textSize);
  document.cookie = `parkcare_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `parkcare_text=${textSize}; path=/; max-age=31536000; samesite=lax`;
}
