import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * VaultProgress — animated vault-dial icon showing lock progress.
 *
 * States:
 *   - "locked"   : amber→gold gradient arc, sweeping indicator
 *   - "ready"    : full emerald ring, pulsing glow, open vault
 *   - "withdrawn": muted, check mark
 *
 * Color shifts smoothly through progress: amber (0%) → gold (50%) → emerald (95%+)
 */
export default function VaultProgress({
  progress = 0,           // 0..1
  state = "locked",       // "locked" | "ready" | "withdrawn"
  size = 64,
}) {
  const SIZE = size;
  const STROKE = 4;
  const RADIUS = SIZE / 2 - STROKE - 1;
  const CIRC = 2 * Math.PI * RADIUS;
  const center = SIZE / 2;

  // Unique gradient ids so multiple cards don't collide
  const gid = useMemo(() => `vp-${Math.random().toString(36).slice(2, 9)}`, []);

  // Color stops based on progress (locked state)
  const { c1, c2, glow } = useMemo(() => {
    if (state === "withdrawn") return { c1: "#5b6478", c2: "#3b4357", glow: "transparent" };
    if (state === "ready")     return { c1: "#2dd4a8", c2: "#14a988", glow: "rgba(45,212,168,.55)" };
    if (progress < .5) return { c1: "#f5b461", c2: "#e8c379", glow: "rgba(245,180,97,.4)" };
    if (progress < .85) return { c1: "#e8c379", c2: "#d4a951", glow: "rgba(232,195,121,.5)" };
    return { c1: "#d4a951", c2: "#2dd4a8", glow: "rgba(45,212,168,.5)" };
  }, [progress, state]);

  const offset = CIRC * (1 - (state === "ready" || state === "withdrawn" ? 1 : progress));

  // Tick marks around the dial (12 ticks like a clock/safe dial)
  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 2 * Math.PI;
      const r1 = RADIUS - STROKE / 2 - 3;
      const r2 = i % 6 === 0 ? r1 - 4 : r1 - 2; // longer every quarter
      arr.push({
        x1: center + r1 * Math.cos(angle - Math.PI / 2),
        y1: center + r1 * Math.sin(angle - Math.PI / 2),
        x2: center + r2 * Math.cos(angle - Math.PI / 2),
        y2: center + r2 * Math.sin(angle - Math.PI / 2),
        major: i % 6 === 0,
      });
    }
    return arr;
  }, [RADIUS, center]);

  // Indicator dot position on the progress arc
  const indicatorAngle = (state === "ready" ? 1 : progress) * 2 * Math.PI - Math.PI / 2;
  const indicatorX = center + RADIUS * Math.cos(indicatorAngle);
  const indicatorY = center + RADIUS * Math.sin(indicatorAngle);

  const isReady = state === "ready";
  const isWithdrawn = state === "withdrawn";

  return (
    <div
      className="vault-progress"
      style={{
        width: SIZE, height: SIZE,
        position: "relative",
        filter: !isWithdrawn ? `drop-shadow(0 0 8px ${glow})` : "none",
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <radialGradient id={`${gid}-bg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d222d" />
            <stop offset="100%" stopColor="#11141b" />
          </radialGradient>
          <filter id={`${gid}-blur`}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Inner disk (vault face) */}
        <circle
          cx={center} cy={center}
          r={RADIUS - STROKE / 2 - 1}
          fill={`url(#${gid}-bg)`}
          stroke="#232936"
          strokeWidth="1"
        />

        {/* Tick marks */}
        <g stroke={isWithdrawn ? "#3b4357" : "#3b4357"} strokeWidth="1" strokeLinecap="round">
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1}
              x2={t.x2} y2={t.y2}
              opacity={t.major ? .9 : .4}
            />
          ))}
        </g>

        {/* Track ring */}
        <circle
          cx={center} cy={center} r={RADIUS}
          fill="none"
          stroke="#262c39"
          strokeWidth={STROKE}
        />

        {/* Progress arc (rotated so it starts at 12 o'clock) */}
        <motion.circle
          cx={center} cy={center} r={RADIUS}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ filter: !isWithdrawn ? `drop-shadow(0 0 3px ${glow})` : "none" }}
        />

        {/* Indicator dot on edge */}
        {!isWithdrawn && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: .8, type: "spring", stiffness: 500, damping: 25 }}
          >
            <circle cx={indicatorX} cy={indicatorY} r="3.5" fill={c2} opacity=".5" filter={`url(#${gid}-blur)`} />
            <circle cx={indicatorX} cy={indicatorY} r="2.5" fill="#fff" />
            <circle cx={indicatorX} cy={indicatorY} r="1.3" fill={c2} />
          </motion.g>
        )}

        {/* Ready pulse */}
        {isReady && (
          <motion.circle
            cx={center} cy={center} r={RADIUS}
            fill="none"
            stroke={c1}
            strokeWidth={STROKE - 1}
            animate={{
              r: [RADIUS, RADIUS + 6, RADIUS + 12],
              opacity: [.6, .2, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Center icon */}
        <g transform={`translate(${center}, ${center})`} fill="none" stroke={c1} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {isWithdrawn ? (
            // Check mark
            <motion.path
              d="M-6 0l4 4 8-8"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: .5, delay: .3 }}
              strokeWidth="2"
            />
          ) : isReady ? (
            // Open lock
            <g>
              <motion.rect
                x={-6} y={-2} width={12} height={9} rx={1.5}
                fill={`url(#${gid})`}
                fillOpacity=".15"
                initial={{ scale: .8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: .4 }}
              />
              <motion.path
                d="M-3.5 -2v-3.5a3.5 3.5 0 0 1 6.5 -1.8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: .6 }}
              />
              <circle cx={0} cy={2.5} r={1.2} fill={c1} stroke="none" />
            </g>
          ) : (
            // Vault dial / locked vault face
            <g>
              <circle cx={0} cy={0} r={6} fill={`url(#${gid})`} fillOpacity=".1" />
              <circle cx={0} cy={0} r={6} />
              <circle cx={0} cy={0} r={1.6} fill={c1} stroke="none" />
              {/* spokes */}
              <line x1={0} y1={-4} x2={0} y2={-6.5} strokeWidth="1.4" />
              <line x1={0} y1={4} x2={0} y2={6.5} strokeWidth="1.4" />
              <line x1={-4} y1={0} x2={-6.5} y2={0} strokeWidth="1.4" />
              <line x1={4} y1={0} x2={6.5} y2={0} strokeWidth="1.4" />
              {/* rotating handle */}
              <motion.line
                x1={0} y1={0} x2={0} y2={-4.5}
                strokeWidth="1.8"
                stroke="#fff"
                strokeLinecap="round"
                style={{ transformOrigin: "0px 0px" }}
                animate={{ rotate: progress * 360 * 3 + 45 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
