// BAYMOVE G3000 — one native map, three contextual states.
// EXPLORE: map/location. NAVIGATE: explicit search/tap + real route preview.
// CIRCLE: authorized family membership + privacy states, no fake positions.
// Turn-by-turn, live traffic, push and hosted backend are separate milestones.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, unavailableOf } from "@/src/api";
import { useAuth } from "@/src/auth";
import { LatLng, MapCanvas, MapPerson } from "@/src/components/MapCanvas";
import { T, showUnavailable, toast } from "@/src/components/ui";
import { useLocationSharing } from "@/src/hooks/useLocationSharing";
import { storage } from "@/src/utils/storage";

type Mode = "explore" | "navigate" | "circle";
type GroupMember = {
  id: string; display_name: string; status: string; user_id?: string | null;
  location_state?: "shared" | "not_shared" | "permission_pending" | "pending_invitation";
};
type Group = {
  id: string; name: string; members: GroupMember[];
  stats: { members: number; pending: number; alerts: number; meeting: boolean; convoy: boolean };
};
type Place = { name: string; lat: number; lng: number };
type RoutePreview = {
  distance_m: number; duration_s: number; duration_traffic_s?: number | null;
  geometry: [number, number][]; provider: string;
};

const RED = "#C91E32";
const INK = "#2D292B";
const MUTED = "#746E73";
const PALE = "rgba(201,30,50,0.05)";
const BORDER = "#E8E4E6";
const fmtDuration = (seconds: number) => !Number.isFinite(seconds) ? "—" :
  seconds < 3600 ? `${Math.max(1, Math.round(seconds / 60))} min` :
  `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;
const fmtDistance = (m: number) => !Number.isFinite(m) ? "—" :
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export default function MapHome() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("explore");
  const [perspective, setPerspective] = useState<"2d" | "3d">("2d");
  const [selected, setSelected] = useState<LatLng | null>(null);
  const [selectedPlace, setSelectedPlace] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<(LatLng & { key: number }) | undefined>();
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [searchError, setSearchError] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  const groups = useQuery<Group[]>({
    queryKey: ["groups"], queryFn: () => api<Group[]>("/groups"), refetchInterval: 15000,
  });
  const group = groups.data?.[0];
  const permissions = useQuery<Record<string, { key?: string; effective?: boolean }>>({
    queryKey: ["permissions"], queryFn: () => api("/permissions"),
  });
  const sharesLocation = !!permissions.data &&
    Object.entries(permissions.data).some(([key, value]) =>
      (key === "exact_location" || key === "approx_location") && value?.effective === true
    );
  const gps = useLocationSharing(sharesLocation);
  const positions = useQuery<MapPerson[]>({
    queryKey: ["positions", group?.id], enabled: !!group,
    queryFn: () => api<MapPerson[]>(`/groups/${group!.id}/positions`),
    refetchInterval: 10000,
  });

  // Local positioning does not enable group sharing or upload anything unless
  // independent effective consent is granted by the authenticated user.
  useEffect(() => {
    if (gps.perm !== "granted") return;
    let alive = true;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((p) => {
        if (alive) setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
      }).catch(() => null);
    return () => { alive = false; };
  }, [gps.perm]);
  useEffect(() => {
    if (gps.lastSentAt) void qc.invalidateQueries({ queryKey: ["positions"] });
  }, [gps.lastSentAt, qc]);
  useEffect(() => {
    storage.getItem<string | null>("sentinel.pending_invite", null).then(token => {
      if (token) router.push(`/invite/${token}`);
    });
  }, [router]);

  const serverPeople = positions.data ?? [];
  const serverMe = serverPeople.find(p => p.is_me && p.state === "shared" && p.lat != null);
  const me: LatLng | null = serverMe ? { lat: serverMe.lat!, lng: serverMe.lng! } : location;
  const myself: MapPerson[] = me && !serverMe ? [{
    member_id: "me-local", user_id: user?.id ?? "me", name: user?.profile?.name || "Tú",
    color: RED, lat: me.lat, lng: me.lng, state: "shared", is_me: true,
  }] : [];
  const people: MapPerson[] = mode === "navigate" ?
    [...serverPeople.filter(p => p.is_me), ...myself] : [...serverPeople, ...myself];
  useEffect(() => {
    if (me && !focus) setFocus({ ...me, key: 1 });
  }, [me?.lat, me?.lng]);

  // This is a real server route request, currently backed by an explicitly
  // non-production OSRM demonstration adapter when no licensed provider exists.
  const route = useQuery<RoutePreview>({
    queryKey: ["baymove-map-route", me?.lat, me?.lng, selected?.lat, selected?.lng],
    enabled: mode === "navigate" && !!me && !!selected,
    retry: false,
    queryFn: () => api<RoutePreview>("/mobility/route", {
      method: "POST", json: { points: [[me!.lat, me!.lng], [selected!.lat, selected!.lng]] },
    }),
  });
  const navigateTo = (point: LatLng, title = "") => {
    setSelected(point); setSelectedPlace(title);
    setCandidates([]); setSearchOpen(false); setMode("navigate");
    setFocus({ ...point, key: (focus?.key ?? 0) + 1 });
  };
  const recenter = () => {
    if (!me) {
      setShowLocationPrompt(true);
      toast(gps.perm === "granted" ? "Obteniendo posición GPS…" : "Autoriza la ubicación para centrar el mapa");
      return;
    }
    setFocus({ ...me, key: (focus?.key ?? 0) + 1 });
  };
  const requestLocation = async () => {
    const ok = gps.perm === "blocked" ? (gps.openSettings(), false) : await gps.request();
    if (ok) setShowLocationPrompt(false);
  };
  const findPlace = async () => {
    const q = search.trim();
    if (q.length < 3 || searching) return;
    setSearching(true); setSearchError(""); setCandidates([]);
    try {
      // Explicit user search prevents high-frequency calls to limited public geocoders.
      const places = await api<Place[]>(`/mobility/geocode?q=${encodeURIComponent(q)}`);
      setCandidates(places);
      if (!places.length) setSearchError("No se encontraron lugares. Prueba una dirección más precisa.");
    } catch (err: any) {
      const unavailable = unavailableOf(err);
      if (unavailable) showUnavailable(unavailable);
      setSearchError(err?.message ?? "Búsqueda no disponible");
    } finally {
      setSearching(false);
    }
  };

  const checkIn = async () => {
    if (!group || activityBusy) return toast("Necesitas un círculo para registrar la pregunta.");
    setActivityBusy(true);
    try {
      await api("/events", { method: "POST", json: {
        group_id: group.id, kind: "checkin", severity: "info", message: "¿Todo bien?",
      } });
      toast("Pregunta registrada. Aún no hay notificaciones automáticas.", "success");
    } catch (err: any) {
      toast(err?.message ?? "No se pudo registrar la pregunta", "error");
    } finally { setActivityBusy(false); }
  };

  return (
    <View style={{ flex: 1 }} testID="unified-map-home">
      <MapCanvas
        people={people}
        center={focus}
        perspective={perspective}
        polyline={mode === "navigate" ? route.data?.geometry : undefined}
        selected={selected}
        onMapPress={(point) => {
          if (searchOpen) { setSearchOpen(false); return; }
          if (point) {
            setSelected(point); setSelectedPlace("");
            if (mode === "navigate") setCandidates([]);
          }
        }}
        onMapLongPress={point => { setSelected(point); setSelectedPlace(""); }}
        onPersonPress={person => {
          setMode("circle");
          if (person.is_me) router.push("/profile");
          else if (group) router.push(`/person/${person.member_id}?group=${group.id}`);
        }}
      />

      <View style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, gap: 9 }} pointerEvents="box-none">
        <View style={S.searchBar}>
          <Pressable testID="unified-search-open" onPress={() => { setMode("navigate"); setSearchOpen(true); }} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
            <Ionicons name="search" size={20} color={RED} />
            <T weight="semibold" style={{ color: INK, fontSize: 15 }} numberOfLines={1}>¿A dónde vamos?</T>
          </Pressable>
          <Pressable testID="unified-profile" onPress={() => router.push("/profile")} style={S.avatar}>
            {user?.avatar?.photo_url ? (
              <Image source={{ uri: user.avatar.photo_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : <T weight="bold" style={{ color: RED }}>{(user?.profile?.name || "?").charAt(0).toUpperCase()}</T>}
          </Pressable>
        </View>
        <View style={S.modeRow} testID="unified-map-modes">
          <ModeButton value="explore" selected={mode} onPress={() => { setMode("explore"); setSearchOpen(false); }} icon="compass-outline" title="Explorar" />
          <ModeButton value="navigate" selected={mode} onPress={() => setMode("navigate")} icon="navigate-outline" title="Navegar" />
          <ModeButton value="circle" selected={mode} onPress={() => { setMode("circle"); setSearchOpen(false); }} icon="people-outline" title="Círculo" />
        </View>

        {searchOpen && mode === "navigate" ? (
          <View style={S.searchPanel} testID="unified-map-search-panel">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                testID="unified-search-input"
                value={search} onChangeText={setSearch}
                placeholder="Dirección, ciudad o lugar" placeholderTextColor={MUTED}
                autoCapitalize="sentences" returnKeyType="search"
                onSubmitEditing={() => void findPlace()}
                style={{ flex: 1, padding: 10, backgroundColor: "#F7F6F7", borderRadius: 12, minHeight: 44, color: INK, fontSize: 15 }}
              />
              <Pressable testID="unified-search-submit" onPress={() => void findPlace()} disabled={searching || search.trim().length < 3} style={S.searchSubmit}>
                {searching ? <ActivityIndicator color="#FFFFFF" size="small"/> : <Ionicons name="search" color="#FFFFFF" size={20}/>}
              </Pressable>
              <Pressable accessibilityLabel="Cerrar búsqueda" testID="unified-search-close" onPress={() => setSearchOpen(false)}>
                <Ionicons name="close" size={22} color={MUTED}/>
              </Pressable>
            </View>
            {searchError ? <T style={{ color: RED, marginTop: 8, fontSize: 12 }}>{searchError}</T> : null}
            {candidates.length ? (
              <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                {candidates.map((p, i) => (
                  <Pressable key={`${i}-${p.lat}-${p.lng}`} testID={`unified-search-result-${i}`} onPress={() => navigateTo({ lat: p.lat, lng: p.lng }, p.name)} style={S.candidate}>
                    <Ionicons name="location-outline" color={RED} size={18}/>
                    <T style={{ color: INK, flex: 1, fontSize: 13 }} numberOfLines={2}>{p.name}</T>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {showLocationPrompt && !me ? (
          <View style={S.searchPanel} testID="unified-location-permission">
            <T weight="semibold" style={{ color: INK }}>Ubicación para centrar el mapa</T>
            <T style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Puedes utilizarla en este teléfono sin compartirla con tu círculo. Compartir requiere otro consentimiento.</T>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <Pressable onPress={() => setShowLocationPrompt(false)}><T style={{ color: MUTED }}>Ahora no</T></Pressable>
              <Pressable onPress={() => void requestLocation()}><T weight="bold" style={{ color: RED }}>{gps.perm === "blocked" ? "Ajustes" : "Permitir ubicación"}</T></Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ position: "absolute", right: 12, bottom: insets.bottom + 176, gap: 9, alignItems: "center" }} pointerEvents="box-none">
        {Platform.OS !== "web" ? (
          <Fab id="unified-perspective" label={perspective === "3d" ? "Pasar a 2D" : "Pasar a 3D"} onPress={() => setPerspective(v => v === "2d" ? "3d" : "2d")}>
            <T weight="bold" style={{ color: INK }}>{perspective === "2d" ? "2D" : "3D"}</T>
          </Fab>
        ) : null}
        <Fab id="unified-recenter" label="Centrar en mi ubicación" onPress={recenter}>
          <Ionicons name="locate" size={22} color={me ? RED : MUTED}/>
        </Fab>
      </View>

      <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10 }} testID={`unified-panel-${mode}`}>
        {mode === "explore" ? (
          <View style={S.bottomPanel}>
            <T weight="bold" style={S.panelTitle}>Explorar</T>
            <T style={S.panelHint}>{selected ? "Punto seleccionado" : "Elige un destino o consulta tu círculo."}</T>
            <View style={S.actions}>
              <PanelButton label={selected ? "Ir a este punto" : "Buscar destino"} icon="navigate-outline" onPress={() => {
                if (selected) navigateTo(selected);
                else { setMode("navigate"); setSearchOpen(true); }
              }}/>
              <PanelButton label="Círculos" icon="people-outline" onPress={() => setMode("circle")}/>
              <PanelButton label="Seguridad" icon="shield-checkmark-outline" onPress={() => router.push("/privacy")}/>
            </View>
          </View>
        ) : mode === "navigate" ? (
          <View style={S.bottomPanel}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <T weight="bold" style={S.panelTitle}>Ruta preliminar</T>
              {selected ? <Pressable testID="unified-clear-route" onPress={() => { setSelected(null); setSelectedPlace(""); }}><Ionicons name="close-circle-outline" size={20} color={MUTED}/></Pressable> : null}
            </View>
            {!selected ? <T style={S.panelHint}>Busca un destino o tócalo directamente en el mapa.</T>
              : !me ? <T style={S.panelHint}>Destino elegido. Para calcular la ruta, autoriza el GPS de este teléfono.</T>
              : route.isLoading ? <T style={S.panelHint}>Calculando ruta real…</T>
              : route.data ? (
                <>
                  <T numberOfLines={1} style={S.panelHint}>{selectedPlace || `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}</T>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "baseline", marginTop: 8 }}>
                    <T weight="bold" style={{ color: RED, fontSize: 23 }}>{fmtDuration(route.data.duration_s)}</T>
                    <T weight="semibold" style={{ color: INK }}>{fmtDistance(route.data.distance_m)}</T>
                  </View>
                  <T style={{ color: MUTED, fontSize: 11 }}>Estimación sin tráfico en directo ni guiado giro a giro. No utilizar para conducir.</T>
                </>
              ) : <T style={S.panelHint}>{(route.error as Error | null)?.message || "Ruta no disponible. Comprueba el servicio de rutas."}</T>}
            <View style={S.actions}>
              {!me ? <PanelButton label="Activar GPS" icon="locate-outline" onPress={() => setShowLocationPrompt(true)} /> : null}
              <PanelButton label="Buscar" icon="search" onPress={() => setSearchOpen(true)}/>
              <PanelButton label="Convoy" icon="car-sport-outline" onPress={() => group ? router.push({ pathname: "/convoy/new", params: { group: group.id } }) : toast("Crea un círculo primero")}/>
              <PanelButton label="Explorar" icon="map-outline" onPress={() => { setMode("explore"); setSearchOpen(false); }}/>
            </View>
          </View>
        ) : (
          <View style={S.bottomPanel}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <T weight="bold" style={S.panelTitle}>{group?.name || "Mi círculo"}</T>
                <T style={S.panelHint}>{group ? `${group.stats.members} miembros · ${group.stats.pending} pendientes` : "Todavía no tienes un círculo"}</T>
              </View>
              {group ? <Pressable testID="unified-group-detail" onPress={() => router.push(`/group/${group.id}`)}><Ionicons name="chevron-forward" size={24} color={RED}/></Pressable> : null}
            </View>
            {groups.isLoading ? <T style={S.panelHint}>Cargando círculo…</T> : groups.isError ? <T style={S.panelHint}>No se pudo obtener el círculo del servidor.</T> : null}
            {group ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8, paddingBottom: 3 }}>
                {group.members.filter(m => m.status !== "removed").map(m => {
                  const p = serverPeople.find(x => x.user_id === m.user_id);
                  const shared = !!p && p.state === "shared" && p.lat != null;
                  const isPending = m.status !== "active";
                  return (
                    <Pressable key={m.id} testID={`unified-member-${m.id}`} style={S.memberCard} onPress={() => {
                      if (shared) setFocus({ lat: p.lat!, lng: p.lng!, key: (focus?.key ?? 0) + 1 });
                      else toast(isPending ? "Invitación pendiente" : "Esta persona no comparte su ubicación");
                    }}>
                      <View style={[S.memberDot, { backgroundColor: isPending ? "#E3DEE3" : shared ? RED : "#F2EFF1" }]}>
                        <T weight="bold" style={{ color: shared ? "#FFFFFF" : INK }}>{isPending ? "…" : m.display_name.charAt(0).toUpperCase()}</T>
                      </View>
                      <T style={{ color: INK, fontSize: 11 }} numberOfLines={1}>{m.display_name}</T>
                      <T style={{ color: MUTED, fontSize: 10 }}>{isPending ? "Pendiente" : shared ? "Comparte" : "Sin ubicación"}</T>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            <View style={S.actions}>
              <PanelButton label={group ? "Ver círculo" : "Crear círculo"} icon="people-outline" onPress={() => group ? router.push(`/group/${group.id}`) : router.push("/onboarding/group")}/>
              <PanelButton label={activityBusy ? "Registrando…" : "¿Todo bien?"} icon="help-circle-outline" onPress={() => void checkIn()}/>
              <PanelButton label="Quedar" icon="calendar-outline" onPress={() => group ? router.push({ pathname: "/meeting/new", params: { group: group.id } }) : toast("Crea un círculo primero")}/>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function ModeButton({ value, selected, onPress, icon, title }: {
  value: Mode; selected: Mode; onPress: () => void; icon: string; title: string;
}) {
  const active = value === selected;
  return (
    <Pressable testID={`unified-mode-${value}`} accessibilityRole="button" accessibilityState={{ selected: active }}
      onPress={onPress} style={[S.modePill, active && S.modeSelected]}>
      <Ionicons name={icon as any} color={active ? RED : MUTED} size={16}/>
      <T weight={active ? "bold" : "medium"} style={{ color: active ? RED : MUTED, fontSize: 12 }}>{title}</T>
    </Pressable>
  );
}

function PanelButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={S.actionButton}>
      <Ionicons name={icon as any} color={RED} size={19}/>
      <T style={{ color: INK, fontSize: 11, textAlign: "center" }} weight="medium" numberOfLines={1}>{label}</T>
    </Pressable>
  );
}

function Fab({ id, label, onPress, children }: { id: string; label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable testID={id} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={S.fab}>{children}</Pressable>;
}

const S = {
  searchBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 25, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER,
    elevation: 4, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  avatar: { width: 36, height: 36, backgroundColor: PALE, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modeRow: { flexDirection: "row", gap: 6, alignSelf: "center" },
  modePill: {
    flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: BORDER,
  },
  modeSelected: { backgroundColor: "#FFF5F6", borderColor: RED },
  searchPanel: {
    backgroundColor: "#FFFFFF", borderRadius: 18, borderColor: BORDER, borderWidth: 1,
    padding: 12, elevation: 5, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 12,
  },
  searchSubmit: {
    width: 43, height: 44, borderRadius: 12, backgroundColor: RED,
    alignItems: "center", justifyContent: "center",
  },
  candidate: { flexDirection: "row", gap: 9, alignItems: "center", padding: 12, borderBottomColor: BORDER, borderBottomWidth: 1 },
  fab: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", borderColor: BORDER, borderWidth: 1, elevation: 4,
    shadowColor: "#000000", shadowOpacity: 0.09, shadowRadius: 10,
  },
  bottomPanel: {
    backgroundColor: "#FFFFFF", borderRadius: 21, padding: 14, borderWidth: 1, borderColor: BORDER,
    elevation: 6, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
  },
  panelTitle: { fontSize: 16, color: INK },
  panelHint: { fontSize: 12, color: MUTED, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 10 },
  actionButton: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: PALE, paddingHorizontal: 5, gap: 3 },
  memberCard: { minWidth: 80, alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 7, borderRadius: 12, backgroundColor: "#FAF9FA" },
  memberDot: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center" },
} as const;
