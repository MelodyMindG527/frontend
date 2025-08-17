const express = require('express');
const { query, validationResult } = require('express-validator');
const MoodLog = require('../models/MoodLog');
const PlaybackLog = require('../models/PlaybackLog');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');
const GameSession = require('../models/GameSession');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics overview
// @access  Private
router.get('/dashboard', authMiddleware, [
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

    // Get mood analytics
    const moodStats = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalMoodLogs: { $sum: 1 },
          avgMoodIntensity: { $avg: '$intensity' },
          uniqueMoods: { $addToSet: '$mood' },
          detectionMethods: { $addToSet: '$detectionMethod' }
        }
      }
    ]);

    // Get listening analytics
    const listeningStats = await PlaybackLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: 1 },
          totalListeningTime: { $sum: '$playDuration' },
          avgCompletion: { $avg: '$completionPercentage' },
          uniqueSongs: { $addToSet: '$song' },
          likedSongs: { $sum: { $cond: ['$liked', 1, 0] } }
        }
      }
    ]);

    // Get playlist stats
    const playlistStats = await Playlist.aggregate([
      {
        $match: {
          owner: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPlaylists: { $sum: 1 },
          totalSongsInPlaylists: { $sum: { $size: '$songs' } },
          avgPlaylistSize: { $avg: { $size: '$songs' } },
          publicPlaylists: { $sum: { $cond: ['$isPublic', 1, 0] } }
        }
      }
    ]);

    // Get game stats
    const gameStats = await GameSession.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGameSessions: { $sum: 1 },
          completedSessions: { $sum: { $cond: ['$completed', 1, 0] } },
          avgScore: { $avg: '$score' },
          totalGameTime: { $sum: '$duration' },
          moodImprovements: {
            $sum: {
              $cond: [
                { $gt: [{ $subtract: ['$moodAfter.intensity', '$moodBefore.intensity'] }, 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent activity
    const recentActivity = await Promise.all([
      MoodLog.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('mood intensity createdAt detectionMethod'),
      PlaybackLog.find({ user: req.user._id })
        .populate('song', 'title artist')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('song playDuration createdAt liked'),
      GameSession.find({ user: req.user._id })
        .populate('game', 'name type')
        .sort({ createdAt: -1 })
        .limit(3)
        .select('game score completed createdAt moodBefore moodAfter')
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          mood: moodStats[0] || {
            totalMoodLogs: 0,
            avgMoodIntensity: 0,
            uniqueMoods: [],
            detectionMethods: []
          },
          listening: listeningStats[0] || {
            totalPlays: 0,
            totalListeningTime: 0,
            avgCompletion: 0,
            uniqueSongs: [],
            likedSongs: 0
          },
          playlists: playlistStats[0] || {
            totalPlaylists: 0,
            totalSongsInPlaylists: 0,
            avgPlaylistSize: 0,
            publicPlaylists: 0
          },
          games: gameStats[0] || {
            totalGameSessions: 0,
            completedSessions: 0,
            avgScore: 0,
            totalGameTime: 0,
            moodImprovements: 0
          }
        },
        recentActivity: {
          moods: recentActivity[0],
          listening: recentActivity[1],
          games: recentActivity[2]
        },
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard analytics'
    });
  }
});

// @route   GET /api/analytics/mood-trends
// @desc    Get detailed mood trends and patterns
// @access  Private
router.get('/mood-trends', authMiddleware, [
  query('days').optional().isInt({ min: 7, max: 365 }),
  query('groupBy').optional().isIn(['day', 'week', 'month'])
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

    const { days = 30, groupBy = 'day' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Define grouping format based on groupBy parameter
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-W%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const trends = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            mood: '$mood'
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          maxIntensity: { $max: '$intensity' },
          minIntensity: { $min: '$intensity' }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.mood': 1 }
      }
    ]);

    // Get overall mood distribution
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
          avgIntensity: { $avg: '$intensity' },
          percentage: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Calculate total for percentage
    const totalMoods = moodDistribution.reduce((sum, mood) => sum + mood.count, 0);
    moodDistribution.forEach(mood => {
      mood.percentage = totalMoods > 0 ? (mood.count / totalMoods) * 100 : 0;
    });

    res.json({
      success: true,
      data: {
        trends,
        moodDistribution,
        summary: {
          totalEntries: totalMoods,
          period: `${days} days`,
          groupBy,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get mood trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching mood trends'
    });
  }
});

