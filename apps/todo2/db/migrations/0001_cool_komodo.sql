CREATE TABLE "chat_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_prompt" text NOT NULL,
	"ai_response" text NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
