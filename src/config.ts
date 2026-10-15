import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const env = process.env;
const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

function readKey(): `0x${string}` | null {
  const raw = env.IMD_PRIVATE_KEY?.trim() || (env.IMD_KEY_FILE && existsSync(env.IMD_KEY_FILE) ? readFileSync(env.IMD_KEY_FILE, "utf8").trim() : "");
  if (!raw) return null;
  const k = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) throw new Error("IMD_PRIVATE_KEY must be a 32-byte hex private key");
  return k as `0x${string}`;
}

export interface Config {
  api: string;
  ethRpc: string;
  privateKey: `0x${string}` | null;
  /** Hard ceiling of IMD spent per UTC day, across every client using this state folder. */
  dailyCapImd: number;
  /** Refuse any single order above this many IMD. */
  maxPerOrderImd: number;
  /** Orders need `confirm: true` from the caller in addition to a passing check. */
  requireConfirm: boolean;
  /** How long an identical body counts as a duplicate. */
  dedupeHours: number;
  stateDir: string;
  readOnly: boolean;
}

export function loadConfig(): Config {
  return {
    api: (env.IMD_API ?? "https://api.imd.fun").replace(/\/$/, ""),
    ethRpc: env.ETH_RPC ?? "https://ethereum-rpc.publicnode.com",
    privateKey: readKey(),
    dailyCapImd: num(env.IMD_DAILY_CAP, 2),
    maxPerOrderImd: num(env.IMD_MAX_PER_ORDER, 0.5),
    requireConfirm: env.IMD_REQUIRE_CONFIRM !== "0",
    dedupeHours: num(env.IMD_DEDUPE_HOURS, 168),
    stateDir: env.IMD_MCP_HOME ?? join(homedir(), ".imd-mcp"),
    readOnly: env.IMD_READ_ONLY === "1",
  };
}
