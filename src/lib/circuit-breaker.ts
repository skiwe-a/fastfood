// ============================================================
// Circuit Breaker — Simplified (Lite)
// فقط PostgreSQL و Redis — الخدمات الأخرى محذوفة
// ============================================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenAttempts: number;
  successThreshold: number;
  timeoutMs: number;
}

interface CircuitStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  totalRequests: number;
  totalFailures: number;
  totalRejections: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenAttempts: 3,
  successThreshold: 2,
  timeoutMs: 5_000,
};

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private halfOpenAttempts = 0;
  private lastFailureAt = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalRejections = 0;

  constructor(
    public readonly name: string,
    private config: CircuitConfig = DEFAULT_CONFIG
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T | null> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureAt;
      if (elapsed >= this.config.cooldownMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        this.totalRejections++;
        if (fallback) return await fallback();
        return null;
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.config.halfOpenAttempts) {
      this.totalRejections++;
      if (fallback) return await fallback();
      return null;
    }

    try {
      this.halfOpenAttempts++;
      const result = await this.withTimeout(fn, this.config.timeoutMs);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallback) return await fallback();
      throw err;
    }
  }

  private async withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT_${this.name}`)), timeoutMs)
      ),
    ]);
  }

  private onSuccess(): void {
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(err: unknown): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureAt = Date.now();
    this.successCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getStats(): CircuitStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalRejections: this.totalRejections,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
  }
}

class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(name: string, config?: Partial<CircuitConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, { ...DEFAULT_CONFIG, ...config }));
    }
    return this.breakers.get(name)!;
  }

  getAllStats(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStats();
    }
    return result;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Lite: only postgres and redis breakers
export const breakers = {
  postgres: () => circuitBreakerRegistry.get('postgres', { failureThreshold: 10, timeoutMs: 5000 }),
  redis: () => circuitBreakerRegistry.get('redis', { failureThreshold: 5, timeoutMs: 1000 }),
  supabase: () => circuitBreakerRegistry.get('supabase', { failureThreshold: 5, timeoutMs: 5000 }),
};

export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  fallback?: () => T | Promise<T>,
  config?: Partial<CircuitConfig>
): Promise<T | null> {
  const breaker = circuitBreakerRegistry.get(serviceName, config);
  return breaker.execute(fn, fallback);
}
