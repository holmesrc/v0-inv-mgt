import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Buffer } from "buffer"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function handleBlob(input: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = input.getReader()
  const chunks: Uint8Array[] = []

  let done = false
  while (!done) {
    const { done: isDone, value } = await reader.read()
    done = isDone
    if (value) {
      chunks.push(value)
    }
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return Buffer.from(result)
}
