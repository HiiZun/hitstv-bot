import { Client, GatewayIntentBits, ActivityType, EmbedBuilder } from 'discord.js';
import { config } from 'dotenv';
import db from './database/index.js';
import { loadCommands, handleInteraction } from './handlers/commandHandler.js';
import { VoiceManager } from './services/voiceManager.js';
import { RadioService } from './services/radioService.js';
import { deployCommands } from './deploy-commands.js';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'DEVELOPER_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

// Initialize services
const radioService = new RadioService();

// Set up client ready event
client.once('ready', async () => {
  console.log(`🎵 ${client.user.tag} is online!`);
  
  // Set bot status with current playing info
  const updateStatus = async () => {
    try {
      const currentSong = await radioService.getCurrentSongTitle();
      const stats = await radioService.getDetailedStats();
      
      if (stats) {
        // Show current song in activity
        client.user.setActivity(`🎵 ${currentSong}`, { 
          type: ActivityType.Listening,
          url: 'https://radio.hiizun.fr'
        });
        
        // Log current playing info
        console.log(`🎵 Now Playing: ${currentSong}`);
        console.log(`👥 Listeners: ${stats.totalListeners} | 📊 Position: ${stats.position}`);
      } else {
        client.user.setActivity('🎵 HiiZun Radio', { 
          type: ActivityType.Listening,
          url: 'https://radio.hiizun.fr'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      client.user.setActivity('🎵 HiiZun Radio', { type: ActivityType.Listening });
    }
  };
  
  // Update status immediately and then every 15 seconds for more real-time updates
  await updateStatus();
  setInterval(updateStatus, 15000);
  
  // Initialize voice manager
  client.voiceManager = new VoiceManager(client);
  
  // Manually trigger reconnection since we're already ready
  client.voiceManager.reconnectToChannels();
  
  console.log(`Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);
});

// Handle interactions
client.on('interactionCreate', handleInteraction);

// Handle guild join
client.on('guildCreate', async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  
  try {
    // Send welcome message to system channel if available
    if (guild.systemChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎵 Thanks for adding HiiZun Radio Bot!')
        .setDescription('I can stream music from HiiZun radio station to your voice channels.')
        .addFields([
          {
            name: '🚀 Getting Started',
            value: 'Use `/setup` to configure a voice channel for streaming.',
            inline: false
          },
          {
            name: '📋 Commands',
            value: [
              '`/setup` - Set up radio streaming',
              '`/stop` - Stop radio streaming',
              '`/status` - Check current song and status',
              '`/stats` - View detailed radio statistics',
              '`/volume` - Adjust volume (0-100)'
            ].join('\n'),
            inline: false
          },
          {
            name: '🔐 Permissions',
            value: 'Users need **Manage Channels** permission to use radio commands.',
            inline: false
          }
        ])
        .setFooter({ text: 'Enjoy the music! 🎶' })
        .setTimestamp();

      await guild.systemChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`Error sending welcome message to ${guild.name}:`, error);
  }
});

// Handle guild leave
client.on('guildDelete', (guild) => {
  console.log(`Left guild: ${guild.name} (${guild.id})`);
});

// Handle voice state updates (for connection monitoring)
client.on('voiceStateUpdate', (oldState, newState) => {
  const botId = client.user.id;
  
  // If bot was disconnected from voice channel
  if (oldState.id === botId && oldState.channelId && !newState.channelId) {
    console.log(`Bot was disconnected from voice channel in guild ${oldState.guild.name}`);
    
    // Clean up connection
    if (client.voiceManager) {
      client.voiceManager.leaveVoiceChannel(oldState.guild.id);
    }
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  // Disconnect from all voice channels
  if (client.voiceManager) {
    const activeConnections = client.voiceManager.getActiveConnections();
    for (const guildId of activeConnections) {
      client.voiceManager.leaveVoiceChannel(guildId);
    }
  }
  
  // Close database connection
  await db.destroy();
  
  // Destroy Discord client
  client.destroy();
  
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Initialize database and start bot
async function start() {
  try {
    console.log('🔧 Initializing database...');
    
    // Run migrations
    await db.migrate.latest();
    console.log('✅ Database migrations completed');
    
    // Deploy commands to Discord
    console.log('🚀 Deploying commands...');
    await deployCommands();
    console.log('✅ Commands deployed successfully');
    
    // Load commands
    console.log('📝 Loading commands...');
    await loadCommands(client);
    
    // Login to Discord
    console.log('🔐 Logging in to Discord...');
    await client.login(process.env.DISCORD_TOKEN);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the bot
start();
