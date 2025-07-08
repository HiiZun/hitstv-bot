import fetch from 'node-fetch';
import { createAudioResource, StreamType, demuxProbe } from '@discordjs/voice';

export class RadioService {
  constructor() {
    this.streamUrl = process.env.RADIO_STREAM_URL;
    this.statusUrl = process.env.RADIO_STATUS_URL;
    this.accessToken = process.env.ACCESS_TOKEN;
  }

  /**
   * Get current radio status
   */
  async getStatus() {
    try {
      const response = await fetch(this.statusUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'HiiZun-HitsTV-Bot/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Radio API response received successfully');
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching radio status:', error.message);
      
      // Return fallback data to prevent total failure
      return {
        currentMedia: {
          title: 'HiiZun Radio',
          displayText: 'HiiZun Radio Stream',
          playlist: 'Main Hits'
        },
        totalListeners: 0,
        playbackPosition: 'Unknown',
        totalMusic: 0,
        totalVideos: 0,
        shuffleEnabled: false,
        crossfadeDuration: 0,
        isUsingFailover: false,
        mediaType: 'Music Stream'
      };
    }
  }

  /**
   * Create audio resource for Discord voice connection
   */
  async createAudioResource() {
    try {
      console.log('Creating audio resource from:', this.streamUrl);
      
      // Fetch the stream with better headers for stability
      const response = await fetch(this.streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Connection': 'keep-alive',
          'Accept': 'audio/mpeg, audio/*',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Create resource directly without probing to avoid potential issues
      const resource = createAudioResource(response.body, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
        metadata: {
          title: 'HiiZun Radio Stream'
        },
        // Add silencePaddingFrames to help with buffering
        silencePaddingFrames: 5
      });
      
      // Set default volume to 50%
      resource.volume?.setVolume(0.5);
      
      console.log('Audio resource created successfully with type: arbitrary');
      return resource;
      
    } catch (error) {
      console.error('Error creating audio resource:', error);
      
      // Fallback to simple approach
      console.log('Falling back to simple stream creation...');
      const resource = createAudioResource(this.streamUrl, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
        metadata: {
          title: 'HiiZun Radio Stream'
        },
        silencePaddingFrames: 5
      });
      
      resource.volume?.setVolume(0.5);
      return resource;
    }
  }

  /**
   * Format current song info for Discord embed
   */
  formatCurrentSong(status) {
    if (!status) {
      return {
        title: '🎵 HiiZun Radio',
        description: 'Currently playing unknown track',
        color: 0x3498db,
        thumbnail: {
          url: 'https://radio.hiizun.fr/favicon.ico'
        }
      };
    }

    // Parse the new API format
    const currentTrack = status.currentTrack || status.streaming?.currentTrack || {};
    const streaming = status.streaming || {};
    const stationInfo = streaming.station || {};
    
    // Clean up the display text
    let currentTitle = currentTrack.title || 'Unknown Track';
    if (currentTitle.includes('.mp4')) {
      currentTitle = currentTitle.replace('.mp4', '').replace(/^\d+\s+/, '');
    }
    
    // Format position
    const position = currentTrack.position || 0;
    const positionFormatted = `${Math.floor(position / 60)}:${String(position % 60).padStart(2, '0')}`;
    
    return {
      title: '🎵 HitsTV Radio - Now Playing',
      description: `**${currentTitle}**`,
      fields: [
        {
          name: '📻 Station',
          value: stationInfo.name || 'HitsTV Radio',
          inline: true
        },
        {
          name: '👥 Listeners',
          value: (status.clients || streaming.listeners || 0).toString(),
          inline: true
        },
        {
          name: '⏱️ Position',
          value: positionFormatted,
          inline: true
        },
        {
          name: '� Genre',
          value: stationInfo.genre || 'Pop',
          inline: true
        },
        {
          name: '📊 Library Size',
          value: `${status.totalTracks || 0} tracks`,
          inline: true
        },
        {
          name: '🔀 Shuffle',
          value: status.shuffle ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '📡 Stream Info',
          value: `${status.format || 'MP3'} • ${status.bitrate || 128} kbps`,
          inline: true
        },
        {
          name: '⏰ Uptime',
          value: `${Math.floor((status.uptime || 0) / 3600)}h ${Math.floor(((status.uptime || 0) % 3600) / 60)}m`,
          inline: true
        },
        {
          name: '📻 Station Description',
          value: stationInfo.description || 'Your favorite hits 24/7',
          inline: false
        }
      ],
      color: streaming.isLive ? 0x00ff88 : 0xf39c12,
      timestamp: new Date().toISOString(),
      footer: {
        text: `${stationInfo.name || 'HitsTV Radio'} • Live Stream ${streaming.isLive ? '🔴' : '⚪'}`
      },
      thumbnail: {
        url: 'https://radio.hiizun.fr/favicon.ico'
      }
    };
  }

  /**
   * Get formatted embed for radio status
   */
  async getStatusEmbed() {
    const status = await this.getStatus();
    return this.formatCurrentSong(status);
  }

  /**
   * Get current song title for bot activity
   */
  async getCurrentSongTitle() {
    try {
      const status = await this.getStatus();
      if (status?.currentTrack?.title || status?.streaming?.currentTrack?.title) {
        let title = status.currentTrack?.title || status.streaming?.currentTrack?.title;
        // Clean up the title
        if (title.includes('.mp4')) {
          title = title.replace('.mp4', '').replace(/^\d+\s+/, '');
        }
        return title;
      }
      return 'HiiZun Radio';
    } catch (error) {
      console.error('Error getting current song:', error);
      return 'HiiZun Radio';
    }
  }

  /**
   * Get detailed radio statistics
   */
  async getDetailedStats() {
    try {
      const status = await this.getStatus();
      if (!status) return null;

      // Parse the new API format
      const currentTrack = status.currentTrack || status.streaming?.currentTrack || {};
      const streaming = status.streaming || {};
      
      return {
        currentSong: currentTrack.title || 'HiiZun Radio',
        nextSong: 'Unknown', // API doesn't provide next track
        playlist: streaming.station?.name || 'HitsTV Radio',
        totalListeners: status.clients || streaming.listeners || 0,
        position: `${Math.floor((currentTrack.position || 0) / 60)}:${String((currentTrack.position || 0) % 60).padStart(2, '0')}`,
        totalMusic: status.totalTracks || 0,
        totalVideos: 0, // Not provided in this API
        totalPlaylist: status.totalTracks || 0,
        mediaType: streaming.station?.genre || 'Music',
        shuffleEnabled: status.shuffle || false,
        crossfadeDuration: 0, // Not provided in this API
        isUsingFailover: false, // Not provided in this API
        failoverReason: streaming.isLive ? 'All systems operational' : 'Stream offline',
        bitrate: status.bitrate || streaming.station?.bitrate || 128,
        format: status.format || 'MP3',
        uptime: Math.floor((status.uptime || 0) / 3600), // Convert to hours
        stationName: streaming.station?.name || 'HitsTV Radio',
        stationDescription: streaming.station?.description || 'Your favorite hits 24/7'
      };
    } catch (error) {
      console.error('❌ Error getting detailed stats:', error.message);
      
      // Return fallback stats
      return {
        currentSong: 'HiiZun Radio',
        nextSong: 'Unknown',
        playlist: 'HitsTV Radio',
        totalListeners: 0,
        position: '0:00',
        totalMusic: 0,
        totalVideos: 0,
        totalPlaylist: 0,
        mediaType: 'Music',
        shuffleEnabled: false,
        crossfadeDuration: 0,
        isUsingFailover: false,
        failoverReason: 'Radio API unavailable',
        bitrate: 128,
        format: 'MP3',
        uptime: 0,
        stationName: 'HitsTV Radio',
        stationDescription: 'Your favorite hits 24/7'
      };
    }
  }
}
