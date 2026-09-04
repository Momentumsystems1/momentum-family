// Native map canvas (react-native-maps). Web uses MapCanvas.web.tsx.
import React from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { PersonAvatar } from "@/src/components/orbs";
import { useTheme } from "@/src/theme";

export type MapPerson = { member_id: string; user_id: string; name: string; color: string; state: string; lat?: number; lng?: number; is_me?: boolean; label?: string };
export type MapPin = { id: string; lat: number; lng: number; title: string; color?: string };

type Props = { people: MapPerson[]; pins?: MapPin[]; polyline?: [number, number][]; onPersonPress?: (p: MapPerson) => void; center?: { lat: number; lng: number } };

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

export function MapCanvas({ people, pins = [], polyline, onPersonPress, center }: Props) {
  const { scheme, colors } = useTheme();
  const located = people.filter((p) => p.state === "shared" && p.lat != null);
  const me = located.find((p) => p.is_me);
  const c = center ?? (me ? { lat: me.lat!, lng: me.lng! } : located[0] ? { lat: located[0].lat!, lng: located[0].lng! } : { lat: 40.4168, lng: -3.7038 });
  return (
    <View style={{ flex: 1, backgroundColor: colors.mapTint }} testID="map-canvas">
      <MapView style={{ flex: 1 }} customMapStyle={scheme === "dark" ? DARK_STYLE : LIGHT_STYLE} userInterfaceStyle={scheme}
        initialRegion={{ latitude: c.lat, longitude: c.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }} showsCompass={false} toolbarEnabled={false}>
        {located.map((p) => (
          <Marker key={p.member_id} coordinate={{ latitude: p.lat!, longitude: p.lng! }} onPress={() => onPersonPress?.(p)} anchor={{ x: 0.4, y: 0.6 }} testID={`map-person-${p.member_id}`}>
            <PersonAvatar name={p.name} color={p.color} state="shared" />
          </Marker>
        ))}
        {pins.map((p) => <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.title} pinColor={p.color ?? colors.brandSecondary} />)}
        {polyline && polyline.length > 1 ? <Polyline coordinates={polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))} strokeColor={colors.brandSecondary} strokeWidth={4} /> : null}
      </MapView>
    </View>
  );
}
