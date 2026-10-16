-- Bug reports are triaged as open, confirmed, fixed or declined. `closed` was never set by anything, but a
-- report that has it reads as fixed rather than failing to parse.
UPDATE "bug_reports" SET "status" = 'fixed' WHERE "status" = 'closed';
