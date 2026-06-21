CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  monitor_key TEXT,
  category TEXT NOT NULL DEFAULT 'web',
  description TEXT DEFAULT '',
  cover_mode TEXT NOT NULL DEFAULT 'iframe',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  allow_interaction INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sites_sort_order ON sites(sort_order);
CREATE INDEX idx_sites_visible ON sites(is_visible);
CREATE INDEX idx_sites_category ON sites(category);
