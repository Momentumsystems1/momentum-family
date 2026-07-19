import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MemberAvatar } from '../components/MemberAvatar';
import { colors, radius, spacing } from '../theme/tokens';
import { FamilyMember } from '../types/domain';

type Props = { member: FamilyMember; onBack: () => void };

export function MemberScreen({ member, onBack }: Props) {
  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹ Familia</Text></Pressable>
      <View style={styles.profile}><MemberAvatar initials={member.initials} size={82} /><Text style={styles.name}>{member.name}</Text><Text style={styles.status}>{member.activityLabel} · {member.lastSeenLabel}</Text><Text style={styles.place}>{member.placeLabel}</Text></View>
      <View style={styles.actions}>
        <Pressable style={styles.primary}><Text style={styles.primaryText}>¿Todo bien?</Text></Pressable>
        <Pressable style={styles.secondary}><Text style={styles.secondaryText}>Reunirse</Text></Pressable>
      </View>
      <View style={styles.info}><Text style={styles.infoTitle}>Información compartida</Text><Text style={styles.infoText}>Batería: {member.battery}%</Text><Text style={styles.infoText}>Actividad: {member.activityLabel}</Text>{member.etaMinutes ? <Text style={styles.infoText}>Llegada estimada: {member.etaMinutes} min</Text> : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg },
  back: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  profile: { alignItems: 'center', marginTop: spacing.xl },
  name: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: spacing.md },
  status: { color: colors.text, marginTop: 8 },
  place: { color: colors.muted, marginTop: 5 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  primary: { flex: 1, padding: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center' },
  primaryText: { color: colors.white, fontWeight: '800' },
  secondary: { flex: 1, padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '800' },
  info: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.text, fontWeight: '800', marginBottom: spacing.md },
  infoText: { color: colors.muted, marginBottom: 8 },
});
