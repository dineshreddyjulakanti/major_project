import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';

export default function SignInScreen({ onSignIn, goToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    try {
      await onSignIn(trimmedEmail, password);
    } catch (error) {
      Alert.alert('Sign in failed', error?.message || 'Invalid credentials.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign In</Text>
      <Text style={styles.sub}>Welcome back. Use your registered account.</Text>

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

      <PrimaryButton label="Sign In" onPress={submit} />
      <PrimaryButton label="No account? Sign Up" onPress={goToSignUp} />
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
});
