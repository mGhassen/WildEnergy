-- Private bucket for automated prod DB dumps (GitHub Action).
INSERT INTO storage.buckets (id, name, public)
VALUES ('wildenergy-dumps', 'wildenergy-dumps', false)
ON CONFLICT (id) DO NOTHING;
