# Community Registration V2

**STATUS: FINAL**  
**VERSION: 2.0**  
**FROZEN: Governance-locked, no modifications without approval**

## Overview

V2 registration system is an enhanced version of the community registration flow with improved rate limiting, validation, and optional AI analysis capabilities.

**IMPORTANT**: This module is governance-locked. Any automation here breaks legal guarantees. Do not auto-modify.

## Features

### Rate Limiting
- **Limit**: Maximum 3 applications per 7 days per (email + IP address)
- **Implementation**: Uses `audit_logs` table with `RATE_LIMIT_CHECK` action
- **Storage**: Rate limit decisions stored in `metadata.fact.*` namespace
- **Response**: Returns HTTP 429 with rate limit details when exceeded

### Enhanced Validation
- Required fields: `community_name`, `email`
- Email format validation
- Email normalization (lowercase, trim)
- All optional fields properly handled

### Optional AI Analysis
- If `statutes` field is provided, performs preliminary analysis
- Results stored in `metadata.ai.*` namespace only
- **Important**: AI analysis is interpretative only and has no legal or procedural power
- Includes disclaimer flag in metadata

### Improved Audit Logging
- Action: `COMMUNITY_APPLICATION_SUBMITTED`
- Includes IP address tracking (if available)
- Metadata uses namespaced keys (`fact.*`, `ai.*`)
- Source identifier: `community_registration_v2`

### Existing Application Handling
- Checks for active applications (status NOT IN ('REJECTED', 'DECLINED'))
- Returns existing token if valid (not expired)
- Prevents duplicate applications

## API Endpoint

### POST `/api/v2/register-community`

**Request Body:**
```typescript
{
  community_name: string        // Required
  email: string                 // Required
  contact_person?: string       // Optional
  description?: string          // Optional
  registration_number?: string // Optional
  address?: string             // Optional
  usage_purpose?: string       // Optional
  statutes?: string            // Optional - for AI analysis
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Paraiška gauta. Patikrinkite el. paštą dėl tolesnių žingsnių.",
  "applicationId": "uuid"
}
```

**Rate Limit Exceeded (429):**
```json
{
  "error": "Per daug paraiškų. Maksimalus skaičius: 3 per 7 dienas.",
  "rate_limit_exceeded": true,
  "count": 3,
  "limit": 3
}
```

**Existing Application (200):**
```json
{
  "success": true,
  "message": "Paraiška su šiuo el. paštu jau pateikta...",
  "existing": true,
  "onboardingLink": "https://..."
}
```

## UI Page

### `/register-community-v2`

Public registration form that calls the V2 API endpoint.

**Features:**
- Same form fields as V1
- Additional `statutes` field for optional AI analysis
- Enhanced error handling for rate limits
- Client-side email validation

## Database Schema

### `community_applications` Table

V2 uses the same table structure as V1, with enhanced metadata:

```json
{
  "fact": {
    "source": "community_registration_v2",
    "submitted_at": "ISO timestamp",
    "ip_address": "client IP (if available)"
  },
  "ai": {
    "summary": "AI analysis summary",
    "risks": ["risk1", "risk2"],
    "disclaimer": true
  }
}
```

**Important**: All metadata keys must be namespaced (`fact.*`, `ai.*`).

### `audit_logs` Table

Rate limiting uses audit_logs:

- **Action**: `RATE_LIMIT_CHECK`
- **Metadata**: `fact.email`, `fact.ip_address`, `fact.decision`, `fact.count`, `fact.limit`

Application submission:

- **Action**: `COMMUNITY_APPLICATION_SUBMITTED`
- **Target**: `community_applications`
- **Metadata**: `fact.source`, `fact.email`, `fact.community_name`, `fact.ip_address`

## Rate Limiting Implementation

Rate limiting is implemented entirely in the API layer using existing database tables:

1. **Check**: Query `audit_logs` for `RATE_LIMIT_CHECK` actions in last 7 days
2. **Count**: Count entries matching email + IP combination with `decision='allow'`
3. **Decision**: Allow if count < 3, deny otherwise
4. **Log**: Store decision in `audit_logs` with `metadata.fact.*` namespace

**No schema changes required** - uses existing `audit_logs` table.

## IP Address Detection

The system attempts to extract client IP from request headers in this order:

1. `x-forwarded-for` (first IP if multiple)
2. `x-real-ip`
3. `cf-connecting-ip` (Cloudflare)

If no IP is available, rate limiting still works but only tracks by email.

## AI Analysis

If `statutes` field is provided:

1. Performs preliminary analysis (placeholder implementation)
2. Stores results in `metadata.ai.*` namespace:
   - `ai.summary`: Brief analysis summary
   - `ai.risks`: Array of risk/disclaimer messages
   - `ai.disclaimer`: Boolean flag indicating analysis is interpretative only

**Important**: AI analysis:
- Does NOT affect application logic
- Does NOT create facts or decisions
- Is interpretative only
- Must always include disclaimer

## Email Templates

V2 uses the same email templates as V1:

- **Admin notification**: `getRegistrationAdminEmail()`
- **Applicant confirmation**: `getRegistrationConfirmationEmail()`

Both templates are imported from `@/lib/email-templates`.

## Migration from V1

V2 is designed to run in parallel with V1:

- **No changes** to existing V1 routes (`/api/register-community`, `/register-community`)
- **New routes** are completely separate (`/api/v2/register-community`, `/register-community-v2`)
- **Same database tables** - both versions use `community_applications`
- **Compatible** - V2 applications can be processed by existing onboarding flow

## Enabling V2

To enable V2 registration:

1. **Deploy** the new routes (already in codebase)
2. **Update links** to point to `/register-community-v2` instead of `/register-community`
3. **Monitor** rate limiting via `audit_logs` table
4. **Test** with various IP addresses and email combinations

## Testing

### Rate Limiting Test

1. Submit 3 applications with same email + IP
2. 4th submission should return HTTP 429
3. Check `audit_logs` for `RATE_LIMIT_CHECK` entries

### Existing Application Test

1. Submit application with email
2. Submit again with same email before token expires
3. Should return existing token, not create new application

### AI Analysis Test

1. Submit application with `statutes` field
2. Check `community_applications.metadata.ai.*` for analysis results
3. Verify disclaimer flag is present

## Configuration

Rate limiting constants (in `route.ts`):

```typescript
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_DAYS = 7
```

Token expiration:

```typescript
tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30) // 30 days
```

## Security Considerations

1. **Rate Limiting**: Prevents abuse but may block legitimate users sharing IPs
2. **IP Detection**: May not work behind certain proxies/CDNs
3. **Email Validation**: Client-side validation is for UX only; server validates
4. **AI Analysis**: Placeholder implementation - replace with actual AI service in production

## Status

**FROZEN**: This module is governance-locked. No modifications without governance approval.

All features are final. No future enhancements planned.

## Testing

See `docs/V2_REGISTRATION_TESTING_GUIDE.md` for comprehensive testing guide.

## Support

For issues or questions:
- Check `audit_logs` for rate limit decisions
- Review `community_applications.metadata` for application data
- Monitor email delivery via email service logs
