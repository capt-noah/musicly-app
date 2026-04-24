import { Track, Playlist, Artist, Category } from './types';

export const TRACKS: Track[] = [
  {
    id: '1',
    title: 'Silent Architecture',
    artist: 'Ether & Echo',
    album: 'The Concrete Monologue',
    coverUrl: 'https://picsum.photos/seed/music1/400/400',
    duration: '4:32',
  },
  {
    id: '2',
    title: 'Vascular Shadows',
    artist: 'Boutique Resonance',
    album: 'Sage Sessions Vol. 1',
    coverUrl: 'https://picsum.photos/seed/music2/400/400',
    duration: '5:18',
  },
  {
    id: '3',
    title: 'Tonal Equilibrium',
    artist: 'The Curator',
    album: 'Digital Atelier Essentials',
    coverUrl: 'https://picsum.photos/seed/music3/400/400',
    duration: '3:55',
  },
  {
    id: '4',
    title: 'Muted Horizons',
    artist: 'Landscape Ambient',
    album: 'Outer Shells',
    coverUrl: 'https://picsum.photos/seed/music4/400/400',
    duration: '6:21',
  },
];

export const ARTISTS: Artist[] = [
  { id: '1', name: 'Miles Davis', imageUrl: 'https://picsum.photos/seed/miles/200/200', genre: 'Jazz' },
  { id: '2', name: 'Phoebe B.', imageUrl: 'https://picsum.photos/seed/phoebe/200/200', genre: 'Indie' },
  { id: '3', name: 'Bonobo', imageUrl: 'https://picsum.photos/seed/bonobo/200/200', genre: 'Electronic' },
  { id: '4', name: 'Nils Frahm', imageUrl: 'https://picsum.photos/seed/nils/200/200', genre: 'Classical' },
];

export const CATEGORIES: Category[] = [
  { id: '1', title: 'Ambient', imageUrl: 'https://picsum.photos/seed/ambient/300/300', gradient: 'bg-[#1c211d]' },
  { id: '2', title: 'Vinyl Classics', imageUrl: 'https://picsum.photos/seed/vinyl/300/300', gradient: 'bg-primary-container' },
  { id: '3', title: 'Modern Jazz', imageUrl: 'https://picsum.photos/seed/jazz/300/300', gradient: 'bg-[#2a2e2a]' },
  { id: '4', title: 'Deep Focus', imageUrl: 'https://picsum.photos/seed/focus/300/300', gradient: 'bg-surface-container-high' },
  { id: '5', title: 'Nocturnal', imageUrl: 'https://picsum.photos/seed/nocturnal/300/300', gradient: 'bg-[#121412]' },
  { id: '6', title: 'Indie Folk', imageUrl: 'https://picsum.photos/seed/folk/300/300', gradient: 'bg-surface-container-highest' },
];

export const FEATURED_PLAYLIST: Playlist = {
  id: 'nocturne-sage',
  title: 'Nocturne Sage',
  description: 'A meditative journey through atmospheric ambient and boutique lo-fi textures designed for focused creative sessions in the Atelier.',
  imageUrl: 'https://picsum.photos/seed/nocturne/800/800',
  itemCount: 24,
  duration: '1h 42m',
  tracks: TRACKS,
};
