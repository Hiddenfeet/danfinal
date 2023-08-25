import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import "./styles/globals.css";
import { Toaster } from "./components/ui/Toaster";
import { CronosBeta } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk/evm"

const container = document.getElementById("root");
const root = createRoot(container!);
const urlParams = new URL(window.location.toString()).searchParams;




const activeChain = "Cronos";
const sdk = new ThirdwebSDK(CronosBeta);


root.render(
  <React.StrictMode>
    <ThirdwebProvider 
      activeChain={{
        chainId: 25,
        rpc: ["https://mainnet.cronoslabs.com/v1/55e37d8975113ae7a44603ef8ce460aa"],
        nativeCurrency: {
          decimals: 18,
          name: "Cronos",
          symbol: "CRO",
        },
        shortName: "CRO",
        slug: "Cronos",
        testnet: false,
        chain: "Cronos Mainnet",
        name: "Cronos Mainnet",
      }}>
      <Toaster />
      <App />
    </ThirdwebProvider>
  </React.StrictMode>,
);
