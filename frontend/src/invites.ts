// Legitimate invitation dispatch through OS capabilities. We only ever report what the OS confirmed.
import * as SMS from "expo-sms";
import { Linking, Platform } from "react-native";

import { api } from "@/src/api";

export type Invitation = { id: string; name: string; channel: "whatsapp" | "sms"; status: string; link: string; group_name: string; membership: string; phone?: string | null; created_at?: string; dispatched_at?: string | null };

export function inviteText(inv: Invitation) {
  return `Hola ${inv.name}, te invito a mi grupo "${inv.group_name}" en Sentinel Family. Abre este enlace para aceptar: ${inv.link}`;
}

/** Returns a truthful state label. Never "Mensaje enviado" unless the OS reported it. */
export async function dispatchInvitation(inv: Invitation): Promise<{ ok: boolean; label: string }> {
  const text = inviteText(inv);
  try {
    if (inv.channel === "whatsapp") {
      // Con teléfono: chat directo con esa persona. Sin teléfono: selector de contactos de WhatsApp.
      const digits = (inv.phone ?? "").replace(/[^0-9]/g, "");
      const url = digits
        ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      const can = Platform.OS === "web" ? true : await Linking.canOpenURL(url).catch(() => true);
      if (!can) return { ok: false, label: "WhatsApp no disponible en este dispositivo" };
      await Linking.openURL(url);
      await api(`/invitations/${inv.id}/dispatched`, { method: "POST" });
      return { ok: true, label: "Invitación preparada en WhatsApp" };
    }
    if (Platform.OS !== "web" && (await SMS.isAvailableAsync())) {
      const r = await SMS.sendSMSAsync([], text);
      if (r.result === "sent") {
        await api(`/invitations/${inv.id}/dispatched`, { method: "POST" });
        return { ok: true, label: "SMS enviado (confirmado por el sistema)" };
      }
      if (r.result === "cancelled") return { ok: false, label: "Envío de SMS cancelado" };
      await api(`/invitations/${inv.id}/dispatched`, { method: "POST" });
      return { ok: true, label: "Invitación preparada (estado de entrega desconocido)" };
    }
    await Linking.openURL(`sms:?&body=${encodeURIComponent(text)}`);
    await api(`/invitations/${inv.id}/dispatched`, { method: "POST" });
    return { ok: true, label: "Invitación preparada" };
  } catch {
    return { ok: false, label: "No se pudo abrir el canal de invitación" };
  }
}
