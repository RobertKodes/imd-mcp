/** IMD's paid-flow error codes, in words a user can act on. */
export const ERRORS: Record<string, string> = {
  invalid_request: "The request was malformed. Check the body against the action's schema.",
  action_not_enabled: "That action is not on sale right now. imd_status lists what is enabled.",
  invalid_payment_shape: "The x402 payment had an unexpected field. imd-mcp strips SDK extensions; if you see this, report the detail field.",
  payment_terms_mismatch: "The signed payment does not match the quote's price, asset or recipient. Quote again.",
  invalid_quote_approval: "The quote approval signed a different payment than the one sent, usually by one byte. Retry the order.",
  invalid_payment_window: "The Permit2 deadline falls after the quote expires. Retry; the quote lasts 600 seconds.",
  request_token_required: "Reading this order needs the request token it was bought with. imd-mcp stores it in ~/.imd-mcp/state.json.",
  payment_rejected: "The wallet could not pay: usually not enough IMD, or no Permit2 allowance. Run imd_status, then imd_setup_wallet.",
  origin_not_allowed: "The paid API refuses browser calls. imd-mcp calls it from your machine, so this should not happen here.",
  payer_not_owner: "Only the wallet that paid for a project can continue it. This continuation was refused.",
  order_not_found: "No such order for this request token.",
  request_key_conflict: "The same request key was reused with a different body. imd-mcp uses a fresh key per order; retry.",
  quote_too_close_to_expiry: "The quote was about to expire. Retry to get a fresh one.",
  quote_not_yet_valid: "Clock skew between your machine and IMD. Check your system time.",
  payment_asset_not_enabled: "IMD does not accept that asset for payment right now.",
  order_not_payable: "This order can no longer be paid. Start a new one.",
  order_payment_already_started: "A payment for this order is already in flight. Track it with imd_track.",
  payment_already_reserved: "The payment is reserved and settling. Track it with imd_track.",
  payment_attempt_conflict: "Two payment attempts collided. Track the order; IMD never charges twice.",
  payment_not_confirmed: "The payment transaction is not confirmed yet. Track the order in a minute.",
  quote_expired: "The quote expired (600 seconds). Order again.",
  request_too_large: "The body is over 16 KiB. Shorten the objective or move material into inputs.",
  invalid_input: "IMD refused the body as written; nothing was charged. Read problems and fix them, then imd_check again.",
  objective_too_large: "A workflow's request, context and objective together must fit 8,000 characters.",
  quorum_unreachable: "The oracle quorum is higher than the seats that worked in the last 24 hours. Lower quorum or panelSize.",
  not_answerable: "The panel cannot answer this question from the allowed evidence. Pin sources in definitions or guards.",
  too_many_runs: "That schedule asks for more runs than allowed.",
  no_later_run: "The schedule has no run left in the future.",
  request_limit: "Rate limit: 300 requests and 30 quotes per minute. Wait a minute.",
  paid_request_unavailable: "IMD's payment provider or chain is down. The order is kept; retry later.",
};

export function explain(code: string | null | undefined, fallback?: string): string {
  if (!code) return fallback ?? "Unknown error.";
  return ERRORS[code] ?? fallback ?? `IMD error ${code}. See https://imd.fun/docs/#errors-every-error-code`;
}
