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
  audio_url?: string;
  cover_url?: string;
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
  currentTime: number;
  duration: number;
  audioElement: HTMLAudioElement | null;
  
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
  playSong: (song: Song) => void;
  stopPlayback: () => void;
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
      currentTime: 0,
      duration: 0,
      audioElement: null,
      
      setCurrentSong: (song) => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.pause();
        }
        
        if (song) {
          const newAudio = new Audio(song.audio_url || song.url);
          newAudio.volume = get().volume;
          
          newAudio.addEventListener('loadedmetadata', () => {
            set({ duration: newAudio.duration });
          });
          
          newAudio.addEventListener('timeupdate', () => {
            set({ currentTime: newAudio.currentTime });
          });
          
          newAudio.addEventListener('ended', () => {
            get().playNext();
          });
          
          set({ 
            currentSong: song, 
            audioElement: newAudio,
            isPlaying: false,
            currentTime: 0,
            duration: 0
          });
        } else {
          set({ 
            currentSong: null, 
            audioElement: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0
          });
        }
      },
      
      togglePlay: () => {
        const { audioElement, isPlaying } = get();
        if (audioElement) {
          if (isPlaying) {
            audioElement.pause();
            set({ isPlaying: false });
          } else {
            audioElement.play();
            set({ isPlaying: true });
          }
        }
      },
      
      setVolume: (volume) => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.volume = volume;
        }
        set({ volume });
      },
      
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
      
      playSong: (song) => {
        get().setCurrentSong(song);
        setTimeout(() => {
          get().togglePlay();
        }, 100);
      },
      
      stopPlayback: () => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        set({ isPlaying: false, currentTime: 0 });
      },
      
      playNext: () => {
        const { queue, currentSong } = get();
        const currentIndex = queue.findIndex(song => song.id === currentSong?.id);
        const nextSong = queue[currentIndex + 1] || queue[0];
        if (nextSong) {
          get().playSong(nextSong);
        }
      },
      
      playPrevious: () => {
        const { queue, currentSong } = get();
        const currentIndex = queue.findIndex(song => song.id === currentSong?.id);
        const prevSong = queue[currentIndex - 1] || queue[queue.length - 1];
        if (prevSong) {
          get().playSong(prevSong);
        }
      },
      
      seekTo: (time) => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.currentTime = time;
          set({ currentTime: time });
        }
      }
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