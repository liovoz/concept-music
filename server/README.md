# Concept Music Local API

This directory contains the built-in KuGou API service used by the Electron desktop app. It can also run as an independent Node.js service for development, Docker, or Vercel-style deployments.

## Requirements

- Node.js 20 or newer is recommended
- npm 10 or newer

## Local Run

```bash
npm install
npm start
```

By default the standalone server listens on `3000`. The Electron app starts this service with `PORT=10420`.

To run on the same port used by the desktop app:

```bash
PORT=10420 npm start
```

On Windows PowerShell:

```powershell
$Env:PORT='10420'; npm start
```

## Environment

Copy `.env.example` to `.env` when you need local overrides.

- `PORT`: service port
- `platform`: device platform, usually `lite`
- `KUGOU_API_PROXY`: optional upstream HTTP proxy
- `KUGOU_API_GUID`, `KUGOU_API_DEV`, `KUGOU_API_MAC`: optional fixed device identifiers
- `KUGOU_WX_SECRET`, `KUGOU_WX_LITE_SECRET`: optional WeChat login secrets; keep real values out of Git

## Docker

```bash
docker build -t concept-music-api .
docker run --rm -p 3000:3000 concept-music-api
```

## Notes

`module/*.js` files are loaded dynamically by `server.js`, so do not remove modules just because they are not imported statically.
