import { Audio } from 'expo-av';

export async function requestMicPermission() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission denied');
  }
}

export async function startRecording(setRecording) {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  setRecording(recording);
}

export async function stopRecording(recording, setRecording) {
  if (!recording) return null;

  const status = await recording.getStatusAsync();
  const durationMs = status?.durationMillis || 0;
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  setRecording(null);

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  if (!uri) {
    return null;
  }

  const ext = uri.split('.').pop()?.toLowerCase();
  const isWav = ext === 'wav';

  return {
    uri,
    name: `live-audio-${Date.now()}.${isWav ? 'wav' : 'm4a'}`,
    mimeType: isWav ? 'audio/wav' : 'audio/mp4',
    durationMs,
  };
}
