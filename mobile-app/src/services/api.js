import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAdminSpotifyHeaders } from './authStorage';

function resolveApiHosts() {
  const hosts = [];
  const seen = new Set();

  const pushHost = (value) => {
    const host = String(value || '').trim();
    if (!host || seen.has(host)) {
      return;
    }
    seen.add(host);
    hosts.push(host);
  };

  const envHost = process.env.EXPO_PUBLIC_API_HOST;
  if (envHost && typeof envHost === 'string' && envHost.trim()) {
    pushHost(envHost);
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    pushHost(hostUri.split(':')[0]);
  }

  if (Platform.OS === 'android') {
    pushHost('10.0.2.2');
  }

  // Last-chance local fallbacks.
  pushHost('127.0.0.1');
  pushHost('localhost');

  return hosts;
}

const API_HOSTS = resolveApiHosts();
const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const API_CONFIG = {
  audio: {
    port: 8001,
    uploadRoutes: ['/predict', '/audio/predict', '/analyze'],
    fileField: 'file',
  },
  image: {
    port: 8002,
    uploadRoutes: ['/predict', '/image/predict', '/analyze'],
    fileField: 'file',
  },
  text: {
    port: 8003,
    textRoutes: ['/predict', '/text/predict', '/analyze'],
    uploadRoutes: ['/predict-file', '/text/predict-file', '/predict'],
    textField: 'text',
    fileField: 'file',
  },
};

function buildFilePart(asset, fallbackType) {
  if (Platform.OS === 'web' && asset?.file) {
    return asset.file;
  }

  return {
    uri: asset.uri,
    name: asset.name || asset.fileName || `upload-${Date.now()}`,
    type: asset.mimeType || fallbackType,
  };
}

function getBaseUrls(port) {
  return API_HOSTS.map((host) => `http://${host}:${port}`);
}

async function parseResponse(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

async function postMultipartWithFallback(baseUrls, routes, fieldName, asset, fallbackType) {
  let lastError;
  const attempted = [];
  const adminHeaders = await getAdminSpotifyHeaders();

  for (const baseUrl of baseUrls) {
    for (const route of routes) {
      const endpoint = `${baseUrl}${route}`;
      attempted.push(endpoint);
      try {
        const form = new FormData();
        form.append(fieldName, buildFilePart(asset, fallbackType));

        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            ...adminHeaders,
          },
          body: form,
        });

        const payload = await parseResponse(response);

        if (response.ok) {
          return { ok: true, endpoint, payload };
        }

        lastError = new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
      } catch (error) {
        lastError = error;
      }
    }
  }

  const attemptsText = attempted.length ? ` Tried: ${attempted.join(', ')}` : '';
  if (lastError) {
    lastError.message = `${lastError.message}${attemptsText}`;
  }
  throw lastError || new Error('Upload failed');
}

async function postJsonWithFallback(baseUrls, routes, body) {
  let lastError;
  const attempted = [];
  const adminHeaders = await getAdminSpotifyHeaders();

  for (const baseUrl of baseUrls) {
    for (const route of routes) {
      const endpoint = `${baseUrl}${route}`;
      attempted.push(endpoint);
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...adminHeaders,
          },
          body: JSON.stringify(body),
        });

        const payload = await parseResponse(response);

        if (response.ok) {
          return { ok: true, endpoint, payload };
        }

        lastError = new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
      } catch (error) {
        lastError = error;
      }
    }
  }

  const attemptsText = attempted.length ? ` Tried: ${attempted.join(', ')}` : '';
  if (lastError) {
    lastError.message = `${lastError.message}${attemptsText}`;
  }
  throw lastError || new Error('Request failed');
}

export async function sendAudioFile(asset) {
  const config = API_CONFIG.audio;
  const baseUrls = getBaseUrls(config.port);
  return postMultipartWithFallback(
    baseUrls,
    config.uploadRoutes,
    config.fileField,
    asset,
    'audio/wav'
  );
}

export async function sendImageFile(asset) {
  const config = API_CONFIG.image;
  const baseUrls = getBaseUrls(config.port);
  return postMultipartWithFallback(
    baseUrls,
    config.uploadRoutes,
    config.fileField,
    asset,
    'image/jpeg'
  );
}

export async function sendTextInput(text) {
  const config = API_CONFIG.text;
  const baseUrls = getBaseUrls(config.port);
  return postJsonWithFallback(baseUrls, config.textRoutes, {
    [config.textField]: text,
  });
}

export async function sendTextFile(asset) {
  const config = API_CONFIG.text;
  const baseUrls = getBaseUrls(config.port);
  return postMultipartWithFallback(
    baseUrls,
    config.uploadRoutes,
    config.fileField,
    asset,
    'text/plain'
  );
}

export { API_CONFIG };
