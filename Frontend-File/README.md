# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## API Base URL (biar tidak edit-edit saat deploy)

Frontend ini default-nya request ke endpoint relative `/api/...` (same-origin).
Untuk production, paling nyaman kalau kamu pasang reverse proxy (Nginx/Caddy) yang meneruskan:

- `/api` → backend (default port `5001`)

Kalau backend kamu jalan di domain/port berbeda (tanpa reverse proxy), kamu bisa set:

- `VITE_API_URL` (build-time)
- `VITE_DEV_PROXY_TARGET` (khusus `npm run dev`, supaya tidak perlu edit `vite.config.js`)

Contoh environment ada di `.env.example`.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
