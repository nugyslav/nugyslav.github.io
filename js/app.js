import { DatabaseManager } from "./db.js";
import { ViewManager, renderLibraryUI, renderSpotifySearchResults } from "./view.js";
import { generateRandomString, sha256, base64urlencode, checkUrlForSpotifyCode, handleNetworkChange } from "./api.js";
import { Track, TrackComponent } from "./trackComponent.js"
import { drawVisualiser } from "./player.js";

const CONFIG = {
    clientId: "eba4f0c864c04a43adfe42ac805fc0d1",
    redirectUri: "http://127.0.0.1:5500/", //loopback address due to Spotify
    authEndpoint: "https://accounts.spotify.com/authorize",
    tokenEndpoint: "https://accounts.spotify.com/api/token"
};

let SPOTIFY_ACCESS_TOKEN = localStorage.getItem('spotify_access_token') || ""; 
let isLoggedIn = SPOTIFY_ACCESS_TOKEN !== ""; 
let audioCtx = null;
let analyser = null;
let bufferLength = 0;
let dataArray = null;

// DOM elements
const audioElement = document.getElementById('audio-element');
const backToLibBtn = document.getElementById('back-to-lib-btn');
const canvas = document.getElementById('visualiser');
const canvasCtx = canvas ? canvas.getContext('2d') : null;
const loginBtn = document.getElementById('login-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');
const searchInput = document.getElementById('search-input');
const uploadForm = document.getElementById('upload-form');
const volumeBar = document.getElementById('volume-bar');

const dbManager = new DatabaseManager();

canvas.width = 600;
canvas.height = 300;

async function startApp() {
    dbManager.initDatabase();
    ViewManager.updateLoginViewState(isLoggedIn);
    
    //if user is returning from OAuth, changes view
    try {
        const newToken = await checkUrlForSpotifyCode(CONFIG);
        if (newToken) {
            SPOTIFY_ACCESS_TOKEN = newToken;
            localStorage.setItem('spotify_access_token', SPOTIFY_ACCESS_TOKEN);
            isLoggedIn = true;
            ViewManager.updateLoginViewState(isLoggedIn);
        }
    } catch (err) {
        console.warn("Spotify authentication failed:", err);
    }
}

//changing pages
window.addEventListener('hashchange', ViewManager.handleRoute);
window.addEventListener('load', ViewManager.handleRoute);

//song lookup
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            const apiURL = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
            const response = await fetch(apiURL, {
                headers: { 'Authorization': `Bearer ${SPOTIFY_ACCESS_TOKEN}` }
            });
            
            if (response.status === 401) throw new Error("TOKEN_EXPIRED");
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            
            const data = await response.json();
            renderSpotifySearchResults(data.tracks.items, dbManager);
        } catch (err) {
            console.error(err);
            if (err.message === "TOKEN_EXPIRED") {
                alert("Your Spotify session has expired! Please connect again.");
                localStorage.removeItem('spotify_access_token');
                SPOTIFY_ACCESS_TOKEN = "";
                isLoggedIn = false;
                ViewManager.updateLoginViewState(isLoggedIn);
                renderLibraryUI(dbManager);
            }
        }
    }
});

loginBtn.addEventListener('click', async () => {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const params = new URLSearchParams({
        client_id: CONFIG.clientId,
        response_type: 'code',
        redirect_uri: CONFIG.redirectUri,
        scope: 'user-read-private',
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    });

    window.location.href = `${CONFIG.authEndpoint}?${params.toString()}`;
});

backToLibBtn.addEventListener('click', () => {
    renderLibraryUI(dbManager);
    backToLibBtn.classList.add('hidden');
});

function initAudioContext(audioElement, existingCtx) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;

    const source = audioCtx.createMediaElementSource(audioElement);
    
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    return {audioCtx, analyser, bufferLength, dataArray, source};
}
//song controls
playPauseBtn.addEventListener('click', () => {
    if (!audioElement || !audioElement.src) {
        alert("Select a track from the library panel first!");
        return;
    }
    
    if (!audioCtx) {
        const audioSetup = initAudioContext(audioElement, audioCtx);
        audioCtx = audioSetup.audioCtx;
        analyser = audioSetup.analyser;
        bufferLength = audioSetup.bufferLength;
        dataArray = audioSetup.dataArray;
        
        drawVisualiser(canvas, canvasCtx, analyser, dataArray, bufferLength);
    }
    
    if (audioCtx && audioCtx.state === 'suspended'){
        audioCtx.resume();
    }

    if (audioElement.paused) {
        audioElement.play().catch(err => console.error(err));
        playPauseBtn.textContent = 'Pause';
    } else {
        audioElement.pause();
        playPauseBtn.textContent = 'Play';
    }
});
progressBar.addEventListener('input', () => { audioElement.currentTime = progressBar.value; });
volumeBar.addEventListener('input', () => { audioElement.volume = volumeBar.value; });

//upload page, verifying validity of user input
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const audioInput = document.getElementById('audio-file');
    const lyricsInput = document.getElementById('lyrics-file');
    const titleInput = document.getElementById('title-input');
    const artistInput = document.getElementById('artist-input');
    
    if (!audioInput || !audioInput.files[0]) return;
    const audioFile = audioInput.files[0];

    const lyricsFile = lyricsInput ? lyricsInput.files[0] : null;
    let finalLyricsText = "";

    if (lyricsFile) {
        try {
            finalLyricsText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(lyricsFile);
            });
        } catch (error) {
            console.error(error);
            finalLyricsText = "Error parsing lyrics file.";
        }
    }
    const newTrack = new Track(titleInput.value, artistInput.value, audioFile, finalLyricsText);
    dbManager.addSong(newTrack);
    uploadForm.reset();
    window.location.hash = '#/';
});

startApp();

window.addEventListener('online', handleNetworkChange);
window.addEventListener('offline', handleNetworkChange);

handleNetworkChange();