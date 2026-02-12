const state = {
    apiKey: localStorage.getItem('yt_api_key') || '',
    channelId: null,
    videos: [],
    isLoading: false,
    uploadChart: null
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

// --- Initialization ---
if (state.apiKey) {
    elements.apiKeyInput.value = state.apiKey;
}

// --- Event Listeners ---
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

elements.analyzeBtn.addEventListener('click', handleAnalyze);
elements.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyze();
});

elements.exportBtn.addEventListener('click', exportToExcel);

// Modal Logic
elements.closeModal.addEventListener('click', closeModal);
elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
        closeModal();
    }
});



async function openCommentModal(videoId) {
    // Reset Modal State
    elements.modalVideoContainer.classList.add('hidden');
    elements.modalCommentsContainer.classList.remove('hidden');
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

        // Date sort desc
        videos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        state.videos = videos;

        renderChannelInfo(channelData, videos);
        renderCharts(videos);
        renderVideoList(videos);

        elements.resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
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
    const recentStats = dailyStats.slice(-30);
    const checkBgColor = '#03c75a';

    const ctx = document.getElementById('uploadChart').getContext('2d');

    state.uploadChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recentStats.map(d => d.date),
            datasets: [
                {
                    label: '업로드 개수',
                    data: recentStats.map(d => d.count),
                    backgroundColor: checkBgColor,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: '조회수 합계',
                    data: recentStats.map(d => d.views),
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
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '업로드 개수' },
                    grid: { display: false }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '조회수' },
                    grid: { color: '#f0f0f0' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += formatNumber(context.parsed.y);
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
            <td><a href="${videoUrl}" target="_blank"><img src="${thumbnail}" class="video-thumbnail-small" alt="thumb"></a></td>
            <td class="title-cell"><a href="${videoUrl}" target="_blank" class="video-title-link">${snippet.title}</a></td>
            <td>${new Date(snippet.publishedAt).toLocaleDateString()}</td>
            <td>${formatNumber(stats.viewCount || 0)}</td>
            <td>${formatNumber(stats.likeCount || 0)}</td>
            <td><span class="clickable-stat" onclick="openCommentModal('${video.id}')">${commentCount}</span></td>
        `;

        elements.videoTableBody.appendChild(tr);
    });
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
