import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import { JsonRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner } from "@near-js/signers";
import { actionCreators } from "@near-js/transactions";
import { NearConnector } from "@hot-labs/near-connect";
export const NearContext = createContext(undefined);

const RPC_URLS = {
  testnet: "https://test.rpc.fastnear.com",
  mainnet: "https://rpc.fastnear.com",
};

// interface FunctionCallKey {
//   privateKey: KeyPairString;
//   contractId: string;
//   allowedMethods: Array<string>;
// }

const AccessKeyPlugin = (wallet) => {
  console.log("[AccessKeyPlugin] Initialized");

  const STORAGE_KEY = `access_key::`;

  const shouldUseAccessKey = (tx) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      return false;
    }

    const key = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (tx.receiverId == key.contractId) return false;

    for (const action of tx.actions) {
      if (action.type !== "FunctionCall") return false;
      if (!key.allowedMethods.includes(action.params.methodName)) return false;
    }

    return true;
  };

  const signTransactionLocally = async (tx, provider) => {
    const keyData = JSON.parse(localStorage.getItem(STORAGE_KEY));

    const keyPair = KeyPair.fromString(keyData.privateKey);
    const signer = new KeyPairSigner(keyPair);
    const account = new Account(keyData.accountId, provider, signer);

    const actions = tx.actions.map((action) => {
      if (action.type === "FunctionCall") {
        return actionCreators.functionCall(
          action.params.methodName,
          action.params.args,
          BigInt(action.params.gas || "30000000000000"),
          BigInt(action.params.deposit || "0")
        );
      }
      throw new Error(`Unsupported action type: ${action.type}`);
    });

    try {
      const result = await account.signAndSendTransaction({
        receiverId: tx.receiverId,
        actions,
      });
      return result;
    } catch (error) {
      console.error("[AccessKeyPlugin] Error signing transaction:", error);
      throw error;
    }
  };

  return {
    ...wallet,
    async pepe() {
      console.log("pepe plugin called");
    },
    async createKey({ contractId, methodNames, allowance }) {
      console.log("[AccessKeyPlugin] createKey called with args:", { contractId, methodNames });

      const walletAccounts = await wallet.getAccounts();
      const accountId = walletAccounts[0]?.accountId;

      if (!accountId) {
        throw new Error("No account found");
      }

      const keyPair = KeyPair.fromRandom("ed25519");
      const newPublicKey = keyPair.getPublicKey().toString();
      const privateKey = keyPair.toString();

      try {
        const result = await wallet.signAndSendTransaction({
          receiverId: accountId,
          actions: [
            {
              type: "AddKey",
              params: {
                publicKey: newPublicKey,
                accessKey: {
                  permission: {
                    receiverId: contractId,
                    methodNames: methodNames || [],
                    allowance: allowance || "250000000000000000000000",
                  },
                },
              },
            },
          ],
        });

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            privateKey,
            contractId: contractId,
            allowedMethods: methodNames,
          })
        );

        console.log("[AccessKeyPlugin] Access key created successfully:", newPublicKey);
        return result
      } catch (error) {
        console.error("[AccessKeyPlugin] Error creating access key:", error);
        throw error;
      }
    },

    async signOut(args) {
      localStorage.removeItem(STORAGE_KEY);
      return wallet.signOut(args);
    },

    async signAndSendTransaction(tx) {
      console.log("[AccessKeyPlugin] signAndSendTransaction called with tx:");

      if (shouldUseAccessKey(tx)) {
        return signTransactionLocally(tx);
      }
      return wallet.signAndSendTransaction(tx);
    },
  };
};

