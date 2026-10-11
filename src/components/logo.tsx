import Image from "next/image";

export function LogoMark() {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={320}
      height={297}
      sizes="256px"
      className="size-14 shrink-0 rounded-2xl bg-white object-contain p-0.5"
    />
  );
}

export function LogoLockup() {
  return (
    <Image
      src="/logo-lockup.png"
      alt="ParkCare. Personalized Support. A Brighter Tomorrow. For Parkinson's."
      width={949}
      height={854}
      priority
      className="h-auto w-full max-w-sm rounded-2xl bg-white p-3"
    />
  );
}
