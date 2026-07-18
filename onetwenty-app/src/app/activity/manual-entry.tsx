// src/app/activity/manual-entry.tsx
import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SectionList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ScoringInputs, type ScoringValues } from '../../components/ScoringInputs';
import { useScorePreview } from '../../hooks/useScorePreview';

const API_BASE = 'https://onetwenty-backend.onrender.com';
const GROUP_NAMES: Record<number, string> = { 1: 'Group I', 2: 'Group II', 3: 'Group III' };

export default function ManualEntryScreen() {
  const { fileUrl, prefillTitle, prefillOrg, prefillDate, extractionReason } = useLocalSearchParams<{
  fileUrl: string; prefillTitle?: string; prefillOrg?: string; prefillDate?: string; extractionReason?: string;
  }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [title, setTitle] = useState(prefillTitle ?? '');
  const [issuingOrg, setIssuingOrg] = useState(prefillOrg ?? '');
  const [eventDate, setEventDate] = useState(prefillDate ?? '');
  const [scoringValues, setScoringValues] = useState<ScoringValues>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`).then(r => r.json()).then(setCategories);
  }, []);

  const sections = useMemo(() => {
    const filtered = categories.filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.majorHead.toLowerCase().includes(search.toLowerCase())
    );
    const byMajorHead = new Map<string, any[]>();
    filtered.forEach(c => {
      const key = `${GROUP_NAMES[c.group]} · ${c.majorHead}`;
      if (!byMajorHead.has(key)) byMajorHead.set(key, []);
      byMajorHead.get(key)!.push(c);
    });
    return Array.from(byMajorHead.entries()).map(([title, data]) => ({ title, data }));
  }, [categories, search]);

  const preview = useScorePreview(selectedCategory?.id, scoringValues);

  async function handleSubmit() {
    if (!selectedCategory || !title) return;
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/activities/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        categoryId: selectedCategory.id, title, eventDate,
        level: scoringValues.level, tierKey: scoringValues.tierKey,
        hours: scoringValues.hours ? Number(scoringValues.hours) : undefined,
        evidenceFileUrl: fileUrl,
        matchConfidence: null, // browsed manually — no algorithmic corroboration to report
      }),
    });
    setSubmitting(false);
    if (res.ok) router.replace('/(tabs)/activities');
  }

  if (!selectedCategory) {
    return (
      <View style={styles.screen}>
        <Text style={styles.headerNote}>
        {extractionReason ?? "We couldn't read this certificate automatically — likely a scanned document. Pick the matching category to continue."}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories…"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.categoryRow} onPress={() => setSelectedCategory(item)}>
              <Text style={styles.categoryText}>{item.name}</Text>
              <Text style={styles.srNo}>{item.srNo}</Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={() => setSelectedCategory(null)}>
        <Text style={styles.changeLink}>← Change category</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.selectedCategoryName}>{selectedCategory.name}</Text>
        <Text style={styles.majorHead}>{GROUP_NAMES[selectedCategory.group]} · {selectedCategory.majorHead} · {selectedCategory.srNo}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What is this activity called?" placeholderTextColor="#666" />
        <Text style={styles.label}>Issuing organisation</Text>
        <TextInput style={styles.input} value={issuingOrg} onChangeText={setIssuingOrg} placeholderTextColor="#666" />
        <Text style={styles.label}>Event date</Text>
        <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Details</Text>
        <ScoringInputs category={selectedCategory} values={scoringValues} onChange={setScoringValues} />
      </View>

      {preview && (
        <View style={styles.previewBox}>
          <View style={styles.rowBetween}>
            <Text style={styles.previewLabel}>Estimated award</Text>
            <Text style={styles.previewPoints}>{preview.awarded} pts</Text>
          </View>
          {preview.groupCeiling && (
            <Text style={styles.previewNote}>
              {preview.cappedFromRaw
                ? `Capped — ${preview.groupUsedBefore} of ${preview.groupCeiling} shared points already used`
                : `${preview.groupUsedBefore + preview.awarded} of ${preview.groupCeiling} shared points used after this award`}
            </Text>
          )}
        </View>
      )}

      <Pressable
      style={[styles.submitButton, !title.trim() && { opacity: 0.4 }]}
      onPress={handleSubmit}
      disabled={submitting || !title.trim()}
      >
        <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit for review'}</Text>
      </Pressable>
      <Text style={styles.helperText}>An SFA reviews every submission before it counts toward your total.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0f1a' },
  headerNote: { color: '#8b93a7', fontSize: 13, padding: 16, lineHeight: 18 },
  searchInput: { backgroundColor: '#1c2438', color: '#fff', borderRadius: 8, padding: 10, marginHorizontal: 16, marginBottom: 8 },
  sectionHeader: { color: '#8b93a7', fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, backgroundColor: '#0b0f1a' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1c2438' },
  categoryText: { color: '#fff', fontSize: 14, flex: 1 },
  srNo: { color: '#565f73', fontSize: 12 },
  changeLink: { color: '#2ecc94', fontSize: 14, marginBottom: 12 },
  card: { backgroundColor: '#141b2d', borderRadius: 16, padding: 16, marginBottom: 16 },
  selectedCategoryName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  majorHead: { color: '#8b93a7', fontSize: 12, marginTop: 4 },
  label: { color: '#8b93a7', fontSize: 12, marginBottom: 4, marginTop: 12 },
  sectionLabel: { color: '#8b93a7', fontSize: 12, marginBottom: 8 },
  input: { backgroundColor: '#1c2438', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewBox: { backgroundColor: '#1c2438', borderRadius: 12, padding: 14, marginBottom: 16 },
  previewLabel: { color: '#8b93a7', fontSize: 13 },
  previewPoints: { color: '#fff', fontSize: 24, fontWeight: '500' },
  previewNote: { color: '#8b93a7', fontSize: 12, marginTop: 4 },
  submitButton: { backgroundColor: '#2ecc94', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: '#0b0f1a', fontSize: 15, fontWeight: '500' },
  helperText: { color: '#8b93a7', fontSize: 12, textAlign: 'center', marginTop: 10 },
});