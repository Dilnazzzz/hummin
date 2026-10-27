CREATE TYPE "public"."category" AS ENUM('wellness', 'food', 'art', 'music', 'community', 'fitness', 'learning');--> statement-breakpoint
CREATE TYPE "public"."save_status" AS ENUM('saved', 'going', 'went', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('photo', 'upload', 'link', 'text', 'admin');--> statement-breakpoint
CREATE TABLE "captures" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"image_key" text,
	"raw_text" text,
	"source_url" text,
	"extracted" jsonb,
	"model" text,
	"prompt_version" text,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "category" DEFAULT 'community' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"venue_name" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"price_text" text,
	"is_free" boolean,
	"host" text,
	"source_url" text,
	"source_type" "source_type" DEFAULT 'photo' NOT NULL,
	"image_key" text,
	"rrule" text,
	"repeat_text" text,
	"is_listed" boolean DEFAULT false NOT NULL,
	"share_slug" text,
	"ai_confidence" real,
	"ai_raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"save_id" text NOT NULL,
	"occurrence_at" timestamp with time zone NOT NULL,
	"send_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"channel" text DEFAULT 'email' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"status" "save_status" DEFAULT 'saved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"area" text,
	"lat" double precision,
	"lng" double precision,
	"radius_miles" integer DEFAULT 5 NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"reminder_evening" boolean DEFAULT true NOT NULL,
	"reminder_hours_before" integer DEFAULT 2 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_save_id_saves_id_fk" FOREIGN KEY ("save_id") REFERENCES "public"."saves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "captures_user_created_idx" ON "captures" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "events_user_idx" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_listed_start_idx" ON "events" USING btree ("is_listed","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_share_slug_idx" ON "events" USING btree ("share_slug");--> statement-breakpoint
CREATE INDEX "reminders_send_at_idx" ON "reminders" USING btree ("send_at") WHERE "reminders"."sent_at" is null;--> statement-breakpoint
CREATE INDEX "saves_user_idx" ON "saves" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_event_idx" ON "saves" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");