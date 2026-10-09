-- Hand-edited: characters from before sign-in have no owner and are deleted (#93). The foreign
-- key to users is added here, not in character.table.ts, because the character context may not
-- import identity's tables; deleting a user deletes their characters.
DELETE FROM "characters";--> statement-breakpoint
DROP INDEX "characters_created_at_id_idx";--> statement-breakpoint
DROP INDEX "characters_name_id_idx";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "owner_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_owner_created_at_id_idx" ON "characters" USING btree ("owner_id","created_at","id");--> statement-breakpoint
CREATE INDEX "characters_owner_name_id_idx" ON "characters" USING btree ("owner_id","name","id");
