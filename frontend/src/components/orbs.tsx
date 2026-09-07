// Group Mini-Orb (living object), Person avatar (geolocation symbol + small photo/initial at upper-right), Privacy flip card.
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { fonts, makeStyles, useTheme } from "@/src/theme";

export function MiniOrb({ stats, name, onPress, testID = "group-mini-orb" }: { stats: { members: number; pending: number; alerts: number; meeting: boolean; convoy: boolean }; name: string; onPress: () => void; testID?: string }) {
  const s = useMiniStyles();
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => { pulse.value = withRepeat(withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200 })), -1, true); }, [pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.35, transform: [{ scale: 1 + pulse.value * 0.1 }] }));
  return (
    <Pressable testID={testID} onPress={onPress} style={s.wrap} accessibilityLabel={`Grupo ${name}`}>
      <Animated.View style={[s.halo, halo]} />
      <View style={s.core}>
        <Ionicons name="people" size={20} color={colors.onBrandPrimary} />
        <Text style={s.count}>{stats.members}</Text>
      </View>
      {stats.pending > 0 ? <View style={[s.badge, { backgroundColor: colors.pending }]}><Text style={[s.badgeTxt, { color: colors.onPending }]}>{stats.pending}</Text></View> : null}
      {stats.alerts > 0 ? <View style={[s.badge, s.badgeLeft, { backgroundColor: colors.error }]}><Text style={s.badgeTxt}>{stats.alerts}</Text></View> : null}
      {stats.meeting || stats.convoy ? <View style={[s.badge, s.badgeBottom, { backgroundColor: colors.success }]}><Ionicons name={stats.convoy ? "car-sport" : "calendar"} size={10} color={colors.onSuccess} /></View> : null}
      <Text style={s.name} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}
const useMiniStyles = makeStyles((c) => ({
  wrap: { width: 72, alignItems: "center" },
  halo: { position: "absolute", top: -6, width: 68, height: 68, borderRadius: 34, backgroundColor: c.orbHalo },
  core: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.orbCore, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3,
    borderWidth: 1.5, borderColor: c.glassStrong, shadowColor: c.orbCore, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  count: { fontFamily: fonts.bold, color: c.onBrandPrimary, fontSize: 14 },
  badge: { position: "absolute", top: -2, right: 2, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 1.5, borderColor: c.surface },
  badgeLeft: { right: undefined, left: 2 },
  badgeBottom: { top: 40, right: 2 },
  badgeTxt: { fontFamily: fonts.bold, fontSize: 10, color: c.onError },
  name: { fontFamily: fonts.semibold, fontSize: 11, color: c.onSurface, marginTop: 4, maxWidth: 80 },
}));

export function PersonAvatar({ name, color, size = 44, state = "shared", symbol = "pin", photoUrl }: { name: string; color: string; size?: number; state?: "shared" | "not_shared" | "permission_pending" | "pending_invitation"; symbol?: string; photoUrl?: string | null }) {
  const { colors } = useTheme();
  const dim = state !== "shared";
  const bg = dim ? colors.pending : color;
  const icon = ({ pin: "location", shield: "shield", car: "car", star: "star", heart: "heart" } as any)[symbol] ?? "location";
  const photo = size * 0.5;
  return (
    <View style={{ width: size + photo / 2, height: size + photo / 3, alignItems: "flex-start" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginTop: photo / 3,
        borderWidth: 2, borderColor: colors.glassStrong, shadowColor: colors.surfaceInverse, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
        <Ionicons name={icon} size={size * 0.5} color={dim ? colors.onPending : colors.onBrandPrimary} />
      </View>
      <View style={{ position: "absolute", right: 0, top: 0, width: photo, height: photo, borderRadius: photo / 2, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
        ) : (
          <Text style={{ fontFamily: fonts.bold, fontSize: photo * 0.45, color: colors.onSurface }}>{(name || "?").charAt(0).toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}
