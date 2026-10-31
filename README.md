# Kingdom Quest

Mobile-friendly Node.js + Express + Socket.IO Bible-inspired multiplayer game MVP.

## Run locally
- Install Node.js 18 or newer.
- Run `npm install`
- Run `npm start`
- Open `http://localhost:3000`

## Deploy free using Render
1. Upload the contents of this folder to the root of a GitHub repository (not the ZIP itself).
2. In Render choose **New → Web Service**, connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Select the Free instance if offered.

## Modes
- **The Temptation:** seven rounds and automatic council meetings when the Grace meter crosses 25%, 50%, 75%, and 100% (thresholds trigger once each per game).
- **Role Mode:** seven rounds, 46-role catalog, and player-callable meeting/report buttons. The catalog descriptions are design data; most unique role powers are not yet implemented as executable mechanics.

## Important limitations
- Rooms are held in server memory and are lost on server restart.
- This MVP does not currently implement TURN/voice calling. Text chat is available. Do not add TURN credentials to source code; use hosting environment variables when voice is implemented.
- The 46-role catalog is included, but individual abilities, complex conversion rules, role-specific win conditions, body spawning/report validation, and full voting/elimination logic still require implementation and testing. Treat this as a working prototype, not a complete production game.
- Grace automatic meetings currently trigger from correct-answer Grace gains; any other future Grace-changing action should call the same threshold-check function.

## Tests
Run `npm test`.
