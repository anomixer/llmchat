import axios from 'axios';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

// ==========================================
// 0. 搜尋關鍵字淨化與過濾器 (Query Preprocessor)
// ==========================================
function cleanQuery(query: string): string {
    let q = query.trim();
    
    // 1. 移除口語標點符號與問號
    q = q.replace(/[?？!！,，.。~`_#\^&\*\(\)\+=\{\}\[\];:："’]/g, ' ');
    
    // 2. 移除常見的對話式前綴填補詞
    const prefixFillers = [
        /請幫我搜尋/g,
        /幫我搜尋/g,
        /請幫我查一下/g,
        /幫我查一下/g,
        /請幫我查/g,
        /幫我查/g,
        /我想查詢/g,
        /我想查/g,
        /請查一下/g,
        /請查/g,
        /查一下/g,
        /你知道嗎/g,
        /你知道/g,
        /請問/g,
        /我想問/g,
        /請搜尋/g,
        /搜尋/g,
        /查/g
    ];
    
    for (const filler of prefixFillers) {
        q = q.replace(filler, '');
    }
    
    // 英文常用前綴詞過濾
    const enPrefixFillers = [
        /please\s+search\s+for\s+/gi,
        /search\s+for\s+/gi,
        /what\s+is\s+the\s+weather\s+in\s+/gi,
        /weather\s+in\s+/gi,
        /how\s+is\s+the\s+weather\s+in\s+/gi,
        /show\s+me\s+the\s+weather\s+in\s+/gi,
        /tell\s+me\s+about\s+the\s+weather\s+in\s+/gi,
        /what's\s+the\s+weather\s+in\s+/gi
    ];
    for (const filler of enPrefixFillers) {
        q = q.replace(filler, '');
    }
    
    // 3. 移除常見的對話式尾碼詞
    const suffixFillers = [
        /有什麼/g,
        /是什麼/g,
        /在哪裡/g,
        /怎麼辦/g,
        /可以嗎/g,
        /嗎/g,
        /呢/g,
        /啊/g
    ];
    
    for (const filler of suffixFillers) {
        q = q.replace(filler, '');
    }
    
    q = q.trim();
    
    // 4. 天氣與多意圖專屬關鍵字優化
    const lowerQ = q.toLowerCase();
    
    // 輔助檢查函式：包含繁中、簡中、英文、日文或韓文關鍵字
    const hasKeywords = (kwList: string[]) => {
        return kwList.some(kw => lowerQ.includes(kw.toLowerCase()));
    };

    // 各大意圖關鍵字庫 (支援 繁中、簡中、英文、日文、韓文)
    const weatherKws = [
        '天氣', '氣溫', '下雨', '雨', '氣候', '溫度', '預報',
        '天气', '气温', '下雨', '雨', '气候', '温度', '预报',
        'weather', 'forecast', 'rain', 'temp', 'climate',
        '天気', '気温', '雨', '予報',
        '날씨', '기온', '비', '예보', '눈'
    ];
    
    const movieKws = [
        '電影', '片單', '上映', '新片', '好片', '推薦',
        '电影', '片单', '上映', '新片', '好片', '推荐',
        'movie', 'film', 'cinema', 'showing', 'recommend',
        '映画', '上映', 'おすすめ', 'シネマ',
        '영화', '상영', '추천', '극장'
    ];
    
    const newsKws = [
        '新聞', '消息', '頭條', '事件', '即時',
        '新闻', '消息', '头条', '事件', '即时',
        'news', 'headline', 'breaking', 'sokuhou',
        'ニュース', '速報', 'ヘッドライン', '出来事',
        '뉴스', '속보', '헤드라인'
    ];
    
    const exchangeKws = [
        '匯率', '換匯', '日圓', '日幣', '美金', '外匯', '貨幣',
        '汇率', '换汇', '日元', '日币', '美金', '外汇', '货币',
        'exchange rate', 'currency', 'fx rate', 'rate',
        '為替', 'レート', '両替', '換算',
        '환율', '환전', '차트'
    ];
    
    const priceKws = [
        '物價', '蛋價', '金價', '油價', '價格', '房價', '價錢',
        '物价', '蛋价', '金价', '油价', '价格', '房价', '价钱',
        'commodity price', 'inflation', 'price', 'cost',
        '物価', '価格', 'インフレ', '値段',
        '물가', '가격', '인플레이션', '요금'
    ];
    
    const versionKws = [
        '最新版本', '新版', '版本', '更新',
        '最新版本', '新版', '版本', '更新',
        'latest version', 'new release', 'version', 'update',
        '最新バージョン', '新版', 'リリース', 'アプデ',
        '최신 버전', '업데이트', '출시'
    ];
    
    const travelKws = [
        '行程', '景點', '好玩', '店家', '餐廳', '美食', '旅遊', '推薦', '評價',
        '行程', '景点', '好玩', '店家', '餐厅', '美食', '旅游', '推荐', '评价',
        'itinerary', 'restaurant', 'travel guide', 'sightseeing', 'tourist', 'tourism',
        '観光', '旅行', 'グルメ', 'レストラン', '日程', 'おすすめ',
        '일정', '관광', '맛집', '추천', '가이드'
    ];
    
    const flightKws = [
        '航班', '機票', '飛機票', '票價', '航空',
        '航班', '机票', '飞机票', '票价', '航空',
        'flight', 'airfare', 'airline', 'flight ticket',
        '航空券', '格安航空券', 'フライト', '便名',
        '항공권', '비행기표', '항공', '예약'
    ];
    
    const hotelKws = [
        '酒店', '飯店', '民宿', '住宿', '旅館', '訂房',
        '酒店', '饭店', '民宿', '住宿', '旅馆', '订房',
        'hotel', 'hostel', 'accommodation', 'booking', 'stay',
        'ホテル', '旅館', '民宿', '予約', '宿泊',
        '호텔', '숙박', '예약', '펜션'
    ];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // 天氣優化
    if (hasKeywords(weatherKws)) {
        // 中文天氣優化
        const cityMatch = q.match(/([\u4e00-\u9fa5]{2,4}?)(?=天氣|氣溫|下雨|雨|天气|气温|下雨|雨)/);
        if (cityMatch && cityMatch[1]) {
            const city = cityMatch[1].replace(/今天|明天|後天|今天|明天|后天/g, '');
            if (city.length >= 2) {
                return `${city}天氣預報`;
            }
        }
        
        // 英文、日文、韓文天氣優化 (e.g. "Tokyo weather" -> "Tokyo weather forecast")
        if (lowerQ.includes('weather') || lowerQ.includes('forecast') || lowerQ.includes('天気') || lowerQ.includes('날씨')) {
            const enCityMatch = q.match(/([a-zA-Z\s]+)(?=weather|forecast)/i);
            if (enCityMatch && enCityMatch[1]) {
                const enCity = enCityMatch[1].replace(/next\s+week|tomorrow|today|next\s+few\s+days/gi, '').trim();
                if (enCity.length >= 2) {
                    return `${enCity} weather forecast`;
                }
            }
        }
        
        // 日文天氣後置優化
        if (lowerQ.includes('天気') && !lowerQ.includes('予報')) {
            return `${q} 予報`;
        }
        // 韓文天氣後置優化
        if (lowerQ.includes('날씨') && !lowerQ.includes('예보')) {
            return `${q} 예보`;
        }
        
        if (!q.includes('預報') && !q.includes('预报') && !lowerQ.includes('forecast') && !lowerQ.includes('weather') && !lowerQ.includes('天気') && !lowerQ.includes('날씨')) {
            q = q + ' 預報';
        }
    }

    // 5. 電影專屬關鍵字優化
    if (hasKeywords(movieKws)) {
        const isGeneralMovieQuery = 
            hasKeywords(['最近', '推薦', '上映', '好片', '新片', '有什麼', 'recent', 'recommend', 'showing', 'new', 'おすすめ', '추천', '상영', '영화', '推荐', '新片']) ||
            q.length <= 4;
            
        if (isGeneralMovieQuery) {
            const isEnglish = lowerQ.includes('movie') || lowerQ.includes('film') || lowerQ.includes('cinema');
            const isJapanese = lowerQ.includes('映画') || lowerQ.includes('シネマ') || lowerQ.includes('おすすめ');
            const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
            
            if (isEnglish) {
                if (!lowerQ.includes(String(year))) {
                    const monthsEng = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthEng = monthsEng[now.getMonth()];
                    return `${year} ${monthEng} movie recommendations`;
                }
            } else if (isJapanese) {
                if (!lowerQ.includes(String(year))) {
                    return `${year}年${month}月 映画 おすすめ`;
                }
            } else if (isKorean) {
                if (!lowerQ.includes(String(year))) {
                    return `${year}년 ${month}월 영화 추천`;
                }
            } else {
                if (!q.includes(String(year))) {
                    return `${year}年${month}月 上映電影 推薦`;
                }
            }
        }
    }

    // 6. 新聞專屬關鍵字優化
    if (hasKeywords(newsKws)) {
        if (!q.includes(String(year))) {
            const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
            const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
            const isEnglish = !/[\u4e00-\u9fa5\uac00-\ud7af\u3040-\u30ff]/.test(lowerQ);
            if (isKorean) {
                return `${q} ${year}년 ${month}월 ${day}일`;
            } else if (isJapanese) {
                return `${q} ${year}年${month}月${day}日`;
            } else if (isEnglish) {
                return `${q} ${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
            } else {
                return `${q} ${year}年${month}月${day}日`;
            }
        }
    }

    // 7. 匯率專屬關鍵字優化
    if (hasKeywords(exchangeKws) && !hasKeywords(weatherKws) && !hasKeywords(movieKws)) {
        const hasTrendWord = hasKeywords(['走勢', '即時', 'chart', 'live', 'レート', '両替', '為替', '환율', '환전', '차트', '走势', '即时']);
        if (!hasTrendWord) {
            const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
            const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
            const isEnglish = !/[\u4e00-\u9fa5\uac00-\ud7af\u3040-\u30ff]/.test(lowerQ);
            
            if (isKorean) {
                return `${q} 실시간 환율 차트`;
            } else if (isJapanese) {
                return `${q} リアルタイム チャート`;
            } else if (isEnglish) {
                return `${q} live chart`;
            } else {
                return `${q} 即時 走勢`;
            }
        }
    }

    // 8. 物價專屬關鍵字優化
    if (hasKeywords(priceKws) && !lowerQ.includes('stock') && !lowerQ.includes('share price')) {
        if (!q.includes(String(year))) {
            const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
            const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
            const isEnglish = !/[\u4e00-\u9fa5\uac00-\ud7af\u3040-\u30ff]/.test(lowerQ);
            if (isKorean) {
                return `${q} ${year}년 ${month}월 최신 가격`;
            } else if (isJapanese) {
                return `${q} ${year}年${month}月 最新価格`;
            } else if (isEnglish) {
                return `${q} latest price ${year}`;
            } else {
                return `${q} ${year}年${month}月 最新價格`;
            }
        }
    }

    // 9. 最新版本專屬關鍵字優化
    if (hasKeywords(versionKws)) {
        if (!q.includes(String(year)) && !hasKeywords(movieKws)) {
            return `${q} ${year} release`;
        }
    }

    // 10. 店家/行程專屬關鍵字優化
    if (hasKeywords(travelKws) && !hasKeywords(movieKws) && !hasKeywords(newsKws)) {
        const hasRecommendWord = hasKeywords(['推薦', '評價', '規劃', 'guide', 'review', 'おすすめ', '旅行', '観光', '추천', '일정', '맛집', '推荐', '评价', '规划']);
        const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
        const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
        
        if (!hasRecommendWord) {
            if (isKorean) {
                return `${q} 맛집 추천 일정 ${year}년`;
            } else if (isJapanese) {
                return `${q} おすすめ 観光 ${year}年`;
            } else {
                return `${q} 推薦 評價 ${year}年`;
            }
        } else if (!q.includes(String(year))) {
            return `${q} ${year}年`;
        }
    }

    // 11. 航班與機票比價專屬優化
    if (hasKeywords(flightKws) && !hasKeywords(movieKws) && !hasKeywords(newsKws)) {
        const hasCompareWord = hasKeywords(['比價', '價格', '推薦', 'price', 'compare', '格安航空券', '航空券', '항공권', '비행기표', '比价', '价格', '推荐']);
        const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
        const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
        
        if (!hasCompareWord) {
            if (isKorean) {
                return `${q} 항공권 비교 추천 ${year}년`;
            } else if (isJapanese) {
                return `${q} 格安航空券 比較 おすすめ ${year}年`;
            } else {
                return `${q} 機票 比價 推薦 ${year}年`;
            }
        } else if (!q.includes(String(year))) {
            return `${q} 比價 ${year}年`;
        }
    }

    // 12. 飯店與酒店價格比價專屬優化
    if (hasKeywords(hotelKws) && !lowerQ.includes('travel guide') && !hasKeywords(newsKws)) {
        const hasCompareWord = hasKeywords(['比價', '價格', '訂房', 'price', 'booking', 'ホテル', '旅館', '予約', '호텔', '숙박', '예약', '比价', '价格', '订房']);
        const isKorean = /[\uac00-\ud7af]/.test(lowerQ);
        const isJapanese = /[\u3040-\u30ff]/.test(lowerQ);
        
        if (!hasCompareWord) {
            if (isKorean) {
                return `${q} 호텔 예약 비교 추천 ${year}년`;
            } else if (isJapanese) {
                return `${q} ホテル 予約 比較 おすすめ ${year}年`;
            } else {
                return `${q} 訂房 比價 推薦 ${year}年`;
            }
        } else if (!q.includes(String(year))) {
            return `${q} 比價 ${year}年`;
        }
    }
    
    return q || query;
}

