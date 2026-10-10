-- Hand-edited: the foreign key from content_packs.owner_id to users added (content.table.ts may not import
-- identity's tables; deleting a user deletes their homebrew packs), and audit.enable, as every public table is
-- audited (see 0002).
CREATE TABLE "content_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pack_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"level" smallint,
	"rarity" text NOT NULL,
	"traits" text[] NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pack_deps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pack_id" uuid NOT NULL,
	"depends_on" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_packs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"owner_id" uuid,
	"visibility" text NOT NULL,
	"license" text NOT NULL,
	"version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "content_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_deps" ADD CONSTRAINT "content_pack_deps_pack_id_content_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_deps" ADD CONSTRAINT "content_pack_deps_depends_on_content_packs_id_fk" FOREIGN KEY ("depends_on") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_entries_pack_kind_idx" ON "content_entries" USING btree ("pack_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "content_entries_pack_slug_idx" ON "content_entries" USING btree ("pack_id","slug");--> statement-breakpoint
CREATE INDEX "content_entries_traits_idx" ON "content_entries" USING gin ("traits");--> statement-breakpoint
CREATE INDEX "content_entries_level_idx" ON "content_entries" USING btree ("level");--> statement-breakpoint
CREATE UNIQUE INDEX "content_pack_deps_pack_depends_on_idx" ON "content_pack_deps" USING btree ("pack_id","depends_on");--> statement-breakpoint
CREATE INDEX "content_pack_deps_depends_on_idx" ON "content_pack_deps" USING btree ("depends_on");--> statement-breakpoint
CREATE INDEX "content_packs_owner_id_idx" ON "content_packs" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT audit.enable('content_packs');--> statement-breakpoint
SELECT audit.enable('content_entries');--> statement-breakpoint
SELECT audit.enable('content_pack_deps');
