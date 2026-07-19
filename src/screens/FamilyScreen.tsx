import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MemberCard } from '../components/MemberCard';
import { mockFamily } from '../data/mockFamily';
import { colors, radius, spacing } from '../theme/tokens';
import { FamilyMember } from '../types/domain';

type Props = { onMemberPress: (member: FamilyMember) => void };

export function FamilyScreen({ onMemberPress }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>MOMENTUM FAMILY</Text>
          <Text style={styles.title}>Todo en orden</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>EN DIRECTO</Text></View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryNumber}>3</Text>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Miembros conectados</Text>
          <Text style={styles.summaryText}>La familia comparte ubicación con consentimiento.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Tu familia</Text>
      {mockFamily.map((member) => (
        <MemberCard key={member.id} member={member} onPress={() => onMemberPress(member)} />
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Privacidad por diseño</Text>
        <Text style={styles.noticeText}>Cada miembro controla cuándo comparte su ubicación y qué alertas recibe.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 6 },
  liveText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: 'rgba(79, 140, 255, 0.25)' },
  summaryNumber: { color: colors.text, fontSize: 42, fontWeight: '800', marginRight: spacing.md },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  summaryText: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  notice: { marginTop: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  noticeTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  noticeText: { color: colors.muted, marginTop: 7, lineHeight: 20 },
});
