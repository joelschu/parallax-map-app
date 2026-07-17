# Map app scaffold

A minimal drawable map with cloud-stored datapoints: Leaflet on the frontend,
an Express API in the middle, and Neon Postgres (with PostGIS) for storage.

## 1. Set up the database

1. Create a free project at https://neon.tech
2. Copy the connection string from the Neon dashboard
3. Run `db/schema.sql` against it, e.g.:
   ```
   psql "postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require" -f db/schema.sql
   ```
   (or paste the contents into Neon's SQL editor in the browser)

## 2. Run the backend

```
cd backend
npm install
cp .env.example .env   # then paste in your real DATABASE_URL
npm start
```

The API will listen on `http://localhost:3001` with three routes:
- `GET /api/shapes` — all shapes as a GeoJSON FeatureCollection (add `?bbox=minLng,minLat,maxLng,maxLat` to filter by area)
- `POST /api/shapes` — save a single GeoJSON Feature
- `DELETE /api/shapes/:id` — remove a shape

## 3. Run the frontend

`frontend/index.html` has no build step — open it directly in a browser, or
serve it with any static file server. It talks to the API at
`http://localhost:3001` by default (see the `API_BASE` constant near the top
of the `<script>` block — update it once you deploy the backend somewhere
real).

## Next steps

- Deploy the backend (Render, Fly.io, Railway, or as serverless functions on
  Vercel/Netlify) and update `API_BASE` in the frontend accordingly
- Swap the `prompt()` label input for a proper form/sidebar
- Add auth if you want per-user shapes instead of one shared map
- Use the `bbox` query param to only fetch shapes in the visible map area
  once you have more than a handful of datapoints