// ==========================================
// 1. 雅虎搜尋主引擎 (Yahoo Search - Primary)
// ==========================================
async function searchYahoo(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const ua = USER_AGENTS[0];
    
    const response = await axios.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
        headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache'
        },
        timeout: 6000
    });

    const html = response.data;
    const aRegex = /<a[^>]*href="([^"]*r\.search\.yahoo\.com[^"]*\/RU=([^"\/&]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    const aMatches = [...html.matchAll(aRegex)];

    for (const match of aMatches) {
        const actualUrl = decodeURIComponent(match[2]);
        const innerContent = match[3];

        const h3Match = innerContent.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        if (!h3Match) continue;

        if (actualUrl.includes('yahoo.com') || actualUrl.includes('yahoo.co') || actualUrl.includes('bing.com')) {
            continue;
        }

        const rawTitle = h3Match[1].replace(/<[^>]*>/g, '').trim();

        const endOfAnchorIdx = html.indexOf(match[0]) + match[0].length;
        const remainingHtml = html.substring(endOfAnchorIdx, endOfAnchorIdx + 1200);

        const compTextMatch = remainingHtml.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        let snippet = '';
        if (compTextMatch) {
            snippet = compTextMatch[1].replace(/<[^>]*>/g, '').trim();
        } else {
            const pMatch = remainingHtml.match(/<p[^>]*class="[^"]*fc-dustygray[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
            snippet = pMatch ? pMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        }

        results.push({
            title: cleanEntities(rawTitle),
            url: actualUrl,
            snippet: cleanEntities(snippet) || '(無摘要說明)'
        });

        if (results.length >= 5) break;
    }
    
    return results;
}

