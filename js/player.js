let parsedLyrics = [];
const audioElement = document.getElementById('audio-element');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');

export function loadTrackIntoPlayer(title, artist, audioUrl, lyricsText) {
    const songArtist = document.getElementById('song-artist');
    const songTitle = document.getElementById('song-title');
    
    if (songArtist) songArtist.textContent = ' - ' + artist;
    if (songTitle) songTitle.textContent = title;
    //due to CORS
    if (audioUrl.startsWith('http')) {
        audioElement.crossOrigin = "anonymous";
    } else {
        audioElement.removeAttribute('crossOrigin');
    }

    audioElement.src = audioUrl;
    audioElement.load();
    audioElement.pause();

    //if user clicks on song from upload page, changes to Player
    window.location.href = '#/';

    parsedLyrics = parseLRC(lyricsText);
    displayLyrics(parsedLyrics);
    
    playPauseBtn.textContent = 'Play';
}

export function displayLyrics(lyricsArray) {
    const container = document.getElementById('lyrics-container');
    container.innerHTML = '';
    
    if (lyricsArray.length === 0) {
        container.innerHTML = '<p class="lyric-line empty">No lyrics available</p>';
        return;
    }

    const mover = document.createElement('div');
    mover.id = 'lyrics-mover';

    lyricsArray.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.id = `lyric-line-${index}`;
        p.textContent = line.text;
        mover.appendChild(p);
    });
    container.appendChild(mover);
}

export function drawVisualiser(canvas, canvasCtx, analyser, dataArray, bufferLength) {    
    const render = () => {
        requestAnimationFrame(render);
        const width = canvas.width;
        const height = canvas.height;

        canvasCtx.fillStyle = '#121212';
        canvasCtx.fillRect(0, 0, width, height);

        analyser.getByteFrequencyData(dataArray);

        const activeBufferLength = Math.floor(bufferLength * 0.75);
        const barWidth = width / activeBufferLength;
        let x = 0;

        for (let i = 0; i < activeBufferLength; i++) {
            const rawValue = dataArray[i];
            const frequencyMultiplier = 1 + (i / activeBufferLength) * 1.5; 
            const finalBarHeight = height * ((rawValue * frequencyMultiplier) / 255);
            
            canvasCtx.fillStyle = '#11b47b'; 
            canvasCtx.fillRect(x, height - finalBarHeight, barWidth - 2, finalBarHeight);
            x += barWidth;
        }
    };
    render();
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function parseLRC(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;
    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const totalSeconds = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
            result.push({ time: totalSeconds, text: line.replace(timeRegex, '').trim() });
        }
    });
    return result;
}

audioElement.addEventListener('timeupdate', () => {
    const currentTime = audioElement.currentTime;
    currentTimeDisplay.textContent = formatTime(currentTime);
    progressBar.value = currentTime;
    
    if (parsedLyrics.length === 0) return;
    let activeIndex = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
        if (currentTime >= parsedLyrics[i].time) {
            activeIndex = i;
        }
        else break;
    }

    if (activeIndex !== -1) {
        document.querySelectorAll('.lyric-line').forEach(element => element.classList.remove('active'));
        const activeLineElement = document.getElementById(`lyric-line-${activeIndex}`);
        activeLineElement.classList.add('active');
        const mover = document.getElementById('lyrics-mover');
        const targetYOffset = 32 - (activeIndex * 32);
        mover.style.transform = `translateY(${targetYOffset}px)`;
    }
});

audioElement.addEventListener('loadedmetadata', () => {
    if (durationTimeDisplay) durationTimeDisplay.textContent = formatTime(audioElement.duration);
    if (progressBar) {
        progressBar.max = audioElement.duration;
        progressBar.value = 0;
    }
});