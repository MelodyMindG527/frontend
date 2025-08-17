const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/games
// @desc    Get all available games
// @access  Private
router.get('/', authMiddleware, [
  query('type').optional().isIn(['mood-upliftment', 'memory', 'rhythm', 'puzzle', 'breathing', 'meditation', 'cognitive', 'social']),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('targetMood').optional().isIn(['sad', 'anxious', 'stressed', 'angry', 'lonely', 'bored', 'tired', 'overwhelmed']),
  query('page').optional().isInt({ min: 1 }),
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
      type,
      difficulty,
      targetMood,
      page = 1,
      limit = 20,
      sortBy = 'averageRating',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (targetMood) filter.targetMoods = targetMood;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const games = await Game.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Game.countDocuments(filter);

    res.json({
      success: true,
      data: {
        games,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching games'
    });
  }
});

// @route   GET /api/games/recommendations
// @desc    Get game recommendations based on current mood
// @access  Private
router.get('/recommendations', authMiddleware, [
  query('mood').optional().isIn(['sad', 'anxious', 'stressed', 'angry', 'lonely', 'bored', 'tired', 'overwhelmed']),
  query('limit').optional().isInt({ min: 1, max: 20 })
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

    const { mood, limit = 10 } = req.query;

    let games;
    if (mood) {
      games = await Game.getGamesByMood(mood).limit(parseInt(limit));
    } else {
      games = await Game.getPopularGames(parseInt(limit));
    }

    res.json({
      success: true,
      data: { games }
    });

  } catch (error) {
    console.error('Get game recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game recommendations'
    });
  }
});

// @route   GET /api/games/:id
// @desc    Get single game by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (!game.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Game is not available'
      });
    }

    res.json({
      success: true,
      data: { game }
    });

  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game'
    });
  }
});

// @route   POST /api/games/:id/start
// @desc    Start a new game session
// @access  Private
router.post('/:id/start', authMiddleware, [
  body('moodBefore.mood')
    .isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'stressed', 'bored', 'lonely', 'overwhelmed'])
    .withMessage('Invalid mood'),
  body('moodBefore.intensity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood intensity must be between 1 and 10'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level')
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

    const game = await Game.findById(req.params.id);
    if (!game || !game.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or not available'
      });
    }

    const { moodBefore, difficulty = game.difficulty, deviceType = 'unknown' } = req.body;

    // Generate unique session ID
    const sessionId = `${req.user._id}_${game._id}_${Date.now()}`;

    // Check if user has played this game before
    const previousSessions = await GameSession.countDocuments({
      user: req.user._id,
      game: game._id
    });

    const gameSession = new GameSession({
      user: req.user._id,
      game: game._id,
      sessionId,
      moodBefore,
      difficulty,
      deviceType,
      gameData: {
        isFirstPlay: previousSessions === 0,
        expectedDuration: game.estimatedDuration * 60 // Convert to seconds
      }
    });

    await gameSession.save();

    // Increment game play count
    await game.incrementPlayCount();

    res.status(201).json({
      success: true,
      message: 'Game session started successfully',
      data: {
        sessionId: gameSession.sessionId,
        game: {
          id: game._id,
          name: game.name,
          type: game.type,
          difficulty: gameSession.difficulty,
          instructions: game.instructions,
          estimatedDuration: game.estimatedDuration
        }
      }
    });

  } catch (error) {
    console.error('Start game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting game session'
    });
  }
});

// @route   PUT /api/games/sessions/:sessionId/complete
// @desc    Complete a game session
// @access  Private
router.put('/sessions/:sessionId/complete', authMiddleware, [
  body('moodAfter.mood')
    .isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'stressed', 'bored', 'lonely', 'overwhelmed'])
    .withMessage('Invalid mood'),
  body('moodAfter.intensity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood intensity must be between 1 and 10'),
  body('score')
    .isInt({ min: 0 })
    .withMessage('Score must be a non-negative integer'),
  body('maxScore')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max score must be a non-negative integer')
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

    const gameSession = await GameSession.findOne({
      sessionId: req.params.sessionId,
      user: req.user._id
    }).populate('game');

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found'
      });
    }

    if (gameSession.completed) {
      return res.status(400).json({
        success: false,
        message: 'Game session already completed'
      });
    }

    const { moodAfter, score, maxScore = score, gameData = {} } = req.body;

    // Complete the session
    gameSession.maxScore = maxScore;
    await gameSession.completeSession(moodAfter, score, gameData);

    // Calculate mood improvement
    const moodImprovement = moodAfter.intensity - gameSession.moodBefore.intensity;

    res.json({
      success: true,
      message: 'Game session completed successfully',
      data: {
        sessionId: gameSession.sessionId,
        score,
        maxScore,
        moodImprovement,
        achievements: gameSession.achievements,
        duration: gameSession.duration
      }
    });

  } catch (error) {
    console.error('Complete game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error completing game session'
    });
  }
});

