const state = {
    apiKey: localStorage.getItem('yt_api_key') || '',
    channelId: null,
    videos: [],
    isLoading: false,
    uploadChart: null,
    // New State for Sorting & Chart Nav
    sortColumn: 'date',
    sortOrder: 'desc',
    chartPage: 0,
    chartTimeScale: 'daily', // 'daily' or 'monthly'
    favorites: [],
    modalCharts: {} // Store chart instances for destruction
};

const elements = {
    apiKeyInput: document.getElementById('api-key-input'),
    saveKeyBtn: document.getElementById('save-api-key'),
    urlInput: document.getElementById('channel-url-input'),
    analyzeBtn: document.getElementById('analyze-btn'),
    loadingIndicator: document.getElementById('loading-indicator'),
    loadingText: document.getElementById('loading-text'),
    resultsSection: document.getElementById('results-section'),
    errorMessage: document.getElementById('error-message'),
    channelTitle: document.getElementById('channel-title'),
    channelDesc: document.getElementById('channel-description'),
    channelThumb: document.getElementById('channel-thumbnail'),
    dailyUploadAvg: document.getElementById('daily-upload-avg'),
    viewCount: document.getElementById('view-count'),
    exportBtn: document.getElementById('export-btn'),
    videoTableBody: document.getElementById('video-table-body'),

    // Modal Elements
    modal: document.getElementById('universal-modal'),
    modalContent: document.querySelector('.modal-content'),
    closeModal: document.querySelector('.close-modal'),
    modalVideoContainer: document.getElementById('modal-video-container'),
    modalCommentsContainer: document.getElementById('modal-comments-container'),
    modalIframe: document.getElementById('video-iframe'),
    externalLinkBtn: document.getElementById('external-link-btn'),
    commentsList: document.getElementById('comments-list')
};

// Table Sorting Listeners
// Moved to init()

// Chart Navigation Listeners
// Moved to init()

