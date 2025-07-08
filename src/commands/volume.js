import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Adjust radio volume (0-100)')
  .addIntegerOption(option =>
    option
      .setName('level')
      .setDescription('Volume level (0-100)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100)
  );

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
        .setDescription('You need **Manage Channels** permission to adjust radio volume.');
      
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

  const volume = interaction.options.getInteger('level');
  const voiceManager = interaction.client.voiceManager;

  try {
    const success = voiceManager.setVolume(interaction.guildId, volume);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🔊 Volume Adjusted')
        .setDescription(`Volume set to **${volume}%**`)
        .addFields({
          name: '👤 Adjusted by',
          value: interaction.user.toString(),
          inline: true
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('⚠️ Volume Not Adjusted')
        .setDescription('Radio is not currently streaming in this server.\nUse `/setup` to start streaming first.');

      await interaction.editReply({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error adjusting volume:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Volume Error')
      .setDescription('Failed to adjust volume.')
      .addFields({
        name: 'Error',
        value: error.message || 'Unknown error',
        inline: false
      });
    
    await interaction.editReply({ embeds: [embed] });
  }
}
