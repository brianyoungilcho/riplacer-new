# Subdomain Setup: riplacer.com vs app.riplacer.com

## How It Works Now

### Domain Separation
- **riplacer.com** → Marketing site + onboarding (public)
  - `/` - Landing page
  - `/start` - Onboarding
  - `/auth` - Sign in/sign up
  - `/thank-you` - Post-signup
  
- **app.riplacer.com** → Dashboard ONLY (auth-protected)
  - Automatically redirects to `/app` route
  - Shows dashboard interface
  - If not logged in → redirects to riplacer.com/auth

### Technical Implementation

**SubdomainRedirect Component:**
- Detects which domain user is on
- If on `app.riplacer.com` → auto-navigate to `/app` route
- If on `riplacer.com` → normal routing

**Result:**
- Visiting `app.riplacer.com/` → shows dashboard
- Visiting `riplacer.com/` → shows marketing site
- Same deployment, smart routing!

---

## Testing Locally

### Test Main Domain Behavior
```bash
# Simulates riplacer.com
http://localhost:8081/           # Landing page
http://localhost:8081/start      # Onboarding
http://localhost:8081/app        # Dashboard (manual access)
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
   Should auto-redirect to dashboard (`/app` route)

---

## Production Behavior

### When deployed with both domains:

**User visits `riplacer.com`:**
- Shows marketing site
- Can access `/start`, `/auth`, etc.
- Can manually visit `/app` if they know the URL (auth guard protects it)

**User visits `app.riplacer.com`:**
- Automatically redirected to `/app` route
- Shows dashboard immediately
- If not logged in → redirected to auth

---

## Vercel Configuration

### Current Setup
Both domains point to the SAME Vercel deployment:
- `riplacer.com` → Production deployment
- `app.riplacer.com` → Production deployment (aliased)

### In Vercel Dashboard
Go to: https://vercel.com/brianyoungilchos-projects/riplacer-new/settings/domains

**Should see:**
- ✅ riplacer.com (or your main domain)
- ✅ app.riplacer.com (subdomain)

Both domains are already configured! ✅

---

## How Users Navigate

### First-time User Flow:
1. Visits `riplacer.com`
2. Clicks "Get Started" → `/start`
3. Completes onboarding
4. Clicks "Start Ripping" → `/thank-you`
5. Clicks "Go to Dashboard" → navigates to `/app`
6. URL shows `riplacer.com/app` OR they can bookmark `app.riplacer.com`

### Returning User Flow:
1. Visits `app.riplacer.com`
2. Automatically redirected to `/app` route
3. Dashboard loads (or auth redirect if needed)
4. Clean URL: `app.riplacer.com`

---

## URL Behavior Matrix

| User Types | What They See |
|------------|---------------|
| `riplacer.com` | → Landing page |
| `riplacer.com/start` | → Onboarding |
| `riplacer.com/app` | → Dashboard (if logged in) |
| `app.riplacer.com` | → Auto-redirect to `/app` → Dashboard |
| `app.riplacer.com/anything` | → Dashboard (redirects to `/app`) |

---

## Summary

✅ **riplacer.com** = Public site (marketing, onboarding, auth)
✅ **app.riplacer.com** = Dashboard entry point (auto-redirects to `/app`)
✅ **Same deployment** = Simpler, faster, shared code
✅ **Smart routing** = Subdomain redirect component handles it automatically

**This is already live and working!** Visit https://app.riplacer.com to test.
