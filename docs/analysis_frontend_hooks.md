# Frontend Hooks Analysis

## Overview
The frontend custom hooks encapsulate complex state management and business logic, providing reusable and testable functionality across components. These hooks handle audio recording, speech-to-text, text-to-speech, and the complete answer formulation workflow.

## Custom Hooks

### 1. useAnswerFormulation.ts

**Purpose**: Comprehensive state management hook for the Answer Formulation feature, orchestrating dictation, AI refinement, editing, and user preferences.

**Key Functions/Components**:

#### State Management
- **Workflow Status**: Manages complete workflow states (idle, recording, refining, refined, editing, finalized)
- **Content State**: Handles question, transcript, and refined answer state
- **Session Management**: Tracks session ID, fidelity score, and iteration count
- **Error Handling**: Centralized error state and management

#### Auto-Pause Features
- **Settings Persistence**: Integrates with user preferences for auto-pause configuration
- **Countdown Management**: Handles pause detection and countdown timers
- **User Control**: Provides functions to enable/disable and configure auto-pause
- **Preference Sync**: Synchronizes settings with backend user preferences

#### API Integration
- **Refinement Service**: Calls backend API for transcript refinement
- **Edit Service**: Handles voice-based editing through backend API
- **Session Management**: Creates and manages formulation sessions
- **Error Recovery**: Handles API failures with user-friendly messages

#### STT Integration
- **Real-time Dictation**: Integrates with useRealtimeStt for voice input
- **Transcript Sync**: Synchronizes STT transcript with local state
- **Recording Control**: Provides start/stop dictation functionality
- **State Coordination**: Manages state transitions between dictation and refinement

**Inputs**: 
- User preferences from Auth context
- STT functionality from useRealtimeStt
- API service for backend communication

**Outputs/Side Effects**:
- Complete workflow state management
- Auto-pause functionality with preference persistence
- API calls for refinement and editing
- User preference updates

**Dependencies**: 
- useRealtimeStt hook for dictation
- Auth context for user preferences
- API service for backend communication
- React hooks for state management

---

### 2. useAudioRecorder.ts

**Purpose**: Low-level audio recording hook providing microphone access, recording control, and audio blob generation with proper cleanup and error handling.

**Key Functions/Components**:

#### Recording Management
- **Microphone Access**: Requests and manages microphone permissions
- **MediaRecorder API**: Uses browser MediaRecorder for audio capture
- **Audio Configuration**: Optimized settings for speech recognition (16kHz, Opus)
- **State Tracking**: Tracks recording state, errors, and audio data

#### Audio Processing
- **Chunk Collection**: Collects audio chunks during recording
- **Blob Generation**: Creates final audio blob from collected chunks
- **URL Creation**: Generates object URLs for audio playback
- **Format Support**: Handles WebM/Opus format for optimal quality

#### Resource Management
- **Stream Cleanup**: Properly stops media tracks on unmount
- **Memory Management**: Revokes object URLs to prevent memory leaks
- **Error Handling**: Comprehensive error handling for permission issues
- **Cleanup Effects**: Automatic cleanup on component unmount

#### Advanced Features
- **On-Chunk Callback**: Supports real-time chunk processing
- **High-Quality Settings**: Echo cancellation and noise suppression
- **Flexible Configuration**: Configurable bitrate and sample rate
- **State Synchronization**: Proper state management across async operations

**Inputs**:
- Microphone permissions and configuration
- Optional chunk processing callbacks
- Recording control triggers

**Outputs/Side Effects**:
- Audio blob generation
- Recording state management
- Microphone stream management
- Error state and cleanup

**Dependencies**: 
- Browser MediaRecorder API
- MediaDevices getUserMedia
- React refs and effects
- URL and Blob APIs

---

### 3. useRealtimeStt.ts

**Purpose**: Real-time speech-to-text hook combining audio recording with WebSocket communication for live transcription with interim and final results.

