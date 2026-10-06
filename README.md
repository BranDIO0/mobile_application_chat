# HSE Chat Client

It registers a user at the HSE chat server, handles the token, demonstrates the error codes
and provides a small chat client.

## Features

- **API Test tab** – the four exercise steps
  1. Register (or login if the user already exists – `452`)
  2. Show the token
  3. Validate the token (server answers after ~1 s)
  4. Trigger and explain error codes (only tests that cannot create accounts)
- **Chat tab** – rooms, create room, messages with text / PNG photo / file / location / "important" flag,
  user list, automatic refresh every 3 s
- **Logout** button in the header

## Tech stack

| Tool | Purpose |
|------|---------|
| [React 19](https://react.dev) | UI |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Vite](https://vite.dev) | Dev server, build, proxy to the chat server |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [oxlint](https://oxc.rs) | Linting |

No other runtime dependencies.

## Project structure

```
.
├── docs/
│   └── TECHNICAL_DOCUMENTATION.md   # architecture & how everything works
├── public/                          # static files (favicon)
├── src/
│   ├── api/          # HTTP communication with the chat server
│   ├── hooks/        # state & side effects (auth, chat polling)
│   ├── components/   # UI building blocks (header, modal, test steps, chat parts)
│   ├── pages/        # one page per tab (ApiTestPage, ChatPage)
│   ├── utils/        # small helpers
│   ├── types.ts      # shared types + error code table
│   ├── App.tsx       # root component (tabs)
│   └── main.tsx      # entry point
├── index.html
├── vite.config.ts    # Tailwind plugin + /api-proxy
└── package.json
```

Details: [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md)

## Run locally

**Requirements:** [Node.js](https://nodejs.org) 20 or newer (includes npm).

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
```

Open **http://localhost:5173** in the browser.

> The dev server forwards all requests from `/api-proxy` to
> `https://www2.hs-esslingen.de/~chkohl/chat`, so no CORS issues occur.

### Other scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Type check + production build into `dist/` |
| `npm run preview` | Serve the production build locally (proxy included) |
| `npm run lint` | Run oxlint |

## Usage

1. Open the **API Test** tab, enter your HSE user id (e.g. `jaehit00`), a password, nickname and full name.
2. Click **Register** (or **Login** if you get `452`). The token appears in step 2.
3. Click **Validate** – expected answer: `Token valid`.
4. Switch to the **Chat** tab to send messages.

## Links

- Chat server API (Swagger): https://www2.hs-esslingen.de/~chkohl/chat/docs/
- Built-in server manual: https://www2.hs-esslingen.de/~chkohl/chat/
