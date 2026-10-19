declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MEMORY_PAYMENTS_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
