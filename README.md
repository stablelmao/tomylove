# Letters I Cannot Send Yet

This project now uses:

- a small local Node server for local development
- a Vercel Function for deployed saves on Vercel

## What saves where

- Notebook posts and gallery memories are saved in `data/notebook-data.json`
- The frontend reads and writes through `GET /api/data` and `POST /api/data`
- The password lock is still handled in the frontend
- On Vercel, `api/data.js` stores the notebook data in Vercel Blob instead of writing to the repo filesystem

## Run locally

1. Open a terminal in this folder
2. Run `npm install`
2. Run `npm start`
3. Open `http://localhost:3000`

## Files to deploy

- `index.html`
- `server.js`
- `api/data.js`
- `package.json`
- `data/notebook-data.json`

## Vercel setup

1. Create a Vercel project from this folder or Git repo
2. Add a Vercel Blob store to the project
3. Vercel will provide `BLOB_READ_WRITE_TOKEN`
4. Deploy

Optional:

- Set `NOTEBOOK_DATA_PATHNAME` if you want a custom blob pathname
- Set `NOTEBOOK_BLOB_ACCESS` if your Blob store is `private` instead of `public`

## Hosting requirement

Static-only hosts are not enough for automatic saving.

- Local development uses `server.js` and the `data/notebook-data.json` file
- Vercel deployments use the serverless function in `api/data.js` and Vercel Blob
