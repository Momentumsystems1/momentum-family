// Lightweight functional circle visual. Nodes represent real memberships
// returned by FastAPI, never prefilled invented people or invite counts.
// Numbers and labels stay upright. No perpetual frame loop or heavy assets.
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { fonts, useTheme } from "@/src/theme";

type OrbitMember = {
  id: string;
  display_name: string;
  status: string;
  color: string;
  user_id?: string | null;
};
type Props = {
  name: string;
  members: OrbitMember[];
  ownerId?: string | null;
  size: number;
  onMemberPress?: (member: OrbitMember) => void;
};
const RED = "#C91E32";
const RED_PALE = "rgba(201,30,50,0.05)";
const INK = "#30272B";
const RING = "#E9E4E6";

export function CircleOrbit({ name, members, ownerId, size, onMemberPress }: Props) {
  const { scheme } = useTheme();
  const owner = members.find((m) => m.user_id === ownerId);
  const orbitMembers = members.filter((m) => m.id !== owner?.id && m.status !== "removed");
  const diameter = Math.max(228, Math.min(size, 390));
  const center = diameter / 2;
  const radius = diameter * 0.35;
  const nodeSize = orbitMembers.length > 8 ? 36 : 46;
  const background = scheme === "dark" ? "#191519" : "#FFFFFF";

  return (
    <View
      testID="express-circle-orbit"
      accessible
      accessibilityLabel={`Círculo ${name}. ${orbitMembers.length} personas invitadas o miembros.`}
      style={{ alignSelf: "center", height: diameter, width: diameter }}
    >
      <View pointerEvents="none" style={{
        position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
        borderRadius: center, backgroundColor: RED_PALE,
        borderColor: "#F3E9EC", borderWidth: 1,
      }}/>
      <View pointerEvents="none" style={{
        position: "absolute", left: center - radius, top: center - radius,
        width: radius * 2, height: radius * 2, borderRadius: radius,
        borderWidth: 1.3, borderColor: RING,
      }}/>
      <View style={{
        position: "absolute", left: center - 62, top: center - 62, width: 124, height: 124,
        borderRadius: 62, borderWidth: 5, borderColor: "#F8E4E8",
        backgroundColor: RED, alignItems: "center", justifyContent: "center", padding: 10,
      }}>
        <Ionicons name="people" size={22} color="#FFFFFF" />
        <Text numberOfLines={2} style={{
          marginTop: 5, fontFamily: fonts.bold, fontSize: 15,
          color: "#FFFFFF", textAlign: "center",
        }}>{name}</Text>
      </View>
      {orbitMembers.map((member, i) => {
        const angle = ((i / orbitMembers.length) * Math.PI * 2) - Math.PI / 2;
        const accepted = member.status === "active";
        const label = accepted ? member.display_name.trim().charAt(0).toUpperCase() : String(i + 1).padStart(2, "0");
        const x = center + Math.cos(angle) * radius - nodeSize / 2;
        const y = center + Math.sin(angle) * radius - nodeSize / 2;
        return (
          <Pressable
            key={member.id}
            testID={`express-circle-member-${member.id}`}
            onPress={() => onMemberPress?.(member)}
            accessibilityRole="button"
            accessibilityLabel={`${member.display_name}: ${accepted ? "miembro activo" : "invitación pendiente"}`}
            style={{ position: "absolute", left: x, top: y, width: nodeSize + 8, alignItems: "center" }}
          >
            <View style={{
              width: nodeSize, height: nodeSize, borderRadius: nodeSize / 2,
              backgroundColor: accepted ? member.color || RED : "#ECE8ED",
              borderColor: accepted ? "#FFFFFF" : "#D8D0D9", borderWidth: 2,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{
                fontFamily: fonts.bold, fontSize: accepted ? 18 : 16,
                color: accepted ? "#FFFFFF" : "#716875",
              }}>{label}</Text>
            </View>
            <Text numberOfLines={1} style={{
              fontFamily: fonts.medium, fontSize: 10, marginTop: 4,
              color: scheme === "dark" ? "#F4F0F4" : INK,
              maxWidth: 74, textAlign: "center", backgroundColor: background,
            }}>{member.display_name}</Text>
          </Pressable>
        );
      })}
      {orbitMembers.length === 0 ? (
        <View pointerEvents="none" style={{
          position: "absolute", bottom: 16, alignSelf: "center",
          borderRadius: 20, backgroundColor,
          paddingHorizontal: 15, paddingVertical: 5,
        }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: "#786A74" }}>Añade personas cuando quieras</Text>
        </View>
      ) : null}
    </View>
  );
}
