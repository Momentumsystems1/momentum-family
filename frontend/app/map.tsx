// MAP FIRST: the permanent operational environment. Sentinel Orb controls tools; Mini-Orbs represent groups; people are
// contextual entities. Location upload happens only with effective consent + OS permission.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { MapCanvas, MapPerson } from "@/src/components/MapCanvas";
import { OrbField, OrbFieldMember, OrbMemberState } from "@/src/components/OrbField";
import { MiniOrb } from "@/src/components/orbs";
import { Button, Glass, showUnavailable, T, toast } from "@/src/components/ui";
import { EDUCATION, OrbFamily, OrbTool } from "@/src/copy";
import { useLocationSharing } from "@/src/hooks/useLocationSharing";
import { Orb } from "@/src/orb/Orb";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export default function MapHome() {
  const router = useRouter();
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [edu, setEdu] = useState<"miniorb" | "orb" | null>(null);
  const [locBanner, setLocBanner] = useState(false);
  const [orbGroupId, setOrbGroupId] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();

  const groups = useQuery({ queryKey: ["groups"], queryFn: () => api<any[]>("/groups"), refetchInterval: 15000 });
  const group = groups.data?.[0];
  const perms = useQuery({ queryKey: ["permissions"], queryFn: () => api<Record<string, any>>("/permissions") });
  const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => api<{ entitlements: Record<string, any> }>("/entitlements") });
  const positions = useQuery({ queryKey: ["positions", group?.id], enabled: !!group, refetchInterval: 10000, queryFn: () => api<MapPerson[]>(`/groups/${group.id}/positions`) });
  const orbGroup = useQuery({ queryKey: ["group", orbGroupId], queryFn: () => api<any>(`/groups/${orbGroupId}`), enabled: !!orbGroupId, refetchInterval: 15000 });
  const orbPos = useQuery({ queryKey: ["positions", orbGroupId], queryFn: () => api<MapPerson[]>(`/groups/${orbGroupId}/positions`), enabled: !!orbGroupId, refetchInterval: 10000 });

  const sharesLocation = !!perms.data && Object.values(perms.data).some((v: any) => v.effective && (v.key === "exact_location" || v.key === "approx_location"));
  const loc = useLocationSharing(sharesLocation);

  useEffect(() => {
    storage.getItem<string | null>("sentinel.pending_invite", null).then((t) => { if (t) router.push(`/invite/${t}`); });
    (async () => {
      const seen = await storage.getItem<string | null>("sentinel.edu", null);
      const seenSet = new Set(seen ? seen.split(",") : []);
      if (!seenSet.has("miniorb") && group) setEdu("miniorb");
      else if (!seenSet.has("orb")) setEdu("orb");
    })();
  }, [group]);
  const dismissEdu = async () => {
    const seen = await storage.getItem<string | null>("sentinel.edu", null);
    const set = new Set(seen ? seen.split(",") : []);
    if (edu) set.add(edu);
    await storage.setItem("sentinel.edu", [...set].join(","));
    setEdu(edu === "miniorb" && !set.has("orb") ? "orb" : null);
  };
  useEffect(() => { if (sharesLocation && loc.perm !== "granted") setLocBanner(true); }, [sharesLocation, loc.perm]);
  useEffect(() => { if (loc.lastSentAt) qc.invalidateQueries({ queryKey: ["positions"] }); }, [loc.lastSentAt, qc]);

  const onTool = async (family: OrbFamily, tool: OrbTool) => {
    const e = ent.data?.entitlements ?? {};
    if (tool.capability && e[tool.capability] === false) {
      return showUnavailable({ code: "PLAN_UNAVAILABLE", title: "NO DISPONIBLE EN EL PLAN ACTUAL", reason: `“${tool.label}” no está incluido en tu plan ${ent.data ? (ent.data as any).plan_name : ""}.`, capability: tool.capability });
    }
    const gid = group?.id;
    switch (tool.key) {
      case "quedar": return gid ? router.push({ pathname: "/meeting/new", params: { group: gid } }) : toast("Crea un grupo primero");
      case "convoy": case "seguidme": return gid ? router.push({ pathname: "/convoy/new", params: { group: gid } }) : toast("Crea un grupo primero");
      case "miembros": case "grupos": case "invitados": case "invitados_p": case "responsables": case "compartir": return gid ? router.push(`/group/${gid}`) : router.push("/onboarding/group");
      case "permisos": case "privacidad": case "comparticion": return router.push("/privacy");
      case "plan": return router.push("/plans");
      case "perfil": case "ajustes": case "accesibilidad": return router.push("/profile");
      case "todo_bien": case "incidencia": case "emergencia":
        if (!gid) return toast("Crea un grupo primero");
        try {
          await api("/events", { method: "POST", json: { group_id: gid, kind: tool.key === "todo_bien" ? "checkin" : tool.key === "incidencia" ? "incident" : "emergency", severity: tool.key === "emergencia" ? "critical" : tool.key === "incidencia" ? "warning" : "info", message: tool.label } });
          qc.invalidateQueries({ queryKey: ["groups"] });
          return toast(tool.key === "todo_bien" ? "Pregunta “¿Todo bien?” enviada a tu grupo" : `${tool.label} registrada y notificada al grupo`, "success");
        } catch (err: any) { return toast(err.message, "error"); }
      case "v16": return showUnavailable({ code: "SERVICE_NOT_CONFIGURED", title: "SERVICIO NO CONFIGURADO", reason: "No existe integración con el fabricante de la baliza V16 ni canal regulatorio asociado." });
      case "camara": return showUnavailable({ code: "SERVICE_NOT_CONFIGURED", title: "SERVICIO NO CONFIGURADO", reason: "La cámara compartida requiere WebRTC con servidor TURN y una build nativa. El modelo de sesión (1 minuto, extensión, cierre) está implementado en el servidor." });
      case "road_reality": return showUnavailable({ code: "SERVICE_NOT_CONFIGURED", title: "SERVICIO NO CONFIGURADO", reason: "Road Reality requiere anonimización de rostros y matrículas antes de publicar; no hay servicio configurado." });
      case "anti_congestion": return router.push("/mobility/anti");
      case "multimodal": case "ahorro": case "sostenible": case "cotidianas":
        return showUnavailable({ code: "SERVICE_NOT_CONFIGURED", title: "SERVICIO NO CONFIGURADO", reason: `“${tool.label}” requiere proveedores de transporte público, micromovilidad o datos de consumo que no están configurados.` });
      case "navegar": case "pin": case "ir_persona": case "casa": case "lugares": case "rutas":
        return router.push({ pathname: "/meeting/new", params: { group: gid ?? "", mode: "navigate" } });
      case "historial": case "incidencias": case "calidad": case "confianza": return gid ? router.push(`/group/${gid}?tab=events`) : toast("Crea un grupo primero");
      case "integraciones": return router.push("/plans?tab=integrations");
      default: return toast(`${tool.label}: función en preparación`);
    }
  };

  const people = positions.data ?? [];

  // Member orb data: group members enriched with live positions (distance from me, battery, freshness).
  const orbPositions = orbPos.data ?? [];
  const mePos = orbPositions.find((p) => p.is_me && p.lat != null && p.lng != null);
  const posByMember = new Map(orbPositions.map((p) => [p.member_id, p as any]));
  const orbMembers: OrbFieldMember[] = (orbGroup.data?.members ?? []).map((m: any) => {
    const p = posByMember.get(m.id);
    let state: OrbMemberState = "ok";
    let stateLabel: string | undefined;
    if (m.status !== "active") {
      state = "pending";
      stateLabel = m.status === "declined" ? "Rechazada" : m.status === "expired" ? "Expirada" : "Invitación pendiente";
    } else if (!p || p.state !== "shared") {
      state = "stale";
      stateLabel = "Sin ubicación";
    } else {
      const seenAt = p.last_seen_at ?? p.updated_at ?? p.at;
      const mins = seenAt ? (Date.now() - new Date(seenAt).getTime()) / 60000 : 0;
      if (mins > 15) { state = "stale"; stateLabel = "Desactualizado"; }
      else if (p.battery != null && p.battery < 20) { state = "stale"; stateLabel = "Batería baja"; }
    }
    const dist = mePos && p?.state === "shared" && p.lat != null && p.lng != null ? formatDistance(haversineM(mePos.lat!, mePos.lng!, p.lat, p.lng)) : "—";
    const seenAt = p?.last_seen_at ?? p?.updated_at ?? p?.at;
    return { id: m.id, name: m.display_name, color: m.color, isMe: m.user_id === user?.id, state, stateLabel, distance: dist, battery: p?.battery, updatedAt: seenAt ? relTime(seenAt) : "—" };
  });
  const orbSize = Math.min(width - spacing.xl * 2, height * 0.52, 400);

  return (
    <View style={s.root} testID="map-home">
      <MapCanvas people={people} onPersonPress={(p) => router.push(`/person/${p.member_id}?group=${group?.id}`)} />

      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Glass style={s.status} testID="map-status">
          <View style={[s.dot, { backgroundColor: loc.lastSentAt ? colors.success : sharesLocation ? colors.warning : colors.pending }]} />
          <T weight="medium" style={{ fontSize: 12 }} numberOfLines={1}>
            {!sharesLocation ? "Ubicación no compartida" : loc.perm !== "granted" ? "Permiso de ubicación pendiente" : loc.lastSentAt ? `Compartiendo · ${new Date(loc.lastSentAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : loc.error ?? "Obteniendo ubicación…"}
          </T>
        </Glass>
        <Pressable testID="privacy-shortcut" onPress={() => router.push("/privacy")} style={s.iconBtn}><Ionicons name="lock-closed" size={18} color={colors.onSurface} /></Pressable>
      </View>

      <View style={[s.groups, { top: insets.top + 64 }]} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
          {(groups.data ?? []).map((g) => <MiniOrb key={g.id} name={g.name} stats={g.stats} onPress={() => setOrbGroupId(g.id)} testID={`group-mini-orb-${g.id}`} />)}
          {groups.isSuccess && groups.data.length === 0 ? (
            <Pressable testID="create-group-cta" onPress={() => router.push("/onboarding/group")} style={s.createGroup}><Ionicons name="add" size={18} color={colors.onSurface} /><T weight="semibold" style={{ fontSize: 12 }}>Crear grupo</T></Pressable>
          ) : null}
        </ScrollView>
      </View>

      {people.filter((p) => p.state !== "shared").length > 0 ? (
        <View style={[s.notShared, { top: insets.top + 160 }]} pointerEvents="box-none">
          {people.filter((p) => p.state !== "shared" && !p.is_me).slice(0, 3).map((p) => (
            <Pressable key={p.member_id} testID={`person-state-${p.member_id}`} onPress={() => router.push(`/person/${p.member_id}?group=${group?.id}`)} style={s.stateChip}>
              <View style={[s.dot, { backgroundColor: p.color }]} /><T style={{ fontSize: 11 }}>{p.name}: {p.label}</T>
            </Pressable>
          ))}
        </View>
      ) : null}

      {locBanner && sharesLocation && loc.perm !== "granted" ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={[s.banner, { top: insets.top + 150 }]}>
          <Glass testID="location-permission-banner">
            <T weight="bold" style={{ fontSize: 15 }}>Permiso de ubicación del dispositivo</T>
            <T style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Has decidido compartir tu ubicación con tu grupo. Para hacerlo, Sentinel necesita el permiso del sistema. Solo se usa mientras la app está abierta y siempre es visible.</T>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              {loc.perm === "blocked" ? <Button small testID="location-open-settings" title="Abrir ajustes" onPress={loc.openSettings} /> : <Button small testID="location-request" title="Permitir ubicación" onPress={async () => { const ok = await loc.request(); if (!ok) toast("Sin permiso, tu grupo verá “Ubicación no compartida”"); }} />}
              <Button small testID="location-later" title="Ahora no" variant="ghost" onPress={() => setLocBanner(false)} />
            </View>
          </Glass>
        </Animated.View>
      ) : null}

      {edu && !(locBanner && sharesLocation && loc.perm !== "granted") ? (
        <Animated.View entering={FadeInUp} exiting={FadeOut} style={[s.edu, edu === "miniorb" ? { top: insets.top + 175 } : { bottom: insets.bottom + 120 }]}>
          <Pressable testID={`education-${edu}`} onPress={dismissEdu} style={s.eduBox}>
            <Ionicons name="information-circle" size={18} color={colors.brandPrimary} />
            <T style={{ flex: 1, fontSize: 13, color: colors.onSurfaceInverse }}>{EDUCATION[edu]}</T>
            <T weight="semibold" style={{ color: colors.brandPrimary, fontSize: 13 }}>Ok</T>
          </Pressable>
        </Animated.View>
      ) : null}

      {welcome === "1" ? <Animated.View entering={FadeInUp.delay(300)} exiting={FadeOut} style={[s.welcome, { top: insets.top + 150 }]} pointerEvents="none"><T weight="semibold" style={{ color: colors.muted, fontSize: 12 }}>Tu grupo ya vive en el mapa</T></Animated.View> : null}

      <Orb onTool={onTool} entitlements={ent.data?.entitlements} />

      {orbGroupId ? (
        <View style={s.orbOverlay} testID="member-orb-overlay">
          <Pressable testID="member-orb-backdrop" style={s.orbBackdrop} onPress={() => setOrbGroupId(null)} accessibilityLabel="Cerrar orbe" />
          <View style={[s.orbSheet, { paddingTop: insets.top + spacing.lg }]} pointerEvents="box-none">
            <View style={s.orbHead}>
              <T weight="bold" style={{ fontSize: 15, flex: 1 }} numberOfLines={1}>{orbGroup.data?.name ?? "Grupo"}</T>
              <Pressable testID="member-orb-open-group" onPress={() => { const gid = orbGroupId; setOrbGroupId(null); router.push(`/group/${gid}`); }} style={s.orbHeadBtn}><T weight="semibold" style={{ fontSize: 12, color: colors.brandPrimary }}>Ver grupo</T></Pressable>
              <Pressable testID="member-orb-close" onPress={() => setOrbGroupId(null)} style={s.orbHeadBtn}><Ionicons name="close" size={18} color={colors.onSurface} /></Pressable>
            </View>
            {orbGroup.isLoading ? (
              <View style={{ height: orbSize, alignItems: "center", justifyContent: "center" }}><T style={{ color: colors.muted }}>Abriendo orbe…</T></View>
            ) : (
              <OrbField members={orbMembers} size={orbSize} showCard confirmLabel="Ver ficha" onEscape={() => setOrbGroupId(null)}
                onConfirm={(m) => { setOrbGroupId(null); router.push(`/person/${m.id}?group=${orbGroupId}`); }} />
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

function relTime(iso: string) {
  const mins = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.mapTint },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  status: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  groups: { position: "absolute", left: 0, right: 0 },
  createGroup: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: c.glassStrong, borderWidth: 1, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: 14, height: 44 },
  notShared: { position: "absolute", left: spacing.lg, gap: 6 },
  stateChip: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: c.glass, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: c.border, alignSelf: "flex-start" },
  banner: { position: "absolute", left: spacing.lg, right: spacing.lg },
  edu: { position: "absolute", left: spacing.lg, right: spacing.lg },
  eduBox: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: c.surfaceInverse, padding: spacing.md, borderRadius: radius.md, opacity: 0.96 },
  welcome: { position: "absolute", left: spacing.lg },
  txtInv: { color: c.onSurfaceInverse, fontFamily: fonts.regular },
  orbOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 60 },
  orbBackdrop: { flex: 1, backgroundColor: c.overlay },
  orbSheet: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center" },
  orbHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch", marginHorizontal: spacing.lg, marginBottom: spacing.xs, backgroundColor: c.glassStrong, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, paddingLeft: spacing.lg, paddingRight: 6, paddingVertical: 6 },
  orbHeadBtn: { minWidth: 44, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
}));
