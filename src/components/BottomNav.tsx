import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';

export type TabKey = 'family' | 'map' | 'alerts' | 'settings';

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

const tabs: Array<{ key: TabKey; label: string; glyph: string }> = [
  { key: 'family', label: 'Familia', glyph: '●' },
  { key: 'map', label: 'Mapa', glyph: '⌖' },
  { key: 'alerts', label: 'Alertas', glyph: '!' },
  { key: 'settings', label: 'Ajustes', glyph: '☰' },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.item}>
            <Text style={[styles.glyph, selected && styles.selected]}>{tab.glyph}</Text>
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingBottom: 18,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  glyph: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 11 },
  selected: { color: colors.primary },
});
