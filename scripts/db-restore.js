#!/usr/bin/env node

/**
 * DB Restore Script
 * Git'teki herhangi bir commit'e göre DB'yi restore eder
 *
 * Kullanım: node scripts/db-restore.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mevcut migration'ları oku
function getCurrentMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) return [];

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

// DB'yi sıfırla ve migration'ları uygula
async function restoreDB() {
  console.log("🔍 Mevcut migration'lar kontrol ediliyor...");
  const migrations = getCurrentMigrations();

  console.log(`📁 ${migrations.length} migration bulundu:`);
  migrations.forEach((m) => console.log(`  - ${m}`));

  console.log(
    "\n⚠️  DİKKAT: Bu işlem tüm datayı silip, migration'ları baştan uygulayacak!"
  );
  console.log('Devam etmek istiyor musunuz? (yes/no)');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('', (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ İptal edildi');
      process.exit(0);
    }

    try {
      console.log('\n🔄 DB sıfırlanıyor...');

      // Önce Supabase'e bağlan
      console.log("📡 Supabase'e bağlanılıyor...");

      // Dashboard'dan reset atmak için talimat
      console.log('\n📋 MANUEL ADIMLAR:');
      console.log(
        "1. Supabase Dashboard'a git: https://supabase.com/dashboard"
      );
      console.log('2. Settings > Database > Reset database');
      console.log("3. Reset'i onayla");
      console.log("4. Buraya geri dön ve Enter'a bas");

      readline.question('\nReset tamamlandı mı? (Enter) ', () => {
        console.log("\n🚀 Migration'lar uygulanıyor...");

        try {
          execSync('npm run db:push', { stdio: 'inherit' });
          console.log('\n✅ DB başarıyla restore edildi!');
          console.log(`📊 Uygulanan migration sayısı: ${migrations.length}`);
        } catch (error) {
          console.error('❌ Migration uygularken hata:', error.message);
        }

        readline.close();
      });
    } catch (error) {
      console.error('❌ Hata:', error.message);
      readline.close();
      process.exit(1);
    }
  });
}

// Ana fonksiyon
restoreDB();
