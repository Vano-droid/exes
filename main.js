const app = document.getElementById('app');
        let examData = {};
        let currentExam = null;
        let currentTicket = null;
        let currentPart = null;

        async function loadExamData() {
            try {
                const response = await fetch('exams.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                examData = await response.json();
                if (Object.keys(examData).length === 0) throw new Error('JSON-файл пуст');
                initApp();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                app.innerHTML = `
                    <div class="error">
                        <h2>❌ Ошибка загрузки данных</h2>
                        <p>Не удалось загрузить файл <strong>exams.json</strong></p>
                        <p style="margin-top: 10px; font-size: 0.9rem;">${error.message}</p>
                        <button class="btn" onclick="location.reload()" style="margin-top: 20px;">🔄 Попробовать снова</button>
                    </div>`;
            }
        }

        function getStateFromURL() {
            const params = new URLSearchParams(window.location.search);
            return {
                exam: params.get('exam'),
                ticket: params.get('ticket'),
                part: params.get('part')
            };
        }

        function updateURL(exam, ticket, part) {
            const params = new URLSearchParams();
            if (exam) params.set('exam', exam);
            if (ticket) params.set('ticket', ticket);
            if (part) params.set('part', part);
            const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
            window.history.pushState({}, '', newURL);
        }

        function hasParts(ticketData) {
            return typeof ticketData === 'object' && !Array.isArray(ticketData);
        }

        function renderExamSelection(searchQuery = '') {
            updateURL(null, null, null);
            let exams = Object.keys(examData);
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                exams = exams.filter(exam => exam.toLowerCase().includes(query));
            }

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot active"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                </div>
                <h1>📚 Экзамены</h1>
                <h2>Выбери предмет</h2>
                <div class="divider"></div>
                <input type="text" class="search-box" placeholder="🔍 Поиск предмета..." 
                       oninput="renderExamSelection(this.value)" value="${searchQuery}">`;

            if (exams.length === 0) {
                html += '<p style="color: #888; padding: 20px;">Ничего не найдено</p>';
            } else {
                exams.forEach(exam => {
                    const ticketCount = Object.keys(examData[exam]).length;
                    html += `<button class="btn" onclick="selectExam('${escapeAttr(exam)}')">
                        ${exam} <span style="opacity: 0.7; font-size: 0.9rem;">(${ticketCount} вариантов)</span>
                    </button>`;
                });
            }
            app.innerHTML = html;
        }

        function selectExam(examName) {
            if (!examData[examName]) { renderExamSelection(); return; }
            updateURL(examName, null, null);
            currentExam = examName;
            currentTicket = null;
            currentPart = null;

            const tickets = Object.keys(examData[examName]);
            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                </div>
                <h1>📖 ${examName}</h1>
                <h2>Выбери вариант</h2>
                <div class="divider"></div>
                <p class="ticket-count">Всего вариантов: ${tickets.length}</p>`;

            tickets.forEach(ticket => {
                const ticketData = examData[examName][ticket];
                const partsCount = hasParts(ticketData) ? Object.keys(ticketData).length : 1;
                html += `<button class="btn" onclick="selectTicket('${escapeAttr(examName)}', '${escapeAttr(ticket)}')">
                    ${ticket} <span style="opacity: 0.7; font-size: 0.9rem;">(${partsCount} частей)</span>
                </button>`;
            });

            html += `<button class="btn back-btn" onclick="renderExamSelection()">← Назад к экзаменам</button>`;
            app.innerHTML = html;
        }

        function selectTicket(examName, ticketName) {
            if (!examData[examName] || !examData[examName][ticketName]) {
                selectExam(examName);
                return;
            }
            updateURL(examName, ticketName, null);
            currentExam = examName;
            currentTicket = ticketName;
            currentPart = null;

            const ticketData = examData[examName][ticketName];
            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                    <div class="stage-dot"></div>
                </div>
                <h1>📝 ${examName}</h1>
                <h2>${ticketName}</h2>
                <div class="divider"></div>`;

            if (hasParts(ticketData)) {
                // Есть части — показываем выбор
                html += '<p class="ticket-count">Выбери часть:</p><div class="parts-container">';
                Object.keys(ticketData).forEach(partName => {
                    const preview = ticketData[partName].substring(0, 100) + '...';
                    html += `
                        <div class="part-card" onclick="showPart('${escapeAttr(examName)}', '${escapeAttr(ticketName)}', '${escapeAttr(partName)}')">
                            <h3>${partName}</h3>
                            <div class="preview">${escapeHTML(preview)}</div>
                        </div>`;
                });
                html += '</div>';
                html += `<button class="btn" onclick="showAllParts('${escapeAttr(examName)}', '${escapeAttr(ticketName)}')">
                    📋 Показать все части сразу
                </button>`;
            } else {
                // Нет частей — показываем сразу ответ
                html += `
                    <div class="answer-box">
                        <h3>📝 Ответ:</h3>
                        <div class="answer-content">${escapeHTML(ticketData)}</div>
                    </div>`;
            }

            html += `
                <button class="btn back-btn" onclick="selectExam('${escapeAttr(examName)}')">← Назад к вариантам</button>
                <button class="btn back-btn" onclick="renderExamSelection()">← К списку экзаменов</button>`;

            app.innerHTML = html;
        }

        function showPart(examName, ticketName, partName) {
            if (!examData[examName]?.[ticketName]?.[partName]) {
                selectTicket(examName, ticketName);
                return;
            }
            updateURL(examName, ticketName, partName);
            currentExam = examName;
            currentTicket = ticketName;
            currentPart = partName;

            const ticketData = examData[examName][ticketName];
            const parts = Object.keys(ticketData);
            const answer = ticketData[partName];

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                </div>
                <h1>✅ Ответ</h1>
                <h2>${examName} — ${ticketName}</h2>
                <h3 style="color: #e94560; margin-bottom: 20px;">${partName}</h3>
                <div class="divider"></div>`;

            // Навигация по частям
            if (parts.length > 1) {
                html += '<div class="answer-navigation">';
                parts.forEach(part => {
                    const isActive = part === partName ? ' active' : '';
                    html += `<button class="nav-btn${isActive}" onclick="showPart('${escapeAttr(examName)}', '${escapeAttr(ticketName)}', '${escapeAttr(part)}')">${part}</button>`;
                });
                html += '</div>';
            }

            html += `
                <div class="answer-box">
                    <h3>📝 Содержание ответа:</h3>
                    <div class="answer-content">${escapeHTML(answer)}</div>
                </div>
                <button class="btn back-btn" onclick="selectTicket('${escapeAttr(examName)}', '${escapeAttr(ticketName)}')">← Назад к частям</button>
                <button class="btn back-btn" onclick="selectExam('${escapeAttr(examName)}')">← К вариантам</button>`;

            app.innerHTML = html;
            document.querySelector('.answer-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function showAllParts(examName, ticketName) {
            const ticketData = examData[examName]?.[ticketName];
            if (!ticketData || !hasParts(ticketData)) {
                selectTicket(examName, ticketName);
                return;
            }

            currentExam = examName;
            currentTicket = ticketName;
            currentPart = null;
            updateURL(examName, ticketName, 'all');

            let html = `
                <div class="stage-indicator">
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot"></div>
                    <div class="stage-dot active"></div>
                </div>
                <h1>📋 Все ответы</h1>
                <h2>${examName} — ${ticketName}</h2>
                <div class="divider"></div>`;

            Object.entries(ticketData).forEach(([partName, answer]) => {
                html += `
                    <div class="answer-box">
                        <h3>📌 ${partName}</h3>
                        <div class="answer-content">${escapeHTML(answer)}</div>
                    </div>`;
            });

            html += `
                <button class="btn back-btn" onclick="selectTicket('${escapeAttr(examName)}', '${escapeAttr(ticketName)}')">← Назад к выбору части</button>
                <button class="btn back-btn" onclick="selectExam('${escapeAttr(examName)}')">← К вариантам</button>`;

            app.innerHTML = html;
        }

        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function escapeAttr(str) {
            return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }

        function initApp() {
            const state = getStateFromURL();
            if (state.exam && state.ticket && state.part && state.part === 'all') {
                showAllParts(state.exam, state.ticket);
            } else if (state.exam && state.ticket && state.part) {
                showPart(state.exam, state.ticket, state.part);
            } else if (state.exam && state.ticket) {
                selectTicket(state.exam, state.ticket);
            } else if (state.exam) {
                selectExam(state.exam);
            } else {
                renderExamSelection();
            }
        }

        window.addEventListener('popstate', () => {
            if (Object.keys(examData).length === 0) return;
            initApp();
        });

        loadExamData();