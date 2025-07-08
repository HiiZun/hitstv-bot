import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { StreamingChannelModel } from '../models/index.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop radio streaming in this server');

export async function execute(interaction) {
  await interaction.deferReply();

  // Check permissions
  if (!PermissionUtils.canManageRadio(interaction.member)) {
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Permission Denied')
      .setDescription('You need **Manage Channels** permission to stop radio streaming.');
    
    return await interaction.editReply({ embeds: [embed] });
  }

  try {
    // Check if guild has a streaming channel configured
    const streamingChannel = await StreamingChannelModel.findByGuildId(interaction.guildId);
    
    if (!streamingChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('⚠️ No Radio Configured')
        .setDescription('Radio streaming is not set up in this server.\nUse `/setup` to configure it.');
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Leave voice channel
    const voiceManager = interaction.client.voiceManager;
    voiceManager.leaveVoiceChannel(interaction.guildId);

    // Remove from database
    await StreamingChannelModel.delete(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Radio Stopped')
      .setDescription('🔇 Radio streaming has been stopped and configuration removed.')
      .addFields({
        name: '👤 Stopped by',
        value: interaction.user.toString(),
        inline: true
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error stopping radio:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Failed to Stop Radio')
      .setDescription('An error occurred while stopping radio streaming.')
      .addFields({
        name: 'Error',
        value: error.message || 'Unknown error',
        inline: false
      });
    
    await interaction.editReply({ embeds: [embed] });
  }
}
