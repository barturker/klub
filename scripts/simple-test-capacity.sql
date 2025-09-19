-- BASİT KAPASİTE TEST SCRIPT'İ
-- Mevcut kullanıcınızla test etmek için

-- ÖNEMLİ: Event ID'sini almak için:
-- 1. Browser'da event sayfasına gidin
-- 2. DevTools > Network sekmesini açın
-- 3. Sayfayı yenileyin
-- 4. "events" request'inde ID'yi bulun
-- VEYA
-- URL'deki slug'dan event ID'yi bulun:

-- Event ID'sini slug'dan bul
SELECT id, title, slug, capacity, rsvp_going_count
FROM events
WHERE slug = 'adfasdf'; -- URL'deki event slug'ını buraya yazın

-- ====================================
-- OPSİYON 1: Fake RSVP'ler ekle (basit yöntem)
-- ====================================
-- Event ID'yi yukarıdaki sorgudan alın ve aşağıya yapıştırın

DO $$
DECLARE
    target_event_id UUID := 'EVENT_ID_BURAYA'::UUID;
    fake_user_id UUID;
BEGIN
    -- 9 fake RSVP ekle (10. siz olacaksınız)
    FOR i IN 1..9 LOOP
        fake_user_id := gen_random_uuid();

        -- Direkt RSVP tablosuna ekle (RLS bypass için)
        INSERT INTO event_rsvps (
            id,
            event_id,
            user_id,
            status,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            target_event_id,
            fake_user_id,
            'going',
            NOW() - (i || ' minutes')::INTERVAL,
            NOW() - (i || ' minutes')::INTERVAL
        );
    END LOOP;

    -- Count'ları güncelle
    UPDATE events
    SET rsvp_going_count = (
        SELECT COUNT(*) FROM event_rsvps
        WHERE event_id = target_event_id AND status = 'going'
    )
    WHERE id = target_event_id;

    RAISE NOTICE 'Test RSVP''leri eklendi!';
END $$;

-- Durumu kontrol et
SELECT
    e.title,
    e.capacity as "Kapasite",
    e.rsvp_going_count as "Giden",
    e.capacity - e.rsvp_going_count as "Kalan"
FROM events e
WHERE e.slug = 'adfasdf'; -- Event slug'ını buraya yazın

-- ====================================
-- OPSİYON 2: Count'ı direkt değiştir (en hızlı)
-- ====================================
-- RSVP count'ını direkt 9 yap
/*
UPDATE events
SET rsvp_going_count = 9
WHERE slug = 'adfasdf';
*/

-- ====================================
-- TEMİZLİK
-- ====================================
-- Fake RSVP'leri temizle
/*
DELETE FROM event_rsvps
WHERE event_id = (SELECT id FROM events WHERE slug = 'adfasdf')
AND user_id NOT IN (SELECT id FROM profiles);

-- Count'ı sıfırla
UPDATE events
SET rsvp_going_count = 0
WHERE slug = 'adfasdf';
*/