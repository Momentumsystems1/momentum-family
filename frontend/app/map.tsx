// MAP FIRST: the permanent operational environment. Sentinel Orb controls tools; Mini-Orbs represent groups; people are
// contextual entities. Location upload happens only with effective consent + OS permission.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { MapCanvas, MapPerson } from "@/src/components/MapCanvas";
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

  const groups = useQuery({ queryKey: ["groups"], queryFn: () => api<any[]>("/groups"), refetchInterval: 15000 });
  const group = groups.data?.[0];
  const perms = useQuery({ queryKey: ["permissions"], queryFn: () => api<Record<string, any>>("/permissions") });
  const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => api<{ entitlements: Record<string, any> }>("/entitlements") });
  const positions = useQuery({ queryKey: ["positions", group?.id], enabled: !!group, refetchInterval: 10000, queryFn: () => api<MapPerson[]>(`/groups/${group.id}/positions`) });

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
          {(groups.data ?? []).map((g) => <MiniOrb key={g.id} name={g.name} stats={g.stats} onPress={() => router.push(`/group/${g.id}`)} testID={`group-mini-orb-${g.id}`} />)}
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
    </View>
  );
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
}));
