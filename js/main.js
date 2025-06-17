// Main JavaScript file for LitePlay Hub

// ==================== 基础路径配置 ====================

// 检测并设置基础路径
function getBasePath() {
    // 如果是GitHub Pages环境，需要加上仓库名
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // GitHub Pages环境检测
    if (hostname === 'pommotion.github.io' && pathname.startsWith('/liteplay_hub/')) {
        return '/liteplay_hub/';
    }
    
    // 本地开发环境或其他环境
    return '/';
}

// 修正路径函数
function getCorrectPath(relativePath) {
    const basePath = getBasePath();
    
    // 如果是绝对路径，直接返回
    if (relativePath.startsWith('/') || relativePath.startsWith('http')) {
        return relativePath;
    }
    
    // 确保基础路径正确
    if (basePath === '/') {
        return relativePath;
    }
    
    // GitHub Pages环境下，需要确保路径包含仓库名
    return basePath + relativePath;
}

// 游戏数据定义
const allGames = [
    {
        id: 'tetris',
        name: '经典俄罗斯方块',
        description: '经典的俄罗斯方块游戏，考验你的空间思维和反应速度',
        category: '益智',
        categoryColor: 'blue',
        imageUrl: 'assets/games/tetris/cover.jpg',
        gameUrl: 'game.html?game=tetris',
        gameFileUrl: 'assets/games/tetris/index.html'
    },
    {
        id: 'snake',
        name: '贪吃蛇大作战',
        description: '童年回忆的贪吃蛇游戏，简单易上手，让人停不下来',
        category: '休闲',
        categoryColor: 'green',
        imageUrl: 'assets/games/snake/cover.jpg',
        gameUrl: 'game.html?game=snake',
        gameFileUrl: 'assets/games/snake/index.html'
    },
    {
        id: 'puzzle',
        name: '数字华容道',
        description: '挑战你的逻辑思维，通过移动数字块完成排序',
        category: '益智',
        categoryColor: 'blue',
        imageUrl: 'assets/games/puzzle/cover.jpg',
        gameUrl: 'game.html?game=puzzle',
        gameFileUrl: 'assets/games/puzzle/index.html'
    },
    {
        id: 'flappy',
        name: '飞翔小鸟',
        description: '控制小鸟穿越障碍物，挑战你的反应极限',
        category: '动作',
        categoryColor: 'red',
        imageUrl: 'assets/games/flappy/cover.jpg',
        gameUrl: 'game.html?game=flappy',
        gameFileUrl: 'assets/games/flappy/index.html'
    }
];

// ==================== 数据存储管理 ====================

// 存储键名常量
const STORAGE_KEYS = {
    RECENT_GAMES: 'liteplay_recent_games',
    FAVORITES: 'liteplay_favorites',
    GAME_STATS: 'liteplay_game_stats',
    USER_PREFERENCES: 'liteplay_user_preferences',
    GAME_SAVES: 'liteplay_game_saves'
};

// 数据存储工具类
class StorageManager {
    static getItem(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('读取存储数据失败:', error);
            return defaultValue;
        }
    }

    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('保存存储数据失败:', error);
            return false;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('删除存储数据失败:', error);
            return false;
        }
    }
}

// ==================== 最近玩过管理 ====================

class RecentGamesManager {
    static MAX_RECENT_GAMES = 10;

    static addRecentGame(gameId) {
        const recentGames = this.getRecentGames();
        
        // 移除已存在的记录
        const filtered = recentGames.filter(item => item.gameId !== gameId);
        
        // 添加新记录到开头
        const newRecord = {
            gameId: gameId,
            timestamp: Date.now(),
            playCount: this.getGamePlayCount(gameId) + 1
        };
        
        filtered.unshift(newRecord);
        
        // 限制数量
        if (filtered.length > this.MAX_RECENT_GAMES) {
            filtered.splice(this.MAX_RECENT_GAMES);
        }
        
        StorageManager.setItem(STORAGE_KEYS.RECENT_GAMES, filtered);
        this.updateGameStats(gameId);
        
        // 触发更新事件
        this.dispatchUpdateEvent();
    }

    static getRecentGames() {
        return StorageManager.getItem(STORAGE_KEYS.RECENT_GAMES, []);
    }

