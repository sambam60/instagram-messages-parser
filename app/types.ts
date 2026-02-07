export interface Participant {
  name: string;
}

export interface Photo {
  uri: string;
  type: string;
}

export interface Video {
  uri: string;
  type: string;
}

export interface AudioFile {
  uri: string;
  type: string;
}

export interface Share {
  link?: string;
  share_text?: string;
  original_content_owner?: string;
}

export interface Message {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  is_geoblocked_for_viewer: boolean;
  type?: string;
  photos?: Photo[];
  videos?: Video[];
  audio_files?: AudioFile[];
  share?: Share;
}

export interface Conversation {
  participants: Participant[];
  messages: Message[];
  title: string;
  thread_path: string;
  is_still_participant: boolean;
  magic_words: string[];
}
