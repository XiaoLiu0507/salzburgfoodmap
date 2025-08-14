
const categories = [
    "African cuisine", "Japanese cuisine", "Italian cuisine", "Mexican cuisine",
    "Austrian cuisine", "Chinese cuisine", "Greek cuisine", "Nepalese cuisine",
    "Thai cuisine", "Croatian cuisine", "American fast food", "Indian cuisine",
    "Hawaiian cuisine", "Turkish cuisine", "Argentinian cuisine", "Vietnamese cuisine",
    "Sri Lankan cuisine", "Arabic cuisine", "Polish cuisine", "Korean cuisine",
    "Peruvian cuisine", "Portuguese cuisine"
].sort();

// 将每个分类与对应国旗图标映射
const flagIcons = {
    "African cuisine": "flags/africa.png",
    "Japanese cuisine": "flags/japan.png",
    "Italian cuisine": "flags/italy.png",
    "Mexican cuisine": "flags/mexico.png",
    "Austrian cuisine": "flags/austria.png",
    "Chinese cuisine": "flags/china.png",
    "Greek cuisine": "flags/greece.png",
    "Nepalese cuisine": "flags/nepal.png",
    "Thai cuisine": "flags/thailand.png",
    "Croatian cuisine": "flags/croatia.png",
    "American fast food": "flags/usa.png",
    "Indian cuisine": "flags/india.png",
    "Hawaiian cuisine": "flags/hawaii.png",
    "Turkish cuisine": "flags/turkey.png",
    "Argentinian cuisine": "flags/argentina.png",
    "Vietnamese cuisine": "flags/vietnam.png",
    "Sri Lankan cuisine": "flags/sri_lanka.png",
    "Arabic cuisine": "flags/arab_league.png",
    "Polish cuisine": "flags/poland.png",
    "Korean cuisine": "flags/korea.png",
    "Peruvian cuisine": "flags/peru.png",
    "Portuguese cuisine": "flags/portugal.png"
};

// 存储餐厅数据和marker引用
let allRestaurantData = [];
let allMarkers = [];
const markersByCategory = {};

// 使用Set存储用户收藏夹
const myFavorites = new Set();

// 构建popup内容，包括收藏星标
function getPopupContent(name, type, rating, user_ratings_total) {
    const isFav = myFavorites.has(name);
    // 如果在收藏夹中，则使用实心星标(★)，否则使用空心(☆)
    const star = isFav ? "★" : "☆";

    return `
        <div>
            <strong>${name}</strong>
            <button class="favorite-star"
                    data-name="${name}"
                    style="background:none; border:none; cursor:pointer; font-size:18px; margin-left:8px;">
                ${star}
            </button>
            <br>
            Type: ${type}<br>
            Rating: ${rating} (${user_ratings_total} reviews)
        </div>
    `;
}

// 切换收藏状态
function toggleFavorite(name, starElement) {
    if (myFavorites.has(name)) {
        myFavorites.delete(name);
        starElement.textContent = '☆'; // 取消收藏
    } else {
        myFavorites.add(name);
        starElement.textContent = '★'; // 收藏
    }
}

// 全局监听popup中的星标按钮点击
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('favorite-star')) {
        const restaurantName = e.target.getAttribute('data-name');
        toggleFavorite(restaurantName, e.target);
    }
});

// 设置地图对萨尔茨堡的边界
const salzburgBounds = [
    [47.67, 12.90],
    [47.95, 13.20]
];

// 初始化地图
const map = L.map('map', {
    zoomControl: false,
    maxBounds: salzburgBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 13
}).setView([47.8095, 13.0550], 13);

// 基础图层
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
});

// 图层控制（街道/卫星）
L.control.layers({
    'Street Map': streetLayer,
    'Satellite Imagery': satelliteLayer
}, null, { position: 'bottomright' }).addTo(map);

// 右下角放大缩小控制
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// 获取餐厅数据并展示marker
fetch('restaurants_in_salzburg2.json')
    .then(response => response.json())
    .then(data => {
        // 保存原始数据
        allRestaurantData = data;

        // 初始化各分类对应marker的数组
        categories.forEach(category => {
            markersByCategory[category] = [];
        });

        // 创建并存储所有marker
        data.forEach(restaurant => {
            const { name, type, rating, user_ratings_total, latitude, longitude } = restaurant;
            const iconUrl = flagIcons[type] || "flags/default.png";
            const customIcon = L.icon({
                iconUrl,
                iconSize: [40, null], // 可根据需要调整大小
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });

            // 创建marker
            const marker = L.marker([latitude, longitude], { icon: customIcon })
                // 首先绑定空popup
                .bindPopup("");

            // 当真正打开popup时，设置实际内容
            marker.on('popupopen', () => {
                marker.setPopupContent(
                    getPopupContent(name, type, rating, user_ratings_total)
                );
            });

            // 将餐厅信息附在marker上（便于搜索）
            marker.restaurantData = { name, type, rating, user_ratings_total };

            // 加入对应分类的数组
            if (markersByCategory[type]) {
                markersByCategory[type].push(marker);
            }
            // 加入所有marker数组
            allMarkers.push(marker);

            // 默认全部添加到地图
            marker.addTo(map);
        });

        // 初始化分类按钮
        initCategoryButtons();
    })
    .catch(error => console.error('Error loading JSON:', error));

