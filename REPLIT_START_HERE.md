# Kingdom Quest — Start in Replit (Android-friendly)

## Import
1. Download the latest `KingdomQuest_Game.zip` to your phone.
2. Open https://replit.com/import
3. Sign in, then choose the ZIP import/upload option if it is offered in your account. Upload this ZIP.
4. If ZIP import is not shown, create a Node.js app and upload/extract these project files into the project root. The root should contain `server.js`, `package.json`, `.replit`, `public/`, and `content/`—not an extra `kingdom-quest/` folder.
5. Open the Replit Agent/chat and paste: `Run this existing Node.js project without replacing it. Install dependencies with npm install, then run npm start. Keep the existing server.js, public/, content/, and package.json. The server listens on process.env.PORT or port 3000. Do not rebuild it from scratch.`
6. Tap Run. Wait for npm install and the server to start.
7. Open the Webview/Preview. The game is served at `/`; the editor page is `/editor.html`.

## Latest features
- Copy the room code or share an invite link.
- Names are visible to everyone, but secret role/assignment details are sent privately. Your own name glows green for Grace One, orange for The Fallen, and yellow for Lukewarm.
- Challenge intro cards show the Bible reference before each round.
- Fallen players have a private chat channel while still having access to public table chat.

## URLs
- Game: the Replit Preview URL, ending at `/`
- Editor: the same hostname plus `/editor.html`

## Edit content
- Bible challenges: `content/challenges.json`
- Game settings: `content/game-settings.json`
- Game interface: `public/index.html`
- Content editor: `public/editor.html`
- Multiplayer/server logic: `server.js`

## Important limitations
This is a development MVP, not a finished production game. Nearby voice/TURN relay is not included in this ZIP. The editor's local browser saves/exports content; it does not securely publish edits to the server yet. Game rooms are stored in server memory and reset when the server restarts. Test with two browser tabs/devices before inviting people. Use Replit's Publish/Deploy option if you need a public URL beyond the development Preview; deployment availability and pricing depend on your Replit account.
