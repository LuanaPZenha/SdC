CREATE TABLE IF NOT EXISTS districts (
  id text PRIMARY KEY,
  name text NOT NULL,
  official_district text NOT NULL,
  population integer NOT NULL,
  elderly double precision NOT NULL,
  tourism double precision NOT NULL,
  commerce double precision NOT NULL,
  schools double precision NOT NULL,
  border double precision NOT NULL,
  neighbors jsonb NOT NULL,
  svg_path text NOT NULL,
  label_x double precision NOT NULL,
  label_y double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS factions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  weight double precision NOT NULL,
  start_value double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  lesson text NOT NULL,
  kind text NOT NULL,
  cost double precision NOT NULL,
  daily_cost double precision NOT NULL,
  cooldown_days integer NOT NULL,
  max_uses integer,
  exclusive_group text,
  effects jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  priority integer NOT NULL,
  opening boolean NOT NULL,
  body text NOT NULL,
  lesson text NOT NULL,
  month_start integer,
  month_end integer,
  day_start integer,
  day_end integer,
  repeatable boolean NOT NULL,
  cooldown integer NOT NULL,
  trigger jsonb NOT NULL,
  choices jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id text PRIMARY KEY,
  title text NOT NULL,
  topic text NOT NULL,
  body text NOT NULL
);

CREATE TABLE IF NOT EXISTS tips (
  id text PRIMARY KEY,
  text text NOT NULL,
  trigger jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS parameters (
  key text PRIMARY KEY,
  value double precision NOT NULL,
  label text NOT NULL,
  hint text NOT NULL
);

CREATE TABLE IF NOT EXISTS formulas (
  id text PRIMARY KEY,
  label text NOT NULL,
  expression text NOT NULL,
  explanation text NOT NULL
);

CREATE TABLE IF NOT EXISTS saves (
  id text PRIMARY KEY,
  player_name text NOT NULL,
  status text NOT NULL,
  days_survived integer NOT NULL,
  research double precision NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ranking (
  id text PRIMARY KEY,
  save_id text UNIQUE REFERENCES saves (id),
  player_name text NOT NULL,
  days_survived integer NOT NULL,
  research double precision NOT NULL,
  dead integer NOT NULL,
  score integer NOT NULL,
  outcome text NOT NULL,
  ending_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ranking_days_idx ON ranking (days_survived DESC, score DESC);
