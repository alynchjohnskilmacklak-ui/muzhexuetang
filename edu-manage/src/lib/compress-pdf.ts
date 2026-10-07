import { spawn } from 'child_process'
import path from 'path'

const COMPRESS_SCRIPT = path.join(process.cwd(), 'scripts', 'compress-pdf.py')

function pythonBin(): string {
  // Windows 本地开发用 D:\Python311\python.exe；服务器 Linux 用 python3
  if (process.platform === 'win32') {
    return process.env.PYTHON_BIN || 'D:\\Python311\\python.exe'
  }
  return process.env.PYTHON_BIN || 'python3'
}

/**
 * 压缩 PDF：仅在 > 3MB 时调用 python+pymupdf。
 * 失败/超时/未安装 python 时返回原 buffer，不阻断上传。
 */
export async function compressPdfIfNeeded(buffer: Buffer): Promise<Buffer> {
  if (buffer.length < 3 * 1024 * 1024) return buffer
  return new Promise((resolve) => {
    const py = spawn(pythonBin(), [COMPRESS_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let err = ''
    const timer = setTimeout(() => {
      py.kill('SIGKILL')
      resolve(buffer)
    }, 60_000)
    py.stdout.on('data', (d: Buffer) => chunks.push(d))
    py.stderr.on('data', (d: Buffer) => { err += d.toString() })
    py.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        console.warn('[compress-pdf] exit', code, err.slice(0, 200))
        resolve(buffer)
        return
      }
      const out = Buffer.concat(chunks)
      resolve(out.length > 0 && out.length < buffer.length ? out : buffer)
    })
    py.on('error', () => {
      clearTimeout(timer)
      resolve(buffer)
    })
    py.stdin.end(buffer)
  })
}