**Key Functions/Components**:

#### WebSocket Communication
- **Connection Management**: Establishes WebSocket connection to STT service
- **Protocol Handling**: Supports both WS and WSS protocols based on backend URL
- **Message Processing**: Parses and handles STT response messages
- **Error Recovery**: Handles connection errors and automatic reconnection

#### Transcription Management
- **Real-time Updates**: Provides both interim and final transcript updates
- **State Tracking**: Manages dictation status (idle, connecting, dictating, review)
- **Transcript Building**: Accumulates final results while showing interim text
- **Error Handling**: Comprehensive error handling for network and permission issues

#### Recording Integration
- **Audio Streaming**: Streams audio chunks to WebSocket in real-time
- **Recording Control**: Coordinates recording with WebSocket connection
- **Chunk Processing**: Handles audio chunk generation and transmission
- **Sync Management**: Synchronizes recording state with transcription state

#### User Control
- **Start/Stop Control**: Provides functions to start and stop dictation
- **Manual Control**: Supports manual stopping and re-recording
- **Transcript Editing**: Allows manual transcript updates
- **Status Feedback**: Clear status indicators for user feedback

**Inputs**:
- Backend WebSocket URL configuration
- Audio recording functionality
- User control triggers

**Outputs/Side Effects**:
- Real-time transcription results
- WebSocket connection management
- Audio streaming to backend
- Status and error state management

**Dependencies**: 
- useAudioRecorder hook for audio capture
- WebSocket API for real-time communication
- React hooks for state management
- Backend STT service integration

---

### 4. useOnDemandTTSPlayer.ts

**Purpose**: On-demand text-to-speech player that synthesizes speech from text and provides synchronized word highlighting with timepoint tracking.

**Key Functions/Components**:

#### TTS Synthesis
- **API Integration**: Calls backend TTS service for speech synthesis
- **Audio Generation**: Creates audio blobs from base64 encoded content
- **Timepoint Processing**: Handles word-level timing data for synchronization
- **Error Handling**: Comprehensive error handling for synthesis failures

#### Playback Management
- **Audio Control**: Play, pause, and stop functionality
- **Status Tracking**: Manages player status (idle, loading, playing, paused)
- **Time Synchronization**: Tracks current playback position with timepoints
- **Seek Support**: Supports seeking to specific time positions

#### Word Highlighting
- **Active Word Tracking**: Identifies and highlights currently spoken word
- **Timepoint Matching**: Matches audio time to word timepoints
- **Visual Feedback**: Provides active timepoint for UI highlighting
- **Smooth Transitions**: Ensures smooth highlighting transitions

#### Resource Management
- **Audio Cleanup**: Proper cleanup of audio URLs and resources
- **Memory Management**: Prevents memory leaks with proper cleanup
- **State Reset**: Comprehensive state reset on stop/error
- **Error Recovery**: Graceful handling of playback errors

**Inputs**:
- Text content for synthesis
- TTS API service integration
- Playback control triggers

**Outputs/Side Effects**:
- Synthesized audio playback
- Word-level highlighting data
- Player status and error state
- Resource cleanup and management

**Dependencies**: 
- API service for TTS synthesis
- HTML5 Audio API
- React hooks and refs
- Base64 decoding and Blob APIs

---

### 5. useChatTTSPlayer.ts

**Purpose**: Specialized TTS player for chat interface that handles pre-generated audio content with word-level synchronization for message playback.

**Key Functions/Components**:

#### Audio Playback
- **Pre-generated Content**: Handles audio content generated by backend chat service
- **Base64 Processing**: Decodes base64 audio content for playback
- **Timepoint Integration**: Uses timepoints from chat API for synchronization
- **Status Management**: Tracks player status and provides feedback

#### Chat Integration
- **Message Context**: Designed specifically for chat message audio
- **Synchronized Playback**: Coordinates with chat interface state
- **Error Handling**: Handles chat-specific audio playback errors
- **Resource Management**: Proper cleanup for chat audio resources

