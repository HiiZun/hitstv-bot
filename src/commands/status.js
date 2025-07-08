import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { StreamingChannelModel } from '../models/index.js';
import { RadioService } from '../services/radioService.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check current radio status and now playing information');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const radioService = new RadioService();
    const voiceManager = interaction.client.voiceManager;
    
    // Get detailed radio statistics
    const stats = await radioService.getDetailedStats();
    const statusEmbed = await radioService.getStatusEmbed();
    
    if (!stats) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Radio Status Unavailable')
        .setDescription('Unable to fetch radio status. The radio service might be temporarily unavailable.')
        .setTimestamp();
      
      return await interaction.editReply({ embeds: [embed] });
    }
    
    // Get bot connection status for this guild
    const streamingChannel = await StreamingChannelModel.findByGuildId(interaction.guildId);
    const connectionStatus = voiceManager.getConnectionStatus(interaction.guildId);
    
    let connectionInfo = '❌ Not streaming in this server';
    let connectionColor = 0xe74c3c; // Red
    
    if (streamingChannel && connectionStatus !== 'Not connected') {
      const channel = interaction.guild.channels.cache.get(streamingChannel.channel_id);
      const listeners = channel?.members?.size ? channel.members.size - 1 : 0; // Subtract bot
      connectionInfo = `✅ Streaming to ${channel || 'Unknown Channel'}\n👥 ${listeners} listener${listeners !== 1 ? 's' : ''} in voice`;
      connectionColor = 0x2ecc71; // Green
    } else if (streamingChannel) {
      connectionInfo = '⚠️ Configured but not connected';
      connectionColor = 0xf39c12; // Orange
    }

    // Add connection info to embed
    statusEmbed.fields = statusEmbed.fields || [];
    statusEmbed.fields.push({
      name: '🔗 Server Connection',
      value: connectionInfo,
      inline: false
    });

    // Add total servers streaming
    const totalConnections = voiceManager.getActiveConnections().length;
    statusEmbed.fields.push({
      name: '🌐 Global Stats',
      value: `Broadcasting to **${totalConnections}** server${totalConnections !== 1 ? 's' : ''}`,
      inline: true
    });

    // Add uptime info
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    statusEmbed.fields.push({
      name: '⏱️ Bot Uptime',
      value: `${hours}h ${minutes}m`,
      inline: true
    });

    // Use connection color for the embed
    statusEmbed.color = connectionColor;

    const embed = new EmbedBuilder(statusEmbed);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error getting radio status:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Status Error')
      .setDescription('Failed to get radio status. Please try again in a moment.')
      .addFields({
        name: 'Error Details',
        value: error.message || 'Unknown error occurred',
        inline: false
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}
