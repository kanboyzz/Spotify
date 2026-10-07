// Database IndexedDB untuk Menyimpan File MP3 Lokal secara Permanen
const DB_NAME = 'SpotifyCustomDB';
const DB_VERSION = 1;
const STORE_NAME = 'user_songs';
let db = null;

// Audio Player Core State
const audio = new Audio();
let tracks = [
    {
        id: 'demo-1',
        title: 'Cyberpunk Synthwave',
        artist: 'Lofi Producer',
        album: 'Neon Nights',
        cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        dateAdded: 'Hari ini',
        duration: '6:12',
        isLocal: false
    },
    {
        id: 'demo-2',
        title: 'Acoustic Morning',
        artist: 'Chill Beats',
        album: 'Acoustic Sessions',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        dateAdded: 'Kemarin',
        duration: '7:05',
        isLocal: false
    }
];

let currentTrackIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let likedSongs = new Set();

// Inisialisasi Database IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const dbRef = e.target.result;
            if (!dbRef.objectStoreNames.contains(STORE_NAME)) {
                dbRef.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            loadLocalSongsFromDB().then(() => resolve());
        };
        request.onerror = (e) => reject(e);
    });
}

// Simpan Lagu MP3 lokal ke IndexedDB
function saveSongToDB(songObj) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(songObj);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

// Muat Lagu dari IndexedDB saat web dibuka kembali
function loadLocalSongsFromDB() {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const localSongs = request.result || [];
            localSongs.forEach(song => {
                const blobUrl = URL.createObjectURL(song.fileBlob);
                tracks.push({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    cover: song.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80',
                    url: blobUrl,
                    dateAdded: song.dateAdded,
                    duration: 'Lokal',
                    isLocal: true
                });
            });
            renderTracks();
            resolve();
        };
    });
}

// DOM Elements
const homeTracksList = document.getElementById('home-tracks-list');
const searchTracksList = document.getElementById('search-tracks-list');
const libraryTracksList = document.getElementById('library-tracks-list');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const seekSlider = document.getElementById('seek-slider');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerCover = document.getElementById('player-cover');
const playerLikeBtn = document.getElementById('player-like-btn');

// Waktu Salam Dinamis
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting-text');
    if (hour < 12) greetingEl.textContent = 'Selamat Pagi';
    else if (hour < 18) greetingEl.textContent = 'Selamat Siang';
    else greetingEl.textContent = 'Selamat Malam';
}

// Render Tabel Lagu
function renderTracks(filterList = tracks, targetEl = homeTracksList) {
    if (!targetEl) return;
    targetEl.innerHTML = '';

    filterList.forEach((track, idx) => {
        const tr = document.createElement('tr');
        const isCurrentlyPlaying = currentTrackIndex !== -1 && tracks[currentTrackIndex]?.id === track.id;

        tr.innerHTML = `
            <td class="col-num">${isCurrentlyPlaying ? '<i class="fa-solid fa-volume-high" style="color:#1db954"></i>' : idx + 1}</td>
            <td>
                <div class="track-title-cell">
                    <img src="${track.cover}" alt="Cover">
                    <div class="track-names">
                        <span class="title" style="color: ${isCurrentlyPlaying ? '#1db954' : '#fff'}">${track.title}</span>
                        <span class="artist">${track.artist}</span>
                    </div>
                </div>
            </td>
            <td>${track.album}</td>
            <td class="col-date">${track.dateAdded || 'Baru'}</td>
            <td class="col-time">${track.duration}</td>
            <td class="col-action">
                <i class="fa-${likedSongs.has(track.id) ? 'solid' : 'regular'} fa-heart like-btn" data-id="${track.id}" style="color: ${likedSongs.has(track.id) ? '#1db954' : '#b3b3b3'}"></i>
            </td>
        `;

        tr.addEventListener('click', (e) => {
            if (e.target.classList.contains('like-btn')) {
                toggleLike(track.id);
                e.stopPropagation();
                return;
            }
            playTrackById(track.id);
        });

        targetEl.appendChild(tr);
    });
}

// Putar Lagu berdasarkan ID
function playTrackById(id) {
    const index = tracks.findIndex(t => t.id === id);
    if (index !== -1) {
        currentTrackIndex = index;
        loadAndPlayTrack(tracks[currentTrackIndex]);
    }
}

function loadAndPlayTrack(track) {
    audio.src = track.url;
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playerCover.src = track.cover;

    updateLikeButtonState(track.id);
    audio.play();
    isPlaying = true;
    updatePlayPauseUI();
    renderTracks();
}

