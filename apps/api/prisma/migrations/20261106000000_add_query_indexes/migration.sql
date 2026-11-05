-- Query-path composite indexes for dashboard/inbox/analytics hot paths.
-- Pure index changes: no table rewrites, no data changes. Safe to deploy with
-- `prisma migrate deploy` on any environment.
--
-- Also drops three redundant single-column indexes that duplicate UNIQUE
-- constraints (User.email, Project.slug) or are superseded by a composite
-- with the same leading column (Session.userId, MessageReply.messageId/sentAt).

-- DropIndex
DROP INDEX "MessageReply_messageId_idx";

-- DropIndex
DROP INDEX "MessageReply_sentAt_idx";

-- DropIndex
DROP INDEX "Project_slug_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");

-- CreateIndex
CREATE INDEX "Certificate_category_featured_order_idx" ON "Certificate"("category", "featured", "order");

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_createdAt_idx" ON "MediaAsset"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "MessageReply_messageId_sentAt_idx" ON "MessageReply"("messageId", "sentAt");

-- CreateIndex
CREATE INDEX "Project_status_tier_featured_order_idx" ON "Project"("status", "tier", "featured", "order");

-- CreateIndex
CREATE INDEX "Session_userId_lastSeenAt_idx" ON "Session"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE INDEX "Skill_category_order_idx" ON "Skill"("category", "order");

-- CreateIndex
CREATE INDEX "TimelineItem_type_order_idx" ON "TimelineItem"("type", "order");