// ==========================================
// 2. 百度搜尋備用引擎 (Baidu Search - Fallback)
// ==========================================
async function searchBaidu(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const ua = USER_AGENTS[1];
    
    const response = await axios.get(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, {
        headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache'
        },
        timeout: 5000
    });

    const html = response.data;
    const h3Regex = /<h3[^>]*class="[^"]*(t|c-title)[^"]*"[^>]*>([\s\S]*?)<\/h3>/g;
    const matches = [...html.matchAll(h3Regex)];

    for (const match of matches) {
        const h3Content = match[2];
        const aMatch = h3Content.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!aMatch) continue;

        const url = aMatch[1];
        const title = aMatch[2].replace(/<[^>]*>/g, '').trim();

        // 搜尋摘要，優先解析 JSON 序列化的 "text":"..."
        const endOfH3Idx = html.indexOf(match[0]) + match[0].length;
        const remainingHtml = html.substring(endOfH3Idx, endOfH3Idx + 1200);

        const jsonTextMatch = remainingHtml.match(/"text"\s*:\s*"([^"]+)"/);
        let snippet = '';
        if (jsonTextMatch) {
            snippet = jsonTextMatch[1]
                .replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => String.fromCharCode(parseInt(grp, 16)))
                .replace(/<[^>]*>/g, '')
                .replace(/\\n/g, ' ')
                .trim();
        }

        if (!snippet) {
            const abstractMatch = remainingHtml.match(/<div[^>]*class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (abstractMatch) {
                snippet = abstractMatch[1].replace(/<[^>]*>/g, '').trim();
            }
        }

        results.push({
            title: cleanEntities(title),
            url: url.startsWith('http') ? url : `https://www.baidu.com${url}`,
            snippet: cleanEntities(snippet) || '(無摘要說明)'
        });

        if (results.length >= 5) break;
    }
    
    return results;
}

