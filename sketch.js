let questionsTable;     // 儲存 CSV 資料
let questions = [];     // 轉換後的題目陣列
let currentQuestionIndex = 0;
let score = 0;

let gameState = 'START';    // 'START', 'QUIZ', 'RESULT', 'ERROR' 
let customCursor;           // 【特效】游標軌跡特效物件
let confetti = [];          // 【特效】用於結果畫面的紙花陣列
let streamers = [];         // 彩帶粒子陣列

// 狀態延遲控制 (修正卡關問題)
let selectedOption = null;  // 記錄被選取的選項索引
let selectionTimer = -1;    // -1: 無延遲; >0: 延遲開始的 frameCount
const SELECTION_DELAY_FRAMES = 18; // 約 0.3 秒的延遲 (假設 60FPS)

// 🚨 放大因子：所有尺寸、座標、字體大小將乘以這個因子 (原程式為 1)
const SCALE_FACTOR = 2; 

// 🚨 修正後的尺寸常數 (原尺寸 x 2)
const OPTION_WIDTH = 500 * SCALE_FACTOR; // 1000
const OPTION_HEIGHT = 60 * SCALE_FACTOR;   // 120
const OPTION_SPACING = 80 * SCALE_FACTOR;  // 160
const START_BUTTON_W = 250 * SCALE_FACTOR; // 500
const START_BUTTON_H = 70 * SCALE_FACTOR;  // 140
const START_BUTTON_Y = 400 * SCALE_FACTOR; // 800

function preload() {
    // 讀取 CSV 檔案。
    try {
        questionsTable = loadTable('assets/questions.csv', 'csv', 'header');
    } catch (e) {
        questionsTable = null; 
        console.error("CSV 檔案讀取失敗，請確認路徑或啟用本地伺服器。", e);
    }
}

// 🚨 【新增】處理視窗大小改變 (保持全螢幕)
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function setup() {
    // 🚨 畫布設定為全螢幕
    createCanvas(windowWidth, windowHeight);
    
    // 🚨 確保所有字體和元素繪製在放大的畫布中仍能保持比例
    // 我們使用 P5.js 的 scale() 函式，但由於元素尺寸已乘以 SCALE_FACTOR，
    // 這裡我們主要依賴重新計算所有坐標和尺寸。
    
    rectMode(CENTER);
    textAlign(CENTER, CENTER);
    
    // 處理 CSV 數據
    if (questionsTable && questionsTable.getRowCount() > 0) {
        for (let r = 0; r < questionsTable.getRowCount(); r++) {
            let row = questionsTable.getRow(r);
            questions.push({
                question: row.getString('question'),
                options: [
                    row.getString('optionA'),
                    row.getString('optionB'),
                    row.getString('optionC')
                ],
                correctAnswer: row.getString('correct_answer')
            });
        }
    } else {
        gameState = 'ERROR'; 
    }

    // 初始化特效物件
    customCursor = new CursorTrail();
    for (let i = 0; i < 100 * SCALE_FACTOR; i++) { // 增加彩帶數量以適應大螢幕
        streamers.push(new Streamer());
    }
    for (let i = 0; i < 50 * SCALE_FACTOR; i++) { // 增加紙花數量
        confetti.push(new Confetto());
    }
}

function draw() {
    // 1. 狀態更新 (處理延遲和切換下一題)
    updateQuizState(); 

    // 🚨 背景色 #EFCFE3
    background(239, 207, 227); 

    // 2. 【特效時機】繪製彩帶背景特效 - 僅在 RESULT 狀態顯示
    if (gameState === 'RESULT') {
        for (let streamer of streamers) {
            streamer.update();
            streamer.display();
        }
    }

    // 3. 根據狀態繪製主要畫面
    switch (gameState) {
        case 'START':
            drawStartScreen(); 
            break;
        case 'QUIZ':
            drawQuiz();
            break;
        case 'RESULT':
            drawResultAnimation();
            break;
        case 'ERROR':
            drawErrorScreen();
            break;
    }
    
    // 4. 游標軌跡繪製位置：確保在最上層。
    customCursor.update(); 
    customCursor.display(); 
}

