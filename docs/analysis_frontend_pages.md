# Frontend Pages Analysis

## Overview
The frontend pages provide the user interface components for the LexiAid application, with each page serving specific functional purposes while maintaining consistent accessibility features, responsive design, and integration with the application's context system.

## Page Components

### 1. LandingPage.tsx

**Purpose**: Public landing page that introduces the LexiAid platform, showcases key features, and provides navigation to authentication routes.

**Key Functions/Components**:

#### Accessibility Features
- **High Contrast Mode**: Toggle for visual accessibility with proper ARIA attributes
- **UI TTS Support**: Text-to-speech for interface elements on hover
- **Keyboard Navigation**: Skip links and focus management
- **Responsive Design**: Mobile-first layout with Tailwind CSS

#### Content Sections
- **Navigation Bar**: Brand logo, accessibility toggles, and sign-in link
- **Hero Section**: Main value proposition with call-to-action buttons
- **Features Section**: Highlighted capabilities with icons and descriptions
- **Benefits Section**: Advantages for students with dyslexia
- **Call-to-Action**: Multiple entry points to user registration

#### Interactive Elements
- **SpeakableText Component**: Precise TTS targeting for specific text elements
- **Hover Handlers**: Contextual audio descriptions for UI elements
- **Theme Toggling**: Real-time high contrast mode switching

**Inputs**: 
- User accessibility preferences from context
- Mouse hover events for TTS triggering
- Click events for navigation and settings

**Outputs/Side Effects**:
- Navigation to authentication routes
- Accessibility preference updates
- Audio playback for interface elements
- Visual theme changes

**Dependencies**: 
- React Router for navigation
- Accessibility Context for preferences
- SpeakableText component for TTS
- Lucide React icons

---

### 2. Dashboard.tsx

**Purpose**: Main user dashboard providing overview of recent activity, quick access to features, and personalized progress tracking.

**Key Functions/Components**:

#### Data Management
- **Recent Documents**: Fetches and displays user's latest document uploads
- **Progress Tracking**: Shows learning statistics and study streaks
- **User Profile**: Displays user information and preferences
- **Quick Actions**: Navigation shortcuts to main features

#### API Integration
- **Backend Communication**: Fetches documents via authenticated API calls
- **Token Management**: Uses Firebase ID tokens for secure requests
- **Error Handling**: Graceful handling of API failures and loading states

#### Accessibility Features
- **TTS Support**: Audio descriptions for dashboard elements
- **High Contrast**: Theme-aware component styling
- **Keyboard Navigation**: Proper focus management and shortcuts

**Inputs**:
- User authentication state
- Backend API responses
- User interaction events

**Outputs/Side Effects**:
- Document listing and navigation
- Progress visualization
- Feature access routing
- Audio feedback for interactions

**Dependencies**: 
- Auth Context for user state
- Accessibility Context for preferences
- Axios for API communication
- React Router for navigation

---

### 3. ChatPage.tsx

**Purpose**: Interactive chat interface for document-based Q&A and quiz functionality with real-time AI assistance.

**Key Functions/Components**:

#### Chat Management
- **Message State**: Maintains conversation history with metadata
- **Thread Management**: Handles conversation persistence via thread IDs
- **Document Context**: Links conversations to specific documents
- **Quiz Integration**: Supports quiz mode within chat interface

#### API Communication
- **Chat Service**: Sends queries to backend supervisor graph
- **Audio Support**: Handles TTS audio content and timepoints
- **Error Handling**: Manages API failures and retry logic
- **Loading States**: Visual feedback during processing

#### User Interface
- **Message Display**: Renders user and AI messages with proper styling
- **Input Handling**: Text input with accessibility features
- **Navigation**: Back navigation and document switching
- **Quiz Controls**: Start/stop quiz functionality

**Inputs**:
- User messages and queries
- Document context from URL parameters
- Thread IDs for conversation persistence

**Outputs/Side Effects**:
- AI responses with audio content
- Updated conversation history
- Quiz state management
- Navigation to related features

**Dependencies**: 
- GeminiChatInterface component
- API service for backend communication
- React Router for navigation
- Toast notifications for user feedback

---

### 4. DocumentUpload.tsx

**Purpose**: Document management interface for uploading files with validation, progress tracking, and processing status updates.

**Key Functions/Components**:

#### File Handling
- **Drag & Drop**: Interactive file upload with visual feedback
- **File Validation**: Type and size checking with user-friendly errors
- **Preview Generation**: Image previews for visual file types
- **Progress Tracking**: Real-time upload progress indication

#### Upload Process
- **Backend Integration**: Secure file upload to backend API
- **Authentication**: Token-based upload authorization
- **Error Handling**: Comprehensive error reporting and recovery
- **Success Feedback**: Confirmation and navigation options

#### Accessibility Features
- **TTS Support**: Audio descriptions for upload steps
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Visual Feedback**: Clear status indicators and progress bars

**Inputs**:
- File selections via drag-and-drop or file input
- User authentication tokens
- Document metadata and naming

**Outputs/Side Effects**:
- File uploads to backend storage
- Processing status updates
- Navigation to document viewing
- User feedback and error reporting

