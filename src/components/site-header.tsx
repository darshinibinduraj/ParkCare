import { HelpDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { PreferenceControls } from "@/components/preferences";
import type { TextSizeName, ThemeName } from "@/lib/theme";

export function SiteHeader({ theme, textSize }: { theme: ThemeName; textSize: TextSizeName }) {
  return (
    <header className="no-print border-b-2 border-line bg-card">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* A normal link loads the page even when the client router drops the request. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl pr-3 text-xl font-bold">
            <LogoMark />
            ParkCare
          </a>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="secondary">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/">Home</a>
            </Button>
            <HelpDialog />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PreferenceControls initialTheme={theme} initialTextSize={textSize} />
        </div>
      </div>
    </header>
  );
}
