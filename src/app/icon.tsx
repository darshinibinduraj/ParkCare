import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "32px",
          height: "32px",
          background: "#083538",
          color: "white",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
        }}
      >
        P
      </div>
    ),
    size,
  );
}
