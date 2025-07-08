import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { StreamingChannelModel } from '../models/index.js';
import { PermissionUtils } from '../utils/permissions.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Set up radio streaming for this server')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Voice channel to stream radio to')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
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
        .setDescription('You need **Manage Channels** permission to set up radio streaming.');
      
      return await interaction.editReply({ embeds: [embed] });
    }

    const voiceChannel = interaction.options.getChannel('channel');
    const botMember = interaction.guild.members.me;

    // Check bot permissions
    if (!PermissionUtils.botCanJoinVoice(voiceChannel, botMember)) {
      const missingPerms = PermissionUtils.getMissingVoicePermissions(voiceChannel, botMember);
      const formattedPerms = PermissionUtils.formatPermissions(missingPerms);
      
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Missing Permissions')
        .setDescription(`I don't have the required permissions for ${voiceChannel}`)
        .addFields({
          name: 'Missing Permissions',
          value: formattedPerms,
          inline: false
        });
      
      return await interaction.editReply({ embeds: [embed] });
    }

    // Check if guild already has a streaming channel
    const existingChannel = await StreamingChannelModel.findByGuildId(interaction.guildId);
    
    if (existingChannel) {
      // Update existing channel
      await StreamingChannelModel.update(interaction.guildId, {
        channelId: voiceChannel.id,
        channelName: voiceChannel.name
      });
    } else {
      // Create new channel entry
      await StreamingChannelModel.create({
        guildId: interaction.guildId,
        channelId: voiceChannel.id,
        guildName: interaction.guild.name,
        channelName: voiceChannel.name,
        addedBy: interaction.user.id
      });
    }

    // Join the voice channel
    const voiceManager = interaction.client.voiceManager;
    await voiceManager.joinVoiceChannel(voiceChannel);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Radio Setup Complete')
      .setDescription(`🎵 Radio is now streaming to ${voiceChannel}`)
      .addFields([
        {
          name: '📻 Channel',
          value: voiceChannel.toString(),
          inline: true
        },
        {
          name: '👤 Set up by',
          value: interaction.user.toString(),
          inline: true
        }
      ])
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error setting up radio:', error);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Setup Failed')
      .setDescription('Failed to set up radio streaming. Please try again.')
      .addFields({
        name: 'Error',
        value: error.message || 'Unknown error',
        inline: false
      });
    
    await interaction.editReply({ embeds: [embed] });
  }
}
