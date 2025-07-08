import { PermissionFlagsBits } from 'discord.js';

export class PermissionUtils {
  /**
   * Ensure we have a full member object with permissions
   */
  static async ensureFullMember(interaction) {
    let member = interaction.member;
    if (!member || !member.permissions) {
      member = await interaction.guild.members.fetch(interaction.user.id);
    }
    return member;
  }

  /**
   * Check if user has manage channels permission
   */
  static hasManageChannels(member) {
    // Handle partial members or members without permissions
    if (!member || !member.permissions) {
      return false;
    }
    return member.permissions.has(PermissionFlagsBits.ManageChannels);
  }

  /**
   * Check if user is the bot developer
   */
  static isDeveloper(userId) {
    return userId === process.env.DEVELOPER_ID;
  }

  /**
   * Check if user can manage radio (has manage channels or is developer)
   */
  static canManageRadio(member) {
    // Handle partial members or undefined members
    if (!member) {
      return false;
    }
    return this.hasManageChannels(member) || this.isDeveloper(member.id);
  }

  /**
   * Check if bot has necessary permissions in a voice channel
   */
  static botCanJoinVoice(voiceChannel, botMember) {
    const permissions = voiceChannel.permissionsFor(botMember);
    
    return permissions.has([
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.ViewChannel
    ]);
  }

  /**
   * Get missing permissions for voice channel
   */
  static getMissingVoicePermissions(voiceChannel, botMember) {
    const permissions = voiceChannel.permissionsFor(botMember);
    const required = [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.ViewChannel
    ];
    
    return required.filter(perm => !permissions.has(perm));
  }

  /**
   * Format permission names for display
   */
  static formatPermissions(permissions) {
    const permissionNames = {
      [PermissionFlagsBits.Connect]: 'Connect',
      [PermissionFlagsBits.Speak]: 'Speak',
      [PermissionFlagsBits.ViewChannel]: 'View Channel',
      [PermissionFlagsBits.ManageChannels]: 'Manage Channels'
    };

    return permissions.map(perm => permissionNames[perm] || perm.toString()).join(', ');
  }
}
