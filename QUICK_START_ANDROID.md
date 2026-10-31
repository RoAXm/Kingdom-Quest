# Kingdom Quest — quickest online setup (Android)

## What this ZIP is
A runnable Node.js + Express + Socket.IO prototype. The 12 automated checks pass. This is not yet the full production game: several advanced role powers, complete victory rules, and voice chat still need implementation.

## Publish online
You need a GitHub account and a Render account. Keep the project folder structure intact.

1. Extract this ZIP on your phone.
2. Open your GitHub repository in Chrome. Use **Add file → Upload files** (or the repository's **uploading an existing file** link).
3. Upload the *contents* of this extracted folder to the repository root. Do not upload only the ZIP. Keep `public/` and `content/` as folders. Commit the upload.
4. Open Render and create a **New Web Service** from that GitHub repository. If Render offers Blueprint deployment, choose the included `render.yaml`; otherwise enter:
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance: Free, if available.
5. Tap **Deploy** and wait until Render reports the service is live. Open the `onrender.com` URL it gives you.

If your phone cannot upload folders, use GitHub's web upload flow and select all files while preserving the folder paths, or use GitHub's upload feature from a computer. Do not move files out of `public/` or `content/`.

## Test locally (computer or Node environment)
- Node.js 18 or newer
- `npm install`
- `npm test`
- `npm start`
- Open `http://localhost:3000`

## Limits
- Free hosting may sleep when idle; the first visit after sleep can take a little while.
- Room state is in memory and can be lost when the service restarts.
- Voice chat is not implemented in this prototype.
- The role catalog is content data; not all 46 unique role abilities are executable yet.
