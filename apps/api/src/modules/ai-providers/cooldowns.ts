type ProviderState = { failures: number; retryAfter: number; touchedAt: number };

/** Deterministic in-memory helper for unit-testing the cooldown schedule. Runtime state lives in PostgreSQL. */
export class ProviderCooldowns {
  private readonly states = new Map<string, ProviderState>();

  constructor(private readonly now: () => number = Date.now) {}

  isCoolingDown(provider: string): boolean {
    const state = this.states.get(provider);
    if (!state) return false;
    state.touchedAt = this.now();
    return state.retryAfter > this.now();
  }

  failed(provider: string): void {
    const now = this.now();
    const state = this.states.get(provider) ?? { failures: 0, retryAfter: 0, touchedAt: now };
    state.failures += 1;
    state.touchedAt = now;
    if (state.failures >= 2) {
      const exponent = Math.min(state.failures - 2, 4);
      state.retryAfter = now + Math.min(5 * 60_000, 30_000 * 2 ** exponent);
    }
    this.states.set(provider, state);
    this.prune(now);
  }

  succeeded(provider: string): void {
    this.states.delete(provider);
  }

  private prune(now: number): void {
    if (this.states.size <= 128) return;
    for (const [name, state] of this.states) {
      if (state.retryAfter <= now - 30 * 60_000) this.states.delete(name);
    }
    while (this.states.size > 128) {
      const oldest = [...this.states].reduce((a, b) => (a[1].touchedAt < b[1].touchedAt ? a : b));
      this.states.delete(oldest[0]);
    }
  }
}
