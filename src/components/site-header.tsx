import Link from "next/link";
import { HelpDialog } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { PreferenceControls } from "@/components/preferences";
import type { TextSizeName, ThemeName } from "@/lib/theme";

export function SiteHeader({ theme, textSize }: { theme: ThemeName; textSize: TextSizeName }) {
  return (
    <header className="no-print border-b-2 border-line bg-card">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-[56px] items-center gap-3 rounded-2xl pr-3 text-xl font-bold">
            <Logo />
            ParkCare
          </Link>
          <HelpDialog />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PreferenceControls initialTheme={theme} initialTextSize={textSize} />
        </div>
      </div>
    </header>
  );
}
