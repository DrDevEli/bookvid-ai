#!/usr/bin/env node

/**
 * Database Migration Script
 * Initializes the SQLite database with schema and seed data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const databaseManager = require('../server/config/database');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Initialize database connection
    databaseManager.initialize();
    
    // Run migrations
    await databaseManager.runMigrations();
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const db = databaseManager.getDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    
    console.log('📋 Created tables:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check template count
    const templateCount = db.prepare("SELECT COUNT(*) as count FROM templates").get();
    console.log(`📚 Seeded ${templateCount.count} templates`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    databaseManager.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;