// AppKit (Reown) Configuration for Make It Snap
import { createAppKit } from '@reown/appkit';
import { mainnet, polygon, arbitrum, optimism, base } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createCoinCall, CreateConstants, createMetadataBuilder, createZoraUploaderForCreator, setApiKey } from '@zoralabs/coins-sdk';
import { base as baseChain } from 'viem/chains';
import { formatEther } from 'viem';

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

// Clear any persisted wallet sessions on first load to prevent auto-connect
(function clearPersistedWalletSessionsOnce() {
    try {
        if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('wallet_cleared_once')) {
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
            try { sessionStorage.clear(); } catch {}
            sessionStorage.setItem('wallet_cleared_once', '1');
        }
    } catch (e) {
        console.warn('Wallet persistence clear failed (non-blocking):', e);
    }
})();

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
    chainId: null,
    provider: null
};

// 8. Update wallet UI when connection changes
modal.subscribeEvents(event => {
    console.log('Wallet event:', event);
    // Sync walletState based on current provider accounts after any modal event
    // This ensures our app-level gating updates immediately after user connects/disconnects in AppKit
    refreshWalletState();
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

    // Create (or find) wallet balance indicator
    let balanceEl = document.getElementById('wallet-balance');
    if (!balanceEl) {
        balanceEl = document.createElement('div');
        balanceEl.id = 'wallet-balance';
        balanceEl.style.marginLeft = '12px';
        balanceEl.style.fontSize = '0.9rem';
        balanceEl.style.opacity = '0.9';
        controls.appendChild(balanceEl);
    }
    updateWalletBalanceUI();
});

async function updateWalletBalanceUI() {
    try {
        const el = document.getElementById('wallet-balance');
        if (!el) return;
        if (!window.walletState?.isConnected || !window.walletState?.address || !window.ethereum) {
            el.textContent = '';
            return;
        }
        const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [window.walletState.address, 'latest']
        });
        const wei = BigInt(balanceHex);
        const eth = formatEther(wei);
        const formatted = Number.parseFloat(eth).toFixed(4);
        el.textContent = `Balance: ${formatted} ETH`;
    } catch (e) {
        console.warn('Balance fetch failed:', e);
    }
}

// ------- Wallet connectivity helpers and events -------
async function refreshWalletState() {
    try {
        if (typeof window.ethereum === 'undefined') {
            setDisconnected();
            return;
        }
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
        if (accounts && accounts.length > 0) {
            setConnected(accounts[0], chainId);
        } else {
            setDisconnected();
        }
    } catch (e) {
        console.error('refreshWalletState error:', e);
        setDisconnected();
    }
}

function setConnected(address, chainId) {
    const wasConnected = window.walletState.isConnected;
    window.walletState.isConnected = true;
    window.walletState.address = address;
    window.walletState.chainId = chainId;
    window.walletState.provider = window.ethereum || null;
    if (!wasConnected) {
        window.dispatchEvent(new CustomEvent('wallet:connected', { detail: { address, chainId } }));
    } else {
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail: { address, chainId } }));
    }
    updateWalletBalanceUI();
}

function setDisconnected() {
    const wasConnected = window.walletState.isConnected;
    window.walletState.isConnected = false;
    window.walletState.address = null;
    window.walletState.chainId = null;
    window.walletState.provider = null;
    if (wasConnected) {
        window.dispatchEvent(new Event('wallet:disconnected'));
    }
    updateWalletBalanceUI();
}

if (typeof window !== 'undefined') {
    // No initial auto-probe; wait for explicit user action to connect
    // Listen to provider events
    if (window.ethereum && typeof window.ethereum.on === 'function') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts && accounts.length > 0) {
                setConnected(accounts[0], window.walletState.chainId);
            } else {
                setDisconnected();
            }
            updateWalletBalanceUI();
        });
        window.ethereum.on('chainChanged', (chainId) => {
            if (window.walletState.isConnected) {
                setConnected(window.walletState.address, chainId);
            }
            updateWalletBalanceUI();
        });
        window.ethereum.on('disconnect', () => setDisconnected());
    }
}

