import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { Text, View, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { apiFetch } from '@/lib/api';

type Activity = {
  id: number;
  categoryId: number;
  title: string;
  pointsClaimed: number;
  status: string;
  eventDate: string | null;
  createdAt: string;
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch(`/activities/${id}`, token!);
        setActivity(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleStatus = async () => {
    if (!activity) return;
    const newStatus = activity.status === 'draft' ? 'submitted' : 'draft';
    try {
      const token = await getToken();
      const updated = await apiFetch(`/activities/${id}`, token!, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setActivity(updated);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete Activity', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            await apiFetch(`/activities/${id}`, token!, { method: 'DELETE' });
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!activity) return <Text style={{ padding: 20 }}>Activity not found.</Text>;

  return (
    <>
      <Stack.Screen options={{ title: activity.title }} />
      <View style={styles.container}>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.points}>{activity.pointsClaimed} points</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{activity.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{new Date(activity.createdAt).toLocaleDateString()}</Text>
        </View>

        <Pressable style={styles.button} onPress={toggleStatus}>
          <Text style={styles.buttonText}>
            Mark as {activity.status === 'draft' ? 'Submitted' : 'Draft'}
          </Text>
        </Pressable>

        <Pressable style={[styles.button, styles.deleteButton]} onPress={onDelete}>
          <Text style={styles.buttonText}>Delete Activity</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  points: { fontSize: 18, color: '#208AEF', marginTop: 4, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  label: { color: '#666' },
  value: { fontWeight: '600' },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  deleteButton: { backgroundColor: '#FF3B30', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});