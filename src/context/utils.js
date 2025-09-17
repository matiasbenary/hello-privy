export function bytesToHex(bytes) {
  let hex = '0x'
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i].toString(16).padStart(2, '0')
    hex += v
  }
  return hex
}
