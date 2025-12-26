#!/usr/bin/env python3
"""
Voice Migration Script for LexiAid

This script batch-updates all existing users in Firestore to use the new 
Chirp3-HD-Leda voice model, replacing any legacy voice settings.

Usage:
    # Dry run (see what would change without making changes)
    python -m scripts.migrate_voices --dry-run
    
    # Execute the migration
    python -m scripts.migrate_voices

Run from the backend directory:
    cd backend
    python -m scripts.migrate_voices --dry-run
"""

import argparse
import os
import sys
from pathlib import Path

# Add backend directory to path for imports
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables from backend/.env
load_dotenv(backend_dir / ".env")

# --- Configuration ---
NEW_VOICE = "en-US-Chirp3-HD-Leda"

def init_firestore():
    """Initialize Firebase Admin SDK and return Firestore client."""
    # Check if already initialized
    if firebase_admin._apps:
        return firestore.client()
    
    # Get service account path from environment
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
    
    if not service_account_path:
        print("ERROR: FIREBASE_SERVICE_ACCOUNT_KEY_PATH not set in environment")
        sys.exit(1)
    
    # Resolve path relative to backend directory if not absolute
    if not os.path.isabs(service_account_path):
        service_account_path = str(backend_dir / service_account_path)
    
    if not os.path.exists(service_account_path):
        print(f"ERROR: Service account file not found: {service_account_path}")
        sys.exit(1)
    
    # Get database name from environment (optional)
    database_name = os.getenv("FIRESTORE_DATABASE_NAME", "(default)")
    
    # Initialize Firebase Admin
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    
    # Return Firestore client with specific database if configured
    if database_name and database_name != "(default)":
        return firestore.client(database_id=database_name)
    return firestore.client()


def needs_migration(voice_name: str) -> bool:
    """
    Check if a voice needs to be migrated.
    
    Returns True if the voice is set and is NOT the target voice.
    This is stricter than pattern matching - any non-target voice gets updated.
    """
    if not voice_name:
        return False
    return voice_name != NEW_VOICE


def migrate_users(dry_run: bool = True):
    """
    Migrate all users to the new voice model.
    
    Args:
        dry_run: If True, only log what would change without making updates.
    """
    print("=" * 60)
    print("LexiAid Voice Migration Script")
    print("=" * 60)
    print(f"Target Voice: {NEW_VOICE}")
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (changes will be applied)'}")
    print(f"Logic: Update any voice that is NOT '{NEW_VOICE}'")
    print("=" * 60)
    print()
    
    # Initialize Firestore
    print("Initializing Firestore connection...")
    db = init_firestore()
    print("Connected to Firestore successfully.")
    print()
    
    # Get all users
    users_ref = db.collection("users")
    users = users_ref.stream()
    
    # Counters
    total_users = 0
    users_updated = 0
    users_skipped = 0
    errors = 0
    
    updated_user_ids = []
    
    print("Processing users...")
    print("-" * 60)
    
    for user_doc in users:
        total_users += 1
        user_id = user_doc.id
        user_data = user_doc.to_dict()
        
        # Check if user has preferences
        preferences = user_data.get("preferences", {})
        if not preferences:
            print(f"  [{user_id}] No preferences found - SKIPPED")
            users_skipped += 1
            continue
        
        # Check voice settings
        tts_voice = preferences.get("ttsVoice", "")
        cloud_tts_voice = preferences.get("cloudTtsVoice", "")
        
        updates = {}
        
        # Check ttsVoice - update if set and not equal to target
        if needs_migration(tts_voice):
            updates["preferences.ttsVoice"] = NEW_VOICE
            print(f"  [{user_id}] ttsVoice: '{tts_voice}' -> '{NEW_VOICE}'")
        
        # Check cloudTtsVoice - update if set and not equal to target
        if needs_migration(cloud_tts_voice):
            updates["preferences.cloudTtsVoice"] = NEW_VOICE
            print(f"  [{user_id}] cloudTtsVoice: '{cloud_tts_voice}' -> '{NEW_VOICE}'")
        
        # Apply updates if any
        if updates:
            if dry_run:
                print(f"  [{user_id}] Would update {len(updates)} field(s)")
            else:
                try:
                    users_ref.document(user_id).update(updates)
                    print(f"  [{user_id}] Updated {len(updates)} field(s)")
                except Exception as e:
                    print(f"  [{user_id}] ERROR: {e}")
                    errors += 1
                    continue
            
            users_updated += 1
            updated_user_ids.append(user_id)
        else:
            # User already has new voice or no voice set
            current_voices = []
            if tts_voice:
                current_voices.append(f"ttsVoice='{tts_voice}'")
            if cloud_tts_voice:
                current_voices.append(f"cloudTtsVoice='{cloud_tts_voice}'")
            
            if current_voices:
                print(f"  [{user_id}] Already up-to-date ({', '.join(current_voices)}) - SKIPPED")
            else:
                print(f"  [{user_id}] No voice preferences set - SKIPPED")
            users_skipped += 1
    
    # Summary
    print()
    print("=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Total users processed: {total_users}")
    print(f"Users updated:         {users_updated}")
    print(f"Users skipped:         {users_skipped}")
    if errors:
        print(f"Errors:                {errors}")
    print()
    
    if updated_user_ids:
        print("Updated User IDs:")
        for uid in updated_user_ids:
            print(f"  - {uid}")
        print()
    
    if dry_run:
        print("*** DRY RUN COMPLETE - No changes were made ***")
        print("Run without --dry-run to apply changes.")
    else:
        print("*** MIGRATION COMPLETE ***")
    
    return users_updated, errors


def main():
    parser = argparse.ArgumentParser(
        description="Migrate LexiAid users to new Chirp3-HD-Leda voice model. "
                    "Updates ANY voice that is not the target voice (stricter than pattern matching)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making actual updates"
    )
    
    args = parser.parse_args()
    
    try:
        updated, errors = migrate_users(dry_run=args.dry_run)
        sys.exit(1 if errors > 0 else 0)
    except KeyboardInterrupt:
        print("\nMigration cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
