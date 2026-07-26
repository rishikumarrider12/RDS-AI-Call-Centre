# RDS AI Call Centre — Authentication Report

**Module:** Phase 3.1 — Enterprise Authentication Foundation  
**Database:** Supabase Auth (PostgreSQL + GoTrue)  
**Date:** 2026-07-04  
**Status:** Email/Password Authentication Complete

---

## 1. Architecture

```
Client → Express API → Supabase Auth (GoTrue)
                              ↓
                        PostgreSQL (auth schema)
                              ↓
                     Custom users/profile tables
```

The authentication layer proxies all auth operations to Supabase Auth. The API never stores passwords. JWT tokens are issued by Supabase and validated server-side. Sessions are managed via secure HttpOnly cookies.

---

## 2. Implemented Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| `POST` | `/api/auth/register` | Register new user with email/password | No |
| `POST` | `/api/auth/login` | Login with email/password | No |
| `POST` | `/api/auth/logout` | Invalidate current session | No |
| `POST` | `/api/auth/forgot-password` | Send password reset email | No |
| `POST` | `/api/auth/reset-password` | Reset password with token | No |
| `POST` | `/api/auth/verify-email` | Verify email with token | No |
| `GET` | `/api/auth/me` | Get current session/user | Yes |
| `POST` | `/api/auth/refresh` | Refresh access token via refresh cookie | No |

---

## 3. Request/Response Schemas

### Register
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Rishi Kumar"
}

// Response 201
{
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Login
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Session Check (`/me`)
```json
// Response 200
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Rishi Kumar"
  }
}
```

### Logout
```json
// Response 200
{
  "message": "Logout successful"
}
```

### Forgot Password
```json
// Request
{
  "email": "user@example.com"
}

// Response 200
{
  "message": "Password reset email sent"
}
```

### Reset Password
```json
// Request
{
  "token": "recovery-token-from-email",
  "password": "NewSecurePass123!"
}

// Response 200
{
  "message": "Password reset successful"
}
```

### Verify Email
```json
// Request
{
  "token": "signup-token-from-email"
}

// Response 200
{
  "message": "Email verified successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

## 4. Security Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Supabase Auth** | ✅ | Centralized auth via GoTrue |
| **JWT** | ✅ | Access tokens issued by Supabase |
| **Refresh Tokens** | ✅ | Issued on login, stored in HttpOnly cookies |
| **Password Hashing** | ✅ | Handled by Supabase (bcrypt/scrypt) |
| **Secure HttpOnly Cookies** | ✅ | `rds_access_token` and `rds_refresh_token` |
| **Cookie Security** | ✅ | `secure` flag in production, `sameSite` configurable |
| **Rate Limiting** | ✅ | `express-rate-limit` middleware |
| **CORS** | ✅ | Configurable via `CORS_ORIGIN`, supports credentials |
| **Helmet** | ✅ | Security headers enabled |
| **Zod Validation** | ✅ | All inputs validated |
| **Logging** | ✅ | Auth events logged via Pino |

### Pending Security Features (Future Phases)
- CSRF protection
- Device tracking
- Login history
- Session revocation list
- Failed login protection / account lockout
- IP logging
- Browser logging
- OAuth providers (Google, GitHub, Microsoft)
- Phone OTP
- Magic link

---

## 5. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anon/public key |
| `APP_URL` | No | `http://localhost:3000` | Frontend URL for email redirects |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins |
| `COOKIE_SECURE` | No | `false` | Set to `true` in production |
| `COOKIE_SAMESITE` | No | `lax` | `strict` or `lax` |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000` | Frontend API URL |

---

## 6. Integration Points

### Supabase Auth Settings

In your Supabase project, ensure the following are configured:

1. **Email Provider:** Enabled
2. **Confirm Email:** Toggle based on workflow preference
3. **Site URL:** Set to `http://localhost:3000` (dev) or your production URL
4. **Redirect URLs:** Add `http://localhost:3000/auth/reset-password` (and production equivalent)
5. **SMTP:** Configure a custom SMTP provider (e.g., Resend, Postmark) for production emails

### Database Dependencies

Supabase Auth automatically creates the `auth.users` table. Your application `users` table should link to it via `auth_user_id`.

---

## 7. Frontend Pages

| Route | File | Purpose |
|-------|------|---------|
| `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | Email/password login |
| `/auth/register` | `apps/web/src/app/auth/register/page.tsx` | New user registration |
| `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | Request password reset |
| `/auth/reset-password` | `apps/web/src/app/auth/reset-password/page.tsx` | Set new password |
| `/auth/verify-email` | `apps/web/src/app/auth/verify-email/page.tsx` | Email verification handler |

All pages are client components using Next.js App Router and fetch with `credentials: 'include'` for cookie-based auth.

---

## 8. Testing

### Manual Verification Steps

1. **Register:** `POST /api/auth/register`
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"test@example.com","password":"TestPass123!","full_name":"Test User"}'
   ```

2. **Login:** `POST /api/auth/login`
   ```bash
   curl -X POST http://localhost:4000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"test@example.com","password":"TestPass123!"}'
   ```

3. **Session Check:** `GET /api/auth/me`
   ```bash
   curl -X GET http://localhost:4000/api/auth/me \
     -H 'Cookie: rds_access_token=<token>'
   ```

4. **Forgot Password:** `POST /api/auth/forgot-password`
   ```bash
   curl -X POST http://localhost:4000/api/auth/forgot-password \
     -H 'Content-Type: application/json' \
     -d '{"email":"test@example.com"}'
   ```

5. **Reset Password:** `POST /api/auth/reset-password`
   ```bash
   curl -X POST http://localhost:4000/api/auth/reset-password \
     -H 'Content-Type: application/json' \
     -d '{"token":"<recovery-token>","password":"NewPass123!"}'
   ```

6. **Verify Email:** `POST /api/auth/verify-email`
   ```bash
   curl -X POST http://localhost:4000/api/auth/verify-email \
     -H 'Content-Type: application/json' \
     -d '{"token":"<signup-token>"}'
   ```

---

## 9. Known Limitations

1. **OAuth not implemented** — Google, GitHub, Microsoft OAuth will be added in a future phase.
2. **No RBAC** — Roles and permissions will be enforced once the authorization module is built.
3. **No CSRF protection** — To be added in Phase 5.
4. **No refresh endpoint exposed to clients** — `/api/auth/refresh` exists but frontend auto-refresh not implemented yet.
5. **No password strength enforcement at API** — Supabase handles this, but additional checks (zxcvbn) can be added.

---

## 10. Next Steps

1. Implement RBAC middleware (`authenticate` → `authorize`)
2. Add Super Owner authentication module
3. Implement CSRF protection
4. Add device tracking and login history
5. Add session revocation
6. Add failed login protection and account lockout
7. Add phone OTP support (future-ready)
8. Implement magic link authentication

---

## File Structure

```
apps/api/src/
├── lib/
│   ├── auth.ts              # Supabase Auth service wrapper
│   └── env.ts               # Environment config with cookie settings
├── middleware/
│   └── auth.ts              # JWT authentication middleware
├── routes/
│   └── auth.ts              # Auth route handlers
└── types/
    └── auth.ts              # Auth TypeScript types

apps/web/src/app/auth/
├── login/page.tsx           # Login page
├── register/page.tsx        # Registration page
├── forgot-password/page.tsx # Forgot password page
├── reset-password/page.tsx  # Reset password page
└── verify-email/page.tsx    # Email verification page
```

---

*Report generated: 2026-07-04*

