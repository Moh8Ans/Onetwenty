// src/components/HomeHeader.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeHeader() {
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();

  const displayName =
    user?.firstName ?? user?.fullName?.split(' ')[0] ?? user?.username ??
    user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'there';

  const initial = (
    user?.firstName?.[0] ?? user?.fullName?.[0] ?? user?.username?.[0] ??
    user?.emailAddresses?.[0]?.emailAddress?.[0] ?? '?'
  ).toUpperCase();

  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.name, { color: theme.colors.textPrimary, fontFamily: fonts.bold }]}>{displayName}</Text>
        <Text style={[styles.greeting, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>{getGreeting()}</Text>
      </View>
      <View style={styles.rightRow}>
        <Pressable
          style={[styles.themeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={styles.themeIcon}>{theme.mode === 'dark' ? '🌙' : '☀️'}</Text>
        </Pressable>
        <LinearGradient colors={['#34d399', '#4f46e5']} style={styles.avatarRing}>
          <View style={[styles.avatarInner, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.avatarText, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]}>{initial}</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22 },
  greeting: { fontSize: 14, marginTop: 2 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  themeIcon: { fontSize: 16 },
  avatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2, justifyContent: 'center', alignItems: 'center' },
  avatarInner: { width: '100%', height: '100%', borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15 },
});