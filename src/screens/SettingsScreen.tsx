import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function SettingsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ajustes</Text>
      {['Mi familia', 'Permisos y privacidad', 'Teléfonos y dispositivos', 'Vehículos y V16', 'Lugares habituales'].map((item) => (
        <View key={item} style={styles.row}><Text style={styles.rowText}>{item}</Text><Text style={styles.arrow}>›</Text></View>
      ))}
      <View style={styles.dev}><Text style={styles.devTitle}>Modo de desarrollo seguro</Text><Text style={styles.devText}>Supabase y Azure Maps todavía no están conectados. La app usa datos simulados y no genera consumo externo.</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  rowText: { color: colors.text, flex: 1, fontWeight: '600' },
  arrow: { color: colors.muted, fontSize: 25 },
  dev: { marginTop: spacing.lg, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.lg },
  devTitle: { color: colors.primary, fontWeight: '800' },
  devText: { color: colors.muted, marginTop: 8, lineHeight: 20 },
});
