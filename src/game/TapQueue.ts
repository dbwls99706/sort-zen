/** Serializes taps while a pour is visible; reset invalidates late callbacks. */
export class TapQueue {
  private pending: number[] = [];
  private sequence = 0;
  private active: number | null = null;

  constructor(private readonly deliver: (id: number) => void) {}

  press(id: number): void {
    if (this.active !== null) this.pending.push(id);
    else this.deliver(id);
  }

  begin(): number {
    this.active = ++this.sequence;
    return this.active;
  }

  finish(token: number): boolean {
    if (this.active !== token) return false;
    this.active = null;
    while (this.active === null && this.pending.length > 0) {
      this.deliver(this.pending.shift()!);
    }
    return true;
  }

  clear(): void {
    this.pending = [];
    this.active = null;
    this.sequence += 1;
  }
}
