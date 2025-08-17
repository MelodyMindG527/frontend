# MelodyMind Backend API

A comprehensive Node.js + Express backend for the MelodyMind AI-powered mood-based music player application.

## 🚀 Features

- **Authentication**: JWT-based user authentication with registration and login
- **Song Management**: Upload, manage, and recommend songs based on mood and preferences
- **Playlist System**: Create, manage, and auto-generate playlists
- **Mood Tracking**: Log and analyze mood patterns with multiple detection methods
- **Music Analytics**: Track listening habits and generate insights
- **Game System**: Mood upliftment games with session tracking and analytics
- **Comprehensive Analytics**: Dashboard analytics, trends, and correlations

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd melodymind-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/melodymind
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads/songs/
   ```

4. **Create upload directories**
   ```bash
   mkdir -p uploads/songs
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "preferences": {
    "language": "en",
    "theme": "light",
    "detectionMode": "auto"
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <jwt_token>
```

### Song Endpoints

#### Upload Song
```http
POST /songs/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "audioFile": <file>,
  "title": "Song Title",
  "artist": "Artist Name",
  "genre": "pop",
  "moodTags": ["happy", "energetic"],
  "duration": 180,
  "language": "en"
}
```

#### Get Songs
```http
GET /songs?mood=happy&genre=pop&page=1&limit=20
Authorization: Bearer <jwt_token>
```

#### Get Song Recommendations
```http
GET /songs/recommendations?mood=happy&energy=8&limit=10
Authorization: Bearer <jwt_token>
```

### Playlist Endpoints

#### Create Playlist
```http
POST /playlists
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My Playlist",
  "description": "A great playlist",
  "isPublic": false
}
```

#### Auto-Generate Playlist
```http
GET /playlists/auto-generate?mood=happy&tempo=fast&limit=20
Authorization: Bearer <jwt_token>
```

#### Add Song to Playlist
```http
POST /playlists/:id/songs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "songId": "song_id_here"
}
```

### Mood Endpoints

#### Log Mood
```http
POST /moods
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "mood": "happy",
  "intensity": 8,
  "detectionMethod": "camera",
  "confidence": 0.85,
  "notes": "Feeling great today!",
  "context": {
    "activity": "work",
    "location": "office"
  }
}
```

#### Get Mood History
```http
GET /moods?page=1&limit=20&startDate=2024-01-01
Authorization: Bearer <jwt_token>
```

#### Get Mood Trends
```http
GET /moods/trends?days=7
Authorization: Bearer <jwt_token>
```

### Game Endpoints

#### Get Available Games
```http
GET /games?type=mood-upliftment&difficulty=easy
Authorization: Bearer <jwt_token>
```

#### Start Game Session
```http
POST /games/:id/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "moodBefore": {
    "mood": "sad",
    "intensity": 4
  },
  "difficulty": "easy"
}
```

#### Complete Game Session
```http
PUT /games/sessions/:sessionId/complete
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "moodAfter": {
    "mood": "happy",
    "intensity": 7
  },
  "score": 850,
  "maxScore": 1000
}
```

### Analytics Endpoints

#### Get Dashboard Analytics
```http
GET /analytics/dashboard?days=30
Authorization: Bearer <jwt_token>
```

#### Get Mood Trends
```http
GET /analytics/mood-trends?days=30&groupBy=day
Authorization: Bearer <jwt_token>
```

#### Get Listening Patterns
```http
GET /analytics/listening-patterns?days=30
Authorization: Bearer <jwt_token>
```

## 🗂️ Project Structure

```
melodymind-backend/
├── config/
│   └── db.js                 # MongoDB connection
├── middleware/
│   └── authMiddleware.js     # JWT authentication middleware
├── models/
│   ├── User.js              # User model
│   ├── Song.js              # Song model
│   ├── Playlist.js          # Playlist model
│   ├── MoodLog.js           # Mood log model
│   ├── PlaybackLog.js       # Playback log model
│   ├── Game.js              # Game model
│   └── GameSession.js       # Game session model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── songs.js             # Song management routes
│   ├── playlists.js         # Playlist routes
│   ├── moods.js             # Mood tracking routes
│   ├── analytics.js         # Analytics routes
│   └── games.js             # Game routes
├── uploads/
│   └── songs/               # Uploaded song files
├── .env.example             # Environment variables template
├── server.js                # Main server file
└── package.json             # Dependencies and scripts
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/melodymind` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRE` | JWT token expiration time | `7d` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `MAX_FILE_SIZE` | Maximum file upload size | `10485760` (10MB) |
| `UPLOAD_PATH` | Path for uploaded files | `./uploads/songs/` |

## 🧪 Testing

Test the API endpoints using tools like:

- **Postman**: Import the API collection
- **curl**: Command line testing
- **Thunder Client**: VS Code extension

### Example curl commands:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

### Production Setup

1. **Set environment to production**
   ```bash
   NODE_ENV=production
   ```

2. **Use a process manager**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "melodymind-backend"
   ```

3. **Set up reverse proxy** (nginx example)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configured for frontend domain
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: File type and size restrictions
- **Helmet.js**: Security headers

## 📊 Database Schema

### Users
- Authentication and user preferences
- Profile information and settings

### Songs
- Audio file metadata and storage
- Mood tags and genre classification
- Play counts and user ratings

### Playlists
- User-created and auto-generated playlists
- Song collections with metadata

### Mood Logs
- Mood detection history
- Context and trigger information
- Detection method tracking

### Playback Logs
- Listening history and patterns
- Song completion rates
- Mood-music correlations

### Games & Game Sessions
- Available mood upliftment games
- User game sessions and scores
- Mood improvement tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Email: support@melodymind.com

---

**MelodyMind Backend** - Powering AI-driven mood-based music experiences 🎵🤖