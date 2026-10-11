import Link from "next/link";
import { DISCLAIMER } from "@/lib/copy";

const links = [
  { href: "/intake", label: "Start" },
  { href: "/demo", label: "Example stories" },
  { href: "/about", label: "How it works" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t-2 border-line bg-card">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6">
        <p className="max-w-measure">{DISCLAIMER}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-14 items-center underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
