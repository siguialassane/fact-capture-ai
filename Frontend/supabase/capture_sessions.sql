-- Table pour gérer les sessions de capture entre Web et PWA
-- Le Web crée une session "waiting" quand il veut une photo
-- Le PWA vérifie s'il y a une session active avant de permettre la capture
-- La photo est sauvegardée seulement si une session est active

CREATE TABLE IF NOT EXISTS capture_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'captured', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour rechercher les sessions actives rapidement
CREATE INDEX IF NOT EXISTS idx_capture_sessions_status ON capture_sessions(status);

-- Activer les Real-time updates pour cette table
ALTER TABLE capture_sessions REPLICA IDENTITY FULL;

-- RLS (Row Level Security) - permettre accès public pour le moment
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on capture_sessions" ON capture_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Fonction pour nettoyer les anciennes sessions (optionnel)
-- Supprime les sessions de plus de 24h
CREATE OR REPLACE FUNCTION cleanup_old_capture_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM capture_sessions WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
