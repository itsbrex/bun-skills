import { homedir } from "node:os";
import { REPO_ROOT } from "./docs";

// The @lightpanda/browser package (pinned in package.json) downloads the browser binary here.
export const lightpandaBinaryPath = () =>
  process.env.LIGHTPANDA_EXECUTABLE_PATH || `${homedir()}/.cache/lightpanda-node/lightpanda`;

const WRAPPER_CLI = `${REPO_ROOT}/node_modules/@lightpanda/browser/dist/cli/main.js`;

/**
 * Return the Lightpanda binary path, downloading the latest nightly through the pinned
 * @lightpanda/browser package when it is missing (or always, with `upgrade`).
 */
export async function ensureLightpanda({ upgrade = false } = {}): Promise<string> {
  const binary = lightpandaBinaryPath();
  if (!upgrade && (await Bun.file(binary).exists())) return binary;
  if (process.env.LIGHTPANDA_EXECUTABLE_PATH) {
    throw new Error(`LIGHTPANDA_EXECUTABLE_PATH=${binary} does not exist`);
  }
  if (!(await Bun.file(WRAPPER_CLI).exists())) {
    throw new Error("@lightpanda/browser is not installed; run `bun install`");
  }
  const command = upgrade ? "upgrade" : "install";
  const proc = Bun.spawn([process.execPath, WRAPPER_CLI, command], { stdout: "inherit", stderr: "inherit" });
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`lightpanda ${command} exited with code ${exitCode}`);
  if (!(await Bun.file(binary).exists())) throw new Error(`Lightpanda binary still missing at ${binary}`);
  return binary;
}

export function lightpandaVersion(binary: string): string {
  return Bun.spawnSync([binary, "version"]).stdout.toString().trim();
}

// Lightpanda logs as `$level=error $msg="..." err=...`; surface the last error-level line.
function lastErrorLine(stderr: string): string {
  const lines = stderr.trim().split("\n");
  return lines.findLast((line) => /\$level=(error|fatal)/.test(line)) ?? lines.at(-1) ?? "no output";
}

/** Load a page in Lightpanda (JavaScript executed) and return the serialized DOM. */
export async function renderWithLightpanda(url: string, { timeoutMs = 60_000 } = {}): Promise<string> {
  const binary = await ensureLightpanda();
  const proc = Bun.spawn([binary, "fetch", "--dump", "html", "--fail-on-http-error", url], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: timeoutMs,
  });
  const [html, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    const reason = proc.signalCode ? `killed by ${proc.signalCode} after ${timeoutMs}ms` : `exit code ${exitCode}`;
    throw new Error(`lightpanda fetch ${url} failed (${reason}): ${lastErrorLine(stderr)}`);
  }
  return html;
}
