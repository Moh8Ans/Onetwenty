// src/components/ScoringInputs.tsx
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { humanizeTierKey } from '../lib/scoringLabels';

const LEVELS = ['college', 'zonal', 'state', 'national', 'international'] as const;

export type ScoringValues = { level?: string; tierKey?: string; hours?: string; startDate?: string; endDate?: string };

export function ScoringInputs({ category, values, onChange }: {
  category: any; values: ScoringValues; onChange: (v: ScoringValues) => void;
}) {
  const needsDuration = category?.specialConditions?.minDurationMonths != null;

  return (
    <View>
      <MainControl category={category} values={values} onChange={onChange} />
      {needsDuration && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.infoText}>
            This category requires a minimum duration of {category.specialConditions.minDurationMonths} months
          </Text>
          <Text style={[styles.infoText, { marginTop: 10 }]}>Start date</Text>
          <TextInput
            style={styles.input}
            value={values.startDate ?? ''}
            onChangeText={d => onChange({ ...values, startDate: d })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
          />
          <Text style={[styles.infoText, { marginTop: 10 }]}>End date</Text>
          <TextInput
            style={styles.input}
            value={values.endDate ?? ''}
            onChangeText={d => onChange({ ...values, endDate: d })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
          />
        </View>
      )}
    </View>
  );
}

function MainControl({ category, values, onChange }: {
  category: any; values: ScoringValues; onChange: (v: ScoringValues) => void;
}) {
  if (!category) return null;

  if (category.scoringType === 'flat' || category.scoringType === 'per_unit_capped') {
    return (
      <Text style={styles.infoText}>
        This category awards a fixed {category.maxPoints} pts{category.scoringType === 'per_unit_capped' ? ' per submission, capped at the group total' : ''} — no extra details needed.
      </Text>
    );
  }

  if (category.scoringType === 'level_based') {
    return (
      <View style={styles.chipRow}>
        {LEVELS.map(l => (
          <Pressable key={l} onPress={() => onChange({ ...values, level: l })}
            style={[styles.chip, values.level === l && styles.chipSelected]}>
            <Text style={[styles.chipText, values.level === l && styles.chipTextSelected]}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (category.scoringType === 'tiered') {
    const tierKeys = Object.keys(category.scoringTable ?? {});
    return (
      <View style={styles.chipRow}>
        {tierKeys.map(key => (
          <Pressable key={key} onPress={() => onChange({ ...values, tierKey: key })}
            style={[styles.chip, values.tierKey === key && styles.chipSelected]}>
            <Text style={[styles.chipText, values.tierKey === key && styles.chipTextSelected]}>
              {humanizeTierKey(key)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (category.scoringType === 'hourly') {
    return (
      <View>
        <Text style={styles.infoText}>Hours completed</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={values.hours ?? ''}
          onChangeText={h => onChange({ ...values, hours: h })}
          placeholder="e.g. 30"
          placeholderTextColor="#666"
        />
      </View>
    );
  }

  return <Text style={styles.infoText}>Unrecognized scoring type — contact support.</Text>;
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#2a3448' },
  chipSelected: { borderColor: '#2ecc94', backgroundColor: 'rgba(46,204,148,0.1)' },
  chipText: { color: '#fff', fontSize: 13 },
  chipTextSelected: { color: '#2ecc94' },
  infoText: { color: '#8b93a7', fontSize: 13, lineHeight: 18 },
  input: { backgroundColor: '#1c2438', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14, marginTop: 6 },
});