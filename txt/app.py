import torch
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import sys

# ================= CONFIGURATION =================
# Replace these with your actual Spotify credentials
SPOTIPY_CLIENT_ID = 'f5aa07ef84e94708b1e6ee24fa5849b1'
SPOTIPY_CLIENT_SECRET = '5f5a6ef16f38432eb52590a9da0f5eb1'
SPOTIPY_REDIRECT_URI = 'http://127.0.0.1:5173/callback'

# Path to the model we trained in Phase 2
MODEL_PATH = "./modify_bert_model" 

# Define which playlist/search term corresponds to which emotion
# Updated for Kaggle Dataset Emotions
# Updated Map to match your Model's specific outputs
EMOTION_MUSIC_MAP = {
    "joy": "Tollywood Party Songs",
    "sad": "Telugu Sad Songs",
    "sadness": "Telugu Sad Songs",
    "anger": "Telugu Mass Action Songs",
    "fear": "Telugu Devotional Songs",
    "love": "spotify:playlist:37i9dQZF1DX44F1QWqYoaV",
    "suprise": "Telugu Dance Hits",
    "surprise": "Telugu Dance Hits"
}
# =================================================

class ModifyApp:
    def __init__(self):
        print("Initializing Modify App...")
        self.load_model()
        self.setup_spotify()

    def load_model(self):
        """Loads the trained BERT model."""
        print("--> Loading Brain (BERT Model)...")
        try:
            self.tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_PATH)
            self.model = DistilBertForSequenceClassification.from_pretrained(MODEL_PATH)
            self.labels = self.model.config.id2label
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Did you run 'train_brain.py' first?")
            sys.exit(1)

    def setup_spotify(self):
        """Authenticates with Spotify."""
        print("--> Connecting to Spotify...")
        scope = "user-modify-playback-state user-read-playback-state"
        self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=SPOTIPY_CLIENT_ID,
            client_secret=SPOTIPY_CLIENT_SECRET,
            redirect_uri=SPOTIPY_REDIRECT_URI,
            scope=scope
        ))

    def get_emotion(self, text):
        """Uses BERT to classify text into an emotion."""
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=64)
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Get the label with the highest score
        prediction = torch.argmax(outputs.logits, dim=1).item()
        emotion = self.labels[prediction]
        return emotion

    def play_music(self, emotion):
        """Plays music. Handles empty results and mismatches gracefully."""
        # Default to 'Telugu Top 50' if the emotion is not in the map
        target = EMOTION_MUSIC_MAP.get(emotion, "Telugu Top 50") 
        
        print(f"--> Emotion is '{emotion}'. Target: {target}")

        try:
            # 1. Find Device
            devices = self.sp.devices()
            if not devices or not devices.get('devices'):
                print("❌ No active Spotify device found. Open Spotify and press Play!")
                return
            
            device_id = devices['devices'][0]['id']
            device_name = devices['devices'][0]['name']

            # 2. Check if it's a direct Link or a Search Term
            if "spotify:playlist:" in target:
                print(f"--> Playing direct playlist on {device_name}...")
                self.sp.start_playback(device_id=device_id, context_uri=target)
            else:
                # Search for a playlist
                print(f"--> Searching Spotify for playlist: '{target}'...")
                results = self.sp.search(q=target, limit=1, type='playlist')
                
                # CRASH FIX: Check if results exist before accessing them
                if results and results.get('playlists') and results['playlists']['items']:
                    playlist_uri = results['playlists']['items'][0]['uri']
                    playlist_name = results['playlists']['items'][0]['name']
                    print(f"--> Found: {playlist_name}")
                    self.sp.start_playback(device_id=device_id, context_uri=playlist_uri)
                    print(f"✅ Playing music on {device_name}")
                else:
                    print(f"⚠️ Could not find any playlist for '{target}'. Playing Top 50 instead.")
                    # Fallback to a guaranteed working playlist
                    self.sp.start_playback(device_id=device_id, context_uri="spotify:playlist:37i9dQZF1DX5c6AR3q5V4f")

        except Exception as e:
            print(f"Spotify Error: {e}")
    def run(self):
        print("\n--- MODIFY APP STARTED ---")
        print("Type 'exit' to quit.\n")
        
        while True:
            user_input = input("How are you feeling? (Text): ")
            if user_input.lower() == 'exit':
                break
            
            # 1. Analyze
            emotion = self.get_emotion(user_input)
            print(f"Detected Mood: {emotion.upper()}")
            
            # 2. Act
            self.play_music(emotion)
            print("-" * 30)

if __name__ == "__main__":
    app = ModifyApp()
    app.run()