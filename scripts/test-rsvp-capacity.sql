-- Test RSVP Capacity Script
-- Bu script ile tek bir event için test RSVP'leri oluşturabilirsiniz

-- KULLANIM:
-- 1. Event ID'sini alın (browser'da event sayfasındayken URL'den veya network tab'dan)
-- 2. Aşağıdaki değişkenleri güncelleyin
-- 3. Supabase SQL Editor'de çalıştırın

-- ====================================
-- AYARLAR (Bunları değiştirin)
-- ====================================
DO $$
DECLARE
    target_event_id UUID := 'YOUR_EVENT_ID_HERE'::UUID; -- Event ID'yi buraya yapıştırın
    num_rsvps INTEGER := 9; -- Kaç test RSVP eklenecek (kapasite 10 ise, 9 ekleyin)
    test_user_prefix TEXT := 'test_user_'; -- Test kullanıcı prefix'i
BEGIN
    -- Mevcut test RSVP'lerini temizle (opsiyonel)
    DELETE FROM event_rsvps
    WHERE event_id = target_event_id
    AND user_id IN (
        SELECT id FROM profiles
        WHERE username LIKE test_user_prefix || '%'
    );

    -- Test kullanıcıları oluştur ve RSVP ekle
    FOR i IN 1..num_rsvps LOOP
        -- Test kullanıcısı oluştur (eğer yoksa)
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data
        )
        VALUES (
            gen_random_uuid(),
            test_user_prefix || i || '@test.com',
            crypt('password123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{}'::jsonb
        )
        ON CONFLICT (email) DO NOTHING;

        -- Profile oluştur
        INSERT INTO profiles (
            id,
            username,
            display_name,
            created_at,
            updated_at
        )
        SELECT
            id,
            test_user_prefix || i,
            'Test User ' || i,
            NOW(),
            NOW()
        FROM auth.users
        WHERE email = test_user_prefix || i || '@test.com'
        ON CONFLICT (id) DO NOTHING;

        -- RSVP ekle
        INSERT INTO event_rsvps (
            event_id,
            user_id,
            status,
            created_at,
            updated_at
        )
        SELECT
            target_event_id,
            id,
            'going',
            NOW() - (i || ' minutes')::INTERVAL, -- Farklı zamanlar için
            NOW() - (i || ' minutes')::INTERVAL
        FROM profiles
        WHERE username = test_user_prefix || i
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET
            status = 'going',
            updated_at = NOW();
    END LOOP;

    -- Sonuçları göster
    RAISE NOTICE 'Test tamamlandı! % RSVP eklendi.', num_rsvps;
END $$;

-- Mevcut RSVP durumunu kontrol et
SELECT
    e.title,
    e.capacity,
    e.rsvp_going_count,
    e.rsvp_interested_count,
    CASE
        WHEN e.capacity IS NOT NULL THEN e.capacity - e.rsvp_going_count
        ELSE NULL
    END as remaining_spots
FROM events e
WHERE e.id = 'YOUR_EVENT_ID_HERE'::UUID;

-- RSVP listesini göster
SELECT
    r.status,
    p.display_name,
    p.username,
    r.created_at
FROM event_rsvps r
JOIN profiles p ON r.user_id = p.id
WHERE r.event_id = 'YOUR_EVENT_ID_HERE'::UUID
ORDER BY r.created_at DESC;

-- ====================================
-- TEMİZLİK (Test sonrası kullanın)
-- ====================================
-- Test RSVP'lerini temizle
/*
DELETE FROM event_rsvps
WHERE event_id = 'YOUR_EVENT_ID_HERE'::UUID
AND user_id IN (
    SELECT id FROM profiles
    WHERE username LIKE 'test_user_%'
);

-- Test kullanıcılarını temizle (opsiyonel)
DELETE FROM profiles WHERE username LIKE 'test_user_%';
DELETE FROM auth.users WHERE email LIKE 'test_user_%@test.com';
*/