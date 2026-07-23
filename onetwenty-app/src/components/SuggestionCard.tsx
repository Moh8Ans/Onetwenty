// src/components/SuggestionCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';

type SuggestionCardProps = {
  title: string;
  groupLabel: string;
  potentialPoints: number;
  effortLabel: string;
  effortGradient: readonly [string, string];
  onPress: () => void;
};

export function SuggestionCard({ title, groupLabel, potentialPoints, effortLabel, effortGradient, onPress }: SuggestionCardProps) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme.gradients.card}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: theme.colors.border }]}
    >
      <View style={styles.topRow}>
        <LinearGradient colors={effortGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
          <Text style={[styles.badgeText, { fontFamily: fonts.semibold }]}>{effortLabel}</Text>
        </LinearGradient>
        <Text style={[styles.points, { fontFamily: fonts.bold }]}>+{potentialPoints} <Text style={[styles.pointsUnit, { fontFamily: fonts.semibold }]}>PTS</Text></Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]} numberOfLines={2}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>{groupLabel}</Text>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Pressable onPress={onPress}>
        <Text style={[styles.addLink, { color: theme.gradients.quick[0], fontFamily: fonts.medium }]}>Add activity →</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, width: 260, borderWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, color: '#0a0e1a' },
  points: { color: '#fbbf24', fontSize: 18 },
  pointsUnit: { fontSize: 11 },
  title: { fontSize: 16, minHeight: 44 },
  subtitle: { fontSize: 13, marginTop: 4 },
  divider: { height: 1, marginVertical: 12 },
  addLink: { fontSize: 14 },
});