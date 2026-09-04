import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, unavailableOf } from "@/src/api";
import { Button, Header, showUnavailable, T, toast } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function NewConvoy() {
  const { group, lat, lng, place } = useLocalSearchParams<{ group: string; lat?: string; lng?: string; place?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const [name, setName] = useState("Convoy");
  const [query, setQuery] = useState(place ?? "");
  const [searchQ, setSearchQ] = useState("");
  const [picked, setPicked] = useState<{ name: string; lat: number; lng: number } | null>(lat && lng ? { name: place ?? "Destino", lat: Number(lat), lng: Number(lng) } : null);
  const [copilot, setCopilot] = useState<string | null>(null);
  const [tail, setTail] = useState<string | null>(null);
  const g = useQuery({ queryKey: ["group", group], queryFn: () => api<any>(`/groups/${group}`) });
  const results = useQuery({ queryKey: ["geocode", searchQ], enabled: searchQ.length > 2, queryFn: () => api<any[]>(`/mobility/geocode?q=${encodeURIComponent(searchQ)}`) });
  const create = useMutation({
    mutationFn: () => api<any>("/convoys", { method: "POST", json: { group_id: group, name, lat: picked!.lat, lng: picked!.lng, place_name: picked!.name, copilot_id: copilot, tail_id: tail } }),
    onSuccess: (c) => router.replace(`/convoy/${c.id}`),
    onError: (e) => { const u = unavailableOf(e); if (u) showUnavailable(u); else toast((e as any).message, "error"); },
  });
  const others = (g.data?.members ?? []).filter((m: any) => m.status === "active" && m.user_id && m.role !== "owner");
  return (
    <View style={s.root} testID="convoy-new">
      <Header title="Convoy / Seguidme" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }} bottomOffset={24}>
        <T style={{ color: colors.muted, fontSize: 13 }}>Tú serás el líder. La cohesión se mide por separación temporal a lo largo de la ruta, nunca por instrucciones de acelerar.</T>
        <TextInput testID="convoy-name-input" style={s.input} value={name} onChangeText={setName} placeholder="Nombre del convoy" placeholderTextColor={colors.muted} />
        <T weight="semibold">Destino</T>
        <TextInput testID="convoy-place-input" style={s.input} value={query} onChangeText={(v) => { setQuery(v); setPicked(null); }} onSubmitEditing={() => setSearchQ(query)} placeholder="Busca un destino" placeholderTextColor={colors.muted} returnKeyType="search" />
        <Button small testID="convoy-place-search" title="Buscar" variant="secondary" icon="search" onPress={() => setSearchQ(query)} />
        {(results.data ?? []).map((r, i) => <Pressable key={i} testID={`convoy-geocode-${i}`} onPress={() => { setPicked(r); setQuery(r.name); }} style={[s.result, picked?.name === r.name && { borderColor: colors.brandPrimary }]}><T style={{ fontSize: 13 }} numberOfLines={2}>{r.name}</T></Pressable>)}
        {picked ? <T style={{ fontSize: 12, color: colors.success }} testID="convoy-destination-picked">Destino: {picked.name}</T> : null}
        {others.length ? (<>
          <T weight="semibold">Copiloto</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{others.map((m: any) => <Pressable key={m.id} testID={`copilot-${m.id}`} onPress={() => setCopilot(copilot === m.user_id ? null : m.user_id)} style={[s.chip, copilot === m.user_id && s.chipOn]}><T style={{ fontSize: 13, color: copilot === m.user_id ? colors.onBrandPrimary : colors.onSurface }}>{m.display_name}</T></Pressable>)}</View>
          <T weight="semibold">Coche cola</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{others.map((m: any) => <Pressable key={m.id} testID={`tail-${m.id}`} onPress={() => setTail(tail === m.user_id ? null : m.user_id)} style={[s.chip, tail === m.user_id && s.chipOn]}><T style={{ fontSize: 13, color: tail === m.user_id ? colors.onBrandPrimary : colors.onSurface }}>{m.display_name}</T></Pressable>)}</View>
        </>) : <T style={{ fontSize: 12, color: colors.muted }}>Aún no hay otros miembros activos para asignar roles de copiloto o cola.</T>}
        <View style={{ marginTop: spacing.md }}><Button testID="convoy-create-button" title="Iniciar convoy" onPress={() => create.mutate()} loading={create.isPending} disabled={!picked || !name.trim()} /></View>
      </KeyboardAwareScrollView>
    </View>
  );
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.regular, fontSize: 15, color: c.onSurface },
  result: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
}));
