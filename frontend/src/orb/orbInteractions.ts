// ============================================================
// ORB — INTERACTIONS (gesture → camera / selection). No rendering here.
// ============================================================
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import type { Camera } from "@/src/orb/orbPhysics";
import { ORB } from "@/src/orb/orbTheme";

export const haptic = (style: "light" | "medium") => {
  if (Platform.OS !== "web") Haptics.impactAsync(style === "light" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
};

export function useReduceMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setRm).catch(() => null); }, []);
  return rm;
}

/** Orbit-controls style drag on the expanded scene: rotates the camera with damping (template OrbitControls). */
export function useSceneOrbitGesture(cam: React.MutableRefObject<Camera>, setDragging: (v: boolean) => void) {
  const onChange = (dx: number, dy: number) => {
    cam.current.targetYaw += dx * ORB.dragRotateGain;
    cam.current.targetPitch = Math.max(-ORB.pitchLimit, Math.min(ORB.pitchLimit, cam.current.targetPitch + dy * ORB.dragRotateGain));
  };
  return Gesture.Pan().minDistance(6)
    .onStart(() => runOnJS(setDragging)(true))
    .onChange((e) => runOnJS(onChange)(e.changeX, e.changeY))
    .onEnd(() => runOnJS(setDragging)(false));
}

export function useTicker(active: boolean, onTick: (dtSec: number) => void) {
  const last = useRef(0);
  useEffect(() => {
    if (!active) return;
    let id: any;
    const loop = () => {
      const now = Date.now();
      const dt = last.current ? Math.min(0.1, (now - last.current) / 1000) : ORB.tickMs / 1000;
      last.current = now;
      onTick(dt);
      id = setTimeout(loop, ORB.tickMs);
    };
    loop();
    return () => { clearTimeout(id); last.current = 0; };
  }, [active, onTick]);
}
