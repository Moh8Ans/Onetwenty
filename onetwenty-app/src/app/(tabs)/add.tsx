import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/api';

type Category = {
  id: number;
  group: number;
  name: string;
  maxPoints: number;
};

export default function AddScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch('/categories', token!);
        setCategories(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const onSubmit = async () => {
    setError('');

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    const pointsNum = Number(points);
    if (!pointsNum || pointsNum <= 0) {
      setError('Please enter valid points');
      return;
    }
    if (selectedCategory && pointsNum > selectedCategory.maxPoints) {
      setError(`Max for this category is ${selectedCategory.maxPoints} points`);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch('/activities', token!, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          title: title.trim(),
          pointsClaimed: pointsNum,
        }),
      });
      setTitle('');
      setPoints('');
      setSelectedCategoryId(null);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCategories) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Activity</Text>

      <Text style={styles.label}>Category</Text>
      {[1, 2, 3].map((group) => (
        <View key={group} style={{ marginBottom: 12 }}>
          <Text style={styles.groupLabel}>Group {group}</Text>
          {categories
            .filter((c) => c.group === group)
            .map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCategoryId(c.id)}
                style={[
                  styles.categoryRow,
                  selectedCategoryId === c.id && styles.categoryRowSelected,
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryId === c.id && styles.categoryTextSelected,
                  ]}>
                  {c.name} (max {c.maxPoints})
                </Text>
              </Pressable>
            ))}
        </View>
      ))}

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. NSS Annual Camp"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Points Claimed</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10"
        keyboardType="numeric"
        value={points}
        onChangeText={setPoints}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
        onPress={onSubmit}
        disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitting ? 'Saving...' : 'Save Activity'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  groupLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 4 },
  categoryRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 6,
  },
  categoryRowSelected: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  categoryText: { fontSize: 14 },
  categoryTextSelected: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  error: { color: 'red', marginTop: 12 },
  submitButton: {
    backgroundColor: '#208AEF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});