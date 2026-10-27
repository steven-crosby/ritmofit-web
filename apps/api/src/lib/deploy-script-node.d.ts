/** Types for the deploy-script test. The Worker tsconfig does not include Node. */
declare module 'node:child_process' {
  export function spawnSync(
    file: string,
    args: readonly string[],
    options: { cwd: string; encoding: 'utf8'; timeout: number },
  ): { status: number | null; stdout: string; stderr: string };
}
