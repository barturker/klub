# 🎯 Supabase Online Version Control

## Özet
Online Supabase projenizdeki veritabanı değişikliklerini Git ile takip etmek için migration sistemi kullanıyoruz. Docker'a gerek yok, her şey online!

## 🚀 Hızlı Başlangıç

### 1. Supabase Projenizi Bağlayın

```bash
# Supabase.com'dan project-ref'inizi alın (Settings > General)
npx supabase link --project-ref xxxxxxxxxxxxx

# Access token isterse: supabase.com/dashboard/account/tokens
```

### 2. İlk Migration'ı Uygulayın

```bash
# Hazır migration'ı online Supabase'e gönderin
npm run db:push

# ✅ Tablolar oluşturuldu: communities, events, tickets, profiles
```

## 📝 Günlük Kullanım

### Yeni Tablo Eklemek

```bash
# 1. Migration dosyası oluştur
npm run db:migrate add_messages_table

# 2. Oluşan dosyayı düzenle: supabase/migrations/[timestamp]_add_messages_table.sql
# SQL yazın:
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

# 3. Online Supabase'e gönder
npm run db:push

# 4. Git'e kaydet
git add supabase/migrations/
git commit -m "feat: add messages table"
git push
```

### Var Olan Tabloya Kolon Eklemek

```bash
# 1. Migration oluştur
npm run db:migrate add_phone_to_profiles

# 2. SQL yaz
ALTER TABLE profiles ADD COLUMN phone TEXT;

# 3. Uygula
npm run db:push

# 4. Commit et
git add supabase/migrations/
git commit -m "feat: add phone column to profiles"
```

## 🤝 Takım Çalışması

### Siz değişiklik yaptığınızda:
```bash
# 1. Migration oluştur ve SQL yaz
npm run db:migrate my_feature

# 2. Online DB'ye gönder
npm run db:push

# 3. Git'e pushla
git add supabase/migrations/
git commit -m "feat: my feature"
git push
```

### Takım arkadaşınız pull yaptığında:
```bash
# 1. Kodu çek
git pull

# 2. Yeni migration'ları gör
ls supabase/migrations/

# 3. Kendi online Supabase'ine uygula
npm run db:push
```

## 🔑 Environment Variables

`.env.local` dosyanıza ekleyin:
```bash
# Supabase Credentials (supabase.com'dan alın)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Gizli tutun!

# Supabase CLI için
SUPABASE_PROJECT_ID=xxxxxxxxxxxxx
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxx  # dashboard/account/tokens
```

## 📋 Komutlar

```bash
npm run db:link      # Projeyi bağla (ilk kurulum)
npm run db:migrate   # Yeni migration oluştur
npm run db:push      # Migration'ları online DB'ye gönder
npm run db:pull      # Online DB'den schema çek
npm run db:status    # Migration durumunu gör
npm run db:diff      # Online ile local farkları gör
npm run db:types     # TypeScript type'ları oluştur
```

## ⚠️ Önemli Kurallar

### ✅ YAPILACAKLAR
1. **Her değişiklik için migration oluştur** - Manuel SQL Dashboard'da çalıştırma
2. **Migration'ları Git'e commit et** - Herkes aynı şemayı kullansın
3. **Önce development/staging test et** - Sonra production

### ❌ YAPILMAYACAKLAR
1. **Migration dosyalarını düzenleme** - Yenisini oluştur
2. **Dashboard'dan manuel değişiklik yapma** - Her zaman migration kullan
3. **Service key'i commit etme** - .env.local'de tut

## 🔄 Örnek Senaryo

### Senaryo: Event'lere "tags" özelliği eklemek

```bash
# 1. Migration oluştur
npm run db:migrate add_tags_to_events

# 2. SQL yaz (supabase/migrations/xxx_add_tags_to_events.sql)
ALTER TABLE events 
ADD COLUMN tags TEXT[] DEFAULT '{}';

# 3. Test et (development Supabase'de)
npm run db:push

# 4. Çalışıyorsa commit et
git add supabase/migrations/
git commit -m "feat: add tags to events"
git push

# 5. Production'a deploy (eğer hazırsa)
# Production projesine geç ve:
npm run db:push
```

## 🆘 Sorun Giderme

### "Migration already applied" hatası
```bash
# Migration listesini kontrol et
npm run db:status

# Gerekirse specific migration'ı repair et
npx supabase migration repair --version 20240111120000
```

### Type'lar güncellenmiyor
```bash
# Project ID ile manuel çalıştır
npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
```

### Bağlantı sorunu
```bash
# Yeniden link et
npx supabase unlink
npx supabase link --project-ref your-project-ref
```

## 📚 Faydalı Linkler

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Access Token Oluştur](https://supabase.com/dashboard/account/tokens)
- [Migration Docs](https://supabase.com/docs/guides/cli/managing-migrations)

---

**ÖZET:** Migration dosyaları = Veritabanı değişiklik geçmişi. Git'te sakla, takımla paylaş, production'a güvenle deploy et! 🚀