import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { setLocalOnboarding } from "@/src/auth";
import { OnboardingScreen } from "@/src/components/OnboardingScreen";
import { T } from "@/src/components/ui";
import { ONBOARDING } from "@/src/copy";
import { useTheme } from "@/src/theme";

export default function Transparency() {
  const router = useRouter();
  const { colors } = useTheme();
  const c = ONBOARDING.transparency;
  return (
    <OnboardingScreen step="transparency" testID="onboarding-transparency" title={c.title} body={c.body} primary={c.primary} showBack
      onPrimary={async () => { await setLocalOnboarding({ step: "security" }); router.push("/onboarding/security"); }}>
      <View style={{ gap: 12 }}>
        {["Qué está accediendo", "Qué está compartiendo", "Con quién", "Por qué", "Desde cuándo", "Hasta cuándo"].map((t) => (
          <View key={t} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name="eye-outline" size={18} color={colors.brandPrimary} /><T style={{ fontSize: 15 }}>{t}</T>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />
        {c.bullets.map((b) => (
          <View key={b} style={{ flexDirection: "row", gap: 10, alignItems: "center" }} testID="transparency-bullet">
            <Ionicons name="close-circle" size={18} color={colors.error} /><T style={{ fontSize: 15 }}>{b}</T>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
