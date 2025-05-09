-- Database schema for the media server

-- Media items (movies, TV shows, music)
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- movie, tvshow, music
    year INTEGER,
    path TEXT NOT NULL,
    is_directory BOOLEAN DEFAULT 0, -- Added this field to distinguish directories from files
    poster_path TEXT,
    backdrop_path TEXT,
    overview TEXT,
    rating REAL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_watched TIMESTAMP,
    watch_count INTEGER DEFAULT 0
);

-- TV shows seasons
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- TV show episodes
CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    overview TEXT,
    path TEXT NOT NULL,
    still_path TEXT,
    air_date TEXT,
    runtime INTEGER,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- People (actors, directors, etc.)
CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profile_path TEXT,
    biography TEXT
);

-- Media-people relationship (cast and crew)
CREATE TABLE IF NOT EXISTS media_people (
    media_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    role TEXT NOT NULL, -- actor, director, writer, etc.
    character TEXT,     -- for actors
    PRIMARY KEY (media_id, person_id, role),
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Genres
CREATE TABLE IF NOT EXISTS genres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Media-genre relationship
CREATE TABLE IF NOT EXISTS media_genres (
    media_id TEXT NOT NULL,
    genre_id TEXT NOT NULL,
    PRIMARY KEY (media_id, genre_id),
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- User watchlist and favorites
CREATE TABLE IF NOT EXISTS user_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    list_type TEXT NOT NULL, -- watchlist, favorites
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- User watch progress
CREATE TABLE IF NOT EXISTS watch_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    episode_id TEXT,  -- NULL for movies
    position INTEGER NOT NULL, -- position in seconds
    duration INTEGER NOT NULL, -- total duration in seconds
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- Library folders
CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    media_type TEXT NOT NULL, -- movies, tvshows, music
    scan_automatically BOOLEAN DEFAULT 1
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_seasons_media_id ON seasons(media_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_media_id ON episodes(media_id);
CREATE INDEX IF NOT EXISTS idx_media_people_media_id ON media_people(media_id);
CREATE INDEX IF NOT EXISTS idx_media_people_person_id ON media_people(person_id);
CREATE INDEX IF NOT EXISTS idx_media_genres_media_id ON media_genres(media_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_media ON watch_progress(user_id, media_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_media_id ON watch_progress(media_id);