// Modal Logic
// Moved to init()

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // Restore API Key
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
    }

    // Restore Favorites
    loadFavoritesState();

    // Event Listeners
    if (elements.saveKeyBtn) {
        elements.saveKeyBtn.addEventListener('click', () => {
            const key = elements.apiKeyInput.value.trim();
            if (key) {
                state.apiKey = key;
                localStorage.setItem('yt_api_key', key);
                alert('API Key가 저장되었습니다.');
            } else {
                alert('API Key를 입력해주세요.');
            }
        });
    }

    if (elements.analyzeBtn) {
        elements.analyzeBtn.addEventListener('click', handleAnalyze);
    }

    if (elements.urlInput) {
        elements.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAnalyze();
        });
    }

    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportToExcel);
    }

    // Sorting
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            handleSort(column);
        });
    });

    // Chart Nav
    const prevBtn = document.getElementById('chart-prev');
    const nextBtn = document.getElementById('chart-next');
    const viewDailyBtn = document.getElementById('view-daily-btn');
    const viewMonthlyBtn = document.getElementById('view-monthly-btn');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            state.chartPage++;
            renderCharts(state.videos);
        });
        nextBtn.addEventListener('click', () => {
            if (state.chartPage > 0) {
                state.chartPage--;
                renderCharts(state.videos);
            }
        });
    }

    if (viewDailyBtn && viewMonthlyBtn) {
        viewDailyBtn.addEventListener('click', () => {
            if (state.chartTimeScale !== 'daily') {
                state.chartTimeScale = 'daily';
                state.chartPage = 0;
                viewDailyBtn.classList.add('active');
                viewMonthlyBtn.classList.remove('active');
                renderCharts(state.videos);
            }
        });

        viewMonthlyBtn.addEventListener('click', () => {
            if (state.chartTimeScale !== 'monthly') {
                state.chartTimeScale = 'monthly';
                state.chartPage = 0;
                viewMonthlyBtn.classList.add('active');
                viewDailyBtn.classList.remove('active');
                renderCharts(state.videos);
            }
        });
    }

    // Modal
    if (elements.closeModal) elements.closeModal.addEventListener('click', closeModal);
    if (elements.modal) {
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) closeModal();
        });
    }

    // Favorites
    const favListBtn = document.getElementById('favorites-list-btn');
    const toggleFavBtn = document.getElementById('toggle-favorite-btn');

    if (favListBtn) {
        favListBtn.addEventListener('click', openFavoritesModal);
    }

    if (toggleFavBtn) {
        toggleFavBtn.addEventListener('click', toggleFavorite);
    }

    document.addEventListener('keydown', (e) => {
        if (elements.modal && e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    lucide.createIcons();
}

function loadFavoritesState() {
    try {
        const saved = localStorage.getItem('yt_favorites');
        if (saved) {
            state.favorites = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load favorites', e);
        state.favorites = [];
    }
}

// Favorites Logic
function toggleFavorite() {
    if (!state.channelId) return;

    const idx = state.favorites.findIndex(f => f.id === state.channelId);
    if (idx >= 0) {
        // Remove
        state.favorites.splice(idx, 1);
        alert('즐겨찾기에서 제거되었습니다.');
    } else {
        // Add
        const currentTitle = elements.channelTitle.textContent;
        const currentThumb = elements.channelThumb.src;
        state.favorites.push({
            id: state.channelId,
            title: currentTitle,
            thumbnail: currentThumb
        });
        alert('즐겨찾기에 추가되었습니다.');
    }

    localStorage.setItem('yt_favorites', JSON.stringify(state.favorites));
    updateFavoriteBtnState();
}

function updateFavoriteBtnState() {
    const btn = document.getElementById('toggle-favorite-btn');
    if (!btn) return;
    const icon = btn.querySelector('svg') || btn.querySelector('i');

    if (!state.channelId) return;

    const isFav = state.favorites.some(f => f.id === state.channelId);

    if (isFav) {
        btn.classList.add('active');
        if (icon) {
            icon.setAttribute('fill', '#f1c40f');
            icon.style.fill = '#f1c40f';
        }
    } else {
        btn.classList.remove('active');
        if (icon) {
            icon.setAttribute('fill', 'none');
            icon.style.fill = 'none';
        }
    }
}

function openFavoritesModal() {
    const vidContainer = document.getElementById('modal-video-container');
    const comContainer = document.getElementById('modal-comments-container');
    if (vidContainer) vidContainer.classList.add('hidden');
    if (comContainer) comContainer.classList.add('hidden');

    const favContainer = document.getElementById('modal-favorites-container');
    if (favContainer) favContainer.classList.remove('hidden');

    const list = document.getElementById('favorites-list');
    if (list) {
        list.innerHTML = '';

        if (state.favorites.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#999;">저장된 채널이 없습니다.</p>';
        } else {
            state.favorites.forEach(fav => {
                const item = document.createElement('div');
                item.className = 'favorite-item';
                item.innerHTML = `
                    <div class="favorite-info" onclick="loadFavoriteFromModal('${fav.id}')">
                        <img src="${fav.thumbnail}" alt="thumb">
                        <span>${fav.title}</span>
                    </div>
                    <button class="delete-fav-btn" onclick="removeFavorite(event, '${fav.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                `;
                list.appendChild(item);
            });
            lucide.createIcons();
        }
    }

    if (elements.modal) elements.modal.classList.remove('hidden');
}

window.removeFavorite = function (e, id) {
    e.stopPropagation();
    const idx = state.favorites.findIndex(f => f.id === id);
    if (idx >= 0) {
        state.favorites.splice(idx, 1);
        localStorage.setItem('yt_favorites', JSON.stringify(state.favorites));
        openFavoritesModal();
        if (state.channelId === id) updateFavoriteBtnState();
    }
};

window.loadFavoriteFromModal = function (id) {
    closeModal();
    // Assuming resolveChannelId handles full ID if we construct URL
    elements.urlInput.value = `https://www.youtube.com/channel/${id}`;
    handleAnalyze();
};

async function openCommentModal(videoId) {
    // Reset Modal State
    elements.modalVideoContainer.classList.add('hidden');
    elements.modalCommentsContainer.classList.remove('hidden');
    const favContainer = document.getElementById('modal-favorites-container');
    if (favContainer) favContainer.classList.add('hidden');

    elements.commentsList.innerHTML = '<div class="spinner"></div><p style="text-align:center">댓글을 불러오는 중...</p>';

    elements.modal.classList.remove('hidden');

    try {
        const comments = await fetchVideoComments(videoId);

        // Sort by Likes Descending
        comments.sort((a, b) => {
            const likeA = parseInt(a.snippet.topLevelComment.snippet.likeCount || 0);
            const likeB = parseInt(b.snippet.topLevelComment.snippet.likeCount || 0);
            return likeB - likeA;
        });

        renderComments(comments);
    } catch (error) {
        elements.commentsList.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}


function closeModal() {
    elements.modalIframe.src = '';
    elements.modal.classList.add('hidden');
    const favContainer = document.getElementById('modal-favorites-container');
    const keyContainer = document.getElementById('modal-keyword-container');
    if (favContainer) favContainer.classList.add('hidden');
    if (keyContainer) keyContainer.classList.add('hidden');
}

// --- Core Logic ---

async function handleAnalyze() {
    const url = elements.urlInput.value.trim();

    if (!state.apiKey) {
        showError('먼저 API Key를 저장해주세요.');
        return;
    }

    if (!url) {
        showError('유튜브 채널 URL을 입력해주세요.');
        return;
    }

    try {
        setLoading(true, '채널 정보를 찾는 중...');
        clearError();
        elements.resultsSection.classList.add('hidden');
        if (state.uploadChart) {
            state.uploadChart.destroy();
            state.uploadChart = null;
        }

        const channelId = await resolveChannelId(url);
        state.channelId = channelId;

        const channelData = await fetchChannelDetails(channelId);

        const uploadPlaylistId = channelData.contentDetails.relatedPlaylists.uploads;

        setLoading(true, '동영상 목록을 불러오는 중... (시간이 걸릴 수 있습니다)');
        const videoIds = await fetchAllVideoIds(uploadPlaylistId);

        setLoading(true, `${videoIds.length}개의 동영상 통계를 분석 중...`);
        const videos = await fetchVideoDetails(videoIds);

        // Save to state
        state.videos = videos;

        // Keyword Analysis
        const keywords = analyzeKeywords(videos);
        renderKeywordSection(keywords);

        // Render Profile
        renderChannelInfo(channelData, videos);
        renderCharts(videos);

        // Initial Sort (Date Desc)
        handleSort('date', 'desc');

        elements.resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function handleSort(column, forceOrder = null) {
    if (forceOrder) {
        state.sortOrder = forceOrder;
    } else {
        if (state.sortColumn === column) {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortOrder = 'desc'; // Default to desc for new column
        }
    }
    state.sortColumn = column;

    // Update UI Icons
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('active');
        const icon = th.querySelector('.sort-icon');
        icon.setAttribute('data-lucide', 'arrow-up-down'); // Reset
        if (th.dataset.sort === column) {
            th.classList.add('active');
            icon.setAttribute('data-lucide', state.sortOrder === 'asc' ? 'arrow-up' : 'arrow-down');
        }
    });
    lucide.createIcons();

    // Sort Data
    state.videos.sort((a, b) => {
        let valA, valB;

        switch (column) {
            case 'date':
                valA = new Date(a.snippet.publishedAt);
                valB = new Date(b.snippet.publishedAt);
                break;
            case 'views':
                valA = safeParseInt(a.statistics.viewCount);
                valB = safeParseInt(b.statistics.viewCount);
                break;
            case 'likes':
                valA = safeParseInt(a.statistics.likeCount);
                valB = safeParseInt(b.statistics.likeCount);
                break;
            case 'comments':
                valA = safeParseInt(a.statistics.commentCount);
                valB = safeParseInt(b.statistics.commentCount);
                break;
            case 'duration':
                valA = parseDuration(a.contentDetails.duration);
                valB = parseDuration(b.contentDetails.duration);
                break;
            default:
                return 0;
        }

        if (valA < valB) return state.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    renderVideoList(state.videos);
}

// --- API Functions ---

async function resolveChannelId(url) {
    let handle = '';
    if (url.includes('/channel/')) {
        const parts = url.split('/channel/');
        return parts[1].split('/')[0].split('?')[0];
    } else if (url.includes('/@')) {
        handle = url.split('/@')[1].split('/')[0].split('?')[0];
        return fetchChannelIdByHandle(`@${handle}`);
    } else if (url.includes('/user/')) {
        const username = url.split('/user/')[1].split('/')[0].split('?')[0];
        return fetchChannelIdByUser(username);
    } else {
        if (url.startsWith('@')) {
            return fetchChannelIdByHandle(url);
        }
        throw new Error('지원되지 않는 URL 형식입니다. /channel/, /user/, 또는 @handle 형식을 사용해주세요.');
    }
}

async function fetchChannelIdByHandle(handle) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${state.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.items || data.items.length === 0) throw new Error('채널을 찾을 수 없습니다.');
    return data.items[0].id;
}

async function fetchChannelIdByUser(username) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(username)}&key=${state.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.items || data.items.length === 0) throw new Error('채널을 찾을 수 없습니다.');
    return data.items[0].id;
}

async function fetchChannelDetails(channelId) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${state.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || data.items.length === 0) throw new Error('채널 상세 정보를 가져올 수 없습니다.');
    return data.items[0];
}

async function fetchAllVideoIds(playlistId) {
    let videoIds = [];
    let nextPageToken = '';
    const MAX_PAGES = 20; // 50 * 20 = 1000 items limit
    let pageCount = 0;

    do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken || ''}&key=${state.apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);

        const ids = data.items.map(item => item.contentDetails.videoId);
        videoIds = [...videoIds, ...ids];

        nextPageToken = data.nextPageToken;
        pageCount++;

        elements.loadingText.textContent = `동영상 목록 가져오는 중... (${videoIds.length}개 발견)`;

    } while (nextPageToken && pageCount < MAX_PAGES);

    return videoIds;
}

