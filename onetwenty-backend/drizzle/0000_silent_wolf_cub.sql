CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"category_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"points_claimed" integer NOT NULL,
	"computed_points" integer,
	"level" varchar(20),
	"achievement_status" varchar(20),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"event_date" timestamp,
	"evidence_file_url" text,
	"extraction_raw" jsonb,
	"duplicate_of_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"group" integer NOT NULL,
	"sr_no" varchar(10) NOT NULL,
	"major_head" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"max_points" integer NOT NULL,
	"scoring_type" varchar(20) NOT NULL,
	"scoring_table" jsonb,
	"shared_cap_group" varchar(50),
	"requires_manual_verification" boolean DEFAULT false NOT NULL,
	"special_conditions" jsonb
);
--> statement-breakpoint
CREATE TABLE "shared_cap_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"shared_cap_group" varchar(50) NOT NULL,
	"total_awarded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;