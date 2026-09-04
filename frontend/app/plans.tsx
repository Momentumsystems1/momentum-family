// Plans page: Free / Basic / Pro (catalog from server, configurable). Upgrade never simulates payment.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, unavailableOf } from "@/src/api";
import { Button, Header, Pill, showUnavailable, T, toast } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const LABELS: Record<string, string> = { canCreateGroups: "Crear grupos", maxGroups: "Grupos", maxPermanentMembers: "Miembros fijos", maxTemporaryGuests: "Invitados temporales", cameraShareDuration: "Cámara compartida (s)", advancedMobility: "Movilidad avanzada", roadReality: "Road Reality", familyMetrics: "Métricas del grupo", convoy: "Convoy", meetings: "Quedadas", antiCongestion: "Anti-congestión" };

export default function Plans() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<any[]>("/plans") });
  const mine = useQuery({ queryKey: ["entitlements"], queryFn: () => api<{ plan: string }>("/entitlements") });
  const status = useQuery({ queryKey: ["system-status"], queryFn: () => api<{ providers: Record<string, any> }>("/system/status") });
  const upgrade = useMutation({
    mutationFn: (code: string) => api(`/billing/upgrade/${code}`, { method: "POST" }),
    onError: (e) => { const u = unavailableOf(e); if (u) showUnavailable(u); else toast((e as any).message, "error"); },
  });
  return (
    <View style={s.root} testID="plans-screen">
      <Header title={tab === "integrations" ? "Integraciones" : "Plan"} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
        {tab !== "integrations" ? (plans.data ?? []).map((p) => {
          const current = mine.data?.plan === p.code;
          return (
            <View key={p.code} style={[s.card, current && { borderColor: colors.brandPrimary }]} testID={`plan-card-${p.code}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <T weight="bold" style={{ fontSize: 20, flex: 1 }}>{p.name}</T>
                {current ? <Pill label="Plan actual" tone="cyan" testID="plan-current" /> : null}
              </View>
              <T style={{ color: colors.muted, marginTop: 2 }}>{p.price_label}</T>
              <View style={{ marginTop: spacing.md, gap: 6 }}>
                {Object.entries(p.entitlements).map(([k, v]) => (
                  <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={v === false ? "close-circle" : "checkmark-circle"} size={16} color={v === false ? colors.muted : colors.success} />
                    <T style={{ fontSize: 14, color: v === false ? colors.muted : colors.onSurface }}>{LABELS[k] ?? k}{typeof v === "number" ? `: ${v}` : ""}</T>
                  </View>
                ))}
              </View>
              {!current ? <View style={{ marginTop: spacing.md }}><Button testID={`plan-upgrade-${p.code}`} title={`Mejorar a ${p.name}`} variant="secondary" icon="arrow-up-circle" loading={upgrade.isPending} onPress={() => upgrade.mutate(p.code)} /></View> : null}
            </View>
          );
        }) : null}
        <T weight="bold" style={{ fontSize: 16, marginTop: spacing.md }}>Estado de integraciones</T>
        {status.data ? Object.entries(status.data.providers).map(([k, v]: any) => (
          <View key={k} style={s.row} testID={`integration-${k}`}>
            <View style={{ flex: 1 }}>
              <T weight="semibold" style={{ fontSize: 14 }}>{k}</T>
              <T style={{ color: colors.muted, fontSize: 12 }}>{v.provider ?? "sin proveedor"}{v.note ? ` · ${v.note}` : ""}</T>
            </View>
            <Pill label={v.configured ? (v.production_ready ? "Operativo" : "Limitado") : "No configurado"} tone={v.configured ? (v.production_ready ? "green" : "amber") : "muted"} />
          </View>
        )) : <T style={{ color: colors.muted }}>Cargando…</T>}
      </ScrollView>
    </View>
  );
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1.5, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
}));
