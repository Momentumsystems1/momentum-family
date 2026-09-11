// OrbField — the Sentinel member orb. Fixed needle at top; the 360° dial rotates the selected member
// under it. Labels stay level (counter-rotated). Hub shows the selected member; optional data card
// (Estado / Distancia / Batería / Actualizado). Colors: cyan ok, amber stale/low battery, red pulsing
// SOS, grey pending. Web: keyboard (↑↓/←→ move, Enter confirm, Esc close) + synthesized blips.
// Native: circular tap navigation + haptics. Data comes from the caller (Supabase group_members).
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { Button, Glass, T } from "@/src/components/ui";
import { fonts, radius, spacing, useTheme } from "@/src/theme";

export type OrbMemberState = "ok" | "stale" | "sos" | "pending";

export type OrbFieldMember = {
  id: string;
  name: string;
  color: string;
  isMe?: boolean;
  state: OrbMemberState;
  stateLabel?: string;
  distance?: string;
  battery?: number;
  updatedAt?: string;
};

type Props = {
  members: OrbFieldMember[];
  size?: number;
  showCard?: boolean;
  confirmLabel?: string;
  onConfirm?: (m: OrbFieldMember) => void;
  onEscape?: () => void;
  testID?: string;
};

const NEEDLE_DEG = 270; // fixed needle, top of the dial
const STATE_DEFAULT_LABEL: Record<OrbMemberState, string> = { ok: "Compartiendo", stale: "Desactualizado", sos: "SOS", pending: "Pendiente" };

