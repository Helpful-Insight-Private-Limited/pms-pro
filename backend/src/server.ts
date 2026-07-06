import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createRealtimeServer } from "./realtime/socket.js";

const app = createApp();
const server = createServer(app);

createRealtimeServer(server);

server.listen(env.port, () => {
  console.log(`PMS backend listening on port ${env.port}`);
});
