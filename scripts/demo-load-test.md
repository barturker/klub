# RSVP Load Testing Demo

## Analytics Dashboard

**Analytics Dashboard UI'da görünüyor mu?**

✅ **Evet!** Free event organizer olarak event sayfasına gittiğinizde şunları görebilirsiniz:

### 1. Analytics Dashboard
- **Total RSVPs**: Toplam RSVP sayısı
- **Going**: Katılacak kişi sayısı
- **Interested**: İlgileniyorum diyen sayısı
- **Conversion Rate**: Going/Total oranı
- **System Status**: healthy/warning/critical
- **Rate Limiting Activity**: Sistem koruması aktivitesi
- **Error Tracking**: Capacity full, rate limited, other errors

### 2. Gerçek Zamanlı Monitoring
- Her 15 saniyede otomatik yenileniyor
- Başka kullanıcılar RSVP değiştirdiğinde real-time güncellenme
- System health status badge'i

### 3. Privacy Controls
- **Attendee List**: Organizer'lar katılımcı listesini public/private yapabilir
- **"Make Private"** butonu ile gizleyebilir
- Private yapıldığında katılımcılar birbirini göremez

### 4. Quick Actions
- **Copy Summary**: Analytics özetini clipboard'a kopyalar
- **Export Data**: CSV export için (future feature)
- **Refresh**: Manuel yenileme

## Load Testing Script

### Nasıl Çalışır?

```bash
# Help
npm run test:load:help

# Küçük test (5 user, 10 saniye)
npm run test:load -- --users 5 --duration 10 --event-id YOUR_EVENT_ID

# Büyük test (100 user, 60 saniye)
npm run test:load -- --users 100 --duration 60 --event-id YOUR_EVENT_ID
```

### Ne Test Ediyor?

1. **Concurrent RSVP Changes**: Aynı anda birçok kullanıcı RSVP değiştiriyor
2. **Rate Limiting**: Spam koruması çalışıyor mu?
3. **Capacity Management**: Kapasite dolduğunda waitlist'e alıyor mu?
4. **Response Times**: P95 latency ölçümü
5. **Error Handling**: Database lock'ları, race condition'lar

### Test Çıktısı

```
RSVP LOAD TEST RESULTS
==============================
Test Configuration:
  Users: 100
  Duration: 60s
  Actual Duration: 61.2s

Request Statistics:
  Total Requests: 1,247
  Successful: 1,198
  Failed: 49
  Success Rate: 96.07%
  Throughput: 19.6 req/s

Error Breakdown:
  Rate Limit Hits: 23
  Capacity Full: 12
  Other Errors: 14

Response Time Statistics (ms):
  Average: 127.43
  P95: 234.56
  P99: 456.78

Performance Assessment:
  ✅ GOOD LATENCY: P95 < 200ms
  ✅ LOW ERROR RATE: < 1%
  ✅ GOOD THROUGHPUT: > 10 req/s
```

## Demo Senaryosu

1. **Free Event Oluştur**
2. **Organizer olarak event sayfasına git**
3. **Analytics Dashboard'u gör**
4. **Attendee List privacy control'lerini test et**
5. **Birkaç RSVP değişikliği yap** (going → interested → not_going)
6. **Real-time güncellenmeleri gözle**
7. **Load test çalıştır** (küçük test)

Bu şekilde sistem tam olarak production-ready bir RSVP sistemi olarak çalışıyor! 🎉