# conda activate modify
import cv2
import numpy as np
import tensorflow as tf
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import webbrowser
import os

# --- CONFIGURATION ---
MODEL_PATH = 'final_resnet50_mood.h5' 
SPOTIPY_CLIENT_ID = 'f5aa07ef84e94708b1e6ee24fa5849b1' 
SPOTIPY_CLIENT_SECRET = '5f5a6ef16f38432eb52590a9da0f5eb1'
SPOTIPY_REDIRECT_URI = 'http://127.0.0.1:5173/callback'

# Standard FER-2013 Class Labels
EMOTION_LABELS = {
    0: 'Angry', 
    1: 'Disgust', 
    2: 'Fear', 
    3: 'Happy', 
    4: 'Neutral', 
    5: 'Sad', 
    6: 'Surprise'
}

# Mapping Moods to Spotify Search Queries
MOOD_PLAYLISTS = {
    'Angry': 'spotify:playlist:37i9dQZF1DWXIcbzpLauPS',
    'Disgust': 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6',
    'Fear': 'spotify:playlist:37i9dQZF1DWZqd5JICZI0u',
    'Happy': 'spotify:playlist:37i9dQZF1DXdPec7aLTmlC',
    'Neutral': 'spotify:playlist:37i9dQZF1DX8Uebhn9wzrS',
    'Sad': 'spotify:playlist:37i9dQZF1DX7qK8ma5wgG1',
    'Surprise': 'spotify:playlist:37i9dQZF1DX0BcQWzuB7ZO',
    'No Face': 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6'
}

def load_inference_model():
    print(f"Loading trained model from {MODEL_PATH}...")
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Did you run train_manager.py first?")
        exit()

def get_spotify_client():
    print("Authenticating with Spotify...")
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-modify-playback-state,user-read-playback-state"
    ))
    return sp

def predict_mood(image_source, model, face_cascade):
    """
    Accepts either a file path (str) or a webcam frame (numpy array).
    """
    # 1. Handle Input Type
    if isinstance(image_source, str):
        img = cv2.imread(image_source)
    else:
        # It's a frame from the webcam (numpy array)
        img = image_source.copy() 

    if img is None:
        return "Error", None

    # 2. Detect Faces
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Relaxed detection parameters for better detection
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3)

    # 3. Logic: No face -> explicitly state it
    if len(faces) == 0:
        print("⚠️ No face detected.")
        cv2.putText(img, "No Face Detected", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return "No Face", img

    # 4. Process the largest face
    # Sort faces by area (w*h) to ensure we get the main user
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    (x, y, w, h) = faces[0] 
    
    face_roi = img[y:y+h, x:x+w] 
    
    # CRITICAL FIX: Convert BGR to RGB
    face_roi_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
    
    # Test Time Augmentation (TTA)
    # Input A: Normal
    face_resized = cv2.resize(face_roi_rgb, (224, 224))
    input_a = np.expand_dims(face_resized, axis=0) / 255.0
    
    # Input B: Flipped
    face_flipped = cv2.flip(face_resized, 1)
    input_b = np.expand_dims(face_flipped, axis=0) / 255.0
    
    # Predict both
    pred_a = model.predict(input_a, verbose=0)
    pred_b = model.predict(input_b, verbose=0)
    
    # Average predictions
    avg_pred = (pred_a + pred_b) / 2.0
    
    # Print probabilities for debugging
    print("\n--- Emotion Probabilities (Averaged) ---")
    for i, prob in enumerate(avg_pred[0]):
        # Highlight high probabilities
        prefix = ">> " if prob > 0.3 else "   "
        print(f"{prefix}{EMOTION_LABELS[i]}: {prob*100:.2f}%")
    print("-----------------------------\n")

    max_index = np.argmax(avg_pred)
    detected_mood = EMOTION_LABELS[max_index]
    
    # Draw box on image for visualization
    cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
    cv2.putText(img, detected_mood, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36,255,12), 2)
    
    return detected_mood, img

def play_music(sp, mood):
    if mood == "No Face" or mood == "Error":
        print("Skipping music playback (No valid mood detected).")
        return

    query = MOOD_PLAYLISTS.get(mood, "top hits")
    print(f"🎵 Mood is {mood}. Searching Spotify for: '{query}'...")
    
    try:
        results = sp.search(q=query, limit=1, type='track')
        if not results['tracks']['items']:
            print("No songs found.")
            return

        track_uri = results['tracks']['items'][0]['uri']
        track_name = results['tracks']['items'][0]['name']
        
        # Get Active Device
        devices = sp.devices()
        if not devices['devices']:
            print("❌ No active Spotify device found! Please open Spotify on your phone/PC.")
            return

        device_id = devices['devices'][0]['id']
        print(f"▶️ Playing '{track_name}' on {devices['devices'][0]['name']}")
        sp.start_playback(device_id=device_id, uris=[track_uri])
    except Exception as e:
        print(f"Spotify Error: {e}")

def run_webcam_mode(model, face_cascade, sp):
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n--- WEBCAM STARTED ---")
    print("Commands:")
    print(" [SPACE] : Capture mood & Play music")
    print(" [q]     : Quit application")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Show the live feed
        cv2.imshow('Webcam - Press Space to Capture', frame)

        key = cv2.waitKey(1) & 0xFF

        # If 'Space' is pressed
        if key == 32: 
            print("\n📸 Capturing image...")
            mood, processed_img = predict_mood(frame, model, face_cascade)
            
            print(f"✅ Detected Mood: {mood}")
            
            # Show the detection result
            if processed_img is not None:
                cv2.imshow("Detected Mood Result", processed_img)
                cv2.waitKey(2000) 
                cv2.destroyWindow("Detected Mood Result")
            
            play_music(sp, mood)
            print("--- Ready for next capture ---")

        # If 'q' is pressed
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

def run_file_mode(model, face_cascade, sp):
    print("\n--- FILE MODE STARTED ---")
    while True:
        path = input("\nEnter image file path (e.g., 'C:/images/photo.jpg') or 'q' to quit: ").strip()
        
        if path.lower() == 'q':
            break
        
        # Remove quotes if user copied path as "path/to/file"
        path = path.strip('"').strip("'")
        
        if not os.path.exists(path):
            print("❌ File not found! Please check the path and try again.")
            continue

        print(f"Processing image: {path}...")
        mood, processed_img = predict_mood(path, model, face_cascade)
        
        if mood == "Error":
            print("❌ Error reading image file. Is it a valid image?")
            continue

        print(f"✅ Detected Mood: {mood}")
        
        # Show image
        if processed_img is not None:
            cv2.imshow("Walking Model Output", processed_img)
            print("Press any key on the image window to continue...")
            cv2.waitKey(0) # Wait until a key is pressed
            cv2.destroyAllWindows()
            
        play_music(sp, mood)

# --- MAIN APP LOOP ---
if __name__ == "__main__":
    # Setup
    model = load_inference_model()
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    sp = get_spotify_client()

    while True:
        print("\n==============================")
        print("   WALKING MODEL - MENU")
        print("==============================")
        print("1. 📸 Capture from Webcam")
        print("2. 📂 Select Image File")
        print("3. ❌ Exit")
        
        choice = input("\nSelect an option (1-3): ").strip()

        if choice == '1':
            run_webcam_mode(model, face_cascade, sp)
        elif choice == '2':
            run_file_mode(model, face_cascade, sp)
        elif choice == '3':
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")