#### Word Synchronization
- **Active Word Tracking**: Tracks currently spoken word in chat messages
- **Timepoint Processing**: Processes chat-specific timepoint data
- **Highlighting Support**: Provides data for word highlighting in chat
- **Smooth Updates**: Ensures smooth word highlighting transitions

#### Player Controls
- **Play/Pause Toggle**: Simple play/pause functionality
- **Stop Function**: Complete stop with resource cleanup
- **State Management**: Proper state tracking across operations
- **Error Recovery**: Graceful error handling and recovery

**Inputs**:
- Audio content from chat API
- Timepoints from chat service
- Playback control triggers

**Outputs/Side Effects**:
- Chat message audio playback
- Word-level synchronization data
- Player status and error state
- Resource cleanup and management

**Dependencies**: 
- HTML5 Audio API
- React hooks and refs
- Base64 decoding utilities
- Chat interface integration

---

### 6. useTTSPlayer.ts

**Purpose**: Advanced TTS player with dual-mode operation supporting both pre-generated document audio and on-demand synthesis with intelligent fallback.

**Key Functions/Components**:

#### Dual-Mode Operation
- **Pre-generated Priority**: Attempts to use pre-generated audio for documents
- **On-Demand Fallback**: Falls back to on-demand synthesis when pre-generated unavailable
- **Intelligent Switching**: Automatically chooses best audio source
- **URL Management**: Handles both signed URLs and on-demand synthesis

#### Asset Management
- **Document Assets**: Fetches pre-generated audio and timepoints from storage
- **Signed URLs**: Uses secure signed URLs for asset access
- **Fallback Logic**: Graceful fallback when assets are unavailable
- **Caching Support**: Supports audio asset caching strategies

#### Playback Features
- **Full Control**: Complete play, pause, stop, and seek functionality
- **Timepoint Synchronization**: Word-level highlighting with timepoints
- **Status Management**: Comprehensive status tracking and feedback
- **Error Handling**: Robust error handling for both modes

#### Resource Optimization
- **Lazy Loading**: Loads audio assets only when needed
- **Memory Management**: Proper cleanup of audio resources
- **Network Optimization**: Minimizes network requests through intelligent caching
- **Performance**: Optimized for smooth playback experience

**Inputs**:
- Document ID for pre-generated assets
- Full text for on-demand synthesis
- Playback control triggers

**Outputs/Side Effects**:
- Audio playback from optimal source
- Word-level synchronization
- Player status and error state
- Resource management and cleanup

**Dependencies**: 
- API service for both asset fetching and synthesis
- HTML5 Audio API
- React hooks and refs
- Signed URL handling

---

## Hook Architecture Patterns

### Design Principles
- **Single Responsibility**: Each hook handles one specific domain of functionality
- **Composition**: Hooks are designed to be composable and work together
- **State Encapsulation**: Complex state management is encapsulated within hooks
- **Testability**: Hooks are designed to be easily testable in isolation

### State Management
- **Local State**: Component-level state managed within hooks
- **Side Effects**: Proper handling of async operations and side effects
- **Cleanup**: Comprehensive cleanup and resource management
- **Error Boundaries**: Graceful error handling and recovery

### Integration Patterns
- **API Integration**: Consistent patterns for backend API communication
- **Context Integration**: Smart use of React contexts for shared state
- **Event Handling**: Proper event handling and propagation
- **Resource Management**: Consistent patterns for resource cleanup

### Performance Optimization
- **Memoization**: Efficient use of useCallback and useMemo
- **Lazy Loading**: On-demand resource loading and initialization
- **Cleanup**: Proper cleanup to prevent memory leaks
- **State Optimization**: Efficient state updates and re-renders

This hook architecture provides a robust, maintainable, and performant foundation for the LexiAid application's complex audio and AI interactions, with proper separation of concerns and comprehensive error handling throughout.