// ------- Zora coin creation helper -------
// Configure your developer referrer address here to earn rewards
window.ZORA_CONFIG = window.ZORA_CONFIG || {
    referrerAddress: null, // e.g., '0xYourReferrerAddress'
    // Temporary: API key wired here so both auto & manual coin work immediately.
    // Prefer using env var VITE_ZORA_API_KEY in production.
    apiKey: null
};

// Configure Zora Coins SDK API key from env or window configuration
try {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ZORA_API_KEY) || null;
    const lsKey = (typeof localStorage !== 'undefined' && localStorage.getItem('ZORA_API_KEY')) || null;
    const configuredKey = envKey || window.ZORA_CONFIG?.apiKey || lsKey || null;
    if (configuredKey) {
        setApiKey(configuredKey);
        console.log('Zora SDK: API key configured');
    } else {
        console.warn('Zora SDK: No API key configured. Set VITE_ZORA_API_KEY or window.ZORA_CONFIG.apiKey');
    }
} catch (e) {
    console.error('Zora SDK: Failed to set API key', e);
}

// Expose a runtime helper to set/update the API key without rebuilding
try {
    window.setZoraApiKey = function(key) {
        try {
            setApiKey(key);
            try { if (typeof localStorage !== 'undefined') localStorage.setItem('ZORA_API_KEY', key); } catch {}
            console.log('Zora SDK: API key set at runtime');
        } catch (e) {
            console.error('Zora SDK: Failed to set API key at runtime', e);
        }
    };
} catch {}

async function ensureBaseChain() {
    try {
        const current = await window.ethereum.request({ method: 'eth_chainId' });
        const baseHex = '0x' + baseChain.id.toString(16);
        if (current !== baseHex) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: baseHex }]
            });
        }
        return true;
    } catch (err) {
        console.error('Chain switch to Base failed:', err);
        // Try to add Base if it's not available, then switch again
        try {
            const baseHex = '0x' + baseChain.id.toString(16);
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: baseHex,
                    chainName: 'Base',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org']
                }]
            });
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: baseHex }]
            });
            return true;
        } catch (addErr) {
            console.error('Adding/switching to Base failed:', addErr);
            alert('Please add and switch to Base network in your wallet to coin your snap.');
            return false;
        }
    }
}

function generateSymbol() {
    const base = 'SNAP';
    const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6);
    const symbol = (base + rand).slice(0, 6);
    return symbol;
}

async function coinSnapWithZora(imageFile, title) {
    try {
        if (!window.walletState.isConnected || !window.walletState.address) {
            throw new Error('Connect your wallet first');
        }
        if (!window.ethereum) {
            throw new Error('No wallet provider available');
        }
        const onBase = await ensureBaseChain();
        if (!onBase) return { ok: false, error: 'Wrong network' };

        const creator = window.walletState.address;
        const symbol = generateSymbol();

        const { createMetadataParameters } = await createMetadataBuilder()
            .withName(title)
            .withSymbol(symbol)
            .withDescription('Make It Snap photo')
            .withImage(imageFile)
            .upload(createZoraUploaderForCreator(creator));

        const calls = await createCoinCall({
            creator,
            ...createMetadataParameters,
            currency: CreateConstants.ContentCoinCurrencies.ZORA,
            chainId: baseChain.id,
            startingMarketCap: CreateConstants.StartingMarketCaps.LOW,
            platformReferrer: window.ZORA_CONFIG?.referrerAddress || undefined
        });

        if (!calls || !calls.length) throw new Error('Failed to build coin transaction');

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: creator,
                to: calls[0].to,
                data: calls[0].data,
                value: calls[0].value ? '0x' + BigInt(calls[0].value).toString(16) : '0x0'
            }]
        });

        return { ok: true, hash: txHash };
    } catch (e) {
        console.error('coinSnapWithZora error:', e);
        return { ok: false, error: e?.message || String(e) };
    }
}

window.coinSnapWithZora = coinSnapWithZora;