// Web fallback: react-native-maps has no web renderer. We show a truthful spatial canvas (no fake map tiles):
// people are positioned relative to each other by real coordinates when available.
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { MapCanvasProps } from "@/src/components/MapCanvas";
import { PersonAvatar } from "@/src/components/orbs";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function MapCanvas({ people, pins = [], onPersonPress, onMapPress, selected }: MapCanvasProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const located = people.filter((p) => p.state === "shared" && p.lat != null);
  const pts = [...located.map((p) => ({ lat: p.lat!, lng: p.lng! })), ...pins.map((p) => ({ lat: p.lat, lng: p.lng })), ...(selected ? [selected] : [])];
  const minLat = Math.min(...pts.map((p) => p.lat), 90), maxLat = Math.max(...pts.map((p) => p.lat), -90);
  const minLng = Math.min(...pts.map((p) => p.lng), 180), maxLng = Math.max(...pts.map((p) => p.lng), -180);
  const proj = (lat: number, lng: number) => ({
    left: `${pts.length > 1 && maxLng !== minLng ? 12 + ((lng - minLng) / (maxLng - minLng)) * 70 : 50}%`,
    top: `${pts.length > 1 && maxLat !== minLat ? 15 + ((maxLat - lat) / (maxLat - minLat)) * 60 : 45}%`,
  });
  return (
    <Pressable style={s.root} testID="map-canvas" onPress={() => onMapPress?.()}>
      <View style={s.gridV} /><View style={[s.gridV, { left: "50%" }]} /><View style={[s.gridV, { left: "75%" }]} />
      <View style={s.gridH} /><View style={[s.gridH, { top: "50%" }]} /><View style={[s.gridH, { top: "75%" }]} />
      <View style={s.notice} testID="map-web-notice">
        <Ionicons name="map" size={14} color={colors.muted} />
        <Text style={s.noticeTxt}>Mapa nativo no disponible en web · vista espacial</Text>
      </View>
      {selected ? <View style={[s.abs, proj(selected.lat, selected.lng) as any]} testID="map-selected-pin"><Ionicons name="location" size={30} color={colors.brandPrimary} /></View> : null}
      {pins.map((p) => (
        <View key={p.id} style={[s.abs, proj(p.lat, p.lng) as any]}>
          <Ionicons name="flag" size={26} color={p.color ?? colors.brandSecondary} />
          <Text style={s.pinTxt} numberOfLines={1}>{p.title}</Text>
        </View>
      ))}
      {located.map((p) => (
        <Pressable key={p.member_id} testID={`map-person-${p.member_id}`} onPress={() => onPersonPress?.(p)} style={[s.abs, proj(p.lat!, p.lng!) as any]}>
          <PersonAvatar name={p.name} color={p.color} state="shared" photoUrl={p.photo_url} />
          <Text style={s.pinTxt}>{p.name}</Text>
        </Pressable>
      ))}
      {located.length === 0 ? (
        <View style={s.empty} testID="map-empty">
          <Ionicons name="location-outline" size={28} color={colors.muted} />
          <Text style={s.emptyTxt}>Nadie comparte ubicación todavía</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.mapTint, overflow: "hidden" },
  gridV: { position: "absolute", top: 0, bottom: 0, left: "25%", width: 1, backgroundColor: c.border, opacity: 0.5 },
  gridH: { position: "absolute", left: 0, right: 0, top: "25%", height: 1, backgroundColor: c.border, opacity: 0.5 },
  notice: { position: "absolute", bottom: 24, left: spacing.lg, flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: c.glass, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  noticeTxt: { fontFamily: fonts.medium, fontSize: 11, color: c.muted },
  abs: { position: "absolute", alignItems: "center", marginLeft: -24 },
  pinTxt: { fontFamily: fonts.semibold, fontSize: 11, color: c.onSurface, marginTop: 2 },
  empty: { position: "absolute", left: 0, right: 0, top: "45%", alignItems: "center", gap: 8 },
  emptyTxt: { fontFamily: fonts.medium, color: c.muted, fontSize: 13 },
}));