    static getRecentGamesWithDetails() {
        const recentGames = this.getRecentGames();
        return recentGames.map(item => {
            const game = getGameById(item.gameId);
            return {
                ...item,
                gameData: game
            };
        }).filter(item => item.gameData); // 过滤掉不存在的游戏
    }

    static removeRecentGame(gameId) {
        const recentGames = this.getRecentGames();
        const filtered = recentGames.filter(item => item.gameId !== gameId);
        StorageManager.setItem(STORAGE_KEYS.RECENT_GAMES, filtered);
        this.dispatchUpdateEvent();
    }

    static clearRecentGames() {
        StorageManager.removeItem(STORAGE_KEYS.RECENT_GAMES);
        this.dispatchUpdateEvent();
    }

    static getGamePlayCount(gameId) {
        const stats = StorageManager.getItem(STORAGE_KEYS.GAME_STATS, {});
        return stats[gameId]?.playCount || 0;
    }

    static updateGameStats(gameId) {
        const stats = StorageManager.getItem(STORAGE_KEYS.GAME_STATS, {});
        if (!stats[gameId]) {
            stats[gameId] = {
                playCount: 0,
                totalPlayTime: 0,
                lastPlayed: 0,
                bestScore: 0
            };
        }
        
        stats[gameId].playCount++;
        stats[gameId].lastPlayed = Date.now();
        
        StorageManager.setItem(STORAGE_KEYS.GAME_STATS, stats);
    }

    static dispatchUpdateEvent() {
        window.dispatchEvent(new CustomEvent('recentGamesUpdated'));
    }
}

// ==================== 收藏管理 ====================

class FavoritesManager {
    static addFavorite(gameId) {
        const favorites = this.getFavorites();
        if (!favorites.includes(gameId)) {
            favorites.push(gameId);
            StorageManager.setItem(STORAGE_KEYS.FAVORITES, favorites);
            this.dispatchUpdateEvent();
            return true;
        }
        return false;
    }

    static removeFavorite(gameId) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(id => id !== gameId);
        if (filtered.length !== favorites.length) {
            StorageManager.setItem(STORAGE_KEYS.FAVORITES, filtered);
            this.dispatchUpdateEvent();
            return true;
        }
        return false;
    }

    static toggleFavorite(gameId) {
        if (this.isFavorite(gameId)) {
            return this.removeFavorite(gameId) ? 'removed' : 'error';
        } else {
            return this.addFavorite(gameId) ? 'added' : 'error';
        }
    }

    static isFavorite(gameId) {
        const favorites = this.getFavorites();
        return favorites.includes(gameId);
    }

    static getFavorites() {
        return StorageManager.getItem(STORAGE_KEYS.FAVORITES, []);
    }

    static getFavoritesWithDetails() {
        const favorites = this.getFavorites();
        return favorites.map(gameId => getGameById(gameId)).filter(game => game);
    }

    static getFavoritesCount() {
        return this.getFavorites().length;
    }

    static clearFavorites() {
        StorageManager.removeItem(STORAGE_KEYS.FAVORITES);
        this.dispatchUpdateEvent();
    }

    static dispatchUpdateEvent() {
        window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    }
}

// ==================== 游戏存档管理 ====================

class GameSaveManager {
    static saveGameData(gameId, saveData) {
        const allSaves = StorageManager.getItem(STORAGE_KEYS.GAME_SAVES, {});
        
        if (!allSaves[gameId]) {
            allSaves[gameId] = [];
        }
        
        const newSave = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            data: saveData,
            description: saveData.description || `存档 ${allSaves[gameId].length + 1}`
        };
        
        allSaves[gameId].unshift(newSave);
        
        // 限制每个游戏最多5个存档
        if (allSaves[gameId].length > 5) {
            allSaves[gameId].splice(5);
        }
        
