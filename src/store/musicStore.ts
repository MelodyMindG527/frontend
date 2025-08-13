import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  cover: string;
  genre: string;
}

export interface Mood {
  id: string;
  type: 'happy' | 'sad' | 'energetic' | 'calm' | 'anxious' | 'excited' | 'melancholic' | 'focused';
  intensity: number; // 1-10
  timestamp: Date;
  source: 'camera' | 'text' | 'voice' | 'journal';
  notes?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: Song[];
  mood: string;
  created: Date;
}

interface MusicState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  queue: Song[];
  currentMood: Mood | null;
  moodHistory: Mood[];
  playlists: Playlist[];
  isLoading: boolean;
  
  // Actions
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  setCurrentMood: (mood: Mood) => void;
  addMoodToHistory: (mood: Mood) => void;
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'created'>) => void;
  setLoading: (loading: boolean) => void;
  
  // Music controls
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (time: number) => void;
}

const dummySongs: Song[] = [
  {
    id: '1',
    title: 'Happy Days',
    artist: 'Sunshine Band',
    album: 'Summer Vibes',
    duration: 180,
    url: 'https://example.com/song1.mp3',
    cover: 'https://picsum.photos/300/300?random=1',
    genre: 'pop',
  },
  {
    id: '2',
    title: 'Calm Waters',
    artist: 'Ocean Waves',
    album: 'Peaceful Moments',
    duration: 240,
    url: 'https://example.com/song2.mp3',
    cover: 'https://picsum.photos/300/300?random=2',
    genre: 'ambient',
  },
  {
    id: '3',
    title: 'Energetic Beat',
    artist: 'Power Pulse',
    album: 'Workout Mix',
    duration: 200,
    url: 'https://example.com/song3.mp3',
    cover: 'https://picsum.photos/300/300?random=3',
    genre: 'electronic',
  },
];

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      volume: 0.7,
      queue: [],
      currentMood: null,
      moodHistory: [],
      playlists: [],
      isLoading: false,
      
      setCurrentSong: (song) => set({ currentSong: song }),
      
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setVolume: (volume) => set({ volume }),
      
      addToQueue: (song) => set((state) => ({ 
        queue: [...state.queue, song] 
      })),
      
      removeFromQueue: (songId) => set((state) => ({
        queue: state.queue.filter(song => song.id !== songId)
      })),
      
      setCurrentMood: (mood) => set({ currentMood: mood }),
      
      addMoodToHistory: (mood) => set((state) => ({
        moodHistory: [mood, ...state.moodHistory]
      })),
      
      createPlaylist: (playlist) => set((state) => ({
        playlists: [
          {
            ...playlist,
            id: Date.now().toString(),
            created: new Date(),
          },
          ...state.playlists,
        ]
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      playNext: () => {
        const { queue, currentSong } = get();
        const currentIndex = queue.findIndex(song => song.id === currentSong?.id);
        const nextSong = queue[currentIndex + 1] || queue[0];
        if (nextSong) {
          set({ currentSong: nextSong, isPlaying: true });
        }
      },
      
      playPrevious: () => {
        const { queue, currentSong } = get();
        const currentIndex = queue.findIndex(song => song.id === currentSong?.id);
        const prevSong = queue[currentIndex - 1] || queue[queue.length - 1];
        if (prevSong) {
          set({ currentSong: prevSong, isPlaying: true });
        }
      },
      
      seekTo: (time) => {
        // This would be implemented with actual audio player
        console.log('Seeking to:', time);
      },
    }),
    {
      name: 'music-storage',
      partialize: (state) => ({
        volume: state.volume,
        moodHistory: state.moodHistory,
        playlists: state.playlists,
      }),
    }
  )
); 