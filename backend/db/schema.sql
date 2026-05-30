CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,
  external_id   TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  price         INTEGER NOT NULL,
  condition     TEXT,
  category      TEXT,
  style_tags    TEXT[]  DEFAULT '{}',
  city          TEXT,
  images        TEXT[]  DEFAULT '{}',
  listing_url   TEXT NOT NULL,
  posted_at     TIMESTAMPTZ,
  scraped_at    TIMESTAMPTZ DEFAULT NOW(),
  active        BOOLEAN DEFAULT TRUE,
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_category   ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_city        ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_active      ON listings(active);
CREATE INDEX IF NOT EXISTS idx_listings_style_tags  ON listings USING GIN(style_tags);
