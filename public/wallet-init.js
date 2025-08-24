// Wallet initialization for vanilla JavaScript
// This file handles the wallet connection using a simple button approach

window.walletState = {
    isConnected: false,
    address: null,
    chainId: null,
    provider: null
};

// Initialize wallet connection when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create connect wallet button if it doesn't exist
    const controlsSection = document.querySelector('.controls-section');
    if (controlsSection) {
        // Remove the w3m-button if it exists
        const w3mButton = controlsSection.querySelector('w3m-button');
        if (w3mButton) {
            w3mButton.remove();
        }
        
        // Check if button already exists
        let connectBtn = document.getElementById('connect-wallet-btn');
        if (!connectBtn) {
            // Create the connect wallet button
            connectBtn = document.createElement('button');
            connectBtn.id = 'connect-wallet-btn';
            connectBtn.className = 'connect-wallet-btn';
            connectBtn.textContent = 'Connect Wallet';
            
            // Insert before the start button
            const startBtn = document.getElementById('start-camera-btn');
            controlsSection.insertBefore(connectBtn, startBtn);
        }
        
        // Add click handler
        connectBtn.addEventListener('click', handleWalletConnection);
    }
});

async function handleWalletConnection() {
    const btn = document.getElementById('connect-wallet-btn');
    
    if (window.walletState.isConnected) {
        // Disconnect
        disconnectWallet();
    } else {
        // Connect
        await connectWallet();
    }
}

async function connectWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length > 0) {
                window.walletState.isConnected = true;
                window.walletState.address = accounts[0];
                window.walletState.provider = window.ethereum;
                
                // Get chain ID
                const chainId = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                window.walletState.chainId = chainId;
                
                // Update button
                const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
                btn.textContent = shortAddress;
                btn.classList.add('connected');
                
                console.log('Wallet connected:', accounts[0]);
                console.log('Chain ID:', chainId);
                
                // Listen for account changes
                window.ethereum.on('accountsChanged', handleAccountsChanged);
                window.ethereum.on('chainChanged', handleChainChanged);
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    } else {
        // MetaMask not installed
        alert('Please install MetaMask to connect your wallet!\n\nVisit: https://metamask.io');
    }
}

function disconnectWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    
    window.walletState.isConnected = false;
    window.walletState.address = null;
    window.walletState.chainId = null;
    window.walletState.provider = null;
    
    // Update button
    btn.textContent = 'Connect Wallet';
    btn.classList.remove('connected');
    
    // Remove event listeners
    if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    
    console.log('Wallet disconnected');
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
    } else if (accounts[0] !== window.walletState.address) {
        // User switched accounts
        window.walletState.address = accounts[0];
        const btn = document.getElementById('connect-wallet-btn');
        const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
        btn.textContent = shortAddress;
        console.log('Account changed:', accounts[0]);
    }
}

function handleChainChanged(chainId) {
    // Handle chain change
    window.walletState.chainId = chainId;
    console.log('Chain changed:', chainId);
    // Reload the page as recommended by MetaMask
    window.location.reload();
}