# HiiZun Radio Discord Bot

A Discord.js v14 bot that streams music from HiiZun radio station to multiple Discord servers simultaneously.

## Features

- 🎵 Stream audio from HiiZun radio station to Discord voice channels
- 🔊 Volume control (0-100%)
- 📊 Real-time status updates showing current song and radio information
- � Detailed statistics including listener count, playlist info, and technical data
- 🎭 Dynamic bot activity showing currently playing song
- �🗄️ SQLite database with Knex.js for managing streaming channels
- 🔐 Permission-based commands (Manage Channels required)
- 🛠️ Comprehensive developer commands for bot management
- 🎛️ Slash commands and modern Discord features
- 🔄 Automatic reconnection on bot restart
- 📱 Beautiful embedded messages with rich information
- 🌐 Multi-server support with individual channel management
- ⚡ Real-time updates every 15 seconds
- 🎨 Color-coded status indicators
- 📡 Live radio API integration

## Commands

### Regular Commands
- `/setup <channel>` - Set up radio streaming for a voice channel
- `/stop` - Stop radio streaming in the current server
- `/status` - Check current radio status and now playing information
- `/stats` - View detailed radio statistics and technical information
- `/volume <level>` - Adjust radio volume (0-100)

### Developer Commands
- `/dev-stats` - View comprehensive bot statistics and system information
- `/dev-restart <action>` - Restart/disconnect/reconnect voice connections

## Setup Instructions

### Method 1: Docker (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- Discord Application with Bot Token
- External MariaDB/MySQL database

#### Quick Start (External Database)
```bash
# 1. Copy environment template
cp .env.docker .env

# 2. Edit .env with your Discord credentials and database URL
# Set DATABASE_URL=mysql://user:pass@host:port/database

# 3. Start the bot
docker-compose up -d
```

#### Alternative: With Bundled MariaDB
```bash
# 1. Copy bundled database template
cp .env.withdb.example .env

# 2. Edit .env with your credentials

# 3. Start with bundled MariaDB
docker-compose -f docker-compose.withdb.yml up -d
```

### Method 2: Manual Installation

#### Prerequisites
- Node.js 18.0.0 or higher
- Discord Application with Bot Token
- FFmpeg installed on your system

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your Discord bot credentials:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
DEVELOPER_ID=your_discord_user_id_here

# Radio Stream Configuration (pre-configured for HiiZun)
RADIO_STREAM_URL=https://radio.hiizun.fr/stream.mp4?at=AT_MGS0101
RADIO_STATUS_URL=https://radio.hiizun.fr/status?at=AT_MGS0101
ACCESS_TOKEN=AT_MGS0101

# Database
DATABASE_URL=./database.sqlite
```

### 4. Database Setup
```bash
npm run migrate
```

### 5. Start the Bot
Commands are automatically deployed on startup, so you can start immediately:
```bash
npm start
# or for development with auto-restart
npm run dev
```

## Discord Bot Setup

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and create a bot
4. Copy the bot token for your `.env` file
5. Copy the Application ID for `CLIENT_ID` in `.env`

### 2. Bot Permissions
The bot needs the following permissions:
- **View Channels**
- **Connect** (to voice channels)
- **Speak** (in voice channels)
- **Use Slash Commands**

### 3. Invite Bot to Server
Use this invite link format (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
```

## Project Structure

```
hitstv-bot/
├── src/
│   ├── commands/           # Slash commands
│   │   ├── setup.js
│   │   ├── stop.js
│   │   ├── status.js
│   │   ├── stats.js
│   │   ├── volume.js
│   │   ├── dev-stats.js
│   │   └── dev-restart.js
│   ├── database/
│   │   ├── migrations/     # Database migrations
│   │   └── index.js        # Database connection
│   ├── handlers/
│   │   └── commandHandler.js
│   ├── models/
│   │   └── index.js        # Database models
│   ├── services/
│   │   ├── radioService.js # Radio stream handling
│   │   └── voiceManager.js # Voice connection management
│   ├── utils/
│   │   └── permissions.js  # Permission utilities
│   ├── deploy-commands.js  # Command deployment
│   └── index.js           # Main bot file
├── Dockerfile             # Docker image configuration
├── docker-compose.yml     # Docker Compose (development)
├── docker-compose.prod.yml # Docker Compose (production)
├── docker.sh             # Docker management script (Linux/Mac)
├── docker.bat            # Docker management script (Windows)
├── .dockerignore         # Docker ignore file
├── .env.docker.example   # Docker environment template
├── package.json
├── knexfile.js           # Knex configuration
└── README.md
```

## Database Schema

### streaming_channels
- `id` - Primary key
- `guild_id` - Discord guild ID
- `channel_id` - Discord voice channel ID
- `guild_name` - Guild name for reference
- `channel_name` - Channel name for reference
- `added_by` - User ID who set up the channel
- `created_at` - Timestamp
- `updated_at` - Timestamp

### bot_settings
- `id` - Primary key
- `key` - Setting key
- `value` - Setting value
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Usage

1. **Invite the bot** to your Discord server with the proper permissions
2. **Use `/setup`** to configure a voice channel for streaming
3. **The bot will automatically join** and start streaming HiiZun radio
4. **Use `/status`** to see what's currently playing
5. **Use `/volume`** to adjust the volume
6. **Use `/stop`** to stop streaming and remove configuration

## Permissions

- **Regular users**: Can use `/status` to check what's playing
- **Manage Channels permission**: Can use all radio commands
- **Developer**: Has access to all commands including developer tools

## Technical Details

- **Discord.js v14** with latest voice support
- **SQLite database** with Knex.js migrations
- **Automatic reconnection** on bot restart
- **Error handling** and graceful shutdown
- **Memory efficient** streaming
- **Real-time status updates** from radio API

## Troubleshooting

### Docker Build Issues

#### @discordjs/opus compilation errors
If you encounter errors with `@discordjs/opus` during Docker build, the Dockerfile automatically removes this dependency during the build process. The bot works perfectly without it - opus is only an audio encoding optimization package.

The Dockerfile uses a clean Alpine Linux approach:
- Installs only FFmpeg (required for audio processing)
- Removes the problematic `@discordjs/opus` dependency
- Installs all other dependencies normally

This ensures a reliable, lightweight build every time.

### Bot doesn't join voice channel
- Check bot permissions in the voice channel
- Ensure bot has Connect and Speak permissions
- Verify the voice channel exists and bot can see it

### Audio not playing
- Ensure FFmpeg is installed and accessible
- Check if the radio stream URL is accessible
- Verify Discord voice connection is stable

### Commands not working
- Commands are automatically deployed on bot startup
- Check bot has application command permissions
- Verify user has required permissions

### Permissions errors in production
If you see `member.permissions.has is not a function` errors:
- This is automatically handled by fetching full member objects
- The bot will fall back to fetching member data if partial objects are received
- This commonly happens in production environments with large servers

## Support

For issues or questions, check the console logs for error messages. The bot includes comprehensive error handling and logging.

## License

MIT License
