/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Only run this for MySQL databases
  if (knex.client.config.client === 'mysql2') {
    // Fix character set for streaming_channels table
    await knex.raw(`
      ALTER TABLE streaming_channels 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // Fix character set for bot_settings table
    await knex.raw(`
      ALTER TABLE bot_settings 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    // Ensure specific columns support full UTF-8
    await knex.raw(`
      ALTER TABLE streaming_channels 
      MODIFY guild_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      MODIFY channel_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    
    await knex.raw(`
      ALTER TABLE bot_settings 
      MODIFY \`key\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      MODIFY value TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Only run this for MySQL databases
  if (knex.client.config.client === 'mysql2') {
    // Revert to standard UTF-8 (if needed)
    await knex.raw(`
      ALTER TABLE streaming_channels 
      CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci
    `);
    
    await knex.raw(`
      ALTER TABLE bot_settings 
      CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci
    `);
  }
}
