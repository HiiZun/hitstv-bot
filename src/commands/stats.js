import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { RadioService } from '../services/radioService.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View detailed radio statistics and technical information');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const radioService = new RadioService();
    const stats = await radioService.getDetailedStats();
    
    if (!stats) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Statistics Unavailable')
        .setDescription('Unable to fetch radio statistics. Please try again later.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Clean up song titles
    let currentSong = stats.currentSong;
    let nextSong = stats.nextSong;
    
    if (currentSong.includes('.mp4')) {
      currentSong = currentSong.replace('.mp4', '').replace(/^\d+\s+/, '');
    }
    if (nextSong.includes('.mp4')) {
      nextSong = nextSong.replace('.mp4', '').replace(/^\d+\s+/, '');
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📊 HiiZun Radio - Detailed Statistics')
      .setDescription('Complete radio station statistics and information')
      .addFields([
        {
          name: '🎵 Current Track',
          value: `**${currentSong}**`,
          inline: false
        },
        {
          name: '⏭️ Next Track',
          value: nextSong,
          inline: false
        },
        {
          name: '📻 Playlist Info',
          value: [
            `**Name:** ${stats.playlist}`,
            `**Position:** ${stats.position}`,
            `**Media Type:** ${stats.mediaType}`
          ].join('\n'),
          inline: true
        },
        {
          name: '📊 Library Statistics',
          value: [
            `**Music Tracks:** ${stats.totalMusic}`,
            `**Video Files:** ${stats.totalVideos}`,
            `**Total Playlist:** ${stats.totalPlaylist}`
          ].join('\n'),
          inline: true
        },
        {
          name: '👥 Audience',
          value: [
            `**Total Listeners:** ${stats.totalListeners}`,
            `**Discord Servers:** ${interaction.client.voiceManager.getActiveConnections().length}`,
          ].join('\n'),
          inline: true
        },
        {
          name: '⚙️ Playback Settings',
          value: [
            `**Shuffle:** ${stats.shuffleEnabled ? '✅ Enabled' : '❌ Disabled'}`,
            `**Crossfade:** ${stats.crossfadeDuration}s`,
            `**Failover:** ${stats.isUsingFailover ? '🔴 Active' : '🟢 Inactive'}`
          ].join('\n'),
          inline: true
        },
        {
          name: '🔧 Technical Info',
          value: [
            `**Stream Format:** MP3`,
            `**Bitrate:** 128 kbps`,
            `**Sample Rate:** 44.1 kHz`
          ].join('\n'),
          inline: true
        },
        {
          name: '🌐 System Status',
          value: stats.isUsingFailover 
            ? `⚠️ ${stats.failoverReason}`
            : '✅ All systems operational',
          inline: true
        }
      ])
      .setFooter({ 
        text: `Last updated • Radio powered by HiiZun`,
        iconURL: 'https://radio.hiizun.fr/favicon.ico'
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error getting radio stats:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Statistics Error')
      .setDescription('Failed to retrieve detailed statistics.')
      .addFields({
        name: 'Error Details',
        value: error.message || 'Unknown error occurred',
        inline: false
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}