        StorageManager.setItem(STORAGE_KEYS.GAME_SAVES, allSaves);
        return newSave.id;
    }

    static loadGameData(gameId, saveId = null) {
        const allSaves = StorageManager.getItem(STORAGE_KEYS.GAME_SAVES, {});
        const gameSaves = allSaves[gameId] || [];
        
        if (saveId) {
            const save = gameSaves.find(s => s.id === saveId);
            return save ? save.data : null;
        } else {
            // 返回最新的存档
            return gameSaves.length > 0 ? gameSaves[0].data : null;
        }
    }

    static getGameSaves(gameId) {
        const allSaves = StorageManager.getItem(STORAGE_KEYS.GAME_SAVES, {});
        return allSaves[gameId] || [];
    }

    static deleteGameSave(gameId, saveId) {
        const allSaves = StorageManager.getItem(STORAGE_KEYS.GAME_SAVES, {});
        if (allSaves[gameId]) {
            allSaves[gameId] = allSaves[gameId].filter(save => save.id !== saveId);
            if (allSaves[gameId].length === 0) {
                delete allSaves[gameId];
            }
            StorageManager.setItem(STORAGE_KEYS.GAME_SAVES, allSaves);
            return true;
        }
        return false;
    }
}

// ==================== 游戏统计管理 ====================

class GameStatsManager {
    static updateStats(gameId, statsData) {
        const allStats = StorageManager.getItem(STORAGE_KEYS.GAME_STATS, {});
        
        if (!allStats[gameId]) {
            allStats[gameId] = {
                playCount: 0,
                totalPlayTime: 0,
                lastPlayed: 0,
                bestScore: 0,
                achievements: []
            };
        }
        
        const stats = allStats[gameId];
        
        // 更新统计数据
        if (statsData.playTime) {
            stats.totalPlayTime += statsData.playTime;
        }
        if (statsData.score && statsData.score > stats.bestScore) {
            stats.bestScore = statsData.score;
        }
        if (statsData.achievement) {
            if (!stats.achievements.includes(statsData.achievement)) {
                stats.achievements.push(statsData.achievement);
            }
        }
        
        stats.lastPlayed = Date.now();
        
        StorageManager.setItem(STORAGE_KEYS.GAME_STATS, allStats);
    }

    static getStats(gameId) {
        const allStats = StorageManager.getItem(STORAGE_KEYS.GAME_STATS, {});
        return allStats[gameId] || {
            playCount: 0,
            totalPlayTime: 0,
            lastPlayed: 0,
            bestScore: 0,
            achievements: []
        };
    }

    static getAllStats() {
        return StorageManager.getItem(STORAGE_KEYS.GAME_STATS, {});
    }
}

// ==================== 游戏通信协议 ====================

class GameCommunicator {
    static init() {
        // 监听来自游戏iframe的消息
        window.addEventListener('message', this.handleGameMessage.bind(this));
    }

    static handleGameMessage(event) {
        // 验证消息来源（可以根据需要添加更严格的验证）
        if (!event.data || typeof event.data !== 'object') {
            return;
        }

        const { type, game, data, timestamp } = event.data;

        switch (type) {
            case 'game_loaded':
                this.onGameLoaded(game);
                break;
            case 'game_started':
                this.onGameStarted(game, timestamp);
                break;
            case 'game_save':
                this.onGameSave(game, data);
                break;
            case 'game_stats':
                this.onGameStats(game, data);
                break;
            case 'game_error':
                this.onGameError(game, data);
                break;
        }
    }

    static onGameLoaded(gameId) {
        console.log(`游戏加载完成: ${gameId}`);
        
        // 发送存档数据给游戏
        const saveData = GameSaveManager.loadGameData(gameId);
        if (saveData) {
            this.sendToGame({
                type: 'load_save',
                game: gameId,
                data: saveData
            });
        }
    }

    static onGameStarted(gameId, timestamp) {
        console.log(`游戏开始: ${gameId}`);
        RecentGamesManager.addRecentGame(gameId);
    }

    static onGameSave(gameId, saveData) {
        console.log(`游戏存档: ${gameId}`, saveData);
        GameSaveManager.saveGameData(gameId, saveData);
    }

    static onGameStats(gameId, statsData) {
        console.log(`游戏统计: ${gameId}`, statsData);
        GameStatsManager.updateStats(gameId, statsData);
    }

    static onGameError(gameId, errorData) {
        console.error(`游戏错误: ${gameId}`, errorData);
    }

    static sendToGame(message) {
        // 发送消息给游戏iframe
        const gameFrame = document.getElementById('game-frame');
        if (gameFrame && gameFrame.contentWindow) {
            gameFrame.contentWindow.postMessage(message, '*');
        }
    }
}

