# Thunderjaw Painted Parts Tracker

A one-page Angular app for managing painted part stages and loads.

## Features

- Add/remove stages titled `Stage N`.
- Stages are renumbered after a stage is removed.
- Mark a stage done/undone. This also marks every load inside that stage done/undone.
- Add, edit, remove, and mark loads done/undone.
- Load fields:
  - `Color Name` — required
  - `Color Code` — color picker plus editable hex input
  - `Group(s) Name` — required
  - `Comment` — optional
- Saves state to `data/state.json` through the Node server.
- Also writes a browser `localStorage` fallback if the API is unavailable.
- Responsive clean light UI.

## Install

```zsh
npm install
```

## Run production-style locally

Build the Angular app, then serve it and the JSON API from one Node server:

```zsh
npm run build
npm start
```

Open:

```text
http://localhost:3000
```

## Publish to GitHub Pages

GitHub Pages is a static host, so it cannot run `server.js` and cannot write to
`data/state.json`. On GitHub Pages the app still works, but state is saved in the
visitor's browser `localStorage` only.

Build a GitHub Pages-ready `docs/` folder:

```zsh
npm run build:github-pages
```

Commit and push the generated `docs/` folder, then in GitHub open:

```text
Settings → Pages → Build and deployment → Source: Deploy from a branch
```

Choose:

```text
Branch: main
Folder: /docs
```

The build script uses the package/repository name as the base path, so for this
repository it builds with:

```text
/thunderjaw/
```

If you publish under a different repository name, override it like this:

```zsh
GITHUB_PAGES_BASE_HREF=/your-repo-name/ npm run build:github-pages
```

## Run in development

Use one terminal for the JSON API:

```zsh
npm start
```

Use a second terminal for Angular with API proxying:

```zsh
npm run dev
```

Open the Angular dev URL printed in the terminal, usually:

```text
http://localhost:4200
```

## Test

```zsh
npm test
```

## Saved state file

Project JSON state is stored at:

```text
data/state.json
```

