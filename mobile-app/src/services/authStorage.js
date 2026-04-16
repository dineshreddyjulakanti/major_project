import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'moodify.auth.v1';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function normalizeRole(role) {
  return 'admin';
}

export async function loadAuthRecord() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function saveAuthRecord(record) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(record));
}

export async function registerUser(payload) {
  const now = new Date().toISOString();
  const role = normalizeRole(payload.role);
  const spotify = {
    clientId: normalizeText(payload.spotify?.clientId),
    clientSecret: normalizeText(payload.spotify?.clientSecret),
    redirectUri: normalizeText(payload.spotify?.redirectUri) || 'http://127.0.0.1:5173/callback',
  };

  if (!spotify.clientId || !spotify.clientSecret) {
    throw new Error('Admin Spotify credentials are required.');
  }

  const user = {
    name: normalizeText(payload.name),
    email: normalizeEmail(payload.email),
    password: String(payload.password || ''),
    role,
    spotify,
    createdAt: now,
  };

  const record = {
    registeredUser: user,
    session: {
      isLoggedIn: true,
      email: user.email,
      role: user.role,
      loggedInAt: now,
    },
  };

  await saveAuthRecord(record);
  return record;
}

export async function signInUser(email, password) {
  const record = await loadAuthRecord();
  const user = record?.registeredUser;

  if (!user) {
    throw new Error('No account found. Please sign up first.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== normalizeEmail(user.email) || String(password || '') !== String(user.password || '')) {
    throw new Error('Invalid email or password.');
  }

  const updated = {
    ...record,
    session: {
      isLoggedIn: true,
      email: user.email,
      role: user.role,
      loggedInAt: new Date().toISOString(),
    },
  };

  await saveAuthRecord(updated);
  return updated;
}

export async function signOutUser() {
  const record = await loadAuthRecord();
  if (!record) {
    return null;
  }

  const updated = {
    ...record,
    session: {
      isLoggedIn: false,
      email: record?.registeredUser?.email || '',
      role: record?.registeredUser?.role || 'admin',
      loggedInAt: null,
    },
  };

  await saveAuthRecord(updated);
  return updated;
}

export function hasRegisteredUser(record) {
  return Boolean(record?.registeredUser?.email && record?.registeredUser?.password);
}

export function isLoggedIn(record) {
  return Boolean(record?.session?.isLoggedIn && record?.registeredUser?.email);
}

export function getCurrentUser(record) {
  return record?.registeredUser || null;
}

export async function getAdminSpotifyHeaders() {
  const record = await loadAuthRecord();
  const user = record?.registeredUser;

  if (!record?.session?.isLoggedIn || user?.role !== 'admin' || !user?.spotify) {
    return {};
  }

  const clientId = normalizeText(user.spotify.clientId);
  const clientSecret = normalizeText(user.spotify.clientSecret);
  const redirectUri = normalizeText(user.spotify.redirectUri) || 'http://127.0.0.1:5173/callback';

  if (!clientId || !clientSecret) {
    return {};
  }

  return {
    'X-Spotify-Client-Id': clientId,
    'X-Spotify-Client-Secret': clientSecret,
    'X-Spotify-Redirect-Uri': redirectUri,
  };
}
