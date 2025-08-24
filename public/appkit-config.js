// AppKit (Reown) Configuration for Make It Snap
import { createAppKit } from '@reown/appkit';
import { mainnet, polygon, arbitrum, optimism, base } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// 1. Get a project ID at https://dashboard.reown.com
const projectId = '121dc2c7cd54970565e882ac7996a44f'; 

// 2. Define networks
export const networks = [mainnet, polygon, arbitrum, optimism, base];

// 3. Set up Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
});

// 4. Configure metadata
const metadata = {
    name: 'Make It Snap',
    description: 'AI-powered photo booth with smile detection and crypto features',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 5. Create the modal
export const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    metadata,
    projectId,
    features: {
        analytics: true
    },
    themeMode: 'light',
    themeVariables: {
        '--w3m-accent': '#667eea',
        '--w3m-border-radius-master': '8px'
    }
});

// 6. Export wagmi config for blockchain interactions
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// 7. Wallet state management
window.walletState = {
    isConnected: false,
    address: null,
    chainId: null
};

// 8. Update wallet UI when connection changes
modal.subscribeEvents(event => {
    console.log('Wallet event:', event);
    updateWalletUI();
});

// Update UI based on wallet state
function updateWalletUI() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (!connectBtn) return;
    
    const state = modal.getState();
    const account = modal.getAddress();
    
    if (account) {
        window.walletState.isConnected = true;
        window.walletState.address = account;
        window.walletState.chainId = modal.getChainId();
        
        // Show connected state
        const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
        connectBtn.textContent = shortAddress;
        connectBtn.classList.add('connected');
    } else {
        window.walletState.isConnected = false;
        window.walletState.address = null;
        window.walletState.chainId = null;
        
        // Show disconnected state
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
    }
}