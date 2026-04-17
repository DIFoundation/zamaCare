import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  etherscanKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  // onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig;

const rawEtherscanKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
const rawWalletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

if (!rawEtherscanKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Environment variable NEXT_PUBLIC_ETHERSCAN_API_KEY is required in production.");
  } else {
    // eslint-disable-next-line no-console
    console.warn("NEXT_PUBLIC_ETHERSCAN_API_KEY is not set. Falling back to public RPCs.");
  }
}

if (!rawWalletConnectProjectId) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Environment variable NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required in production.");
  } else {
    // eslint-disable-next-line no-console
    console.warn("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. Falling back to default value.");
  }
}

const scaffoldConfig = {
  targetNetworks: [chains.sepolia],
  // The interval at which your front-end polls the RPC servers for new data
  pollingInterval: 60000,
  // Get your own Etherscan API key at https://etherscan.io/apis
  // Store it in .env.local for local testing
  etherscanKey: rawEtherscanKey || "", // Keep this name for compatibility
  rpcOverrides: {
    [chains.sepolia.id]: "https://gateway.tenderly.co/public/sepolia"
  },
  walletConnectProjectId: rawWalletConnectProjectId || "c1362a4b534f96512c03c786cf8314fc",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
