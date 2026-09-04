// ============================================================
// ORB — RENDERER (FALLBACK, no WebGL). Renders the projected 3D graph with native views:
// depth-scaled spheres (gradient + highlight + glow), depth-faded edges, labels, staggered births.
// Preserves composition/positions/scale/depth/motion of the template without a 3D engine.
// ============================================================
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { OrbEdge, OrbNode } from "@/src/orb/orbNodes";
import type { Projected } from "@/src/orb/orbPhysics";
import { ORB, ToneKey } from "@/src/orb/orbTheme";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export type RendererProps = {
  nodes: OrbNode[]; edges: OrbEdge[]; projected: Map<string, Projected>; now: number;
  selectedFamily: string | null; entitlements?: Record<string, any>;
  onNodePress: (n: OrbNode) => void;
};

export function useToneColor() {
  const { colors } = useTheme();
  return (t: ToneKey) => ({ cyan: colors.brandPrimary, green: colors.success, blue: colors.brandSecondary, amber: colors.warning, violet: colors.brandTertiary, red: colors.error }[t]);
}

export function OrbRendererFallback({ nodes, edges, projected, now, selectedFamily, entitlements, onNodePress }: RendererProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const tone = useToneColor();
  const sorted = [...nodes].sort((a, b) => (projected.get(b.id)?.depth ?? 0) - (projected.get(a.id)?.depth ?? 0)); // back → front
  return (
    <View style={s.scene} pointerEvents="box-none">
      {edges.map((e) => {
        const a = projected.get(e.from), b = projected.get(e.to);
        if (!a || !b) return null;
        const dx = b.sx - a.sx, dy = b.sy - a.sy;
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const col = tone(nodes.find((n) => n.id === e.to)?.tone ?? "cyan");
        return <View key={`${e.from}-${e.to}`} pointerEvents="none" style={[s.edge, { left: a.sx, top: a.sy, width: len, backgroundColor: col, opacity: ORB.edgeOpacity * Math.min(a.opacity, b.opacity), transform: [{ translateY: -1 }, { rotate: `${ang}rad` }] }]} />;
      })}
      {sorted.map((n) => {
        const p = projected.get(n.id);
        if (!p) return null;
        const birth = Math.min(1, Math.max(0, (now - n.born) / ORB.expandDuration));
        const pop = birth < 1 ? 0.2 + 1.1 * birth - 0.3 * birth * birth : 1; // brief overshoot like the template's scale-in
        const size = n.radius * 2 * p.scale * pop;
        const col = tone(n.tone);
        const gated = n.capability && entitlements && entitlements[n.capability] === false;
        const dim = selectedFamily && n.kind === "family" && n.id !== selectedFamily;
        const isSel = n.id === selectedFamily;
        return (
          <View key={n.id} pointerEvents="box-none" style={[s.node, { left: p.sx - size / 2, top: p.sy - size / 2, width: size, height: size, opacity: (dim ? 0.35 : 1) * p.opacity * birth, zIndex: Math.round((1 - p.depth) * 100) }]}>
            <View pointerEvents="none" style={[s.glow, { backgroundColor: col, opacity: ORB.glowOpacity * (isSel ? 1.4 : 1) * (1 - p.depth * 0.6), transform: [{ scale: isSel ? 1.9 : 1.5 }] }]} />
            <Pressable testID={n.kind === "family" ? `orb-family-${n.id}` : n.kind === "tool" ? `orb-tool-${n.tool!.key}` : "orb-root-node"} onPress={() => onNodePress(n)} accessibilityLabel={n.label}
              style={[s.sphere, { backgroundColor: gated ? colors.pending : col, borderColor: colors.glassStrong }]}>
              <View pointerEvents="none" style={[s.highlight, { width: size * 0.5, height: size * 0.28, top: size * 0.1, left: size * 0.18 }]} />
              {n.kind !== "root" ? <Ionicons name={(gated ? "lock-closed" : n.icon) as any} size={Math.max(10, size * 0.42)} color={gated ? colors.onPending : colors.onBrandPrimary} /> : <View style={[s.rootCore, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />}
            </Pressable>
            {n.kind !== "root" ? <Text pointerEvents="none" numberOfLines={2} style={[s.label, { opacity: p.opacity, fontSize: Math.max(10, 12 * p.scale), top: size + 4, width: 110, left: size / 2 - 55, color: colors.onSurfaceInverse }]}>{n.label}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  scene: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  edge: { position: "absolute", height: 2, borderRadius: 1, transformOrigin: "left center" as any },
  node: { position: "absolute", alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 999 },
  sphere: { width: "100%", height: "100%", borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden",
    shadowColor: c.surfaceInverse, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  highlight: { position: "absolute", borderRadius: 999, backgroundColor: c.glassStrong, opacity: 0.55 },
  rootCore: { backgroundColor: c.glassStrong, opacity: 0.9 },
  label: { position: "absolute", textAlign: "center", fontFamily: fonts.semibold },
}));
