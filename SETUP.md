# Setup: Google Cloud

One-time setup so the app can create and sync a Google Sheet directly from
the browser (no backend involved). You don't need to create the sheet
yourself — the app creates it in your Drive on first sign-in.

## 1. Create a Google Cloud OAuth Client

1. Go to console.cloud.google.com, create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → OAuth consent screen** → configure it (External is
   fine for personal use; add your own Google account as a test user if the
   app stays in "Testing" mode).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: add every origin you'll load the app
     from, e.g. `http://localhost:5173` for dev and
     `https://<your-username>.github.io` for GitHub Pages
   - No redirect URI needed (this uses the token-client / implicit flow, not
     redirect-based OAuth)
5. Copy the generated **Client ID**.

## 2. Configure the app

```
cp .env.example .env
```

```
VITE_GOOGLE_CLIENT_ID=<client id from step 1>
```

For GitHub Pages deploys, add the same value as a repo secret
(`VITE_GOOGLE_CLIENT_ID`) under **Settings → Secrets and variables →
Actions** instead of committing `.env`.

## 3. First sign-in

Run the app and tap **Sign in with Google**. On first sign-in it:

1. Creates a new spreadsheet titled "Baby Management Counter" in your Drive
   (via the Sheets API — it's a normal file, shows up in Drive/Sheets UI
   like anything else you created by hand).
2. Creates the `Logs` and `Config` tabs and seeds default categories.
3. Remembers the spreadsheet's ID in the browser's local storage, so it
   reconnects to the same sheet on future visits from that browser.

Tap **Open Sheet** in the app header any time to jump straight to it in
Google Sheets. From then on, edits made directly in the Sheet (e.g. tweaking
`basePoints` in `Config`) are picked up on the app's next sync.

Signing in from a *different* browser/device creates a *separate* sheet
(local storage doesn't sync across devices) — there's no shared "which sheet
is mine" registry yet. If you want one shared sheet across devices, open the
app on the first device, copy its spreadsheet ID from the Sheet's URL, and
set it manually via the browser console: `localStorage.setItem('bmc_spreadsheet_id', '<id>')` before signing in on the second device.

## Notes

- The OAuth client ID is not a secret by design (it's restricted by
  authorized origins, not confidentiality) — but there's no reason to make it
  public either, hence storing it as a secret/`.env` value rather than
  hardcoding it.
- If your Cloud project's OAuth consent screen stays in "Testing" mode,
  access tokens are still fully functional — you just need to keep your own
  account listed as a test user.