// ==========================================
// 3. 實時氣象資料抓取與一週預報 (Real-time Weather & 7-Day Forecast)
// ==========================================
const TAIWAN_CITIES_COORDS: Record<string, { lat: number, lon: number, name: string }> = {
    '台北': { lat: 25.03, lon: 121.56, name: '台北市' },
    '臺北': { lat: 25.03, lon: 121.56, name: '台北市' },
    'taipei': { lat: 25.03, lon: 121.56, name: 'Taipei' },
    '新北': { lat: 25.01, lon: 121.46, name: '新北市' },
    'newtaipei': { lat: 25.01, lon: 121.46, name: 'New Taipei' },
    '桃園': { lat: 24.99, lon: 121.30, name: '桃園市' },
    'taoyuan': { lat: 24.99, lon: 121.30, name: 'Taoyuan' },
    '新竹': { lat: 24.81, lon: 120.97, name: '新竹縣市' },
    'hsinchu': { lat: 24.81, lon: 120.97, name: 'Hsinchu' },
    '苗栗': { lat: 24.56, lon: 120.82, name: '苗栗縣' },
    'miaoli': { lat: 24.56, lon: 120.82, name: 'Miaoli' },
    '台中': { lat: 24.14, lon: 120.67, name: '台中市' },
    '臺中': { lat: 24.14, lon: 120.67, name: '台中市' },
    'taichung': { lat: 24.14, lon: 120.67, name: 'Taichung' },
    '彰化': { lat: 24.08, lon: 120.54, name: '彰化縣' },
    'changhua': { lat: 24.08, lon: 120.54, name: 'Changhua' },
    '南投': { lat: 23.91, lon: 120.68, name: '南投縣' },
    'nantou': { lat: 23.91, lon: 120.68, name: 'Nantou' },
    '雲林': { lat: 23.70, lon: 120.43, name: '雲林縣' },
    'yunlin': { lat: 23.70, lon: 120.43, name: 'Yunlin' },
    '嘉義': { lat: 23.48, lon: 120.44, name: '嘉義縣市' },
    'chiayi': { lat: 23.48, lon: 120.44, name: 'Chiayi' },
    '台南': { lat: 22.99, lon: 120.21, name: '台南市' },
    '臺南': { lat: 22.99, lon: 120.21, name: '台南市' },
    'tainan': { lat: 22.99, lon: 120.21, name: 'Tainan' },
    '高雄': { lat: 22.62, lon: 120.30, name: '高雄市' },
    'kaohsiung': { lat: 22.62, lon: 120.30, name: 'Kaohsiung' },
    '屏東': { lat: 22.67, lon: 120.48, name: '屏東縣' },
    'pingtung': { lat: 22.67, lon: 120.48, name: 'Pingtung' },
    '基隆': { lat: 25.12, lon: 121.73, name: '基隆市' },
    'keelung': { lat: 25.12, lon: 121.73, name: 'Keelung' },
    '宜蘭': { lat: 24.75, lon: 121.75, name: '宜蘭縣' },
    'yilan': { lat: 24.75, lon: 121.75, name: 'Yilan' },
    '花蓮': { lat: 23.97, lon: 121.60, name: '花蓮縣' },
    'hualien': { lat: 23.97, lon: 121.60, name: 'Hualien' },
    '台東': { lat: 22.75, lon: 121.15, name: '台東縣' },
    '臺東': { lat: 22.75, lon: 121.15, name: '台東縣' },
    'taitung': { lat: 22.75, lon: 121.15, name: 'Taitung' },
    '澎湖': { lat: 23.57, lon: 119.57, name: '澎湖縣' },
    'penghu': { lat: 23.57, lon: 119.57, name: 'Penghu' },
    '金門': { lat: 24.44, lon: 118.37, name: '金門縣' },
    'kinmen': { lat: 24.44, lon: 118.37, name: 'Kinmen' },
    '馬祖': { lat: 26.15, lon: 119.93, name: '連江馬祖' },
    'matsu': { lat: 26.15, lon: 119.93, name: 'Matsu' }
};

