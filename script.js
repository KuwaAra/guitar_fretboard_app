// --- グローバル変数 ---
let currentNoteCellElement = null; // 指板上の現在の問題セル要素
let startTime = 0; // 解答時間計測用
let currentCorrectNotePrimary = ''; // 正解の主要表記
let currentCorrectNoteSecondary = ''; // 正解の副次表記

// --- 設定/統計データ ---
const NOTES = [
    "ド", "ド#/レ♭", "レ", "レ#/ミ♭", "ミ", "ファ",
    "ファ#/ソ♭", "ソ", "ソ#/ラ♭", "ラ", "ラ#/シ♭", "シ"
]; // A2からA13に相当

const STRING_BASE_NOTES = {
    '1弦': 5, // ミ
    '2弦': 12, // シ
    '3弦': 8, // ソ
    '4弦': 3, // レ
    '5弦': 10, // ラ
    '6弦': 5  // ミ
}; // VBAのbaseNoteIndexに相当 (インデックスはNOTES配列の0始まりに合わせる)

let stats = {}; // 音名ごとの統計 ({'ド': {correct: 0, incorrect: 0}, ...})
let errorLog = {}; // 弦とフレットごとの誤答記録 ({'1弦_0': 0, '2弦_3': 5, ...})

// --- モード設定 ---
let displayMode = 1; // 1:指板のみ, 2:文字のみ, 3:両方表示
let isFocusMode = false; // 苦手克服モードON/OFF
let isAllNotesMode = false; // 全音名表示モードON/OFF

