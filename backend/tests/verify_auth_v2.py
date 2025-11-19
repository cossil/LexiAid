import os
import requests
import json
import random
from dotenv import load_dotenv

# Load environment variables from backend/.env
# This assumes the script is run from the project root or the script's directory
# Adjust the path if necessary based on where you execute the script
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(current_dir), '.env')

print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

FIREBASE_API_KEY = os.getenv('FIREBASE_API_KEY')
# Default to localhost:5000, but allow override
BASE_URL = os.getenv('BACKEND_API_URL', "http://localhost:5000")

def run_test():
    if not FIREBASE_API_KEY:
        print("Error: FIREBASE_API_KEY not found in environment variables.")
        print("Please ensure your .env file contains FIREBASE_API_KEY.")
        return

    print(f"--- Starting Auth Verification (V2) against {BASE_URL} ---")

    # 1. Generate Test User
    random_int = random.randint(1000, 9999)
    email = f"test_user_{random_int}@lexiaid.com"
    password = "TestPassword123!"
    display_name = f"Test User {random_int}"
    
    print(f"\n1. Signup (Server-Side Creation) for {email}")
    signup_payload = {
        "email": email,
        "password": password,
        "display_name": display_name
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/users", json=signup_payload)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 201:
            print("Success! User created.")
            data = resp.json()
            print(f"User ID: {data.get('userId')}")
        else:
            print(f"Failed. Response: {resp.text}")
            return
    except Exception as e:
        print(f"Request failed: {e}")
        print("Ensure the backend server is running on localhost:5000")
        return

    # 2. Login (Token Retrieval)
    print("\n2. Login (Token Retrieval via Google Identity Toolkit)")
    # Use the Google Identity Toolkit API to simulate a client login and get a token
    login_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    login_payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    id_token = None
    try:
        resp = requests.post(login_url, json=login_payload)
        if resp.status_code == 200:
            data = resp.json()
            id_token = data.get('idToken')
            print("Success! ID Token retrieved.")
        else:
            print(f"Login Failed. Status: {resp.status_code}, Response: {resp.text}")
            return
    except Exception as e:
        print(f"Login request failed: {e}")
        return

    headers = {"Authorization": f"Bearer {id_token}"}

    # 3. Update Profile
    print("\n3. Update Profile (Schema Validation)")
    # Update font size and high contrast to verify PUT endpoint and schema validation
    update_payload = {
        "preferences": {
            "fontSize": 24,
            "highContrast": True
        }
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/api/users/profile", json=update_payload, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Success! Profile updated.")
            
            # Verify the update by fetching the profile
            print("Verifying update via GET...")
            get_resp = requests.get(f"{BASE_URL}/api/users/profile", headers=headers)
            if get_resp.status_code == 200:
                profile = get_resp.json().get('data', {})
                prefs = profile.get('preferences', {})
                if prefs.get('fontSize') == 24 and prefs.get('highContrast') is True:
                    print("Verification Passed: Preferences match expected values.")
                else:
                    print(f"Verification Failed: Preferences mismatch. Got {prefs}")
            else:
                print(f"Verification GET failed: {get_resp.status_code}")
        else:
            print(f"Update Failed. Response: {resp.text}")
    except Exception as e:
        print(f"Update request failed: {e}")

    # 4. Cleanup (Deletion)
    print("\n4. Cleanup (Deletion)")
    try:
        resp = requests.delete(f"{BASE_URL}/api/users", headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Success! User deleted.")
        else:
            print(f"Deletion Failed. Response: {resp.text}")
    except Exception as e:
        print(f"Deletion request failed: {e}")

    # 5. Verify Deletion
    print("\n5. Verify Deletion (Expect 404/401)")
    # Attempt to fetch profile again. Should fail as user no longer exists.
    try:
        resp = requests.get(f"{BASE_URL}/api/users/profile", headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code in [401, 404]:
            print("Success! User verified as deleted (Unauthorized or Not Found).")
        else:
            print(f"Warning: User still accessible? Response: {resp.text}")
    except Exception as e:
        print(f"Verification request failed: {e}")

if __name__ == "__main__":
    run_test()
