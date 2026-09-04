// Convoy Operational Card (density inspired by referencia.png: status header → KPIs → per-vehicle rows). Mobility data only.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Button, Glass, Header, Pill, T, toast } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const fmt = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const ROLE: Record<string, string> = { leader: "Líder", copilot: "Copiloto", tail: "Cola", vehicle: "Vehículo" };

export default function Convoy() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["convoy", id], queryFn: () => api<any>(`/convoys/${id}`), refetchInterval: 10000 });
  const join = useMutation({ mutationFn: () => api(`/convoys/${id}/join`, { method: "POST", json: { seats_free: null } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["convoy", id] }), onError: (e: any) => toast(e.message, "error") });
  const close = useMutation({ mutationFn: () => api(`/convoys/${id}/close`, { method: "POST" }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["convoy", id] }); qc.invalidateQueries({ queryKey: ["groups"] }); } });
  const d = c.data;
  const inConvoy = d?.vehicles?.some((v: any) => v.user_id === user?.id);
  const coh = d?.cohesion;
  const cohTone = coh?.state === "stable" ? "green" : coh?.state === "warning" ? "amber" : coh?.state === "risk" ? "red" : "muted";
  const leader = d?.vehicles?.find((v: any) => v.role === "leader");
  const etaOk = (d?.vehicles ?? []).filter((v: any) => v.eta?.state === "ok");
  return (
    <View style={s.root} testID="convoy-screen">
      <Header title={d?.name ?? "Convoy"} />
      {d ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
          <Glass testID="convoy-header">
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View style={[s.leaderDot, { backgroundColor: leader?.color ?? colors.brandSecondary }]}><Ionicons name="car-sport" size={18} color={colors.onBrandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <T weight="bold" style={{ fontSize: 16 }}>Líder: {leader?.name ?? "—"}</T>
                <T style={{ fontSize: 12, color: colors.muted }}>{d.vehicles.length} vehículo(s) · destino {d.destination.name.split(",")[0]}</T>
              </View>
              <Pill label={d.status === "active" ? "En curso" : "Finalizado"} tone={d.status === "active" ? "blue" : "muted"} />
            </View>
            <View style={s.kpis}>
              <Kpi label="Cohesión" value={coh?.state === "insufficient_data" ? "—" : coh?.label ?? "—"} tone={cohTone} testID="kpi-cohesion" />
              <Kpi label="Separación" value={coh?.separation_s != null ? fmt(coh.separation_s) : "—"} testID="kpi-separation" />
              <Kpi label="ETA líder" value={leader?.eta?.state === "ok" ? fmt(leader.eta.eta_s) : leader?.eta?.label ?? "—"} testID="kpi-eta" />
              <Kpi label="Tráfico" value={d.traffic.state === "ok" ? "Con datos" : "Sin datos"} testID="kpi-traffic" />
            </View>
            {coh?.advice ? <T style={{ fontSize: 12, color: colors.orangeRisk, marginTop: spacing.sm }} testID="cohesion-advice">{coh.advice}</T> : null}
            {coh?.reason ? <T style={{ fontSize: 12, color: colors.muted, marginTop: spacing.sm }}>{coh.reason}</T> : null}
          </Glass>

          <T weight="bold">Vehículos</T>
          {d.vehicles.map((v: any) => (
            <View key={v.user_id} style={s.row} testID={`vehicle-${v.user_id}`}>
              <View style={[s.bar, { backgroundColor: v.eta?.state === "ok" ? v.color ?? colors.brandSecondary : colors.pending }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><T weight="semibold">{v.name}{v.user_id === user?.id ? " (tú)" : ""}</T><Pill label={ROLE[v.role]} tone={v.role === "leader" ? "blue" : v.role === "tail" ? "amber" : "muted"} /></View>
                <T style={{ fontSize: 12, color: colors.muted }}>{v.eta?.state === "ok" ? `ETA ${fmt(v.eta.eta_s)} · ${(v.eta.distance_m / 1000).toFixed(1)} km` : v.eta?.label} · asientos libres: {v.seats_free ?? "sin datos"}</T>
              </View>
              {etaOk.length >= 2 && v.eta?.state === "ok" && leader?.eta?.state === "ok" ? <T weight="bold" style={{ fontSize: 13, color: colors.onSurface }}>{v.eta.eta_s - leader.eta.eta_s >= 0 ? "+" : ""}{fmt(v.eta.eta_s - leader.eta.eta_s)}</T> : null}
            </View>
          ))}

          <View style={s.row} testID="convoy-fuel"><Ionicons name="leaf" size={18} color={colors.muted} /><T style={{ flex: 1, fontSize: 13, color: colors.muted }}>Combustible: {d.fuel.label}</T></View>
          {d.regroup ? <View style={s.row} testID="convoy-regroup"><Ionicons name="git-merge" size={18} color={colors.success} /><T style={{ flex: 1, fontSize: 13 }}>{d.regroup.suggestion} {d.regroup.parking.label}.</T></View> : null}
          <View style={s.row}><Ionicons name="camera" size={18} color={colors.muted} /><T style={{ flex: 1, fontSize: 13, color: colors.muted }}>Cámara y comunicación entre vehículos: SERVICIO NO CONFIGURADO</T></View>

          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {!inConvoy && d.status === "active" ? <Button testID="convoy-join" title="Unirme con mi vehículo" icon="car" onPress={() => join.mutate()} loading={join.isPending} /> : null}
            {d.is_leader && d.status === "active" ? <Button testID="convoy-close" title="Finalizar convoy" variant="ghost" onPress={() => close.mutate()} /> : null}
          </View>
        </ScrollView>
      ) : <T style={{ padding: spacing.xl, color: colors.muted }}>{c.isError ? "Convoy no disponible" : "Cargando…"}</T>}
    </View>
  );
}

function Kpi({ label, value, tone = "muted", testID }: { label: string; value: string; tone?: string; testID: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const col = { green: colors.success, amber: colors.warning, red: colors.error, muted: colors.onSurface }[tone] ?? colors.onSurface;
  return <View style={s.kpi} testID={testID}><T style={{ fontSize: 11, color: colors.muted }}>{label}</T><T weight="bold" style={{ fontSize: 14, color: col }} numberOfLines={2}>{value}</T></View>;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  leaderDot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  kpi: { width: "47%", flexGrow: 1, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  bar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
}));
