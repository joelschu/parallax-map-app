import express from "express";
import cors from "cors";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

// TEMPORARY DEBUG — remove once the connection issue is confirmed fixed.
console.log("DATABASE_URL is set:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL starts with:", (process.env.DATABASE_URL || "").slice(0, 15));
console.log("DATABASE_URL length:", (process.env.DATABASE_URL || "").length);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// GET /api/shapes?bbox=minLng,minLat,maxLng,maxLat
// Returns a GeoJSON FeatureCollection. bbox is optional — omit it to fetch everything.
app.get("/api/shapes", async (req, res) => {
  try {
    const { bbox } = req.query;
    let rows;

    // start_date/end_date are cast to text so they come back as plain
    // "YYYY-MM-DD" strings — matches what an <input type="date"> expects,
    // and avoids node-pg converting them into JS Date objects with a
    // timezone offset baked in.
    const selectCols = `
      id, name, start_date::text AS start_date, end_date::text AS end_date,
      cost, funders, policy, properties, ST_AsGeoJSON(geom) AS geojson
    `;

    if (bbox) {
      const parts = bbox.split(",").map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: "bbox must be minLng,minLat,maxLng,maxLat" });
      }
      const [minLng, minLat, maxLng, maxLat] = parts;
      ({ rows } = await pool.query(
        `SELECT ${selectCols}
         FROM shapes
         WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)`,
        [minLng, minLat, maxLng, maxLat]
      ));
    } else {
      ({ rows } = await pool.query(`SELECT ${selectCols} FROM shapes`));
    }

    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        id: r.id,
        geometry: JSON.parse(r.geojson),
        properties: {
          name: r.name,
          start_date: r.start_date,
          end_date: r.end_date,
          cost: r.cost,
          funders: r.funders,
          policy: r.policy,
          ...r.properties,
        },
      })),
    };

    res.json(featureCollection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shapes" });
  }
});

// POST /api/shapes
// Body: a single GeoJSON Feature, e.g.
// { type: "Feature", geometry: {...}, properties: { name, start_date, end_date, cost, funders, policy } }
app.post("/api/shapes", async (req, res) => {
  try {
    const feature = req.body;
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
      return res.status(400).json({ error: "Body must be a GeoJSON Feature" });
    }

    // Pull the known fields out into their own columns. Anything left over
    // (rest) still gets stored in the properties JSONB catch-all, so you can
    // add new fields on the frontend later without another migration.
    const {
      name = null,
      start_date = null,
      end_date = null,
      cost = null,
      funders = null,
      policy = null,
      ...rest
    } = feature.properties || {};

    const { rows } = await pool.query(
      `INSERT INTO shapes (name, start_date, end_date, cost, funders, policy, geom, properties)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), $8)
       RETURNING id, name, start_date::text AS start_date, end_date::text AS end_date,
                 cost, funders, policy, properties, ST_AsGeoJSON(geom) AS geojson`,
      [
        name || null,
        start_date || null,
        end_date || null,
        cost === "" || cost === undefined ? null : cost,
        funders || null,
        policy || null,
        JSON.stringify(feature.geometry),
        rest,
      ]
    );

    const row = rows[0];
    res.status(201).json({
      type: "Feature",
      id: row.id,
      geometry: JSON.parse(row.geojson),
      properties: {
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        cost: row.cost,
        funders: row.funders,
        policy: row.policy,
        ...row.properties,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save shape" });
  }
});

// DELETE /api/shapes/:id
app.delete("/api/shapes/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM shapes WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete shape" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));