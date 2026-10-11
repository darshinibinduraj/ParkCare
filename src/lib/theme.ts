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

export function cookieValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

/** A saved choice wins. A cookie is next. Otherwise use the system theme. */
export function resolveTheme(stored: string | null | undefined, current: string | null | undefined, system: ThemeName): ThemeName {
  if (isTheme(stored ?? undefined)) return stored as ThemeName;
  if (isTheme(current ?? undefined)) return current as ThemeName;
  return system;
}

export function resolveTextSize(stored: string | null | undefined, current: string | null | undefined): TextSizeName {
  if (isTextSize(stored ?? undefined)) return stored as TextSizeName;
  if (isTextSize(current ?? undefined)) return current as TextSizeName;
  return "md";
}

export const THEME_BOOT_SCRIPT = `(function(){try{var themes={light:1,dark:1,contrast:1};var sizes={md:1,lg:1,xl:1};function cookie(name){var parts=document.cookie?document.cookie.split("; "):[];for(var i=0;i<parts.length;i++){if(parts[i].indexOf(name+"=")===0)return decodeURIComponent(parts[i].slice(name.length+1));}return "";}var theme=localStorage.getItem("parkcare-theme");if(!themes[theme])theme=cookie("parkcare_theme");if(!themes[theme]){if(window.matchMedia("(prefers-contrast: more)").matches)theme="contrast";else if(window.matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";else theme="light";}var size=localStorage.getItem("parkcare-text-size");if(!sizes[size])size=cookie("parkcare_text");if(!sizes[size])size="md";document.documentElement.dataset.theme=theme;document.documentElement.dataset.textSize=size;localStorage.setItem("parkcare-theme",theme);localStorage.setItem("parkcare-text-size",size);document.cookie="parkcare_theme="+theme+"; path=/; max-age=31536000; samesite=lax";document.cookie="parkcare_text="+size+"; path=/; max-age=31536000; samesite=lax";}catch(e){}})();`;

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
