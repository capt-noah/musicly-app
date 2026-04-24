export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  duration: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  itemCount?: number;
  duration?: string;
  tracks: Track[];
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genre?: string;
}

export interface Category {
  id: string;
  title: string;
  imageUrl: string;
  gradient: string;
}
