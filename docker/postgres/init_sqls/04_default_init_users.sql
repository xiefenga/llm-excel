
-- user
BEGIN;
INSERT INTO "public"."users" ("id", "username", "avatar", "status", "created_at", "updated_at", "last_login_at") VALUES ('d7fe11df-0914-440f-a7fd-ff61aa05ab9d', 'admin', '/storage/llm-excel/__SYS__/admin_avatar.svg', 0, '2026-02-07 04:15:20.735399+00', '2026-02-07 05:00:11.662599+00', '2026-02-07 04:15:41.648558+00');
COMMIT;


-- account
BEGIN;
INSERT INTO "public"."accounts" ("id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at") VALUES ('bcae4bc0-28be-48ff-86b8-c1cec96e6529', 'admin@selgetable.com', 'credentials', 'd7fe11df-0914-440f-a7fd-ff61aa05ab9d', NULL, NULL, NULL, NULL, NULL, NULL, '$2b$12$6EtpuxODfQNR5hKImFcQTepZDqAjpMjL9749/9qL9pjNHofbQA/dG', '2026-02-07 04:15:21.001994+00', '2026-02-07 04:15:21.002+00');
COMMIT;

-- user_roles
BEGIN;
INSERT INTO "public"."user_roles" ("id", "user_id", "role_id", "created_at") VALUES ('88671c44-bfc7-4abc-8176-904bb3745c98', 'd7fe11df-0914-440f-a7fd-ff61aa05ab9d', 'a5eb57b2-8e32-41d5-836b-7282b05df40d', '2026-02-07 12:17:08+00');
COMMIT;
