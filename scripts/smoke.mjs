// Live smoke test: spawns the built server over stdio and calls the free tools against api.imd.fun.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/cli.js"], env: { ...process.env, IMD_MCP_HOME: ".tmp-home" } });
const client = new Client({ name: "smoke", version: "1" });
await client.connect(transport);
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return JSON.parse(r.content[0].text);
};
const status = await call("imd_status");
console.log("status:", status.network, "price", status.pricePerActionImd, "wallet configured:", status.wallet.configured);
const found = await call("imd_find_existing", { query: "uniswap v4 hook", limit: 3 });
console.log("find:", found.total, "results;", found.results.map((r) => r.title.slice(0, 60)));
const draft = await call("imd_draft", { kind: "report", brief: "Compare the three most used Foundry fuzzing strategies for Uniswap v4 hooks, with examples and when to pick each." });
console.log("draft ok:", draft.ok, "cost", draft.costImd, "plan:", draft.plan, "token:", Boolean(draft.checkToken), "similar:", draft.similarExistingWork?.length);
const vague = await call("imd_check", { action: "job.open", input: { objective: "make app" } });
console.log("vague body:", vague.ok === false ? `refused before paying: ${JSON.stringify(vague.blockers ?? vague.message).slice(0, 160)}` : "accepted?!");
await client.close();