const INTL_CITIES_COORDS: Record<string, { lat: number, lon: number, name: string }> = {
    '東京': { lat: 35.6762, lon: 139.6503, name: '東京' },
    'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
    '首爾': { lat: 37.5665, lon: 126.9780, name: '首爾' },
    'seoul': { lat: 37.5665, lon: 126.9780, name: 'Seoul' },
    '北京': { lat: 39.9042, lon: 116.4074, name: '北京' },
    'beijing': { lat: 39.9042, lon: 116.4074, name: 'Beijing' },
    '上海': { lat: 31.2304, lon: 121.4737, name: '上海' },
    'shanghai': { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
    '香港': { lat: 22.3193, lon: 114.1694, name: '香港' },
    'hongkong': { lat: 22.3193, lon: 114.1694, name: 'Hong Kong' },
    '紐約': { lat: 40.7128, lon: -74.0060, name: '紐約' },
    'newyork': { lat: 40.7128, lon: -74.0060, name: 'New York' },
    '倫敦': { lat: 51.5074, lon: -0.1278, name: '倫敦' },
    'london': { lat: 51.5074, lon: -0.1278, name: 'London' },
    '巴黎': { lat: 48.8566, lon: 2.3522, name: '巴黎' },
    'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
    '新加坡': { lat: 1.3521, lon: 103.8198, name: '新加坡' },
    'singapore': { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
    '曼谷': { lat: 13.7563, lon: 100.5018, name: '曼谷' },
    'bangkok': { lat: 13.7563, lon: 100.5018, name: 'Bangkok' }
};

function getWmoDesc(code: number): string {
    if (code === 0) return '晴朗無雲 ☀️';
    if (code === 1 || code === 2 || code === 3) return '晴時多雲/多雲 🌤️';
    if (code === 45 || code === 48) return '有霧 🌫️';
    if (code === 51 || code === 53 || code === 55) return '毛毛雨 🌧️';
    if (code === 56 || code === 57) return '凍毛毛雨 🌧️';
    if (code === 61 || code === 63 || code === 65) return '下雨/陣雨 🌧️';
    if (code === 66 || code === 67) return '凍雨 🌧️';
    if (code === 71 || code === 73 || code === 75) return '下雪 ❄️';
    if (code === 77) return '冰珠 ❄️';
    if (code === 80 || code === 81 || code === 82) return '短暫陣雨 🌦️';
    if (code === 85 || code === 86) return '陣雪 ❄️';
    if (code === 95) return '雷陣雨 ⛈️';
    if (code === 96 || code === 99) return '雷陣雨伴隨冰雹 ⛈️';
    return '多雲 ☁️';
}

function getWeekday(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return days[date.getDay()];
    } catch {
        return '';
    }
}

async function fetchOpenMeteoWeather(lat: number, lon: number, cityName: string): Promise<string> {
    try {
        console.log(`[SearchService] 正在從 Open-Meteo 獲取「${cityName}」的一週預報...`);
        const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Asia/Taipei`, {
            timeout: 5000
        });
        
        const daily = response.data.daily;
        if (!daily || !daily.time || daily.time.length === 0) {
            return '';
        }
        
        let report = `【${cityName} 一週氣象預報 (7天詳細預報 - Open-Meteo)】\n`;
        for (let i = 0; i < daily.time.length; i++) {
            const dateStr = daily.time[i];
            const weekday = getWeekday(dateStr);
            const maxTemp = daily.temperature_2m_max[i];
            const minTemp = daily.temperature_2m_min[i];
            const rainProb = daily.precipitation_probability_max[i] ?? 0;
            const wmoCode = daily.weather_code[i] ?? 3;
            const desc = getWmoDesc(wmoCode);
            
            report += `● ${dateStr} (${weekday})：${desc} | 溫度：${minTemp}°C ~ ${maxTemp}°C | 降雨機率：${rainProb}%\n`;
        }
        return report;
    } catch (err: any) {
        console.warn(`[SearchService] Open-Meteo 獲取失敗:`, err.message);
        return '';
    }
}

async function fetchRealtimeWeather(query: string): Promise<string> {
    try {
        let city = '';
        const lowerQuery = query.toLowerCase().replace(/\s+/g, '');
        
        // 1. 優先在已知地圖坐標中搜尋精確匹配的都市名
        for (const cityName of Object.keys(TAIWAN_CITIES_COORDS)) {
            if (lowerQuery.includes(cityName)) {
                city = cityName;
                break;
            }
        }
        if (!city) {
            for (const cityName of Object.keys(INTL_CITIES_COORDS)) {
                if (lowerQuery.includes(cityName)) {
                    city = cityName;
                    break;
                }
            }
        }

        // 2. 如果地圖中沒有匹配到，再使用 Regex 作為備份提取
        if (!city) {
            // 中文地名匹配
            const cityMatch = query.match(/([\u4e00-\u9fa5]{2,4}?)(?=天氣|氣溫|下雨|雨|氣候|溫度|晴)/) 
                || query.match(/([\u4e00-\u9fa5]{2,4})/);
            if (cityMatch && cityMatch[1]) {
                city = cityMatch[1].replace(/今天|明天|後天|今年|明年|未來|下週|下周|一週|一星期的/g, '').trim();
            }
        }
        
        // 英文地名匹配備份 (e.g. "weather in Tokyo" -> "Tokyo")
        if (!city) {
            const enMatch = query.match(/weather\s+in\s+([a-zA-Z\s]+)/i)
                || query.match(/forecast\s+for\s+([a-zA-Z\s]+)/i);
            if (enMatch && enMatch[1]) {
                city = enMatch[1].trim();
            }
        }
        
        if (!city) city = '台北';
        
        // 正規化地名
        const normCity = city.toLowerCase().replace(/市|縣/g, '').replace(/\s+/g, '');
        
        // A. 優先嘗試 Open-Meteo 7 天氣象預報
        const coords = TAIWAN_CITIES_COORDS[normCity] || INTL_CITIES_COORDS[normCity];
        if (coords) {
            const openMeteoData = await fetchOpenMeteoWeather(coords.lat, coords.lon, coords.name);
            if (openMeteoData) {
                // 順便獲取當前實時溫度作加強
                let currentReport = '';
                try {
                    console.log(`[SearchService] 正在獲取「${city}」目前實時氣溫...`);
                    const wttrRes = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=3`, { timeout: 3000 });
                    if (wttrRes.data) {
                        currentReport = `● 目前實時氣溫：${wttrRes.data.replace(/.*:\s*/, '').trim()}\n`;
                    }
                } catch {}
                
                if (currentReport) {
                    return openMeteoData.replace('\n', `\n${currentReport}`);
                }
                return openMeteoData;
            }
        }
        
        // B. 備用 wttr.in 預報（針對自定義或其他地名，輸出全部可用天數）
        console.log(`[SearchService] 未匹配地名坐標，正在從 wttr.in 獲取「${city}」預報...`);
        const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
            headers: {
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 5000
        });
        
        const data = response.data;
        if (!data || !data.current_condition || !data.current_condition[0]) {
            return '';
        }
        
        const current = data.current_condition[0];
        
        let weatherReport = `【${city} 實時氣象數據與預報 (wttr.in)】\n`;
        weatherReport += `● 目前溫度：${current.temp_C}°C (體感溫度：${current.FeelsLikeC}°C)\n`;
        
        const weatherDescRaw = current.weatherDesc?.[0]?.value || '未知';
        const weatherDescMap: Record<string, string> = {
            'Clear': '晴朗', 'Sunny': '晴天', 'Partly cloudy': '多雲時晴', 'Partly Cloudy': '多雲時晴',
            'Cloudy': '多雲', 'Overcast': '陰天', 'Mist': '有霧', 'Patchy rain nearby': '局部短暫雨',
            'Patchy rain possible': '可能有局部雨', 'Light rain': '小雨', 'Light Rain': '小雨',
            'Moderate rain': '中雨', 'Heavy rain': '大雨', 'Thundery outbreaks possible': '可能有雷陣雨'
        };
        const weatherDesc = weatherDescMap[weatherDescRaw.trim()] || weatherDescRaw;
        
        weatherReport += `● 天氣狀況：${weatherDesc} (${weatherDescRaw})\n`;
        weatherReport += `● 空氣濕度：${current.humidity}%\n`;
        weatherReport += `● 風速：${current.windspeedKmph} km/h (風向：${current.winddir16Point})\n`;
        
        if (data.weather && data.weather.length > 0) {
            weatherReport += `● 未來氣候預報：\n`;
            data.weather.forEach((dayForecast: any) => {
                const day = dayForecast.hourly?.[4] || dayForecast.hourly?.[0];
                const rainProb = day ? (day.chanceofrain || 0) : 0;
                weatherReport += `  - ${dayForecast.date}：${dayForecast.mintempC}°C ~ ${dayForecast.maxtempC}°C | 降雨機率：${rainProb}%\n`;
            });
        }
        
        return weatherReport;
    } catch (err: any) {
        console.warn(`[SearchService] 獲取實時天氣失敗 (wttr.in):`, err.message);
        return '';
    }
}

