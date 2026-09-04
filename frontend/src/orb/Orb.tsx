// ============================================================
// ORB — CONTAINER. Closed: floating draggable orb (inertia, edge clamp). Open: full-screen 3D graph scene
// (mind-map template): root → 7 family nodes → tools materialize on selection; drag rotates the camera.
// Composition: orbNodes (data) · orbPhysics (sim) · orbInteractions (gestures) · renderer (visual) · orbTheme (constants)
// ============================================================
import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, runOnJS, useAnimatedStyle, useSharedValue, withDecay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OrbFamily, OrbTool } from "@/src/copy";
import { haptic, useReduceMotion, useSceneOrbitGesture, useTicker } from "@/src/orb/orbInteractions";
import { buildRootGraph, collapseTools, expandFamily, OrbNode } from "@/src/orb/orbNodes";
import { Camera, project, Projected, stepCamera, stepPhysics } from "@/src/orb/orbPhysics";
import { OrbRendererFallback } from "@/src/orb/OrbRendererFallback";
import { isHighRendererAvailable, OrbRendererHigh } from "@/src/orb/OrbRendererHigh";
import { ORB } from "@/src/orb/orbTheme";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = { onTool: (family: OrbFamily, tool: OrbTool) => void; entitlements?: Record<string, any> };

