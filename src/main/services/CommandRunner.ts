import { execa, type Options } from 'execa'
import stripAnsiModule from 'strip-ansi'
import os from 'node:os'
import type { CommandResult } from '../../shared/types'
import { COMMAND_TIMEOUT_MS } from '../../shared/constants'

const stripAnsi =
  (stripAnsiModule as unknown as { default?: typeof stripAnsiModule }).default ?? stripAnsiModule

function toString(value: string | unknown[] | Uint8Array | undefined): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

export interface RunOptions {
  timeout?: number
  cwd?: string
  onOutput?: (text: string) => void
  env?: Record<string, string>
}

/** 命令执行句柄，包含结果 Promise 和取消方法 */
export interface CommandHandle {
  /** Promise that resolves when the command completes */
  readonly promise: Promise<CommandResult>
  /** Cancel the running command */
  cancel(): void
}

export class CommandError extends Error {
  constructor(
    public code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'EXECUTION_FAILED' | 'UNKNOWN',
    public command: string,
    public stderr: string,
    public exitCode: number | null
  ) {
    super(`Command failed: ${code}`)
    this.name = 'CommandError'
  }

  toJSON(): import('../../shared/types').IpcError {
    return {
      message: this.message,
      code: this.code,
      command: this.command,
      stderr: this.stderr,
      exitCode: this.exitCode
    }
  }
}

class CommandRunner {
  private processes = new Map<string, ReturnType<typeof execa>>()
  private nextId = 1

  run(command: string, args: string[], opts?: RunOptions): CommandHandle {
    const timeout = opts?.timeout ?? COMMAND_TIMEOUT_MS
    const cwd = opts?.cwd ?? os.homedir()

    const execaOpts: Options = {
      timeout,
      reject: false,
      cwd,
      shell: process.platform === 'win32',
      encoding: 'utf8',
      env: opts?.env
    }

    const commandStr = `${command} ${args.join(' ')}`
    const child = execa(command, args, execaOpts)
    const id = String(this.nextId++)
    this.processes.set(id, child)

    const promise = (async (): Promise<CommandResult> => {
      try {
        if (opts?.onOutput) {
          child.stdout?.on('data', (data: Buffer) => {
            opts.onOutput!(stripAnsi(data.toString()))
          })
          child.stderr?.on('data', (data: Buffer) => {
            opts.onOutput!(stripAnsi(data.toString()))
          })
        }

        const result = await child
        return {
          success: result.exitCode === 0,
          stdout: stripAnsi(toString(result.stdout)),
          stderr: stripAnsi(toString(result.stderr)),
          exitCode: result.exitCode ?? null
        }
      } catch (error: unknown) {
        throw this.mapError(error, commandStr)
      } finally {
        this.processes.delete(id)
      }
    })()

    return {
      promise,
      cancel: () => {
        const p = this.processes.get(id)
        if (p) {
          p.kill()
          this.processes.delete(id)
        }
      }
    }
  }

  private mapError(error: unknown, command: string): CommandError {
    const err = error as { code?: string; timedOut?: boolean; message?: string }
    if (err.code === 'ENOENT') {
      return new CommandError('COMMAND_NOT_FOUND', command, '', null)
    }
    if (err.timedOut) {
      return new CommandError('TIMEOUT', command, '', null)
    }
    return new CommandError('UNKNOWN', command, err.message || String(error), null)
  }
}

export const commandRunner = new CommandRunner()
