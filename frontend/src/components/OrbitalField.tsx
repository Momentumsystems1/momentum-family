// Orbital group creation field: nucleus, gently orbiting member avatars with spring physics, birth animation from the
// nucleus, pending (gray) vs active (vivid) states, formation links and collapse into a Mini-Orb.
import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { fonts, makeStyles, useTheme } from "@/src/theme";

export type OrbitalMember = { id: string; name: string; color: string; status: "active" | "pending" | "declined" | "expired"; isMe?: boolean; isNew?: boolean };

type Props = { members: OrbitalMember[]; size: number; phase: "editing" | "forming" | "collapsing"; onMemberPress?: (m: OrbitalMember) => void;
  center?: React.ReactNode; groupName: string };

export function OrbitalField({ members, size, phase, onMemberPress, center, groupName }: Props) {
  const s = useStyles();
  const { colors } = useTheme();
  const angle = useSharedValue(0);
  const fieldScale = useSharedValue(1);
  const linkOpacity = useSharedValue(0);
  const nucleusPulse = useSharedValue(1);

  useFrameCallback((f) => {
    if (phase === "editing") angle.value += ((f.timeSincePreviousFrame ?? 16) / 1000) * 0.12; // slow, controlled orbit
  });

  useEffect(() => {
    if (phase === "forming") {
      nucleusPulse.value = withSequence(withTiming(1.25, { duration: 260 }), withSpring(1, { damping: 8 }));
      linkOpacity.value = withSequence(withTiming(1, { duration: 500 }), withDelay(900, withTiming(0.55, { duration: 400 })));
    }
    if (phase === "collapsing") {
      linkOpacity.value = withTiming(0, { duration: 350 });
      fieldScale.value = withDelay(200, withTiming(0.16, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
    }
  }, [phase, nucleusPulse, linkOpacity, fieldScale]);

  const fieldStyle = useAnimatedStyle(() => ({ transform: [{ scale: fieldScale.value }] }));
  const nucleusStyle = useAnimatedStyle(() => ({ transform: [{ scale: nucleusPulse.value }] }));
  const ringR = size * 0.36;
  const nucleusSize = size * 0.34;

  const targets = useMemo(() => members.map((_, i) => (Math.PI * 2 * i) / Math.max(1, members.length) - Math.PI / 2), [members]);

  return (
    <Animated.View style={[{ width: size, height: size }, fieldStyle]} testID="orbital-field">
      <View style={[s.field, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[s.ring, { width: ringR * 2, height: ringR * 2, borderRadius: ringR, left: size / 2 - ringR, top: size / 2 - ringR }]} />
      {members.map((m, i) => (
        <FormationLink key={`l-${m.id}`} angle={angle} target={targets[i]} r={ringR} center={size / 2} opacity={linkOpacity} color={m.status === "active" ? m.color : colors.pending} collapsing={phase === "collapsing"} />
      ))}
      <Animated.View style={[s.nucleus, { width: nucleusSize, height: nucleusSize, borderRadius: nucleusSize / 2, left: size / 2 - nucleusSize / 2, top: size / 2 - nucleusSize / 2 }, nucleusStyle]} testID="group-nucleus">
        <View style={s.nucleusInner}>
          {center ?? <Text style={s.nucleusText} numberOfLines={2}>{groupName}</Text>}
        </View>
      </Animated.View>
      {members.map((m, i) => (
        <OrbitAvatar key={m.id} m={m} angle={angle} target={targets[i]} r={ringR} center={size / 2} onPress={onMemberPress} collapsing={phase === "collapsing"} />
      ))}
    </Animated.View>
  );
}

function OrbitAvatar({ m, angle, target, r, center, onPress, collapsing }: { m: OrbitalMember; angle: Animated.SharedValue<number>; target: number; r: number; center: number; onPress?: (m: OrbitalMember) => void; collapsing: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  const radius = useSharedValue(m.isNew ? 0 : r);
  const scale = useSharedValue(m.isNew ? 0.2 : 1);
  const targetAngle = useSharedValue(target);
  const active = useSharedValue(m.status === "active" ? 1 : 0);
  const glow = useSharedValue(0);
  const AV = 48;

  useEffect(() => { targetAngle.value = withSpring(target, { damping: 16, stiffness: 90 }); }, [target, targetAngle]);
  useEffect(() => {
    if (m.isNew) {
      // birth: pulse, materialize, scale up briefly, travel outward with spring, settle
      scale.value = withSequence(withTiming(1.25, { duration: 260 }), withSpring(1, { damping: 10 }));
      radius.value = withDelay(180, withSpring(r, { damping: 13, stiffness: 70, mass: 1.1 }));
    }
  }, [m.isNew, r, radius, scale]);
  useEffect(() => {
    if (m.status === "active" && active.value === 0) {
      active.value = withTiming(1, { duration: 900 });
      glow.value = withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 900 }));
    }
  }, [m.status, active, glow]);
  useEffect(() => { if (collapsing) radius.value = withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) }); }, [collapsing, radius]);

  const a = useDerivedValue(() => targetAngle.value + angle.value);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: center + Math.cos(a.value) * radius.value - AV / 2 }, { translateY: center + Math.sin(a.value) * radius.value - AV / 2 }, { scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.7, transform: [{ scale: 1 + glow.value * 0.9 }] }));
  const pending = m.status !== "active";
  const bg = pending ? colors.pending : m.color;
  const initial = (m.name || "?").trim().charAt(0).toUpperCase();

  return (
    <Animated.View style={[s.avatar, style]}>
      <Animated.View style={[s.avatarGlow, { backgroundColor: m.color }, glowStyle]} />
      <Pressable testID={`orbital-member-${m.id}`} onPress={() => onPress?.(m)} accessibilityLabel={`${m.name}, ${pending ? "a la espera de confirmación" : "activo"}`}
        style={[s.avatarBtn, { backgroundColor: bg, borderColor: pending ? colors.borderStrong : colors.glassStrong, opacity: pending ? 0.75 : 1 }]}>
        {m.isMe ? <Ionicons name="location" size={20} color={colors.onBrandPrimary} /> : <Text style={[s.avatarText, pending && { color: colors.onPending }]}>{initial}</Text>}
        {pending ? <View style={s.pendingDot}><Ionicons name="time" size={9} color={colors.onPending} /></View> : null}
      </Pressable>
      <Text style={[s.avatarName, pending && { color: colors.muted }]} numberOfLines={1}>{m.name}</Text>
    </Animated.View>
  );
}

