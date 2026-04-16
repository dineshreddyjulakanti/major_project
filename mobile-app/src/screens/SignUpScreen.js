import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';

export default function SignUpScreen({ onSignUp, goToSignIn }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');
  const [spotifyRedirectUri, setSpotifyRedirectUri] = useState('http://127.0.0.1:5173/callback');

  const goToCredentialsStep = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter name, email, and password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }

    setStep(2);
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!spotifyClientId.trim() || !spotifyClientSecret.trim()) {
      Alert.alert('Spotify required', 'Admin signup needs Spotify client ID and secret.');
      return;
    }

    try {
      await onSignUp({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'admin',
        spotify: {
          clientId: spotifyClientId.trim(),
          clientSecret: spotifyClientSecret.trim(),
          redirectUri: spotifyRedirectUri.trim() || 'http://127.0.0.1:5173/callback',
        },
      });
    } catch (error) {
      Alert.alert('Signup failed', error?.message || 'Unable to create account right now.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>{step === 1 ? 'Admin Sign Up' : 'Admin Credentials'}</Text>
        <Text style={styles.sub}>
          {step === 1
            ? 'Step 1/2: Complete account signup details.'
            : 'Step 2/2: Enter Spotify credentials and continue.'}
        </Text>

        {step === 1 ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <PrimaryButton label="Continue" onPress={goToCredentialsStep} />
            <PrimaryButton label="Already have account? Sign In" onPress={goToSignIn} />
          </>
        ) : (
          <View style={styles.spotifyBox}>
            <Text style={styles.spotifyTitle}>Spotify Details (Admin)</Text>
            <TextInput
              style={styles.input}
              placeholder="Spotify Client ID"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={spotifyClientId}
              onChangeText={setSpotifyClientId}
            />
            <TextInput
              style={styles.input}
              placeholder="Spotify Client Secret"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={spotifyClientSecret}
              onChangeText={setSpotifyClientSecret}
            />
            <TextInput
              style={styles.input}
              placeholder="Spotify Redirect URI"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={spotifyRedirectUri}
              onChangeText={setSpotifyRedirectUri}
            />

            <PrimaryButton label="Back" onPress={() => setStep(1)} />
            <PrimaryButton label="Continue" onPress={submit} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  spotifyBox: {
    marginTop: 6,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  spotifyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
});
