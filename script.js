// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    if (!date) return '-';
    // Se for string YYYY-MM-DD (vindo de input date), ajusta fuso horário para evitar atraso de 1 dia
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper: identifica registros financeiros (acertos) para excluí-los dos totais de produtos
function isFinancialSale(sale) {
    return sale.productId === 'ACERTO' || sale.category === 'Financeiro';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showNotification(message, type = 'success') {
    alert(message); // Pode ser substituído por uma notificação mais elegante
}

function sendWhatsAppReceipt(clientName, clientPhone, itemsText, totalValue) {
    if (!clientPhone) return;
    
    let cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return; // Ignora se o número for inválido/muito curto

    if (!cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone; // Adiciona DDI do Brasil caso não tenha
    }

    const defaultTemplate = `Olá, *{nome}*! 🌟\n\nAgradecemos muito pela sua compra!\n\n*Detalhes do seu pedido:*\n{itens}\n*Total da Compra:* {total}\n\nQualquer dúvida, estou à disposição. 🥰`;
    
    let template = defaultTemplate;
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.whatsappTemplate) {
        template = currentUser.whatsappTemplate;
    }

    const message = template
        .replace(/{nome}/g, clientName)
        .replace(/{itens}/g, itemsText)
        .replace(/{total}/g, formatCurrency(totalValue));
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    if (confirm(`Deseja enviar o comprovante para o WhatsApp de ${clientName}?`)) {
        window.open(whatsappUrl, '_blank');
    }
}

function openWhatsAppConfigModal() {
    if (!document.getElementById('whatsappConfigModal')) {
        const modalHtml = `
            <div id="whatsappConfigModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Personalizar Mensagem</h3>
                        <button class="close-modal" onclick="document.getElementById('whatsappConfigModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px; color: #666; font-size: 0.9em;">
                            Use as variáveis abaixo para que o sistema substitua automaticamente: <br>
                            <strong style="color:#2c1810;">{nome}</strong> = Nome do cliente <br>
                            <strong style="color:#2c1810;">{itens}</strong> = Lista de produtos <br>
                            <strong style="color:#2c1810;">{total}</strong> = Valor total
                        </p>
                        <div class="form-group">
                            <textarea id="whatsappTemplateInput" class="input-field" style="height: 150px; resize: vertical; font-family: inherit;"></textarea>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button class="btn-secondary" onclick="resetWhatsAppTemplate()" style="flex: 1;">Restaurar Padrão</button>
                            <button class="btn-primary" onclick="saveWhatsAppTemplate()" style="flex: 1;">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const defaultTemplate = `Olá, *{nome}*! 🌟\n\nAgradecemos muito pela sua compra!\n\n*Detalhes do seu pedido:*\n{itens}\n*Total da Compra:* {total}\n\nQualquer dúvida, estou à disposição. 🥰`;
    const currentTemplate = (typeof currentUser !== 'undefined' && currentUser && currentUser.whatsappTemplate) ? currentUser.whatsappTemplate : defaultTemplate;
    
    document.getElementById('whatsappTemplateInput').value = currentTemplate;
    document.getElementById('whatsappConfigModal').classList.add('active');
}

function resetWhatsAppTemplate() {
    const defaultTemplate = `Olá, *{nome}*! 🌟\n\nAgradecemos muito pela sua compra!\n\n*Detalhes do seu pedido:*\n{itens}\n*Total da Compra:* {total}\n\nQualquer dúvida, estou à disposição. 🥰`;
    document.getElementById('whatsappTemplateInput').value = defaultTemplate;
}

async function saveWhatsAppTemplate() {
    const template = document.getElementById('whatsappTemplateInput').value.trim();
    if (!template) {
        showNotification('A mensagem não pode ficar vazia', 'error');
        return;
    }
    
    showLoading();
    try {
        await usersRef.child(currentUser.uid).update({ whatsappTemplate: template });
        currentUser.whatsappTemplate = template; // atualiza o objeto local
        document.getElementById('whatsappConfigModal').classList.remove('active');
        hideLoading();
        showNotification('Mensagem personalizada salva!');
    } catch (e) {
        hideLoading();
        console.error(e);
        showNotification('Erro ao salvar', 'error');
    }
}

// ============================================
// AUTENTICAÇÃO E LOGIN
// ============================================

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    showLoading();

    try {
        // Fazer login com Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Buscar dados do usuário no database
        const userSnapshot = await usersRef.child(user.uid).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            throw new Error('Usuário não encontrado no banco de dados');
        }

        if (userData.isDeleted) {
            throw new Error('Acesso revogado');
        }

        currentUser = {
            uid: user.uid,
            email: user.email,
            ...userData
        };

        // Redirecionar baseado no role
        if (userData.role === 'admin') {
            showScreen('adminScreen');
            loadAdminData();
        } else {
            showScreen('resellerScreen');
            loadResellerData();
        }

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro no login:', error);
        if (error.message === 'Acesso revogado') {
            showNotification('Seu acesso foi revogado. Entre em contato com o administrador.', 'error');
        } else {
            showNotification('E-mail ou senha incorretos', 'error');
        }
    }
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        showScreen('loginScreen');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    });
}

// Monitorar estado de autenticação
auth.onAuthStateChanged(async (user) => {
    if (user && !currentUser) {
        showLoading();
        try {
            const userSnapshot = await usersRef.child(user.uid).once('value');
            const userData = userSnapshot.val();
            
            if (userData) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };

                if (userData.role === 'admin') {
                    showScreen('adminScreen');
                    loadAdminData();
                } else {
                    showScreen('resellerScreen');
                    loadResellerData();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
        hideLoading();
    }
});

// ============================================
// NAVEGAÇÃO DE TABS
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    if (tabName === 'sales') {
        loadProducts();
        loadSoldProducts();
        updateCartFloatingButton();
    } else if (tabName === 'payments') {
        loadPayments();
    } else if (tabName === 'clients') {
        loadClients();
    } else if (tabName === 'goals') {
        loadGoalsForm();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }

    if (tabName !== 'sales') {
        const btn = document.getElementById('floatingCartBtn');
        if (btn) btn.style.display = 'none';
    }
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (typeof event !== 'undefined' && event && event.target && event.target.classList && event.target.classList.contains('tab-btn')) {
        event.target.classList.add('active');
    } else {
        const btn = document.querySelector(`button[onclick="switchAdminTab('${tabName}')"]`);
        if (btn) btn.classList.add('active');
    }

    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'dashboard') {
        document.getElementById('adminDashboard').classList.add('active');
        loadAdminDashboard();
        loadPendingSettlements(); // Carregar solicitações de acerto
    } else if (tabName === 'products') {
        // Aba de produtos desativada
        // document.getElementById('adminProducts').classList.add('active');
        // loadAdminProducts();
    } else if (tabName === 'resellers') {
        document.getElementById('adminResellers').classList.add('active');
        loadResellers();
    } else if (tabName === 'orders') {
        document.getElementById('adminOrders').classList.add('active');
        loadOrders();
    } else if (tabName === 'clients') {
        document.getElementById('adminClients').classList.add('active');
        loadAdminClients();
    }
}

// ============================================
// ADMIN - DASHBOARD & GRÁFICOS
// ============================================

let adminChart = null;
let adminCategoryChart = null;
let dashboardData = { sales: [], resellers: [] };

async function loadAdminDashboard() {
    showLoading();

    try {
        const [salesSnapshot, resellersSnapshot, productsSnapshot, configSnapshot] = await Promise.all([
            salesRef.once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            productsRef.once('value'),
            configRef.child('ranking').once('value')
        ]);

        // Atualizar filtro de revendedoras
        const filterSelect = document.getElementById('dashboardResellerFilter');
        const currentFilter = filterSelect.value;
        
        const resellers = [];
        resellersSnapshot.forEach(child => {
            resellers.push({ id: child.key, ...child.val() });
        });

        let options = '<option value="">Todas as Revendedoras</option>';
        resellers.forEach(r => {
            options += `<option value="${r.id}" ${r.id === currentFilter ? 'selected' : ''}>${r.name}</option>`;
        });
        filterSelect.innerHTML = options;

        const config = configSnapshot.val() || {};
        const lastResetDate = config.lastResetDate || 0;

        const sales = [];
        salesSnapshot.forEach((child) => {
            sales.push(child.val());
        });

        // Mapear categorias dos produtos
        const productCategories = {};
        productsSnapshot.forEach(child => {
            const p = child.val();
            productCategories[child.key] = p.category || 'Sem Categoria';
        });

        // Filtrar vendas se houver revendedora selecionada
        let filteredSales = currentFilter ? sales.filter(s => s.resellerId === currentFilter) : sales;

        // Filtrar pelo ciclo atual (Caixa do Admin) - zera a contagem visual baseada no último reset
        filteredSales = filteredSales.filter(s => s.date >= lastResetDate);

        // Separar vendas de produtos das vendas financeiras (acertos)
        const productSales = filteredSales.filter(s => !isFinancialSale(s));
        const financialSales = filteredSales.filter(s => isFinancialSale(s));

        // Calcular totais gerais (apenas produtos, sem acertos)
        const totalValue = productSales.reduce((sum, sale) => sum + sale.price, 0);
        document.getElementById('adminTotalSales').textContent = formatCurrency(totalValue);
        document.getElementById('adminTotalCount').textContent = productSales.length;

        // Exibir acertos recebidos separadamente (se o elemento existir)
        const acertosEl = document.getElementById('adminTotalAcertos');
        if (acertosEl) {
            const totalAcertos = financialSales.reduce((sum, sale) => sum + sale.price, 0);
            acertosEl.textContent = formatCurrency(totalAcertos);
        }

        // Processar dados para o gráfico de Barras (Agrupar por mês) — apenas produtos
        const salesByMonth = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Inicializar últimos 6 meses
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}/${d.getFullYear().toString().substr(2)}`;
            salesByMonth[key] = 0;
        }

        productSales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${months[date.getMonth()]}/${date.getFullYear().toString().substr(2)}`;
            if (salesByMonth.hasOwnProperty(key)) {
                salesByMonth[key] += sale.price;
            }
        });

        renderSalesChart(Object.keys(salesByMonth), Object.values(salesByMonth));

        // Processar dados para o gráfico de Pizza (Agrupar por Categoria) — apenas produtos
        const salesByCategory = {};
        productSales.forEach(sale => {
            // Usa o ID do produto na venda para achar a categoria no mapa de produtos
            const category = productCategories[sale.productId] || 'Outros';
            salesByCategory[category] = (salesByCategory[category] || 0) + sale.price;
        });

        renderCategoryChart(Object.keys(salesByCategory), Object.values(salesByCategory));

        dashboardData = { sales, resellers, productCategories };
        renderResellerRanking(sales, resellers);
        loadPendingSettlements(); // Carregar solicitações de acerto

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar dashboard:', error);
    }
}

function renderSalesChart(labels, data) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Destruir gráfico anterior se existir para evitar sobreposição
    if (adminChart) {
        adminChart.destroy();
    }

    adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas Mensais (R$)',
                data: data,
                backgroundColor: '#2c1810',
                borderColor: '#2c1810',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Desempenho de Vendas (Últimos 6 Meses)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderCategoryChart(labels, data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (adminCategoryChart) {
        adminCategoryChart.destroy();
    }

    // Paleta de cores baseada no tema (Marrons, Dourados, Cremes)
    const colors = [
        '#2c1810', // Marrom Escuro
        '#d4a574', // Dourado
        '#8b5e3c', // Marrom Médio
        '#e5c19d', // Bege Escuro
        '#5d4037', // Café
        '#a1887f'  // Taupe
    ];

    adminCategoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                title: {
                    display: true,
                    text: 'Vendas por Categoria (R$)'
                }
            }
        }
    });
}

async function renderResellerRanking(sales, resellers) {
    let container = document.getElementById('adminRankingContainer');
    
    if (!container) {
        const dashboard = document.getElementById('adminDashboard');
        if (dashboard) {
            container = document.createElement('div');
            container.id = 'adminRankingContainer';
            container.style.marginTop = '20px';
            container.style.padding = '20px';
            container.style.backgroundColor = 'white';
            container.style.borderRadius = '8px';
            container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            dashboard.appendChild(container);
        } else {
            return;
        }
    }

    // Buscar dados de ciclos (config e histórico)
    let lastResetDate = 0;
    let history = [];
    
    try {
        const [configSnap, historySnap] = await Promise.all([
            configRef.child('ranking').once('value'),
            database.ref('rankingHistory').orderByChild('closedAt').once('value')
        ]);

        const config = configSnap.val();
        if (config && config.lastResetDate) {
            lastResetDate = config.lastResetDate;
        }

        historySnap.forEach(child => {
            history.push({ id: child.key, ...child.val() });
        });
        history.reverse(); // Mais recentes primeiro
    } catch (e) { console.error(e); }

    // Atualizar dados globais para uso no filtro
    dashboardData.rankingHistory = history;
    dashboardData.lastResetDate = lastResetDate;

    // --- Mover Filtro de Ciclo para o Topo ---
    const resellerFilter = document.getElementById('dashboardResellerFilter');
    let filtersContainer = document.getElementById('admin-filters-container');

    // Cria um container para os filtros se não existir
    if (!filtersContainer) {
        filtersContainer = document.createElement('div');
        filtersContainer.id = 'admin-filters-container';
        filtersContainer.style.cssText = 'display: flex; gap: 15px; align-items: center; flex-wrap: wrap;';
        
        if (resellerFilter) {
            // Move o filtro de revendedora existente para dentro do novo container
            resellerFilter.parentNode.insertBefore(filtersContainer, resellerFilter);
            filtersContainer.appendChild(resellerFilter);
        } else {
            const header = document.querySelector('#adminDashboard .admin-header');
            if (header) {
                header.appendChild(filtersContainer);
            }
        }
    }

    // Constrói e injeta o filtro de ciclo
    if (filtersContainer) {
        let cycleFilterWrapper = document.getElementById('ranking-cycle-filter-wrapper');
        if (!cycleFilterWrapper) {
            cycleFilterWrapper = document.createElement('div');
            cycleFilterWrapper.id = 'ranking-cycle-filter-wrapper';
            filtersContainer.appendChild(cycleFilterWrapper);
        }
        
        let cycleOptionsHtml = `<option value="current">Ciclo Atual (Desde ${formatDate(lastResetDate)})</option>`;
        history.forEach(h => {
            cycleOptionsHtml += `<option value="${h.id}">Ciclo Encerrado em ${formatDate(h.closedAt)}</option>`;
        });

        cycleFilterWrapper.innerHTML = `
            <select id="rankingCycleFilter" onchange="updateRankingList()" class="input-field" style="margin-bottom: 0; padding: 8px; font-size: 1em; width: auto;">
                ${cycleOptionsHtml}
            </select>
        `;
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; color: #2c1810;">🏆 Ranking (Top 5)</h3>
            <div style="display: flex; gap: 5px; align-items: center;">
                ${history.length > 0 ? `<button class="btn-secondary" onclick="openResellerRankingHistoryModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #6c757d; color: white; border: none;">📜 Galeria</button>` : ''}
                <button class="btn-secondary" onclick="openRewardRankingModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #d4a574; color: white; border: none;">🏆 Premiar / Zerar</button>
                <button class="btn-secondary" onclick="openEditCurrentCycleModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #17a2b8; color: white; border: none;" title="Editar Data Inicial do Ciclo Atual">📅</button>
            </div>
        </div>
        <div id="rankingListContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
    `;

    updateRankingList();
}

async function openEditCurrentCycleModal() {
    const date = prompt("Digite a nova data de INÍCIO para o ciclo atual (AAAA-MM-DD):", 
        dashboardData.lastResetDate ? new Date(dashboardData.lastResetDate).toISOString().split('T')[0] : '');
    
    if (date) {
        const [year, month, day] = date.split('-').map(Number);
        const newTimestamp = new Date(year, month - 1, day, 0, 0, 0).getTime();
        
        if (!isNaN(newTimestamp)) {
            try {
                await configRef.child('ranking').update({ lastResetDate: newTimestamp });
                showNotification('Data inicial do ciclo atualizada!');
                loadAdminDashboard();
            } catch (e) {
                console.error(e);
                showNotification('Erro ao atualizar data', 'error');
            }
        }
    }
}

function openRewardRankingModal() {
    if (!document.getElementById('rewardRankingModal')) {
        const modalHtml = `
            <div id="rewardRankingModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Premiar e Zerar Ranking</h3>
                        <button class="close-modal" onclick="document.getElementById('rewardRankingModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; margin-bottom: 15px;">Ao confirmar, o ranking será reiniciado. A contagem de vendas para o novo ranking começará a partir da data selecionada abaixo.</p>
                        <div class="form-group">
                            <label>Data do Reinício (Zerar a partir de):</label>
                            <input type="date" id="rewardResetDate" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="confirmRewardRanking()" style="width: 100%;">Confirmar e Zerar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Definir hoje como padrão
    document.getElementById('rewardResetDate').valueAsDate = new Date();
    document.getElementById('rewardRankingModal').classList.add('active');
}

async function confirmRewardRanking() {
    const dateStr = document.getElementById('rewardResetDate').value;
    if (!dateStr) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    // Criar timestamp do início do dia selecionado
    const resetTimestamp = new Date(year, month - 1, day, 0, 0, 0).getTime();

    showLoading();
    try {
        // 1. Buscar configuração atual para saber o início do ciclo que está fechando
        const configSnap = await configRef.child('ranking').once('value');
        const config = configSnap.val() || {};
        const previousResetDate = config.lastResetDate || 0;

        // 2. Buscar dados para calcular os vencedores do ciclo atual
        const [salesSnapshot, usersSnapshot, settlementsSnapshot] = await Promise.all([
            salesRef.once('value'),
            usersRef.once('value'), // Busca todos os usuários para garantir que acha o nome
            settlementsRef.once('value') // Para nomes de revendedoras excluídas
        ]);

        const sales = [];
        salesSnapshot.forEach(child => { sales.push(child.val()); });
        
        const resellers = {};
        usersSnapshot.forEach(child => resellers[child.key] = child.val());
        
        const deletedNames = {};
        settlementsSnapshot.forEach(child => {
            const s = child.val();
            if (s.resellerId && s.resellerName) deletedNames[s.resellerId] = s.resellerName;
        });

        // 3. Calcular ranking do ciclo que está encerrando (até o fim do dia de hoje)
        const today = new Date();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
        const cycleSales = sales.filter(s => 
            s.date >= previousResetDate && 
            s.date <= endOfToday &&
            s.productId !== 'ACERTO' && 
            s.category !== 'Financeiro'
        );
        const rankingMap = {};

        const totalCycleValue = cycleSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
        
        cycleSales.forEach(s => {
            if (s.resellerId) {
                const current = rankingMap[s.resellerId] || 0;
                rankingMap[s.resellerId] = current + (Number(s.price) || 0);
            }
        });

        const rankingList = Object.keys(rankingMap).map(uid => {
            let name = 'Desconhecido';
            if (resellers[uid]) name = resellers[uid].name;
            else if (deletedNames[uid]) name = deletedNames[uid] + ' (Excluída)';
            
            return {
                uid,
                name: name,
                total: rankingMap[uid]
            };
        }).sort((a, b) => b.total - a.total); // Salva o ranking completo

        // 4. Salvar no histórico se houver vencedores
        if (rankingList.length > 0) {
            await database.ref('rankingHistory').push({
                closedAt: Date.now(),
                cycleStartDate: previousResetDate,
                winners: rankingList,
                totalSales: totalCycleValue
            });
        }

        // 5. Atualizar data de reset para iniciar novo ciclo
        await configRef.child('ranking').update({ lastResetDate: resetTimestamp });
        
        document.getElementById('rewardRankingModal').classList.remove('active');
        hideLoading();
        showNotification('Ranking zerado e vencedores salvos no histórico!');
        loadAdminDashboard();
    } catch (error) {
        hideLoading();
        console.error(error);
        if (error.code === 'PERMISSION_DENIED') {
            showNotification('Permissão negada! Verifique as REGRAS no Console do Firebase.', 'error');
        } else {
            showNotification('Erro ao zerar ranking: ' + error.message, 'error');
        }
    }
}

function updateRankingList() {
    const container = document.getElementById('rankingListContainer');
    if (!container) return;

    const { sales, resellers, rankingHistory, lastResetDate, productCategories } = dashboardData;
    if (!sales || !resellers) return;

    const filterSelect = document.getElementById('rankingCycleFilter');
    if (!filterSelect) return;

    const selectedValue = filterSelect.value;
    let startTs, endTs;

    if (selectedValue === 'current') {
        startTs = lastResetDate || 0;
        endTs = Date.now();
    } else {
        const historyItem = (rankingHistory || []).find(h => h.id === selectedValue);
        if (historyItem) {
            startTs = historyItem.cycleStartDate || 0;
            // Usa fim do dia do closedAt para incluir todas as vendas daquele dia
            const closedDate = new Date(historyItem.closedAt);
            endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
        } else {
            startTs = 0;
            endTs = Date.now();
        }
    }

    // --- ATUALIZAR MÉTRICAS DO DASHBOARD (CAIXA E GRÁFICOS) ---
    // Filtrar vendas para os totais (respeitando filtro de revendedora se houver)
    const resellerFilterEl = document.getElementById('dashboardResellerFilter');
    const currentResellerId = resellerFilterEl ? resellerFilterEl.value : '';

    const dashboardSales = sales.filter(s => {
        if (s.date < startTs || s.date > endTs) return false;
        if (currentResellerId && s.resellerId !== currentResellerId) return false;
        return true;
    });

    const dashboardProductSales = dashboardSales.filter(s => !isFinancialSale(s));
    const dashboardFinancialSales = dashboardSales.filter(s => isFinancialSale(s));

    const totalVal = dashboardProductSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const totalCount = dashboardProductSales.length;
    const totalAcertos = dashboardFinancialSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    // Atualizar Elementos do DOM
    const totalEl = document.getElementById('adminTotalSales');
    const countEl = document.getElementById('adminTotalCount');
    const acertosEl = document.getElementById('adminTotalAcertos');

    if (totalEl) totalEl.textContent = formatCurrency(totalVal);
    if (countEl) countEl.textContent = totalCount;
    if (acertosEl) acertosEl.textContent = formatCurrency(totalAcertos);

    // Atualizar Gráficos se as categorias estiverem disponíveis
    if (productCategories) {
        const salesByMonth = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        // Manter janela fixa de 6 meses para consistência visual ou adaptar? Usando janela fixa de hoje para trás.
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}/${d.getFullYear().toString().substr(2)}`;
            salesByMonth[key] = 0;
        }
        dashboardProductSales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${months[date.getMonth()]}/${date.getFullYear().toString().substr(2)}`;
            if (salesByMonth.hasOwnProperty(key)) salesByMonth[key] += (Number(sale.price) || 0);
        });
        renderSalesChart(Object.keys(salesByMonth), Object.values(salesByMonth));

        const salesByCategory = {};
        dashboardProductSales.forEach(sale => {
            const category = productCategories[sale.productId] || 'Outros';
            salesByCategory[category] = (salesByCategory[category] || 0) + (Number(sale.price) || 0);
        });
        renderCategoryChart(Object.keys(salesByCategory), Object.values(salesByCategory));
    }

    // --- ATUALIZAR LISTA DE RANKING ---
    const filteredSales = sales.filter(s => {
        if (s.productId === 'ACERTO' || s.category === 'Financeiro') return false;
        if (s.date < startTs || s.date > endTs) return false;
        // No ciclo atual, excluir vendas já liquidadas (acertadas em ciclos anteriores)
        if (selectedValue === 'current' && s.isSettled) return false;
        return true;
    });

    // Montar mapa de nomes: revendedoras ativas + nomes salvos no histórico (para excluídas)
    const nameMap = {};
    resellers.forEach(r => {
        nameMap[r.id] = r.name;
    });
    // Buscar nomes de revendedoras excluídas no histórico salvo
    (rankingHistory || []).forEach(h => {
        if (h.winners && Array.isArray(h.winners)) {
            h.winners.forEach(w => {
                if (w.uid && w.name && w.name !== 'Desconhecido' && !nameMap[w.uid]) {
                    nameMap[w.uid] = w.name;
                }
            });
        }
    });

    // Agrupar totais por revendedora (inclui excluídas)
    const totalsMap = {};
    filteredSales.forEach(s => {
        if (!totalsMap[s.resellerId]) {
            totalsMap[s.resellerId] = { name: nameMap[s.resellerId] || 'Revendedora Excluída', total: 0, count: 0 };
        }
        totalsMap[s.resellerId].total += (Number(s.price) || 0);
        totalsMap[s.resellerId].count++;
    });

    const ranking = Object.values(totalsMap)
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    if (ranking.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 15px; color: #666;">Nenhuma venda neste ciclo.</div>';
        return;
    }

    container.innerHTML = ranking.map((r, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        const isTop = index === 0;
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${isTop ? '#fffde7' : '#f8f9fa'}; border-radius: 6px; border: 1px solid ${isTop ? '#fbc02d' : '#eee'};">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2em; font-weight: bold; width: 30px; text-align: center;">${medal}</span>
                    <div>
                        <div style="font-weight: 600; color: #333;">${r.name}</div>
                        <div style="font-size: 0.8em; color: #666;">${r.count} vendas</div>
                    </div>
                </div>
                <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${formatCurrency(r.total)}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// ADMIN - GESTÃO DE ACERTOS (DEVOLUÇÕES)
// ============================================

async function loadPendingSettlements() {
    const container = document.getElementById('adminSettlementsContainer');
    
    // Criar container se não existir
    if (!container) {
        const dashboard = document.getElementById('adminDashboard');
        const div = document.createElement('div');
        div.id = 'adminSettlementsContainer';
        div.style.marginTop = '20px';
        dashboard.insertBefore(div, dashboard.firstChild); // Colocar no topo
    }

    try {
        const snapshot = await settlementsRef.orderByChild('status').equalTo('pending').once('value');
        const settlements = [];
        snapshot.forEach(child => {
            settlements.push({ id: child.key, ...child.val() });
        });

        const wrapper = document.getElementById('adminSettlementsContainer');
        
        if (settlements.length === 0) {
            wrapper.innerHTML = ''; // Limpa se não tiver nada
            return;
        }

        wrapper.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Solicitações de Acerto Pendentes</h3>
                ${settlements.map(s => `
                    <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong>${s.resellerName}</strong><br>
                            <span style="font-size: 0.9em; color: #666;">Data: ${formatDate(s.createdAt)}</span>
                        </div>
                        <div style="text-align: right;">
                            <div>Vendido: <strong>${formatCurrency(s.totalSold)}</strong></div>
                            <div>Comissão: <strong>${formatCurrency(s.totalCommission)}</strong></div>
                            <div style="color: #dc3545;">Devolução: <strong>${s.returnedCount} itens</strong></div>
                        </div>
                        <div style="display: flex; gap: 5px; flex-direction: column;">
                            <button class="btn-primary" onclick="openFinalizeSettlementModal('${s.id}')" style="background-color: #28a745; margin: 0; font-size: 0.9em;">✅ Finalizar</button>
                            <button class="btn-delete" onclick="deleteSettlement('${s.id}')" style="background-color: #dc3545; margin: 0; font-size: 0.9em;">🗑️ Excluir</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar acertos:', error);
    }
}

let currentFinalizingSettlementId = null;

