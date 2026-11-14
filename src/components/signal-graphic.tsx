"use client";

import { useEffect, useState } from "react";

/**
 * The signal: a radial burst of dashed spokes with a few live channels lit
 * in the accent colour. Decorative only — deterministic so server and client
 * render the same markup.
 */

const CENTER = 200;
const COUNT = 72;
const LEAN = 0.78; // lines per spoke that are "quiet"

function seeded(n: number) {
  // Small deterministic hash: same output on server and client.
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Spoke {
  angle: number;
  inner: number;
  outer: number;
  active: boolean;
  node: boolean;
  width: number;
}

const spokes: Spoke[] = Array.from({ length: COUNT }, (_, i) => {
  const u = seeded(i + 1);
  const v = seeded(i + 57);
  const angle = (i / COUNT) * Math.PI * 2 - Math.PI / 2;
  const inner = 54 + Math.floor(u * 10);
  const outer = 116 + Math.floor(v * 62);
  const active = u > LEAN;
  return {
    angle,
    inner,
    outer,
    active,
    // Only some active spokes carry a node, so it reads as a scan, not a wreath.
    node: active && v > 0.34,
    width: active ? 1.35 : 1,
  };
});

const pt = (a: number, r: number) => [CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r] as const;

export function SignalGraphic({ className = "" }: { className?: string }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(true), []);

  return (
    <svg
      viewBox="0 0 400 400"
      className={`${className} signal-graphic`}
      data-loaded={loaded}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {/* Faint guide rings give the burst a sense of scale. */}
      <g stroke="var(--line)" strokeWidth="1" opacity="0.55">
        <circle cx={CENTER} cy={CENTER} r="196" strokeDasharray="1 9" />
        <circle cx={CENTER} cy={CENTER} r="150" strokeDasharray="1 12" />
      </g>

      <g className="signal-burst">
        {spokes.map((s, i) => {
          const [x1, y1] = pt(s.angle, s.inner);
          const [x2, y2] = pt(s.angle, s.outer);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={s.active ? "var(--accent)" : "var(--line-strong)"}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeDasharray={s.active ? "2 5" : "1.5 7"}
              opacity={s.active ? 0.95 : 0.6}
              className="signal-spoke"
              style={{ animationDelay: `${i * 9}ms` }}
            />
          );
        })}

        {spokes.map((s, i) => {
          if (!s.node) return null;
          const [cx, cy] = pt(s.angle, s.outer + 7);
          return (
            <circle
              key={`n${i}`}
              cx={cx}
              cy={cy}
              r="2.6"
              fill="var(--accent)"
              className="signal-node"
              style={{ animationDelay: `${(i % 11) * 340}ms` }}
            />
          );
        })}
      </g>

      {/* Centre mark: a rounded square with the same filled speech glyph as the logo. */}
      <g className="signal-core">
        <circle cx={CENTER} cy={CENTER} r="34" fill="var(--bg)" stroke="var(--line-strong)" />
        <circle cx={CENTER} cy={CENTER} r="27" fill="var(--accent-soft)" />
        <rect x={CENTER - 9} y={CENTER - 8} width="18" height="14" rx="4.5" fill="var(--accent)" />
        <path d={`M${CENTER - 3} ${CENTER + 6} l0 5 l6 -5 z`} fill="var(--accent)" />
      </g>
    </svg>
  );
}
