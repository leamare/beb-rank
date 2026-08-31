# Setup: Google Cloud

One-time setup so the app can create and sync a Google Sheet directly from
the browser (no backend involved). You don't need to create the sheet
yourself — the app creates it in your Drive on first sign-in.

## 1. Create a Google Cloud OAuth Client

1. Go to console.cloud.google.com, create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Sheets API** and
   **Google Drive API** (Drive is used only for a tiny hidden marker file
   that remembers which spreadsheet is "yours" across devices — see below).
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
3. Remembers the spreadsheet's ID in a small hidden file in your Google
   Drive's app-data folder (not a visible Drive file, just an app-private
   note tied to your account) — so any other device you sign into with the
   *same Google account* finds and reuses that same sheet instead of
   creating its own.

Tap **Open Sheet** in the app header any time to jump straight to it in
Google Sheets. From then on, edits made directly in the Sheet (e.g. tweaking
`basePoints` in `Config`) are picked up on the app's next sync.

**Migrating from before this was added:** if you already used the app on
two devices before this fix, each one created its own separate sheet.
Whichever device signs in first (after picking up this update) creates the
shared marker and becomes the sheet every device uses from then on — the
other device's prior sheet is orphaned. Manually copy any rows you want to
keep from the orphaned sheet's `Logs` tab into the surviving one.

## Notes

- The OAuth client ID is not a secret by design (it's restricted by
  authorized origins, not confidentiality) — but there's no reason to make it
  public either, hence storing it as a secret/`.env` value rather than
  hardcoding it.
- If your Cloud project's OAuth consent screen stays in "Testing" mode,
  access tokens are still fully functional — you just need to keep your own
  account listed as a test user.
