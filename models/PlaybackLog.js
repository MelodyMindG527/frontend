const mongoose = require('mongoose');

const playbackLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true
  },
  playlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist',
    default: null
  },
  moodAtPlaytime: {
    mood: {
      type: String,
      enum: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'romantic', 'nostalgic']
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  playDuration: {
    type: Number, // in seconds
    default: 0
  },
  completionPercentage: {
    type: Number, // 0-100
    default: 0
  },
  skipped: {
    type: Boolean,
    default: false
  },
  skipReason: {
    type: String,
    enum: ['disliked', 'wrong_mood', 'poor_quality', 'heard_recently', 'other'],
    default: null
  },
  liked: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['recommendation', 'search', 'playlist', 'shuffle', 'manual'],
    required: true
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown'
  },
  sessionId: {
    type: String, // For grouping related playbacks
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
playbackLogSchema.index({ user: 1, createdAt: -1 });
playbackLogSchema.index({ song: 1, createdAt: -1 });
playbackLogSchema.index({ 'moodAtPlaytime.mood': 1 });
playbackLogSchema.index({ sessionId: 1 });

// Static method to get most played songs
playbackLogSchema.statics.getMostPlayedSongs = function(userId, limit = 10, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: "$song",
        playCount: { $sum: 1 },
        totalDuration: { $sum: "$playDuration" },
        avgCompletion: { $avg: "$completionPercentage" },
        likeCount: { $sum: { $cond: ["$liked", 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "songs",
        localField: "_id",
        foreignField: "_id",
        as: "songDetails"
      }
    },
    {
      $unwind: "$songDetails"
    },
    {
      $sort: { playCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get listening patterns by mood
playbackLogSchema.statics.getListeningPatternsByMood = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        'moodAtPlaytime.mood': { $exists: true }
      }
    },
    {
      $lookup: {
        from: "songs",
        localField: "song",
        foreignField: "_id",
        as: "songDetails"
      }
    },
    {
      $unwind: "$songDetails"
    },
    {
      $group: {
        _id: {
          mood: "$moodAtPlaytime.mood",
          genre: "$songDetails.genre"
        },
        playCount: { $sum: 1 },
        avgCompletion: { $avg: "$completionPercentage" }
      }
    },
    {
      $sort: { playCount: -1 }
    }
  ]);
};

// Static method to get daily listening stats
playbackLogSchema.statics.getDailyListeningStats = function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalPlays: { $sum: 1 },
        totalDuration: { $sum: "$playDuration" },
        uniqueSongs: { $addToSet: "$song" },
        avgCompletion: { $avg: "$completionPercentage" }
      }
    },
    {
      $addFields: {
        uniqueSongCount: { $size: "$uniqueSongs" }
      }
    },
    {
      $project: {
        uniqueSongs: 0
      }
    },
    {
      $sort: { "_id": 1 }
    }
  ]);
};

module.exports = mongoose.model('PlaybackLog', playbackLogSchema);