// ==========================================
// 4. 實時股價資料抓取 (Real-time Stock Market Quotes)
// ==========================================
const POPULAR_STOCKS_MAP: Record<string, string> = {
    '台積電': '2330', 'tsmc': '2330',
    '鴻海': '2317', 'foxconn': '2317',
    '聯發科': '2454', 'mediatek': '2454',
    '廣達': '2382', 'quanta': '2382',
    '台達電': '2308', 'deltan': '2308',
    '長榮': '2603', 'evergreen': '2603',
    '中信金': '2891', '兆豐金': '2886',
    '陽明': '2609', '萬海': '2615',
    '緯創': '3231', 'wistron': '3231',
    '技嘉': '2376', 'gigabyte': '2376',
    '奇鋐': '3017', '緯穎': '6669',
    '世芯': '3661', '創意': '3443',
    '星宇': '2646', '星宇航空': '2646',
    '華航': '2610', '長榮航': '2618',
    'nvidia': 'NVDA', '輝達': 'NVDA',
    'amd': 'AMD', '超微': 'AMD',
    'apple': 'AAPL', '蘋果': 'AAPL',
    'microsoft': 'MSFT', '微軟': 'MSFT',
    'tesla': 'TSLA', '特斯拉': 'TSLA',
    'google': 'GOOG', '谷歌': 'GOOG',
    'amazon': 'AMZN', '亞馬遜': 'AMZN',
    'meta': 'META',
    '0050': '0050', '台灣50': '0050',
    '0056': '0056', '高股息': '0056',
    '00878': '00878', '00929': '00929',
    '00940': '00940', '006208': '006208'
};

