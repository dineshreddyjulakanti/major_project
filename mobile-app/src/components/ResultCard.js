import { StyleSheet, Text, View } from 'react-native';

function stringifyResult(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function toReadableReason(reason) {
  if (!reason) return 'unknown';
  return String(reason).replace(/_/g, ' ');
}

function getMoodLabel(data) {
  if (!data || typeof data !== 'object') return null;
  return data.mood || data.emotion || null;
}

function normalizeResultData(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.payload && typeof data.payload === 'object') return data.payload;
  return data;
}

function getSpotifySummary(spotify) {
  if (!spotify || typeof spotify !== 'object') {
    return {
      title: 'Spotify: no status returned',
      details: null,
      ok: false,
    };
  }

  if (spotify.played) {
    const where = spotify.device ? ` on ${spotify.device}` : '';
    const what = spotify.track || spotify.playlist || spotify.query || spotify.target || 'content';
    return {
      title: `Spotify: playing ${what}${where}`,
      details: null,
      ok: true,
    };
  }

  const reason = toReadableReason(spotify.reason || 'not_played');
  const hint = spotify.query || spotify.target || null;
  return {
    title: `Spotify: not playing (${reason})`,
    details: hint ? `Requested: ${hint}` : null,
    ok: false,
  };
}

export default function ResultCard({ title = 'Backend Response', data }) {
  if (!data) return null;

  const normalized = normalizeResultData(data);

  const mood = getMoodLabel(normalized);
  const spotify = getSpotifySummary(normalized?.spotify);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {mood ? <Text style={styles.mood}>Detected Mood: {String(mood).toUpperCase()}</Text> : null}
      <Text style={[styles.spotify, spotify.ok ? styles.spotifyOk : styles.spotifyFail]}>{spotify.title}</Text>
      {spotify.details ? <Text style={styles.spotifyDetail}>{spotify.details}</Text> : null}
      <Text style={styles.payload}>{stringifyResult(normalized)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  mood: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  spotify: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  spotifyOk: {
    color: '#166534',
  },
  spotifyFail: {
    color: '#991b1b',
  },
  spotifyDetail: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 8,
  },
  payload: {
    fontSize: 13,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
});
