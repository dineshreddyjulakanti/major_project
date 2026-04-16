import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';

export default function HomeScreen({ navigation, currentUser, onLogout }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moodify Mobile</Text>
      {currentUser?.name ? <Text style={styles.subtitle}>Hi {currentUser.name}</Text> : null}
      <PrimaryButton label="Enter" onPress={() => navigation.navigate('Modes')} />
      <PrimaryButton label="Logout" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
});
