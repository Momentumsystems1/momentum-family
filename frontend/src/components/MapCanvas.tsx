// Native map canvas (react-native-maps). Web uses MapCanvas.web.tsx.
import React, { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { PersonAvatar } from "@/src/components/orbs";
import { useTheme } from "@/src/theme";

export type MapPerson = { member_id: string; user_id: string; name: string; color: string; state: string; lat?: number; lng?: number; is_me?: boolean; label?: string; precision?: string; at?: string; status?: string | null; photo_url?: string | null };
export type MapPin = { id: string; lat: number; lng: number; title: string; color?: string };
export type LatLng = { lat: number; lng: number };

export type MapCanvasProps = {
  people: MapPerson[]; pins?: MapPin[]; polyline?: [number, number][]; onPersonPress?: (p: MapPerson) => void;
  /** Animates the camera whenever lat/lng/key change (key lets the caller re-center on the same coordinates). */
  center?: LatLng & { key?: number };
  /** Navigator-like zoom by default (~1 km). */
  zoomDelta?: number;
  /** Tap on the map (coordinate is undefined on web, where there is no real map). */
  onMapPress?: (c?: LatLng) => void;
  onMapLongPress?: (c: LatLng) => void;
  selected?: LatLng | null;
  perspective?: "2d" | "3d";
};

const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1526" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8fa3bf" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1526" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071020" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];
const LIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#dce4ec" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475467" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9cbe0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

export function MapCanvas({ people, pins = [], polyline, onPersonPress, center, zoomDelta = 0.01, onMapPress, onMapLongPress, selected, perspective = "3d" }: MapCanvasProps) {
  const { scheme, colors } = useTheme();
  const ref = useRef<MapView>(null);
  const located = people.filter((p) => p.state === "shared" && p.lat != null);
  const me = located.find((p) => p.is_me);
  const c = center ?? (me ? { lat: me.lat!, lng: me.lng! } : located[0] ? { lat: located[0].lat!, lng: located[0].lng! } : { lat: 40.4168, lng: -3.7038 });
  const iosMapsConfigured = Constants.expoConfig?.extra?.g3000GoogleMapsIOSConfigured === true;
  const androidMapsConfigured = Constants.expoConfig?.extra?.g3000GoogleMapsAndroidConfigured === true;
  // Android always uses Google Maps; iOS falls back to Apple Maps until its native key is installed.
  const provider = Platform.OS === "android" || iosMapsConfigured ? PROVIDER_GOOGLE : undefined;
  const missingAndroidKey = Platform.OS === "android" && !androidMapsConfigured;

  useEffect(() => {
    if (center) {
      ref.current?.animateCamera({
        center: { latitude: center.lat, longitude: center.lng },
        pitch: perspective === "3d" ? 45 : 0,
        zoom: zoomDelta < 0.02 ? 15 : 13,
      }, { duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, center?.key]);

  useEffect(() => {
    let alive = true;
    ref.current?.getCamera().then((camera) => {
      if (alive) ref.current?.animateCamera({ ...camera, pitch: perspective === "3d" ? 45 : 0 }, { duration: 500 });
    }).catch(() => null);
    return () => { alive = false; };
  }, [perspective]);
  const coord = (e: any) => ({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
  return (
    <View style={{ flex: 1, backgroundColor: colors.mapTint }} testID="map-canvas">
      <MapView ref={ref} style={{ flex: 1 }} provider={provider} customMapStyle={scheme === "dark" ? DARK_STYLE : LIGHT_STYLE} userInterfaceStyle={scheme}
        initialCamera={{ center: { latitude: c.lat, longitude: c.lng }, pitch: perspective === "3d" ? 45 : 0, heading: 0, zoom: center ? 15 : 12, altitude: 900 }}
        pitchEnabled={true} rotateEnabled={true}
        showsCompass={true} toolbarEnabled={false} showsMyLocationButton={false}
        onPress={(e) => { if ((e.nativeEvent as any).action === "marker-press") return; onMapPress?.(coord(e)); }}
        onLongPress={(e) => onMapLongPress?.(coord(e))}>
        {located.map((p) => (
          <Marker key={p.member_id} coordinate={{ latitude: p.lat!, longitude: p.lng! }} onPress={() => onPersonPress?.(p)} anchor={{ x: 0.4, y: 0.6 }} testID={`map-person-${p.member_id}`}>
            <PersonAvatar name={p.name} color={p.color} state="shared" size={p.is_me ? 50 : 42} photoUrl={p.photo_url} />
          </Marker>
        ))}
        {pins.map((p) => <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.title} pinColor={p.color ?? colors.brandSecondary} />)}
        {selected ? <Marker coordinate={{ latitude: selected.lat, longitude: selected.lng }} pinColor={colors.brandPrimary} testID="map-selected-pin" /> : null}
        {polyline && polyline.length > 1 ? <Polyline coordinates={polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))} strokeColor={colors.brandSecondary} strokeWidth={4} /> : null}
      </MapView>
      {missingAndroidKey ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 24, padding: 12, borderRadius: 12, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.onSurface, textAlign: "center", fontSize: 12 }}>
            Google Maps Android todavía no está configurado en esta compilación. Configura la clave G3000 y genera una APK nueva.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
