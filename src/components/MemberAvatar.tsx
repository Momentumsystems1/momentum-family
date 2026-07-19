import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  initials: string;
  size?: number;
  online?: boolean;
};

export function MemberAvatar({ initials, size = 52, online = true }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
      <View
        style={[
          styles.status,
          {
            backgroundColor: online ? colors.success : colors.muted,
            borderRadius: size * 0.11,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: {
    color: colors.text,
    fontWeight: '700',
  },
  status: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
