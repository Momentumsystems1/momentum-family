import { StyleSheet, Text, View } from 'react-native';
import { MemberAvatar } from '../components/MemberAvatar';
import { mockFamily } from '../data/mockFamily';
import { colors, radius, spacing } from '../theme/tokens';

export function MapScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.mapMock}>
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />
        <Text style={styles.mapTitle}>Azure Maps</Text>
        <Text style={styles.mapSubtitle}>Se conectará mediante token temporal, sin guardar la clave en la app.</Text>
        <View style={[styles.pin, { top: '38%', left: '46%' }]}><MemberAvatar initials={mockFamily[0].initials} size={48} /></View>
        <View style={[styles.pin, { top: '56%', left: '66%' }]}><MemberAvatar initials={mockFamily[1].initials} size={48} /></View>
        <View style={[styles.pin, { top: '68%', left: '28%' }]}><MemberAvatar initials={mockFamily[2].initials} size={48} /></View>
        <View style={styles.trafficLegend}><View style={styles.trafficLine} /><Text style={styles.legendText}>Tráfico e incidencias: siguiente fase</Text></View>
      </View>
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Todos están localizados</Text>
        <Text style={styles.sheetText}>Esta primera base funciona sin consumir llamadas de Azure. Activaremos tráfico, incidencias y rutas cuando el núcleo familiar esté conectado a Supabase.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg },
  mapMock: { flex: 1, minHeight: 430, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#101B2D', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  gridHorizontal: { position: 'absolute', width: '130%', height: 1, backgroundColor: 'rgba(148,163,184,0.14)', transform: [{ rotate: '-22deg' }] },
  gridVertical: { position: 'absolute', width: 1, height: '130%', backgroundColor: 'rgba(148,163,184,0.14)', transform: [{ rotate: '25deg' }] },
  mapTitle: { color: colors.text, fontSize: 25, fontWeight: '800' },
  mapSubtitle: { color: colors.muted, textAlign: 'center', maxWidth: 280, marginTop: 10, lineHeight: 20 },
  pin: { position: 'absolute' },
  trafficLegend: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(7,11,20,0.84)', padding: spacing.md, borderRadius: radius.md },
  trafficLine: { width: 30, height: 4, borderRadius: 3, backgroundColor: colors.warning, marginRight: 10 },
  legendText: { color: colors.text, fontSize: 12, flex: 1 },
  sheet: { marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  sheetText: { color: colors.muted, marginTop: 8, lineHeight: 20 },
});
