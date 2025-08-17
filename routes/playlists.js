const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/playlists
// @desc    Create a new playlist
// @access  Private
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
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
      name,
      description,
      isPublic = false,
      tags = [],
      coverImage
    } = req.body;

    const playlist = new Playlist({
      name,
      description,
      owner: req.user._id,
      isPublic,
      tags,
      coverImage
    });

    await playlist.save();

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      data: { playlist }
    });

  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating playlist'
    });
  }
});

// @route   GET /api/playlists
// @desc    Get playlists (user's own + public playlists)
// @access  Private
router.get('/', authMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['name', 'createdAt', 'playCount', 'songCount']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      onlyMine = false
    } = req.query;

    // Build filter
    let filter = {};
    
    if (onlyMine === 'true') {
      filter.owner = req.user._id;
    } else {
      filter = {
        $or: [
          { owner: req.user._id },
          { isPublic: true }
        ]
      };
    }

    // Add text search if provided
    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    if (sortBy === 'songCount') {
      // For songCount, we need to use aggregation
      const playlists = await Playlist.aggregate([
        { $match: filter },
        {
          $addFields: {
            songCount: { $size: '$songs' }
          }
        },
        { $sort: { songCount: sortOrder === 'desc' ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner',
            pipeline: [{ $project: { name: 1, avatar: 1 } }]
          }
        },
        { $unwind: '$owner' },
        {
          $lookup: {
            from: 'songs',
            localField: 'songs.song',
            foreignField: '_id',
            as: 'songDetails'
          }
        }
      ]);

      const total = await Playlist.countDocuments(filter);

      return res.json({
        success: true,
        data: {
          playlists,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const playlists = await Playlist.find(filter)
      .populate('owner', 'name avatar')
      .populate('songs.song', 'title artist duration coverImage')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Playlist.countDocuments(filter);

    res.json({
      success: true,
      data: {
        playlists,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching playlists'
    });
  }
});

// @route   GET /api/playlists/auto-generate
// @desc    Auto-generate playlist based on mood/tempo/genre
// @access  Private
router.get('/auto-generate', authMiddleware, [
  query('mood').optional().isIn(['happy', 'sad', 'energetic', 'calm', 'anxious', 'excited', 'melancholic', 'focused']),
  query('tempo').optional().isIn(['slow', 'medium', 'fast']),
  query('genre').optional().isIn(['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'folk', 'blues', 'reggae', 'ambient', 'indie', 'alternative', 'metal', 'punk', 'r&b', 'soul', 'funk', 'disco', 'house', 'techno', 'trance', 'dubstep', 'other']),
  query('limit').optional().isInt({ min: 5, max: 50 })
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
      tempo,
      genre,
      limit = 20
    } = req.query;

    // Build filter for songs
    const songFilter = {
      $or: [
        { isPublic: true },
        { uploadedBy: req.user._id }
      ]
    };

    if (mood) songFilter.moodTags = mood;
    if (tempo) songFilter.tempo = tempo;
    if (genre) songFilter.genre = genre;

    // Get songs matching criteria
    const songs = await Song.find(songFilter)
      .sort({ playCount: -1, likes: -1 })
      .limit(parseInt(limit));

    if (songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No songs found matching the criteria'
      });
    }

    // Generate playlist name
    let playlistName = 'Auto-Generated Playlist';
    if (mood) playlistName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} Mix`;
    if (tempo) playlistName += ` (${tempo.charAt(0).toUpperCase() + tempo.slice(1)} Tempo)`;
    if (genre) playlistName += ` - ${genre.charAt(0).toUpperCase() + genre.slice(1)}`;

    // Create auto-generated playlist
    const playlist = new Playlist({
      name: playlistName,
      description: `Automatically generated playlist based on your preferences`,
      owner: req.user._id,
      songs: songs.map(song => ({ song: song._id })),
      isAutoGenerated: true,
      generatedFor: {
        mood,
        tempo,
        genre
      },
      isPublic: false
    });

    await playlist.save();
    await playlist.populate('songs.song', 'title artist duration coverImage');

    res.json({
      success: true,
      message: 'Playlist auto-generated successfully',
      data: { playlist }
    });

  } catch (error) {
    console.error('Auto-generate playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error auto-generating playlist'
    });
  }
});

// @route   GET /api/playlists/:id
// @desc    Get single playlist by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('owner', 'name avatar')
      .populate('songs.song', 'title artist album duration coverImage genre moodTags');

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if user has access to this playlist
    if (!playlist.isPublic && playlist.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this playlist'
      });
    }

    res.json({
      success: true,
      data: { playlist }
    });

  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching playlist'
    });
  }
});

// @route   PUT /api/playlists/:id
// @desc    Update playlist details
// @access  Private
router.put('/:id', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Playlist name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
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

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if user owns this playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own playlists'
      });
    }

    const allowedUpdates = ['name', 'description', 'isPublic', 'tags', 'coverImage'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(playlist, updates);
    await playlist.save();

    res.json({
      success: true,
      message: 'Playlist updated successfully',
      data: { playlist }
    });

  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating playlist'
    });
  }
});

// @route   DELETE /api/playlists/:id
// @desc    Delete a playlist
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if user owns this playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own playlists'
      });
    }

    await Playlist.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting playlist'
    });
  }
});

// @route   POST /api/playlists/:id/songs
// @desc    Add song to playlist
// @access  Private
router.post('/:id/songs', authMiddleware, [
  body('songId')
    .isMongoId()
    .withMessage('Valid song ID is required')
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

    const { songId } = req.body;

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if user owns this playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own playlists'
      });
    }

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found'
      });
    }

    // Check if user has access to this song
    if (!song.isPublic && song.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this song'
      });
    }

    await playlist.addSong(songId);
    await playlist.populate('songs.song', 'title artist duration coverImage');

    res.json({
      success: true,
      message: 'Song added to playlist successfully',
      data: { playlist }
    });

  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding song to playlist'
    });
  }
});

// @route   DELETE /api/playlists/:id/songs/:songId
// @desc    Remove song from playlist
// @access  Private
router.delete('/:id/songs/:songId', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    // Check if user owns this playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own playlists'
      });
    }

    await playlist.removeSong(req.params.songId);
    await playlist.populate('songs.song', 'title artist duration coverImage');

    res.json({
      success: true,
      message: 'Song removed from playlist successfully',
      data: { playlist }
    });

  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing song from playlist'
    });
  }
});

// @route   POST /api/playlists/:id/play
// @desc    Increment play count for a playlist
// @access  Private
router.post('/:id/play', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    await playlist.incrementPlayCount();

    res.json({
      success: true,
      message: 'Play count updated',
      data: { playCount: playlist.playCount }
    });

  } catch (error) {
    console.error('Update playlist play count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating play count'
    });
  }
});

// @route   POST /api/playlists/:id/follow
// @desc    Follow/unfollow a public playlist
// @access  Private
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found'
      });
    }

    if (!playlist.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Cannot follow private playlists'
      });
    }

    const isFollowing = playlist.followers.includes(req.user._id);

    if (isFollowing) {
      // Unfollow
      playlist.followers = playlist.followers.filter(
        followerId => followerId.toString() !== req.user._id.toString()
      );
    } else {
      // Follow
      playlist.followers.push(req.user._id);
    }

    await playlist.save();

    res.json({
      success: true,
      message: isFollowing ? 'Playlist unfollowed' : 'Playlist followed',
      data: {
        isFollowing: !isFollowing,
        followerCount: playlist.followers.length
      }
    });

  } catch (error) {
    console.error('Follow playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following playlist'
    });
  }
});

module.exports = router;