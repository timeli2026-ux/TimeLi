# Phase 02: User Setup Required

**Generated:** 2026-01-16
**Phase:** 02-auth-session-security
**Status:** Incomplete

## Google OAuth Configuration

Google OAuth requires configuration in both Google Cloud Console and Supabase Dashboard.

### Step 1: Google Cloud Console Setup

1. **Go to** [Google Cloud Console](https://console.cloud.google.com/)
2. **Create or select** a project
3. **Navigate to** APIs & Services > Credentials
4. **Click** "Create Credentials" > "OAuth client ID"
5. **Select** Application type: "Web application"
6. **Configure**:
   - Name: TimeLi (or your app name)
   - Authorized JavaScript origins: Add your app URLs
   - Authorized redirect URIs: `https://[your-project-ref].supabase.co/auth/v1/callback`

### Step 2: Supabase Dashboard Setup

| Status | Task | Location |
|--------|------|----------|
| [ ] | Enable Google OAuth provider | Supabase Dashboard > Authentication > Providers > Google |
| [ ] | Add Google Client ID | Same location - paste from Google Cloud Console |
| [ ] | Add Google Client Secret | Same location - paste from Google Cloud Console |

### Configuration Checklist

- [ ] **Google Cloud Console**
  - [ ] Created OAuth 2.0 Client ID
  - [ ] Added redirect URI: `https://[your-project-ref].supabase.co/auth/v1/callback`
  - [ ] Copied Client ID and Client Secret

- [ ] **Supabase Dashboard**
  - [ ] Toggled Google provider ON
  - [ ] Pasted Google Client ID
  - [ ] Pasted Google Client Secret

## Verification

After configuration, test the OAuth flow:

1. Run your local dev server: `npm run dev`
2. Visit: http://localhost:3000/signup
3. Click "Continue with Google"
4. Complete Google sign-in flow
5. Should redirect to /dashboard after successful auth

## Troubleshooting

**"OAuth error" or redirect fails:**
- Verify redirect URI matches exactly in Google Cloud Console
- Check that Google provider is enabled in Supabase

**"Access blocked: This app's request is invalid":**
- Ensure authorized redirect URI is correctly configured
- URI must include full callback path: `/auth/v1/callback`

---
**Once all items complete:** Mark status as "Complete"
