CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('publications','conferences','software','articles')),
  locale TEXT NOT NULL DEFAULT 'zh' CHECK(locale IN ('zh','en')),
  year INTEGER,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  date_text TEXT DEFAULT '',
  abstract TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  links_json TEXT DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_kind_locale ON content(kind, locale);
