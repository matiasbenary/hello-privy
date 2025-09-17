// Privy
import { usePrivy } from '@privy-io/react-auth'
import { useCreateWallet } from '@privy-io/react-auth/extended-chains'
import { useSignRawHash } from '@privy-io/react-auth/extended-chains'

// near api js
import { JsonRpcProvider } from '@near-js/providers'
import { Account } from '@near-js/accounts'
import { Signature, SignedTransaction } from '@near-js/transactions'

// utils
import { sha256 } from '@noble/hashes/sha2'
import { hexToBytes } from '@noble/hashes/utils'

// config
import { useEffect } from 'react'
import { useState } from 'react'
import { NearContext } from './useNear'
import { bytesToHex } from './utils'
import { providerUrl } from '../config'

// Provider
const provider = new JsonRpcProvider({ url: providerUrl })

class privySigner {
  constructor(signRawHash, nearAccId) {
    this.signRawHash = signRawHash
    this.nearAccId = nearAccId
  }

  async getPublicKey() {
    const account = new Account(this.nearAccId, provider)
    const keys = await account.getAccessKeyList()
    return keys.keys[0].public_key
  }

  async signTransaction(transaction) {
    const encoded = transaction.encode()
    const txHash = bytesToHex(sha256(encoded))
    const signatureRaw = await this.signRawHash({
      address: this.nearAccId,
      chainType: 'near',
      hash: txHash,
    })
    const signature = new Signature({
      keyType: transaction.publicKey.keyType,
      data: hexToBytes(signatureRaw.signature.slice(2)),
    })
    return [[], new SignedTransaction({ transaction, signature })]
  }
}

// eslint-disable-next-line react/prop-types
export function NEARxPrivy({ children }) {
  const { authenticated, user } = usePrivy()
  const [walletId, setWalletId] = useState('')
  const [nearAccount, setNearAccount] = useState(null)

  const { signRawHash } = useSignRawHash()
  const { createWallet } = useCreateWallet()

  useEffect(() => {
    if (authenticated) {
      if (!user.wallet) {
        createWallet({ chainType: 'near' })
      } else {
        let signer = new privySigner(signRawHash, user.wallet.address)
        let acc = new Account(user.wallet.address, provider, signer)
        setNearAccount(acc)
        setWalletId(user.wallet.address)
      }
    } else {
      setWalletId('')
      setNearAccount(null)
    }
  }, [authenticated, user, createWallet, signRawHash])

  return (
    <NearContext.Provider value={{ provider, nearAccount, walletId }}>
      {children}
    </NearContext.Provider>
  )
}
