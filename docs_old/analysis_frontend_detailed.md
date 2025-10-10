# Comprehensive Frontend Codebase Analysis

This document provides a complete and unified analysis of the LexiAid frontend application. It merges the individual analyses of the core application structure, pages, components, hooks, contexts, and services into a single, cohesive reference.

---

# 1. Frontend Core (`src/main.tsx`, `src/App.tsx`)

This section analyzes the core files that serve as the entry point and structural foundation for the LexiAid frontend application.

---

## 1.1 `src/main.tsx`

### **Purpose**

This is the primary entry point for the React application. Its sole responsibility is to render the root component, `<App />`, into the DOM. It's the first piece of application-specific code that runs in the browser.

### **Key Functions & Components**

-   **`createRoot(document.getElementById('root')!)`**: This function from `react-dom/client` creates a new React root on the `<div id="root"></div>` element in the main `index.html` file.
-   **`.render(<App />)`**: This method mounts the main `<App />` component into the newly created root.
-   **`<StrictMode>`**: The `<App />` component is wrapped in `<StrictMode>`, a React tool that highlights potential problems in an application by activating additional checks and warnings (but only in development mode).

### **Inputs & Outputs**

-   **Input**: The `<App />` component.
-   **Side Effect**: Renders the entire React application into the HTML page.

---

## 1.2 `src/App.tsx`

### **Purpose**

`App.tsx` is the top-level component that establishes the application's routing architecture and global context. It defines which components are rendered for which URL paths and wraps the entire application in essential context providers that manage global state.

### **Key Functions & Components**

-   **`UserInteractionGateway`**: A crucial component for the auditory-first mission. Browsers block audio playback until a user interacts with the page. This component displays an overlay on first load, prompting the user to click. This single interaction unblocks the browser's audio features (`AudioContext`, `speechSynthesis`), ensuring that TTS and other audio functionalities will work reliably later.

-   **`ProtectedRoute`**: A higher-order component that protects routes requiring authentication. It uses the `useAuth` hook to check the user's authentication status. If the user is not logged in, it redirects them to the `/auth/signin` page. While loading, it displays a spinner.

-   **`AppRoutes`**: This component contains the core routing logic using `react-router-dom`. It defines all the URL paths for the application and maps them to specific page components. It distinguishes between:
    -   **Public Routes**: `/`, `/auth/signin`, `/auth/signup`, etc., accessible to anyone.
    -   **Protected Routes**: All routes under `/dashboard` are wrapped by the `ProtectedRoute` component, requiring a user to be logged in.
    -   **Nested Routes**: The `/dashboard` route uses a `DashboardLayout` component, which contains an `<Outlet />`. This allows child routes like `/dashboard/documents` or `/dashboard/settings` to be rendered within the consistent layout of the dashboard (e.g., with a persistent sidebar).

-   **Context Providers**: The entire `AppRoutes` component is wrapped in a hierarchy of context providers, making global state available to all components in the tree:
    -   **`<Router>`**: The top-level provider from `react-router-dom` that enables all routing functionality.
    -   **`<AuthProvider>`**: Manages user authentication state (e.g., `currentUser`, `loading`).
    -   **`<AccessibilityProvider>`**: Manages accessibility settings like font size and color contrast.
    -   **`<DocumentProvider>`**: (Used within `DashboardLayout`) Manages the currently active document's ID, allowing different components to know which document is being viewed or interacted with.
    -   **`<QuizProvider>`**: (Used within `DashboardLayout`) Manages the state of an active quiz.

### **Inputs & Outputs**

-   **Input**: This component primarily responds to browser URL changes.
-   **Output**: Renders the appropriate page component based on the current URL path, wrapped in a consistent layout and with access to global state via context.

---

# 2. Frontend Pages (`src/pages/`)

This section analyzes the primary view components of the application.

---

## 2.1 `LandingPage.tsx`

-   **Purpose**: Serves as the public-facing homepage for unauthenticated users. Its goal is to explain the value proposition of LexiAid and encourage users to sign up or sign in.
-   **Key Components**: Includes a hero section, feature highlights, testimonials, and clear calls-to-action. It prominently features accessibility toggles for UI Text-to-Speech (TTS) and high contrast mode.
-   **Functionality**: This page is primarily static but heavily leverages the `useAccessibility` hook to provide auditory feedback on hover for nearly every interactive element, immediately showcasing the application's auditory-first design philosophy.

---

## 2.2 Authentication Pages (`auth/`)

