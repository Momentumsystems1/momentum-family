// ============================================================
// MOBILITY — ANTI-CONGESTION (real Azure Maps predictive traffic; unavailable strategies stated truthfully)
// ============================================================
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, unavailableOf } from "@/src/api";
import { Button, Header, Pill, showUnavailable, T, toast } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const fmt = (s: number) => `${Math.round(s / 60)} min`;

export default function AntiCongestion() {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const [from, setFrom] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [to, setTo] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [qFrom, setQFrom] = useState(""); const [qTo, setQTo] = useState(""); const [sFrom, setSFrom] = useState(""); const [sTo, setSTo] = useState("");
  const rFrom = useQuery({ queryKey: ["geocode", sFrom], enabled: sFrom.length > 2, queryFn: () => api<any[]>(`/mobility/geocode?q=${encodeURIComponent(sFrom)}`) });
  const rTo = useQuery({ queryKey: ["geocode", sTo], enabled: sTo.length > 2, queryFn: () => api<any[]>(`/mobility/geocode?q=${encodeURIComponent(sTo)}`) });
  const evalQ = useMutation({
    mutationFn: () => api<any>(`/mobility/anti-congestion?from_lat=${from!.lat}&from_lng=${from!.lng}&to_lat=${to!.lat}&to_lng=${to!.lng}`),
    onError: (e) => { const u = unavailableOf(e); if (u) showUnavailable(u); else toast((e as any).message, "error"); },
  });
  const d = evalQ.data;
  const Field = ({ label, q, setQ, setS, results, pick, picked, id }: any) => (
    <View style={{ gap: 6 }}>
      <T weight="semibold">{label}</T>
      <TextInput testID={`anti-${id}-input`} style={s.input} value={q} onChangeText={setQ} onSubmitEditing={() => setS(q)} placeholder="Dirección o lugar" placeholderTextColor={colors.muted} returnKeyType="search" />
      <Button small testID={`anti-${id}-search`} title="Buscar" variant="secondary" icon="search" onPress={() => setS(q)} />
      {(results.data ?? []).slice(0, 3).map((r: any, i: number) => <Pressable key={i} testID={`anti-${id}-result-${i}`} onPress={() => { pick(r); setQ(r.name); }} style={[s.result, picked?.name === r.name && { borderColor: colors.brandPrimary }]}><T style={{ fontSize: 13 }} numberOfLines={2}>{r.name}</T></Pressable>)}
    </View>
  );
  return (
    <View style={s.root} testID="anti-congestion-screen">
      <Header title="Anti-congestión" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }} bottomOffset={24}>
        <T style={{ color: colors.muted, fontSize: 13 }}>Objetivo: evitar la congestión, no solo atravesarla. Compara salir ahora, descansar y salir más tarde, o una ruta alternativa, con tráfico predictivo real.</T>
        <Field label="Origen" q={qFrom} setQ={setQFrom} setS={setSFrom} results={rFrom} pick={setFrom} picked={from} id="from" />
        <Field label="Destino" q={qTo} setQ={setQTo} setS={setSTo} results={rTo} pick={setTo} picked={to} id="to" />
        <Button testID="anti-evaluate" title="Evaluar estrategias" onPress={() => evalQ.mutate()} loading={evalQ.isPending} disabled={!from || !to} />
        {d ? (
          <View style={{ gap: spacing.sm }} testID="anti-results">
            <T weight="bold">Recomendaciones</T>
            {d.recommendations.map((r: any, i: number) => (
              <View key={i} style={[s.card, { borderColor: colors.success }]} testID={`anti-rec-${i}`}>
                <Pill label={r.strategy} tone="green" /><T style={{ marginTop: 6, fontSize: 14 }}>{r.why}</T>
                <T style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Salida +{r.option.depart_in_min} min · viaje {fmt(r.option.travel_s)} · retraso {fmt(r.option.delay_s)} · llegada {new Date(r.option.arrival).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</T>
              </View>
            ))}
            <T weight="bold" style={{ marginTop: spacing.sm }}>Opciones evaluadas</T>
            {d.options.map((o: any, i: number) => <View key={i} style={s.card}><T weight="semibold" style={{ fontSize: 13 }}>{o.strategy.replace("_", " ")} · +{o.depart_in_min} min</T><T style={{ fontSize: 12, color: colors.muted }}>viaje {fmt(o.travel_s)} · retraso {fmt(o.delay_s)} · {(o.distance_m / 1000).toFixed(1)} km</T></View>)}
            {d.unavailable.map((u: any) => <View key={u.strategy} style={[s.card, { opacity: 0.7 }]}><Pill label={u.strategy} tone="muted" /><T style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>SERVICIO NO CONFIGURADO · {u.reason}</T></View>)}
            <T style={{ fontSize: 11, color: colors.muted }}>Fuente: {d.provider} · {new Date(d.evaluated_at).toLocaleTimeString("es-ES")}</T>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  input: { minHeight: 50, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.regular, fontSize: 15, color: c.onSurface },
  result: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
}));
