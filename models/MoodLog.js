const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mood: {
    type: String,
    required: [true, 'Mood is required'],
    enum: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'angry', 'peaceful', 'romantic', 'nostalgic']
  },
  intensity: {
    type: Number,
    required: [true, 'Mood intensity is required'],
    min: [1, 'Intensity must be between 1 and 10'],
    max: [10, 'Intensity must be between 1 and 10']
  },
  detectionMethod: {
    type: String,
    required: [true, 'Detection method is required'],
    enum: ['camera', 'voice', 'text', 'manual', 'activity', 'journal']
  },
  confidence: {
    type: Number,
    min: [0, 'Confidence must be between 0 and 1'],
    max: [1, 'Confidence must be between 0 and 1'],
    default: 1.0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  context: {
    location: {
      type: String,
      trim: true
    },
    activity: {
      type: String,
      trim: true
    },
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'unknown'],
      default: 'unknown'
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      required: true
    }
  },
  triggers: [{
    type: String,
    enum: ['work', 'family', 'friends', 'health', 'money', 'relationship', 'achievement', 'loss', 'stress', 'exercise', 'music', 'nature', 'other']
  }],
  previousMood: {
    mood: String,
    intensity: Number,
    timestamp: Date
  },
  sessionId: {
    type: String, // For grouping related mood detections
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
moodLogSchema.index({ user: 1, createdAt: -1 });
moodLogSchema.index({ mood: 1, createdAt: -1 });
moodLogSchema.index({ detectionMethod: 1 });

// Virtual for getting time of day based on timestamp
moodLogSchema.pre('save', function(next) {
  if (!this.context.timeOfDay) {
    const hour = new Date(this.createdAt).getHours();
    if (hour >= 5 && hour < 12) {
      this.context.timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      this.context.timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      this.context.timeOfDay = 'evening';
    } else {
      this.context.timeOfDay = 'night';
    }
  }
  next();
});

// Static method to get mood trends
moodLogSchema.statics.getMoodTrends = function(userId, days = 7) {
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
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          mood: "$mood"
        },
        avgIntensity: { $avg: "$intensity" },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.date": 1 }
    }
  ]);
};

// Static method to get most common moods
moodLogSchema.statics.getMoodFrequency = function(userId, days = 30) {
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
        _id: "$mood",
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('MoodLog', moodLogSchema);