function openFinalizeSettlementModal(settlementId) {
    currentFinalizingSettlementId = settlementId;
    
    if (!document.getElementById('finalizeSettlementModal')) {
        const modalHtml = `
            <div id="finalizeSettlementModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Finalizar Acerto</h3>
                        <button class="close-modal" onclick="closeFinalizeSettlementModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px; color: #666;">Confirme a data de finalização deste acerto:</p>
                        <div class="form-group">
                            <label>Data do Acerto</label>
                            <input type="date" id="finalizeSettlementDate" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="confirmFinalizeSettlement()" style="width: 100%;">Confirmar Finalização</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Definir hoje como padrão
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('finalizeSettlementDate').value = `${yyyy}-${mm}-${dd}`;

    document.getElementById('finalizeSettlementModal').classList.add('active');
}

function closeFinalizeSettlementModal() {
    document.getElementById('finalizeSettlementModal').classList.remove('active');
    currentFinalizingSettlementId = null;
}

let isFinalizingSettlement = false;

async function confirmFinalizeSettlement() {
    if (isFinalizingSettlement) return;
    isFinalizingSettlement = true;

    const confirmBtn = document.querySelector('#finalizeSettlementModal .btn-primary');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processando...';
    }

    const dateStr = document.getElementById('finalizeSettlementDate').value;
    if (!dateStr) {
        showNotification('Selecione uma data', 'error');
        isFinalizingSettlement = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar Finalização';
        }
        return;
    }

    if (!currentFinalizingSettlementId) return;

    // Criar timestamp da data local (00:00:00)
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const timestamp = dateObj.getTime();

    showLoading();
    try {
        // 1. Buscar dados do acerto para registrar o pagamento
        const snapshot = await settlementsRef.child(currentFinalizingSettlementId).once('value');
        let settlement = snapshot.val();

        if (!settlement) throw new Error('Acerto não encontrado');

        // Recalcular e atualizar comissão com a nova regra antes de finalizar
        const goalsSnap = await goalsRef.child(settlement.resellerId).child('commissionTiers').once('value');
        const tiers = goalsSnap.val() || [];
        
        if (tiers.length > 0) {
            const newComm = calculateTotalCommission(settlement.totalSold, tiers);
            // Atualiza no banco para ficar correto permanentemente
            await settlementsRef.child(currentFinalizingSettlementId).update({ totalCommission: newComm });
            settlement.totalCommission = newComm;
        }

        // 2. Atualizar status
        await settlementsRef.child(currentFinalizingSettlementId).update({
            status: 'completed',
            finalizedAt: timestamp
        });
        
        // 3. Criar registro na tabela de vendas (Valor que a revendedora paga)
        const amountDue = settlement.totalSold - settlement.totalCommission;
        
        if (amountDue > 0) {
            const saleId = generateId();
            await salesRef.child(saleId).set({
                resellerId: settlement.resellerId,
                productId: 'ACERTO', // ID fixo para passar na validação
                productName: 'Pagamento de Acerto',
                price: amountDue,
                clientId: 'ADMIN',
                clientName: 'Acerto de Contas',
                date: timestamp,
                paymentStatus: 'paid',
                category: 'Financeiro'
            });
        }

        // 4. Encerrar (Arquivar) pedidos antigos automaticamente
        // Busca pedidos ativos criados ANTES da solicitação do acerto
        const ordersSnapshot = await ordersRef.orderByChild('resellerId').equalTo(settlement.resellerId).once('value');
        const ordersUpdates = {};
        
        ordersSnapshot.forEach(child => {
            const order = child.val();
            // Se o pedido está ativo E foi criado ANTES da solicitação deste acerto
            if (order.status === 'active' && order.createdAt < settlement.createdAt) {
                ordersUpdates[`orders/${child.key}/status`] = 'completed';
            }
        });

        if (Object.keys(ordersUpdates).length > 0) {
            await database.ref().update(ordersUpdates);
        }

        hideLoading();
        showNotification('Acerto finalizado e valor registrado nas vendas!');
        closeFinalizeSettlementModal();
        loadPendingSettlements();
        
        // Atualizar dashboard se estiver na tela para refletir o novo valor
        if (document.getElementById('adminDashboard').classList.contains('active')) {
            loadAdminDashboard();
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao finalizar acerto:', error);
        showNotification('Erro ao finalizar', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar Finalização';
        }
    } finally {
        isFinalizingSettlement = false;
    }
}

// ============================================
// ADMIN - GESTÃO DE PRODUTOS
// ============================================

async function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const code = document.getElementById('productCode').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const barcode = document.getElementById('productBarcode').value.trim();

    if (!name || !code || !category || !quantity || !price) {
        showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    showLoading();

    try {
        const productId = generateId();
        await productsRef.child(productId).set({
            name,
            code,
            category,
            quantity,
            price,
            barcode: barcode || '',
            available: quantity,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Limpar formulário
        document.getElementById('productName').value = '';
        document.getElementById('productCode').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productBarcode').value = '';

        hideLoading();
        showNotification('Produto adicionado com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao adicionar produto:', error);
        showNotification('Erro ao adicionar produto', 'error');
    }
}

async function loadAdminProducts() {
    showLoading();
    
    try {
        const snapshot = await productsRef.once('value');
        const products = [];
        
        snapshot.forEach((child) => {
            products.push({
                id: child.key,
                ...child.val()
            });
        });

        const container = document.getElementById('adminProductsList');

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p class="empty-text">Nenhum produto cadastrado</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Toolbar para ações em lote
        const toolbarHtml = `
            <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;">
                    <input type="checkbox" id="selectAllProducts" onchange="toggleSelectAllProducts(this)">
                    Selecionar Todos
                </label>
                <div style="margin-left: auto; display: flex; gap: 5px;">
                    <button class="btn-delete" onclick="deleteSelectedProducts()" style="font-size: 14px; padding: 5px 10px;">Excluir Selecionados</button>
                    <button class="btn-delete" onclick="deleteAllProducts()" style="background-color: #a00; font-size: 14px; padding: 5px 10px;">Excluir Tudo</button>
                </div>
            </div>
        `;

        container.innerHTML = toolbarHtml + products.map(product => `
            <div class="admin-product-item">
                <div style="margin-right: 15px; display: flex; align-items: center;">
                    <input type="checkbox" class="product-checkbox" value="${product.id}">
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-code">Código: ${product.code}${product.code2 ? ` | Ref. 2: ${product.code2}` : ''} | Categoria: ${product.category}</div>
                    <div class="product-price">${formatCurrency(product.price)} | Disponível: ${product.available}/${product.quantity}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-secondary" onclick="openEditProductModal('${product.id}')" style="margin-right: 5px;">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
                </div>
            </div>
        `).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    showLoading();

    try {
        await productsRef.child(productId).remove();
        hideLoading();
        showNotification('Produto excluído com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto', 'error');
    }
}

function toggleSelectAllProducts(source) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function deleteSelectedProducts() {
    const selected = document.querySelectorAll('.product-checkbox:checked');
    if (selected.length === 0) {
        showNotification('Nenhum produto selecionado', 'error');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selected.length} produtos selecionados?`)) return;

    showLoading();
    try {
        const updates = {};
        selected.forEach(cb => {
            updates[cb.value] = null;
        });
        
        await productsRef.update(updates);
        hideLoading();
        showNotification('Produtos excluídos com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir produtos:', error);
        showNotification('Erro ao excluir produtos', 'error');
    }
}

async function deleteAllProducts() {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir TODOS os produtos? Esta ação não pode ser desfeita.')) return;
    
    const confirmation = prompt('Digite "DELETAR" para confirmar a exclusão de todos os produtos:');
    if (confirmation !== 'DELETAR') return;

    showLoading();
    try {
        await productsRef.remove();
        hideLoading();
        showNotification('Todos os produtos foram excluídos!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir todos os produtos:', error);
        showNotification('Erro ao excluir produtos', 'error');
    }
}

let currentEditingProductId = null;

async function openEditProductModal(productId) {
    showLoading();
    currentEditingProductId = productId;

    try {
        const snapshot = await productsRef.child(productId).once('value');
        const product = snapshot.val();

        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductCode').value = product.code;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductQuantity').value = product.quantity;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductBarcode').value = product.barcode || '';

        document.getElementById('editProductModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de produto:', error);
    }
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('active');
    currentEditingProductId = null;
}

async function saveProductEdit() {
    const updates = {
        name: document.getElementById('editProductName').value.trim(),
        code: document.getElementById('editProductCode').value.trim(),
        category: document.getElementById('editProductCategory').value.trim(),
        quantity: parseInt(document.getElementById('editProductQuantity').value),
        price: parseFloat(document.getElementById('editProductPrice').value),
        barcode: document.getElementById('editProductBarcode').value.trim()
    };

    showLoading();
    try {
        await productsRef.child(currentEditingProductId).update(updates);
        closeEditProductModal();
        hideLoading();
        showNotification('Produto atualizado com sucesso!');
        loadAdminProducts();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar produto:', error);
        showNotification('Erro ao atualizar produto', 'error');
    }
}

// ============================================
// IMPORTAÇÃO DE PLANILHA
// ============================================

async function showImportModal() {
    const modal = document.getElementById('importModal');
    
    // Injetar seletor de revendedora se não existir
    if (!document.getElementById('importResellerContainer')) {
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            const container = document.createElement('div');
            container.id = 'importResellerContainer';
            container.style.marginBottom = '15px';
            container.innerHTML = `
                <label style="display:block; margin-bottom:5px; font-weight:500;">Gerar Pedido para Revendedora (Opcional):</label>
                <select id="importResellerSelect" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom: 10px;" onchange="document.getElementById('importSettlementDateDiv').style.display = this.value ? 'block' : 'none'">
                    <option value="">Apenas Importar para Estoque</option>
                </select>
                
                <div id="importSettlementDateDiv" style="display: none;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Definir Data do Acerto:</label>
                    <input type="date" id="importSettlementDate" class="input-field">
                </div>
            `;
            fileInput.parentNode.insertBefore(container, fileInput);
        }
    }

    // Atualizar lista de revendedoras
    const select = document.getElementById('importResellerSelect');
    if (select) {
        try {
            const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
            let options = '<option value="">Apenas Importar para Estoque</option>';
            snapshot.forEach(child => {
                const r = child.val();
                options += `<option value="${child.key}">${r.name}</option>`;
            });
            select.innerHTML = options;
        } catch (error) {
            console.error('Erro ao carregar revendedoras:', error);
        }
    }

    modal.classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    document.getElementById('importFile').value = '';
    const dateInput = document.getElementById('importSettlementDate');
    if (dateInput) dateInput.value = '';
    const select = document.getElementById('importResellerSelect');
    if (select) {
        select.value = '';
        const dateDiv = document.getElementById('importSettlementDateDiv');
        if (dateDiv) dateDiv.style.display = 'none';
    }
}

