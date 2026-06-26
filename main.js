
        const app = document.getElementById('app');
        let examData = {};
        let currentExam = null;
        let currentTicket = null;

        // Загрузка данных из JSON-файла
        async function loadExamData() {
            try {
                const response = await fetch('exams.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                examData = await response.json();
                
                // Проверяем, что данные загрузились
                if (Object.keys(examData).length === 0) {
                    throw new Error('JSON-файл пуст');
                }
                
                // Запускаем приложение после загрузки данных
                initApp();
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                app.innerHTML = `
                    <div class="error">
                        <h2>❌ Ошибка загрузки данных</h2>
                        <p>Не удалось загрузить файл <strong>exams.json</strong></p>
                        <p style="margin-top: 10px; font-size: 0.9rem; color: #888;">
                            ${error.message}
                        </p>
                        <p style="margin-top: 15px; font-size: 0.9rem;">
                            Убедись, что файл exams.json находится в той же папке, что и index.html
                        </p>
                        <button class="btn" onclick="location.reload()" style="margin-top: 20px;">
                            🔄 Попробовать снова
                        </button>
                    </div>
                `;
            }
        }

        function getStateFromURL() {
            const params = new URLSearchParams(window.location.search);
            return {
                exam: params.get('exam'),
                ticket: params.get('ticket')
            };
        }

        function updateURL(exam, ticket) {
            const params = new URLSearchParams();
            if (exam) params.set('exam', exam);
            if (ticket) params.set('ticket', ticket);
            const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
            window.history.pushState({}, '', newURL);
        }

        function renderExamSelection(searchQuery = '') {
            updateURL(null, null);
            currentExam = null;
            currentTicket = null;

            let exams = Object.keys(examData);
            
            // Фильтрация при поиске
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                exams = exams.filter(exam => exam.toLowerCase().includes(query));
            }

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot active"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                </div>
                <h1>📚 Экзамены</h1>
                <h2>Выбери предмет</h2>
                <div class="divider"></div>
                <input type="text" class="search-box" placeholder="🔍 Поиск предмета..." 
                       oninput="renderExamSelection(this.value)" value="${searchQuery}">
            `;

            if (exams.length === 0) {
                html += '<p style="color: #888; padding: 20px;">Ничего не найдено</p>';
            } else {
                exams.forEach(exam => {
                    const ticketCount = Object.keys(examData[exam]).length;
                    html += `
                        <button class="btn" onclick="selectExam('${exam.replace(/'/g, "\\'")}')">
                            ${exam} 
                            <span style="opacity: 0.7; font-size: 0.9rem;">(${ticketCount} билетов)</span>
                        </button>
                    `;
                });
            }

            app.innerHTML = html;
        }

        function selectExam(examName) {
            if (!examData[examName]) {
                renderExamSelection();
                return;
            }

            updateURL(examName, null);
            currentExam = examName;
            currentTicket = null;

            const tickets = Object.keys(examData[examName]);

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                    <div class="stage-dot"></div>
                </div>
                <h1>📖 ${examName}</h1>
                <h2>Выбери билет или вариант</h2>
                <div class="divider"></div>
                <p class="ticket-count">Всего билетов: ${tickets.length}</p>
            `;

            tickets.forEach(ticket => {
                // Превью ответа (первые 80 символов)
                const preview = examData[examName][ticket].substring(0, 80) + '...';
                html += `
                    <button class="btn" onclick="showAnswer('${examName.replace(/'/g, "\\'")}', '${ticket.replace(/'/g, "\\'")}')"
                            title="${preview}">
                        ${ticket}
                    </button>
                `;
            });

            html += `<button class="btn back-btn" onclick="renderExamSelection()">← Назад к экзаменам</button>`;

            app.innerHTML = html;
        }

        function showAnswer(examName, ticketName) {
            if (!examData[examName] || !examData[examName][ticketName]) {
                selectExam(examName);
                return;
            }

            updateURL(examName, ticketName);
            currentExam = examName;
            currentTicket = ticketName;

            const answer = examData[examName][ticketName];

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                </div>
                <h1>✅ Ответ</h1>
                <h2>${examName} — ${ticketName}</h2>
                <div class="divider"></div>
                <div class="answer-box">
                    <h3>📝 Содержание ответа:</h3>
                    <div class="answer-content">${escapeHTML(answer)}</div>
                </div>
                <button class="btn back-btn" onclick="selectExam('${examName.replace(/'/g, "\\'")}')">← Назад к билетам</button>
                <button class="btn back-btn" onclick="renderExamSelection()">← К списку экзаменов</button>
            `;

            app.innerHTML = html;
            
            // Прокрутка к ответу
            document.querySelector('.answer-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Защита от XSS
        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Инициализация приложения
        function initApp() {
            const initialState = getStateFromURL();
            
            if (initialState.exam && initialState.ticket && examData[initialState.exam]?.[initialState.ticket]) {
                showAnswer(initialState.exam, initialState.ticket);
            } else if (initialState.exam && examData[initialState.exam]) {
                selectExam(initialState.exam);
            } else {
                renderExamSelection();
            }
        }

        // Обработка кнопок "назад" в браузере
        window.addEventListener('popstate', () => {
            if (Object.keys(examData).length === 0) return; // Данные ещё не загружены
            
            const state = getStateFromURL();
            if (state.exam && state.ticket && examData[state.exam]?.[state.ticket]) {
                showAnswer(state.exam, state.ticket);
            } else if (state.exam && examData[state.exam]) {
                selectExam(state.exam);
            } else {
                renderExamSelection();
            }
        });

        // Загружаем данные при старте
        loadExamData();