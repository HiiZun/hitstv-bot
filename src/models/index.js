import db from '../database/index.js';

export class StreamingChannelModel {
  static async findByGuildId(guildId) {
    return await db('streaming_channels').where('guild_id', guildId).first();
  }

  static async findAll() {
    return await db('streaming_channels').select('*');
  }

  static async create(data) {
    const [id] = await db('streaming_channels').insert({
      guild_id: data.guildId,
      channel_id: data.channelId,
      guild_name: data.guildName,
      channel_name: data.channelName,
      added_by: data.addedBy,
      created_at: new Date(),
      updated_at: new Date()
    });
    return await this.findById(id);
  }

  static async findById(id) {
    return await db('streaming_channels').where('id', id).first();
  }

  static async update(guildId, data) {
    await db('streaming_channels')
      .where('guild_id', guildId)
      .update({
        channel_id: data.channelId,
        channel_name: data.channelName,
        updated_at: new Date()
      });
    return await this.findByGuildId(guildId);
  }

  static async delete(guildId) {
    return await db('streaming_channels').where('guild_id', guildId).del();
  }

  static async count() {
    const result = await db('streaming_channels').count('* as count').first();
    return result.count;
  }
}

export class BotSettingsModel {
  static async get(key) {
    const setting = await db('bot_settings').where('key', key).first();
    return setting ? setting.value : null;
  }

  static async set(key, value) {
    const existing = await db('bot_settings').where('key', key).first();
    
    if (existing) {
      await db('bot_settings')
        .where('key', key)
        .update({ value, updated_at: new Date() });
    } else {
      await db('bot_settings').insert({
        key,
        value,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  static async delete(key) {
    return await db('bot_settings').where('key', key).del();
  }
}
