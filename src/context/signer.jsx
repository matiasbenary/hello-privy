import { Account } from "@near-js/accounts"
import { Signature, SignedTransaction } from "@near-js/transactions"
import { sha256 } from "@noble/hashes/sha2"
import { bytesToHex, hexToBytes } from "@noble/hashes/utils"

export class privySigner {
  constructor(signRawHash, nearAccId, provider) {
    this.signRawHash = signRawHash
    this.nearAccId = nearAccId
    this.provider = provider
  }

  async getPublicKey() {
    const account = new Account(this.nearAccId, this.provider)
    const keys = await account.getAccessKeyList()
    return keys.keys[0].public_key
  }

  async signTransaction(transaction) {
    const encoded = transaction.encode()
    const txHash = bytesToHex(sha256(encoded))
    const signatureRaw = await this.signRawHash({
      address: this.nearAccId,
      chainType: 'near',
      hash: `0x${txHash}`,
    })
    const signature = new Signature({
      keyType: transaction.publicKey.keyType,
      data: hexToBytes(signatureRaw.signature.slice(2)),
    })
    return [[], new SignedTransaction({ transaction, signature })]
  }
}