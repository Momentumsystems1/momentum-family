// Profile / Sistema: identity, avatar, plan, legal documents, consent history, sign out.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { PersonAvatar } from "@/src/components/orbs";
import { Button, Header, Pill, T, toast } from "@/src/components/ui";
import { AVATAR_COLORS } from "@/src/copy";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, reload, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const [name, setName] = useState(user?.profile?.name ?? "");
  const [color, setColor] = useState(user?.avatar?.color ?? AVATAR_COLORS[0]);
  const consents = useQuery({ queryKey: ["consents"], queryFn: () => api<any[]>("/consents") });
  const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => api<any>("/entitlements") });
  const save = useMutation({
    mutationFn: async () => { await api("/profile", { method: "PUT", json: { name, language: "es" } }); await api("/profile/avatar", { method: "PUT", json: { color, symbol: user?.avatar?.symbol ?? "pin", outline: "solid" } }); await api("/profile/onboarding-step", { method: "PUT", json: { step: user?.onboarding?.completed ? "done" : user?.onboarding?.step } }); },
    onSuccess: async () => { await reload(); toast("Perfil actualizado", "success"); }, onError: (e: any) => toast(e.message, "error"),
  });
  return (
    <View style={s.root} testID="profile-screen">
      <Header title="Perfil y sistema" />
      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }} bottomOffset={24}>
        <View style={{ alignItems: "center" }}><PersonAvatar name={name || "?"} color={color} size={72} symbol={user?.avatar?.symbol} /></View>
        <TextInput testID="profile-edit-name" style={s.input} value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.muted} />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>{AVATAR_COLORS.map((c) => <Pressable key={c} testID={`profile-color-${c.replace("#", "")}`} onPress={() => setColor(c)} style={[s.swatch, { backgroundColor: c }, color === c && { borderColor: colors.onSurface }]} />)}</View>
        <Button testID="profile-save" title="Guardar" onPress={() => save.mutate()} loading={save.isPending} disabled={!name.trim()} />
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><T weight="bold" style={{ flex: 1 }}>Plan</T><Pill label={ent.data?.plan_name ?? "—"} tone="cyan" /></View>
          <T style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Cuenta: {user?.email} · rol {user?.account_role}</T>
          <View style={{ marginTop: spacing.sm }}><Button small testID="profile-plans" title="Ver planes" variant="secondary" onPress={() => router.push("/plans")} /></View>
        </View>
        <View style={s.card}>
          <T weight="bold">Documentos y consentimientos</T>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: spacing.sm }}>
            {[["terms", "Condiciones"], ["privacy", "Privacidad"], ["security", "Seguridad"], ["how", "Cómo funciona"]].map(([k, l]) => <Button key={k} small testID={`legal-${k}`} title={l} variant="secondary" onPress={() => router.push(`/legal/${k}`)} />)}
          </View>
          {(consents.data ?? []).map((c) => <T key={c.id} style={{ fontSize: 12, color: colors.muted, marginTop: 6 }} testID="consent-row">{c.document} v{c.version} · {c.status} · {new Date(c.recorded_at).toLocaleString("es-ES")} · {c.platform}</T>)}
        </View>
        <View style={s.card}>
          <T weight="bold">Accesibilidad</T>
          <T style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Sentinel respeta “Reducir movimiento” del sistema, usa color + icono + texto en todos los estados y objetivos táctiles de al menos 44 pt. El tema Día/Noche sigue la configuración del dispositivo.</T>
        </View>
        <Button testID="profile-signout" title="Cerrar sesión" variant="ghost" onPress={async () => { await signOut(); router.replace("/onboarding/account"); }} />
      </KeyboardAwareScrollView>
    </View>
  );
}
const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  input: { height: 52, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.regular, fontSize: 15, color: c.onSurface },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: "transparent" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
}));
