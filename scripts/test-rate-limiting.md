# Rate Limiting Test Rehberi

## 🔥 **Rate Limiting Nasıl Test Edilir?**

### 1. **Normal Kullanım (İzin Verilen)**
- RSVP butonuna tıklayın (Going)
- 2-3 saniye bekleyin
- Tekrar değiştirin (Interested)
- Bu normal kullanımda sorun yok

### 2. **Rate Limiting'i Tetikleme**
- **Hızlı tıklayın**: 10 saniye içinde 10+ kez RSVP değiştirin
- Going → Interested → Not Going → Going... tekrarla
- Çok hızlı tıklayarak sistemi zorla

### 3. **Beklenen Sonuçlar**

#### ✅ **Database Seviyesi**:
- 10. değişiklikten sonra SQL error
- Error code: `42820`
- Message: `"Too many RSVP changes. Please try again later."`

#### ✅ **UI Seviyesi** (Artık çalışıyor):
- Toast notification: "Too many changes"
- Analytics'te **Rate Limited** sayısı artar
- **Last Error** bölümünde error detayı görünür

### 4. **Analytics'te Görülen Değişiklikler**

**Rate Limiting tetiklendiğinde:**
```
Error Tracking:
  0     ↗️ 3     0
Capacity  Rate    Other
Full     Limited  Errors

Last Error:
Too many RSVP changes. Please try again later.
2 dakika önce
```

### 5. **Rate Limit Süreleri**
- **Database**: 1 saat pencere (10 değişiklik)
- **Reset**: Otomatik 1 saat sonra
- **Window**: Sliding window (her action'dan itibaren)

### 6. **Test Sonrası**
- 1 saat bekleyin veya
- Database'den rate limit record'unu silin:
```sql
DELETE FROM rsvp_rate_limits WHERE user_id = 'YOUR_USER_ID';
```

## 🎯 **Gerçek Dünya Senaryosu**

Rate limiting şu durumlarda devreye girer:

1. **Spam Protection**: Bot'lar hızla RSVP değiştirmeye çalışır
2. **UI Bug**: Kullanıcı butona çok hızlı tıklar
3. **Network Issues**: Retry mechanism çok agresif çalışır

Bu sistem production'da **abuse'u önler** ve **server'ı korur**! 🛡️