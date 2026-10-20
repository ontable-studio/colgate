# Google Sheet sync (Apps Script)

1. Create a Google Sheet (e.g. "Colgate Booth Plays"). Keep it private.
2. Extensions > Apps Script. Replace the default code with [Code.gs](Code.gs).
3. Project Settings > Script properties > add `SECRET` with any random string.
4. Deploy > New deployment > type **Web app**: Execute as **Me**, Who has access **Anyone**. Copy the `/exec` URL.
5. Put the URL and the secret in `.env` (`VITE_SYNC_ENDPOINT`, `VITE_SYNC_SECRET`) and rebuild.

Notes:

- The URL and secret are embedded in the shipped JS, so anyone with the page can post rows. The secret only reduces noise. Keep the sheet free of personal data until the client decides what is collected (see PLAN.md).
- Updating from an older version (which had `initials`, `catches`, `hits`): just redeploy the new script. It adds the missing columns (`pops`, `misses`) to the header row on the next play and keeps the old columns and their data; no manual header change needed.
- Re-sending the same play is safe: rows are de-duplicated by `id`.
- To verify from the real TV browser (CORS/redirect behaviour), play one round online and check the sheet. This must be tested early.
- After editing the script, create a **new version** of the deployment or the old code keeps running.

## Testing the endpoint with curl

Do **not** pass `-X POST`: Apps Script answers with a 302 redirect and `-X POST` makes curl re-POST to the redirect target, which Google rejects with `411 Length Required`. Plain `-d` with `-L` does the right thing.

```bash
curl -sL "<EXEC_URL>" -H "Content-Type: text/plain" \
  -d '{"secret":"<SECRET>","plays":[{"id":"test-1","timestamp":"2026-10-14T10:00:00Z","deviceId":"booth-01","score":10,"meterPct":5,"pops":1,"misses":0,"durationSec":40,"gameVersion":"0.1.0"}]}'
```

Expected: `{"ok":true,"accepted":["test-1"]}`. A wrong secret returns `{"ok":false,"error":"unauthorized"}`. Sending the same `id` again is accepted again but adds no new row.

## What has been verified

- Online sync from the game (Chrome desktop): pending -> 0, `LAST SYNC` set, no error.
- Offline: the production build (service worker) loads and plays with no network; plays stay `PENDING`, `LAST ERROR` shows `Failed to fetch`; when the network returns they sync on their own within about a minute (retry backoff), no manual action.
- The admin screen's `ONLINE` line is only `navigator.onLine`, a browser hint that can say `yes` while requests fail; trust `LAST ERROR` instead.
- Not verified yet: the TV browser.
