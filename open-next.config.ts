import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// Cola y tag cache van sobre Durable Objects con SQLite: es lo unico que el
// plan gratuito permite (el backend key-value es solo de pago). Hacen falta
// porque /api/admin/revalidate llama a revalidatePath sobre los perfiles.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  tagCache: doShardedTagCache,
});
