# 📚 Klub API Documentation

**Version:** 1.0.0
**Base URL:** `https://api.klub.app` (production) | `http://localhost:3000` (development)
**Authentication:** Supabase JWT Bearer Token

---

## 🔐 Authentication

All API requests require authentication unless specified otherwise.

### Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Get Auth Token
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## 📊 Rate Limiting

| Endpoint Type | Rate Limit | Window |
|--------------|------------|---------|
| General API | 60 requests | 1 minute |
| Auth endpoints | 5 requests | 15 minutes |
| Payment endpoints | 10 requests | 1 hour |
| Upload endpoints | 20 requests | 1 hour |

Rate limit headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2025-09-19T12:00:00Z
Retry-After: 60
```

---

## 🔗 API Endpoints

### Communities

#### Create Community
```http
POST /api/communities
```

**Request Body:**
```json
{
  "name": "Tech Innovators",
  "description": "A community for tech enthusiasts",
  "slug": "tech-innovators",
  "is_public": true,
  "metadata": {
    "category": "technology"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "community": {
    "id": "uuid",
    "name": "Tech Innovators",
    "slug": "tech-innovators",
    "created_at": "2025-09-19T10:00:00Z",
    "organizer_id": "user-uuid"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Community with this slug already exists"
}
```

---

#### Get Community
```http
GET /api/communities/:slug
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Tech Innovators",
  "slug": "tech-innovators",
  "description": "A community for tech enthusiasts",
  "member_count": 150,
  "is_public": true,
  "created_at": "2025-09-19T10:00:00Z",
  "avatar_url": "https://...",
  "cover_image_url": "https://..."
}
```

---

#### Update Community
```http
PATCH /api/communities/:id
```

**Headers:**
```http
Authorization: Bearer <TOKEN>
X-Community-Role: admin
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "is_public": false
}
```

---

### Events

#### Create Event
```http
POST /api/events
```

**Request Body:**
```json
{
  "community_id": "uuid",
  "title": "Web3 Workshop",
  "description": "Learn about blockchain",
  "start_at": "2025-10-01T18:00:00Z",
  "end_at": "2025-10-01T21:00:00Z",
  "location": "Online",
  "capacity": 100,
  "metadata": {
    "is_free": true,
    "tags": ["web3", "blockchain"]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "event": {
    "id": "uuid",
    "slug": "web3-workshop",
    "title": "Web3 Workshop",
    "status": "published",
    "created_at": "2025-09-19T10:00:00Z"
  }
}
```

---

#### List Events
```http
GET /api/events
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| community_id | string | Filter by community |
| status | string | draft, published, cancelled |
| start_after | ISO 8601 | Events after this date |
| limit | number | Max results (default: 20) |
| offset | number | Pagination offset |

**Example:**
```http
GET /api/events?community_id=uuid&status=published&limit=10
```

---

#### RSVP to Event
```http
POST /api/events/:id/rsvp
```

**Request Body:**
```json
{
  "status": "going" // going | interested | not_going
}
```

**Response (200):**
```json
{
  "success": true,
  "rsvp": {
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "going",
    "created_at": "2025-09-19T10:00:00Z"
  }
}
```

**Error Response (409):**
```json
{
  "error": "Event is at full capacity"
}
```

---

### Tickets & Payments

#### Get Ticket Tiers
```http
GET /api/events/:id/tiers
```

**Response (200):**
```json
{
  "tiers": [
    {
      "id": "uuid",
      "name": "Early Bird",
      "price": 2500, // in cents
      "currency": "USD",
      "capacity": 50,
      "sold_count": 10,
      "available": true
    }
  ]
}
```

---

#### Create Payment Intent
```http
POST /api/checkout/create-intent
```

**Request Body:**
```json
{
  "event_id": "uuid",
  "tier_id": "uuid",
  "quantity": 2,
  "metadata": {
    "user_email": "user@example.com"
  }
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 5000,
  "currency": "USD",
  "order_id": "uuid"
}
```

---

#### Confirm Payment
```http
POST /api/checkout/confirm-payment
```

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "order_id": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticket_code": "TKT123ABC",
    "status": "valid"
  }
}
```

---

### Stripe Connect

#### Get Connect Account
```http
GET /api/stripe/account
```

**Response (200):**
```json
{
  "account": {
    "id": "acct_xxx",
    "charges_enabled": true,
    "payouts_enabled": true,
    "requirements": {
      "currently_due": [],
      "eventually_due": []
    }
  }
}
```

---

#### Create Connect Onboarding
```http
POST /api/stripe/onboarding
```

**Request Body:**
```json
{
  "community_id": "uuid",
  "return_url": "https://app.klub.app/communities/slug/settings",
  "refresh_url": "https://app.klub.app/communities/slug/stripe"
}
```

**Response (200):**
```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

---

### User Profile

#### Get Profile
```http
GET /api/profile
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "bio": "Software developer",
  "avatar_url": "https://...",
  "location": "San Francisco",
  "interests": ["tech", "startups"],
  "social_links": {
    "twitter": "johndoe",
    "linkedin": "johndoe"
  },
  "profile_complete": true,
  "member_since": "2025-01-01T00:00:00Z"
}
```

---

#### Update Profile
```http
PATCH /api/profile
```

**Request Body:**
```json
{
  "display_name": "Jane Doe",
  "bio": "Updated bio",
  "location": "New York",
  "interests": ["ai", "ml"],
  "privacy_level": "public"
}
```

---

#### Upload Avatar
```http
POST /api/profile/avatar
```

**Request Body (multipart/form-data):**
```
file: <binary>
x: 0
y: 0
width: 200
height: 200
```

**Response (200):**
```json
{
  "success": true,
  "avatar_url": "https://storage.supabase.co/..."
}
```

---

## 🔴 Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid auth token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (duplicate) |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Error Response Format
```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

---

## 🧪 Testing

### Development Environment
```bash
# Set environment
export API_URL=http://localhost:3000

# Get auth token
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Use token in requests
curl -X GET $API_URL/api/communities \
  -H "Authorization: Bearer <TOKEN>"
```

### Postman Collection
Import the Postman collection from `docs/api/klub-api.postman_collection.json`

---

## 🔄 Webhooks

### Stripe Webhooks
```http
POST /api/stripe/webhook
```

**Headers:**
```http
Stripe-Signature: t=timestamp,v1=signature
```

**Supported Events:**
- `payment_intent.succeeded`
- `payment_intent.failed`
- `checkout.session.completed`
- `account.updated`
- `account.application.deauthorized`

---

## 📈 Monitoring

### Health Check
```http
GET /api/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-19T10:00:00Z",
  "services": {
    "database": "connected",
    "stripe": "connected",
    "storage": "connected"
  }
}
```

---

## 🚀 Deployment Notes

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### CORS Configuration
Production CORS allowed origins:
- https://klub.app
- https://www.klub.app
- https://app.klub.app

---

## 📝 Changelog

### v1.0.0 (2025-09-19)
- Initial API release
- Communities CRUD
- Events management
- RSVP system
- Stripe payments
- User profiles

---

## 🆘 Support

For API issues or questions:
- GitHub Issues: https://github.com/klub/api-issues
- Email: api-support@klub.app
- Discord: https://discord.gg/klub

---

*Generated: 2025-09-19*
*Last Updated: 2025-09-19*