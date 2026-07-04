import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback } from 'react';
import { Text, View, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { apiFetch } from '@/lib/api';

type Activity = {
  id: number;
  categoryId: number;
  title: string;
  pointsClaimed: number;
  status: string;
};

type Category = {
  id: number;
  group: number;
  name: string;
  maxPoints: number;
};

export default function HomeScreen() {
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const [activitiesData, categoriesData] = await Promise.all([
        apiFetch('/activities', token!),
        apiFetch('/categories', token!),
      ]);
      setActivities(activitiesData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  // Map categoryId -> group, so we can sum points per group
  const categoryGroupMap = new Map(categories.map((c) => [c.id, c.group]));

  const groupTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const activity of activities) {
    const group = categoryGroupMap.get(activity.categoryId);
    if (group) {
      groupTotals[group] += activity.pointsClaimed;
    }
  }

  const GROUP_CAP = 40;
  const TOTAL_TARGET = 120;
  const totalPoints = groupTotals[1] + groupTotals[2] + groupTotals[3];

  return (
    <ScrollView
      style={{ flex: 1, padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Home</Text>
      {error ? <Text style={{ color: 'red', marginTop: 12 }}>{error}</Text> : null}

      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>
          Total: {totalPoints} / {TOTAL_TARGET}
        </Text>
        <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.min((totalPoints / TOTAL_TARGET) * 100, 100)}%`,
              backgroundColor: '#208AEF',
            }}
          />
        </View>
      </View>

      {[1, 2, 3].map((group) => {
        const points = Math.min(groupTotals[group], GROUP_CAP);
        const pct = (points / GROUP_CAP) * 100;
        return (
          <View key={group} style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: '600' }}>
              Group {group}: {groupTotals[group]} / {GROUP_CAP}
            </Text>
            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, marginTop: 6, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: pct >= 100 ? '#34C759' : '#208AEF',
                }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}