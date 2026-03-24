export type PetChatRole = 'user' | 'assistant';

export interface PetChatHistoryItem {
  role: PetChatRole;
  content: string;
}

export interface PetChatMessage extends PetChatHistoryItem {
  id: string;
  createdAt: number;
  emotion?: string;
}

export interface PetChatRequest {
  pet_id: number;
  message: string;
  history: PetChatHistoryItem[];
}

export interface PetChatResponse {
  success: boolean;
  reply: string;
  emotion?: string;
  action?: string;
  suggestions?: string[];
}
