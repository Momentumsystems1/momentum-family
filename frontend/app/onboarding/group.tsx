// Functional BAYMOVE Circle Express. One explicit POST creates a circle.
// No automatic creation on mount, fake orbit slots, or simulated deliveries.
import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, unavailableOf } from "@/src/api";
import { useAuth } from "@/src/auth";
import { CircleOrbit } from "@/src/components/CircleOrbit";
import { AddMemberSheet, MemberInfo, MemberSheet, NewInvite } from "@/src/components/sheets";
import { Button, showUnavailable, T, toast } from "@/src/components/ui";
import { dispatchInvitation, Invitation } from "@/src/invites";
import { fonts, radius, spacing, useTheme } from "@/src/theme";

type Group = {
  id: string;
  name: string;
  state: string;
  members: (MemberInfo & { user_id?: string | null; color: string })[];
  stats: { members: number; pending: number };
};

const RED = "#C91E32";
const LIGHT = "rgba(201,30,50,0.05)";
const INK = "#30272B";
const MUTED = "#716873";

export default function GroupCreation() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, reload } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<MemberInfo | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const groups = useQuery({
    queryKey: ["groups"],
    queryFn: () => api<Group[]>("/groups"),
    refetchInterval: 15000,
  });
  const group = groups.data?.[0] ?? null;

  const create = useMutation({
    mutationFn: async (title: string) => api<Group>("/groups", {
      method: "POST", json: { name: title },
    }),
    onSuccess: async (created) => {
      qc.setQueryData<Group[]>(["groups"], (prev) => prev?.length ? prev : [created]);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Círculo creado en tu cuenta", "success");
    },
    onError: (e: unknown) => {
      const u = unavailableOf(e);
      if (u) showUnavailable(u);
      else toast((e as Error).message || "No se pudo crear el círculo", "error");
      // If a network response was lost AFTER persistence, refetch avoids a
      // duplicate attempt against the free plan's one-circle limit.
      void groups.refetch();
    },
  });

  const invite = useMutation({
    mutationFn: async (payload: NewInvite) =>
      api<{ invitation: Invitation; member: MemberInfo }>(`/groups/${group!.id}/invitations`, {
        method: "POST", json: payload,
      }),
    onSuccess: async () => {
      setAdding(false);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      toast("Invitación preparada. Pulsa Compartir para enviarla.", "success");
    },
    onError: (e: unknown) => {
      const u = unavailableOf(e);
      if (u) showUnavailable(u);
      else toast((e as Error).message || "No se pudo preparar la invitación", "error");
    },
  });

  const mutation = useMutation({
    mutationFn: (path: string) => api(path, { method: "POST" }),
    onSuccess: () => {
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const share = async (member: Group["members"][number]) => {
    const v = member.invitation as Invitation | undefined;
    if (!v?.id || !v.link) {
      toast("Enlace no disponible. Actualiza el círculo.", "error");
      return;
    }
    setSharingId(member.id);
    try {
      const r = await dispatchInvitation({
        ...v,
        name: member.display_name,
        group_name: group!.name,
        membership: member.membership,
      });
      toast(r.label, r.ok ? "success" : "error");
      await qc.invalidateQueries({ queryKey: ["groups"] });
    } finally {
      setSharingId(null);
    }
  };

  const goToMap = async () => {
    if (!group || finishing) return;
    setFinishing(true);
    try {
      // The map is entered only after the server confirms onboarding.
      await api(`/groups/${group.id}/formed`, { method: "POST" });
      await reload();
      await qc.invalidateQueries({ queryKey: ["groups"] });
      router.replace({ pathname: "/map", params: { welcome: "1" } });
    } catch (e: any) {
      toast(e?.message ?? "No se pudo terminar. Inténtalo otra vez.", "error");
    } finally {
      setFinishing(false);
    }
  };

  const skip = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await api("/profile/onboarding-step", { method: "PUT", json: { step: "done" } });
      await reload();
      router.replace("/map");
    } catch (e: any) {
      toast(e?.message ?? "No se pudo continuar", "error");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} testID="circle-express-screen">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        maxWidth: 580,
        width: "100%",
        alignSelf: "center",
        gap: spacing.lg,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 4, flex: 1 }}>
            <T weight="bold" style={{ fontSize: 28, color: INK }}>Tu círculo BAYMOVE</T>
            <T style={{ color: MUTED, fontSize: 13 }}>Un espacio privado para tus personas de confianza.</T>
          </View>
          <View style={{ backgroundColor: LIGHT, borderRadius: radius.pill, padding: 12 }}>
            <Ionicons name="people" size={22} color={RED} />
          </View>
        </View>

        {groups.isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
            <ActivityIndicator color={RED} />
            <T style={{ color: MUTED }}>Comprobando tus círculos…</T>
          </View>
        ) : groups.isError && !group ? (
          <View style={{ backgroundColor: LIGHT, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
            <T style={{ color: INK }}>No se pudo conectar con BAYMOVE. No crearemos un círculo sin confirmación del servidor.</T>
            <Button testID="circle-express-retry" title="Volver a intentar" onPress={() => void groups.refetch()} />
          </View>
        ) : group ? (
          <>
            <View style={{ backgroundColor: LIGHT, borderRadius: radius.lg, padding: spacing.md, alignItems: "center" }}>
              <T weight="semibold" style={{ color: INK, fontSize: 20 }}>{group.name}</T>
              <T style={{ color: MUTED, fontSize: 12 }}>{group.stats?.members ?? 1} personas confirmadas · {group.stats?.pending ?? 0} invitaciones pendientes</T>
              <CircleOrbit
                name={group.name}
                members={group.members}
                ownerId={user?.id}
                size={Math.min(width - spacing.xl * 2, 360)}
                onMemberPress={(m) => setSelected(group.members.find((member) => member.id === m.id) ?? null)}
              />
            </View>
            <Button testID="circle-express-add" title="Añadir persona" icon="person-add" onPress={() => setAdding(true)} />
            {(group.members ?? []).filter(m => m.status === "pending").map(m => (
              <View key={m.id} style={{
                flexDirection: "row", alignItems: "center", borderRadius: radius.md,
                borderWidth: 1, borderColor: "#E8E1E4", backgroundColor: "#FFFFFF",
                padding: 12, gap: 12,
              }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#ECE8ED" }}>
                  <Ionicons name="time-outline" size={18} color={MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="semibold" style={{ color: INK }}>{m.display_name}</T>
                  <T style={{ color: MUTED, fontSize: 12 }}>{m.invitation?.status === "prepared" ? "Enlace aún sin compartir" : "Pendiente de aceptación"}</T>
                </View>
                <Pressable
                  testID={`circle-express-share-${m.id}`}
                  onPress={() => void share(m)}
                  disabled={sharingId === m.id}
                  accessibilityRole="button"
                  style={{ backgroundColor: LIGHT, borderRadius: 12, padding: 12 }}
                >
                  <T weight="semibold" style={{ color: RED, fontSize: 13 }}>{sharingId === m.id ? "Abriendo…" : "Compartir"}</T>
                </Pressable>
              </View>
            ))}
            <Button testID="circle-express-finish" title="Abrir mi círculo en el mapa" icon="map" loading={finishing} onPress={() => void goToMap()} />
            <T style={{ fontSize: 12, lineHeight: 18, color: MUTED, textAlign: "center" }}>
              Las invitaciones solo se activan cuando la otra persona las acepta. Compartir ubicación requiere permiso independiente.
            </T>
          </>
        ) : (
          <>
            <View style={{ backgroundColor: LIGHT, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
              <T weight="semibold" style={{ fontSize: 15, color: INK }}>Nombre del círculo</T>
              <TextInput
                testID="circle-express-name"
                placeholder="Ej. Mi familia"
                placeholderTextColor="#8C828A"
                autoCapitalize="sentences"
                maxLength={48}
                value={name}
                onChangeText={setName}
                style={{
                  borderColor: "#E5DDE1", borderWidth: 1, borderRadius: radius.md,
                  height: 54, paddingHorizontal: spacing.lg, fontSize: 17,
                  color: INK, backgroundColor: "#FFFFFF", fontFamily: fonts.medium,
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                <View style={{ borderColor: RED, borderWidth: 1.5, backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }}>
                  <T weight="semibold" style={{ color: RED }}>Círculo Base</T>
                  <T style={{ fontSize: 11, color: MUTED }}>Personas de confianza</T>
                </View>
                <View style={{ borderColor: "#E6E0E2", borderWidth: 1, backgroundColor: "#F8F7F8", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 }}>
                  <T weight="semibold" style={{ color: MUTED }}>Flash</T>
                  <T style={{ fontSize: 11, color: MUTED }}>Próximamente</T>
                </View>
              </View>
              <Button
                testID="circle-express-create"
                title="Crear círculo"
                icon="add-circle"
                loading={create.isPending}
                disabled={!name.trim() || create.isPending}
                onPress={() => create.mutate(name.trim())}
              />
              <T style={{ color: MUTED, fontSize: 12 }}>
                No necesitas elegir un número de personas. Podrás invitarlas después, individualmente o como invitados temporales.
              </T>
            </View>
            <Pressable accessibilityRole="button" testID="circle-express-skip" disabled={finishing} onPress={() => void skip()} style={{ padding: spacing.md }}>
              <T style={{ color: MUTED, textAlign: "center" }}>Continuar sin círculo por ahora</T>
            </Pressable>
          </>
        )}
        <View style={{ flex: 1 }} />
      </ScrollView>
      <AddMemberSheet visible={adding} onClose={() => setAdding(false)} loading={invite.isPending} onSubmit={v => invite.mutate(v)} />
      <MemberSheet member={selected} onClose={() => setSelected(null)} canManage
        onResend={() => selected?.invitation?.id && mutation.mutate(`/invitations/${selected.invitation.id}/resend`)}
        onCancel={() => selected?.invitation?.id && mutation.mutate(`/invitations/${selected.invitation.id}/cancel`)}
      />
    </View>
  );
}
