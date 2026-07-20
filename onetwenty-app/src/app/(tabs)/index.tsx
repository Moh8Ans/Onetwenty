import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback } from 'react';
import { Text, View, ActivityIndicator, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/api';

type Activity = {
  id: number;
  categoryId: number;
  title: string;
  computedPoints: number | null;
  status: string;
};

type Category = {
  id: number;
  group: number;
  name: string;
  majorHead: string;
  maxPoints: number;
};

type Suggestion = {
  category: Category & { srNo: string };
  potentialPoints: number;
  effort: 'quick' | 'flexible' | 'moderate' | 'long_term';
  alreadyStarted: boolean;
  groupPointsRemaining: number;
};

const GROUP_TARGET = 40;
const TOTAL_TARGET = 120;
const GROUP_COLORS: Record<number, string> = { 1: '#2ecc94', 2: '#4da3ff', 3: '#a78bfa' };
const GROUP_NAMES: Record<number, string> = { 1: 'Group I', 2: 'Group II', 3: 'Group III' };
const EFFORT_STYLE: Record<Suggestion['effort'], { label: string; color: string }> = {
  quick: { label: 'Quick', color: '#2ecc94' },
  flexible: { label: 'Flexible', color: '#4da3ff' },
  moderate: { label: 'Moderate effort', color: '#f5a623' },
  long_term: { label: 'Long-term', color: '#f87171' },
};

export default function HomeScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2ecc94" size="large" />
      </View>
    );
  }

  const categoryGroupMap = new Map(categories.map(c => [c.id, c.group]));

  const verifiedByGroup: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const pendingByGroup: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const activity of activities) {
    const group = categoryGroupMap.get(activity.categoryId);
    if (!group) continue;
    const pts = activity.computedPoints ?? 0;
    if (activity.status === 'sfa_approved') verifiedByGroup[group] += pts;
    else if (activity.status === 'pending_review') pendingByGroup[group] += pts;
  }

  const verifiedTotal = verifiedByGroup[1] + verifiedByGroup[2] + verifiedByGroup[3];
  const pendingTotal = pendingByGroup[1] + pendingByGroup[2] + pendingByGroup[3];
  const allGroupsMet = [1, 2, 3].every(g => verifiedByGroup[g] >= GROUP_TARGET);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ecc94" />}
    >
      <Text style={styles.heading}>Home</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.heroLabel}>Verified progress</Text>
          <Text style={styles.heroPercent}>{Math.min(Math.round((verifiedTotal / TOTAL_TARGET) * 100), 100)}%</Text>
        </View>
        <Text style={styles.heroNumber}>
          {Math.min(verifiedTotal, TOTAL_TARGET)} <Text style={styles.heroUnit}>/ {TOTAL_TARGET} pts</Text>
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min((verifiedTotal / TOTAL_TARGET) * 100, 100)}%`, backgroundColor: '#2ecc94' }]} />
        </View>
        {pendingTotal > 0 && (
          <Text style={styles.pendingNote}>+{pendingTotal} pts pending SFA review, not yet counted</Text>
        )}
        {allGroupsMet ? (
          <Text style={styles.metNote}>All group requirements met 🎉</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Group Performance</Text>
      {[1, 2, 3].map(group => {
        const verified = verifiedByGroup[group];
        const pending = pendingByGroup[group];
        const ringPoints = Math.min(verified, GROUP_TARGET);
        const pct = (ringPoints / GROUP_TARGET) * 100;
        const met = verified >= GROUP_TARGET;
        const overflow = verified - GROUP_TARGET;

        return (
          <View key={group} style={styles.groupCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.groupName}>{GROUP_NAMES[group]}</Text>
              <Text style={[styles.groupStatus, { color: met ? '#2ecc94' : '#8b93a7' }]}>
                {met ? 'Target met' : `${GROUP_TARGET - verified} pts needed`}
              </Text>
            </View>
            <Text style={styles.groupPoints}>{verified} / {GROUP_TARGET} pts</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: GROUP_COLORS[group] }]} />
            </View>
            {pending > 0 && <Text style={styles.pendingNote}>+{pending} pts pending review</Text>}
            {overflow > 0 && <Text style={styles.overflowNote}>+{overflow} extra verified points earned</Text>}
          </View>
        );
      })}

      {suggestions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Smart Suggestions</Text>
          {suggestions.map(s => {
            const effortStyle = EFFORT_STYLE[s.effort];
            return (
              <Pressable
                key={s.category.id}
                style={styles.suggestionCard}
                onPress={() => router.push('/activity/upload')}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>{s.category.name}</Text>
                  <View style={[styles.effortBadge, { backgroundColor: `${effortStyle.color}26` }]}>
                    <Text style={[styles.effortText, { color: effortStyle.color }]}>{effortStyle.label}</Text>
                  </View>
                </View>
                <Text style={styles.suggestionMeta}>
                  {GROUP_NAMES[s.category.group]} · {s.category.majorHead}
                </Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.suggestionPoints}>Up to {s.potentialPoints} pts</Text>
                  {s.alreadyStarted && <Text style={styles.startedTag}>Already started</Text>}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0f1a' },
  centered: { flex: 1, backgroundColor: '#0b0f1a', justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: '700', color: '#fff' },
  errorText: { color: '#f87171', marginTop: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCard: { backgroundColor: '#141b2d', borderRadius: 16, padding: 20, marginTop: 24 },
  heroLabel: { color: '#8b93a7', fontSize: 13 },
  heroPercent: { color: '#2ecc94', fontSize: 15, fontWeight: '600' },
  heroNumber: { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 6 },
  heroUnit: { fontSize: 16, fontWeight: '400', color: '#8b93a7' },
  progressTrack: { height: 10, backgroundColor: '#1c2438', borderRadius: 5, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  pendingNote: { color: '#f5a623', fontSize: 12, marginTop: 8 },
  overflowNote: { color: '#2ecc94', fontSize: 12, marginTop: 6 },
  metNote: { color: '#2ecc94', fontSize: 13, marginTop: 10, fontWeight: '600' },
  sectionTitle: { color: '#8b93a7', fontSize: 13, fontWeight: '600', marginTop: 28, marginBottom: 12, textTransform: 'uppercase' },
  groupCard: { backgroundColor: '#141b2d', borderRadius: 14, padding: 16, marginBottom: 12 },
  groupName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  groupStatus: { fontSize: 12, fontWeight: '600' },
  groupPoints: { color: '#8b93a7', fontSize: 13, marginTop: 4 },
  suggestionCard: { backgroundColor: '#141b2d', borderRadius: 14, padding: 16, marginBottom: 10 },
  suggestionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  effortBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  effortText: { fontSize: 11, fontWeight: '600' },
  suggestionMeta: { color: '#565f73', fontSize: 12, marginTop: 4, marginBottom: 8 },
  suggestionPoints: { color: '#2ecc94', fontSize: 13, fontWeight: '600' },
  startedTag: { color: '#8b93a7', fontSize: 11 },
});