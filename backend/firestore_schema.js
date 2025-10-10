/**
 * Firestore Data Model for AI Tutor
 * 
 * This document outlines the Firestore collections and document structure
 * for the AI Tutor application designed for students with dyslexia.
 */

/**
 * Collection: users
 * Purpose: Store student profile information and settings
 * Document ID: User UID from Firebase Authentication
 * 
 * Structure:
 * {
 *   uid: string,                  // Firebase Auth UID
 *   email: string,                // Student email
 *   displayName: string,          // Student display name
 *   createdAt: timestamp,         // Account creation date
 *   lastLogin: timestamp,         // Last login timestamp
 *   
 *   // Accessibility and UI preferences
 *   preferences: {
 *     fontSize: number,           // Font size (px or relative unit)
 *     fontFamily: string,         // Font family preference
 *     lineSpacing: number,        // Line spacing multiplier
 *     wordSpacing: number,        // Word spacing multiplier
 *     textColor: string,          // Preferred text color (hex)
 *     backgroundColor: string,    // Preferred background color (hex)
 *     highContrast: boolean,      // High contrast mode enabled
 *     uiTtsEnabled: boolean,      // UI text-to-speech enabled
 *     
 *     // TTS preferences
 *     ttsVoice: string,           // Preferred TTS voice
 *     ttsSpeed: number,           // TTS speed (0.5 to 2.0)
 *     ttsPitch: number,           // TTS pitch adjustment
 *   },
 *   
 *   // Gamification state
 *   gamification: {
 *     points: number,             // Total points earned
 *     streak: number,             // Current daily streak
 *     lastActivity: timestamp,    // Last activity timestamp
 *     level: number,              // Current level
 *     badges: [                   // Badges earned
 *       {
 *         id: string,             // Badge identifier
 *         name: string,           // Badge name
 *         description: string,    // Badge description
 *         earnedAt: timestamp,    // When badge was earned
 *         imageUrl: string        // Badge image URL
 *       }
 *     ]
 *   }
 * }
 */

/**
 * Collection: documents
 * Purpose: Store metadata about uploaded documents
 * Document ID: Auto-generated
 * 
 * Structure:
 * {
 *   userId: string,               // Reference to owner's UID
 *   title: string,                // Document title
 *   originalFilename: string,     // Original filename
 *   fileType: string,             // MIME type of the file
 *   uploadedAt: timestamp,        // Upload timestamp
 *   lastAccessed: timestamp,      // Last accessed timestamp
 *   
 *   // Storage references
 *   storageRef: string,           // GCS path to the original file
 *   textContent: string,          // Extracted text content (if small)
 *   textContentRef: string,       // GCS path to extracted text (if large)
 *   
 *   // Document processing status
 *   processingStatus: string,     // 'pending', 'processing', 'completed', 'error'
 *   processingError: string,      // Error message if processing failed
 *   
 *   // Organization
 *   folderId: string,             // ID of the folder containing this document
 *   tags: [string],               // Array of tag IDs applied to this document
 *   
 *   // Document statistics
 *   pageCount: number,            // Number of pages
 *   wordCount: number,            // Approximate word count
 *   
 *   // Offline availability
 *   availableOffline: boolean     // Whether document is saved for offline use
 * }
 */

/**
 * Collection: folders
 * Purpose: Organize documents in folders
 * Document ID: Auto-generated
 * 
 * Structure:
 * {
 *   userId: string,               // Reference to owner's UID
 *   name: string,                 // Folder name
 *   createdAt: timestamp,         // Creation timestamp
 *   updatedAt: timestamp,         // Last update timestamp
 *   parentFolderId: string,       // Parent folder ID (null if root)
 *   color: string                 // Folder color for UI
 * }
 */

/**
 * Collection: tags
 * Purpose: Tag documents for organization
 * Document ID: Auto-generated
 * 
 * Structure:
 * {
 *   userId: string,               // Reference to owner's UID
 *   name: string,                 // Tag name
 *   createdAt: timestamp,         // Creation timestamp
 *   color: string                 // Tag color for UI
 * }
 */

/**
 * Collection: interactions
 * Purpose: Store interaction history between student and AI Tutor
 * Document ID: Auto-generated
 * 
 * Structure:
 * {
 *   userId: string,               // Reference to owner's UID
 *   documentId: string,           // Reference to document (null if general)
 *   timestamp: timestamp,         // Interaction timestamp
 *   type: string,                 // Type of interaction (e.g., 'question', 'summary', 'quiz')
 *   
 *   // Content of the interaction
 *   studentQuery: string,         // Student's question/request
 *   agentResponse: string,        // AI Tutor's response
 *   
 *   // Optional specific fields for different interaction types
 *   // For quiz mode
 *   quizQuestion: string,         // Question asked by AI
 *   studentAnswer: string,        // Student's answer
 *   correct: boolean,             // Whether the answer was correct
 *   
 *   // For study mode
 *   relevantPassage: string,      // Relevant passage from the document
 *   
 *   // For voice interactions
 *   audioRef: string,             // GCS path to audio file (if relevant)
 *   
 *   // Tracking metrics
 *   responseTime: number,         // Time taken to respond (ms)
 *   toolsUsed: [string]           // Array of Agent tools used in this interaction
 * }
 */

/**
 * Collection: progress
 * Purpose: Track student learning progress
 * Document ID: Auto-generated
 * 
 * Structure:
 * {
 *   userId: string,               // Reference to owner's UID
 *   documentId: string,           // Reference to document (may be null)
 *   date: timestamp,              // Date of the activity
 *   
 *   // Activity metrics
 *   studyDuration: number,        // Duration of study session (minutes)
 *   quizzesTaken: number,         // Number of quizzes taken
 *   questionsAsked: number,       // Number of questions asked
 *   documentsRead: number,        // Number of documents read
 *   wordsMastered: number,        // Number of words mastered
 *   
 *   // Advanced analytics
 *   focusAreas: [string],         // Topics or areas of focus
 *   comprehensionScore: number,   // Estimated comprehension score (0-100)
 *   difficultyLevel: number       // Current difficulty level
 * }
 */