function togglePlayPause() {
    if (currentTrackIndex === -1 && tracks.length > 0) {
        playTrackById(tracks[0].id);
        return;
    }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
    } else {
        audio.play();
        isPlaying = true;
    }
    updatePlayPauseUI();
}

function updatePlayPauseUI() {
    btnPlayPause.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function playNext() {
    if (tracks.length === 0) return;
    if (isShuffle) {
        currentTrackIndex = Math.floor(Math.random() * tracks.length);
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    }
    loadAndPlayTrack(tracks[currentTrackIndex]);
}

function playPrev() {
    if (tracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadAndPlayTrack(tracks[currentTrackIndex]);
}

function toggleLike(id) {
    if (likedSongs.has(id)) likedSongs.delete(id);
    else likedSongs.add(id);

    if (tracks[currentTrackIndex]?.id === id) {
        updateLikeButtonState(id);
    }
    renderTracks();
}

function updateLikeButtonState(id) {
    if (likedSongs.has(id)) {
        playerLikeBtn.innerHTML = '<i class="fa-solid fa-heart" style="color: #1db954;"></i>';
    } else {
        playerLikeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    }
}

// Event Listeners Audio
audio.addEventListener('timeupdate', () => {
    if (!isNaN(audio.duration)) {
        const progress = (audio.currentTime / audio.duration) * 100;
        seekSlider.value = progress;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        totalDurationEl.textContent = formatTime(audio.duration);
    }
});

audio.addEventListener('ended', () => {
    if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
    } else {
        playNext();
    }
});

seekSlider.addEventListener('input', () => {
    if (!isNaN(audio.duration)) {
        audio.currentTime = (seekSlider.value / 100) * audio.duration;
    }
});

volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
});

// Format Waktu MM:SS
function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Modal Upload Logic
const uploadModal = document.getElementById('upload-modal');
const btnOpenUpload = document.getElementById('btn-open-upload');
const btnTopUpload = document.getElementById('btn-top-upload');
const btnCloseUpload = document.getElementById('btn-close-upload');
const btnCancelUpload = document.getElementById('btn-cancel-upload');
const uploadForm = document.getElementById('upload-form');

function openModal() { uploadModal.classList.remove('hidden'); }
function closeModal() { uploadModal.classList.add('hidden'); uploadForm.reset(); }

btnOpenUpload.addEventListener('click', openModal);
btnTopUpload.addEventListener('click', openModal);
btnCloseUpload.addEventListener('click', closeModal);
btnCancelUpload.addEventListener('click', closeModal);

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('input-file').files[0];
    const title = document.getElementById('input-title').value;
    const artist = document.getElementById('input-artist').value;
    const album = document.getElementById('input-album').value || 'Single';
    const cover = document.getElementById('input-cover').value || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80';

    if (!fileInput) return;

    const newSongObj = {
        id: 'user-' + Date.now(),
        title,
        artist,
        album,
        cover,
        fileBlob: fileInput,
        dateAdded: 'Baru Saja'
    };

    await saveSongToDB(newSongObj);

    const blobUrl = URL.createObjectURL(fileInput);
    tracks.push({
        id: newSongObj.id,
        title,
        artist,
        album,
        cover,
        url: blobUrl,
        dateAdded: 'Baru Saja',
        duration: 'Lokal',
        isLocal: true
    });

    renderTracks();
    closeModal();
    playTrackById(newSongObj.id);
});

// Navigation Views
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.content-view');
const searchContainer = document.getElementById('search-container');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        views.forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewName}`).classList.remove('hidden');

        if (viewName === 'search') {
            searchContainer.classList.remove('hidden');
        } else {
            searchContainer.classList.add('hidden');
        }
    });
});

// Live Search Input
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = tracks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
    );
    renderTracks(filtered, searchTracksList);
});

// Setup Button Listeners
btnPlayPause.addEventListener('click', togglePlayPause);
btnNext.addEventListener('click', playNext);
btnPrev.addEventListener('click', playPrev);

btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
});

btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat;
    btnRepeat.classList.toggle('active', isRepeat);
});

playerLikeBtn.addEventListener('click', () => {
    if (currentTrackIndex !== -1) {
        toggleLike(tracks[currentTrackIndex].id);
    }
});

// App Startup
initDB().then(() => {
    updateGreeting();
    renderTracks(tracks, homeTracksList);
    renderTracks(tracks, libraryTracksList);
});
