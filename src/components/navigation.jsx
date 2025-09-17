import { useEffect, useState } from 'react'

import NearLogo from '@/assets/near-logo.svg'
import { Link } from 'react-router'
import styles from '@/styles/app.module.css'

import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth'
import { useNEAR } from '../context/useNear'
import { NEAR } from '@near-js/tokens'

export const Navigation = () => {
  const [action, setAction] = useState(() => {})
  const [label, setLabel] = useState('Loading...')
  const [balance, setBalance] = useState(0)
  const { authenticated, user } = usePrivy()

  const { login: privyLogin } = useLogin()
  const { logout: privyLogout } = useLogout()

  const { walletId, nearAccount } = useNEAR()

  useEffect(() => {
    if (authenticated) {
      const userId = user.google
        ? user.google.email
        : user.email
          ? user.email.address
          : user.github.username
      setAction(() => privyLogout)
      setLabel(`Logout ${userId}`)
    } else {
      setAction(() => privyLogin)
      setLabel('Login')
      setBalance(null)
    }
  }, [authenticated, privyLogin, privyLogout, user])

  useEffect(() => {
    if (walletId) {
      nearAccount
        .getBalance()
        .then((b) => setBalance(Number(NEAR.toDecimal(b)).toFixed(2)))
        .catch(() => setBalance(0)) // non existing account
    }
  }, [walletId, nearAccount])

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
          <div className="navbar-nav pt-1">
            {authenticated ? (
              <span className="badge text-dark small">
                {' '}
                <br />
                {walletId}: {balance} Ⓝ
              </span>
            ) : null}

            <button className="btn btn-secondary" onClick={action}>
              {label}
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
