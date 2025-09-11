#!/usr/bin/env node

/**
 * DB Backup & Restore
 * Data kaybetmeden migration restore
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Backup al
function backupData() {
  console.log('📦 Data backup alınıyor...');
  
  const backupSQL = `
-- BACKUP SCRIPT
-- Generated at: ${new Date().toISOString()}

-- Users backup (sadece email ve username)
CREATE TABLE IF NOT EXISTS backup_users AS 
SELECT id, email, raw_user_meta_data 
FROM auth.users;

-- Profiles backup  
CREATE TABLE IF NOT EXISTS backup_profiles AS
SELECT * FROM profiles;

-- Communities backup
CREATE TABLE IF NOT EXISTS backup_communities AS
SELECT * FROM communities;

-- Events backup
CREATE TABLE IF NOT EXISTS backup_events AS
SELECT * FROM events;

-- Tickets backup
CREATE TABLE IF NOT EXISTS backup_tickets AS
SELECT * FROM tickets;

-- Members backup
CREATE TABLE IF NOT EXISTS backup_community_members AS
SELECT * FROM community_members;
`;

  // Backup dosyası oluştur
  const backupFile = path.join(__dirname, '..', 'supabase', 'backup.sql');
  fs.writeFileSync(backupFile, backupSQL);
  
  console.log('✅ Backup SQL oluşturuldu: supabase/backup.sql');
  console.log('\n📋 YAPMANIZ GEREKENLER:');
  console.log('1. Supabase Dashboard > SQL Editor');
  console.log('2. backup.sql içeriğini çalıştır');
  console.log('3. Backup tabloları oluşacak');
  
  return backupFile;
}

// Restore et
function restoreData() {
  const restoreSQL = `
-- RESTORE SCRIPT
-- Backup tablolarından ana tablolara veri aktar

-- Users restore (dikkatli!)
INSERT INTO profiles (id, username, full_name, avatar_url, bio)
SELECT id, username, full_name, avatar_url, bio 
FROM backup_profiles
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name;

-- Communities restore
INSERT INTO communities 
SELECT * FROM backup_communities
ON CONFLICT (id) DO NOTHING;

-- Events restore  
INSERT INTO events
SELECT * FROM backup_events
ON CONFLICT (id) DO NOTHING;

-- Tickets restore
INSERT INTO tickets
SELECT * FROM backup_tickets  
ON CONFLICT (id) DO NOTHING;

-- Members restore
INSERT INTO community_members
SELECT * FROM backup_community_members
ON CONFLICT (id) DO NOTHING;

-- Backup tablolarını temizle
DROP TABLE IF EXISTS backup_users CASCADE;
DROP TABLE IF EXISTS backup_profiles CASCADE;
DROP TABLE IF EXISTS backup_communities CASCADE;
DROP TABLE IF EXISTS backup_events CASCADE;
DROP TABLE IF EXISTS backup_tickets CASCADE;
DROP TABLE IF EXISTS backup_community_members CASCADE;
`;

  const restoreFile = path.join(__dirname, '..', 'supabase', 'restore.sql');
  fs.writeFileSync(restoreFile, restoreSQL);
  
  console.log('✅ Restore SQL oluşturuldu: supabase/restore.sql');
  console.log('\n📋 RESTORE İÇİN:');
  console.log('1. Reset sonrası');
  console.log('2. Dashboard > SQL Editor');
  console.log('3. restore.sql çalıştır');
}

// Ana menü
const args = process.argv.slice(2);
const command = args[0];

if (command === 'backup') {
  backupData();
} else if (command === 'restore') {
  restoreData();
} else {
  console.log('🔄 DB Backup & Restore');
  console.log('======================');
  console.log('\nKullanım:');
  console.log('  npm run db:backup   - Backup al');
  console.log('  npm run db:restore  - Restore et');
  console.log('\nWorkflow:');
  console.log('  1. db:backup - Data backup al');
  console.log('  2. Reset database');
  console.log('  3. db:push - Migration uygula');
  console.log('  4. db:restore - Data geri yükle');
}