**Dependencies**: 
- Auth Context for authentication
- Accessibility Context for preferences
- Axios for file upload API calls
- React Router for navigation

---

### 5. AnswerFormulationPage.tsx

**Purpose**: Comprehensive answer formulation workflow orchestrating dictation, refinement, editing, and finalization of student responses.

**Key Functions/Components**:

#### Workflow Management
- **State Orchestration**: Manages complete formulation process via custom hook
- **Component Coordination**: Organizes sub-components for different workflow stages
- **Progress Tracking**: Monitors session progress and user preferences
- **Error Recovery**: Handles failures and provides retry options

#### User Experience
- **Onboarding**: Guided introduction for new users
- **Settings Management**: Auto-pause and preference configuration
- **Progressive Enhancement**: Suggests features based on usage patterns
- **Session Management**: Tracks completed sessions and user improvement

#### Accessibility Integration
- **TTS Support**: Full audio feedback throughout workflow
- **Keyboard Navigation**: Complete keyboard accessibility
- **Visual Accessibility**: High contrast and dyslexia-friendly fonts
- **Cognitive Support**: Clear step-by-step guidance

**Inputs**:
- User questions and prompts
- Voice recordings and transcripts
- Edit commands and refinements
- User preferences and settings

**Outputs/Side Effects**:
- Refined answer generation
- Edit history and tracking
- User preference updates
- Session completion metrics

**Dependencies**: 
- useAnswerFormulation custom hook
- Multiple answer formulation sub-components
- Auth Context for user preferences
- Accessibility Context for support features

---

### 6. Authentication Pages (SignIn.tsx, SignUp.tsx)

**Purpose**: User authentication interfaces providing secure access to the application with comprehensive accessibility support.

**Key Functions/Components**:

#### Authentication Features
- **Email/Password Login**: Traditional authentication method
- **Google Sign-In**: OAuth integration for quick access
- **Form Validation**: Client-side validation with user feedback
- **Error Handling**: Clear error messages and recovery guidance

#### Accessibility Support
- **TTS Integration**: Audio descriptions for form fields and errors
- **Keyboard Navigation**: Complete form accessibility
- **Screen Reader Support**: Proper labeling and announcements
- **Visual Accessibility**: High contrast and clear typography

#### User Experience
- **Loading States**: Visual feedback during authentication
- **Success Handling**: Smooth transitions after successful login
- **Navigation Links**: Easy access between sign-in and sign-up
- **Responsive Design**: Mobile-friendly form layouts

**Inputs**:
- User credentials (email, password, display name)
- Authentication provider selection
- Form submission events

**Outputs/Side Effects**:
- User authentication state changes
- Navigation to dashboard
- Error message display
- Session token generation

**Dependencies**: 
- Auth Context for authentication functions
- Accessibility Context for TTS support
- React Router for navigation
- Firebase Authentication SDK

---

### 7. Settings.tsx

**Purpose**: Comprehensive settings interface for managing accessibility preferences, TTS options, and visual customization.

**Key Functions/Components**:

#### Accessibility Settings
- **TTS Controls**: Enable/disable UI and cloud TTS with delay options
- **Visual Preferences**: High contrast mode, font sizes, and spacing
- **Audio Configuration**: TTS delay timing and voice settings
- **Cognitive Support**: Reading assistance and display options

#### User Interface
- **Toggle Controls**: Interactive switches for preferences
- **Option Groups**: Radio buttons for mutually exclusive settings
- **Real-time Updates**: Immediate application of setting changes
- **Visual Feedback**: Clear indication of active settings

#### Integration Features
- **Context Updates**: Synchronizes with accessibility context
- **Persistence**: Saves preferences to user profile
- **TTS Preview**: Test settings with immediate audio feedback
- **Keyboard Navigation**: Full accessibility for all controls

**Inputs**:
- User preference selections
- Toggle and radio button interactions
- Settings confirmation actions

**Outputs/Side Effects**:
- Accessibility context updates
- User profile preference storage
- Real-time UI theme changes
- Audio feedback for settings

**Dependencies**: 
- Accessibility Context for state management
- React Router for navigation
- Lucide React icons for controls
- Custom TTS delay types

---

## Page Architecture Patterns

### Component Organization
- **Single Responsibility**: Each page handles one major functional area
- **Context Integration**: All pages use appropriate contexts for state
- **Accessibility First**: Built-in support for screen readers and TTS
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### State Management
- **Context-Based**: Global state through React contexts
- **Local State**: Component-specific state with React hooks
- **API Integration**: Backend communication through services
- **Error Boundaries**: Graceful error handling and recovery

### Accessibility Implementation
- **WCAG Compliance**: Follows accessibility guidelines throughout
- **TTS Integration**: Comprehensive audio support for all interfaces
- **Keyboard Navigation**: Full keyboard accessibility
- **Visual Accessibility**: High contrast and dyslexia support

### User Experience
- **Progressive Enhancement**: Features reveal based on user proficiency
- **Onboarding**: Guided introductions for complex features
- **Feedback Systems**: Clear success and error states
- **Performance**: Optimized loading and interaction patterns

This page architecture provides a comprehensive, accessible, and maintainable foundation for the LexiAid application, with special attention to the needs of students with learning disabilities through thoughtful design and extensive accessibility features.