async function importProducts() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    const resellerSelect = document.getElementById('importResellerSelect');
    const resellerId = resellerSelect ? resellerSelect.value : '';
    const settlementDateInput = document.getElementById('importSettlementDate');
    const settlementDate = settlementDateInput ? settlementDateInput.value : '';

    if (!file) {
        showNotification('Por favor, selecione um arquivo', 'error');
        return;
    }

    showLoading();

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            let importCount = 0;
            const updates = {};
            const newProductIds = [];

            jsonData.forEach(row => {
                const name = row.Nome || row.nome || row.Produto || row.produto;
                const code = row.Código || row.codigo || row.Codigo || row.Referência || row.referencia;
                const code2 = row['Ref. 2'] || row['ref. 2'] || row['Ref 2'] || row['ref 2'] || row['Referência 2'] || row['referencia 2'] || '';
                const category = row.Categoria || row.categoria;
                const quantity = parseInt(row.Quantidade || row.quantidade || row.Qtd || row.qtd || row.Quant || row.quant || 1);
                const price = parseFloat(row.Preço || row.preco || row.Preco || row.Valor || row.valor || 0);
                const barcode = row['Código de Barras'] || row['codigo de barras'] || row.Barcode || row.barcode || '';

                if (name && code && price) {
                    const productId = generateId();
                    newProductIds.push(productId);
                    updates[`products/${productId}`] = {
                        name,
                        code,
                        code2,
                        category: category || 'Sem categoria',
                        quantity,
                        price,
                        barcode,
                        available: quantity,
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    importCount++;
                }
            });

            await database.ref().update(updates);

            // Se tiver revendedora selecionada, cria o pedido
            if (resellerId && newProductIds.length > 0) {
                const orderId = generateId();
                await ordersRef.child(orderId).set({
                    resellerId,
                    products: newProductIds,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                });

                // Atualizar data de acerto se fornecida
                if (settlementDate) {
                    await goalsRef.child(resellerId).update({ settlementDate });
                }

                showNotification(`${importCount} produtos importados, pedido gerado e data de acerto atualizada!`);
                loadOrders();
            } else {
                showNotification(`${importCount} produtos importados com sucesso!`);
            }

            closeImportModal();
            hideLoading();
            loadAdminProducts();
        } catch (error) {
            hideLoading();
            console.error('Erro ao importar:', error);
            showNotification('Erro ao importar arquivo. Verifique o formato.', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

// ============================================
// ADMIN - GESTÃO DE REVENDEDORAS
// ============================================

function showAddResellerModal() {
    document.getElementById('addResellerModal').classList.add('active');
}

function closeAddResellerModal() {
    document.getElementById('addResellerModal').classList.remove('active');
    document.getElementById('newResellerName').value = '';
    document.getElementById('resellerEmail').value = '';
    document.getElementById('resellerPassword').value = '';
    document.getElementById('resellerPhone').value = '';
}

async function saveReseller() {
    const name = document.getElementById('newResellerName').value.trim();
    const email = document.getElementById('resellerEmail').value.trim();
    const password = document.getElementById('resellerPassword').value;
    const phone = document.getElementById('resellerPhone').value.trim();

    if (!name || !email || !password || !phone) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    showLoading();

    let secondaryApp = null;

    try {
        // Usar uma instância secundária para não deslogar o admin
        secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = secondaryApp.auth();

        // Criar usuário na instância secundária
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Salvar dados usando a instância principal (admin)
        await usersRef.child(user.uid).set({
            name,
            email,
            phone,
            role: 'reseller',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Limpar instância secundária
        await secondaryAuth.signOut();
        await secondaryApp.delete();

        closeAddResellerModal();

        // Aplicar comissão padrão se existir
        try {
            const configSnapshot = await configRef.child('defaultCommissions').once('value');
            const defaultTiers = configSnapshot.val();
            if (defaultTiers) {
                await goalsRef.child(user.uid).child('commissionTiers').set(defaultTiers);
            }
        } catch (e) { console.error('Erro ao aplicar comissão padrão', e); }

        hideLoading();
        showNotification('Revendedora cadastrada com sucesso!');
        loadResellers();
    } catch (error) {
        // Tentar recuperação se o e-mail já existir
        if (error.code === 'auth/email-already-in-use' && secondaryApp) {
            try {
                const secondaryAuth = secondaryApp.auth();
                // Tentar logar com a senha fornecida para validar posse e recuperar UID
                const userCredential = await secondaryAuth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Reativar/Recriar registro no banco
                await usersRef.child(user.uid).set({
                    name,
                    email,
                    phone,
                    role: 'reseller',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    isDeleted: null // Garante que não está deletado
                });

                await secondaryAuth.signOut();
                await secondaryApp.delete();
                secondaryApp = null;

                closeAddResellerModal();
                hideLoading();
                showNotification('Conta existente encontrada e reativada com sucesso!');
                loadResellers();
                return;
            } catch (recError) {
                console.error('Falha na recuperação automática:', recError);
            }
        }

        if (secondaryApp) {
            try { await secondaryApp.delete(); } catch (e) {}
        }

        hideLoading();
        console.error('Erro ao cadastrar revendedora:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Este e-mail já está em uso e a senha não confere.', 'error');
        } else {
            showNotification('Erro ao cadastrar revendedora', 'error');
        }
    }
}

function applyResellerCycleFilter(select) {
    const val = select.value;
    if (!val) return;
    
    const [start, end] = val.split('|').map(Number);
    const startDateInput = document.getElementById('resellerDateStart');
    const endDateInput = document.getElementById('resellerDateEnd');
    
    if (startDateInput && endDateInput) {
        const formatDateISO = (d) => {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        
        startDateInput.value = formatDateISO(new Date(start));
        endDateInput.value = formatDateISO(new Date(end));
        loadResellers();
    }
}

async function loadResellers() {
    showLoading();
    
    const startDateInput = document.getElementById('resellerDateStart');
    const endDateInput = document.getElementById('resellerDateEnd');
    
    let startDate = startDateInput ? startDateInput.value : '';
    let endDate = endDateInput ? endDateInput.value : '';

    // Se não tiver datas selecionadas, usa o mês atual
    if (!startDate || !endDate) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Formatar YYYY-MM-DD
        const formatDateISO = (d) => {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        if (!startDate) {
            startDate = formatDateISO(new Date(year, month, 1));
            if (startDateInput) startDateInput.value = startDate;
        }
        if (!endDate) {
            endDate = formatDateISO(new Date(year, month + 1, 0));
            if (endDateInput) endDateInput.value = endDate;
        }
    }

    // Converter para timestamp para comparação (início do dia e fim do dia)
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const startTs = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();

    const [ey, em, ed] = endDate.split('-').map(Number);
    const endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();

    try {
        const [resellersSnapshot, salesSnapshot, settlementsSnapshot, configSnapshot, historySnapshot] = await Promise.all([
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            salesRef.once('value'),
            settlementsRef.once('value'),
            configRef.child('ranking').once('value'),
            database.ref('rankingHistory').orderByChild('closedAt').once('value')
        ]);

        const resellers = [];
        resellersSnapshot.forEach((child) => {
            resellers.push({
                id: child.key,
                ...child.val()
            });
        });

        const allSales = [];
        salesSnapshot.forEach((child) => {
            allSales.push(child.val());
        });

        // Mapear nomes de revendedoras excluídas baseado nos acertos (se houver)
        const deletedResellerNames = {};
        settlementsSnapshot.forEach(child => {
            const s = child.val();
            if (s.resellerId && s.resellerName) {
                deletedResellerNames[s.resellerId] = s.resellerName;
            }
        });

        // Encontrar revendedoras que têm vendas mas não estão na lista de usuários (Excluídas)
        const activeResellerIds = new Set(resellers.map(r => r.id));
        const orphanedResellerIds = new Set();
        
        allSales.forEach(sale => {
            if (sale.resellerId && !activeResellerIds.has(sale.resellerId)) {
                orphanedResellerIds.add(sale.resellerId);
            }
        });

        orphanedResellerIds.forEach(id => {
            resellers.push({
                id: id,
                name: deletedResellerNames[id] || 'Revendedora Excluída',
                email: 'Acesso Removido',
                phone: '-',
                createdAt: 0,
                isDeleted: true
            });
        });

        const container = document.getElementById('resellersList');

        // Configurar Grid Layout para os cards
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        container.style.gap = '15px';

        if (resellers.length === 0) {
            container.style.display = 'block'; // Resetar para mensagem
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p class="empty-text">Nenhuma revendedora cadastrada</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Preparar opções do seletor de ciclo
        const config = configSnapshot.val() || {};
        const lastReset = config.lastResetDate || 0;
        const history = [];
        historySnapshot.forEach(c => history.push({id: c.key, ...c.val()}));
        history.reverse();

        let cycleOptions = `<option value="">📅 Selecionar Ciclo...</option>`;
        cycleOptions += `<option value="${lastReset}|${Date.now()}">Ciclo Atual (Desde ${formatDate(lastReset)})</option>`;
        history.forEach(h => {
            cycleOptions += `<option value="${h.cycleStartDate}|${h.closedAt}">Ciclo encerrado em ${formatDate(h.closedAt)}</option>`;
        });

        // Injetar controles (Botão Global + Checkbox Ocultar)
        if (!document.getElementById('resellerControls')) {
            const controlsDiv = document.createElement('div');
            controlsDiv.id = 'resellerControls';
            controlsDiv.style.marginBottom = '15px';
            controlsDiv.style.display = 'flex';
            controlsDiv.style.gap = '15px';
            controlsDiv.style.alignItems = 'center';
            controlsDiv.style.flexWrap = 'wrap';
            
            const isHiddenSaved = localStorage.getItem('hideDeletedResellers') === 'true';
            
            controlsDiv.innerHTML = `
                <button id="btnGlobalCommissions" class="btn-primary" onclick="openAdminCommissionModal('GLOBAL')" style="background-color: #2c1810; width: auto; margin: 0;">⚙️ Comissões Padrão</button>
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <input type="checkbox" id="hideDeletedResellers" onchange="localStorage.setItem('hideDeletedResellers', this.checked); loadResellers()" ${isHiddenSaved ? 'checked' : ''}>
                    <span style="font-size: 0.9em; font-weight: 500; color: #555;">Ocultar Excluídas</span>
                </label>
                <select id="resellerCycleSelector" onchange="applyResellerCycleFilter(this)" class="input-field" style="width: auto; margin: 0; padding: 8px; min-width: 200px;">
                    ${cycleOptions}
                </select>
            `;
            
            // Remover botão antigo se existir para evitar duplicidade
            const oldBtn = document.getElementById('btnGlobalCommissions');
            if (oldBtn && oldBtn.parentNode && oldBtn.parentNode.id !== 'resellerControls') {
                oldBtn.parentNode.remove();
            }

            if (container.parentNode) container.parentNode.insertBefore(controlsDiv, container);
        } else {
            // Se já existe, garante que as opções estão atualizadas (caso um ciclo tenha acabado de fechar)
            const selector = document.getElementById('resellerCycleSelector');
            if (selector) {
                // Preserva seleção atual se possível, ou apenas atualiza se estiver vazio
                if (selector.innerHTML.length < 20) selector.innerHTML = cycleOptions;
            }
        }

        const hideDeleted = document.getElementById('hideDeletedResellers') ? document.getElementById('hideDeletedResellers').checked : (localStorage.getItem('hideDeletedResellers') === 'true');

        container.innerHTML = resellers.map(reseller => {
            // Se estiver marcada para ocultar e for excluída, não renderiza
            if (reseller.isDeleted && hideDeleted) return '';
            
            const resellerSales = allSales.filter(sale => {
                if (sale.resellerId !== reseller.id) return false;
                if (isFinancialSale(sale)) return false;
                return sale.date >= startTs && sale.date <= endTs;
            });

            const totalSales = resellerSales.reduce((sum, sale) => sum + sale.price, 0);

            return `
            <div class="reseller-item" style="display: flex; flex-direction: column; height: 100%; ${reseller.isDeleted ? 'background: #fff5f5; border: 1px dashed #dc3545;' : ''}">
                <div class="reseller-header" style="margin-bottom: 10px;">
                    <div class="reseller-name" style="font-size: 1.1em;">${reseller.name} ${reseller.isDeleted ? '<span style="font-size:0.7em; color:#dc3545;">(Excluída)</span>' : ''}</div>
                    <div class="reseller-total" style="font-weight: bold; color: #2c1810;">${formatCurrency(totalSales)}</div>
                </div>
                <div class="reseller-details" style="font-size: 0.9em; flex: 1; margin-bottom: 15px;">
                    <p style="margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reseller.email}">📧 ${reseller.email}</p>
                    <p style="margin-bottom: 3px;">📱 ${reseller.phone}</p>
                    <p style="margin-bottom: 3px;">📅 ${reseller.createdAt ? formatDate(reseller.createdAt) : '-'}</p>
                    <p style="margin-bottom: 3px;">🛍️ ${resellerSales.length} vendas</p>
                </div>
                <div class="reseller-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: auto;">
                    <button class="btn-edit" onclick="viewResellerSales('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Ver Vendas</button>
                    ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openAdminCommissionModal('${reseller.id}', '${reseller.name}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Comissões</button>` : ''}
                    ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openEditResellerModal('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Editar</button>` : ''}
                    ${!reseller.isDeleted ? `<button class="btn-delete" onclick="deleteReseller('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Excluir</button>` : ''}
                    ${reseller.isDeleted ? `<button class="btn-secondary" onclick="restoreReseller('${reseller.id}', '${reseller.name}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em; background-color: #28a745; color: white; border: none;">Restaurar</button>` : ''}
                </div>
            </div>
        `}).join('');

        hideLoading();
        updateOrderResellerSelect(resellers);
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar revendedoras:', error);
    }
}

async function deleteReseller(resellerId) {
    if (!confirm('Tem certeza que deseja excluir esta revendedora? O acesso será bloqueado, mas o histórico será mantido.')) return;
    
    showLoading();
    try {
        // Soft delete: Mantém o registro mas marca como deletado
        await usersRef.child(resellerId).update({
            isDeleted: true
        });
        hideLoading();
        showNotification('Revendedora excluída com sucesso!');
        loadResellers();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir revendedora:', error);
        showNotification('Erro ao excluir revendedora', 'error');
    }
}

async function restoreReseller(resellerId, currentName) {
    if (!confirm(`Deseja restaurar o acesso da revendedora "${currentName}"?`)) return;

    showLoading();
    try {
        // Verificar se o registro existe (Soft Delete) ou se foi removido (Hard Delete antigo)
        const snapshot = await usersRef.child(resellerId).once('value');
        const existing = snapshot.val();

        if (existing) {
            // Apenas remove a marcação de deletado
            await usersRef.child(resellerId).update({ isDeleted: null });
        } else {
            // Modo legado: recria o registro se foi apagado fisicamente
            const email = prompt("Por favor, confirme ou insira o e-mail para login:", "");
            if (email === null) { hideLoading(); return; }

            await usersRef.child(resellerId).set({
                name: currentName.replace(' (Excluída)', '').replace('Revendedora Excluída', 'Revendedora Restaurada'),
                email: email,
                phone: '',
                role: 'reseller',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        }

        hideLoading();
        showNotification('Revendedora restaurada com sucesso!');
        loadResellers();
    } catch (error) {
        hideLoading();
        console.error('Erro ao restaurar:', error);
        showNotification('Erro ao restaurar revendedora', 'error');
    }
}

let currentEditingResellerId = null;

async function openEditResellerModal(resellerId) {
    showLoading();
    currentEditingResellerId = resellerId;

    // Remover modal estático ou antigo se existir para garantir que temos os campos novos
    const existingModal = document.getElementById('editResellerModal');
    if (existingModal && !document.getElementById('editResellerSettlementDate')) {
        existingModal.remove();
    }

    if (!document.getElementById('editResellerModal')) {
        const modalHtml = `
            <div id="editResellerModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Editar Revendedora</h3>
                        <button class="close-modal" onclick="closeEditResellerModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nome</label>
                            <input type="text" id="editResellerName" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>E-mail</label>
                            <input type="email" id="editResellerEmail" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Telefone</label>
                            <input type="tel" id="editResellerPhone" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data do Acerto</label>
                            <input type="date" id="editResellerSettlementDate" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="saveResellerEdit()" style="width: 100%; margin-top: 15px;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const [userSnapshot, goalSnapshot] = await Promise.all([
            usersRef.child(resellerId).once('value'),
            goalsRef.child(resellerId).once('value')
        ]);
        
        const reseller = userSnapshot.val();
        const goal = goalSnapshot.val() || {};

        document.getElementById('editResellerName').value = reseller.name;
        document.getElementById('editResellerEmail').value = reseller.email;
        document.getElementById('editResellerPhone').value = reseller.phone;
        document.getElementById('editResellerSettlementDate').value = goal.settlementDate || '';

        document.getElementById('editResellerModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de revendedora:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

function closeEditResellerModal() {
    document.getElementById('editResellerModal').classList.remove('active');
    currentEditingResellerId = null;
}

async function saveResellerEdit() {
    const updates = {
        name: document.getElementById('editResellerName').value.trim(),
        email: document.getElementById('editResellerEmail').value.trim(),
        phone: document.getElementById('editResellerPhone').value.trim()
    };
    
    const settlementDate = document.getElementById('editResellerSettlementDate').value;

    showLoading();
    try {
        await usersRef.child(currentEditingResellerId).update(updates);
        
        // Atualizar data de acerto
        if (settlementDate) {
            await goalsRef.child(currentEditingResellerId).update({ settlementDate });
        }

        closeEditResellerModal();
        hideLoading();
        showNotification('Revendedora atualizada com sucesso!');
        loadResellers();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar revendedora:', error);
        showNotification('Erro ao atualizar revendedora', 'error');
    }
}

let currentResellerSalesData = [];
let currentResellerPaymentsData = {};
let currentAdminViewResellerId = null;

async function recalculateSettlement(settlementId) {
    if (!confirm('ATENÇÃO: Isso irá recalcular a comissão deste acerto histórico usando as taxas de comissão ATUAIS configuradas para a revendedora.\n\nO valor da dívida (venda "Acerto de Contas") também será atualizado.\n\nDeseja continuar?')) return;

    showLoading();
    try {
        // 1. Buscar dados do acerto
        const sSnap = await settlementsRef.child(settlementId).once('value');
        const settlement = sSnap.val();
        if (!settlement) throw new Error('Acerto não encontrado');

        // 2. Buscar taxas atuais
        const gSnap = await goalsRef.child(settlement.resellerId).once('value');
        const goals = gSnap.val() || {};
        const tiers = goals.commissionTiers || [];

        if (!tiers || tiers.length === 0) throw new Error('Revendedora sem taxas de comissão configuradas');

        // 3. Calcular nova comissão (Regra Nova)
        const newCommission = calculateTotalCommission(settlement.totalSold, tiers);
        const newAmountDue = settlement.totalSold - newCommission;

        // 4. Atualizar registro do acerto
        await settlementsRef.child(settlementId).update({
            totalCommission: newCommission
        });

        // 5. Encontrar e atualizar o registro de venda (dívida) correspondente
        // Procura por venda do tipo ACERTO com data próxima (margem de 1 minuto)
        const searchDate = settlement.finalizedAt || settlement.createdAt;
        const salesSnap = await salesRef.orderByChild('resellerId').equalTo(settlement.resellerId).once('value');
        let saleIdToUpdate = null;
        
        salesSnap.forEach(child => {
            const sale = child.val();
            if (sale.productId === 'ACERTO' && Math.abs(sale.date - searchDate) < 60000) {
                saleIdToUpdate = child.key;
            }
        });

        if (saleIdToUpdate) {
            await salesRef.child(saleIdToUpdate).update({ price: newAmountDue });
        }

        hideLoading();
        showNotification(`Acerto recalculado!\nNova Comissão: ${formatCurrency(newCommission)}\nNovo Valor a Pagar: ${formatCurrency(newAmountDue)}`);
        
        if (currentAdminViewResellerId) viewResellerSales(currentAdminViewResellerId);
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao recalcular: ' + error.message, 'error');
    }
}

async function deleteSettlement(settlementId) {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir este registro de acerto?\n\nSe o acerto já foi finalizado, a cobrança gerada ("Acerto de Contas") também será removida das vendas.\n\nEssa ação não pode ser desfeita.')) return;

    showLoading();
    try {
        // 1. Buscar dados do acerto
        const sSnap = await settlementsRef.child(settlementId).once('value');
        const settlement = sSnap.val();
        
        if (!settlement) {
            hideLoading();
            showNotification('Acerto não encontrado.', 'error');
            if (currentAdminViewResellerId) viewResellerSales(currentAdminViewResellerId);
            loadPendingSettlements();
            return;
        }

        // 2. Se estiver finalizado, buscar e remover a venda de dívida associada
        if (settlement.status === 'completed') {
            const searchDate = settlement.finalizedAt || settlement.createdAt;
            // Margem de segurança de 2 minutos para achar a venda criada
            const salesSnap = await salesRef.orderByChild('resellerId').equalTo(settlement.resellerId).once('value');
            
            const updates = {};
            salesSnap.forEach(child => {
                const sale = child.val();
                if (sale.productId === 'ACERTO' && Math.abs(sale.date - searchDate) < 120000) {
                    updates[`sales/${child.key}`] = null;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                await database.ref().update(updates);
            }
        }

        // 3. Remover o registro de acerto
        await settlementsRef.child(settlementId).remove();

        hideLoading();
        showNotification('Acerto excluído com sucesso!');
        
        if (currentAdminViewResellerId) viewResellerSales(currentAdminViewResellerId);
        loadPendingSettlements();
        if (document.getElementById('adminDashboard').classList.contains('active')) {
            loadAdminDashboard();
        }
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao excluir: ' + error.message, 'error');
    }
}

async function viewResellerSales(resellerId) {
    showLoading();
    currentAdminViewResellerId = resellerId;

    // Garantir que o modal existe com a estrutura correta
    if (!document.getElementById('resellerSalesModal')) {
        const modalHtml = `
            <div id="resellerSalesModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 id="resellerSalesTitle">Vendas da Revendedora</h3>
                        <button class="close-modal" onclick="closeResellerSalesModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <select id="resellerSalesTypeFilter" class="input-field" style="max-width: 200px;" onchange="filterResellerSalesList()">
                                <option value="all">Todos os Registros</option>
                                <option value="product">Apenas Produtos</option>
                                <option value="settlement">Apenas Acertos</option>
                            </select>
                            <div id="resellerSalesTotal" style="font-weight: bold; font-size: 1.1em; color: #2c1810;"></div>
                        </div>
                        <div id="resellerSalesList" style="max-height: 400px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const startDateInput = document.getElementById('resellerDateStart');
    const endDateInput = document.getElementById('resellerDateEnd');
    
    let startDate = startDateInput ? startDateInput.value : '';
    let endDate = endDateInput ? endDateInput.value : '';

    // Se não tiver datas (fallback), usa mês atual
    if (!startDate || !endDate) {
        const now = new Date();
        const formatDateISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!startDate) startDate = formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1));
        if (!endDate) endDate = formatDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }

    // Timestamps
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const startTs = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();

    const [ey, em, ed] = endDate.split('-').map(Number);
    const endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();

    try {
        const [salesSnapshot, paymentsSnapshot, settlementsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            paymentsRef.once('value'),
            settlementsRef.orderByChild('resellerId').equalTo(resellerId).once('value')
        ]);

        const sales = [];
        
        salesSnapshot.forEach((child) => {
            sales.push({ id: child.key, ...child.val() });
        });

        // Adicionar registros de acerto (settlements) à lista
        settlementsSnapshot.forEach((child) => {
            const s = child.val();

            sales.push({
                id: child.key,
                resellerId: s.resellerId,
                productId: 'ACERTO', // Para passar no filtro de acertos
                productName: `Acerto (${s.status === 'pending' ? 'Pendente' : 'Finalizado'})`,
                price: s.totalSold,
                date: s.finalizedAt || s.createdAt,
                category: 'Financeiro',
                isSettlementRecord: true,
                details: s,
                paymentStatus: s.status === 'completed' ? 'paid' : 'pending'
            });
        });

        const payments = {};
        paymentsSnapshot.forEach((child) => {
            const p = child.val();
            const key = p.groupId || p.saleId;
            payments[key] = { id: child.key, ...p };
        });
        currentResellerPaymentsData = payments;

        const filteredSales = sales.filter(sale => {
            return sale.date >= startTs && sale.date <= endTs;
        });

        const userSnapshot = await usersRef.child(resellerId).once('value');
        const reseller = userSnapshot.val() || { name: 'Revendedora Excluída' };

        // Armazenar dados para filtragem
        currentResellerSalesData = filteredSales;
        
        const startFmt = formatDate(startDate);
        const endFmt = formatDate(endDate);
        document.getElementById('resellerSalesTitle').textContent = `Vendas de ${reseller.name} (${startFmt} a ${endFmt})`;
        
        // Resetar filtro visual
        const filterSelect = document.getElementById('resellerSalesTypeFilter');
        if (filterSelect) filterSelect.value = 'all';

        // Renderizar lista usando a nova função de filtro
        filterResellerSalesList();

        document.getElementById('resellerSalesModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar vendas:', error);
        showNotification('Erro ao carregar detalhes das vendas', 'error');
    }
}

function filterResellerSalesList() {
    const filterType = document.getElementById('resellerSalesTypeFilter').value;
    const container = document.getElementById('resellerSalesList');
    const totalContainer = document.getElementById('resellerSalesTotal');
    
    if (!currentResellerSalesData) return;

    let displaySales = currentResellerSalesData;

    // Filtrar por tipo
    if (filterType === 'product') {
        displaySales = currentResellerSalesData.filter(s => s.productId !== 'ACERTO' && s.category !== 'Financeiro');
    } else if (filterType === 'settlement') {
        displaySales = currentResellerSalesData.filter(s => s.productId === 'ACERTO' || s.category === 'Financeiro');
    }

    const total = displaySales.reduce((sum, sale) => sum + sale.price, 0);

    if (displaySales.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum registro encontrado.</p>';
    } else {
        // Usar [...displaySales] para criar uma cópia antes de inverter, evitando mutação
        container.innerHTML = [...displaySales].reverse().map(sale => {
            const isSettlement = sale.productId === 'ACERTO' || sale.category === 'Financeiro';
            const payment = currentResellerPaymentsData[sale.groupId || sale.id];

            if (sale.isSettlementRecord) {
                return `
                    <div class="sale-item" style="background: #fff3cd; border: 1px solid #ffeeba; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                        <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600; color: #856404;">
                            <span>${sale.productName}</span>
                            <span>Vendido: ${formatCurrency(sale.price)}</span>
                        </div>
                        <div class="sale-details" style="font-size: 0.9em; color: #856404; margin-top: 5px;">
                            Data: ${formatDate(sale.date)} <br>
                            Comissão: ${formatCurrency(sale.details.totalCommission)} <br>
                            <strong>A Pagar: ${formatCurrency(sale.details.totalSold - sale.details.totalCommission)}</strong>
                        </div>
                        ${sale.details.status === 'pending' ? `
                            <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffeeba; display: flex; justify-content: flex-end; gap: 5px;">
                                <button class="btn-primary" onclick="openFinalizeSettlementModal('${sale.id}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; background-color: #28a745;">Finalizar</button>
                                <button class="btn-delete" onclick="deleteSettlement('${sale.id}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; background-color: #dc3545; color: white; border: none;">🗑️ Excluir</button>
                            </div>
                        ` : `
                            <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ffeeba; display: flex; justify-content: flex-end; gap: 5px;">
                                <button class="btn-secondary" onclick="recalculateSettlement('${sale.id}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; background-color: #ffc107; color: #333; border: none;">🔄 Recalcular (Correção)</button>
                                <button class="btn-delete" onclick="deleteSettlement('${sale.id}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; background-color: #dc3545; color: white; border: none;">🗑️ Excluir</button>
                            </div>
                        `}
                    </div>
                `;
            }

            return `
            <div class="sale-item" style="background: ${isSettlement ? '#e8f5e9' : '#f9f9f9'}; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid ${isSettlement ? '#c3e6cb' : '#eee'};">
                <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600; align-items: flex-start;">
                    <span>${sale.productName}</span>
                    <div style="text-align: right;">
                        <div>${formatCurrency(sale.price)}</div>
                        ${sale.discount ? `<div style="font-size: 0.75em; color: #28a745; font-weight: normal; margin-top: 2px;">Desc: ${formatCurrency(sale.discount)}</div>` : ''}
                    </div>
                </div>
                <div class="sale-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                    ${isSettlement ? '<strong>Tipo: Pagamento de Acerto</strong>' : `Cliente: ${sale.clientName}`} <br>
                    Data: ${formatDate(sale.date)} <br>
                    Status: ${sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}
                    ${payment ? `<br><span style="font-size: 0.9em; color: #28a745;">Pagamento: ${payment.method} ${payment.installments ? `(${payment.installments}x)` : ''}</span>` : ''}
                </div>
                <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                    ${payment ? `<button class="btn-secondary" onclick="openEditPaymentModal('${payment.id}', '${sale.id}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; margin-right: 5px; background-color: #4a90e2; color: white; border: none;">Editar Pagamento</button>` : ''}
                    <button class="btn-secondary" onclick="openAdminEditSaleModal('${sale.id}', '${sale.resellerId}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0; margin-right: 5px;">Editar Venda</button>
                    <button class="btn-delete" onclick="deleteAdminSale('${sale.id}', '${sale.resellerId}')" style="padding: 4px 10px; font-size: 0.8em; width: auto; margin: 0;">Excluir Venda</button>
                </div>
            </div>
        `}).join('');
    }

    // Calcular e exibir totais separados
    if (filterType === 'all') {
        const productTotal = displaySales.filter(s => !isFinancialSale(s)).reduce((sum, s) => sum + s.price, 0);
        const acertoTotal = displaySales.filter(s => isFinancialSale(s)).reduce((sum, s) => sum + s.price, 0);
        totalContainer.textContent = `Produtos: ${formatCurrency(productTotal)} | Acertos: ${formatCurrency(acertoTotal)}`;
    } else {
        totalContainer.textContent = `Total: ${formatCurrency(total)}`;
    }
}

function closeResellerSalesModal() {
    document.getElementById('resellerSalesModal').classList.remove('active');
}

async function deleteAdminSale(saleId, resellerId) {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e removerá também os registros de pagamento associados.')) return;

    showLoading();
    try {
        // 1. Remover a venda
        await salesRef.child(saleId).remove();
        
        // 2. Remover pagamentos associados
        const paymentsSnapshot = await paymentsRef.orderByChild('saleId').equalTo(saleId).once('value');
        const updates = {};
        paymentsSnapshot.forEach(child => {
            updates[child.key] = null;
        });
        if (Object.keys(updates).length > 0) {
            await paymentsRef.update(updates);
        }

        hideLoading();
        showNotification('Venda excluída com sucesso!');
        viewResellerSales(resellerId); // Recarrega a lista para atualizar a visualização
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir venda:', error);
        showNotification('Erro ao excluir venda', 'error');
    }
}

async function openAdminEditSaleModal(saleId, resellerId) {
    showLoading();
    currentEditingSaleId = saleId;
    currentAdminEditingResellerId = resellerId;

    // Injetar Modal de Edição Admin se não existir
    if (!document.getElementById('adminEditSaleModal')) {
        const modalHtml = `
            <div id="adminEditSaleModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Editar Venda (Admin)</h3>
                        <button class="close-modal" onclick="closeAdminEditSaleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Data da Venda</label>
                            <input type="date" id="adminEditSaleDate" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Produto / Descrição</label>
                            <input type="text" id="adminEditSaleProduct" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Valor (R$)</label>
                            <input type="number" id="adminEditSalePrice" class="input-field" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Cliente</label>
                            <select id="adminEditSaleClient" class="input-field"></select>
                        </div>
                        <div class="form-group">
                            <label>Status do Pagamento</label>
                            <select id="adminEditSaleStatus" class="input-field">
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                                <option value="installment">Parcelado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Método de Pagamento (Informativo)</label>
                            <select id="adminEditSaleMethod" class="input-field">
                                <option value="">Não especificado</option>
                                <option value="money">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="transfer">Transferência</option>
                            </select>
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px;">*Para gerenciar parcelas detalhadas, use o botão "Editar Pagamento" na lista.</p>
                        </div>
                        <button class="btn-primary" onclick="saveAdminSaleEdit()" style="width: 100%; margin-top: 15px;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const [saleSnapshot, clientsSnapshot, paymentsSnapshot] = await Promise.all([
            salesRef.child(saleId).once('value'),
            clientsRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            paymentsRef.orderByChild('saleId').equalTo(saleId).once('value')
        ]);

        const sale = saleSnapshot.val();
        if (!sale) throw new Error('Venda não encontrada');

        const clients = [];
        clientsSnapshot.forEach(child => {
            clients.push({ id: child.key, ...child.val() });
        });

        // Preencher Campos
        const dateObj = new Date(sale.date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        document.getElementById('adminEditSaleDate').value = `${yyyy}-${mm}-${dd}`;

        document.getElementById('adminEditSaleProduct').value = sale.productName;
        document.getElementById('adminEditSalePrice').value = sale.price;
        document.getElementById('adminEditSaleStatus').value = sale.paymentStatus;

        // Preencher Clientes
        const select = document.getElementById('adminEditSaleClient');
        let clientOptions = '<option value="">Selecione o Cliente</option>';
        if (sale.productId === 'ACERTO') {
             clientOptions += `<option value="ADMIN">Acerto de Contas (Admin)</option>`;
        }
        clients.forEach(c => {
            clientOptions += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML = clientOptions;
        select.value = sale.clientId || "";

        // Preencher Método de Pagamento (se existir registro de pagamento)
        let paymentMethod = "";
        let paymentId = null;
        paymentsSnapshot.forEach(child => {
            paymentMethod = child.val().method;
            paymentId = child.key;
        });
        const methodSelect = document.getElementById('adminEditSaleMethod');
        methodSelect.value = paymentMethod || "";
        methodSelect.dataset.paymentId = paymentId || "";

        document.getElementById('adminEditSaleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição:', error);
        showNotification('Erro ao abrir edição: ' + error.message, 'error');
    }
}

function closeAdminEditSaleModal() {
    document.getElementById('adminEditSaleModal').classList.remove('active');
    currentEditingSaleId = null;
    currentAdminEditingResellerId = null;
}

async function saveAdminSaleEdit() {
    const dateStr = document.getElementById('adminEditSaleDate').value;
    const productName = document.getElementById('adminEditSaleProduct').value.trim();
    const price = parseFloat(document.getElementById('adminEditSalePrice').value);
    const clientId = document.getElementById('adminEditSaleClient').value;
    const paymentStatus = document.getElementById('adminEditSaleStatus').value;
    const paymentMethod = document.getElementById('adminEditSaleMethod').value;
    const paymentId = document.getElementById('adminEditSaleMethod').dataset.paymentId;

    if (!dateStr || !productName || isNaN(price)) {
        showNotification('Preencha os campos obrigatórios (Data, Produto, Valor)', 'error');
        return;
    }

    // Converter data para timestamp (00:00 local)
    const [year, month, day] = dateStr.split('-').map(Number);
    const timestamp = new Date(year, month - 1, day).getTime();

    // Obter nome do cliente
    const select = document.getElementById('adminEditSaleClient');
    const clientName = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : 'Cliente Desconhecido';

    showLoading();
    try {
        // 1. Atualizar Venda
        const updates = {
            date: timestamp,
            productName: productName,
            price: price,
            clientId: clientId,
            clientName: clientName,
            paymentStatus: paymentStatus
        };
        await salesRef.child(currentEditingSaleId).update(updates);

        // 2. Atualizar ou Criar Pagamento (se método foi selecionado)
        if (paymentMethod) {
            if (paymentId) {
                // Atualizar existente
                await paymentsRef.child(paymentId).update({ method: paymentMethod });
            } else {
                // Criar novo pagamento simples
                const newPaymentId = generateId();
                await paymentsRef.child(newPaymentId).set({
                    saleId: currentEditingSaleId,
                    method: paymentMethod,
                    date: timestamp,
                    installments: null,
                    installmentValue: null
                });
            }
        }

        closeAdminEditSaleModal();
        hideLoading();
        showNotification('Venda atualizada com sucesso!');
        
        // Recarregar lista
        if (currentAdminEditingResellerId) {
            viewResellerSales(currentAdminEditingResellerId);
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar edição:', error);
        showNotification('Erro ao salvar alterações', 'error');
    }
}

// ============================================
// ADMIN - GESTÃO DE COMISSÕES
// ============================================

let currentAdminTiers = [];
let currentAdminTargetId = null; // 'GLOBAL' ou resellerId

async function openAdminCommissionModal(targetId, targetName = 'Padrão Global') {
    // Injetar HTML do modal se não existir
    if (!document.getElementById('adminCommissionModal')) {
        const modalHtml = `
            <div id="adminCommissionModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 id="adminCommissionTitle">Gerenciar Comissões</h3>
                        <button class="close-modal" onclick="closeAdminCommissionModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="adminCommissionList" style="margin-bottom: 15px;"></div>
                        <button class="btn-secondary" onclick="addAdminCommissionTier()" style="width: 100%; margin-bottom: 15px;">+ Adicionar Faixa</button>
                        
                        <div id="globalCommissionOptions" style="display: none; margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="applyToAllResellers">
                                <strong>Aplicar para TODAS as revendedoras existentes agora</strong>
                            </label>
                            <p style="font-size: 0.85em; color: #666; margin-top: 5px; margin-left: 24px;">Isso substituirá as comissões individuais de todas as revendedoras.</p>
                        </div>

                        <button class="btn-primary" onclick="saveAdminCommission()" style="width: 100%;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    currentAdminTargetId = targetId;
    document.getElementById('adminCommissionTitle').textContent = `Comissões: ${targetName}`;
    document.getElementById('globalCommissionOptions').style.display = targetId === 'GLOBAL' ? 'block' : 'none';
    if (document.getElementById('applyToAllResellers')) document.getElementById('applyToAllResellers').checked = false;

    showLoading();
    try {
        let tiers = [];
        if (targetId === 'GLOBAL') {
            const snapshot = await configRef.child('defaultCommissions').once('value');
            tiers = snapshot.val() || [];
        } else {
            const snapshot = await goalsRef.child(targetId).child('commissionTiers').once('value');
            tiers = snapshot.val() || [];
        }
        
        // Se vazio, inicia com um padrão
        if (!tiers || tiers.length === 0) {
            tiers = [{ min: 0, max: 1000, percentage: 10 }];
        }

        currentAdminTiers = tiers;
        renderAdminTiers();
        document.getElementById('adminCommissionModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar comissões:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

function closeAdminCommissionModal() {
    document.getElementById('adminCommissionModal').classList.remove('active');
}

function renderAdminTiers() {
    const container = document.getElementById('adminCommissionList');
    container.innerHTML = currentAdminTiers.map((tier, index) => `
        <div class="commission-tier" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="number" value="${tier.min}" onchange="updateAdminTier(${index}, 'min', this.value)" class="input-field" placeholder="De (R$)" style="flex: 1;">
            <input type="number" value="${tier.max}" onchange="updateAdminTier(${index}, 'max', this.value)" class="input-field" placeholder="Até (R$)" style="flex: 1;">
            <input type="number" value="${tier.percentage}" onchange="updateAdminTier(${index}, 'percentage', this.value)" class="input-field" placeholder="%" style="width: 80px;">
            <button class="tier-remove" onclick="removeAdminTier(${index})" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

function addAdminCommissionTier() {
    currentAdminTiers.push({ min: 0, max: 0, percentage: 0 });
    renderAdminTiers();
}

function removeAdminTier(index) {
    currentAdminTiers.splice(index, 1);
    renderAdminTiers();
}

function updateAdminTier(index, field, value) {
    currentAdminTiers[index][field] = parseFloat(value);
}

async function saveAdminCommission() {
    showLoading();
    try {
        if (currentAdminTargetId === 'GLOBAL') {
            await configRef.child('defaultCommissions').set(currentAdminTiers);
            
            const applyToAll = document.getElementById('applyToAllResellers').checked;
            if (applyToAll) {
                const usersSnapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
                const updates = {};
                usersSnapshot.forEach(child => {
                    updates[`goals/${child.key}/commissionTiers`] = currentAdminTiers;
                });
                if (Object.keys(updates).length > 0) await database.ref().update(updates);
            }
        } else {
            await goalsRef.child(currentAdminTargetId).child('commissionTiers').set(currentAdminTiers);
        }
        hideLoading();
        showNotification('Comissões salvas com sucesso!');
        closeAdminCommissionModal();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar:', error);
        showNotification('Erro ao salvar comissões', 'error');
    }
}

// ============================================
// ADMIN - GESTÃO DE PEDIDOS
// ============================================

function updateOrderResellerSelect(resellers = []) {
    // Função mantida para compatibilidade, mas o select principal agora é gerado dinamicamente no modal
    const select = document.getElementById('orderReseller');
    if (select) {
        select.innerHTML = '<option value="">Selecione a Revendedora</option>' +
            resellers.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
}

async function createManualOrder() {
    const resellerId = document.getElementById('manualOrderReseller').value;
    
    if (!resellerId) {
        showNotification('Selecione uma revendedora', 'error');
        return;
    }

    const rows = document.querySelectorAll('.manual-order-item');
    if (rows.length === 0) {
        showNotification('Adicione pelo menos um item ao pedido', 'error');
        return;
    }

    showLoading();

    try {
        const newProductIds = [];
        const updates = {};

        // 1. Criar produtos
        rows.forEach(row => {
            const name = row.querySelector('.item-name').value;
            const code = row.querySelector('.item-code').value;
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;

            if (name && price) {
                const productId = generateId();
                newProductIds.push(productId);
                updates[`products/${productId}`] = {
                    name,
                    code: code || 'S/C',
                    category: 'Manual',
                    quantity,
                    price,
                    available: quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            }
        });

        if (newProductIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // 2. Salvar produtos
        await database.ref().update(updates);

        // 3. Criar Pedido
        const orderId = generateId();
        await ordersRef.child(orderId).set({
            resellerId,
            products: newProductIds,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'active'
        });

        hideLoading();
        showNotification('Pedido criado com sucesso!');
        closeManualOrderModal();
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao criar pedido:', error);
        showNotification('Erro ao criar pedido', 'error');
    }
}

async function archiveOrder(orderId) {
    if (!confirm('Deseja arquivar este pedido? Os produtos dele deixarão de aparecer para a revendedora, mas o registro será mantido no histórico.')) return;

    showLoading();
    try {
        await ordersRef.child(orderId).update({
            status: 'completed'
        });
        hideLoading();
        showNotification('Pedido arquivado com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao arquivar pedido:', error);
        showNotification('Erro ao arquivar pedido', 'error');
    }
}

async function unarchiveOrder(orderId) {
    if (!confirm('Deseja reativar este pedido? Os produtos voltarão a aparecer para a revendedora.')) return;

    showLoading();
    try {
        await ordersRef.child(orderId).update({
            status: 'active'
        });
        hideLoading();
        showNotification('Pedido reativado com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao reativar pedido:', error);
        showNotification('Erro ao reativar pedido', 'error');
    }
}

async function loadOrders() {
    showLoading();
    
    try {
        const [ordersSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
            ordersRef.once('value'),
            usersRef.once('value'),
            productsRef.once('value')
        ]);

        const orders = [];
        ordersSnapshot.forEach((child) => {
            orders.push({
                id: child.key,
                ...child.val()
            });
        });

        const users = {};
        usersSnapshot.forEach((child) => {
            users[child.key] = child.val();
        });

        const products = {};
        productsSnapshot.forEach((child) => {
            products[child.key] = child.val();
        });

        // Separar pedidos ativos e arquivados
        const activeOrders = [];
        const archivedOrders = [];

        orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Mais recentes primeiro

        orders.forEach(order => {
            if (order.status === 'active') {
                activeOrders.push(order);
            } else {
                archivedOrders.push(order);
            }
        });

        const container = document.getElementById('adminOrders');
        
        const renderOrderCard = (order) => {
            const reseller = users[order.resellerId];
            const orderProducts = order.products ? order.products.filter(pid => products[pid]) : [];
            const isActive = order.status === 'active';

            return `
                <div class="reseller-item" style="${!isActive ? 'background-color: #f0f0f0; opacity: 0.8;' : ''} margin-bottom: 0; height: 100%; display: flex; flex-direction: column;">
                    <div class="reseller-header">
                        <div class="reseller-name">Pedido para: ${reseller ? reseller.name : 'Desconhecido'} ${!isActive ? '<span style="font-size: 0.8em; color: #666;">(Arquivado)</span>' : ''}</div>
                    </div>
                    <div class="reseller-details">
                        <p>📦 ${orderProducts.length} produto(s)</p>
                        <p>📅 ${formatDate(order.createdAt)}</p>
                        <button class="btn-secondary" onclick="openEditOrderModal('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px; margin-right: 5px;">Editar</button>
                        <button class="btn-secondary" onclick="openCloneOrderModal('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px; margin-right: 5px; background-color: #17a2b8; color: white; border: none;">Clonar</button>
                        ${isActive 
                            ? `<button class="btn-secondary" onclick="archiveOrder('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px; margin-right: 5px; background-color: #6c757d; color: white; border: none;">Arquivar</button>`
                            : `<button class="btn-secondary" onclick="unarchiveOrder('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px; margin-right: 5px; background-color: #28a745; color: white; border: none;">Reativar</button>`
                        }
                        <button class="btn-delete" onclick="deleteOrder('${order.id}')" style="margin-top: 5px; padding: 5px 10px; font-size: 12px;">Excluir</button>
                    </div>
                </div>
            `;
        };

        let html = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin: 0;">Gestão de Pedidos</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" onclick="openManualOrderModal()">+ Novo Pedido Manual</button>
                    <button class="btn-secondary" onclick="showImportModal()">📥 Importar Planilha</button>
                </div>
            </div>
            
            <div class="orders-section">
                <h3 style="margin-bottom: 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem;">Pedidos Ativos (${activeOrders.length})</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                    ${activeOrders.length > 0 ? activeOrders.map(renderOrderCard).join('') : '<div class="empty-state" style="grid-column: 1/-1; padding: 1rem 0;"><p class="empty-text">Nenhum pedido ativo.</p></div>'}
                </div>
            </div>

            <details class="orders-section" style="margin-top: 2rem;">
                <summary style="font-size: 1.25rem; font-family: 'Cormorant Garamond', serif; font-weight: 600; cursor: pointer; padding: 0.5rem; border-radius: 4px; background: #f0f0f0;">
                    Pedidos Arquivados (${archivedOrders.length})
                </summary>
                <div style="padding-top: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        ${archivedOrders.length > 0 ? archivedOrders.map(renderOrderCard).join('') : '<div class="empty-state" style="grid-column: 1/-1; padding: 1rem 0;"><p class="empty-text">Nenhum pedido arquivado.</p></div>'}
                    </div>
                </div>
            </details>
        `;

        container.innerHTML = html;

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar pedidos:', error);
    }
}

// ============================================
// ADMIN - GESTÃO DE CLIENTES
// ============================================

let adminClientsData = [];
let adminClientsUsers = {};
let currentAdminClientsPage = 1;
const adminClientsPerPage = 10;
let inactiveClientsData = [];

async function loadAdminClients() {
    showLoading();
    try {
        // Carregar clientes
        const clientsSnapshot = await clientsRef.once('value');
        const clients = [];
        clientsSnapshot.forEach(child => {
            const val = child.val();
            if (!val.hiddenFromAdmin) {
                clients.push({ id: child.key, ...val });
            }
        });

        // Ordenar por data de criação (mais recentes primeiro)
        clients.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Tentar carregar usuários (revendedoras) para mostrar os nomes
        let users = {};
        try {
            const usersSnapshot = await usersRef.once('value');
            usersSnapshot.forEach(child => {
                users[child.key] = child.val();
            });
        } catch (e) {
            console.warn('Erro ao carregar dados das revendedoras (permissão ou conexão):', e);
        }
        
        // Armazenar dados globalmente para paginação
        adminClientsData = clients;
        adminClientsUsers = users;
        currentAdminClientsPage = 1;
        
        // Limpar busca anterior para garantir que todos apareçam
        const searchInput = document.getElementById('adminClientSearch');
        if (searchInput) searchInput.value = '';
        
        // Injetar/Atualizar filtro de revendedora
        let resellerFilter = document.getElementById('adminClientResellerFilter');
        if (!resellerFilter && searchInput) {
            resellerFilter = document.createElement('select');
            resellerFilter.id = 'adminClientResellerFilter';
            resellerFilter.className = 'input-field';
            resellerFilter.style.maxWidth = '200px';
            resellerFilter.style.marginLeft = '10px';
            resellerFilter.style.display = 'inline-block';
            resellerFilter.style.padding = '8px';
            resellerFilter.onchange = () => {
                currentAdminClientsPage = 1;
                renderAdminClientsPage();
            };
            if (searchInput.parentNode) {
                searchInput.parentNode.insertBefore(resellerFilter, searchInput.nextSibling);
            }
        }

        if (resellerFilter) {
            const currentVal = resellerFilter.value;
            let options = '<option value="">Todas as Revendedoras</option>';
            const resellersList = Object.entries(users)
                .filter(([_, u]) => u.role === 'reseller')
                .map(([id, u]) => ({ id, name: u.name }))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            resellersList.forEach(r => options += `<option value="${r.id}">${r.name}</option>`);
            resellerFilter.innerHTML = options;
            resellerFilter.value = resellersList.some(r => r.id === currentVal) ? currentVal : "";
        }

        // Injetar botão de exportar
        let exportBtn = document.getElementById('adminClientExportBtn');
        if (!exportBtn && searchInput && searchInput.parentNode) {
            exportBtn = document.createElement('button');
            exportBtn.id = 'adminClientExportBtn';
            exportBtn.className = 'btn-secondary';
            exportBtn.innerHTML = '📥 Excel';
            exportBtn.style.marginLeft = '10px';
            exportBtn.style.padding = '8px 15px';
            exportBtn.style.cursor = 'pointer';
            exportBtn.onclick = exportAdminClientsToExcel;
            
            const refNode = resellerFilter ? resellerFilter.nextSibling : searchInput.nextSibling;
            searchInput.parentNode.insertBefore(exportBtn, refNode);
        }

        // Injetar botão de Relatório de Inativos
        let inactiveBtn = document.getElementById('adminClientInactiveBtn');
        if (!inactiveBtn && searchInput && searchInput.parentNode) {
            inactiveBtn = document.createElement('button');
            inactiveBtn.id = 'adminClientInactiveBtn';
            inactiveBtn.className = 'btn-secondary';
            inactiveBtn.innerHTML = '💤 Inativos';
            inactiveBtn.style.marginLeft = '10px';
            inactiveBtn.style.padding = '8px 15px';
            inactiveBtn.style.cursor = 'pointer';
            inactiveBtn.onclick = showInactiveClientsReport;
            
            const refNode = exportBtn ? exportBtn.nextSibling : (resellerFilter ? resellerFilter.nextSibling : searchInput.nextSibling);
            searchInput.parentNode.insertBefore(inactiveBtn, refNode);
        }

        renderAdminClientsPage();
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error(error);
        const container = document.getElementById('adminClientsList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><p class="empty-text" style="color: #c05746;">Erro ao carregar clientes: ${error.message}</p></div>`;
        }
    }
}

function renderAdminClientsPage() {
    const container = document.getElementById('adminClientsList');
    if (!container) return;

    const searchInput = document.getElementById('adminClientSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const resellerFilter = document.getElementById('adminClientResellerFilter');
    const filterResellerId = resellerFilter ? resellerFilter.value : '';

    // Filtrar dados
    const filtered = adminClientsData.filter(client => {
        const reseller = adminClientsUsers[client.resellerId] || {};
        const text = (client.name + ' ' + (client.phone||'') + ' ' + (client.email||'') + ' ' + (reseller.name||'')).toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        const matchesReseller = filterResellerId ? client.resellerId === filterResellerId : true;
        return matchesSearch && matchesReseller;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum cliente encontrado</p></div>';
        return;
    }

    // Paginação
    const totalPages = Math.ceil(filtered.length / adminClientsPerPage);
    if (currentAdminClientsPage > totalPages) currentAdminClientsPage = totalPages || 1;
    if (currentAdminClientsPage < 1) currentAdminClientsPage = 1;

    const start = (currentAdminClientsPage - 1) * adminClientsPerPage;
    const end = start + adminClientsPerPage;
    const pageItems = filtered.slice(start, end);

    // Renderizar Grid de Cards
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">';
    
    html += pageItems.map(client => {
        const reseller = adminClientsUsers[client.resellerId] || { name: 'Desconhecido' };
        return `
            <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${client.name}</div>
                        <div style="font-size: 0.8em; color: #888;">Rev: ${reseller.name}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-size: 1.2em;">👤</div>
                </div>
                
                <div style="font-size: 0.9em; color: #555; margin-bottom: 15px; flex: 1;">
                    ${client.phone ? `<div style="margin-bottom: 4px;">📱 ${client.phone}</div>` : ''}
                    ${client.email ? `<div style="margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">📧 ${client.email}</div>` : ''}
                    ${client.notes ? `<div style="font-style: italic; color: #777; font-size: 0.85em; margin-top: 5px;">📝 ${client.notes}</div>` : ''}
                </div>

                <div style="display: flex; gap: 8px; margin-top: auto; border-top: 1px solid #f0f0f0; padding-top: 10px;">
                    <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="flex: 1; font-size: 0.85em; padding: 6px;">Editar</button>
                    <button class="btn-secondary" onclick="viewAdminClientHistory('${client.id}', '${client.resellerId}')" style="flex: 1; font-size: 0.85em; padding: 6px;">Histórico</button>
                    <button class="btn-secondary" onclick="hideClientFromAdmin('${client.id}')" style="flex: 1; font-size: 0.85em; padding: 6px; background-color: #dc3545; color: white; border: none;">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
    
    html += '</div>';

    // Controles de Paginação
    if (totalPages > 1) {
        html += `
            <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                <button onclick="changeAdminClientPage(-1)" class="btn-secondary" ${currentAdminClientsPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>❮ Anterior</button>
                <span style="font-weight: 500; color: #555;">Página ${currentAdminClientsPage} de ${totalPages}</span>
                <button onclick="changeAdminClientPage(1)" class="btn-secondary" ${currentAdminClientsPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Próxima ❯</button>
            </div>
        `;
    }

    container.innerHTML = html;
}

function changeAdminClientPage(delta) {
    currentAdminClientsPage += delta;
    renderAdminClientsPage();
}

function searchAdminClients() {
    currentAdminClientsPage = 1;
    renderAdminClientsPage();
}

async function viewAdminClientHistory(clientId, resellerId) {
    showLoading();
    try {
        const clientSnapshot = await clientsRef.child(clientId).once('value');
        const client = clientSnapshot.val();
        
        document.getElementById('historyClientName').textContent = `Histórico: ${client.name}`;

        // Buscar vendas da revendedora específica para otimizar, depois filtrar pelo cliente
        const salesSnapshot = await salesRef.orderByChild('resellerId').equalTo(resellerId).once('value');
        const clientSales = [];
        
        salesSnapshot.forEach(child => {
            const sale = child.val();
            if (sale.clientId === clientId && !isFinancialSale(sale)) {
                clientSales.push(sale);
            }
        });

        const container = document.getElementById('clientHistoryList');
        
        if (clientSales.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma compra realizada por este cliente.</p>';
        } else {
            container.innerHTML = clientSales.reverse().map(sale => `
                <div class="sale-item" style="background: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #eee;">
                    <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${sale.productName}</span>
                        <span>${formatCurrency(sale.price)}</span>
                    </div>
                    <div class="sale-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        Data: ${formatDate(sale.date)} <br>
                        Status: ${sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('clientHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar histórico:', error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

async function hideClientFromAdmin(clientId) {
    if (!confirm('Tem certeza que deseja remover este cliente da visualização do administrador? Ele continuará visível para a revendedora.')) return;

    showLoading();
    try {
        await clientsRef.child(clientId).update({ hiddenFromAdmin: true });
        hideLoading();
        showNotification('Cliente removido da lista administrativa.');
        loadAdminClients();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao remover cliente', 'error');
    }
}

function exportAdminClientsToExcel() {
    const searchInput = document.getElementById('adminClientSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const resellerFilter = document.getElementById('adminClientResellerFilter');
    const filterResellerId = resellerFilter ? resellerFilter.value : '';

    // Filtrar dados (mesma lógica da renderização)
    const filtered = adminClientsData.filter(client => {
        const reseller = adminClientsUsers[client.resellerId] || {};
        const text = (client.name + ' ' + (client.phone||'') + ' ' + (client.email||'') + ' ' + (reseller.name||'')).toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        const matchesReseller = filterResellerId ? client.resellerId === filterResellerId : true;
        return matchesSearch && matchesReseller;
    });

    if (filtered.length === 0) {
        showNotification('Nenhum cliente encontrado para exportar', 'error');
        return;
    }

    const data = filtered.map(client => {
        const reseller = adminClientsUsers[client.resellerId] || { name: 'Desconhecido' };
        return {
            'Nome': client.name,
            'Telefone': client.phone || '',
            'E-mail': client.email || '',
            'Revendedora': reseller.name,
            'Observações': client.notes || '',
            'Data Cadastro': formatDate(client.createdAt)
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "clientes_filtrados.xlsx");
}

async function showInactiveClientsReport() {
    showLoading();
    try {
        const [clientsSnapshot, salesSnapshot, usersSnapshot] = await Promise.all([
            clientsRef.once('value'),
            salesRef.once('value'),
            usersRef.once('value')
        ]);

        const clients = [];
        clientsSnapshot.forEach(child => {
            const val = child.val();
            if (!val.hiddenFromAdmin) {
                clients.push({ id: child.key, ...val });
            }
        });

        const sales = [];
        salesSnapshot.forEach(child => sales.push(child.val()));

        const users = {};
        usersSnapshot.forEach(child => users[child.key] = child.val());

        // Calcular última compra de cada cliente (ignora registros de acerto financeiro)
        const clientLastPurchase = {};
        sales.forEach(sale => {
            if (sale.clientId && !isFinancialSale(sale)) {
                const saleDate = new Date(sale.date).getTime();
                if (!clientLastPurchase[sale.clientId] || saleDate > clientLastPurchase[sale.clientId]) {
                    clientLastPurchase[sale.clientId] = saleDate;
                }
            }
        });

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const cutoffTime = threeMonthsAgo.getTime();

        // Filtrar inativos (sem compra ou última compra > 3 meses)
        inactiveClientsData = clients.filter(client => {
            const lastPurchase = clientLastPurchase[client.id];
            return !lastPurchase || lastPurchase < cutoffTime;
        }).map(c => ({
            ...c,
            lastPurchase: clientLastPurchase[c.id],
            resellerName: users[c.resellerId]?.name || 'Desconhecido'
        }));

        // Ordenar: quem nunca comprou primeiro, depois os com compra mais antiga
        inactiveClientsData.sort((a, b) => (a.lastPurchase || 0) - (b.lastPurchase || 0));

        // Renderizar Modal
        if (!document.getElementById('inactiveClientsModal')) {
             const modalHtml = `
                <div id="inactiveClientsModal" class="modal-overlay">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3>Relatório de Clientes Inativos (+3 meses)</h3>
                            <button class="close-modal" onclick="document.getElementById('inactiveClientsModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body">
                            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                                <span>Total: <strong id="inactiveCount">0</strong> clientes</span>
                                <button class="btn-secondary" onclick="exportInactiveClientsReport()">📥 Exportar Excel</button>
                            </div>
                            <div id="inactiveClientsList" style="max-height: 400px; overflow-y: auto;"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const container = document.getElementById('inactiveClientsList');
        document.getElementById('inactiveCount').textContent = inactiveClientsData.length;

        if (inactiveClientsData.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum cliente inativo encontrado.</p></div>';
        } else {
            container.innerHTML = inactiveClientsData.map(c => {
                const lastPurchaseDate = c.lastPurchase ? formatDate(c.lastPurchase) : 'Nunca comprou';
                return `
                <div style="background: #fff; padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #2c1810;">${c.name}</div>
                        <div style="font-size: 0.85em; color: #666;">
                            Revendedora: ${c.resellerName} | Tel: ${c.phone || '-'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85em; color: #dc3545; font-weight: 500;">Última compra:</div>
                        <div>${lastPurchaseDate}</div>
                    </div>
                </div>
            `}).join('');
        }

        document.getElementById('inactiveClientsModal').classList.add('active');
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório', 'error');
    }
}

function exportInactiveClientsReport() {
    if (!inactiveClientsData || inactiveClientsData.length === 0) {
        showNotification('Nada para exportar', 'error');
        return;
    }

    const data = inactiveClientsData.map(c => ({
        'Nome': c.name,
        'Telefone': c.phone || '',
        'E-mail': c.email || '',
        'Revendedora': c.resellerName,
        'Última Compra': c.lastPurchase ? formatDate(c.lastPurchase) : 'Nunca',
        'Observações': c.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inativos");
    XLSX.writeFile(wb, "clientes_inativos.xlsx");
}

// ============================================
// NOVO PEDIDO MANUAL (MODAL)
// ============================================

async function openManualOrderModal() {
    if (!document.getElementById('manualOrderModal')) {
        const modalHtml = `
            <div id="manualOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Novo Pedido Manual</h3>
                        <button class="close-modal" onclick="closeManualOrderModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Revendedora</label>
                            <select id="manualOrderReseller" class="input-field"></select>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h4>Itens do Pedido</h4>
                                <button class="btn-secondary" onclick="addManualOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
                            </div>
                            <div id="manualOrderItemsList" style="max-height: 300px; overflow-y: auto; padding-right: 5px;"></div>
                        </div>

                        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <button class="btn-primary" onclick="createManualOrder()" style="width: 100%;">Criar Pedido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Carregar revendedoras
    const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
    const select = document.getElementById('manualOrderReseller');
    select.innerHTML = '<option value="">Selecione a Revendedora</option>';
    snapshot.forEach(child => {
        const r = child.val();
        select.innerHTML += `<option value="${child.key}">${r.name}</option>`;
    });

    // Limpar itens anteriores e adicionar um inicial
    document.getElementById('manualOrderItemsList').innerHTML = '';
    addManualOrderItem();

    document.getElementById('manualOrderModal').classList.add('active');
}

function closeManualOrderModal() {
    const modal = document.getElementById('manualOrderModal');
    if (modal) modal.classList.remove('active');
}

function addManualOrderItem() {
    const container = document.getElementById('manualOrderItemsList');
    const div = document.createElement('div');
    div.className = 'manual-order-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.style.alignItems = 'center';
    
    div.innerHTML = `
        <input type="text" class="input-field item-name" placeholder="Nome do Produto" style="flex: 2;">
        <input type="text" class="input-field item-code" placeholder="Código" style="flex: 1;">
        <input type="number" class="input-field item-price" placeholder="Preço (R$)" step="0.01" style="flex: 1;">
        <input type="number" class="input-field item-qty" value="1" style="width: 60px; display: none;">
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
    `;
    
    container.appendChild(div);
}

async function deleteOrder(orderId) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    
    showLoading();
    try {
        await ordersRef.child(orderId).remove();
        hideLoading();
        showNotification('Pedido excluído com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir pedido:', error);
        showNotification('Erro ao excluir pedido', 'error');
    }
}

let currentEditingOrderId = null;

async function openEditOrderModal(orderId) {
    showLoading();
    currentEditingOrderId = orderId;

    // FORÇAR ATUALIZAÇÃO: Se o modal já existe mas não tem o campo de data, remove para recriar
    const existingModal = document.getElementById('editOrderModal');
    if (existingModal && !document.getElementById('editOrderSettlementDate')) {
        existingModal.remove();
    }

    // Injetar modal se não existir
    if (!document.getElementById('editOrderModal')) {
        const modalHtml = `
            <div id="editOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Editar Pedido</h3>
                        <button class="close-modal" onclick="closeEditOrderModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Revendedora</label>
                            <select id="editOrderReseller" class="input-field"></select>
                        </div>

                        <div class="form-group">
                            <label>Data do Acerto</label>
                            <input type="date" id="editOrderSettlementDate" class="input-field">
                        </div>
                        
                        <div id="editOrderProductsSelection" style="margin-top: 20px;">
                            <!-- Lista de produtos será injetada aqui -->
                        </div>

                        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <button class="btn-primary" onclick="saveOrderEdit()" style="width: 100%;">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const [orderSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
            ordersRef.child(orderId).once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            productsRef.once('value')
        ]);

        const order = orderSnapshot.val();
        
        // Buscar data de acerto atual da revendedora
        const goalSnapshot = await goalsRef.child(order.resellerId).once('value');
        const goal = goalSnapshot.val() || {};
        const dateInput = document.getElementById('editOrderSettlementDate');
        if (dateInput) dateInput.value = goal.settlementDate || '';

        const resellers = [];
        usersSnapshot.forEach(child => {
            resellers.push({id: child.key, ...child.val()});
        });
        
        const products = {};
        productsSnapshot.forEach(child => {
            products[child.key] = {id: child.key, ...child.val()};
        });

        // Preencher Select de Revendedoras
        const resellerSelect = document.getElementById('editOrderReseller');
        resellerSelect.innerHTML = '<option value="">Selecione a Revendedora</option>' +
            resellers.map(r => `<option value="${r.id}" ${r.id === order.resellerId ? 'selected' : ''}>${r.name}</option>`).join('');

        // Preencher Produtos (Modo Edição Manual)
        const productsContainer = document.getElementById('editOrderProductsSelection');
        
        let orderProducts = order.products || [];
        if (typeof orderProducts === 'object' && !Array.isArray(orderProducts)) {
            orderProducts = Object.values(orderProducts);
        }
        
        productsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin:0;">Itens do Pedido</h4>
                <button class="btn-secondary" onclick="addEditOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
            </div>
            <div id="editOrderItemsList" style="max-height: 300px; overflow-y: auto; padding-right: 5px;"></div>
        `;

        orderProducts.forEach(pid => {
            const productId = typeof pid === 'object' ? pid.id : pid;
            const p = products[productId];
            if (p) {
                addEditOrderItem(p);
            } else {
                addEditOrderItem({
                    id: productId,
                    name: 'Produto não encontrado (ID: ' + productId + ')',
                    code: '?',
                    price: 0,
                    quantity: 1
                });
            }
        });

        document.getElementById('editOrderModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de pedido:', error);
        showNotification('Erro ao carregar pedido', 'error');
    }
}

function addEditOrderItem(product = null) {
    const container = document.getElementById('editOrderItemsList');
    const div = document.createElement('div');
    div.className = 'edit-order-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.style.alignItems = 'center';
    
    const idValue = product ? product.id : '';
    const nameValue = product ? String(product.name).replace(/"/g, '&quot;') : '';
    const codeValue = product ? String(product.code).replace(/"/g, '&quot;') : '';
    const priceValue = product ? product.price : '';
    const qtyValue = product ? product.quantity : '1';

    div.innerHTML = `
        <input type="hidden" class="item-id" value="${idValue}">
        <input type="text" class="input-field item-name" placeholder="Nome" value="${nameValue}" style="flex: 2;">
        <input type="text" class="input-field item-code" placeholder="Cód" value="${codeValue}" style="flex: 1;">
        <input type="number" class="input-field item-price" placeholder="R$" value="${priceValue}" step="0.01" style="flex: 1;">
        <input type="number" class="input-field item-qty" value="${qtyValue}" style="width: 60px; display: none;">
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer;">×</button>
    `;
    
    container.appendChild(div);
}

function closeEditOrderModal() {
    document.getElementById('editOrderModal').classList.remove('active');
    currentEditingOrderId = null;
}

async function saveOrderEdit() {
    const resellerId = document.getElementById('editOrderReseller').value;
    const settlementDateInput = document.getElementById('editOrderSettlementDate');
    const settlementDate = settlementDateInput ? settlementDateInput.value : '';
    
    if (!resellerId) {
        showNotification('Selecione uma revendedora', 'error');
        return;
    }

    const rows = document.querySelectorAll('.edit-order-item');
    if (rows.length === 0) {
        showNotification('O pedido deve ter pelo menos um item', 'error');
        return;
    }

    showLoading();

    try {
        const productIds = [];
        const updates = {};

        rows.forEach(row => {
            const id = row.querySelector('.item-id').value;
            const name = row.querySelector('.item-name').value;
            const code = row.querySelector('.item-code').value;
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;

            if (name && price) {
                let productId = id;
                if (!productId) {
                    productId = generateId();
                }
                
                productIds.push(productId);
                
                updates[`products/${productId}`] = {
                    name,
                    code: code || 'S/C',
                    category: 'Manual',
                    quantity,
                    price,
                    available: quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            }
        });

        if (productIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // Atualizar produtos
        await database.ref().update(updates);

        // Atualizar pedido
        await ordersRef.child(currentEditingOrderId).update({
            resellerId,
            products: productIds
        });

        // Atualizar data de acerto se fornecida
        if (settlementDate) {
            await goalsRef.child(resellerId).update({ settlementDate });
        }

        closeEditOrderModal();
        hideLoading();
        showNotification('Pedido atualizado com sucesso!');
        loadOrders();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar pedido:', error);
        showNotification('Erro ao atualizar pedido', 'error');
    }
}

let currentCloningOrderId = null;

async function openCloneOrderModal(orderId) {
    currentCloningOrderId = orderId;
    
    if (!document.getElementById('cloneOrderModal')) {
        const modalHtml = `
            <div id="cloneOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Clonar Pedido</h3>
                        <button class="close-modal" onclick="closeCloneOrderModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px; color: #666;">Selecione a revendedora para quem deseja copiar este pedido. Novos produtos serão criados com as mesmas características.</p>
                        <div class="form-group">
                            <label>Revendedora Destino</label>
                            <select id="cloneOrderReseller" class="input-field"></select>
                        </div>
                        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <button class="btn-primary" onclick="confirmCloneOrder()" style="width: 100%;">Confirmar Clonagem</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showLoading();
    try {
        const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
        const select = document.getElementById('cloneOrderReseller');
        select.innerHTML = '<option value="">Selecione a Revendedora</option>';
        
        const resellers = [];
        snapshot.forEach(child => {
            resellers.push({id: child.key, ...child.val()});
        });
        resellers.sort((a, b) => a.name.localeCompare(b.name));
        
        resellers.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${r.name}</option>`;
        });

        document.getElementById('cloneOrderModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar revendedoras:', error);
        showNotification('Erro ao abrir modal', 'error');
    }
}

function closeCloneOrderModal() {
    const modal = document.getElementById('cloneOrderModal');
    if (modal) modal.classList.remove('active');
    currentCloningOrderId = null;
}

async function confirmCloneOrder() {
    const targetResellerId = document.getElementById('cloneOrderReseller').value;
    
    if (!targetResellerId) {
        showNotification('Selecione uma revendedora de destino', 'error');
        return;
    }

    if (!currentCloningOrderId) return;

    showLoading();

    try {
        const orderSnapshot = await ordersRef.child(currentCloningOrderId).once('value');
        const originalOrder = orderSnapshot.val();
        
        if (!originalOrder) throw new Error('Pedido original não encontrado');

        let originalProductIds = originalOrder.products || [];
        if (typeof originalProductIds === 'object' && !Array.isArray(originalProductIds)) {
            originalProductIds = Object.values(originalProductIds);
        }

        const productsSnapshot = await productsRef.once('value');
        const allProducts = productsSnapshot.val() || {};
        
        const newProductIds = [];
        const updates = {};

        originalProductIds.forEach(pid => {
            const id = typeof pid === 'object' ? pid.id : pid;
            const productData = allProducts[id];

            if (productData) {
                const newProductId = generateId();
                newProductIds.push(newProductId);
                
                updates[`products/${newProductId}`] = {
                    name: productData.name,
                    code: productData.code,
                    category: productData.category,
                    quantity: productData.quantity,
                    price: productData.price,
                    barcode: productData.barcode || '',
                    available: productData.quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
            }
        });

        if (newProductIds.length === 0) {
            throw new Error('Nenhum produto válido encontrado para clonar');
        }

        await database.ref().update(updates);

        const newOrderId = generateId();
        await ordersRef.child(newOrderId).set({
            resellerId: targetResellerId,
            products: newProductIds,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'active'
        });

        hideLoading();
        closeCloneOrderModal();
        showNotification('Pedido clonado com sucesso!');
        loadOrders();

    } catch (error) {
        hideLoading();
        console.error('Erro ao clonar pedido:', error);
        showNotification('Erro ao clonar pedido: ' + error.message, 'error');
    }
}

function loadAdminData() {
    loadResellers();
    loadOrders();
    
    // Definir Dashboard como tela inicial
    switchAdminTab('dashboard');

    // Ocultar aba de produtos conforme solicitado
    const productsTabBtn = document.querySelector('button[onclick="switchAdminTab(\'products\')"]');
    if (productsTabBtn) productsTabBtn.style.display = 'none';
}

// ============================================
// REVENDEDORA - DASHBOARD
// ============================================

function loadResellerData() {
    document.getElementById('resellerName').textContent = currentUser.name;
    updateDashboard();
    loadProducts();
    checkRankingNotification(); // Verificar se há novidades no ranking
}

async function updateDashboard() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [salesSnapshot, goalsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            goalsRef.child(currentUser.uid).once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled && !isFinancialSale(sale)) {
                sales.push(sale);
            }
        });

        const goals = goalsSnapshot.val() || {};
        
        const totalSales = sales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = calculateTotalCommission(totalSales, goals.commissionTiers || []);
        
        document.getElementById('totalSales').textContent = formatCurrency(totalSales);
        document.getElementById('monthGoal').textContent = formatCurrency(goals.goalAmount || 0);
        document.getElementById('totalCommission').textContent = formatCurrency(totalCommission);
        document.getElementById('settlementDate').textContent = goals.settlementDate ? formatDate(goals.settlementDate) : '--/--/----';
        
        const goalAmount = goals.goalAmount || 1;
        const progress = Math.min((totalCommission / goalAmount) * 100, 100);
        document.getElementById('progressFill').style.width = progress + '%';
        
        const salesNeededForGoal = calculateSalesForTargetCommission(goalAmount, goals.commissionTiers || []);
        const remainingSales = Math.max(0, salesNeededForGoal - totalSales);

        let progressText = `${progress.toFixed(1)}% da meta atingida`;
        if (remainingSales > 0) {
            progressText += ` | Faltam ${formatCurrency(remainingSales)} em vendas`;
        }
        document.getElementById('progressText').textContent = progressText;
        
        loadRecentSales(sales);

        // Adicionar botão de Solicitar Acerto se não existir
        renderSettlementButton();

        // Carregar Ranking
        await loadResellerRanking();

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar dashboard:', error);
    }
}

async function loadResellerRanking() {
    try {
        // Buscar configuração de data de reset e todas as vendas
        const [salesSnapshot, configSnapshot, historySnapshot] = await Promise.all([
            salesRef.once('value'),
            configRef.child('ranking').once('value'),
            database.ref('rankingHistory').limitToLast(1).once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach(child => {
            sales.push(child.val());
        });

        // Determinar data de corte (último reset ou início dos tempos)
        const config = configSnapshot.val();
        const lastResetDate = (config && config.lastResetDate) ? config.lastResetDate : 0;

        // Filtrar vendas apenas APÓS a data de reset
        const activeSales = sales.filter(s => {
            return s.date >= lastResetDate && 
                   s.productId !== 'ACERTO' && 
                   s.category !== 'Financeiro';
        });

        // Agrupar totais por revendedora
        const rankingMap = {};
        activeSales.forEach(s => {
            rankingMap[s.resellerId] = (rankingMap[s.resellerId] || 0) + s.price;
        });

        // Converter para lista e ordenar (maior para menor)
        const rankingList = Object.keys(rankingMap).map(uid => ({
            uid,
            total: rankingMap[uid]
        })).sort((a, b) => b.total - a.total);

        // Encontrar posição da revendedora atual
        const myIndex = rankingList.findIndex(r => r.uid === currentUser.uid);
        const rankValueEl = document.getElementById('resellerRankingValue');
        const rankMsgEl = document.getElementById('resellerRankingMessage');

        // Atualizar label com a data do ciclo
        if (rankValueEl && rankValueEl.parentElement) {
            const labelEl = rankValueEl.parentElement.querySelector('.stat-label');
            if (labelEl) {
                if (lastResetDate > 0) {
                    labelEl.innerHTML = `Ranking <span style="font-size: 0.8em; font-weight: normal; opacity: 0.8;">(Desde ${formatDate(lastResetDate)})</span>`;
                } else {
                    labelEl.textContent = 'Ranking Geral';
                }
            }
        }

        // Adicionar link para ver histórico
        const hasHistory = historySnapshot.exists();
        let historyLink = document.getElementById('rankingHistoryLink');
        
        if (hasHistory && !historyLink && rankMsgEl && rankMsgEl.parentNode) {
            historyLink = document.createElement('div');
            historyLink.id = 'rankingHistoryLink';
            historyLink.innerHTML = `
                <button onclick="openResellerRankingHistoryModal()" style="background: none; border: none; color: #2c1810; text-decoration: underline; font-size: 0.85em; cursor: pointer; padding: 0; margin-top: 5px;">
                    📜 Ver Galeria de Vencedores
                </button>
            `;
            rankMsgEl.parentNode.appendChild(historyLink);
        }

        if (myIndex === -1) {
            rankValueEl.textContent = '-';
            rankMsgEl.textContent = 'Faça sua primeira venda para entrar no ranking!';
        } else {
            const myRank = myIndex + 1;
            rankValueEl.textContent = `${myRank}º Lugar`;

            if (myRank === 1) {
                rankMsgEl.textContent = 'Parabéns! Você lidera o ranking! 🥇';
                rankMsgEl.style.color = '#28a745';
            } else {
                const prevReseller = rankingList[myIndex - 1];
                const diff = prevReseller.total - rankingList[myIndex].total;
                rankMsgEl.textContent = `Faltam ${formatCurrency(diff)} para alcançar o ${myRank - 1}º lugar`;
                rankMsgEl.style.color = '#d4a574';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
    }
}

async function checkRankingNotification() {
    if (!currentUser) return;

    try {
        // 1. Buscar o último histórico de ranking encerrado
        const historySnap = await database.ref('rankingHistory').orderByKey().limitToLast(1).once('value');
        
        if (!historySnap.exists()) return;

        const historyId = Object.keys(historySnap.val())[0];
        const historyData = historySnap.val()[historyId];

        // 2. Verificar se a revendedora já viu este resultado
        const userSnap = await usersRef.child(currentUser.uid).child('lastSeenRankingId').once('value');
        const lastSeenId = userSnap.val();

        if (lastSeenId === historyId) return; // Já viu, não faz nada

        // 3. Encontrar a posição da revendedora neste histórico
        const winners = historyData.winners || [];
        const myIndex = winners.findIndex(w => w.uid === currentUser.uid);
        
        // Se ela não estava no ranking (ex: não vendeu nada), ainda assim avisamos do novo ciclo
        // mas com uma mensagem diferente.
        
        let title, message, icon, salesInfo;

        if (myIndex !== -1) {
            const position = myIndex + 1;
            const myData = winners[myIndex];
            
            if (position === 1) {
                icon = '🏆';
                title = 'Parabéns! Você foi a Campeã!';
                message = 'Você ficou em <strong>1º Lugar</strong> no último ciclo de vendas!';
            } else if (position <= 3) {
                icon = '🥈'; // ou bronze
                title = 'Parabéns! Top 3!';
                message = `Você ficou em <strong>${position}º Lugar</strong> no último ciclo!`;
            } else {
                icon = '👏';
                title = 'Ciclo Encerrado';
                message = `Você ficou em <strong>${position}º Lugar</strong> no ranking final.`;
            }
            salesInfo = `Total vendido: ${formatCurrency(myData.total)}`;
        } else {
            icon = '📅';
            title = 'Novo Ciclo Iniciado';
            message = 'O ranking anterior foi encerrado e um novo ciclo de vendas começou!';
            salesInfo = 'Prepare-se para alcançar o topo neste novo ciclo!';
        }

        // 4. Exibir Modal de Notificação
        const modalHtml = `
            <div id="rankingNotificationModal" class="modal-overlay active" style="z-index: 2000;">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div style="font-size: 4em; margin-bottom: 10px;">${icon}</div>
                    <h2 style="color: #2c1810; margin-bottom: 10px;">${title}</h2>
                    <p style="font-size: 1.1em; color: #555; margin-bottom: 5px;">${message}</p>
                    <p style="font-weight: bold; color: #d4a574; margin-bottom: 20px;">${salesInfo}</p>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; font-size: 0.9em; color: #666; margin-bottom: 20px;">
                        🏁 Um novo ranking já começou. Boas vendas!
                    </div>
                    <button class="btn-primary" onclick="closeRankingNotification('${historyId}')" style="width: 100%;">Começar Novo Ciclo</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        console.error('Erro ao verificar notificação de ranking:', error);
    }
}

async function closeRankingNotification(historyId) {
    // Remover modal
    const modal = document.getElementById('rankingNotificationModal');
    if (modal) modal.remove();

    // Marcar como visto no banco de dados
    if (currentUser && historyId) {
        await usersRef.child(currentUser.uid).update({ lastSeenRankingId: historyId });
    }
}

async function deleteRankingHistoryItem(historyId) {
    if (!confirm('Tem certeza que deseja excluir este registro histórico? Se este for o último fechamento, o ciclo atual será reaberto com as vendas deste período.')) return;
    
    showLoading();
    try {
        // 1. Verificar se é o último histórico para ajustar a data do ciclo atual
        const [itemSnapshot, lastSnapshot] = await Promise.all([
            database.ref('rankingHistory').child(historyId).once('value'),
            database.ref('rankingHistory').orderByKey().limitToLast(1).once('value')
        ]);

        const historyItem = itemSnapshot.val();
        const lastItemKey = lastSnapshot.exists() ? Object.keys(lastSnapshot.val())[0] : null;

        // Se o item que estamos excluindo é o mais recente, precisamos voltar a data de início do ciclo atual
        if (historyItem && lastItemKey === historyId) {
            if (historyItem.cycleStartDate) {
                await configRef.child('ranking').update({
                    lastResetDate: historyItem.cycleStartDate
                });
            }
        }

        // 2. Excluir o registro
        await database.ref('rankingHistory').child(historyId).remove();
        
        document.getElementById('rankingHistoryModal').classList.remove('active');
        hideLoading();
        showNotification('Registro excluído e ciclo atual ajustado!');
        
        // Atualizar dashboard para refletir a nova data de início
        if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        
        setTimeout(() => openResellerRankingHistoryModal(), 500); // Reabre atualizado
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao excluir registro', 'error');
    }
}

async function openResellerRankingHistoryModal() {
    showLoading();
    // Criar modal se não existir
    if (!document.getElementById('rankingHistoryModal')) {
        const modalHtml = `
            <div id="rankingHistoryModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Galeria de Vencedores 🏆</h3>
                        <button class="close-modal" onclick="document.getElementById('rankingHistoryModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body" id="rankingHistoryList" style="max-height: 400px; overflow-y: auto;">
                        <!-- Lista aqui -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const promises = [
            database.ref('rankingHistory').orderByChild('closedAt').limitToLast(20).once('value'),
            salesRef.once('value')
        ];

        const isAdmin = currentUser && currentUser.role === 'admin';

        if (isAdmin) {
            promises.push(usersRef.once('value'));
            promises.push(settlementsRef.once('value'));
        }

        const results = await Promise.all(promises);
        const historySnapshot = results[0];
        const salesSnapshot = results[1];
        const usersSnapshot = isAdmin ? results[2] : null;
        const settlementsSnapshot = isAdmin ? results[3] : null;

        const nameCache = {};
        if (usersSnapshot) {
            usersSnapshot.forEach(c => nameCache[c.key] = c.val().name);
        }
        // BUSCA DE OUTRO LUGAR: Pega nomes de revendedoras excluídas nos Acertos
        if (settlementsSnapshot) {
            settlementsSnapshot.forEach(c => {
                 const s = c.val();
                 if (s.resellerId && s.resellerName) nameCache[s.resellerId] = s.resellerName;
            });
        }

        const allSales = [];
        salesSnapshot.forEach(c => allSales.push(c.val()));

        const history = [];
        historySnapshot.forEach(child => {
            const val = child.val();
            history.push({ id: child.key, ...val });
            
            // Garante que temos os nomes mesmo se a revendedora foi excluída
            if (val.winners && Array.isArray(val.winners)) {
                val.winners.forEach(w => {
                    if (w.uid && w.name && w.name !== 'Desconhecido' && !nameCache[w.uid]) {
                        nameCache[w.uid] = w.name;
                    }
                });
            }
        });
        history.sort((a, b) => b.closedAt - a.closedAt); // Mais recentes primeiro

        const container = document.getElementById('rankingHistoryList');
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum histórico disponível ainda.</p></div>';
        } else {
            container.innerHTML = history.map(h => {
                const date = formatDate(h.closedAt);
                
                const cycleTotalHtml = h.totalSales ? 
                    `<div style="text-align: center; margin: 10px 0; padding: 8px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; font-weight: bold; border: 1px solid #c3e6cb;">
                        💰 Caixa Total do Ciclo: ${formatCurrency(h.totalSales)}
                    </div>` : '';
                let contentHtml = '';

                let displayWinners = [];

                // PRIORIDADE: Usar dados salvos no histórico (snapshot do fechamento)
                if (h.winners && Array.isArray(h.winners) && h.winners.length > 0) {
                    displayWinners = h.winners.map(w => ({
                        ...w,
                        name: nameCache[w.uid] || w.name // Atualiza nome se disponível, senão usa o salvo
                    }));
                } else {
                    // FALLBACK: Recalcular se não houver dados salvos (legado)
                    const startTs = h.cycleStartDate || 0;
                    const closedDate = new Date(h.closedAt);
                    const endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
                    
                    const cycleSales = allSales.filter(s => {
                        const sDate = Number(s.date);
                        return sDate >= startTs && sDate <= endTs && 
                               s.productId !== 'ACERTO' && s.category !== 'Financeiro';
                    });

                    const rankingMap = {};
                    cycleSales.forEach(s => {
                        rankingMap[s.resellerId] = (rankingMap[s.resellerId] || 0) + (Number(s.price) || 0);
                    });

                    displayWinners = Object.keys(rankingMap).map(uid => ({
                        uid,
                        name: nameCache[uid] || 'Desconhecido',
                        total: rankingMap[uid]
                    })).sort((a, b) => b.total - a.total);
                }

                const isAdmin = currentUser && currentUser.role === 'admin';

                if (currentUser && currentUser.role === 'admin') {
                    if (displayWinners.length === 0) {
                        contentHtml = '<div style="padding:10px; color:#666; font-style:italic;">Nenhuma venda encontrada neste período.</div>';
                    } else {
                        contentHtml = displayWinners.map((w, idx) => {
                        let position;
                        if (idx === 0) position = '🥇';
                        else if (idx === 1) position = '🥈';
                        else if (idx === 2) position = '🥉';
                        else position = `${idx + 1}º`;
                        
                        // O nome já foi corrigido no map acima
                        let displayName = w.name; 

                        return `<div style="display:flex; justify-content:space-between; font-size:0.9em; margin-bottom:4px; padding: 4px 0; border-bottom: 1px dashed #eee;">
                            <span><span style="display: inline-block; width: 30px;">${position}</span> <strong>${displayName}</strong></span>
                            <span style="color: #2c1810;">${formatCurrency(w.total)}</span>
                        </div>`;
                    }).join('');
                    }
                } else {
                    let myIndex = -1;
                    if (displayWinners.length > 0) {
                        myIndex = displayWinners.findIndex(w => w.uid === currentUser.uid);
                    }
                    
                    if (myIndex !== -1) {
                        const myData = displayWinners[myIndex];
                        const position = myIndex + 1;
                        let medal = '';
                        if (position === 1) medal = '🥇 ';
                        else if (position === 2) medal = '🥈 ';
                        else if (position === 3) medal = '🥉 ';
                        
                        contentHtml = `
                            <div style="text-align: center; padding: 15px; background: #fcfcfc; border-radius: 6px;">
                                <div style="font-size: 1.4em; font-weight: bold; color: #2c1810; margin-bottom: 5px;">
                                    ${medal}${position}º Lugar
                                </div>
                                <div style="color: #666; font-size: 0.95em;">
                                    Você vendeu: <strong>${formatCurrency(myData.total)}</strong>
                                </div>
                            </div>
                        `;
                    } else {
                        contentHtml = `
                            <div style="text-align: center; padding: 15px; color: #888; font-style: italic;">
                                Você não participou deste ciclo.
                            </div>
                        `;
                    }
                }

                return `
                    <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative;">
                        <div style="font-weight: bold; color: #d4a574; margin-bottom: 10px; padding-bottom: 5px; font-family: 'Cormorant Garamond', serif; font-size: 1.1em; display: flex; justify-content: space-between; align-items: center;">
                            <span>
                                Ciclo: ${h.cycleStartDate ? formatDate(h.cycleStartDate) : '?'} até ${date}
                            </span>
                            ${isAdmin ? `
                                <div>
                                    <button onclick="openEditRankingHistoryModal('${h.id}', ${h.cycleStartDate || 0}, ${h.closedAt})" style="border: none; background: none; cursor: pointer; font-size: 1.1em; margin-right: 5px;" title="Editar Datas">✏️</button>
                                    <button onclick="deleteRankingHistoryItem('${h.id}')" style="border: none; background: none; cursor: pointer; font-size: 1.1em; color: #dc3545;" title="Excluir Registro">🗑️</button>
                                </div>
                            ` : ''}
                        </div>
                        ${cycleTotalHtml}
                        <div>${contentHtml}</div>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('rankingHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

let currentEditingHistoryId = null;

function openEditRankingHistoryModal(historyId, startDateTs, endDateTs) {
    currentEditingHistoryId = historyId;
    
    if (!document.getElementById('editRankingHistoryModal')) {
        const modalHtml = `
            <div id="editRankingHistoryModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Editar Datas do Ciclo</h3>
                        <button class="close-modal" onclick="document.getElementById('editRankingHistoryModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Data de Início</label>
                            <input type="date" id="editHistoryStartDate" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data de Encerramento</label>
                            <input type="date" id="editHistoryEndDate" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="saveRankingHistoryEdit()" style="width: 100%;">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const startInput = document.getElementById('editHistoryStartDate');
    const endInput = document.getElementById('editHistoryEndDate');
    
    startInput.value = startDateTs ? new Date(startDateTs).toISOString().split('T')[0] : '';
    endInput.value = endDateTs ? new Date(endDateTs).toISOString().split('T')[0] : '';
    
    document.getElementById('editRankingHistoryModal').classList.add('active');
}

async function saveRankingHistoryEdit() {
    const startDateStr = document.getElementById('editHistoryStartDate').value;
    const endDateStr = document.getElementById('editHistoryEndDate').value;
    
    if (!startDateStr || !endDateStr) return;
    
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    
    const newStart = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();
    const newEnd = new Date(ey, em - 1, ed, 23, 59, 59).getTime(); // Fim do dia para o encerramento
    
    await database.ref('rankingHistory').child(currentEditingHistoryId).update({
        cycleStartDate: newStart,
        closedAt: newEnd
    });
    
    document.getElementById('editRankingHistoryModal').classList.remove('active');
    openResellerRankingHistoryModal(); // Recarregar lista
    showNotification('Datas do ciclo atualizadas!');
}

function renderSettlementButton() {
    const container = document.querySelector('#dashboardTab .dashboard-grid');
    if (!container) return;

    let btnContainer = document.getElementById('settlementBtnContainer');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'settlementBtnContainer';
        btnContainer.style.gridColumn = '1 / -1';
        btnContainer.style.marginTop = '10px';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.flexWrap = 'wrap';
        container.appendChild(btnContainer);
    } else if (btnContainer.parentElement !== container) {
        // Se o botão já existe mas está no lugar errado (ex: dashboard do admin), move para o correto
        container.appendChild(btnContainer);
    }

    // Assegurar que os botões estão atualizados com a nova opção
    btnContainer.innerHTML = `
        <button class="btn-primary" onclick="openSettlementModal()" style="flex: 1; background-color: #2c1810; padding: 15px; font-size: 1em; min-width: 150px;">
            📦 Solicitar Acerto
        </button>
        <button class="btn-secondary" onclick="openSettlementHistoryModal()" style="flex: 1; padding: 15px; font-size: 1em; min-width: 150px;">
            📜 Histórico
        </button>
        <button class="btn-secondary" onclick="openWhatsAppConfigModal()" style="flex: 1; padding: 15px; font-size: 1em; min-width: 150px; background-color: #25D366; color: white; border: none;">
            💬 Msg WhatsApp
        </button>
    `;
}

async function openSettlementModal() {
    showLoading();
    try {
        // Carregar dados para o relatório
        const [salesSnapshot, goalsSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            goalsRef.child(currentUser.uid).once('value'),
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach(child => {
            sales.push(child.val());
        });

        const goals = goalsSnapshot.val() || {};
        const allProducts = productsSnapshot.val() || {};
        
        // Filtrar vendas pendentes para cálculo financeiro (evita cobrar vendas já acertadas e exclui registros de acerto)
        const pendingSales = sales.filter(s => !s.isSettled && !isFinancialSale(s));

        // Calcular totais
        const totalSales = pendingSales.reduce((sum, sale) => sum + sale.price, 0);
        const totalCommission = calculateTotalCommission(totalSales, goals.commissionTiers || []);
        const totalDue = totalSales - totalCommission;
        
        const goalAmount = goals.goalAmount || 0;
        const goalProgress = goalAmount > 0 ? (totalCommission / goalAmount) * 100 : 0;

        // Calcular itens para devolução (Total recebido - Total vendido)
        let totalItemsReceived = 0;
        const processedProductIds = new Set();
        
        ordersSnapshot.forEach(child => {
            const order = child.val();
            if (order.status === 'active' && order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid] && !processedProductIds.has(pid)) {
                        totalItemsReceived += parseInt(allProducts[pid].quantity) || 1;
                        processedProductIds.add(pid);
                    }
                });
            }
        });

        const itemsSold = sales.length;
        const itemsToReturn = Math.max(0, totalItemsReceived - itemsSold);

        // Criar Modal de Relatório
        if (!document.getElementById('settlementModal')) {
            const modalHtml = `
                <div id="settlementModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Relatório de Acerto</h3>
                            <button class="close-modal" onclick="document.getElementById('settlementModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <p><strong>Total Vendido:</strong> ${formatCurrency(totalSales)}</p>
                                <p><strong>Sua Comissão:</strong> ${formatCurrency(totalCommission)}</p>
                                <hr style="margin: 10px 0; border-color: #ddd;">
                                <p style="font-size: 1.2em; color: #2c1810;"><strong>Valor a Pagar:</strong> ${formatCurrency(totalDue)}</p>
                            </div>
                            
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                                <h4 style="margin-top: 0; color: #856404;">📦 Devolução</h4>
                                <p>Itens Recebidos: ${totalItemsReceived}</p>
                                <p>Itens Vendidos: ${itemsSold}</p>
                                <p style="font-weight: bold; font-size: 1.1em; margin-top: 5px;">Itens a Devolver: ${itemsToReturn}</p>
                            </div>

                            <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Ao confirmar, este relatório será enviado ao administrador para conferência e finalização.</p>
                            
                            <button class="btn-primary" onclick="confirmSettlementRequest(${totalSales}, ${totalCommission}, ${itemsToReturn}, ${goalAmount}, ${goalProgress.toFixed(2)})" style="width: 100%;">Confirmar e Enviar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        document.getElementById('settlementModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório', 'error');
    }
}

let isSettlementProcessing = false;

async function confirmSettlementRequest(totalSold, totalCommission, returnedCount, goalAmount, goalProgress) {
    if (isSettlementProcessing) return;
    isSettlementProcessing = true;

    const confirmBtn = document.querySelector('#settlementModal .btn-primary');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processando...';
    }

    showLoading();
    try {
        // 1. Criar registro de acerto com histórico
        const settlementRef = await settlementsRef.push({
            resellerId: currentUser.uid,
            resellerName: currentUser.name,
            totalSold,
            totalCommission,
            returnedCount,
            goalAmount: parseFloat(goalAmount),
            goalAchievement: parseFloat(goalProgress),
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // 2. Marcar vendas atuais como "acertadas" (zerar vendas)
        const salesSnapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const updates = {};
        salesSnapshot.forEach(child => {
            const sale = child.val();
            if (!sale.isSettled && !isFinancialSale(sale)) {
                updates[`sales/${child.key}/isSettled`] = true;
                updates[`sales/${child.key}/settlementId`] = settlementRef.key;
            }
        });

        // 3. Zerar metas
        updates[`goals/${currentUser.uid}/goalAmount`] = 0;
        updates[`goals/${currentUser.uid}/settlementDate`] = '';

        await database.ref().update(updates);

        document.getElementById('settlementModal').classList.remove('active');
        hideLoading();
        showNotification('Solicitação de acerto enviada! Vendas e metas foram reiniciadas.');
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao enviar solicitação:', error);
        showNotification('Erro ao enviar solicitação', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar e Enviar';
        }
    } finally {
        isSettlementProcessing = false;
    }
}

async function openSettlementHistoryModal() {
    showLoading();
    try {
        const snapshot = await settlementsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        
        const settlements = [];
        snapshot.forEach(child => {
            const val = child.val();
            if (val.status === 'completed') {
                settlements.push({ id: child.key, ...val });
            }
        });

        // Ordenar por data (mais recente primeiro)
        settlements.sort((a, b) => (b.finalizedAt || b.createdAt) - (a.finalizedAt || a.createdAt));

        if (!document.getElementById('settlementHistoryModal')) {
             const modalHtml = `
                <div id="settlementHistoryModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Histórico de Acertos</h3>
                            <button class="close-modal" onclick="document.getElementById('settlementHistoryModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body" id="settlementHistoryList" style="max-height: 400px; overflow-y: auto;">
                            <!-- Lista será injetada aqui -->
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const container = document.getElementById('settlementHistoryList');
        if (settlements.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum acerto finalizado encontrado.</p></div>';
        } else {
            container.innerHTML = settlements.map(s => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <span style="font-weight: bold; color: #2c1810;">${formatDate(s.finalizedAt || s.createdAt)}</span>
                        <span style="color: #28a745; font-weight: bold; font-size: 0.9em;">✅ Finalizado</span>
                    </div>
                    <div style="font-size: 0.9em; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                        <div>Vendido: <strong style="color: #333;">${formatCurrency(s.totalSold)}</strong></div>
                        <div>Comissão: <strong style="color: #333;">${formatCurrency(s.totalCommission)}</strong></div>
                        <div>Meta: <strong style="color: #333;">${formatCurrency(s.goalAmount || 0)}</strong></div>
                        <div>Atingido: <strong style="color: ${s.goalAchievement >= 100 ? '#28a745' : '#333'};">${(s.goalAchievement || 0).toFixed(1)}%</strong></div>
                        <div style="grid-column: 1 / -1; margin-top: 5px; color: #dc3545;">Devolvidos: <strong>${s.returnedCount} itens</strong></div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('settlementHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar histórico:', error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

function calculateTotalCommission(totalSales, commissionTiers) {
    if (!commissionTiers || commissionTiers.length === 0) return 0;
    
    const sortedTiers = [...commissionTiers].sort((a, b) => a.min - b.min);
    
    let applicableTier = sortedTiers[0];
    
    // Lógica de Taxa Única (Flat Rate) baseada na faixa atingida
    // A comissão é baseada na faixa onde o valor TOTAL se encaixa
    for (const tier of sortedTiers) {
        if (totalSales >= tier.min) {
            applicableTier = tier;
        } else {
            break;
        }
    }
    
    return totalSales * (applicableTier.percentage / 100);
}

function calculateSalesForTargetCommission(targetCommission, commissionTiers) {
    if (!commissionTiers || commissionTiers.length === 0) return 0;
    if (targetCommission <= 0) return 0;

    const sortedTiers = [...commissionTiers].sort((a, b) => a.min - b.min);
    let minSalesNeeded = Infinity;

    for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        const tierMax = nextTier ? nextTier.min : Infinity;
        
        const rate = tier.percentage / 100;
        if (rate <= 0) {
             continue;
        }

        let salesNeeded = targetCommission / rate;

        // Se o valor necessário for menor que o mínimo da faixa, o mínimo da faixa é o gatilho
        if (salesNeeded < tier.min) {
            salesNeeded = tier.min;
        }

        // Se a venda necessária estiver dentro desta faixa (ou for a última faixa)
        if (salesNeeded < tierMax) {
            if (salesNeeded < minSalesNeeded) {
                minSalesNeeded = salesNeeded;
            }
        }
    }
    
    return minSalesNeeded === Infinity ? 0 : minSalesNeeded;
}

function loadRecentSales(sales) {
    const recentSales = sales.slice(-5).reverse();
    const container = document.getElementById('recentSalesList');
    
    if (recentSales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛍️</div>
                <p class="empty-text">Nenhuma venda realizada ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentSales.map(sale => `
        <div class="sale-item">
            <div class="sale-header">
                <span class="sale-product">${sale.productName}</span>
                <span class="sale-price">${formatCurrency(sale.price)}</span>
            </div>
            <div class="sale-details">
                Cliente: ${sale.clientName} | ${formatDate(sale.date)}
            </div>
        </div>
    `).join('');
}

// Continua no próximo arquivo devido ao tamanho...

// ============================================
// REVENDEDORA - VENDAS
// ============================================

let selectedProduct = null;
let shoppingCart = [];

async function loadProducts() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [ordersSnapshot, productsSnapshot, salesSnapshot] = await Promise.all([
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value'),
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        const orders = [];
        ordersSnapshot.forEach((child) => {
            const order = child.val();
            if (order.status === 'active') {
                orders.push(order);
            }
        });

        const allProducts = {};
        productsSnapshot.forEach((child) => {
            allProducts[child.key] = {
                id: child.key,
                ...child.val()
            };
        });

        const productSalesCount = {};
        let totalSoldItems = 0;
        let totalSoldValue = 0;

        salesSnapshot.forEach((child) => {
            const sale = child.val();
            const pid = sale.productId;
            productSalesCount[pid] = (productSalesCount[pid] || 0) + 1;
        });

        let products = [];
        orders.forEach(order => {
            if (order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid]) {
                        products.push(allProducts[pid]);
                    }
                });
            }
        });

        products = products.filter((p, index, self) => 
            index === self.findIndex(t => t.id === p.id)
        );

        const container = document.getElementById('productsList');
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p class="empty-text">Nenhum produto disponível para venda</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        // Calcular totais considerando quantidade
        let totalItems = 0;
        let totalValue = 0;
        
        products.forEach(p => {
            const qty = parseInt(p.quantity) || 1;
            totalItems += qty;
            totalValue += (Number(p.price) || 0) * qty;
            
            const soldCount = productSalesCount[p.id] || 0;
            const soldQty = Math.min(soldCount, qty); // Não contar mais que o existente
            totalSoldItems += soldQty;
            totalSoldValue += (Number(p.price) || 0) * soldQty;
        });

        const summaryHtml = `
            <div style="width: 100%; grid-column: 1 / -1; margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 500; color: #666;">Peças:</span>
                    <span style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${totalSoldItems}/${totalItems}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #dee2e6; padding-top: 8px; margin-bottom: 10px;">
                    <span style="font-weight: 500; color: #666;">Valor:</span>
                    <span style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${formatCurrency(totalSoldValue)} / ${formatCurrency(totalValue)}</span>
                </div>
                <button class="btn-secondary" onclick="openSimulatorModal()" style="width: 100%; padding: 8px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    🧮 Simular Comissão
                </button>
            </div>
        `;

        container.innerHTML = summaryHtml + products.map(product => {
            const soldCount = productSalesCount[product.id] || 0;
            const quantity = parseInt(product.quantity) || 1;
            const isSold = soldCount >= quantity;
            const remaining = Math.max(0, quantity - soldCount);
            const isInCart = shoppingCart.some(p => p.id === product.id);

            return `
                <div class="product-card ${isSold ? 'sold' : ''}" onclick="${isSold ? '' : `openSaleModal('${product.id}')`}" style="position: relative; ${isInCart ? 'border-color: #0d47a1; background-color: #f0f8ff;' : ''}">
                    ${isInCart ? '<div style="position: absolute; top: 10px; right: 10px; background: #0d47a1; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; font-weight: bold;">No Carrinho</div>' : ''}
                    <div class="product-name">${product.name}</div>
                    <div class="product-code">${product.code}${product.code2 ? ` / ${product.code2}` : ''}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <div class="product-quantity" style="font-size: 0.8em; color: ${isSold ? '#dc3545' : '#28a745'}; margin-top: 5px; font-weight: 500;">
                        ${isSold ? 'Esgotado' : `Disponível: ${remaining}/${quantity}`}
                    </div>
                </div>
            `;
        }).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
    }
}

function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function handleSaleClientChange() {
    const select = document.getElementById('saleClient');
    const input = document.getElementById('quickClientName');
    const phoneInput = document.getElementById('quickClientPhone');
    
    if (select.value === 'new') {
        input.style.display = 'block';
        if (phoneInput) phoneInput.style.display = 'block';
        input.focus();
    } else {
        input.style.display = 'none';
        if (phoneInput) phoneInput.style.display = 'none';
    }
}

async function openSaleModal(productId) {
    showLoading();

    try {
        const [productSnapshot, clientsSnapshot] = await Promise.all([
            productsRef.child(productId).once('value'),
            clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        selectedProduct = {
            id: productId,
            ...productSnapshot.val()
        };
        
        document.getElementById('saleProductInfo').innerHTML = `
            <div class="product-info">
                <h3>${selectedProduct.name}</h3>
                <p>Código: ${selectedProduct.code}${selectedProduct.code2 ? ` / ${selectedProduct.code2}` : ''}</p>
                <p class="product-price">${formatCurrency(selectedProduct.price)}</p>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <label style="font-weight:500; color:#666; font-size: 0.9em; margin-bottom: 5px; display: block;">Aplicar Desconto:</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select id="saleDiscountType" class="input-field" style="width: 80px; margin-bottom: 0; padding: 8px;" onchange="updateSaleFinalPrice()">
                            <option value="percentage">%</option>
                            <option value="fixed">R$</option>
                        </select>
                        <input type="number" id="saleDiscountInput" class="input-field" step="0.01" min="0" placeholder="0" oninput="updateSaleFinalPrice()" style="margin-bottom: 0; flex: 1;">
                    </div>
                    <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="saleFinalPriceDisplay">Total: ${formatCurrency(selectedProduct.price)}</div>
                </div>
            </div>
        `;

        // Injetar Container de Ações do Carrinho (Quantidade + Botão)
        let cartActionsDiv = document.getElementById('cartActionsDiv');
        if (!cartActionsDiv) {
            cartActionsDiv = document.createElement('div');
            cartActionsDiv.id = 'cartActionsDiv';
            cartActionsDiv.style.display = 'flex';
            cartActionsDiv.style.gap = '10px';
            cartActionsDiv.style.marginBottom = '15px';
            
            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.id = 'cartQuantityInput';
            qtyInput.className = 'input-field';
            qtyInput.value = '1';
            qtyInput.min = '1';
            qtyInput.style.width = '80px';
            qtyInput.style.marginBottom = '0';
            
            const addBtn = document.createElement('button');
            addBtn.id = 'btnAddToCart';
            addBtn.className = 'btn-secondary';
            addBtn.style.marginBottom = '0';
            addBtn.style.flex = '1';
            addBtn.style.background = '#e3f2fd';
            addBtn.style.color = '#0d47a1';
            addBtn.style.borderColor = '#0d47a1';
            
            cartActionsDiv.appendChild(qtyInput);
            cartActionsDiv.appendChild(addBtn);
            
            const select = document.getElementById('saleClient');
            select.parentNode.insertBefore(cartActionsDiv, select);
        }
        
        // Injetar campos de pagamento no modal de venda
        let paymentDiv = document.getElementById('salePaymentOptions');
        if (!paymentDiv) {
            paymentDiv = document.createElement('div');
            paymentDiv.id = 'salePaymentOptions';
            paymentDiv.style.marginTop = '15px';
            paymentDiv.innerHTML = getPaymentFormHtml('sale');
            document.getElementById('quickClientName').parentNode.insertBefore(paymentDiv, document.getElementById('quickClientName').nextSibling);
        }

        // Resetar e configurar
        const qtyInput = document.getElementById('cartQuantityInput');
        if (qtyInput) qtyInput.value = '1';

        const cartCount = shoppingCart.filter(p => p.id === selectedProduct.id).length;
        const addBtn = document.getElementById('btnAddToCart');
        addBtn.textContent = `🛒 Adicionar à Cesta ${cartCount > 0 ? `(${cartCount})` : ''}`;
        addBtn.onclick = () => {
            const qty = parseInt(document.getElementById('cartQuantityInput').value) || 1;
            addToCart(selectedProduct, qty);
        };
        
        const clients = [];
        clientsSnapshot.forEach((child) => {
            clients.push({
                id: child.key,
                ...child.val()
            });
        });

        const select = document.getElementById('saleClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            '<option value="new">+ Novo Cliente</option>' +
            clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
        // Injetar campo de telefone rápido se não existir
        let quickPhoneInput = document.getElementById('quickClientPhone');
        if (!quickPhoneInput) {
            quickPhoneInput = document.createElement('input');
            quickPhoneInput.type = 'tel';
            quickPhoneInput.id = 'quickClientPhone';
            quickPhoneInput.className = 'input-field';
            quickPhoneInput.placeholder = 'WhatsApp do Cliente (Opcional)';
            quickPhoneInput.style.display = 'none';
            quickPhoneInput.style.marginTop = '10px';
            
            const quickNameInput = document.getElementById('quickClientName');
            if (quickNameInput && quickNameInput.parentNode) {
                quickNameInput.parentNode.insertBefore(quickPhoneInput, quickNameInput.nextSibling);
            }
        }
        
        document.getElementById('saleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir modal de venda:', error);
    }
}

function updateSaleFinalPrice() {
    if (!selectedProduct) return;
    
    let discountInputVal = parseFloat(document.getElementById('saleDiscountInput').value) || 0;
    const discountType = document.getElementById('saleDiscountType').value;
    
    let discount = 0;
    if (discountType === 'percentage') {
        discount = selectedProduct.price * (discountInputVal / 100);
    } else {
        discount = discountInputVal;
    }

    let finalPrice = selectedProduct.price - discount;
    if (finalPrice < 0) finalPrice = 0;
    document.getElementById('saleFinalPriceDisplay').textContent = `Total: ${formatCurrency(finalPrice)}`;
    
    if (document.getElementById('saleHasInstallment') && document.getElementById('saleHasInstallment').checked) {
        generateGenericInstallmentInputs('sale');
    }
}

function closeSaleModal() {
    document.getElementById('saleModal').classList.remove('active');
    selectedProduct = null;
    document.getElementById('saleClient').value = '';
    document.getElementById('quickClientName').value = '';
    document.getElementById('quickClientName').style.display = 'none';
    if (document.getElementById('quickClientPhone')) {
        document.getElementById('quickClientPhone').value = '';
        document.getElementById('quickClientPhone').style.display = 'none';
    }
    // Resetar campos de pagamento
    if(document.getElementById('salePaymentMethod')) document.getElementById('salePaymentMethod').value = '';
    if(document.getElementById('saleDiscountInput')) document.getElementById('saleDiscountInput').value = '';
    if(document.getElementById('saleDiscountType')) document.getElementById('saleDiscountType').value = 'percentage';
}

async function confirmSale() {
    const select = document.getElementById('saleClient');
    let clientId = select.value;
    let clientName = '';
    
    if (!clientId) {
        showNotification('Por favor, selecione um cliente', 'error');
        return;
    }
    
    showLoading();

    try {
        let clientPhone = '';
        if (clientId === 'new') {
            const newName = document.getElementById('quickClientName').value.trim();
            const newPhone = document.getElementById('quickClientPhone') ? document.getElementById('quickClientPhone').value.trim() : '';
            if (!newName) {
                hideLoading();
                showNotification('Por favor, digite o nome do cliente', 'error');
                return;
            }

            const newClientId = generateId();
            await clientsRef.child(newClientId).set({
                resellerId: currentUser.uid,
                name: newName,
                phone: newPhone,
                email: '',
                notes: 'Cadastrado na venda rápida',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            clientId = newClientId;
            clientName = newName;
            clientPhone = newPhone;
        } else {
            const clientSnapshot = await clientsRef.child(clientId).once('value');
            const clientData = clientSnapshot.val();
            clientName = clientData.name;
            clientPhone = clientData.phone || '';
        }

        let discountInputVal = parseFloat(document.getElementById('saleDiscountInput')?.value) || 0;
        const discountType = document.getElementById('saleDiscountType')?.value || 'percentage';
        
        let discountVal = 0;
        if (discountType === 'percentage') {
            discountVal = selectedProduct.price * (discountInputVal / 100);
        } else {
            discountVal = discountInputVal;
        }

        let finalPrice = selectedProduct.price - discountVal;
        if (finalPrice < 0) finalPrice = 0;

        // Capturar dados de pagamento imediato
        const method = document.getElementById('salePaymentMethod').value;
        let paymentStatus = 'pending';
        let paymentData = null;

        if (method) {
            paymentStatus = 'paid'; // Simplificação: se selecionou método, considera pago (ou parcelado)
            const hasInstallment = document.getElementById('saleHasInstallment').checked;
            
            if (hasInstallment) {
                paymentStatus = 'installment';
            }

            paymentData = {
                method: method,
                installments: hasInstallment ? parseInt(document.getElementById('saleInstallmentCount').value) : null,
                installmentValue: null, // Será calculado se necessário ou null
                date: firebase.database.ServerValue.TIMESTAMP
            };

            if (hasInstallment) {
                const installmentsList = [];
                const inputs = document.querySelectorAll('.sale-installment-input');
                if (inputs.length > 0) {
                    inputs.forEach((input, index) => {
                        installmentsList.push({ 
                            number: index + 1, 
                            status: 'pending', 
                            paidAt: null,
                            value: parseFloat(input.value)
                        });
                    });
                    paymentData.installmentsList = installmentsList;
                    paymentData.installmentValue = installmentsList[0].value;
                }
            }
        }

        const saleId = generateId();
        await salesRef.child(saleId).set({
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productCode: selectedProduct.code,
            price: finalPrice,
            originalPrice: selectedProduct.price,
            discount: discountVal,
            clientId: clientId,
            clientName: clientName,
            resellerId: currentUser.uid,
            date: firebase.database.ServerValue.TIMESTAMP,
            paymentStatus: paymentStatus
        });

        // Se houve pagamento imediato, registrar
        if (paymentData) {
            const paymentId = generateId();
            await paymentsRef.child(paymentId).set({
                saleId: saleId,
                ...paymentData
            });
        }

        const savedProductName = selectedProduct.name;
        const savedFinalPrice = finalPrice;

        closeSaleModal();
        hideLoading();
        showNotification('Venda registrada com sucesso!');
        loadProducts();
        loadSoldProducts();
        updateDashboard();

        if (clientPhone) {
            setTimeout(() => {
                sendWhatsAppReceipt(clientName, clientPhone, `- ${savedProductName}: ${formatCurrency(savedFinalPrice)}`, savedFinalPrice);
            }, 500);
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao confirmar venda:', error);
        showNotification('Erro ao registrar venda', 'error');
    }
}

function updateCartFloatingButton() {
    let btn = document.getElementById('floatingCartBtn');
    const salesTab = document.getElementById('salesTab');
    
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'floatingCartBtn';
        btn.className = 'btn-primary';
        btn.style.position = 'fixed';
        btn.style.bottom = '80px';
        btn.style.right = '20px';
        btn.style.width = 'auto';
        btn.style.borderRadius = '30px';
        btn.style.padding = '12px 24px';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        btn.style.zIndex = '999';
        btn.style.display = 'none';
        btn.onclick = openCheckoutModal;
        document.body.appendChild(btn);
    }

    if (shoppingCart.length > 0 && salesTab.classList.contains('active')) {
        const total = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
        btn.innerHTML = `🛒 Cesta (${shoppingCart.length}) | ${formatCurrency(total)}`;
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

function addToCart(product, quantity = 1) {
    let discountInputVal = parseFloat(document.getElementById('saleDiscountInput')?.value) || 0;
    const discountType = document.getElementById('saleDiscountType')?.value || 'percentage';
    
    let discountVal = 0;
    if (discountType === 'percentage') {
        discountVal = product.price * (discountInputVal / 100);
    } else {
        discountVal = discountInputVal;
    }

    let finalPrice = product.price - discountVal;
    if (finalPrice < 0) finalPrice = 0;

    for (let i = 0; i < quantity; i++) {
        shoppingCart.push({
            ...product,
            appliedPrice: finalPrice,
            appliedDiscount: discountVal
        });
    }
    closeSaleModal();
    updateCartFloatingButton();
    loadProducts();
}

function removeFromCart(productId) {
    shoppingCart = shoppingCart.filter(p => p.id !== productId);
    showNotification('Produto removido da cesta.');
    closeSaleModal();
    updateCartFloatingButton();
    loadProducts();
}

function clearCart() {
    if (confirm('Tem certeza que deseja remover todos os itens da cesta?')) {
        shoppingCart = [];
        closeCheckoutModal();
        updateCartFloatingButton();
        loadProducts();
        showNotification('Cesta esvaziada!');
    }
}

async function openCheckoutModal() {
    if (shoppingCart.length === 0) return;

    if (!document.getElementById('checkoutModal')) {
        const modalHtml = `
            <div id="checkoutModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Finalizar Venda (Cesta)</h3>
                        <button class="close-modal" onclick="closeCheckoutModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">
                            <button onclick="clearCart()" style="color: #dc3545; background: none; border: none; font-size: 0.9em; cursor: pointer; text-decoration: underline;">🗑️ Esvaziar Cesta</button>
                        </div>
                        <div id="checkoutItemsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;"></div>
                        <div id="checkoutTotalContainer" style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="font-weight:500; color:#666; font-size: 0.9em; margin-bottom: 5px; display: block;">Desconto no Lote:</label>
                            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                <select id="checkoutDiscountType" class="input-field" style="width: 80px; margin-bottom: 0; padding: 8px;" onchange="updateCheckoutFinalPrice()">
                                    <option value="percentage">%</option>
                                    <option value="fixed">R$</option>
                                </select>
                                <input type="number" id="checkoutDiscountInput" class="input-field" step="0.01" min="0" placeholder="0" oninput="updateCheckoutFinalPrice()" style="margin-bottom: 0; flex: 1;">
                            </div>
                            <div style="text-align: right; font-weight: bold; font-size: 1.3em; color: #2c1810;" id="checkoutTotal"></div>
                        </div>
                        
                        <select id="checkoutClient" class="input-field" onchange="handleCheckoutClientChange()">
                            <option value="">Selecione o Cliente</option>
                        </select>
                        <input type="text" id="checkoutQuickClientName" placeholder="Nome do Novo Cliente" class="input-field" style="display: none;">
                        <input type="tel" id="checkoutQuickClientPhone" placeholder="WhatsApp do Cliente (Opcional)" class="input-field" style="display: none; margin-top: 10px;">
                        
                        <div id="checkoutPaymentOptions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            ${getPaymentFormHtml('checkout')}
                        </div>
                        
                        <button class="btn-primary" onclick="confirmBatchSale()" style="width: 100%;">Confirmar Venda</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const list = document.getElementById('checkoutItemsList');
    list.innerHTML = shoppingCart.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            <div>
                <div style="font-weight: 600;">${item.name}</div>
                <div style="font-size: 0.85em; color: #666;">${item.code}${item.code2 ? ` / ${item.code2}` : ''}</div>
                ${item.appliedDiscount ? `<div style="font-size: 0.75em; color: #28a745;">Desconto un.: ${formatCurrency(item.appliedDiscount)}</div>` : ''}
            </div>
            <div style="text-align: right;">
                <div>${formatCurrency(item.appliedPrice !== undefined ? item.appliedPrice : item.price)}</div>
                ${item.appliedDiscount ? `<div style="font-size: 0.75em; text-decoration: line-through; color: #888;">${formatCurrency(item.price)}</div>` : ''}
                <button onclick="removeFromCartAndRefresh('${item.id}')" style="color: #dc3545; background: none; border: none; font-size: 0.8em; cursor: pointer;">Remover</button>
            </div>
        </div>
    `).join('');

    const total = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
    document.getElementById('checkoutTotal').textContent = `Total: ${formatCurrency(total)}`;
    
    const discountInput = document.getElementById('checkoutDiscountInput');
    if (discountInput) discountInput.value = '';

    showLoading();
    try {
        const clientsSnapshot = await clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const select = document.getElementById('checkoutClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            '<option value="new">+ Novo Cliente</option>';
        
        clientsSnapshot.forEach(child => {
            const c = child.val();
            select.innerHTML += `<option value="${child.key}">${c.name}</option>`;
        });
        
        document.getElementById('checkoutModal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
    hideLoading();
}

function updateCheckoutFinalPrice() {
    const total = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
    
    let discountInputVal = parseFloat(document.getElementById('checkoutDiscountInput')?.value) || 0;
    const discountType = document.getElementById('checkoutDiscountType')?.value || 'percentage';
    
    let discount = 0;
    if (discountType === 'percentage') {
        discount = total * (discountInputVal / 100);
    } else {
        discount = discountInputVal;
    }

    let finalPrice = total - discount;
    if (finalPrice < 0) finalPrice = 0;
    document.getElementById('checkoutTotal').textContent = `Total: ${formatCurrency(finalPrice)}`;
    
    if (document.getElementById('checkoutHasInstallment') && document.getElementById('checkoutHasInstallment').checked) {
        generateGenericInstallmentInputs('checkout');
    }
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('checkoutClient').value = '';
    document.getElementById('checkoutQuickClientName').style.display = 'none';
    document.getElementById('checkoutQuickClientName').value = '';
    if (document.getElementById('checkoutQuickClientPhone')) {
        document.getElementById('checkoutQuickClientPhone').style.display = 'none';
        document.getElementById('checkoutQuickClientPhone').value = '';
    }
    if(document.getElementById('checkoutPaymentMethod')) document.getElementById('checkoutPaymentMethod').value = '';
    if(document.getElementById('checkoutDiscountInput')) document.getElementById('checkoutDiscountInput').value = '';
    if(document.getElementById('checkoutDiscountType')) document.getElementById('checkoutDiscountType').value = 'percentage';
}

function removeFromCartAndRefresh(productId) {
    shoppingCart = shoppingCart.filter(p => p.id !== productId);
    if (shoppingCart.length === 0) {
        closeCheckoutModal();
    } else {
        openCheckoutModal();
    }
    updateCartFloatingButton();
    loadProducts();
}

function handleCheckoutClientChange() {
    const select = document.getElementById('checkoutClient');
    const input = document.getElementById('checkoutQuickClientName');
    const phoneInput = document.getElementById('checkoutQuickClientPhone');
    
    if (select.value === 'new') {
        input.style.display = 'block';
        if (phoneInput) phoneInput.style.display = 'block';
    } else {
        input.style.display = 'none';
        if (phoneInput) phoneInput.style.display = 'none';
    }
}

async function confirmBatchSale() {
    const select = document.getElementById('checkoutClient');
    let clientId = select.value;
    let clientName = '';
    
    if (!clientId) {
        showNotification('Selecione um cliente', 'error');
        return;
    }

    showLoading();

    try {
        let clientPhone = '';
        if (clientId === 'new') {
            const newName = document.getElementById('checkoutQuickClientName').value.trim();
            const newPhone = document.getElementById('checkoutQuickClientPhone') ? document.getElementById('checkoutQuickClientPhone').value.trim() : '';
            if (!newName) {
                hideLoading();
                showNotification('Digite o nome do cliente', 'error');
                return;
            }
            const newClientId = generateId();
            await clientsRef.child(newClientId).set({
                resellerId: currentUser.uid,
                name: newName,
                phone: newPhone,
                email: '',
                notes: 'Cadastrado na venda (Cesta)',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            clientId = newClientId;
            clientName = newName;
            clientPhone = newPhone;
        } else {
            const clientSnapshot = await clientsRef.child(clientId).once('value');
            const clientData = clientSnapshot.val();
            clientName = clientData.name;
            clientPhone = clientData.phone || '';
        }

        // Capturar dados de pagamento (Grupo)
        const method = document.getElementById('checkoutPaymentMethod').value;
        let paymentStatus = 'pending';
        let paymentData = null;
        const groupId = generateId(); // ID único para agrupar estas vendas

        if (method) {
            paymentStatus = 'paid';
            const hasInstallment = document.getElementById('checkoutHasInstallment').checked;
            
            if (hasInstallment) {
                paymentStatus = 'installment';
            }

            paymentData = {
                method: method,
                installments: hasInstallment ? parseInt(document.getElementById('checkoutInstallmentCount').value) : null,
                installmentValue: null,
                date: firebase.database.ServerValue.TIMESTAMP
            };

            if (hasInstallment) {
                const installmentsList = [];
                const inputs = document.querySelectorAll('.checkout-installment-input');
                if (inputs.length > 0) {
                    inputs.forEach((input, index) => {
                        installmentsList.push({ 
                            number: index + 1, 
                            status: 'pending', 
                            paidAt: null,
                            value: parseFloat(input.value)
                        });
                    });
                    paymentData.installmentsList = installmentsList;
                    paymentData.installmentValue = installmentsList[0].value;
                }
            }
        }

        const subtotal = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
        let discountInputVal = parseFloat(document.getElementById('checkoutDiscountInput')?.value) || 0;
        const discountType = document.getElementById('checkoutDiscountType')?.value || 'percentage';

        let totalDiscount = 0;
        if (discountType === 'percentage') {
            totalDiscount = subtotal * (discountInputVal / 100);
        } else {
            totalDiscount = discountInputVal;
        }

        let discountRatio = 0;
        if (subtotal > 0 && totalDiscount > 0) {
            discountRatio = totalDiscount / subtotal;
        }

        let itemsText = '';
        let finalTotal = 0;

        const updates = {};
        shoppingCart.forEach(item => {
            const saleId = generateId();
            const itemPrice = item.appliedPrice !== undefined ? item.appliedPrice : item.price;
            let itemFinalPrice = itemPrice;
            
            if (discountRatio > 0) {
                itemFinalPrice = itemPrice - (itemPrice * discountRatio);
            }
            if (itemFinalPrice < 0) itemFinalPrice = 0;

            itemsText += `- ${item.name}: ${formatCurrency(itemFinalPrice)}\n`;
            finalTotal += itemFinalPrice;

            updates[`sales/${saleId}`] = {
                productId: item.id,
                productName: item.name,
                productCode: item.code,
                price: itemFinalPrice,
                originalPrice: item.price,
                clientId: clientId,
                clientName: clientName,
                resellerId: currentUser.uid,
                date: firebase.database.ServerValue.TIMESTAMP,
                paymentStatus: paymentStatus,
                groupId: groupId // Vincula ao grupo
            };
        });

        await database.ref().update(updates);

        // Se houve pagamento, registrar UM pagamento vinculado ao groupId
        if (paymentData) {
            const paymentId = generateId();
            await paymentsRef.child(paymentId).set({
                groupId: groupId, // Link pelo grupo
                ...paymentData
            });
        }

        shoppingCart = [];
        closeCheckoutModal();
        updateCartFloatingButton();
        loadProducts();
        loadSoldProducts();
        updateDashboard();
        hideLoading();
        showNotification('Venda realizada com sucesso!');

        if (clientPhone) {
            setTimeout(() => {
                sendWhatsAppReceipt(clientName, clientPhone, itemsText, finalTotal);
            }, 500);
        }

    } catch (error) {
        hideLoading();
        console.error('Erro na venda em lote:', error);
        showNotification('Erro ao registrar venda', 'error');
    }
}

async function loadSoldProducts() {
    if (!currentUser) return;

    try {
        const snapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const sales = [];
        
        snapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled && !isFinancialSale(sale)) {
                sales.push({
                    id: child.key,
                    ...sale
                });
            }
        });
        
        const container = document.getElementById('soldProductsList');
        
        if (sales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p class="empty-text">Nenhuma venda registrada</p>
                </div>
            `;
            return;
        }
        
        // Agrupar vendas por groupId ou id (se individual)
        const groups = {};
        sales.forEach(sale => {
            const key = sale.groupId || sale.id;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    isGroup: !!sale.groupId,
                    date: sale.date,
                    clientName: sale.clientName,
                    clientId: sale.clientId,
                    items: [],
                    totalPrice: 0,
                    totalDiscount: 0,
                    paymentStatus: sale.paymentStatus
                };
            }
            groups[key].items.push(sale);
            groups[key].totalPrice += sale.price;
            groups[key].totalDiscount += (Number(sale.discount) || 0);
            // Manter a data mais recente do grupo
            if (sale.date > groups[key].date) groups[key].date = sale.date;
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.date - a.date);

        container.innerHTML = sortedGroups.map(group => {
            const itemCount = group.items.length;
            const title = group.isGroup ? `Venda em Lote (${itemCount} itens)` : group.items[0].productName;
            
            return `
            <div class="sale-item" onclick="openSaleDetailsModal('${group.id}', ${group.isGroup})" style="cursor: pointer;">
                <div class="sale-header" style="align-items: flex-start;">
                    <span class="sale-product">${title}</span>
                    <div style="text-align: right;">
                        <span class="sale-price">${formatCurrency(group.totalPrice)}</span>
                        ${group.totalDiscount ? `<div style="font-size: 0.75em; color: #28a745; font-weight: normal; margin-top: 2px;">Desc: ${formatCurrency(group.totalDiscount)}</div>` : ''}
                    </div>
                </div>
                <div class="sale-details">
                    ${group.isGroup ? '<span style="background:#e3f2fd; color:#0d47a1; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:5px;">📦 Agrupado</span>' : ''}
                    Cliente: ${group.clientName} | ${formatDate(group.date)}
                </div>
                <span class="payment-status ${group.paymentStatus}">${
                    group.paymentStatus === 'paid' ? 'Pago' : 
                    group.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'
                }</span>
                <div style="text-align: right; margin-top: 8px; font-size: 0.85em; color: #666; border-top: 1px solid #eee; padding-top: 5px;">
                    Clique para gerenciar
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
}

// ============================================
// HISTÓRICO DE PRODUTOS (REVENDEDORA)
// ============================================

let currentProductHistory = [];

async function openProductHistoryModal() {
    showLoading();
    
    // Criar modal se não existir
    if (!document.getElementById('productHistoryModal')) {
        const modalHtml = `
            <div id="productHistoryModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Histórico de Produtos Vendidos</h3>
                        <button class="close-modal" onclick="document.getElementById('productHistoryModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 15px;">
                            <input type="text" id="historySearch" placeholder="Buscar por produto ou cliente..." class="input-field" oninput="filterProductHistory()">
                        </div>
                        <div id="productHistoryList" style="max-height: 400px; overflow-y: auto;"></div>
                        <div id="productHistoryTotal" style="margin-top: 15px; text-align: right; font-weight: bold; color: #2c1810; font-size: 1.1em;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const snapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const sales = [];
        
        snapshot.forEach(child => {
            const sale = child.val();
            // Ignorar registros de acerto financeiro, mostrar apenas produtos
            if (!isFinancialSale(sale)) {
                sales.push({ id: child.key, ...sale });
            }
        });

        // Ordenar: mais recentes primeiro
        sales.sort((a, b) => b.date - a.date);
        
        currentProductHistory = sales;
        renderProductHistory(sales);
        
        document.getElementById('productHistoryModal').classList.add('active');
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        showNotification("Erro ao carregar histórico", "error");
    } finally {
        hideLoading();
    }
}

function renderProductHistory(sales) {
    const container = document.getElementById('productHistoryList');
    const totalContainer = document.getElementById('productHistoryTotal');
    
    if (sales.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum produto encontrado.</p></div>';
        totalContainer.textContent = '';
        return;
    }

    const total = sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    totalContainer.textContent = `Total Histórico: ${formatCurrency(total)}`;

    container.innerHTML = sales.map(sale => {
        const isSettled = !!sale.isSettled;
        return `
            <div class="sale-item" style="background: ${isSettled ? '#fcfcfc' : '#fff'}; border-left: 4px solid ${isSettled ? '#28a745' : '#d4a574'};">
                <div class="sale-header" style="align-items: flex-start;">
                    <span class="sale-product">${sale.productName}</span>
                    <div style="text-align: right;">
                        <span class="sale-price">${formatCurrency(sale.price)}</span>
                        ${sale.discount ? `<div style="font-size: 0.75em; color: #28a745; font-weight: normal; margin-top: 2px;">Desc: ${formatCurrency(sale.discount)}</div>` : ''}
                    </div>
                </div>
                <div class="sale-details" style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        Cliente: ${sale.clientName} | ${formatDate(sale.date)} <br>
                        <span style="font-size: 0.85em; color: ${isSettled ? '#28a745' : '#d4a574'}; font-weight: 500;">
                            ${isSettled ? '✅ Já Acertado' : '⏳ Pendente de Acerto'}
                        </span>
                    </div>
                    <button onclick="resendReceipt('${sale.groupId || sale.id}', ${!!sale.groupId})" style="padding: 4px 8px; font-size: 0.8em; background-color: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Reenviar Comprovante">
                        <span style="font-size: 1.1em;">📱</span> Enviar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterProductHistory() {
    const term = document.getElementById('historySearch').value.toLowerCase();
    
    const filtered = currentProductHistory.filter(s => {
        const prodName = (s.productName || '').toLowerCase();
        const clientName = (s.clientName || '').toLowerCase();
        return prodName.includes(term) || clientName.includes(term);
    });
    
    renderProductHistory(filtered);
}

async function syncPaymentTotal(targetId, isGroup) {
    let newTotal = 0;
    let paymentsSnapshot;

    if (isGroup) {
        const groupSnapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
        groupSnapshot.forEach(child => newTotal += (Number(child.val().price) || 0));
        paymentsSnapshot = await paymentsRef.orderByChild('groupId').equalTo(targetId).once('value');
    } else {
        const saleSnapshot = await salesRef.child(targetId).once('value');
        if (!saleSnapshot.exists()) return;
        newTotal = Number(saleSnapshot.val().price) || 0;
        paymentsSnapshot = await paymentsRef.orderByChild('saleId').equalTo(targetId).once('value');
    }

    if (paymentsSnapshot.exists()) {
        let paymentId = null;
        let paymentData = null;
        paymentsSnapshot.forEach(child => {
            paymentId = child.key;
            paymentData = child.val();
        });

        if (paymentData && paymentData.installments) {
            let list = paymentData.installmentsList || Array.from({length: paymentData.installments}, (_, i) => ({
                number: i + 1, status: 'pending', paidAt: null, value: parseFloat(paymentData.installmentValue)
            }));

            const totalPaid = list.reduce((sum, inst) => inst.status === 'paid' ? sum + (Number(inst.value) || 0) : sum, 0);
            let remainingToPay = Math.max(0, newTotal - totalPaid);
            const pendingCount = list.filter(inst => inst.status === 'pending').length;

            if (pendingCount > 0) {
                const newBaseValue = Math.floor((remainingToPay / pendingCount) * 100) / 100;
                let remainder = Math.round((remainingToPay - (newBaseValue * pendingCount)) * 100) / 100;

                list.forEach(inst => {
                    if (inst.status === 'pending') {
                        let val = newBaseValue;
                        if (remainder > 0.001) { val = (val * 100 + 1) / 100; remainder = (remainder * 100 - 1) / 100; }
                        inst.value = val;
                    }
                });
                await paymentsRef.child(paymentId).update({ installmentsList: list, installmentValue: list.find(i => i.status === 'pending')?.value || 0 });
            }
        }
    }
}

async function openSaleDetailsModal(targetId, isGroup) {
    showLoading();
    
    // Injetar modal se não existir
    if (!document.getElementById('saleDetailsModal')) {
        const modalHtml = `
            <div id="saleDetailsModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Detalhes da Venda</h3>
                        <button class="close-modal" onclick="closeSaleDetailsModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="saleDetailsInfo" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;"></div>
                        <h4 style="margin-bottom: 10px;">Itens</h4>
                        <div id="saleDetailsList" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        let items = [];

        if (isGroup) {
            const snapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
            snapshot.forEach(c => items.push({ id: c.key, ...c.val() }));
        } else {
            const snapshot = await salesRef.child(targetId).once('value');
            if (snapshot.exists()) {
                items.push({ id: snapshot.key, ...snapshot.val() });
            }
        }

        if (items.length === 0) {
            hideLoading();
            closeSaleDetailsModal();
            loadSoldProducts(); // Atualizar lista principal se estiver vazia
            return;
        }

        const first = items[0];
        const total = items.reduce((sum, i) => sum + i.price, 0);

        document.getElementById('saleDetailsInfo').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <p><strong>Cliente:</strong> ${first.clientName}</p>
                    <p><strong>Data:</strong> ${formatDate(first.date)}</p>
                    <p><strong>Total:</strong> ${formatCurrency(total)}</p>
                    <p><strong>Status:</strong> ${first.paymentStatus === 'paid' ? 'Pago' : first.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; text-align: right;">
                    <button class="btn-secondary" onclick="resendReceipt('${targetId}', ${isGroup})" style="padding: 8px 12px; font-size: 0.85em; background-color: #25D366; color: white; border: none; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 5px; margin: 0;" title="Reenviar pelo WhatsApp">
                        <span style="font-size: 1.2em;">📱</span> Comprovante
                    </button>
                    ${isGroup ? `
                        <button class="btn-secondary" onclick="openGroupDiscountModal('${targetId}')" style="padding: 8px 12px; font-size: 0.85em; background-color: #ffc107; color: #333; border: none; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 5px; margin: 0;" title="Desconto no Lote">
                            💸 Desconto Lote
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        const listContainer = document.getElementById('saleDetailsList');
        listContainer.innerHTML = items.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div>
                    <div style="font-weight: 600;">${item.productName}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${formatCurrency(item.price)}
                        ${item.discount ? `<span style="color: #28a745; font-size: 0.85em; margin-left: 5px;">(Desc: ${formatCurrency(item.discount)})</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-secondary" onclick="openEditSaleModal('${item.id}')" style="padding: 4px 8px; font-size: 0.8em;">Editar</button>
                    <button class="btn-delete" onclick="handleDetailCancellation('${item.id}', '${targetId}', ${isGroup})" style="padding: 4px 8px; font-size: 0.8em; background-color: #dc3545; color: white; border: none; border-radius: 4px;">Cancelar Venda</button>
                </div>
            </div>
        `).join('');

        document.getElementById('saleDetailsModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir detalhes:', error);
        showNotification('Erro ao carregar detalhes', 'error');
    }
}

function closeSaleDetailsModal() {
    const modal = document.getElementById('saleDetailsModal');
    if (modal) modal.classList.remove('active');
}

async function resendReceipt(targetId, isGroup) {
    showLoading();
    try {
        let items = [];
        if (isGroup) {
            const snapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
            snapshot.forEach(c => items.push({ id: c.key, ...c.val() }));
        } else {
            const snapshot = await salesRef.child(targetId).once('value');
            if (snapshot.exists()) {
                items.push({ id: snapshot.key, ...snapshot.val() });
            }
        }

        if (items.length === 0) {
            hideLoading();
            showNotification('Venda não encontrada.', 'error');
            return;
        }

        const first = items[0];
        const total = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

        let clientPhone = '';
        if (first.clientId && first.clientId !== 'ADMIN') {
            const cSnap = await clientsRef.child(first.clientId).once('value');
            if (cSnap.exists()) {
                clientPhone = cSnap.val().phone || '';
            }
        }

        if (!clientPhone) {
            hideLoading();
            showNotification('Este cliente não possui telefone (WhatsApp) cadastrado.', 'error');
            return;
        }

        let itemsText = '';
        items.forEach(i => {
            itemsText += `- ${i.productName}: ${formatCurrency(i.price)}\n`;
        });

        hideLoading();
        sendWhatsAppReceipt(first.clientName, clientPhone, itemsText, total);
    } catch (error) {
        hideLoading();
        console.error('Erro ao reenviar comprovante:', error);
        showNotification('Erro ao reenviar comprovante', 'error');
    }
}

async function handleDetailCancellation(saleId, groupId, isGroup) {
    const success = await cancelSale(saleId);
    if (success) {
        // Recarregar o modal para mostrar os itens restantes
        openSaleDetailsModal(groupId, isGroup);
    }
}

async function cancelSale(saleId) {
    if (!confirm('Tem certeza que deseja cancelar esta venda? O produto voltará para o estoque.')) return false;

    showLoading();

    try {
        // 1. Buscar dados da venda antes de excluir para verificar grupo
        const saleSnapshot = await salesRef.child(saleId).once('value');
        const sale = saleSnapshot.val();

        if (!sale) {
            hideLoading();
            showNotification('Venda já foi removida ou não existe.', 'error');
            loadSoldProducts();
            return false;
        }

        // 2. Remover a venda
        await salesRef.child(saleId).remove();

        // 3. Gerenciar pagamentos
        if (sale.groupId) {
            // Se for parte de um grupo, verificar se ainda existem itens nesse grupo
            const groupSnapshot = await salesRef.orderByChild('groupId').equalTo(sale.groupId).once('value');
            
            // Se não existem mais itens, remover o pagamento do grupo
            if (!groupSnapshot.exists() || groupSnapshot.numChildren() === 0) {
                const paymentsSnapshot = await paymentsRef.orderByChild('groupId').equalTo(sale.groupId).once('value');
                const updates = {};
                paymentsSnapshot.forEach(child => updates[child.key] = null);
                if (Object.keys(updates).length > 0) await paymentsRef.update(updates);
            } else {
                // RECALCULAR PARCELAS AUTOMATICAMENTE
                const remainingSales = [];
                groupSnapshot.forEach(child => remainingSales.push(child.val()));
                const newTotal = remainingSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

                const paymentsSnapshot = await paymentsRef.orderByChild('groupId').equalTo(sale.groupId).once('value');
                if (paymentsSnapshot.exists()) {
                    let paymentId = null;
                    let paymentData = null;
                    paymentsSnapshot.forEach(child => {
                        paymentId = child.key;
                        paymentData = child.val();
                    });

                    if (paymentData && paymentData.installments) {
                        let list = paymentData.installmentsList;
                        // Gerar lista se não existir (legado)
                        if (!list) {
                            list = Array.from({length: paymentData.installments}, (_, i) => ({
                                number: i + 1, status: 'pending', paidAt: null, value: parseFloat(paymentData.installmentValue)
                            }));
                        }

                        // Calcular quanto já foi pago
                        const totalPaid = list.reduce((sum, inst) => inst.status === 'paid' ? sum + (Number(inst.value) || 0) : sum, 0);
                        
                        // Novo valor restante a ser distribuído nas parcelas pendentes
                        let remainingToPay = Math.max(0, newTotal - totalPaid);
                        
                        const pendingCount = list.filter(inst => inst.status === 'pending').length;

                        if (pendingCount > 0) {
                            const newBaseValue = Math.floor((remainingToPay / pendingCount) * 100) / 100;
                            let remainder = Math.round((remainingToPay - (newBaseValue * pendingCount)) * 100) / 100;

                            list.forEach(inst => {
                                if (inst.status === 'pending') {
                                    let val = newBaseValue;
                                    if (remainder > 0.001) {
                                        val = (val * 100 + 1) / 100;
                                        remainder = (remainder * 100 - 1) / 100;
                                    }
                                    inst.value = val;
                                }
                            });

                            await paymentsRef.child(paymentId).update({
                                installmentsList: list,
                                installmentValue: list.find(i => i.status === 'pending')?.value || 0
                            });
                        }
                    }
                }
            }
        } else {
            // Venda individual: remover pagamento associado
            const paymentsSnapshot = await paymentsRef.orderByChild('saleId').equalTo(saleId).once('value');
            const updates = {};
            paymentsSnapshot.forEach(child => {
                updates[child.key] = null;
            });
            if (Object.keys(updates).length > 0) {
                await paymentsRef.update(updates);
            }
        }

        hideLoading();
        showNotification('Venda cancelada com sucesso!');
        
        // Recarregar dados
        loadProducts();
        loadSoldProducts();
        updateDashboard();
        return true;
    } catch (error) {
        hideLoading();
        console.error('Erro ao cancelar venda:', error);
        showNotification('Erro ao cancelar venda', 'error');
        return false;
    }
}

let currentEditingSaleId = null;
let currentEditingSaleOriginalPrice = 0;
let currentEditingSaleIsGroup = false;
let currentEditingSaleGroupId = null;
let currentAdminEditingResellerId = null;

async function openEditSaleModal(saleId) {
    showLoading();
    currentEditingSaleId = saleId;

    const existingModal = document.getElementById('editSaleModal');
    if (existingModal && !document.getElementById('editSaleDiscountInput')) {
        existingModal.remove(); // Remove modal antigo para injetar o novo com suporte a desconto
    }

    if (!document.getElementById('editSaleModal')) {
        const modalHtml = `
            <div id="editSaleModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Editar Detalhes da Venda</h3>
                        <button class="close-modal" onclick="closeEditSaleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="editSaleInfo" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;"></div>

                        <div class="form-group">
                            <label>Cliente</label>
                            <select id="editSaleClient" class="input-field"></select>
                        </div>

                        <div class="form-group" style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                            <label style="font-weight:500; color:#666;">Aplicar/Alterar Desconto Unitário</label>
                            <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 5px;">
                                <select id="editSaleDiscountType" class="input-field" style="width: 80px; margin-bottom: 0; padding: 8px;" onchange="updateEditSaleFinalPrice()">
                                    <option value="fixed">R$</option>
                                    <option value="percentage">%</option>
                                </select>
                                <input type="number" id="editSaleDiscountInput" class="input-field" step="0.01" min="0" placeholder="0" oninput="updateEditSaleFinalPrice()" style="margin-bottom: 0; flex: 1;">
                            </div>
                            <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="editSaleFinalPriceDisplay">Total: R$ 0,00</div>
                        </div>

                        <button class="btn-primary" onclick="saveSaleEdit()" style="width: 100%; margin-top: 15px;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const [saleSnapshot, clientsSnapshot] = await Promise.all([
            salesRef.child(saleId).once('value'),
            clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value')
        ]);

        const sale = saleSnapshot.val();
        if(!sale) throw new Error('Venda não encontrada');

        currentEditingSaleOriginalPrice = sale.originalPrice || (sale.price + (sale.discount || 0));
        currentEditingSaleIsGroup = !!sale.groupId;
        currentEditingSaleGroupId = sale.groupId;

        const clients = [];
        clientsSnapshot.forEach(child => {
            clients.push({ id: child.key, ...child.val() });
        });

        document.getElementById('editSaleInfo').innerHTML = `
            <p><strong>Produto:</strong> ${sale.productName}</p>
            <p><strong>Valor Original:</strong> ${formatCurrency(currentEditingSaleOriginalPrice)}</p>
        `;

        const select = document.getElementById('editSaleClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            clients.map(c => `<option value="${c.id}" ${c.id === sale.clientId ? 'selected' : ''}>${c.name}</option>`).join('');

        document.getElementById('editSaleDiscountType').value = 'fixed';
        document.getElementById('editSaleDiscountInput').value = sale.discount || '';
        updateEditSaleFinalPrice();

        document.getElementById('editSaleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição:', error);
    }
}

function updateEditSaleFinalPrice() {
    let discountInputVal = parseFloat(document.getElementById('editSaleDiscountInput').value) || 0;
    const discountType = document.getElementById('editSaleDiscountType').value;
    
    let discount = 0;
    if (discountType === 'percentage') {
        discount = currentEditingSaleOriginalPrice * (discountInputVal / 100);
    } else {
        discount = discountInputVal;
    }

    let finalPrice = currentEditingSaleOriginalPrice - discount;
    if (finalPrice < 0) finalPrice = 0;
    document.getElementById('editSaleFinalPriceDisplay').textContent = `Total Atualizado: ${formatCurrency(finalPrice)}`;
}

function closeEditSaleModal() {
    document.getElementById('editSaleModal').classList.remove('active');
    currentEditingSaleId = null;
}

async function saveSaleEdit() {
    const select = document.getElementById('editSaleClient');
    const clientId = select.value;
    const clientName = select.options[select.selectedIndex].text;

    if (!clientId) {
        showNotification('Selecione um cliente', 'error');
        return;
    }

    let discountInputVal = parseFloat(document.getElementById('editSaleDiscountInput').value) || 0;
    const discountType = document.getElementById('editSaleDiscountType').value;
    
    let discountVal = 0;
    if (discountType === 'percentage') {
        discountVal = currentEditingSaleOriginalPrice * (discountInputVal / 100);
    } else {
        discountVal = discountInputVal;
    }

    let finalPrice = currentEditingSaleOriginalPrice - discountVal;
    if (finalPrice < 0) finalPrice = 0;

    showLoading();

    try {
        await salesRef.child(currentEditingSaleId).update({
            clientId: clientId,
            clientName: clientName,
            price: finalPrice,
            originalPrice: currentEditingSaleOriginalPrice,
            discount: discountVal
        });

        // Sincronizar reajustes de pagamento se necessário
        if (currentEditingSaleIsGroup) {
            await syncPaymentTotal(currentEditingSaleGroupId, true);
        } else {
            await syncPaymentTotal(currentEditingSaleId, false);
        }

        closeEditSaleModal();
        hideLoading();
        showNotification('Venda atualizada com sucesso!');
        
        if (currentUser && currentUser.role === 'admin') {
            if (currentAdminEditingResellerId) {
                viewResellerSales(currentAdminEditingResellerId);
            }
        } else {
            loadSoldProducts();
            if (document.getElementById('saleDetailsModal') && document.getElementById('saleDetailsModal').classList.contains('active')) {
                 openSaleDetailsModal(currentEditingSaleIsGroup ? currentEditingSaleGroupId : currentEditingSaleId, currentEditingSaleIsGroup);
            }
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar venda:', error);
        showNotification('Erro ao atualizar venda', 'error');
    }
}

let currentDiscountGroupId = null;
let currentDiscountGroupSubtotal = 0;

async function openGroupDiscountModal(groupId) {
    showLoading();
    currentDiscountGroupId = groupId;
    
    if (!document.getElementById('groupDiscountModal')) {
        const modalHtml = `
            <div id="groupDiscountModal" class="modal-overlay" style="z-index: 2005;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Desconto no Lote</h3>
                        <button class="close-modal" onclick="closeGroupDiscountModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">Este desconto será distribuído proporcionalmente entre todos os itens do lote.</p>
                        
                        <div id="groupDiscountSubtotalDisplay" style="margin-bottom: 10px; font-weight: 600;"></div>

                        <div class="form-group">
                            <label>Aplicar Desconto Global</label>
                            <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 5px;">
                                <select id="groupDiscountType" class="input-field" style="width: 80px; margin-bottom: 0; padding: 8px;" onchange="updateGroupDiscountPreview()">
                                    <option value="percentage">%</option>
                                    <option value="fixed">R$</option>
                                </select>
                                <input type="number" id="groupDiscountInput" class="input-field" step="0.01" min="0" placeholder="0" oninput="updateGroupDiscountPreview()" style="margin-bottom: 0; flex: 1;">
                            </div>
                            <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="groupDiscountFinalPriceDisplay">Total Lote: R$ 0,00</div>
                        </div>
                        <button class="btn-primary" onclick="saveGroupDiscount()" style="width: 100%; margin-top: 15px;">Aplicar Desconto</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const snapshot = await salesRef.orderByChild('groupId').equalTo(groupId).once('value');
        let subtotal = 0;
        let currentTotalDiscount = 0;
        
        snapshot.forEach(child => {
            const s = child.val();
            const itemOriginal = s.originalPrice || (s.price + (s.discount || 0));
            subtotal += itemOriginal;
            currentTotalDiscount += (s.discount || 0);
        });

        currentDiscountGroupSubtotal = subtotal;

        document.getElementById('groupDiscountSubtotalDisplay').textContent = `Subtotal (sem desconto): ${formatCurrency(subtotal)}`;
        
        document.getElementById('groupDiscountType').value = 'fixed';
        document.getElementById('groupDiscountInput').value = currentTotalDiscount > 0 ? currentTotalDiscount.toFixed(2) : '';
        updateGroupDiscountPreview();

        document.getElementById('groupDiscountModal').classList.add('active');
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error(e);
    }
}

function updateGroupDiscountPreview() {
    let discountInputVal = parseFloat(document.getElementById('groupDiscountInput').value) || 0;
    const discountType = document.getElementById('groupDiscountType').value;
    
    let totalDiscount = 0;
    if (discountType === 'percentage') {
        totalDiscount = currentDiscountGroupSubtotal * (discountInputVal / 100);
    } else {
        totalDiscount = discountInputVal;
    }

    let finalPrice = currentDiscountGroupSubtotal - totalDiscount;
    if (finalPrice < 0) finalPrice = 0;
    document.getElementById('groupDiscountFinalPriceDisplay').textContent = `Total Lote: ${formatCurrency(finalPrice)}`;
}

function closeGroupDiscountModal() {
    document.getElementById('groupDiscountModal').classList.remove('active');
}

async function saveGroupDiscount() {
    let discountInputVal = parseFloat(document.getElementById('groupDiscountInput').value) || 0;
    const discountType = document.getElementById('groupDiscountType').value;
    
    let totalDiscount = 0;
    if (discountType === 'percentage') {
        totalDiscount = currentDiscountGroupSubtotal * (discountInputVal / 100);
    } else {
        totalDiscount = discountInputVal;
    }

    let discountRatio = 0;
    if (currentDiscountGroupSubtotal > 0 && totalDiscount > 0) {
        discountRatio = totalDiscount / currentDiscountGroupSubtotal;
    }

    showLoading();
    try {
        const snapshot = await salesRef.orderByChild('groupId').equalTo(currentDiscountGroupId).once('value');
        const updates = {};
        
        snapshot.forEach(child => {
            const s = child.val();
            const itemOriginal = s.originalPrice || (s.price + (s.discount || 0));
            
            let itemFinalPrice = itemOriginal;
            let itemDiscount = 0;

            if (discountRatio > 0) {
                itemDiscount = itemOriginal * discountRatio;
                itemFinalPrice = itemOriginal - itemDiscount;
            }
            if (itemFinalPrice < 0) itemFinalPrice = 0;

            updates[`sales/${child.key}/price`] = itemFinalPrice;
            updates[`sales/${child.key}/originalPrice`] = itemOriginal;
            updates[`sales/${child.key}/discount`] = itemDiscount;
        });

        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }

        await syncPaymentTotal(currentDiscountGroupId, true);

        closeGroupDiscountModal();
        hideLoading();
        showNotification('Desconto no lote aplicado com sucesso!');
        
        openSaleDetailsModal(currentDiscountGroupId, true);
        loadSoldProducts();
    } catch (e) {
        hideLoading();
        console.error(e);
        showNotification('Erro ao aplicar desconto no lote', 'error');
    }
}

// Função auxiliar para gerar HTML do formulário de pagamento
function getPaymentFormHtml(prefix) {
    return `
        <label style="display:block; margin-bottom:5px; font-weight:500; color:#666;">Pagamento Imediato (Opcional):</label>
        <select id="${prefix}PaymentMethod" class="input-field" style="margin-bottom: 10px;">
            <option value="">Deixar Pendente (Pagar Depois)</option>
            <option value="money">Dinheiro</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="debit">Cartão de Débito</option>
            <option value="pix">PIX</option>
            <option value="transfer">Transferência</option>
        </select>
        
        <div class="installment-section">
            <label class="checkbox-label">
                <input type="checkbox" id="${prefix}HasInstallment" onchange="document.getElementById('${prefix}InstallmentFields').style.display = this.checked ? 'block' : 'none'">
                Pagamento Parcelado
            </label>
            <div id="${prefix}InstallmentFields" style="display: none;">
                <input type="number" id="${prefix}InstallmentCount" placeholder="Número de Parcelas" class="input-field" min="2" max="24" oninput="generateGenericInstallmentInputs('${prefix}')">
                <div id="${prefix}DynamicInstallmentsContainer" style="margin-top: 10px; max-height: 200px; overflow-y: auto; padding-right: 5px;"></div>
            </div>
        </div>
    `;
}

// ============================================
// REVENDEDORA - METAS
// ============================================

async function loadGoalsForm() {
    if (!currentUser) return;

    showLoading();

    try {
        const [goalsSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
            goalsRef.child(currentUser.uid).once('value'),
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value')
        ]);

        const goals = goalsSnapshot.val() || {};
        
        // Calcular valor total do estoque para estimativa
        const allProducts = productsSnapshot.val() || {};
        let totalStockValue = 0;
        const processedProductIds = new Set();

        ordersSnapshot.forEach(child => {
            const order = child.val();
            if (order.status === 'active' && order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid] && !processedProductIds.has(pid)) {
                        const qty = parseInt(allProducts[pid].quantity) || 1;
                        totalStockValue += (Number(allProducts[pid].price) || 0) * qty;
                        processedProductIds.add(pid);
                    }
                });
            }
        });

        const maxCommission = calculateTotalCommission(totalStockValue, goals.commissionTiers || []);
        
        const goalInput = document.getElementById('goalAmount');
        goalInput.value = goals.goalAmount || '';
        goalInput.dataset.maxCommission = maxCommission;

        document.getElementById('goalSettlementDate').value = goals.settlementDate || '';
        
        // Injetar dica de valor máximo
        let hint = document.getElementById('goalMaxHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'goalMaxHint';
            hint.style.fontSize = '0.9em';
            hint.style.color = '#666';
            hint.style.marginTop = '5px';
            hint.style.marginBottom = '15px';
            if (goalInput.parentNode) {
                goalInput.parentNode.insertBefore(hint, goalInput.nextSibling);
            }
        }
        hint.innerHTML = `💰 Potencial máximo de lucro com estoque atual: <span style="color: #2c1810; font-weight: bold;">${formatCurrency(maxCommission)}</span>`;

        // Carregar tiers em modo somente leitura (true)
        loadCommissionTiers(goals.commissionTiers || [], true);
        
        // Esconder botão de adicionar se existir (para revendedoras)
        const addBtn = document.querySelector('button[onclick="addCommissionTier()"]');
        if (addBtn) addBtn.style.display = 'none';

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar metas:', error);
    }
}

function loadCommissionTiers(tiers = [], readOnly = false) {
    const container = document.getElementById('commissionTiersList');
    
    if (tiers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="empty-text">Nenhuma margem cadastrada</p>
            </div>
        `;
        return;
    }
    
    const disabledAttr = readOnly ? 'disabled style="background-color: #f0f0f0; color: #666;"' : '';

    container.innerHTML = tiers.map((tier, index) => `
        <div class="commission-tier">
            <input type="number" value="${tier.min}" onchange="updateTier(${index}, 'min', this.value)" class="input-field" placeholder="De (R$)" ${disabledAttr}>
            <input type="number" value="${tier.max}" onchange="updateTier(${index}, 'max', this.value)" class="input-field" placeholder="Até (R$)" ${disabledAttr}>
            <input type="number" value="${tier.percentage}" onchange="updateTier(${index}, 'percentage', this.value)" class="input-field" placeholder="% Comissão" ${disabledAttr}>
            ${readOnly ? '' : `<button class="tier-remove" onclick="removeTier(${index})">×</button>`}
        </div>
    `).join('');
}

async function addCommissionTier() {
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        if (!goals.commissionTiers) {
            goals.commissionTiers = [];
        }

        goals.commissionTiers.push({
            min: 0,
            max: 1000,
            percentage: 30
        });
        
        await goalsRef.child(currentUser.uid).set(goals);
        
        loadCommissionTiers(goals.commissionTiers);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao adicionar margem:', error);
    }
}

async function updateTier(index, field, value) {
    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.commissionTiers[index][field] = parseFloat(value);
        await goalsRef.child(currentUser.uid).set(goals);
    } catch (error) {
        console.error('Erro ao atualizar margem:', error);
    }
}

async function removeTier(index) {
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.commissionTiers.splice(index, 1);
        await goalsRef.child(currentUser.uid).set(goals);
        
        loadCommissionTiers(goals.commissionTiers);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao remover margem:', error);
    }
}

async function saveGoals() {
    const goalAmount = parseFloat(document.getElementById('goalAmount').value);
    const settlementDate = document.getElementById('goalSettlementDate').value;
    
    if (!goalAmount || !settlementDate) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }

    // Validar se a meta é maior que o potencial máximo
    const maxCommission = parseFloat(document.getElementById('goalAmount').dataset.maxCommission || 0);
    if (maxCommission > 0 && goalAmount > maxCommission) {
        if (!confirm(`⚠️ ATENÇÃO: Sua meta (${formatCurrency(goalAmount)}) é maior que o lucro máximo possível com seu estoque atual (${formatCurrency(maxCommission)}).\n\nDeseja manter essa meta mesmo assim?`)) {
            return;
        }
    }
    
    showLoading();

    try {
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || { commissionTiers: [] };
        
        goals.goalAmount = goalAmount;
        goals.settlementDate = settlementDate;
        
        await goalsRef.child(currentUser.uid).set(goals);
        
        hideLoading();
        showNotification('Metas salvas com sucesso!');
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar metas:', error);
        showNotification('Erro ao salvar metas', 'error');
    }
}

// ============================================
// REVENDEDORA - PAGAMENTOS
// ============================================

let selectedSale = null;

async function loadPayments() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const [salesSnapshot, paymentsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            paymentsRef.once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach((child) => {
            const sale = child.val();
            if (!sale.isSettled && !isFinancialSale(sale)) {
                sales.push({
                    id: child.key,
                    ...sale
                });
            }
        });

        const payments = {};
        paymentsSnapshot.forEach((child) => {
            const p = child.val();
            // Mapear por saleId OU groupId
            const key = p.groupId || p.saleId;
            payments[key] = { id: child.key, ...p };
        });

        const container = document.getElementById('paymentsList');
        
        if (sales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💳</div>
                    <p class="empty-text">Nenhuma venda para gerenciar</p>
                </div>
            `;
            hideLoading();
            return;
        }

        // Agrupar vendas por groupId
        const groupedSales = [];
        const processedGroupIds = new Set();

        // Ordenar vendas por data (mais recente primeiro)
        sales.sort((a, b) => b.date - a.date);

        sales.forEach(sale => {
            if (sale.groupId) {
                if (!processedGroupIds.has(sale.groupId)) {
                    // Encontrar todas as vendas deste grupo
                    const groupItems = sales.filter(s => s.groupId === sale.groupId);
                    const totalPrice = groupItems.reduce((sum, s) => sum + s.price, 0);
                    
                    groupedSales.push({
                        ...sale, // Usa dados da primeira venda como base (data, cliente)
                        isGroup: true,
                        items: groupItems,
                        totalPrice: totalPrice,
                        displayId: sale.groupId // ID para buscar pagamento
                    });
                    processedGroupIds.add(sale.groupId);
                }
            } else {
                // Venda individual
                groupedSales.push({ ...sale, isGroup: false, totalPrice: sale.price, displayId: sale.id });
            }
        });
        
        container.innerHTML = groupedSales.map(item => {
            const payment = payments[item.displayId];
            let installmentsHtml = '';

            if (payment && payment.installments) {
                // Se não tiver a lista salva (legado), gera uma visualização padrão
                const list = payment.installmentsList || Array.from({length: payment.installments}, (_, i) => ({
                    number: i + 1, status: 'pending', paidAt: null, value: payment.installmentValue
                }));

                installmentsHtml = `<div class="installments-container" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                    <p style="font-size: 0.9em; font-weight: 600; margin-bottom: 5px; color: #555;">Controle de Parcelas:</p>
                    ${list.map((inst, idx) => {
                        const currentVal = inst.value !== undefined ? inst.value : payment.installmentValue;
                        return `
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 0.95em; background: ${inst.status === 'paid' ? '#f0fff4' : '#fff'}; padding: 12px; border-radius: 6px; border: 1px solid ${inst.status === 'paid' ? '#c3e6cb' : '#eee'}; min-height: 48px;">
                            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; width: 100%;">
                                <input type="checkbox" style="width: 24px; height: 24px; min-width: 24px; cursor: pointer;" ${inst.status === 'paid' ? 'checked' : ''} onchange="handleInstallmentCheck('${payment.id}', ${idx}, this, ${currentVal})">
                                <span style="${inst.status === 'paid' ? 'text-decoration: line-through; color: #888;' : ''}">${inst.number}ª Parc. - ${formatCurrency(currentVal)}</span>
                            </label>
                            ${inst.status === 'paid' && inst.paidAt ? `<span style="font-size: 0.8em; color: #28a745; margin-left: 5px; white-space: nowrap;">${formatDate(inst.paidAt)}</span>` : ''}
                        </div>
                    `}).join('')}
                </div>`;
            }
            
            // Renderizar conteúdo do item (único ou lista de grupo)
            let productContent = '';
            if (item.isGroup) {
                productContent = `
                    <div style="margin-bottom: 5px;"><strong>📦 Venda em Lote (${item.items.length} itens)</strong></div>
                    <ul style="font-size: 0.85em; color: #666; padding-left: 20px; margin-bottom: 5px;">
                        ${item.items.map(i => `<li>${i.productName} - ${formatCurrency(i.price)}</li>`).join('')}
                    </ul>
                `;
            } else {
                productContent = `<span class="sale-product">${item.productName}</span>`;
            }

            return `
                <div class="payment-item">
                    <div class="payment-header">
                        <div style="flex:1">${productContent}</div>
                        <span class="payment-amount" style="align-self: flex-start; margin-left: 10px;">${formatCurrency(item.totalPrice)}</span>
                    </div>
                    <div class="payment-details">
                        Cliente: ${item.clientName} | ${formatDate(item.date)}
                        ${payment && payment.method ? `<br>Pagamento: ${payment.method} ${payment.installments ? `(${payment.installments}x)` : ''} 
                        <button class="btn-delete" onclick="deletePayment('${payment.id}', '${item.displayId}', ${item.isGroup})" style="padding: 2px 8px; font-size: 10px; margin-left: 5px; background-color: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Excluir Pagamento</button>` : ''}
                    </div>
                    ${installmentsHtml}
                    <span class="payment-status ${item.paymentStatus}">${
                        item.paymentStatus === 'paid' ? 'Pago' : 
                        item.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'
                    }</span>
                    ${item.paymentStatus === 'pending' ? `
                        <div class="payment-actions">
                            <button class="btn-payment" onclick="openPaymentModal('${item.displayId}', ${item.isGroup})">Registrar Pagamento</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar pagamentos:', error);
    }
}

let currentInstallmentParams = null;

function handleInstallmentCheck(paymentId, index, checkbox, currentValue) {
    if (checkbox.checked) {
        checkbox.checked = false; // Espera a seleção da data
        currentInstallmentParams = { paymentId, index };
        
        // Abrir modal de data
        const modal = document.getElementById('installmentDateModal');
        document.getElementById('installmentDateInput').valueAsDate = new Date(); // Data de hoje como padrão
        document.getElementById('installmentAmountInput').value = currentValue; // Preencher com valor atual
        modal.classList.add('active');
    } else {
        // Desmarcar
        if (confirm('Deseja marcar esta parcela como pendente novamente?')) {
             updateInstallmentStatus(paymentId, index, null);
        } else {
            checkbox.checked = true; // Reverte se cancelar
        }
    }
}

async function confirmInstallmentDate() {
    const dateStr = document.getElementById('installmentDateInput').value;
    const amountStr = document.getElementById('installmentAmountInput').value;
    
    if (!dateStr || !amountStr) return;
    
    // Criar timestamp corrigindo fuso horário local
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const amount = parseFloat(amountStr);
    
    if (currentInstallmentParams) {
        await updateInstallmentStatus(currentInstallmentParams.paymentId, currentInstallmentParams.index, dateObj.getTime(), amount);
        document.getElementById('installmentDateModal').classList.remove('active');
        currentInstallmentParams = null;
    }
}

async function updateInstallmentStatus(paymentId, index, dateTimestamp, paidAmount) {
    showLoading();
    try {
        const snapshot = await paymentsRef.child(paymentId).once('value');
        const payment = snapshot.val();
        
        // Se não existir lista (pagamentos antigos), cria agora
        let list = payment.installmentsList || Array.from({length: payment.installments}, (_, i) => ({
            number: i + 1, status: 'pending', paidAt: null, value: payment.installmentValue
        }));
        
        // Garantir que todos tenham valor definido (para compatibilidade)
        list.forEach(item => {
            if (item.value === undefined) item.value = payment.installmentValue;
            item.value = parseFloat(item.value);
        });

        // 1. Atualizar o item alvo (marcar como pago ou pendente)
        if (dateTimestamp) {
            list[index].status = 'paid';
            list[index].paidAt = dateTimestamp;
            if (paidAmount !== undefined) {
                list[index].value = parseFloat(paidAmount);
            }
        } else {
            list[index].status = 'pending';
            list[index].paidAt = null;
            // O valor será redefinido no recálculo abaixo
        }

        // 2. Recalcular toda a cadeia de valores para corrigir distorções
        const baseValue = parseFloat(payment.installmentValue);
        let remainder = 0;
        const originalCount = payment.installments;

        for (let i = 0; i < list.length; i++) {
            // Se for uma parcela original, o valor base é o definido na venda. Se for extra, é 0.
            let currentBase = (i < originalCount) ? baseValue : 0;
            
            // O valor esperado é o base + o que sobrou das anteriores
            let expected = currentBase + remainder;
            
            if (list[i].status === 'paid') {
                // Se está paga, o valor é fixo (o que foi pago).
                // A diferença entre o esperado e o pago vai para o resto.
                remainder = expected - list[i].value;
            } else {
                // Se está pendente, ela absorve o resto.
                if (expected <= 0.01) {
                    // Se o valor esperado for 0 ou negativo, significa que já foi coberto por pagamentos anteriores.
                    list[i].value = 0;
                    list[i].status = 'paid'; // Marca como paga automaticamente
                    if (!list[i].paidAt) list[i].paidAt = Date.now();
                    remainder = expected; // O valor negativo continua para abater as próximas se houver
                } else {
                    list[i].value = expected;
                    list[i].status = 'pending'; // Garante status pendente se tiver valor a pagar
                    list[i].paidAt = null;
                    remainder = 0; // Dívida absorvida
                }
            }
        }

        // 3. Se sobrou dívida no final, criar nova parcela
        if (remainder > 0.01) {
            list.push({
                number: list.length + 1,
                status: 'pending',
                paidAt: null,
                value: remainder
            });
        }

        // 4. Limpar parcelas extras que ficaram zeradas/pagas automaticamente (limpeza)
        while (list.length > originalCount) {
            const last = list[list.length - 1];
            if (last.value <= 0.01 && last.status === 'paid') {
                list.pop();
            } else {
                break;
            }
        }
        
        await paymentsRef.child(paymentId).update({ installmentsList: list });
        
        // Verificar se todas as parcelas foram pagas e atualizar status da venda
        const allPaid = list.every(item => item.status === 'paid');
        await salesRef.child(payment.saleId).update({
            paymentStatus: allPaid ? 'paid' : 'installment'
        });

        hideLoading();
        loadPayments();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao atualizar parcela', 'error');
    }
}

async function deletePayment(paymentId, targetId, isGroup) {
    if (!confirm('Tem certeza que deseja excluir este pagamento? O status da venda voltará para pendente.')) return;
    
    showLoading();
    try {
        await paymentsRef.child(paymentId).remove();
        
        if (isGroup) {
            // Se for grupo, targetId é o groupId. Precisamos achar todas as vendas desse grupo
            const snapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
            const updates = {};
            snapshot.forEach(child => {
                updates[`sales/${child.key}/paymentStatus`] = 'pending';
            });
            if (Object.keys(updates).length > 0) {
                await database.ref().update(updates);
            }
        } else {
            // Venda única
            await salesRef.child(targetId).update({ paymentStatus: 'pending' });
        }
        
        hideLoading();
        showNotification('Pagamento excluído com sucesso!');
        loadPayments();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir pagamento:', error);
        showNotification('Erro ao excluir pagamento', 'error');
    }
}

let currentEditingPaymentId = null;
let currentEditingPaymentSaleId = null;
let currentEditingPaymentSalePrice = 0;

async function openEditPaymentModal(paymentId, saleId) {
    showLoading();
    currentEditingPaymentId = paymentId;
    currentEditingPaymentSaleId = saleId;

    try {
        const [paymentSnapshot, saleSnapshot] = await Promise.all([
            paymentsRef.child(paymentId).once('value'),
            salesRef.child(saleId).once('value')
        ]);
        const payment = paymentSnapshot.val();
        const sale = saleSnapshot.val();
        
        currentEditingPaymentSalePrice = sale.price;

        document.getElementById('editPaymentMethod').value = payment.method;
        
        const hasInstallment = !!payment.installments;
        document.getElementById('editHasInstallment').checked = hasInstallment;
        toggleEditInstallments();

        if (hasInstallment) {
            document.getElementById('editInstallmentCount').value = payment.installments;
            
            // Popular inputs dinâmicos com valores existentes
            const container = document.getElementById('editDynamicInstallmentsContainer');
            container.innerHTML = '';
            
            let list = payment.installmentsList;
            
            // Fallback para pagamentos antigos sem lista detalhada
            if (!list) {
                list = Array.from({length: payment.installments}, (_, i) => ({
                    number: i + 1,
                    value: payment.installmentValue
                }));
            }

            list.forEach(inst => {
                const div = document.createElement('div');
                div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
                div.innerHTML = `
                    <span style="font-size: 0.9em; min-width: 70px;">Parcela ${inst.number}:</span>
                    <input type="number" class="input-field edit-installment-input" step="0.01" value="${parseFloat(inst.value).toFixed(2)}" style="margin-bottom: 0;">
                `;
                container.appendChild(div);
            });

        } else {
            document.getElementById('editInstallmentCount').value = '';
            document.getElementById('editDynamicInstallmentsContainer').innerHTML = '';
        }

        document.getElementById('editPaymentModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de pagamento:', error);
    }
}

function closeEditPaymentModal() {
    document.getElementById('editPaymentModal').classList.remove('active');
    currentEditingPaymentId = null;
    currentEditingPaymentSaleId = null;
}

function toggleEditInstallments() {
    const hasInstallment = document.getElementById('editHasInstallment').checked;
    document.getElementById('editInstallmentFields').style.display = hasInstallment ? 'block' : 'none';
}

async function savePaymentEdit() {
    const method = document.getElementById('editPaymentMethod').value;
    const hasInstallment = document.getElementById('editHasInstallment').checked;
    let installments = null;
    let installmentValue = null;
    let installmentsList = null;

    if (hasInstallment) {
        installments = parseInt(document.getElementById('editInstallmentCount').value);
        
        const inputs = document.querySelectorAll('.edit-installment-input');
        installmentsList = [];
        inputs.forEach((input, index) => {
            installmentsList.push({
                number: index + 1,
                status: 'pending', // Mantém pendente ou precisaria carregar status anterior? Simplificação: mantém lógica de edição básica
                paidAt: null,
                value: parseFloat(input.value)
            });
        });
        
        // Preservar status de parcelas já pagas se possível (lógica avançada omitida para brevidade, assumindo redefinição ou edição simples)
        // Para manter simples: se editar parcelas, reseta status ou pega o valor da primeira como referência
        if (installmentsList.length > 0) {
            installmentValue = installmentsList[0].value;
        }
    }

    showLoading();

    try {
        const updates = {
            method,
            installments,
            installmentValue
        };
        
        if (installmentsList) {
            updates.installmentsList = installmentsList;
        }

        await paymentsRef.child(currentEditingPaymentId).update(updates);

        await salesRef.child(currentEditingPaymentSaleId).update({
            paymentStatus: hasInstallment ? 'installment' : 'paid'
        });

        closeEditPaymentModal();
        hideLoading();
        showNotification('Pagamento atualizado com sucesso!');
        
        if (currentUser && currentUser.role === 'admin') {
            if (currentAdminViewResellerId) {
                viewResellerSales(currentAdminViewResellerId);
            }
        } else {
            loadPayments();
            updateDashboard();
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar pagamento:', error);
        showNotification('Erro ao atualizar pagamento', 'error');
    }
}

function filterPayments() {
    const filter = document.getElementById('paymentFilter').value;
    const items = document.querySelectorAll('.payment-item');
    
    items.forEach(item => {
        const status = item.querySelector('.payment-status').classList;
        
        if (filter === 'all') {
            item.style.display = 'block';
        } else {
            item.style.display = status.contains(filter) ? 'block' : 'none';
        }
    });
}

async function openPaymentModal(targetId, isGroup) {
    showLoading();

    try {
        let infoHtml = '';
        let totalPrice = 0;

        if (isGroup) {
            const snapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
            const items = [];
            snapshot.forEach(c => {
                items.push(c.val());
            });
            
            totalPrice = items.reduce((sum, i) => sum + i.price, 0);
            const firstItem = items[0];
            
            selectedSale = { id: targetId, isGroup: true, price: totalPrice, clientName: firstItem.clientName }; // Objeto temporário para o modal
            
            infoHtml = `
                <div class="product-info">
                    <h3>Venda em Lote (${items.length} itens)</h3>
                    <p>Cliente: ${firstItem.clientName}</p>
                    <p class="product-price">${formatCurrency(totalPrice)}</p>
                </div>`;
        } else {
            const snapshot = await salesRef.child(targetId).once('value');
            const sale = snapshot.val();
            selectedSale = { id: targetId, isGroup: false, ...sale };
            
            infoHtml = `
                <div class="product-info">
                    <h3>${sale.productName}</h3>
                    <p>Cliente: ${sale.clientName}</p>
                    <p class="product-price">${formatCurrency(sale.price)}</p>
                </div>`;
        }
        
        document.getElementById('paymentSaleInfo').innerHTML = infoHtml;
        
        document.getElementById('paymentModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir modal de pagamento:', error);
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    selectedSale = null;
    document.getElementById('paymentMethod').value = '';
    document.getElementById('hasInstallment').checked = false;
    document.getElementById('installmentFields').style.display = 'none';
    document.getElementById('installmentCount').value = '';
    document.getElementById('dynamicInstallmentsContainer').innerHTML = '';
}

function toggleInstallments() {
    const hasInstallment = document.getElementById('hasInstallment').checked;
    document.getElementById('installmentFields').style.display = hasInstallment ? 'block' : 'none';
}

function generateInstallmentInputs() {
    const count = parseInt(document.getElementById('installmentCount').value);
    const container = document.getElementById('dynamicInstallmentsContainer');
    container.innerHTML = '';

    if (!count || count < 2 || !selectedSale) return;

    const total = selectedSale.price;
    // Calcular valor base e resto para distribuição
    const baseValue = Math.floor((total / count) * 100) / 100;
    let remainder = Math.round((total - (baseValue * count)) * 100) / 100;

    for (let i = 1; i <= count; i++) {
        let val = baseValue;
        // Distribui os centavos restantes nas primeiras parcelas
        if (remainder > 0.001) {
            val = (val * 100 + 1) / 100;
            remainder = (remainder * 100 - 1) / 100;
        }
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
        div.innerHTML = `
            <span style="font-size: 0.9em; min-width: 70px;">Parcela ${i}:</span>
            <input type="number" class="input-field installment-input" step="0.01" value="${val.toFixed(2)}" style="margin-bottom: 0;">
        `;
        container.appendChild(div);
    }
}

function generateGenericInstallmentInputs(prefix) {
    const countInput = document.getElementById(`${prefix}InstallmentCount`);
    const container = document.getElementById(`${prefix}DynamicInstallmentsContainer`);
    
    if (!countInput || !container) return;
    
    const count = parseInt(countInput.value);
    container.innerHTML = '';

    if (!count || count < 2) return;

    let total = 0;
    if (prefix === 'sale') {
        let discountInputVal = parseFloat(document.getElementById('saleDiscountInput')?.value) || 0;
        const discountType = document.getElementById('saleDiscountType')?.value || 'percentage';
        let discountVal = 0;
        if (selectedProduct) {
            if (discountType === 'percentage') {
                discountVal = selectedProduct.price * (discountInputVal / 100);
            } else {
                discountVal = discountInputVal;
            }
            total = selectedProduct.price - discountVal;
        }
    } else if (prefix === 'checkout') {
        const subtotal = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
        let discountInputVal = parseFloat(document.getElementById('checkoutDiscountInput')?.value) || 0;
        const discountType = document.getElementById('checkoutDiscountType')?.value || 'percentage';
        let discountVal = 0;
        if (discountType === 'percentage') {
            discountVal = subtotal * (discountInputVal / 100);
        } else {
            discountVal = discountInputVal;
        }
        total = subtotal - discountVal;
    } else {
        return;
    }
    if (total < 0) total = 0;

    const baseValue = Math.floor((total / count) * 100) / 100;
    let remainder = Math.round((total - (baseValue * count)) * 100) / 100;

    for (let i = 1; i <= count; i++) {
        let val = baseValue;
        if (remainder > 0.001) {
            val = (val * 100 + 1) / 100;
            remainder = (remainder * 100 - 1) / 100;
        }
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
        div.innerHTML = `
            <span style="font-size: 0.9em; min-width: 70px;">Parcela ${i}:</span>
            <input type="number" class="input-field ${prefix}-installment-input" step="0.01" value="${val.toFixed(2)}" style="margin-bottom: 0;">
        `;
        container.appendChild(div);
    }
}

function generateEditInstallmentInputs() {
    const count = parseInt(document.getElementById('editInstallmentCount').value);
    const container = document.getElementById('editDynamicInstallmentsContainer');
    container.innerHTML = '';

    if (!count || count < 2) return;

    const total = currentEditingPaymentSalePrice;
    const baseValue = Math.floor((total / count) * 100) / 100;
    let remainder = Math.round((total - (baseValue * count)) * 100) / 100;

    for (let i = 1; i <= count; i++) {
        let val = baseValue;
        if (remainder > 0.001) {
            val = (val * 100 + 1) / 100;
            remainder = (remainder * 100 - 1) / 100;
        }
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 10px; margin-bottom: 5px; align-items: center;";
        div.innerHTML = `
            <span style="font-size: 0.9em; min-width: 70px;">Parcela ${i}:</span>
            <input type="number" class="input-field edit-installment-input" step="0.01" value="${val.toFixed(2)}" style="margin-bottom: 0;">
        `;
        container.appendChild(div);
    }
}

async function confirmPayment() {
    const method = document.getElementById('paymentMethod').value;
    
    if (!method) {
        showNotification('Por favor, selecione a forma de pagamento', 'error');
        return;
    }
    
    const hasInstallment = document.getElementById('hasInstallment').checked;
    let installments = null;
    let installmentValue = null;
    
    if (hasInstallment) {
        installments = parseInt(document.getElementById('installmentCount').value);
        
        const inputs = document.querySelectorAll('.installment-input');
        if (inputs.length === 0) {
            showNotification('Por favor, defina o número de parcelas', 'error');
            return;
        }

        // Pegar o valor da primeira parcela como referência (para compatibilidade)
        installmentValue = parseFloat(inputs[0].value);
        
        if (!installments) {
            showNotification('Por favor, preencha os dados do parcelamento', 'error');
            return;
        }
    }
    
    showLoading();

    try {
        const paymentId = generateId();
        const paymentData = {
            saleId: selectedSale.isGroup ? null : selectedSale.id,
            groupId: selectedSale.isGroup ? selectedSale.id : null, // Se for grupo, o ID armazenado em selectedSale.id é o groupId
            method: method,
            installments: installments,
            installmentValue: installmentValue,
            date: firebase.database.ServerValue.TIMESTAMP
        };

        // Criar lista de parcelas se for parcelado
        if (hasInstallment) {
            const installmentsList = [];
            const inputs = document.querySelectorAll('.installment-input');
            inputs.forEach((input, index) => {
                installmentsList.push({ 
                    number: index + 1, 
                    status: 'pending', 
                    paidAt: null,
                    value: parseFloat(input.value)
                });
            });
            paymentData.installmentsList = installmentsList;
        }

        await paymentsRef.child(paymentId).set(paymentData);

        const newStatus = hasInstallment ? 'installment' : 'paid';

        if (selectedSale.isGroup) {
            const snapshot = await salesRef.orderByChild('groupId').equalTo(selectedSale.id).once('value');
            const updates = {};
            snapshot.forEach(child => {
                updates[`sales/${child.key}/paymentStatus`] = newStatus;
            });
            if (Object.keys(updates).length > 0) {
                await database.ref().update(updates);
            }
        } else {
            await salesRef.child(selectedSale.id).update({ paymentStatus: newStatus });
        }

        closePaymentModal();
        hideLoading();
        showNotification('Pagamento registrado com sucesso!');
        loadPayments();
        updateDashboard();
    } catch (error) {
        hideLoading();
        console.error('Erro ao registrar pagamento:', error);
        showNotification('Erro ao registrar pagamento', 'error');
    }
}

// ============================================
// REVENDEDORA - CLIENTES
// ============================================

function showAddClientModal() {
    document.getElementById('clientModal').classList.add('active');
}

function closeClientModal() {
    document.getElementById('clientModal').classList.remove('active');
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientNotes').value = '';
}

async function saveClient() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const notes = document.getElementById('clientNotes').value.trim();
    
    if (!name || !phone) {
        showNotification('Por favor, preencha nome e telefone', 'error');
        return;
    }
    
    showLoading();

    try {
        const clientId = generateId();
        await clientsRef.child(clientId).set({
            resellerId: currentUser.uid,
            name,
            phone,
            email,
            notes,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        closeClientModal();
        hideLoading();
        showNotification('Cliente cadastrado com sucesso!');
        loadClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar cliente:', error);
        showNotification('Erro ao cadastrar cliente', 'error');
    }
}

async function loadClients() {
    if (!currentUser) return;
    
    showLoading();

    try {
        const snapshot = await clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const clients = [];
        
        snapshot.forEach((child) => {
            clients.push({
                id: child.key,
                ...child.val()
            });
        });

        const container = document.getElementById('clientsList');
        
        if (clients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p class="empty-text">Nenhum cliente cadastrado</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        container.innerHTML = clients.map(client => `
            <div class="client-item">
                <div class="client-header">
                    <span class="client-name">${client.name}</span>
                </div>
                <div class="client-details">
                    ${client.phone ? `📱 ${client.phone}` : '<span style="color: #666; font-style: italic;">📱 Telefone não informado</span>'}
                    ${client.email ? `<br>📧 ${client.email}` : ''}
                    ${client.notes ? `<br>📝 ${client.notes}` : ''}
                </div>
                <div class="client-actions" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="viewClientHistory('${client.id}')" style="padding: 5px 15px; font-size: 14px; background-color: #4a90e2; color: white; border: none;">Histórico</button>
                    <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="padding: 5px 15px; font-size: 14px;">Editar</button>
                    <button class="btn-delete" onclick="deleteClient('${client.id}')" style="padding: 5px 15px; font-size: 14px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                </div>
            </div>
        `).join('');

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar clientes:', error);
    }
}

function searchClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    const items = document.querySelectorAll('.client-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

async function deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    showLoading();

    try {
        await clientsRef.child(clientId).remove();
        hideLoading();
        showNotification('Cliente excluído com sucesso!');
        loadClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir cliente:', error);
        showNotification('Erro ao excluir cliente', 'error');
    }
}

let currentEditingClientId = null;

async function openEditClientModal(clientId) {
    showLoading();
    currentEditingClientId = clientId;

    try {
        const snapshot = await clientsRef.child(clientId).once('value');
        const client = snapshot.val();

        document.getElementById('editClientName').value = client.name || '';
        document.getElementById('editClientPhone').value = client.phone || '';
        document.getElementById('editClientEmail').value = client.email || '';
        document.getElementById('editClientNotes').value = client.notes || '';

        document.getElementById('editClientModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição de cliente:', error);
        showNotification('Erro ao carregar dados do cliente', 'error');
    }
}

function closeEditClientModal() {
    document.getElementById('editClientModal').classList.remove('active');
    currentEditingClientId = null;
}

async function saveClientEdit() {
    const name = document.getElementById('editClientName').value.trim();
    const phone = document.getElementById('editClientPhone').value.trim();
    const email = document.getElementById('editClientEmail').value.trim();
    const notes = document.getElementById('editClientNotes').value.trim();

    if (!name || !phone) {
        showNotification('Por favor, preencha nome e telefone', 'error');
        return;
    }

    showLoading();

    try {
        await clientsRef.child(currentEditingClientId).update({
            name,
            phone,
            email,
            notes
        });

        closeEditClientModal();
        hideLoading();
        showNotification('Cliente atualizado com sucesso!');
        
        if (currentUser && currentUser.role === 'admin') {
            loadAdminClients();
        } else {
            loadClients();
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar cliente:', error);
        showNotification('Erro ao atualizar cliente', 'error');
    }
}

async function viewClientHistory(clientId) {
    showLoading();
    try {
        const clientSnapshot = await clientsRef.child(clientId).once('value');
        const client = clientSnapshot.val();
        
        document.getElementById('historyClientName').textContent = `Histórico: ${client.name}`;

        // Busca todas as vendas da revendedora e filtra pelo cliente
        const salesSnapshot = await salesRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const clientSales = [];
        
        salesSnapshot.forEach(child => {
            const sale = child.val();
            if (sale.clientId === clientId) {
                clientSales.push(sale);
            }
        });

        const container = document.getElementById('clientHistoryList');
        
        if (clientSales.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma compra realizada por este cliente.</p>';
        } else {
            container.innerHTML = clientSales.reverse().map(sale => `
                <div class="sale-item" style="background: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #eee;">
                    <div class="sale-header" style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${sale.productName}</span>
                        <span>${formatCurrency(sale.price)}</span>
                    </div>
                    <div class="sale-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        Data: ${formatDate(sale.date)} <br>
                        Status: ${sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'installment' ? 'Parcelado' : 'Pendente'}
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('clientHistoryModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar histórico:', error);
        showNotification('Erro ao carregar histórico', 'error');
    }
}

function closeClientHistoryModal() {
    document.getElementById('clientHistoryModal').classList.remove('active');
}

// ============================================
// SCANNER DE CÓDIGO DE BARRAS
// ============================================

let codeReader = null;

function showBarcodeScanner() {
    document.getElementById('barcodeScannerModal').classList.add('active');
    startScanner();
}

function closeBarcodeScanner() {
    document.getElementById('barcodeScannerModal').classList.remove('active');
    stopScanner();
}

async function startScanner() {
    codeReader = new ZXing.BrowserMultiFormatReader();
    const video = document.getElementById('scannerVideo');
    
    codeReader.decodeFromVideoDevice(null, video, async (result, err) => {
        if (result) {
            const barcode = result.text;
            document.getElementById('scannerResult').textContent = `Código: ${barcode}`;
            
            try {
                const snapshot = await productsRef.once('value');
                let foundProduct = null;
                
                snapshot.forEach((child) => {
                    const product = child.val();
                    // Verifica código de barras, código principal e Ref. 2 (usando == para compatibilidade string/número)
                    if (product.barcode == barcode || product.code == barcode || (product.code2 && product.code2 == barcode)) {
                        foundProduct = {
                            id: child.key,
                            ...product
                        };
                    }
                });
                
                if (foundProduct) {
                    stopScanner();
                    closeBarcodeScanner();
                    openSaleModal(foundProduct.id);
                } else {
                    document.getElementById('scannerResult').textContent = `Produto não encontrado: ${barcode}`;
                }
            } catch (error) {
                console.error('Erro ao buscar produto:', error);
            }
        }
    });
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
}

// ============================================
// SIMULADOR DE COMISSÃO
// ============================================

async function openSimulatorModal() {
    // Injetar HTML do modal se não existir
    if (!document.getElementById('simulatorModal')) {
        const modalHtml = `
            <div id="simulatorModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Simulador de Comissão</h3>
                        <button class="close-modal" onclick="closeSimulatorModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Volume Total de Vendas (R$)</label>
                            <input type="number" id="simulationValue" class="input-field" placeholder="Ex: 1000.00">
                        </div>
                        <div id="simulationResult" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 4px; display: none; text-align: center;">
                            <p style="margin-bottom: 5px; color: #666;">Comissão Estimada:</p>
                            <div id="simulationCommission" style="font-size: 1.8em; font-weight: bold; color: #2c1810;">R$ 0,00</div>
                            <div id="simulationPercentage" style="font-size: 0.9em; color: #666; margin-top: 5px;"></div>
                        </div>
                        <button class="btn-primary" onclick="calculateSimulation()" style="width: 100%; margin-top: 15px;">Calcular</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('simulatorModal').classList.add('active');
    document.getElementById('simulationValue').value = '';
    document.getElementById('simulationResult').style.display = 'none';
    setTimeout(() => document.getElementById('simulationValue').focus(), 100);
}

function closeSimulatorModal() {
    const modal = document.getElementById('simulatorModal');
    if (modal) modal.classList.remove('active');
}

async function calculateSimulation() {
    const value = parseFloat(document.getElementById('simulationValue').value);
    
    if (!value || value < 0) {
        showNotification('Digite um valor válido', 'error');
        return;
    }

    try {
        // Buscar metas atuais para pegar as faixas de comissão
        const snapshot = await goalsRef.child(currentUser.uid).once('value');
        const goals = snapshot.val() || {};
        const tiers = goals.commissionTiers || [];

        const commission = calculateTotalCommission(value, tiers);
        const percentage = value > 0 ? (commission / value) * 100 : 0;

        document.getElementById('simulationCommission').textContent = formatCurrency(commission);
        document.getElementById('simulationPercentage').textContent = `Equivalente a ${percentage.toFixed(1)}% de comissão média`;
        document.getElementById('simulationResult').style.display = 'block';
        
    } catch (error) {
        console.error('Erro na simulação:', error);
        showNotification('Erro ao calcular', 'error');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Injetar estilos para botões de fechar modal (maiores e vermelhos)
    const style = document.createElement('style');
    style.innerHTML = `
        .close-modal {
            font-size: 32px !important;
            color: #dc3545 !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            padding: 0 !important;
            font-weight: bold !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 44px !important;
            min-height: 44px !important;
            line-height: 1 !important;
        }
    `;
    document.head.appendChild(style);

    // Fechar modal ao clicar no fundo escuro (overlay)
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
            const closeBtn = event.target.querySelector('.close, .close-modal');
            if (closeBtn) {
                closeBtn.click();
            } else {
                event.target.classList.remove('active');
                if (event.target.id === 'barcodeScannerModal' && typeof stopScanner === 'function') {
                    stopScanner();
                }
            }
        }
    });

    // Event listeners
    document.getElementById('loginEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
});
