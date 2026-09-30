console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs = [];
let currFolder = 'songs/ncs';
const defaultCover = 'img/cover.jpg';

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

function cleanDirectoryPath(path) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

async function fetchDirectoryEntries(folder) {
    const safeFolder = cleanDirectoryPath(folder);
    const response = await fetch(`${safeFolder ? `./${safeFolder}/` : './'}`);
    if (!response.ok) {
        return [];
    }

    const htmlText = await response.text();
    const div = document.createElement('div');
    div.innerHTML = htmlText;
    return Array.from(div.getElementsByTagName('a'));
}

async function resolveCoverPath(folder) {
    const entries = await fetchDirectoryEntries(folder);
    const coverName = entries
        .map((entry) => entry.getAttribute('href'))
        .find((href) => /\.(jpe?g|png|webp|gif|svg)$/i.test(href || ''));

    if (coverName) {
        return `${cleanDirectoryPath(folder)}/${coverName}`;
    }

    return defaultCover;
}

async function getSongs(folder) {
    currFolder = cleanDirectoryPath(folder);
    const entries = await fetchDirectoryEntries(currFolder);
    songs = entries
        .map((element) => element.getAttribute('href'))
        .filter((href) => href && /\.(mp3|wav|ogg|m4a)$/i.test(href))
        .map((href) => decodeURIComponent(href.split('/').pop() || ''));

    const songUL = document.querySelector('.songList').getElementsByTagName('ul')[0];
    songUL.innerHTML = '';

    if (!songs.length) {
        songUL.innerHTML = '<li class="empty-state">No tracks available in this playlist.</li>';
        return songs;
    }

    for (const song of songs) {
        songUL.innerHTML += `<li><img class="invert" width="34" src="img/music.svg" alt="">
                            <div class="info">
                                <div>${song.replace(/%20/g, ' ')}</div>
                                <div>Harry</div>
                            </div>
                            <div class="playnow">
                                <span>Play Now</span>
                                <img class="invert" src="img/play.svg" alt="">
                            </div></li>`;
    }

    Array.from(document.querySelector('.songList').getElementsByTagName('li')).forEach((element) => {
        element.addEventListener('click', () => {
            playMusic(element.querySelector('.info').firstElementChild.innerHTML.trim());
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    if (!track || !songs.length) {
        currentSong.pause();
        currentSong.src = '';
        play.src = 'img/play.svg';
        document.querySelector('.songinfo').innerHTML = 'No track selected';
        document.querySelector('.songtime').innerHTML = '00:00 / 00:00';
        if (document.querySelector('.circle')) {
            document.querySelector('.circle').style.left = '0%';
        }
        return;
    }

    const safeTrack = decodeURIComponent(track);
    currentSong.src = `${currFolder}/${encodeURIComponent(safeTrack)}`;
    if (!pause) {
        currentSong.play();
        play.src = 'img/pause.svg';
    }
    document.querySelector('.songinfo').innerHTML = safeTrack;
    document.querySelector('.songtime').innerHTML = '00:00 / 00:00';
}

async function displayAlbums() {
    console.log('displaying albums');
    const cardContainer = document.querySelector('.cardContainer');
    cardContainer.innerHTML = '';

    const folderEntries = await fetchDirectoryEntries('songs');
    const albumLinks = Array.from(folderEntries).filter((entry) => {
        const href = entry.getAttribute('href') || '';
        return href.endsWith('/') && !href.includes('.htaccess');
    });

    for (const entry of albumLinks) {
        const href = entry.getAttribute('href') || '';
        const folder = decodeURIComponent(href.split('/').filter(Boolean).slice(-1)[0]).replace(/\/$/, '');
        if (!folder) {
            continue;
        }

        const folderPath = `songs/${folder}`;
        try {
            const infoResponse = await fetch(`${folderPath}/info.json`);
            if (!infoResponse.ok) {
                continue;
            }

            const response = await infoResponse.json();
            const coverPath = await resolveCoverPath(folderPath);
            cardContainer.innerHTML += ` <div data-folder="${folder}" class="card">
                <div class="play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                            stroke-linejoin="round" />
                    </svg>
                </div>

                <img src="${coverPath}" alt="${response.title || folder}" onerror="this.src='img/cover.jpg'; this.onerror=null;">
                <h2>${response.title || folder}</h2>
                <p>${response.description || 'Playlist'}</p>
            </div>`;
        } catch (error) {
            console.warn(`Skipping album ${folder}:`, error);
        }
    }

    Array.from(document.getElementsByClassName('card')).forEach((element) => {
        element.addEventListener('click', async (item) => {
            console.log('Fetching Songs');
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
            if (songs.length) {
                playMusic(songs[0]);
            } else {
                playMusic(null);
            }
        });
    });
}

async function main() {
    await getSongs('songs/ncs');
    if (songs.length) {
        playMusic(songs[0], true);
    } else {
        playMusic(null);
    }

    await displayAlbums();

    play.addEventListener('click', () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = 'img/pause.svg';
        } else {
            currentSong.pause();
            play.src = 'img/play.svg';
        }
    });

    currentSong.addEventListener('timeupdate', () => {
        if (!currentSong.duration || Number.isNaN(currentSong.duration)) {
            return;
        }

        document.querySelector('.songtime').innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector('.circle').style.left = (currentSong.currentTime / currentSong.duration) * 100 + '%';
    });

    document.querySelector('.seekbar').addEventListener('click', (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const percent = ((event.clientX - rect.left) / rect.width) * 100;
        document.querySelector('.circle').style.left = percent + '%';
        currentSong.currentTime = ((currentSong.duration || 0) * percent) / 100;
    });

    document.querySelector('.hamburger').addEventListener('click', () => {
        document.querySelector('.left').style.left = '0';
    });

    document.querySelector('.close').addEventListener('click', () => {
        document.querySelector('.left').style.left = '-120%';
    });

    previous.addEventListener('click', () => {
        if (!songs.length) {
            return;
        }

        currentSong.pause();
        const currentTrack = decodeURIComponent(currentSong.src.split('/').slice(-1)[0] || '');
        const index = songs.findIndex((song) => decodeURIComponent(song) === currentTrack);
        if (index > 0) {
            playMusic(songs[index - 1]);
        }
    });

    next.addEventListener('click', () => {
        if (!songs.length) {
            return;
        }

        currentSong.pause();
        const currentTrack = decodeURIComponent(currentSong.src.split('/').slice(-1)[0] || '');
        const index = songs.findIndex((song) => decodeURIComponent(song) === currentTrack);
        if (index >= 0 && index < songs.length - 1) {
            playMusic(songs[index + 1]);
        }
    });

    document.querySelector('.range').getElementsByTagName('input')[0].addEventListener('change', (event) => {
        console.log('Setting volume to', event.target.value, '/ 100');
        currentSong.volume = parseInt(event.target.value) / 100;
        if (currentSong.volume > 0) {
            document.querySelector('.volume>img').src = document.querySelector('.volume>img').src.replace('mute.svg', 'volume.svg');
        }
    });

    document.querySelector('.volume>img').addEventListener('click', (event) => {
        const image = event.target;
        if (image.src.includes('volume.svg')) {
            image.src = image.src.replace('volume.svg', 'mute.svg');
            currentSong.volume = 0;
            document.querySelector('.range').getElementsByTagName('input')[0].value = 0;
        } else {
            image.src = image.src.replace('mute.svg', 'volume.svg');
            currentSong.volume = 0.10;
            document.querySelector('.range').getElementsByTagName('input')[0].value = 10;
        }
    });
}

main();