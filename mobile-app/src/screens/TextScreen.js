import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import PrimaryButton from '../components/PrimaryButton';
import ResultCard from '../components/ResultCard';
import { sendTextFile, sendTextInput } from '../services/api';

export default function TextScreen() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  const submitLiveText = async () => {
    if (!text.trim()) {
      Alert.alert('Input required', 'Please enter text first.');
      return;
    }

    try {
      setLoading(true);
      const response = await sendTextInput(text.trim());
      setResult(response);
    } catch (error) {
      Alert.alert('Text request failed', error.message || 'Unable to contact backend');
    } finally {
      setLoading(false);
    }
  };

  const selectTxtFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/*', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) return;

      setLoading(true);
      const response = await sendTextFile(picked.assets[0]);
      setResult(response);
    } catch (error) {
      Alert.alert('TXT request failed', error.message || 'File upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Text Input</Text>
      <Text style={styles.sub}>Use live text input or upload a .txt file.</Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type how you feel..."
        placeholderTextColor="#9ca3af"
        multiline
        style={styles.input}
      />

      <PrimaryButton label="Send Live Text" onPress={submitLiveText} disabled={loading} />
      <PrimaryButton label="Select TXT from Storage" onPress={selectTxtFile} disabled={loading} />

      {loading ? <ActivityIndicator size="large" color="#111827" style={styles.loader} /> : null}

      <ResultCard title="Text Result" data={result} />
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
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  loader: {
    marginTop: 14,
  },
});
