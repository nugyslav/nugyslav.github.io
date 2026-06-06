import { loadTrackIntoPlayer } from "./player.js";

export class Track {
    constructor(title, artist, audioBlob, lyricsText) {
        this.title = title;
        this.artist = artist;
        this.audioBlob = audioBlob;
        this.lyricsText = lyricsText;
    }
}

export class TrackComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.songData = null;
        this.dbManager = null;
    }

    setData(song, dbManager) {
        this.songData = song;
        this.dbManager = dbManager;
        this.render();
    }

    render() {
        if (!this.songData) return;
        const { title, artist, audioBlob, lyricsText } = this.songData;

        let accentColor = "#666666";

        if (audioBlob instanceof Blob) {
            accentColor = "#1930c2";
        } else if (typeof audioBlob === "string") {
            accentColor = "#8a2be2";
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 4px;
                    width: 100%;
                }
                .playlist-track-row {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                    align-items: stretch;
                }
                .library-btn {
                    flex: 1;
                    padding: 10px;
                    text-align: left;
                    background: #282828;
                    font-size: 0.85rem;
                    border: none;
                    color: white;
                    cursor: pointer;
                    border-radius: 4px;
                    box-sizing: border-box;
                    transition: background 0.2s;
                    border-left: 4px solid ${accentColor};
                    white-space: normal;
                    word-break: break-word
                    overflow: visible;
                    text-overflow: clip;

                    &:hover {
                        background: #383838
                    }
                }
                .delete-track-btn {
                    padding: 10px 10px;
                    min-width: 70px;
                    background: #121212;
                    border: 1px solid #333;
                    color: #b3b3b3;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    transition: all 0.2s;

                    &:hover{
                        border-color: #e91429
                    }
                }
            </style>
            
            <div class="playlist-track-row">
                <button class="library-btn" id="play-btn">
                    ${title} - ${artist}
                </button>
                <button class="delete-track-btn" id="delete-btn">Delete</button>
            </div>
        `;

        this.shadowRoot.getElementById("play-btn").addEventListener("click", async () => {
            //to show user that audio is being fetched
            document.body.style.cursor = 'wait';
            this.shadowRoot.getElementById("play-btn").style.cursor = 'wait';

            let playableSource = audioBlob;

            if (!(audioBlob instanceof Blob)) {
                try {
                    let trackId = audioBlob.trim();

                    const response = await fetch(
                        `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/track/${trackId}`)}`,
                        { cache: "no-store" }
                    );
                    
                    if (response.ok) {
                        const trackData = await response.json();
                        if (trackData.preview) {
                            playableSource = trackData.preview; 
                        } else {
                            throw new Error("No preview available");
                        }
                    } else {
                        throw new Error(`Response status: ${response.status}`);
                    }
                } catch (err) {
                    console.error("Failed to refresh Deezer token:", err);
                }
            }

            let finalAudioUrl = "";
            if (playableSource instanceof Blob) {
                finalAudioUrl = URL.createObjectURL(playableSource); 
            } else {
                finalAudioUrl = String(playableSource || "media/Tame_Impala_Breathe_Deeper.mp3");
            }

            loadTrackIntoPlayer(title, artist, finalAudioUrl, lyricsText);
            document.body.style.cursor = 'default';
            this.shadowRoot.getElementById("play-btn").style.cursor = 'pointer';
        });

        this.shadowRoot.getElementById("delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${title}" from your library?`)) {
                if (this.dbManager) {
                    this.dbManager.deleteSong(this.songData.id);
                }
            }
        });
    }
}

customElements.define("track-component", TrackComponent);