// ==================== UI 工具函数 ====================

// 生成游戏卡片HTML
function generateGameCard(game, options = {}) {
    const isFavorite = FavoritesManager.isFavorite(game.id);
    const stats = GameStatsManager.getStats(game.id);
    const showStats = options.showStats !== false;
    const showFavorite = options.showFavorite !== false;
    
    return `
        <div class="game-card bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:scale-105 border border-gray-200 dark:border-gray-700" data-game-id="${game.id}">
            <div class="game-image relative">
                <img src="${getCorrectPath(game.imageUrl)}" alt="${game.name}" loading="lazy" 
                     class="w-full h-48 object-cover transition-transform duration-300 hover:scale-110" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDIwMCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxOTIiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNODcgODhIOTNWOTRIODdWODhaIiBmaWxsPSIjOUNBM0FGIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iOTYiIHI9IjIwIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Q0EzQUYiPua4uOaIj+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4='">
                ${showFavorite ? `
                    <button class="favorite-btn absolute top-3 right-3 w-9 h-9 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:scale-110 transition-all duration-200 ${isFavorite ? 'text-red-500' : ''}" 
                            data-action="favorite" data-game-id="${game.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                ` : ''}
                <div class="game-category absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${getCategoryStyle(game.category)}">
                    ${game.category}
                </div>
            </div>
            <div class="game-info p-5">
                <h3 class="game-title text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    ${game.name}
                </h3>
                <p class="game-description text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                    ${game.description}
                </p>
                ${showStats && stats.playCount > 0 ? `
                    <div class="game-stats flex gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                            <i class="fas fa-play-circle"></i>
                            已玩 ${stats.playCount} 次
                        </span>
                        ${stats.bestScore > 0 ? `
                            <span class="flex items-center gap-1">
                                <i class="fas fa-trophy"></i>
                                最高分: ${stats.bestScore}
                            </span>
                        ` : ''}
                    </div>
                ` : ''}
                <button class="play-btn w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2" 
                        data-action="play" data-game-id="${game.id}">
                    <i class="fas fa-play"></i>
                    <span>开始游戏</span>
                </button>
            </div>
        </div>
    `;
}

// 获取分类样式的辅助函数
function getCategoryStyle(category) {
    const styles = {
        '益智': 'bg-blue-500/90 text-white',
        '休闲': 'bg-green-500/90 text-white',
        '动作': 'bg-red-500/90 text-white',
        '射击': 'bg-purple-500/90 text-white',
        '策略': 'bg-yellow-500/90 text-white',
        '竞速': 'bg-indigo-500/90 text-white'
    };
    return styles[category] || 'bg-gray-500/90 text-white';
}

// 切换游戏收藏状态
function toggleGameFavorite(gameId, event) {
    event.preventDefault();
    event.stopPropagation();
    
    const result = FavoritesManager.toggleFavorite(gameId);
    const button = event.currentTarget;
    
    if (result === 'added') {
        button.classList.add('active');
        showToast('已添加到收藏', 'success');
    } else if (result === 'removed') {
        button.classList.remove('active');
        showToast('已从收藏中移除', 'info');
    } else {
        showToast('操作失败', 'error');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 动画显示
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// 调试函数 - 帮助诊断路径问题
function debugGameLaunch(gameId) {
    console.log('=== 游戏启动调试信息 ===');
    console.log('当前URL:', window.location.href);
    console.log('当前hostname:', window.location.hostname);
    console.log('当前pathname:', window.location.pathname);
    console.log('检测的基础路径:', getBasePath());
    console.log('游戏ID:', gameId);
    
    const originalGameUrl = `game.html?game=${gameId}`;
    const correctedGameUrl = getCorrectPath(originalGameUrl);
    
    console.log('原始游戏URL:', originalGameUrl);
    console.log('修正后的游戏URL:', correctedGameUrl);
    console.log('=== 调试信息结束 ===');
    
    return correctedGameUrl;
}

// 开始游戏函数
function startGame(gameId) {
    console.log('startGame被调用，游戏ID:', gameId);
    
    try {
        // 记录到最近玩过
        RecentGamesManager.addRecentGame(gameId);
        console.log('已记录到最近玩过');
        
        // 调试路径问题
        const gameUrl = debugGameLaunch(gameId);
        
        // 使用location.assign而不是直接设置href，更可靠
        console.log('准备跳转到:', gameUrl);
        window.location.assign(gameUrl);
    } catch (error) {
        console.error('startGame函数执行出错:', error);
        
        // 备用跳转方法
        try {
            const gameUrl = getCorrectPath(`game.html?game=${gameId}`);
            console.log('使用备用跳转方法:', gameUrl);
            window.open(gameUrl, '_self');
        } catch (backupError) {
            console.error('备用跳转方法也失败:', backupError);
            alert('启动游戏时出现错误，请刷新页面后重试');
        }
    }
}

// ==================== 页面特定初始化 ====================

// 主页初始化
function initHomePage() {
    const recentGamesContainer = document.getElementById('recent-games');
    const featuredGamesContainer = document.getElementById('featured-games');
    
    if (recentGamesContainer) {
        updateRecentGamesDisplay();
        window.addEventListener('recentGamesUpdated', updateRecentGamesDisplay);
    }
    
    if (featuredGamesContainer) {
        updateFeaturedGamesDisplay();
    }
}

function updateRecentGamesDisplay() {
    const container = document.getElementById('recent-games');
    if (!container) return;
    
    const recentGames = RecentGamesManager.getRecentGamesWithDetails();
    
    if (recentGames.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gamepad"></i>
                <p>还没有最近玩过的游戏</p>
                <p>开始探索我们的游戏库吧！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentGames.slice(0, 6).map(item => 
        generateGameCard(item.gameData, { showStats: true })
    ).join('');
}

function updateFeaturedGamesDisplay() {
    const container = document.getElementById('featured-games');
    if (!container) return;
    
    // 显示推荐游戏（这里简单地显示所有游戏）
    container.innerHTML = allGames.map(game => 
        generateGameCard(game)
    ).join('');
}

// 收藏页面初始化
function initFavoritesPage() {
    updateFavoritesDisplay();
    window.addEventListener('favoritesUpdated', updateFavoritesDisplay);
}

function updateFavoritesDisplay() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    
    const favorites = FavoritesManager.getFavoritesWithDetails();
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>还没有收藏的游戏</p>
                <p>点击游戏卡片上的心形图标来收藏游戏</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = favorites.map(game => 
        generateGameCard(game, { showStats: true })
    ).join('');
}

// 最近玩过页面初始化
function initRecentPage() {
    updateRecentPageDisplay();
    window.addEventListener('recentGamesUpdated', updateRecentPageDisplay);
}

function updateRecentPageDisplay() {
    const container = document.getElementById('recent-list');
    if (!container) return;
    
    const recentGames = RecentGamesManager.getRecentGamesWithDetails();
    
    if (recentGames.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <p>还没有最近玩过的游戏</p>
                <p>开始游戏后会在这里显示记录</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentGames.map(item => {
        const timeAgo = formatTimeAgo(item.timestamp);
        return `
            <div class="recent-item">
                ${generateGameCard(item.gameData, { showStats: true })}
                <div class="recent-info">
                    <span class="play-time">最后游玩: ${timeAgo}</span>
                    <span class="play-count">游玩次数: ${item.playCount}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 格式化时间
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    
    if (diff < minute) {
        return '刚刚';
    } else if (diff < hour) {
        return `${Math.floor(diff / minute)} 分钟前`;
    } else if (diff < day) {
        return `${Math.floor(diff / hour)} 小时前`;
    } else {
        return `${Math.floor(diff / day)} 天前`;
    }
}

