import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../components/PrimaryButton';
import ResultCard from '../components/ResultCard';
import { sendImageFile } from '../services/api';

const IMAGE_MEDIA_TYPE =
  ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images || 'images';

function captureImageFromWebCamera() {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Web camera input is unavailable in this environment.'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.addEventListener('change', () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      cleanup();

      if (!file) {
        resolve(null);
        return;
      }

      resolve({
        file,
        uri: '',
        mimeType: file.type || 'image/jpeg',
        name: file.name || `camera-${Date.now()}.jpg`,
      });
    });

    input.addEventListener('error', () => {
      cleanup();
      reject(new Error('Unable to open web camera input.'));
    });

    document.body.appendChild(input);
    input.click();
  });
}

export default function ImageScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (asset) => {
    try {
      setLoading(true);
      const response = await sendImageFile(asset);
      setResult(response);
    } catch (error) {
      Alert.alert('Image request failed', error.message || 'Unable to contact backend');
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Gallery permission is needed.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      quality: 0.9,
    });

    if (!picked.canceled) {
      await handleUpload({
        ...picked.assets[0],
        mimeType: picked.assets[0].mimeType || 'image/jpeg',
        name: picked.assets[0].fileName || `gallery-${Date.now()}.jpg`,
      });
    }
  };

  const captureLiveImage = async () => {
    if (Platform.OS === 'web') {
      try {
        const webAsset = await captureImageFromWebCamera();
        if (webAsset) {
          await handleUpload(webAsset);
        }
      } catch (error) {
        Alert.alert('Web camera failed', error?.message || 'Unable to capture image from browser camera.');
      }
      return;
    }

    if (typeof ImagePicker.isCameraAvailableAsync === 'function') {
      const cameraAvailable = await ImagePicker.isCameraAvailableAsync();
      if (!cameraAvailable) {
        Alert.alert('Camera unavailable', 'No camera is available on this device/emulator.');
        return;
      }
    }

    if (Platform.OS !== 'web' && typeof ImagePicker.requestCameraPermissionsAsync === 'function') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed.');
        return;
      }
    }

    const captured = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      quality: 0.9,
    });

    if (!captured.canceled) {
      await handleUpload({
        ...captured.assets[0],
        mimeType: captured.assets[0].mimeType || 'image/jpeg',
        name: captured.assets[0].fileName || `camera-${Date.now()}.jpg`,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Image Input</Text>
      <Text style={styles.sub}>Choose image from storage or capture live image.</Text>

      <PrimaryButton label="Select Image from Storage" onPress={pickFromGallery} disabled={loading} />
      <PrimaryButton label="Capture Live Image" onPress={captureLiveImage} disabled={loading} />

      {loading ? <ActivityIndicator size="large" color="#111827" style={styles.loader} /> : null}

      <ResultCard title="Image Result" data={result} />
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
