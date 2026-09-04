// ============================================================
// ORB — RENDERER (HIGH, WebGL). Capability gate + slot for a Three.js/expo-gl implementation.
// Status: NOT AVAILABLE in this build (documented in SENTINEL_IMPLEMENTATION_GAPS). The scene state
// (nodes, edges, camera) is renderer-agnostic, so a GL renderer only needs to implement RendererProps.
// ============================================================
import React from "react";

import { OrbRendererFallback, RendererProps } from "@/src/orb/OrbRendererFallback";

export function isHighRendererAvailable(): boolean {
  // Three.js + expo-gl not bundled in this build. Flip to true once `expo-gl`/`three` are integrated.
  return false;
}

export function OrbRendererHigh(props: RendererProps) {
  // Never render a half-implemented GL scene: use the faithful fallback.
  return <OrbRendererFallback {...props} />;
}