// 使用 frameCount 進行狀態延遲和切換，解決卡關問題
function updateQuizState() {
    // 檢查是否有選項被選中且延遲時間已過
    if (selectionTimer !== -1 && frameCount > selectionTimer + SELECTION_DELAY_FRAMES) {
        let q = questions[currentQuestionIndex];
        
        // 1. 處理結果
        if (q.options[selectedOption] === q.correctAnswer) {
            score++;
        }
        
        // 2. 切換下一題
        currentQuestionIndex++;
        
        // 3. 重設狀態
        selectedOption = null;
        selectionTimer = -1;
    }
}

// --- 繪製開始畫面 ---
function drawStartScreen() {
    fill(50, 50, 50); 
    textSize(60 * SCALE_FACTOR); // 🚨 字體放大
    text("P5.js 互動測驗系統", width / 2, height / 4); // 🚨 調整 Y 軸位置 (原 150*2=300)
    
    fill(50, 50, 50);
    textSize(30 * SCALE_FACTOR); // 🚨 字體放大
    text(`共 ${questions.length} 題`, width / 2, height / 4 + 200); // 🚨 調整 Y 軸位置
    
    // 繪製「開始測驗」按鈕
    let x = width / 2;
    let y = START_BUTTON_Y; // 🚨 使用放大後的常數

    // 按鈕懸停特效
    let isHover = mouseX > x - START_BUTTON_W / 2 && mouseX < x + START_BUTTON_W / 2 &&
                  mouseY > y - START_BUTTON_H / 2 && mouseY < y + START_BUTTON_H / 2;
    
    if (isHover) {
        fill(50, 150, 255); 
        cursor('hand'); 
        rect(x, y, START_BUTTON_W * 1.05, START_BUTTON_H * 1.05, 10 * SCALE_FACTOR); // 🚨 圓角放大
    } else {
        fill(100, 100, 100); 
        rect(x, y, START_BUTTON_W, START_BUTTON_H, 10 * SCALE_FACTOR); // 🚨 圓角放大
    }

    fill(255); 
    textSize(32 * SCALE_FACTOR); // 🚨 字體放大
    text("開始測驗", x, y + 5 * SCALE_FACTOR); // 🚨 文字偏移放大
    
    if (!isHover) {
        cursor('none');
    }
}


function drawErrorScreen() {
    fill(200, 50, 50); 
    textSize(30 * SCALE_FACTOR); // 🚨 字體放大
    text("錯誤：無法載入題庫 (CSV)", width / 2, height / 2 - 40 * SCALE_FACTOR); // 🚨 座標放大
    textSize(20 * SCALE_FACTOR); // 🚨 字體放大
    text("請確認 'assets/questions.csv' 檔案是否存在，並使用本地伺服器運行。", width / 2, height / 2 + 20 * SCALE_FACTOR); // 🚨 座標放大
}


