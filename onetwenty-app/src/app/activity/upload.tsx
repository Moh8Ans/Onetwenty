// src/app/activity/upload.tsx
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

const API_BASE = 'https://onetwenty-backend.onrender.com';

export default function UploadScreen() {
  const [stage, setStage] = useState<'pick' | 'uploading' | 'extracting'>('pick');
  const router = useRouter();
  const { getToken } = useAuth();

  async function uploadAndExtract(uri: string, name: string, mimeType: string) {
  setStage('uploading');
  const token = await getToken();

  const formData = new FormData();
  formData.append('file', { uri, name, type: mimeType } as any);

  const uploadRes = await fetch(`${API_BASE}/api/activities/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Upload failed:', uploadRes.status, errText);
    Alert.alert('Upload failed', `${uploadRes.status}: ${errText}`);
    setStage('pick');
    return;
  }

  const { path, signedUrl } = await uploadRes.json();

  setStage('extracting');
  const extractRes = await fetch(`${API_BASE}/api/activities/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileUrl: signedUrl, mimeType }),
  });

  if (!extractRes.ok) {
    const errText = await extractRes.text();
    console.error('Extraction failed:', extractRes.status, errText);
    Alert.alert('Extraction failed', `${extractRes.status}: ${errText}`);
    setStage('pick');
    return;
  }

  const { extracted, candidates } = await extractRes.json();
  setStage('pick');
  // ...rest unchanged


    if (extracted.extractionFailed) {
      router.push({ pathname: '/activity/manual-entry', params: { fileUrl: path, extractionReason: extracted.reason } });
      return;
    }

    router.push({
      pathname: '/activity/confirm',
      params: { extractedJson: JSON.stringify(extracted), candidatesJson: JSON.stringify(candidates), fileUrl: path },
    });
  }

  async function pickFromCamera() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      uploadAndExtract(asset.uri, asset.fileName ?? 'photo.jpg', asset.mimeType ?? 'image/jpeg');
    }
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      uploadAndExtract(asset.uri, asset.fileName ?? 'photo.jpg', asset.mimeType ?? 'image/jpeg');
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled) {
      const asset = result.assets[0];
      uploadAndExtract(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
    }
  }

  if (stage !== 'pick') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2ecc94" size="large" />
        <Text style={styles.statusText}>{stage === 'uploading' ? 'Uploading certificate…' : 'Reading certificate…'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Add a certificate</Text>
      <Pressable style={styles.option} onPress={pickFromCamera}>
        <Text style={styles.optionText}>Take a photo</Text>
      </Pressable>
      <Pressable style={styles.option} onPress={pickFromLibrary}>
        <Text style={styles.optionText}>Choose from photos</Text>
      </Pressable>
      <Pressable style={styles.option} onPress={pickDocument}>
        <Text style={styles.optionText}>Choose a PDF or file</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#0b0f1a', padding: 20, justifyContent: 'flex-end', paddingBottom: 40 },
  title: { color: '#fff', fontSize: 18, fontWeight: '500', marginBottom: 16 },
  option: { backgroundColor: '#141b2d', borderRadius: 12, padding: 16, marginBottom: 10 },
  optionText: { color: '#fff', fontSize: 15 },
  centered: { flex: 1, backgroundColor: '#0b0f1a', justifyContent: 'center', alignItems: 'center', gap: 12 },
  statusText: { color: '#8b93a7', fontSize: 14 },
});