document.addEventListener('DOMContentLoaded', () => {
    // UI Helpers
    const modal = document.getElementById('game-modal');
    const closeBtn = document.querySelector('.close-modal');
    const playButtons = document.querySelectorAll('.play-btn');
    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('game-overlay');
    const gameTitle = document.getElementById('game-title');
    const gameCanvas = document.getElementById('game-canvas');
    const ctx = gameCanvas.getContext('2d');

    // Summarizer UI Elements
    const summarizeBtn = document.getElementById('summarize-btn');
    const textToSummarize = document.getElementById('text-to-summarize');
    const summaryResult = document.getElementById('summary-result');
    const summaryContent = document.getElementById('summary-content');
    const loader = document.getElementById('loader');
    const apiKeyInput = document.getElementById('gemini-api-key');

    // Theme Toggle & Easter Egg
    const themeToggle = document.getElementById('theme-toggle');
    let themeClickCount = 0;

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.innerText = theme === 'light' ? '☀️' : '🌙';
    };

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    const messageModal = document.getElementById('message-modal');
    const closeMessageModal = document.querySelector('.close-message-modal');
    const closeMessageBtn = document.querySelector('.close-message-btn');

    if (themeToggle) {
        themeToggle.onclick = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);

            // Easter Egg Logic
            themeClickCount++;
            if (themeClickCount === 30) {
                if (messageModal) {
                    messageModal.style.display = 'block';
                }
                themeClickCount = 0; // Reset after trigger
            }
        };
    }

    if (closeMessageModal) closeMessageModal.onclick = () => messageModal.style.display = 'none';
    if (closeMessageBtn) closeMessageBtn.onclick = () => messageModal.style.display = 'none';
    window.addEventListener('click', (event) => {
        if (event.target == messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // Obfuscated API Key (Base64)
    const _k = "QUl6YVN5RFBCNkxiN3Zpai10U0ZEQWNyeXR2UWVMX2gtcC1pNnVF";

    if (summarizeBtn) {
        summarizeBtn.onclick = async () => {
            const text = textToSummarize.value.trim();
            let apiKey = apiKeyInput.value.trim();

            if (!text) {
                alert('요약할 텍스트를 입력해주세요.');
                return;
            }

            // Use the stored key if input is empty
            if (!apiKey) {
                apiKey = atob(_k);
            }

            if (!apiKey) {
                alert('Gemini API 키를 입력해주세요.');
                return;
            }

            // UI Reset
            summaryResult.style.display = 'none';
            loader.style.display = 'block';
            summarizeBtn.disabled = true;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `다음 텍스트의 핵심 내용을 반드시 한국어 3문장(또는 3개의 불렛포인트)으로 요약해줘. 추가 설명 없이 요약 결과만 출력해:\n\n${text}`
                            }]
                        }]
                    })
                });

                const data = await response.json();

                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    const resultText = data.candidates[0].content.parts[0].text;
                    summaryContent.innerText = resultText;
                    summaryResult.style.display = 'block';
                } else {
                    throw new Error(data.error?.message || '요약에 실패했습니다.');
                }
            } catch (error) {
                console.error('Gemini API Error:', error);
                alert('에러가 발생했습니다: ' + error.message);
            } finally {
                loader.style.display = 'none';
                summarizeBtn.disabled = false;
            }
        };
    }

    let gameActive = false;
    let animationId;
    let score = 0;
    let currentGame = '';

    // Common Game State
    let frameCount = 0;

    // Runner Game State (똥 피하기)
    const runnerPlayer = {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        color: '#3b82f6',
        speed: 7
    };
    let obstacles = [];
    const obstacleSpeed = 4;
    const obstacleFrequency = 60;

    // Snake Game State
    const grid = 20;
    let snake = [];
    let food = { x: 0, y: 0 };
    let dx = grid;
    let dy = 0;
    let snakeSpeed = 10; // Increased from 7 to slow down (Frames per move)

    // Resize Canvas
    function resizeCanvas() {
        const container = document.getElementById('game-container');
        let width = container.clientWidth;
        let height = container.clientHeight;

        if (currentGame === 'snake') {
            width = Math.floor(width / grid) * grid;
            height = Math.floor(height / grid) * grid;
        }

        gameCanvas.width = width;
        gameCanvas.height = height;

        // Initial state for Runner
        runnerPlayer.y = gameCanvas.height - 50;
        runnerPlayer.x = gameCanvas.width / 2 - runnerPlayer.width / 2;
    }

    // Modal Logic
    playButtons.forEach(btn => {
        btn.onclick = () => {
            currentGame = btn.getAttribute('data-game');
            modal.style.display = 'block';
            resizeCanvas();
            const title = currentGame === 'galaxy-runner' ? '불규칙한 똥 피하기' : '네온 스네이크';
            resetGame(title);
        };
    });

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        stopGame();
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            stopGame();
        }
    };

    // Input Handling
    const keys = {};
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        // Snake specific direction change (prevent 180 degree turns)
        if (currentGame === 'snake') {
            if (e.code === 'ArrowLeft' && dx === 0) { dx = -grid; dy = 0; }
            if (e.code === 'ArrowUp' && dy === 0) { dy = -grid; dx = 0; }
            if (e.code === 'ArrowRight' && dx === 0) { dx = grid; dy = 0; }
            if (e.code === 'ArrowDown' && dy === 0) { dy = grid; dx = 0; }
        }
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    // Mobile Input
    gameCanvas.addEventListener('touchstart', e => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const rect = gameCanvas.getBoundingClientRect();
        const canvasX = touchX - rect.left;
        const canvasY = touchY - rect.top;

        if (currentGame === 'galaxy-runner') {
            if (canvasX < gameCanvas.width / 2) runnerPlayer.x -= runnerPlayer.speed * 3;
            else runnerPlayer.x += runnerPlayer.speed * 3;
        } else if (currentGame === 'snake') {
            // Simple 4-way tap logic for snake
            const centerX = gameCanvas.width / 2;
            const centerY = gameCanvas.height / 2;
            if (Math.abs(canvasX - centerX) > Math.abs(canvasY - centerY)) {
                if (canvasX < centerX && dx === 0) { dx = -grid; dy = 0; }
                else if (canvasX > centerX && dx === 0) { dx = grid; dy = 0; }
            } else {
                if (canvasY < centerY && dy === 0) { dy = -grid; dx = 0; }
                else if (canvasY > centerY && dy === 0) { dy = grid; dx = 0; }
            }
        }
    });

    // Game Functions
    function resetGame(title) {
        gameActive = false;
        score = 0;
        frameCount = 0;
        gameTitle.innerText = title;
        document.getElementById('game-instr').innerText = currentGame === 'galaxy-runner' ? '방향키 또는 터치로 이동하세요.' : '방향키로 뱀을 조종하세요.';
        overlay.style.display = 'flex';

        if (currentGame === 'galaxy-runner') {
            obstacles = [];
            runnerPlayer.x = gameCanvas.width / 2 - runnerPlayer.width / 2;
            runnerPlayer.y = gameCanvas.height - 50;
        } else if (currentGame === 'snake') {
            snake = [
                { x: grid * 5, y: grid * 5 },
                { x: grid * 4, y: grid * 5 },
                { x: grid * 3, y: grid * 5 }
            ];
            dx = grid;
            dy = 0;
            snakeSpeed = 10;
            spawnFood();
        }

        cancelAnimationFrame(animationId);
    }

    function startGame() {
        overlay.style.display = 'none';
        gameActive = true;
        gameLoop();
    }

    function stopGame() {
        gameActive = false;
        cancelAnimationFrame(animationId);
    }

    // Runner Specific Functions
    function spawnObstacle() {
        const width = Math.random() * 60 + 20;
        obstacles.push({
            x: Math.random() * (gameCanvas.width - width),
            y: -50,
            width: width,
            height: width * 0.8, // Irregular height
            color: '#795548' // Brown for "Poo"
        });
    }

    // Snake Specific Functions
    function spawnFood() {
        food.x = Math.floor(Math.random() * (gameCanvas.width / grid)) * grid;
        food.y = Math.floor(Math.random() * (gameCanvas.height / grid)) * grid;
    }

    function gameLoop() {
        if (!gameActive) return;

        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        frameCount++;

        if (currentGame === 'galaxy-runner') {
            updateRunner();
        } else if (currentGame === 'snake') {
            updateSnake();
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    function updateRunner() {
        // Move Player
        if (keys['ArrowLeft'] || keys['KeyA']) runnerPlayer.x -= runnerPlayer.speed;
        if (keys['ArrowRight'] || keys['KeyD']) runnerPlayer.x += runnerPlayer.speed;

        if (runnerPlayer.x < 0) runnerPlayer.x = 0;
        if (runnerPlayer.x + runnerPlayer.width > gameCanvas.width) runnerPlayer.x = gameCanvas.width - runnerPlayer.width;

        // Draw Player
        ctx.fillStyle = runnerPlayer.color;
        ctx.beginPath();
        ctx.roundRect(runnerPlayer.x, runnerPlayer.y, runnerPlayer.width, runnerPlayer.height, 5);
        ctx.fill();

        // Handle Obstacles
        if (frameCount % obstacleFrequency === 0) spawnObstacle();

        obstacles.forEach((obs, index) => {
            obs.y += obstacleSpeed + (score / 15);

            // Draw "Poo" (Irregular circle)
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            if (
                runnerPlayer.x < obs.x + obs.width &&
                runnerPlayer.x + runnerPlayer.width > obs.x &&
                runnerPlayer.y < obs.y + obs.height &&
                runnerPlayer.y + runnerPlayer.height > obs.y
            ) {
                gameOver();
            }

            if (obs.y > gameCanvas.height) {
                obstacles.splice(index, 1);
                score++;
            }
        });

        // Draw Score
        drawScore();
    }

    function updateSnake() {
        // Slow down snake updates
        if (frameCount % snakeSpeed !== 0) {
            drawSnake();
            drawScore();
            return;
        }

        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Wall Collision
        if (head.x < 0 || head.x >= gameCanvas.width || head.y < 0 || head.y >= gameCanvas.height) {
            return gameOver();
        }

        // Self Collision
        for (let i = 0; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver();
        }

        snake.unshift(head);

        // Food Collision
        if (head.x === food.x && head.y === food.y) {
            score++;
            spawnFood();
            // Slower speedup: every 7 points, and min speed is 4
            if (score % 7 === 0 && snakeSpeed > 4) snakeSpeed--;
        } else {
            snake.pop();
        }

        drawSnake();
        drawScore();
    }

    function drawSnake() {
        // Draw Food (Neon Pulse)
        ctx.fillStyle = '#f43f5e';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        ctx.arc(food.x + grid / 2, food.y + grid / 2, grid / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Snake
        snake.forEach((part, index) => {
            ctx.fillStyle = index === 0 ? '#10b981' : '#34d399';
            ctx.shadowBlur = index === 0 ? 10 : 0;
            ctx.shadowColor = '#10b981';
            ctx.beginPath();
            ctx.roundRect(part.x + 1, part.y + 1, grid - 2, grid - 2, 4);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    function drawScore() {
        ctx.fillStyle = '#fff';
        ctx.font = '20px Outfit';
        ctx.fillText(`점수: ${score}`, 20, 40);
    }

    function gameOver() {
        gameActive = false;
        gameTitle.innerText = '게임 오버';
        document.getElementById('game-instr').innerText = `최종 점수: ${score}`;
        overlay.style.display = 'flex';
        // Reset state for next try
        setTimeout(() => {
            if (overlay.style.display === 'flex') {
                const title = currentGame === 'galaxy-runner' ? '불규칙한 똥 피하기' : '네온 스네이크';
                gameTitle.innerText = title;
                document.getElementById('game-instr').innerText = currentGame === 'galaxy-runner' ? '다시 도전하시겠습니까?' : '다시 도전하시겠습니까?';
            }
        }, 2000);
    }

    startBtn.onclick = () => {
        const title = currentGame === 'galaxy-runner' ? '불규칙한 똥 피하기' : '네온 스네이크';
        resetGame(title);
        startGame();
    };

    // Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-text').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
});
