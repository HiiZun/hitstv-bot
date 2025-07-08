import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} from '@discordjs/voice';
import { RadioService } from './radioService.js';
import { StreamingChannelModel } from '../models/index.js';

export class VoiceManager {
  constructor(client) {
    this.client = client;
    this.radioService = new RadioService();
    this.connections = new Map(); // guildId -> { connection, player }
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Handle bot ready event
    this.client.once('ready', () => {
      this.reconnectToChannels();
    });

    // Handle guild deletion
    this.client.on('guildDelete', (guild) => {
      this.leaveVoiceChannel(guild.id);
      StreamingChannelModel.delete(guild.id);
    });
  }

  /**
   * Reconnect to all configured voice channels on bot startup
   */
  async reconnectToChannels() {
    try {
      const channels = await StreamingChannelModel.findAll();
      console.log(`Reconnecting to ${channels.length} voice channels...`);

      for (const channel of channels) {
        const guild = this.client.guilds.cache.get(channel.guild_id);
        if (!guild) {
          console.log(`Guild ${channel.guild_id} not found, removing from database`);
          await StreamingChannelModel.delete(channel.guild_id);
          continue;
        }

        const voiceChannel = guild.channels.cache.get(channel.channel_id);
        if (!voiceChannel) {
          console.log(`Voice channel ${channel.channel_id} not found in guild ${guild.name}`);
          continue;
        }

        // Add delay between connections to avoid overwhelming Discord
        if (channels.indexOf(channel) > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
          await this.joinVoiceChannel(voiceChannel);
          console.log(`✅ Reconnected to ${voiceChannel.name} in ${guild.name}`);
        } catch (error) {
          console.error(`❌ Failed to reconnect to ${voiceChannel.name} in ${guild.name}:`, error.message);
          
          // Schedule a retry after 30 seconds
          setTimeout(() => {
            console.log(`🔄 Retrying connection to ${voiceChannel.name} in ${guild.name}...`);
            this.rejoinChannel(channel.guild_id);
          }, 30000);
        }
      }
    } catch (error) {
      console.error('Error reconnecting to voice channels:', error);
    }
  }

  /**
   * Join a voice channel and start streaming
   */
  async joinVoiceChannel(voiceChannel) {
    try {
      console.log(`Attempting to join voice channel: ${voiceChannel.name} in ${voiceChannel.guild.name}`);
      
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      // Wait for connection to be ready with a longer timeout
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 60_000); // Increased timeout to 60 seconds
      } catch (error) {
        console.error(`Connection timeout for ${voiceChannel.guild.name}, attempting to destroy and retry...`);
        connection.destroy();
        throw error;
      }

      // Create audio player
      const player = createAudioPlayer();
      
      // Subscribe connection to player
      connection.subscribe(player);

      // Store connection and player
      this.connections.set(voiceChannel.guild.id, { 
        connection, 
        player, 
        channelId: voiceChannel.id,
        restarting: false,
        isStreaming: false
      });

      // Setup error handling
      this.setupConnectionErrorHandling(connection, player, voiceChannel.guild.id);

      // Start playing radio stream
      await this.startStreaming(voiceChannel.guild.id);

