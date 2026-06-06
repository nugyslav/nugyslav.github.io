import { loadTrackIntoPlayer } from "./player.js";
import { Track } from "./trackComponent.js";

export const ViewManager = {
    updateLoginViewState(isLoggedIn) {
        const backToLibraryBtn = document.getElementById('back-to-lib-btn');
        const loginBox = document.getElementById('login-box');
        const searchBox = document.getElementById('search-box');

        if (isLoggedIn) {
            loginBox.classList.add('hidden');
            searchBox.classList.remove('hidden');
            backToLibraryBtn.classList.add('hidden');
        } else {
            loginBox.classList.remove('hidden');
            searchBox.classList.add('hidden');
            backToLibraryBtn.classList.add('hidden');
        }
    },

    handleRoute() {
        const playerView = document.getElementById('visualiser-box');
        const uploadView = document.getElementById('upload');

        if (window.location.hash === '#/') {
            playerView.classList.remove('hidden');
            uploadView.classList.add('hidden');
        } else {
            playerView.classList.add('hidden');
            uploadView.classList.remove('hidden');
        }
    }
};

export function renderLibraryUI(dbManager) {
    const playlistTracksContainer = document.getElementById('songs'); 
    playlistTracksContainer.innerHTML = '';
    const demoTracks = [
        {
            title: "Breathe Deeper",
            artist: "Tame Impala",
            audioUrl: "media/Tame_Impala_Breathe_Deeper.mp3",
            lyricsText: "lyrics/Tame_Impala_Breathe_Deeper.lrc"
        },
        {
            title: "New Person, Same Old Mistakes",
            artist: "Tame Impala",
            audioUrl: "media/Tame_Impala_NPSOM.mp3",
            lyricsText: "lyrics/Tame_Impala_NPSOM.lrc"
        }
    ];

    demoTracks.forEach((track) => {
        const trackRow = document.createElement('div');
        trackRow.className = 'playlist-track-row';

        const btn = document.createElement('button');
        btn.className = 'library-btn demo-track';
        btn.textContent = `${track.title}`;
        
        btn.addEventListener('click', async () => {
            const lyricsFile = await fetch(track.lyricsText)
            let lyrics = await lyricsFile.text();

            loadTrackIntoPlayer(track.title, track.artist, track.audioUrl, lyrics)
        });

        trackRow.appendChild(btn);
        playlistTracksContainer.appendChild(trackRow);
    });

    const transaction = dbManager.db.transaction(["songs"], "readonly");
    const store = transaction.objectStore("songs");
    const request = store.getAll();

    request.onsuccess = function(event) {
        const songs = event.target.result;
        const sortedSongs = songs.sort((a, b) => a.title.localeCompare(b.title));
        
        sortedSongs.forEach((song) => {
            const trackComponent = document.createElement('track-component');
            trackComponent.setData(song, dbManager);
            playlistTracksContainer.appendChild(trackComponent);
        });
    };
}

export function renderSpotifySearchResults(spotifyTracks, dbManager) {
    const playlistTracksContainer = document.getElementById('songs');
    const backToLibraryBtn = document.getElementById('back-to-lib-btn');
    playlistTracksContainer.innerHTML = '';
    backToLibraryBtn.classList.remove('hidden');


    if (!spotifyTracks || spotifyTracks.length === 0) {
        playlistTracksContainer.innerHTML = 'No matching tracks found.';
        return;
    }

    spotifyTracks.forEach((track) => {
        const trackRow = document.createElement('div');
        trackRow.className = 'playlist-track-row';

        const playBtn = document.createElement('button');
        playBtn.className = 'library-btn snippet-track';
        playBtn.textContent = `${track.name} - ${track.artists[0].name}`;

        playBtn.addEventListener('click', async () => {
            document.body.style.cursor = 'wait';
            playBtn.style.cursor = 'wait';
            const queryText = `${track.artists[0].name} ${track.name}`;
            let audioStreamURL = '';

            try {
                const deezerResponse = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=${encodeURIComponent(queryText)}&limit=1`)}`);
                if (deezerResponse.ok) {
                    const deezerData = await deezerResponse.json();
                    if (deezerData.data && deezerData.data.length > 0 && deezerData.data[0].preview) {
                        audioStreamURL = deezerData.data[0].preview;
                    }
                }
            } catch (err) { console.error("Deezer streaming dropped:", err); }

            if (!audioStreamURL) {
                alert(`Could not find "${track.name}" through Deezer API.`);
                document.body.style.cursor = 'default';
                playBtn.style.cursor = 'pointer';
                return;
            }
            
            loadTrackIntoPlayer(track.name, track.artists[0].name, audioStreamURL, '');
            document.body.style.cursor = 'default';
            playBtn.style.cursor = 'pointer';
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'delete-track-btn save-btn';
        saveBtn.textContent = 'Save';

        saveBtn.addEventListener('click', async () => {
            saveBtn.textContent = 'Saving...';
            const artistName = track.artists[0].name;
            const trackName = track.name;
            const queryText = `${artistName} ${trackName}`;
            let realDeezerId = null;

            try {
                let deezerRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=${encodeURIComponent(queryText)}&limit=1`)}`);
                if (deezerRes.ok) {
                    let dData = await deezerRes.json();
                    if (dData.data && dData.data.length > 0 && dData.data[0].id) {
                        realDeezerId = dData.data[0].id; 
                    }
                }
            } catch(e) { 
                console.error("Error gathering track details from Deezer:", e); 
            }

            if (!realDeezerId) {
                alert(`Could not secure a valid stream ID from Deezer for "${trackName}".`);
                saveBtn.textContent = 'Save';
                return;
            }

            const newTrackInstance = new Track(trackName, artistName, String(realDeezerId), `Local link item.`);
            dbManager.addSong(newTrackInstance);
            
            saveBtn.textContent = 'Saved';
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';

            document.getElementById('search-input').value = ''
            backToLibraryBtn.classList.add('hidden');
        });

        trackRow.appendChild(playBtn);
        trackRow.appendChild(saveBtn);
        playlistTracksContainer.appendChild(trackRow);
    });
}