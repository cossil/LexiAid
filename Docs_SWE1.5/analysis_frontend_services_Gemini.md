# Frontend Services Analysis

## Overview
The frontend services provide a centralized API communication layer that handles all backend interactions, authentication, data transformation, and error handling. The service layer abstracts away the complexity of HTTP requests and provides a clean, type-safe interface for the rest of the application.

## Service Components

### 1. api.ts

**Purpose**: Comprehensive API service providing centralized communication with the LexiAid backend, including authentication, document management, chat functionality, and specialized features like answer formulation.

**Key Functions/Components**:

#### Core Infrastructure
- **Axios Instance**: Configured HTTP client with base URL and default headers
- **Authentication Interceptor**: Automatic token injection for all API requests
- **Error Handling**: Centralized error handling and response transformation
- **Type Safety**: Full TypeScript interfaces for all API requests and responses

#### Authentication & Token Management
- **Token Injection**: Automatic Bearer token attachment to all requests
- **Token Refresh**: ID token generation and refresh functionality
- **Error Recovery**: Graceful handling of token failures and authentication errors
- **User Context**: Integration with Firebase Authentication for user management

#### Chat & AI Services
- **Chat API**: Core chat functionality with document context and thread management
- **Audio Upload**: Support for both review and direct send audio processing modes
- **Quiz Management**: Quiz session creation, continuation, and cancellation
- **Response Mapping**: Intelligent mapping between backend and frontend response formats

#### Document Management
- **Document CRUD**: Complete create, read, update, delete operations for documents
- **File Upload**: Multipart form data upload with metadata support
- **Content Retrieval**: Document content fetching with include options
- **Asset Management**: TTS asset retrieval with signed URLs

#### Text-to-Speech Services
- **On-Demand Synthesis**: Real-time text-to-speech conversion with timepoints
- **Asset Retrieval**: Pre-generated TTS asset access with URL generation
- **Audio Processing**: Base64 audio content handling and management
- **Timepoint Support**: Word-level timing data for synchronized highlighting

#### Answer Formulation API
- **Transcript Refinement**: AI-powered refinement of spoken transcripts
- **Edit Commands**: Voice-based editing with session management
- **Session Tracking**: Complete session lifecycle management
- **Fidelity Scoring**: Quality assessment and iteration tracking

#### User Profile Services
- **Profile Management**: User profile retrieval and updates
- **Preference Sync**: User preference synchronization with backend
- **Metadata Handling**: Flexible metadata storage and retrieval
- **Account Management**: Complete user account operations

**API Methods**:

##### Authentication Methods
- **getAuthToken()**: Retrieves current user's Firebase ID token
- **Token Injection**: Automatic interceptor-based token attachment

##### Chat & Communication
- **chat(payload)**: Sends chat queries with document and thread context
- **uploadAudioMessage(formData, options)**: Handles audio uploads with processing modes
- **cancelQuiz(threadId)**: Cancels active quiz sessions

##### Document Operations
- **getDocument(documentId)**: Retrieves document details with content
- **listDocuments()**: Fetches user's document collection
- **uploadDocument(file, metadata)**: Uploads files with metadata
- **deleteDocument(documentId)**: Removes documents from storage

##### TTS Services
- **synthesizeText(text)**: Converts text to speech with timepoints
- **getTtsAssets(documentId)**: Retrieves pre-generated TTS assets

##### Answer Formulation
- **refineAnswer(request)**: Refines transcripts into written answers
- **editAnswer(request)**: Applies voice-based edit commands

##### User Management
- **getUserProfile()**: Retrieves user profile and preferences
- **updateUserProfile(updates)**: Updates user profile information

**Inputs**:
- Authentication tokens from Firebase
- User data and preferences
- Document files and metadata
- Audio recordings and text content

**Outputs/Side Effects**:
- HTTP requests to backend APIs
- Transformed response data
- Error handling and user feedback
- Token refresh and authentication state updates

**Dependencies**: 
- Axios for HTTP client functionality
- Firebase Authentication for token management
- TypeScript interfaces for type safety
- Environment configuration for API URLs

---

## Service Architecture Patterns

### Design Principles
- **Centralized Communication**: Single point of contact for all backend interactions
- **Abstraction Layer**: Hides HTTP complexity from application components
- **Type Safety**: Comprehensive TypeScript interfaces for all operations
- **Error Handling**: Consistent error handling and user feedback

### Authentication Strategy
- **Automatic Token Injection**: Interceptor-based token management
- **Token Refresh**: Seamless token refresh for long-running sessions
- **Error Recovery**: Graceful handling of authentication failures
- **User Context**: Integration with Firebase Authentication system

### Data Transformation
- **Response Mapping**: Intelligent mapping between backend and frontend formats
- **Type Coercion**: Proper type conversion and validation
- **Normalization**: Consistent data structure across the application
- **Legacy Support**: Backward compatibility with API changes

### Error Handling
- **Centralized Error Management**: Consistent error handling across all methods
- **User-Friendly Messages**: Transformed technical errors into user feedback
- **Logging Integration**: Comprehensive error logging for debugging
- **Graceful Degradation**: Fallback behavior for service failures

### Performance Optimization
- **Request Interception**: Efficient token management and request modification
- **Response Caching**: Potential for response caching strategies
- **Connection Reuse**: Axios instance reuse for connection pooling
- **Lazy Loading**: On-demand service initialization

### Integration Patterns
- **Context Integration**: Seamless integration with React contexts
- **Hook Compatibility**: Designed to work with custom hooks
- **Component Abstraction**: Clean separation from UI components
- **Service Composition**: Composable service methods for complex operations

This service architecture provides a robust, maintainable, and scalable foundation for frontend-backend communication, with proper separation of concerns, comprehensive error handling, and type safety throughout the application. The centralized API service ensures consistent behavior and simplifies maintenance while providing the flexibility needed for complex features like chat, document management, and answer formulation.
