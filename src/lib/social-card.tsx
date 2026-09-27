import { ImageResponse } from "next/og";

type SocialCardKind = "home" | "booking";

export const socialCardSize = { width: 1200, height: 630 };

export function socialCard(kind: SocialCardKind) {
  const booking = kind === "booking";

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "54px 64px 50px", borderTop: "7px solid #0b4a35", backgroundColor: "#f7f7f2", color: "#262421", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 66, height: 66, borderRadius: 10, backgroundColor: "#0b4a35" }}>
          <svg width="43" height="43" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 25.5c3.4-8.6 7.2-14 11.5-16.1 2.7-1.3 5.5-1.5 8.5-.5M6.5 25.5h7" stroke="#fbfaf6" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="25.5" cy="9" r="2.5" fill="#fbfaf6" />
          </svg>
        </div>
        <div style={{ fontSize: 33, fontWeight: 700, letterSpacing: "-1.5px" }}>MyDriveLog</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ color: "#0b4a35", fontSize: 18, fontWeight: 700, letterSpacing: "2.4px", marginBottom: 25 }}>
          {booking ? "LESSON BOOKING" : "FOR INDEPENDENT DRIVING INSTRUCTORS"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 80, fontWeight: 700, letterSpacing: "-4px", lineHeight: 1.02 }}>
          <span>{booking ? "Choose a lesson time" : "Keep every lesson"}</span>
          <span style={{ color: "#0b4a35" }}>{booking ? "that works for you." : "on track."}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #d5cfc1", paddingTop: 24, color: "#68645c", fontSize: 24 }}>
        <span>{booking ? "See the times your instructor has shared and book online." : "Availability, bookings, and lesson notes in one place."}</span>
        <div style={{ width: 20, height: 20, backgroundColor: "#ffcc00" }} />
      </div>
    </div>,
    socialCardSize,
  );
}
