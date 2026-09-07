// Avatar photo upload — Supabase Storage bucket "avatars" (public read, owner write).
// Folder rule (enforced by storage RLS): avatars/<supabase_user_id>/<file>.
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { supabase } from "@/src/supabase";

export async function pickAndUploadAvatar(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];

  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Sesión no iniciada");

  const ext = (asset.mimeType?.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${uid}/avatar-${Date.now()}.${ext}`;

  let body: Blob | File;
  if (Platform.OS === "web") {
    body = await (await fetch(asset.uri)).blob();
  } else {
    // React Native: FormData upload
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: path.split("/")[1], type: asset.mimeType ?? "image/jpeg" } as any);
    const { error } = await supabase.storage.from("avatars").upload(path, form as any, { upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.storage.from("avatars").upload(path, body, { contentType: asset.mimeType ?? "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
