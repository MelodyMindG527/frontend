import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { CameraAlt, Close, CheckCircle } from '@mui/icons-material';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

interface WebcamCaptureProps {
  open: boolean;
  onClose: () => void;
  onMoodDetected: (mood: any) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  open,
  onClose,
  onMoodDetected,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedMood, setDetectedMood] = useState<any>(null);
  const [error, setError] = useState('');

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        setIsCapturing(false);
        analyzeMood(imageSrc);
      }
    }
  }, []);

  const analyzeMood = async (imageSrc: string) => {
    setIsAnalyzing(true);
    setError('');

    try {
      // Simulate AI mood detection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate different mood detections based on random chance
      const moods = [
        { type: 'happy', intensity: 8, confidence: 0.85 },
        { type: 'calm', intensity: 6, confidence: 0.78 },
        { type: 'focused', intensity: 7, confidence: 0.82 },
        { type: 'energetic', intensity: 9, confidence: 0.91 },
        { type: 'sad', intensity: 4, confidence: 0.72 },
        { type: 'anxious', intensity: 5, confidence: 0.68 },
      ];

      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      setDetectedMood(randomMood);
    } catch (err) {
      setError('Failed to analyze mood. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDetectedMood(null);
    setError('');
    setIsCapturing(true);
  };

  const handleConfirm = () => {
    if (detectedMood) {
      onMoodDetected({
        ...detectedMood,
        source: 'camera',
        notes: 'Detected via facial expression analysis',
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setDetectedMood(null);
    setError('');
    setIsCapturing(false);
    setIsAnalyzing(false);
    onClose();
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          Facial Expression Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Look at the camera and we'll detect your mood from your facial expressions
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          {!capturedImage ? (
            <Box sx={{ position: 'relative' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{
                  borderRadius: 12,
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
              {isCapturing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <CircularProgress size={60} />
                  <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
                    Analyzing...
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  borderRadius: 12,
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
              
              {isAnalyzing && (
                <Box sx={{ mt: 2 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    Analyzing facial expressions...
                  </Typography>
                </Box>
              )}

              {detectedMood && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{ mt: 2, backgroundColor: `${getMoodColor(detectedMood.type)}10` }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Detected Mood
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={detectedMood.type.charAt(0).toUpperCase() + detectedMood.type.slice(1)}
                          sx={{
                            backgroundColor: getMoodColor(detectedMood.type),
                            color: 'white',
                          }}
                        />
                        <Chip
                          label={`Intensity: ${detectedMood.intensity}/10`}
                          variant="outlined"
                        />
                        <Chip
                          label={`Confidence: ${Math.round(detectedMood.confidence * 100)}%`}
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Based on facial expression analysis
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} variant="outlined" startIcon={<Close />}>
          Cancel
        </Button>
        
        {!capturedImage ? (
          <Button
            onClick={capture}
            variant="contained"
            startIcon={<CameraAlt />}
            disabled={isCapturing}
          >
            Capture & Analyze
          </Button>
        ) : (
          <>
            <Button onClick={handleRetake} variant="outlined">
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              startIcon={<CheckCircle />}
              disabled={!detectedMood || isAnalyzing}
              sx={{
                backgroundColor: detectedMood ? getMoodColor(detectedMood.type) : 'grey.400',
                '&:hover': {
                  backgroundColor: detectedMood ? getMoodColor(detectedMood.type) : 'grey.400',
                },
              }}
            >
              Confirm & Get Music
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WebcamCapture; 