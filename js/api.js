//PKCE functions, used for OAuth with Spotify API

export function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

export async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

export function base64urlencode(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export async function checkUrlForSpotifyCode(config) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        console.log("Authorization code caught. Exchanging for token via PKCE...");
        
        window.history.pushState({}, document.title, window.location.pathname);

        const codeVerifier = localStorage.getItem('spotify_code_verifier');

        const payload = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.clientId,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.redirectUri,
                code_verifier: codeVerifier
            })
        };

        try {
            const response = await fetch(config.tokenEndpoint, payload);
            if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
            
            const data = await response.json();
            console.log("Access Token securely generated via PKCE!");
            
            return data.access_token;
        } catch (err) {
            console.error("Error exchanging authorization code:", err);
            return null;
        }
    }
    return null;
}

export function handleNetworkChange() {
    const searchInputEl = document.getElementById('search-input');
    if (!navigator.onLine) {
        searchInputEl.disabled = true;
        searchInputEl.placeholder = "Offline... Only local library available";
    } else {
        searchInputEl.disabled = false;
        searchInputEl.placeholder = "Search for a new song...";
    }
}