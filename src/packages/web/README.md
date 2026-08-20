# Web app

A standard React web page built with plain JavaScript, using Vite as the build tool.

It acts as IO for the backend.

## Run

Run `yarn install`.

Copy `env.example` to `.env`.

- `yarn dev` - Vite dev server with hot reload.
- `yarn build` - production bundle to `dist/`.
- `yarn preview` - serve the built bundle.
- `yarn lint` - ESLint.

Note: UI only needs `VITE_API_URL` whenever the frontend runs on a different machine than the backend, e.g. when developing locally.
The provided docker config places a prebuilt frontend dist into the backend as a static file, so the origin is shared and the variable is not required.

## Structure

- `pages/` - routes (e.g. `/authors`), mounted by `App.jsx`.
- `containers/` - stateful pieces that fetch and hold data.
- `components/` - presentational, one folder each with its CSS module.
- `lib/api.js` - connector for the backend.
- `main.jsx` - React and router bootstrap.
