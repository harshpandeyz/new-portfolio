CREATE TYPE "ProjectDomain" AS ENUM ('BACKEND', 'AI_ML', 'FULL_STACK', 'MOBILE', 'FRONTEND', 'DEVOPS');

ALTER TABLE "Project"
ADD COLUMN "domains" "ProjectDomain"[] NOT NULL DEFAULT ARRAY[]::"ProjectDomain"[];

UPDATE "Project" SET "domains" = ARRAY['AI_ML', 'BACKEND']::"ProjectDomain"[]
WHERE "slug" IN ('intelligent-surveillance-system', 'intelligent-mob-surveillance-system', 'orchestraai', 'quantummind');
UPDATE "Project" SET "domains" = ARRAY['FULL_STACK', 'BACKEND']::"ProjectDomain"[]
WHERE "slug" IN ('skillmatch', 'studentlink');
UPDATE "Project" SET "domains" = ARRAY['MOBILE']::"ProjectDomain"[]
WHERE "slug" = 'brainmatch-game';
UPDATE "Project" SET "domains" = ARRAY['DEVOPS', 'FRONTEND']::"ProjectDomain"[]
WHERE "slug" = 'gamehub-cicd';
UPDATE "Project" SET "domains" = ARRAY['BACKEND']::"ProjectDomain"[]
WHERE "slug" IN ('flask-api-docker-demo', 'mit-java-qualifier');
UPDATE "Project" SET "domains" = ARRAY['AI_ML', 'DEVOPS']::"ProjectDomain"[]
WHERE "slug" = 'mlops-lifecycle';
UPDATE "Project" SET "domains" = ARRAY['FRONTEND']::"ProjectDomain"[]
WHERE "slug" IN ('skillnexus', 'coffeeshop', 'codsoft-tasks');