let audioCtx: any = null;
function blip(kind: "nav" | "confirm") {
  if (Platform.OS !== "web") return;
  try {
    const w = globalThis as any;
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx ?? new AC();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sine";
    osc.connect(g);
    g.connect(audioCtx.destination);
    if (kind === "nav") {
      osc.frequency.setValueAtTime(2100, t0);
      g.gain.setValueAtTime(0.045, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      osc.start(t0);
      osc.stop(t0 + 0.09);
    } else {
      osc.frequency.setValueAtTime(900, t0);
      osc.frequency.exponentialRampToValueAtTime(1400, t0 + 0.09);
      g.gain.setValueAtTime(0.06, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.start(t0);
      osc.stop(t0 + 0.17);
    }
  } catch {
    // audio is decorative; never break navigation
  }
}

function haptic(kind: "nav" | "confirm") {
  if (Platform.OS === "web") return;
  try {
    if (kind === "nav") Haptics.selectionAsync();
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // haptics are decorative
  }
}

export function OrbField({ members, size = 320, showCard = false, confirmLabel = "Ver ficha", onConfirm, onEscape, testID = "orb-field" }: Props) {
  const { colors } = useTheme();
  const [sel, setSel] = useState(0);
  const phi = useSharedValue(NEEDLE_DEG);
  const selSV = useSharedValue(0);
  const step = members.length > 0 ? 360 / members.length : 360;
  const R = size / 2 - 56;
  const tickR = size / 2 - 16;

  const stateColor = (st: OrbMemberState) => (st === "ok" ? colors.brandPrimary : st === "stale" ? colors.warning : st === "sos" ? colors.error : colors.pending);

  const spinTo = (i: number, silent = false) => {
    if (members.length === 0) return;
    const n = ((i % members.length) + members.length) % members.length;
    const raw = NEEDLE_DEG - n * step;
    const k = Math.round((phi.value - raw) / 360);
    phi.value = withTiming(raw + k * 360, { duration: 420, easing: Easing.out(Easing.cubic) });
    selSV.value = n;
    setSel(n);
    if (!silent) {
      blip("nav");
      haptic("nav");
    }
  };

  const confirm = () => {
    const m = members[sel];
    if (!m) return;
    blip("confirm");
    haptic("confirm");
    onConfirm?.(m);
  };

  // Keep selection valid if the member list changes under us.
  useEffect(() => {
    if (sel >= members.length && members.length > 0) spinTo(members.length - 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  // Web keyboard: ↑↓/←→ navigate, Enter confirm, Esc close.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = globalThis as any;
    const handler = (e: any) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault?.(); spinTo(sel - 1); }
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault?.(); spinTo(sel + 1); }
      else if (e.key === "Enter") { e.preventDefault?.(); confirm(); }
      else if (e.key === "Escape") { onEscape?.(); }
    };
    w.addEventListener?.("keydown", handler);
    return () => w.removeEventListener?.("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, members.length]);

  const current = members[sel];
  const ticks = useMemo(() => Array.from({ length: members.length * 2 }, (_, k) => k), [members.length]);

  return (
    <View style={{ width: size, alignItems: "center" }} testID={testID}>
      <View style={{ width: size, height: size }}>
        {/* dial ring */}
        <View style={{ position: "absolute", left: size / 2 - tickR - 10, top: size / 2 - tickR - 10, width: (tickR + 10) * 2, height: (tickR + 10) * 2, borderRadius: tickR + 10, borderWidth: 1, borderColor: colors.border }} />
        {/* ticks rotate with the dial; major tick of the selected member lights up */}
        {ticks.map((k) => (
          <Tick key={k} angle={(k * step) / 2} major={k % 2 === 0} itemIndex={k / 2} radius={tickR} cx={size / 2} cy={size / 2} phi={phi} sel={selSV} accent={colors.brandPrimary} base={colors.borderStrong} />
        ))}
        {/* members */}
        {members.map((m, i) => (
          <OrbItem key={m.id} index={i} member={m} angle={i * step} radius={R} cx={size / 2} cy={size / 2} phi={phi} sel={selSV} color={m.state === "pending" ? colors.pending : m.color} ring={stateColor(m.state)} onPress={() => spinTo(i)} onBrand={colors.onBrandPrimary} labelColor={colors.onSurface} />
        ))}
        {/* fixed needle */}
        <View style={{ position: "absolute", left: 0, right: 0, top: 2, alignItems: "center" }} pointerEvents="none">
          <Ionicons name="caret-down" size={20} color={colors.brandPrimary} />
        </View>
        {/* hub: selected member */}
        {current ? (
          <Pressable testID={`${testID}-hub`} onPress={confirm} style={{ position: "absolute", left: size / 2 - 52, top: size / 2 - 52, width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: stateColor(current.state), alignItems: "center", justifyContent: "center", shadowColor: stateColor(current.state), shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: current.state === "pending" ? colors.pending : current.color, alignItems: "center", justifyContent: "center" }}>
              <T weight="bold" style={{ color: colors.onBrandPrimary, fontSize: 15 }}>{(current.name || "?").charAt(0).toUpperCase()}</T>
            </View>
            <T weight="semibold" style={{ fontSize: 12, marginTop: 3, maxWidth: 92 }} numberOfLines={1}>{current.name}{current.isMe ? " (tú)" : ""}</T>
            <T style={{ fontSize: 10, color: stateColor(current.state), fontFamily: fonts.medium }}>{current.stateLabel ?? STATE_DEFAULT_LABEL[current.state]}</T>
          </Pressable>
        ) : (
          <View style={{ position: "absolute", left: size / 2 - 52, top: size / 2 - 52, width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <T style={{ color: colors.muted, fontSize: 12 }}>Sin miembros</T>
          </View>
        )}
      </View>

      {showCard && current ? (
        <Glass style={{ width: size, marginTop: spacing.sm, borderRadius: radius.lg, padding: spacing.md }} testID={`${testID}-card`}>
          <View style={{ flexDirection: "row" }}>
            <Field label="ESTADO" value={current.stateLabel ?? STATE_DEFAULT_LABEL[current.state]} color={stateColor(current.state)} />
            <Field label="DISTANCIA" value={current.distance ?? "—"} />
            <Field label="BATERÍA" value={current.battery != null ? `${Math.round(current.battery)} %` : "—"} color={current.battery != null && current.battery < 20 ? colors.warning : undefined} />
            <Field label="ACTUALIZADO" value={current.updatedAt ?? "—"} />
          </View>
          <View style={{ marginTop: spacing.md, alignItems: "center" }}>
            <Button small testID={`${testID}-confirm`} title={confirmLabel} icon="person" onPress={confirm} />
          </View>
        </Glass>
      ) : null}
    </View>
  );
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <T style={{ fontSize: 9, letterSpacing: 1, color: colors.muted, fontFamily: fonts.semibold }}>{label}</T>
      <T weight="semibold" style={{ fontSize: 11, color: color ?? colors.onSurface }} numberOfLines={1}>{value}</T>
    </View>
  );
}

function Tick({ angle, major, itemIndex, radius: r, cx, cy, phi, sel, accent, base }: { angle: number; major: boolean; itemIndex: number; radius: number; cx: number; cy: number; phi: any; sel: any; accent: string; base: string }) {
  const h = major ? 11 : 6;
  const st = useAnimatedStyle(() => {
    const a = angle + phi.value;
    const rad = (a * Math.PI) / 180;
    return { transform: [{ translateX: r * Math.cos(rad) }, { translateY: r * Math.sin(rad) }, { rotate: `${a + 90}deg` }] };
  });
  const paint = useAnimatedStyle(() => ({ backgroundColor: major && sel.value === itemIndex ? accent : base, opacity: major ? 1 : 0.55 }));
  return <Animated.View style={[{ position: "absolute", left: cx - 1, top: cy - h / 2, width: 2, height: h, borderRadius: 1 }, st, paint]} pointerEvents="none" />;
}

function OrbItem({ index, member, angle, radius: r, cx, cy, phi, sel, color, ring, onPress, onBrand, labelColor }: { index: number; member: OrbFieldMember; angle: number; radius: number; cx: number; cy: number; phi: any; sel: any; color: string; ring: string; onPress: () => void; onBrand: string; labelColor: string }) {
  const sosPulse = useSharedValue(0);
  useEffect(() => {
    if (member.state === "sos") {
      sosPulse.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = useAnimatedStyle(() => {
    const a = angle + phi.value;
    const rad = (a * Math.PI) / 180;
    const isSel = sel.value === index;
    return {
      transform: [
        { translateX: r * Math.cos(rad) },
        { translateY: r * Math.sin(rad) },
        // no rotation here: we position by translation, so content is already level
        { scale: isSel ? 1.18 : 1 },
      ],
      zIndex: isSel ? 10 : 1,
    };
  });
  const labelAbove = useAnimatedStyle(() => {
    const a = (((angle + phi.value) % 360) + 360) % 360;
    // upper half → label above, except near the needle (270°) where it goes below
    return { opacity: ((a > 180 && a < 250) || (a > 290 && a < 360)) ? 1 : 0 };
  });
  const labelBelow = useAnimatedStyle(() => {
    const a = (((angle + phi.value) % 360) + 360) % 360;
    return { opacity: ((a > 180 && a < 250) || (a > 290 && a < 360)) ? 0 : 1 };
  });
  const sosRing = useAnimatedStyle(() => ({ opacity: 0.35 + sosPulse.value * 0.65, transform: [{ scale: 1 + sosPulse.value * 0.28 }] }));

  return (
    <Animated.View entering={FadeIn.delay(index * 70).duration(320)} style={[{ position: "absolute", left: cx - 24, top: cy - 24, width: 48, height: 48, alignItems: "center", justifyContent: "center" }, st]}>
      {member.state === "sos" ? <Animated.View style={[{ position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: ring }, sosRing]} /> : null}
      <Pressable testID={`orb-member-${member.id}`} onPress={onPress} accessibilityLabel={`Miembro ${member.name}`} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color, borderWidth: 2, borderColor: ring, alignItems: "center", justifyContent: "center" }}>
        <T weight="bold" style={{ color: onBrand, fontSize: 14 }}>{(member.name || "?").charAt(0).toUpperCase()}</T>
      </Pressable>
      <Animated.Text numberOfLines={1} style={[{ position: "absolute", top: -17, fontFamily: fonts.semibold, fontSize: 10, color: labelColor, maxWidth: 84 }, labelAbove]}>{member.name}</Animated.Text>
      <Animated.Text numberOfLines={1} style={[{ position: "absolute", bottom: -17, fontFamily: fonts.semibold, fontSize: 10, color: labelColor, maxWidth: 84 }, labelBelow]}>{member.name}</Animated.Text>
    </Animated.View>
  );
}
