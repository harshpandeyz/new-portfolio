-- Direct replies from the admin inbox: reply history + replied-at marker.
ALTER TABLE "ContactMessage" ADD COLUMN "repliedAt" TIMESTAMP(3);

CREATE TABLE "MessageReply" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReply_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MessageReply" ADD CONSTRAINT "MessageReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MessageReply_messageId_idx" ON "MessageReply"("messageId");
CREATE INDEX "MessageReply_sentAt_idx" ON "MessageReply"("sentAt");
