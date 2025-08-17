const express = require('express');
const { body, query, validationResult } = require('express-validator');
const MoodLog = require('../models/MoodLog');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/moods
// @desc    Log a new mood entry
// @access  Private
router.post('/', authMiddleware, [
  body('mood')
    .isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'romantic', 'nostalgic'])
    .withMessage('Invalid mood type'),
  body('intensity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Intensity must be between 1 and 10'),
  body('detectionMethod')
    .isIn(['camera', 'voice', 'text', 'manual', 'activity', 'journal'])
    .withMessage('Invalid detection method'),
  body('confidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence must be between 0 and 1'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
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
      intensity,
      detectionMethod,
      confidence = 1.0,
      notes,
      context = {},
      triggers = [],
      sessionId
    } = req.body;

    // Get user's previous mood for comparison
    const previousMood = await MoodLog.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(1);

    const moodLog = new MoodLog({
      user: req.user._id,
      mood,
      intensity,
      detectionMethod,
      confidence,
      notes,
      context: {
        location: context.location,
        activity: context.activity,
        weather: context.weather || 'unknown',
        timeOfDay: context.timeOfDay // Will be auto-calculated if not provided
      },
      triggers,
      previousMood: previousMood ? {
        mood: previousMood.mood,
        intensity: previousMood.intensity,
        timestamp: previousMood.createdAt
      } : undefined,
      sessionId
    });

    await moodLog.save();

    res.status(201).json({
      success: true,
      message: 'Mood logged successfully',
      data: { moodLog }
    });

  } catch (error) {
    console.error('Log mood error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error logging mood'
    });
  }
});

// @route   GET /api/moods
// @desc    Get user's mood history
// @access  Private
router.get('/', authMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'romantic', 'nostalgic']),
  query('detectionMethod').optional().isIn(['camera', 'voice', 'text', 'manual', 'activity', 'journal']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
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
      mood,
      detectionMethod,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };

    if (mood) filter.mood = mood;
    if (detectionMethod) filter.detectionMethod = detectionMethod;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const moodLogs = await MoodLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MoodLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        moodLogs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get mood history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood history'
    });
  }
});

// @route   GET /api/moods/trends
// @desc    Get mood trends over time
// @access  Private
router.get('/trends', authMiddleware, [
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

    const { days = 7 } = req.query;

    const trends = await MoodLog.getMoodTrends(req.user._id, parseInt(days));

    res.json({
      success: true,
      data: { trends }
    });

  } catch (error) {
    console.error('Get mood trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood trends'
    });
  }
});

// @route   GET /api/moods/frequency
// @desc    Get mood frequency statistics
// @access  Private
router.get('/frequency', authMiddleware, [
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

    const frequency = await MoodLog.getMoodFrequency(req.user._id, parseInt(days));

    res.json({
      success: true,
      data: { frequency }
    });

  } catch (error) {
    console.error('Get mood frequency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood frequency'
    });
  }
});

// @route   GET /api/moods/stats
// @desc    Get comprehensive mood statistics
// @access  Private
router.get('/stats', authMiddleware, [
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get comprehensive stats using aggregation
    const stats = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          mostCommonMood: { $first: '$mood' },
          highestIntensity: { $max: '$intensity' },
          lowestIntensity: { $min: '$intensity' },
          detectionMethods: { $addToSet: '$detectionMethod' },
          uniqueMoods: { $addToSet: '$mood' },
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    // Get mood distribution
    const moodDistribution = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get detection method distribution
    const detectionMethodStats = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$detectionMethod',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get time of day patterns
    const timePatterns = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$context.timeOfDay',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          commonMoods: { $push: '$mood' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalEntries: 0,
          avgIntensity: 0,
          mostCommonMood: null,
          highestIntensity: 0,
          lowestIntensity: 0,
          detectionMethods: [],
          uniqueMoods: [],
          avgConfidence: 0
        },
        moodDistribution,
        detectionMethodStats,
        timePatterns,
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get mood stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood statistics'
    });
  }
});

// @route   GET /api/moods/:id
// @desc    Get single mood log by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const moodLog = await MoodLog.findById(req.params.id);

    if (!moodLog) {
      return res.status(404).json({
        success: false,
        message: 'Mood log not found'
      });
    }

    // Check if user owns this mood log
    if (moodLog.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this mood log'
      });
    }

    res.json({
      success: true,
      data: { moodLog }
    });

  } catch (error) {
    console.error('Get mood log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood log'
    });
  }
});

// @route   PUT /api/moods/:id
// @desc    Update mood log (only notes and context)
// @access  Private
router.put('/:id', authMiddleware, [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
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

    const moodLog = await MoodLog.findById(req.params.id);

    if (!moodLog) {
      return res.status(404).json({
        success: false,
        message: 'Mood log not found'
      });
    }

    // Check if user owns this mood log
    if (moodLog.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own mood logs'
      });
    }

    // Only allow updating notes and context
    const allowedUpdates = ['notes', 'context', 'triggers'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'context') {
          updates[field] = { ...moodLog.context, ...req.body[field] };
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    Object.assign(moodLog, updates);
    await moodLog.save();

    res.json({
      success: true,
      message: 'Mood log updated successfully',
      data: { moodLog }
    });

  } catch (error) {
    console.error('Update mood log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating mood log'
    });
  }
});

// @route   DELETE /api/moods/:id
// @desc    Delete a mood log
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const moodLog = await MoodLog.findById(req.params.id);

    if (!moodLog) {
      return res.status(404).json({
        success: false,
        message: 'Mood log not found'
      });
    }

    // Check if user owns this mood log
    if (moodLog.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own mood logs'
      });
    }

    await MoodLog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Mood log deleted successfully'
    });

  } catch (error) {
    console.error('Delete mood log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting mood log'
    });
  }
});

// @route   GET /api/moods/insights/patterns
// @desc    Get mood patterns and insights
// @access  Private
router.get('/insights/patterns', authMiddleware, [
  query('days').optional().isInt({ min: 7, max: 365 })
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get weekly patterns
    const weeklyPatterns = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$createdAt' },
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$dayOfWeek',
          avgIntensity: { $avg: '$intensity' },
          count: { $sum: 1 },
          commonMoods: { $push: '$mood' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get trigger analysis
    const triggerAnalysis = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate },
          triggers: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$triggers'
      },
      {
        $group: {
          _id: '$triggers',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          associatedMoods: { $push: '$mood' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get mood transitions
    const moodTransitions = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate },
          'previousMood.mood': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            from: '$previousMood.mood',
            to: '$mood'
          },
          count: { $sum: 1 },
          avgIntensityChange: {
            $avg: { $subtract: ['$intensity', '$previousMood.intensity'] }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      success: true,
      data: {
        weeklyPatterns,
        triggerAnalysis,
        moodTransitions,
        insights: {
          period: `${days} days`,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get mood patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood patterns'
    });
  }
});

module.exports = router;