// 初始化分类按钮
function initCategoryButtons() {
    const categoryContainer = document.getElementById('category-buttons');

    // “Show All”按钮
    const showAllButton = document.createElement('div');
    showAllButton.id = 'show-all-button';
    showAllButton.className = 'category-button active';
    showAllButton.textContent = "Show All";
    showAllButton.onclick = () => {
        showAllRestaurants();
        setActiveButton(showAllButton);
    };
    categoryContainer.appendChild(showAllButton);

    // “Show Favorites”按钮
    const showFavoritesButton = document.createElement('div');
    showFavoritesButton.id = 'show-favorites-button';
    showFavoritesButton.className = 'category-button';
    showFavoritesButton.textContent = "Show Favorites";
    showFavoritesButton.onclick = () => {
        showFavorites();
        setActiveButton(showFavoritesButton);
    };
    categoryContainer.appendChild(showFavoritesButton);

    // 为每个分类创建一个按钮
    categories.forEach(category => {
        const button = document.createElement('div');
        button.className = 'category-button';
        button.textContent = category;
        button.onclick = () => {
            filterByCategory(category);
            setActiveButton(button);
        };
        categoryContainer.appendChild(button);
    });
}

// 显示收藏夹
function showFavorites() {
    const restaurantList = document.getElementById('restaurant-list');
    restaurantList.style.display = 'block';
    restaurantList.innerHTML = '';

    clearMarkersFromMap();

    // 过滤出收藏夹中的marker
    const favoriteMarkers = allMarkers.filter(marker =>
        myFavorites.has(marker.restaurantData.name)
    );

    // 按评分降序排序
    favoriteMarkers.sort((a, b) => {
        const ratingA = parseFloat(a.restaurantData.rating) || 0;
        const ratingB = parseFloat(b.restaurantData.rating) || 0;
        return ratingB - ratingA;
    });

    // 将它们添加回地图并在右侧列表中显示
    favoriteMarkers.forEach(marker => {
        marker.addTo(map);
        const item = createRestaurantItem(marker);
        restaurantList.appendChild(item);
    });

    // 调整地图视野
    if (favoriteMarkers.length > 0) {
        const group = new L.featureGroup(favoriteMarkers);
        map.fitBounds(group.getBounds());
    } else {
        restaurantList.innerHTML = '<p style="font-family: Comic Sans MS, Bradley Hand, cursive; font-size: 16px; color: #333; text-align: center; margin: 10px 0;">No favorites yet.</p>';
    }
}

// 按分类过滤
function filterByCategory(category) {
    const restaurantList = document.getElementById('restaurant-list');
    restaurantList.style.display = 'block';

    clearMarkersFromMap();

    // 取得该分类下的所有marker
    const selectedMarkers = markersByCategory[category];

    // 清空列表
    restaurantList.innerHTML = '';

    // 按评分降序排序并显示
    selectedMarkers
        .sort((a, b) => {
            const ratingA = parseFloat(a.restaurantData.rating) || 0;
            const ratingB = parseFloat(b.restaurantData.rating) || 0;
            return ratingB - ratingA;
        })
        .forEach(marker => {
            marker.addTo(map);
            const item = createRestaurantItem(marker);
            restaurantList.appendChild(item);
        });

    // 调整地图视野
    if (selectedMarkers.length > 0) {
        const group = new L.featureGroup(selectedMarkers);
        map.fitBounds(group.getBounds());
    }
}

// 显示所有
function showAllRestaurants() {
    const restaurantList = document.getElementById('restaurant-list');
    restaurantList.style.display = 'none';

    clearMarkersFromMap();
    allMarkers.forEach(marker => marker.addTo(map));

    if (allMarkers.length > 0) {
        const group = new L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds());
    }
}

// 从地图上移除所有marker
function clearMarkersFromMap() {
    allMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
}

// 设置“活动”按钮的高亮状态
function setActiveButton(activeButton) {
    const buttons = document.querySelectorAll('.category-button');
    buttons.forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
}

