ALTER TABLE "Profile"
  ADD COLUMN "recruiterSummary" TEXT NOT NULL DEFAULT '';

UPDATE "Profile"
SET "recruiterSummary" = 'Final-year B.Tech IT student building backend services and applied AI products. I take systems from model and API design through deployment, with hands-on work in Java and Spring Boot, Python and FastAPI, Node.js, and React.'
WHERE "recruiterSummary" = '';

ALTER TABLE "Skill"
  ADD COLUMN "usedInProjectSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "recruiterPriority" INTEGER NOT NULL DEFAULT 0;

-- Convert the previous display labels to explicit, stable project relationships.
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind', 'studentlink', 'mit-java-qualifier'] WHERE "name" = 'Java';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind', 'flask-api-docker-demo'] WHERE "name" = 'Python';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['studentlink', 'codsoft-tasks', 'skillnexus'] WHERE "name" = 'JavaScript';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['skillmatch', 'quantummind'] WHERE "name" = 'SQL';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['brainmatch-game'] WHERE "name" = 'Swift';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-mob-surveillance-system'] WHERE "name" = 'Solidity';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind', 'orchestraai'] WHERE "name" = 'React.js';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind', 'intelligent-surveillance-system'] WHERE "name" = 'Vite';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['orchestraai', 'skillmatch', 'codsoft-tasks'] WHERE "name" = 'Node.js';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['skillmatch'] WHERE "name" = 'Express.js';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind', 'studentlink', 'mit-java-qualifier'] WHERE "name" = 'Spring Boot';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind'] WHERE "name" = 'FastAPI';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind', 'skillmatch'] WHERE "name" = 'REST API design';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind', 'studentlink'] WHERE "name" = 'Authentication & JWT';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['skillmatch', 'quantummind'] WHERE "name" = 'RBAC';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['skillmatch'] WHERE "name" = 'MVC architecture';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['skillmatch', 'studentlink', 'mit-java-qualifier'] WHERE "name" = 'MySQL';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['orchestraai', 'quantummind'] WHERE "name" = 'PostgreSQL';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'intelligent-mob-surveillance-system'] WHERE "name" = 'MongoDB';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind', 'skillmatch'] WHERE "name" = 'Database design';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'intelligent-mob-surveillance-system'] WHERE "name" = 'Computer Vision';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'intelligent-mob-surveillance-system'] WHERE "name" = 'YOLOv8';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'intelligent-mob-surveillance-system'] WHERE "name" = 'OpenCV';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-mob-surveillance-system'] WHERE "name" = 'MediaPipe';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind'] WHERE "name" = 'RAG';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind'] WHERE "name" = 'FAISS / vector search';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['quantummind', 'orchestraai'] WHERE "name" = 'LLM API integration';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'quantummind', 'flask-api-docker-demo'] WHERE "name" = 'Docker & Compose';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-mob-surveillance-system', 'gamehub-cicd'] WHERE "name" = 'Jenkins';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['gamehub-cicd', 'intelligent-surveillance-system'] WHERE "name" = 'CI/CD';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system'] WHERE "name" = 'Caddy';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system'] WHERE "name" = 'Cloud fundamentals';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system', 'intelligent-mob-surveillance-system'] WHERE "name" = 'Evidence integrity (AES/SHA-256)';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-mob-surveillance-system', 'intelligent-surveillance-system'] WHERE "name" = 'Blockchain anchoring';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system'] WHERE "name" = 'Web security practices';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['brainmatch-game'] WHERE "name" = 'iOS (Swift/UIKit)';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['mlops-lifecycle'] WHERE "name" = 'MLOps';
UPDATE "Skill" SET "usedInProjectSlugs" = ARRAY['intelligent-surveillance-system'] WHERE "name" = 'Selenium / test automation';

UPDATE "Skill" SET "recruiterPriority" = CASE "name"
  WHEN 'Java' THEN 1
  WHEN 'Python' THEN 2
  WHEN 'Node.js' THEN 3
  WHEN 'FastAPI' THEN 4
  WHEN 'Spring Boot' THEN 5
  WHEN 'React.js' THEN 6
  WHEN 'PostgreSQL' THEN 7
  WHEN 'Docker & Compose' THEN 8
  ELSE 0
END;

ALTER TABLE "Skill" DROP COLUMN "usedIn";

ALTER TABLE "Education"
  ADD COLUMN "primary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Education"
SET "primary" = true
WHERE "degree" = 'B.Tech — Information Technology'
  AND "institution" = 'MIT-ADT University, Pune';

CREATE UNIQUE INDEX "Education_single_primary_idx"
ON "Education" ("primary")
WHERE "primary" = true;
