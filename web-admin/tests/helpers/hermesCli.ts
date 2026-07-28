// Drives the real Hermes agent non-interactively via `hermes chat -q`,
// the same harness proven live against this deployment: it uses the
// container's actual config.yaml/SOUL.md/delegation setup, so assertions
// here reflect real agent behavior, not a mock.
//
// `docker exec hermes ...` requires the `hermes` container to be running
// (`./run_docker.sh start` from the repo root).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

const CONTAINER = "hermes";
const HERMES_BIN = "/opt/hermes/.venv/bin/hermes";

// hermes_home is bind-mounted into the container at /opt/data — dropping a
// fixture there (rather than `docker cp`) makes it visible to `hermes chat`
// running inside the container under the same path convention it already uses.
const REPO_ROOT = path.resolve(__dirname, "../../..");
const HOST_TEST_TMP = path.join(REPO_ROOT, "hermes_home", ".test-tmp");
const CONTAINER_TEST_TMP = "/opt/data/.test-tmp";

export interface ChatOptions {
  resume?: string;
  /** Host filesystem path to an image; copied into the container automatically. */
  imagePath?: string;
  maxTurns?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  /** Combined, verbose stdout — includes model=/tool-call log lines for assertions. */
  output: string;
  sessionId: string | null;
}

const SESSION_LINE = /Session:\s+(\S+)/;

/** Copy a fixture file into the bind-mounted home dir and return its in-container path. */
export function stageFixtureForContainer(hostPath: string): string {
  mkdirSync(HOST_TEST_TMP, { recursive: true });
  const filename = path.basename(hostPath);
  copyFileSync(hostPath, path.join(HOST_TEST_TMP, filename));
  return `${CONTAINER_TEST_TMP}/${filename}`;
}

export async function hermesChat(
  prompt: string,
  opts: ChatOptions = {}
): Promise<ChatResult> {
  const args = [
    "exec",
    CONTAINER,
    HERMES_BIN,
    "chat",
    "-v",
    "--source",
    "tool",
  ];

  if (opts.resume) args.push("--resume", opts.resume);
  if (opts.maxTurns) args.push("--max-turns", String(opts.maxTurns));
  if (opts.imagePath) {
    args.push("--image", stageFixtureForContainer(opts.imagePath));
  }
  args.push("-q", prompt);

  let stdout = "";
  let stderr = "";
  try {
    const result = await execFileAsync("docker", args, {
      timeout: opts.timeoutMs ?? 5 * 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    // hermes chat can exit non-zero on tool errors we still want to inspect
    // (e.g. a security-scan block) — surface combined output rather than
    // just throwing, so callers can assert on *why* it failed.
    const execError = error as { stdout?: string; stderr?: string; message: string };
    stdout = execError.stdout ?? "";
    stderr = execError.stderr ?? execError.message;
  }

  const output = stdout + "\n" + stderr;
  const sessionMatch = output.match(SESSION_LINE);

  return {
    output,
    sessionId: sessionMatch ? sessionMatch[1] : null,
  };
}
