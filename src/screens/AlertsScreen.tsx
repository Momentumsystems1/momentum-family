import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function AlertsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Alertas</Text>
      <Text style={styles.subtitle}>Solo las importantes, configuradas por persona y dispositivo.</Text>
      <Pressable style={styles.sos}><Text style={styles.sosTitle}>SOS</Text><Text style={styles.sosText}>Mantén pulsado para pedir ayuda a la familia</Text></Pressable>
      {[
        ['¿Todo bien?', 'Solicita una confirmación rápida sin iniciar una llamada.'],
        ['Llegadas y salidas', 'Avisos de lugares definidos por la familia.'],
        ['V16', 'Activación del vehículo familiar y seguimiento del incidente.'],
      ].map(([title, text]) => (
        <View key={title} style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{text}</Text><Text style={styles.pending}>PENDIENTE DE CONEXIÓN</Text></View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.muted, marginTop: 8, lineHeight: 20, marginBottom: spacing.xl },
  sos: { backgroundColor: 'rgba(255,92,112,0.13)', borderWidth: 1, borderColor: 'rgba(255,92,112,0.35)', padding: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.lg },
  sosTitle: { color: colors.danger, fontSize: 30, fontWeight: '900' },
  sosText: { color: colors.text, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  cardText: { color: colors.muted, marginTop: 7, lineHeight: 20 },
  pending: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: spacing.md, letterSpacing: 1 },
});
