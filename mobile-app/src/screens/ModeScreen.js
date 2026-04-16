import { StyleSheet, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';

export default function ModeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <PrimaryButton label="Audio" onPress={() => navigation.navigate('Audio')} />
      <PrimaryButton label="Image" onPress={() => navigation.navigate('Image')} />
      <PrimaryButton label="Txt" onPress={() => navigation.navigate('Text')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
