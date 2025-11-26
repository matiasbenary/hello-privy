import { useEffect, useState, useCallback } from 'react'

import { Cards } from '@/components/cards'
import styles from '@/styles/app.module.css'

import { HelloNearContract } from '@/config'
import { useNEAR } from '../context/useNear'

// Contract that the app will interact with
const CONTRACT = HelloNearContract

export default function HelloNear() {
  const [greeting, setGreeting] = useState('loading...')
  const [newGreeting, setNewGreeting] = useState('loading...')
  const [showSpinner, setShowSpinner] = useState(false)

  const { viewFunction, callFunction, signedAccountId } = useNEAR()

  const fetchGreeting = useCallback(async () => {
    try {
      const greeting = await viewFunction(CONTRACT, 'get_greeting', {})
      setGreeting(greeting)
    } catch (error) {
      console.error('Error fetching greeting:', error)
      setGreeting('Error loading greeting')
    }
  }, [viewFunction])

  const saveGreeting = async () => {
    if (!signedAccountId) {
      alert('Please connect your wallet first')
      return
    }

    setShowSpinner(true)

    try {
      await callFunction(CONTRACT, 'set_greeting', { greeting: newGreeting })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchGreeting()
    } catch (e) {
      alert(
        `Error: ${e.message}\n\nMake sure you have NEAR tokens. Get testnet tokens at https://near-faucet.io/`
      )
      console.error('Error saving greeting:', e)
    } finally {
      setShowSpinner(false)
    }
  }

  useEffect(() => {
    fetchGreeting()
  }, [fetchGreeting])

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Interacting with the contract: &nbsp;
          <code className={styles.code}>{CONTRACT}</code>
        </p>
      </div>

      <div className={styles.center}>
        <h1 className="w-100">
          The contract says: <code>{greeting}</code>
        </h1>
        <div className="input-group" hidden={!signedAccountId}>
          <input
            type="text"
            className="form-control w-20"
            placeholder="Store a new greeting"
            onChange={(t) => setNewGreeting(t.target.value)}
          />
          <div className="input-group-append">
            <button className="btn btn-secondary" onClick={saveGreeting}>
              <span hidden={showSpinner}> Save </span>
              <i
                className="spinner-border spinner-border-sm"
                hidden={!showSpinner}
              ></i>
            </button>
          </div>
        </div>
        <div className="w-100 text-end align-text-center" hidden={!!signedAccountId}>
          <p className="m-0"> Please connect your wallet to change the greeting </p>
        </div>
      </div>
      <Cards />
    </main>
  )
}
