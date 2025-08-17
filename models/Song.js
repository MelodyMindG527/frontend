const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  artist: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true,
    maxlength: [100, 'Artist name cannot exceed 100 characters']
  },
  album: {
    type: String,
    trim: true,
    maxlength: [100, 'Album name cannot exceed 100 characters']
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    enum: ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'ambient', 'indie', 'alternative', 'metal', 'punk', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'other'],
    default: 'other'
  },
  moodTags: [{
    type: String,
    enum: ['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused', 'romantic', 'angry', 'peaceful', 'uplifting', 'nostalgic', 'mysterious', 'dramatic']
  }],
  language: {
    type: String,
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'instrumental'],
    default: 'en'
  },
  duration: {
    type: Number, // in seconds
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 second']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  coverImage: {
    type: String,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  playCount: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  tempo: {
    type: String,
    enum: ['slow', 'medium', 'fast'],
    default: 'medium'
  },
  energy: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  valence: {
    type: Number, // positivity/negativity
    min: 1,
    max: 10,
    default: 5
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
songSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
songSchema.index({ title: 'text', artist: 'text', album: 'text' });
songSchema.index({ genre: 1, moodTags: 1 });
songSchema.index({ uploadedBy: 1 });

// Increment play count
songSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  return this.save();
};

module.exports = mongoose.model('Song', songSchema);