export function NearProvider({
  children,
  network = "testnet",
  contractId,
  allowedMethods = [],
}) {
  const [wallet, setWallet] = useState(undefined);
  const [signedAccountId, setSignedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  const provider = useMemo(
    () => new JsonRpcProvider({ url: RPC_URLS[network] }),
    [network]
  );

  const connector = useMemo(() => {
    const conn = new NearConnector({
      network,
      logger: {
        log: (...logs) => console.log("[HOT-CONNECTOR]", ...logs),
      },
    });

    conn.use(AccessKeyPlugin);

    return conn;
  }, [network]);

  useEffect(() => {
    async function initializeConnector() {
      try {
        const connectedWallet = await connector.getConnectedWallet();

        if (connectedWallet) {
          setWallet(connectedWallet.wallet);
          setSignedAccountId(connectedWallet.accounts[0]?.accountId || "");
        }
      } catch {
        console.log("[HOT-CONNECTOR] No wallet connected");
      }

      const onSignOut = () => {
        console.log("[HOT-CONNECTOR] Wallet signed out");
        setWallet(undefined);
        setSignedAccountId("");
      };

      const onSignIn = async (payload) => {
        console.log("[HOT-CONNECTOR] Wallet signed in");
        setWallet(payload.wallet);
        const accounts = await payload.wallet.getAccounts();
        setSignedAccountId(accounts[0]?.accountId || "");
      };

      connector.on("wallet:signOut", onSignOut);
      connector.on("wallet:signIn", onSignIn);

      setLoading(false);
    }

    initializeConnector();

    return () => {
      if (connector) {
        connector.removeAllListeners("wallet:signOut");
        connector.removeAllListeners("wallet:signIn");
      }
    };
  }, [connector]);

  async function signIn() {
    if (!connector) return;

    try {
      const connectedWallet = await connector.connect();
      console.log("[HOT-CONNECTOR] Connected wallet", connectedWallet);

      if (connectedWallet) {
        setWallet(connectedWallet);
        const accounts = await connectedWallet.getAccounts();
        setSignedAccountId(accounts[0]?.accountId || "");
      }
    } catch (error) {
      console.error("[HOT-CONNECTOR] Error connecting:", error);
    }
  }

  async function signOut() {
    if (!connector || !wallet) return;

    try {
      await connector.disconnect(wallet);
      console.log("[HOT-CONNECTOR] Disconnected wallet");
      setWallet(undefined);
      setSignedAccountId("");
    } catch (error) {
      console.error("[HOT-CONNECTOR] Error disconnecting:", error);
    }
  }

  async function viewFunction(contractId, method, args = {}) {
    try {
      const result = await provider.callFunction(contractId, method, args);
      return result;
    } catch (error) {
      console.error("[HOT-CONNECTOR] Error calling view function:", error);
      throw error;
    }
  }

  async function callFunction(
    contractId,
    method,
    args = {},
    gas = "30000000000000",
    deposit = "0"
  ) {
    if (!wallet) {
      throw new Error("Wallet is not connected");
    }
    console.log("[HOT-CONNECTOR] callFunction called with:", {
      contractId,
      method,
      args,
      gas,
      deposit,
    });

    try {
      return await wallet.signAndSendTransaction({
        signerId: signedAccountId,
        receiverId: contractId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: method,
              args,
              gas,
              deposit,
            },
          },
        ],
      });
    } catch (error) {
      console.error("[HOT-CONNECTOR] Error calling function:", error);
      throw error;
    }
  }

  async function createKey() {
    if (!wallet) {
      throw new Error("Wallet is not connected");
    }

    if (!wallet.createKey) {
      throw new Error("Wallet does not support createKey method");
    }

    if (!contractId) {
      throw new Error("Contract ID is required to create access key");
    }

    await wallet.createKey({
      contractId,
      methodNames: allowedMethods,
    });
  }

  const nearAccount = useMemo(() => {
    if (!signedAccountId) return null;
    return new Account(signedAccountId, provider);
  }, [signedAccountId, provider]);

  const value = {
    signedAccountId,
    wallet,
    signIn,
    signOut,
    createKey,
    loading,
    viewFunction,
    callFunction,
    provider,
    connector,
    walletId: signedAccountId,
    nearAccount,
  };

  return <NearContext.Provider value={value}>{children}</NearContext.Provider>;
}

NearProvider.propTypes = {
  children: PropTypes.node.isRequired,
  network: PropTypes.oneOf(["testnet", "mainnet"]),
  contractId: PropTypes.string,
  allowedMethods: PropTypes.arrayOf(PropTypes.string),
};

export function useNEAR() {
  const context = useContext(NearContext);
  if (context === undefined) {
    throw new Error("useNEAR must be used within a NearProvider");
  }
  return context;
}

export function useNearWallet() {
  return useNEAR();
}
