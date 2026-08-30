# Setup: Google Cloud + Sheet

One-time setup so the app can read/write your Google Sheet directly from the
browser (no backend involved).

## 1. Create the Google Sheet

1. Create a new blank spreadsheet at sheets.google.com.
2. Copy its ID from the URL: `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`.
3. Leave it empty — the app creates the `Logs` and `Config` tabs and seeds
   default categories the first time you sign in.

## 2. Create a Google Cloud OAuth Client

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

## 3. Configure the app

```
cp .env.example .env
```

```
VITE_GOOGLE_CLIENT_ID=<client id from step 2>
VITE_SPREADSHEET_ID=<spreadsheet id from step 1>
```

For GitHub Pages deploys, add the same two values as repo secrets
(`VITE_GOOGLE_CLIENT_ID`, `VITE_SPREADSHEET_ID`) under
**Settings → Secrets and variables → Actions** instead of committing `.env`.

## 4. First sign-in

Run the app and tap **Sign in with Google**. On success it checks the sheet
for `Logs`/`Config` tabs and creates + seeds them if missing. From then on,
edits made directly in the Sheet (e.g. tweaking `basePoints` in `Config`) are
picked up on the app's next sync.

## Notes

- The OAuth client ID is not a secret by design (it's restricted by
  authorized origins, not confidentiality) — but there's no reason to make it
  public either, hence storing it as a secret/`.env` value rather than
  hardcoding it.
- If your Cloud project's OAuth consent screen stays in "Testing" mode,
  access tokens are still fully functional — you just need to keep your own
  account listed as a test user.