async function fetchVideoDetails(videoIds) {
    const videos = [];
    const chunkSize = 50;

    for (let i = 0; i < videoIds.length; i += chunkSize) {
        const chunk = videoIds.slice(i, i + chunkSize);
        const idsString = chunk.join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsString}&key=${state.apiKey}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.items) {
            videos.push(...data.items);
        }
    }
    return videos;
}

async function fetchVideoComments(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${state.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        if (data.error.code === 403) throw new Error('댓글 사용이 중지되었거나 권한이 없습니다.');
        throw new Error(data.error.message);
    }

    return data.items || [];
}


// --- Render Functions ---

// --- Utils & Helpers ---

function isShorts(durationIso) {
    const seconds = parseDuration(durationIso);
    return seconds <= 60;
}

// --- Keyword Analysis Logic ---

function analyzeKeywords(videos) {
    const wordCounts = {};
    const stopWords = new Set([
        'shorts', 'video', 'vlog', '브이로그', '영상', '동영상', '티저', '하이라이트',
        'sub', 'Eng', 'kr', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        '이', '그', '저', '것', '수', '등', '들', '제', '개', '내', '너', '우리', '함께'
    ]);

    videos.forEach(v => {
        const title = v.snippet.title;
        if (!title) return;

        // 1. Clean Title: Remove brackets, special chars
        const cleanTitle = title.replace(/[\[\]\(\)\{\}\|!?,.`~@#$%^&*_+=\-]/g, ' ');

        // 2. Tokenize by space
        const tokens = cleanTitle.split(/\s+/);

        tokens.forEach(token => {
            const word = token.trim();
            // Filter: Length > 1 and not a stopword (and not just numbers)
            if (word.length > 1 && !stopWords.has(word.toLowerCase()) && isNaN(word)) {

                // Optional: Trim particles? (Very basic heuristic for Korean)
                // e.g. '여행을' -> '여행' (risky without full dictionary)
                // Let's stick to exact words for safety first, maybe strip common suffixes if easy

                const key = word;
                wordCounts[key] = (wordCounts[key] || 0) + 1;
            }
        });
    });

    // Convert to array
    const sorted = Object.entries(wordCounts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);

    return sorted;
}

// --- Advanced Analytics ---

function analyzeUploadTimes(videos) {
    const hourlyCounts = new Array(24).fill(0);
    videos.forEach(v => {
        const date = new Date(v.snippet.publishedAt);
        const hour = date.getHours();
        hourlyCounts[hour]++;
    });
    return hourlyCounts;
}

function analyzeSeasons(videos) {
    const seasons = { Spring: [], Summer: [], Fall: [], Winter: [] };

    videos.forEach(v => {
        const date = new Date(v.snippet.publishedAt);
        const month = date.getMonth() + 1; // 1-12
        let season = '';

        if (month >= 3 && month <= 5) season = 'Spring';
        else if (month >= 6 && month <= 8) season = 'Summer';
        else if (month >= 9 && month <= 11) season = 'Fall';
        else season = 'Winter'; // 12, 1, 2

        seasons[season].push(v);
    });

    // Extract top keywords for each season
    const result = {};
    for (const [season, vids] of Object.entries(seasons)) {
        if (vids.length > 0) {
            const keywords = analyzeKeywords(vids); // Reuse existing function
            result[season] = keywords.slice(0, 5).map(k => k.word); // Top 5
        } else {
            result[season] = [];
        }
    }
    return result;
}

function analyzeTitleLength(videos) {
    let totalLen = 0;
    let maxLen = 0;
    const distribution = { 'Short (<20)': 0, 'Medium (20-50)': 0, 'Long (>50)': 0 };

    videos.forEach(v => {
        const len = v.snippet.title.length;
        totalLen += len;
        if (len > maxLen) maxLen = len;

        if (len < 20) distribution['Short (<20)']++;
        else if (len <= 50) distribution['Medium (20-50)']++;
        else distribution['Long (>50)']++;
    });

    return {
        avg: videos.length ? (totalLen / videos.length).toFixed(1) : 0,
        max: maxLen,
        distribution
    };
}

// --- Render Functions ---

function renderKeywordSection(keywords) {
    const section = document.getElementById('keyword-analysis-section');
    if (!section) return;

    if (keywords.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    let html = `
        <div class="keyword-section-header">
            <h3>🔑 인기 키워드 (Top 20)</h3>
            <button id="view-all-keywords-btn" class="view-all-btn">
                상세 통계 보기 <i data-lucide="bar-chart-2"></i>
            </button>
        </div>
        <div class="keyword-cloud-container">
    `;

    // Take top 20 for cloud
    const top20 = keywords.slice(0, 20);
    const maxCount = top20[0]?.count || 1;
    const minCount = top20[top20.length - 1]?.count || 1;

    // Scale Font Size: Min 1rem to Max 2.5rem
    top20.forEach(k => {
        // Simple linear scale
        const scale = (k.count - minCount) / (maxCount - minCount || 1);
        const fontSize = 1 + (scale * 1.5); // 1.0 ~ 2.5rem

        // Color variation based on popularity
        let colorClass = 'tag-normal';
        if (scale > 0.8) colorClass = 'tag-hot';
        else if (scale > 0.4) colorClass = 'tag-warm';

        html += `
            <span class="keyword-tag ${colorClass}" style="font-size: ${fontSize.toFixed(2)}rem" title="${k.count}회 사용됨">
                ${k.word}
                <span class="tag-count">${k.count}</span>
            </span>
        `;
    });

    html += `</div>`;
    section.innerHTML = html;

    const btn = document.getElementById('view-all-keywords-btn');
    if (btn) {
        btn.onclick = () => openKeywordModal(keywords);
    }

    lucide.createIcons();
}

function openKeywordModal(keywords) {
    const stats = keywords || [];
    const videos = state.videos; // Access global videos state

    const vidContainer = document.getElementById('modal-video-container');
    const comContainer = document.getElementById('modal-comments-container');
    const favContainer = document.getElementById('modal-favorites-container');
    const keyContainer = document.getElementById('modal-keyword-container');

    if (vidContainer) vidContainer.classList.add('hidden');
    if (comContainer) comContainer.classList.add('hidden');
    if (favContainer) favContainer.classList.add('hidden');
    if (keyContainer) keyContainer.classList.remove('hidden');

    const detailView = document.getElementById('keyword-detail-view');
    detailView.innerHTML = '';

    // -- Run Advanced Analysis --
    const uploadTimes = analyzeUploadTimes(videos);
    const seasonalKeywords = analyzeSeasons(videos);
    const titleStats = analyzeTitleLength(videos);

    // Calc Peak Time
    let maxHour = 0;
    let maxCount = -1;
    uploadTimes.forEach((count, hour) => {
        if (count > maxCount) {
            maxCount = count;
            maxHour = hour;
        }
    });
    const peakTimeStr = `${maxHour}시 ~ ${maxHour + 1}시`;

    // -- Layout Construction --
    let html = `
        <div class="analytics-dashboard">
            <!-- 1. Top Level Stats -->
            <div class="keyword-stats-grid">
                <div class="stats-card">
                    <h4>분석된 총 단어</h4>
                    <div class="big-number">${formatNumber(stats.length)}</div>
                </div>
                <div class="stats-card">
                    <h4>최다 등장</h4>
                    <div class="big-number highlight">${stats[0]?.word || '-'}</div>
                    <div class="sub-text">${stats[0]?.count || 0}회</div>
                </div>
                <div class="stats-card">
                    <h4>평균 제목 길이</h4>
                    <div class="big-number">${titleStats.avg}자</div>
                </div>
                <div class="stats-card">
                    <h4>황금 업로드 시간</h4>
                    <div class="big-number highlight">${peakTimeStr}</div>
                    <div class="sub-text">가장 영상이 많은 시간대</div>
                </div>
            </div>

            <div class="modal-divider"></div>

            <!-- 2. Charts Section (Stacked) -->
            
            <!-- Upload Time -->
            <div class="chart-section-row">
                <div class="chart-text-col">
                    <h4>⏰ 시간대별 업로드 패턴</h4>
                    <p class="chart-desc">채널 주인이 영상을 주로 업로드하는 시간대입니다.<br>이 시간에 맞춰 영상을 올리면 반응이 좋을 수 있습니다.</p>
                </div>
                <div class="chart-canvas-col">
                    <div style="position: relative; height: 300px; width: 100%;">
                        <canvas id="uploadTimeChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="modal-divider"></div>

            <!-- Title Length -->
            <div class="chart-section-row">
                <div class="chart-text-col">
                    <h4>📝 제목 길이 분포</h4>
                    <p class="chart-desc">제목의 길이를 분석합니다.<br>이 채널은 <strong>${titleStats.max}자</strong>까지 제목을 쓴 적이 있습니다.</p>
                </div>
                <div class="chart-canvas-col">
                    <div style="position: relative; height: 300px; width: 100%;">
                        <canvas id="titleLenChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="modal-divider"></div>

            <!-- 3. Seasonal Keywords -->
            <div class="seasonal-section">
                <h4>🍂 계절별 주요 키워드</h4>
                <div class="season-cards-container">
                    ${Object.entries(seasonalKeywords).map(([season, keys]) => `
                        <div class="season-pretty-card ${season.toLowerCase()}">
                            <div class="season-icon">${getSeasonIcon(season)}</div>
                            <div class="season-name">${getSeasonName(season)}</div>
                            <div class="season-keywords-list">
                                ${keys.length ? keys.map(k => `<span class="s-tag">#${k}</span>`).join('') : '<span class="empty">-</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="modal-divider"></div>

            <!-- 4. Full Keyword List -->
            <h3>🔑 전체 키워드 순위</h3>
            <div class="keyword-list-header">
                <span>순위</span>
                <span>키워드</span>
                <span>사용 횟수</span>
                <span>비중</span>
            </div>
            <div class="keyword-list-scroll">
    `;

    const totalOccurrences = stats.reduce((sum, item) => sum + item.count, 0);

    stats.slice(0, 100).forEach((k, idx) => {
        const percentage = ((k.count / totalOccurrences) * 100).toFixed(1);
        html += `
            <div class="keyword-list-row">
                <div class="rank-col">${idx + 1}</div>
                <div class="word-col">${k.word}</div>
                <div class="count-col">${k.count}</div>
                <div class="bar-col">
                    <div class="percent-bar-bg">
                        <div class="percent-bar-fill" style="width:${percentage}%"></div>
                    </div>
                    <span class="percent-text">${percentage}%</span>
                </div>
            </div>
        `;
    });

    html += `</div></div>`; // Close scroll & dashboard
    detailView.innerHTML = html;

    elements.modal.classList.remove('hidden');
    lucide.createIcons();

    // -- Render Charts --
    renderUploadTimeChart(uploadTimes);
    renderTitleLenChart(titleStats.distribution);
}

function getSeasonIcon(eng) {
    const map = { 'Spring': '🌸', 'Summer': '🌊', 'Fall': '🍁', 'Winter': '❄️' };
    return map[eng] || '📅';
}

function getSeasonName(eng) {
    const map = { 'Spring': 'Spring', 'Summer': 'Summer', 'Fall': 'Autumn', 'Winter': 'Winter' };
    return map[eng] || eng;
}

function renderUploadTimeChart(data) {
    const ctx = document.getElementById('uploadTimeChart').getContext('2d');

    // Destroy existing
    if (state.modalCharts.upload) {
        state.modalCharts.upload.destroy();
    }

    state.modalCharts.upload = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
            datasets: [{
                label: '업로드 수',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function renderTitleLenChart(dist) {
    const ctx = document.getElementById('titleLenChart').getContext('2d');

    // Destroy existing
    if (state.modalCharts.title) {
        state.modalCharts.title.destroy();
    }

    state.modalCharts.title = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dist),
            datasets: [{
                data: Object.values(dist),
                backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}


function renderChannelInfo(data, videos) {
    const snippet = data.snippet;
    const stats = data.statistics;

    elements.channelTitle.textContent = snippet.title;
    elements.channelDesc.textContent = snippet.description;
    elements.channelThumb.src = snippet.thumbnails.medium.url;
    elements.viewCount.textContent = formatNumber(stats.viewCount);

    if (videos.length > 0) {
        const firstDate = new Date(videos[videos.length - 1].snippet.publishedAt);
        const lastDate = new Date(videos[0].snippet.publishedAt);
        const diffTime = Math.abs(lastDate - firstDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const avg = (videos.length / diffDays).toFixed(2);
        elements.dailyUploadAvg.textContent = `${avg}개 / 일 (최근 ${videos.length}개 기준)`;
        // Revenue Calculation
        const revenue = calculateRevenue(videos);
        const revenueEl = document.getElementById('estimated-revenue');
        if (revenueEl) {
            revenueEl.textContent = formatCurrency(revenue);
        }
    }
}

function calculateRevenue(videos) {
    let totalRev = 0;
    videos.forEach(v => {
        const views = parseInt(v.statistics.viewCount || 0);
        const isS = isShorts(v.contentDetails.duration);

        // Rates: Long = 2 KRW, Shorts = 0.15 KRW
        const rate = isS ? 0.15 : 2.0;
        totalRev += (views * rate);
    });
    return Math.floor(totalRev);
}

function formatCurrency(num) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);
}

function processDailyStats(videos) {
    const statsMap = {};

    videos.forEach(v => {
        const date = v.snippet.publishedAt.split('T')[0];
        if (!statsMap[date]) {
            statsMap[date] = { count: 0, views: 0 };
        }
        statsMap[date].count += 1;
        statsMap[date].views += parseInt(v.statistics.viewCount || 0);
    });

    return Object.entries(statsMap)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, data]) => ({ date, ...data }));
}

function processMonthlyStats(videos) {
    const statsMap = {};

    videos.forEach(v => {
        const date = v.snippet.publishedAt.split('T')[0];
        const month = date.substring(0, 7); // YYYY-MM
        if (!statsMap[month]) {
            statsMap[month] = { count: 0, views: 0 };
        }
        statsMap[month].count += 1;
        statsMap[month].views += parseInt(v.statistics.viewCount || 0);
    });

    return Object.entries(statsMap)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, data]) => ({ date, ...data }));
}

function renderCharts(videos) {
    let chartData = [];
    let PAGE_SIZE = 30;

    if (state.chartTimeScale === 'monthly') {
        chartData = processMonthlyStats(videos);
        PAGE_SIZE = 12; // Show 1 year by default for monthly
    } else {
        chartData = processDailyStats(videos);
        PAGE_SIZE = 30; // Show 30 days by default for daily
    }

    const totalItems = chartData.length;

    // Pagination Logic
    // Page 0: Last N (latest)
    // Page 1: Previous N
    let startIndex = totalItems - ((state.chartPage + 1) * PAGE_SIZE);
    let endIndex = totalItems - (state.chartPage * PAGE_SIZE);

    if (endIndex > totalItems) endIndex = totalItems;
    if (startIndex < 0) startIndex = 0;

    // If page is out of bounds
    if (endIndex <= 0 && totalItems > 0) {
        state.chartPage = 0;
        startIndex = Math.max(0, totalItems - PAGE_SIZE);
        endIndex = totalItems;
    }

    const pageData = chartData.slice(startIndex, endIndex);

    // Update Label and Buttons
    const rangeLabel = document.getElementById('chart-range-label');
    const navDiv = document.querySelector('.chart-nav');
    if (navDiv) navDiv.style.display = 'flex';

    // Update Button State
    const prevBtn = document.getElementById('chart-prev');
    const nextBtn = document.getElementById('chart-next');

    if (prevBtn) prevBtn.disabled = startIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.chartPage <= 0;

    if (prevBtn) prevBtn.style.opacity = startIndex <= 0 ? '0.3' : '1';
    if (nextBtn) nextBtn.style.opacity = state.chartPage <= 0 ? '0.3' : '1';

    if (rangeLabel && pageData.length > 0) {
        const startStr = pageData[0].date;
        const endStr = pageData[pageData.length - 1].date;
        rangeLabel.textContent = `${startStr} ~ ${endStr}`;
    } else if (rangeLabel) {
        rangeLabel.textContent = '데이터 없음';
    }

    const ctx = document.getElementById('uploadChart');
    if (!ctx) return;

    if (state.uploadChart) {
        state.uploadChart.destroy();
    }

    // Colors: Pink > 500k, Purple > 1M
    let hasMillionViews = false;
    const backgroundColors = pageData.map(d => {
        if (d.views >= 1000000) {
            hasMillionViews = true;
            return '#9b59b6'; // Purple
        }
        if (d.views >= 500000) return '#ff69b4'; // Pink
        return '#03c75a'; // Green
    });

    const borderColors = pageData.map(d => {
        if (d.views >= 1000000) return '#8e44ad';
        if (d.views >= 500000) return '#ff1493';
        return '#02b351';
    });

    state.uploadChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pageData.map(d => d.date),
            datasets: [
                {
                    label: state.chartTimeScale === 'monthly' ? '월별 업로드 수' : '일별 업로드 수',
                    data: pageData.map(d => d.count),
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    yAxisID: 'y',
                    barPercentage: 0.6
                },
                {
                    type: 'line',
                    label: '조회수 (합계)',
                    data: pageData.map(d => d.views),
                    borderColor: '#333',
                    borderWidth: 2,
                    pointRadius: 3,
                    yAxisID: 'y1',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '업로드 개수' },
                    grid: { display: false },
                    ticks: { stepSize: 1 }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '조회수' },
                    grid: { color: '#f0f0f0' },
                    ticks: {
                        callback: function (value) {
                            return formatNumber(value);
                        }
                    }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.dataset.type === 'line'
                                    ? formatNumber(context.parsed.y)
                                    : context.parsed.y + '개';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

}

function renderVideoList(videos) {
    elements.videoTableBody.innerHTML = '';

    videos.forEach((video, index) => {
        const snippet = video.snippet;
        const stats = video.statistics;
        const contentDetails = video.contentDetails;
        const thumbnail = snippet.thumbnails.default?.url;

        // Duration Processing
        const durationSec = parseDuration(contentDetails.duration);
        const durationStr = formatDuration(durationSec);

        // Shorts Check
        const isShortsVideo = isShorts(contentDetails.duration);
        const typeIcon = isShortsVideo
            ? '<i data-lucide="smartphone" class="video-type-icon" style="color:var(--accent-color)" title="Shorts"></i>'
            : '<i data-lucide="monitor" class="video-type-icon" style="color:var(--text-light)" title="일반 동영상"></i>';

        const tr = document.createElement('tr');

        // Comment count clickable?
        const commentCount = formatNumber(stats.commentCount || 0);

        // ** View Count Highlighting Logic **
        const viewCountVal = parseInt(stats.viewCount || 0);
        let viewCountDisplay = formatNumber(viewCountVal);
        let viewClass = '';

        if (viewCountVal >= 5000000) {
            viewClass = 'views-ultra'; // Purple Bold
            viewCountDisplay = `✨${viewCountDisplay}`;
        } else if (viewCountVal >= 1000000) {
            viewClass = 'views-mega'; // Bold Red
        } else if (viewCountVal >= 500000) {
            viewClass = 'views-high'; // Red
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><div onclick="openVideoModal('${video.id}')" style="cursor:pointer;"><img src="${thumbnail}" class="video-thumbnail-small" alt="thumb"></div></td>
            <td class="title-cell">
                <div onclick="openVideoModal('${video.id}')" style="cursor:pointer;" class="video-title-link">
                    ${typeIcon} ${snippet.title}
                </div>
            </td>
            <td>${durationStr}</td>
            <td>${new Date(snippet.publishedAt).toLocaleDateString()}</td>
            <td><span class="${viewClass}">${viewCountDisplay}</span></td>
            <td>${formatNumber(stats.likeCount || 0)}</td>
            <td><span class="clickable-stat" onclick="openCommentModal('${video.id}')">${commentCount}</span></td>
        `;

        elements.videoTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

function openVideoModal(videoId) {
    // Reset Modal State
    elements.modalVideoContainer.classList.remove('hidden');
    elements.modalCommentsContainer.classList.add('hidden');
    const favContainer = document.getElementById('modal-favorites-container');
    const musContainer = document.getElementById('modal-music-container');
    if (favContainer) favContainer.classList.add('hidden');
    if (musContainer) musContainer.classList.add('hidden');

    // Set Video
    elements.modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    elements.externalLinkBtn.href = `https://www.youtube.com/watch?v=${videoId}`;

    // Download Button Setup (Static)
    const downloadBtn = document.getElementById('modal-download-btn');
    if (downloadBtn) {
        // Clone to remove old event listeners
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

        newBtn.onclick = function () {
            const downloadUrl = `https://ssyoutube.com/watch?v=${videoId}`;
            window.open(downloadUrl, '_blank');
        };
    }

    elements.modal.classList.remove('hidden');
    lucide.createIcons();
}

function renderComments(comments) {
    elements.commentsList.innerHTML = '';

    if (comments.length === 0) {
        elements.commentsList.innerHTML = '<p style="text-align:center; color:#999;">표시할 댓글이 없습니다.</p>';
        return;
    }

    comments.forEach(item => {
        const top = item.snippet.topLevelComment.snippet;

        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <img src="${top.authorProfileImageUrl}" class="comment-avatar" alt="Avatar">
            <div class="comment-content">
                <h4>${top.authorDisplayName}</h4>
                <p class="comment-text">${top.textDisplay}</p>
                <div class="comment-meta">
                    <span>👍 ${top.likeCount}</span> • 
                    <span>${new Date(top.publishedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        elements.commentsList.appendChild(div);
    });
}


// --- Utils & Helpers ---

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

function exportToExcel() {
    if (state.videos.length === 0) return;

    const detailRows = state.videos.map(v => ({
        'Video ID': v.id,
        '제목': v.snippet.title,
        '길이': formatDuration(parseDuration(v.contentDetails.duration)),
        '업로드 일자': new Date(v.snippet.publishedAt).toISOString().split('T')[0],
        '조회수': parseInt(v.statistics.viewCount || 0),
        '좋아요 수': parseInt(v.statistics.likeCount || 0),
        '댓글 수': parseInt(v.statistics.commentCount || 0),
        'URL': `https://www.youtube.com/watch?v=${v.id}`
    }));

    const dailyStats = processDailyStats(state.videos);
    const summaryRows = dailyStats.map(d => ({
        '날짜': d.date,
        '업로드 수': d.count,
        '총 조회수': d.views
    }));

    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "전체 영상 목록");

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "일별 요약");

    const channelName = elements.channelTitle.textContent.replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `${channelName}_report.xlsx`);
}

function formatNumber(num) {
    return new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(num);
}

function setLoading(isLoading, text) {
    if (isLoading) {
        elements.loadingIndicator.classList.remove('hidden');
        if (text) elements.loadingText.textContent = text;
        elements.resultsSection.classList.add('hidden');
        elements.errorMessage.classList.add('hidden');
    } else {
        elements.loadingIndicator.classList.add('hidden');
    }
}

function showError(msg) {
    elements.errorMessage.textContent = msg;
    elements.errorMessage.classList.remove('hidden');
    elements.loadingIndicator.classList.add('hidden');
}

function clearError() {
    elements.errorMessage.classList.add('hidden');
    elements.errorMessage.textContent = '';
}

function safeParseInt(val) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
}
