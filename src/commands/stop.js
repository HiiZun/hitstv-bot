import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { StreamingChannelModel } from '../models/index.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop radio streaming in this server');

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    // Ensure we have a full member object with permissions
    const member = await PermissionUtils.ensureFullMember(interaction);

    // Check permissions
    if (!PermissionUtils.canManageRadio(member)) {
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Permission Denied')
        .setDescription('You need **Manage Channels** permission to stop radio streaming.');
      
      return await interaction.editReply({ embeds: [embed] });
    }
  } catch (permissionError) {
    if (permissionError.message && permissionError.message.includes('fetch')) {
      console.error('Failed to fetch member:', permissionError);
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Error')
        .setDescription('Unable to verify permissions. Please try again.');
      
      return await interaction.editReply({ embeds: [embed] });
    }
    throw permissionError;
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
