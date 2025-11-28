import { Account } from "@near-js/accounts";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner } from "@near-js/signers";
import { JsonRpcProvider } from "@near-js/providers";
import { actionCreators } from "@near-js/transactions";

const STORAGE_KEY = `access_key::`;

const shouldUseAccessKey = (tx) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
        console.log("No access key found in storage.");
        return false;
    }

    const key = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (tx.receiverId != key.contractId) return false;

    for (const action of tx.actions) {
        if (action.type !== "FunctionCall") return false;
        if (key.allowedMethods.length > 0 && !key.allowedMethods.includes(action.params.methodName)) return false;
    }

    return true;
};

const signTransactionLocally = async (tx) => {
    const keyData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    console.log("[AccessKeyPlugin] Signing transaction locally with key data:", keyData);
    const keyPair = KeyPair.fromString(keyData.privateKey);
    const signer = new KeyPairSigner(keyPair);
    const provider = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
    const account = new Account(keyData.accountId, provider, signer);

    const actions = tx.actions.map((action) => {
        if (action.type === "FunctionCall") {
            return actionCreators.functionCall(
                action.params.methodName,
                action.params.args || {},
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

/** @type {import('@hot-dao/near-connect').WalletPlugin} */
export const AccessKeyPlugin = {
    async createKey({ wallet, contractId, methodNames, allowance }) {
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
                    accountId,
                    privateKey,
                    contractId,
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

    async signOut(args, next) {
        localStorage.removeItem(STORAGE_KEY);
        return next();
    },

    async signAndSendTransaction(tx, next) {
        console.log("[AccessKeyPlugin] signAndSendTransaction called with tx:", tx);

        if (shouldUseAccessKey(tx)) {
            return signTransactionLocally(tx);
        } else {
           return await next()
        }
    },
};
