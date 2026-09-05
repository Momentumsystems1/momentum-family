import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapCanvas } from "@/src/components/MapCanvas";
import type { OrbFamily, OrbTool } from "@/src/copy";
import { Orb } from "@/src/orb/Orb";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

/**
 * ORB PERSONALITY LAB
 * -------------------
 * Isolated playground for polishing the Sentinel Orb over the real map shell.
 * No backend actions, no navigation, no permissions, no production workflows.
 * Every final tool selection ends in the same fake-first popup: HERRAMIENTA.
 *
 * This route intentionally keeps product logic out of the loop so the Orb can
 * be redesigned repeatedly without touching the operational app.
 */
export default function OrbLab() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useStyles();
  const [toolPopup, setToolPopup] = useState(false);

  const handleTool = (_family: OrbFamily, _tool: OrbTool) => {
    setToolPopup(true);
  };

  return (
    <View style={s.root} testID="orb-personality-lab">
      <MapCanvas people={[]} onPersonPress={() => undefined} />

      <View pointerEvents="none" style={[s.labBadge, { top: insets.top + spacing.md }]}>
        <Text style={s.labTitle}>ORB LAB</Text>
        <Text style={s.labSub}>Solo personalidad · sin lógica de producto</Text>
      </View>

      <Orb onTool={handleTool} entitlements={{}} />

      <Modal
        visible={toolPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setToolPopup(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.toolText}>HERRAMIENTA</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar herramienta"
              testID="orb-lab-close-tool"
              onPress={() => setToolPopup(false)}
              style={({ pressed }) => [s.closeButton, pressed && { opacity: 0.72 }]}
            >
              <Text style={s.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.mapTint },
  labBadge: {
    position: "absolute",
    left: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: c.glassStrong,
    borderWidth: 1,
    borderColor: c.border,
  },
  labTitle: {
    color: c.onSurface,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  labSub: {
    color: c.muted,
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 10, 24, 0.48)",
    padding: spacing.xl,
  },
  modalCard: {
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  toolText: {
    color: c.onSurface,
    fontFamily: fonts.bold,
    fontSize: 24,
    letterSpacing: 1.5,
  },
  closeButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: c.brandPrimary,
  },
  closeText: {
    color: c.onBrandPrimary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
}));
