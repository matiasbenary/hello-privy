import { useEffect, useState } from 'react'

import NearLogo from '@/assets/near-logo.svg'
import { Link } from 'react-router'
import styles from '@/styles/app.module.css'

import { useNEAR } from '../context/useNear'
import { NEAR } from '@near-js/tokens'

export const Navigation = () => {
  const [balance, setBalance] = useState(0)
  const { signedAccountId, nearAccount, signIn, signOut, loading, createKey } = useNEAR()

  useEffect(() => {
    if (nearAccount && signedAccountId) {
      nearAccount
        .getBalance()
        .then((b) => setBalance(Number(NEAR.toDecimal(b)).toFixed(2)))
        .catch(() => setBalance(0))
    } else {
      setBalance(0)
    }
  }, [signedAccountId, nearAccount])

  const handleWalletConnect = () => {
    if (signedAccountId) {
      signOut()
    } else {
      signIn()
    }
  }

  const handleCreateKey = async () => {
    try {
      await createKey()
      alert('Access key created successfully! You can now sign transactions without wallet popups.')
    } catch (error) {
      console.error('Error creating access key:', error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid">
          <Link to="/">
            <img
              src={NearLogo}
              alt="NEAR"
              width="30"
              height="24"
              className={styles.logo}
            />
          </Link>
          <div className="navbar-nav pt-1 gap-2">
            {signedAccountId && (
              <span className="badge text-dark small">
                {signedAccountId}: {balance} Ⓝ
              </span>
            )}

            <button
              className="btn btn-primary"
              onClick={handleWalletConnect}
              disabled={loading}
            >
              {loading
                ? 'Loading...'
                : signedAccountId
                  ? 'Disconnect Wallet'
                  : 'Connect Wallet'}
            </button>

            {signedAccountId && (
              <button
                className="btn btn-success"
                onClick={handleCreateKey}
                disabled={loading}
              >
                Create Access Key
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
