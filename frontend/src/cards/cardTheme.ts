// ============================================================
// CARDS — THEME CONSTANTS (from remix-pulse-engine-card: 1200px perspective, 0.8s flip cubic-bezier(0.4,0,0.2,1),
// tilt easing 0.12, header left brand / right mono code, divider, status label, footer timer + signal bars + freq)
// ============================================================
export const CARD = {
  perspective: 1200,
  flipDurationMs: 800,
  tiltGain: 0.12, // pointer tilt follow factor
  tiltMaxDeg: 7,
  radius: 22,
  padding: 22,
  aspect: 0.62, // height / width (template card ≈ 760×470)
  shineHeight: 150,
  barCount: 24,
  barMinScale: 0.15,
  signalBars: 4,
  monoFont: "SpaceMono",
  accentOpacity: 0.16,
};
