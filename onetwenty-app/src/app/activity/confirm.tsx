// src/app/activity/confirm.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ScoringInputs, type ScoringValues } from '../../components/ScoringInputs';
import { useScorePreview } from '../../hooks/useScorePreview';

type Candidate = { category: any; confidence: number };

const API_BASE = 'https://onetwenty-backend.onrender.com';
const GROUP_NAMES: Record<number, string> = { 1: 'Group I', 2: 'Group II', 3: 'Group III' };

export default function ConfirmScreen() {
  const { extractedJson, candidatesJson, fileUrl } = useLocalSearchParams<{
    extractedJson: string; candidatesJson: string; fileUrl: string;
  }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const extracted = JSON.parse(extractedJson);
  const candidates: Candidate[] = JSON.parse(candidatesJson);

  const [title, setTitle] = useState(extracted.title ?? '');
  const [issuingOrg, setIssuingOrg] = useState(extracted.issuingOrg ?? '');
  const [eventDate, setEventDate] = useState(extracted.date ?? '');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = candidates[selectedCategoryIdx]?.category;

  const [scoringValues, setScoringValues] = useState<ScoringValues>({
    level: extracted.levelHint !== 'unknown' ? extracted.levelHint : undefined,
  });

  const preview = useScorePreview(selectedCategory?.id, scoringValues);

  function confidenceLabel(confidence: number) {
    if (confidence >= 0.5) return { text: 'High match', style: styles.badgeHigh };
    if (confidence >= 0.2) return { text: 'Medium match', style: styles.badgeMed };
    return { text: 'Low match', style: styles.badgeLow };
  }

  function goToManualEntry() {
    router.push({
      pathname: '/activity/manual-entry',
      params: {
        fileUrl,
        prefillTitle: title,
        prefillOrg: issuingOrg,
        prefillDate: eventDate,
      },
    });
  }

  async function handleSubmit() {
    if (!selectedCategory) return;
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/activities/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        categoryId: selectedCategory.id,
        title,
        issuingOrg,
        eventDate,
        startDate: scoringValues.startDate,
        endDate: scoringValues.endDate,
        level: scoringValues.level,
        tierKey: scoringValues.tierKey,
        hours: scoringValues.hours ? Number(scoringValues.hours) : undefined,
        evidenceFileUrl: fileUrl,
        extractionRaw: extracted,
        matchConfidence: candidates[selectedCategoryIdx]?.confidence,
      }),
    });
    setSubmitting(false);

    if (res.status === 422) {
      const body = await res.json();
      alert(`Not eligible for this category: ${body.reason}`);
      return;
    }
    if (res.ok) router.replace('/(tabs)/activities');
  }

  const badge = selectedCategory ? confidenceLabel(candidates[selectedCategoryIdx].confidence) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Issuing organisation</Text>
        <TextInput style={styles.input} value={issuingOrg} onChangeText={setIssuingOrg} />

        <Text style={styles.label}>Event date</Text>
        <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>Matched category</Text>
          {badge && <View style={badge.style}><Text style={styles.badgeText}>{badge.text}</Text></View>}
        </View>
        {candidates.map((c, i) => (
          <Pressable key={c.category.id} onPress={() => setSelectedCategoryIdx(i)}
            style={[styles.categoryRow, i === selectedCategoryIdx && styles.categoryRowSelected]}>
            <Text style={[styles.categoryText, i === selectedCategoryIdx && styles.categoryTextSelected]}>
              {c.category.name}
            </Text>
            <Text style={styles.categorySubtext}>
              {GROUP_NAMES[c.category.group]} · {c.category.majorHead}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={goToManualEntry} style={styles.browseLink}>
          <Text style={styles.browseLinkText}>None of these? Browse all categories →</Text>
        </Pressable>
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
  card: { backgroundColor: '#141b2d', borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { color: '#8b93a7', fontSize: 12, marginBottom: 4, marginTop: 12 },
  sectionLabel: { color: '#8b93a7', fontSize: 12, marginBottom: 8 },
  input: { backgroundColor: '#1c2438', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryRow: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2a3448', marginBottom: 6 },
  categoryRowSelected: { borderColor: '#2ecc94', backgroundColor: 'rgba(46,204,148,0.1)' },
  categoryText: { color: '#fff', fontSize: 13 },
  categoryTextSelected: { color: '#2ecc94' },
  categorySubtext: { color: '#565f73', fontSize: 11, marginTop: 3 },
  browseLink: { paddingVertical: 10, alignItems: 'center' },
  browseLinkText: { color: '#2ecc94', fontSize: 13 },
  badgeHigh: { backgroundColor: 'rgba(46,204,148,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeMed: { backgroundColor: 'rgba(245,166,35,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeLow: { backgroundColor: 'rgba(139,147,167,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, color: '#fff' },
  previewBox: { backgroundColor: '#1c2438', borderRadius: 12, padding: 14, marginBottom: 16 },
  previewLabel: { color: '#8b93a7', fontSize: 13 },
  previewPoints: { color: '#fff', fontSize: 24, fontWeight: '500' },
  previewNote: { color: '#8b93a7', fontSize: 12, marginTop: 4 },
  submitButton: { backgroundColor: '#2ecc94', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: '#0b0f1a', fontSize: 15, fontWeight: '500' },
  helperText: { color: '#8b93a7', fontSize: 12, textAlign: 'center', marginTop: 10 },
});