export function Orb({ onTool, entitlements }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);

  // ---------------- closed orb: drag + inertia ----------------
  const S = ORB.closedSize;
  const minX = spacing.md, maxX = width - S - spacing.md, minY = insets.top + spacing.md, maxY = height - S - insets.bottom - spacing.lg;
  const x = useSharedValue(width - S - spacing.xl), y = useSharedValue(height * 0.62), scale = useSharedValue(1);
  const pan = Gesture.Pan().onStart(() => { scale.value = withSpring(1.06); runOnJS(haptic)("light"); })
    .onChange((e) => { x.value = Math.min(maxX, Math.max(minX, x.value + e.changeX)); y.value = Math.min(maxY, Math.max(minY, y.value + e.changeY)); })
    .onEnd((e) => { scale.value = withSpring(1); x.value = withDecay({ velocity: e.velocityX, deceleration: 0.996, clamp: [minX, maxX] }); y.value = withDecay({ velocity: e.velocityY, deceleration: 0.996, clamp: [minY, maxY] }); });
  const openScene = () => { haptic("medium"); scale.value = withSequence(withTiming(ORB.compressOnTap, { duration: 90 }), withSpring(1, { damping: 12 })); setOpen(true); };
  const tap = Gesture.Tap().onEnd(() => runOnJS(openScene)());
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));

  // ---------------- scene state (renderer-agnostic) ----------------
  const graph = useRef(buildRootGraph());
  const cam = useRef<Camera>({ yaw: 0.4, pitch: -0.25, targetYaw: 0.4, targetPitch: -0.25 });
  const [frame, setFrame] = useState(0);
  const cx = width / 2, cy = (height - insets.bottom) / 2 - 20;
  useEffect(() => { if (open) { graph.current = buildRootGraph(); cam.current = { yaw: 0.4, pitch: -0.25, targetYaw: 0.4, targetPitch: -0.25 }; setSelected(null); } }, [open]);
  const tick = useCallback((dt: number) => {
    stepPhysics(graph.current.nodes, graph.current.edges, paused);
    stepCamera(cam.current, dt, !dragging && !reduceMotion && !paused);
    setFrame((f) => f + 1);
  }, [paused, dragging, reduceMotion]);
  useTicker(open, tick);
  const projected = useMemo(() => {
    const m = new Map<string, Projected>();
    graph.current.nodes.forEach((n) => m.set(n.id, project(n, cam.current, cx, cy)));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, cx, cy]);

  const orbit = useSceneOrbitGesture(cam, setDragging);
  const close = () => { setOpen(false); setSelected(null); };
  const onNodePress = (n: OrbNode) => {
    haptic("light");
    if (n.kind === "root") return close();
    if (n.kind === "family") {
      if (selected === n.id) { graph.current = collapseTools(graph.current); setSelected(null); return; }
      graph.current = expandFamily(graph.current, n.id); setSelected(n.id);
      cam.current.targetYaw = -Math.atan2(n.ax, n.az) + Math.PI; // bring the selected family toward the camera
      return;
    }
    if (n.kind === "tool" && n.tool) { const fam = graph.current.nodes.find((f) => f.id === n.parent)?.family; if (fam) onTool(fam, n.tool); close(); }
  };
  const Renderer = isHighRendererAvailable() ? OrbRendererHigh : OrbRendererFallback;
  const selFamily = graph.current.nodes.find((n) => n.id === selected);

  return (
    <>
      {open ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={s.sceneRoot} testID="orb-scene">
          <GestureDetector gesture={orbit}>
            <View style={s.sceneRoot}>
              <Pressable testID="orb-scrim" style={s.scrim} onPress={close} />
              <Renderer nodes={graph.current.nodes} edges={graph.current.edges} projected={projected} now={Date.now()} selectedFamily={selected} entitlements={entitlements} onNodePress={onNodePress} />
            </View>
          </GestureDetector>
          <View style={[s.hud, { top: insets.top + spacing.md }]} pointerEvents="box-none">
            <View style={s.title}><Text style={s.titleTxt}>Orbe Sentinel</Text><Text style={s.subTxt}>{selFamily ? selFamily.label : "Arrastra para girar · toca una familia"}</Text></View>
            <Pressable testID="orb-pause" onPress={() => setPaused(!paused)} style={s.hudBtn}><Ionicons name={paused ? "play" : "pause"} size={16} color={colors.onSurface} /></Pressable>
            <Pressable testID="orb-close" onPress={close} style={s.hudBtn}><Ionicons name="close" size={18} color={colors.onSurface} /></Pressable>
          </View>
          {selFamily ? <View style={[s.legend, { bottom: insets.bottom + spacing.lg }]} pointerEvents="none"><Text style={s.legendTxt}>{selFamily.family?.tools.length} herramientas · las bloqueadas requieren otro plan</Text></View> : null}
        </Animated.View>
      ) : (
        <GestureDetector gesture={Gesture.Race(pan, tap)}>
          <Animated.View style={[s.orb, orbStyle]} testID="sentinel-orb" accessibilityRole="button" accessibilityLabel="Orbe Sentinel">
            <View style={s.halo} />
            <View style={s.core}><View style={s.coreHighlight} /><View style={s.coreDot} /></View>
          </Animated.View>
        </GestureDetector>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  sceneRoot: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  scrim: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: c.surfaceInverse, opacity: 0.94 },
  hud: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1 },
  titleTxt: { fontFamily: fonts.bold, fontSize: 18, color: c.onSurfaceInverse },
  subTxt: { fontFamily: fonts.regular, fontSize: 12, color: c.onSurfaceInverse, opacity: 0.7 },
  hudBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.glassStrong, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  legend: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  legendTxt: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurfaceInverse, opacity: 0.8, backgroundColor: c.overlay, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  orb: { position: "absolute", left: 0, top: 0, width: ORB.closedSize, height: ORB.closedSize, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: ORB.closedSize + ORB.haloExtra, height: ORB.closedSize + ORB.haloExtra, borderRadius: 999, backgroundColor: c.orbHalo },
  core: { width: ORB.closedSize, height: ORB.closedSize, borderRadius: 999, backgroundColor: c.orbCore, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: c.glassStrong,
    shadowColor: c.orbCore, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  coreHighlight: { position: "absolute", top: 6, left: 12, width: 30, height: 16, borderRadius: 12, backgroundColor: c.glassStrong, opacity: 0.55 },
  coreDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.glassStrong, opacity: 0.9 },
}));
