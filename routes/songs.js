const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const Song = require('../models/Song');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads/songs/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|flac|m4a|aac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, flac, m4a, aac)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

// @route   POST /api/songs/upload
// @desc    Upload a new song
// @access  Private
router.post('/upload', authMiddleware, upload.single('audioFile'), [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('artist')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist must be between 1 and 100 characters'),
  body('genre')
    .isIn(['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'ambient', 'indie', 'alternative', 'metal', 'punk', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'other'])
    .withMessage('Invalid genre'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (seconds)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    const {
      title,
      artist,
      album,
      genre,
      moodTags,
      language = 'en',
      duration,
      tempo = 'medium',
      energy = 5,
      valence = 5,
      isPublic = true
    } = req.body;

    // Parse moodTags if it's a string
    let parsedMoodTags = [];
    if (moodTags) {
      parsedMoodTags = typeof moodTags === 'string' ? JSON.parse(moodTags) : moodTags;
    }

    const song = new Song({
      title,
      artist,
      album,
      genre,
      moodTags: parsedMoodTags,
      language,
      duration: parseInt(duration),
      filePath: req.file.path,
      tempo,
      energy: parseInt(energy),
      valence: parseInt(valence),
      uploadedBy: req.user._id,
      isPublic: isPublic === 'true' || isPublic === true
    });

    await song.save();

    res.status(201).json({
      success: true,
      message: 'Song uploaded successfully',
      data: { song }
    });

  } catch (error) {
    // Delete uploaded file if database save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Song upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading song'
    });
  }
});

// @route   GET /api/songs
// @desc    Get all songs with filtering
// @access  Private
router.get('/', authMiddleware, [
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'romantic', 'angry', 'peaceful', 'uplifting', 'nostalgic', 'mysterious', 'dramatic']),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'ambient', 'indie', 'alternative', 'metal', 'punk', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'other']),
  query('language').optional().isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'instrumental']),
  query('tempo').optional().isIn(['slow', 'medium', 'fast']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      mood,
      genre,
      language,
      tempo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {
      $or: [
        { isPublic: true },
        { uploadedBy: req.user._id }
      ]
    };

    if (mood) filter.moodTags = mood;
    if (genre) filter.genre = genre;
    if (language) filter.language = language;
    if (tempo) filter.tempo = tempo;

    // Add text search if provided
    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const songs = await Song.find(filter)
      .populate('uploadedBy', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Song.countDocuments(filter);

    res.json({
      success: true,
      data: {
        songs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching songs'
    });
  }
});

// @route   GET /api/songs/recommendations
// @desc    Get song recommendations based on mood/preferences
// @access  Private
router.get('/recommendations', authMiddleware, [
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'romantic', 'angry', 'peaceful', 'uplifting', 'nostalgic', 'mysterious', 'dramatic']),
  query('energy').optional().isInt({ min: 1, max: 10 }),
  query('valence').optional().isInt({ min: 1, max: 10 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      mood,
      energy,
      valence,
      limit = 20
    } = req.query;

    // Build recommendation filter
    const filter = {
      $or: [
        { isPublic: true },
        { uploadedBy: req.user._id }
      ]
    };

    if (mood) filter.moodTags = mood;

    // Add energy and valence ranges if provided
    if (energy) {
      const energyValue = parseInt(energy);
      filter.energy = {
        $gte: Math.max(1, energyValue - 2),
        $lte: Math.min(10, energyValue + 2)
      };
    }

    if (valence) {
      const valenceValue = parseInt(valence);
      filter.valence = {
        $gte: Math.max(1, valenceValue - 2),
        $lte: Math.min(10, valenceValue + 2)
      };
    }

    const songs = await Song.find(filter)
      .populate('uploadedBy', 'name avatar')
      .sort({ playCount: -1, likes: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { songs }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recommendations'
    });
  }
});

// @route   GET /api/songs/:id
// @desc    Get single song by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('uploadedBy', 'name avatar');

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found'
      });
    }

    // Check if user has access to this song
    if (!song.isPublic && song.uploadedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this song'
      });
    }

    res.json({
      success: true,
      data: { song }
    });

  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching song'
    });
  }
});

// @route   PUT /api/songs/:id
// @desc    Update song details
// @access  Private
router.put('/:id', authMiddleware, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('artist')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist must be between 1 and 100 characters'),
  body('genre')
    .optional()
    .isIn(['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'ambient', 'indie', 'alternative', 'metal', 'punk', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'other'])
    .withMessage('Invalid genre')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found'
      });
    }

    // Check if user owns this song
    if (song.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own songs'
      });
    }

    const allowedUpdates = ['title', 'artist', 'album', 'genre', 'moodTags', 'language', 'tempo', 'energy', 'valence', 'isPublic'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(song, updates);
    await song.save();

    res.json({
      success: true,
      message: 'Song updated successfully',
      data: { song }
    });

  } catch (error) {
    console.error('Update song error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating song'
    });
  }
});

// @route   DELETE /api/songs/:id
// @desc    Delete a song
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found'
      });
    }

    // Check if user owns this song
    if (song.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own songs'
      });
    }

    // Delete the audio file
    if (fs.existsSync(song.filePath)) {
      fs.unlinkSync(song.filePath);
    }

    await Song.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Song deleted successfully'
    });

  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting song'
    });
  }
});

// @route   POST /api/songs/:id/play
// @desc    Increment play count for a song
// @access  Private
router.post('/:id/play', authMiddleware, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found'
      });
    }

    await song.incrementPlayCount();

    res.json({
      success: true,
      message: 'Play count updated',
      data: { playCount: song.playCount }
    });

  } catch (error) {
    console.error('Update play count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating play count'
    });
  }
});

// @route   GET /api/songs/user/my-songs
// @desc    Get current user's uploaded songs
// @access  Private
router.get('/user/my-songs', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const songs = await Song.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Song.countDocuments({ uploadedBy: req.user._id });

    res.json({
      success: true,
      data: {
        songs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user songs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user songs'
    });
  }
});

module.exports = router;