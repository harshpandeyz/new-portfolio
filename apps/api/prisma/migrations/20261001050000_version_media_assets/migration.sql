CREATE TABLE "MediaAssetVersion" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaAssetVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MediaAssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MediaAssetVersion_assetId_createdAt_idx" ON "MediaAssetVersion"("assetId", "createdAt");
CREATE INDEX "MediaAssetVersion_deleteAfter_idx" ON "MediaAssetVersion"("deleteAfter");
CREATE INDEX "MediaAssetVersion_storedName_idx" ON "MediaAssetVersion"("storedName");
