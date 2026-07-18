-- Run this once against your Neon database to set things up.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS shapes (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  area          TEXT,
  intervention  TEXT,
  item          TEXT,
  start_date   DATE,
  end_date     DATE,
  cost         NUMERIC,
  funders      TEXT,
  policy       TEXT,
  description   TEXT,
  geom         GEOMETRY(Geometry, 4326) NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index so bounding-box queries stay fast as the table grows.
CREATE INDEX IF NOT EXISTS shapes_geom_idx ON shapes USING GIST (geom);
