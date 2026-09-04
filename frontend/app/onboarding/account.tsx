// Account creation / sign in. After account exists, the locally captured terms acceptance is recorded as consent evidence.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { api, clientMeta } from "@/src/api";
import { getLocalOnboarding, setLocalOnboarding, useAuth } from "@/src/auth";
import { OnboardingScreen } from "@/src/components/OnboardingScreen";
import { T, toast } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Account() {
  const router = useRouter();
  const { register, signIn } = useAuth();
  const s = useStyles();
  const { colors } = useTheme();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const u = mode === "register" ? await register(email.trim(), password) : await signIn(email.trim(), password);
      const local = await getLocalOnboarding();
      if (mode === "register" || !u.onboarding?.completed) {
        await api("/consents", { method: "POST", json: { document: "terms", version: "2026-06-01", accepted: true, accepted_at_client: local.terms_accepted_at ?? new Date().toISOString(), ...clientMeta } }).catch(() => null);
      }
      await setLocalOnboarding({ step: "consent" });
      if (u.onboarding?.completed) router.replace("/map");
      else router.replace(u.onboarding?.step === "profile" ? "/onboarding/profile" : u.onboarding?.step === "group" ? "/onboarding/group" : "/onboarding/consent");
    } catch (e: any) {
      toast(e?.message ?? "No se pudo continuar", "error");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={16} style={{ flex: 1 }}>
      <OnboardingScreen step="account" testID="onboarding-account" title={mode === "register" ? "Crea tu cuenta Sentinel" : "Inicia sesión en Sentinel"}
        body="Tu cuenta identifica tus consentimientos, tus grupos y tus permisos. Solo pedimos lo imprescindible."
        primary={mode === "register" ? "Crear cuenta" : "Entrar"} onPrimary={submit} loading={loading} primaryDisabled={!email.includes("@") || password.length < 8}
        secondary={mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta nueva"} onSecondary={() => setMode(mode === "register" ? "login" : "register")} showBack>
        <View style={{ gap: spacing.md }}>
          <TextInput testID="account-email-input" style={s.input} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
          <TextInput testID="account-password-input" style={s.input} placeholder="Contraseña (mínimo 8 caracteres)" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} autoComplete={mode === "register" ? "new-password" : "password"} />
          <Pressable disabled style={s.providers} testID="account-social-providers">
            <T style={{ color: colors.muted, fontSize: 12 }}>Google · Microsoft · Supabase: SERVICIO NO CONFIGURADO (pendiente de credenciales)</T>
          </Pressable>
        </View>
      </OnboardingScreen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  input: { height: 54, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.regular, fontSize: 16, color: c.onSurface },
  providers: { padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, opacity: 0.8 },
}));
