import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FamilyMember } from '../types/domain';
import { colors, radius, spacing } from '../theme/tokens';
import { MemberAvatar } from './MemberAvatar';

type Props = {
  member: FamilyMember;
  onPress: () => void;
};

const activityColors: Record<FamilyMember['activity'], string> = {
  walking: colors.success,
  running: colors.warning,
  driving: colors.primary,
  stopped: colors.violet,
  offline: colors.muted,
};

export function MemberCard({ member, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <MemberAvatar initials={member.initials} online={member.activity !== 'offline'} />
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.battery}>{member.battery}%</Text>
        </View>
        <View style={styles.activityRow}>
          <View style={[styles.dot, { backgroundColor: activityColors[member.activity] }]} />
          <Text style={styles.activity}>{member.activityLabel}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.seen}>{member.lastSeenLabel}</Text>
        </View>
        <Text style={styles.place} numberOfLines={1}>{member.placeLabel}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.78 },
  content: { flex: 1, marginLeft: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  battery: { color: colors.muted, fontSize: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  activity: { color: colors.text, fontSize: 13 },
  separator: { color: colors.muted, marginHorizontal: 5 },
  seen: { color: colors.muted, fontSize: 13 },
  place: { color: colors.muted, marginTop: 5, fontSize: 13 },
  arrow: { color: colors.muted, fontSize: 28, marginLeft: spacing.sm },
});
