# OAuth Design for Portfolio Mode

## Overview

This document explains the OAuth design decisions for Routine Hub in portfolio mode. The design prioritizes security, simplicity, and explicit user intent over convenience and automation.

## Core Principles

1. **No Refresh Token Storage**: Refresh tokens are NOT stored in portfolio mode
2. **Explicit User Intent**: Each calendar write requires explicit OAuth consent
3. **Admin-Only Writes**: Calendar writes are restricted to admin users
4. **Short-Lived Tokens**: Access tokens are obtained per request and discarded immediately

## Design Rationale

### Why No Refresh Tokens?

**Portfolio Context**:
- Reduces credential exposure risk
- Lowers operational overhead
- Simplifies security model
- Avoids requiring sensitive infrastructure (AWS Secrets Manager)

**Tradeoff**: Each calendar write requires user consent. This is acceptable in portfolio mode where calendar writes are infrequent and explicit.

### Why Admin-Only Calendar Writes?

**Portfolio Context**:
- Avoids requiring reviewers to grant sensitive calendar scopes
- Reduces operational complexity
- Keeps demo focused on design, not automation
- Prevents unintended calendar modifications during review

**Tradeoff**: Regular users cannot export routines to calendar. This is intentional for portfolio demonstration purposes.

### Why Explicit Consent Per Write?

**Portfolio Context**:
- Ensures explicit user intent for each calendar modification
- Reduces risk of unauthorized calendar access
- Makes security model transparent

**Tradeoff**: Users must consent each time they write to calendar. This is acceptable given infrequent writes in portfolio context.

## OAuth Flow

### Authentication (Login)

1. User initiates login via Google OAuth
2. OAuth consent screen requests: `openid`, `email`, `profile`
3. Access token obtained and used for session management
4. Refresh token is **discarded** (not stored)

### Calendar Write (Admin Only)

1. User initiates calendar write (apply routine)
2. **Server-side check**: User must be admin (`currentUser.role === 'admin'`)
3. If not admin, error returned: "Calendar export is limited to admin users"
4. If admin, OAuth consent screen requests: `calendar.events` scope
5. Access token obtained and used for calendar write
6. Access token **discarded** after use
7. Next write requires new consent

## Implementation Details

### Server Actions

**`confirmProposedEventsAction`** (`src/app/actions/calendar.ts`):
- Enforces admin-only access server-side
- Returns clear error message for non-admin users
- Documents OAuth design decisions in comments

### Google Calendar Client

**`GoogleCalendarClient`** (`src/features/calendar/domain/google-client.ts`):
- Obtains access token via `getAccessTokenForUser()`
- Does NOT store refresh tokens
- Each calendar API call may trigger OAuth consent

### OAuth Boundary

**`oauth-boundary.ts`** (`src/infrastructure/auth/oauth-boundary.ts`):
- Manages OAuth token exchange
- **Does NOT store refresh tokens** in portfolio mode
- Uses `prompt=consent` to ensure explicit user intent
- Short-lived access tokens only

## Future Production Considerations

If this were a production application, the following would be considered:

1. **Refresh Token Storage**:
   - Use AWS Secrets Manager or similar
   - Store encrypted refresh tokens per user
   - Enable offline access without re-consent

2. **Background Jobs**:
   - Sync calendar events automatically
   - Handle recurring events efficiently
   - Reduce user interaction overhead

3. **User Calendar Access**:
   - Allow regular users to export routines
   - Implement rate limiting
   - Add audit logging for calendar writes

4. **Token Refresh Strategy**:
   - Automatic token refresh before expiration
   - Cached access tokens with TTL
   - Graceful handling of expired tokens

**These are explicitly NOT implemented in portfolio mode to keep the design focused and secure for demonstration purposes.**

## Security Tradeoffs

| Aspect | Portfolio Mode | Production |
|--------|---------------|------------|
| Refresh Tokens | ❌ Not stored | ✅ Stored securely |
| Calendar Writes | ⚠️ Admin-only | ✅ All authenticated users |
| User Consent | 🔄 Per write | ✅ Once (with refresh token) |
| Background Jobs | ❌ Not used | ✅ Sync automatically |
| Operational Complexity | ✅ Minimal | ⚠️ Higher (infrastructure) |

## Testing

OAuth flows are tested with:
- Mock calendar client (no actual OAuth)
- Admin user simulation
- Error handling for non-admin users
- Token expiration scenarios

See:
- `tests/integration/calendar/calendar-actions.test.ts`
- `src/features/calendar/domain/mock-client.ts`

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Scopes](https://developers.google.com/calendar/api/guides/auth)
- [NextAuth.js Documentation](https://next-auth.js.org/)