// 主题切换功能
function initThemeToggle() {
    // 页面加载时检查并设置主题
    const savedTheme = localStorage.getItem('theme');
    const htmlElement = document.documentElement;
    const themeButton = document.getElementById('theme-toggle');
    
    if (savedTheme === 'light') {
        htmlElement.classList.remove('dark');
        updateThemeIcon(false); // false表示浅色模式
    } else {
        htmlElement.classList.add('dark');
        updateThemeIcon(true); // true表示深色模式
    }
    
    // 为主题切换按钮添加事件监听器
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const htmlElement = document.documentElement;
    const isDarkMode = htmlElement.classList.contains('dark');
    
    if (isDarkMode) {
        // 切换到浅色模式
        htmlElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateThemeIcon(false);
    } else {
        // 切换到深色模式
        htmlElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDarkMode) {
    const themeButton = document.getElementById('theme-toggle');
    if (themeButton) {
        const icon = themeButton.querySelector('i');
        if (icon) {
            if (isDarkMode) {
                // 深色模式显示月亮图标
                icon.className = 'fas fa-moon';
            } else {
                // 浅色模式显示太阳图标
                icon.className = 'fas fa-sun';
            }
        }
    }
}

// 导航栏搜索跳转功能
function initSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // 搜索输入框回车事件
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // 搜索按钮点击事件
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const query = searchInput.value.trim();
        if (query) {
            // URL编码搜索词并跳转到搜索页面
            const encodedQuery = encodeURIComponent(query);
            window.location.href = `search.html?query=${encodedQuery}`;
        }
    }
}

