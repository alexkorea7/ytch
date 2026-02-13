# YouTube Channel Analyzer (YTCH) 📺

A powerful, client-side web application for analyzing YouTube channels.
Supports detailed video statistics, revenue estimation, and deep analytics (upload times, seasonal trends, video duration).

## ✨ Key Features

### 1. **Channel Overview & Revenue Estimation** 💰
- **Basic Info**: Subscriber count, total views, video count.
- **Estimated Revenue**: Calculates potential earnings based on view counts and video types (Shorts vs. Long-form).
  - *Shorts Rate*: ~0.15 KRW / view
  - *Long-form Rate*: ~2.0 KRW / view
- **Daily Upload Average**: Tracks consistency of uploads.

### 2. **Advanced Analytics Dashboard** 📊
Detailed breakdown of channel performance in a modal view:
- **Upload Time Pattern**: Discover the "Golden Hour" when the creator uploads most frequently.
- **Video Duration Distribution**: Analyze content strategy (Shorts vs. 10min+ vs. long streams) with 10-second interval buckets.
- **Title Length Analysis**: optimize title lengths based on performance.
- **Seasonal Keywords**: Visualizes top keywords for Spring, Summer, Fall, and Winter to identify seasonal trends.

### 3. **Video Management & Tools** 🛠️
- **Sorting**: Sort videos by Date, Views, Likes, Comments, or Duration.
- **Filtering**: Distinguish between Shorts and Regular videos with icons.
- **Download**: Direct link to download videos (using external service).
- **Favorites**: Save frequently analyzed channels for quick access.
- **Excel Export**: Download all data as a `.xlsx` file for offline analysis.

### 4. **Modern UI/UX** 🎨
- **Responsive Design**: Works on desktop and mobile.
- **Interactive Charts**: Powered by `Chart.js` for beautiful visualizations.
- **Smart Feedback**: Loading states, error handling, and intuitive navigation.

## 🚀 How to Use

1.  **Get a YouTube Data API Key**:
    - Go to [Google Cloud Console](https://console.cloud.google.com/).
    - Create a project and enable **YouTube Data API v3**.
    - Create an API Key.
2.  **Run the App**:
    - Open `index.html` in any modern web browser.
    - (Optional) Host on GitHub Pages for easy access.
3.  **Analyze**:
    - Enter your API Key (saved locally in browser).
    - Paste a YouTube Channel URL (e.g., `https://youtube.com/@ChannelName`) or handle.
    - Click **Analyze**.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Libraries**:
    - [Chart.js](https://www.chartjs.org/) (Visualizations)
    - [SheetJS (xlsx)](https://sheetjs.com/) (Excel Export)
    - [Lucide Icons](https://lucide.dev/) (UI Icons)
- **API**: YouTube Data API v3

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
