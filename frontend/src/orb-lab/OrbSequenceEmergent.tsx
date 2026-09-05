// SENTINEL ORB SEQUENCE LAB
// Uses Emergent's real ORB_FAMILIES data, OrbRendererFallback, theme tones, node rendering,
// and the original draggable/inertial closed-orb gesture physics. Only the navigation
// choreography is changed: concentric orbit -> needle alignment -> tool orbit -> compact trail/card.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ORB_FAMILIES, type OrbFamily, type OrbTool } from "@/src/copy";
import { haptic } from "@/src/orb/orbInteractions";
import type { OrbNode } from "@/src/orb/orbNodes";
import type { Projected } from "@/src/orb/orbPhysics";
import { OrbRendererFallback } from "@/src/orb/OrbRendererFallback";
import { ORB, type ToneKey } from "@/src/orb/orbTheme";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Mode = "closed" | "families" | "tools" | "result";

type Props = {
  onTool?: (family: OrbFamily, tool: OrbTool) => void;
  entitlements?: Record<string, any>;
};

const SPIN_MS = 920;
const ALIGN_MS = 560;
const FAMILY_RADIUS = 150;
const TOOL_RADIUS = 242;
const NEEDLE_GAP = 26;

function norm360(v: number) {
  const n = v % 360;
  return n < 0 ? n + 360 : n;
}

function clockwiseTarget(current: number, desired: number) {
  const now = norm360(current);
  const want = norm360(desired);
  let delta = norm360(want - now);
  if (delta < 4) delta += 360;
  return current + delta;
}

function topIndex(angle: number, count: number) {
  if (!count) return 0;
  const step = 360 / count;
  return Math.round(norm360(-angle) / step) % count;
}

function RadioWave({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800 }), -1, false));
    return () => cancelAnimation(p);
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.18, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.84, 1.2]) }],
  }));
  return <Animated.View pointerEvents="none" style={[stylesStatic.wave, style]} />;
}