function FormationLink({ angle, target, r, center, opacity, color, collapsing }: { angle: Animated.SharedValue<number>; target: number; r: number; center: number; opacity: Animated.SharedValue<number>; color: string; collapsing: boolean }) {
  const len = useSharedValue(r);
  useEffect(() => { if (collapsing) len.value = withTiming(0, { duration: 700 }); }, [collapsing, len]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value, width: len.value,
    transform: [{ translateX: center }, { translateY: center }, { rotate: `${target + angle.value}rad` }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, height: 2, borderRadius: 1, backgroundColor: color, transformOrigin: "left center" as any }, style]} />;
}

const useStyles = makeStyles((c) => ({
  field: { position: "absolute", left: 0, top: 0, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border,
    shadowColor: c.surfaceInverse, shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  ring: { position: "absolute", borderWidth: 1, borderColor: c.divider, borderStyle: "dashed" },
  nucleus: { position: "absolute", backgroundColor: c.orbCore, alignItems: "center", justifyContent: "center",
    shadowColor: c.orbCore, shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  nucleusInner: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", padding: 8 },
  nucleusText: { fontFamily: fonts.bold, color: c.onBrandPrimary, fontSize: 15, textAlign: "center" },
  avatar: { position: "absolute", left: 0, top: 0, width: 48, alignItems: "center" },
  avatarGlow: { position: "absolute", width: 48, height: 48, borderRadius: 24 },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 2,
    shadowColor: c.surfaceInverse, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  avatarText: { fontFamily: fonts.bold, color: c.onBrandPrimary, fontSize: 18 },
  avatarName: { fontFamily: fonts.medium, fontSize: 10, color: c.onSurface, marginTop: 3, width: 64, textAlign: "center" },
  pendingDot: { position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
}));
