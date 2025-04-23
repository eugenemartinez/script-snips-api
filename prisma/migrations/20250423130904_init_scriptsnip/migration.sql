-- CreateTable
CREATE TABLE "script_snips" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "characters" TEXT[],
    "lines" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_snips_pkey" PRIMARY KEY ("id")
);
