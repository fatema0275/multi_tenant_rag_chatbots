'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS chatbot_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        website_id INTEGER UNIQUE NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        theme_color TEXT NOT NULL DEFAULT '#22C55E',
        background_color TEXT NOT NULL DEFAULT '#ffffff',
        text_color TEXT NOT NULL DEFAULT '#111111',
        logo_url TEXT NULL,
        widget_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        embed_token TEXT UNIQUE NOT NULL,
        overrides_locked BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Index for fast token lookups from public widget
      CREATE INDEX IF NOT EXISTS idx_chatbot_configs_embed_token ON chatbot_configs(embed_token);
      CREATE INDEX IF NOT EXISTS idx_chatbot_configs_website_id ON chatbot_configs(website_id);

      -- Enable RLS
      ALTER TABLE chatbot_configs ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if any
      DROP POLICY IF EXISTS "Users can manage their own chatbot configs" ON chatbot_configs;
      DROP POLICY IF EXISTS "Public widget config lookup by embed_token" ON chatbot_configs;

      -- RLS Policy: Owners can manage their chatbot configs
      CREATE POLICY "Users can manage their own chatbot configs"
      ON chatbot_configs
      FOR ALL
      USING (
        website_id IN (
          SELECT id FROM websites WHERE user_id::text = auth.uid()::text
        )
      );

      -- RLS Policy: Public read access for active chatbot configs via embed_token
      CREATE POLICY "Public widget config lookup by embed_token"
      ON chatbot_configs
      FOR SELECT
      USING (is_active = true);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS chatbot_configs CASCADE;
    `);
  }
};
