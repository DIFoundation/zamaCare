import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

export const wagmiConfig = createConfig({
  chains: targetNetworks,
  connectors: wagmiConnectors(),
  ssr: true,
  client: ({ chain }) => {
    let rpcFallbacks = [];
    
    // Add custom RPC override if available
    if (scaffoldConfig.rpcOverrides) {
        rpcFallbacks.unshift(http(scaffoldConfig.rpcOverrides[chain.id as keyof typeof scaffoldConfig.rpcOverrides]));
    }
    
    // Add multiple reliable public RPCs as fallbacks to avoid rate limiting
    if (chain.id === 11155111) { // Sepolia
      rpcFallbacks.push(http("https://sepolia.drpc.org"));
      rpcFallbacks.push(http("https://ethereum-sepolia-rpc.publicnode.com"));
      rpcFallbacks.push(http("https://1rpc.io/sepolia"));
      rpcFallbacks.push(http("https://ethereum-sepolia-public.nodies.app"));
      rpcFallbacks.push(http("https://gateway.tenderly.co/public/sepolia"));
    } else {
        // For other chains, use a generic public RPC
        rpcFallbacks.push(http());
    }
    
    // Add Etherscan RPC if API key is available
    // const etherscanUrl = getEtherscanHttpUrl(chain.id);
    // if (etherscanUrl && scaffoldConfig.etherscanKey) {
    //   rpcFallbacks.unshift(http(`${etherscanUrl}?apikey=${scaffoldConfig.etherscanKey}&chainid=${chain.id}&module=logs&action=getLogs&address=0x8bC17Cb1B74aAdbcC4a8566357d906BE556A81f6`));
    // }
    
    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== (hardhat as Chain).id ? { pollingInterval: scaffoldConfig.pollingInterval } : {}),
    });
  },
});