This module contains all pages related to user authentication.

-   **`SignIn.tsx`**: Provides a standard login form for users to sign in with an email and password. It also includes a "Sign in with Google" option. It uses the `signIn` and `signInWithGoogle` methods from the `useAuth` context.
-   **`SignUp.tsx`**: A registration form for new users, collecting their name, email, and password. It uses the `signUp` method from `useAuth` to create a new user account in Firebase and a corresponding profile in Firestore.
-   **`ResetPassword.tsx`**: A simple form that allows users to enter their email address to receive a password reset link, using the `resetPassword` method from `useAuth`.

---

## 2.3 `Dashboard.tsx`

-   **Purpose**: This is the central hub for authenticated users. It provides an at-a-glance overview of their recent activity and quick access to key application features.
-   **Key Components**:
    -   A personalized welcome message.
    -   **Quick Actions**: Large, clear buttons to "Upload Document," "Start Studying," "Chat with AI Tutor," and "View Progress."
    -   **Recent Documents**: A list of the user's most recently accessed documents, fetched from the `/api/documents` endpoint.
    -   **Progress Summary**: A section displaying key metrics like study time and quizzes taken. (Note: This currently uses placeholder data, suggesting the backend endpoint is not yet fully integrated).
-   **Data Fetching**: Makes API calls to `/api/documents` and `/api/users/profile` to populate the page with user-specific data.

---

## 2.4 `DocumentsList.tsx`

-   **Purpose**: Displays a comprehensive, sortable, and filterable list of all documents belonging to the user.
-   **Functionality**:
    -   **Data Fetching**: Retrieves the full list of documents from the `/api/documents` endpoint.
    -   **Search & Sort**: Allows users to filter documents by name using a search bar and sort the list by date, name, or file type.
    -   **Status Indicators**: Visually communicates the processing status of each document (e.g., "Processing," "Ready," "Error").
    -   **Deletion**: Includes a delete button for each document, which triggers a confirmation modal before making a `DELETE` request to the `/api/documents/<document_id>` endpoint.

---

## 2.5 `DocumentUpload.tsx`

-   **Purpose**: Provides a dedicated and user-friendly interface for uploading new documents.
-   **Functionality**:
    -   **File Input**: Supports both drag-and-drop and a traditional file browser.
    -   **Validation**: Performs client-side validation to ensure the uploaded file is of a supported type (PDF, image, text) and within the 15MB size limit.
    -   **API Call**: On submission, it sends the file and a user-provided document name as `multipart/form-data` to the `/api/documents/upload` endpoint.
    -   **Feedback**: Displays a progress bar during the upload and, upon success, shows a confirmation message before automatically redirecting the user to the `DocumentView` page for the new document.

---

## 2.6 `DocumentView.tsx`

-   **Purpose**: This is the core interaction page for a single document, providing multiple ways for a user to engage with its content. This page is central to the LexiAid learning experience.
-   **Key Components**:
    -   **Tabbed Interface**: Organizes functionality into three distinct tabs:
        1.  **Read**: The default view, which displays the document's text content. This is where the primary auditory learning takes place. It integrates the `useTTSPlayer` hook to provide robust "Read Aloud" functionality, complete with synchronized word highlighting.
        2.  **Chat**: A placeholder tab that contains a button to navigate to the dedicated `ChatPage` for the current document.
        3.  **Quiz**: Another placeholder tab with a button that navigates to the `ChatPage` but with a specific URL parameter (`?start_quiz=true`) to immediately initiate a quiz.
    -   **Accessibility Controls**: Includes on-page controls for adjusting font size and line spacing.
-   **Data Fetching**: Fetches the full document details, including its processed text content, from the `/api/documents/<id>?include_content=true` endpoint.
-   **Context Management**: It uses the `useDocument` hook to set the `activeDocumentId` in the global context, ensuring other components (like the main sidebar) are aware of the currently viewed document.

---

## 2.7 `ChatPage.tsx`

-   **Purpose**: Provides the conversational interface for interacting with the AI Tutor. This page is versatile, handling both general Q&A and the interactive quiz flow.
-   **Functionality**:
    -   **State Management**: Manages the conversation history (`messages`), the backend `threadId` for stateful conversation, and the overall loading state.
    -   **Message Handling**: The `handleSendMessage` function sends text queries to the `/api/v2/agent/chat` endpoint.
    -   **Audio Input**: The `handleAudioSend` function captures audio from the user's microphone, sends it to the same chat endpoint as `multipart/form-data`, and updates the chat with the transcribed text and the agent's response.
    -   **Quiz Initiation**: It can be triggered to start a quiz via a URL parameter (`?start_quiz=true`), which it uses to send the initial `/start_quiz` command to the backend.
    -   **Component Integration**: It uses the `GeminiChatInterface` component to render the chat bubbles, input field, and microphone controls.

