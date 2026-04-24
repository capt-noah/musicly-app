CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    profile_photo TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    bio TEXT,
    profile_photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_art TEXT,
    release_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
    album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
    audio_file_id TEXT NOT NULL,
    cover_file_id TEXT,
    title TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE music_artists (
    music_id UUID REFERENCES music(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (music_id, artist_id)
);


CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_art TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE playlist_songs (
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    song_id UUID REFERENCES music(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    rank INTEGER,
    PRIMARY KEY (playlist_id, song_id)
);


CREATE TABLE likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES music(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
);


CREATE TABLE listening_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES music(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    duration_listened_sec INTEGER
);


CREATE TABLE playback_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id uuid REFERENCES music(id) ON DELETE SET NULL,
    position_ms integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


CREATE TABLE top_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES music(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    as_of TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    file_id TEXT NOT NULL,
    cover_id TEXT,
    title TEXT,
    status TEXT DEFAULT 'pending'
        CHECK ( STATUS IN ('pending', 'processing', 'completed', 'failed')),
    audio_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE INDEX idx_telegram_id ON users(telegram_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_music_album ON music(album_id);
CREATE INDEX idx_history_user ON listening_history(user_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_playlist_owner ON playlists(owner_id);
CREATE INDEX idx_playback_states_user ON playback_states (user_id);

CREATE UNIQUE INDEX idx_artists_name ON artists(name);
CREATE UNIQUE INDEX idx_album_artist_title ON albums(artist_id, title);