export function OrbSequenceEmergent({ onTool, entitlements }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();

  const [mode, setMode] = useState<Mode>("closed");
  const [familyAngle, setFamilyAngle] = useState(0);
  const [toolAngle, setToolAngle] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<OrbFamily | null>(null);
  const [selectedTool, setSelectedTool] = useState<OrbTool | null>(null);
  const [animating, setAnimating] = useState(false);
  const raf = useRef<number | null>(null);

  // Emergent closed-orb drag physics, kept intact: spring on grab + withDecay inertia + edge clamp.
  const assemblySize = Math.min(width, height) * 0.82;
  const minX = -width * 0.28;
  const maxX = width * 0.28;
  const minY = -height * 0.22;
  const maxY = height * 0.22;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(Math.max(0.72, scale.value * 1.025));
      runOnJS(haptic)("light");
    })
    .onChange((e) => {
      tx.value = Math.min(maxX, Math.max(minX, tx.value + e.changeX));
      ty.value = Math.min(maxY, Math.max(minY, ty.value + e.changeY));
    })
    .onEnd((e) => {
      scale.value = withSpring(Math.min(1.42, Math.max(0.72, scale.value / 1.025)));
      tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.996, clamp: [minX, maxX] });
      ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.996, clamp: [minY, maxY] });
    });

  const pinch = Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate((e) => { scale.value = Math.min(1.42, Math.max(0.72, startScale.value * e.scale)); });

  const moveGesture = Gesture.Simultaneous(pan, pinch);
  const assemblyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  const animateAngle = useCallback((from: number, to: number, duration: number, onFrame: (v: number) => void, done: () => void) => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    const started = Date.now();
    setAnimating(true);
    const step = () => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      onFrame(value);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        raf.current = null;
        setAnimating(false);
        done();
      }
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const familyNodes = useMemo<OrbNode[]>(() => ORB_FAMILIES.map((f, i) => ({
    id: f.key,
    kind: "family",
    label: f.label,
    icon: f.icon,
    tone: ((previewId === f.key || selectedFamily?.key === f.key) ? "blue" : f.tone) as ToneKey,
    parent: "root",
    family: f,
    ax: 0, ay: 0, az: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    radius: ORB.familyNodeRadius,
    born: 0,
  })), [previewId, selectedFamily]);

  const toolNodes = useMemo<OrbNode[]>(() => {
    if (!selectedFamily) return [];
    return selectedFamily.tools.map((t) => ({
      id: `${selectedFamily.key}:${t.key}`,
      kind: "tool",
      label: t.label,
      icon: t.icon,
      tone: ((previewId === `${selectedFamily.key}:${t.key}` || selectedTool?.key === t.key) ? "blue" : selectedFamily.tone) as ToneKey,
      parent: selectedFamily.key,
      tool: t,
      capability: t.capability,
      ax: 0, ay: 0, az: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
      radius: ORB.childNodeRadius,
      born: 0,
    }));
  }, [previewId, selectedFamily, selectedTool]);

  const rootNode = useMemo<OrbNode>(() => ({
    id: "root", kind: "root", label: "Sentinel", icon: "ellipse", tone: "cyan",
    ax: 0, ay: 0, az: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    radius: ORB.rootRadius, born: 0,
  }), []);

  const cx = width / 2;
  const cy = height / 2 - 10;
  const makeProjected = useCallback((nodes: OrbNode[], angle: number, radiusPx: number) => {
    const m = new Map<string, Projected>();
    nodes.forEach((n, i) => {
      const a = (-90 + (i * 360) / nodes.length + angle) * Math.PI / 180;
      m.set(n.id, { id: n.id, sx: cx + Math.cos(a) * radiusPx, sy: cy + Math.sin(a) * radiusPx, scale: 1, depth: 0, opacity: 1 });
    });
    return m;
  }, [cx, cy]);

  const familyProjected = useMemo(() => makeProjected(familyNodes, familyAngle, FAMILY_RADIUS), [familyNodes, familyAngle, makeProjected]);
  const toolProjected = useMemo(() => makeProjected(toolNodes, toolAngle, TOOL_RADIUS), [toolNodes, toolAngle, makeProjected]);
  const rootProjected = useMemo(() => new Map<string, Projected>([["root", { id: "root", sx: cx, sy: cy, scale: 1, depth: 0, opacity: 1 }]]), [cx, cy]);

  const previewFamilies = useCallback(() => {
    const start = familyAngle;
    const end = start + 360;
    animateAngle(start, end, SPIN_MS, (v) => {
      setFamilyAngle(v);
      const idx = topIndex(v, ORB_FAMILIES.length);
      setPreviewId(ORB_FAMILIES[idx]?.key ?? null);
    }, () => {
      setPreviewId(null);
      setFamilyAngle(norm360(end));
    });
  }, [animateAngle, familyAngle]);

  const previewTools = useCallback((family: OrbFamily) => {
    const start = 0;
    const end = 360;
    setToolAngle(0);
    animateAngle(start, end, SPIN_MS, (v) => {
      setToolAngle(v);
      const idx = topIndex(v, family.tools.length);
      const tool = family.tools[idx];
      setPreviewId(tool ? `${family.key}:${tool.key}` : null);
    }, () => {
      setPreviewId(null);
      setToolAngle(0);
    });
  }, [animateAngle]);

  const open = useCallback(() => {
    if (animating) return;
    haptic("medium");
    setSelectedFamily(null);
    setSelectedTool(null);
    setPreviewId(null);
    setFamilyAngle(0);
    setToolAngle(0);
    setMode("families");
    setTimeout(previewFamilies, 40);
  }, [animating, previewFamilies]);

  const collapse = useCallback(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setAnimating(false);
    setPreviewId(null);
    setSelectedFamily(null);
    setSelectedTool(null);
    setFamilyAngle(0);
    setToolAngle(0);
    setMode("closed");
    haptic("light");
  }, []);

  const chooseFamily = useCallback((family: OrbFamily) => {
    if (animating) return;
    const idx = ORB_FAMILIES.findIndex((f) => f.key === family.key);
    if (idx < 0) return;
    haptic("light");
    const desired = -idx * (360 / ORB_FAMILIES.length);
    const target = clockwiseTarget(familyAngle, desired);
    setSelectedTool(null);
    animateAngle(familyAngle, target, ALIGN_MS, (v) => {
      setFamilyAngle(v);
      const crossed = topIndex(v, ORB_FAMILIES.length);
      setPreviewId(ORB_FAMILIES[crossed]?.key ?? null);
    }, () => {
      setFamilyAngle(target);
      setPreviewId(null);
      setSelectedFamily(family);
      setMode("tools");
      setTimeout(() => previewTools(family), 70);
    });
  }, [animateAngle, animating, familyAngle, previewTools]);

  const chooseTool = useCallback((tool: OrbTool) => {
    if (animating || !selectedFamily) return;
    const idx = selectedFamily.tools.findIndex((t) => t.key === tool.key);
    if (idx < 0) return;
    haptic("light");
    const desired = -idx * (360 / selectedFamily.tools.length);
    const target = clockwiseTarget(toolAngle, desired);
    animateAngle(toolAngle, target, ALIGN_MS, (v) => {
      setToolAngle(v);
      const crossed = topIndex(v, selectedFamily.tools.length);
      const t = selectedFamily.tools[crossed];
      setPreviewId(t ? `${selectedFamily.key}:${t.key}` : null);
    }, () => {
      setToolAngle(target);
      setPreviewId(null);
      setSelectedTool(tool);
      setMode("result");
      onTool?.(selectedFamily, tool);
    });
  }, [animateAngle, animating, onTool, selectedFamily, toolAngle]);

  const onNodePress = useCallback((n: OrbNode) => {
    if (n.kind === "root") { collapse(); return; }
    if (n.kind === "family" && n.family) chooseFamily(n.family);
    if (n.kind === "tool" && n.tool) chooseTool(n.tool);
  }, [chooseFamily, chooseTool, collapse]);

  const activeLabel = previewId
    ? (familyNodes.find((n) => n.id === previewId)?.label ?? toolNodes.find((n) => n.id === previewId)?.label ?? "")
    : selectedTool?.label ?? selectedFamily?.label ?? "SENTINEL";
  const breadcrumb = [selectedFamily?.label, selectedTool?.label].filter(Boolean).join(" - ");
  const outerRadius = mode === "tools" ? TOOL_RADIUS : FAMILY_RADIUS;

  return (
    <View style={s.screen} testID="orb-sequence-emergent-lab">
      <View pointerEvents="none" style={s.labHeader}>
        <Text style={s.labTitle}>ORB LAB · EMERGENT BASE</Text>
        <Text style={s.labSub}>Menú, tonos, esfera y gesto físico originales · coreografía orbital nueva</Text>
      </View>

      {mode !== "result" ? (
        <GestureDetector gesture={moveGesture}>
          <Animated.View style={[s.assembly, assemblyStyle]}>
            {mode === "closed" ? (
              <View style={s.closedWrap}>
                <RadioWave delay={0} /><RadioWave delay={600} /><RadioWave delay={1200} />
                <Pressable onPress={open} style={s.closedOrb} testID="sentinel-orb-sequence-open">
                  <View style={s.closedHalo} />
                  <View style={s.closedCore}><View style={s.closedHighlight} /><View style={s.closedDot} /></View>
                </Pressable>
              </View>
            ) : (
              <View style={s.scene}>
                <View pointerEvents="none" style={[s.orbitLine, { width: FAMILY_RADIUS * 2, height: FAMILY_RADIUS * 2, borderRadius: FAMILY_RADIUS, left: cx - FAMILY_RADIUS, top: cy - FAMILY_RADIUS }]} />
                {mode === "tools" ? <View pointerEvents="none" style={[s.orbitLine, { width: TOOL_RADIUS * 2, height: TOOL_RADIUS * 2, borderRadius: TOOL_RADIUS, left: cx - TOOL_RADIUS, top: cy - TOOL_RADIUS }]} /> : null}
                <View pointerEvents="none" style={[s.needle, { left: cx - 1, top: cy - outerRadius - NEEDLE_GAP, height: outerRadius + NEEDLE_GAP }]} />
                <View pointerEvents="none" style={[s.needleTip, { left: cx - 7, top: cy - outerRadius - NEEDLE_GAP - 8 }]} />
                <View pointerEvents="none" style={[s.readout, { top: cy - outerRadius - NEEDLE_GAP - 54 }]}>
                  <Text style={s.readoutMain}>{activeLabel}</Text>
                  <Text style={s.readoutPath}>{breadcrumb || (mode === "families" ? "PARENTS" : "TOOLS")}</Text>
                </View>

                <OrbRendererFallback
                  nodes={[rootNode]}
                  edges={[]}
                  projected={rootProjected}
                  now={Date.now() + ORB.expandDuration}
                  selectedFamily={null}
                  entitlements={entitlements}
                  onNodePress={onNodePress}
                />
                <OrbRendererFallback
                  nodes={familyNodes}
                  edges={[]}
                  projected={familyProjected}
                  now={Date.now() + ORB.expandDuration}
                  selectedFamily={selectedFamily?.key ?? null}
                  entitlements={entitlements}
                  onNodePress={onNodePress}
                />
                {mode === "tools" ? (
                  <OrbRendererFallback
                    nodes={toolNodes}
                    edges={[]}
                    projected={toolProjected}
                    now={Date.now() + ORB.expandDuration}
                    selectedFamily={selectedFamily?.key ?? null}
                    entitlements={entitlements}
                    onNodePress={onNodePress}
                  />
                ) : null}
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      ) : (
        <View style={s.resultRoot}>
          <View style={s.card}>
            <Text style={s.cardEyebrow}>{selectedFamily?.label} · {selectedTool?.label}</Text>
            <Text style={s.cardTitle}>HERRAMIENTA</Text>
            <Text style={s.cardBody}>Tarjeta fake-first para configurar la función sin ocupar toda la pantalla.</Text>
          </View>
          <View style={[s.trail, { bottom: insets.bottom + spacing.lg }]}>
            <Pressable onPress={collapse} style={s.trailOrb}><View style={s.trailCore} /></Pressable>
            {selectedFamily ? <View style={s.trailToken}><View style={[s.trailNode, { backgroundColor: colors.brandSecondary }]} /><Text style={s.trailText}>{selectedFamily.label}</Text></View> : null}
            {selectedTool ? <View style={s.trailToken}><View style={[s.trailNode, { backgroundColor: colors.brandSecondary }]} /><Text style={s.trailText}>{selectedTool.label}</Text></View> : null}
          </View>
        </View>
      )}

      <View style={[s.scaleControls, { bottom: insets.bottom + spacing.md }]}>
        <Pressable onPress={() => { scale.value = withSpring(Math.max(0.72, scale.value - 0.08)); }} style={s.scaleBtn}><Text style={s.scaleTxt}>−</Text></Pressable>
        <Pressable onPress={() => { scale.value = withSpring(Math.min(1.42, scale.value + 0.08)); }} style={s.scaleBtn}><Text style={s.scaleTxt}>＋</Text></Pressable>
      </View>
    </View>
  );
}

const stylesStatic = {
  wave: {
    position: "absolute" as const,
    width: ORB.closedSize * 1.2,
    height: ORB.closedSize * 1.2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
};

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surfaceInverse },
  labHeader: { position: "absolute", left: spacing.lg, top: spacing.lg, zIndex: 50 },
  labTitle: { color: c.onSurfaceInverse, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2 },
  labSub: { color: c.onSurfaceInverse, opacity: 0.58, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 },
  assembly: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  closedWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  closedOrb: { width: ORB.closedSize + ORB.haloExtra, height: ORB.closedSize + ORB.haloExtra, alignItems: "center", justifyContent: "center" },
  closedHalo: { position: "absolute", width: ORB.closedSize + ORB.haloExtra, height: ORB.closedSize + ORB.haloExtra, borderRadius: 999, backgroundColor: c.orbHalo },
  closedCore: { width: ORB.closedSize, height: ORB.closedSize, borderRadius: 999, backgroundColor: c.orbCore, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: c.glassStrong, shadowColor: c.orbCore, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  closedHighlight: { position: "absolute", top: 6, left: 12, width: 30, height: 16, borderRadius: 12, backgroundColor: c.glassStrong, opacity: 0.55 },
  closedDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.glassStrong, opacity: 0.9 },
  scene: { flex: 1 },
  orbitLine: { position: "absolute", borderWidth: 1, borderColor: c.border },
  needle: { position: "absolute", width: 2, backgroundColor: c.onSurfaceInverse, opacity: 0.78 },
  needleTip: { position: "absolute", width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.onSurfaceInverse, backgroundColor: c.surfaceInverse },
  readout: { position: "absolute", width: 300, left: "50%", marginLeft: -150, alignItems: "center", zIndex: 30 },
  readoutMain: { color: c.brandSecondary, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 0.7, textAlign: "center" },
  readoutPath: { color: c.onSurfaceInverse, opacity: 0.62, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.1, marginTop: 4, textAlign: "center" },
  resultRoot: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  card: { width: "100%", maxWidth: 430, minHeight: 240, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.overlay, padding: spacing.xl, justifyContent: "center" },
  cardEyebrow: { color: c.brandSecondary, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  cardTitle: { color: c.onSurfaceInverse, fontFamily: fonts.bold, fontSize: 28, letterSpacing: 1.4, marginTop: spacing.sm },
  cardBody: { color: c.onSurfaceInverse, opacity: 0.72, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  trail: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  trailOrb: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.orbCore, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.glassStrong },
  trailCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.glassStrong },
  trailToken: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: c.border, backgroundColor: c.overlay, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  trailNode: { width: 22, height: 22, borderRadius: 11, shadowColor: c.brandSecondary, shadowOpacity: 0.8, shadowRadius: 8 },
  trailText: { color: c.onSurfaceInverse, fontFamily: fonts.semibold, fontSize: 11 },
  scaleControls: { position: "absolute", right: spacing.lg, flexDirection: "row", gap: 6, zIndex: 80 },
  scaleBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: c.border, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" },
  scaleTxt: { color: c.onSurfaceInverse, fontFamily: fonts.bold, fontSize: 17 },
}));
