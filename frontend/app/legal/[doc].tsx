import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { Header, Pill, T } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ["legal", doc], queryFn: () => api<{ title: string; version: string; status: string; body: string[] }>(`/legal/documents/${doc}`) });
  return (
    <View style={s.root} testID="legal-document">
      <Header title={q.data?.title ?? "Documento"} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        {q.data ? (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pill label={`Versión ${q.data.version}`} tone="blue" />
              <Pill label={q.data.status} tone={q.data.status.startsWith("PENDIENTE") ? "amber" : "muted"} testID="legal-status" />
            </View>
            {q.data.body.map((p, i) => <T key={i} style={{ fontSize: 15, lineHeight: 23, color: colors.onSurfaceSecondary }}>{p}</T>)}
          </>
        ) : <T style={{ color: colors.muted }}>{q.isError ? "No se pudo cargar el documento" : "Cargando…"}</T>}
      </ScrollView>
    </View>
  );
}
const useStyles = makeStyles((c) => ({ root: { flex: 1, backgroundColor: c.surface } }));
