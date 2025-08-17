const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: [true, 'Game ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Game name is required'],
    trim: true,
    maxlength: [100, 'Game name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Game type is required'],
    enum: ['mood-upliftment', 'memory', 'rhythm', 'puzzle', 'breathing', 'meditation', 'cognitive', 'social']
  },
  category: {
    type: String,
    enum: ['quick', 'medium', 'long', 'challenge'],
    default: 'quick'
  },
  description: {
    type: String,
    required: [true, 'Game description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  instructions: [{
    step: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [200, 'Instruction text cannot exceed 200 characters']
    }
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: [true, 'Estimated duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  targetMoods: [{
    type: String,
    enum: ['sad', 'anxious', 'stressed', 'angry', 'lonely', 'bored', 'tired', 'overwhelmed']
  }],
  benefits: [{
    type: String,
    enum: ['stress-relief', 'mood-boost', 'focus', 'relaxation', 'energy', 'confidence', 'mindfulness', 'social-connection']
  }],
  minPlayers: {
    type: Number,
    default: 1,
    min: 1
  },
  maxPlayers: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  icon: {
    type: String,
    default: null
  },
  thumbnail: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  playCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
gameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
gameSchema.index({ gameId: 1 });
gameSchema.index({ type: 1, isActive: 1 });
gameSchema.index({ targetMoods: 1 });
gameSchema.index({ difficulty: 1 });

// Method to increment play count
gameSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  return this.save();
};

// Method to update rating
gameSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.averageRating * this.ratingCount) + newRating;
  this.ratingCount += 1;
  this.averageRating = totalRating / this.ratingCount;
  return this.save();
};

// Static method to get games by mood
gameSchema.statics.getGamesByMood = function(mood) {
  return this.find({
    targetMoods: mood,
    isActive: true
  }).sort({ averageRating: -1, playCount: -1 });
};

// Static method to get popular games
gameSchema.statics.getPopularGames = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ playCount: -1, averageRating: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Game', gameSchema);