// 获取游戏数据的工具函数
function getGameById(gameId) {
    return allGames.find(game => game.id === gameId);
}

function getGamesByCategory(category) {
    return allGames.filter(game => game.category === category);
}

function searchGames(query) {
    const lowercaseQuery = query.toLowerCase();
    return allGames.filter(game => 
        game.name.toLowerCase().includes(lowercaseQuery) ||
        game.description.toLowerCase().includes(lowercaseQuery) ||
        game.category.toLowerCase().includes(lowercaseQuery)
    );
}

// ==================== 全局事件委托和初始化 ====================

// 全局事件委托设置 - 确保在任何时候都有效
function setupGlobalEventDelegation() {
    console.log('设置全局事件委托...');
    
    // 移除之前的监听器（如果存在）
    if (window.globalClickHandler) {
        document.removeEventListener('click', window.globalClickHandler);
    }
    
    // 创建新的点击处理器
    window.globalClickHandler = function(event) {
        console.log('全局点击事件触发:', event.target);
        
        const target = event.target;
        const button = target.closest('[data-action]');
        
        if (!button) {
            console.log('未找到data-action元素，忽略点击');
            return;
        }
        
        const action = button.dataset.action;
        const gameId = button.dataset.gameId;
        
        console.log('检测到按钮点击:', { 
            action, 
            gameId, 
            buttonElement: button,
            targetElement: target,
            buttonText: button.textContent?.trim()
        });
        
        if (!gameId) {
            console.error('游戏ID缺失，按钮:', button);
            return;
        }
        
        // 防止默认行为和事件冒泡
        event.preventDefault();
        event.stopPropagation();
        
        switch (action) {
            case 'play':
                console.log('=== 执行开始游戏 ===');
                console.log('游戏ID:', gameId);
                try {
                    startGame(gameId);
                } catch (error) {
                    console.error('startGame执行失败:', error);
                    alert('启动游戏失败: ' + error.message);
                }
                break;
                
            case 'favorite':
                console.log('=== 执行收藏切换 ===');
                console.log('游戏ID:', gameId);
                try {
                    toggleGameFavorite(gameId, event);
                } catch (error) {
                    console.error('toggleGameFavorite执行失败:', error);
                }
                break;
                
            default:
                console.log('未知的操作:', action);
        }
    };
    
    // 添加事件监听器
    document.addEventListener('click', window.globalClickHandler, true); // 使用捕获模式
    console.log('✅ 全局事件委托设置完成');
}

// 立即设置事件委托，不等待DOM加载
setupGlobalEventDelegation();

// 页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化...');
    
    // 确保事件委托正常工作
    setupGlobalEventDelegation();
    
    // 2. 基础功能初始化
    console.log('初始化基础功能...');
    initThemeToggle();
    initSearchFunctionality();
    GameCommunicator.init();
    
    // 3. 页面特定初始化
    const currentPage = window.location.pathname.split('/').pop();
    console.log('当前页面:', currentPage);
    
    switch (currentPage) {
        case 'index.html':
        case '':
            console.log('初始化首页功能');
            initHomePage();
            break;
        case 'favorites.html':
            console.log('初始化收藏页面功能');
            initFavoritesPage();
            break;
        case 'recent.html':
            console.log('初始化最近页面功能');
            initRecentPage();
            break;
        default:
            console.log('通用页面，跳过特殊初始化');
    }
    
    console.log('所有初始化完成');
}); 