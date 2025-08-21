import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CameraAlt,
  MusicNote,
  Psychology,
  TrendingUp,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import WebcamCapture from '../components/WebcamCapture';
import MoodDetectionModal from '../components/MoodDetectionModal';
import VoiceControl from '../components/VoiceControl';
import { useMusicStore } from '../store/musicStore';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showWebcam, setShowWebcam] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [currentMood, setCurrentMood] = useState<any>(null);
  const { currentSong, isPlaying, togglePlay, playSong } = useMusicStore();

  const handleMoodDetected = (mood: any) => {
    setCurrentMood(mood);
    console.log('Mood detected:', mood);
    
    // If songs are available, show them
    if (mood.songs && mood.songs.length > 0) {
      console.log('Songs available for playback:', mood.songs);
    }
  };

  const getMoodColor = (moodType: string) => {
    switch (moodType) {
      case 'happy':
        return '#4caf50';
      case 'sad':
        return '#f44336';
      case 'energetic':
        return '#ff9800';
      case 'calm':
        return '#2196f3';
      case 'anxious':
        return '#ff5722';
      case 'focused':
        return '#795548';
      default:
        return '#9e9e9e';
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Welcome to MelodyMind
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Your AI-powered mood-based music companion
        </Typography>
      </motion.div>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => setShowWebcam(true)}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CameraAlt sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Detect Your Mood
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Use your camera to analyze facial expressions and get personalized music recommendations
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card
              sx={{
                background: 'linear-gradient(135deg, #34e89e 0%, #0f3443 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => setShowTextModal(true)}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Psychology sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Describe Your Mood (Text)
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Type how you feel and get recommendations instantly
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => setShowVoice(true)}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <MusicNote sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Voice Control & Mood
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Speak commands (play, pause, next) or describe your mood
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Current Mood & Music Section */}
      {currentMood && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                🎵 Your Mood-Based Music
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Chip
                  label={currentMood.type.charAt(0).toUpperCase() + currentMood.type.slice(1)}
                  sx={{
                    backgroundColor: getMoodColor(currentMood.type),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
                <Typography variant="body1">
                  Intensity: {currentMood.intensity}/10
                </Typography>
                <Typography variant="body1">
                  Confidence: {Math.round(currentMood.confidence * 100)}%
                </Typography>
              </Box>

              {currentMood.songs && currentMood.songs.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Recommended Songs:
                  </Typography>
                  <Grid container spacing={2}>
                    {currentMood.songs.slice(0, 3).map((song: any, index: number) => (
                      <Grid item xs={12} sm={6} md={4} key={song.id}>
                        <Card sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          p: 2,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'scale(1.02)',
                          }
                        }}
                        onClick={() => playSong(song)}
                        >
                          <Avatar
                            src={song.cover}
                            alt={song.title}
                            sx={{ width: 48, height: 48, mr: 2 }}
                          />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight="bold" noWrap>
                              {song.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {song.artist}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(song.duration)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSong(song);
                            }}
                          >
                            <PlayArrow />
                          </IconButton>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Currently Playing */}
      {currentSong && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card sx={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🎵 Now Playing
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={currentSong.cover}
                  alt={currentSong.title}
                  sx={{ width: 64, height: 64 }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {currentSong.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {currentSong.artist}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentSong.album}
                  </Typography>
                </Box>
                <IconButton
                  size="large"
                  onClick={togglePlay}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Webcam Modal */}
      <WebcamCapture
        open={showWebcam}
        onClose={() => setShowWebcam(false)}
        onMoodDetected={handleMoodDetected}
      />
      <MoodDetectionModal
        open={showTextModal}
        onClose={() => setShowTextModal(false)}
        onMoodDetected={handleMoodDetected}
        source="text"
      />
      <VoiceControl
        open={showVoice}
        onClose={() => setShowVoice(false)}
        onMoodDetected={handleMoodDetected}
      />
    </Box>
  );
};

export default Dashboard; 