// @route   GET /api/analytics/listening-patterns
// @desc    Get listening patterns and music preferences
// @access  Private
router.get('/listening-patterns', authMiddleware, [
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

    // Get most played songs
    const mostPlayedSongs = await PlaybackLog.getMostPlayedSongs(req.user._id, 10, parseInt(days));

    // Get listening patterns by mood
    const listeningByMood = await PlaybackLog.getListeningPatternsByMood(req.user._id, parseInt(days));

    // Get daily listening stats
    const dailyStats = await PlaybackLog.getDailyListeningStats(req.user._id, Math.min(parseInt(days), 30));

    // Get genre preferences
    const genrePreferences = await PlaybackLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $lookup: {
          from: 'songs',
          localField: 'song',
          foreignField: '_id',
          as: 'songDetails'
        }
      },
      {
        $unwind: '$songDetails'
      },
      {
        $group: {
          _id: '$songDetails.genre',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$playDuration' },
          avgCompletion: { $avg: '$completionPercentage' },
          likeRate: { $avg: { $cond: ['$liked', 1, 0] } }
        }
      },
      {
        $sort: { playCount: -1 }
      }
    ]);

    // Get listening time patterns
    const timePatterns = await PlaybackLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $addFields: {
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$hour',
          playCount: { $sum: 1 },
          avgDuration: { $avg: '$playDuration' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        mostPlayedSongs,
        listeningByMood,
        dailyStats,
        genrePreferences,
        timePatterns,
        period: {
          days: parseInt(days),
          startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get listening patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching listening patterns'
    });
  }
});

