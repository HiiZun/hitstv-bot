import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('dev-restart')
  .setDescription('[Developer] Restart all voice connections')
  .addStringOption(option =>
    option
      .setName('action')
      .setDescription('Action to perform')
      .setRequired(true)
      .addChoices(
        { name: 'Restart All Connections', value: 'restart' },
        { name: 'Disconnect All', value: 'disconnect' },
        { name: 'Reconnect All', value: 'reconnect' }
      )
  );

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

  const action = interaction.options.getString('action');
  const voiceManager = interaction.client.voiceManager;

  try {
    const activeConnections = voiceManager.getActiveConnections();
    
    let resultMessage = '';
    
    switch (action) {
      case 'restart':
        // Disconnect and reconnect all
        for (const guildId of activeConnections) {
          voiceManager.leaveVoiceChannel(guildId);
        }
        
        // Wait a moment then reconnect
        setTimeout(() => {
          voiceManager.reconnectToChannels();
        }, 2000);
        
        resultMessage = `🔄 Restarting ${activeConnections.length} connections...`;
        break;
        
      case 'disconnect':
        // Disconnect all
        for (const guildId of activeConnections) {
          voiceManager.leaveVoiceChannel(guildId);
        }
        
        resultMessage = `🔇 Disconnected from ${activeConnections.length} channels.`;
        break;
        
      case 'reconnect':
        // Reconnect to all configured channels
        voiceManager.reconnectToChannels();
        
        resultMessage = '🔗 Attempting to reconnect to all configured channels...';
        break;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🔧 Developer Action Executed')
      .setDescription(resultMessage)
      .addFields({
        name: 'Action',
        value: action,
        inline: true
      }, {
        name: 'Executed by',
        value: interaction.user.toString(),
        inline: true
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error executing dev restart:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Error')
      .setDescription('Failed to execute restart action.')
      .addFields({
        name: 'Error',
        value: error.message || 'Unknown error',
        inline: false
      });
    
    await interaction.editReply({ embeds: [embed] });
  }
}
