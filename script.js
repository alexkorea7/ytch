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
    favorites: []
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
        renderComments(comments);
    } catch (error) {
        elements.commentsList.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function closeModal() {
    elements.modalIframe.src = '';
    elements.modal.classList.add('hidden');
    const favContainer = document.getElementById('modal-favorites-container');
    if (favContainer) favContainer.classList.add('hidden');
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
    } else {
        if (url.startsWith('@')) {
            return fetchChannelIdByHandle(url);
        }
        throw new Error('지원되지 않는 URL 형식입니다. /channel/ 또는 @handle 형식을 사용해주세요.');
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
    const MAX_PAGES = 10;
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
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${state.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        if (data.error.code === 403) throw new Error('댓글 사용이 중지되었거나 권한이 없습니다.');
        throw new Error(data.error.message);
    }

    return data.items || [];
}


// --- Render Functions ---

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
    } else {
        elements.dailyUploadAvg.textContent = "0개";
    }
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

function renderCharts(videos) {
    const dailyStats = processDailyStats(videos);

    // Simplification: Always show latest 30 active days (or less if not enough data)
    // The stats are already sorted by date ASC
    const pageData = dailyStats.slice(-30);

    // Update Label and Buttons - Hide nav as requested for simplicity "like before"
    const rangeLabel = document.getElementById('chart-range-label');
    const navDiv = document.querySelector('.chart-nav');
    if (navDiv) navDiv.style.display = 'none'; // Hide nav controls for now to simplify

    if (rangeLabel && pageData.length > 0) {
        const startStr = pageData[0].date;
        const endStr = pageData[pageData.length - 1].date;
        rangeLabel.textContent = `${startStr} ~ ${endStr} (최근 30일)`;
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
                    label: '업로드 수',
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
        const thumbnail = snippet.thumbnails.default?.url;
        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

        const tr = document.createElement('tr');

        // Comment count clickable?
        const commentCount = formatNumber(stats.commentCount || 0);

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><div onclick="openVideoModal('${video.id}')" style="cursor:pointer;"><img src="${thumbnail}" class="video-thumbnail-small" alt="thumb"></div></td>
            <td class="title-cell"><div onclick="openVideoModal('${video.id}')" style="cursor:pointer;" class="video-title-link">${snippet.title}</div></td>
            <td>${new Date(snippet.publishedAt).toLocaleDateString()}</td>
            <td>${formatNumber(stats.viewCount || 0)}</td>
            <td>${formatNumber(stats.likeCount || 0)}</td>
            <td><span class="clickable-stat" onclick="openCommentModal('${video.id}')">${commentCount}</span></td>
        `;

        elements.videoTableBody.appendChild(tr);
    });
}

function openVideoModal(videoId) {
    // Reset Modal State
    elements.modalVideoContainer.classList.remove('hidden');
    elements.modalCommentsContainer.classList.add('hidden');

    // Set Video
    elements.modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    elements.externalLinkBtn.href = `https://www.youtube.com/watch?v=${videoId}`;

    elements.modal.classList.remove('hidden');
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

function exportToExcel() {
    if (state.videos.length === 0) return;

    const detailRows = state.videos.map(v => ({
        'Video ID': v.id,
        '제목': v.snippet.title,
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
