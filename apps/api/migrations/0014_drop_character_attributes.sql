-- Hand-edited: attribute modifiers are worked out from boost picks (#418), so the stored ones go. They are derived
-- and can't be turned back into boosts: existing characters start with their boost slots empty, and a Pathbuilder
-- re-import fills them (#420). A drop in one step, not expand-then-contract (ADR-0011): there is no production
-- database yet.
ALTER TABLE "characters" DROP COLUMN "attributes";
