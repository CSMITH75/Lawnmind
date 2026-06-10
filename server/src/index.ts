import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";

const env = loadEnv();
const app = await buildServer(env);

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(
    `LawnMind API up on :${env.PORT} (chat mode: ${env.ANTHROPIC_API_KEY ? "claude" : "mock"})`,
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
