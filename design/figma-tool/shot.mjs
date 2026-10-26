import { connect, cmd, close } from "./client.mjs";
import fs from "node:fs";
await connect();
const [id, out, scale] = process.argv.slice(2);
const r = await cmd("export_node_as_image", { nodeId: id, scale: Number(scale || 1) }, 120000);
const b64 = r.imageData || r.base64 || r.data;
fs.writeFileSync(out, Buffer.from(b64, "base64"));
console.log("saved", out, Object.keys(r));
close();
