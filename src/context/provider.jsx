// Privy
import { usePrivy } from '@privy-io/react-auth'
import { useCreateWallet } from '@privy-io/react-auth/extended-chains'
import { useSignRawHash } from '@privy-io/react-auth/extended-chains'

// near api js
import { JsonRpcProvider } from '@near-js/providers'
import { Account } from '@near-js/accounts'

// config
import { useEffect } from 'react'
import { useState } from 'react'
import { NearContext } from './useNear'
import { providerUrl } from '../config'
import { privySigner } from './signer'

// Provider
const provider = new JsonRpcProvider({ url: providerUrl })

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
        let signer = new privySigner(signRawHash, user.wallet.address, provider)
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