// @route   GET /api/games/sessions/history
// @desc    Get user's game session history
// @access  Private
router.get('/sessions/history', authMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('gameId').optional().isMongoId(),
  query('completed').optional().isBoolean()
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
      page = 1,
      limit = 20,
      gameId,
      completed
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (gameId) filter.game = gameId;
    if (completed !== undefined) filter.completed = completed === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await GameSession.find(filter)
      .populate('game', 'name type difficulty icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GameSession.countDocuments(filter);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game history'
    });
  }
});

// @route   GET /api/games/sessions/:sessionId
// @desc    Get single game session details
// @access  Private
router.get('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const gameSession = await GameSession.findOne({
      sessionId: req.params.sessionId,
      user: req.user._id
    }).populate('game');

    if (!gameSession) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found'
      });
    }

    res.json({
      success: true,
      data: { gameSession }
    });

  } catch (error) {
    console.error('Get game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game session'
    });
  }
});

// @route   POST /api/games/:id/rate
// @desc    Rate a game
// @access  Private
router.post('/:id/rate', authMiddleware, [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Feedback cannot exceed 500 characters')
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

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const { rating, feedback } = req.body;

    // Check if user has played this game
    const hasPlayed = await GameSession.findOne({
      user: req.user._id,
      game: game._id,
      completed: true
    });

    if (!hasPlayed) {
      return res.status(400).json({
        success: false,
        message: 'You must complete a game session before rating'
      });
    }

    // Update game rating
    await game.updateRating(rating);

    // Update the most recent completed session with rating and feedback
    await GameSession.findOneAndUpdate(
      {
        user: req.user._id,
        game: game._id,
        completed: true
      },
      {
        rating,
        feedback
      },
      { sort: { completedAt: -1 } }
    );

    res.json({
      success: true,
      message: 'Game rated successfully',
      data: {
        averageRating: game.averageRating,
        ratingCount: game.ratingCount
      }
    });

  } catch (error) {
    console.error('Rate game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rating game'
    });
  }
});

// @route   GET /api/games/stats/user
// @desc    Get user's game statistics
// @access  Private
router.get('/stats/user', authMiddleware, [
  query('days').optional().isInt({ min: 1, max: 365 })
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

    const { days = 30 } = req.query;

    // Get mood improvement stats
    const moodImprovementStats = await GameSession.getMoodImprovementStats(req.user._id, parseInt(days));

    // Get user's game history summary
    const gameHistory = await GameSession.getUserGameHistory(req.user._id, 100);

    // Calculate additional stats
    const totalSessions = gameHistory.length;
    const completedSessions = gameHistory.filter(session => session.completed).length;
    const averageScore = gameHistory.reduce((sum, session) => sum + (session.score || 0), 0) / totalSessions || 0;
    const totalGameTime = gameHistory.reduce((sum, session) => sum + (session.duration || 0), 0);

    // Get achievement counts
    const achievements = {};
    gameHistory.forEach(session => {
      session.achievements.forEach(achievement => {
        achievements[achievement] = (achievements[achievement] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          completedSessions,
          completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
          averageScore: Math.round(averageScore),
          totalGameTime: Math.round(totalGameTime / 60), // Convert to minutes
        },
        moodImprovement: moodImprovementStats[0] || {
          totalSessions: 0,
          avgMoodImprovement: 0,
          positiveImprovements: 0,
          maxImprovement: 0,
          minImprovement: 0
        },
        achievements,
        recentSessions: gameHistory.slice(0, 10),
        period: {
          days: parseInt(days),
          startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get user game stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user game statistics'
    });
  }
});

module.exports = router;