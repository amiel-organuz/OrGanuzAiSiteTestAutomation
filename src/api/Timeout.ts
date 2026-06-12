export class Timeout {
  constructor(private readonly durationMs: number) {}

  get value(): number {
    return this.durationMs;
  }

  async withTimeout<T>(promise: Promise<T>, message?: string): Promise<T> {
    const timeoutMessage = message ?? `Request timed out after ${this.durationMs}ms`;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(timeoutMessage)), this.durationMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
