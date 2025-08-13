import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CameraAlt,
  Edit,
  Mic,
  MusicNote,
  SentimentSatisfied,
  SentimentDissatisfied,
  SentimentVerySatisfied,
  SentimentVeryDissatisfied,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useMusicStore } from '../store/musicStore';
import MoodDetectionModal from '../components/MoodDetectionModal';
import VoiceControl from '../components/VoiceControl';
import WebcamCapture from '../components/WebcamCapture';
import PlaylistRecommendations from '../components/PlaylistRecommendations';
import MoodUpliftmentGame from '../components/MoodUpliftmentGame';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentMood, setCurrentMood, addMoodToHistory } = useMusicStore();
  
  const [tabValue, setTabValue] = useState(0);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showVoiceControl, setShowVoiceControl] = useState(false);
  const [showGame, setShowGame] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMoodDetection = (mood: any) => {
    const newMood = {
      id: Date.now().toString(),
      type: mood.type,
      intensity: mood.intensity,
      timestamp: new Date(),
      source: mood.source,
      notes: mood.notes,
    };
    
    setCurrentMood(newMood);
    addMoodToHistory(newMood);
    
    // Show game suggestion for negative moods
    if (['sad', 'anxious', 'melancholic'].includes(mood.type)) {
      setTimeout(() => {
        setShowGame(true);
      }, 2000);
    }
  };

  const getMoodColor = (moodType?: string) => {
    switch (moodType) {
      case 'happy':
      case 'excited':
        return theme.palette.success.main;
      case 'sad':
      case 'melancholic':
        return theme.palette.error.main;
      case 'energetic':
        return theme.palette.warning.main;
      case 'calm':
      case 'focused':
        return theme.palette.info.main;
      case 'anxious':
        return theme.palette.error.light;
      default:
        return theme.palette.primary.main;
    }
  };

  const getMoodIcon = (moodType?: string) => {
    switch (moodType) {
      case 'happy':
      case 'excited':
        return <SentimentVerySatisfied />;
      case 'sad':
      case 'melancholic':
        return <SentimentVeryDissatisfied />;
      case 'energetic':
        return <SentimentSatisfied />;
      case 'anxious':
        return <SentimentDissatisfied />;
      default:
        return <SentimentSatisfied />;
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Animated Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: currentMood
            ? `linear-gradient(135deg, ${getMoodColor(currentMood.type)}20 0%, ${theme.palette.background.default} 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.background.default} 100%)`,
          transition: 'background 0.5s ease',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Welcome back!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            How are you feeling today? Let's find the perfect music for your mood.
          </Typography>
        </Box>

        {/* Current Mood Display */}
        {currentMood && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ mb: 4, backgroundColor: `${getMoodColor(currentMood.type)}10` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      color: getMoodColor(currentMood.type),
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {getMoodIcon(currentMood.type)}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {currentMood.type.charAt(0).toUpperCase() + currentMood.type.slice(1)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Detected via {currentMood.source} • Intensity: {currentMood.intensity}/10
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Mood Detection Buttons */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                }}
                onClick={() => setShowWebcam(true)}
              >
                <IconButton
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    mb: 2,
                  }}
                >
                  <CameraAlt sx={{ fontSize: 40 }} />
                </IconButton>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Camera
                </Typography>
                <Typography variant="body2">
                  Detect mood from facial expressions
                </Typography>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={4}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: 3,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                  },
                }}
                onClick={() => setShowTextModal(true)}
              >
                <IconButton
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    mb: 2,
                  }}
                >
                  <Edit sx={{ fontSize: 40 }} />
                </IconButton>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Text
                </Typography>
                <Typography variant="body2">
                  Describe your current mood
                </Typography>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={4}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  p: 3,
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  },
                }}
                onClick={() => setShowVoiceControl(true)}
              >
                <IconButton
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    mb: 2,
                  }}
                >
                  <Mic sx={{ fontSize: 40 }} />
                </IconButton>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Voice
                </Typography>
                <Typography variant="body2">
                  Voice commands & tone detection
                </Typography>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
          >
            <Tab label="Recommendations" />
            <Tab label="Journal" />
            <Tab label="Analytics" />
            <Tab label="Games" />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <PlaylistRecommendations currentMood={currentMood} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Mood Journal
          </Typography>
          <Typography color="text.secondary">
            Track your daily moods and see patterns over time.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Mood Analytics
          </Typography>
          <Typography color="text.secondary">
            View detailed analytics about your mood trends and music preferences.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Mood Upliftment Games
          </Typography>
          <Typography color="text.secondary">
            Interactive games to help improve your mood when you're feeling down.
          </Typography>
        </TabPanel>
      </Box>

      {/* Modals */}
      <MoodDetectionModal
        open={showTextModal}
        onClose={() => setShowTextModal(false)}
        onMoodDetected={handleMoodDetection}
        source="text"
      />

      <WebcamCapture
        open={showWebcam}
        onClose={() => setShowWebcam(false)}
        onMoodDetected={handleMoodDetection}
      />

      <VoiceControl
        open={showVoiceControl}
        onClose={() => setShowVoiceControl(false)}
        onMoodDetected={handleMoodDetection}
      />

      <MoodUpliftmentGame
        open={showGame}
        onClose={() => setShowGame(false)}
      />
    </Box>
  );
};

export default Dashboard; 