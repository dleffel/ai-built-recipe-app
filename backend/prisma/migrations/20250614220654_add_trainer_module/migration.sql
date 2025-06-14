-- CreateTable
CREATE TABLE "trainer_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bodyWeight" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "fatigueLevel" INTEGER,
    "mood" TEXT,
    "backComfort" INTEGER,
    "trainingWindow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_sets" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rpe" DOUBLE PRECISION,
    "setNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_macros" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_macros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maintenanceKcal" INTEGER NOT NULL DEFAULT 2200,
    "currentPhase" TEXT NOT NULL DEFAULT 'Surplus',
    "mesoWeek" INTEGER NOT NULL DEFAULT 1,
    "currentPress" TEXT NOT NULL DEFAULT 'Bench Press',
    "currentHinge" TEXT NOT NULL DEFAULT 'Trap Bar Deadlift',
    "lastDeloadWeek" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainer_conversations_userId_idx" ON "trainer_conversations"("userId");

-- CreateIndex
CREATE INDEX "trainer_messages_conversationId_idx" ON "trainer_messages"("conversationId");

-- CreateIndex
CREATE INDEX "daily_metrics_userId_idx" ON "daily_metrics"("userId");

-- CreateIndex
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_userId_date_key" ON "daily_metrics"("userId", "date");

-- CreateIndex
CREATE INDEX "workout_sessions_userId_idx" ON "workout_sessions"("userId");

-- CreateIndex
CREATE INDEX "workout_sessions_date_idx" ON "workout_sessions"("date");

-- CreateIndex
CREATE INDEX "exercises_sessionId_idx" ON "exercises"("sessionId");

-- CreateIndex
CREATE INDEX "exercise_sets_exerciseId_idx" ON "exercise_sets"("exerciseId");

-- CreateIndex
CREATE INDEX "daily_macros_userId_idx" ON "daily_macros"("userId");

-- CreateIndex
CREATE INDEX "daily_macros_date_idx" ON "daily_macros"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_macros_userId_date_key" ON "daily_macros"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_settings_userId_key" ON "trainer_settings"("userId");

-- AddForeignKey
ALTER TABLE "trainer_conversations" ADD CONSTRAINT "trainer_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_messages" ADD CONSTRAINT "trainer_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "trainer_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_macros" ADD CONSTRAINT "daily_macros_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_settings" ADD CONSTRAINT "trainer_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
