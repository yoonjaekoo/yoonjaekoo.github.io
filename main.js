document.addEventListener('DOMContentLoaded', () => {
    // UI Helpers
    const modal = document.getElementById('game-modal');
    const closeBtn = document.querySelector('.close-modal');
    const playButtons = document.querySelectorAll('.play-btn');
    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('game-overlay');
    const gameTitle = document.getElementById('game-title');
    const gameCanvas = document.getElementById('game-canvas');
    const gameInstr = document.getElementById('game-instr');
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

    // Mobile Controls
    const mobileControls = document.getElementById('mobile-controls');
    const controlButtons = document.querySelectorAll('.control-btn');
    const touchQuery = window.matchMedia('(pointer: coarse)');

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

            themeClickCount++;
            if (themeClickCount === 30) {
                if (messageModal) {
                    messageModal.style.display = 'block';
                }
                themeClickCount = 0;
            }
        };
    }

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navList = document.getElementById('nav-list');

    if (mobileMenu) {
        mobileMenu.onclick = () => {
            mobileMenu.classList.toggle('is-active');
            navList.classList.toggle('active');
        };
    }

    document.querySelectorAll('#nav-list li a').forEach(link => {
        link.onclick = () => {
            mobileMenu.classList.remove('is-active');
            navList.classList.remove('active');
        };
    });

    if (closeMessageModal) closeMessageModal.onclick = () => messageModal.style.display = 'none';
    if (closeMessageBtn) closeMessageBtn.onclick = () => messageModal.style.display = 'none';
    window.addEventListener('click', (event) => {
        if (event.target == messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // Obfuscated API Key (Base64)
    const _k = 'QUl6YVN5RFBCNkxiN3Zpai10U0ZEQWNyeXR2UWVMX2gtcC1pNnVF';

    if (summarizeBtn) {
        summarizeBtn.onclick = async () => {
            const text = textToSummarize.value.trim();
            let apiKey = apiKeyInput.value.trim();

            if (!text) {
                alert('요약할 텍스트를 입력해주세요.');
                return;
            }

            if (!apiKey) {
                apiKey = atob(_k);
            }

            if (!apiKey) {
                alert('Gemini API 키를 입력해주세요.');
                return;
            }

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
    let frameCount = 0;

    // Runner Game State
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
    let snakeSpeed = 10;

    // Rhythm Game State
    const rhythmBeatInterval = 800;
    const rhythmWindow = { perfect: 120, good: 220 };
    const rhythmDuration = 30000;
    let rhythmStartTime = 0;
    let rhythmLastMissCheckedBeat = -1;
    let rhythmLastHitBeat = -1;
    let combo = 0;
    let bestCombo = 0;

    function shouldShowTouchControls() {
        return Boolean(currentGame) && gameActive && modal.style.display === 'block' && touchQuery.matches;
    }

    function updateMobileControlsVisibility() {
        if (!mobileControls) return;

        const shouldShowControls = shouldShowTouchControls();
        mobileControls.style.display = shouldShowControls ? 'grid' : 'none';

        const visibleControlsByGame = {
            'galaxy-runner': new Set(['left', 'right']),
            snake: new Set(['left', 'up', 'down', 'right']),
            rhythm: new Set(['action'])
        };
        const visibleControls = visibleControlsByGame[currentGame] || new Set();

        controlButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.visibility = visibleControls.has(btn.dataset.control) ? 'visible' : 'hidden';
        });
    }

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

        runnerPlayer.y = gameCanvas.height - 50;
        runnerPlayer.x = gameCanvas.width / 2 - runnerPlayer.width / 2;
    }

    function getGameText(type) {
        if (type === 'galaxy-runner') return { title: '불규칙한 똥 피하기', instr: '방향키/좌우 버튼으로 이동하세요.' };
        if (type === 'snake') return { title: '네온 스네이크', instr: '방향키/방향 버튼으로 뱀을 조종하세요.' };
        return { title: '클릭 리듬 챌린지', instr: '비트가 원에 겹칠 때 클릭/스페이스/TAP!' };
    }

    playButtons.forEach(btn => {
        btn.onclick = () => {
            currentGame = btn.getAttribute('data-game');
            modal.style.display = 'block';
            resizeCanvas();
            const { title } = getGameText(currentGame);
            resetGame(title);
            updateMobileControlsVisibility();
        };
    });

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        stopGame();
        currentGame = '';
        updateMobileControlsVisibility();
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            stopGame();
            currentGame = '';
            updateMobileControlsVisibility();
        }
    };

    const keys = {};

    function setSnakeDirection(direction) {
        if (direction === 'left' && dx === 0) { dx = -grid; dy = 0; }
        if (direction === 'up' && dy === 0) { dy = -grid; dx = 0; }
        if (direction === 'right' && dx === 0) { dx = grid; dy = 0; }
        if (direction === 'down' && dy === 0) { dy = grid; dx = 0; }
    }

    function rhythmTap() {
        if (!gameActive || currentGame !== 'rhythm') return;
        const now = performance.now();
        const elapsed = now - rhythmStartTime;
        const beat = Math.round(elapsed / rhythmBeatInterval);
        const beatTime = beat * rhythmBeatInterval;
        const diff = Math.abs(elapsed - beatTime);

        if (beat === rhythmLastHitBeat) return;

        if (diff <= rhythmWindow.perfect) {
            score += 3;
            combo += 1;
            rhythmLastHitBeat = beat;
        } else if (diff <= rhythmWindow.good) {
            score += 1;
            combo += 1;
            rhythmLastHitBeat = beat;
        } else {
            combo = 0;
        }

        bestCombo = Math.max(bestCombo, combo);
    }

    function pressControl(control) {
        if (!gameActive) return;
        if (currentGame === 'snake') {
            setSnakeDirection(control);
            return;
        }
        if (currentGame === 'galaxy-runner') {
            if (control === 'left') keys.ArrowLeft = true;
            if (control === 'right') keys.ArrowRight = true;
            return;
        }
        if (currentGame === 'rhythm' && control === 'action') {
            rhythmTap();
        }
    }

    function releaseControl(control) {
        if (currentGame !== 'galaxy-runner') return;
        if (control === 'left') keys.ArrowLeft = false;
        if (control === 'right') keys.ArrowRight = false;
    }

    controlButtons.forEach(button => {
        const control = button.dataset.control;
        const activate = (event) => {
            event.preventDefault();
            button.classList.add('active');
            pressControl(control);
        };
        const deactivate = () => {
            button.classList.remove('active');
            releaseControl(control);
        };

        button.addEventListener('touchstart', activate, { passive: false });
        button.addEventListener('touchend', deactivate);
        button.addEventListener('touchcancel', deactivate);
        button.addEventListener('mousedown', activate);
        button.addEventListener('mouseup', deactivate);
        button.addEventListener('mouseleave', deactivate);
    });

    window.addEventListener('keydown', e => {
        keys[e.code] = true;

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        if (currentGame === 'snake') {
            if (e.code === 'ArrowLeft') setSnakeDirection('left');
            if (e.code === 'ArrowUp') setSnakeDirection('up');
            if (e.code === 'ArrowRight') setSnakeDirection('right');
            if (e.code === 'ArrowDown') setSnakeDirection('down');
        }

        if (currentGame === 'rhythm' && (e.code === 'Space' || e.code === 'Enter')) {
            rhythmTap();
        }
    });

    window.addEventListener('keyup', e => {
        keys[e.code] = false;
    });

    gameCanvas.addEventListener('touchmove', e => {
        if (currentGame) e.preventDefault();
    }, { passive: false });

    gameCanvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const rect = gameCanvas.getBoundingClientRect();
        const canvasX = touchX - rect.left;
        const canvasY = touchY - rect.top;

        if (currentGame === 'galaxy-runner') {
            if (canvasX < gameCanvas.width / 2) runnerPlayer.x -= runnerPlayer.speed * 3;
            else runnerPlayer.x += runnerPlayer.speed * 3;
        } else if (currentGame === 'snake') {
            const centerX = gameCanvas.width / 2;
            const centerY = gameCanvas.height / 2;
            if (Math.abs(canvasX - centerX) > Math.abs(canvasY - centerY)) {
                if (canvasX < centerX) setSnakeDirection('left');
                else setSnakeDirection('right');
            } else if (canvasY < centerY) {
                setSnakeDirection('up');
            } else {
                setSnakeDirection('down');
            }
        } else if (currentGame === 'rhythm') {
            rhythmTap();
        }
    }, { passive: false });

    function resetGame(title) {
        gameActive = false;
        score = 0;
        combo = 0;
        bestCombo = 0;
        frameCount = 0;
        gameTitle.innerText = title;
        gameInstr.innerText = getGameText(currentGame).instr;
        overlay.style.display = 'flex';
        updateMobileControlsVisibility();

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
        } else if (currentGame === 'rhythm') {
            rhythmStartTime = 0;
            rhythmLastMissCheckedBeat = -1;
            rhythmLastHitBeat = -1;
        }

        cancelAnimationFrame(animationId);
    }

    function startGame() {
        overlay.style.display = 'none';
        gameActive = true;
        if (currentGame === 'rhythm') {
            rhythmStartTime = performance.now();
            rhythmLastMissCheckedBeat = -1;
            rhythmLastHitBeat = -1;
        }
        updateMobileControlsVisibility();
        gameLoop();
    }

    function stopGame() {
        gameActive = false;
        cancelAnimationFrame(animationId);
        updateMobileControlsVisibility();
    }

    function spawnObstacle() {
        const width = Math.random() * 60 + 20;
        obstacles.push({
            x: Math.random() * (gameCanvas.width - width),
            y: -50,
            width,
            height: width * 0.8,
            color: '#795548'
        });
    }

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
        } else if (currentGame === 'rhythm') {
            updateRhythm();
        }

        animationId = requestAnimationFrame(gameLoop);
    }

    function updateRunner() {
        if (keys.ArrowLeft || keys.KeyA) runnerPlayer.x -= runnerPlayer.speed;
        if (keys.ArrowRight || keys.KeyD) runnerPlayer.x += runnerPlayer.speed;

        if (runnerPlayer.x < 0) runnerPlayer.x = 0;
        if (runnerPlayer.x + runnerPlayer.width > gameCanvas.width) runnerPlayer.x = gameCanvas.width - runnerPlayer.width;

        ctx.fillStyle = runnerPlayer.color;
        ctx.beginPath();
        ctx.roundRect(runnerPlayer.x, runnerPlayer.y, runnerPlayer.width, runnerPlayer.height, 5);
        ctx.fill();

        if (frameCount % obstacleFrequency === 0) spawnObstacle();

        obstacles.forEach((obs, index) => {
            obs.y += obstacleSpeed + (score / 15);

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

        drawScore();
    }

    function updateSnake() {
        if (frameCount % snakeSpeed !== 0) {
            drawSnake();
            drawScore();
            return;
        }

        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        if (head.x < 0 || head.x >= gameCanvas.width || head.y < 0 || head.y >= gameCanvas.height) {
            return gameOver();
        }

        for (let i = 0; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return gameOver();
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score++;
            spawnFood();
            if (score % 7 === 0 && snakeSpeed > 4) snakeSpeed--;
        } else {
            snake.pop();
        }

        drawSnake();
        drawScore();
    }

    function updateRhythm() {
        const elapsed = performance.now() - rhythmStartTime;
        const beatFloat = elapsed / rhythmBeatInterval;
        const beatPhase = beatFloat - Math.floor(beatFloat);
        const currentBeat = Math.floor(beatFloat);

        if (currentBeat > rhythmLastMissCheckedBeat) {
            const missedBeat = currentBeat - 1;
            if (missedBeat >= 0 && rhythmLastHitBeat < missedBeat) combo = 0;
            rhythmLastMissCheckedBeat = currentBeat;
        }

        const centerX = gameCanvas.width / 2;
        const centerY = gameCanvas.height / 2;
        const baseRadius = Math.min(gameCanvas.width, gameCanvas.height) * 0.18;
        const pulseRadius = baseRadius + beatPhase * baseRadius * 1.3;

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

        ctx.strokeStyle = '#16e0bd';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 2.1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(120, 195, 251, 0.85)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 22px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('TAP!', centerX, centerY + 8);

        drawScore();
        ctx.fillStyle = '#fff';
        ctx.font = '18px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`콤보: ${combo}`, 20, 70);
        ctx.fillText(`최고 콤보: ${bestCombo}`, 20, 98);

        const remain = Math.max(0, Math.ceil((rhythmDuration - elapsed) / 1000));
        ctx.textAlign = 'right';
        ctx.fillText(`남은 시간: ${remain}s`, gameCanvas.width - 20, 40);

        if (elapsed >= rhythmDuration) {
            rhythmGameOver();
        }
    }

    function drawSnake() {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        ctx.arc(food.x + grid / 2, food.y + grid / 2, grid / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

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
        ctx.textAlign = 'left';
        ctx.fillText(`점수: ${score}`, 20, 40);
    }

    function rhythmGameOver() {
        gameActive = false;
        gameTitle.innerText = '리듬 챌린지 종료';
        gameInstr.innerText = `점수: ${score} | 최고 콤보: ${bestCombo}`;
        overlay.style.display = 'flex';
        updateMobileControlsVisibility();
    }

    function gameOver() {
        gameActive = false;
        gameTitle.innerText = '게임 오버';
        gameInstr.innerText = `최종 점수: ${score}`;
        overlay.style.display = 'flex';
        updateMobileControlsVisibility();
        setTimeout(() => {
            if (overlay.style.display === 'flex') {
                const { title } = getGameText(currentGame);
                gameTitle.innerText = title;
                gameInstr.innerText = '다시 도전하시겠습니까?';
            }
        }, 2000);
    }

    startBtn.onclick = () => {
        const { title } = getGameText(currentGame);
        resetGame(title);
        startGame();
    };

    window.addEventListener('resize', () => {
        if (modal && modal.style.display === 'block' && currentGame) {
            resizeCanvas();
        }
        updateMobileControlsVisibility();
    });

    touchQuery.addEventListener('change', updateMobileControlsVisibility);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-text').forEach(el => {
        observer.observe(el);
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
});
