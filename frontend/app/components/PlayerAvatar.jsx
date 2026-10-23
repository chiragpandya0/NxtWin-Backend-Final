"use client";
import { useState } from "react";

// Stable colour per team/player so every card for a club looks consistent.
const hueFor = (s = "") => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Shows the player's image when one is set, otherwise a generated team-coloured avatar.
export default function PlayerAvatar({ name, team, imageUrl, size = 48, className = "" }) {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(team || name);
  const style = { width: size, height: size, minWidth: size };

  if (imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        style={style}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`rounded-full object-cover border border-white/15 ${className}`}
      />
    );
  }
  return (
    <div
      aria-label={name}
      style={{
        ...style,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 65% 38%), hsl(${(hue + 40) % 360} 70% 24%))`,
      }}
      className={`rounded-full flex items-center justify-center font-semibold text-white/95 border border-white/15 ${className}`}
    >
      {initials(name)}
    </div>
  );
}
