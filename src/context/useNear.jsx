import { useContext, createContext } from 'react'

/**
 * @typedef {Object} NearContext
 * @property {import('@near-js/accounts').Account | null} nearAccount The NEAR account instance
 * @property {string} walletId The user's NEAR wallet address
 * @property {import('@near-js/providers').JsonRpcProvider} provider A NEAR JSON RPC provider
 */

/** @type {import('react').Context<NearContext>} */
export const NearContext = createContext({
  walletId: '',
  nearAccount: null,
  provider: undefined,
})

export function useNEAR() {
  const context = useContext(NearContext)
  if (!context) {
    throw new Error('useNEAR must be used within a <NEARxPrivy> provider')
  }
  return context
}