// @route   GET /api/analytics/playlist-usage
// @desc    Get playlist usage statistics
// @access  Private
router.get('/playlist-usage', authMiddleware, [
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

    // Get most played playlists
    const mostPlayedPlaylists = await PlaybackLog.aggregate([
      {
        $match: {
          user: req.user._id,
          playlist: { $exists: true, $ne: null },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$playlist',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$playDuration' },
          avgCompletion: { $avg: '$completionPercentage' }
        }
      },
      {
        $lookup: {
          from: 'playlists',
          localField: '_id',
          foreignField: '_id',
          as: 'playlistDetails'
        }
      },
      {
        $unwind: '$playlistDetails'
      },
      {
        $sort: { playCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get playlist creation stats
    const playlistStats = await Playlist.aggregate([
      {
        $match: {
          owner: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPlaylists: { $sum: 1 },
          autoGenerated: { $sum: { $cond: ['$isAutoGenerated', 1, 0] } },
          publicPlaylists: { $sum: { $cond: ['$isPublic', 1, 0] } },
          avgSongsPerPlaylist: { $avg: { $size: '$songs' } },
          totalSongs: { $sum: { $size: '$songs' } }
        }
      }
    ]);

    // Get playlist engagement
    const playlistEngagement = await Playlist.find({ owner: req.user._id })
      .select('name playCount likes followers songs createdAt isAutoGenerated')
      .sort({ playCount: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        mostPlayedPlaylists,
        stats: playlistStats[0] || {
          totalPlaylists: 0,
          autoGenerated: 0,
          publicPlaylists: 0,
          avgSongsPerPlaylist: 0,
          totalSongs: 0
        },
        engagement: playlistEngagement,
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get playlist usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching playlist usage'
    });
  }
});

// @route   GET /api/analytics/game-performance
// @desc    Get game performance and mood improvement analytics
// @access  Private
router.get('/game-performance', authMiddleware, [
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

    // Get game performance by type
    const gamePerformance = await GameSession.aggregate([
      {
        $match: {
          user: req.user._id,
          completed: true,
          createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $lookup: {
          from: 'games',
          localField: 'game',
          foreignField: '_id',
          as: 'gameDetails'
        }
      },
      {
        $unwind: '$gameDetails'
      },
      {
        $group: {
          _id: '$gameDetails.type',
          totalSessions: { $sum: 1 },
          avgScore: { $avg: '$score' },
          avgDuration: { $avg: '$duration' },
          completionRate: { $avg: { $cond: ['$completed', 1, 0] } },
          moodImprovements: {
            $sum: {
              $cond: [
                { $gt: [{ $subtract: ['$moodAfter.intensity', '$moodBefore.intensity'] }, 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { totalSessions: -1 }
      }
    ]);

    // Get recent game sessions
    const recentSessions = await GameSession.find({ user: req.user._id })
      .populate('game', 'name type difficulty')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('game score completed duration moodBefore moodAfter createdAt achievements');

    // Get achievement stats
    const achievementStats = await GameSession.aggregate([
      {
        $match: {
          user: req.user._id,
          achievements: { $exists: true, $ne: [] },
          createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $unwind: '$achievements'
      },
      {
        $group: {
          _id: '$achievements',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        moodImprovement: moodImprovementStats[0] || {
          totalSessions: 0,
          avgMoodImprovement: 0,
          positiveImprovements: 0,
          maxImprovement: 0,
          minImprovement: 0
        },
        gamePerformance,
        recentSessions,
        achievements: achievementStats,
        period: {
          days: parseInt(days),
          startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get game performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching game performance'
    });
  }
});

// @route   GET /api/analytics/correlations
// @desc    Get correlations between mood, music, and activities
// @access  Private
router.get('/correlations', authMiddleware, [
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

    // Get mood-music correlations
    const moodMusicCorrelations = await PlaybackLog.aggregate([
      {
        $match: {
          user: req.user._id,
          'moodAtPlaytime.mood': { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'songs',
          localField: 'song',
          foreignField: '_id',
          as: 'songDetails'
        }
      },
      {
        $unwind: '$songDetails'
      },
      {
        $group: {
          _id: {
            mood: '$moodAtPlaytime.mood',
            genre: '$songDetails.genre'
          },
          playCount: { $sum: 1 },
          avgCompletion: { $avg: '$completionPercentage' },
          likeRate: { $avg: { $cond: ['$liked', 1, 0] } }
        }
      },
      {
        $sort: { playCount: -1 }
      }
    ]);

    // Get mood-game correlations
    const moodGameCorrelations = await GameSession.aggregate([
      {
        $match: {
          user: req.user._id,
          completed: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'games',
          localField: 'game',
          foreignField: '_id',
          as: 'gameDetails'
        }
      },
      {
        $unwind: '$gameDetails'
      },
      {
        $group: {
          _id: {
            moodBefore: '$moodBefore.mood',
            gameType: '$gameDetails.type'
          },
          sessionCount: { $sum: 1 },
          avgMoodImprovement: {
            $avg: { $subtract: ['$moodAfter.intensity', '$moodBefore.intensity'] }
          },
          successRate: {
            $avg: {
              $cond: [
                { $gt: [{ $subtract: ['$moodAfter.intensity', '$moodBefore.intensity'] }, 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { sessionCount: -1 }
      }
    ]);

    // Get time-based patterns
    const timeBasedPatterns = await MoodLog.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' }
        }
      },
      {
        $group: {
          _id: {
            hour: '$hour',
            dayOfWeek: '$dayOfWeek'
          },
          avgIntensity: { $avg: '$intensity' },
          moodCount: { $sum: 1 },
          commonMoods: { $push: '$mood' }
        }
      },
      {
        $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        moodMusicCorrelations,
        moodGameCorrelations,
        timeBasedPatterns,
        insights: {
          period: `${days} days`,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get correlations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching correlations'
    });
  }
});

module.exports = router;