// --- 繪製主要測驗畫面 ---
function drawQuiz() {
    if (currentQuestionIndex >= questions.length) {
        gameState = 'RESULT';
        return;
    }
    
    let q = questions[currentQuestionIndex];
    
    fill(50, 50, 50); 
    textSize(20 * SCALE_FACTOR); // 🚨 字體放大
    text(`問題 ${currentQuestionIndex + 1} / ${questions.length}`, width / 2, height / 10); // 🚨 調整 Y 軸位置 (原 50*2=100)

    fill(50, 50, 50); 
    textSize(36 * SCALE_FACTOR); // 🚨 字體放大
    text(q.question, width / 2, height / 4); // 🚨 調整 Y 軸位置 (原 120*2=240)

    textSize(24 * SCALE_FACTOR); // 🚨 字體放大
    let anyHover = false;
    for (let i = 0; i < q.options.length; i++) {
        let x = width / 2;
        // 🚨 Y 坐標基準和間距全部放大
        let y = (height / 4 + 200) + i * OPTION_SPACING; 

        let isHover = mouseX > x - OPTION_WIDTH / 2 && mouseX < x + OPTION_WIDTH / 2 &&
                      mouseY > y - OPTION_HEIGHT / 2 && mouseY < y + OPTION_HEIGHT / 2;
        
        // 【特效】選項懸停特效
        if (isHover && selectedOption === null) {
            fill(50, 100, 255); 
            cursor('hand'); 
            anyHover = true; 
            
            let currentWidth = OPTION_WIDTH * 1.02;
            let currentHeight = OPTION_HEIGHT * 1.05;
            rect(x, y, currentWidth, currentHeight, 15 * SCALE_FACTOR); // 🚨 圓角放大
        } else {
            fill(100, 100, 100, 180); 
            rect(x, y, OPTION_WIDTH, OPTION_HEIGHT, 15 * SCALE_FACTOR); // 🚨 圓角放大
        }

        // 【特效】選項點擊特效 (紅色脈衝閃爍)
        if (selectedOption === i) {
            let flashAlpha = map(sin(frameCount * 0.5), -1, 1, 150, 255); 
            fill(255, 100, 100, flashAlpha);
            rect(x, y, OPTION_WIDTH, OPTION_HEIGHT, 15 * SCALE_FACTOR); // 🚨 圓角放大
        }

        fill(255); 
        text(q.options[i], x, y);
    }
    
    // 游標軌跡切換 (非懸停狀態且未選中時才讓軌跡顯示)
    if (!anyHover && selectedOption === null) {
        cursor('none'); 
    }
}

// --- 處理滑鼠點擊事件 ---
function mousePressed() {
    // 1. 處理開始畫面點擊
    if (gameState === 'START') {
        let x = width / 2;
        let y = START_BUTTON_Y; 
        let isClicked = mouseX > x - START_BUTTON_W / 2 && mouseX < x + START_BUTTON_W / 2 &&
                        mouseY > y - START_BUTTON_H / 2 && mouseY < y + START_BUTTON_H / 2;
        
        if (isClicked) {
            gameState = 'QUIZ'; 
            cursor('none'); 
            return;
        }
    }

    // 2. 處理測驗畫面點擊 (只有在沒有延遲進行時才能點擊)
    if (gameState !== 'QUIZ' || selectedOption !== null) return; 
    
    for (let i = 0; i < questions[currentQuestionIndex].options.length; i++) {
        let x = width / 2;
        let y = (height / 4 + 200) + i * OPTION_SPACING; 

        if (mouseX > x - OPTION_WIDTH / 2 && mouseX < x + OPTION_WIDTH / 2 &&
            mouseY > y - OPTION_HEIGHT / 2 && mouseY < y + OPTION_HEIGHT / 2) {
            
            selectedOption = i;
            selectionTimer = frameCount; // 啟動計時器
            return; 
        }
    }
}


// --- 根據成績產生不同的動畫畫面 ---
function drawResultAnimation() {
    let finalScore = score;
    let totalQuestions = questions.length;
    let accuracy = finalScore / totalQuestions;

    // 繪製結果文字
    fill(50, 50, 50); 
    textSize(50 * SCALE_FACTOR); // 🚨 字體放大
    text("測驗結束！", width / 2, height / 4); // 🚨 調整 Y 軸位置
    textSize(40 * SCALE_FACTOR); // 🚨 字體放大
    text(`您的分數: ${finalScore} / ${totalQuestions}`, width / 2, height / 4 + 100); // 🚨 調整 Y 軸位置
    
    if (accuracy >= 0.8) {
        // 優秀: 紙花慶祝
        fill(255, 150, 0); 
        textSize(60 * SCALE_FACTOR + sin(frameCount * 0.1) * 10 * SCALE_FACTOR); // 🚨 字體放大
        text("✨ 恭喜！表現傑出！ ✨", width / 2, height / 2);
        
        for (let c of confetti) {
            c.update();
            c.display();
        }
        
    } else {
        // 及格及待加強
        fill(150, 50, 50); 
        textSize(45 * SCALE_FACTOR); // 🚨 字體放大
        text("😊 沒關係！下次會更好！ 😊", width / 2, height / 2);
    }
}

