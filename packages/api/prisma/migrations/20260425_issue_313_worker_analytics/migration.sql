-- CreateTable: WorkerAnalytics (aggregated stats per worker)
CREATE TABLE "WorkerAnalytics" (
    "id"            TEXT NOT NULL,
    "workerId"      TEXT NOT NULL,
    "totalViews"    INTEGER NOT NULL DEFAULT 0,
    "uniqueViews"   INTEGER NOT NULL DEFAULT 0,
    "totalTips"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tipCount"      INTEGER NOT NULL DEFAULT 0,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProfileView (deduplicated by IP per worker per day)
CREATE TABLE "ProfileView" (
    "id"        TEXT NOT NULL,
    "workerId"  TEXT NOT NULL,
    "ip"        TEXT NOT NULL,
    "viewedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- Unique analytics record per worker
CREATE UNIQUE INDEX "WorkerAnalytics_workerId_key" ON "WorkerAnalytics"("workerId");

-- Deduplicate views: one IP per worker per calendar day
CREATE UNIQUE INDEX "ProfileView_workerId_ip_day_key"
    ON "ProfileView"("workerId", "ip", DATE("viewedAt"));

CREATE INDEX "ProfileView_workerId_idx" ON "ProfileView"("workerId");

-- FK constraints
ALTER TABLE "WorkerAnalytics" ADD CONSTRAINT "WorkerAnalytics_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
