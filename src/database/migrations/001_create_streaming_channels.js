/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.createTable('streaming_channels', (table) => {
    table.increments('id').primary();
    table.string('guild_id').notNullable();
    table.string('channel_id').notNullable();
    table.string('guild_name').notNullable();
    table.string('channel_name').notNullable();
    table.string('added_by').notNullable(); // User ID who added the channel
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Ensure one channel per guild
    table.unique(['guild_id']);
    table.index(['guild_id', 'channel_id']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTable('streaming_channels');
}