// --- 【特效類別】彩帶 ---
class Streamer {
    constructor() {
        this.reset();
        colorMode(HSB, 360, 100, 100);
        this.color = color(random(360), 80, 90);
        colorMode(RGB, 255);
    }
    
    reset() {
        this.x = random(width);
        this.y = random(-height, 0); 
        this.width = random(3, 6) * SCALE_FACTOR; // 🚨 尺寸放大
        this.height = random(30, 60) * SCALE_FACTOR; // 🚨 尺寸放大
        this.speed = random(2, 5) * SCALE_FACTOR; // 🚨 速度放大
        this.wobble = random(100); 
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.05, 0.05);
    }

    update() {
        this.y += this.speed;
        this.x += sin(this.wobble) * 1.5 * SCALE_FACTOR; // 🚨 擺動幅度放大
        this.wobble += 0.02;
        this.rotation += this.rotationSpeed;

        if (this.y > height) {
            this.reset();
            this.y = random(0); 
        }
    }

    display() {
        push();
        fill(this.color); 
        noStroke();
        translate(this.x, this.y);
        rotate(this.rotation);
        rect(0, 0, this.width, this.height);
        pop();
    }
}


// --- 【特效類別】游標軌跡 (滑鼠移動路徑) ---
class CursorTrail {
    constructor() {
        this.points = [];
        this.maxLen = 25; 
    }

    update() {
        if (gameState !== 'QUIZ' && gameState !== 'START' || cursor() !== 'none') {
            this.points = [];
            return;
        }
        this.points.push(createVector(mouseX, mouseY));
        if (this.points.length > this.maxLen) {
            this.points.shift();
        }
    }

    display() {
        if (gameState !== 'QUIZ' && gameState !== 'START' || cursor() !== 'none') return;

        noFill();
        strokeWeight(3 * SCALE_FACTOR); // 🚨 線寬放大
        
        for (let i = 0; i < this.points.length; i++) {
            let p = this.points[i];
            
            let alpha = map(i, 0, this.maxLen, 0, 150);
            let hue = (frameCount * 5 + i * 10) % 360; 
            
            colorMode(HSB, 360, 100, 100, 255);
            stroke(hue, 90, 90, alpha); 
            
            circle(p.x, p.y, map(i, 0, this.maxLen, 2, 10) * SCALE_FACTOR); // 🚨 圓點尺寸放大
            colorMode(RGB, 255);
        }
    }
}

// --- 【特效類別】紙花 (用於結果畫面) ---
class Confetto {
    constructor() {
        this.reset();
        this.color = color(random(150, 255), random(150, 255), random(150, 255));
    }
    
    reset() {
        this.pos = createVector(random(width), random(-200 * SCALE_FACTOR, -50 * SCALE_FACTOR)); // 🚨 座標放大
        this.vel = createVector(0, random(5, 10) * SCALE_FACTOR); // 🚨 速度放大
        this.acc = createVector(0, 0.05 * SCALE_FACTOR); // 🚨 加速度放大
        this.w = random(10, 20) * SCALE_FACTOR; // 🚨 寬度放大
        this.h = random(5, 15) * SCALE_FACTOR; // 🚨 高度放大
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.05, 0.05);
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.rotation += this.rotationSpeed;

        if (this.pos.y > height + 20 * SCALE_FACTOR) { // 🚨 判斷條件放大
            this.reset();
        }
    }

    display() {
        push();
        fill(this.color);
        noStroke();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        rect(0, 0, this.w, this.h);
        pop();
    }
}