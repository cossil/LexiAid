export type Timepoint = { mark_name: string; time_seconds: number };

export interface ChatMessage {
  id: string;
  thread_id?: string;
  document_id?: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  audio_content_base64?: string | null;
  timestamp: string;
  isPending?: boolean;
  isError?: boolean;
  citations?: any[];
  isLastMessage?: boolean;
  isQuizQuestion?: boolean;
  timepoints?: { mark_name: string; time_seconds: number }[] | null; // ADD THIS LINE
  options?: string[];
}
