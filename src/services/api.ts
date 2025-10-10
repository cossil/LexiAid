import axios from 'axios';
import { auth } from '../firebase/config'; // Import auth directly

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser; // Get currentUser from the auth instance
  
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(); // Optionally force refresh: await currentUser.getIdToken(true);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting ID token in API interceptor:", error);
      // Potentially handle token refresh errors or cases where token is unavailable
    }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// API methods
// Helper function to get the current user's ID token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const apiService = {
  // Get the current user's authentication token
  async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },
  // Upload an audio message to the server
  async uploadAudioMessage(
    formData: FormData,
    options: { sttProcessingMode?: 'review' | 'direct_send' } = {}
  ): Promise<{
    response?: string;
    thread_id?: string;
    quiz_active?: boolean;
    error?: string;
    transcript?: string; // For review mode
    processing_mode?: string; // Indicates the mode used
    text?: string; // Response text
  }> {
    try {
      // Add processing mode to form data if provided
      if (options.sttProcessingMode) {
        formData.append('stt_processing_mode', options.sttProcessingMode);
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000'}/api/v2/agent/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process audio message');
      }

      const responseData = await response.json();
      
      // For review mode, include the transcript in the response
      if (options.sttProcessingMode === 'review') {
        return {
          ...responseData,
          transcript: responseData.transcript || responseData.text,
          processing_mode: 'review',
        };
      }
      
      return responseData;
    } catch (error) {
      console.error('Error uploading audio message:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to upload audio message'
      };
    }
  },

  // Chat with AI Tutor
  async chat(payload: { query: string; documentId?: string; threadId?: string }): Promise<{
    agent_response?: string;
    thread_id?: string;
    audio_content_base64?: string | null;
    timepoints?: { mark_name: string; time_seconds: number }[] | null;
    is_quiz?: boolean;
    quiz_completed?: boolean;
    quiz_cancelled?: boolean;
    conversation_history?: any[];
    document_id?: string;
    processing_mode?: string;
    error_detail?: string;
  }> {
    const response = await api.post('/api/v2/agent/chat', {
      query: payload.query,
      documentId: payload.documentId,
      thread_id: payload.threadId,
    });
    
    // Map the backend response to the expected frontend format
    // The backend returns a comprehensive object. We'll pass it through.
    // The key is to map backend fields to frontend fields if they differ.
    return {
      agent_response: response.data.final_agent_response || response.data.response, // Fallback to 'response'
      thread_id: response.data.active_quiz_thread_id || response.data.thread_id, // Prioritize quiz thread id
      audio_content_base64: response.data.audio_content_base64,
      timepoints: response.data.timepoints,
      is_quiz: response.data.quiz_active || false, // Backend sends 'quiz_active'
      quiz_completed: response.data.quiz_complete || false, // Backend sends 'quiz_complete'
      quiz_cancelled: response.data.quiz_cancelled || false,
      conversation_history: response.data.conversation_history,
      document_id: response.data.document_id,
      error_detail: response.data.error_detail,
      // Ensure all fields from the Promise return type are covered
      processing_mode: response.data.processing_mode,
    };
  },

  async synthesizeText(text: string): Promise<{
    audioContent: string;
    timepoints: any[];
  }> {
    try {
      const response = await api.post('/api/tts/synthesize', { text });
      // The backend returns 'audio_content', let's map it to camelCase for frontend consistency.
      return {
        audioContent: response.data.audio_content,
        timepoints: response.data.timepoints,
      };
    } catch (error) {
      console.error('Error synthesizing text:', error);
      throw error; // Re-throw the error to be caught by the calling hook
    }
  },
  
  // Get document by ID
  async getDocument(documentId: string): Promise<{
    id: string;
    name: string;
    content: string;
    full_content?: string;
    chunks?: string[];
    created_at: string;
    updated_at: string;
    user_id: string;
    file_type: string;
    original_filename: string;
    content_length: number;
  }> {
    const response = await api.get(`/api/documents/${documentId}?include_content=true`);
    return response.data;
  },
  
  // List documents
  async listDocuments(): Promise<Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    file_type: string;
    original_filename: string;
    content_length: number;
  }>> {
    const response = await api.get('/api/documents');
    return response.data.data || [];
  },
  
  // Upload document
  async uploadDocument(file: File, metadata?: Record<string, any>): Promise<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    file_type: string;
    original_filename: string;
    content_length: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    const response = await api.post('/api/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  // Delete document
  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/api/documents/${documentId}`);
  },

  // Get pre-signed URLs for TTS assets
  async getTtsAssets(documentId: string): Promise<{ audio_url: string; timepoints_url: string; }> {
    const response = await api.get(`/api/documents/${documentId}/tts-assets`);
    return response.data;
  },

  // Cancel an active quiz session
  async cancelQuiz(threadId: string): Promise<void> {
    await api.post('/api/v2/agent/chat', {
      query: '/cancel_quiz',
      thread_id: threadId,
    });
  },
  
  // Get user profile
  async getUserProfile(): Promise<{
    displayName: string;
    email: string;
    uid: string;
    preferences?: Record<string, any>;
  }> {
    const response = await api.get('/api/users/profile');
    return response.data.data || {};
  },
  
  // Update user profile
  async updateUserProfile(updates: {
    displayName?: string;
    preferences?: Record<string, any>;
  }): Promise<void> {
    await api.patch('/api/users/profile', updates);
  },
  
  // Start a quiz
  async startQuiz(documentId: string, threadId?: string | null): Promise<{
    agent_response: string;
    thread_id?: string;
    is_quiz?: boolean;
    quiz_complete?: boolean;
    quiz_cancelled?: boolean;
    error_detail?: string;
    audio_content_base64?: string | null;
  }> {
    const response = await api.post('/api/v2/agent/chat', {
      query: `Start a quiz for document ${documentId}`,
      documentId: documentId,
      thread_id: threadId, // Pass along the threadId if provided
    });
    console.log('[apiService.startQuiz] Raw response.data from backend:', JSON.stringify(response.data, null, 2));
    return {
      agent_response: response.data.final_agent_response || response.data.response || 'No response from AI', // Prioritize final_agent_response for quiz start
      thread_id: response.data.active_quiz_thread_id || response.data.thread_id, // Prioritize active_quiz_thread_id
      is_quiz: response.data.quiz_active || false,
      quiz_complete: response.data.quiz_complete || false,
      quiz_cancelled: response.data.quiz_cancelled || false,
      error_detail: response.data.error_detail,
      audio_content_base64: response.data.audio_content_base64 || null,
    };
  },
  
  // Continue quiz
  async continueQuiz(threadId: string, answer: string, documentId?: string): Promise<{
    agent_response: string;
    thread_id: string;
    is_quiz: boolean;
    quiz_completed?: boolean;
  }> {
    const response = await api.post('/api/v2/agent/chat', {
      query: answer,
      documentId: documentId, // Changed from document_id
      thread_id: threadId,
    });
    
    // Map the backend response to the expected frontend format
    return {
      agent_response: response.data.response || response.data.agent_response || 'No response from AI',
      thread_id: response.data.thread_id,
      is_quiz: response.data.quiz_active || false,
      quiz_completed: response.data.quiz_complete || false,
    };
  },

  // Answer Formulation API Methods
  
  /**
   * Refine a spoken transcript into a clear written answer
   */
  async refineAnswer(request: RefineAnswerRequest): Promise<RefineAnswerResponse> {
    const response = await api.post('/api/v2/answer-formulation/refine', {
      transcript: request.transcript,
      question: request.question,
      session_id: request.session_id,
    });
    
    return response.data;
  },

  /**
   * Apply an edit command to a refined answer
   */
  async editAnswer(request: EditAnswerRequest): Promise<EditAnswerResponse> {
    const response = await api.post('/api/v2/answer-formulation/edit', {
      session_id: request.session_id,
      edit_command: request.edit_command,
    });
    
    return response.data;
  },
};

// TypeScript Interfaces for Answer Formulation

export interface RefineAnswerRequest {
  transcript: string;
  question?: string;
  session_id?: string;
}

export interface RefineAnswerResponse {
  refined_answer: string;
  session_id: string;
  status: string;
  fidelity_score?: number | null;
  iteration_count: number;
  audio_content_base64?: string | null;
  timepoints?: any[] | null;
}

export interface EditAnswerRequest {
  session_id: string;
  edit_command: string;
}

export interface EditAnswerResponse {
  refined_answer: string;
  session_id: string;
  status: string;
  iteration_count: number;
  audio_content_base64?: string | null;
  timepoints?: any[] | null;
}

export default apiService;
