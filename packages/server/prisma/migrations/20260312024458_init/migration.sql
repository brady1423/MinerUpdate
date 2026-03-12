-- CreateTable
CREATE TABLE "SavedRange" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRange_pkey" PRIMARY KEY ("id")
);
