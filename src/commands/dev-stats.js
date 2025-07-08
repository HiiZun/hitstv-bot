import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { StreamingChannelModel } from '../models/index.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('dev-stats')
  .setDescription('[Developer] View bot statistics and active connections');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Check if user is developer
  if (!PermissionUtils.isDeveloper(interaction.user.id)) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Access Denied')
      .setDescription('This command is only available to the bot developer.');
    
    return await interaction.editReply({ embeds: [embed] });
  }

  try {
    const voiceManager = interaction.client.voiceManager;
    
    // Get statistics
    const totalServers = interaction.client.guilds.cache.size;
    const totalUsers = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const configuredChannels = await StreamingChannelModel.count();
    const activeConnections = voiceManager.getActiveConnections();
    
    // Get radio stats
    const radioService = interaction.client.radioService || new (await import('../services/radioService.js')).RadioService();
    const radioStats = await radioService.getDetailedStats();
    
    // Get detailed connection info
    const connectionDetails = [];
    let totalListeners = 0;
    
    for (const guildId of activeConnections) {
      const guild = interaction.client.guilds.cache.get(guildId);
      const status = voiceManager.getConnectionStatus(guildId);
      const channel = guild?.channels.cache.get(status.channelId);
      const listeners = channel?.members?.size ? channel.members.size - 1 : 0; // Subtract bot
      
      totalListeners += listeners;
      connectionDetails.push({
        guild: guild?.name || 'Unknown',
        channel: channel?.name || 'Unknown',
        status: status.connection,
        members: listeners
      });
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🔧 Developer Statistics')
      .addFields([
        {
          name: '📊 Bot Statistics',
          value: [
            `**Discord Servers:** ${totalServers}`,
            `**Total Users:** ${totalUsers.toLocaleString()}`,
            `**Configured Channels:** ${configuredChannels}`,
            `**Active Connections:** ${activeConnections.length}`,
            `**Total Voice Listeners:** ${totalListeners}`
          ].join('\n'),
          inline: false
        },
        {
          name: '🎵 Radio Statistics',
          value: radioStats ? [
            `**Current Song:** ${radioStats.currentSong.replace('.mp4', '').replace(/^\d+\s+/, '')}`,
            `**Total Listeners:** ${radioStats.totalListeners}`,
            `**Library Size:** ${radioStats.totalMusic} tracks`,
            `**Playlist:** ${radioStats.playlist}`,
            `**Shuffle:** ${radioStats.shuffleEnabled ? 'On' : 'Off'}`
          ].join('\n') : 'Radio stats unavailable',
          inline: false
        },
        {
          name: '🎛️ Active Connections',
          value: connectionDetails.length > 0 
            ? connectionDetails.map(conn => 
                `**${conn.guild}** - ${conn.channel} (${conn.members} listeners)`
              ).join('\n')
            : 'No active connections',
          inline: false
        },
        {
          name: '💾 System Resources',
          value: [
            `**Memory:** ${memoryMB}MB / ${memoryTotalMB}MB`,
            `**Uptime:** ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
            `**Node.js:** ${process.version}`,
            `**Platform:** ${process.platform}`
          ].join('\n'),
          inline: true
        },
        {
          name: '🔗 Connection Health',
          value: [
            `**WebSocket Ping:** ${interaction.client.ws.ping}ms`,
            `**Gateway Status:** ${interaction.client.ws.status === 0 ? '🟢 Ready' : '🔴 Not Ready'}`,
            `**Voice Connections:** ${activeConnections.length > 0 ? '🟢 Healthy' : '⚠️ None'}`
          ].join('\n'),
          inline: true
        }
      ])
      .setFooter({
        text: `Bot ID: ${interaction.client.user.id} • Generated for ${interaction.user.tag}`
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error getting dev stats:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Error')
      .setDescription('Failed to retrieve statistics.')
      .addFields({
        name: 'Error Details',
        value: error.message || 'Unknown error',
        inline: false
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}
