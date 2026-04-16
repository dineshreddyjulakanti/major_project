import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import PrimaryButton from '../components/PrimaryButton';
import ResultCard from '../components/ResultCard';
import { sendAudioFile } from '../services/api';
import { requestMicPermission, startRecording, stopRecording } from '../utils/audioRecorder';

export default function AudioScreen() {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async (asset) => {
    try {
      setLoading(true);
      const response = await sendAudioFile(asset);
      setResult(response);
    } catch (error) {
      Alert.alert('Audio request failed', error.message || 'Unable to contact backend');
    } finally {
      setLoading(false);
    }
  };

  const pickAudioFromStorage = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) return;
    const selected = picked.assets[0];
    await handleUpload({
      ...selected,
      name: selected.name || selected.fileName || `audio-${Date.now()}.wav`,
      mimeType: selected.mimeType || 'audio/wav',
    });
  };

  const toggleLiveRecording = async () => {
    try {
      if (!recording) {
        await requestMicPermission();
        await startRecording(setRecording);
        return;
      }

      const asset = await stopRecording(recording, setRecording);
      if (asset) {
        if ((asset.durationMs || 0) < 1200) {
          Alert.alert('Recording too short', 'Please record for at least 1-2 seconds and speak clearly.');
          return;
        }
        await handleUpload(asset);
      }
    } catch (error) {
      Alert.alert('Recording error', error.message || 'Live audio failed');
      setRecording(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Audio Input</Text>
      <Text style={styles.sub}>Choose from storage or record live audio.</Text>

      <PrimaryButton label="Select Audio from Storage" onPress={pickAudioFromStorage} disabled={loading} />
      <PrimaryButton
        label={recording ? 'Stop & Send Live Audio' : 'Start Live Audio'}
        onPress={toggleLiveRecording}
        disabled={loading}
      />

      {loading ? <ActivityIndicator size="large" color="#111827" style={styles.loader} /> : null}

      <ResultCard title="Audio Result" data={result} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 18,
  },
  loader: {
    marginTop: 14,
  },
});
