# Google Sheet sync (Apps Script)

1. Create a Google Sheet (e.g. "Colgate Booth Plays"). Keep it private.
2. Extensions > Apps Script. Replace the default code with [Code.gs](Code.gs).
3. Project Settings > Script properties > add `SECRET` with any random string.
4. Deploy > New deployment > type **Web app**: Execute as **Me**, Who has access **Anyone**. Copy the `/exec` URL.
5. Put the URL and the secret in `.env` (`VITE_SYNC_ENDPOINT`, `VITE_SYNC_SECRET`) and rebuild.

Notes:

- The URL and secret are embedded in the shipped JS, so anyone with the page can post rows. The secret only reduces noise. Keep the sheet free of personal data until the client decides what is collected (see PLAN.md).
- Re-sending the same play is safe: rows are de-duplicated by `id`.
- To verify from the real TV browser (CORS/redirect behaviour), play one round online and check the sheet. This must be tested early.
- After editing the script, create a **new version** of the deployment or the old code keeps running.
