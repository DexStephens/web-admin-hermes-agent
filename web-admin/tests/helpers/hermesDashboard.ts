// Re-exports the app's own dashboard client so tests exercise the exact
// same login/cookie/error-handling path production code uses, rather than
// a parallel reimplementation that could drift (e.g. the undocumented
// `provider: "basic"` login-body field would be easy to forget here).
export { hermesFetch } from "../../src/lib/hermes";

export const HERMES_DASHBOARD_URL =
  process.env.HERMES_DASHBOARD_URL ?? "http://localhost:9119";
