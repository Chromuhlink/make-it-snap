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
        analytics: false
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
    // We'll use the AppKit modal button, no need for custom UI updates
    console.log('Wallet state updated');
}

// Make modal available globally for debugging
window.appKitModal = modal;
window.wagmiConfig = wagmiConfig;

console.log('AppKit initialized successfully');
// Provide a robust disconnect fallback and UI control
function hardDisconnect() {
    try {
        if (typeof localStorage !== 'undefined') {
            const patterns = [
                /^wagmi/i,
                /^walletconnect/i,
                /^wc@/i,
                /^WALLETCONNECT/i,
                /^coinbase/i,
                /^cbwallet/i,
                /^appkit/i,
                /^w3m/i,
                /^reown/i
            ];
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (patterns.some(p => p.test(key))) {
                    localStorage.removeItem(key);
                }
            }
        }
        if (window.ethereum && typeof window.ethereum.removeAllListeners === 'function') {
            window.ethereum.removeAllListeners('accountsChanged');
            window.ethereum.removeAllListeners('chainChanged');
            window.ethereum.removeAllListeners('disconnect');
        }
    } catch (e) {
        console.error('Disconnect cleanup error:', e);
    }
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.clear(); } catch {}
    window.location.reload();
}

window.forceDisconnect = hardDisconnect;

document.addEventListener('DOMContentLoaded', () => {
    const controls = document.querySelector('.controls-section');
    if (!controls || document.getElementById('disconnect-wallet-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'disconnect-wallet-btn';
    btn.className = 'start-camera-btn';
    btn.textContent = 'Disconnect';
    btn.style.backgroundColor = '#dc3545';
    btn.onclick = hardDisconnect;
    controls.appendChild(btn);
});