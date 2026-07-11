const IV_LENGTH = 12
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function getSecret(): string {
  return import.meta.env.VITE_APP_LOGIN_URL_SECRET?.trim() ?? ''
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function encodeBase64Url(value: Uint8Array): string {
  const binary = Array.from(value, byte => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret()
  if (!secret) {
    throw new Error('VITE_APP_LOGIN_URL_SECRET is not configured')
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptLoginUrlCredential(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), encoder.encode(value))
  const payload = new Uint8Array(iv.length + encrypted.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(encrypted), iv.length)
  return encodeBase64Url(payload)
}

export async function decryptLoginUrlCredential(value: string): Promise<string> {
  const payload = decodeBase64Url(value)
  if (payload.length <= IV_LENGTH) {
    throw new Error('Invalid login URL credential')
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.slice(0, IV_LENGTH) },
    await getKey(),
    payload.slice(IV_LENGTH)
  )
  return decoder.decode(decrypted)
}
