import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ModeScreen from './src/screens/ModeScreen';
import AudioScreen from './src/screens/AudioScreen';
import ImageScreen from './src/screens/ImageScreen';
import TextScreen from './src/screens/TextScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import SignInScreen from './src/screens/SignInScreen';
import {
  getCurrentUser,
  hasRegisteredUser,
  isLoggedIn,
  loadAuthRecord,
  registerUser,
  signInUser,
  signOutUser,
} from './src/services/authStorage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authRecord, setAuthRecord] = useState(null);
  const [authScreen, setAuthScreen] = useState('signup');

  useEffect(() => {
    let active = true;
    const initializeAuth = async () => {
      const stored = await loadAuthRecord();
      if (!active) {
        return;
      }

      setAuthRecord(stored);
      setAuthScreen(hasRegisteredUser(stored) ? 'signin' : 'signup');
      setLoadingAuth(false);
    };

    initializeAuth();
    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(() => getCurrentUser(authRecord), [authRecord]);
  const loggedIn = isLoggedIn(authRecord);

  const handleSignUp = async (payload) => {
    const updated = await registerUser(payload);
    setAuthRecord(updated);
    setAuthScreen('signin');
  };

  const handleSignIn = async (email, password) => {
    const updated = await signInUser(email, password);
    setAuthRecord(updated);
  };

  const handleLogout = async () => {
    const updated = await signOutUser();
    setAuthRecord(updated);
    setAuthScreen('signin');
  };

  if (loadingAuth) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerTitleAlign: 'center' }}>
        {loggedIn ? (
          <>
            <Stack.Screen name="Home" options={{ title: 'Moodify' }}>
              {(props) => (
                <HomeScreen
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Modes" component={ModeScreen} options={{ title: 'Choose Mode' }} />
            <Stack.Screen name="Audio" component={AudioScreen} options={{ title: 'Audio Mood' }} />
            <Stack.Screen name="Image" component={ImageScreen} options={{ title: 'Image Mood' }} />
            <Stack.Screen name="Text" component={TextScreen} options={{ title: 'Text Mood' }} />
          </>
        ) : authScreen === 'signup' ? (
          <>
            <Stack.Screen name="SignUp" options={{ title: 'Sign Up' }}>
              {(props) => (
                <SignUpScreen
                  {...props}
                  onSignUp={handleSignUp}
                  goToSignIn={() => setAuthScreen('signin')}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="SignIn" options={{ title: 'Sign In' }}>
              {(props) => (
                <SignInScreen
                  {...props}
                  onSignIn={handleSignIn}
                  goToSignUp={() => setAuthScreen('signup')}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