---

## 2.8 `Settings.tsx`

-   **Purpose**: A centralized page for users to customize their accessibility and text display preferences.
-   **Functionality**: Provides controls for:
    -   Toggling UI Text-to-Speech (TTS) on and off.
    -   Adjusting the delay for hover-to-speak.
    -   Toggling high contrast mode.
    -   Adjusting font size, line spacing, word spacing, and font family.
-   **Context Integration**: All settings are managed through the `useAccessibility` hook, which persists these preferences globally and likely saves them to the user's Firestore profile.

---

## 2.9 `dev/DeprecationShowcase.tsx`

-   **Purpose**: A developer-only utility page for visually inspecting and testing components that have been marked as candidates for deprecation. It is not included in production builds.
-   **Functionality**: It imports and renders a list of deprecated components (e.g., `Hero`, `CTA`, `FeatureCard`, `MessageWithTTS`) in isolated sections, allowing developers to confirm they still render without errors and to assess what functionality would be lost upon their removal.

---

# 3. Frontend Components (`src/components/`)

This section analyzes the reusable UI building blocks.

---

## 3.1 `GeminiChatInterface.tsx`

-   **Purpose**: This is the core component for all conversational interactions. It orchestrates the display of messages, the chat input bar, and all associated functionality like TTS and quiz interactions.
-   **Key Sub-components**:
    -   **`MessageBubble`**: Renders a single chat message. It dynamically handles different message types: user vs. agent, standard text, quiz questions with options, and messages with errors. Crucially, it integrates with the TTS hooks (`useChatTTSPlayer`, `useOnDemandTTSPlayer`) to display a speaker icon and trigger audio playback. It also contains the logic to render text with word-by-word highlighting during TTS playback.
    -   **`ChatInputBar`**: The input area at the bottom of the chat. It contains the text input `textarea`, the `Send` button, and the `MicrophoneButton`.
-   **Functionality**: It receives an array of `messages` and callback functions (`onSendMessage`, `onAudioSend`) from its parent (`ChatPage.tsx`). It manages the state of which message is currently being played and passes the correct props down to each `MessageBubble`.

---

## 3.2 `MicrophoneButton.tsx`

-   **Purpose**: A sophisticated, stateful component that encapsulates all logic for audio recording and processing.
-   **Functionality**: It manages a multi-step user flow:
    1.  **Permission & Recording**: On first click, it requests microphone permission. On subsequent clicks, it starts or stops recording using the `useAudioRecorder` hook.
    2.  **Post-Recording Controls**: After a recording is stopped, it displays a set of controls (cancel, review, direct send).
    3.  **Review Flow**: If the user clicks "Review," it opens the `AudioReview` modal, which first triggers a server-side transcription of the audio and then allows the user to play back their recording and edit the transcribed text before sending.
    4.  **Direct Send**: If the user clicks "Send Directly," it immediately sends the audio to the backend for transcription and agent processing in a single step.
-   **State Management**: Manages its own internal state machine (`idle`, `recording`, `processing`, `review`) to control the UI.

---

## 3.3 `SpeakableDocumentContent.tsx`

-   **Purpose**: This component is the heart of the auditory learning experience for document reading. Its sole job is to render a document's text content in a way that supports synchronized audio highlighting.
-   **Functionality**:
    -   **Input**: It takes an array of `wordTimepoints` (words and their start times in the audio) and the `activeTimepoint` (the currently spoken word) from the `useTTSPlayer` hook.
    -   **Rendering**: It maps over the timepoints and renders each word as a separate `<span>`. It applies a highlight style to the span that corresponds to the `activeTimepoint`.
    -   **Interactivity**: Each word `<span>` has an `onClick` handler that calls the `seekAndPlay` function from the `useTTSPlayer` hook, allowing the user to click on any word to start playback from that exact spot.
    -   **Paragraphs**: It correctly groups words into paragraphs by looking for special `PARAGRAPH_BREAK` markers in the timepoints array, ensuring the visual structure matches the auditory pauses.

---

## 3.4 Deprecated Components