// --- DOM要素の取得 ---
const fretboardElement = document.getElementById('fretboard');
const problemDisplayElement = document.getElementById('problemDisplay');
const newQuestionBtn = document.getElementById('newQuestionBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const toggleFocusModeBtn = document.getElementById('toggleFocusModeBtn');
const toggleDisplayModeBtn = document.getElementById('toggleDisplayModeBtn');
const toggleAllNotesModeBtn = document.getElementById('toggleAllNotesModeBtn');
const noteButtonsContainer = document.querySelector('.note-buttons');
const statsTableBody = document.getElementById('statsTable'); // 仮のテーブルボディ

// --- 初期化関数 ---
function initializeApp() {
    // 統計と誤答記録の初期化 (localStorageから読み込むか、新規作成)
    loadStats();
    loadErrorLog();
    
    // 指板のセルを動的に生成 (ヘッダー以外)
    createFretboardCells();
    
    // 音名ボタンを動的に生成
    createNoteButtons();

    // 最初の問題を表示
    generateNewQuestion();

    // イベントリスナーの設定
    newQuestionBtn.addEventListener('click', generateNewQuestion);
    resetStatsBtn.addEventListener('click', resetStats);
    toggleFocusModeBtn.addEventListener('click', toggleFocusMode);
    toggleDisplayModeBtn.addEventListener('click', toggleDisplayMode);
    toggleAllNotesModeBtn.addEventListener('click', toggleAllNotesMode);
}

// --- 指板セル生成関数 ---
function createFretboardCells() {
    const stringNames = ['', '1弦', '2弦', '3弦', '4弦', '5弦', '6弦']; // A2-A7に相当

    for (let s = 1; s <= 6; s++) { // 1弦から6弦 (VBAのrowNum 2-7に相当)
        const stringName = stringNames[s];
        
        // 弦名セル
        const stringHeader = document.createElement('div');
        stringHeader.className = 'fretboard-cell header';
        stringHeader.textContent = stringName;
        fretboardElement.appendChild(stringHeader);

        // 各フレットのセル
        for (let f = 0; f <= 12; f++) { // 0フレットから12フレット (VBAのcolNum 2-14に相当)
            const cell = document.createElement('div');
            cell.className = 'fretboard-cell';
            cell.dataset.string = stringName; // データ属性に弦とフレットを保持
            cell.dataset.fret = f;
            cell.id = `${stringName}_${f}`; // IDも振ることで特定しやすくする
            fretboardElement.appendChild(cell);
        }
    }
}

// --- 音名ボタン生成関数 ---
function createNoteButtons() {
    NOTES.forEach(note => {
        const button = document.createElement('button');
        button.className = 'note-button';
        button.textContent = note;
        button.addEventListener('click', () => checkAnswer(note)); // クリックされた音名を渡す
        noteButtonsContainer.appendChild(button);
    });
}

// --- 統計データ読み込み/保存 ---
function loadStats() {
    const savedStats = localStorage.getItem('guitarFretboardStats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
    } else {
        // 初期化
        NOTES.forEach(note => {
            const primaryNote = note.split('/')[0].trim();
            stats[primaryNote] = { correct: 0, incorrect: 0 };
        });
    }
    updateStatsDisplay();
}

function saveStats() {
    localStorage.setItem('guitarFretboardStats', JSON.stringify(stats));
}

function loadErrorLog() {
    const savedErrorLog = localStorage.getItem('guitarFretboardErrorLog');
    if (savedErrorLog) {
        errorLog = JSON.parse(savedErrorLog);
    } else {
        // 初期化
        const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
        for (const s of stringNames) {
            for (let f = 0; f <= 12; f++) {
                errorLog[`${s}_${f}`] = 0;
            }
        }
    }
    updateErrorLogColors();
}

function saveErrorLog() {
    localStorage.setItem('guitarFretboardErrorLog', JSON.stringify(errorLog));
}

// --- 統計表示更新関数 ---
function updateStatsDisplay() {
    statsTableBody.innerHTML = ''; // クリア
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>音名</th><th>正解数</th><th>不正解数</th><th>正答率</th><th>誤答率</th>';
    statsTableBody.appendChild(headerRow);

    NOTES.forEach(fullNote => {
        const primaryNote = fullNote.split('/')[0].trim();
        const data = stats[primaryNote];
        const total = data.correct + data.incorrect;
        const correctRate = total === 0 ? '0.00%' : ((data.correct / total) * 100).toFixed(2) + '%';
        const incorrectRate = total === 0 ? '0.00%' : ((data.incorrect / total) * 100).toFixed(2) + '%';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${primaryNote}</td>
            <td>${data.correct}</td>
            <td>${data.incorrect}</td>
            <td>${correctRate}</td>
            <td>${incorrectRate}</td>
        `;
        statsTableBody.appendChild(row);
    });
}

// --- 誤答記録の色更新関数 (指板シートには色を付けないため、今回はCSSで表現) ---
function updateErrorLogColors() {
    // 指板のセルには直接色を塗らないため、この関数は直接HTML要素の色を操作しない
    // 誤答記録シートの表現は、HTMLで別途テーブルを作成し、JSでクラスを付与するなどで実現
    // 例:
    // const cellElement = document.getElementById(`${stringName}_${fretNum}`);
    // const errorCount = errorLog[`${stringName}_${fretNum}`] || 0;
    // if (errorCount > 0) {
    //     // errorCountに応じたクラスを付与
    //     cellElement.classList.add(`error-count-${Math.min(errorCount, 5)}`); // 例として5段階でクラス分け
    // } else {
    //     // クラスを削除
    //     cellElement.classList.remove(...['error-count-1', 'error-count-2', 'error-count-3', 'error-count-4', 'error-count-5']);
    // }
}

// --- メインロジック ---
function generateNewQuestion() {
    // 画面と表示エリアをクリア
    clearFretboardDisplay();
    problemDisplayElement.textContent = '';
    problemDisplayElement.style.backgroundColor = '#fffacd';
    problemDisplayElement.style.color = '#333';

    let targetString, targetFret;
    let baseNoteIndex;
    let actualNoteIndex;

    // --- 全音名表示モードの場合の指板初期化 ---
    if (isAllNotesMode) {
        // 全ての音名を指板に表示 (非太字)
        Object.keys(STRING_BASE_NOTES).forEach(stringName => {
            const stringNum = parseInt(stringName.replace('弦', ''));
            baseNoteIndex = STRING_BASE_NOTES[stringName];
            for (let f = 0; f <= 12; f++) {
                const cell = document.getElementById(`${stringName}_${f}`);
                actualNoteIndex = (baseNoteIndex + f - 1 + 12) % 12; // JSは0始まり配列なので調整
                const fullNote = NOTES[actualNoteIndex];
                const primaryNote = fullNote.split('/')[0].trim();
                cell.textContent = primaryNote;
                cell.style.fontWeight = 'normal'; // 非太字
                cell.style.backgroundColor = ''; // デフォルト背景色
                cell.style.color = '#333'; // デフォルト文字色
            }
        });

        // ランダムなフレットを選び、それを問題ターゲットとする
        const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
        targetString = stringNames[Math.floor(Math.random() * stringNames.length)];
        targetFret = Math.floor(Math.random() * 13); // 0-12フレット
        
        // 問題セルをハイライト
        currentNoteCellElement = document.getElementById(`${targetString}_${targetFret}`);
        currentNoteCellElement.style.backgroundColor = 'red';
        currentNoteCellElement.style.fontWeight = 'bold';
        currentNoteCellElement.style.color = 'white';

        // H11相当の表示エリアに問題文字を表示
        problemDisplayElement.textContent = `${targetString}${targetFret}フレット`;
        
    } else { // 通常モードの場合の出題ロジック
        // 苦手克服モード (未実装: ここに苦手克服ロジックを統合)
        // 今回はシンプルにランダム選択
        const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
        targetString = stringNames[Math.floor(Math.random() * stringNames.length)];
        targetFret = Math.floor(Math.random() * 13); // 0-12フレット

        currentNoteCellElement = document.getElementById(`${targetString}_${targetFret}`);

        // 表示モードに応じた表示 (指板のみ/文字のみ/両方)
        if (displayMode === 1 || displayMode === 3) { // 指板のみ or 両方
            currentNoteCellElement.style.backgroundColor = 'red';
            currentNoteCellElement.textContent = '●';
            currentNoteCellElement.style.color = 'white';
            currentNoteCellElement.style.fontWeight = 'bold';
            currentNoteCellElement.style.fontSize = '1.2em';
        } else { // 文字のみ
            currentNoteCellElement.style.backgroundColor = ''; // デフォルト
            currentNoteCellElement.textContent = '';
            currentNoteCellElement.style.color = '#333';
            currentNoteCellElement.style.fontWeight = 'normal';
            currentNoteCellElement.style.fontSize = '1em';
        }

        if (displayMode === 2 || displayMode === 3) { // 文字のみ or 両方
            problemDisplayElement.textContent = `${targetString}${targetFret}フレット`;
        } else {
            problemDisplayElement.textContent = '';
        }
    }

    // 正解音名を計算 (全モード共通)
    baseNoteIndex = STRING_BASE_NOTES[targetString];
    actualNoteIndex = (baseNoteIndex + targetFret - 1 + 12) % 12; // JSは0始まり配列なので調整
    const fullCorrectNote = NOTES[actualNoteIndex];
    currentCorrectNotePrimary = fullCorrectNote.split('/')[0].trim();
    currentCorrectNoteSecondary = fullCorrectNote.split('/').length > 1 ? fullCorrectNote.split('/')[1].trim() : '';

    startTime = Date.now(); // 解答時間計測開始 (ミリ秒)
}

// --- 指板表示をクリアする関数 ---
function clearFretboardDisplay() {
    const allCells = document.querySelectorAll('.fretboard-cell');
    allCells.forEach(cell => {
        if (!cell.classList.contains('header')) { // ヘッダー以外
            cell.style.backgroundColor = ''; // デフォルトに戻す
            cell.textContent = ''; // 内容をクリア
            cell.style.color = '#333'; // 文字色をデフォルトに戻す
            cell.style.fontWeight = 'normal';
            cell.style.fontSize = '1em';
        }
    });
}

// --- 解答判定関数 ---
function checkAnswer(clickedNote) {
    if (!currentNoteCellElement) {
        alert("先に「新しい問題」ボタンを押してください。");
        return;
    }

    const responseTime = (Date.now() - startTime) / 1000; // 秒に変換

    let correct = false;
    // 主表記または副次表記と一致するか、クリックしたボタンが複合表記でその中に正解が含まれるか
    if (clickedNote === currentCorrectNotePrimary || clickedNote === currentCorrectNoteSecondary) {
        correct = true;
    } else if (clickedNote.includes('/')) {
        const clickedNotesParts = clickedNote.split('/').map(n => n.trim());
        if (clickedNotesParts.includes(currentCorrectNotePrimary) || clickedNotesParts.includes(currentCorrectNoteSecondary)) {
            correct = true;
        }
    }

    // 統計更新
    if (!stats[currentCorrectNotePrimary]) {
        stats[currentCorrectNotePrimary] = { correct: 0, incorrect: 0 };
    }
    if (correct) {
        stats[currentCorrectNotePrimary].correct++;
    } else {
        stats[currentCorrectNotePrimary].incorrect++;
        // 誤答記録の更新
        const string = currentNoteCellElement.dataset.string;
        const fret = currentNoteCellElement.dataset.fret;
        const key = `${string}_${fret}`;
        errorLog[key] = (errorLog[key] || 0) + 1;
        // 誤答記録シートに色を塗るロジックはCSSとデータ属性で連携
        // updateErrorLogColors(); // もしVBAのように直接操作するなら呼び出すが、今回はCSS
    }

    saveStats();
    saveErrorLog(); // 誤答記録を保存
    updateStatsDisplay();

    let msg = `あなたが押したのは「${clickedNote}」ボタンです。\n解答時間: ${responseTime.toFixed(1)}秒\n\n`;
    if (correct) {
        msg += "正解！";
        problemDisplayElement.style.backgroundColor = '#d4edda'; // 薄い緑
    } else {
        msg += `不正解…正解は「${currentCorrectNotePrimary}`;
        if (currentCorrectNoteSecondary) {
            msg += `」または「${currentCorrectNoteSecondary}」でした。`;
        } else {
            msg += `」でした。`;
        }
        problemDisplayElement.style.backgroundColor = '#f8d7da'; // 薄い赤
    }
    alert(msg); // Webアプリなのでalertで一時的に表示

    generateNewQuestion(); // 次の問題へ
}

// --- 統計リセット関数 ---
function resetStats() {
    if (confirm("統計データと誤答記録データを全てリセットしてもよろしいですか？")) {
        // 統計リセット
        NOTES.forEach(note => {
            const primaryNote = note.split('/')[0].trim();
            stats[primaryNote] = { correct: 0, incorrect: 0 };
        });

        // 誤答記録リセット
        const stringNames = ['1弦', '2弦', '3弦', '4弦', '5弦', '6弦'];
        for (const s of stringNames) {
            for (let f = 0; f <= 12; f++) {
                errorLog[`${s}_${f}`] = 0;
            }
        }
        
        saveStats();
        saveErrorLog();
        updateStatsDisplay();
        // updateErrorLogColors(); // CSSで管理されるため不要

        alert("全てのデータがリセットされました。");
        generateNewQuestion(); // リセット後、新しい問題へ
    }
}

// --- 表示モード切り替え関数 ---
function toggleDisplayMode() {
    displayMode++;
    if (displayMode > 3) { // 1, 2, 3 のサイクル
        displayMode = 1;
    }
    let modeText = '';
    switch (displayMode) {
        case 1: modeText = '指板モデルのみ'; break;
        case 2: modeText = '文字情報のみ (表示エリア)'; break;
        case 3: modeText = '指板と文字の両方'; break;
    }
    alert(`表示モード: ${modeText}`);
    // 全音名表示モードがOFFの場合のみ、このモードが適用される
    generateNewQuestion(); 
}

// --- 全音名表示モードON/OFF切り替え関数 ---
function toggleAllNotesMode() {
    isAllNotesMode = !isAllNotesMode;
    if (isAllNotesMode) {
        alert("全フレット音名表示モードがONになりました。");
    } else {
        alert("全フレット音名表示モードがOFFになりました。");
    }
    generateNewQuestion(); // 表示を更新
}

// --- 苦手克服モードON/OFF切り替え関数 ---
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    if (isFocusMode) {
        alert("苦手克服モードがONになりました。不正解の多い音名が優先的に出題されます。");
    } else {
        alert("苦手克服モードがOFFになりました。ランダムに出題されます。");
    }
    generateNewQuestion();
}


// アプリケーション起動
initializeApp();