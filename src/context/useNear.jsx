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
import { NearConnector } from "@hot-labs/near-connect";
import { AccessKeyPlugin } from "./plugin";
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
      // logger: {
      //   log: (...logs) => console.log("[HOT-CONNECTOR]", ...logs),
      // },
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
        setWallet(undefined);
        setSignedAccountId("");
      };

      const onSignIn = async (payload) => {
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

    if (!contractId) {
      throw new Error("Contract ID is required to create access key");
    }

    await AccessKeyPlugin.createKey({
      wallet,
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
