export interface User {
  id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_photo: string;
  hashed_password?: string;
  email?: string;
}

export interface Song {
  id: number;
  telegram_id: number;
  audio_file_id: string;
  cover_file_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_min: number;
  duration_sec: number;
  mime_type: string;
  file_size: number;
  cover_art?: string;
  streaming_url?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    userId: number;
    username: string;
    firstname: string;
    lastname: string;
    profile: string;
    email?: string;
  };
}
