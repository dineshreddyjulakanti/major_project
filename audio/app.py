# conda activate audio_env
import os
import pickle
import numpy as np
import librosa
import tensorflow as tf
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import sounddevice as sd
from scipy.io.wavfile import write

# --- CONFIG & INIT ---
load_dotenv()

MODEL_PATH = "model_cnn.keras"
ENCODER_PATH = "label_encoder.pkl"

# --- PART 1: SPOTIFY SERVICE ---
class SpotifyService:
    def __init__(self):
        self.client_id = os.getenv("SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = "http://127.0.0.1:5173/callback" 
        
        self.sp = None
        if self.client_id and self.client_secret:
            try:
                scope = "user-modify-playback-state user-read-playback-state"
                auth_manager = SpotifyOAuth(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    redirect_uri=self.redirect_uri,
                    scope=scope
                )
                self.sp = spotipy.Spotify(auth_manager=auth_manager)
                print("✅ Spotify Connected (User Mode).")
            except Exception as e:
                print(f"❌ Spotify Auth Failed: {e}")

        self.search_mapping = {
            'happy': "Happy Pop", 
            'sad': "Sad Acoustic",
            'angry': "Heavy Metal",
            'fearful': "Dark Ambient",
            'disgust': "Grunge",
            'surprised': "Party Dance",
            'neutral': "Lo-Fi Beats"
        }

    def play_music_for_mood(self, mood_label):
        if not self.sp:
            print("❌ Spotify not connected.")
            return

        search_query = self.search_mapping.get(mood_label, "Top Hits")
        print(f"\n🔎 Mood: '{mood_label.upper()}' -> Playing: '{search_query}'...")

        try:
            devices = self.sp.devices()
            if not devices or not devices.get('devices'):
                print("⚠️ No active Spotify device found. Please open Spotify!")
                return
            
            active_device = devices['devices'][0]
            device_id = active_device['id']

            results = self.sp.search(q=search_query, limit=5, type='track')
            if not results or not results['tracks']['items']:
                print("⚠️ Search empty. Playing Fallback.")
                self.sp.start_playback(device_id=device_id, context_uri="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M")
                return

            track = results['tracks']['items'][0]
            print(f"▶️ Now Playing: {track['name']} - {track['artists'][0]['name']}")
            self.sp.start_playback(device_id=device_id, uris=[track['uri']])

        except Exception as e:
            print(f"❌ Playback Error: {e}")

spotify_service = SpotifyService()

# --- PART 2: ML RESOURCES ---
def load_ml_resources():
    model = None
    encoder = None
    try:
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
        if os.path.exists(ENCODER_PATH):
            with open(ENCODER_PATH, "rb") as f:
                encoder = pickle.load(f)
    except Exception as e:
        print(f"❌ Error loading ML resources: {e}")
    return model, encoder

model, encoder = load_ml_resources()

def preprocess_audio(file_path):
    SAMPLE_RATE = 22050
    DURATION = 3
    SAMPLES_PER_TRACK = SAMPLE_RATE * DURATION
    try:
        y, sr = librosa.load(file_path, sr=SAMPLE_RATE, duration=DURATION)
        if np.max(np.abs(y)) < 0.005: return None
        if len(y) > SAMPLES_PER_TRACK:
            y = y[:SAMPLES_PER_TRACK]
        else:
            padding = int(SAMPLES_PER_TRACK - len(y))
            y = np.pad(y, (0, padding), mode='constant')
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        return mel_spec_db[np.newaxis, ..., np.newaxis]
    except:
        return None

# --- PART 3: RECORDING ---
def record_live_audio(filename="live_input.wav", duration=4, fs=22050):
    print(f"\n🎤 Recording for {duration}s... SPEAK NOW!")
    try:
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
        sd.wait()
        write(filename, fs, recording)
        print("✅ Done.")
        return filename
    except Exception as e:
        print(f"❌ Mic Error: {e}")
        return None

# --- PART 4: ANALYSIS ---
def analyze_and_play(file_path):
    if not model or not encoder:
        print("❌ Model missing.")
        return

    features = preprocess_audio(file_path)
    if features is None:
        print("⚠️ Audio unclear/silent.")
        return

    preds = model.predict(features, verbose=0)
    idx = np.argmax(preds)
    conf = float(np.max(preds))
    mood = encoder.inverse_transform([idx])[0]
    
    if conf < 0.40: mood = "neutral"

    print(f"✅ Result: {mood.upper()} ({conf:.2f})")
    spotify_service.play_music_for_mood(mood)

# --- PART 5: MAIN MENU ---
def main():
    print("\n--- 🎧 AUDIO MOODIFY 🎧 ---")
    
    while True:
        print("\nMAIN MENU:")
        print("1. File Mode (Enter paths)")
        print("2. Live Mode (Record voice)")
        print("Type 'exit' to quit app.")
        
        choice = input("Select Option: ").strip().lower()

        if choice == 'exit':
            print("Goodbye! 👋")
            break

        # --- OPTION 1: CONTINUOUS FILE MODE ---
        elif choice == '1':
            print("\n--- 📂 FILE MODE ---")
            print("(Type 'q' to go back to Main Menu)")
            
            while True:
                path = input("\nEnter Audio Path: ").strip()
                
                if path.lower() == 'q':
                    break # Break inner loop, go back to Main Menu
                
                # Clean quotes from drag-drop
                if path.startswith('"') and path.endswith('"'): path = path[1:-1]
                
                if os.path.exists(path):
                    analyze_and_play(path)
                else:
                    print("❌ File not found.")

        # --- OPTION 2: CONTINUOUS LIVE MODE ---
        elif choice == '2':
            print("\n--- 🎤 LIVE MODE ---")
            print("(Type 'q' to go back to Main Menu)")
            
            while True:
                user_action = input("\nPress [Enter] to Record (or 'q' to back): ").strip().lower()
                
                if user_action == 'q':
                    break # Break inner loop, go back to Main Menu
                
                # Record -> Analyze -> Delete Temp File
                temp_file = record_live_audio()
                if temp_file:
                    analyze_and_play(temp_file)
                    if os.path.exists(temp_file):
                        os.remove(temp_file)

        else:
            print("Invalid input.")

if __name__ == "__main__":
    main()