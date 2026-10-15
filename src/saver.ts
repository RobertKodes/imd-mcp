import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canon } from "./imd/canon.js";

/**
 * The saver. Every IMD payment passes through here:
 * - a free check must have passed for this exact body, proven by a check token;
 * - the same body bought recently is returned instead of bought again;
 * - per-order and per-day caps in IMD are never exceeded;
 * - every order is kept on disk with the token that reads it back, so nothing paid is ever lost.
 */

export interface OrderRecord {
  orderId: string;
  action: string;
  title: string;
  inputHash: string;
  costImd: number;
  /** The bearer token that reads this order back from api.imd.fun. */
  requestToken: string;
  createdAt: number;
  jobId?: string;
  state?: string;
}

interface State {
  version: 1;
  /** Signs check tokens; never leaves this machine. */
  secret: string;
  /** The bearer token every order is bought with; it reads them back later. */
  requestToken: string;
  orders: OrderRecord[];
  savedImd: number;
  blockedBeforePay: number;
}

export type Gate = { ok: true } | { ok: false; code: string; message: string; existing?: OrderRecord };

export const inputHash = (action: string, input: unknown) => createHmac("sha256", "imd-mcp-body").update(`${action}\n${canon(input)}`).digest("hex");
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

export class Saver {
  readonly #file: string;
  #s: State;

  constructor(dir: string, readonly limits: { dailyCapImd: number; maxPerOrderImd: number; dedupeHours: number; requireConfirm: boolean }) {
    mkdirSync(dir, { recursive: true });
    this.#file = join(dir, "state.json");
    this.#s = existsSync(this.#file)
      ? JSON.parse(readFileSync(this.#file, "utf8"))
      : { version: 1, secret: randomBytes(32).toString("hex"), requestToken: randomBytes(32).toString("hex"), orders: [], savedImd: 0, blockedBeforePay: 0 };
    this.#s.requestToken ??= randomBytes(32).toString("hex");
    this.#save();
  }

  #save(): void {
    const tmp = `${this.#file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.#s, null, 2), { mode: 0o600 });
    renameSync(tmp, this.#file);
  }

  /** Proof that the free check passed for exactly this action and body, valid for `ttlSec`. */
  checkToken(action: string, input: unknown, now = Date.now(), ttlSec = 1800): string {
    const exp = Math.floor(now / 1000) + ttlSec;
    const h = inputHash(action, input);
    const mac = createHmac("sha256", this.#s.secret).update(`${h}.${exp}`).digest("hex").slice(0, 32);
    return `${exp}.${mac}`;
  }

  verifyCheckToken(token: string | undefined, action: string, input: unknown, now = Date.now()): boolean {
    if (!token) return false;
    const [expS, mac] = token.split(".");
    const exp = Number(expS);
    if (!exp || !mac || exp < Math.floor(now / 1000)) return false;
    const want = createHmac("sha256", this.#s.secret).update(`${inputHash(action, input)}.${exp}`).digest("hex").slice(0, 32);
    return want === mac;
  }

  spentToday(now = Date.now()): number {
    const d = dayKey(now);
    return this.#s.orders.filter((o) => dayKey(o.createdAt) === d).reduce((a, o) => a + o.costImd, 0);
  }

  duplicateOf(action: string, input: unknown, now = Date.now()): OrderRecord | undefined {
    const h = inputHash(action, input);
    const since = now - this.limits.dedupeHours * 3600_000;
    return [...this.#s.orders].reverse().find((o) => o.inputHash === h && o.createdAt >= since && o.state !== "refused" && o.state !== "payment_failed" && o.state !== "expired");
  }

  /** Every rule an order must pass, in the order a user would want to hear them. */
  gate(args: { action: string; input: unknown; costImd: number; checkToken?: string; confirm?: boolean; allowDuplicate?: boolean; now?: number }): Gate {
    const now = args.now ?? Date.now();
    if (!this.verifyCheckToken(args.checkToken, args.action, args.input, now)) {
      this.#s.blockedBeforePay += 1;
      this.#save();
      return { ok: false, code: "check_first", message: "Run imd_check on this exact body first and pass its checkToken. The check is free and catches bodies IMD would refuse after taking the payment." };
    }
    const dup = this.duplicateOf(args.action, args.input, now);
    if (dup && !args.allowDuplicate) {
      this.#s.savedImd += args.costImd;
      this.#save();
      return { ok: false, code: "duplicate", message: `You already bought this exact body (order ${dup.orderId}). Track it with imd_track instead of paying again, or pass allowDuplicate: true.`, existing: dup };
    }
    if (args.costImd > this.limits.maxPerOrderImd + 1e-12) {
      return { ok: false, code: "over_order_cap", message: `This order costs ${args.costImd} IMD, over the ${this.limits.maxPerOrderImd} IMD per-order cap (IMD_MAX_PER_ORDER).` };
    }
    const spent = this.spentToday(now);
    if (spent + args.costImd > this.limits.dailyCapImd + 1e-12) {
      return { ok: false, code: "over_daily_cap", message: `Today's spend would reach ${(spent + args.costImd).toFixed(2)} IMD, over the ${this.limits.dailyCapImd} IMD daily cap (IMD_DAILY_CAP).` };
    }
    if (this.limits.requireConfirm && !args.confirm) {
      return { ok: false, code: "confirm", message: `Ready to pay ${args.costImd} IMD. Show the user what will be bought and call again with confirm: true once they agree.` };
    }
    return { ok: true };
  }

  record(o: OrderRecord): void {
    this.#s.orders.push(o);
    this.#save();
  }

  update(orderId: string, patch: Partial<OrderRecord>): OrderRecord | undefined {
    const o = this.#s.orders.find((x) => x.orderId === orderId);
    if (o) { Object.assign(o, patch); this.#save(); }
    return o;
  }

  find(idOrPrefix: string): OrderRecord | undefined {
    return this.#s.orders.find((o) => o.orderId === idOrPrefix || o.orderId.startsWith(idOrPrefix) || o.jobId === idOrPrefix || o.jobId?.startsWith(idOrPrefix));
  }

  get requestToken(): string { return this.#s.requestToken; }

  orders(): OrderRecord[] { return [...this.#s.orders].reverse(); }
  stats() { return { savedImd: this.#s.savedImd, blockedBeforePay: this.#s.blockedBeforePay, orders: this.#s.orders.length }; }
  noteSavedByCheck(costImd: number): void { this.#s.savedImd += costImd; this.#save(); }
}
