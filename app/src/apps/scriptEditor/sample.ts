// Default buffer: a real automation script that also documents the API (GDD 3.3.2).
export const SAMPLE_SCRIPT = `// Auto-harvest: scan, crack and loot every target you can.
const me = await ByteCore.player();
ByteCore.logger.info(\`CPU \${me.stats.cpu} GHz · balance \${me.balance}\`);

const targets = await ByteCore.net.scan();
for (const host of targets) {
  ByteCore.logger.info(\`Target \${host.ip} (Tier \${host.tier})\`);
  await ByteCore.net.probe(host.ip);

  const crack = await ByteCore.net.crack(host.ip);
  if (!crack.ok) {
    ByteCore.logger.warn(\`Crack failed on \${host.ip}\`);
    continue;
  }

  await ByteCore.connect(host.ip);
  for (const file of await ByteCore.fs.ls('/var/data')) {
    await ByteCore.pull('/var/data/' + file.name);
    ByteCore.logger.info(\`Pulled \${file.name}\`);
  }
  ByteCore.disconnect();
}

ByteCore.logger.info('Harvest complete.');
`;