The following components were identified in `dev/DeprecationShowcase.tsx` as candidates for removal. They are no longer imported or used by any active pages and have been superseded by more modern or integrated solutions.

-   **`AudioReview.tsx` (DEPRECATED)**
    -   **Purpose**: A modal component designed to let users review, play back, and edit the transcript of an audio recording before sending it. It has been functionally integrated into the state machine of `MicrophoneButton.tsx` and is no longer used as a standalone component.

-   **`SpeakableText.tsx` (DEPRECATED)**
    -   **Purpose**: An early version of a component designed to make text speakable on hover. It has been largely superseded by the more advanced `SpeakableDocumentContent` for document text and by direct `onMouseEnter` handlers on UI elements for interface narration.

---

# 4. Frontend Hooks (`src/hooks/`)

This section analyzes the custom React hooks that encapsulate complex, reusable, stateful logic.

---

## 4.1 `useAudioRecorder.ts`

-   **Purpose**: This hook provides a complete, self-contained system for recording audio from the user's microphone.
-   **Key Logic**:
    -   It wraps the browser's `MediaRecorder` API.
    -   It handles the process of requesting microphone permissions from the user.
    -   When recording, it collects audio data into chunks.
    -   Upon stopping, it compiles these chunks into a single `Blob` (in `audio/webm` format) and creates a local `URL` for playback.
-   **State Management**: Manages the `isRecording` boolean state and any `error` messages that occur during the process.
-   **Returned Functions & Values**:
    -   `startRecording()`: Initiates the recording process.
    -   `stopRecording()`: Stops the recording and returns a `Promise` that resolves with the final audio `Blob`.
    -   `clearAudio()`: Discards the current recording and resets the state.
    -   `audioBlob`: The final recorded audio data.
    -   `audioUrl`: A local URL for the `audioBlob` that can be used for playback.
-   **Usage**: It is the foundational hook used by the `MicrophoneButton.tsx` component to power all audio input.

---

## 4.2 `useChatTTSPlayer.ts`

-   **Purpose**: This hook is designed specifically to play back **pre-synthesized** Text-to-Speech (TTS) audio that is provided to it, typically for agent messages in the chat interface.
-   **Key Logic**:
    -   It accepts a Base64-encoded audio string and an array of `timepoints`.
    -   It decodes the Base64 string into an audio `Blob` and creates a local `URL` for playback.
    -   During playback, it uses the `ontimeupdate` event of the `<audio>` element to continuously check the current playback time against the `timepoints` array.
-   **State Management**: Manages a `status` state machine (`idle`, `loading`, `playing`, `paused`) and tracks the `activeTimepoint` (the word currently being spoken).
-   **Returned Functions & Values**:
    -   `playAudio(audioContent, timepoints)`: Starts or pauses playback of the provided audio.
    -   `stopAudio()`: Stops playback and resets the state.
    -   `seekAndPlay(timeInSeconds)`: Jumps to a specific time in the audio, enabling click-to-play functionality on words.
    -   `status`: The current playback status.
    -   `activeTimepoint`: The timepoint object for the currently highlighted word.
-   **Usage**: Used within `GeminiChatInterface.tsx` to handle the playback of agent messages that come from the backend with audio already generated.

---

## 4.3 `useOnDemandTTSPlayer.ts`

-   **Purpose**: This hook provides TTS functionality for text that does **not** have pre-generated audio. It synthesizes speech on-the-fly.
-   **Key Logic**:
    -   Unlike `useChatTTSPlayer`, its `playText(text)` function first makes an API call to `apiService.synthesizeText`.
    -   This API call sends the text to the backend, which returns the synthesized audio and timepoints.
    -   Once the data is received, its logic becomes very similar to `useChatTTSPlayer`: it decodes the audio, plays it, and manages highlighting based on the received timepoints.
-   **State Management**: Manages the same `status` state machine and `activeTimepoint` as the other TTS hooks. It also stores the `wordTimepoints` it receives from the API.
-   **Returned Functions & Values**: Similar to `useChatTTSPlayer`, but with a `playText(text)` function instead of `playAudio`.
-   **Usage**: Used within `GeminiChatInterface.tsx` to provide TTS for user messages, which are not pre-synthesized.

---

## 4.4 `useTTSPlayer.ts`