      console.log(`Successfully connected to ${voiceChannel.name} in ${voiceChannel.guild.name}`);
      return { connection, player };
      
    } catch (error) {
      console.error(`Error joining voice channel in ${voiceChannel.guild.name}:`, error);
      
      // Clean up any partial connection
      const existingConnection = getVoiceConnection(voiceChannel.guild.id);
      if (existingConnection) {
        existingConnection.destroy();
      }
      
      throw error;
    }
  }

  /**
   * Setup error handling for voice connection and audio player
   */
  setupConnectionErrorHandling(connection, player, guildId) {
    connection.on('error', (error) => {
      console.error(`Voice connection error in guild ${guildId}:`, error.message);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
      try {
        // Try to reconnect within 5 seconds
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log(`Reconnected voice connection for guild ${guildId}`);
      } catch (error) {
        console.log(`Voice connection lost for guild ${guildId}, scheduling rejoin...`);
        this.connections.delete(guildId);
        
        // Try to rejoin after a delay
        setTimeout(() => {
          this.rejoinChannel(guildId);
        }, 10000); // Increased delay to 10 seconds
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log(`Voice connection destroyed for guild ${guildId}`);
      this.connections.delete(guildId);
    });

    player.on('error', (error) => {
      console.error(`Audio player error in guild ${guildId}:`, error.message);
      // Try to restart streaming after a delay
      setTimeout(() => {
        if (this.connections.has(guildId)) {
          console.log(`Restarting audio stream for guild ${guildId} after error...`);
          this.startStreaming(guildId);
        }
      }, 5000);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log(`Player idle in guild ${guildId}, checking stream health...`);
      
      const connectionData = this.connections.get(guildId);
      if (!connectionData) return;
      
      // Only restart if we're not already trying to restart
      if (!connectionData.restarting) {
        connectionData.restarting = true;
        
        // Wait much longer before restarting to avoid spam and allow for natural buffering
        setTimeout(() => {
          if (this.connections.has(guildId)) {
            const currentConnectionData = this.connections.get(guildId);
            // Double check we're still idle and not playing
            if (currentConnectionData && currentConnectionData.player.state.status === AudioPlayerStatus.Idle) {
              currentConnectionData.restarting = false;
              console.log(`Restarting stream for guild ${guildId} after extended idle...`);
              this.startStreaming(guildId);
            } else {
              currentConnectionData.restarting = false;
              console.log(`Stream recovered naturally for guild ${guildId}, cancelling restart`);
            }
          }
        }, 10000); // Increased from 3 seconds to 10 seconds
      }
    });

    player.on(AudioPlayerStatus.Playing, () => {
      console.log(`✅ Player started playing in guild ${guildId}`);
      const connectionData = this.connections.get(guildId);
      if (connectionData) {
        connectionData.restarting = false;
      }
    });

    player.on(AudioPlayerStatus.AutoPaused, () => {
      console.log(`Player auto-paused in guild ${guildId}, attempting to unpause...`);
      player.unpause();
    });
  }

  /**
   * Attempt to rejoin a channel
   */
  async rejoinChannel(guildId) {
    try {
      const channelData = await StreamingChannelModel.findByGuildId(guildId);
      if (!channelData) return;

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;

      const voiceChannel = guild.channels.cache.get(channelData.channel_id);
      if (!voiceChannel) return;

      await this.joinVoiceChannel(voiceChannel);
      console.log(`Successfully rejoined ${voiceChannel.name} in ${guild.name}`);
    } catch (error) {
      console.error(`Failed to rejoin channel in guild ${guildId}:`, error);
    }
  }

  /**
   * Start streaming radio to a guild
   */
  async startStreaming(guildId) {
    try {
      const connectionData = this.connections.get(guildId);
      if (!connectionData) {
        throw new Error('No voice connection found for guild');
      }

      // Prevent multiple simultaneous streaming attempts
      if (connectionData.isStreaming) {
        console.log(`Already starting stream for guild ${guildId}, skipping...`);
        return;
      }

      connectionData.isStreaming = true;
      const { player } = connectionData;
      
      // Stop current resource if playing
      if (player.state.status !== AudioPlayerStatus.Idle) {
        player.stop();
        // Wait a moment before starting new stream
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Creating new audio resource for guild ${guildId}...`);
      const resource = await this.radioService.createAudioResource();
      
      player.play(resource);
      console.log(`Started streaming to guild ${guildId}`);
      
      // Clear the streaming flag after a brief delay
      setTimeout(() => {
        if (connectionData) {
          connectionData.isStreaming = false;
        }
      }, 2000);
      
    } catch (error) {
      console.error(`Error starting stream for guild ${guildId}:`, error);
      
      // Clear the streaming flag on error
      const connectionData = this.connections.get(guildId);
      if (connectionData) {
        connectionData.isStreaming = false;
      }
      
      // Try again after a longer delay
      setTimeout(() => {
        if (this.connections.has(guildId)) {
          this.startStreaming(guildId);
        }
      }, 8000);
    }
  }

  /**
   * Leave voice channel in a guild
   */
  leaveVoiceChannel(guildId) {
    const connectionData = this.connections.get(guildId);
    if (connectionData) {
      const { connection, player } = connectionData;
      
      try {
        player.stop();
        connection.destroy();
      } catch (error) {
        console.error(`Error leaving voice channel in guild ${guildId}:`, error);
      }
      
      this.connections.delete(guildId);
    }

    // Also check for any existing connections
    const existingConnection = getVoiceConnection(guildId);
    if (existingConnection) {
      existingConnection.destroy();
    }
  }

  /**
   * Set volume for a guild
   */
  setVolume(guildId, volume) {
    const connectionData = this.connections.get(guildId);
    if (connectionData && connectionData.player) {
      const resource = connectionData.player.state.resource;
      if (resource && resource.volume) {
        resource.volume.setVolume(volume / 100);
        return true;
      }
    }
    return false;
  }

  /**
   * Get connection status for a guild
   */
  getConnectionStatus(guildId) {
    const connectionData = this.connections.get(guildId);
    if (!connectionData) return 'Not connected';
    
    const { connection, player } = connectionData;
    return {
      connection: connection.state.status,
      player: player.state.status,
      channelId: connectionData.channelId
    };
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.connections.keys());
  }
}
