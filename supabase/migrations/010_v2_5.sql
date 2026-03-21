-- 010_v2_5.sql — Test-Zugangsmechanismus (Idee 07)
-- Fügt 'tester' als dritten Plan-Typ hinzu.
-- Einladungscodes werden bei der Registrierung eingelöst.

-- 1. profiles.plan CHECK-Constraint erweitern
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'premium', 'tester'));

-- 2. invite_codes Tabelle
CREATE TABLE IF NOT EXISTS invite_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  max_uses    INTEGER DEFAULT 1,         -- NULL = unbegrenzt
  uses_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ DEFAULT NULL,  -- NULL = kein Ablaufdatum
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Kein SELECT für normale Nutzer — nur service_role darf lesen.
-- INSERT/UPDATE über RPC (SECURITY DEFINER).
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
-- Keine SELECT-Policy → normale Nutzer können Codes nicht auflisten.

-- 3. redeem_invite_code RPC
-- Atomar: Code validieren, uses_count erhöhen, profiles.plan setzen.
CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id   UUID;
  v_max_uses  INTEGER;
  v_uses      INTEGER;
  v_expires   TIMESTAMPTZ;
BEGIN
  -- Code laden (mit FOR UPDATE für atomares Inkrement)
  SELECT id, max_uses, uses_count, expires_at
  INTO v_code_id, v_max_uses, v_uses, v_expires
  FROM invite_codes
  WHERE code = UPPER(p_code)
  FOR UPDATE;

  -- Code existiert?
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- Abgelaufen?
  IF v_expires IS NOT NULL AND v_expires < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  -- Kontingent erschöpft?
  IF v_max_uses IS NOT NULL AND v_uses >= v_max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'used_up');
  END IF;

  -- uses_count erhöhen
  UPDATE invite_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_id;

  -- Nutzer auf 'tester' upgraden
  UPDATE profiles
  SET plan = 'tester'
  WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
