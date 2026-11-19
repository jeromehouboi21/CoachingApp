-- Friedensstifter U5a-Audit (nur Zähler, keine Inhalte)
-- Grundlage für E-U5a-2 (Erkenntnisse ohne Ursprungsgespräch).
select count(*)                                              as erkenntnisse,
       count(*) filter (where conversation_id is null)        as ohne_ursprungsgespraech,
       count(*) filter (where source = 'auto')                as automatisch,
       count(*) filter (where source = 'user')                as vom_nutzer,
       count(*) filter (where category = 'ziel')              as vorhaben
from public.insights;
