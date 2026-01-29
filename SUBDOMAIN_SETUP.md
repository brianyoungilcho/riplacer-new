# Subdomain Setup: riplacer.com vs app.riplacer.com

## How It Works

### Domain Separation
- **riplacer.com** → Marketing site + onboarding (public)
  - `/` - Landing page
  - `/start` - Onboarding
  - `/auth` - Sign in/sign up
  - `/thank-you` - Post-signup
  - `/terms`, `/privacy`, etc. - Legal pages
  
- **app.riplacer.com** → Dashboard ONLY (auth-protected)
  - `/` - Dashboard (clean URL!)
  - `/auth` - Sign in/sign up (for direct access)
  - If not logged in → redirects to `riplacer.com/auth`

### Technical Implementation

**Domain Detection (`src/lib/domain.ts`):**
- `isAppSubdomain()` - Detects if on `app.riplacer.com` or `app.localhost`
- `isMainDomain()` - Detects if on `riplacer.com` or `localhost`
- `redirectToApp()` - Cross-domain redirect with session transfer
- `redirectToMain()` - Cross-domain redirect to main site

**SubdomainRedirect Component:**
- Receives and processes transferred sessions from main domain
- Redirects unauthenticated users on app subdomain to `riplacer.com/auth`

**Domain-Aware Routing (`App.tsx`):**
- On `app.riplacer.com`: `/` → Dashboard
- On `riplacer.com`: `/` → Landing page
- Auth works on both domains

**Session Transfer:**
- When redirecting from `riplacer.com` to `app.riplacer.com`, auth tokens are passed via URL hash
- The app subdomain picks up these tokens and restores the session
- This ensures seamless auth across subdomains despite separate localStorage

---

## User Flows

### First-time User Flow:
1. Visits `riplacer.com`
2. Clicks "Get Started" → `/start`
3. Completes onboarding (may sign in during process)
4. Clicks "Start Ripping" → `/thank-you`
5. Clicks "Go to Dashboard" → redirects to `app.riplacer.com` with session
6. Dashboard loads with clean URL

### Direct Sign-In Flow:
1. User visits `riplacer.com/auth`
2. Signs in with email/password or Google
3. Automatically redirected to `app.riplacer.com` with session
4. Dashboard loads

### Returning User Flow:
1. User visits `app.riplacer.com`
2. If authenticated → Dashboard loads immediately
3. If not authenticated → Redirected to `riplacer.com/auth`
4. After sign in → Back to `app.riplacer.com`

### Google OAuth Flow:
1. User clicks "Continue with Google" (on either domain)
2. Google OAuth flow completes
3. Redirected to `app.riplacer.com` (OAuth redirect is always to app subdomain)
4. Dashboard loads

---

## URL Behavior Matrix

| URL | Authenticated | Not Authenticated |
|-----|--------------|-------------------|
| `riplacer.com` | Landing page | Landing page |
| `riplacer.com/start` | Onboarding | Onboarding |
| `riplacer.com/auth` | → `app.riplacer.com` | Auth page |
| `riplacer.com/app` | Dashboard | Dashboard (legacy) |
| `app.riplacer.com` | Dashboard | → `riplacer.com/auth` |
| `app.riplacer.com/auth` | → Dashboard | Auth page |

---

## Testing Locally

### Test Main Domain Behavior
```bash
# Simulates riplacer.com
http://localhost:8081/           # Landing page
http://localhost:8081/start      # Onboarding
http://localhost:8081/auth       # Auth page
```

### Test Subdomain Behavior
To test subdomain redirect locally:

1. **Add to `/etc/hosts`:**
   ```
   127.0.0.1 app.localhost
   ```

2. **Visit:**
   ```
   http://app.localhost:8081/
   ```
   - If logged in → Dashboard loads
   - If not logged in → Redirects to `http://localhost:8081/auth`

---

## Production Behavior

### Vercel Configuration
Both domains point to the SAME Vercel deployment:
- `riplacer.com` → Production deployment
- `app.riplacer.com` → Production deployment (aliased)

### In Vercel Dashboard
Go to: https://vercel.com/brianyoungilchos-projects/riplacer-new/settings/domains

**Should see:**
- ✅ riplacer.com (or your main domain)
- ✅ app.riplacer.com (subdomain)

---

## Key Implementation Details

### Cross-Subdomain Auth
Since `localStorage` is not shared between subdomains, we transfer the session:

1. Get current session tokens from Supabase
2. Redirect with tokens in URL hash: `app.riplacer.com/#access_token=...&refresh_token=...&type=session_transfer`
3. On target domain, parse tokens and call `supabase.auth.setSession()`
4. Clean up URL after processing

### Why URL Hash?
- Hash (`#`) is not sent to the server (more secure)
- Supabase already uses this pattern for OAuth callbacks
- Works with static hosting (no server-side processing needed)

---

## Summary

✅ **riplacer.com** = Public site (marketing, onboarding, auth)
✅ **app.riplacer.com** = Dashboard with clean `/` URL (auth-protected)
✅ **Same deployment** = Single codebase, smart routing
✅ **Session transfer** = Seamless auth across subdomains
✅ **Google OAuth** = Always redirects to app subdomain

**This is live and working!** Test at https://app.riplacer.com