-   **Purpose**: This is the most robust and feature-rich TTS hook, designed for the main document reading experience in `DocumentView.tsx`. It intelligently decides whether to use pre-generated audio or fall back to on-demand synthesis.
-   **Key Logic**:
    -   **Asset Fetching**: When `playAudio` is called, it first checks if a `documentId` is available. If so, it calls `apiService.getTtsAssets(documentId)` to try and get signed URLs for pre-generated audio and timepoint files from GCS.
    -   **Fallback Mechanism**: If fetching the pre-generated assets fails (e.g., they don't exist or there's a network error), it seamlessly falls back to the on-demand synthesis logic, calling `apiService.synthesizeText` with the `fullText` of the document.
    -   **Playback**: Once it has the audio and timepoints (from either source), its playback and highlighting logic is identical to the other TTS hooks.
-   **State Management**: Manages the same `status` and `activeTimepoint` states.
-   **Returned Functions & Values**: Exposes the same interface (`playAudio`, `stopAudio`, `seekAndPlay`, etc.) to the component, abstracting away the complexity of whether the audio was pre-generated or synthesized on-demand.
-   **Usage**: This is the core engine behind the "Read Aloud" feature in `DocumentView.tsx`, providing a resilient and efficient auditory reading experience.

---

# 5. Frontend Services (`src/services/`)

This section analyzes the service layer that encapsulates all communication with the backend API.

---

## 5.1 `api.ts`

### **Purpose**

`api.ts` is the central hub for all frontend-to-backend communication. It uses the `axios` library to create a pre-configured API client and exports an `apiService` object that contains a collection of methods, each corresponding to a specific backend endpoint. This centralizes API logic and makes it easy to manage authentication, base URLs, and error handling.

### **Key Features**

-   **Axios Instance**: It creates a single `axios` instance with the `baseURL` configured from the `VITE_BACKEND_API_URL` environment variable, defaulting to `http://localhost:8000`.
-   **Authentication Interceptor**: It uses an `axios` request interceptor to automatically attach the user's Firebase JWT (JSON Web Token) to the `Authorization` header of every outgoing request. This is a critical feature that ensures all communication with the protected backend endpoints is authenticated without requiring each component to handle token logic manually.

### **Exported Methods (`apiService`)**

-   **`chat(payload)`**: The primary method for conversational interactions.
    -   **Endpoint**: `POST /api/v2/agent/chat`
    -   **Payload**: `{ query: string; documentId?: string; threadId?: string }`
    -   **Purpose**: Sends a user's text query to the backend's supervisor agent and returns the agent's response, which could be a simple answer or a new quiz question.

-   **`uploadAudioMessage(formData, options)`**: Handles sending audio input.
    -   **Endpoint**: `POST /api/v2/agent/chat`
    -   **Payload**: A `FormData` object containing the audio file and optional `document_id` and `thread_id`.
    -   **Purpose**: Sends user-recorded audio to the backend. It can operate in two modes specified by the `sttProcessingMode` option:
        -   `'review'`: The backend transcribes the audio and returns the text immediately without agent processing.
        -   `'direct_send'`: The backend transcribes the audio and immediately processes the text with the supervisor agent.

-   **`synthesizeText(text)`**: Used for on-demand Text-to-Speech.
    -   **Endpoint**: `POST /api/tts/synthesize`
    -   **Payload**: `{ text: string }`
    -   **Purpose**: Sends a piece of text to be synthesized into speech by the backend, returning the audio content and timepoints.

-   **`getTtsAssets(documentId)`**: Fetches pre-generated TTS audio.
    -   **Endpoint**: `GET /api/documents/<documentId>/tts-assets`
    -   **Purpose**: Retrieves secure, temporary URLs for the pre-generated TTS audio and timepoint files associated with a document, which are stored in GCS.

-   **Document Methods**:
    -   `listDocuments()`: `GET /api/documents` - Fetches all documents for the user.
    -   `getDocument(documentId)`: `GET /api/documents/<documentId>` - Fetches details for a single document.
    -   `uploadDocument(file, metadata)`: `POST /api/documents` - A general-purpose upload function (Note: The more specialized flow in `document_routes.py`'s `/upload` endpoint is what's primarily used).
    -   `deleteDocument(documentId)`: `DELETE /api/documents/<documentId>` - Deletes a document.

-   **User & Quiz Methods**:
    -   `getUserProfile()`: `GET /api/users/profile` - Fetches the current user's profile.
    -   `updateUserProfile(updates)`: `PATCH /api/users/profile` - Updates the user's profile (e.g., accessibility preferences).
    -   `cancelQuiz(threadId)`: `POST /api/v2/agent/chat` - Sends a `/cancel_quiz` command to the backend to end an active quiz session.