async function fetchSingleStock(target: string): Promise<string> {
    try {
        console.log(`[SearchService] 正在從 Yahoo 奇摩股市獲取「${target}」的實時交易數據...`);
        const response = await axios.get(`https://tw.stock.yahoo.com/quote/${encodeURIComponent(target)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });
        
        const html = response.data;
        
        const priceMatch = html.match(/class="[^"]*Fz\(32px\)[^"]*">([^<]+)<\/span>/);
        if (!priceMatch) {
            return '';
        }
        
        const price = priceMatch[1];
        
        const priceIndex = html.indexOf('Fz(32px)');
        let change = '0.00';
        let percent = '0.00%';
        let trend = '平盤';
        let updateTime = '';
        
        if (priceIndex !== -1) {
            const nearHtml = html.substring(priceIndex, priceIndex + 1000);
            
            const spanRegex = /<span class="([^"]*Fz\(20px\)[^"]*)">([\s\S]*?)<\/span>/g;
            const matches = [...nearHtml.matchAll(spanRegex)];
            
            const numericMatches = matches.filter(m => {
                const text = m[2].replace(/<[^>]*>/g, '').trim();
                return /\d/.test(text);
            });
            
            const changeMatch = numericMatches[0];
            if (changeMatch) {
                const rawChange = changeMatch[2].replace(/<[^>]*>/g, '').trim();
                change = rawChange;
                const cls = changeMatch[1];
                if (cls.includes('trend-up') || cls.includes('up') || cls.includes('C($c-trend-up)')) {
                    trend = '漲 📈';
                    change = `+${rawChange}`;
                } else if (cls.includes('trend-down') || cls.includes('down') || cls.includes('C($c-trend-down)')) {
                    trend = '跌 📉';
                    change = `-${rawChange}`;
                }
            }
            
            const percentSpanMatch = nearHtml.match(/<span class="[^"]*Jc\(fe\)[^"]*">([^<]+)<\/span>/);
            if (percentSpanMatch) {
                percent = percentSpanMatch[1];
                if (trend.includes('漲')) {
                    percent = `+${percent.replace(/[\(\)]/g, '')}`;
                } else if (trend.includes('跌')) {
                    percent = `-${percent.replace(/[\(\)]/g, '')}`;
                }
            } else if (numericMatches[1]) {
                const rawPercent = numericMatches[1][2].replace(/<[^>]*>/g, '').trim();
                percent = rawPercent;
                if (trend.includes('漲') && !percent.startsWith('+')) {
                    percent = `+${percent.replace(/[\(\)]/g, '')}`;
                } else if (trend.includes('跌') && !percent.startsWith('-')) {
                    percent = `-${percent.replace(/[\(\)]/g, '')}`;
                }
            }
            
            const updateSpanMatch = nearHtml.match(/<span class="[^"]*C\(#6e7780\)[^"]*">([^<]+)<\/span>/);
            if (updateSpanMatch) {
                updateTime = updateSpanMatch[2] || updateSpanMatch[1];
            }
        }
        
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        let stockName = target;
        if (titleMatch && titleMatch[1]) {
            stockName = titleMatch[1].replace(/\|.*/, '').replace(/-.*/, '').trim();
        }
        
        let report = `【${stockName} 實時股價行情與交易數據 (Yahoo 奇摩股市)】\n`;
        report += `● 當前股價：${price}\n`;
        report += `● 漲跌狀況：${trend} (${change} | ${percent})\n`;
        if (updateTime) {
            report += `● 資料狀態：${updateTime}\n`;
        }
        return report;
    } catch (err: any) {
        return '';
    }
}

async function fetchRealtimeStock(query: string): Promise<string> {
    try {
        const targets = new Set<string>();
        const lowerQuery = query.toLowerCase();
        
        // 1. 優先匹配熱門股名稱
        for (const [stockName, ticker] of Object.entries(POPULAR_STOCKS_MAP)) {
            if (lowerQuery.includes(stockName)) {
                targets.add(ticker);
            }
        }
        
        // 2. 正則提取數字（台股代碼 4-6 位）
        const codeMatches = query.matchAll(/(\d{4,6})/g);
        for (const match of codeMatches) {
            if (match[1]) {
                targets.add(match[1]);
            }
        }
        
        // 3. 正則提取美股 ticker（3-5 位）並排除常見字詞
        const EXCLUDED_WORDS = new Set([
            'VS', 'STOCK', 'PRICE', 'NEWS', 'CHART', 'INFO', 'THE', 'AND', 'FOR', 
            'WHAT', 'HOW', 'WITH', 'THAT', 'THIS', 'FROM', 'ANY', 'GET', 'NOW', 
            'OUT', 'TODAY', 'WEEK', 'NEXT', 'LAST', 'GOOD', 'BEST', 'LIKE', 'LOVE', 'SHOW'
        ]);
        const usTickerMatches = query.matchAll(/\b([a-zA-Z]{3,5})\b/g);
        for (const match of usTickerMatches) {
            if (match[1]) {
                const ticker = match[1].toUpperCase();
                if (!EXCLUDED_WORDS.has(ticker)) {
                    targets.add(ticker);
                }
            }
        }
        
        if (targets.size === 0) return '';
        
        const targetList = Array.from(targets);
        console.log(`[SearchService] 偵測到多股價查詢，清單: ${JSON.stringify(targetList)}`);
        
        const fetchPromises = targetList.map(async (target) => {
            return fetchSingleStock(target);
        });
        
        const results = await Promise.all(fetchPromises);
        const validReports = results.filter(r => r !== '');
        
        if (validReports.length === 0) return '';
        return validReports.join('\n\n');
    } catch (err: any) {
        console.warn(`[SearchService] 獲取多重實時股價失敗:`, err.message);
        return '';
    }
}

// ==========================================
// 5. 入口控制 (Entry Control)
// ==========================================
export async function searchWeb(query: string): Promise<string> {
    const cleanedQuery = cleanQuery(query);
    console.log(`[SearchService] 提問淨化: "${query}" -> 搜尋字詞: "${cleanedQuery}"`);
    
    // A. 偵測氣象查詢
    let weatherData = '';
    const lowerRawQuery = query.toLowerCase();
    const isWeatherQuery = 
        query.includes('天氣') || query.includes('氣溫') || query.includes('下雨') || query.includes('溫度') || query.includes('氣候') || query.includes('降雨') || query.includes('雨') ||
        lowerRawQuery.includes('weather') || lowerRawQuery.includes('temp') || lowerRawQuery.includes('forecast') || lowerRawQuery.includes('rain') || lowerRawQuery.includes('wind') || lowerRawQuery.includes('climate');
        
    if (isWeatherQuery) {
        weatherData = await fetchRealtimeWeather(query);
    }

    // B. 偵測股價查詢
    let stockData = '';
    const isStockQuery =
        query.includes('股價') || query.includes('股票') || query.includes('漲跌') || query.includes('開盤') || query.includes('收盤') ||
        lowerRawQuery.includes('stock') || lowerRawQuery.includes('price') || lowerRawQuery.includes('share price') ||
        /\b([a-zA-Z]{3,5})\b/.test(query) || /(\d{4,6})/.test(query);
        
    if (isStockQuery) {
        stockData = await fetchRealtimeStock(query);
    }

    let finalResults: SearchResult[] = [];
    
    try {
        console.log(`[SearchService] 嘗試使用主引擎 (Yahoo)...`);
        finalResults = await searchYahoo(cleanedQuery);
    } catch (error: any) {
        console.warn(`[SearchService] Yahoo 主引擎載入失敗:`, error.message);
    }
    
    if (finalResults.length === 0) {
        try {
            console.log(`[SearchService] 自動啟用備用防封引擎 (Baidu)...`);
            finalResults = await searchBaidu(cleanedQuery);
        } catch (fallbackError: any) {
            console.error(`[SearchService] Baidu 備用引擎亦載入失敗:`, fallbackError.message);
        }
    }
    
    let organicResults = '';
    if (finalResults.length > 0) {
        organicResults = finalResults.map((res, index) => {
            return `${index + 1}. 標題：${res.title}\n   連結：${res.url}\n   摘要：${res.snippet}`;
        }).join('\n\n');
    }

    if (stockData) {
        if (organicResults) {
            return `${stockData}\n\n【網路相關文章與參考連結】\n${organicResults}`;
        } else {
            return stockData;
        }
    }

    if (weatherData) {
        if (organicResults) {
            return `${weatherData}\n\n【網路相關文章與參考連結】\n${organicResults}`;
        } else {
            return weatherData;
        }
    }

    if (finalResults.length === 0) {
        console.error('[SearchService] 所有搜尋引擎皆無法檢索到結果。');
        return '';
    }

    console.log(`[SearchService] 搜尋成功，共取得 ${finalResults.length} 筆檢索資料`);
    return organicResults;
}

function cleanEntities(text: string): string {
    return text
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '-')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
