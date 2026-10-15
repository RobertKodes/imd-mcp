#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { formatUnits } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "./config.js";
import { ImdReads, walletState } from "./reads.js";
import { VERSION, createServer } from "./server.js";

const [cmd, arg] = process.argv.slice(2);
const cfg = loadConfig();

function clientConfig(withKeyFile: boolean) {
  const env: Record<string, string> = { IMD_DAILY_CAP: String(cfg.dailyCapImd), IMD_MAX_PER_ORDER: String(cfg.maxPerOrderImd) };
  if (withKeyFile) env.IMD_KEY_FILE = join(cfg.stateDir, "wallet.key");
  return { mcpServers: { imd: { command: "npx", args: ["-y", "imd-mcp"], env } } };
}

async function main() {
  switch (cmd) {
    case undefined:
    case "serve": {
      const { server } = createServer(cfg);
      await server.connect(new StdioServerTransport());
      return;
    }
    case "wallet": {
      // A fresh wallet just for IMD orders, kept out of any shell history.
      const file = join(cfg.stateDir, "wallet.key");
      mkdirSync(cfg.stateDir, { recursive: true });
      if (existsSync(file) && arg !== "--force") {
        console.log(`A wallet already exists at ${file}. Use "imd-mcp wallet --force" to replace it (the old key is lost).`);
        return;
      }
      const key = generatePrivateKey();
      writeFileSync(file, key, { mode: 0o600 });
      const a = privateKeyToAccount(key);
      console.log(`New order wallet: ${a.address}\nKey saved to ${file} (readable only by you). Back it up.\n\nFund it with a few IMD (0.5 IMD per order) and a little ETH for the one-time Permit2 approval,\nthen point your client at it with IMD_KEY_FILE=${file}.`);
      return;
    }
    case "setup": {
      const client = arg ?? "claude";
      const hasKey = existsSync(join(cfg.stateDir, "wallet.key"));
      const json = JSON.stringify(clientConfig(hasKey), null, 2);
      if (client === "claude-code") {
        console.log(`claude mcp add imd -- npx -y imd-mcp${hasKey ? `\n(then set IMD_KEY_FILE=${join(cfg.stateDir, "wallet.key")} in the server's env)` : ""}`);
      } else {
        const where: Record<string, string> = {
          claude: "Claude Desktop → Settings → Developer → Edit Config (claude_desktop_config.json)",
          cursor: "Cursor → ~/.cursor/mcp.json",
          windsurf: "Windsurf → ~/.codeium/windsurf/mcp_config.json",
        };
        console.log(`Add this to ${where[client] ?? "your MCP client's config"}:\n\n${json}`);
      }
      if (!hasKey) console.log(`\nNo order wallet yet: search, drafts and checks work; to order, run "imd-mcp wallet" first.`);
      return;
    }
    case "doctor": {
      console.log(`imd-mcp ${VERSION}\nstate: ${cfg.stateDir}\napi: ${cfg.api}`);
      const reads = new ImdReads(cfg.api);
      const h = await reads.health().catch((e: Error) => ({ status: `unreachable (${e.message})` }));
      console.log(`network: ${h.status}`);
      if (!cfg.privateKey) { console.log("wallet: not configured (read-only: find, draft, check, track public jobs)"); return; }
      const a = privateKeyToAccount(cfg.privateKey);
      const w = await walletState(cfg.ethRpc, a.address);
      console.log(`wallet: ${a.address}\n  IMD ${formatUnits(w.imd, 18)} · ETH ${formatUnits(w.eth, 18)} · Permit2 ${w.permit2Allowance >= 10n ** 24n ? "approved" : "NOT approved (run imd_setup_wallet)"}`);
      console.log(`limits: ${cfg.maxPerOrderImd} IMD per order, ${cfg.dailyCapImd} IMD per day, confirm ${cfg.requireConfirm ? "required" : "off"}`);
      return;
    }
    case "--version":
    case "version":
      console.log(VERSION);
      return;
    default:
      console.log(`imd-mcp ${VERSION}: hire the IMD swarm from any AI agent, without wasting IMD.

  imd-mcp                 run the MCP server (stdio)
  imd-mcp wallet          create a fresh order wallet in ${cfg.stateDir}
  imd-mcp setup [client]  print the config for claude | claude-code | cursor | windsurf
  imd-mcp doctor          check the network, the wallet and the limits`);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
