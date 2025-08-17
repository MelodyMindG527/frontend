const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  moodBefore: {
    mood: {
      type: String,
      enum: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'stressed', 'bored', 'lonely', 'overwhelmed'],
      required: true
    },
    intensity: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    }
  },
  moodAfter: {
    mood: {
      type: String,
      enum: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'stressed', 'bored', 'lonely', 'overwhelmed'],
      default: null
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10,
      default: null
    }
  },
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completionPercentage: {
    type: Number, // 0-100
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  gameData: {
    type: mongoose.Schema.Types.Mixed, // Store game-specific data
    default: {}
  },
  achievements: [{
    type: String,
    enum: ['first-play', 'perfect-score', 'quick-finish', 'mood-improver', 'streak-3', 'streak-7', 'high-scorer']
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [500, 'Feedback cannot exceed 500 characters']
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
gameSessionSchema.index({ user: 1, createdAt: -1 });
gameSessionSchema.index({ game: 1, createdAt: -1 });
gameSessionSchema.index({ sessionId: 1 });
gameSessionSchema.index({ completed: 1 });

// Virtual for mood improvement
gameSessionSchema.virtual('moodImprovement').get(function() {
  if (!this.moodAfter.intensity || !this.moodBefore.intensity) {
    return null;
  }
  return this.moodAfter.intensity - this.moodBefore.intensity;
});

// Method to complete session
gameSessionSchema.methods.completeSession = function(moodAfter, score, gameData = {}) {
  this.moodAfter = moodAfter;
  this.score = score;
  this.completed = true;
  this.completedAt = new Date();
  this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  this.gameData = { ...this.gameData, ...gameData };
  this.completionPercentage = 100;
  
  // Calculate achievements
  this.calculateAchievements();
  
  return this.save();
};

// Method to calculate achievements
gameSessionSchema.methods.calculateAchievements = function() {
  const achievements = [];
  
  // First play achievement
  if (this.gameData.isFirstPlay) {
    achievements.push('first-play');
  }
  
  // Perfect score achievement
  if (this.score === this.maxScore && this.maxScore > 0) {
    achievements.push('perfect-score');
  }
  
  // Quick finish achievement (completed in less than expected time)
  if (this.duration < (this.gameData.expectedDuration || 300)) {
    achievements.push('quick-finish');
  }
  
  // Mood improver achievement
  if (this.moodImprovement && this.moodImprovement >= 2) {
    achievements.push('mood-improver');
  }
  
  // High scorer achievement
  if (this.score > (this.gameData.averageScore || 0) * 1.5) {
    achievements.push('high-scorer');
  }
  
  this.achievements = achievements;
};

// Static method to get user's game history
gameSessionSchema.statics.getUserGameHistory = function(userId, limit = 20) {
  return this.find({ user: userId })
    .populate('game', 'name type difficulty')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get mood improvement stats
gameSessionSchema.statics.getMoodImprovementStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        completed: true,
        createdAt: { $gte: startDate },
        'moodAfter.intensity': { $exists: true }
      }
    },
    {
      $addFields: {
        moodImprovement: {
          $subtract: ['$moodAfter.intensity', '$moodBefore.intensity']
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgMoodImprovement: { $avg: '$moodImprovement' },
        positiveImprovements: {
          $sum: { $cond: [{ $gt: ['$moodImprovement', 0] }, 1, 0] }
        },
        maxImprovement: { $max: '$moodImprovement' },
        minImprovement: { $min: '$moodImprovement' }
      }
    }
  ]);
};

// Static method to get game performance stats
gameSessionSchema.statics.getGamePerformanceStats = function(gameId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        game: mongoose.Types.ObjectId(gameId),
        completed: true,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgScore: { $avg: '$score' },
        avgDuration: { $avg: '$duration' },
        completionRate: { $avg: { $cond: ['$completed', 1, 0] } },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
};

module.exports = mongoose.model('GameSession', gameSessionSchema);