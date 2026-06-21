// ============================================================
// Simplified DB Connection — Neon PostgreSQL (Single Connection)
// Lite version: no read replicas, no PgBouncer, no primary/replica split
// ============================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// For backward compat with files that import primaryDb
export const primaryDb = db;

export type { PrismaClient };
