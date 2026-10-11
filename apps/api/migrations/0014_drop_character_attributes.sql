-- Hand-edited: attribute modifiers are worked out from boost picks (#418), so the stored ones go. They are derived
-- and can't be turned back into boosts: existing characters start with their boost slots empty, and once #420
-- lands a Pathbuilder re-import fills them. A drop in one step, not expand-then-contract (ADR-0011): there is no
-- production database yet.
ALTER TABLE "characters" DROP COLUMN "attributes";
