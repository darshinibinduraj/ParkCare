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
