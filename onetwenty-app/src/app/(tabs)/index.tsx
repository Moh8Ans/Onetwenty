// src/app/(tabs)/index.tsx
import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback } from 'react';
import { Text, View, ActivityIndicator, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '@/lib/api';
import { RingCard } from '@/components/RingCard';
import { HomeHeader } from '@/components/HomeHeader';
import { SuggestionCard } from '@/components/SuggestionCard';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';

type Activity = { id: number; categoryId: number; title: string; computedPoints: number | null; status: string; createdAt: string };
type Category = { id: number; group: number; name: string; majorHead: string; maxPoints: number };
type Suggestion = { category: Category & { srNo: string }; potentialPoints: number; effort: 'quick' | 'flexible' | 'moderate' | 'long_term'; alreadyStarted: boolean };

const GROUP_TARGET = 40;
const TOTAL_TARGET = 120;
const GROUP_NAMES: Record<number, string> = { 1: 'Group I', 2: 'Group II', 3: 'Group III' };
const GROUP_ICONS: Record<number, string> = { 1: '🏆', 2: '⚙', 3: '💡' };

export default function HomeScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const [activitiesData, categoriesData, suggestionsData] = await Promise.all([
        apiFetch('/activities', token!),
        apiFetch('/categories', token!),
        apiFetch('/activities/suggestions', token!),
      ]);
      setActivities(activitiesData);
      setCategories(categoriesData);
      setSuggestions(suggestionsData.suggestions ?? []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const GROUP_GRADIENTS: Record<number, readonly [string, string]> = {
    1: theme.gradients.group1, 2: theme.gradients.group2, 3: theme.gradients.group3,
  };
  const EFFORT_STYLE: Record<Suggestion['effort'], { label: string; gradient: readonly [string, string] }> = {
    quick: { label: 'Quick win', gradient: theme.gradients.quick },
    flexible: { label: 'Flexible', gradient: theme.gradients.flexible },
    moderate: { label: 'Moderate effort', gradient: theme.gradients.moderate },
    long_term: { label: 'Long-term', gradient: theme.gradients.longTerm },
  };
  const STATUS_STYLE: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: theme.colors.textSecondary },
    pending_review: { label: 'Pending', color: '#fbbf24' },
    sfa_approved: { label: 'Verified', color: theme.gradients.quick[0] },
    sfa_rejected: { label: 'Rejected', color: '#fb7185' },
    flagged: { label: 'Flagged', color: '#fb7185' },
  };

  if (loading) {
    return (
      <LinearGradient colors={theme.gradients.screenBg} style={styles.centered}>
        <ActivityIndicator color={theme.gradients.quick[0]} size="large" />
      </LinearGradient>
    );
  }

  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const verifiedByGroup: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const pendingByGroup: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const activity of activities) {
    const category = categoryMap.get(activity.categoryId);
    if (!category) continue;
    const pts = activity.computedPoints ?? 0;
    if (activity.status === 'sfa_approved') verifiedByGroup[category.group] += pts;
    else if (activity.status === 'pending_review') pendingByGroup[category.group] += pts;
  }

  const verifiedTotal = verifiedByGroup[1] + verifiedByGroup[2] + verifiedByGroup[3];
  const pendingTotal = pendingByGroup[1] + pendingByGroup[2] + pendingByGroup[3];
  const remaining = Math.max(0, TOTAL_TARGET - verifiedTotal);
  const allGroupsMet = [1, 2, 3].every(g => verifiedByGroup[g] >= GROUP_TARGET);

  // bento ordering — the group furthest from its 40-pt target gets the hero slot,
  // since that's the single most actionable number on the screen
  const groupsByGap = [1, 2, 3].sort((a, b) => (GROUP_TARGET - verifiedByGroup[b]) - (GROUP_TARGET - verifiedByGroup[a]));
  const heroGroup = groupsByGap[0];
  const compactGroups = groupsByGap.slice(1);

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <LinearGradient colors={theme.gradients.screenBg} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gradients.quick[0]} />}
      >
        <HomeHeader />
        {error ? <Text style={[styles.errorText, { fontFamily: fonts.regular }]}>{error}</Text> : null}

        <LinearGradient colors={theme.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { borderColor: theme.colors.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.heroLabel, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>Verified Progress</Text>
            <Text style={[styles.heroPercent, { fontFamily: fonts.semibold }]}>{Math.min(Math.round((verifiedTotal / TOTAL_TARGET) * 100), 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surface }]}>
            <LinearGradient
              colors={theme.gradients.quick}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min((verifiedTotal / TOTAL_TARGET) * 100, 100)}%` }]}
            />
          </View>
          <Text style={[styles.heroNumber, { color: theme.colors.textPrimary, fontFamily: fonts.bold }]}>
            {Math.min(verifiedTotal, TOTAL_TARGET)} <Text style={[styles.heroUnit, { fontFamily: fonts.semibold }]}>PTS</Text>
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.rowBetween}>
            <View><Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>Remaining</Text><Text style={[styles.fieldValue, { fontFamily: fonts.semibold }]}>{remaining} pts</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>Target</Text><Text style={[styles.fieldValue, { fontFamily: fonts.semibold }]}>{TOTAL_TARGET} pts</Text></View>
          </View>
          {allGroupsMet ? (
            <Text style={[styles.metNote, { color: theme.gradients.quick[0], fontFamily: fonts.semibold }]}>All group requirements met</Text>
          ) : (
            <Text style={[styles.targetNote, { color: theme.gradients.quick[0], fontFamily: fonts.medium }]}>You're {remaining} pts away from your target 🎯</Text>
          )}
          {pendingTotal > 0 && <Text style={[styles.pendingNote, { fontFamily: fonts.medium }]}>+{pendingTotal} pts pending SFA review, not yet counted</Text>}
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontFamily: fonts.semibold }]}>Performance</Text>
        <RingCard
          variant="hero"
          label={GROUP_NAMES[heroGroup]}
          icon={<Text>{GROUP_ICONS[heroGroup]}</Text>}
          verified={verifiedByGroup[heroGroup]}
          target={GROUP_TARGET}
          gradientId={`ring-group-${heroGroup}`}
          gradientColors={GROUP_GRADIENTS[heroGroup]}
        />
        <View style={styles.compactRow}>
          {compactGroups.map(group => (
            <RingCard
              key={group}
              variant="compact"
              label={GROUP_NAMES[group]}
              icon={<Text style={{ fontSize: 12 }}>{GROUP_ICONS[group]}</Text>}
              verified={verifiedByGroup[group]}
              target={GROUP_TARGET}
              gradientId={`ring-group-${group}`}
              gradientColors={GROUP_GRADIENTS[group]}
            />
          ))}
        </View>

        {suggestions.length > 0 && (
          <>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontFamily: fonts.semibold }]}>Smart Suggestions</Text>
              <Pressable><Text style={[styles.seeMore, { color: theme.gradients.quick[0], fontFamily: fonts.medium }]}>See all →</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {suggestions.map(s => {
                const effortStyle = EFFORT_STYLE[s.effort];
                return (
                  <SuggestionCard
                    key={s.category.id}
                    title={s.category.name}
                    groupLabel={`${GROUP_NAMES[s.category.group]} · ${s.alreadyStarted ? 'Already started' : 'Recommended'}`}
                    potentialPoints={s.potentialPoints}
                    effortLabel={effortStyle.label}
                    effortGradient={effortStyle.gradient}
                    onPress={() => router.push('/activity/upload')}
                  />
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, fontFamily: fonts.semibold }]}>Recent Log</Text>
          <Pressable onPress={() => router.push('/(tabs)/activities')}><Text style={[styles.seeMore, { color: theme.gradients.quick[0], fontFamily: fonts.medium }]}>See more →</Text></Pressable>
        </View>
        {recentActivities.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textMuted, fontFamily: fonts.regular }]}>No activities logged yet.</Text>
        ) : (
          recentActivities.map(activity => {
            const category = categoryMap.get(activity.categoryId);
            const statusStyle = STATUS_STYLE[activity.status] ?? STATUS_STYLE.draft;
            return (
              <View key={activity.id} style={[styles.logRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.logInfo}>
                  <Text style={[styles.logTitle, { color: theme.colors.textPrimary, fontFamily: fonts.medium }]} numberOfLines={1}>{activity.title || 'Untitled submission'}</Text>
                  <Text style={[styles.logMeta, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>{category ? GROUP_NAMES[category.group] : 'Unknown group'} · {new Date(activity.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.logRight}>
                  <Text style={[styles.logPoints, { fontFamily: fonts.semibold }]}>+{activity.computedPoints ?? 0}</Text>
                  <Text style={[styles.logStatus, { color: statusStyle.color, fontFamily: fonts.medium }]}>{statusStyle.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fb7185', marginTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCard: { borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 1 },
  heroLabel: { fontSize: 13 },
  heroPercent: { color: '#fbbf24', fontSize: 16 },
  progressTrack: { height: 10, borderRadius: 5, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  heroNumber: { fontSize: 40, marginTop: 14 },
  heroUnit: { fontSize: 16, color: '#fbbf24' },
  divider: { height: 1, marginVertical: 16 },
  fieldLabel: { fontSize: 12 },
  fieldValue: { color: '#fbbf24', fontSize: 16, marginTop: 4 },
  targetNote: { fontSize: 13, marginTop: 14 },
  metNote: { fontSize: 13, marginTop: 14 },
  pendingNote: { color: '#fbbf24', fontSize: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, marginTop: 28, marginBottom: 12, textTransform: 'uppercase' },
  compactRow: { flexDirection: 'row', gap: 10 },
  seeMore: { fontSize: 13, marginTop: 28 },
  emptyText: { fontSize: 13, marginTop: 4 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  logInfo: { flex: 1, marginRight: 12 },
  logTitle: { fontSize: 14 },
  logMeta: { fontSize: 12, marginTop: 2 },
  logRight: { alignItems: 'flex-end' },
  logPoints: { color: '#fbbf24', fontSize: 15 },
  logStatus: { fontSize: 11, marginTop: 2 },
});