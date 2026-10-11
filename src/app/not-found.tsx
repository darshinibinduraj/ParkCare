import Link from "next/link";
import { MainColumn } from "@/components/main-column";

export default function NotFound() {
  return (
    <MainColumn className="grid gap-4">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p>That page is not part of ParkCare.</p>
      <Link className="inline-flex min-h-14 items-center underline" href="/">
        Go to the home page
      </Link>
    </MainColumn>
  );
}