// 创建餐厅列表元素
function createRestaurantItem(marker) {
    const { name, rating } = marker.restaurantData;
    const item = document.createElement('div');
    item.className = 'restaurant-item';

    // 根据评分决定填充颜色
    let barColor = 'red';
    if (rating >= 4) {
        barColor = 'green';
    } else if (rating >= 3) {
        barColor = 'orange';
    }

    item.innerHTML = 
        `<span>${name}</span>
        <div class="rating-bar">
            <div class="rating-fill" style="width: ${rating * 20}%; background-color: ${barColor};"></div>
            <div class="rating-text">${parseFloat(rating).toFixed(1)}</div>
        </div>`;

    // 点击后聚焦该marker并打开popup
    item.onclick = () => {
        map.setView(marker.getLatLng(), 15);
        marker.openPopup();
    };
    return item;
}

// 加载萨尔茨堡边界数据
fetch('salzburg_boundary.geojson')
    .then(response => response.json())
    .then(boundaryData => {
        const boundaryLayer = L.geoJSON(boundaryData, {
            style: {
                color: "#ff7800",
                weight: 2,
                opacity: 1.0,
                fillOpacity: 0.1
            }
        }).addTo(map);

        const boundaryBounds = boundaryLayer.getBounds();
        map.fitBounds(boundaryBounds);
    })
    .catch(error => console.error('Error loading Salzburg boundary:', error));

// 定位按钮
const locateButton = document.getElementById('locate-button');
locateButton.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
                L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("You are here.")
                    .openPopup();
            },
            (error) => {
                alert("Could not get your location: " + error.message);
            }
        );
    } else {
        alert("Your browser does not support geolocation.");
    }
});

// =============== 自动补全 + 搜索功能 ===============

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const autocompleteList = document.getElementById('autocomplete-list');

// 当前自动补全选项焦点
let currentFocus = -1;

// 点击“Search”按钮
searchButton.addEventListener('click', handleSearch);

// 输入框keydown事件
searchInput.addEventListener('keydown', (event) => {
    const items = autocompleteList.querySelectorAll('li');
    if (event.key === 'ArrowDown') {
        currentFocus++;
        highlightOption(items);
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        currentFocus--;
        highlightOption(items);
        event.preventDefault();
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (currentFocus > -1 && items[currentFocus]) {
            searchInput.value = items[currentFocus].textContent;
            autocompleteList.style.display = 'none';
        }
        handleSearch();
    }
});

// 输入事件，显示自动补全
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    autocompleteList.innerHTML = '';
    currentFocus = -1;

    if (!query) {
        autocompleteList.style.display = 'none';
        return;
    }

    // 模糊搜索餐厅名字
    const suggestions = allRestaurantData
        .map(r => r.name)
        .filter(name => name.toLowerCase().includes(query))
        .slice(0, 10);

    if (suggestions.length === 0) {
        autocompleteList.style.display = 'none';
        return;
    }

    // 生成下拉列表
    suggestions.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('click', () => {
            searchInput.value = name;
            autocompleteList.style.display = 'none';
        });
        autocompleteList.appendChild(li);
    });
    autocompleteList.style.display = 'block';
});

function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        alert('Please enter a restaurant name to search!');
        return;
    }

    // 根据名字匹配marker
    const matchedMarkers = allMarkers.filter(marker =>
        marker.restaurantData.name.toLowerCase().includes(query)
    );

    if (matchedMarkers.length === 0) {
        alert('No matching restaurants found.');
        return;
    }

    // 清除所有marker，仅显示匹配的
    clearMarkersFromMap();
    matchedMarkers.forEach(marker => marker.addTo(map));

    // 调整地图视野
    const group = L.featureGroup(matchedMarkers);
    map.fitBounds(group.getBounds());

    // 更新右侧餐厅列表
    updateRestaurantList(matchedMarkers);
}

function updateRestaurantList(matchedMarkers) {
    const restaurantList = document.getElementById('restaurant-list');
    restaurantList.innerHTML = '';
    restaurantList.style.display = 'block';

    // 按评分降序
    matchedMarkers.sort((a, b) => {
        const ratingA = parseFloat(a.restaurantData.rating) || 0;
        const ratingB = parseFloat(b.restaurantData.rating) || 0;
        return ratingB - ratingA;
    });

    // 创建并添加列表项
    matchedMarkers.forEach(marker => {
        const item = createRestaurantItem(marker);
        restaurantList.appendChild(item);
    });
}

function highlightOption(items) {
    items.forEach(item => item.classList.remove('autocomplete-active'));
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;

    if (items[currentFocus]) {
        items[currentFocus].classList.add('autocomplete-active');
        searchInput.value = items[currentFocus].textContent;
        items[currentFocus].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

