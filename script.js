// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

let isValuesHidden = true;
let hideValuesTimeout = null;

function getHiddenDiamondsHtml() {
    return `<span style="display: inline-flex; gap: 4px; align-items: center; color: #d4a574; vertical-align: middle;" title="Valor Oculto">
        <svg class="hidden-diamond-icon" style="animation-delay: 0s;" viewBox="0 0 24 24" width="1.1em" height="1.1em" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3 8 9l4 13"></path><path d="M12 3v19"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>
        <svg class="hidden-diamond-icon" style="animation-delay: 0.5s;" viewBox="0 0 24 24" width="1.1em" height="1.1em" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3 8 9l4 13"></path><path d="M12 3v19"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>
        <svg class="hidden-diamond-icon" style="animation-delay: 1.0s;" viewBox="0 0 24 24" width="1.1em" height="1.1em" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3 8 9l4 13"></path><path d="M12 3v19"></path><path d="M13 3l3 6-4 13"></path><path d="M2 9h20"></path></svg>
    </span>`;
}

function formatCurrency(value, forceShow = false) {
    const isAdmin = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin';
    if (isAdmin && isValuesHidden && !forceShow) {
        return getHiddenDiamondsHtml();
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatNumberHidden(value, forceShow = false) {
    const isAdmin = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin';
    if (isAdmin && isValuesHidden && !forceShow) {
        return getHiddenDiamondsHtml();
    }
    return value;
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

// Helper: converte links do Google Drive para links diretos de imagem
function getDirectImageUrl(url) {
    if (!url) return '';
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        // O endpoint 'uc' está sendo bloqueado pelo Google. 
        // A alternativa mais estável oficial é o endpoint de thumbnail.
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    const altRegex = /id=([a-zA-Z0-9_-]+)/;
    if (url.includes('drive.google.com') && url.match(altRegex)) {
        return `https://drive.google.com/thumbnail?id=${url.match(altRegex)[1]}&sz=w1000`;
    }
    return url;
}

// Helper: Visualizar prévia da imagem a partir do input
function previewItemImage(btnElement) {
    const input = btnElement.previousElementSibling;
    const url = input ? input.value.trim() : '';
    
    if (!url) {
        showNotification('Cole um link de imagem primeiro para ver a prévia.', 'error');
        return;
    }
    
    const directUrl = getDirectImageUrl(url);
    
    viewImageFullscreen(directUrl);
}

function viewImageFullscreen(url) {
    if (!url) return;
    
    if (!document.getElementById('fullscreenImageModal')) {
        const modalHtml = `
            <div id="fullscreenImageModal" class="modal-overlay" style="z-index: 9999;" onclick="this.classList.remove('active')">
                <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                    <button class="close-modal" onclick="document.getElementById('fullscreenImageModal').classList.remove('active')" style="position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5) !important; color: white !important; border-radius: 50%; width: 40px; height: 40px; z-index: 10000; display: flex; align-items: center; justify-content: center; font-size: 24px;">×</button>
                    <img id="fullscreenModalImage" src="" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    document.getElementById('fullscreenModalImage').src = url;
    document.getElementById('fullscreenImageModal').classList.add('active');
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

function showNotification(message, type = 'success', duration = null) {
    const existing = document.getElementById('global-toast-notification');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'global-toast-notification';
    const isError = type === 'error';
    const borderColor = isError ? '#dc3545' : '#28a745';
    const icon = isError ? '⚠️' : '✅';
    
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: white;
        border-left: 5px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 15px 20px; border-radius: 4px; z-index: 9999;
        transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex; align-items: flex-start; gap: 12px; min-width: 250px; max-width: 400px;
        color: #333; font-family: inherit;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 1.4em; line-height: 1;">${icon}</span>
        <span style="font-size: 0.95em; line-height: 1.4; flex: 1;">${message.replace(/\n/g, '<br>')}</span>
    `;
    
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');
    const displayTime = duration || Math.max(3500, message.length * 60);
    setTimeout(() => {
        if (document.body.contains(toast)) { toast.style.transform = 'translateX(120%)'; setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 300); }
    }, displayTime);
}

function toggleValuesVisibility() {
    isValuesHidden = !isValuesHidden;
    updateVisibilityButton();
    manageHideValuesTimeout();
    refreshScreensForVisibility();
}

function updateVisibilityButton() {
    const btn = document.getElementById('toggleVisibilityBtn');
    if (!btn) return;
    
    if (isValuesHidden) {
        // Ícone Olho Fechado
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="#2c1810" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        btn.title = "Mostrar Valores";
    } else {
        // Ícone Olho Aberto
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="#2c1810" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        btn.title = "Ocultar Valores (Ocultará automaticamente em 5 min)";
    }
}

function manageHideValuesTimeout() {
    if (hideValuesTimeout) {
        clearTimeout(hideValuesTimeout);
        hideValuesTimeout = null;
    }
    if (!isValuesHidden) {
        hideValuesTimeout = setTimeout(() => {
            if (!isValuesHidden) {
                isValuesHidden = true;
                updateVisibilityButton();
                refreshScreensForVisibility();
                showNotification('Valores ocultados automaticamente por segurança.', 'success');
            }
        }, 300000); // 5 minutos = 300.000 ms
    }
}

function refreshScreensForVisibility() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const onclickStr = activeTab.getAttribute('onclick');
        if (onclickStr) {
            const match = onclickStr.match(/'([^']+)'/);
            if (match) {
                const tabName = match[1];
                if (tabName === 'dashboard') loadAdminDashboard(true);
                else if (tabName === 'resellers') loadResellers(true);
                else if (tabName === 'orders') loadOrders(true);
                else if (tabName === 'clients') renderAdminClientsPage();
                else if (tabName === 'metrics') loadAdminMetrics(true);
                else if (tabName === 'campaigns') loadAdminCampaigns(true);
            }
        }
    } else {
        loadAdminDashboard(true);
    }

    if (document.getElementById('adminSalesListModal') && document.getElementById('adminSalesListModal').classList.contains('active')) {
        openAdminSalesListModal();
    }
    if (document.getElementById('resellerSalesModal') && document.getElementById('resellerSalesModal').classList.contains('active')) {
        viewResellerSales(currentAdminViewResellerId, true);
    }
}

function injectVisibilityToggle() {
    if (document.getElementById('toggleVisibilityBtn')) return;
    if (!currentUser || currentUser.role !== 'admin') return;

    const btn = document.createElement('button');
    btn.id = 'toggleVisibilityBtn';
    btn.onclick = toggleValuesVisibility;
    btn.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 50%; width: 40px; height: 40px; display: inline-flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.2s ease; margin-left: 10px; vertical-align: middle;';
    
    btn.onmouseover = () => btn.style.background = '#f8f9fa';
    btn.onmouseout = () => btn.style.background = 'white';

    const soundBtn = document.getElementById('toggleSoundBtn');
    if (soundBtn && soundBtn.parentNode) {
        soundBtn.parentNode.appendChild(btn);
    } else {
        btn.style.position = 'fixed';
        btn.style.top = '15px';
        btn.style.right = '80px';
        btn.style.zIndex = '9999';
        document.body.appendChild(btn);
    }
    updateVisibilityButton();
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
        .replace(/{total}/g, formatCurrency(totalValue, true));
    
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

function toggleResellerViewMode() {
    const viewMode = localStorage.getItem('resellerViewMode') || 'grid';
    localStorage.setItem('resellerViewMode', viewMode === 'grid' ? 'list' : 'grid');
    loadResellers(true);
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

        // --- MULTI-TENANCY LOGIC ---
        let companyId = 'legacy';
        let userCompanies = {};
        
        if (typeof globalUsersRef !== 'undefined') {
            try {
                const globalSnap = await globalUsersRef.child(user.uid).once('value');
                const globalData = globalSnap.val();
                if (globalData) {
                    if (globalData.companies) {
                        userCompanies = globalData.companies;
                        companyId = Object.keys(userCompanies)[0] || 'legacy';
                    } else if (globalData.companyId) {
                        companyId = globalData.companyId;
                        userCompanies[companyId] = { role: globalData.role || 'reseller', companyName: 'Sua Empresa' };
                    }
                }
            } catch (e) {
                console.warn('Erro ao ler global_users (verifique Regras Firebase). Usando legado.', e);
            }
        }

        const companyIds = Object.keys(userCompanies);
        
        if (companyIds.length > 1) {
            hideLoading();
            showCompanySelectionModal(user.uid, user.email, userCompanies);
            return;
        }

        await continueLoginProcess(user.uid, user.email, companyId);
    } catch (error) {
        hideLoading();
        console.error('Erro no login:', error);
        if (error.code && error.code.startsWith('auth/')) {
            showNotification('E-mail ou senha incorretos', 'error');
        } else {
            showNotification('Erro: ' + error.message, 'error');
        }
    }
}

async function continueLoginProcess(uid, email, companyId) {
    showLoading();
    try {
        if (typeof setCompanyContext === 'function') setCompanyContext(companyId);

        // Buscar dados do usuário no database
        const userSnapshot = await usersRef.child(uid).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            throw new Error('Usuário não encontrado no banco de dados desta empresa');
        }

        if (userData.isDeleted) {
            throw new Error('Acesso revogado nesta empresa');
        }

        currentUser = {
            uid: uid,
            email: email,
            companyId: companyId,
            ...userData
        };

        // Redirecionar baseado no role
        if (userData.role === 'admin') {
            showScreen('adminScreen');
            loadAdminData();
        } else {
            showScreen('resellerScreen');
            applyResellerTheme();
            loadResellerData();
        }

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro na continuação do login:', error);
        if (error.message === 'Acesso revogado nesta empresa') {
            showNotification('Seu acesso foi revogado nesta empresa. Entre em contato com o administrador.', 'error');
        } else {
            showNotification('Erro: ' + error.message, 'error');
        }
        auth.signOut();
    }
}

function showCompanySelectionModal(uid, email, userCompanies) {
    if (!document.getElementById('companySelectionModal')) {
        const modalHtml = `
            <div id="companySelectionModal" class="modal-overlay" style="z-index: 5000;">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-header">
                        <h3>Selecione a Empresa</h3>
                        <button class="close-modal" onclick="cancelCompanySelection()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px; color: #666;">Você está cadastrado(a) em múltiplas empresas. Por favor, selecione qual deseja acessar agora:</p>
                        <div id="companySelectionList" style="display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const list = document.getElementById('companySelectionList');
    list.innerHTML = Object.keys(userCompanies).map(compId => {
        const compInfo = userCompanies[compId];
        const compName = compInfo.companyName || `Empresa (${compId.substring(0,6)})`;
        return `
            <button class="btn-secondary" onclick="selectCompanyForLogin('${uid}', '${email}', '${compId}')" style="padding: 15px; font-size: 1.1em; display: flex; justify-content: space-between; align-items: center; border: 1px solid #d4a574; background: #fffcf7;">
                <span style="font-weight: bold; color: #2c1810;">🏢 ${compName}</span>
                <span style="font-size: 0.8em; color: #888;">Entrar ❯</span>
            </button>
        `;
    }).join('');
    
    document.getElementById('companySelectionModal').classList.add('active');
}

function cancelCompanySelection() {
    document.getElementById('companySelectionModal').classList.remove('active');
    auth.signOut();
}

function selectCompanyForLogin(uid, email, companyId) {
    document.getElementById('companySelectionModal').classList.remove('active');
    localStorage.setItem(`selectedCompany_${uid}`, companyId);
    continueLoginProcess(uid, email, companyId);
}
function applyResellerTheme() {
    document.body.classList.remove('theme-ouro', 'theme-prata', 'theme-diamante');
    if (!currentUser || !currentUser.tags || !Array.isArray(currentUser.tags)) return;

    const tagNames = currentUser.tags.map(t => t.name ? t.name.toLowerCase().trim() : '');
    
    if (tagNames.includes('diamante')) {
        document.body.classList.add('theme-diamante');
    } else if (tagNames.includes('ouro')) {
        document.body.classList.add('theme-ouro');
    } else if (tagNames.includes('prata')) {
        document.body.classList.add('theme-prata');
    }
}

function logout() {
    if (currentUser) {
        localStorage.removeItem(`selectedCompany_${currentUser.uid}`);
    }
    auth.signOut().then(() => {
        currentUser = null;
        document.body.classList.remove('theme-ouro', 'theme-prata', 'theme-diamante');
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
            // --- MULTI-TENANCY LOGIC ---
            let companyId = 'legacy';
            let userCompanies = {};
            
            if (typeof globalUsersRef !== 'undefined') {
                try {
                    const globalSnap = await globalUsersRef.child(user.uid).once('value');
                    const globalData = globalSnap.val();
                    if (globalData) {
                        if (globalData.companies) {
                            userCompanies = globalData.companies;
                            companyId = Object.keys(userCompanies)[0] || 'legacy';
                        } else if (globalData.companyId) {
                            companyId = globalData.companyId;
                            userCompanies[companyId] = { role: globalData.role || 'reseller', companyName: 'Sua Empresa' };
                        }
                    }
                } catch (e) {
                    console.warn('Erro ao ler global_users (verifique Regras Firebase). Usando legado.', e);
                }
            }

            const companyIds = Object.keys(userCompanies);
            const savedCompanyId = localStorage.getItem(`selectedCompany_${user.uid}`);
            
            if (savedCompanyId && userCompanies[savedCompanyId]) {
                companyId = savedCompanyId;
            } else if (companyIds.length > 1) {
                hideLoading();
                showCompanySelectionModal(user.uid, user.email, userCompanies);
                return;
            }

            await continueLoginProcess(user.uid, user.email, companyId);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
        hideLoading();
    }
});

// ============================================
// NAVEGAÇÃO DE TABS
// ============================================

function setupMobileMenu() {
    if (document.getElementById('mobileMoreBtn')) return;

    let navBar = document.querySelector('#resellerScreen .nav-bar') || document.querySelector('.nav-bar');
    if (!navBar) {
        const referenceBtn = document.querySelector('#resellerScreen .nav-btn') || document.querySelector('.nav-btn');
        if (referenceBtn && referenceBtn.parentNode) {
            navBar = referenceBtn.parentNode;
            navBar.classList.add('nav-bar');
        }
    }
    if (!navBar) return;

    const moreBtn = document.createElement('button');
    moreBtn.id = 'mobileMoreBtn';
    moreBtn.className = 'mobile-more-btn';
    moreBtn.innerHTML = '⋮';
    moreBtn.onclick = toggleSideMenu;
    navBar.appendChild(moreBtn);

    const overlay = document.createElement('div');
    overlay.id = 'sideMenuOverlay';
    overlay.className = 'side-menu-overlay';
    overlay.onclick = toggleSideMenu;

    const sideMenu = document.createElement('div');
    sideMenu.id = 'sideMenu';
    sideMenu.className = 'side-menu';
    sideMenu.innerHTML = `
        <button class="close-btn" onclick="toggleSideMenu()">×</button>
        <div id="sideMenuItems" style="display: flex; flex-direction: column;"></div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sideMenu);
    
    const goalsBtn = document.querySelector('.nav-btn[data-tab="goals"]');
    if (goalsBtn) {
        goalsBtn.classList.add('mobile-hidden-tab');
        
        const clonedGoalsBtn = goalsBtn.cloneNode(true);
        clonedGoalsBtn.onclick = () => { switchTab('goals'); toggleSideMenu(); };
        document.getElementById('sideMenuItems').appendChild(clonedGoalsBtn);
    }
}

function toggleSideMenu() {
    const overlay = document.getElementById('sideMenuOverlay');
    const sideMenu = document.getElementById('sideMenu');
    if (overlay && sideMenu) {
        overlay.classList.toggle('active');
        sideMenu.classList.toggle('active');
    }
}

function switchTab(tabName) {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
        btn.classList.add('active');
    });

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
    } else if (tabName === 'campaigns') {
        loadResellerCampaigns();
    }

    if (tabName !== 'sales') {
        const btn = document.getElementById('floatingCartBtn');
        if (btn) btn.style.display = 'none';
    }
}

function switchAdminTab(tabName) {
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
    } else if (tabName === 'metrics') {
        document.getElementById('adminMetrics').classList.add('active');
        loadAdminMetrics();
    } else if (tabName === 'campaigns') {
        document.getElementById('adminCampaigns').classList.add('active');
        loadAdminCampaigns();
    }
}

// ============================================
// ADMIN - DASHBOARD & GRÁFICOS
// ============================================

let adminChart = null;
let adminCategoryChart = null;
let dashboardData = { sales: [], resellers: [] };
let currentDashboardProductSales = [];
let currentDashboardCanceledSales = [];
let currentChartPeriod = 'month';

async function loadAdminDashboard(silent = false) {
    if (!silent) showLoading();

    try {
        const [salesSnapshot, resellersSnapshot, productsSnapshot, configSnapshot] = await Promise.all([
            salesRef.once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            productsRef.once('value'),
            configRef.child('ranking').once('value')
        ]);

        // Atualizar filtro de grupos e revendedoras
        let groupFilterSelect = document.getElementById('dashboardGroupFilter');
        const currentGroupFilter = groupFilterSelect ? groupFilterSelect.value : 'all';

        let filterSelect = document.getElementById('dashboardResellerFilter');
        const currentFilter = filterSelect ? filterSelect.value : '';
        
        const allResellers = [];
        const groupsSet = new Set();
        resellersSnapshot.forEach(child => {
            const r = { id: child.key, ...child.val() };
            allResellers.push(r);
            groupsSet.add(r.group || 'Padrão');
        });

        const availableGroups = Array.from(groupsSet).sort();

        let filtersContainer = document.getElementById('admin-filters-container');
        if (!filtersContainer) {
            const header = document.querySelector('#adminDashboard .section-header');
            if (header) {
                filtersContainer = document.createElement('div');
                filtersContainer.id = 'admin-filters-container';
                filtersContainer.style.cssText = 'display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 20px;';
                header.parentNode.insertBefore(filtersContainer, header.nextSibling);
            }
        }

        let savedCycleValue = 'current';

        if (filtersContainer) {
            let filtersHtml = '';
            
            let groupOptionsHtml = `<option value="all">Todas as Turmas</option>`;
            availableGroups.forEach(g => {
                groupOptionsHtml += `<option value="${g}" ${currentGroupFilter === g ? 'selected' : ''}>Turma: ${g}</option>`;
            });
            filtersHtml += `<select id="dashboardGroupFilter" onchange="loadAdminDashboard()" class="input-field" style="margin-bottom: 0; padding: 8px; font-size: 1em; width: auto;">${groupOptionsHtml}</select>`;

            const filteredResellers = currentGroupFilter === 'all' ? allResellers : allResellers.filter(r => (r.group || 'Padrão') === currentGroupFilter);
            let options = '<option value="">Todas as Revendedoras</option>';
            filteredResellers.forEach(r => {
                options += `<option value="${r.id}" ${r.id === currentFilter ? 'selected' : ''}>${r.name}</option>`;
            });
            filtersHtml += `<select id="dashboardResellerFilter" onchange="loadAdminDashboard()" class="input-field" style="margin-bottom: 0; padding: 8px; font-size: 1em; width: auto;">${options}</select>`;

            const existingCycleSelect = document.getElementById('rankingCycleFilter');
            savedCycleValue = existingCycleSelect ? existingCycleSelect.value : 'current';
            
            filtersHtml += `<div id="ranking-cycle-filter-wrapper"></div>`;

            filtersContainer.innerHTML = filtersHtml;
        }

        const config = configSnapshot.val() || {};
        let lastResetDate = config.lastResetDate || 0;
        let adminGoal = config.adminGoal || 0;
        let adminGoalEndDate = config.adminGoalEndDate || 0;

        if (currentGroupFilter !== 'all') {
            if (config.groups && config.groups[currentGroupFilter]) {
                lastResetDate = config.groups[currentGroupFilter].lastResetDate || lastResetDate;
                adminGoal = config.groups[currentGroupFilter].adminGoal !== undefined ? config.groups[currentGroupFilter].adminGoal : 0;
                adminGoalEndDate = config.groups[currentGroupFilter].adminGoalEndDate || 0;
            } else {
                adminGoal = 0;
                adminGoalEndDate = 0;
            }
        }

        const sales = [];
        salesSnapshot.forEach((child) => {
            sales.push({ id: child.key, ...child.val() });
        });

        // Buscar vendas canceladas
        const canceledSales = [];
        allResellers.forEach(r => {
            if (r.canceledSales) {
                Object.keys(r.canceledSales).forEach(key => {
                    canceledSales.push({ id: key, ...r.canceledSales[key], isCanceled: true });
                });
            }
        });

        // Mapear categorias dos produtos
        const productCategories = {};
        productsSnapshot.forEach(child => {
            const p = child.val();
            productCategories[child.key] = p.category || 'Sem Categoria';
        });

        // Filtrar vendas se houver revendedora selecionada, ou pelo grupo
        let filteredSales = sales;
        let filteredCanceledSales = canceledSales;

        if (currentFilter) {
            filteredSales = sales.filter(s => s.resellerId === currentFilter);
            filteredCanceledSales = canceledSales.filter(s => s.resellerId === currentFilter);
        } else if (currentGroupFilter !== 'all') {
            const groupResellerIds = new Set(allResellers.filter(r => (r.group || 'Padrão') === currentGroupFilter).map(r => r.id));
            filteredSales = sales.filter(s => groupResellerIds.has(s.resellerId));
            filteredCanceledSales = canceledSales.filter(s => groupResellerIds.has(s.resellerId));
        }

        // Filtrar pelo ciclo atual (Caixa do Admin) - zera a contagem visual baseada no último reset
        filteredSales = filteredSales.filter(s => {
            let customLastReset = lastResetDate;
            if (currentGroupFilter === 'all') {
                const rGroup = (allResellers.find(r => r.id === s.resellerId) || {}).group || 'Padrão';
                if (config.groups && config.groups[rGroup]) {
                    customLastReset = config.groups[rGroup].lastResetDate || lastResetDate;
                }
            }
            return (Number(s.date) || 0) >= customLastReset;
        });

        filteredCanceledSales = filteredCanceledSales.filter(s => {
            let customLastReset = lastResetDate;
            if (currentGroupFilter === 'all') {
                const rGroup = (allResellers.find(r => r.id === s.resellerId) || {}).group || 'Padrão';
                if (config.groups && config.groups[rGroup]) {
                    customLastReset = config.groups[rGroup].lastResetDate || lastResetDate;
                }
            }
            return (Number(s.date) || 0) >= customLastReset;
        });

        // Separar vendas de produtos das vendas financeiras (acertos)
        const productSales = filteredSales.filter(s => !isFinancialSale(s));
        const financialSales = filteredSales.filter(s => isFinancialSale(s));

        // Calcular totais gerais (apenas produtos, sem acertos)
        const totalValue = productSales.reduce((sum, sale) => sum + sale.price, 0);
        const totalSalesEl = document.getElementById('adminTotalSales');
        if (totalSalesEl) totalSalesEl.innerHTML = formatCurrency(totalValue);
        const countEl = document.getElementById('adminTotalCount');
        if (countEl) countEl.innerHTML = formatNumberHidden(new Set(productSales.map(s => s.groupId || s.id)).size);

        // Exibir acertos recebidos separadamente (se o elemento existir)
        const acertosEl = document.getElementById('adminTotalAcertos');
        if (acertosEl) {
            const totalAcertos = financialSales.reduce((sum, sale) => sum + sale.price, 0);
            acertosEl.innerHTML = formatCurrency(totalAcertos);
        }

        // --- PROGRESS BAR DA META ADMIN ---
        let adminGoalContainer = document.getElementById('adminGoalContainer');
        if (!adminGoalContainer && totalSalesEl) {
            adminGoalContainer = document.createElement('div');
            adminGoalContainer.id = 'adminGoalContainer';
            adminGoalContainer.style.marginTop = '15px';
            adminGoalContainer.style.borderTop = '1px solid #eee';
            adminGoalContainer.style.paddingTop = '10px';
            totalSalesEl.parentNode.appendChild(adminGoalContainer);
        }

        if (adminGoalContainer) {
            adminGoalContainer.style.display = 'block';
            const progressPct = adminGoal > 0 ? (totalValue / adminGoal) * 100 : 0;
            const remaining = Math.max(0, adminGoal - totalValue);
            const surplus = Math.max(0, totalValue - adminGoal);
            
            let barHtml = '';
            if (adminGoal > 0) {
                if (totalValue <= adminGoal) {
                    barHtml = `<div style="background: #d4a574; width: ${progressPct}%; height: 100%; transition: width 0.3s ease;"></div>`;
                } else {
                    const goalWidth = (adminGoal / totalValue) * 100;
                    const surplusWidth = (surplus / totalValue) * 100;
                    barHtml = `
                        <div style="background: #28a745; width: ${goalWidth}%; height: 100%; transition: width 0.3s ease; border-right: 2px solid #fff;"></div>
                        <div style="background: #17a2b8; width: ${surplusWidth}%; height: 100%; transition: width 0.3s ease;" title="Excedente: ${formatCurrency(surplus)}"></div>
                    `;
                }
            }

            let statusHtml = '';
            if (adminGoal > 0) {
                if (totalValue <= adminGoal) {
                    statusHtml = `
                        <div style="font-size: 0.8em; color: #555; text-align: center;">
                            ${progressPct.toFixed(1)}% alcançado
                            ${remaining > 0 ? `<br>Faltam <strong>${formatCurrency(remaining)}</strong>` : ''}
                        </div>
                    `;
                } else {
                    statusHtml = `
                        <div style="font-size: 0.8em; color: #555; text-align: center;">
                            <span style="color: #28a745; font-weight: bold;">${progressPct.toFixed(1)}% alcançado</span>
                            <br><strong>Meta Batida! 🎉</strong> | Excedente: <strong style="color: #17a2b8;">${formatCurrency(surplus)}</strong>
                        </div>
                    `;
                }
            } else {
                statusHtml = '<div style="font-size: 0.8em; color: #888; text-align: center;">Defina uma meta para acompanhar.</div>';
            }
            
            const now = Date.now();
            let daysHtml = '';
            
            if (lastResetDate > 0) {
                const daysElapsed = Math.floor(Math.max(0, now - lastResetDate) / 86400000);
                daysHtml += `<span>Dias corridos: <strong>${daysElapsed}</strong></span>`;
            }
            
            if (adminGoalEndDate > 0) {
                const daysRemaining = Math.ceil(Math.max(0, adminGoalEndDate - now) / 86400000);
                daysHtml += `<span style="margin-left: 10px;">Faltam: <strong>${daysRemaining}</strong> dias</span>`;
            }
            
            const daysDisplay = daysHtml ? `<div style="font-size: 0.8em; color: #555; text-align: center; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #eee;">${daysHtml}</div>` : '';

            adminGoalContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 0.85em; color: #666;">
                    <span>Meta: <strong>${formatCurrency(adminGoal)}</strong></span>
                    <button onclick="openAdminGoalModal()" style="background: none; border: none; color: #4a90e2; cursor: pointer; text-decoration: underline; font-size: 0.9em; padding: 0;">Editar Meta</button>
                </div>
                <div style="background: #eee; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 5px; display: flex;">
                    ${barHtml}
                </div>
                ${statusHtml}
                ${daysDisplay}
            `;
        }

        currentDashboardProductSales = productSales;
        currentDashboardCanceledSales = filteredCanceledSales.filter(s => !isFinancialSale(s));

        // Injetar o seletor de período acima do gráfico, se não existir
        const canvas = document.getElementById('salesChart');
        if (canvas && !document.getElementById('chartPeriodToggle')) {
            const toggleDiv = document.createElement('div');
            toggleDiv.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 10px;';
            toggleDiv.innerHTML = `
                <select id="chartPeriodToggle" class="input-field" style="width: auto; padding: 5px 10px; font-size: 0.85em; margin: 0; border-radius: 6px; border: 1px solid #ddd;" onchange="updateSalesChartPeriod(this.value)">
                    <option value="month">Últimos 6 Meses</option>
                    <option value="day15">Últimos 15 Dias</option>
                    <option value="day30">Últimos 30 Dias</option>
                </select>
            `;
            canvas.parentNode.insertBefore(toggleDiv, canvas);
        }

        if (canvas && !document.getElementById('bestSalesDayDisplay')) {
            const bestDayDiv = document.createElement('div');
            bestDayDiv.id = 'bestSalesDayDisplay';
            bestDayDiv.style.cssText = 'text-align: center; margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 0.95em; color: #2c1810; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02);';
            canvas.parentNode.insertBefore(bestDayDiv, canvas.nextSibling);
        }

        drawPerformanceChart();

        // Processar dados para o gráfico de Pizza (Agrupar por Categoria) — apenas produtos
        const salesByCategory = {};
        const countByCategory = {};
        const salesByFullCategory = {};
        const countByFullCategory = {};
        let totalPieUnits = 0;
        
        productSales.forEach(sale => {
            const fullCategory = productCategories[sale.productId] || 'Outros';
            const parentCategory = fullCategory.split('>')[0].trim();

            salesByCategory[parentCategory] = (salesByCategory[parentCategory] || 0) + (Number(sale.price) || 0);
            countByCategory[parentCategory] = (countByCategory[parentCategory] || 0) + 1;

            salesByFullCategory[fullCategory] = (salesByFullCategory[fullCategory] || 0) + (Number(sale.price) || 0);
            countByFullCategory[fullCategory] = (countByFullCategory[fullCategory] || 0) + 1;
            totalPieUnits++;
        });

        const categoryLabels = Object.keys(salesByCategory).map(cat => `${cat} (${countByCategory[cat]} un)`);
        renderCategoryChart(categoryLabels, Object.values(salesByCategory), 'Vendas por Categoria (R$)');
        updateCategoryTotalDisplay(totalPieUnits, salesByFullCategory, countByFullCategory);

        dashboardData = { sales, canceledSales, resellers: allResellers.filter(r => currentGroupFilter === 'all' || (r.group || 'Padrão') === currentGroupFilter), allResellers, productCategories, adminGoal, adminGoalEndDate, lastResetDate, currentGroupFilter, savedCycleValue, config };
        renderResellerRanking(sales, dashboardData.resellers);
        renderBirthdaysOfTheMonth(dashboardData.resellers);
        loadPendingSettlements(); // Carregar solicitações de acerto

        if (!silent) hideLoading();
    } catch (error) {
        if (!silent) hideLoading();
        console.error('Erro ao carregar dashboard:', error);
    }
}

function openAdminGoalModal() {
    const targetGroup = dashboardData.currentGroupFilter || 'all';
    const groupLabel = targetGroup === 'all' ? 'Global' : `Turma: ${targetGroup}`;

    if (!document.getElementById('adminGoalModal')) {
        const modalHtml = `
            <div id="adminGoalModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 id="adminGoalModalTitle">Editar Meta do Ciclo</h3>
                        <button class="close-modal" onclick="document.getElementById('adminGoalModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="adminGoalTargetGroup">
                        <div class="form-group">
                            <label>Valor da Meta (R$)</label>
                            <input type="number" id="adminGoalInput" class="input-field" step="0.01" min="0" placeholder="Ex: 15000">
                        </div>
                        <div class="form-group">
                            <label>Data Prevista para o Fim do Ciclo</label>
                            <input type="date" id="adminGoalEndDateInput" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="saveAdminGoal()" style="width: 100%; margin-top: 15px;">Salvar Meta</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('adminGoalModalTitle').textContent = `Editar Meta do Ciclo [${groupLabel}]`;
    document.getElementById('adminGoalTargetGroup').value = targetGroup;

    document.getElementById('adminGoalInput').value = dashboardData.adminGoal || '';
    
    if (dashboardData.adminGoalEndDate) {
        const d = new Date(dashboardData.adminGoalEndDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        document.getElementById('adminGoalEndDateInput').value = `${yyyy}-${mm}-${dd}`;
    } else {
        document.getElementById('adminGoalEndDateInput').value = '';
    }

    document.getElementById('adminGoalModal').classList.add('active');
}

async function saveAdminGoal() {
    const targetGroup = document.getElementById('adminGoalTargetGroup').value || 'all';
    const goalVal = parseFloat(document.getElementById('adminGoalInput').value) || 0;
    const endDateStr = document.getElementById('adminGoalEndDateInput').value;
    
    let adminGoalEndDate = 0;
    if (endDateStr) {
        const [yyyy, mm, dd] = endDateStr.split('-').map(Number);
        // Colocando o horário para o fim do dia
        adminGoalEndDate = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).getTime();
    }

    showLoading();
    try {
        if (targetGroup === 'all') {
            await configRef.child('ranking').update({ 
                adminGoal: goalVal,
                adminGoalEndDate: adminGoalEndDate
            });
        } else {
            await configRef.child(`ranking/groups/${targetGroup}`).update({
                adminGoal: goalVal,
                adminGoalEndDate: adminGoalEndDate
            });
        }
        document.getElementById('adminGoalModal').classList.remove('active');
        hideLoading();
        showNotification('Meta atualizada com sucesso!');
        loadAdminDashboard();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao atualizar meta', 'error');
    }
}

function renderSalesChart(labels, data, titleText = 'Desempenho de Vendas') {
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
                label: 'Vendas (R$)',
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
                    text: titleText
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

function updateSalesChartPeriod(period) {
    currentChartPeriod = period;
    drawPerformanceChart();
}

function drawPerformanceChart() {
    const productSales = currentDashboardProductSales || [];
    const salesByPeriod = {};
    let labels = [];
    let data = [];
    let titleText = '';
    let chartTotalUnits = 0;


    const dailySales = {}; // Dicionário para calcular o melhor dia do período

    if (currentChartPeriod === 'month') {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}/${d.getFullYear().toString().substr(2)}`;
            salesByPeriod[key] = 0;
        }

        productSales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${months[date.getMonth()]}/${date.getFullYear().toString().substr(2)}`;
            if (salesByPeriod.hasOwnProperty(key)) {
                salesByPeriod[key] += sale.price;
                 chartTotalUnits++;
                
                const dayKey = formatDate(sale.date);
                dailySales[dayKey] = (dailySales[dayKey] || 0) + sale.price;
            }
        });
        labels = Object.keys(salesByPeriod);
        data = Object.values(salesByPeriod);
        titleText = `Desempenho de Vendas (Últimos 6 Meses) - Total: ${chartTotalUnits} produtos`;

    } else {
        const daysCount = currentChartPeriod === 'day30' ? 30 : 15;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${day}/${month}`;
            salesByPeriod[key] = 0;
        }

        productSales.forEach(sale => {
            const date = new Date(sale.date);
            date.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - date.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < daysCount) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const key = `${day}/${month}`;
                if (salesByPeriod.hasOwnProperty(key)) {
                    salesByPeriod[key] += sale.price;
                    chartTotalUnits++;

                }
                
                const dayKey = formatDate(sale.date);
                dailySales[dayKey] = (dailySales[dayKey] || 0) + sale.price;
            }
        });
        labels = Object.keys(salesByPeriod);
        data = Object.values(salesByPeriod);
        titleText = `Desempenho de Vendas (Últimos ${daysCount} Dias) - Total: ${chartTotalUnits} produtos`;

    }

    renderSalesChart(labels, data, titleText);

    // Encontrar o melhor dia do período
    let bestDay = '-';
    let bestDayValue = 0;
    for (const [day, value] of Object.entries(dailySales)) {
        if (value > bestDayValue) {
            bestDayValue = value;
            bestDay = day;
        }
    }

    const bestDayDisplay = document.getElementById('bestSalesDayDisplay');
    if (bestDayDisplay) {
        if (bestDayValue > 0) {
            bestDayDisplay.innerHTML = `🏆 <strong>Melhor Dia:</strong> ${bestDay} com <strong>${formatCurrency(bestDayValue)}</strong> vendidos`;
        } else {
            bestDayDisplay.innerHTML = `🏆 <strong>Melhor Dia:</strong> Nenhum dado no período`;
        }
    }
}

function renderCategoryChart(labels, data, titleText = 'Vendas por Categoria (R$)') {
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
                    text: titleText
                }
            }
        }
    });
}

function updateCategoryTotalDisplay(total, fullCategorySales = null, fullCategoryCounts = null) {
    const canvas = document.getElementById('categoryChart');
    if (canvas) {
        let totalDiv = document.getElementById('categoryChartTotalDisplay');
        if (!totalDiv) {
            totalDiv = document.createElement('div');
            totalDiv.id = 'categoryChartTotalDisplay';
            totalDiv.style.cssText = 'text-align: center; margin-top: 20px; padding: 15px; background: #fffcf7; border-radius: 8px; border: 2px dashed #d4a574; box-shadow: 0 4px 6px rgba(212, 165, 116, 0.1);';
            canvas.parentNode.insertBefore(totalDiv, canvas.nextSibling);
        }
        
        let detailsHtml = '';
        if (fullCategorySales && fullCategoryCounts) {
            const grouped = {};
            Object.keys(fullCategorySales).forEach(cat => {
                const parent = cat.split('>')[0].trim();
                if (!grouped[parent]) grouped[parent] = [];
                grouped[parent].push({
                    name: cat,
                    sales: fullCategorySales[cat],
                    count: fullCategoryCounts[cat]
                });
            });

            let listHtml = '';
            Object.keys(grouped).sort().forEach(parent => {
                listHtml += `<div style="text-align: left; margin-top: 10px; font-weight: bold; color: #d4a574; border-bottom: 1px solid #eee; padding-bottom: 3px;">${parent}</div>`;
                grouped[parent].sort((a, b) => b.sales - a.sales).forEach(sub => {
                    const subNameParts = sub.name.split('>');
                    const displayName = subNameParts.length > 1 ? subNameParts.slice(1).join(' > ').trim() : 'Geral';
                    listHtml += `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.9em; text-align: left;">
                            <span style="color: #555; padding-left: 10px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${displayName}">↳ ${displayName} (${sub.count} un)</span>
                            <strong style="color: #2c1810; margin-left: 10px;">${formatCurrency(sub.sales)}</strong>
                        </div>
                    `;
                });
            });

            detailsHtml = `
                <details style="margin-top: 15px; text-align: left; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #eee;">
                    <summary style="font-weight: 600; cursor: pointer; color: #4a90e2; font-size: 0.95em;">Ver Vendas Detalhadas (Subcategorias)</summary>
                    <div style="margin-top: 10px;">
                        ${listHtml}
                    </div>
                </details>
            `;
        }

        totalDiv.innerHTML = `<span style="font-size: 1.1em; color: #666; display: block; margin-bottom: 5px;">📦 Total de Produtos Vendidos</span><span style="font-size: 2.2em; font-weight: bold; color: #2c1810;">${total}</span>${detailsHtml}`;
    }
}

function openAdminSalesListModal() {
    if (!document.getElementById('adminSalesListModal')) {
        const modalHtml = `
            <div id="adminSalesListModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Detalhes das Vendas do Ciclo</h3>
                        <button class="close-modal" onclick="closeAdminSalesListModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="adminSalesListContainer"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const container = document.getElementById('adminSalesListContainer');
    const sales = currentDashboardProductSales || [];
    const canceled = currentDashboardCanceledSales || [];
    const allSalesForModal = [...sales, ...canceled];
    const resellers = dashboardData.resellers || [];

    // Mapa para buscar o nome da revendedora rapidamente
    const resellerMap = {};
    resellers.forEach(r => resellerMap[r.id] = r.name);

    if (allSalesForModal.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhuma venda neste período.</p></div>';
    } else {
        // Agrupar vendas por groupId ou id (se individual)
        const groups = {};
        allSalesForModal.forEach(sale => {
            const key = sale.groupId || sale.id;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    isGroup: !!sale.groupId,
                    date: sale.date,
                    clientName: sale.clientName,
                    resellerId: sale.resellerId,
                    items: [],
                    totalPrice: 0,
                    isCanceled: true
                };
            }
            groups[key].items.push(sale);
            
            if (!sale.isCanceled) {
                groups[key].isCanceled = false;
                groups[key].totalPrice += sale.price;
            }
            
            // Manter a data mais recente do grupo
            if (sale.date > groups[key].date) groups[key].date = sale.date;
        });

        // Recalcular total se o grupo todo for cancelado
        Object.values(groups).forEach(g => {
            if (g.isCanceled) {
                g.totalPrice = g.items.reduce((sum, i) => sum + i.price, 0);
            }
        });

        // Ordenar grupos da mais recente para a mais antiga
        const sortedGroups = Object.values(groups).sort((a, b) => b.date - a.date);

        container.innerHTML = sortedGroups.map(group => {
            const resellerName = resellerMap[group.resellerId] || 'Desconhecida (Excluída)';
            const itemCount = group.items.length;
            
            let productContent = '';
            if (group.isGroup && itemCount > 1) {
                productContent = `
                    <div style="margin-bottom: 5px; color: #2c1810;"><strong>📦 Venda em Lote (${itemCount} itens)</strong> ${group.isCanceled ? '<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:0.75em; margin-left:5px;">Cancelada</span>' : ''}</div>
                    <ul style="font-size: 0.85em; color: #666; padding-left: 20px; margin: 0;">
                        ${group.items.map(i => `<li style="${i.isCanceled ? 'text-decoration: line-through; color: #aaa;' : ''}">${i.productName} - ${formatCurrency(i.price)} ${i.isCanceled ? '<span style="font-size:0.85em; color:#dc3545;">(Cancelado)</span>' : ''}</li>`).join('')}
                    </ul>
                `;
            } else {
                const item = group.items[0];
                productContent = `<div style="font-weight: 600; color: #2c1810; font-size: 1.05em; ${item.isCanceled ? 'text-decoration: line-through; color: #aaa;' : ''}">${item.productName} ${item.isCanceled ? '<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:5px; display:inline-block; text-decoration:none;">Cancelada</span>' : ''}</div>`;
            }

            return `
                <div style="background: ${group.isCanceled ? '#fff5f5' : 'white'}; border: 1px solid ${group.isCanceled ? '#f5c6cb' : '#eee'}; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">${productContent}</div>
                        <div style="font-weight: bold; color: ${group.isCanceled ? '#dc3545' : '#28a745'}; font-size: 1.1em; margin-left: 10px; ${group.isCanceled ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${formatCurrency(group.totalPrice)}</div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 0.85em; color: #555; border-top: 1px dashed ${group.isCanceled ? '#f5c6cb' : '#eee'}; padding-top: 8px;">
                        <div>📅 <strong>Data:</strong> ${formatDate(group.date)}</div>
                        <div>👩‍💼 <strong>Revendedora:</strong> ${resellerName}</div>
                        <div>👤 <strong>Cliente:</strong> ${group.clientName}</div>
                        ${group.isCanceled && group.items[0].canceledAt ? `<div>❌ <strong>Cancelada em:</strong> ${formatDate(group.items[0].canceledAt)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('adminSalesListModal').classList.add('active');
}

function closeAdminSalesListModal() {
    document.getElementById('adminSalesListModal').classList.remove('active');
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
    let lastResetDate = dashboardData.lastResetDate || 0;
    let history = [];
    
    try {
        const historySnap = await rankingHistoryRef.orderByChild('closedAt').once('value');

        historySnap.forEach(child => {
            history.push({ id: child.key, ...child.val() });
        });
            history.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0)); // Garante ordenação correta (mais recentes primeiro)
    } catch (e) { console.error(e); }

    // Atualizar dados globais para uso no filtro
    dashboardData.rankingHistory = history;

    // Constrói e injeta o filtro de ciclo lá no topo
    let filtersContainer = document.getElementById('admin-filters-container');
    if (filtersContainer) {
        let cycleFilterWrapper = document.getElementById('ranking-cycle-filter-wrapper');
        if (!cycleFilterWrapper) {
            cycleFilterWrapper = document.createElement('div');
            cycleFilterWrapper.id = 'ranking-cycle-filter-wrapper';
            filtersContainer.appendChild(cycleFilterWrapper);
        }
        
        // Filtrar o histórico para exibir os ciclos aplicáveis ao grupo selecionado
        const currentGroup = dashboardData.currentGroupFilter || 'all';
        let filteredHistory = history;
        if (currentGroup !== 'all') {
            filteredHistory = history.filter(h => h.group === currentGroup || h.group === 'all' || !h.group);
        }

        let cycleOptionsHtml = `<option value="current">Ciclo Atual ${currentGroup !== 'all' ? `(Desde ${formatDate(lastResetDate)})` : ''}</option>`;
        filteredHistory.forEach(h => {
            const groupTag = h.group && h.group !== 'all' ? ` [Turma: ${h.group}]` : '';
            cycleOptionsHtml += `<option value="${h.id}">Ciclo Encerrado em ${formatDate(h.closedAt)}${groupTag}</option>`;
        });

        const selectedValue = dashboardData.savedCycleValue || 'current';

        cycleFilterWrapper.innerHTML = `
            <select id="rankingCycleFilter" onchange="updateRankingList()" class="input-field" style="margin-bottom: 0; padding: 8px; font-size: 1em; width: auto;">
                ${cycleOptionsHtml}
            </select>
        `;

        const newSelect = document.getElementById('rankingCycleFilter');
        if (newSelect) {
            const optionExists = Array.from(newSelect.options).some(opt => opt.value === selectedValue);
            newSelect.value = optionExists ? selectedValue : 'current';
        }
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
            <h3 style="margin: 0; color: #2c1810;">🏆 Ranking Completo</h3>
            <div style="display: flex; gap: 5px; align-items: center;">
                ${history.length > 0 ? `<button class="btn-secondary" onclick="openResellerRankingHistoryModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #6c757d; color: white; border: none;">📜 Galeria</button>` : ''}
                <button class="btn-secondary" onclick="openRewardRankingModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #d4a574; color: white; border: none;">🏆 Premiar / Zerar</button>
                <button class="btn-secondary" onclick="openEditCurrentCycleModal()" style="padding: 5px 10px; font-size: 0.8em; background-color: #17a2b8; color: white; border: none;" title="Editar Data Inicial do Ciclo Atual">📅</button>
            </div>
        </div>
        <div id="rankingListContainer" style="display: flex; flex-direction: column; gap: 10px; max-height: 450px; overflow-y: auto; padding-right: 5px;"></div>
    `;

    updateRankingList();
}

function openEditCurrentCycleModal() {
    if (!document.getElementById('editCycleStartDateModal')) {
        const modalHtml = `
            <div id="editCycleStartDateModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Editar Data de Início do Ciclo</h3>
                        <button class="close-modal" onclick="document.getElementById('editCycleStartDateModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Selecione a Turma:</label>
                            <select id="editCycleGroupSelect" class="input-field" onchange="updateEditCycleDateInput()"></select>
                        </div>
                        <div class="form-group">
                            <label>Nova Data de Início:</label>
                            <input type="date" id="editCycleStartDateInput" class="input-field">
                        </div>
                        <button class="btn-primary" onclick="confirmEditCurrentCycle()" style="width: 100%;">Salvar Alteração</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const groupSelect = document.getElementById('editCycleGroupSelect');
    if (groupSelect) {
        const groupsSet = new Set();
        (dashboardData.allResellers || dashboardData.resellers || []).forEach(r => groupsSet.add(r.group || 'Padrão'));
        const availableGroups = Array.from(groupsSet).sort();
        
        let options = '<option value="all">Todas as Turmas (Global)</option>';
        availableGroups.forEach(g => {
            options += `<option value="${g}" ${dashboardData.currentGroupFilter === g ? 'selected' : ''}>Turma: ${g}</option>`;
        });
        groupSelect.innerHTML = options;
    }

    updateEditCycleDateInput();

    document.getElementById('editCycleStartDateModal').classList.add('active');
}

function updateEditCycleDateInput() {
    const targetGroup = document.getElementById('editCycleGroupSelect').value;
    let targetDate = dashboardData.lastResetDate;

    if (targetGroup !== 'all') {
        if (dashboardData.config && dashboardData.config.groups && dashboardData.config.groups[targetGroup]) {
            targetDate = dashboardData.config.groups[targetGroup].lastResetDate || dashboardData.lastResetDate;
        }
    }

    if (targetDate) {
        document.getElementById('editCycleStartDateInput').value = new Date(targetDate).toISOString().split('T')[0];
    } else {
        document.getElementById('editCycleStartDateInput').value = '';
    }
}

async function confirmEditCurrentCycle() {
    const targetGroup = document.getElementById('editCycleGroupSelect').value;
    const dateStr = document.getElementById('editCycleStartDateInput').value;

    if (!dateStr) {
        showNotification('Selecione uma data.', 'error');
        return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const newTimestamp = new Date(year, month - 1, day, 0, 0, 0).getTime();
    
    if (!isNaN(newTimestamp)) {
        showLoading();
        try {
            if (targetGroup === 'all') {
                await configRef.child('ranking').update({ lastResetDate: newTimestamp });
            } else {
                await configRef.child(`ranking/groups/${targetGroup}`).update({ lastResetDate: newTimestamp });
            }
            document.getElementById('editCycleStartDateModal').classList.remove('active');
            hideLoading();
            showNotification('Data inicial do ciclo atualizada!');
            loadAdminDashboard();
        } catch (e) {
            hideLoading();
            console.error(e);
            showNotification('Erro ao atualizar data', 'error');
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
                            <label>Qual turma deseja zerar?</label>
                            <select id="rewardGroupSelect" class="input-field"></select>
                        </div>
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
    
    const groupSelect = document.getElementById('rewardGroupSelect');
    if (groupSelect) {
        const groupsSet = new Set();
        (dashboardData.allResellers || dashboardData.resellers || []).forEach(r => groupsSet.add(r.group || 'Padrão'));
        const availableGroups = Array.from(groupsSet).sort();
        
        let options = '<option value="all">Todas as Turmas (Global)</option>';
        availableGroups.forEach(g => {
            options += `<option value="${g}" ${dashboardData.currentGroupFilter === g ? 'selected' : ''}>Turma: ${g}</option>`;
        });
        groupSelect.innerHTML = options;
    }

    // Definir hoje como padrão
    document.getElementById('rewardResetDate').valueAsDate = new Date();
    document.getElementById('rewardRankingModal').classList.add('active');
}

async function confirmRewardRanking() {
    const targetGroup = document.getElementById('rewardGroupSelect').value;
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
        let previousResetDate = config.lastResetDate || 0;
        
        if (targetGroup !== 'all' && config.groups && config.groups[targetGroup]) {
            previousResetDate = config.groups[targetGroup].lastResetDate || previousResetDate;
        }

        // 2. Buscar dados para calcular os vencedores do ciclo atual
        const [salesSnapshot, usersSnapshot, settlementsSnapshot, goalsSnapshot] = await Promise.all([
            salesRef.once('value'),
            usersRef.once('value'), // Busca todos os usuários para garantir que acha o nome
            settlementsRef.once('value'), // Para nomes de revendedoras excluídas
            goalsRef.once('value') // Busca as metas internas atuais
        ]);

        const sales = [];
        salesSnapshot.forEach(child => { sales.push(child.val()); });
        
        const resellers = {};
        usersSnapshot.forEach(child => { 
            resellers[child.key] = child.val(); 
        });
        
        const deletedNames = {};
        settlementsSnapshot.forEach(child => {
            const s = child.val();
            if (s.resellerId && s.resellerName) deletedNames[s.resellerId] = s.resellerName;
        });
        
        const goalsData = {};
        if (goalsSnapshot) {
            goalsSnapshot.forEach(child => { goalsData[child.key] = child.val() || {}; });
        }

        // 3. Calcular ranking do ciclo que está encerrando (até o fim do dia de hoje)
        const today = new Date();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
        let cycleSales = sales.filter(s => 
            s.date >= previousResetDate && 
            s.date <= endOfToday &&
            s.productId !== 'ACERTO' && 
            s.category !== 'Financeiro'
        );

        const groupUids = targetGroup === 'all' 
            ? Object.keys(resellers) 
            : Object.keys(resellers).filter(uid => (resellers[uid].group || 'Padrão') === targetGroup);

        if (targetGroup !== 'all') {
            const groupUidsSet = new Set(groupUids);
            cycleSales = cycleSales.filter(s => groupUidsSet.has(s.resellerId));
        }
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
                total: rankingMap[uid],
                internalGoal: goalsData[uid]?.adminInternalGoal || 0 // Salva a meta interna do momento
            };
        }).sort((a, b) => b.total - a.total); // Salva o ranking completo

        // 4. Salvar no histórico se houver vencedores
        if (rankingList.length > 0) {
            await rankingHistoryRef.push({
                closedAt: Date.now(),
                cycleStartDate: previousResetDate,
                winners: rankingList,
                totalSales: totalCycleValue,
                group: targetGroup,
                participants: groupUids
            });
        }

        // 5. Atualizar data de reset para iniciar novo ciclo
        if (targetGroup === 'all') {
            await configRef.child('ranking').update({ lastResetDate: resetTimestamp });
        } else {
            await configRef.child(`ranking/groups/${targetGroup}`).update({ lastResetDate: resetTimestamp });
        }
        
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

    const { sales, canceledSales, resellers, rankingHistory, lastResetDate, productCategories } = dashboardData;
    if (!sales || !resellers) return;

    const filterSelect = document.getElementById('rankingCycleFilter');
    if (!filterSelect) return;

    const selectedValue = filterSelect.value;
    let startTs, endTs;

    if (selectedValue === 'current') {
        startTs = lastResetDate || 0;
        endTs = Infinity;
    } else {
        // Filtrar o histórico para garantir que usamos os fechamentos do grupo correto
        const currentGroup = dashboardData.currentGroupFilter || 'all';
        let filteredHistory = rankingHistory || [];
        if (currentGroup !== 'all') {
            filteredHistory = filteredHistory.filter(h => h.group === currentGroup || h.group === 'all' || !h.group);
        }
        const historyItem = filteredHistory.find(h => h.id === selectedValue);
        if (historyItem) {
            startTs = historyItem.cycleStartDate || 0;
            // Usa fim do dia do closedAt para incluir todas as vendas daquele dia
            const closedDate = new Date(historyItem.closedAt);
            endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
        } else {
            startTs = 0;
                endTs = Infinity;
        }
    }

    // --- ATUALIZAR MÉTRICAS DO DASHBOARD (CAIXA E GRÁFICOS) ---
    // Filtrar vendas para os totais (respeitando filtro de revendedora se houver)
    const resellerFilterEl = document.getElementById('dashboardResellerFilter');
    const currentResellerId = resellerFilterEl ? resellerFilterEl.value : '';

    const dashboardSales = sales.filter(s => {
        let customStartTs = startTs;
         const rGroup = (dashboardData.allResellers.find(r => r.id === s.resellerId) || {}).group || 'Padrão';
        if (selectedValue === 'current' && dashboardData.currentGroupFilter === 'all') {
            if (dashboardData.config && dashboardData.config.groups && dashboardData.config.groups[rGroup]) {
                 customStartTs = dashboardData.config.groups[rGroup].lastResetDate || dashboardData.lastResetDate;
            }
        }

        if (selectedValue === 'current' && dashboardData.currentGroupFilter !== 'all' && rGroup !== dashboardData.currentGroupFilter) {
            return false;
        }

        const sDate = Number(s.date) || Number(s.dateApprox) || 0;
        if (sDate < customStartTs || sDate > endTs) return false;
        if (currentResellerId && s.resellerId !== currentResellerId) return false;

        if (selectedValue !== 'current') {
            const hItem = (rankingHistory || []).find(h => h.id === selectedValue);
            if (hItem && hItem.group && hItem.group !== 'all') {
                if (hItem.participants) {
                    if (!hItem.participants.includes(s.resellerId)) return false;
                } else if (hItem.winners && hItem.winners.length > 0) {
                    const inWinners = hItem.winners.some(w => w.uid === s.resellerId);
                    if (!inWinners && rGroup !== hItem.group) return false;
                } else {
                    if (rGroup !== hItem.group) return false;
                }
            }
        }
        return true;
    });

    const dashboardCanceled = (canceledSales || []).filter(s => {
        let customStartTs = startTs;
          const rGroup = (dashboardData.allResellers.find(r => r.id === s.resellerId) || {}).group || 'Padrão';
        if (selectedValue === 'current' && dashboardData.currentGroupFilter === 'all') {
            if (dashboardData.config && dashboardData.config.groups && dashboardData.config.groups[rGroup]) {
                 customStartTs = dashboardData.config.groups[rGroup].lastResetDate || dashboardData.lastResetDate;
            }
        }
       
        if (selectedValue === 'current' && dashboardData.currentGroupFilter !== 'all' && rGroup !== dashboardData.currentGroupFilter) {
            return false;
        }

        const sDate = Number(s.date) || Number(s.dateApprox) || 0;
        if (sDate < customStartTs || sDate > endTs) return false;
        if (currentResellerId && s.resellerId !== currentResellerId) return false;
        
        if (selectedValue !== 'current') {
            const hItem = (rankingHistory || []).find(h => h.id === selectedValue);
            if (hItem && hItem.group && hItem.group !== 'all') {
                if (hItem.participants) {
                    if (!hItem.participants.includes(s.resellerId)) return false;
                } else if (hItem.winners && hItem.winners.length > 0) {
                    const inWinners = hItem.winners.some(w => w.uid === s.resellerId);
                    if (!inWinners && rGroup !== hItem.group) return false;
                } else {
                    if (rGroup !== hItem.group) return false;
                }
            }
        }
        return true;
    });

    const dashboardProductSales = dashboardSales.filter(s => !isFinancialSale(s));
    const dashboardFinancialSales = dashboardSales.filter(s => isFinancialSale(s));

    const totalVal = dashboardProductSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const totalCount = new Set(dashboardProductSales.map(s => s.groupId || s.id)).size;
    const totalAcertos = dashboardFinancialSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    // Atualizar Elementos do DOM
    const totalEl = document.getElementById('adminTotalSales');
    const countEl = document.getElementById('adminTotalCount');
    const acertosEl = document.getElementById('adminTotalAcertos');

    if (totalEl) totalEl.innerHTML = formatCurrency(totalVal);
    if (countEl) countEl.innerHTML = formatNumberHidden(totalCount);
    if (acertosEl) acertosEl.innerHTML = formatCurrency(totalAcertos);

    // Atualizar Meta Admin
    let adminGoalContainer = document.getElementById('adminGoalContainer');
    if (adminGoalContainer) {
        if (selectedValue === 'current') {
            adminGoalContainer.style.display = 'block';
            const adminGoal = dashboardData.adminGoal || 0;
            const adminGoalEndDate = dashboardData.adminGoalEndDate || 0;
            const progressPct = adminGoal > 0 ? (totalVal / adminGoal) * 100 : 0;
            const remaining = Math.max(0, adminGoal - totalVal);
            const surplus = Math.max(0, totalVal - adminGoal);
            
            let barHtml = '';
            if (adminGoal > 0) {
                if (totalVal <= adminGoal) {
                    barHtml = `<div style="background: #d4a574; width: ${progressPct}%; height: 100%; transition: width 0.3s ease;"></div>`;
                } else {
                    const goalWidth = (adminGoal / totalVal) * 100;
                    const surplusWidth = (surplus / totalVal) * 100;
                    barHtml = `
                        <div style="background: #28a745; width: ${goalWidth}%; height: 100%; transition: width 0.3s ease; border-right: 2px solid #fff;"></div>
                        <div style="background: #17a2b8; width: ${surplusWidth}%; height: 100%; transition: width 0.3s ease;" title="Excedente: ${formatCurrency(surplus)}"></div>
                    `;
                }
            }

            let statusHtml = '';
            if (adminGoal > 0) {
                if (totalVal <= adminGoal) {
                    statusHtml = `
                        <div style="font-size: 0.8em; color: #555; text-align: center;">
                            ${progressPct.toFixed(1)}% alcançado
                            ${remaining > 0 ? `<br>Faltam <strong>${formatCurrency(remaining)}</strong>` : ''}
                        </div>
                    `;
                } else {
                    statusHtml = `
                        <div style="font-size: 0.8em; color: #555; text-align: center;">
                            <span style="color: #28a745; font-weight: bold;">${progressPct.toFixed(1)}% alcançado</span>
                            <br><strong>Meta Batida! 🎉</strong> | Excedente: <strong style="color: #17a2b8;">${formatCurrency(surplus)}</strong>
                        </div>
                    `;
                }
            } else {
                statusHtml = '<div style="font-size: 0.8em; color: #888; text-align: center;">Defina uma meta para acompanhar.</div>';
            }
            
            const now = Date.now();
            let daysHtml = '';
            
            if (dashboardData.lastResetDate > 0) {
                const daysElapsed = Math.floor(Math.max(0, now - dashboardData.lastResetDate) / 86400000);
                daysHtml += `<span>Dias corridos: <strong>${daysElapsed}</strong></span>`;
            }
            
            if (adminGoalEndDate > 0) {
                const daysRemaining = Math.ceil(Math.max(0, adminGoalEndDate - now) / 86400000);
                daysHtml += `<span style="margin-left: 10px;">Faltam: <strong>${daysRemaining}</strong> dias</span>`;
            }
            
            const daysDisplay = daysHtml ? `<div style="font-size: 0.8em; color: #555; text-align: center; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #eee;">${daysHtml}</div>` : '';

            adminGoalContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 0.85em; color: #666;">
                    <span>Meta: <strong>${formatCurrency(adminGoal)}</strong></span>
                    <button onclick="openAdminGoalModal()" style="background: none; border: none; color: #4a90e2; cursor: pointer; text-decoration: underline; font-size: 0.9em; padding: 0;">Editar Meta</button>
                </div>
                <div style="background: #eee; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 5px; display: flex;">
                    ${barHtml}
                </div>
                ${statusHtml}
                ${daysDisplay}
            `;
        } else {
            adminGoalContainer.style.display = 'none';
        }
    }

    // Atualizar Gráficos se as categorias estiverem disponíveis
    if (productCategories) {
        dashboardData.currentCycleStartTs = startTs;
        dashboardData.currentCycleEndTs = endTs;
        
        currentDashboardProductSales = dashboardProductSales;
        currentDashboardCanceledSales = dashboardCanceled.filter(s => !isFinancialSale(s));
        drawPerformanceChart();

        const salesByCategory = {};
        const countByCategory = {};
        const salesByFullCategory = {};
        const countByFullCategory = {};
        let totalPieUnits = 0;
        
        dashboardProductSales.forEach(sale => {
            const fullCategory = productCategories[sale.productId] || 'Outros';
            const parentCategory = fullCategory.split('>')[0].trim();

            salesByCategory[parentCategory] = (salesByCategory[parentCategory] || 0) + (Number(sale.price) || 0);
            countByCategory[parentCategory] = (countByCategory[parentCategory] || 0) + 1;

            salesByFullCategory[fullCategory] = (salesByFullCategory[fullCategory] || 0) + (Number(sale.price) || 0);
            countByFullCategory[fullCategory] = (countByFullCategory[fullCategory] || 0) + 1;
            totalPieUnits++;
        });
         const categoryLabels = Object.keys(salesByCategory).map(cat => `${cat} (${countByCategory[cat]} un)`);
        renderCategoryChart(categoryLabels, Object.values(salesByCategory), 'Vendas por Categoria (R$)');
        updateCategoryTotalDisplay(totalPieUnits, salesByFullCategory, countByFullCategory);
    }

    // --- ATUALIZAR LISTA DE RANKING ---
    const filteredSales = sales.filter(s => {
        if (s.productId === 'ACERTO' || s.category === 'Financeiro') return false;
        let customStartTs = startTs;
        const rGroup = (dashboardData.allResellers.find(r => r.id === s.resellerId) || {}).group || 'Padrão';
        if (selectedValue === 'current' && dashboardData.currentGroupFilter === 'all') {
            if (dashboardData.config && dashboardData.config.groups && dashboardData.config.groups[rGroup]) {
                 customStartTs = dashboardData.config.groups[rGroup].lastResetDate || dashboardData.lastResetDate;
            }
        }

        if (selectedValue === 'current' && dashboardData.currentGroupFilter !== 'all' && rGroup !== dashboardData.currentGroupFilter) {
            return false;
        }
        

        const sDate = Number(s.date) || Number(s.dateApprox) || 0;
        if (sDate < customStartTs || sDate > endTs) return false;        // No ciclo atual, excluir vendas já liquidadas (acertadas em ciclos anteriores)
        if (selectedValue === 'current' && s.isSettled) return false;
        if (selectedValue !== 'current') {
            const hItem = (rankingHistory || []).find(h => h.id === selectedValue);
            if (hItem && hItem.group && hItem.group !== 'all') {
                if (hItem.participants) {
                    if (!hItem.participants.includes(s.resellerId)) return false;
                } else if (hItem.winners && hItem.winners.length > 0) {
                    const inWinners = hItem.winners.some(w => w.uid === s.resellerId);
                    if (!inWinners && rGroup !== hItem.group) return false;
                } else {
                    if (rGroup !== hItem.group) return false;
                }
            }
        }
        return true;
    });

    // Montar mapa de nomes: revendedoras ativas + nomes salvos no histórico (para excluídas)
    const nameMap = {};
    const tagsMap = {};
    resellers.forEach(r => {
        nameMap[r.id] = r.name;
        tagsMap[r.id] = r.tags || [];
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
            totalsMap[s.resellerId] = { 
                name: nameMap[s.resellerId] || 'Revendedora Excluída', 
                total: 0, 
                count: 0,
                tags: tagsMap[s.resellerId] || []
            };
        }
        totalsMap[s.resellerId].total += (Number(s.price) || 0);
        totalsMap[s.resellerId].count++;
    });

    const ranking = Object.values(totalsMap)
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total);

    if (ranking.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 15px; color: #666;">Nenhuma venda neste ciclo.</div>';
        return;
    }

    container.innerHTML = ranking.map((r, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        const isTop = index === 0;
        
        let tagsHtml = '';
        if (r.tags && r.tags.length > 0) {
            tagsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">` + 
                r.tags.map(t => `<span style="background-color: ${t.color}; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${t.name}</span>`).join('') + 
            `</div>`;
        }
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${isTop ? '#fffde7' : '#f8f9fa'}; border-radius: 6px; border: 1px solid ${isTop ? '#fbc02d' : '#eee'};">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2em; font-weight: bold; width: 30px; text-align: center;">${medal}</span>
                    <div>
                        <div style="font-weight: 600; color: #333;">${r.name}</div>
                        <div style="font-size: 0.8em; color: #666;">${formatNumberHidden(r.count)} vendas</div>
                        ${tagsHtml}
                    </div>
                </div>
                <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${formatCurrency(r.total)}</div>
            </div>
        `;
    }).join('');
}

function renderBirthdaysOfTheMonth(resellers) {
    let container = document.getElementById('adminBirthdaysContainer');
    
    if (!container) {
        const dashboard = document.getElementById('adminDashboard');
        if (dashboard) {
            container = document.createElement('div');
            container.id = 'adminBirthdaysContainer';
            container.style.marginTop = '20px';
            container.style.padding = '20px';
            container.style.backgroundColor = 'white';
            container.style.borderRadius = '8px';
            container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            
            const rankingContainer = document.getElementById('adminRankingContainer');
            if (rankingContainer) {
                dashboard.insertBefore(container, rankingContainer);
            } else {
                dashboard.appendChild(container);
            }
        } else {
            return;
        }
    }

    const today = new Date();
    const currentMonth = today.getMonth() + 1;

    const birthdays = resellers.filter(r => {
        if (!r.birthDate || r.isDeleted) return false;
        const parts = r.birthDate.split('-');
        return parts.length === 3 && parseInt(parts[1], 10) === currentMonth;
    }).map(r => ({
        ...r, 
        birthDay: parseInt(r.birthDate.split('-')[2], 10)
    })).sort((a, b) => a.birthDay - b.birthDay);

    if (birthdays.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let html = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;"><h3 style="margin: 0; color: #2c1810;">🎂 Aniversariantes de ${monthNames[today.getMonth()]}</h3></div><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">`;

    birthdays.forEach(r => {
        const isToday = r.birthDay === today.getDate();
        const highlightStyle = isToday ? 'border: 1px solid #d4a574; background: #fffaf0;' : 'border: 1px solid #eee; background: #fdfdfd;';
        const badge = isToday ? '<span style="font-size: 0.7em; background: #d4a574; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px; font-weight: bold;">Hoje! 🎉</span>' : '';
        let cleanPhone = r.phone ? r.phone.replace(/\D/g, '') : '';
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
        const waBtn = cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Feliz aniversário, ${r.name}! 🎉 Que seu dia seja muito especial!`)}" target="_blank" style="text-decoration: none; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #e8f5e9; border-radius: 50%;" title="Enviar mensagem no WhatsApp"><svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>` : '';
        html += `<div style="padding: 12px; border-radius: 6px; ${highlightStyle} display: flex; justify-content: space-between; align-items: center;"><div><div style="font-weight: 600; color: #333; font-size: 0.95em; margin-bottom: 2px;">${r.name}</div><div style="font-size: 0.85em; color: #666;">Dia ${String(r.birthDay).padStart(2, '0')} ${badge}</div></div>${waBtn}</div>`;
    });
    container.innerHTML = html + '</div>';
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
        let settlements = [];
        snapshot.forEach(child => {
            settlements.push({ id: child.key, ...child.val() });
        });

        // Filtrar pelas turmas se necessário
        const groupFilterSelect = document.getElementById('dashboardGroupFilter');
        const currentGroupFilter = groupFilterSelect ? groupFilterSelect.value : 'all';

        if (currentGroupFilter !== 'all') {
            if (typeof dashboardData !== 'undefined' && dashboardData.allResellers) {
                 const groupResellerIds = new Set(dashboardData.allResellers.filter(r => (r.group || 'Padrão') === currentGroupFilter).map(r => r.id));
                 settlements = settlements.filter(s => groupResellerIds.has(s.resellerId));
            } else {
                 const usersSnap = await usersRef.once('value');
                 const groupResellerIds = new Set();
                 usersSnap.forEach(uSnap => {
                     const u = uSnap.val();
                     if ((u.group || 'Padrão') === currentGroupFilter) groupResellerIds.add(uSnap.key);
                 });
                 settlements = settlements.filter(s => groupResellerIds.has(s.resellerId));
            }
        }

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
                            <div>Faturamento: <strong>${formatCurrency(s.totalSold)}</strong></div>
                            ${s.totalDiscount > 0 ? `<div style="font-size: 0.85em; color: #dc3545; margin-bottom: 2px;">Desc: -${formatCurrency(s.totalDiscount)}</div>` : ''}
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
            await usersRef.parent.update(ordersUpdates);
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
    const imageUrlEl = document.getElementById('productImage');
    const imageUrl = imageUrlEl ? imageUrlEl.value.trim() : '';

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
            imageUrl: imageUrl,
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
        if (imageUrlEl) imageUrlEl.value = '';

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

        container.innerHTML = toolbarHtml + products.map(product => {
            const safeImgUrl = getDirectImageUrl(product.imageUrl);
            const imgThumb = safeImgUrl ? `<img src="${safeImgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px; border: 1px solid #eee;">` : `<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa;">Img</div>`;
            return `
            <div class="admin-product-item">
                <div style="margin-right: 15px; display: flex; align-items: center;">
                    <input type="checkbox" class="product-checkbox" value="${product.id}">
                </div>
                ${imgThumb}
                <div class="product-info">
                    <div class="product-name">${product.name} ${product.technicalName ? `<span style="font-size: 0.85em; color: #888; font-weight: normal;">(Téc: ${product.technicalName})</span>` : ''}</div>
                    <div class="product-code">Código: ${product.code}${product.code2 ? ` | Ref. 2: ${product.code2}` : ''} | Categoria: ${product.category}</div>
                    <div class="product-price">${formatCurrency(product.price)} | Disponível: ${product.available}/${product.quantity}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-secondary" onclick="openEditProductModal('${product.id}')" style="margin-right: 5px;">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
                </div>
            </div>
        `}).join('');

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
        
        if (!document.getElementById('editProductTechnicalName')) {
            const nameInput = document.getElementById('editProductName');
            if (nameInput) {
                const newFormGroup = document.createElement('div');
                newFormGroup.className = 'form-group';
                newFormGroup.innerHTML = '<label>Nome Técnico (Apenas Admin)</label><input type="text" id="editProductTechnicalName" class="input-field">';
                nameInput.parentNode.parentNode.insertBefore(newFormGroup, nameInput.parentNode.nextSibling);
                const nameLabel = nameInput.parentNode.querySelector('label');
                if (nameLabel) nameLabel.textContent = 'Nome Comercial';
            }
        }
        
        const techInput = document.getElementById('editProductTechnicalName');
        if (techInput) techInput.value = product.technicalName || '';

        document.getElementById('editProductCode').value = product.code;
        document.getElementById('editProductCategory').value = product.category;
        document.getElementById('editProductQuantity').value = product.quantity;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductBarcode').value = product.barcode || '';
        if (document.getElementById('editProductImage')) document.getElementById('editProductImage').value = product.imageUrl || '';

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

    const techInput = document.getElementById('editProductTechnicalName');
    if (techInput) updates.technicalName = techInput.value.trim();

    const imageUrlEl = document.getElementById('editProductImage');
    if (imageUrlEl) updates.imageUrl = imageUrlEl.value.trim();

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
    
    // Injetar botão de download do modelo se não existir
    if (!document.getElementById('downloadTemplateBtn')) {
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            const btnContainer = document.createElement('div');
            btnContainer.style.marginBottom = '15px';
            btnContainer.style.textAlign = 'right';
            btnContainer.innerHTML = `
                <button id="downloadTemplateBtn" type="button" class="btn-secondary" onclick="downloadImportTemplate()" style="padding: 6px 12px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px; margin: 0; border: 1px solid #ddd;">
                    📥 Baixar Modelo
                </button>
            `;
            fileInput.parentNode.insertBefore(btnContainer, fileInput);
        }
    }

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

function downloadImportTemplate() {
    const data = [
        {
            'Nome Comercial': 'Colar Dourado Exemplo',
            'Nome Técnico': 'Colar Dourado 18k',
            'Código': 'COL001',
            'Ref. 2': '',
            'Categoria': 'Colares',
            'Quantidade': 10,
            'Preço': 89.90,
            'Código de Barras': '7891234567890',
                'URL 1': 'https://link.da.imagem.com/foto.jpg',
                'URL 2': ''
        },
        {
            'Nome Comercial': 'Brinco Prata Exemplo',
            'Nome Técnico': 'Brinco Prata 925 Argola',
            'Código': 'BRI002',
            'Ref. 2': 'BR-ARG-P',
            'Categoria': 'Brincos',
            'Quantidade': 5,
            'Preço': 45.50,
            'Código de Barras': '',
                'URL 1': '',
                'URL 2': ''
        }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo_Importacao");
    XLSX.writeFile(wb, "modelo_importacao_produtos.xlsx");
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

            let importRefsCount = 0;
            let importItemsCount = 0;
            const updates = {};
            const newProductIds = [];

            jsonData.forEach(row => {
                const commercialName = row['Nome Comercial'] || row['nome comercial'] || row.Nome || row.nome || row.Produto || row.produto || '';
                const technicalName = row['Nome Técnico'] || row['nome técnico'] || row['Nome Tecnico'] || row['nome tecnico'] || '';
                
                const finalName = commercialName || technicalName;
                const code = row.Código || row.codigo || row.Codigo || row.Referência || row.referencia;
                const code2 = row['Ref. 2'] || row['ref. 2'] || row['Ref 2'] || row['ref 2'] || row['Referência 2'] || row['referencia 2'] || '';
                const category = row.Categoria || row.categoria;
                const quantity = parseInt(row.Quantidade || row.quantidade || row.Qtd || row.qtd || row.Quant || row.quant || 1);
                const price = parseFloat(row.Preço || row.preco || row.Preco || row.Valor || row.valor || 0);
                const barcode = row['Código de Barras'] || row['codigo de barras'] || row.Barcode || row.barcode || '';
                const imageUrl = row['URL 1'] || row['url 1'] || row['Link da Imagem'] || row['link da imagem'] || row.Imagem || row.imagem || row.Image || row.image || row['URL da Imagem'] || '';

                // Capturar todas as colunas de URL dinamicamente (URL 1, URL 2, etc.)
                const additionalUrls = {};
                Object.keys(row).forEach(key => {
                    const lowerKey = key.toLowerCase().trim();
                    if (lowerKey.startsWith('url')) {
                        const urlValue = String(row[key]).trim();
                        if (urlValue) {
                            // Converte "URL 2" para "url2", "URL 3" para "url3", etc.
                            const suffix = lowerKey.replace('url', '').trim();
                            const propName = suffix ? `url${suffix}` : 'url';
                            additionalUrls[propName] = urlValue;
                        }
                    }
                });

                if (finalName && code && !isNaN(price)) {
                    const productId = generateId();
                    newProductIds.push(productId);
                    updates[`products/${productId}`] = {
                        name: finalName,
                        technicalName: technicalName,
                        code,
                        code2,
                        category: category || 'Sem categoria',
                        quantity,
                        price,
                        barcode,
                        imageUrl,
                        available: quantity,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        ...additionalUrls
                    };
                    importRefsCount++;
                    importItemsCount += quantity;
                }
            });

            await usersRef.parent.update(updates);

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

                showNotification(`${importItemsCount} peças (${importRefsCount} modelos) importadas, pedido gerado e data de acerto atualizada!`);
                loadOrders();
            } else {
                showNotification(`${importItemsCount} peças (${importRefsCount} modelos) importadas com sucesso!`);
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
    const modalBody = document.querySelector('#addResellerModal .modal-body');
    if (modalBody && !document.getElementById('resellerBirthDate')) {
        const btn = modalBody.querySelector('.btn-primary');
        const formGroupDate = document.createElement('div');
        formGroupDate.className = 'form-group';
        formGroupDate.innerHTML = '<label>Data de Nascimento</label><input type="date" id="resellerBirthDate" class="input-field">';
        
        const formGroupCycle = document.createElement('div');
        formGroupCycle.className = 'form-group';
        formGroupCycle.innerHTML = '<label>Grupo de Ciclo (Ex: Turma 1, Turma 2)</label><input type="text" id="resellerGroup" class="input-field" placeholder="Padrão">';
    if (btn) {
            modalBody.insertBefore(formGroupDate, btn);
            modalBody.insertBefore(formGroupCycle, btn);
        } else {
            modalBody.appendChild(formGroupDate);
            modalBody.appendChild(formGroupCycle);
        }
    }
    document.getElementById('addResellerModal').classList.add('active');
}

function closeAddResellerModal() {
    document.getElementById('addResellerModal').classList.remove('active');
    document.getElementById('newResellerName').value = '';
    document.getElementById('resellerEmail').value = '';
    document.getElementById('resellerPassword').value = '';
    document.getElementById('resellerPhone').value = '';
    if (document.getElementById('resellerBirthDate')) document.getElementById('resellerBirthDate').value = '';
}

async function saveReseller() {
    const name = document.getElementById('newResellerName').value.trim();
    const email = document.getElementById('resellerEmail').value.trim();
    const password = document.getElementById('resellerPassword').value;
    const phone = document.getElementById('resellerPhone').value.trim();
    const birthDate = document.getElementById('resellerBirthDate') ? document.getElementById('resellerBirthDate').value : '';
    const group = document.getElementById('resellerGroup') ? document.getElementById('resellerGroup').value.trim() || 'Padrão' : 'Padrão';

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
            birthDate,
            group,
            role: 'reseller',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Registrar no global_users para multi-tenancy
        if (typeof globalUsersRef !== 'undefined' && currentUser && currentUser.companyId && currentUser.companyId !== 'legacy') {
            try {
                const globalSnap = await globalUsersRef.child(user.uid).once('value');
                const globalData = globalSnap.val() || { companies: {} };
                
                let companies = globalData.companies || {};
                if (globalData.companyId && !companies[globalData.companyId]) {
                     companies[globalData.companyId] = { role: globalData.role || 'reseller', companyName: 'Empresa Anterior' };
                }
                
                let compName = 'Empresa Associada';
                try {
                     const pubSnap = await configRef.child('public/companyName').once('value');
                     if (pubSnap.val()) compName = pubSnap.val();
                } catch(e){}

                companies[currentUser.companyId] = {
                    role: 'reseller',
                    companyName: compName
                };
                
                await globalUsersRef.child(user.uid).update({
                    companyId: currentUser.companyId,
                    role: 'reseller',
                    companies: companies
                });
            } catch (e) { console.error('Erro ao registrar no global_users:', e); }
        }

        // Limpar instância secundária
        await secondaryAuth.signOut();
        await secondaryApp.delete();

        closeAddResellerModal();

        // Aplicar comissão padrão se existir
        try {
            const group = document.getElementById('resellerGroup') ? document.getElementById('resellerGroup').value.trim() || 'Padrão' : 'Padrão';
            
            let defaultTiers = null;
            const groupConfigSnap = await configRef.child(`defaultCommissionsGroups/${group}`).once('value');
            if (groupConfigSnap.exists()) {
                defaultTiers = groupConfigSnap.val();
            } else {
                const configSnapshot = await configRef.child('defaultCommissions').once('value');
                defaultTiers = configSnapshot.val();
            }

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
                    birthDate,
                    role: 'reseller',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    isDeleted: null // Garante que não está deletado
                });

                // NOVO: Adicionar esta empresa ao global_users do usuário
                if (typeof globalUsersRef !== 'undefined' && currentUser && currentUser.companyId && currentUser.companyId !== 'legacy') {
                    try {
                        const globalSnap = await globalUsersRef.child(user.uid).once('value');
                        const globalData = globalSnap.val() || { companies: {} };
                        
                        let companies = globalData.companies || {};
                        if (globalData.companyId && !companies[globalData.companyId]) {
                             companies[globalData.companyId] = { role: globalData.role || 'reseller', companyName: 'Empresa Anterior' };
                        }
                        
                        let compName = 'Empresa Associada';
                        try {
                             const pubSnap = await configRef.child('public/companyName').once('value');
                             if (pubSnap.val()) compName = pubSnap.val();
                        } catch(e){}

                        companies[currentUser.companyId] = {
                            role: 'reseller',
                            companyName: compName
                        };
                        
                        await globalUsersRef.child(user.uid).update({
                            companyId: currentUser.companyId,
                            role: 'reseller',
                            companies: companies
                        });
                    } catch (e) { console.error('Erro ao registrar no global_users:', e); }
                }

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
    loadResellers();
}

async function loadResellers(silent = false) {
    if (!silent) showLoading();
    
    try {
        const [resellersSnapshot, salesSnapshot, settlementsSnapshot, configSnapshot, historySnapshot] = await Promise.all([
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            salesRef.once('value'),
            settlementsRef.once('value'),
            configRef.child('ranking').once('value'),
            rankingHistoryRef.orderByChild('closedAt').once('value')
        ]);

        const config = configSnapshot.val() || {};
        const lastReset = config.lastResetDate || 0;

        const cycleSelector = document.getElementById('resellerCycleSelector');
        const selectedCycleValue = cycleSelector ? cycleSelector.value : 'current';

        const history = [];
        historySnapshot.forEach(c => { 
            history.push({id: c.key, ...c.val()}); 
        });
        history.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0)); // Garante a ordenação segura do mais recente para o antigo

        let startTs = lastReset;
        let endTs = Date.now();

        if (selectedCycleValue !== 'current') {
            const hItem = history.find(h => h.id === selectedCycleValue);
            if (hItem) {
                startTs = hItem.cycleStartDate || 0;
                const closedDate = new Date(hItem.closedAt);
                endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
            }
        }
        
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
        
        // Ordenar alfabeticamente
        resellers.sort((a, b) => a.name.localeCompare(b.name));

        const viewMode = localStorage.getItem('resellerViewMode') || 'grid';
        const isListMode = viewMode === 'list';

        // Configurar Grid Layout para os cards
        container.style.display = isListMode ? 'flex' : 'grid';
        container.style.flexDirection = isListMode ? 'column' : '';
        container.style.gridTemplateColumns = isListMode ? '' : 'repeat(auto-fill, minmax(280px, 1fr))';
        container.style.gap = isListMode ? '10px' : '15px';
        
        if (resellers.length === 0) {
            container.style.display = 'block'; // Resetar para mensagem
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p class="empty-text">Nenhuma revendedora cadastrada</p>
                </div>
            `;
            if (!silent) hideLoading();
            return;
        }

        // Extrair todas as etiquetas exclusivas para o filtro
        const allTagsMap = new Map();
        resellers.forEach(r => {
            if (!r.isDeleted && r.tags) r.tags.forEach(t => allTagsMap.set(t.name, t.color));
        });
        const savedTagFilter = localStorage.getItem('resellerTagFilter') || '';
        let tagFilterHtml = '';
        if (allTagsMap.size > 0) {
            tagFilterHtml = `<select id="resellerTagSelector" onchange="localStorage.setItem('resellerTagFilter', this.value); loadResellers()" class="input-field" style="width: auto; margin: 0; padding: 8px; min-width: 150px;"><option value="">🏷️ Todos os Marcadores</option>${Array.from(allTagsMap.keys()).sort().map(t => `<option value="${t}" ${savedTagFilter === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
        }
        
        const allGroupsMap = new Set();
        resellers.forEach(r => allGroupsMap.add(r.group || 'Padrão'));
        const savedGroupFilter = localStorage.getItem('resellerGroupFilter') || 'all';
        let groupFilterHtml = '';
        if (allGroupsMap.size > 0) {
            groupFilterHtml = `<select id="resellerGroupFilter" onchange="localStorage.setItem('resellerGroupFilter', this.value); loadResellers()" class="input-field" style="width: auto; margin: 0; padding: 8px; min-width: 150px;">
                <option value="all">👥 Todas as Turmas</option>
                ${Array.from(allGroupsMap).sort().map(g => `<option value="${g}" ${savedGroupFilter === g ? 'selected' : ''}>Turma: ${g}</option>`).join('')}
            </select>`;
        }

        // Preparar opções do seletor de ciclo
        let cycleOptions = `<option value="current">Ciclo Atual (Desde ${formatDate(lastReset)})</option>`;
        history.forEach(h => {
            cycleOptions += `<option value="${h.id}">Ciclo encerrado em ${formatDate(h.closedAt)}</option>`;
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
                <button id="btnBatchDiscounts" class="btn-primary" onclick="openBatchDiscountModal()" style="background-color: #ffc107; color: #ffffffff; width: auto; margin: 0; border: none;">💸 Descontos em Lote</button>
                <button id="btnGlobalCatalogConfig" class="btn-primary" onclick="openGlobalCatalogConfigModal()" style="background-color: #4a90e2; color: #fff; width: auto; margin: 0; border: none;">🖼️ Imagens do Catálogo</button>
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <input type="checkbox" id="hideDeletedResellers" onchange="localStorage.setItem('hideDeletedResellers', this.checked); loadResellers()" ${isHiddenSaved ? 'checked' : ''}>
                    <span style="font-size: 0.9em; font-weight: 500; color: #555;">Ocultar Excluídas</span>
                </label>
                <input type="text" id="resellerSearchInput" placeholder="🔍 Buscar revendedora..." class="input-field" oninput="filterResellersList()" style="width: auto; margin: 0; flex: 1; min-width: 150px;">
                <select id="resellerCycleSelector" onchange="applyResellerCycleFilter(this)" class="input-field" style="width: auto; margin: 0; padding: 8px; min-width: 200px;">
                    ${cycleOptions}
                </select>
                ${groupFilterHtml}
                ${tagFilterHtml}
                <div style="display: flex; gap: 5px;">
                    <button class="btn-secondary" onclick="toggleAllResellerCards()" style="padding: 8px; margin: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5em; width: 40px; height: 38px; font-weight: bold; line-height: 1;" id="resellerToggleAllBtn" title="Expandir/Minimizar Todos">+</button>
                    <button class="btn-secondary" onclick="toggleResellerViewMode()" style="padding: 8px; margin: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2em; width: 40px; height: 38px;" id="resellerViewModeBtn" title="Alternar Visualização">
                        ${isListMode ? '⊞' : '☰'}
                    </button>
                </div>
            `;
            
            // Remover botão antigo se existir para evitar duplicidade
            const oldBtn = document.getElementById('btnGlobalCommissions');
            if (oldBtn && oldBtn.parentNode && oldBtn.parentNode.id !== 'resellerControls') {
                oldBtn.parentNode.remove();
            }

            if (container.parentNode) container.parentNode.insertBefore(controlsDiv, container);
            document.getElementById('resellerCycleSelector').value = selectedCycleValue;
        } else {
            // Se já existe, garante que as opções estão atualizadas (caso um ciclo tenha acabado de fechar)
            const selector = document.getElementById('resellerCycleSelector');
            if (selector) {
                selector.innerHTML = cycleOptions;
                selector.value = selectedCycleValue;
            }
            const existingTagSel = document.getElementById('resellerTagSelector');
            if (existingTagSel) {
                const currentVal = existingTagSel.value;
                existingTagSel.innerHTML = `<option value="">🏷️ Todos os Marcadores</option>` + Array.from(allTagsMap.keys()).sort().map(t => `<option value="${t}">${t}</option>`).join('');
                existingTagSel.value = currentVal;
            } else if (allTagsMap.size > 0) {
                document.getElementById('resellerControls').insertAdjacentHTML('beforeend', tagFilterHtml);
            }
            
            const existingGroupSel = document.getElementById('resellerGroupFilter');
            if (existingGroupSel) {
                const currentGVal = existingGroupSel.value;
                existingGroupSel.innerHTML = `<option value="all">👥 Todas as Turmas</option>` + Array.from(allGroupsMap).sort().map(g => `<option value="${g}">${g}</option>`).join('');
                existingGroupSel.value = currentGVal;
            } else if (allGroupsMap.size > 0) {
                const cycSel = document.getElementById('resellerCycleSelector');
                if (cycSel) cycSel.insertAdjacentHTML('afterend', groupFilterHtml);
            }
            const viewBtn = document.getElementById('resellerViewModeBtn');
            if (viewBtn) {
                viewBtn.innerHTML = isListMode ? '⊞' : '☰';
                viewBtn.title = isListMode ? 'Mudar para Grade' : 'Mudar para Lista';
            }
            const toggleAllBtn = document.getElementById('resellerToggleAllBtn');
            if (toggleAllBtn) {
                toggleAllBtn.textContent = '+';
            }

            // Injetar campo de busca caso não exista no controle
            if (!document.getElementById('resellerSearchInput')) {
                const searchHtml = `<input type="text" id="resellerSearchInput" placeholder="🔍 Buscar revendedora..." class="input-field" oninput="filterResellersList()" style="width: auto; margin: 0; flex: 1; min-width: 150px;">`;
                const cycleSel = document.getElementById('resellerCycleSelector');
                if (cycleSel) {
                    cycleSel.insertAdjacentHTML('beforebegin', searchHtml);
                }
            }
        }

        const hideDeleted = document.getElementById('hideDeletedResellers') ? document.getElementById('hideDeletedResellers').checked : (localStorage.getItem('hideDeletedResellers') === 'true');
        const activeTagFilter = document.getElementById('resellerTagSelector') ? document.getElementById('resellerTagSelector').value : savedTagFilter;
        const activeGroupFilter = document.getElementById('resellerGroupFilter') ? document.getElementById('resellerGroupFilter').value : savedGroupFilter;

        const renderedItems = resellers.map(reseller => {
            // Se estiver marcada para ocultar e for excluída, não renderiza
            if (reseller.isDeleted && hideDeleted) return '';
            
            // Se tiver filtro de etiqueta ativo e a revendedora não tiver, não renderiza
            if (activeTagFilter && (!reseller.tags || !reseller.tags.some(t => t.name === activeTagFilter))) return '';
            // Se tiver filtro de grupo e for diferente, não renderiza
            if (activeGroupFilter !== 'all' && (reseller.group || 'Padrão') !== activeGroupFilter) return '';

            const resellerSales = allSales.filter(sale => {
                if (sale.resellerId !== reseller.id) return false;
                if (isFinancialSale(sale)) return false;
                const saleDate = Number(sale.date) || Number(sale.dateApprox) || 0;
                return saleDate >= startTs && saleDate <= endTs;
            });

            const totalSales = resellerSales.reduce((sum, sale) => sum + sale.price, 0);
            const totalOriginal = resellerSales.reduce((sum, sale) => sum + (sale.originalPrice || sale.price + (sale.discount || 0)), 0);
            const totalDiscount = resellerSales.reduce((sum, sale) => sum + (sale.discount || 0), 0);

            let tagsHtml = '';
            if (reseller.tags && reseller.tags.length > 0) {
                tagsHtml = `<div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px;">` + reseller.tags.map(t => `<span style="background-color: ${t.color}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${t.name}</span>`).join('') + `</div>`;
            }
            
            let discountText = '';
            if (reseller.allowDiscounts !== false) {
                discountText = `<span style="color: #28a745; font-weight: 500;">Habilitado (${Array.isArray(reseller.discountPercentage) ? reseller.discountPercentage.join('%, ') + '%' : (reseller.discountPercentage || 0) + '%'})</span>`;
            } else {
                discountText = '<span style="color: #dc3545; font-weight: 500;">Desabilitado</span>';
            }
            if (Array.isArray(reseller.progressiveDiscounts) && reseller.progressiveDiscounts.length > 0) {
                discountText += ` | Prog: <span style="color: #17a2b8; font-weight: 500;">${reseller.progressiveDiscounts.join('%, ')}%</span>`;
            }
            
            let catalogImageText = 'Padrão Global';
            if (reseller.catalogImageMode) {
                switch (reseller.catalogImageMode) {
                    case 'url1': catalogImageText = 'URL Principal (Foto 1)'; break;
                    case 'url2': catalogImageText = 'URL 2 (Foto 2)'; break;
                    case 'url3': catalogImageText = 'URL 3 (Foto 3)'; break;
                    case 'url4': catalogImageText = 'URL 4 (Foto 4)'; break;
                    case 'url5': catalogImageText = 'URL 5 (Foto 5)'; break;
                    default: catalogImageText = 'Padrão Global';
                }
            }

            if (isListMode) {
                return `
                <div class="reseller-item" id="reseller_card_${reseller.id}" style="display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap; position: relative; ${reseller.isDeleted ? 'background: #fff5f5; border: 1px dashed #dc3545;' : ''}">
                    <button id="reseller_toggle_btn_${reseller.id}" onclick="toggleResellerCard('${reseller.id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; font-weight: bold; cursor: pointer; color: #888; line-height: 1;">+</button>
                    <div style="flex: 1; min-width: 200px; padding-right: 20px;">
                        <div class="reseller-name" style="font-size: 1.1em;">${reseller.name} ${reseller.isDeleted ? '<span style="font-size:0.7em; color:#dc3545;">(Excluída)</span>' : ''}</div>
                        <div class="reseller-total" style="font-weight: bold; color: #2c1810; margin-bottom: 2px;">${formatCurrency(totalSales)}</div>
                        ${totalDiscount > 0 ? `<div style="font-size: 0.8em; color: #666; margin-bottom: 5px; line-height: 1.2;">Vendido: <span style="text-decoration: line-through;">${formatCurrency(totalOriginal)}</span><br>Desc: <span style="color: #dc3545;">-${formatCurrency(totalDiscount)}</span></div>` : ''}
                        ${tagsHtml}
                    </div>
                    
                    <div id="reseller_details_${reseller.id}" data-display="grid" style="display: none; flex: 2; min-width: 250px; font-size: 0.9em; color: #555; grid-template-columns: 1fr 1fr; gap: 5px;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reseller.email}">📧 ${reseller.email}</div>
                        <div>📱 ${reseller.phone}</div>
                        <div>🎂 Nasc: ${reseller.birthDate ? formatDate(reseller.birthDate) : '-'}</div>
                        <div>📅 Cad: ${reseller.createdAt ? formatDate(reseller.createdAt) : '-'}</div>
                        <div>🛍️ ${resellerSales.length} vendas</div>
                        <div>💸 Desc: ${discountText}</div>
                        <div>🖼️ Catálogo: <span style="color: #4a90e2; font-weight: 500;">${catalogImageText}</span></div>
                    </div>
                    
                    <div id="reseller_actions_${reseller.id}" data-display="flex" class="reseller-actions-wrap" style="flex: 2; min-width: 300px; max-width: 100%;">
                        ${!reseller.isDeleted ? `
                            <a href="catalogo.html?rev=${reseller.id}" target="_blank" class="btn-secondary" style="margin: 0; padding: 6px 10px; font-size: 0.85em; text-decoration: none; white-space: nowrap;">🔗 Catálogo</a>
                            <button class="btn-secondary" onclick="copyCatalogLink('${reseller.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; white-space: nowrap;">📋 Copiar Link</button>
                        ` : ''}
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="forceAdminSettlement('${reseller.id}', '${reseller.name.replace(/'/g, "\\'")}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; background-color: #fffcf7; color: #856404; border: 1px dashed #d4a574; white-space: nowrap;">📦 Solicitar Acerto</button>` : ''}
                        <button class="btn-edit" onclick="viewResellerSales('${reseller.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; white-space: nowrap;">Vendas</button>
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openAdminCommissionModal('${reseller.id}', '${reseller.name}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; white-space: nowrap;">Comissões</button>` : ''}
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openEditResellerModal('${reseller.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; white-space: nowrap;">Editar</button>` : ''}
                        ${!reseller.isDeleted ? `<button class="btn-delete" onclick="deleteReseller('${reseller.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; white-space: nowrap;">Excluir</button>` : ''}
                        ${reseller.isDeleted ? `<button class="btn-secondary" onclick="restoreReseller('${reseller.id}', '${reseller.name}')" style="margin: 0; padding: 6px 10px; font-size: 0.85em; background-color: #28a745; color: white; border: none; white-space: nowrap;">Restaurar</button>` : ''}
                    </div>
                </div>
                `;
            } else {
                return `
                <div class="reseller-item" id="reseller_card_${reseller.id}" style="display: flex; flex-direction: column; position: relative; ${reseller.isDeleted ? 'background: #fff5f5; border: 1px dashed #dc3545;' : ''}">
                    <button id="reseller_toggle_btn_${reseller.id}" onclick="toggleResellerCard('${reseller.id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; font-weight: bold; cursor: pointer; color: #888; line-height: 1;">+</button>
                    <div class="reseller-header" style="margin-bottom: 10px; align-items: flex-start; padding-right: 20px;">
                        <div class="reseller-name" style="font-size: 1.1em;">${reseller.name} ${reseller.isDeleted ? '<span style="font-size:0.7em; color:#dc3545;">(Excluída)</span>' : ''}</div>
                        <div style="text-align: left; margin-top: 5px;">
                            <div class="reseller-total" style="font-weight: bold; color: #2c1810;">${formatCurrency(totalSales)}</div>
                            ${totalDiscount > 0 ? `<div style="font-size: 0.75em; color: #666; margin-top: 2px;">Vendido: <span style="text-decoration: line-through;">${formatCurrency(totalOriginal)}</span><br>Desc: <span style="color: #dc3545;">-${formatCurrency(totalDiscount)}</span></div>` : ''}
                        </div>
                    </div>
                    ${tagsHtml}
                    <div id="reseller_details_${reseller.id}" data-display="block" class="reseller-details" style="display: none; font-size: 0.9em; flex: 1; margin-bottom: 15px; margin-top: 10px;">
                        <p style="margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reseller.email}">📧 ${reseller.email}</p>
                        <p style="margin-bottom: 3px;">📱 ${reseller.phone}</p>
                        <p style="margin-bottom: 3px;">🎂 Nascimento: ${reseller.birthDate ? formatDate(reseller.birthDate) : '-'}</p>
                        <p style="margin-bottom: 3px;">📅 Cadastrado: ${reseller.createdAt ? formatDate(reseller.createdAt) : '-'}</p>
                        <p style="margin-bottom: 3px;">🛍️ ${resellerSales.length} vendas</p>
                        <p style="margin-bottom: 3px;">💸 Desconto: ${discountText}</p>
                        <p style="margin-bottom: 3px;">🖼️ Catálogo: <span style="color: #4a90e2; font-weight: 500;">${catalogImageText}</span></p>
                    </div>
                    ${!reseller.isDeleted ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <a href="catalogo.html?rev=${reseller.id}" target="_blank" class="btn-secondary" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em; text-decoration: none; text-align: center; box-sizing: border-box;">🔗 Catálogo</a>
                        <button class="btn-secondary" onclick="copyCatalogLink('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">📋 Copiar Link</button>
                    </div>` : ''}
                    <div id="reseller_actions_${reseller.id}" data-display="grid" class="reseller-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: auto;">
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="forceAdminSettlement('${reseller.id}', '${reseller.name.replace(/'/g, "\\'")}')" style="grid-column: 1 / -1; margin: 0; width: 100%; padding: 6px; font-size: 0.85em; background-color: #fffcf7; color: #856404; border: 1px dashed #d4a574;">📦 Solicitar Acerto por Ela</button>` : ''}
                        <button class="btn-edit" onclick="viewResellerSales('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Ver Vendas</button>
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openAdminCommissionModal('${reseller.id}', '${reseller.name}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Comissões</button>` : ''}
                        ${!reseller.isDeleted ? `<button class="btn-secondary" onclick="openEditResellerModal('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Editar</button>` : ''}
                        ${!reseller.isDeleted ? `<button class="btn-delete" onclick="deleteReseller('${reseller.id}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em;">Excluir</button>` : ''}
                        ${reseller.isDeleted ? `<button class="btn-secondary" onclick="restoreReseller('${reseller.id}', '${reseller.name}')" style="margin: 0; width: 100%; padding: 6px; font-size: 0.85em; background-color: #28a745; color: white; border: none;">Restaurar</button>` : ''}
                    </div>
                </div>
                `;
            }
        }).filter(item => item !== '');

        if (renderedItems.length === 0) {
            container.style.display = 'block';
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center;">
                    <div class="empty-icon" style="font-size: 2em; margin-bottom: 10px; color: #ccc;">🔍</div>
                    <p class="empty-text" style="color: #666;">Nenhuma revendedora encontrada com os filtros atuais.</p>
                    <button class="btn-secondary" onclick="document.getElementById('resellerSearchInput').value=''; document.getElementById('resellerTagSelector') ? document.getElementById('resellerTagSelector').value='' : null; document.getElementById('resellerGroupFilter') ? document.getElementById('resellerGroupFilter').value='all' : null; localStorage.removeItem('resellerTagFilter'); localStorage.removeItem('resellerGroupFilter'); loadResellers();" style="margin-top: 15px; display: inline-block;">Limpar Filtros</button>
                </div>
            `;
        } else {
            container.innerHTML = renderedItems.join('');
        }

        if (!silent) hideLoading();
        updateOrderResellerSelect(resellers);
        
        // Reaplicar filtro de texto se houver
        if (document.getElementById('resellerSearchInput') && document.getElementById('resellerSearchInput').value) {
            filterResellersList();
        }
    } catch (error) {
        if (!silent) hideLoading();
        console.error('Erro ao carregar revendedoras:', error);
    }
}

function toggleResellerCard(resellerId) {
    const details = document.getElementById(`reseller_details_${resellerId}`);
    const btn = document.getElementById(`reseller_toggle_btn_${resellerId}`);
    const actions = document.getElementById(`reseller_actions_${resellerId}`);
    
    if (details) {
        if (details.style.display === 'none') {
            details.style.display = details.getAttribute('data-display') || 'block';
            if (btn) btn.textContent = '-';
            if (actions) actions.style.flexWrap = 'wrap';
        } else {
            details.style.display = 'none';
            if (btn) btn.textContent = '+';
            if (actions) actions.style.flexWrap = 'wrap';
        }
    }
}

function toggleAllResellerCards() {
    const btn = document.getElementById('resellerToggleAllBtn');
    const isExpanding = btn.textContent.trim() === '+';
    btn.textContent = isExpanding ? '-' : '+';
    
    const details = document.querySelectorAll('[id^="reseller_details_"]');
    details.forEach(detail => {
        const resellerId = detail.id.replace('reseller_details_', '');
        const toggleBtn = document.getElementById(`reseller_toggle_btn_${resellerId}`);
        const actions = document.getElementById(`reseller_actions_${resellerId}`);
        
        if (isExpanding) {
            detail.style.display = detail.getAttribute('data-display') || 'block';
            if (toggleBtn) toggleBtn.textContent = '-';
            if (actions) actions.style.flexWrap = 'wrap';
        } else {
            detail.style.display = 'none';
            if (toggleBtn) toggleBtn.textContent = '+';
            if (actions) actions.style.flexWrap = 'wrap';
        }
    });
}

function filterResellersList() {
    const searchInput = document.getElementById('resellerSearchInput');
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('#resellersList .reseller-item');
    
    items.forEach(item => {
        const nameEl = item.querySelector('.reseller-name');
        if (nameEl) {
            const name = nameEl.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? '' : 'none';
        }
    });
}

function copyCatalogLink(resellerId) {
    let baseUrl = window.location.href;
    if (baseUrl.includes('?')) baseUrl = baseUrl.split('?')[0];
    baseUrl = baseUrl.split('/').slice(0, -1).join('/');
    const catalogUrl = `${baseUrl}/catalogo.html?rev=${resellerId}`;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(catalogUrl).then(() => {
            showNotification('Link do catálogo copiado com sucesso!');
        }).catch(() => {
            prompt('Copie o link abaixo:', catalogUrl);
        });
    } else {
        prompt('Copie o link abaixo:', catalogUrl);
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

async function forceAdminSettlement(resellerId, resellerName) {
    if (!confirm(`Tem certeza que deseja solicitar o acerto em nome de ${resellerName}?\n\nIsso agrupará todas as vendas pendentes atuais dela em uma nova solicitação de acerto.`)) return;

    showLoading();
    try {
        // Buscar dados para o relatório
        const [salesSnapshot, goalsSnapshot, ordersSnapshot, productsSnapshot] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            goalsRef.child(resellerId).once('value'),
            ordersRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            productsRef.once('value')
        ]);

        const sales = [];
        salesSnapshot.forEach(child => {
            sales.push({ id: child.key, ...child.val() });
        });

        const goals = goalsSnapshot.val() || {};
        const allProducts = productsSnapshot.val() || {};
        
        // Filtrar vendas pendentes para cálculo financeiro
        const pendingSales = sales.filter(s => !s.isSettled && !isFinancialSale(s));

        if (pendingSales.length === 0) {
            hideLoading();
            showNotification(`A revendedora ${resellerName} não possui nenhuma venda pendente de acerto.`, 'error');
            return;
        }

        // Calcular totais
        const totalSold = pendingSales.reduce((sum, sale) => sum + (Number(sale.price) || 0), 0);
        const totalOriginal = pendingSales.reduce((sum, sale) => sum + (Number(sale.originalPrice || sale.price + (sale.discount || 0)) || 0), 0);
        const totalDiscount = pendingSales.reduce((sum, sale) => sum + (Number(sale.discount) || 0), 0);
        const totalCommission = calculateTotalCommission(totalSold, goals.commissionTiers || []);
        
        const goalAmount = goals.goalAmount || 0;
        const goalProgress = goalAmount > 0 ? (totalCommission / goalAmount) * 100 : 0;

        // Calcular itens para devolução
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

        const itemsSold = pendingSales.length;
        const itemsToReturn = Math.max(0, totalItemsReceived - itemsSold);

        // 1. Criar registro de acerto com histórico
        const settlementRef = await settlementsRef.push({
            resellerId: resellerId,
            resellerName: resellerName,
            totalSold,
            totalOriginal,
            totalDiscount,
            totalCommission,
            returnedCount: itemsToReturn,
            goalAmount: parseFloat(goalAmount),
            goalAchievement: parseFloat(goalProgress),
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            requestedByAdmin: true // Sinaliza que foi gerado pelo painel admin
        });

        // 2. Marcar vendas atuais como "acertadas"
        const updates = {};
        pendingSales.forEach(sale => {
            updates[`sales/${sale.id}/isSettled`] = true;
            updates[`sales/${sale.id}/settlementId`] = settlementRef.key;
        });

        // 3. Zerar metas
        updates[`goals/${resellerId}/goalAmount`] = 0;
        updates[`goals/${resellerId}/settlementDate`] = '';

        await usersRef.parent.update(updates);

        hideLoading();
        showNotification(`Acerto solicitado com sucesso em nome de ${resellerName}!`);
        
        // Recarregar os painéis afetados
        loadResellers(true);
        loadPendingSettlements();
        if (document.getElementById('adminDashboard').classList.contains('active')) {
            loadAdminDashboard(true);
        }

    } catch (error) {
        hideLoading();
        console.error('Erro ao forçar acerto:', error);
        showNotification('Erro ao processar a solicitação de acerto', 'error');
    }
}

function openGlobalCatalogConfigModal() {
    if (!document.getElementById('globalCatalogConfigModal')) {
        const modalHtml = `
            <div id="globalCatalogConfigModal" class="modal-overlay" style="z-index: 2000;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Imagens do Catálogo</h3>
                        <button class="close-modal" onclick="document.getElementById('globalCatalogConfigModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; margin-bottom: 15px;">Escolha qual imagem será exibida por padrão nos catálogos das revendedoras. Caso o produto não tenha a imagem escolhida, ele mostrará a URL Principal (Foto 1).</p>
                        <div class="form-group">
                            <label>Imagem Padrão</label>
                            <select id="globalCatalogImageMode" class="input-field">
                                <option value="url1">URL Principal (Foto 1)</option>
                                <option value="url2">URL 2 (Foto 2)</option>
                                <option value="url3">URL 3 (Foto 3)</option>
                                <option value="url4">URL 4 (Foto 4)</option>
                                <option value="url5">URL 5 (Foto 5)</option>
                            </select>
                        </div>
                        <button class="btn-primary" onclick="saveGlobalCatalogConfig()" style="width: 100%; margin-top: 15px;">Salvar Configuração</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    showLoading();
    configRef.child('public/catalogImageMode').once('value').then(snap => {
        const mode = snap.val() || 'url1';
        document.getElementById('globalCatalogImageMode').value = mode;
        document.getElementById('globalCatalogConfigModal').classList.add('active');
        hideLoading();
    }).catch(e => {
        hideLoading();
        console.error(e);
        showNotification('Erro ao carregar configuração', 'error');
    });
}

function saveGlobalCatalogConfig() {
    const mode = document.getElementById('globalCatalogImageMode').value;
    showLoading();
    configRef.child('public').update({ catalogImageMode: mode }).then(() => {
        document.getElementById('globalCatalogConfigModal').classList.remove('active');
        hideLoading();
        showNotification('Configuração salva com sucesso!');
    }).catch(e => {
        hideLoading();
        console.error(e);
        showNotification('Erro ao salvar configuração', 'error');
    });
}

let currentEditingResellerId = null;
let currentEditingResellerTags = [];

function renderEditResellerTags() {
    const container = document.getElementById('editResellerTagsList');
    if (!container) return;
    if (currentEditingResellerTags.length === 0) {
        container.innerHTML = '<span style="color: #999; font-size: 0.85em; font-style: italic;">Nenhum marcador adicionado.</span>';
        return;
    }
    container.innerHTML = currentEditingResellerTags.map((tag, index) => `
        <span style="background-color: ${tag.color}; color: #fff; padding: 4px 10px; border-radius: 15px; font-size: 0.8em; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 5px;">
            ${tag.name}
            <span onclick="removeResellerTag(${index})" style="cursor: pointer; font-size: 1.2em; line-height: 1;">&times;</span>
        </span>
    `).join('');
}

function addResellerTag() {
    const nameInput = document.getElementById('newTagName');
    const colorInput = document.getElementById('newTagColor');
    if (!nameInput || !colorInput) return;
    const name = nameInput.value.trim();
    const color = colorInput.value;
    if (!name) { showNotification('Digite um nome para a etiqueta', 'error'); return; }
    if (currentEditingResellerTags.some(t => t.name.toLowerCase() === name.toLowerCase())) { showNotification('Etiqueta já existe', 'error'); return; }
    currentEditingResellerTags.push({ name, color });
    nameInput.value = '';
    renderEditResellerTags();
}

function removeResellerTag(index) {
    currentEditingResellerTags.splice(index, 1);
    renderEditResellerTags();
}

async function openEditResellerModal(resellerId) {
    showLoading();
    currentEditingResellerId = resellerId;

    const existingModal = document.getElementById('editResellerModal');
    if (existingModal) {
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
                            <label>Grupo de Ciclo (Ex: Turma 1)</label>
                            <input type="text" id="editResellerGroup" class="input-field" placeholder="Padrão">
                        </div>
                        <div class="form-group">
                            <label>E-mail (Contato / Exibição)</label>
                            <input type="email" id="editResellerEmail" class="input-field">
                            <p style="font-size: 0.8em; color: #d4a574; margin-top: 5px; line-height: 1.3;">
                                ⚠️ Alterar este campo não muda o e-mail de <b>LOGIN</b>. Por segurança, para alterar o acesso da revendedora, você deve modificar o e-mail dela na aba <b>Authentication</b> dentro do <b>Firebase Console</b>.
                            </p>
                        </div>
                        <div class="form-group">
                            <label>Telefone</label>
                            <input type="tel" id="editResellerPhone" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data de Nascimento</label>
                            <input type="date" id="editResellerBirthDate" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data do Acerto</label>
                            <input type="date" id="editResellerSettlementDate" class="input-field">
                        </div>

                        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label>Imagem Padrão do Catálogo (Desta Revendedora)</label>
                            <select id="editResellerCatalogImageMode" class="input-field">
                                <option value="">Usar Padrão Global</option>
                                <option value="url1">URL Principal (Foto 1)</option>
                                <option value="url2">URL 2 (Foto 2)</option>
                                <option value="url3">URL 3 (Foto 3)</option>
                                <option value="url4">URL 4 (Foto 4)</option>
                                <option value="url5">URL 5 (Foto 5)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                <input type="checkbox" id="editResellerAllowDiscounts" style="width: 18px; height: 18px;" onchange="document.getElementById('discountPercentageContainer').style.display = this.checked ? 'block' : 'none'">
                                Permitir aplicar descontos nas vendas
                            </label>
                        </div>

                        <div class="form-group" id="discountPercentageContainer" style="display: none; margin-top: 10px; padding-left: 26px;">
                            <label style="display: flex; justify-content: space-between; align-items: center; color: #666; font-size: 0.9em; margin-bottom: 5px;">
                                Porcentagens Autorizadas (%)
                                <button type="button" class="btn-secondary" onclick="addEditResellerDiscountInput()" style="margin: 0; padding: 2px 8px; font-size: 0.8em;">+ Adicionar</button>
                            </label>
                            <div id="editResellerDiscountInputsContainer" style="display: flex; flex-direction: column; gap: 5px;">
                                <!-- Inputs injetados aqui -->
                            </div>
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px;">Você pode adicionar múltiplas opções de desconto para a revendedora escolher (ex: 5%, 10%, 15%).</p>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="editResellerShowDiscountsInCatalog">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span style="font-size: 0.9em; color: #2c1810; font-weight: 500; cursor: pointer;" onclick="document.getElementById('editResellerShowDiscountsInCatalog').click()">Exibir descontos no catálogo online</span>
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                <input type="checkbox" id="editResellerAllowProgressive" style="width: 18px; height: 18px;" onchange="document.getElementById('progressiveDiscountContainer').style.display = this.checked ? 'block' : 'none'">
                                Permitir Desconto Progressivo (Recorrente) nas vendas
                            </label>
                        </div>
                        <div class="form-group" id="progressiveDiscountContainer" style="display: none; margin-top: 10px; padding-left: 26px;">
                            <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Sequência de Descontos (%) separados por vírgula</label>
                            <input type="text" id="editResellerProgressiveInput" class="input-field" placeholder="Ex: 0, 10, 20" style="margin-bottom: 0;">
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px;">Ex: <strong>0, 10, 20</strong> (1ª peça s/ desconto, 2ª com 10%, 3ª e seguintes c/ 20%). A ordem aplicada na venda é do item mais caro para o mais barato.</p>
                        </div>

                        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                <input type="checkbox" id="editResellerAllowCashback" style="width: 18px; height: 18px;" onchange="document.getElementById('cashbackSettingsContainer').style.display = this.checked ? 'block' : 'none'">
                                Habilitar Gerador de Cashback
                            </label>
                        </div>
                        <div class="form-group" id="cashbackSettingsContainer" style="display: none; margin-top: 10px; padding-left: 26px;">
                            <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Porcentagem do Cashback (%)</label>
                            <input type="number" id="editResellerCashbackPct" class="input-field" placeholder="Ex: 5" min="0" max="100" step="0.1" style="margin-bottom: 10px;">
                            
                            <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Validade do Cashback (em dias)</label>
                            <input type="number" id="editResellerCashbackDays" class="input-field" placeholder="Ex: 30" min="1" style="margin-bottom: 0;">
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px;">Após esse prazo, o saldo expira e não poderá ser usado.</p>
                        </div>

                        <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label>Marcadores (Etiquetas Coloridas)</label>
                            <div id="editResellerTagsList" style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; min-height: 28px; align-items: center;"></div>
                            <div style="display: flex; gap: 5px;">
                                <input type="text" id="newTagName" class="input-field" placeholder="Ex: VIP" style="margin-bottom: 0; flex: 1;">
                                <input type="color" id="newTagColor" class="input-field" value="#d4a574" style="margin-bottom: 0; width: 45px; padding: 0 2px; cursor: pointer; height: 38px;">
                                <button type="button" class="btn-secondary" onclick="addResellerTag()" style="margin-bottom: 0; height: 38px; padding: 0 15px;">Adicionar</button>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label>Segurança / Senha</label>
                            <button class="btn-secondary" onclick="sendPasswordResetForReseller()" style="width: 100%; background-color: #17a2b8; color: white; border: none; padding: 10px;">
                                📧 Enviar Link de Redefinição de Senha
                            </button>
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px; line-height: 1.3;">Por segurança, o Firebase não permite alterar senhas diretamente sem a senha antiga. Ao clicar acima, a revendedora receberá um e-mail oficial para cadastrar a nova senha.</p>
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
        if (document.getElementById('editResellerGroup')) document.getElementById('editResellerGroup').value = reseller.group || 'Padrão';
        document.getElementById('editResellerBirthDate').value = reseller.birthDate || '';
        document.getElementById('editResellerSettlementDate').value = goal.settlementDate || '';
        
        if (document.getElementById('editResellerCatalogImageMode')) {
            document.getElementById('editResellerCatalogImageMode').value = reseller.catalogImageMode || '';
        }
        
        currentEditingResellerTags = reseller.tags || [];
        renderEditResellerTags();

        if (document.getElementById('editResellerAllowDiscounts')) {
            const allowed = reseller.allowDiscounts !== false;
            document.getElementById('editResellerAllowDiscounts').checked = allowed;
            document.getElementById('discountPercentageContainer').style.display = allowed ? 'block' : 'none';
            
            const container = document.getElementById('editResellerDiscountInputsContainer');
            container.innerHTML = '';
            
            let discounts = [];
            if (Array.isArray(reseller.discountPercentage)) {
                discounts = reseller.discountPercentage;
            } else if (reseller.discountPercentage !== undefined && reseller.discountPercentage !== null) {
                discounts = [reseller.discountPercentage];
            }
            
            if (discounts.length > 0) {
                discounts.forEach(d => addEditResellerDiscountInput(d));
            } else {
                addEditResellerDiscountInput('');
            }
            
            const showDiscountsCb = document.getElementById('editResellerShowDiscountsInCatalog');
            if (showDiscountsCb) {
                showDiscountsCb.checked = !!reseller.showDiscountsInCatalog;
            }
        }
        
        if (document.getElementById('editResellerAllowProgressive')) {
            const hasProgressive = reseller.progressiveDiscounts && reseller.progressiveDiscounts.length > 0;
            document.getElementById('editResellerAllowProgressive').checked = hasProgressive;
            document.getElementById('progressiveDiscountContainer').style.display = hasProgressive ? 'block' : 'none';
            if (hasProgressive) {
                document.getElementById('editResellerProgressiveInput').value = reseller.progressiveDiscounts.join(', ');
            }
        }
        
        if (document.getElementById('editResellerAllowCashback')) {
            const allowCashback = !!reseller.allowCashback;
            document.getElementById('editResellerAllowCashback').checked = allowCashback;
            document.getElementById('cashbackSettingsContainer').style.display = allowCashback ? 'block' : 'none';
            
            document.getElementById('editResellerCashbackPct').value = reseller.cashbackPercentage || '';
            document.getElementById('editResellerCashbackDays').value = reseller.cashbackValidityDays || 30;
        }

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

function addEditResellerDiscountInput(value = '') {
    const container = document.getElementById('editResellerDiscountInputsContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 5px; align-items: center;';
    div.innerHTML = `
        <input type="number" class="input-field edit-discount-input" min="0" max="100" step="0.1" placeholder="Ex: 10" value="${value}" style="margin-bottom: 0; flex: 1;">
        <button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="margin: 0; padding: 0; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    container.appendChild(div);
}

async function sendPasswordResetForReseller() {
    const email = document.getElementById('editResellerEmail').value.trim();
    if (!email) {
        showNotification('O campo de e-mail está vazio.', 'error');
        return;
    }
    
    if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;
    
    showLoading();
    try {
        await auth.sendPasswordResetEmail(email);
        hideLoading();
        showNotification('E-mail de redefinição enviado com sucesso! Peça para a revendedora verificar a caixa de entrada ou spam.');
    } catch (error) {
        hideLoading();
        console.error('Erro ao enviar reset de senha:', error);
        if (error.code === 'auth/user-not-found') {
            showNotification('Usuário não encontrado no sistema de autenticação.', 'error');
        } else {
            showNotification('Erro ao enviar e-mail: ' + error.message, 'error');
        }
    }
}

async function saveResellerEdit() {
    const allowDiscounts = document.getElementById('editResellerAllowDiscounts').checked;
    let discountPercentage = 0;
    let showDiscountsInCatalog = false;
    
    if (allowDiscounts) {
        const discountInputs = document.querySelectorAll('.edit-discount-input');
        const discountArr = Array.from(discountInputs)
            .map(input => parseFloat(input.value))
            .filter(n => !isNaN(n) && n >= 0 && n <= 100);
            
        if (discountArr.length > 0) {
            discountPercentage = discountArr.length > 1 ? discountArr : discountArr[0];
        }
        
        const showDiscountsCb = document.getElementById('editResellerShowDiscountsInCatalog');
        if (showDiscountsCb) {
            showDiscountsInCatalog = showDiscountsCb.checked;
        }
    }
    
    const allowProgressive = document.getElementById('editResellerAllowProgressive').checked;
    let progressiveDiscounts = [];
    if (allowProgressive) {
        const progInput = document.getElementById('editResellerProgressiveInput').value;
        progressiveDiscounts = progInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 100);
        if (progressiveDiscounts.length === 0) {
            showNotification('Informe uma sequência válida para o desconto progressivo (ex: 0, 10, 20)', 'error');
            return;
        }
    }
        
        const allowCashback = document.getElementById('editResellerAllowCashback').checked;
        let cashbackPercentage = 0;
        let cashbackValidityDays = 30;
        if (allowCashback) {
            cashbackPercentage = parseFloat(document.getElementById('editResellerCashbackPct').value) || 0;
            cashbackValidityDays = parseInt(document.getElementById('editResellerCashbackDays').value) || 30;
            if (cashbackPercentage <= 0) {
                showNotification('Informe uma porcentagem válida para o cashback', 'error');
                return;
            }
        }
        
    const catalogImageMode = document.getElementById('editResellerCatalogImageMode') ? document.getElementById('editResellerCatalogImageMode').value : '';

    const updates = {
        name: document.getElementById('editResellerName').value.trim(),
        email: document.getElementById('editResellerEmail').value.trim(),
        phone: document.getElementById('editResellerPhone').value.trim(),
        group: document.getElementById('editResellerGroup') ? document.getElementById('editResellerGroup').value.trim() || 'Padrão' : 'Padrão',
        birthDate: document.getElementById('editResellerBirthDate').value,
        allowDiscounts: allowDiscounts,
        discountPercentage: discountPercentage,
        showDiscountsInCatalog: showDiscountsInCatalog,
        progressiveDiscounts: progressiveDiscounts,
            allowCashback: allowCashback,
            cashbackPercentage: cashbackPercentage,
            cashbackValidityDays: cashbackValidityDays,
        catalogImageMode: catalogImageMode || null,
        tags: currentEditingResellerTags
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

async function openBatchDiscountModal() {
    showLoading();

    const existingModal = document.getElementById('batchDiscountModal');
    if (existingModal) {
        existingModal.remove();
    }

    if (!document.getElementById('batchDiscountModal')) {
        const modalHtml = `
            <div id="batchDiscountModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Gerenciar Descontos em Lote</h3>
                        <button class="close-modal" onclick="closeBatchDiscountModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Ação</label>
                            <select id="batchDiscountAction" class="input-field" onchange="const isEnable = this.value === 'enable'; document.getElementById('batchDiscountValueContainer').style.display = isEnable ? 'block' : 'none'; document.getElementById('batchProgressiveContainerWrapper').style.display = isEnable ? 'block' : 'none'; document.getElementById('batchCashbackContainerWrapper').style.display = isEnable ? 'block' : 'none';">
                                <option value="enable">Habilitar Descontos</option>
                                <option value="disable">Desabilitar Descontos</option>
                            </select>
                        </div>
                        <div class="form-group" id="batchDiscountValueContainer">
                            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                Porcentagens Autorizadas (%)
                                <button type="button" class="btn-secondary" onclick="addBatchDiscountInput()" style="margin: 0; padding: 2px 8px; font-size: 0.8em;">+ Adicionar</button>
                            </label>
                            <div id="batchDiscountInputsContainer" style="display: flex; flex-direction: column; gap: 5px;">
                                <!-- Inputs -->
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="batchShowDiscountsInCatalog">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span style="font-size: 0.9em; color: #2c1810; font-weight: 500; cursor: pointer;" onclick="document.getElementById('batchShowDiscountsInCatalog').click()">Exibir descontos no catálogo online</span>
                            </div>
                        </div>
                        
                        <div class="form-group" id="batchProgressiveContainerWrapper" style="display: block; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                <input type="checkbox" id="batchAllowProgressive" style="width: 18px; height: 18px;" onchange="document.getElementById('batchProgressiveInputContainer').style.display = this.checked ? 'block' : 'none'">
                                Habilitar Desconto Progressivo (Recorrente)
                            </label>
                            <div id="batchProgressiveInputContainer" style="display: none; margin-top: 10px; padding-left: 26px;">
                                <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Sequência de Descontos (%) separados por vírgula</label>
                                <input type="text" id="batchProgressiveInput" class="input-field" placeholder="Ex: 0, 10, 20" style="margin-bottom: 0;">
                                <p style="font-size: 0.8em; color: #666; margin-top: 5px;">Ex: <strong>0, 10, 20</strong> (1ª peça s/ desconto, 2ª com 10%, 3ª e seguintes c/ 20%).</p>
                            </div>
                        </div>
                        
                        <div class="form-group" id="batchCashbackContainerWrapper" style="display: block; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                <input type="checkbox" id="batchAllowCashback" style="width: 18px; height: 18px;" onchange="document.getElementById('batchCashbackInputContainer').style.display = this.checked ? 'block' : 'none'">
                                Habilitar Gerador de Cashback
                            </label>
                            <div id="batchCashbackInputContainer" style="display: none; margin-top: 10px; padding-left: 26px;">
                                <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Porcentagem (%)</label>
                                <input type="number" id="batchCashbackPct" class="input-field" placeholder="Ex: 5" min="0" max="100" step="0.1" style="margin-bottom: 10px;">
                                <label style="color: #666; font-size: 0.9em; margin-bottom: 5px; display: block;">Validade (Dias)</label>
                                <input type="number" id="batchCashbackDays" class="input-field" placeholder="Ex: 30" min="1" style="margin-bottom: 0;">
                            </div>
                        </div>

                        <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span>Selecione as Revendedoras:</span>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <select id="batchGroupSelect" class="input-field" style="margin: 0; padding: 4px; width: auto; font-size: 0.85em;" onchange="selectBatchResellersByGroup(this.value)"></select>
                                    <label style="font-size: 0.9em; font-weight: normal; cursor: pointer; color: #2c1810; display: flex; align-items: center; gap: 5px;">
                                        <input type="checkbox" id="selectAllBatchResellers" style="width: 16px; height: 16px; cursor: pointer;" onchange="toggleSelectAllBatchResellers(this)">
                                        <strong>Marcar Todas</strong>
                                    </label>
                                </div>
                            </label>
                            <div id="batchDiscountResellersList" style="max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px; background: #fdfdfd;">
                                <!-- Lista injetada aqui -->
                            </div>
                        </div>
                        <button class="btn-primary" onclick="saveBatchDiscounts()" style="width: 100%; margin-top: 15px;">Aplicar em Lote</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
        const resellers = [];
        snapshot.forEach(child => {
            const r = child.val();
            if (!r.isDeleted) {
                resellers.push({ id: child.key, ...r });
            }
        });

        resellers.sort((a, b) => a.name.localeCompare(b.name));

        const groupsSet = new Set();
        resellers.forEach(r => groupsSet.add(r.group || 'Padrão'));
        const availableGroups = Array.from(groupsSet).sort();

        const listContainer = document.getElementById('batchDiscountResellersList');
        if (resellers.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">Nenhuma revendedora ativa encontrada.</p>';
        } else {
            listContainer.innerHTML = resellers.map(r => `
                <label class="batch-reseller-item" data-group="${r.group || 'Padrão'}" style="display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
                    <input type="checkbox" class="batch-reseller-cb" value="${r.id}" style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333;">${r.name}</div>
                        <div style="font-size: 0.85em; color: #888; margin-top: 2px;">
                            Turma: <strong>${r.group || 'Padrão'}</strong> | 
                            Desc: ${r.allowDiscounts !== false ? `<span style="color: #28a745; font-weight: 500;">Sim${r.showDiscountsInCatalog ? ' (Catálogo)' : ''}</span>` : '<span style="color: #dc3545; font-weight: 500;">Não</span>'} | 
                            CB: ${r.allowCashback ? `<span style="color: #17a2b8; font-weight: 500;">Sim (${r.cashbackPercentage}%)</span>` : '<span style="color: #dc3545; font-weight: 500;">Não</span>'}
                        </div>
                    </div>
                </label>
            `).join('');
        }

        const groupSelect = document.getElementById('batchGroupSelect');
        if (groupSelect) {
            let options = '<option value="">Filtro: Todas as Turmas</option>';
            availableGroups.forEach(g => {
                options += `<option value="${g}">Turma: ${g}</option>`;
            });
            groupSelect.innerHTML = options;
        }

        document.getElementById('batchDiscountAction').value = 'enable';
        document.getElementById('batchDiscountValueContainer').style.display = 'block';
        document.getElementById('batchDiscountInputsContainer').innerHTML = '';
        addBatchDiscountInput();
        if(document.getElementById('selectAllBatchResellers')) document.getElementById('selectAllBatchResellers').checked = false;
        if(document.getElementById('batchShowDiscountsInCatalog')) document.getElementById('batchShowDiscountsInCatalog').checked = false;

        document.getElementById('batchDiscountModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar revendedoras:', error);
        showNotification('Erro ao carregar revendedoras', 'error');
    }
}

function closeBatchDiscountModal() {
    document.getElementById('batchDiscountModal').classList.remove('active');
}

function addBatchDiscountInput() {
    const container = document.getElementById('batchDiscountInputsContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 5px; align-items: center;';
    div.innerHTML = `
        <input type="number" class="input-field batch-discount-input" min="0" max="100" step="0.1" placeholder="Ex: 10" style="margin-bottom: 0; flex: 1;">
        <button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="margin: 0; padding: 0; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    container.appendChild(div);
}

function toggleSelectAllBatchResellers(source) {
    const items = document.querySelectorAll('.batch-reseller-item');
    items.forEach(item => {
        if (item.style.display !== 'none') {
            const cb = item.querySelector('.batch-reseller-cb');
            if (cb) cb.checked = source.checked;
        }
    });
}

function selectBatchResellersByGroup(groupName) {
    const items = document.querySelectorAll('.batch-reseller-item');
    let anyVisible = false;

    items.forEach(item => {
        const cb = item.querySelector('.batch-reseller-cb');
        if (groupName === '') {
            item.style.display = '';
            if (cb) cb.checked = false;
        } else {
            const isMatch = item.dataset.group === groupName;
            item.style.display = isMatch ? '' : 'none';
            if (cb) cb.checked = isMatch;
            if (isMatch) anyVisible = true;
        }
    });

    const selectAllCb = document.getElementById('selectAllBatchResellers');
    if (selectAllCb) selectAllCb.checked = groupName !== '' && anyVisible;
}

async function saveBatchDiscounts() {
    const action = document.getElementById('batchDiscountAction').value;
    const allowDiscounts = action === 'enable';
    let discountPercentage = 0;
    let showDiscountsInCatalog = false;
    let progressiveDiscounts = [];
    let allowCashback = false;
    let cashbackPercentage = 0;
    let cashbackValidityDays = 30;

    if (allowDiscounts) {
        const discountInputs = document.querySelectorAll('.batch-discount-input');
        const discountArr = Array.from(discountInputs)
            .map(input => parseFloat(input.value))
            .filter(n => !isNaN(n) && n >= 0 && n <= 100);
        
        const showDiscountsCb = document.getElementById('batchShowDiscountsInCatalog');
        if (showDiscountsCb) {
            showDiscountsInCatalog = showDiscountsCb.checked;
        }
        
        const allowProgressive = document.getElementById('batchAllowProgressive').checked;
        if (allowProgressive) {
            const progInput = document.getElementById('batchProgressiveInput').value;
            progressiveDiscounts = progInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 100);
            if (progressiveDiscounts.length === 0) {
                showNotification('Informe uma sequência válida para o desconto progressivo (ex: 0, 10, 20)', 'error');
                return;
            }
        }

        allowCashback = document.getElementById('batchAllowCashback').checked;
        if (allowCashback) {
            cashbackPercentage = parseFloat(document.getElementById('batchCashbackPct').value) || 0;
            cashbackValidityDays = parseInt(document.getElementById('batchCashbackDays').value) || 30;
            if (cashbackPercentage <= 0) {
                showNotification('Informe uma porcentagem válida para o cashback.', 'error');
                return;
            }
        }

        if (discountArr.length === 0 && progressiveDiscounts.length === 0 && !allowCashback) {
            showNotification('Informe pelo menos um desconto ou habilite o cashback.', 'error');
            return;
        }
        
        if (discountArr.length > 0) {
            discountPercentage = discountArr.length > 1 ? discountArr : discountArr[0];
        }
    }

    const selectedCheckboxes = document.querySelectorAll('.batch-reseller-cb:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('Selecione pelo menos uma revendedora.', 'error');
        return;
    }

    showLoading();

    try {
        const updates = {};
        selectedCheckboxes.forEach(cb => {
            const uid = cb.value;
            updates[`${uid}/allowDiscounts`] = allowDiscounts;
            if (allowDiscounts) {
                updates[`${uid}/discountPercentage`] = discountPercentage;
                updates[`${uid}/showDiscountsInCatalog`] = showDiscountsInCatalog;
                updates[`${uid}/progressiveDiscounts`] = progressiveDiscounts.length > 0 ? progressiveDiscounts : null;
                updates[`${uid}/allowCashback`] = allowCashback;
                updates[`${uid}/cashbackPercentage`] = allowCashback ? cashbackPercentage : 0;
                updates[`${uid}/cashbackValidityDays`] = allowCashback ? cashbackValidityDays : 30;
            } else {
                updates[`${uid}/discountPercentage`] = 0;
                updates[`${uid}/showDiscountsInCatalog`] = false;
                updates[`${uid}/progressiveDiscounts`] = null;
                updates[`${uid}/allowCashback`] = false;
            }
        });

        await usersRef.parent.update(updates);

        closeBatchDiscountModal();
        hideLoading();
        showNotification('Descontos atualizados com sucesso para as revendedoras selecionadas!');
        loadResellers(); // Recarrega a lista para mostrar a atualização
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar descontos em lote:', error);
        showNotification('Erro ao atualizar descontos', 'error');
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
            await usersRef.parent.update(ordersUpdates);
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

async function viewResellerSales(resellerId, silent = false) {
    if (!silent) showLoading();
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
                        <div id="resellerSalesList"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    try {
        const [salesSnapshot, paymentsSnapshot, settlementsSnapshot, configSnap] = await Promise.all([
            salesRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            paymentsRef.once('value'),
            settlementsRef.orderByChild('resellerId').equalTo(resellerId).once('value'),
            configRef.child('ranking').once('value')
        ]);

        const config = configSnap.val() || {};
        const lastReset = config.lastResetDate || 0;
        let startTs = lastReset;
        let endTs = Date.now();
        let cycleTitle = `Ciclo Atual (Desde ${formatDate(lastReset)})`;

        const cycleSelector = document.getElementById('resellerCycleSelector');
        if (cycleSelector && cycleSelector.value !== 'current') {
            const hSnap = await rankingHistoryRef.child(cycleSelector.value).once('value');
            const hItem = hSnap.val();
            if (hItem) {
                startTs = hItem.cycleStartDate || 0;
                const closedDate = new Date(hItem.closedAt);
                endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
                cycleTitle = `Ciclo Encerrado (${formatDate(hItem.closedAt)})`;
            }
        }

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
            const saleDate = Number(sale.date) || Number(sale.dateApprox) || 0;
            return saleDate >= startTs && saleDate <= endTs;
        });

        const userSnapshot = await usersRef.child(resellerId).once('value');
        const reseller = userSnapshot.val() || { name: 'Revendedora Excluída' };

        // Armazenar dados para filtragem
        currentResellerSalesData = filteredSales;
        
        document.getElementById('resellerSalesTitle').textContent = `Vendas de ${reseller.name} - ${cycleTitle}`;
        
        // Resetar filtro visual
        const filterSelect = document.getElementById('resellerSalesTypeFilter');
        if (filterSelect) filterSelect.value = 'all';

        // Renderizar lista usando a nova função de filtro
        filterResellerSalesList();

        document.getElementById('resellerSalesModal').classList.add('active');
        if (!silent) hideLoading();
    } catch (error) {
        if (!silent) hideLoading();
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
        totalContainer.innerHTML = `Produtos: ${formatCurrency(productTotal)} | Acertos: ${formatCurrency(acertoTotal)}`;
    } else {
        totalContainer.innerHTML = `Total: ${formatCurrency(total)}`;
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

                        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #d4a574; font-weight: bold;">
                                <input type="checkbox" id="adminEditSaleIsSettled" style="width: 18px; height: 18px;">
                                Venda já acertada (Ciclo anterior)
                            </label>
                            <p style="font-size: 0.8em; color: #666; margin-top: 5px;">Marque esta opção para forçar que esta venda seja ignorada no ciclo atual da revendedora. Ela não contará para a meta e nem para o próximo acerto.</p>
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
        
        if (document.getElementById('adminEditSaleIsSettled')) {
            document.getElementById('adminEditSaleIsSettled').checked = !!sale.isSettled;
        }

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
    
    const isSettledCheckbox = document.getElementById('adminEditSaleIsSettled');
    const isSettled = isSettledCheckbox ? isSettledCheckbox.checked : false;

    showLoading();
    try {
        // 1. Atualizar Venda
        const updates = {
            date: timestamp,
            productName: productName,
            price: price,
            clientId: clientId,
            clientName: clientName,
            paymentStatus: paymentStatus,
            isSettled: isSettled
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
    const existingModal = document.getElementById('adminCommissionModal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="adminCommissionModal" class="modal-overlay">
            <div class="modal-content" style="">
                <div class="modal-header">
                    <h3 id="adminCommissionTitle">Gerenciar Comissões</h3>
                    <button class="close-modal" onclick="closeAdminCommissionModal()">×</button>
                </div>
                <div class="modal-body">
                    <div id="adminCommissionHeaderWrapper"></div>
                    <div id="adminCommissionList" style="margin-bottom: 15px;"></div>
                    <button class="btn-secondary" onclick="addAdminCommissionTier()" style="width: 100%; margin-bottom: 15px;">+ Adicionar Faixa</button>
                    
                    <div id="adminCommissionApplyWrapper"></div>

                    <button class="btn-primary" onclick="saveAdminCommission()" style="width: 100%;">Salvar Alterações</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    currentAdminTargetId = targetId;

    let headerSelectHtml = '';
    let applyToAllHtml = '';

    if (targetId === 'GLOBAL' || targetId.startsWith('GROUP_')) {
        const groupsSet = new Set();
        if (typeof dashboardData !== 'undefined' && dashboardData.allResellers) {
            dashboardData.allResellers.forEach(r => groupsSet.add(r.group || 'Padrão'));
        } else {
            try {
                const usersSnap = await usersRef.once('value');
                usersSnap.forEach(u => {
                    const r = u.val();
                    if (r && r.role === 'reseller') groupsSet.add(r.group || 'Padrão');
                });
            } catch(e) {}
        }
        const availableGroups = Array.from(groupsSet).sort();
        
        let options = '<option value="GLOBAL">Padrão Global (Todas as Turmas)</option>';
        availableGroups.forEach(g => {
            options += `<option value="GROUP_${g}">Turma: ${g}</option>`;
        });

        headerSelectHtml = `
            <div class="form-group" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <label>Configurar comissões padrão para:</label>
                <select id="adminCommissionContextSelect" class="input-field" onchange="openAdminCommissionModal(this.value)">
                    ${options}
                </select>
            </div>
        `;

        applyToAllHtml = `
            <div id="globalCommissionOptions" style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="applyToAllResellers">
                    <strong id="applyToAllLabel">Aplicar para TODAS as revendedoras (Global) existentes agora</strong>
                </label>
                <p style="font-size: 0.85em; color: #666; margin-top: 5px; margin-left: 24px;">Isso substituirá as comissões individuais das revendedoras <span id="applyToAllDesc">de todas as turmas</span>.</p>
            </div>
        `;
    }

    document.getElementById('adminCommissionTitle').textContent = targetId === 'GLOBAL' || targetId.startsWith('GROUP_') ? 'Comissões Padrão' : `Comissões: ${targetName}`;
    
    const headerWrapper = document.getElementById('adminCommissionHeaderWrapper');
    headerWrapper.innerHTML = headerSelectHtml;
    if (headerSelectHtml && currentAdminTargetId) {
        const sel = document.getElementById('adminCommissionContextSelect');
        if (sel) sel.value = currentAdminTargetId;
    }

    const applyWrapper = document.getElementById('adminCommissionApplyWrapper');
    applyWrapper.innerHTML = applyToAllHtml;

    if (applyToAllHtml) {
        document.getElementById('applyToAllResellers').checked = false;
        if (targetId === 'GLOBAL') {
            document.getElementById('applyToAllLabel').textContent = 'Aplicar para TODAS as revendedoras existentes agora';
            document.getElementById('applyToAllDesc').textContent = 'de todas as turmas';
        } else {
            const groupName = targetId.replace('GROUP_', '');
            document.getElementById('applyToAllLabel').textContent = `Aplicar para as revendedoras da Turma: ${groupName} existentes agora`;
            document.getElementById('applyToAllDesc').textContent = `desta turma`;
        }
    }

    showLoading();
    try {
        let tiers = [];
        if (targetId === 'GLOBAL') {
            const snapshot = await configRef.child('defaultCommissions').once('value');
            tiers = snapshot.val() || [];
        } else if (targetId.startsWith('GROUP_')) {
            const groupName = targetId.replace('GROUP_', '');
            const snapshot = await configRef.child(`defaultCommissionsGroups/${groupName}`).once('value');
            tiers = snapshot.val();
            if (!tiers) {
                const globalSnap = await configRef.child('defaultCommissions').once('value');
                tiers = globalSnap.val() || [];
            }
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
                if (Object.keys(updates).length > 0) await usersRef.parent.update(updates);
            }
        } else if (currentAdminTargetId.startsWith('GROUP_')) {
            const groupName = currentAdminTargetId.replace('GROUP_', '');
            await configRef.child(`defaultCommissionsGroups/${groupName}`).set(currentAdminTiers);

            const applyToAll = document.getElementById('applyToAllResellers').checked;
            if (applyToAll) {
                const usersSnapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
                const updates = {};
                usersSnapshot.forEach(child => {
                    const r = child.val();
                    if ((r.group || 'Padrão') === groupName) {
                        updates[`goals/${child.key}/commissionTiers`] = currentAdminTiers;
                    }
                });
                if (Object.keys(updates).length > 0) await usersRef.parent.update(updates);
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
            const id = row.querySelector('.item-id').value;
            const name = row.querySelector('.item-name').value.trim();
            const code = row.querySelector('.item-code').value.trim();
            const code2 = row.querySelector('.item-code2').value.trim();
            const category = row.querySelector('.item-category').value.trim() || 'Sem categoria';
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;
            const imageUrl = row.querySelector('.main-image') ? row.querySelector('.main-image').value.trim() : (row.querySelector('.item-image') ? row.querySelector('.item-image').value.trim() : '');
            const extraImageInputs = row.querySelectorAll('.extra-image');
            const additionalUrls = {};
            let urlIndex = 2;
            extraImageInputs.forEach(input => {
                const val = input.value.trim();
                if (val) {
                    additionalUrls[`url${urlIndex}`] = val;
                    urlIndex++;
                }
            });
            const isCombination = row.querySelector('.item-is-combination') ? row.querySelector('.item-is-combination').value === 'true' : false;
            const componentsStr = row.querySelector('.item-components') ? row.querySelector('.item-components').value : '';

            if (name && !isNaN(price)) {
                let productId = id;
                if (!productId) productId = generateId();
                newProductIds.push(productId);
                updates[`products/${productId}`] = {
                    name,
                    code: code || (isCombination ? 'COMBO' : 'S/C'),
                    code2: code2,
                    category: category,
                    quantity,
                    price,
                    imageUrl: imageUrl,
                    ...additionalUrls,
                    barcode: '',
                    available: quantity,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    isCombination: isCombination,
                    components: componentsStr ? componentsStr.split(',') : []
                };
            }
        });

        if (newProductIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // 2. Salvar produtos
        await usersRef.parent.update(updates);

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

function toggleOrderViewMode() {
    const viewMode = localStorage.getItem('orderViewMode') || 'grid';
    localStorage.setItem('orderViewMode', viewMode === 'grid' ? 'list' : 'grid');
    loadOrders(true);
}

async function loadOrders(silent = false) {
    if (!silent) showLoading();
    
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
        
        const viewMode = localStorage.getItem('orderViewMode') || 'grid';
        const isListMode = viewMode === 'list';

        const renderOrderCard = (order) => {
            const reseller = users[order.resellerId];
            const orderProducts = order.products ? order.products.filter(pid => products[pid]) : [];
            const isActive = order.status === 'active';
            const totalQuantity = orderProducts.reduce((sum, pid) => sum + (parseInt(products[pid].quantity) || 1), 0);

            if (isListMode) {
                return `
                    <div class="reseller-item" style="display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap; margin-bottom: 0; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; ${!isActive ? 'background-color: #f8f9fa; opacity: 0.8;' : ''}">
                        <div style="flex: 2; min-width: 250px;">
                            <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">Pedido para: ${reseller ? reseller.name : 'Desconhecido'} ${!isActive ? '<span style="font-size: 0.8em; color: #666; font-weight: normal;">(Arquivado)</span>' : ''}</div>
                            <div style="font-size: 0.9em; color: #555; margin-top: 5px;">📅 ${formatDate(order.createdAt)}</div>
                        </div>
                        
                        <div style="flex: 1; min-width: 200px; font-size: 0.9em; color: #555;">
                            📦 ${totalQuantity} peça(s) (${orderProducts.length} modelos)
                        </div>
                        
                        <div style="flex: 1; min-width: 250px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end;">
                            <button class="btn-secondary" onclick="openEditOrderModal('${order.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">Editar</button>
                            <button class="btn-secondary" onclick="openCloneOrderModal('${order.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #17a2b8; color: white; border: none;">Clonar</button>
                            ${isActive 
                                ? `<button class="btn-secondary" onclick="archiveOrder('${order.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #6c757d; color: white; border: none;">Arquivar</button>`
                                : `<button class="btn-secondary" onclick="unarchiveOrder('${order.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #28a745; color: white; border: none;">Reativar</button>`
                            }
                            <button class="btn-delete" onclick="deleteOrder('${order.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">Excluir</button>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="reseller-item" style="${!isActive ? 'background-color: #f0f0f0; opacity: 0.8;' : ''} margin-bottom: 0; height: 100%; display: flex; flex-direction: column;">
                        <div class="reseller-header">
                            <div class="reseller-name">Pedido para: ${reseller ? reseller.name : 'Desconhecido'} ${!isActive ? '<span style="font-size: 0.8em; color: #666;">(Arquivado)</span>' : ''}</div>
                        </div>
                        <div class="reseller-details" style="flex: 1;">
                            <p>📦 ${totalQuantity} peça(s) (${orderProducts.length} modelos)</p>
                            <p>📅 ${formatDate(order.createdAt)}</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 15px;">
                            <button class="btn-secondary" onclick="openEditOrderModal('${order.id}')" style="margin: 0; padding: 6px; font-size: 0.85em;">Editar</button>
                            <button class="btn-secondary" onclick="openCloneOrderModal('${order.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; background-color: #17a2b8; color: white; border: none;">Clonar</button>
                            ${isActive 
                                ? `<button class="btn-secondary" onclick="archiveOrder('${order.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; background-color: #6c757d; color: white; border: none;">Arquivar</button>`
                                : `<button class="btn-secondary" onclick="unarchiveOrder('${order.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; background-color: #28a745; color: white; border: none;">Reativar</button>`
                            }
                            <button class="btn-delete" onclick="deleteOrder('${order.id}')" style="margin: 0; padding: 6px; font-size: 0.85em;">Excluir</button>
                        </div>
                    </div>
                `;
            }
        };

        let html = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin: 0;">Gestão de Pedidos</h2>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn-primary" onclick="openManualOrderModal()">+ Novo Pedido Manual</button>
                    <button class="btn-secondary" onclick="showImportModal()">📥 Importar Planilha</button>
                    <button class="btn-secondary" onclick="toggleOrderViewMode()" style="padding: 8px; margin: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2em; width: 40px; height: 38px; cursor: pointer;" title="${isListMode ? 'Mudar para Grade' : 'Mudar para Lista'}">
                        ${isListMode ? '⊞' : '☰'}
                    </button>
                </div>
            </div>
            
            <div class="orders-section">
                <h3 style="margin-bottom: 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem;">Pedidos Ativos (${activeOrders.length})</h3>
                <div style="display: ${isListMode ? 'flex' : 'grid'}; ${isListMode ? 'flex-direction: column; gap: 10px;' : 'grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;'}">
                    ${activeOrders.length > 0 ? activeOrders.map(renderOrderCard).join('') : '<div class="empty-state" style="grid-column: 1/-1; padding: 1rem 0;"><p class="empty-text">Nenhum pedido ativo.</p></div>'}
                </div>
            </div>

            <details class="orders-section" style="margin-top: 2rem;">
                <summary style="font-size: 1.25rem; font-family: 'Cormorant Garamond', serif; font-weight: 600; cursor: pointer; padding: 0.5rem; border-radius: 4px; background: #f0f0f0;">
                    Pedidos Arquivados (${archivedOrders.length})
                </summary>
                <div style="padding-top: 1rem;">
                    <div style="display: ${isListMode ? 'flex' : 'grid'}; ${isListMode ? 'flex-direction: column; gap: 10px;' : 'grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;'}">
                        ${archivedOrders.length > 0 ? archivedOrders.map(renderOrderCard).join('') : '<div class="empty-state" style="grid-column: 1/-1; padding: 1rem 0;"><p class="empty-text">Nenhum pedido arquivado.</p></div>'}
                    </div>
                </div>
            </details>
        `;

        container.innerHTML = html;

        if (!silent) hideLoading();
    } catch (error) {
        if (!silent) hideLoading();
        console.error('Erro ao carregar pedidos:', error);
    }
}

function showCampaignsList() {
    const managerView = document.getElementById('campaignManagerView');
    const listView = document.getElementById('campaignsListView');

    if (managerView) {
        managerView.style.display = 'none';
    }
    if (listView) {
        listView.style.display = 'block';
    }
    
    currentManagingCampaignId = null;
}

// ============================================
// ADMIN - GESTÃO DE CLIENTES
// ============================================

let adminClientsData = [];
let adminClientsUsers = {};
let adminClientsSalesData = [];
let adminClientsHistoryData = [];
let adminClientsLastResetDate = 0;
let currentAdminClientsPage = 1;
const adminClientsPerPage = 10;
let inactiveClientsData = [];
let inactiveClientsDataFull = [];

async function loadAdminClients() {
    showLoading();
    try {
        // Carregar clientes, vendas e configurações de ciclos
        const [clientsSnapshot, salesSnapshot, configSnap, historySnap] = await Promise.all([
            clientsRef.once('value'),
            salesRef.once('value'),
            configRef.child('ranking').once('value'),
            rankingHistoryRef.orderByChild('closedAt').once('value')
        ]);

        const config = configSnap ? configSnap.val() || {} : {};
        adminClientsLastResetDate = config.lastResetDate || 0;

        adminClientsHistoryData = [];
        if (historySnap) {
            historySnap.forEach(h => {
                adminClientsHistoryData.push({ id: h.key, ...h.val() });
            });
            adminClientsHistoryData.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
        }

        adminClientsSalesData = [];
        if (salesSnapshot) {
            salesSnapshot.forEach(child => {
                adminClientsSalesData.push({ id: child.key, ...child.val() });
            });
        }

        const clients = [];
        if (clientsSnapshot) {
            clientsSnapshot.forEach(child => {
                const val = child.val();
                if (!val.hiddenFromAdmin) {
                    clients.push({ id: child.key, ...val });
                }
            });
        }

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

        // Injetar/Atualizar filtro de ciclo
        let cycleFilter = document.getElementById('adminClientCycleFilter');
        if (!cycleFilter && searchInput && searchInput.parentNode) {
            cycleFilter = document.createElement('select');
            cycleFilter.id = 'adminClientCycleFilter';
            cycleFilter.className = 'input-field';
            cycleFilter.style.maxWidth = '180px';
            cycleFilter.style.marginLeft = '10px';
            cycleFilter.style.display = 'inline-block';
            cycleFilter.style.padding = '8px';
            cycleFilter.onchange = () => {
                currentAdminClientsPage = 1;
                renderAdminClientsPage();
            };
            searchInput.parentNode.insertBefore(cycleFilter, searchInput.nextSibling);
        }

        if (cycleFilter) {
            let cycleOptionsHtml = `<option value="current">Ciclo Atual</option>`;
            adminClientsHistoryData.forEach(h => {
                cycleOptionsHtml += `<option value="${h.id}">Ciclo: ${formatDate(h.closedAt)}</option>`;
            });
            cycleOptionsHtml += `<option value="all">Todo o Período</option>`;
            
            const currentVal = cycleFilter.value || 'current';
            cycleFilter.innerHTML = cycleOptionsHtml;
            cycleFilter.value = cycleOptionsHtml.includes(`value="${currentVal}"`) ? currentVal : 'current';
        }
        
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
            const refNode = cycleFilter ? cycleFilter.nextSibling : searchInput.nextSibling;
            searchInput.parentNode.insertBefore(resellerFilter, refNode);
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
            
            const refNode = resellerFilter ? resellerFilter.nextSibling : (cycleFilter ? cycleFilter.nextSibling : searchInput.nextSibling);
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
            
            const refNode = exportBtn ? exportBtn.nextSibling : (resellerFilter ? resellerFilter.nextSibling : (cycleFilter ? cycleFilter.nextSibling : searchInput.nextSibling));
            searchInput.parentNode.insertBefore(inactiveBtn, refNode);
        }

    // Injetar botão de Visualização (Grade / Lista)
    let viewModeBtn = document.getElementById('adminClientViewModeBtn');
    if (!viewModeBtn && searchInput && searchInput.parentNode) {
        viewModeBtn = document.createElement('button');
        viewModeBtn.id = 'adminClientViewModeBtn';
        viewModeBtn.className = 'btn-secondary';
        viewModeBtn.style.marginLeft = '10px';
        viewModeBtn.style.padding = '8px';
        viewModeBtn.style.width = '40px';
        viewModeBtn.style.height = '38px';
        viewModeBtn.style.display = 'inline-flex';
        viewModeBtn.style.alignItems = 'center';
        viewModeBtn.style.justifyContent = 'center';
        viewModeBtn.style.fontSize = '1.2em';
        viewModeBtn.style.cursor = 'pointer';
        viewModeBtn.onclick = toggleAdminClientViewMode;
        
        const refNode = inactiveBtn ? inactiveBtn.nextSibling : (exportBtn ? exportBtn.nextSibling : (resellerFilter ? resellerFilter.nextSibling : (cycleFilter ? cycleFilter.nextSibling : searchInput.nextSibling)));
        searchInput.parentNode.insertBefore(viewModeBtn, refNode);
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

function toggleAdminClientViewMode() {
    const viewMode = localStorage.getItem('adminClientViewMode') || 'grid';
    localStorage.setItem('adminClientViewMode', viewMode === 'grid' ? 'list' : 'grid');
    renderAdminClientsPage();
}

function renderAdminClientsPage() {
    const container = document.getElementById('adminClientsList');
    if (!container) return;

    const searchInput = document.getElementById('adminClientSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const resellerFilter = document.getElementById('adminClientResellerFilter');
    const filterResellerId = resellerFilter ? resellerFilter.value : '';

    const cycleFilter = document.getElementById('adminClientCycleFilter');
    const selectedCycle = cycleFilter ? cycleFilter.value : 'current';

    let startTs = 0;
    let endTs = Infinity;

    if (selectedCycle === 'current') {
        startTs = adminClientsLastResetDate;
    } else if (selectedCycle !== 'all') {
        const hItem = adminClientsHistoryData.find(h => h.id === selectedCycle);
        if (hItem) {
            startTs = hItem.cycleStartDate || 0;
            const closedDate = new Date(hItem.closedAt);
            endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
        }
    } else {
        startTs = 0;
        endTs = Infinity;
    }

    // Recalcular Gasto Dinâmico pelo Ciclo
    const clientSpending = {};
    const salesDataToProcess = Array.isArray(adminClientsSalesData) ? adminClientsSalesData : [];
    
    salesDataToProcess.forEach(s => {
        if (!s || !s.clientId) return;
        if (s.productId === 'ACERTO' || s.category === 'Financeiro') return;

        const sDate = Number(s.date) || Number(s.dateApprox) || 0;
        if (sDate >= startTs && sDate <= endTs) {
            const price = Number(s.price) || 0;
            clientSpending[s.clientId] = (clientSpending[s.clientId] || 0) + price;
        }
    });

    adminClientsData.forEach(c => {
        c.totalSpent = clientSpending[c.id] || 0;
    });

    // Filtrar dados
    const filtered = adminClientsData.filter(client => {
        const reseller = adminClientsUsers[client.resellerId] || {};
        const text = ((client.name || '') + ' ' + (client.phone || '') + ' ' + (client.email || '') + ' ' + (reseller.name || '')).toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        const matchesReseller = filterResellerId ? client.resellerId === filterResellerId : true;
        return matchesSearch && matchesReseller;
    });

    let rankingContainer = document.getElementById('adminClientRankingContainer');
    if (!rankingContainer) {
        rankingContainer = document.createElement('div');
        rankingContainer.id = 'adminClientRankingContainer';
        rankingContainer.style.marginBottom = '20px';
        container.parentNode.insertBefore(rankingContainer, container);
    }

    const topClients = [...filtered].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).filter(c => c.totalSpent > 0).slice(0, 5);

    let cycleName = 'Ciclo Atual';
    if (selectedCycle === 'all') cycleName = 'Todo o Período';
    else if (selectedCycle !== 'current') cycleName = 'Ciclo Encerrado';

    rankingContainer.innerHTML = `
        <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #2c1810; display: flex; align-items: center; gap: 8px;">👑 Top 5 Clientes (Faturamento - ${cycleName})</h3>
            ${topClients.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                ${topClients.map((c, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                    return `
                        <div onclick="viewAdminClientHistory('${c.id}', '${c.resellerId}')" style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid ${index === 0 ? '#fbc02d' : '#eee'}; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';" title="Ver histórico de compras">
                            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                                <span style="font-size: 1.4em; font-weight: bold; width: 30px; text-align: center;">${medal}</span>
                                <div style="overflow: hidden;">
                                    <div style="font-weight: 600; color: #333; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;" title="${c.name}">${c.name}</div>
                                    <div style="font-size: 0.8em; color: #888; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${adminClientsUsers[c.resellerId]?.name || 'Desconhecida'}</div>
                                </div>
                            </div>
                            <div style="font-weight: bold; color: #28a745; font-size: 1.1em;">${formatCurrency(c.totalSpent)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            ` : '<div style="color: #666; font-style: italic; text-align: center; padding: 10px;">Nenhuma venda registrada para os clientes neste período.</div>'}
        </div>
    `;
    rankingContainer.style.display = 'block';

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

    const viewMode = localStorage.getItem('adminClientViewMode') || 'grid';
    const isListMode = viewMode === 'list';

    const viewBtn = document.getElementById('adminClientViewModeBtn');
    if (viewBtn) {
        viewBtn.innerHTML = isListMode ? '⊞' : '☰';
        viewBtn.title = isListMode ? 'Mudar para Grade' : 'Mudar para Lista';
    }

    // Renderizar Grid de Cards
    let html = `
        <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;">
                <input type="checkbox" id="selectAllAdminClients" onchange="toggleSelectAllAdminClients(this)">
                Selecionar Todos
            </label>
            <div style="margin-left: auto; display: flex; gap: 5px;">
                <button class="btn-delete" onclick="deleteSelectedAdminClients()" style="font-size: 14px; padding: 5px 10px; margin: 0;">Excluir Selecionados</button>
            </div>
        </div>
    `;

    html += `<div style="display: ${isListMode ? 'flex' : 'grid'}; ${isListMode ? 'flex-direction: column; gap: 10px;' : 'grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;'}">`;
    
    html += pageItems.map(client => {
        const reseller = adminClientsUsers[client.resellerId] || { name: 'Desconhecido' };
        
        let cleanPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
        const waLink = cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, ${client.name}!`)}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; margin-left: 5px; cursor: pointer;" title="Iniciar conversa no WhatsApp"><svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>` : '';
        
        if (isListMode) {
            return `
                <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 2; min-width: 250px;">
                        <input type="checkbox" class="admin-client-checkbox" value="${client.id}" style="width: 18px; height: 18px; cursor: pointer;">
                        <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-size: 1.5em;">👤</div>
                        <div>
                            <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${client.name} <span style="font-size: 0.8em; font-weight: normal; color: #28a745; margin-left: 5px;">(Gasto: ${formatCurrency(client.totalSpent || 0)})</span></div>
                            <div style="font-size: 0.85em; color: #888;">Rev: <span style="color: #4a90e2; font-weight: 500;">${reseller.name}</span></div>
                        </div>
                    </div>
                    
                    <div style="font-size: 0.9em; color: #555; flex: 3; min-width: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                        ${client.phone ? `<div style="display: flex; align-items: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📱 ${client.phone} ${waLink}</div>` : '<div style="color: #aaa; font-style: italic;">📱 Sem telefone</div>'}
                        ${client.email ? `<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📧 ${client.email}</div>` : ''}
                        ${client.notes ? `<div style="grid-column: 1 / -1; font-style: italic; color: #777; font-size: 0.85em; margin-top: 4px;">📝 ${client.notes}</div>` : ''}
                    </div>

                    <div style="display: flex; gap: 8px; flex: 1; min-width: 200px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="viewAdminClientHistory('${client.id}', '${client.resellerId}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">Histórico</button>
                        <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">Editar</button>
                        <button class="btn-secondary" onclick="hideClientFromAdmin('${client.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #dc3545; color: white; border: none;">Excluir</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <input type="checkbox" class="admin-client-checkbox" value="${client.id}" style="margin-top: 4px; width: 16px; height: 16px; cursor: pointer;">
                            <div>
                                <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${client.name}</div>
                                <div style="font-size: 0.85em; color: #28a745; font-weight: 600; margin-bottom: 2px;">Gasto: ${formatCurrency(client.totalSpent || 0)}</div>
                                <div style="font-size: 0.8em; color: #888;">Rev: ${reseller.name}</div>
                            </div>
                        </div>
                        <div style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-size: 1.2em;">👤</div>
                    </div>
                    
                    <div style="font-size: 0.9em; color: #555; margin-bottom: 15px; flex: 1;">
                        ${client.phone ? `<div style="display: flex; align-items: center; margin-bottom: 4px;">📱 ${client.phone} ${waLink}</div>` : ''}
                        ${client.email ? `<div style="margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">📧 ${client.email}</div>` : ''}
                        ${client.notes ? `<div style="font-style: italic; color: #777; font-size: 0.85em; margin-top: 5px;">📝 ${client.notes}</div>` : ''}
                    </div>

                    <div style="display: flex; gap: 8px; margin-top: auto; border-top: 1px solid #f0f0f0; padding-top: 10px;">
                        <button class="btn-secondary" onclick="viewAdminClientHistory('${client.id}', '${client.resellerId}')" style="flex: 1; font-size: 0.85em; padding: 6px;">Histórico</button>
                        <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="flex: 1; font-size: 0.85em; padding: 6px;">Editar</button>
                        <button class="btn-secondary" onclick="hideClientFromAdmin('${client.id}')" style="flex: 1; font-size: 0.85em; padding: 6px; background-color: #dc3545; color: white; border: none;">Excluir</button>
                    </div>
                </div>
            `;
        }
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
            const totalValue = clientSales.reduce((sum, sale) => sum + (Number(sale.price) || 0), 0);
            const totalProducts = clientSales.length;
            const uniqueSales = new Set(clientSales.map(s => s.groupId || s.id)).size;

            const summaryHtml = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; border: 1px solid #eee;">
                    <div style="text-align: center; flex: 1; border-right: 1px solid #ddd;">
                        <div style="font-size: 0.85em; color: #666;">Pedidos</div>
                        <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${uniqueSales}</div>
                    </div>
                    <div style="text-align: center; flex: 1; border-right: 1px solid #ddd;">
                        <div style="font-size: 0.85em; color: #666;">Produtos</div>
                        <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${totalProducts}</div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 0.85em; color: #666;">Total Gasto</div>
                        <div style="font-weight: bold; color: #28a745; font-size: 1.1em;">${formatCurrency(totalValue)}</div>
                    </div>
                </div>
            `;

            container.innerHTML = summaryHtml + clientSales.reverse().map(sale => `
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

function toggleSelectAllAdminClients(source) {
    const checkboxes = document.querySelectorAll('.admin-client-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function deleteSelectedAdminClients() {
    const selected = document.querySelectorAll('.admin-client-checkbox:checked');
    if (selected.length === 0) {
        showNotification('Nenhum cliente selecionado', 'error');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selected.length} clientes selecionados?`)) return;

    showLoading();
    try {
        const updates = {};
        selected.forEach(cb => {
            updates[cb.value] = null;
        });
        
        await clientsRef.update(updates);
        hideLoading();
        showNotification('Clientes excluídos com sucesso!');
        loadAdminClients();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir clientes:', error);
        showNotification('Erro ao excluir clientes', 'error');
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
            'Total Gasto': client.totalSpent || 0,
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
        salesSnapshot.forEach(child => {
            sales.push(child.val());
        });

        const users = {};
        usersSnapshot.forEach(child => {
            users[child.key] = child.val();
        });

        // Calcular última compra de cada cliente (ignora registros de acerto financeiro)
        const clientLastPurchase = {};
        sales.forEach(sale => {
            if (sale.clientId && !isFinancialSale(sale)) {
                const saleDate = Number(sale.date) || Number(sale.dateApprox) || 0;
                if (!clientLastPurchase[sale.clientId] || saleDate > clientLastPurchase[sale.clientId]) {
                    clientLastPurchase[sale.clientId] = saleDate;
                }
            }
        });

        inactiveClientsDataFull = clients.map(c => ({
            ...c,
            lastPurchase: clientLastPurchase[c.id],
            resellerName: users[c.resellerId]?.name || 'Desconhecido'
        }));

        // Renderizar Modal
        if (!document.getElementById('inactiveClientsModal')) {
             const modalHtml = `
                <div id="inactiveClientsModal" class="modal-overlay">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3>Relatório de Clientes Inativos</h3>
                            <button class="close-modal" onclick="document.getElementById('inactiveClientsModal').classList.remove('active')">×</button>
                        </div>
                        <div class="modal-body">
                            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <label style="font-weight: 500; color: #555;">Inativos há mais de:</label>
                                    <div style="display: flex; align-items: center; gap: 5px;">
                                        <input type="number" id="inactiveDaysInput" value="90" min="1" class="input-field" style="width: 80px; margin-bottom: 0; padding: 6px;" onchange="filterAndRenderInactiveClients()">
                                        <span style="color: #666;">dias</span>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500; color: #555;">
                                        <input type="checkbox" id="showHiddenInactiveCb" onchange="filterAndRenderInactiveClients()">
                                        Mostrar Ocultos
                                    </label>
                                    <span>Total: <strong id="inactiveCount">0</strong> clientes</span>
                                    <button class="btn-secondary" onclick="exportInactiveClientsReport()" style="margin: 0; padding: 6px 12px; background: #28a745; color: white; border: none;">📥 Excel</button>
                                </div>
                            </div>
                            <div id="inactiveClientsList" style=""></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } else {
            const cb = document.getElementById('showHiddenInactiveCb');
            if (cb) cb.checked = false;
        }

        filterAndRenderInactiveClients();

        document.getElementById('inactiveClientsModal').classList.add('active');
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório', 'error');
    }
}

function filterAndRenderInactiveClients() {
    const daysInput = document.getElementById('inactiveDaysInput');
    const days = daysInput ? parseInt(daysInput.value) || 90 : 90;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const showHidden = document.getElementById('showHiddenInactiveCb') ? document.getElementById('showHiddenInactiveCb').checked : false;

    inactiveClientsData = inactiveClientsDataFull.filter(client => {
        const lastPurchase = client.lastPurchase;
        const isInactive = !lastPurchase || lastPurchase < cutoffTime;
        const isHidden = !!client.hiddenFromInactiveReport;
        
        if (!isInactive) return false;
        return showHidden ? isHidden : !isHidden;
    });

    inactiveClientsData.sort((a, b) => (a.lastPurchase || 0) - (b.lastPurchase || 0));

    const container = document.getElementById('inactiveClientsList');
    const countEl = document.getElementById('inactiveCount');
    
    if (countEl) countEl.textContent = inactiveClientsData.length;

    if (inactiveClientsData.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-text">Nenhum cliente inativo encontrado para este período.</p></div>';
    } else {
        container.innerHTML = inactiveClientsData.map(c => {
            const lastPurchaseDate = c.lastPurchase ? formatDate(c.lastPurchase) : 'Nunca comprou';
            
            let cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
            if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
            const waLink = cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, ${c.name}! Tudo bem? Notamos que faz um tempo desde sua última comprinha conosco...`)}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; margin-left: 5px; cursor: pointer;" title="Iniciar conversa no WhatsApp"><svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>` : '';

            return `
            <div style="background: #fff; padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; ${showHidden ? 'opacity: 0.7;' : ''}">
                <div>
                    <div style="font-weight: bold; color: #2c1810;">${c.name}</div>
                    <div style="font-size: 0.85em; color: #666; display: flex; align-items: center;">
                        Revendedora: ${c.resellerName} | Tel: ${c.phone || '-'} ${waLink}
                    </div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <div>
                        <span style="font-size: 0.85em; color: #dc3545; font-weight: 500;">Última compra:</span>
                        <span style="font-size: 0.9em; margin-left: 5px;">${lastPurchaseDate}</span>
                    </div>
                    ${showHidden ? `
                        <button class="btn-secondary" onclick="unhideClientFromInactive('${c.id}')" style="margin: 0; padding: 4px 8px; font-size: 0.75em; background: #28a745; color: white; border: none; cursor: pointer; border-radius: 4px;">Restaurar</button>
                    ` : `
                        <button class="btn-secondary" onclick="hideClientFromInactive('${c.id}')" style="margin: 0; padding: 4px 8px; font-size: 0.75em; cursor: pointer; border-radius: 4px;">Ocultar</button>
                    `}
                </div>
            </div>
        `}).join('');
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

async function hideClientFromInactive(clientId) {
    if (!confirm('Deseja ocultar este cliente da lista de inativos?')) return;
    showLoading();
    try {
        await clientsRef.child(clientId).update({ hiddenFromInactiveReport: true });
        
        const clientIndex = inactiveClientsDataFull.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            inactiveClientsDataFull[clientIndex].hiddenFromInactiveReport = true;
        }
        
        filterAndRenderInactiveClients();
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error(e);
        showNotification('Erro ao ocultar cliente', 'error');
    }
}

async function unhideClientFromInactive(clientId) {
    showLoading();
    try {
        await clientsRef.child(clientId).update({ hiddenFromInactiveReport: null });
        
        const clientIndex = inactiveClientsDataFull.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            inactiveClientsDataFull[clientIndex].hiddenFromInactiveReport = false;
        }
        
        filterAndRenderInactiveClients();
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error(e);
        showNotification('Erro ao restaurar cliente', 'error');
    }
}

// ============================================
// NOVO PEDIDO MANUAL (MODAL)
// ============================================

async function openManualOrderModal() {
    if (!document.getElementById('manualOrderModal')) {
        const modalHtml = `
            <div id="manualOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 1200px;">
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                                <h4>Itens do Pedido</h4>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn-secondary" onclick="openCreateCombinationModal('manualOrderItemsList')" style="font-size: 0.8em; background-color: #d4a574; color: white; border: none;">🔗 Criar Combinação</button>
                                    <button class="btn-secondary" onclick="addManualOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
                                </div>
                            </div>
                            <div id="manualOrderItemsList" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;"></div>
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

function addExtraImageInput(btn) {
    const container = btn.closest('.image-links-wrapper').querySelector('.image-inputs-container');
    const currentInputs = container.querySelectorAll('input.item-image');
    const nextIndex = currentInputs.length + 1;

    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 5px;';
    div.className = 'extra-image-row';
    div.innerHTML = `
        <input type="text" class="input-field item-image extra-image" placeholder="URL ${nextIndex}" style="margin-bottom:0; padding: 8px; flex: 1;">
        <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Ver prévia da imagem">👁️</button>
        <button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Remover URL">×</button>
    `;
    container.appendChild(div);
}

function addManualOrderItem(product = null) {
    const container = document.getElementById('manualOrderItemsList');
    const div = document.createElement('div');
    div.className = 'manual-order-item';
    
    div.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; position: relative;';

    const idValue = product && product.id ? product.id : generateId();
    const nameValue = product ? String(product.name).replace(/"/g, '&quot;') : '';
    const codeValue = product ? String(product.code).replace(/"/g, '&quot;') : '';
    const code2Value = product && product.code2 ? String(product.code2).replace(/"/g, '&quot;') : '';
    const catValue = product && product.category ? String(product.category).replace(/"/g, '&quot;') : 'Sem categoria';
    const priceValue = product ? product.price : '';
    const qtyValue = product ? product.quantity : '1';
    const imgValue = product && product.imageUrl ? String(product.imageUrl).replace(/"/g, '&quot;') : '';
    const barcodeValue = product && product.barcode ? String(product.barcode).replace(/"/g, '&quot;') : '';
    const createdAtValue = product && product.createdAt ? product.createdAt : '';
    const isCombination = product && product.isCombination ? true : false;
    const componentsValue = product && product.components ? product.components.join(',') : '';
    const comboBadge = isCombination ? '<span style="background: #d4a574; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight: bold; margin-left: 5px;">COMBINAÇÃO</span>' : '';

  let extraUrlsHtml = '';
    if (product) {
        let i = 2;
        while (product[`url${i}`]) {
            const safeUrl = String(product[`url${i}`]).replace(/"/g, '&quot;');
            extraUrlsHtml += `
                <div style="display: flex; gap: 5px;" class="extra-image-row">
                    <input type="text" class="input-field item-image extra-image" placeholder="URL ${i}" value="${safeUrl}" style="margin-bottom:0; padding: 8px; flex: 1;">
                    <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Ver prévia da imagem">👁️</button>
                    <button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Remover URL">×</button>
                </div>
            `;
            i++;
        }
    }

    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">×</button>
        <input type="checkbox" class="combination-cb" value="${idValue}" style="position: absolute; top: 15px; left: 15px; width: 18px; height: 18px; cursor: pointer; z-index: 10;" title="Selecionar para combinar">
        <input type="hidden" class="item-id" value="${idValue}">
        <input type="hidden" class="item-barcode" value="${barcodeValue}">
        <input type="hidden" class="item-created-at" value="${createdAtValue}">
        <input type="hidden" class="item-is-combination" value="${isCombination}">
        <input type="hidden" class="item-components" value="${componentsValue}">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; padding-right: 30px;">
            <!-- Campos de Edição com Bloqueios caso seja combinação -->
        </div>
    `;
    
    // Remontando o Grid Interno pra manter limpo
    const gridHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; padding-left: 30px; padding-right: 30px;">
            <div>
                <label style="font-size:0.8em; color:#666; display:flex; align-items:center; margin-bottom:3px;" title="${product && product.technicalName ? product.technicalName : ''}">Nome Comercial ${comboBadge} ${product && product.technicalName ? `<span style="color:#888; font-weight:normal; margin-left:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">(Téc: ${product.technicalName})</span>` : ''}</label>
                <input type="text" class="input-field item-name" placeholder="Nome Comercial" value="${nameValue}" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Categoria</label>
                <input type="text" class="input-field item-category" placeholder="Categoria" value="${catValue}" style="margin-bottom:0; padding: 8px;">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; padding-left: 30px; padding-right: 30px;">
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Cód.</label>
                <input type="text" class="input-field item-code" placeholder="Cód" value="${codeValue}" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Ref. 2</label>
                <input type="text" class="input-field item-code2" placeholder="Ref. 2" value="${code2Value}" style="margin-bottom:0; padding: 8px;">
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Preço (R$)</label>
                <input type="number" class="input-field item-price" placeholder="0.00" value="${priceValue}" step="0.01" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Qtd.</label>
                <input type="number" class="input-field item-qty" value="${qtyValue}" min="1" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
        </div>
        <div style="padding-left: 30px;" class="image-links-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:0;">Links das Imagens</label>
                <button type="button" class="btn-secondary" onclick="addExtraImageInput(this)" style="margin: 0; padding: 2px 8px; font-size: 0.75em;">+ URL</button>
            </div>
            <div class="image-inputs-container" style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; gap: 5px;">
                    <input type="text" class="input-field item-image main-image" placeholder="URL Principal (Google Drive, etc)" value="${imgValue}" style="margin-bottom:0; padding: 8px; flex: 1;">
                    <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Ver prévia da imagem">👁️</button>
                </div>
                ${extraUrlsHtml}
            </div>
        </div>
    `;
    
    div.innerHTML += gridHTML;
    container.appendChild(div);

     // Focar no campo de nome se for um novo item adicionado manualmente
    if (!product) {
        const nameInput = div.querySelector('.item-name');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 50);
        }
    }
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
let currentOrderRemovalLog = [];
let currentEditOrderProductsMap = {};

async function openEditOrderModal(orderId) {
    showLoading();
    currentEditingOrderId = orderId;

    const existingModal = document.getElementById('editOrderModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Injetar modal se não existir
    if (!document.getElementById('editOrderModal')) {
        const modalHtml = `
            <div id="editOrderModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 1200px;">
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

                        <div id="editOrderRemovalLogContainer" style="margin-top: 20px; display: none;">
                            <h4 style="margin-bottom: 10px; color: #dc3545; font-size: 1em;">Histórico de Itens Removidos</h4>
                            <div id="editOrderRemovalLogList" style="max-height: 150px; overflow-y: auto; font-size: 0.85em; color: #666; background: #fff5f5; padding: 10px; border-radius: 6px; border: 1px dashed #dc3545;"></div>
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
        
        currentEditOrderProductsMap = products;

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
        
        currentOrderRemovalLog = order.removedItemsLog || [];
        renderOrderRemovalLog();
        
        productsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <h4 style="margin:0;">Itens do Pedido</h4>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-secondary" onclick="openCreateCombinationModal('editOrderItemsList')" style="font-size: 0.8em; background-color: #d4a574; color: white; border: none;">🔗 Criar Combinação</button>
                    <button class="btn-secondary" onclick="addEditOrderItem()" style="font-size: 0.8em;">+ Adicionar Item</button>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <input type="text" id="editOrderSearchInput" placeholder="🔍 Buscar produto neste pedido por nome, código ou categoria..." class="input-field" oninput="filterEditOrderItems()" style="margin-bottom: 0; padding: 10px;">
            </div>
            <div id="editOrderItemsList" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;"></div>
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
                    quantity: 1,
                    isCombination: false
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
    
    div.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; position: relative;';

    const idValue = product && product.id ? product.id : generateId();
    const nameValue = product ? String(product.name).replace(/"/g, '&quot;') : '';
    const codeValue = product ? String(product.code).replace(/"/g, '&quot;') : '';
    const code2Value = product && product.code2 ? String(product.code2).replace(/"/g, '&quot;') : '';
    const catValue = product && product.category ? String(product.category).replace(/"/g, '&quot;') : 'Sem categoria';
    const priceValue = product ? product.price : '';
    const qtyValue = product ? product.quantity : '1';
    const imgValue = product && product.imageUrl ? String(product.imageUrl).replace(/"/g, '&quot;') : '';
    const barcodeValue = product && product.barcode ? String(product.barcode).replace(/"/g, '&quot;') : '';
    const createdAtValue = product && product.createdAt ? product.createdAt : '';
    const restoredAtValue = product && product.restoredAt ? product.restoredAt : '';
    const restoredReasonValue = product && product.restoredReason ? String(product.restoredReason).replace(/"/g, '&quot;') : '';
    const restoredByValue = product && product.restoredBy ? String(product.restoredBy).replace(/"/g, '&quot;') : '';
    const isCombination = product && product.isCombination ? true : false;
    const componentsValue = product && product.components ? product.components.join(',') : '';
    const comboBadge = isCombination ? '<span style="background: #d4a574; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight: bold; margin-left: 5px;">COMBINAÇÃO</span>' : '';
    const restoredBadge = restoredAtValue ? `<span style="background: #17a2b8; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7em; font-weight: bold; margin-left: 5px;" title="Motivo: ${restoredReasonValue} (${restoredByValue})">RESTAURADO (${formatDate(restoredAtValue)})</span>` : '';

    let extraUrlsHtml = '';
    if (product) {
        let i = 2;
        while (product[`url${i}`]) {
            const safeUrl = String(product[`url${i}`]).replace(/"/g, '&quot;');
            extraUrlsHtml += `
                <div style="display: flex; gap: 5px;" class="extra-image-row">
                    <input type="text" class="input-field item-image extra-image" placeholder="URL ${i}" value="${safeUrl}" style="margin-bottom:0; padding: 8px; flex: 1;">
                    <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Ver prévia da imagem">👁️</button>
                    <button type="button" class="btn-delete" onclick="this.parentElement.remove()" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Remover URL">×</button>
                </div>
            `;
            i++;
        }
    }

    div.innerHTML = `
        <button onclick="removeEditOrderItem(this)" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;" title="Remover Item">×</button>
        <input type="checkbox" class="combination-cb" value="${idValue}" style="position: absolute; top: 15px; left: 15px; width: 18px; height: 18px; cursor: pointer; z-index: 10;" title="Selecionar para combinar">
        <input type="hidden" class="item-id" value="${idValue}">
        <input type="hidden" class="item-barcode" value="${barcodeValue}">
        <input type="hidden" class="item-created-at" value="${createdAtValue}">
        <input type="hidden" class="item-restored-at" value="${restoredAtValue}">
        <input type="hidden" class="item-restored-reason" value="${restoredReasonValue}">
        <input type="hidden" class="item-restored-by" value="${restoredByValue}">
        <input type="hidden" class="item-is-combination" value="${isCombination}">
        <input type="hidden" class="item-components" value="${componentsValue}">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; padding-left: 30px; padding-right: 30px;">
            <div>
                <label style="font-size:0.8em; color:#666; display:flex; align-items:center; margin-bottom:3px;" title="${product && product.technicalName ? product.technicalName : ''}">Nome Comercial ${comboBadge} ${restoredBadge} ${product && product.technicalName ? `<span style="color:#888; font-weight:normal; margin-left:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">(Téc: ${product.technicalName})</span>` : ''}</label>
                <input type="text" class="input-field item-name" placeholder="Nome Comercial" value="${nameValue}" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Categoria</label>
                <input type="text" class="input-field item-category" placeholder="Categoria" value="${catValue}" style="margin-bottom:0; padding: 8px;">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; padding-left: 30px; padding-right: 30px;">
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Cód.</label>
                <input type="text" class="input-field item-code" placeholder="Cód" value="${codeValue}" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Ref. 2</label>
                <input type="text" class="input-field item-code2" placeholder="Ref. 2" value="${code2Value}" style="margin-bottom:0; padding: 8px;">
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Preço (R$)</label>
                <input type="number" class="input-field item-price" placeholder="0.00" value="${priceValue}" step="0.01" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
            <div>
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:3px;">Qtd.</label>
                <input type="number" class="input-field item-qty" value="${qtyValue}" min="1" style="margin-bottom:0; padding: 8px;" ${isCombination ? 'readonly style="background:#eee; margin-bottom:0; padding: 8px;"' : ''}>
            </div>
        </div>
        <div style="padding-left: 30px;" class="image-links-wrapper">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <label style="font-size:0.8em; color:#666; display:block; margin-bottom:0;">Links das Imagens</label>
                <button type="button" class="btn-secondary" onclick="addExtraImageInput(this)" style="margin: 0; padding: 2px 8px; font-size: 0.75em;">+ URL</button>
            </div>
            <div class="image-inputs-container" style="display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; gap: 5px;">
                    <input type="text" class="input-field item-image main-image" placeholder="URL Principal (Google Drive, etc)" value="${imgValue}" style="margin-bottom:0; padding: 8px; flex: 1;">
                    <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin-bottom:0; padding: 8px 12px; font-size: 0.9em; width: auto;" title="Ver prévia da imagem">👁️</button>
                </div>
                ${extraUrlsHtml}
            </div>
        </div>
    `;
    
    container.appendChild(div);

    // Focar no campo de nome se for um novo item adicionado manualmente
    if (!product) {
        const nameInput = div.querySelector('.item-name');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 50);
        }
    }
}

function filterEditOrderItems() {
    const searchInput = document.getElementById('editOrderSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('#editOrderItemsList .edit-order-item');
    
    items.forEach(item => {
        const name = item.querySelector('.item-name').value.toLowerCase();
        const code = item.querySelector('.item-code').value.toLowerCase();
        const code2 = item.querySelector('.item-code2').value.toLowerCase();
        const category = item.querySelector('.item-category').value.toLowerCase();
        
        if (name.includes(searchTerm) || code.includes(searchTerm) || code2.includes(searchTerm) || category.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function closeEditOrderModal() {
    document.getElementById('editOrderModal').classList.remove('active');
    currentEditingOrderId = null;
}

function removeEditOrderItem(btn) {
    const row = btn.closest('.edit-order-item');
    const itemNameInput = row.querySelector('.item-name');
    const itemName = itemNameInput ? itemNameInput.value : 'Produto sem nome';
    const itemIdInput = row.querySelector('.item-id');
    const itemId = itemIdInput ? itemIdInput.value : '';

    const reason = prompt(`Deseja remover "${itemName}" do pedido?\\nSe sim, digite o motivo abaixo (opcional):`);
    if (reason === null) return; // Usuário cancelou

    currentOrderRemovalLog.push({
        productId: itemId,
        productName: itemName,
        reason: reason.trim() || 'Sem justificativa',
        date: Date.now(),
        removedBy: currentUser.name || 'Desconhecido'
    });

    row.remove();
    renderOrderRemovalLog();
}

function renderOrderRemovalLog() {
    const container = document.getElementById('editOrderRemovalLogContainer');
    const list = document.getElementById('editOrderRemovalLogList');
    if (!container || !list) return;
    if (currentOrderRemovalLog.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    list.innerHTML = currentOrderRemovalLog.map((log, index) => `<div style="margin-bottom: 8px; border-bottom: 1px solid #f5c6cb; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;"><div><div style="font-weight: bold; color: #bd2130;">${log.productName}</div><div style="font-size: 0.9em; margin-top: 2px;">Motivo: <strong style="color: #495057;">${log.reason}</strong></div></div><div style="text-align: right; font-size: 0.85em; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;"><div>${formatDate(log.date)}</div><div style="color: #888;">Por: ${log.removedBy}</div><button type="button" onclick="undoRemoveEditOrderItem(${index})" style="background: #17a2b8; color: white; border: none; border-radius: 4px; padding: 2px 8px; font-size: 0.9em; cursor: pointer;" title="Desfazer e retornar produto ao pedido">↺ Desfazer</button></div></div>`).join('');
}

async function undoRemoveEditOrderItem(index) {
    const logItem = currentOrderRemovalLog[index];
    if (!logItem) return;

    const reason = prompt(`Deseja restaurar "${logItem.productName}" ao pedido?\\nSe sim, digite o motivo da restauração (opcional):`);
    if (reason === null) return; // Usuário cancelou

    let product = currentEditOrderProductsMap[logItem.productId];
    if (!product) {
        const snap = await productsRef.child(logItem.productId).once('value');
        if (snap.exists()) {
            product = { id: snap.key, ...snap.val() };
            currentEditOrderProductsMap[logItem.productId] = product;
        } else {
            product = { id: logItem.productId, name: logItem.productName, code: 'REST', price: 0, quantity: 1 };
        }
    }

    product.restoredAt = Date.now(); // Marca como restaurado
    product.restoredReason = reason.trim() || 'Sem justificativa';
    product.restoredBy = currentUser.name || 'Admin';
    
    currentOrderRemovalLog.splice(index, 1);
    renderOrderRemovalLog();
    addEditOrderItem(product);
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
            const barcode = row.querySelector('.item-barcode').value;
            const createdAtVal = row.querySelector('.item-created-at').value;
            const restoredAtVal = row.querySelector('.item-restored-at') ? row.querySelector('.item-restored-at').value : '';
            const restoredReasonVal = row.querySelector('.item-restored-reason') ? row.querySelector('.item-restored-reason').value : '';
            const restoredByVal = row.querySelector('.item-restored-by') ? row.querySelector('.item-restored-by').value : '';
            const isCombination = row.querySelector('.item-is-combination') ? row.querySelector('.item-is-combination').value === 'true' : false;
            const componentsStr = row.querySelector('.item-components') ? row.querySelector('.item-components').value : '';
            
            const name = row.querySelector('.item-name').value;
            const code = row.querySelector('.item-code').value;
            const code2 = row.querySelector('.item-code2').value.trim();
            const category = row.querySelector('.item-category').value.trim() || 'Sem categoria';
            const price = parseFloat(row.querySelector('.item-price').value);
            const quantity = parseInt(row.querySelector('.item-qty').value) || 1;
            const imageUrl = row.querySelector('.main-image') ? row.querySelector('.main-image').value.trim() : (row.querySelector('.item-image') ? row.querySelector('.item-image').value.trim() : '');
            const extraImageInputs = row.querySelectorAll('.extra-image');
            const additionalUrls = {};
            let urlIndex = 2;
            extraImageInputs.forEach(input => {
                const val = input.value.trim();
                if (val) {
                    additionalUrls[`url${urlIndex}`] = val;
                    urlIndex++;
                }
            });

            if (name && !isNaN(price)) {
                let productId = id;
                if (!productId) {
                    productId = generateId();
                }
                
                productIds.push(productId);
                
                const createdAt = createdAtVal ? Number(createdAtVal) : firebase.database.ServerValue.TIMESTAMP;
                const restoredAt = restoredAtVal ? Number(restoredAtVal) : null;

                updates[`products/${productId}`] = {
                    name,
                    code: code || 'S/C',
                    code2: code2,
                    category: category,
                    quantity,
                    price,
                    imageUrl: imageUrl,
                    ...additionalUrls,
                    barcode: barcode,
                    available: quantity,
                    createdAt: createdAt,
                    restoredAt: restoredAt,
                    restoredReason: restoredReasonVal || null,
                    restoredBy: restoredByVal || null
                };
            }
        });

        if (productIds.length === 0) {
            hideLoading();
            showNotification('Preencha os dados dos itens corretamente', 'error');
            return;
        }

        // Atualizar produtos
        await usersRef.parent.update(updates);

        // Atualizar pedido
        await ordersRef.child(currentEditingOrderId).update({
            resellerId,
            products: productIds,
            removedItemsLog: currentOrderRemovalLog
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

// ============================================
// MODAL PARA CRIAR COMBINAÇÃO DE PRODUTOS
// ============================================

function openCreateCombinationModal(listId) {
    const selectedCbs = document.querySelectorAll(`#${listId} .combination-cb:checked`);
    if (selectedCbs.length < 2) {
        showNotification('Selecione pelo menos 2 produtos marcando a caixa no canto superior esquerdo de cada um.', 'error');
        return;
    }

    let totalPrice = 0;
    const components = [];
    
    selectedCbs.forEach(cb => {
        const row = cb.closest('.edit-order-item, .manual-order-item');
        let id = row.querySelector('.item-id').value;
        if (!id) {
            id = generateId();
            row.querySelector('.item-id').value = id;
        }
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        components.push(id);
        totalPrice += price;
    });

    if (!document.getElementById('createCombinationModal')) {
        const modalHtml = `
            <div id="createCombinationModal" class="modal-overlay" style="z-index: 2000;">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>Criar Combinação (Cesta)</h3>
                        <button class="close-modal" onclick="document.getElementById('createCombinationModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Os produtos selecionados serão agrupados num único item. O preço total é a soma deles.</p>
                        
                        <div class="form-group">
                            <label>Nome da Combinação</label>
                            <input type="text" id="comboNameInput" class="input-field" placeholder="Ex: Kit Dia das Mães">
                        </div>
                        
                        <div class="form-group">
                            <label>Link da Imagem Específica</label>
                            <input type="text" id="comboImageInput" class="input-field" placeholder="URL da Imagem">
                        </div>

                        <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 15px;">
                            <span style="font-size: 0.9em; color: #666;">Preço Calculado:</span>
                            <div id="comboPriceDisplay" style="font-size: 1.5em; font-weight: bold; color: #2c1810;"></div>
                        </div>

                        <input type="hidden" id="comboComponentsData">
                        <input type="hidden" id="comboPriceData">
                        <input type="hidden" id="comboTargetListId">

                        <button class="btn-primary" onclick="confirmCreateCombination()" style="width: 100%;">Criar Combinação</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('comboNameInput').value = '';
    document.getElementById('comboImageInput').value = '';
    document.getElementById('comboPriceDisplay').innerHTML = formatCurrency(totalPrice);
    document.getElementById('comboComponentsData').value = components.join(',');
    document.getElementById('comboPriceData').value = totalPrice;
    document.getElementById('comboTargetListId').value = listId;

    document.getElementById('createCombinationModal').classList.add('active');
}

function confirmCreateCombination() {
    const name = document.getElementById('comboNameInput').value.trim();
    const imageUrl = document.getElementById('comboImageInput').value.trim();
    const componentsStr = document.getElementById('comboComponentsData').value;
    const price = parseFloat(document.getElementById('comboPriceData').value);
    const targetListId = document.getElementById('comboTargetListId').value;

    if (!name) {
        showNotification('Dê um nome para a combinação', 'error');
        return;
    }

    const newId = generateId();
    const productData = {
        id: newId,
        name: name,
        code: 'COMBO',
        category: 'Combinações',
        price: price,
        quantity: 1,
        imageUrl: imageUrl,
        isCombination: true,
        components: componentsStr.split(',')
    };

    if (targetListId === 'editOrderItemsList') {
        addEditOrderItem(productData);
    } else {
        addManualOrderItem(productData);
    }

    document.querySelectorAll(`#${targetListId} .combination-cb`).forEach(cb => cb.checked = false);
    document.getElementById('createCombinationModal').classList.remove('active');
    showNotification('Combinação adicionada! Salve as alterações do pedido para confirmar.');
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

        await usersRef.parent.update(updates);

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

// ============================================
// NOTIFICAÇÕES EM TEMPO REAL (ADMIN)
// ============================================
let adminRealtimeInitialized = false;
let isAdminSoundMuted = localStorage.getItem('adminSoundMuted') === 'true';

// Objeto de áudio global para pré-carregamento
const adminNotificationSound = new Audio('venda.mp3');
adminNotificationSound.preload = 'auto';

// Resetar o botão de teste quando o áudio terminar de tocar naturalmente
adminNotificationSound.addEventListener('ended', () => {
    const btn = document.getElementById('testSoundBtn');
    if (btn) btn.innerHTML = '▶️ Testar';
});

function toggleAdminSound() {
    isAdminSoundMuted = !isAdminSoundMuted;
    localStorage.setItem('adminSoundMuted', isAdminSoundMuted);
    updateAdminSoundButton();
}

function testAdminSound() {
    const btn = document.getElementById('testSoundBtn');
    if (adminNotificationSound.paused) {
        adminNotificationSound.currentTime = 0;
        adminNotificationSound.muted = false; // Garante que sai som no teste manual mesmo se estiver mutado globalmente
        const playPromise = adminNotificationSound.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Erro ao testar som:', e);
                showAdminToast('🔇 Som Bloqueado', 'Seu navegador bloqueou o áudio. Clique em qualquer lugar da tela e tente novamente.');
            });
        }
        if (btn) btn.innerHTML = '⏹️';
    } else {
        adminNotificationSound.pause();
        adminNotificationSound.currentTime = 0;
        if (btn) btn.innerHTML = '▶️';
    }
}

function updateAdminSoundButton() {
    const btn = document.getElementById('toggleSoundBtn');
    if (btn) {
        btn.innerHTML = isAdminSoundMuted ? '🔇' : '🔊';
        btn.style.opacity = isAdminSoundMuted ? '0.7' : '1';
    }
}

function showAdminToast(title, message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-left: 5px solid #28a745;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 250px;
    `;
    toast.innerHTML = `
        <strong style="color: #2c1810; font-size: 1.1em;">${title}</strong>
        <span style="color: #555; font-size: 0.95em;">${message}</span>
    `;
    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');

    // Remover após 5 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function setupAdminRealtime() {
    if (adminRealtimeInitialized) return;
    adminRealtimeInitialized = true;

    // Monitora a coleção de vendas em tempo real
    salesRef.on('value', async (snapshot) => {
        if (!currentUser || currentUser.role !== 'admin') return;

        try {
            // Pegar a configuração do ciclo atual (para a contagem ser igual ao dashboard)
            const configSnap = await configRef.child('ranking').once('value');
            const config = configSnap.val() || {};
            const lastResetDate = config.lastResetDate || 0;

            const sales = [];
            snapshot.forEach(child => {
                sales.push(child.val());
            });
            
            // Considerar apenas vendas reais de produtos do CICLO ATUAL (igual ao Dashboard)
            const productSales = sales.filter(s => !isFinancialSale(s) && s.date >= lastResetDate);
            const newCount = productSales.length;

            // Busca a última contagem vista DIRETAMENTE do banco de dados do admin logado
            const userSnap = await usersRef.child(currentUser.uid).child('lastSeenSalesCount').once('value');
            let lastSeen = userSnap.val();

            console.log(`[Notificação Tempo Real] Última Qtd Vista: ${lastSeen} | Qtd Atual no Banco (Ciclo Atual): ${newCount}`);

            if (lastSeen === null) {
                // Primeira vez no sistema, apenas salva a quantidade atual para base
                await usersRef.child(currentUser.uid).update({ lastSeenSalesCount: newCount });
            } 
            else if (newCount > lastSeen) {
                const diff = newCount - lastSeen;
                const newSales = productSales.slice(-diff);
                const totalValue = newSales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
                const latestSale = newSales[newSales.length - 1];

                // Força o play do Som
                if (!isAdminSoundMuted) {
                    adminNotificationSound.muted = false;
                    adminNotificationSound.currentTime = 0;
                    const playPromise = adminNotificationSound.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            console.warn('Erro ao tocar som:', e);
                            showAdminToast('🔇 Áudio Bloqueado', 'O navegador bloqueou o som. Clique na tela para permitir.');
                        });
                    }
                }

                // Exibir Toast
                if (latestSale && latestSale.resellerId) {
                    const resellerSnap = await usersRef.child(latestSale.resellerId).once('value');
                    const rName = resellerSnap.val() ? resellerSnap.val().name : 'Desconhecida';
                    let msg = diff > 1 
                        ? `Lote de ${diff} itens: <strong>${formatCurrency(totalValue)}</strong><br>Por: ${rName}`
                        : `Valor: <strong>${formatCurrency(totalValue)}</strong><br>Por: ${rName}`;
                    showAdminToast('🛍️ Nova Venda Registrada!', msg);
                }

                // Atualiza no banco para que outros dispositivos saibam que você já viu essa quantidade
                await usersRef.child(currentUser.uid).update({ lastSeenSalesCount: newCount });
            } 
            else if (newCount < lastSeen) {
                // Se a venda foi excluída ou o ciclo foi zerado, diminui também a "memória" para não travar o sistema
                await usersRef.child(currentUser.uid).update({ lastSeenSalesCount: newCount });
            }
        } catch (error) {
            console.error('Erro ao verificar histórico de vendas em tempo real:', error);
        }
            
        // ATUALIZAÇÃO SILENCIOSA DAS TELAS ATIVAS (Para os gráficos mudarem na hora)
        const dashboard = document.getElementById('adminDashboard');
        if (dashboard && dashboard.classList.contains('active')) {
            clearTimeout(window.dashboardRefreshTimeout);
            window.dashboardRefreshTimeout = setTimeout(() => loadAdminDashboard(true), 500);
        }
        
        const resellersTab = document.getElementById('adminResellers');
        if (resellersTab && resellersTab.classList.contains('active')) {
            clearTimeout(window.resellersRefreshTimeout);
            window.resellersRefreshTimeout = setTimeout(() => loadResellers(true), 500);
        }
        
        const resellerSalesModal = document.getElementById('resellerSalesModal');
        if (resellerSalesModal && resellerSalesModal.classList.contains('active') && currentAdminViewResellerId) {
            clearTimeout(window.modalRefreshTimeout);
            window.modalRefreshTimeout = setTimeout(() => viewResellerSales(currentAdminViewResellerId, true), 500);
        }
    });
}

function loadAdminData() {
    loadResellers();
    loadOrders();
    
    // Inicia o monitoramento de vendas em tempo real para tocar o som
    setupAdminRealtime();
    
    injectVisibilityToggle();

    // Atualiza o estado visual do botão de som ao carregar
    updateAdminSoundButton();

    // Definir Dashboard como tela inicial
    switchAdminTab('dashboard');

    // Ocultar aba de produtos conforme solicitado
    const productsTabBtn = document.querySelector('button[onclick="switchAdminTab(\'products\')"]');
    if (productsTabBtn) productsTabBtn.style.display = 'none';

    // Injetar aba de Métricas se não existir no HTML original
    if (!document.getElementById('adminMetrics')) {
        const tabsContainer = document.querySelector('.admin-tab-content').parentNode;
        const metricsContent = document.createElement('div');
        metricsContent.id = 'adminMetrics';
        metricsContent.className = 'admin-tab-content';
        tabsContainer.appendChild(metricsContent);

        const btnContainer = document.querySelector('.tab-btn').parentNode;
        const metricsBtn = document.createElement('button');
        metricsBtn.className = 'tab-btn';
        metricsBtn.onclick = () => switchAdminTab('metrics');
        metricsBtn.innerHTML = '📊 Métricas';
        btnContainer.appendChild(metricsBtn);
    }

    // Injetar aba de Campanhas se não existir no HTML original
    if (!document.getElementById('adminCampaigns')) {
        const tabsContainer = document.querySelector('.admin-tab-content').parentNode;
        const campaignsContent = document.createElement('div');
        campaignsContent.id = 'adminCampaigns';
        campaignsContent.className = 'admin-tab-content';
        tabsContainer.appendChild(campaignsContent);

        const btnContainer = document.querySelector('.tab-btn').parentNode;
        const campaignsBtn = document.createElement('button');
        campaignsBtn.className = 'tab-btn';
        campaignsBtn.onclick = () => switchAdminTab('campaigns');
        campaignsBtn.innerHTML = '📢 Campanhas';
        btnContainer.appendChild(campaignsBtn);
    }

    // Configurar o botão de edição do logo no painel Admin
    setTimeout(setupAdminLogoEditor, 1000);
}

// ============================================
// ADMIN - GESTÃO DE CAMPANHAS
// ============================================

async function loadAdminCampaigns(silent = false) {
    if (!silent) showLoading();
    currentManagingCampaignId = null;
    const container = document.getElementById('adminCampaigns');
    if (!container) return;

    try {
        const snapshot = await usersRef.parent.child('campaigns').once('value');
        const campaigns = [];
        snapshot.forEach(child => {
            campaigns.push({ id: child.key, ...child.val() });
        });

        campaigns.sort((a, b) => b.createdAt - a.createdAt);

           const now = Date.now();
        const activeCampaigns = [];
        const archivedCampaigns = [];

        campaigns.forEach(c => {
            if (c.status === 'archived' || c.endDate < now) {
                archivedCampaigns.push(c);
            } else {
                activeCampaigns.push(c);
            }
        });

        const renderAdminCampaignCard = (c, isActive) => `
            <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; ${!isActive ? 'opacity: 0.8; background: #f9f9f9;' : ''}" onclick="manageCampaign('${c.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <div style="font-weight: bold; font-size: 1.1em; color: #2c1810; margin-bottom: 10px;">📢 ${c.title} ${!isActive ? '<span style="font-size: 0.8em; color: #666; font-weight: normal;">(Arquivada/Expirada)</span>' : ''}</div>
                <div style="font-size: 0.9em; color: #555; margin-bottom: 5px;">📅 Início: <strong>${formatDate(c.startDate)}</strong></div>
                <div style="font-size: 0.9em; color: #555; margin-bottom: 5px;">⏳ Fim: <strong>${formatDate(c.status === 'archived' && c.archivedAt ? c.archivedAt : c.endDate)}</strong></div>
                <div style="font-size: 0.9em; color: #555; margin-bottom: 15px;">👥 Visível para: <strong style="color: #4a90e2;">${c.targetResellers && c.targetResellers.length > 0 ? `${c.targetResellers.length} Revendedora(s)` : 'Todas'}</strong></div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <button class="btn-secondary" onclick="event.stopPropagation(); duplicateCampaign('${c.id}')" style="flex: 1; padding: 6px; font-size: 0.85em; border-radius: 4px; cursor: pointer; min-width: 80px;">Duplicar</button>
                    <button class="btn-secondary" onclick="event.stopPropagation(); openEditCampaignModal('${c.id}')" style="flex: 1; padding: 6px; font-size: 0.85em; border-radius: 4px; cursor: pointer; min-width: 80px;">⚙️ Editar</button>
                    ${isActive ? 
                        `<button class="btn-secondary" onclick="event.stopPropagation(); archiveCampaign('${c.id}')" style="flex: 1; padding: 6px; font-size: 0.85em; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">Arquivar</button>` : 
                        `<button class="btn-secondary" onclick="event.stopPropagation(); unarchiveCampaign('${c.id}')" style="flex: 1; padding: 6px; font-size: 0.85em; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">Reativar</button>`
                    }
                    <button class="btn-delete" onclick="event.stopPropagation(); deleteCampaign('${c.id}')" style="flex: 1; padding: 6px; font-size: 0.85em; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; min-width: 80px;">Excluir</button>
                </div>
            </div>
        `;


        let listHtml = '';
        if (campaigns.length === 0) {
            listHtml = `
                <div class="empty-state">
                    <div class="empty-icon" style="font-size: 3em; margin-bottom: 10px;">📢</div>
                    <p class="empty-text">Nenhuma campanha cadastrada.</p>
                </div>
            `;
        } else {
            listHtml = `
                   ${activeCampaigns.length > 0 ? `
                    <h3 style="margin-bottom: 15px; color: #2c1810;">Ativas (${activeCampaigns.length})</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        ${activeCampaigns.map(c => renderAdminCampaignCard(c, true)).join('')}
                    </div>
                ` : '<p style="color: #666; margin-bottom: 30px;">Nenhuma campanha ativa no momento.</p>'}
                
                ${archivedCampaigns.length > 0 ? `
                    <details style="background: #f0f0f0; border-radius: 8px; padding: 10px; margin-bottom: 20px;">
                        <summary style="font-size: 1.1em; font-weight: bold; cursor: pointer; outline: none; color: #555;">Arquivadas / Expiradas (${archivedCampaigns.length})</summary>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 15px;">
                            ${archivedCampaigns.map(c => renderAdminCampaignCard(c, false)).join('')}
                        </div>
                    </details>
                ` : ''}
            `;
        }

        container.innerHTML = `
            <div id="campaignsListView">
                <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h2 style="margin: 0;">Gestão de Campanhas</h2>
                    <button class="btn-primary" onclick="openNewCampaignModal()">+ Nova Campanha</button>
                </div>
                <div id="campaignsListContainer">
                    ${listHtml}
                </div>
            </div>
            <div id="campaignManagerView" style="display: none;">
                <!-- Manager content will be injected here -->
            </div>
        `;

        if (!silent) hideLoading();
    } catch (error) {
        if (!silent) hideLoading();
        console.error('Erro ao carregar campanhas:', error);
        container.innerHTML = `<div style="padding: 20px; color: #c05746;">Erro ao carregar campanhas: ${error.message}</div>`;
    }
}

async function openNewCampaignModal() {
    showLoading();
    if (!document.getElementById('newCampaignModal')) {
        const modalHtml = `
            <div id="newCampaignModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>Nova Campanha</h3>
                        <button class="close-modal" onclick="closeNewCampaignModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Título da Campanha</label>
                            <input type="text" id="campaignTitle" class="input-field" placeholder="Ex: Dia das Mães">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição da Campanha (Opcional)</label>
                            <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
                                <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                                    <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                                    <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('campaignDescriptionEditor')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                                </div>
                                <div id="campaignDescriptionEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Resumo do objetivo da campanha..."></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Data de Início</label>
                            <input type="date" id="campaignStartDate" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data de Fim</label>
                            <input type="date" id="campaignEndDate" class="input-field">
                        </div>
                        
                        <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span>Visibilidade (Revendedoras Específicas)</span>
                                <label style="font-size: 0.9em; font-weight: normal; cursor: pointer; color: #2c1810; display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" id="selectAllCampaignResellers" style="width: 16px; height: 16px; cursor: pointer;" onchange="toggleSelectAllCampaignResellers(this)">
                                    <strong>Marcar Todas</strong>
                                </label>
                            </label>
                            <p style="font-size: 0.8em; color: #666; margin-bottom: 10px;">Se nenhuma for selecionada, a campanha ficará visível para TODAS as revendedoras.</p>
                            <div id="newCampaignResellersList" style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px; background: #fdfdfd;">
                                <!-- Lista injetada aqui -->
                            </div>
                        </div>

                        <button class="btn-primary" onclick="saveNewCampaign()" style="width: 100%; margin-top: 15px;">Criar Campanha</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('campaignTitle').value = '';
    document.getElementById('campaignStartDate').value = '';
    document.getElementById('campaignEndDate').value = '';
    if(document.getElementById('campaignDescriptionEditor')) document.getElementById('campaignDescriptionEditor').innerHTML = '';
    if(document.getElementById('selectAllCampaignResellers')) document.getElementById('selectAllCampaignResellers').checked = false;

    try {
        const snapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
        const resellers = [];
        snapshot.forEach(child => {
            const r = child.val();
            if (!r.isDeleted) {
                resellers.push({ id: child.key, ...r });
            }
        });
        resellers.sort((a, b) => a.name.localeCompare(b.name));

        const listContainer = document.getElementById('newCampaignResellersList');
        if (resellers.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">Nenhuma revendedora ativa.</p>';
        } else {
            listContainer.innerHTML = resellers.map(r => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 5px 0; cursor: pointer;">
                    <input type="checkbox" class="campaign-reseller-cb" value="${r.id}" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 0.9em; color: #333;">${r.name}</span>
                </label>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }

    document.getElementById('newCampaignModal').classList.add('active');
    hideLoading();
}

function toggleSelectAllCampaignResellers(source) {
    const checkboxes = document.querySelectorAll('#newCampaignResellersList .campaign-reseller-cb');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function closeNewCampaignModal() {
    document.getElementById('newCampaignModal').classList.remove('active');
}

async function saveNewCampaign() {
    const title = document.getElementById('campaignTitle').value.trim();
    const descEl = document.getElementById('campaignDescriptionEditor');
    let description = descEl ? descEl.innerHTML.trim() : '';
    if (description === '<br>') description = '';
    const startDate = document.getElementById('campaignStartDate').value;
    const endDate = document.getElementById('campaignEndDate').value;

    const selectedResellers = [];
    document.querySelectorAll('#newCampaignResellersList .campaign-reseller-cb:checked').forEach(cb => {
        selectedResellers.push(cb.value);
    });

    if (!title || !startDate || !endDate) {
        showNotification('Por favor, preencha todos os campos.', 'error');
        return;
    }

    // Adiciona o timezone local para não recuar o dia na criação
    const startTs = new Date(startDate + 'T00:00:00').getTime();
    const endTs = new Date(endDate + 'T23:59:59').getTime();

    if (endTs < startTs) {
        showNotification('A data de fim não pode ser anterior à data de início.', 'error');
        return;
    }

    showLoading();
    try {
        const campaignId = generateId();
        await usersRef.parent.child('campaigns').child(campaignId).set({
            title,
            description,
            startDate: startTs,
            endDate: endTs,
            targetResellers: selectedResellers.length > 0 ? selectedResellers : null,
            status: 'active',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        closeNewCampaignModal();
        hideLoading();
        showNotification('Campanha criada com sucesso!');
        loadAdminCampaigns();
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar campanha:', error);
        showNotification('Erro ao salvar campanha.', 'error');
    }
}

async function deleteCampaign(id) {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(id).remove();
        hideLoading();
        showNotification('Campanha excluída com sucesso!');
        loadAdminCampaigns();
    } catch (error) {
        hideLoading();
        console.error('Erro ao excluir campanha:', error);
        showNotification('Erro ao excluir campanha.', 'error');
    }
}

async function archiveCampaign(campaignId) {
    if (!confirm('Deseja arquivar esta campanha? Ela aparecerá como expirada para as revendedoras.')) return;
    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(campaignId).update({ 
            status: 'archived',
            archivedAt: firebase.database.ServerValue.TIMESTAMP
        });
        hideLoading();
        showNotification('Campanha arquivada com sucesso!');
        loadAdminCampaigns();
    } catch (error) {
        hideLoading();
        console.error('Erro ao arquivar campanha:', error);
        showNotification('Erro ao arquivar campanha.', 'error');
    }
}

async function unarchiveCampaign(campaignId) {
    if (!confirm('Deseja reativar esta campanha? (Lembre-se: se a data de fim já tiver passado, edite a campanha para estender a data ou ela continuará aparecendo como expirada).')) return;
    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(campaignId).update({ 
            status: 'active',
            archivedAt: null 
        });
        hideLoading();
        showNotification('Campanha reativada com sucesso!');
        loadAdminCampaigns();
    } catch (error) {
        hideLoading();
        console.error('Erro ao reativar campanha:', error);
        showNotification('Erro ao reativar campanha.', 'error');
    }
}


async function duplicateCampaign(campaignId) {
    if (!confirm('Deseja duplicar esta campanha? Uma cópia exata será criada.')) return;
    
    showLoading();
    try {
        const snap = await usersRef.parent.child('campaigns').child(campaignId).once('value');
        const campaign = snap.val();
        
        if (campaign) {
            const newCampaignId = generateId();
            
            // Modifica o título e a data de criação
            campaign.title = campaign.title + ' (Cópia)';
            campaign.createdAt = firebase.database.ServerValue.TIMESTAMP;
            
            await usersRef.parent.child('campaigns').child(newCampaignId).set(campaign);
            
            hideLoading();
            showNotification('Campanha duplicada com sucesso!');
            loadAdminCampaigns();
        } else {
            hideLoading();
            showNotification('Campanha original não encontrada.', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao duplicar campanha:', error);
        showNotification('Erro ao duplicar a campanha.', 'error');
    }
}

let currentEditingCampaignId = null;

async function openEditCampaignModal(campaignId) {
    showLoading();
    currentEditingCampaignId = campaignId;

    const existingModal = document.getElementById('editCampaignModal');
    if (existingModal && !document.getElementById('editCampaignResellersList')) {
        existingModal.remove(); // Força recriar se for a versão antiga sem a lista
    }

    if (!document.getElementById('editCampaignModal')) {
        const modalHtml = `
            <div id="editCampaignModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>Editar Campanha</h3>
                        <button class="close-modal" onclick="closeEditCampaignModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Título da Campanha</label>
                            <input type="text" id="editCampaignTitle" class="input-field" placeholder="Ex: Dia das Mães">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição da Campanha (Opcional)</label>
                            <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
                                <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                                    <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                                    <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                                    <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('editCampaignDescriptionEditor')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                                </div>
                                <div id="editCampaignDescriptionEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Resumo do objetivo da campanha..."></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Data de Início</label>
                            <input type="date" id="editCampaignStartDate" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Data de Fim</label>
                            <input type="date" id="editCampaignEndDate" class="input-field">
                        </div>
                        
                        <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span>Visibilidade (Revendedoras Específicas)</span>
                                <label style="font-size: 0.9em; font-weight: normal; cursor: pointer; color: #2c1810; display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" id="editSelectAllCampaignResellers" style="width: 16px; height: 16px; cursor: pointer;" onchange="toggleEditSelectAllCampaignResellers(this)">
                                    <strong>Marcar Todas</strong>
                                </label>
                            </label>
                            <p style="font-size: 0.8em; color: #666; margin-bottom: 10px;">Se nenhuma for selecionada, a campanha ficará visível para TODAS as revendedoras.</p>
                            <div id="editCampaignResellersList" style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px; background: #fdfdfd;">
                                <!-- Lista injetada aqui -->
                            </div>
                        </div>

                        <button class="btn-primary" onclick="saveEditCampaign()" style="width: 100%; margin-top: 15px;">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    try {
        const [snap, usersSnap] = await Promise.all([
            usersRef.parent.child('campaigns').child(campaignId).once('value'),
            usersRef.orderByChild('role').equalTo('reseller').once('value')
        ]);
        const campaign = snap.val();
        
        if (campaign) {
            document.getElementById('editCampaignTitle').value = campaign.title;
            if (document.getElementById('editCampaignDescriptionEditor')) {
                let desc = campaign.description || '';
                if (!desc.includes('<') && desc.includes('\n')) desc = desc.replace(/\n/g, '<br>');
                document.getElementById('editCampaignDescriptionEditor').innerHTML = desc;
            }
            
            if (campaign.startDate) {
                const sd = new Date(campaign.startDate);
                document.getElementById('editCampaignStartDate').value = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
            }
            if (campaign.endDate) {
                const ed = new Date(campaign.endDate);
                document.getElementById('editCampaignEndDate').value = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`;
            }

            const targetResellers = campaign.targetResellers || [];

            const resellers = [];
            usersSnap.forEach(child => {
                const r = child.val();
                if (!r.isDeleted) {
                    resellers.push({ id: child.key, ...r });
                }
            });
            resellers.sort((a, b) => a.name.localeCompare(b.name));

            const listContainer = document.getElementById('editCampaignResellersList');
            if (resellers.length === 0) {
                listContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">Nenhuma revendedora ativa.</p>';
            } else {
                listContainer.innerHTML = resellers.map(r => {
                    const isChecked = targetResellers.includes(r.id) ? 'checked' : '';
                    return `
                        <label style="display: flex; align-items: center; gap: 10px; padding: 5px 0; cursor: pointer;">
                            <input type="checkbox" class="edit-campaign-reseller-cb" value="${r.id}" ${isChecked} style="width: 16px; height: 16px; cursor: pointer;">
                            <span style="font-size: 0.9em; color: #333;">${r.name}</span>
                        </label>
                    `;
                }).join('');
            }
            
            document.getElementById('editCampaignModal').classList.add('active');
        }
    } catch (e) {
        console.error('Erro ao abrir edição de campanha:', e);
        showNotification('Erro ao carregar dados da campanha', 'error');
    }
    hideLoading();
}

function toggleEditSelectAllCampaignResellers(source) {
    const checkboxes = document.querySelectorAll('#editCampaignResellersList .edit-campaign-reseller-cb');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

function closeEditCampaignModal() {
    const modal = document.getElementById('editCampaignModal');
    if (modal) modal.classList.remove('active');
    currentEditingCampaignId = null;
}

async function saveEditCampaign() {
    const title = document.getElementById('editCampaignTitle').value.trim();
    const descEl = document.getElementById('editCampaignDescriptionEditor');
    let description = descEl ? descEl.innerHTML.trim() : '';
    if (description === '<br>') description = '';
    const startDate = document.getElementById('editCampaignStartDate').value;
    const endDate = document.getElementById('editCampaignEndDate').value;

    const selectedResellers = [];
    document.querySelectorAll('#editCampaignResellersList .edit-campaign-reseller-cb:checked').forEach(cb => {
        selectedResellers.push(cb.value);
    });

    if (!title || !startDate || !endDate) {
        showNotification('Por favor, preencha todos os campos.', 'error');
        return;
    }

    const startTs = new Date(startDate + 'T00:00:00').getTime();
    const endTs = new Date(endDate + 'T23:59:59').getTime();

    if (endTs < startTs) {
        showNotification('A data de fim não pode ser anterior à data de início.', 'error');
        return;
    }

    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(currentEditingCampaignId).update({
            title,
            description,
            startDate: startTs,
            endDate: endTs,
            targetResellers: selectedResellers.length > 0 ? selectedResellers : null
        });
        
        closeEditCampaignModal();
        hideLoading();
        showNotification('Campanha atualizada com sucesso!');
        
        loadAdminCampaigns(); // Recarrega a lista de campanhas
        if (currentManagingCampaignId === currentEditingCampaignId) {
            reloadCurrentCampaign(); // Atualiza o título na view se estiver dentro dela
        }
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar edição da campanha:', error);
        showNotification('Erro ao atualizar campanha.', 'error');
    }
}

let currentManagingCampaignId = null;
let currentCampaignData = null;

async function manageCampaign(campaignId) {
    showLoading();
    currentManagingCampaignId = campaignId;

    // NEW: Switch views
    document.getElementById('campaignsListView').style.display = 'none';
    const managerView = document.getElementById('campaignManagerView');
    managerView.style.display = 'block';

    // NEW: Inject content if it's the first time
    if (managerView.innerHTML.trim().startsWith('<!--')) {
        const styleHtml = `
            <style data-gemini-style="campaign-manager">
                .rich-text-content[data-placeholder]:empty:before { content: attr(data-placeholder); color: #999; pointer-events: none; display: block; }
                .action-rich-text img, .rich-text-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; cursor: zoom-in; }
                .action-rich-text h4 { margin: 15px 0 10px 0; color: #2c1810; font-size: 1.1em; }
                .action-rich-text ul, .action-rich-text ol { padding-left: 20px; margin-bottom: 10px; }
                .action-rich-text p { margin-bottom: 8px; }
            </style>
        `;
        if (!document.querySelector('[data-gemini-style="campaign-manager"]')) {
            document.head.insertAdjacentHTML('beforeend', styleHtml);
        }

        const managerContentHtml = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h3 id="manageCampaignTitle">Gerenciar Campanha</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="duplicateCampaign(currentManagingCampaignId)">📄 Duplicar</button>
                    <button class="btn-secondary" onclick="openEditCampaignModal(currentManagingCampaignId)">⚙️ Editar Campanha</button>
                    <button class="btn-secondary" onclick="showCampaignsList()">← Voltar para Campanhas</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-wrap: wrap;">
                <button id="btnTab_actions" class="btn-primary" onclick="switchCampaignTab('actions')" style="margin: 0; padding: 8px 15px;">🎯 Ações</button>
                <button id="btnTab_materials" class="btn-secondary" onclick="switchCampaignTab('materials')" style="margin: 0; padding: 8px 15px;">🖼️ Materiais</button>
                <button id="btnTab_texts" class="btn-secondary" onclick="switchCampaignTab('texts')" style="margin: 0; padding: 8px 15px;">📝 Textos Prontos</button>
            </div>
                        
                        <!-- TAB: AÇÕES -->
                        <div id="campaignTab_actions" style="display: block;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #2c1810;">Ações da Campanha</h4>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn-secondary" onclick="openEditTabDescriptionModal('actionsDescription', 'Ações')" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">✏️ Descrição da Aba</button>
                                    <button class="btn-secondary" onclick="openNewCampaignAction()" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">+ Nova Ação</button>
                                </div>
                            </div>
                            <div id="adminTabDesc_actions" class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;"></div>
                            <div id="formAddAction" style="display: none; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px;">
                                <input type="text" id="actionTitle" placeholder="Título da Ação (Ex: Divulgar no Instagram)" class="input-field" style="margin-bottom: 10px;">
                                
                                <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição / Instruções (Opcional)</label>
                                <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 15px; overflow: hidden;">
                                    <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                                        <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                                        <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('actionDescEditor')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                                    </div>
                                    <div id="actionDescEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Escreva a descrição ou instruções gerais da ação..."></div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                    <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 0;">Postagens da Ação</label>
                                </div>
                                <div id="actionPostsContainer"></div>
                                <button type="button" class="btn-secondary" onclick="addActionPostEditor()" style="width: 100%; margin-bottom: 15px; border: 1px dashed #4a90e2; color: #4a90e2; background: white; padding: 10px; font-weight: bold;">+ Adicionar Postagem nesta Ação</button>

                                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                    <button class="btn-secondary" onclick="toggleCampaignForm('formAddAction', false)" style="margin: 0;">Cancelar</button>
                                    <button class="btn-primary" onclick="saveNewAction()" style="margin: 0;">Criar Ação</button>
                                </div>
                            </div>
                            <div id="campaignActionsList"></div>
                        </div>
                        
                        <!-- TAB: MATERIAIS -->
                        <div id="campaignTab_materials" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #2c1810;">Materiais de Divulgação</h4>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn-secondary" onclick="openEditTabDescriptionModal('materialsDescription', 'Materiais')" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">✏️ Descrição da Aba</button>
                                    <button class="btn-secondary" onclick="toggleCampaignForm('formAddMaterial', true)" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">+ Novo Material</button>
                                </div>
                            </div>
                            <div id="adminTabDesc_materials" class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;"></div>
                            <div id="formAddMaterial" style="display: none; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px;">
                                <input type="text" id="materialTitle" placeholder="Título do Material (Ex: Pack de Artes Canva)" class="input-field" style="margin-bottom: 10px;">
                                
                                <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Imagem de Capa (Opcional)</label>
                                <div style="display: flex; gap: 5px; margin-bottom: 15px;">
                                    <input type="text" id="materialImage" placeholder="URL da Imagem (Link do Google Drive, etc)" class="input-field" style="margin-bottom: 0; flex: 1;">
                                    <button type="button" class="btn-secondary" onclick="previewItemImage(this)" style="margin: 0; padding: 8px 12px;" title="Ver prévia">👁️</button>
                                </div>

                                <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Link de Acesso (Site externo, Drive, Canva, etc)</label>
                                <input type="text" id="materialLink" placeholder="https://..." class="input-field" style="margin-bottom: 15px;">
                                
                                <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição</label>
                                <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 15px; overflow: hidden;">
                                       <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                                        <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                                        <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                                        <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                                </div>
                                    <div id="materialDescEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Escreva a descrição do material..."></div>
                                </div>

                                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                    <button class="btn-secondary" onclick="toggleCampaignForm('formAddMaterial', false)" style="margin: 0;">Cancelar</button>
                                    <button class="btn-primary" onclick="saveCampaignMaterial()" style="margin: 0;">Salvar Material</button>
                                </div>
                            </div>
                            <div id="campaignMaterialsList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;"></div>
                        </div>
                        
                        <!-- TAB: TEXTOS -->
                        <div id="campaignTab_texts" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #2c1810;">Textos Prontos</h4>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn-secondary" onclick="openEditTabDescriptionModal('textsDescription', 'Textos Prontos')" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">✏️ Descrição da Aba</button>
                                    <button class="btn-secondary" onclick="openNewCampaignText()" style="margin: 0; padding: 5px 10px; font-size: 0.85em;">+ Novo Texto</button>
                                </div>
                            </div>
                            <div id="adminTabDesc_texts" class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;"></div>
                            <div id="formAddText" style="display: none; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px;">
                                <!-- Conteúdo gerado dinamicamente -->
                            </div>
                            <div id="campaignTextsList"></div>
                        </div>
        `;
        managerView.innerHTML = managerContentHtml;
    }
    
    await reloadCurrentCampaign();
    
    switchCampaignTab('actions');
}

function switchCampaignTab(tabId) {
    ['actions', 'materials', 'texts'].forEach(t => {
        const btn = document.getElementById(`btnTab_${t}`);
        const content = document.getElementById(`campaignTab_${t}`);
        if (t === tabId) {
            if (btn) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
            if (content) content.style.display = 'block';
        } else {
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
            if (content) content.style.display = 'none';
        }
    });
}

function toggleCampaignForm(formId, show) {
    document.getElementById(formId).style.display = show ? 'block' : 'none';
    if (!show && formId === 'formAddAction') {
        if (document.getElementById('actionTitle')) document.getElementById('actionTitle').value = '';
        if (document.getElementById('actionDescEditor')) document.getElementById('actionDescEditor').innerHTML = '';
        if (document.getElementById('actionPostsContainer')) document.getElementById('actionPostsContainer').innerHTML = '';
        currentEditingActionId = null;
    } else if (!show && formId === 'formAddMaterial') {
        document.getElementById('materialTitle').value = '';
        document.getElementById('materialImage').value = '';
        if (document.getElementById('materialLink')) document.getElementById('materialLink').value = '';
        if (document.getElementById('materialDescEditor')) document.getElementById('materialDescEditor').innerHTML = '';
        currentEditingMaterialId = null;
    } else if (!show && formId === 'formAddText') {
        if (document.getElementById('textTitle')) document.getElementById('textTitle').value = '';
        if (document.getElementById('textDescEditor')) document.getElementById('textDescEditor').innerHTML = '';
        if (document.getElementById('textPostsContainer')) document.getElementById('textPostsContainer').innerHTML = '';
        currentEditingTextId = null;
    }
}

async function reloadCurrentCampaign() {
    if (!currentManagingCampaignId) return;
    try {
        const snap = await usersRef.parent.child('campaigns').child(currentManagingCampaignId).once('value');
        const campaign = snap.val();
        
        if (campaign) {
            currentCampaignData = campaign;
            const titleEl = document.getElementById('manageCampaignTitle');
            if (titleEl) titleEl.textContent = `Gerenciar: ${campaign.title}`;
            
            const actionsDescEl = document.getElementById('adminTabDesc_actions');
            if (actionsDescEl) {
                actionsDescEl.innerHTML = campaign.actionsDescription || '<p style="font-style: italic; color: #888; margin: 0;">Sem descrição configurada para esta aba.</p>';
            }
            const materialsDescEl = document.getElementById('adminTabDesc_materials');
            if (materialsDescEl) {
                materialsDescEl.innerHTML = campaign.materialsDescription || '<p style="font-style: italic; color: #888; margin: 0;">Sem descrição configurada para esta aba.</p>';
            }
            const textsDescEl = document.getElementById('adminTabDesc_texts');
            if (textsDescEl) {
                textsDescEl.innerHTML = campaign.textsDescription || '<p style="font-style: italic; color: #888; margin: 0;">Sem descrição configurada para esta aba.</p>';
            }

            renderCampaignActions(campaign.actions || {});
            renderCampaignMaterials(campaign.materials || {});
            renderCampaignTexts(campaign.texts || {});
        }
    } catch (e) {
        console.error('Erro ao recarregar dados da campanha:', e);
    }
    hideLoading();
}

async function openEditCampaignMaterial(materialId) {
    showLoading();
    try {
        const snap = await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('materials').child(materialId).once('value');
        const material = snap.val();
        if (material) {
            currentEditingMaterialId = materialId;
            document.getElementById('materialTitle').value = material.title || '';
            document.getElementById('materialImage').value = material.imageUrl || '';
             const linkEl = document.getElementById('materialLink');
                if (linkEl) linkEl.value = material.linkUrl || '';
                
                const descEl = document.getElementById('materialDescEditor');
                if (descEl) descEl.innerHTML = material.description || '';
            
            toggleCampaignForm('formAddMaterial', true);
            document.getElementById('formAddMaterial').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        console.error('Erro ao abrir edição:', error);
        showNotification('Erro ao carregar material', 'error');
    }
    hideLoading();
}

let currentEditingActionId = null;
let currentEditingMaterialId = null;
let currentEditingTextId = null;
let currentActionData = null; // Cache for the action being edited

function openNewCampaignAction() {
    currentEditingActionId = null;
    renderNewActionForm();
    addActionPostEditor();
    toggleCampaignForm('formAddAction', true);
}

function renderNewActionForm() {
    const container = document.getElementById('formAddAction');
    if (!container) return;
    container.innerHTML = `
        <input type="text" id="actionTitle" placeholder="Título da Ação (Ex: Divulgar no Instagram)" class="input-field" style="margin-bottom: 10px;">
        
        <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição / Instruções (Opcional)</label>
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 15px; overflow: hidden;">
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('actionDescEditor')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
            </div>
            <div id="actionDescEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Escreva a descrição ou instruções gerais da ação..."></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 0;">Postagens da Ação</label>
        </div>
        <div id="actionPostsContainer"></div>
        <button type="button" class="btn-secondary" onclick="addActionPostEditor()" style="width: 100%; margin-bottom: 15px; border: 1px dashed #4a90e2; color: #4a90e2; background: white; padding: 10px; font-weight: bold;">+ Adicionar Postagem nesta Ação</button>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn-secondary" onclick="toggleCampaignForm('formAddAction', false)" style="margin: 0;">Cancelar</button>
            <button class="btn-primary" onclick="saveNewAction()" style="margin: 0;">Criar Ação</button>
        </div>
    `;
}

let postEditorCounter = 0;

function addActionPostEditor(postData = null) {
    const container = document.getElementById('actionPostsContainer');
    const editorId = 'actionPostEditor_' + postEditorCounter++;
    
    let title = '';
    let content = '';

    if (postData) {
        if (typeof postData === 'string') {
            content = postData;
        } else {
            title = postData.title || '';
            content = postData.content || '';
        }
    }

    const div = document.createElement('div');
    div.className = 'action-post-editor-item';
    div.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 10px; overflow: hidden;">
            <div style="background: #fafafa; padding: 10px; border-bottom: 1px solid #ddd;">
                <input type="text" class="input-field post-title-input" placeholder="Título da Postagem (Ex: Post 1 - Feed)" value="${title.replace(/"/g, '&quot;')}" style="margin-bottom: 0; font-weight: 600; font-size: 1.05em; color: #2c1810; border: 1px solid #ccc; border-radius: 4px; padding: 8px; width: 100%; box-sizing: border-box;">
            </div>
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('${editorId}')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                <button type="button" onclick="this.closest('.action-post-editor-item').remove()" style="margin-left: auto; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.9em;">🗑️ Excluir Post</button>
            </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 100px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Escreva o conteúdo da postagem...">${content}</div>
        </div>
    `;
    container.appendChild(div);
}

async function openEditCampaignAction(actionId) {
    showLoading();
    try {
        const snap = await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('actions').child(actionId).once('value');
        const action = snap.val();
        if (action) {
            currentEditingActionId = actionId;
            currentActionData = { id: actionId, ...action }; // Cache the data
            renderActionManagerView();
            toggleCampaignForm('formAddAction', true);
        }
    } catch (error) {
        console.error('Erro ao abrir edição:', error);
        showNotification('Erro ao carregar ação', 'error');
    }
    hideLoading();
}

async function saveNewAction() {
    const title = document.getElementById('actionTitle').value.trim();
    const descHtml = document.getElementById('actionDescEditor') ? document.getElementById('actionDescEditor').innerHTML.trim() : '';
    const description = (descHtml && descHtml !== '<br>') ? descHtml : null;

    const postItems = document.querySelectorAll('#actionPostsContainer .action-post-editor-item');
    const posts = [];
    
    postItems.forEach(item => {
        const postTitle = item.querySelector('.post-title-input').value.trim();
        const ed = item.querySelector('.rich-text-content');
        const content = ed.innerHTML.trim();
        if ((content && content !== '<br>') || postTitle) {
            posts.push({ title: postTitle, content: content });
        }
    });

    if (!title) return showNotification('O título é obrigatório', 'error');
    if (posts.length === 0 && !description) return showNotification('Adicione uma descrição ou pelo menos uma postagem.', 'error');
    
    showLoading();
    try {
        const id = generateId();
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('actions').child(id).set({
            title, posts, description, createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        showNotification('Ação adicionada!');
        
        toggleCampaignForm('formAddAction', false);
        await reloadCurrentCampaign();
    } catch (error) {
        hideLoading();
        showNotification('Erro ao salvar', 'error');
    }
}

function insertActionImageToEditor(editorId) {
    const url = prompt('Cole a URL da imagem (Google Drive, Imgur, etc):');
    if (url) {
        const safeUrl = getDirectImageUrl(url);
        const imgHtml = `<img src="${safeUrl}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block;">`;
        const editor = document.getElementById(editorId);
        if (editor) {
            editor.focus();
            document.execCommand('insertHTML', false, imgHtml);
        }
    }
}

function changeEditorFontSize(delta) {
    let currentSize = document.queryCommandValue("FontSize");
    let size = currentSize ? parseInt(currentSize) : 3; 
    let newSize = Math.max(1, Math.min(7, size + delta));
    document.execCommand("fontSize", false, newSize);
}

function renderActionManagerView() {
    const container = document.getElementById('formAddAction');
    if (!container || !currentActionData) return;

    const { title, description, posts = [] } = currentActionData;

    let postsHtml = posts.map((post, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e0e0e0;">
            <span style="font-weight: 500; color: #333;">${post.title || `Postagem ${index + 1}`}</span>
            <div style="display: flex; gap: 5px;">
                <button class="btn-secondary" onclick="openEditPostModal(${index})" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteActionPost(${index})" style="margin: 0; padding: 6px 12px; font-size: 0.85em; border-radius: 4px;">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');

    if (posts.length === 0) {
        postsHtml = '<div style="text-align: center; color: #888; font-style: italic; padding: 15px 0;">Nenhuma postagem adicionada.</div>';
    }

    container.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #2c1810;">Título da Ação</h4>
                <button class="btn-secondary" onclick="openEditActionTitleModal()" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
            </div>
            <p style="font-size: 1.1em; color: #333; margin: 0;">${title}</p>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #2c1810;">Descrição</h4>
                <button class="btn-secondary" onclick="openEditActionDescriptionModal()" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
            </div>
            <div class="action-rich-text" style="font-size: 0.95em; color: #444; line-height: 1.5;">${description || '<p><i>Sem descrição.</i></p>'}</div>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px;">
            <h4 style="margin: 0 0 15px 0; color: #2c1810;">Postagens</h4>
            <div id="actionManagerPostsList">${postsHtml}</div>
            <button class="btn-secondary" onclick="openEditPostModal(-1)" style="width: 100%; margin-top: 15px; border-style: dashed;">+ Adicionar Nova Postagem</button>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
            <button class="btn-primary" onclick="toggleCampaignForm('formAddAction', false)">Fechar</button>
        </div>
    `;
}

function openEditActionTitleModal() {
    const newTitle = prompt('Digite o novo título da ação:', currentActionData.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        saveActionField('title', newTitle.trim());
    }
}

function openEditActionDescriptionModal() {
    if (!document.getElementById('richTextEditorModal')) {
        const modalHtml = `
            <div id="richTextEditorModal" class="modal-overlay" style="z-index: 1500;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="richTextEditorTitle">Editar Descrição</h3>
                        <button class="close-modal" onclick="document.getElementById('richTextEditorModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="richTextEditorContainer"></div>
                        <button id="saveRichTextBtn" class="btn-primary" style="width: 100%; margin-top: 15px;">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const editorContainer = document.getElementById('richTextEditorContainer');
    const editorId = 'description_editor_content';
    
    editorContainer.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
          <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('${editorId}')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                
        </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 200px; padding: 12px;">${currentActionData.description || ''}</div>
        </div>
    `;

    document.getElementById('saveRichTextBtn').onclick = () => {
        const newContent = document.getElementById(editorId).innerHTML;
        saveActionField('description', newContent);
        document.getElementById('richTextEditorModal').classList.remove('active');
    };

    document.getElementById('richTextEditorModal').classList.add('active');
}

function openEditPostModal(postIndex) {
    const isNew = postIndex === -1;
    const post = isNew ? { title: '', content: '' } : currentActionData.posts[postIndex];

    if (!document.getElementById('editPostModal')) {
        const modalHtml = `
            <div id="editPostModal" class="modal-overlay" style="z-index: 1600;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="editPostTitle">Editar Postagem</h3>
                        <button class="close-modal" onclick="document.getElementById('editPostModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Título da Postagem</label>
                            <input type="text" id="postTitleInput" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Conteúdo da Postagem</label>
                            <div id="postContentEditorContainer"></div>
                        </div>
                        <button id="savePostBtn" class="btn-primary" style="width: 100%; margin-top: 15px;">Salvar Postagem</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('editPostTitle').textContent = isNew ? 'Nova Postagem' : 'Editar Postagem';
    document.getElementById('postTitleInput').value = post.title;
    
    const editorContainer = document.getElementById('postContentEditorContainer');
    const editorId = 'post_editor_content';
    editorContainer.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
          <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('${editorId}')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
                
        </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 200px; padding: 12px;">${post.content || ''}</div>
        </div>
    `;

    document.getElementById('savePostBtn').onclick = () => {
        const newTitle = document.getElementById('postTitleInput').value.trim();
        const newContent = document.getElementById(editorId).innerHTML;
        saveActionPost(postIndex, { title: newTitle, content: newContent });
        document.getElementById('editPostModal').classList.remove('active');
    };

    document.getElementById('editPostModal').classList.add('active');
}

async function saveActionField(field, value) {
    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('actions').child(currentEditingActionId).update({
            [field]: value
        });
        currentActionData[field] = value;
        renderActionManagerView();
        hideLoading();
        showNotification('Campo atualizado!');
    } catch (e) {
        hideLoading();
        showNotification('Erro ao salvar', 'error');
    }
}

async function saveActionPost(postIndex, postData) {
    let posts = currentActionData.posts || [];
    if (postIndex === -1) { // Novo post
        posts.push(postData);
    } else { // Editando post existente
        posts[postIndex] = postData;
    }
    await saveActionField('posts', posts);
}

async function deleteActionPost(postIndex) {
    if (!confirm('Tem certeza que deseja excluir esta postagem?')) return;
    
    let posts = currentActionData.posts || [];
    posts.splice(postIndex, 1);
    await saveActionField('posts', posts);
}

async function deleteCampaignAction(actionId) {
    if (!confirm('Excluir esta ação?')) return;
    showLoading();
    await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('actions').child(actionId).remove();
    toggleCampaignForm('formAddAction', false); // Fecha a view de detalhes se estiver aberta
    await reloadCurrentCampaign();
}

function renderCampaignActions(actionsObj) {
    const list = Object.entries(actionsObj).map(([id, val]) => ({ id, ...val })).sort((a, b) => a.createdAt - b.createdAt);
    const container = document.getElementById('campaignActionsList');
    if (list.length === 0) {
        container.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 20px; background: #fff; border-radius: 8px; border: 1px dashed #ccc;">Nenhuma ação cadastrada.</div>';
        return;
    }
    container.innerHTML = list.map(a => {
        const postsCount = a.posts ? a.posts.length : 0;
        const hasDesc = a.description ? 1 : 0;
        let summary = [];
        if (hasDesc) summary.push('1 Descrição');
        if (postsCount > 0) summary.push(`${postsCount} Postagem(ns)`);
        const summaryText = summary.length > 0 ? summary.join(' • ') : 'Sem conteúdo';

        return `
        <div style="background: #fff; border: 1px solid #eee; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="flex: 1; overflow: hidden;">
                <div style="font-weight: bold; color: #2c1810; font-size: 1.1em; margin-bottom: 5px;">🎯 ${a.title}</div>
                <div style="font-size: 0.85em; color: #888;">${summaryText}</div>
            </div>
            <div style="display: flex; gap: 5px; flex-shrink: 0;">
                <button class="btn-secondary" onclick="openEditCampaignAction('${a.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.8em; border-radius: 4px;">Editar</button>
                <button class="btn-delete" onclick="deleteCampaignAction('${a.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.8em; border-radius: 4px;">Excluir</button>
            </div>
        </div>
    `}).join('');
}

async function saveCampaignMaterial() {
    const title = document.getElementById('materialTitle').value.trim();
    const imageUrl = document.getElementById('materialImage').value.trim();
    
    const linkEl = document.getElementById('materialLink');
    const linkUrl = linkEl ? linkEl.value.trim() : '';

    const descEl = document.getElementById('materialDescEditor');
    let description = descEl ? descEl.innerHTML.trim() : '';
    if (description === '<br>') description = '';

    if (!title) return showNotification('Preencha o título do material', 'error');
    
    showLoading();
    try {
        const dataToSave = {
            title, 
            imageUrl,
            linkUrl,
            description
        };

        if (currentEditingMaterialId) {
            await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('materials').child(currentEditingMaterialId).update(dataToSave);
            showNotification('Material atualizado!');
        } else {
            const id = generateId();
            dataToSave.createdAt = firebase.database.ServerValue.TIMESTAMP;
            await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('materials').child(id).set(dataToSave);
            showNotification('Material adicionado!');
        }
        document.getElementById('materialTitle').value = '';
        document.getElementById('materialImage').value = '';
        if (linkEl) linkEl.value = '';
        if (descEl) descEl.innerHTML = '';
        currentEditingMaterialId = null;
        toggleCampaignForm('formAddMaterial', false);
        await reloadCurrentCampaign();
    } catch (error) {
        hideLoading();
        showNotification('Erro ao salvar', 'error');
    }
}

async function deleteCampaignMaterial(materialId) {
    if (!confirm('Excluir este material?')) return;
    showLoading();
    await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('materials').child(materialId).remove();
    await reloadCurrentCampaign();
}

function renderCampaignMaterials(materialsObj) {
    const list = Object.entries(materialsObj).map(([id, val]) => ({ id, ...val })).sort((a, b) => a.createdAt - b.createdAt);
    const container = document.getElementById('campaignMaterialsList');
    if (list.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; color: #666; font-style: italic; text-align: center; padding: 20px; background: #fff; border-radius: 8px; border: 1px dashed #ccc;">Nenhum material cadastrado.</div>';
        return;
    }
    container.innerHTML = list.map(m => {
        const safeImgUrl = getDirectImageUrl(m.imageUrl);
        const hasDesc = m.description && m.description !== '<br>';
        const descHtml = hasDesc ? `<div class="action-rich-text" style="font-size: 0.85em; color: #555; margin-bottom: 10px; max-height: 100px; overflow-y: auto;">${m.description}</div>` : '';
        const linkBtn = m.linkUrl ? `<a href="${m.linkUrl}" target="_blank" class="btn-primary" style="text-align: center; margin: 0 0 10px 0; padding: 8px; font-size: 0.85em; text-decoration: none; display: block; border-radius: 4px;">🔗 Acessar Link Externo</a>` : '';
        const imgBtn = safeImgUrl ? `<a href="${safeImgUrl}" target="_blank" class="btn-secondary" style="flex: 1; text-align: center; margin: 0; padding: 6px; font-size: 0.85em; text-decoration: none;">🖼️ Ver Capa</a>` : '';

        return `
        <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            ${safeImgUrl ? `
            <div style="height: 150px; background: #f5f5f5; position: relative;">
                <img src="${safeImgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>` : ''}
            <div style="padding: 15px; display: flex; flex-direction: column; flex: 1;">
                <div style="font-weight: 600; font-size: 1.05em; color: #2c1810; margin-bottom: 10px;">${m.title}</div>
                ${descHtml}
                ${linkBtn}
                <div style="display: flex; gap: 5px; margin-top: auto; padding-top: 10px; border-top: 1px solid #f0f0f0;">
                    ${imgBtn}
                    <button class="btn-secondary" onclick="openEditCampaignMaterial('${m.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; border-radius: 4px; flex: 1;">Editar</button>
                    <button class="btn-delete" onclick="deleteCampaignMaterial('${m.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; border-radius: 4px; flex: 1;">Excluir</button>
                </div>
            </div>
        </div>
    `}).join('');
}

// ============================================
// GERENCIADOR DE TEXTOS PRONTOS (IGUAL AÇÕES)
// ============================================

let currentTextData = null;
let textPostEditorCounter = 0;

function openNewCampaignText() {
    currentEditingTextId = null;
    renderNewTextForm();
    addTextPostEditor();
    toggleCampaignForm('formAddText', true);
}

function renderNewTextForm() {
    const container = document.getElementById('formAddText');
    if (!container) return;
    container.innerHTML = `
        <input type="text" id="textTitle" placeholder="Título do Grupo de Textos (Ex: Textos para WhatsApp)" class="input-field" style="margin-bottom: 10px;">
        
        <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 5px; display: block;">Descrição / Instruções (Opcional)</label>
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 15px; overflow: hidden;">
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('textDescEditor')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
            </div>
            <div id="textDescEditor" class="rich-text-content" contenteditable="true" style="min-height: 80px; padding: 12px; outline: none; font-size: 0.95em; color: #444;" data-placeholder="Escreva a descrição ou instruções gerais deste texto..."></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <label style="font-size: 0.9em; font-weight: bold; color: #2c1810; margin-bottom: 0;">Textos da Campanha</label>
        </div>
        <div id="textPostsContainer"></div>
        <button type="button" class="btn-secondary" onclick="addTextPostEditor()" style="width: 100%; margin-bottom: 15px; border: 1px dashed #4a90e2; color: #4a90e2; background: white; padding: 10px; font-weight: bold;">+ Adicionar Texto</button>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn-secondary" onclick="toggleCampaignForm('formAddText', false)" style="margin: 0;">Cancelar</button>
            <button class="btn-primary" onclick="saveNewText()" style="margin: 0;">Criar Textos</button>
        </div>
    `;
}

function addTextPostEditor(postData = null) {
    const container = document.getElementById('textPostsContainer');
    const editorId = 'textPostEditor_' + textPostEditorCounter++;
    
    let title = '';
    let content = '';

    if (postData) {
        if (typeof postData === 'string') {
            content = postData;
        } else {
            title = postData.title || '';
            content = postData.content || '';
        }
    }

    const div = document.createElement('div');
    div.className = 'text-post-editor-item';
    div.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; margin-bottom: 10px; overflow: hidden;">
            <div style="background: #fafafa; padding: 10px; border-bottom: 1px solid #ddd;">
                <input type="text" class="input-field post-title-input" placeholder="Título (Opcional - Ex: Opção 1, Texto de Lembrete...)" value="${title.replace(/"/g, '&quot;')}" style="margin-bottom: 0; font-weight: 600; font-size: 1.05em; color: #2c1810; border: 1px solid #ccc; border-radius: 4px; padding: 8px; width: 100%; box-sizing: border-box;">
            </div>
             <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
            <button type="button" onclick="this.closest('.text-post-editor-item').remove()" style="margin-left: auto; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.9em;">🗑️ Excluir Texto</button>
            </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 100px;  padding: 12px; outline: none; font-size: 0.95em; color: #444; font-family: monospace; white-space: pre-wrap;" data-placeholder="Escreva ou cole seu texto pronto aqui...">${content}</div>
        </div>
    `;
    container.appendChild(div);
}

async function saveNewText() {
    const title = document.getElementById('textTitle').value.trim();
    const descHtml = document.getElementById('textDescEditor') ? document.getElementById('textDescEditor').innerHTML.trim() : '';
    const description = (descHtml && descHtml !== '<br>') ? descHtml : null;

    const postItems = document.querySelectorAll('#textPostsContainer .text-post-editor-item');
    const posts = [];
    
    postItems.forEach(item => {
        const postTitle = item.querySelector('.post-title-input').value.trim();
        const ed = item.querySelector('.rich-text-content');
        const content = ed.innerHTML.trim();
        if ((content && content !== '<br>') || postTitle) {
            posts.push({ title: postTitle, content: content });
        }
    });

    if (!title) return showNotification('O título do grupo é obrigatório', 'error');
    if (posts.length === 0 && !description) return showNotification('Adicione uma descrição ou pelo menos um texto.', 'error');
    
    showLoading();
    try {
        const id = generateId();
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(id).set({
            title, posts, description, createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        showNotification('Textos adicionados!');
        
        toggleCampaignForm('formAddText', false);
        await reloadCurrentCampaign();
    } catch (error) {
        hideLoading();
        showNotification('Erro ao salvar', 'error');
    }
}

async function openEditCampaignText(textId) {
    showLoading();
    try {
        const snap = await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(textId).once('value');
        const text = snap.val();
        if (text) {
            currentEditingTextId = textId;
            currentTextData = { id: textId, ...text };
            renderTextManagerView();
            toggleCampaignForm('formAddText', true);
            document.getElementById('formAddText').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        console.error('Erro ao abrir edição:', error);
        showNotification('Erro ao carregar texto', 'error');
    }
    hideLoading();
}

async function deleteCampaignText(textId) {
    if (!confirm('Excluir este texto?')) return;
    showLoading();
    await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(textId).remove();
    toggleCampaignForm('formAddText', false);
    await reloadCurrentCampaign();
}

function renderTextManagerView() {
    const container = document.getElementById('formAddText');
    if (!container || !currentTextData) return;

    const { title, description, posts = [] } = currentTextData;
    
    // Suporte para o formato de texto antigo (legado) que tinha 'content' em vez de array de 'posts'
    let legacyContent = currentTextData.content;
    let actualPosts = posts;
    
    if (legacyContent && (!actualPosts || actualPosts.length === 0)) {
        actualPosts = [{ title: 'Texto Principal', content: legacyContent }];
    }

    let postsHtml = actualPosts.map((post, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e0e0e0;">
            <span style="font-weight: 500; color: #333;">${post.title || `Texto ${index + 1}`}</span>
            <div style="display: flex; gap: 5px;">
                <button class="btn-secondary" onclick="openEditTextPostModal(${index})" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteTextPost(${index})" style="margin: 0; padding: 6px 12px; font-size: 0.85em; border-radius: 4px;">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');

    if (actualPosts.length === 0) {
        postsHtml = '<div style="text-align: center; color: #888; font-style: italic; padding: 15px 0;">Nenhum texto adicionado.</div>';
    }

    container.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #2c1810;">Título do Grupo de Textos</h4>
                <button class="btn-secondary" onclick="openEditTextTitleModal()" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
            </div>
            <p style="font-size: 1.1em; color: #333; margin: 0;">${title}</p>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #2c1810;">Descrição / Instruções</h4>
                <button class="btn-secondary" onclick="openEditTextDescriptionModal()" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">✏️ Editar</button>
            </div>
            <div class="action-rich-text" style="font-size: 0.95em; color: #444; line-height: 1.5;">${description || '<p><i>Sem descrição.</i></p>'}</div>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 15px;">
            <h4 style="margin: 0 0 15px 0; color: #2c1810;">Textos Prontos</h4>
            <div id="textManagerPostsList">${postsHtml}</div>
            <button class="btn-secondary" onclick="openEditTextPostModal(-1)" style="width: 100%; margin-top: 15px; border-style: dashed;">+ Adicionar Novo Texto</button>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
            <button class="btn-primary" onclick="toggleCampaignForm('formAddText', false)">Fechar</button>
        </div>
    `;
}

function openEditTextTitleModal() {
    const newTitle = prompt('Digite o novo título:', currentTextData.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        saveTextField('title', newTitle.trim());
    }
}

function openEditTextDescriptionModal() {
    if (!document.getElementById('richTextEditorModal')) {
        const modalHtml = `
            <div id="richTextEditorModal" class="modal-overlay" style="z-index: 1500;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="richTextEditorTitle">Editar Descrição</h3>
                        <button class="close-modal" onclick="document.getElementById('richTextEditorModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="richTextEditorContainer"></div>
                        <button id="saveRichTextBtn" class="btn-primary" style="width: 100%; margin-top: 15px;">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const editorContainer = document.getElementById('richTextEditorContainer');
    const editorId = 'description_editor_content';
    
    editorContainer.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap;">
                <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('${editorId}')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
             
            </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 200px; padding: 12px;">${currentTextData.description || ''}</div>
        </div>
    `;

    document.getElementById('richTextEditorTitle').textContent = "Editar Descrição do Texto";
    document.getElementById('saveRichTextBtn').onclick = () => {
        const newContent = document.getElementById(editorId).innerHTML;
        saveTextField('description', newContent);
        document.getElementById('richTextEditorModal').classList.remove('active');
    };

    document.getElementById('richTextEditorModal').classList.add('active');
}

function openEditTabDescriptionModal(field, tabName) {
    if (!document.getElementById('richTextEditorModal')) {
        const modalHtml = `
            <div id="richTextEditorModal" class="modal-overlay" style="z-index: 1500;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="richTextEditorTitle">Editar Descrição</h3>
                        <button class="close-modal" onclick="document.getElementById('richTextEditorModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="richTextEditorContainer"></div>
                        <button id="saveRichTextBtn" class="btn-primary" style="width: 100%; margin-top: 15px;">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const editorContainer = document.getElementById('richTextEditorContainer');
    const editorId = 'description_editor_content';
    
    editorContainer.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
                <button type="button" onmousedown="event.preventDefault(); insertActionImageToEditor('${editorId}')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Inserir Imagem via URL">🖼️ Imagem</button>
            </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 200px; padding: 12px; outline: none;">${(currentCampaignData && currentCampaignData[field]) ? currentCampaignData[field] : ''}</div>
        </div>
    `;

    document.getElementById('richTextEditorTitle').textContent = `Editar Descrição: ${tabName}`;
    
    document.getElementById('saveRichTextBtn').onclick = async () => {
        let newContent = document.getElementById(editorId).innerHTML.trim();
        if (newContent === '<br>') newContent = '';
        
        showLoading();
        try {
            await usersRef.parent.child('campaigns').child(currentManagingCampaignId).update({
                [field]: newContent
            });
            document.getElementById('richTextEditorModal').classList.remove('active');
            showNotification('Descrição salva com sucesso!');
            await reloadCurrentCampaign();
        } catch (e) {
            console.error('Erro ao salvar descrição da aba:', e);
            showNotification('Erro ao salvar descrição', 'error');
            hideLoading();
        }
    };

    document.getElementById('richTextEditorModal').classList.add('active');
}

function openEditTextPostModal(postIndex) {
    const isNew = postIndex === -1;
    
    let actualPosts = currentTextData.posts || [];
    if (currentTextData.content && actualPosts.length === 0) {
        actualPosts = [{ title: 'Texto Principal', content: currentTextData.content }];
    }
    
    const post = isNew ? { title: '', content: '' } : actualPosts[postIndex];

    if (!document.getElementById('editPostModal')) {
        const modalHtml = `
            <div id="editPostModal" class="modal-overlay" style="z-index: 1600;">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3 id="editPostTitle">Editar Postagem</h3>
                        <button class="close-modal" onclick="document.getElementById('editPostModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="postTitleInput" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Conteúdo</label>
                            <div id="postContentEditorContainer"></div>
                        </div>
                        <button id="savePostBtn" class="btn-primary" style="width: 100%; margin-top: 15px;">Salvar Postagem</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    document.getElementById('editPostTitle').textContent = isNew ? 'Novo Texto' : 'Editar Texto';
    document.getElementById('postTitleInput').value = post.title;
    
    const editorContainer = document.getElementById('postContentEditorContainer');
    const editorId = 'post_editor_content';
    editorContainer.innerHTML = `
        <div style="border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden;">
            <div style="background: #f0f0f0; padding: 8px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Negrito">B</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)" style="padding: 4px 8px; font-style: italic; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Itálico">I</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)" style="padding: 4px 8px; text-decoration: underline; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Sublinhado">U</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Aumentar Fonte">A+</button>
                <button type="button" onmousedown="event.preventDefault(); changeEditorFontSize(-1)" style="padding: 4px 8px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Diminuir Fonte">A-</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Esquerda">⬅️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Centralizar">↔️</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Alinhar à Direita">➡️</button>
                <span style="width: 1px; height: 16px; background: #ccc; margin: 0 2px;"></span>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('formatBlock', false, 'H4')" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; font-weight: bold;" title="Adicionar Subtítulo">Subtítulo</button>
                <button type="button" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)" style="padding: 4px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white;" title="Lista de Tópicos">📝 Lista</button>
            </div>
            <div id="${editorId}" class="rich-text-content" contenteditable="true" style="min-height: 200px; padding: 12px; font-family: monospace; white-space: pre-wrap;">${post.content || ''}</div>
        </div>
    `;

    document.getElementById('savePostBtn').onclick = () => {
        const newTitle = document.getElementById('postTitleInput').value.trim();
        const newContent = document.getElementById(editorId).innerHTML;
        saveTextPost(postIndex, { title: newTitle, content: newContent });
        document.getElementById('editPostModal').classList.remove('active');
    };

    document.getElementById('editPostModal').classList.add('active');
}

async function saveTextField(field, value) {
    showLoading();
    try {
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(currentEditingTextId).update({
            [field]: value
        });
        currentTextData[field] = value;
        renderTextManagerView();
        hideLoading();
        showNotification('Campo atualizado!');
    } catch (e) {
        hideLoading();
        showNotification('Erro ao salvar', 'error');
    }
}

async function saveTextPost(postIndex, postData) {
    let posts = currentTextData.posts || [];
    
    // Migração de dados legados no momento de salvar
    if (currentTextData.content && posts.length === 0) {
        posts = [{ title: 'Texto Principal', content: currentTextData.content }];
    }
    
    if (postIndex === -1) { 
        posts.push(postData);
    } else { 
        posts[postIndex] = postData;
    }
    
    // Limpa o content legado se existir, pois agora usamos posts
    if (currentTextData.content) {
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(currentEditingTextId).update({
            content: null
        });
        delete currentTextData.content;
    }
    
    await saveTextField('posts', posts);
}

async function deleteTextPost(postIndex) {
    if (!confirm('Tem certeza que deseja excluir este texto?')) return;
    
    let posts = currentTextData.posts || [];
    if (currentTextData.content && posts.length === 0) {
        posts = [{ title: 'Texto Principal', content: currentTextData.content }];
    }
    
    posts.splice(postIndex, 1);
    
    if (currentTextData.content) {
        await usersRef.parent.child('campaigns').child(currentManagingCampaignId).child('texts').child(currentEditingTextId).update({ content: null });
        delete currentTextData.content;
    }
    
    await saveTextField('posts', posts);
}

function copyTextToClipboard(elementId) {
    const content = document.getElementById(elementId).innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(content).then(() => showNotification('Texto copiado com sucesso!'));
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('Texto copiado com sucesso!');
        } catch (err) {
            console.error('Falha ao copiar', err);
        }
        document.body.removeChild(textArea);
    }
}

function renderCampaignTexts(textsObj) {
    const list = Object.entries(textsObj).map(([id, val]) => ({ id, ...val })).sort((a, b) => a.createdAt - b.createdAt);
    const container = document.getElementById('campaignTextsList');
    if (list.length === 0) {
        container.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 20px; background: #fff; border-radius: 8px; border: 1px dashed #ccc;">Nenhum texto cadastrado.</div>';
        return;
    }
    
    container.innerHTML = list.map((t, idx) => {
        let actualPosts = t.posts || [];
        if (t.content && actualPosts.length === 0) {
            actualPosts = [{ title: 'Texto Principal', content: t.content }];
        }
        
        const postsCount = actualPosts.length;
        const hasDesc = t.description ? 1 : 0;
        let summary = [];
        if (hasDesc) summary.push('1 Descrição');
        if (postsCount > 0) summary.push(`${postsCount} Texto(s)`);
        const summaryText = summary.length > 0 ? summary.join(' • ') : 'Sem conteúdo';
        
        // Renderizar uma prévia do primeiro texto apenas para ver no card da lista
        let previewHtml = '';
        if (actualPosts.length > 0 && actualPosts[0].content) {
            previewHtml = `
                <div style="margin-top: 10px; padding: 10px; background: #fafafa; border-radius: 4px; font-size: 0.85em; color: #666; max-height: 60px; overflow: hidden; position: relative;">
                    ${actualPosts[0].content.replace(/<[^>]*>?/gm, ' ')}
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: linear-gradient(transparent, #fafafa);"></div>
                </div>
            `;
        }

        return `
        <div style="background: #fff; border: 1px solid #eee; border-left: 4px solid #d4a574; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: bold; color: #2c1810; font-size: 1.1em; margin-bottom: 5px;">📝 ${t.title}</div>
                    <div style="font-size: 0.85em; color: #888;">${summaryText}</div>
                </div>
                <div style="display: flex; gap: 5px; flex-shrink: 0;">
                    <button class="btn-secondary" onclick="openEditCampaignText('${t.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.8em; border-radius: 4px;">Editar / Ver Textos</button>
                    <button class="btn-delete" onclick="deleteCampaignText('${t.id}')" style="margin: 0; padding: 6px 10px; font-size: 0.8em; border-radius: 4px;">Excluir</button>
                </div>
            </div>
        </div>
    `}).join('');
}

// ============================================
// ADMIN - MÉTRICAS DE DESEMPENHO
// ============================================

async function loadAdminMetrics(silent = false) {
    // 1. Verificação inicial do container para evitar erros de referência
    const container = document.getElementById('adminMetrics');
    if (!container) return;

    // Preservar seleções de filtro atuais
    const existingFilter = document.getElementById('metricsCycleFilter');
    const selectedCycle = existingFilter ? existingFilter.value : 'current';
    
    const existingHide = document.getElementById('metricsHideInactive');
    const hideInactive = existingHide ? existingHide.checked : false;
    const existingGroup = document.getElementById('metricsGroupFilter');
    const selectedGroup = existingGroup ? existingGroup.value : 'all';

    if (!silent) showLoading();

    try {
        if (container.innerHTML.trim() === '') {
            container.innerHTML = '<div style="padding: 20px; text-align: center;">Calculando métricas precisas...</div>';
        }

        // 2. Busca de dados otimizada
        const [usersSnapshot, salesSnapshot, settlementsSnapshot, clientsSnapshot, ordersSnapshot, configSnap, historySnap, goalsSnapshot, productsSnapshot] = await Promise.all([
            usersRef.orderByChild('role').equalTo('reseller').once('value'),
            salesRef.once('value'),
            settlementsRef.once('value'),
            clientsRef.once('value'),
            ordersRef.once('value'),
            configRef.child('ranking').once('value'),
            rankingHistoryRef.orderByChild('closedAt').once('value'),
            goalsRef.once('value'),
            productsRef.once('value')
        ]);

        const config = configSnap.val() || {};
        const lastResetDate = config.lastResetDate || 0;
        const products = productsSnapshot.val() || {};
        
        const history = [];
        historySnap.forEach(h => {
            history.push({ id: h.key, ...h.val() });
        });
        history.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
        
        const groupsSet = new Set();
        usersSnapshot.forEach(snap => {
            const r = snap.val();
            if (r && r.role === 'reseller') {
                groupsSet.add(r.group || 'Padrão');
            }
        });
        const availableGroups = Array.from(groupsSet).sort();

        // 3. Definição do Período (Timeline)
        let startTs = 0;
        let endTs = Infinity;

        if (selectedCycle === 'current') {
            if (selectedGroup !== 'all' && config.groups && config.groups[selectedGroup]) {
                startTs = config.groups[selectedGroup].lastResetDate || lastResetDate;
            } else {
                startTs = lastResetDate;
            }
        } else if (selectedCycle !== 'all') {
            const hItem = history.find(h => h.id === selectedCycle);
            if (hItem) {
                startTs = hItem.cycleStartDate || 0;
                const closedDate = new Date(hItem.closedAt);
                endTs = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate(), 23, 59, 59, 999).getTime();
            }
        }

        // 4. Indexação de Dados (Otimização de Performance)
        // Agrupamos vendas e pedidos por revendedora ANTES do loop principal
        const salesByReseller = {};
        const allSalesByReseller = {}; // Histórico total (para recorrência)
        const settlementsByReseller = {};
        const allSettlementsByReseller = {}; // Histórico total para LTV
        const ordersByReseller = {};

        salesSnapshot.forEach(snap => {
            const s = { id: snap.key, ...snap.val() };
            if (isFinancialSale(s)) return;

            // Histórico Total
            if (!allSalesByReseller[s.resellerId]) allSalesByReseller[s.resellerId] = [];
            allSalesByReseller[s.resellerId].push(s);

            // Filtro de Período
            const sDate = Number(s.date) || Number(s.dateApprox) || 0;
            const isInPeriod = sDate >= startTs && sDate <= endTs;
            const isUnsettledInCurrent = (selectedCycle === 'current' && !s.isSettled);
            const shouldInclude = selectedCycle === 'all' ? isInPeriod : (isInPeriod && (selectedCycle !== 'current' || isUnsettledInCurrent));

            if (shouldInclude) {
                if (!salesByReseller[s.resellerId]) salesByReseller[s.resellerId] = [];
                salesByReseller[s.resellerId].push(s);
            }
        });

        settlementsSnapshot.forEach(snap => {
            const set = { id: snap.key, ...snap.val() };
            
            if (!allSettlementsByReseller[set.resellerId]) allSettlementsByReseller[set.resellerId] = [];
            allSettlementsByReseller[set.resellerId].push(set);

            const sDate = Number(set.finalizedAt || set.createdAt) || 0;
            if (sDate >= startTs && sDate <= endTs) {
                if (!settlementsByReseller[set.resellerId]) settlementsByReseller[set.resellerId] = [];
                settlementsByReseller[set.resellerId].push(set);
            }
        });

        ordersSnapshot.forEach(snap => {
            const o = { id: snap.key, ...snap.val() };
            const oDate = Number(o.createdAt) || 0;
            const isActiveOrInPeriod = (selectedCycle === 'current' && o.status === 'active') || (oDate >= startTs && oDate <= endTs);
            
            if (isActiveOrInPeriod) {
                if (!ordersByReseller[o.resellerId]) ordersByReseller[o.resellerId] = [];
                ordersByReseller[o.resellerId].push(o);
            }
        });

        // 5. Processamento das Métricas
        const metricsData = [];
        usersSnapshot.forEach(uSnap => {
            const reseller = uSnap.val();
            if (reseller.isDeleted) return;
            const rId = uSnap.key;
            
            const rGroup = reseller.group || 'Padrão';
            if (selectedGroup !== 'all' && rGroup !== selectedGroup) return; // Filtro de Grupo

            const rSales = salesByReseller[rId] || [];
            const rAllSales = allSalesByReseller[rId] || [];
            const rSettlements = settlementsByReseller[rId] || [];
            const rAllSettlements = allSettlementsByReseller[rId] || [];
            const rOrders = ordersByReseller[rId] || [];

            // Financeiro
            const faturamentoBruto = rSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
            const ticketMedio = rSales.length > 0 ? faturamentoBruto / rSales.length : 0;
            
            let totalCommission = rSettlements.reduce((sum, s) => sum + (Number(s.totalCommission) || 0), 0);
            if (faturamentoBruto > 0 && selectedCycle === 'current') {
                const goals = goalsSnapshot.child(rId).val() || {};
                const estimated = calculateTotalCommission(faturamentoBruto, goals.commissionTiers || []);
                totalCommission = Math.max(totalCommission, estimated);
            }
            const margem = faturamentoBruto > 0 ? ((faturamentoBruto - totalCommission) / faturamentoBruto) * 100 : 0;

            // Estoque e Giro
            const itemsSold = rSales.length;
            const itemsReturned = rSettlements.reduce((sum, s) => sum + (Number(s.returnedCount) || 0), 0);
            let totalItemsDispatched = 0;

            rOrders.forEach(o => {
                const oProducts = o.products ? (Array.isArray(o.products) ? o.products : Object.values(o.products)) : [];
                oProducts.forEach(pid => {
                    // Tenta pegar a quantidade do pedido, se não houver, assume 1
                    totalItemsDispatched += parseInt(products[pid]?.quantity || 1, 10);
                });
            });

            const itemsBase = Math.max(totalItemsDispatched, itemsSold + itemsReturned);
            const giroEstoque = itemsBase > 0 ? (itemsSold / itemsBase) * 100 : 0;
            const taxaDevolucao = itemsBase > 0 ? (itemsReturned / itemsBase) * 100 : 0;

            // Clientes e Recência
            const lastSaleDate = rAllSales.length > 0 ? Math.max(...rAllSales.map(s => Number(s.date || s.dateApprox || 0))) : 0;
            const recenciaDias = lastSaleDate > 0 ? Math.floor(Math.max(0, Date.now() - lastSaleDate) / 86400000) : null;

            const clientsThisCycle = [...new Set(rSales.filter(s => s.clientId).map(s => s.clientId))];
            let novos = 0, recorrentes = 0;

            clientsThisCycle.forEach(cid => {
                const isNew = rAllSales.filter(s => s.clientId === cid).length <= 1;
                isNew ? novos++ : recorrentes++;
            });

            // --- NOVAS MÉTRICAS ---
            // 1. LTV (Lifetime Value) - Lucro histórico total (Faturamento - Comissões já pagas)
            const ltvFaturamento = rAllSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
            const ltvComissao = rAllSettlements.reduce((sum, s) => sum + (Number(s.totalCommission) || 0), 0);
            const ltv = ltvFaturamento - ltvComissao;

            // 2. Top Categoria do período
            let topCategory = 'N/A';
            if (rSales.length > 0) {
                const categoryTotals = {};
                let totalProductSales = 0;
                rSales.forEach(s => {
                    const cat = products[s.productId]?.category || 'Outros';
                    const val = Number(s.price) || 0;
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    totalProductSales += val;
                });
                
                let bestCat = null;
                let bestCatVal = -1;
                for (const [cat, val] of Object.entries(categoryTotals)) {
                    if (val > bestCatVal) { bestCatVal = val; bestCat = cat; }
                }
                if (bestCat && totalProductSales > 0) {
                    topCategory = `${bestCat} (${((bestCatVal / totalProductSales) * 100).toFixed(0)}%)`;
                }
            }

            // 3. Tempo de Rampa (Dias do cadastro até o mês de maior faturamento)
            let tempoRampa = null;
            if (rAllSales.length > 0 && reseller.createdAt) {
                const salesByMonth = {};
                rAllSales.forEach(s => {
                    const d = new Date(Number(s.date) || 0);
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    salesByMonth[key] = (salesByMonth[key] || 0) + (Number(s.price) || 0);
                });
                let bestMonthKey = null, maxMonthSales = -1;
                for (const [key, val] of Object.entries(salesByMonth)) {
                    if (val > maxMonthSales) { maxMonthSales = val; bestMonthKey = key; }
                }
                if (bestMonthKey) {
                    const [bestYear, bestMonth] = bestMonthKey.split('-').map(Number);
                    const bestMonthDate = new Date(bestYear, bestMonth, 1).getTime();
                    const createdAtDate = Number(reseller.createdAt);
                    tempoRampa = bestMonthDate > createdAtDate ? Math.floor((bestMonthDate - createdAtDate) / 86400000) : 0;
                }
            }

            const internalGoal = Number(goalsSnapshot.child(rId).child('adminInternalGoal').val()) || 0;
            const participateInSurplus = goalsSnapshot.child(rId).child('participateInSurplus').val();

            if (!hideInactive || faturamentoBruto > 0 || totalItemsDispatched > 0) {
                metricsData.push({
                    id: rId,
                    name: reseller.name, faturamentoBruto, ticketMedio, margemContribuicao: margem,
                    giroEstoque, taxaDevolucao, recenciaDias, totalAtivos: novos + recorrentes,
                    taxaNovos: (novos / (novos + recorrentes || 1)) * 100,
                    taxaRecorrentes: (recorrentes / (novos + recorrentes || 1)) * 100,
                    itemsSold, itemsReturned, totalCommission,
                    ltv, topCategory, tempoRampa, internalGoal,
                    participateInSurplus: participateInSurplus !== false // Se for null, por padrão é true
                });
            }
        });

        // 6. Renderização (Template Literal)
        metricsData.sort((a, b) => b.faturamentoBruto - a.faturamentoBruto);

        // --- CÁLCULO DE EXCEDENTE DE METAS INTERNAS ---
        let totalSurplus = 0;
        const pendingResellers = [];
        
        metricsData.forEach(m => {
            m.receivedBonus = 0;
            if (m.internalGoal > 0 && m.participateInSurplus) {
                if (m.faturamentoBruto > m.internalGoal) {
                    totalSurplus += (m.faturamentoBruto - m.internalGoal);
                } else if (m.faturamentoBruto < m.internalGoal) {
                    pendingResellers.push(m);
                }
            }
        });
        
        pendingResellers.sort((a, b) => a.faturamentoBruto - b.faturamentoBruto);
        let currentSurplus = totalSurplus;
        let ajudadasCount = 0;
        
        pendingResellers.forEach(m => {
            if (currentSurplus > 0) {
                const shortfall = m.internalGoal - m.faturamentoBruto;
                const bonusToApply = Math.min(shortfall, currentSurplus);
                m.receivedBonus = bonusToApply;
                currentSurplus -= bonusToApply;
                if (bonusToApply > 0) ajudadasCount++;
            }
        });

        // --- CÁLCULO DA NOVA META (RATEIO DA FALTA) ---
        let totalRemainingShortfall = 0;
        let stillPendingCount = 0;

        pendingResellers.forEach(m => {
            const shortfallAfterBonus = m.internalGoal - (m.faturamentoBruto + m.receivedBonus);
            if (shortfallAfterBonus > 0) {
                totalRemainingShortfall += shortfallAfterBonus;
                stillPendingCount++;
            }
        });

        const newGoalShare = stillPendingCount > 0 ? (totalRemainingShortfall / stillPendingCount) : 0;

        pendingResellers.forEach(m => {
            const shortfallAfterBonus = m.internalGoal - (m.faturamentoBruto + m.receivedBonus);
            if (shortfallAfterBonus > 0) {
                m.newRateioGoal = newGoalShare;
                m.totalTarget = m.faturamentoBruto + m.receivedBonus + newGoalShare;
                m.newShortfall = newGoalShare;
            }
        });
        // ----------------------------------------------

        let groupOptionsHtml = `<option value="all" ${selectedGroup === 'all' ? 'selected' : ''}>Todos os Grupos</option>`;
        availableGroups.forEach(g => {
            groupOptionsHtml += `<option value="${g}" ${selectedGroup === g ? 'selected' : ''}>Grupo: ${g}</option>`;
        });

        let cycleOptionsHtml = `<option value="current" ${selectedCycle === 'current' ? 'selected' : ''}>Ciclo Atual (Desde ${formatDate(lastResetDate)})</option>`;
        history.forEach(h => {
            if (selectedGroup === 'all' || !h.group || h.group === 'all' || h.group === selectedGroup) {
                const groupTag = h.group && h.group !== 'all' ? ` [${h.group}]` : '';
                cycleOptionsHtml += `<option value="${h.id}" ${selectedCycle === h.id ? 'selected' : ''}>Ciclo Encerrado em ${formatDate(h.closedAt)}${groupTag}</option>`;
            }
        });
        cycleOptionsHtml += `<option value="all" ${selectedCycle === 'all' ? 'selected' : ''}>Todo o Período Histórico</option>`;

        container.innerHTML = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin: 0;">Análise de Métricas</h2>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="metricsGroupFilter" onchange="loadAdminMetrics()" class="input-field" style="margin-bottom: 0; min-width: 150px;">
                        ${groupOptionsHtml}
                    </select>
                    <select id="metricsCycleFilter" onchange="loadAdminMetrics()" class="input-field" style="margin-bottom: 0; min-width: 250px;">
                        ${cycleOptionsHtml}
                    </select>
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd;">
                        <input type="checkbox" id="metricsHideInactive" onchange="loadAdminMetrics()" ${hideInactive ? 'checked' : ''}>
                        <span style="font-size: 0.9em; font-weight: 500; color: #555;">Ocultar Zeradas</span>
                    </label>
                    <button class="btn-secondary" onclick="exportMetricsToExcel()" style="background: #28a745; color: white; border: none; padding: 8px 15px; margin: 0; border-radius: 8px; cursor: pointer;">📥 Excel</button>
                </div>
            </div>
            <div class="metrics-table-wrapper">
                <table class="metrics-table">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd; color: #2c1810;">
                            <th style="padding: 12px; cursor: help;" title="Nome da revendedora">Revendedora</th>
                            <th style="padding: 12px; cursor: help;" title="Soma do valor de todas as vendas realizadas no período selecionado">Faturamento</th>
                            <th style="padding: 12px; cursor: help;" title="Lucro total gerado (Faturamento - Comissão) desde o dia do cadastro">LTV (Lucro)</th>
                            <th style="padding: 12px; cursor: help;" title="Categoria de produto que representa a maior fatia financeira neste período">Top Categoria</th>
                            <th style="padding: 12px; cursor: help;" title="Valor médio gasto por venda (Faturamento ÷ Quantidade de Vendas)">Ticket Médio</th>
                            <th style="padding: 12px; cursor: help;" title="Percentual de lucro que fica para a loja após descontar a comissão da revendedora">Margem (%)</th>
                            <th style="padding: 12px; cursor: help;" title="Percentual de peças vendidas em relação ao total de peças enviadas nos pedidos">Giro Estoque</th>
                            <th style="padding: 12px; cursor: help;" title="Percentual de peças que não foram vendidas e retornaram durante os acertos">Devolução</th>
                            <th style="padding: 12px; cursor: help;" title="Quantidade de dias corridos desde a última venda registrada pela revendedora">Recência</th>
                            <th style="padding: 12px; cursor: help;" title="Dias decorridos desde o cadastro até o mês com maior pico de faturamento">Tempo Rampa</th>
                            <th style="padding: 12px; cursor: help;" title="Total de clientes únicos. Novos (1ª compra) e Recorrentes (2 ou mais compras)">Clientes (Novos/Rec.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metricsData.map(m => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td data-label="Revendedora" style="padding: 12px; font-weight: 500;">${m.name}</td>
                                <td data-label="Faturamento" style="padding: 12px; font-weight: 600;">${formatCurrency(m.faturamentoBruto)}</td>
                                <td data-label="LTV (Lucro)" style="padding: 12px; font-weight: 600; color: #28a745;">${formatCurrency(m.ltv)}</td>
                                <td data-label="Top Categoria" style="padding: 12px; font-size: 0.9em;">${m.topCategory}</td>
                                <td data-label="Ticket Médio" style="padding: 12px;">${formatCurrency(m.ticketMedio)}</td>
                                <td data-label="Margem (%)" style="padding: 12px;">${m.margemContribuicao.toFixed(1)}%</td>
                                <td data-label="Giro Estoque" style="padding: 12px; color: ${m.giroEstoque < 30 ? '#dc3545' : '#28a745'}; font-weight: 500;">${m.giroEstoque.toFixed(1)}%</td>
                                <td data-label="Devolução" style="padding: 12px;">${m.taxaDevolucao.toFixed(1)}%</td>
                                <td data-label="Recência" style="padding: 12px; color: ${m.recenciaDias > 30 ? '#dc3545' : '#333'};">${m.recenciaDias === null ? 'S/ Vendas' : (m.recenciaDias === 0 ? 'Hoje' : m.recenciaDias + ' dia(s)')}</td>
                                <td data-label="Tempo Rampa" style="padding: 12px;">${m.tempoRampa === null ? '-' : m.tempoRampa + ' dias'}</td>
                                <td data-label="Clientes (N/R)" style="padding: 12px;">
                                    <div style="font-size: 0.9em;">Total: <strong>${m.totalAtivos}</strong></div>
                                    <div style="font-size: 0.8em; color: #666;">${m.taxaNovos.toFixed(0)}% N / ${m.taxaRecorrentes.toFixed(0)}% R</div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${selectedCycle === 'current' ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h3 style="margin: 0; color: #2c1810;">🎯 Acompanhamento de Metas Internas</h3>
                    ${totalSurplus > 0 && pendingResellers.length > 0 ? `<div style="font-size: 0.85em; color: #28a745; margin-top: 5px; font-weight: 500;">Excedente Compartilhado: ${formatCurrency(totalSurplus)} <span style="color:#666;">(Ajudando ${ajudadasCount} revendedora(s) a bater a meta)</span></div>` : ''}
                </div>
                <button class="btn-primary" onclick="setGlobalInternalGoal()" style="background: #17a2b8; color: white; border: none; padding: 8px 15px; margin: 0; border-radius: 8px; cursor: pointer;">🎯 Meta Interna Padrão (Todas)</button>
            </div>
            <div class="metrics-table-wrapper">
                <table class="metrics-table">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd; color: #2c1810;">
                            <th style="padding: 12px; text-align: left;">Revendedora</th>
                            <th style="padding: 12px; text-align: right;">Meta Interna</th>
                            <th style="padding: 12px; text-align: right; color: #856404;">Nova Meta</th>
                            <th style="padding: 12px; text-align: right;">Total Vendido</th>
                            <th style="padding: 12px; text-align: right;">Ajuste (Equipe)</th>
                            <th style="padding: 12px; text-align: right;">Falta / Progresso</th>
                            <th style="padding: 12px; text-align: center;">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metricsData.map(m => {
                            const meta = m.internalGoal;
                            const novaMeta = m.newRateioGoal || 0;
                            const vendido = m.faturamentoBruto;
                            const isParticipating = m.participateInSurplus;
                            
                            let progressoHtml = '';
                            let ajusteHtml = `<label style="display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.85em; color: #666; margin-bottom: 4px;">
                                <input type="checkbox" ${isParticipating ? 'checked' : ''} onchange="toggleSurplusParticipation('${m.id}', this.checked)">
                                Rateio
                            </label><br>`;
                            
                            let alertHtml = '';
                            let rowBg = '';
                            
                            if (meta > 0 && vendido < meta) {
                                const cycleDaysActive = Math.floor(Math.max(0, Date.now() - startTs) / 86400000);
                                if (vendido === 0 && cycleDaysActive >= 5) {
                                    rowBg = 'background-color: #fff5f5;';
                                    alertHtml = `<div style="font-size: 0.8em; color: #dc3545; margin-top: 4px; font-weight: 500; display: inline-flex; align-items: center; gap: 3px;"><span style="font-size: 1.1em;">⚠️</span> Nenhuma venda há ${cycleDaysActive} dias</div>`;
                                } else if (m.recenciaDias !== null && m.recenciaDias >= 5) {
                                    rowBg = 'background-color: #fffaf0;';
                                    alertHtml = `<div style="font-size: 0.8em; color: #856404; margin-top: 4px; font-weight: 500; display: inline-flex; align-items: center; gap: 3px;"><span style="font-size: 1.1em;">⚠️</span> Estagnada há ${m.recenciaDias} dias</div>`;
                                } else if (m.recenciaDias === null && cycleDaysActive >= 5) {
                                    rowBg = 'background-color: #fff5f5;';
                                    alertHtml = `<div style="font-size: 0.8em; color: #dc3545; margin-top: 4px; font-weight: 500; display: inline-flex; align-items: center; gap: 3px;"><span style="font-size: 1.1em;">⚠️</span> Nunca vendeu</div>`;
                                }
                            }

                            if (meta > 0) {
                                const diff = vendido - meta;
                                if (diff >= 0) {
                                    if (isParticipating) {
                                        ajusteHtml += diff > 0 ? `<span style="color: #28a745; font-size: 0.9em; font-weight: 500;" title="Gerou excedente para a equipe">↑ ${formatCurrency(diff)}</span>` : '<span style="color: #999;">-</span>';
                                    } else {
                                        ajusteHtml += '<span style="color: #999; font-style: italic; font-size: 0.85em;">Fora do rateio</span>';
                                    }
                                    progressoHtml = `<span style="color: #28a745; font-weight: bold;">✅ Meta Batida ${diff > 0 ? `(+${formatCurrency(diff)})` : ''}</span>`;
                                    progressoHtml += `<br><div style="background: #eee; height: 6px; border-radius: 3px; margin-top: 4px; overflow: hidden;"><div style="background: #28a745; width: 100%; height: 100%;"></div></div>`;
                                } else {
                                    const actualShortfall = Math.abs(diff);
                                    
                                    if (isParticipating && m.receivedBonus > 0) {
                                        const remainingAfterBonus = Math.max(0, actualShortfall - m.receivedBonus);
                                        const pctVal = vendido + m.receivedBonus;
                                        const pct = Math.min((pctVal / meta) * 100, 100);
                                        
                                        ajusteHtml += `<span style="color: #17a2b8; font-size: 0.9em; font-weight: 500;" title="Recebeu abatimento da equipe">↓ ${formatCurrency(m.receivedBonus)}</span>`;
                                        
                                        if (remainingAfterBonus === 0) {
                                            progressoHtml = `<span style="color: #28a745; font-weight: bold;">✅ Batida (C/ Ajuda)</span>`;
                                        } else {
                                            const displayShortfall = m.newShortfall !== undefined ? m.newShortfall : remainingAfterBonus;
                                            progressoHtml = `<span style="color: #dc3545; font-weight: 500;">Faltam ${formatCurrency(displayShortfall)}</span>`;
                                            progressoHtml += `<br><span style="font-size: 0.75em; color: #888; text-decoration: line-through;">Sem rateio: ${formatCurrency(actualShortfall)}</span>`;
                                        }
                                        const displayPct = m.totalTarget ? Math.min((pctVal / m.totalTarget) * 100, 100) : pct;
                                        progressoHtml += `<br><div style="background: #eee; height: 6px; border-radius: 3px; margin-top: 4px; overflow: hidden;"><div style="background: ${remainingAfterBonus === 0 ? '#28a745' : '#d4a574'}; width: ${displayPct}%; height: 100%;"></div></div>`;
                                    } else {
                                        if (!isParticipating) {
                                            ajusteHtml += '<span style="color: #999; font-style: italic; font-size: 0.85em;">Fora do rateio</span>';
                                        } else {
                                            ajusteHtml += '<span style="color: #999;">-</span>';
                                        }
                                        const pct = Math.min((vendido / meta) * 100, 100);
                                        const displayShortfall = m.newShortfall !== undefined ? m.newShortfall : actualShortfall;
                                        progressoHtml = `<span style="color: #dc3545; font-weight: 500;">Faltam ${formatCurrency(displayShortfall)}</span>`;
                                        if (m.newShortfall !== undefined) {
                                            progressoHtml += `<br><span style="font-size: 0.75em; color: #888; text-decoration: line-through;">Sem rateio: ${formatCurrency(actualShortfall)}</span>`;
                                        }
                                        const displayPct = m.totalTarget ? Math.min((vendido / m.totalTarget) * 100, 100) : pct;
                                        progressoHtml += `<br><div style="background: #eee; height: 6px; border-radius: 3px; margin-top: 4px; overflow: hidden;"><div style="background: #d4a574; width: ${displayPct}%; height: 100%;"></div></div>`;
                                    }
                                }
                            } else {
                                progressoHtml = '<span style="color: #888; font-style: italic;">Meta não definida</span>';
                            }

                            return `
                            <tr style="border-bottom: 1px solid #eee; ${rowBg}">
                                <td data-label="Revendedora" style="padding: 12px; font-weight: 500;">
                                    <div style="font-size: 1.05em; color: #2c1810;">${m.name}</div>
                                    ${alertHtml}
                                </td>
                                <td data-label="Meta Interna" style="padding: 12px; text-align: right; font-weight: 600; color: #4a90e2;">${meta > 0 ? formatCurrency(meta) : '-'}</td>
                                <td data-label="Nova Meta" style="padding: 12px; text-align: right; font-weight: 600; color: #856404;">${novaMeta > 0 ? formatCurrency(novaMeta) : '-'}</td>
                                <td data-label="Total Vendido" style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(vendido)}</td>
                                <td data-label="Ajuste (Equipe)" style="padding: 12px; text-align: right; background: #fdfdfd;">${ajusteHtml}</td>
                                <td data-label="Falta / Progresso" style="padding: 12px; text-align: right;">${progressoHtml}</td>
                                <td data-label="Ação" style="padding: 12px; text-align: center;">
                                    <button class="btn-secondary" onclick="setAdminInternalGoal('${m.id}', '${m.name}', ${meta})" style="padding: 6px 12px; font-size: 0.85em; margin: 0;">🎯 Definir Meta</button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        `;
        
        window.currentMetricsData = metricsData;
        if (!silent) hideLoading();
    } catch (error) {
        if (!silent) hideLoading();
        console.error('Erro ao carregar métricas:', error);
        container.innerHTML = `<div style="padding: 20px; color: #c05746;">Erro: ${error.message}</div>`;
    }
}

function exportMetricsToExcel() {
    if (!window.currentMetricsData || window.currentMetricsData.length === 0) {
        showNotification('Não há dados para exportar', 'error');
        return;
    }

    const data = window.currentMetricsData.map(m => ({
        'Revendedora': m.name,
        'Faturamento Bruto': m.faturamentoBruto,
        'Meta Interna': m.internalGoal || 0,
        'Participa Rateio?': m.participateInSurplus ? 'Sim' : 'Não',
        'Nova Meta (Rateio)': m.newRateioGoal || 0,
        'LTV (Lucro Histórico)': m.ltv,
        'Top Categoria': m.topCategory,
        'Ticket Médio': m.ticketMedio,
        'Margem de Contribuição (%)': m.margemContribuicao.toFixed(2),
        'Itens Vendidos': m.itemsSold,
        'Itens Devolvidos': m.itemsReturned,
        'Giro de Estoque (%)': m.giroEstoque.toFixed(2),
        'Taxa de Devolução (%)': m.taxaDevolucao.toFixed(2),
        'Recência (Dias)': m.recenciaDias !== null ? m.recenciaDias : 'Sem vendas',
        'Tempo de Rampa (Dias)': m.tempoRampa !== null ? m.tempoRampa : 'N/A',
        'Clientes Ativos': m.totalAtivos,
        'Taxa de Clientes Novos (%)': m.taxaNovos.toFixed(2),
        'Taxa de Clientes Recorrentes (%)': m.taxaRecorrentes.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Metricas");
    XLSX.writeFile(wb, "metricas_revendedoras.xlsx");
}

async function setAdminInternalGoal(resellerId, resellerName, currentGoal) {
    const input = prompt(`Defina a meta interna de vendas para ${resellerName} (apenas números, ex: 1500.50):`, currentGoal || '');
    if (input === null) return; // Cancelado

    let valStr = input.trim();
    if (valStr.includes(',')) {
        valStr = valStr.replace(/\./g, '').replace(',', '.');
    }
    const newGoal = parseFloat(valStr) || 0;

    showLoading();
    try {
        // Salvar a meta na árvore "goals" para aproveitar os nós existentes, com nome específico de admin
        await goalsRef.child(resellerId).update({ adminInternalGoal: newGoal });
        hideLoading();
        showNotification('Meta interna atualizada com sucesso!');
        loadAdminMetrics(); // Recarrega a aba para atualizar a tabela
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar meta interna:', error);
        showNotification('Erro ao atualizar meta interna', 'error');
    }
}

async function setGlobalInternalGoal() {
    const input = prompt('Defina a meta interna padrão para TODAS as revendedoras (ex: 1500.50):');
    if (input === null) return; // Cancelado

    let valStr = input.trim();
    if (valStr.includes(',')) {
        valStr = valStr.replace(/\./g, '').replace(',', '.');
    }
    const newGoal = parseFloat(valStr) || 0;

    if (!confirm(`Tem certeza que deseja aplicar a meta de ${formatCurrency(newGoal, true)} para TODAS as revendedoras ativas?`)) return;

    showLoading();
    try {
        const usersSnapshot = await usersRef.orderByChild('role').equalTo('reseller').once('value');
        const updates = {};
        
        usersSnapshot.forEach(child => {
            const r = child.val();
            if (!r.isDeleted) {
                updates[`goals/${child.key}/adminInternalGoal`] = newGoal;
            }
        });

        if (Object.keys(updates).length > 0) {
            await usersRef.parent.update(updates);
        }

        hideLoading();
        showNotification('Meta padrão aplicada a todas as revendedoras!');
        loadAdminMetrics(); // Recarrega a aba para atualizar a tabela
    } catch (error) {
        hideLoading();
        console.error('Erro ao definir meta global:', error);
        showNotification('Erro ao atualizar metas em lote', 'error');
    }
}

async function toggleSurplusParticipation(resellerId, isParticipating) {
    showLoading();
    try {
        await goalsRef.child(resellerId).update({ participateInSurplus: isParticipating });
        hideLoading();
        loadAdminMetrics(); // Recarrega a aba para atualizar a tabela em tempo real
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar participação:', error);
        showNotification('Erro ao atualizar participação', 'error');
    }
}

// ============================================
// REVENDEDORA - DASHBOARD
// ============================================

function loadResellerData() {
    document.getElementById('resellerName').textContent = currentUser.name;
    updateDashboard();
    loadProducts();
    checkRankingNotification(); // Verificar se há novidades no ranking
    checkLevelNotification(); // Verificar se há um novo nível (Prata, Ouro, Diamante)

    setupMobileMenu();
    setupResellerCampaignsTab();
}

async function checkLevelNotification() {
    if (!currentUser || !currentUser.tags || !Array.isArray(currentUser.tags)) return;

    const tagNames = currentUser.tags.map(t => t.name ? t.name.toLowerCase().trim() : '');
    
    let currentLevel = null;
    let levelName = '';
    let levelColor = '';
    let levelTextColor = '';
    let levelIcon = '';
    
    // Prioridade: Diamante > Ouro > Prata
    if (tagNames.includes('diamante')) {
        currentLevel = 'diamante';
        levelName = 'Diamante';
        levelColor = '#00d4ff';
        levelTextColor = '#012b42';
        levelIcon = '💎';
    } else if (tagNames.includes('ouro')) {
        currentLevel = 'ouro';
        levelName = 'Ouro';
        levelColor = '#e6b400';
        levelTextColor = '#332800';
        levelIcon = '🏆';
    } else if (tagNames.includes('prata')) {
        currentLevel = 'prata';
        levelName = 'Prata';
        levelColor = '#8b929a';
        levelTextColor = '#ffffff'; 
        levelIcon = '🥈';
    }

    if (!currentLevel) return;

    // Verifica no banco se a revendedora já viu o modal para ESTE nível
    if (currentUser.lastSeenLevelModal === currentLevel) return;

    // Salva no banco imediatamente para não mostrar duas vezes
    try {
        await usersRef.child(currentUser.uid).update({ lastSeenLevelModal: currentLevel });
        currentUser.lastSeenLevelModal = currentLevel;
    } catch (e) {
        console.error("Erro ao atualizar visualização do nível", e);
    }

    // Mostra o modal de Parabéns
    if (document.getElementById('levelUpModal')) document.getElementById('levelUpModal').remove();

    const modalHtml = `
        <div id="levelUpModal" class="modal-overlay active" style="z-index: 99999; backdrop-filter: blur(8px);">
            <div class="modal-content" style="max-width: 400px; text-align: center; border: 3px solid ${levelColor}; box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 30px ${levelColor}60; overflow: hidden; position: relative;">
                <!-- Efeito de brilho no fundo -->
                <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, ${levelColor}20 0%, transparent 60%); z-index: 0; pointer-events: none; animation: pulse-level 3s infinite;"></div>
                
                <div style="position: relative; z-index: 1;">
                    <div class="level-up-icon" style="font-size: 5em; margin-bottom: 10px;">${levelIcon}</div>
                    <h2 style="color: #2c1810; margin-bottom: 10px; font-family: 'Cormorant Garamond', serif; font-size: 2.2em;">Parabéns! 🎉</h2>
                    <p style="font-size: 1.1em; color: #555; margin-bottom: 25px; line-height: 1.5;">
                        Você alcançou o nível <strong style="color: ${levelColor}; font-size: 1.4em; display: block; margin: 10px 0; text-transform: uppercase; letter-spacing: 2px;">${levelName}</strong>
                        Estamos muito orgulhosos do seu desempenho e dedicação. Continue brilhando! ✨
                    </p>
                    <button class="btn-primary" onclick="document.getElementById('levelUpModal').remove()" style="width: 100%; background: ${levelColor}; color: ${levelTextColor}; border: none; font-size: 1.1em; padding: 14px; font-weight: bold; box-shadow: 0 4px 15px ${levelColor}60; border-radius: 8px; cursor: pointer; transition: transform 0.2s;">Comemorar! 🎊</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
        
        document.getElementById('totalSales').innerHTML = formatCurrency(totalSales);
        document.getElementById('monthGoal').innerHTML = formatCurrency(goals.goalAmount || 0);
        document.getElementById('totalCommission').innerHTML = formatCurrency(totalCommission);
        document.getElementById('settlementDate').textContent = goals.settlementDate ? formatDate(goals.settlementDate) : '--/--/----';
        
        const goalAmount = goals.goalAmount || 0;
        const progressPct = goalAmount > 0 ? (totalCommission / goalAmount) * 100 : 0;
        const surplus = Math.max(0, totalCommission - goalAmount);
        
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const container = progressFill.parentElement;
            container.style.display = 'flex'; // Garante que as barras fiquem lado a lado
            
            if (goalAmount > 0) {
                if (totalCommission <= goalAmount) {
                    container.innerHTML = `<div id="progressFill" style="background: #d4a574; width: ${progressPct}%; height: 100%; transition: width 0.3s ease;"></div>`;
                } else {
                    const goalWidth = (goalAmount / totalCommission) * 100;
                    const surplusWidth = (surplus / totalCommission) * 100;
                    container.innerHTML = `
                        <div id="progressFill" style="background: #28a745; width: ${goalWidth}%; height: 100%; transition: width 0.3s ease; border-right: 2px solid #fff;"></div>
                        <div style="background: #17a2b8; width: ${surplusWidth}%; height: 100%; transition: width 0.3s ease;" title="Excedente de comissão: ${formatCurrency(surplus)}"></div>
                    `;
                }
            } else {
                container.innerHTML = `<div id="progressFill" style="width: 0%; height: 100%;"></div>`;
            }
        }

        const salesNeededForGoal = calculateSalesForTargetCommission(goalAmount, goals.commissionTiers || []);
        const remainingSales = Math.max(0, salesNeededForGoal - totalSales);

        let progressTextHtml = '';
        if (goalAmount > 0) {
            if (totalCommission <= goalAmount) {
                progressTextHtml = `${progressPct.toFixed(1)}% da meta atingida`;
                if (remainingSales > 0) {
                    progressTextHtml += ` | Faltam <strong>${formatCurrency(remainingSales)}</strong> em vendas`;
                }
            } else {
                progressTextHtml = `<span style="color: #28a745; font-weight: bold;">${progressPct.toFixed(1)}% alcançado</span> | <strong>Meta Batida! 🎉</strong> | Excedente: <strong style="color: #17a2b8;">${formatCurrency(surplus)}</strong>`;
            }
        } else {
            progressTextHtml = 'Defina uma meta de comissão para acompanhar seu progresso.';
        }
        document.getElementById('progressText').innerHTML = progressTextHtml;
        
        loadRecentSales(sales);

        // Adicionar botão de Solicitar Acerto se não existir
        renderSettlementButton();

        // Carregar Ranking
        await loadResellerRanking();

        // Exibir banner de aniversário no painel (se for o dia)
        renderBirthdayBanner();

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar dashboard:', error);
    }
}

async function loadResellerRanking() {
    try {
        // Buscar configuração de data de reset, histórico e todas as vendas
        const [salesSnapshot, configSnapshot, historySnapshot] = await Promise.all([
            salesRef.once('value'),
            configRef.child('ranking').once('value'),
            rankingHistoryRef.limitToLast(1).once('value')
        ]);

        const sales = [];
        const uniqueResellerIds = new Set();
        
        salesSnapshot.forEach(child => {
            const sale = child.val();
            sales.push(sale);
            if (sale.resellerId) uniqueResellerIds.add(sale.resellerId);
        });

        // Buscar dados dos usuários individualmente para evitar erro de permissão (permission_denied global)
        const users = {};
        const userPromises = Array.from(uniqueResellerIds).map(uid => 
            usersRef.child(uid).once('value').then(snap => {
                if (snap.exists()) {
                    users[uid] = snap.val();
                }
            }).catch(e => {
                // Ignora silenciosamente se houver falha de permissão isolada
            })
        );
        await Promise.all(userPromises);

        const myGroup = currentUser.group || 'Padrão';

        // Determinar data de corte (último reset ou início dos tempos)
        const config = configSnapshot.val() || {};
        let lastResetDate = config.lastResetDate || 0;
        
        if (config.groups && config.groups[myGroup]) {
            lastResetDate = config.groups[myGroup].lastResetDate || lastResetDate;
        }

        const groupUids = new Set(
            Object.keys(users).filter(uid => (users[uid].group || 'Padrão') === myGroup)
        );

        // Filtrar vendas apenas APÓS a data de reset e do mesmo grupo
        const activeSales = sales.filter(s => {
            if (s.productId === 'ACERTO' || s.category === 'Financeiro') return false;
            if (!groupUids.has(s.resellerId)) return false;
            if (s.isSettled) return false;

            const sDate = Number(s.date) || Number(s.dateApprox) || 0;
            return sDate >= lastResetDate;
        });

        // Agrupar totais por revendedora
        const rankingMap = {};
        activeSales.forEach(s => {
            rankingMap[s.resellerId] = (rankingMap[s.resellerId] || 0) + (Number(s.price) || 0);
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
                rankMsgEl.innerHTML = 'Parabéns! Você lidera o ranking! 🥇';
                rankMsgEl.style.color = '#28a745';
            } else {
                const prevReseller = rankingList[myIndex - 1];
                const diff = prevReseller.total - rankingList[myIndex].total;
                rankMsgEl.innerHTML = `Faltam ${formatCurrency(diff)} para alcançar o ${myRank - 1}º lugar`;
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
        const historySnap = await rankingHistoryRef.orderByKey().limitToLast(1).once('value');
        
        if (!historySnap.exists()) return;

        const historyId = Object.keys(historySnap.val())[0];
        const historyData = historySnap.val()[historyId];

        // 2. Verificar se a revendedora já viu este resultado
        const userSnap = await usersRef.child(currentUser.uid).child('lastSeenRankingId').once('value');
        const lastSeenId = userSnap.val();

        if (lastSeenId === historyId) return; // Já viu, não faz nada

        // Ignorar notificações de turmas diferentes
        const myGroup = currentUser.group || 'Padrão';
        if (historyData.group && historyData.group !== 'all' && historyData.group !== myGroup) {
            await usersRef.child(currentUser.uid).update({ lastSeenRankingId: historyId });
            return;
        }

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
            rankingHistoryRef.child(historyId).once('value'),
            rankingHistoryRef.orderByKey().limitToLast(1).once('value')
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
        await rankingHistoryRef.child(historyId).remove();
        
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
                        <div class="modal-body" id="rankingHistoryList">
                        <!-- Lista aqui -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    try {
        const promises = [
            rankingHistoryRef.orderByChild('closedAt').limitToLast(20).once('value'),
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
                const groupTag = h.group && h.group !== 'all' ? ` [Turma: ${h.group}]` : '';
                const isAdmin = currentUser && currentUser.role === 'admin';
                
                const cycleTotalHtml = (isAdmin && h.totalSales) ? 
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

                        let goalHtml = '';
                        if (w.internalGoal > 0) {
                            const pct = Math.min((w.total / w.internalGoal) * 100, 100).toFixed(1);
                            const isHit = w.total >= w.internalGoal;
                            goalHtml = `<div style="font-size: 0.85em; color: ${isHit ? '#28a745' : '#888'}; margin-top: 2px; margin-left: 35px;">Meta Interna: ${formatCurrency(w.internalGoal)} ${isHit ? '(Batida ✅)' : '(' + pct + '%)'}</div>`;
                        }

                        return `<div style="display:flex; justify-content:space-between; flex-wrap: wrap; font-size:0.9em; margin-bottom:4px; padding: 4px 0; border-bottom: 1px dashed #eee;">
                            <div style="flex: 1; min-width: 200px;">
                                <span style="display: inline-block; width: 30px;">${position}</span> <strong>${displayName}</strong>
                                ${goalHtml}
                            </div>
                            <span style="color: #2c1810; font-weight: 500;">${formatCurrency(w.total)}</span>
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
                                Ciclo: ${h.cycleStartDate ? formatDate(h.cycleStartDate) : '?'} até ${date}${groupTag}
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
    
    await rankingHistoryRef.child(currentEditingHistoryId).update({
        cycleStartDate: newStart,
        closedAt: newEnd
    });
    
    document.getElementById('editRankingHistoryModal').classList.remove('active');
    openResellerRankingHistoryModal(); // Recarregar lista
    showNotification('Datas do ciclo atualizadas!');
}

function openResellerSettingsModal() {
    if (!document.getElementById('resellerSettingsModal')) {
        const modalHtml = `
            <div id="resellerSettingsModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Minha Conta</h3>
                        <button class="close-modal" onclick="document.getElementById('resellerSettingsModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">
                            Atualize seu e-mail de acesso. Por segurança, é necessário confirmar sua senha atual.
                        </p>
                        <div class="form-group">
                            <label>E-mail de Acesso</label>
                            <input type="email" id="resellerSettingsNewEmail" class="input-field" placeholder="exemplo@email.com">
                        </div>
                        <div class="form-group">
                            <label>Senha Atual</label>
                            <input type="password" id="resellerSettingsPassword" class="input-field" placeholder="Digite sua senha para confirmar">
                        </div>
                        <button class="btn-primary" onclick="saveResellerSettings()" style="width: 100%; margin-top: 15px;">Salvar E-mail</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('resellerSettingsNewEmail').value = currentUser.email || '';
    document.getElementById('resellerSettingsPassword').value = '';
    document.getElementById('resellerSettingsModal').classList.add('active');
}

async function saveResellerSettings() {
    const newEmail = document.getElementById('resellerSettingsNewEmail').value.trim();
    const password = document.getElementById('resellerSettingsPassword').value;

    if (!newEmail || !password) {
        showNotification('Por favor, preencha o e-mail e a senha atual.', 'error');
        return;
    }

    if (newEmail === currentUser.email) {
        showNotification('O e-mail informado já é o seu atual.', 'error');
        return;
    }

    showLoading();
    try {
        const user = auth.currentUser;
        // 1. Reautenticar para liberar permissão de troca de e-mail (exigência do Firebase)
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);

        // 2. Enviar link de verificação diretamente (Evita erro 400 no console)
        await user.verifyBeforeUpdateEmail(newEmail);
        
        // 3. Atualizar no Banco de Dados (Realtime Database)
        await usersRef.child(user.uid).update({ email: newEmail });
        
        // 4. Atualizar variável local
        currentUser.email = newEmail;
        
        document.getElementById('resellerSettingsModal').classList.remove('active');
        hideLoading();
        showNotification(`⚠️ AVISO IMPORTANTE:\n\nUm link de confirmação foi enviado para ${newEmail}.\n\nPor segurança, acesse a caixa de entrada deste novo e-mail e CLIQUE NO LINK para que o acesso seja efetivado no sistema.`);
    } catch (error) {
        hideLoading();
        console.error('Erro ao atualizar e-mail:', error);
        if (error.code === 'auth/wrong-password') {
            showNotification('Senha atual incorreta.', 'error');
        } else if (error.code === 'auth/email-already-in-use') {
            showNotification('Este e-mail já está sendo usado por outra conta.', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showNotification('Formato de e-mail inválido.', 'error');
        } else {
            showNotification('Erro ao atualizar: ' + error.message, 'error');
        }
    }
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
        <button class="btn-secondary" onclick="openResellerSettingsModal()" style="flex: 1; padding: 15px; font-size: 1em; min-width: 150px; background-color: #6c757d; color: white; border: none;">
            ⚙️ Minha Conta
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
        const totalOriginal = pendingSales.reduce((sum, sale) => sum + (sale.originalPrice || sale.price + (sale.discount || 0)), 0);
        const totalDiscount = pendingSales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
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
                                ${totalDiscount > 0 ? `
                                <p style="color: #666; font-size: 0.9em; margin-bottom: 2px;">Valor S/ Desconto: <span style="text-decoration: line-through;">${formatCurrency(totalOriginal)}</span></p>
                                <p style="color: #dc3545; font-size: 0.9em; margin-bottom: 8px;">Descontos Aplicados: -${formatCurrency(totalDiscount)}</p>
                                <hr style="margin: 8px 0; border-color: #eee;">
                                ` : ''}
                                <p><strong>Faturamento:</strong> ${formatCurrency(totalSales)}</p>
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
                            
                            <button class="btn-primary" onclick="confirmSettlementRequest(${totalSales}, ${totalOriginal}, ${totalDiscount}, ${totalCommission}, ${itemsToReturn}, ${goalAmount}, ${goalProgress.toFixed(2)})" style="width: 100%;">Confirmar e Enviar</button>
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

async function confirmSettlementRequest(totalSold, totalOriginal, totalDiscount, totalCommission, returnedCount, goalAmount, goalProgress) {
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
            totalOriginal,
            totalDiscount,
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

        await usersRef.parent.update(updates);

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
                        <div class="modal-body" id="settlementHistoryList">
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
                        <div>Faturamento: <strong style="color: #333;">${formatCurrency(s.totalSold)}</strong></div>
                        <div>Comissão: <strong style="color: #333;">${formatCurrency(s.totalCommission)}</strong></div>
                        ${s.totalDiscount > 0 ? `<div style="grid-column: 1 / -1; color: #dc3545; font-size: 0.9em;">Desc. Concedidos: <strong>-${formatCurrency(s.totalDiscount)}</strong></div>` : ''}
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
// REVENDEDORA - CAMPANHAS
// ============================================

function setupResellerCampaignsTab() {
    if (!document.getElementById('campaignsTab')) {
        const tabsContainer = document.querySelector('.tab-content').parentNode;
        const campaignsContent = document.createElement('div');
        campaignsContent.id = 'campaignsTab';
        campaignsContent.className = 'tab-content';
        tabsContainer.appendChild(campaignsContent);

        const clientsBtn = document.querySelector('.nav-btn[data-tab="clients"]');
        if (clientsBtn && clientsBtn.parentNode) {
            const navBar = clientsBtn.parentNode;
            const campaignsBtn = document.createElement('button');
            campaignsBtn.className = 'nav-btn mobile-hidden-tab';
            campaignsBtn.setAttribute('data-tab', 'campaigns');
            campaignsBtn.onclick = () => switchTab('campaigns');
            
            campaignsBtn.innerHTML = '<span style="font-size: 1.2em; display: block; margin-bottom: 2px;">📢</span><span>Campanhas</span>';
            
            if (clientsBtn.nextSibling) {
                navBar.insertBefore(campaignsBtn, clientsBtn.nextSibling);
            } else {
                navBar.appendChild(campaignsBtn);
            }
            
            const sideMenu = document.getElementById('sideMenuItems');
            if (sideMenu) {
                const clonedCampaignsBtn = campaignsBtn.cloneNode(true);
                clonedCampaignsBtn.onclick = () => { switchTab('campaigns'); toggleSideMenu(); };
                sideMenu.appendChild(clonedCampaignsBtn);
            }
        }
    }
}

async function loadResellerCampaigns() {
    showLoading();
    const container = document.getElementById('campaignsTab');
    if (!container) return;

    if (!document.getElementById('resellerCampaignsListView')) {
        container.innerHTML = `
            <div id="resellerCampaignsListView"></div>
            <div id="resellerCampaignDetailsView" style="display: none;"></div>
        `;
    }

    const listView = document.getElementById('resellerCampaignsListView');
    const detailsView = document.getElementById('resellerCampaignDetailsView');

    listView.style.display = 'block';
    detailsView.style.display = 'none';

    try {
        const snapshot = await usersRef.parent.child('campaigns').once('value');
        const activeCampaigns = [];
        const expiredCampaigns = [];
        const now = Date.now();
        
        snapshot.forEach(child => {
            const c = child.val();
            if (c.startDate <= now) {
                if (!c.targetResellers || c.targetResellers.includes(currentUser.uid)) {
                    if (c.status !== 'archived' && c.endDate >= now) {
                        activeCampaigns.push({ id: child.key, ...c });
                    } else {
                        expiredCampaigns.push({ id: child.key, ...c });
                    }
                }
            }
        });

        activeCampaigns.sort((a, b) => b.createdAt - a.createdAt);
        expiredCampaigns.sort((a, b) => b.createdAt - a.createdAt);

        if (activeCampaigns.length === 0 && expiredCampaigns.length === 0) {
            listView.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon" style="font-size: 3em; margin-bottom: 10px;">📢</div>
                    <p class="empty-text">Nenhuma campanha ativa no momento.</p>
                </div>
            `;
        } else {
            let html = '';
            
            if (activeCampaigns.length > 0) {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #2c1810;">Campanhas Ativas</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 30px;">
                        ${activeCampaigns.map(c => `
                            <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column;" onclick="openResellerCampaignView('${c.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                                <div style="font-weight: bold; font-size: 1.1em; color: #2c1810; margin-bottom: 8px;">📢 ${c.title}</div>
                                <div style="font-size: 0.85em; color: #666; margin-bottom: 15px; flex: 1;">
                                    Disponível até <strong>${formatDate(c.endDate)}</strong>
                                </div>
                                <button class="btn-primary" style="width: 100%; padding: 8px; font-size: 0.9em; background: #d4a574; border: none;">Acessar Materiais</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                html += `<h2 style="margin: 0 0 20px 0; color: #2c1810;">Campanhas Ativas</h2><p style="color: #666; margin-bottom: 30px;">Nenhuma campanha ativa no momento.</p>`;
            }

            if (expiredCampaigns.length > 0) {
                html += `
                    <details style="background: #fdfbf7; border: 1px solid #eee; border-radius: 8px; padding: 15px;">
                        <summary style="font-size: 1.1em; font-weight: bold; cursor: pointer; color: #666; outline: none;">Campanhas Expiradas / Arquivadas (${expiredCampaigns.length})</summary>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 15px;">
                            ${expiredCampaigns.map(c => `
                                <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; cursor: pointer; transition: transform 0.2s; display: flex; flex-direction: column; opacity: 0.85;" onclick="openResellerCampaignView('${c.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                                    <div style="font-weight: bold; font-size: 1.0em; color: #555; margin-bottom: 8px;">📁 ${c.title}</div>
                                    <div style="font-size: 0.85em; color: #888; margin-bottom: 15px; flex: 1;">
                                        Encerrou em <strong>${formatDate(c.status === 'archived' && c.archivedAt ? c.archivedAt : c.endDate)}</strong>
                                    </div>
                                    <button class="btn-secondary" style="width: 100%; padding: 8px; font-size: 0.9em; border: 1px solid #ccc; background: white; color: #555;">Rever Materiais</button>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                `;
            }
            
            listView.innerHTML = html;
        }
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar campanhas:', error);
        listView.innerHTML = '<div class="empty-state"><p class="empty-text" style="color: #c05746;">Erro ao carregar campanhas.</p></div>';
    }
}

async function openResellerCampaignView(campaignId) {
    showLoading();
    
    if (!document.querySelector('[data-gemini-style="campaign-manager"]')) {
        const styleHtml = '<style data-gemini-style="campaign-manager">.rich-text-content[data-placeholder]:empty:before { content: attr(data-placeholder); color: #999; pointer-events: none; display: block; } .action-rich-text img, .rich-text-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; cursor: zoom-in; } .action-rich-text h4 { margin: 15px 0 10px 0; color: #2c1810; font-size: 1.1em; } .action-rich-text ul, .action-rich-text ol { padding-left: 20px; margin-bottom: 10px; } .action-rich-text p { margin-bottom: 8px; }</style>';
        document.head.insertAdjacentHTML('beforeend', styleHtml);
    }

    try {
        const snap = await usersRef.parent.child('campaigns').child(campaignId).once('value');
        const campaign = snap.val();
        
        if (campaign) {
            const listView = document.getElementById('resellerCampaignsListView');
            const detailsView = document.getElementById('resellerCampaignDetailsView');
            
            const actions = campaign.actions ? Object.entries(campaign.actions).map(([id, val]) => ({ id, ...val })).sort((a,b) => a.createdAt - b.createdAt) : [];
            const texts = campaign.texts ? Object.entries(campaign.texts).map(([id, val]) => ({ id, ...val })).sort((a,b) => a.createdAt - b.createdAt) : [];
            const materials = campaign.materials ? Object.entries(campaign.materials).map(([id, val]) => ({ id, ...val })).sort((a,b) => a.createdAt - b.createdAt) : [];

            let actionsHtml = '';
            if (campaign.actionsDescription) {
                actionsHtml += `<div class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;">${campaign.actionsDescription}</div>`;
            }
            if (actions.length > 0) {
                actions.forEach(act => {
                    actionsHtml += `<div style="background: white; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #4a90e2; overflow: hidden;">`;
                    actionsHtml += `<div style="padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #fdfbf7;" onclick="toggleResellerAction('${act.id}')">`;
                    actionsHtml += `<h5 style="margin: 0; color: #2c1810; font-size: 1.1em;">🎯 ${act.title}</h5>`;
                    actionsHtml += `<span id="reseller_action_icon_${act.id}" style="color: #666; transition: transform 0.3s; font-size: 0.9em;">▼</span>`;
                    actionsHtml += `</div>`;
                    
                    actionsHtml += `<div id="reseller_action_content_${act.id}" style="display: none; padding: 15px; border-top: 1px solid #eee;">`;
                    if (act.description) actionsHtml += '<div class="action-rich-text" style="font-size: 0.95em; color: #555; margin-bottom: 15px;">' + act.description + '</div>';
                    if (act.posts && act.posts.length > 0) {
                        actionsHtml += '<div style="margin-top: 15px;">';
                        act.posts.forEach((p, i) => {
                            const postTitle = p.title || ('Postagem ' + (i+1));
                            actionsHtml += '<div style="background: #f8f9fa; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e9ecef; overflow: hidden;">';
                            actionsHtml += `<div style="padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #f0f4f8;" onclick="toggleResellerPost('action', '${act.id}', ${i})">`;
                            actionsHtml += `<div style="font-weight: bold; color: #333; font-size: 0.95em;">${postTitle}</div>`;
                            actionsHtml += `<span id="reseller_action_post_icon_${act.id}_${i}" style="color: #666; transition: transform 0.3s; font-size: 0.9em;">▼</span>`;
                            actionsHtml += `</div>`;
                            actionsHtml += `<div id="reseller_action_post_content_${act.id}_${i}" style="display: none; padding: 12px; border-top: 1px solid #eee;">`;
                            actionsHtml += '<div style="font-family: monospace; white-space: pre-wrap; font-size: 0.9em; color: #444; background: white; padding: 12px; border-radius: 4px; border: 1px solid #ddd;" id="action_post_' + act.id + '_' + i + '">' + p.content + '</div>';
                            actionsHtml += '</div></div>';
                        });
                        actionsHtml += '</div>';
                    }
                    actionsHtml += '</div></div>';
                });
            } else {
                actionsHtml = '<div style="padding: 30px; text-align: center; color: #888; font-style: italic; background: white; border-radius: 8px; border: 1px dashed #ccc;">Nenhuma ação sugerida para esta campanha.</div>';
            }

            let textsHtml = '';
            if (campaign.textsDescription) {
                textsHtml += `<div class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;">${campaign.textsDescription}</div>`;
            }
            if (texts.length > 0) {
                texts.forEach(txt => {
                    let actualPosts = txt.posts || [];
                    if (txt.content && actualPosts.length === 0) actualPosts = [{ title: 'Texto Principal', content: txt.content }];
                    
                    textsHtml += `<div style="background: white; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #d4a574; overflow: hidden;">`;
                    textsHtml += `<div style="padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #fdfbf7;" onclick="toggleResellerText('${txt.id}')">`;
                    textsHtml += `<h5 style="margin: 0; color: #2c1810; font-size: 1.1em;">📝 ${txt.title}</h5>`;
                    textsHtml += `<span id="reseller_text_icon_${txt.id}" style="color: #666; transition: transform 0.3s; font-size: 0.9em;">▼</span>`;
                    textsHtml += `</div>`;
                    
                    textsHtml += `<div id="reseller_text_content_${txt.id}" style="display: none; padding: 15px; border-top: 1px solid #eee;">`;
                    if (txt.description) textsHtml += '<div class="action-rich-text" style="font-size: 0.95em; color: #555; margin-bottom: 15px;">' + txt.description + '</div>';
                    
                    actualPosts.forEach((p, i) => {
                        const postTitle = p.title || ('Texto ' + (i+1));
                        textsHtml += '<div style="background: #f8f9fa; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e9ecef; overflow: hidden;">';
                        textsHtml += `<div style="padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #fcf8f2;" onclick="toggleResellerPost('text', '${txt.id}', ${i})">`;
                        textsHtml += `<div style="font-weight: bold; color: #333; font-size: 0.95em;">${postTitle}</div>`;
                        textsHtml += `<span id="reseller_text_post_icon_${txt.id}_${i}" style="color: #666; transition: transform 0.3s; font-size: 0.9em; transform: rotate(180deg);">▼</span>`;
                        textsHtml += `</div>`;
                        textsHtml += `<div id="reseller_text_post_content_${txt.id}_${i}" style="display: block; padding: 12px; border-top: 1px solid #eee;">`;
                        textsHtml += '<div style="font-family: monospace; white-space: pre-wrap; font-size: 0.9em; color: #444; background: white; padding: 12px; border-radius: 4px; border: 1px solid #ddd;" id="text_post_' + txt.id + '_' + i + '">' + p.content + '</div>';
                        textsHtml += '<button class="btn-secondary" onclick="copyTextToClipboard(\'text_post_' + txt.id + '_' + i + '\')" style="margin-top: 10px; width: 100%; border: 1px dashed #d4a574; color: #d4a574; background: white; font-weight: bold; padding: 8px;">📋 Copiar Texto</button>';
                        textsHtml += '</div></div>';
                    });
                    textsHtml += '</div></div>';
                });
            } else {
                textsHtml = '<div style="padding: 30px; text-align: center; color: #888; font-style: italic; background: white; border-radius: 8px; border: 1px dashed #ccc;">Nenhum texto pronto disponível para esta campanha.</div>';
            }

            let materialsHtml = '';
            if (campaign.materialsDescription) {
                materialsHtml += `<div class="action-rich-text" style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; font-size: 0.95em;">${campaign.materialsDescription}</div>`;
            }
            if (materials.length > 0) {
                materialsHtml += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">';
                materials.forEach(mat => {
                    const safeImgUrl = getDirectImageUrl(mat.imageUrl);
                    materialsHtml += '<div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #eee; display: flex; flex-direction: column;">';
                    if (safeImgUrl) materialsHtml += '<div style="height: 180px; background: #f5f5f5;"><img src="' + safeImgUrl + '" style="width: 100%; height: 100%; object-fit: cover; cursor: zoom-in;" onclick="viewImageFullscreen(\'' + safeImgUrl + '\')"></div>';
                    materialsHtml += '<div style="padding: 15px; display: flex; flex-direction: column; flex: 1;">';
                    materialsHtml += '<div style="font-weight: bold; color: #2c1810; margin-bottom: 8px; font-size: 1.05em;">' + mat.title + '</div>';
                    if (mat.description) materialsHtml += '<div class="action-rich-text" style="font-size: 0.9em; color: #666; margin-bottom: 15px; flex: 1;">' + mat.description + '</div>';
                    else materialsHtml += '<div style="flex: 1;"></div>';
                    if (mat.linkUrl) materialsHtml += '<a href="' + mat.linkUrl + '" target="_blank" class="btn-primary" style="text-align: center; text-decoration: none; padding: 10px; font-size: 0.9em; margin: 0; display: block; border-radius: 4px; font-weight: bold;">🔗 Acessar Material</a>';
                    materialsHtml += '</div></div>';
                });
                materialsHtml += '</div>';
            } else {
                materialsHtml = '<div style="padding: 30px; text-align: center; color: #888; font-style: italic; background: white; border-radius: 8px; border: 1px dashed #ccc;">Nenhum material de divulgação disponível nesta campanha.</div>';
            }

            let bodyHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <h2 style="margin: 0; color: #2c1810;">📢 ${campaign.title}</h2>
                    <button class="btn-secondary" onclick="showResellerCampaignsList()">← Voltar para Campanhas</button>
                </div>
                ${campaign.description ? '<div class="action-rich-text" style="color: #555; margin-bottom: 20px; font-size: 1em; line-height: 1.5;">' + (campaign.description.includes('<') ? campaign.description : campaign.description.replace(/\n/g, '<br>')) + '</div>' : ''}

                <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-wrap: wrap;">
                    <button id="btnResellerTab_actions" class="btn-primary" onclick="switchResellerCampaignTab('actions')" style="margin: 0; padding: 8px 15px; flex: 1; min-width: 120px;">🎯 Ações (${actions.length})</button>
                    <button id="btnResellerTab_texts" class="btn-secondary" onclick="switchResellerCampaignTab('texts')" style="margin: 0; padding: 8px 15px; flex: 1; min-width: 120px;">📝 Textos Prontos (${texts.length})</button>
                    <button id="btnResellerTab_materials" class="btn-secondary" onclick="switchResellerCampaignTab('materials')" style="margin: 0; padding: 8px 15px; flex: 1; min-width: 120px;">🖼️ Materiais (${materials.length})</button>
                </div>

                <div style="background: #fdfbf7; border-radius: 8px; padding: 20px; border: 1px solid #eee; margin-bottom: 20px;">
                    <div id="resellerCampaignTab_actions" style="display: block;">
                        ${actionsHtml}
                    </div>
                    <div id="resellerCampaignTab_texts" style="display: none;">
                        ${textsHtml}
                    </div>
                    <div id="resellerCampaignTab_materials" style="display: none;">
                        ${materialsHtml}
                    </div>
                </div>
            `;


            detailsView.innerHTML = bodyHtml;
            listView.style.display = 'none';
            detailsView.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Erro ao abrir campanha:', error);
        showNotification('Erro ao carregar detalhes da campanha', 'error');
    }
    hideLoading();
}

function toggleResellerAction(actionId) {
    const content = document.getElementById(`reseller_action_content_${actionId}`);
    const icon = document.getElementById(`reseller_action_icon_${actionId}`);
    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}

function toggleResellerPost(type, parentId, postIndex) {
    const content = document.getElementById(`reseller_${type}_post_content_${parentId}_${postIndex}`);
    const icon = document.getElementById(`reseller_${type}_post_icon_${parentId}_${postIndex}`);
    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}

function toggleResellerText(textId) {
    const content = document.getElementById(`reseller_text_content_${textId}`);
    const icon = document.getElementById(`reseller_text_icon_${textId}`);
    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}

function switchResellerCampaignTab(tabId) {
    ['actions', 'texts', 'materials'].forEach(t => {
        const btn = document.getElementById(`btnResellerTab_${t}`);
        const content = document.getElementById(`resellerCampaignTab_${t}`);
        if (t === tabId) {
            if (btn) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
            if (content) content.style.display = 'block';
        } else {
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
            if (content) content.style.display = 'none';
        }
    });
}

function showResellerCampaignsList() {
    const listView = document.getElementById('resellerCampaignsListView');
    const detailsView = document.getElementById('resellerCampaignDetailsView');
    if (listView) listView.style.display = 'block';
    if (detailsView) detailsView.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// REVENDEDORA - VENDAS
// ============================================

let selectedProduct = null;
let shoppingCart = [];
let currentCatalogProducts = [];

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

        const productSalesCountByPid = {};
        const orphanSales = [];
        let totalSoldItems = 0;
        let totalSoldValue = 0;

        salesSnapshot.forEach((child) => {
            const sale = child.val();
            if (sale.productId === 'ACERTO' || sale.category === 'Financeiro') return;
            productSalesCountByPid[sale.productId] = (productSalesCountByPid[sale.productId] || 0) + 1;
            orphanSales.push(sale);
        });

        let products = [];
        const activeProductIds = new Set();
        const removedItemsList = [];
        orders.forEach(order => {
            if (order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid]) {
                        products.push(allProducts[pid]);
                        activeProductIds.add(pid);
                    }
                });
            }
            
            if (order.removedItemsLog) {
                order.removedItemsLog.forEach(log => {
                    removedItemsList.push({
                        id: log.productId,
                        name: log.productName,
                        reason: log.reason,
                        date: log.date,
                        productData: allProducts[log.productId]
                    });
                });
            }
        });

        products = products.filter((p, index, self) => 
            index === self.findIndex(t => t.id === p.id)
        );

        // Agrupar produtos com mesmo código
        let groupedProductsMap = {};
        let finalProducts = [];
        
        products.forEach(p => {
            let key;
            if (p.isCombination || p.code === 'COMBO') {
                key = p.id;
            } else if (p.code && p.code.trim() !== '' && p.code !== 'S/C') {
                key = p.code.trim().toLowerCase();
            } else {
                key = p.name.trim().toLowerCase(); // Agrupa pelo nome caso não tenha código (S/C)
            }
            
            if (!groupedProductsMap[key]) {
                groupedProductsMap[key] = {
                    ...p,
                    _groupedIds: [p.id],
                    _totalQuantity: 0,
                    _totalSoldCount: 0
                };
                finalProducts.push(groupedProductsMap[key]);
            } else if (key !== p.id) {
                groupedProductsMap[key]._groupedIds.push(p.id);
            }
            
            const qty = parseInt(p.quantity) || 1;
            groupedProductsMap[key]._totalQuantity += qty;
            groupedProductsMap[key]._totalSoldCount += (productSalesCountByPid[p.id] || 0);
        });

        // Abater vendas órfãs (vendas não liquidadas de pedidos já arquivados) para corrigir falha visual
        orphanSales.forEach((sale) => {
            if (!activeProductIds.has(sale.productId) && !sale.isSettled) {
                let key;
                if (sale.productCode === 'COMBO') {
                    key = sale.productId;
                } else if (sale.productCode && sale.productCode.trim() !== '' && sale.productCode !== 'S/C') {
                    key = String(sale.productCode).trim().toLowerCase();
                } else if (sale.productName) {
                    key = String(sale.productName).trim().toLowerCase();
                } else {
                    key = sale.productId;
                }
                
                if (groupedProductsMap[key]) {
                    groupedProductsMap[key]._totalSoldCount += 1;
                }
            }
        });

        const container = document.getElementById('productsList');
        
        if (finalProducts.length === 0) {
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
        
        finalProducts.forEach(p => {
            if (p.isCombination && p.components) {
                let soldOutComponent = false;
                p.components.forEach(compId => {
                    const compQty = parseInt(allProducts[compId]?.quantity) || 1;
                    const compSold = productSalesCountByPid[compId] || 0;
                    if (compSold >= compQty) soldOutComponent = true;
                });
                p._isSold = soldOutComponent;
                p._remaining = soldOutComponent ? 0 : 1;
            } else {
                p._isSold = p._totalSoldCount >= p._totalQuantity;
                p._remaining = Math.max(0, p._totalQuantity - p._totalSoldCount);
                
                totalItems += p._totalQuantity;
                totalValue += (Number(p.price) || 0) * p._totalQuantity;
                
                const soldQty = Math.min(p._totalSoldCount, p._totalQuantity); 
                totalSoldItems += soldQty;
                totalSoldValue += (Number(p.price) || 0) * soldQty;
            }
        });

        currentCatalogProducts = finalProducts;

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
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                    <button class="btn-secondary" onclick="openSimulatorModal()" style="flex: 1; padding: 8px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px; min-width: 140px;">
                        🧮 Simular Comissão
                    </button>
                    <button class="btn-secondary" onclick="openCatalogConfigModal()" style="flex: 1; padding: 8px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px; min-width: 140px;">
                        ⚙️ Configurar Catálogo
                    </button>
                    <button class="btn-primary" onclick="shareCatalog()" style="flex: 1; padding: 8px; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px; background-color: #25D366; color: white; border: none; min-width: 140px;">
                        📱 Compartilhar Catálogo
                    </button>
                </div>
            </div>
        `;

        const trulyRemovedItems = removedItemsList.filter(item => !activeProductIds.has(item.id));
        const uniqueRemoved = [];
        const seenRemoved = new Set();
        trulyRemovedItems.sort((a, b) => b.date - a.date).forEach(item => {
            if (!seenRemoved.has(item.id)) {
                seenRemoved.add(item.id);
                uniqueRemoved.push(item);
            }
        });

        const activeProductsHtml = finalProducts.map(product => {
            const isSold = product._isSold;
            const remaining = product._remaining;
            const quantity = product.isCombination ? 1 : product._totalQuantity;
            const isInCart = shoppingCart.some(p => p.id === product.id);
            const safeImgUrl = getDirectImageUrl(product.imageUrl);
            const restoredBadgeHtml = product.restoredAt ? `<div style="position: absolute; top: 10px; left: 10px; background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7em; z-index: 10; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><div style="font-weight: bold;">↺ Restaurado: ${formatDate(product.restoredAt)}</div>${product.restoredReason ? `<div style="font-size: 0.9em; opacity: 0.9; max-width: 150px; white-space: normal; line-height: 1.2;">Motivo: ${product.restoredReason}</div>` : ''}</div>` : '';

            return `
                <div class="product-card ${isSold ? 'sold' : ''}" onclick="${isSold ? '' : `openSaleModal('${product.id}')`}" style="position: relative; ${isInCart ? 'border-color: #0d47a1; background-color: #f0f8ff;' : ''}">
                    ${restoredBadgeHtml}
                    ${safeImgUrl ? `<img src="${safeImgUrl}" alt="${product.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 10px; display: block;">` : `<div style="width: 100%; height: 180px; background: #f5f5f5; border-radius: 6px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 0.9em;">Sem Imagem</div>`}
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

        const removedProductsHtml = uniqueRemoved.map(item => {
            const safeImgUrl = item.productData ? getDirectImageUrl(item.productData.imageUrl) : '';
            const code = item.productData ? item.productData.code : 'S/C';
            const price = item.productData ? item.productData.price : 0;
            
            return `
                <div class="product-card" style="opacity: 0.7; background-color: #f8f9fa; border: 1px dashed #dc3545; position: relative; cursor: not-allowed;">
                    <div style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.7em; font-weight: bold; z-index: 10;">Produto Excluído</div>
                    ${safeImgUrl ? `<img src="${safeImgUrl}" alt="${item.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 10px; display: block; filter: grayscale(100%);">` : `<div style="width: 100%; height: 180px; background: #eee; border-radius: 6px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 0.9em;">Sem Imagem</div>`}
                    <div class="product-name" style="text-decoration: line-through; color: #888;">${item.name}</div>
                    <div class="product-code" style="color: #999;">${code}</div>
                    <div class="product-price" style="color: #999;">${formatCurrency(price)}</div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 0.85em; color: #dc3545;">
                        <strong>Removido em:</strong> ${formatDate(item.date)}<br>
                        <strong style="display:block; margin-top:4px;">Motivo:</strong> <span style="color:#555;">${item.reason}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = summaryHtml + activeProductsHtml + removedProductsHtml;

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
    }
}

function shareCatalog() {
    if (!currentUser) return;
    
    const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
    const catalogUrl = `${baseUrl}/catalogo.html?rev=${currentUser.uid}`;
    
    const message = `Olá! Veja meu catálogo de produtos disponíveis e faça seu pedido direto pelo WhatsApp:\n\n👉 ${catalogUrl}`;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Link do catálogo copiado com sucesso!\nCole no WhatsApp para enviar para suas clientes.');
        }).catch(() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
}

// ============================================
// CONFIGURAÇÃO DO CATÁLOGO (VISIBILIDADE)
// ============================================

async function openCatalogConfigModal() {
    if (!currentUser) return;
    showLoading();

    try {
        // Buscar produtos da revendedora e preferências de visibilidade salvas
        const [ordersSnapshot, productsSnapshot, userSnapshot] = await Promise.all([
            ordersRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value'),
            productsRef.once('value'),
            usersRef.child(currentUser.uid).once('value')
        ]);

        const orders = [];
        ordersSnapshot.forEach(child => {
            if (child.val().status === 'active') orders.push(child.val());
        });

        const allProducts = productsSnapshot.val() || {};
        let products = [];
        orders.forEach(order => {
            if (order.products) {
                order.products.forEach(pid => {
                    if (allProducts[pid]) products.push({ id: pid, ...allProducts[pid] });
                });
            }
        });

        // Remover duplicados
        products = products.filter((p, index, self) => index === self.findIndex(t => t.id === p.id));

        // Agrupar por código
        let groupedProductsMap = {};
        let finalProducts = [];
        
        products.forEach(p => {
            let key;
            if (p.isCombination || p.code === 'COMBO') {
                key = p.id;
            } else if (p.code && p.code.trim() !== '' && p.code !== 'S/C') {
                key = p.code.trim().toLowerCase();
            } else {
                key = p.name.trim().toLowerCase(); // Agrupa pelo nome caso não tenha código
            }
            if (!groupedProductsMap[key]) {
                groupedProductsMap[key] = { ...p, _groupedIds: [p.id] };
                finalProducts.push(groupedProductsMap[key]);
            } else if (key !== p.id) {
                groupedProductsMap[key]._groupedIds.push(p.id);
            }
        });

        const userData = userSnapshot.val() || {};
        const hiddenProducts = userData.hiddenProducts || {}; // Ex: { "idProduto": true }

        if (!document.getElementById('catalogConfigModal')) {
            const modalHtml = `
                <div id="catalogConfigModal" class="modal-overlay">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3>Configurar Catálogo</h3>
                            <button class="close-modal" onclick="closeCatalogConfigModal()">×</button>
                        </div>
                        <div class="modal-body">
                            <p style="margin-bottom: 15px; color: #666; font-size: 0.9em;">Selecione quais produtos ficarão <b>visíveis</b> para suas clientes no catálogo online.</p>
                            
                            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; color: #2c1810;">
                                    <input type="checkbox" id="selectAllCatalogCb" onchange="toggleAllCatalogItems(this)" style="width: 18px; height: 18px; cursor: pointer;">
                                    Marcar / Desmarcar Todos
                                </label>
                            </div>

                            <div id="catalogConfigList" style="border: 1px solid #eee; border-radius: 6px; padding: 5px;"></div>
                            
                            <button class="btn-primary" onclick="saveCatalogConfig()" style="width: 100%; margin-top: 15px;">Salvar Visibilidade</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const listContainer = document.getElementById('catalogConfigList');
        if (finalProducts.length === 0) {
            listContainer.innerHTML = '<p style="padding: 15px; text-align: center; color: #666;">Nenhum produto disponível.</p>';
        } else {
            listContainer.innerHTML = finalProducts.map(p => {
                const isHidden = p._groupedIds.every(id => hiddenProducts[id] === true);
                const isChecked = !isHidden; // Se não está oculto, está marcado (visível)
                const safeImgUrl = getDirectImageUrl(p.imageUrl);
                const imgThumb = safeImgUrl ? `<img src="${safeImgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">` : `<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa;">Img</div>`;

                return `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
                        <input type="checkbox" class="catalog-visibility-cb" value="${p._groupedIds.join(',')}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        ${imgThumb}
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333; font-size: 0.95em;">${p.name}</div>
                            <div style="font-size: 0.85em; color: #888;">${p.code} • ${formatCurrency(p.price)}</div>
                        </div>
                    </label>
                `;
            }).join('');
        }

        // Ajustar estado do checkbox "Selecionar Todos"
        const allCbs = document.querySelectorAll('.catalog-visibility-cb');
        const allChecked = Array.from(allCbs).every(cb => cb.checked);
        const selectAllCb = document.getElementById('selectAllCatalogCb');
        if (selectAllCb) selectAllCb.checked = allCbs.length > 0 && allChecked;

        document.getElementById('catalogConfigModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar configuração do catálogo:', error);
        showNotification('Erro ao carregar produtos', 'error');
    }
}

function closeCatalogConfigModal() {
    const modal = document.getElementById('catalogConfigModal');
    if (modal) modal.classList.remove('active');
}

function toggleAllCatalogItems(source) {
    const checkboxes = document.querySelectorAll('.catalog-visibility-cb');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function saveCatalogConfig() {
    showLoading();
    try {
        const checkboxes = document.querySelectorAll('.catalog-visibility-cb');
        const hiddenProducts = {};
        
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                const ids = cb.value.split(',');
                ids.forEach(id => {
                    hiddenProducts[id] = true; // Salva o ID do produto como oculto
                });
            }
        });

        // Se não houver produtos ocultos, removemos o nó. Caso contrário, salvamos os IDs ocultos.
        if (Object.keys(hiddenProducts).length === 0) {
            await usersRef.child(currentUser.uid).child('hiddenProducts').remove();
        } else {
            await usersRef.child(currentUser.uid).update({
                hiddenProducts: hiddenProducts
            });
        }

        closeCatalogConfigModal();
        hideLoading();
        showNotification('Visibilidade do catálogo atualizada com sucesso!');
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar configuração:', error);
        showNotification('Erro ao salvar configuração', 'error');
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

        const groupData = currentCatalogProducts.find(p => p._groupedIds && p._groupedIds.includes(productId)) || currentCatalogProducts.find(p => p.id === productId);
        const maxQty = groupData ? groupData._remaining : 1;
        selectedProduct._groupCode = groupData ? groupData.code : selectedProduct.code;

        const isAdmin = currentUser && currentUser.role === 'admin';
        const fixedDiscounts = currentUser ? (Array.isArray(currentUser.discountPercentage) ? currentUser.discountPercentage : [currentUser.discountPercentage || 0]).filter(d => d > 0) : [];
        const canDiscount = currentUser && (isAdmin || (currentUser.allowDiscounts !== false && fixedDiscounts.length > 0));
        
        let discountHtml = '';
        if (canDiscount) {
            if (isAdmin) {
                discountHtml = `
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
                `;
            } else {
                if (fixedDiscounts.length === 1) {
                    discountHtml = `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; cursor: pointer; color: #28a745; font-weight: 600; font-size: 0.95em; margin-bottom: 5px;">
                                <input type="checkbox" id="saleApplyDiscountCb" style="width: 18px; height: 18px;" onchange="updateSaleFinalPrice()">
                                Aplicar desconto de ${fixedDiscounts[0]}%
                            </label>
                            <input type="hidden" id="saleDiscountType" value="percentage">
                            <input type="hidden" id="saleDiscountInput" value="${fixedDiscounts[0]}">
                            <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="saleFinalPriceDisplay">Total: ${formatCurrency(selectedProduct.price)}</div>
                            <div id="saleOriginalPriceDisplay" style="text-align: right; font-size: 0.85em; text-decoration: line-through; color: #888; display: none;">De: ${formatCurrency(selectedProduct.price)}</div>
                        </div>
                    `;
                } else {
                    let options = '<option value="0">Sem desconto</option>';
                    if (currentUser.allowDiscounts !== false) {
                        fixedDiscounts.forEach(d => {
                            options += `<option value="${d}">Desconto Único: ${d}%</option>`;
                        });
                    }
                    discountHtml = `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                            <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; justify-content: flex-end;">
                                <label style="color: #28a745; font-weight: 600; font-size: 0.95em;">Desconto Unitário:</label>
                                <select id="saleDiscountInput" class="input-field" style="width: auto; margin-bottom: 0; padding: 4px;" onchange="updateSaleFinalPrice()">
                                    ${options}
                                </select>
                                <input type="hidden" id="saleDiscountType" value="percentage">
                            </div>
                            <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="saleFinalPriceDisplay">Total: ${formatCurrency(selectedProduct.price)}</div>
                            <div id="saleOriginalPriceDisplay" style="text-align: right; font-size: 0.85em; text-decoration: line-through; color: #888; display: none;">De: ${formatCurrency(selectedProduct.price)}</div>
                        </div>
                    `;
                }
            }
        } else {
            discountHtml = `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="saleFinalPriceDisplay">Total: ${formatCurrency(selectedProduct.price)}</div>
                </div>
            `;
        }

        const safeImgUrl = getDirectImageUrl(selectedProduct.imageUrl);
        const imgHtml = safeImgUrl ? `<img src="${safeImgUrl}" style="width: 100%; max-height: 200px; object-fit: contain; margin-bottom: 15px; border-radius: 8px;">` : '';

        document.getElementById('saleProductInfo').innerHTML = `
            <div class="product-info">
                ${imgHtml}
                <h3>${selectedProduct.name}</h3>
                <p>Código: ${selectedProduct.code}${selectedProduct.code2 ? ` / ${selectedProduct.code2}` : ''}</p>
                <p class="product-price">${formatCurrency(selectedProduct.price)}</p>
                ${discountHtml}
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

        const cartCount = shoppingCart.filter(p => {
            if (p.id === selectedProduct.id) return true;
            if (selectedProduct._groupCode && selectedProduct._groupCode !== 'S/C' && selectedProduct._groupCode !== 'COMBO' && p._groupCode === selectedProduct._groupCode) return true;
            if ((!selectedProduct._groupCode || selectedProduct._groupCode === 'S/C' || selectedProduct._groupCode === 'COMBO') && p.name && selectedProduct.name && p.name.trim().toLowerCase() === selectedProduct.name.trim().toLowerCase()) return true;
            return false;
        }).length;
        const availableToAdd = Math.max(0, maxQty - cartCount);
        const addBtn = document.getElementById('btnAddToCart');
        addBtn.textContent = `🛒 Adicionar à Cesta ${cartCount > 0 ? `(${cartCount})` : ''}`;
        addBtn.onclick = () => {
            const qty = parseInt(document.getElementById('cartQuantityInput').value) || 1;
            if (qty > availableToAdd) {
                showNotification(`Limite atingido! Você só tem mais ${availableToAdd} unidade(s) disponível(is).`, 'error');
                return;
            }
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
    
    let discountInputVal = 0;
    const discountInput = document.getElementById('saleDiscountInput');
    const discountTypeEl = document.getElementById('saleDiscountType');
    const applyDiscountCb = document.getElementById('saleApplyDiscountCb');
    
    if (discountInput && discountTypeEl) {
        if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
            discountInputVal = 0;
        } else {
            discountInputVal = parseFloat(discountInput.value) || 0;
        }
        const discountType = discountTypeEl.value;
        
        let discount = 0;
        if (discountType === 'percentage') {
            discount = selectedProduct.price * (discountInputVal / 100);
        } else {
            discount = discountInputVal;
        }

        let finalPrice = selectedProduct.price - discount;
        if (finalPrice < 0) finalPrice = 0;
        document.getElementById('saleFinalPriceDisplay').innerHTML = `Total: ${formatCurrency(finalPrice)}`;
        
        const originalPriceDisplay = document.getElementById('saleOriginalPriceDisplay');
        if (originalPriceDisplay) {
            if (discount > 0) {
                originalPriceDisplay.style.display = 'block';
            } else {
                originalPriceDisplay.style.display = 'none';
            }
        }
    } else {
        document.getElementById('saleFinalPriceDisplay').innerHTML = `Total: ${formatCurrency(selectedProduct.price)}`;
    }
    
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

        const cartCount = shoppingCart.filter(p => {
            if (p.id === selectedProduct.id) return true;
            if (selectedProduct._groupCode && selectedProduct._groupCode !== 'S/C' && selectedProduct._groupCode !== 'COMBO' && p._groupCode === selectedProduct._groupCode) return true;
            if ((!selectedProduct._groupCode || selectedProduct._groupCode === 'S/C' || selectedProduct._groupCode === 'COMBO') && p.name && selectedProduct.name && p.name.trim().toLowerCase() === selectedProduct.name.trim().toLowerCase()) return true;
            return false;
        }).length;
        const groupData = currentCatalogProducts.find(p => p._groupedIds && p._groupedIds.includes(selectedProduct.id)) || currentCatalogProducts.find(p => p.id === selectedProduct.id);
        const maxQty = groupData ? groupData._remaining : 1;
        
        if (1 > (maxQty - cartCount)) {
            showNotification('Limite atingido! Você já possui a quantidade máxima disponível deste item na cesta.', 'error');
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
        const applyDiscountCb = document.getElementById('saleApplyDiscountCb');
        
        if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
            discountInputVal = 0;
        }
        
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

        const groupId = generateId(); // Sempre geramos, se for combinação usamos

        if (selectedProduct.isCombination && selectedProduct.components) {
            const productsSnap = await productsRef.once('value');
            const allProducts = productsSnap.val() || {};
            
            const updates = {};
            let finalTotal = 0;

            selectedProduct.components.forEach(compId => {
                const comp = allProducts[compId];
                if (comp) {
                    const compOriginal = Number(comp.price) || 0;
                    const comboOriginal = Number(selectedProduct.price) || 1;
                    const ratio = compOriginal / comboOriginal;
                    
                    const compFinalPrice = finalPrice * ratio;
                    const compDiscount = compOriginal - compFinalPrice;

                    finalTotal += compFinalPrice;

                    const saleId = generateId();
                    updates[`sales/${saleId}`] = {
                        productId: compId,
                        productName: comp.name,
                        productCode: comp.code || '',
                        price: compFinalPrice,
                        originalPrice: compOriginal,
                        discount: compDiscount,
                        clientId: clientId,
                        clientName: clientName,
                        resellerId: currentUser.uid,
                        date: firebase.database.ServerValue.TIMESTAMP,
                        dateApprox: Date.now(),
                        paymentStatus: paymentStatus,
                        groupId: groupId
                    };
                }
            });
            await database.ref().update(updates);

            if (paymentData) {
                const paymentId = generateId();
                await paymentsRef.child(paymentId).set({
                    groupId: groupId,
                    ...paymentData
                });
            }
        } else {
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
                dateApprox: Date.now(),
                paymentStatus: paymentStatus
            });

            if (paymentData) {
                const paymentId = generateId();
                await paymentsRef.child(paymentId).set({
                    saleId: saleId,
                    ...paymentData
                });
            }
        }

        const savedProductName = selectedProduct.name;
        const savedFinalPrice = selectedProduct.isCombination ? finalTotal : finalPrice;

        closeSaleModal();
        hideLoading();
        showNotification('Venda registrada com sucesso!');
        loadProducts();
        loadSoldProducts();
        updateDashboard();

        if (clientPhone) {
            setTimeout(() => {
                sendWhatsAppReceipt(clientName, clientPhone, `- ${savedProductName}: ${formatCurrency(savedFinalPrice, true)}`, savedFinalPrice);
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
    const applyDiscountCb = document.getElementById('saleApplyDiscountCb');
    
    if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
        discountInputVal = 0;
    }
    
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

function getCheckoutFinalPrice() {
    const subtotal = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
    
    let totalDiscount = 0;
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (isAdmin) {
        let discountInputVal = parseFloat(document.getElementById('checkoutDiscountInput')?.value) || 0;
        const discountType = document.getElementById('checkoutDiscountType')?.value || 'percentage';
        if (discountType === 'percentage') {
            totalDiscount = subtotal * (discountInputVal / 100);
        } else {
            totalDiscount = discountInputVal;
        }
        let finalPrice = subtotal - totalDiscount;
        return finalPrice < 0 ? 0 : finalPrice;
    } else {
        const discountSelect = document.getElementById('checkoutDiscountSelect');
        if (discountSelect && discountSelect.value === 'progressive') {
            const prog = currentUser.progressiveDiscounts || [];
            const sortedItems = [...shoppingCart].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            
            let tempTotal = 0;
            sortedItems.forEach((item, index) => {
                const p = Number(item.price) || 0;
                const pct = prog[index] !== undefined ? prog[index] : (prog[prog.length - 1] || 0);
                tempTotal += p - (p * (pct / 100));
            });
            return tempTotal < 0 ? 0 : tempTotal;
        } else {
            return subtotal < 0 ? 0 : subtotal;
        }
    }
}

async function openCheckoutModal() {
    if (shoppingCart.length === 0) return;

    const existingModal = document.getElementById('checkoutModal');
    if (existingModal) {
        existingModal.remove();
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    const fixedDiscounts = currentUser ? (Array.isArray(currentUser.discountPercentage) ? currentUser.discountPercentage : [currentUser.discountPercentage || 0]).filter(d => d > 0) : [];
    const progressiveDiscounts = currentUser && Array.isArray(currentUser.progressiveDiscounts) && currentUser.progressiveDiscounts.length > 0 ? currentUser.progressiveDiscounts : [];
    const canDiscount = currentUser && (isAdmin || (currentUser.allowDiscounts !== false && fixedDiscounts.length > 0) || progressiveDiscounts.length > 0);

    let checkoutDiscountHtml = '';
    if (canDiscount) {
        if (isAdmin) {
            checkoutDiscountHtml = `
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
            `;
        } else {
            let options = '<option value="">Manter Descontos Individuais</option>';
            if (currentUser.allowDiscounts !== false && fixedDiscounts.length > 0) {
                // Pode ter descontos avulsos que já foram mantidos
            }
            
            let progressiveOptionsHtml = '';
            if (progressiveDiscounts.length > 0) {
                progressiveOptionsHtml = `
                    <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; justify-content: flex-end;">
                        <label style="color: #28a745; font-weight: 600; font-size: 0.95em;">Desconto no Lote:</label>
                        <select id="checkoutDiscountSelect" class="input-field" style="width: auto; margin-bottom: 0; padding: 4px; max-width: 280px;" onchange="updateCheckoutFinalPrice()">
                            ${options}
                            <option value="progressive">Substituir por Progressivo: ${progressiveDiscounts.join('%, ')}%</option>
                        </select>
                    </div>
                    <div id="checkoutDiscountDetails" style="text-align: right; font-size: 0.85em; color: #28a745; margin-bottom: 5px; display: none;"></div>
                `;
            }

            checkoutDiscountHtml = `
                <div id="checkoutTotalContainer" style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="color: #666; font-size: 0.85em; margin-bottom: 5px; text-align: right; font-style: italic;">
                        Os itens podem ter recebido descontos individualmente.
                    </div>
                    ${progressiveOptionsHtml}
                    <div style="text-align: right; font-weight: bold; font-size: 1.3em; color: #2c1810;" id="checkoutTotal"></div>
                </div>
            `;
        }
        
        const canGenerateCashback = currentUser && currentUser.allowCashback;
        checkoutDiscountHtml += `
            <div id="checkoutCashbackSection" style="margin-bottom: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                <div id="checkoutRedeemCashbackContainer" style="display: none; margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #17a2b8; font-weight: 600; font-size: 0.95em;">
                        <input type="checkbox" id="checkoutRedeemCashbackCb" onchange="updateCheckoutFinalPrice()">
                        Usar Cashback: <span id="checkoutAvailableCashbackDisplay"></span>
                    </label>
                </div>
                ${canGenerateCashback ? `
                <div id="checkoutGenerateCashbackContainer" style="display: none;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #d4a574; font-weight: 600; font-size: 0.95em;">
                        <input type="checkbox" id="checkoutGenerateCashbackCb" onchange="updateCheckoutFinalPrice()">
                        Gerar Cashback para o cliente (<span id="checkoutGenerateCashbackPctDisplay">${currentUser.cashbackPercentage}</span>%)
                    </label>
                    <div id="checkoutGeneratedCashbackDisplay" style="font-size: 0.85em; color: #666; margin-left: 26px;"></div>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        checkoutDiscountHtml = `
            <div id="checkoutTotalContainer" style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                <div style="text-align: right; font-weight: bold; font-size: 1.3em; color: #2c1810;" id="checkoutTotal"></div>
            </div>
        `;
    }

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
                        ${checkoutDiscountHtml}
                        
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
    list.innerHTML = shoppingCart.map(item => {
        const safeImgUrl = getDirectImageUrl(item.imageUrl);
        const imgThumb = safeImgUrl ? `<img src="${safeImgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px; border: 1px solid #eee;">` : `<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa;">Img</div>`;
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: center;">
                ${imgThumb}
                <div>
                    <div style="font-weight: 600;">${item.name}</div>
                    <div style="font-size: 0.85em; color: #666;">${item.code}${item.code2 ? ` / ${item.code2}` : ''}</div>
                    ${item.appliedDiscount ? `<div style="font-size: 0.75em; color: #28a745;">Desconto un.: ${formatCurrency(item.appliedDiscount)}</div>` : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div>${formatCurrency(item.appliedPrice !== undefined ? item.appliedPrice : item.price)}</div>
                ${item.appliedDiscount ? `<div style="font-size: 0.75em; text-decoration: line-through; color: #888;">${formatCurrency(item.price)}</div>` : ''}
                <button onclick="removeFromCartAndRefresh('${item.id}')" style="color: #dc3545; background: none; border: none; font-size: 0.8em; cursor: pointer;">Remover</button>
            </div>
        </div>
    `}).join('');

    const total = shoppingCart.reduce((sum, item) => sum + (Number(item.appliedPrice !== undefined ? item.appliedPrice : item.price) || 0), 0);
    document.getElementById('checkoutTotal').innerHTML = `Total: ${formatCurrency(total)}`;
    
    const discountInput = document.getElementById('checkoutDiscountInput');
    if (discountInput) discountInput.value = '';

    showLoading();
    try {
        const clientsSnapshot = await clientsRef.orderByChild('resellerId').equalTo(currentUser.uid).once('value');
        const now = Date.now();
        const select = document.getElementById('checkoutClient');
        select.innerHTML = '<option value="">Selecione o Cliente</option>' +
            '<option value="new">+ Novo Cliente</option>';
        
        clientsSnapshot.forEach(child => {
            const c = child.val();
            select.innerHTML += `<option value="${child.key}" data-cb="${(c.cashbackBalance > 0 && c.cashbackExpiresAt > now) ? c.cashbackBalance : 0}">${c.name}</option>`;
        });
        
        document.getElementById('checkoutModal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
    hideLoading();
}

function updateCheckoutFinalPrice() {
    let baseFinalPrice = getCheckoutFinalPrice();
    
    // --- Lógica de Cashback ---
    let redeemedCashback = 0;
    const clientSelect = document.getElementById('checkoutClient');
    const redeemCb = document.getElementById('checkoutRedeemCashbackCb');
    const redeemContainer = document.getElementById('checkoutRedeemCashbackContainer');
    
    if (clientSelect && clientSelect.value && clientSelect.value !== 'new') {
        const selectedOption = clientSelect.options[clientSelect.selectedIndex];
        const availableCb = parseFloat(selectedOption.dataset.cb || 0);
        
        if (availableCb > 0) {
            if (redeemContainer) redeemContainer.style.display = 'block';
            if (document.getElementById('checkoutAvailableCashbackDisplay')) {
                document.getElementById('checkoutAvailableCashbackDisplay').innerHTML = formatCurrency(availableCb);
            }
            
            if (redeemCb && redeemCb.checked) {
                redeemedCashback = availableCb;
                if (redeemedCashback > baseFinalPrice) {
                    redeemedCashback = baseFinalPrice; // Cap
                }
            }
        } else {
            if (redeemContainer) redeemContainer.style.display = 'none';
            if (redeemCb) redeemCb.checked = false;
        }
    } else {
        if (redeemContainer) redeemContainer.style.display = 'none';
        if (redeemCb) redeemCb.checked = false;
    }
    
    let finalPrice = baseFinalPrice - redeemedCashback;
    if (finalPrice < 0) finalPrice = 0;
    
    // Mostrar Cashback Gerado Estimado
    const generateCb = document.getElementById('checkoutGenerateCashbackCb');
    const generateContainer = document.getElementById('checkoutGenerateCashbackContainer');
    if (generateContainer && currentUser && currentUser.allowCashback) {
        generateContainer.style.display = 'block';
        if (generateCb && generateCb.checked) {
            const generatedVal = finalPrice * (currentUser.cashbackPercentage / 100);
            document.getElementById('checkoutGeneratedCashbackDisplay').innerHTML = `Ficará disponível: ${formatCurrency(generatedVal)}`;
        } else {
            document.getElementById('checkoutGeneratedCashbackDisplay').innerHTML = '';
        }
    }

    document.getElementById('checkoutTotal').innerHTML = `Total: ${formatCurrency(finalPrice)}`;
    
    const detailsEl = document.getElementById('checkoutDiscountDetails');
    if (detailsEl) {
        const discountSelect = document.getElementById('checkoutDiscountSelect');
        if (discountSelect && discountSelect.value === 'progressive') {
            detailsEl.textContent = 'Desconto aplicado por ordem de valor (do maior para o menor preço).';
            detailsEl.style.display = 'block';
        } else {
            detailsEl.style.display = 'none';
        }
    }
    
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
    if(document.getElementById('checkoutRedeemCashbackCb')) document.getElementById('checkoutRedeemCashbackCb').checked = false;
    if(document.getElementById('checkoutGenerateCashbackCb')) document.getElementById('checkoutGenerateCashbackCb').checked = false;
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
    updateCheckoutFinalPrice();
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
        let totalDiscount = 0;
        let isProgressive = false;
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (isAdmin) {
            let discountInputVal = parseFloat(document.getElementById('checkoutDiscountInput')?.value) || 0;
            const discountType = document.getElementById('checkoutDiscountType')?.value || 'percentage';
            if (discountType === 'percentage') {
                totalDiscount = subtotal * (discountInputVal / 100);
            } else {
                totalDiscount = discountInputVal;
            }
        } else {
            const discountSelect = document.getElementById('checkoutDiscountSelect');
            if (discountSelect && discountSelect.value === 'progressive') {
                isProgressive = true;
            }
        }

        // Calcular Cashback Resgatado no Lote
        let redeemedCashback = 0;
        const redeemCb = document.getElementById('checkoutRedeemCashbackCb');
        let baseFinalPrice = getCheckoutFinalPrice(); // O valor real sem cashback
        
        if (redeemCb && redeemCb.checked && select.value !== 'new') {
            const selectedOption = select.options[select.selectedIndex];
            const availableCb = parseFloat(selectedOption.dataset.cb || 0);
            if (availableCb > 0) {
                redeemedCashback = availableCb > baseFinalPrice ? baseFinalPrice : availableCb;
            }
        }
        
        const ratioCashback = (baseFinalPrice > 0 && redeemedCashback > 0) ? redeemedCashback / baseFinalPrice : 0;

        let itemsText = '';
        let finalTotal = 0;
        
        const productsSnap = await productsRef.once('value');
        const allProducts = productsSnap.val() || {};


        const updates = {};
        
        let cartToProcess = [...shoppingCart];
        if (isProgressive) {
            const prog = currentUser.progressiveDiscounts || [];
            cartToProcess.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            cartToProcess.forEach((item, index) => {
                item._tempDiscountPct = prog[index] !== undefined ? prog[index] : (prog[prog.length - 1] || 0);
            });
        } else {
            const discountRatio = (subtotal > 0 && totalDiscount > 0) ? totalDiscount / subtotal : 0;
            cartToProcess.forEach(item => item._tempDiscountRatio = discountRatio);
        }

        cartToProcess.forEach(item => {
            let itemFinalPrice;
            let original = Number(item.price) || 0;
            
            if (isProgressive) {
                const pct = item._tempDiscountPct || 0;
                itemFinalPrice = original - (original * (pct / 100));
            } else {
                const itemApplied = Number(item.appliedPrice !== undefined ? item.appliedPrice : original) || 0;
                const ratio = item._tempDiscountRatio || 0;
                itemFinalPrice = itemApplied - (itemApplied * ratio);
            }
            
            if (itemFinalPrice < 0) itemFinalPrice = 0;
            
            // Aplicar desconto do cashback no item
            let cbDiscount = 0;
            if (ratioCashback > 0) {
                cbDiscount = itemFinalPrice * ratioCashback;
                itemFinalPrice -= cbDiscount;
            }

            if (item.isCombination && item.components) {
                item.components.forEach(compId => {
                    const comp = allProducts[compId];
                    if (comp) {
                        const compOriginal = Number(comp.price) || 0;
                        const comboOriginal = original || 1;
                        const ratio = compOriginal / comboOriginal;
                        
                        const compFinalPrice = itemFinalPrice * ratio;
                        const compDiscount = compOriginal - compFinalPrice;

                        itemsText += `- ${comp.name}: ${formatCurrency(compFinalPrice, true)}\n`;
                        finalTotal += compFinalPrice;

                        const compSaleId = generateId();
                        updates[`sales/${compSaleId}`] = {
                            productId: compId,
                            productName: comp.name,
                            productCode: comp.code || '',
                            price: compFinalPrice,
                            originalPrice: compOriginal,
                            discount: compDiscount,
                            clientId: clientId,
                            clientName: clientName,
                            resellerId: currentUser.uid,
                            date: firebase.database.ServerValue.TIMESTAMP,
                            dateApprox: Date.now(),
                            paymentStatus: paymentStatus,
                            groupId: groupId
                        };
                    }
                });
            } else {
                itemsText += `- ${item.name}: ${formatCurrency(itemFinalPrice, true)}\n`;
                finalTotal += itemFinalPrice;

                const saleId = generateId();
                updates[`sales/${saleId}`] = {
                    productId: item.id,
                    productName: item.name,
                    productCode: item.code,
                    price: itemFinalPrice,
                    originalPrice: original,
                    discount: original - itemFinalPrice,
                    clientId: clientId,
                    clientName: clientName,
                    resellerId: currentUser.uid,
                    date: firebase.database.ServerValue.TIMESTAMP,
                    dateApprox: Date.now(),
                    paymentStatus: paymentStatus,
                    groupId: groupId 
                };
            }
        });
        

        await usersRef.parent.update(updates);

        // Se houve pagamento, registrar UM pagamento vinculado ao groupId
        if (paymentData) {
            const paymentId = generateId();
            await paymentsRef.child(paymentId).set({
                groupId: groupId, // Link pelo grupo
                ...paymentData
            });
        }
        
        // --- Geração e Abatimento de Cashback (Final) ---
        let generatedCashback = 0;
        const generateCb = document.getElementById('checkoutGenerateCashbackCb');
        if (generateCb && generateCb.checked && currentUser && currentUser.allowCashback) {
            generatedCashback = finalTotal * (currentUser.cashbackPercentage / 100);
        }
        
        if (redeemedCashback > 0 || generatedCashback > 0) {
            const clientSnap = await clientsRef.child(clientId).once('value');
            const clientData = clientSnap.val() || {};
            let newCbBalance = (clientData.cashbackBalance || 0) - redeemedCashback + generatedCashback;
            if (newCbBalance < 0) newCbBalance = 0;
            
            const clientUpdates = { cashbackBalance: newCbBalance };
            if (generatedCashback > 0) {
                const validity = currentUser.cashbackValidityDays || 30;
                clientUpdates.cashbackExpiresAt = Date.now() + (validity * 24 * 60 * 60 * 1000);
            } else if (newCbBalance === 0) {
                clientUpdates.cashbackExpiresAt = null;
            }
            await clientsRef.child(clientId).update(clientUpdates);
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
                        <div id="productHistoryList"></div>
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
    totalContainer.innerHTML = `Total Histórico: ${formatCurrency(total)}`;

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
        groupSnapshot.forEach(child => { newTotal += (Number(child.val().price) || 0); });
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
            let remainingToPay = Math.round((newTotal - totalPaid) * 100) / 100;
            let pendingCount = list.filter(inst => inst.status === 'pending').length;

            if (remainingToPay > 0.001 && pendingCount === 0) {
                list.push({
                    number: list.length + 1,
                    status: 'pending',
                    paidAt: null,
                    value: remainingToPay
                });
                pendingCount = 1;
            }

            if (pendingCount > 0) {
                const newBaseValue = Math.floor((remainingToPay / pendingCount) * 100) / 100;
                let remainder = Math.round((remainingToPay - (newBaseValue * pendingCount)) * 100) / 100;

                list.forEach(inst => {
                    if (inst.status === 'pending') {
                        let val = newBaseValue;
                        if (remainder > 0.001) { val = (val * 100 + 1) / 100; remainder = Math.round((remainder * 100 - 1)) / 100; }
                        inst.value = val;
                    }
                });
            } else if (remainingToPay <= 0) {
                list = list.filter(inst => inst.status === 'paid');
            }
            
            await paymentsRef.child(paymentId).update({ installmentsList: list, installmentValue: list.find(i => i.status === 'pending')?.value || 0 });

            const allPaid = list.every(item => item.status === 'paid');
            const newStatus = allPaid ? 'paid' : 'installment';

            if (isGroup) {
                const groupSnapshot = await salesRef.orderByChild('groupId').equalTo(targetId).once('value');
                const updates = {};
                groupSnapshot.forEach(child => updates[`sales/${child.key}/paymentStatus`] = newStatus);
                if (Object.keys(updates).length > 0) {
                    await database.ref().update(updates);
                }
            } else {
                await salesRef.child(targetId).update({ paymentStatus: newStatus });
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
                        <div id="saleDetailsList"></div>
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
            snapshot.forEach(c => { 
                items.push({ id: c.key, ...c.val() }); 
            });
            snapshot.forEach(c => { 
                items.push({ id: c.key, ...c.val() }); 
            });
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

        const canDiscount = currentUser && (currentUser.role === 'admin' || currentUser.allowDiscounts !== false);

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
                    ${(isGroup && canDiscount) ? `
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
            snapshot.forEach(c => { items.push({ id: c.key, ...c.val() }); });
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
            itemsText += `- ${i.productName}: ${formatCurrency(i.price, true)}\n`;
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

        // Salvar no histórico de vendas canceladas da revendedora
        await usersRef.child(sale.resellerId).child('canceledSales').child(saleId).set({
            ...sale,
            canceledAt: firebase.database.ServerValue.TIMESTAMP,
            canceledBy: currentUser.uid
        });

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
                paymentsSnapshot.forEach(child => { updates[child.key] = null; });
                if (Object.keys(updates).length > 0) await usersRef.parent.update(updates);
            } else {
                // RECALCULAR PARCELAS AUTOMATICAMENTE
                const remainingSales = [];
                groupSnapshot.forEach(child => {
                    remainingSales.push(child.val());
                });
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
                await usersRef.parent.update(updates);
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

    const isAdmin = currentUser && currentUser.role === 'admin';
    const fixedDiscounts = currentUser ? (Array.isArray(currentUser.discountPercentage) ? currentUser.discountPercentage : [currentUser.discountPercentage || 0]).filter(d => d > 0) : [];
    const canDiscount = currentUser && (isAdmin || (currentUser.allowDiscounts !== false && fixedDiscounts.length > 0));

    const existingModal = document.getElementById('editSaleModal');
    if (existingModal) {
        existingModal.remove(); // Remove modal antigo para injetar o novo com suporte a desconto
    }

    let editDiscountHtml = '';
    if (canDiscount) {
        if (isAdmin) {
            editDiscountHtml = `
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
            `;
        } else {
            if (fixedDiscounts.length === 1) {
                editDiscountHtml = `
                    <div class="form-group" style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                        <label style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; cursor: pointer; color: #28a745; font-weight: 600; font-size: 0.95em; margin-bottom: 10px;">
                            <input type="checkbox" id="editSaleApplyDiscountCb" style="width: 18px; height: 18px;" onchange="updateEditSaleFinalPrice()">
                            Aplicar desconto de ${fixedDiscounts[0]}%
                        </label>
                        <input type="hidden" id="editSaleDiscountType" value="percentage">
                        <input type="hidden" id="editSaleDiscountInput" value="${fixedDiscounts[0]}">
                        <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="editSaleFinalPriceDisplay">Total: R$ 0,00</div>
                    </div>
                `;
            } else {
                let options = '<option value="0">Sem desconto</option>';
                fixedDiscounts.forEach(d => {
                    options += `<option value="${d}">${d}%</option>`;
                });
                editDiscountHtml = `
                    <div class="form-group" style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; justify-content: flex-end;">
                            <label style="color: #28a745; font-weight: 600; font-size: 0.95em;">Desconto Unitário:</label>
                            <select id="editSaleDiscountInput" class="input-field" style="width: auto; margin-bottom: 0; padding: 4px;" onchange="updateEditSaleFinalPrice()">
                                ${options}
                            </select>
                            <input type="hidden" id="editSaleDiscountType" value="percentage">
                        </div>
                        <div style="text-align: right; font-weight: bold; font-size: 1.2em; color: #2c1810;" id="editSaleFinalPriceDisplay">Total: R$ 0,00</div>
                    </div>
                `;
            }
        }
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

                        ${editDiscountHtml}

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

        if (canDiscount) {
            if (isAdmin) {
                document.getElementById('editSaleDiscountType').value = 'fixed';
                document.getElementById('editSaleDiscountInput').value = sale.discount || '';
            } else {
                const applyDiscountCb = document.getElementById('editSaleApplyDiscountCb');
                if (applyDiscountCb) {
                    applyDiscountCb.checked = (sale.discount > 0);
                } else {
                    const discountSelect = document.getElementById('editSaleDiscountInput');
                    if (discountSelect) {
                        let pct = 0;
                        if (sale.discount > 0 && sale.originalPrice > 0) {
                            pct = Math.round((sale.discount / sale.originalPrice) * 100);
                        }
                        discountSelect.value = pct;
                    }
                }
            }
            updateEditSaleFinalPrice();
        }

        document.getElementById('editSaleModal').classList.add('active');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao abrir edição:', error);
    }
}

function updateEditSaleFinalPrice() {
    const discountInput = document.getElementById('editSaleDiscountInput');
    const discountTypeEl = document.getElementById('editSaleDiscountType');
    const applyDiscountCb = document.getElementById('editSaleApplyDiscountCb');

    if (!discountInput || !discountTypeEl) return;

    let discountInputVal = parseFloat(discountInput.value) || 0;
    
    if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
        discountInputVal = 0;
    }
    const discountType = discountTypeEl.value;
    
    let discount = 0;
    if (discountType === 'percentage') {
        discount = currentEditingSaleOriginalPrice * (discountInputVal / 100);
    } else {
        discount = discountInputVal;
    }

    let finalPrice = currentEditingSaleOriginalPrice - discount;
    if (finalPrice < 0) finalPrice = 0;
    document.getElementById('editSaleFinalPriceDisplay').innerHTML = `Total Atualizado: ${formatCurrency(finalPrice)}`;
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
    const applyDiscountCb = document.getElementById('editSaleApplyDiscountCb');
    
    if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
        discountInputVal = 0;
    }
    
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
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    const fixedDiscounts = currentUser ? (Array.isArray(currentUser.discountPercentage) ? currentUser.discountPercentage : [currentUser.discountPercentage || 0]).filter(d => d > 0) : [];

    let inputsHtml = '';
    if (isAdmin) {
        inputsHtml = `
            <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 5px;">
                <select id="groupDiscountType" class="input-field" style="width: 80px; margin-bottom: 0; padding: 8px;" onchange="updateGroupDiscountPreview()">
                    <option value="percentage">%</option>
                    <option value="fixed">R$</option>
                </select>
                <input type="number" id="groupDiscountInput" class="input-field" step="0.01" min="0" placeholder="0" oninput="updateGroupDiscountPreview()" style="margin-bottom: 0; flex: 1;">
            </div>
        `;
    } else {
        if (fixedDiscounts.length === 1) {
            inputsHtml = `
                <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 5px; align-items: center; justify-content: flex-end;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #28a745; font-weight: 600; font-size: 0.95em;">
                        <input type="checkbox" id="groupApplyDiscountCb" style="width: 18px; height: 18px;" onchange="updateGroupDiscountPreview()">
                        Aplicar desconto de ${fixedDiscounts[0]}% no Lote
                    </label>
                    <input type="hidden" id="groupDiscountType" value="percentage">
                    <input type="hidden" id="groupDiscountInput" value="${fixedDiscounts[0]}">
                </div>
            `;
        } else {
            let options = '<option value="0">Sem desconto</option>';
            fixedDiscounts.forEach(d => {
                options += `<option value="${d}">${d}%</option>`;
            });
            inputsHtml = `
                <div style="display: flex; gap: 10px; margin-bottom: 10px; margin-top: 5px; align-items: center; justify-content: flex-end;">
                    <label style="color: #28a745; font-weight: 600; font-size: 0.95em;">Desconto no Lote:</label>
                    <select id="groupDiscountInput" class="input-field" style="width: auto; margin-bottom: 0; padding: 4px;" onchange="updateGroupDiscountPreview()">
                        ${options}
                    </select>
                    <input type="hidden" id="groupDiscountType" value="percentage">
                </div>
            `;
        }
    }

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
                            ${inputsHtml}
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

        document.getElementById('groupDiscountSubtotalDisplay').innerHTML = `Subtotal (sem desconto): ${formatCurrency(subtotal)}`;
        
        if (isAdmin) {
            document.getElementById('groupDiscountType').value = 'fixed';
            document.getElementById('groupDiscountInput').value = currentTotalDiscount > 0 ? currentTotalDiscount.toFixed(2) : '';
        } else {
            const applyDiscountCb = document.getElementById('groupApplyDiscountCb');
            if (applyDiscountCb) applyDiscountCb.checked = (currentTotalDiscount > 0);
        }
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
    document.getElementById('groupDiscountFinalPriceDisplay').innerHTML = `Total Lote: ${formatCurrency(finalPrice)}`;
}

function closeGroupDiscountModal() {
    document.getElementById('groupDiscountModal').classList.remove('active');
}

async function saveGroupDiscount() {
    let discountInputVal = parseFloat(document.getElementById('groupDiscountInput').value) || 0;
    const discountType = document.getElementById('groupDiscountType').value;
    const applyDiscountCb = document.getElementById('groupApplyDiscountCb');
    
    if (applyDiscountCb && applyDiscountCb.type === 'checkbox' && !applyDiscountCb.checked) {
        discountInputVal = 0;
    }
    
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
            await usersRef.parent.update(updates);
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
        if (!confirm(`⚠️ ATENÇÃO: Sua meta (${formatCurrency(goalAmount, true)}) é maior que o lucro máximo possível com seu estoque atual (${formatCurrency(maxCommission, true)}).\n\nDeseja manter essa meta mesmo assim?`)) {
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
            await usersRef.parent.update(updates);
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
        const applyDiscountCb = document.getElementById('saleApplyDiscountCb');
        let discountVal = 0;
        if (selectedProduct) {
            if (applyDiscountCb && !applyDiscountCb.checked) {
                discountInputVal = 0;
            }
            if (discountType === 'percentage') {
                discountVal = selectedProduct.price * (discountInputVal / 100);
            } else {
                discountVal = discountInputVal;
            }
            total = selectedProduct.price - discountVal;
        }
    } else if (prefix === 'checkout') {
        total = getCheckoutFinalPrice();
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
            await usersRef.parent.update(updates);
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

function toggleClientViewMode() {
    const viewMode = localStorage.getItem('clientViewMode') || 'grid';
    localStorage.setItem('clientViewMode', viewMode === 'grid' ? 'list' : 'grid');
    loadClients();
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

        // Injetar botão de visualização
        const searchInput = document.getElementById('clientSearch');
        if (searchInput && !document.getElementById('clientViewModeBtn')) {
            const viewBtn = document.createElement('button');
            viewBtn.id = 'clientViewModeBtn';
            viewBtn.className = 'btn-secondary';
            viewBtn.style.cssText = 'padding: 8px; margin-left: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2em; width: 40px; height: 38px; cursor: pointer;';
            viewBtn.onclick = toggleClientViewMode;
            
            if (searchInput.parentNode) {
                searchInput.parentNode.style.display = 'flex';
                searchInput.style.flex = '1';
                searchInput.style.marginBottom = '0';
                searchInput.parentNode.insertBefore(viewBtn, searchInput.nextSibling);
            }
        }

        const viewMode = localStorage.getItem('clientViewMode') || 'grid';
        const isListMode = viewMode === 'list';

        const viewBtn = document.getElementById('clientViewModeBtn');
        if (viewBtn) {
            viewBtn.innerHTML = isListMode ? '⊞' : '☰';
            viewBtn.title = isListMode ? 'Mudar para Grade' : 'Mudar para Lista';
        }

        container.style.display = isListMode ? 'flex' : 'grid';
        container.style.flexDirection = isListMode ? 'column' : '';
        container.style.gridTemplateColumns = isListMode ? '' : 'repeat(auto-fill, minmax(280px, 1fr))';
        container.style.gap = isListMode ? '10px' : '15px';
        
        container.innerHTML = clients.map(client => {
            let cleanPhone = client.phone ? client.phone.replace(/\D/g, '') : '';
            if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
            const waLink = cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, ${client.name}!`)}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; margin-left: 5px; cursor: pointer;" title="Iniciar conversa no WhatsApp"><svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>` : '';

            return `
            ${isListMode ? `
                <div class="client-item" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border: 1px solid #eee; border-radius: 8px; padding: 12px; background: #fff;">
                    <div style="flex: 2; min-width: 200px;">
                        <div class="client-header" style="margin-bottom: 5px;"><span class="client-name" style="font-weight: bold; font-size: 1.1em; color: #2c1810;">${client.name}</span></div>
                        <div class="client-details" style="display: flex; gap: 15px; font-size: 0.9em; flex-wrap: wrap; color: #555;">
                            <div>${client.phone ? `<span style="display: inline-flex; align-items: center;">📱 ${client.phone} ${waLink}</span>` : '<span style="color: #aaa; font-style: italic;">📱 Sem telefone</span>'}</div>
                            ${client.email ? `<div>📧 ${client.email}</div>` : ''}
                        </div>
                        ${client.notes ? `<div style="font-size: 0.85em; color: #777; font-style: italic; margin-top: 5px;">📝 ${client.notes}</div>` : ''}
                    </div>
                    <div class="client-actions" style="margin-top: 0; border-top: none; padding-top: 0; display: flex; gap: 8px; justify-content: flex-end; flex: 1; min-width: 250px;">
                        <button class="btn-secondary" onclick="viewClientHistory('${client.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #4a90e2; color: white; border: none;">Histórico</button>
                        <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em;">Editar</button>
                        <button class="btn-delete" onclick="deleteClient('${client.id}')" style="margin: 0; padding: 6px 12px; font-size: 0.85em; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                    </div>
                </div>
            ` : `
                <div class="client-item" style="display: flex; flex-direction: column; height: 100%; border: 1px solid #eee; border-radius: 8px; padding: 15px; background: #fff;">
                    <div class="client-header" style="margin-bottom: 10px;">
                        <span class="client-name" style="font-weight: bold; font-size: 1.1em; color: #2c1810;">${client.name}</span>
                    </div>
                    <div class="client-details" style="flex: 1; font-size: 0.9em; color: #555;">
                        ${client.phone ? `<div style="display: flex; align-items: center; margin-bottom: 4px;">📱 ${client.phone} ${waLink}</div>` : '<div style="color: #aaa; font-style: italic; margin-bottom: 4px;">📱 Sem telefone</div>'}
                        ${client.email ? `<div>📧 ${client.email}</div>` : ''}
                        ${client.notes ? `<div style="margin-top: 4px;">📝 ${client.notes}</div>` : ''}
                    </div>
                    <div class="client-actions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                        <button class="btn-secondary" onclick="viewClientHistory('${client.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; background-color: #4a90e2; color: white; border: none;">Histórico</button>
                        <button class="btn-secondary" onclick="openEditClientModal('${client.id}')" style="margin: 0; padding: 6px; font-size: 0.85em;">Editar</button>
                        <button class="btn-delete" onclick="deleteClient('${client.id}')" style="margin: 0; padding: 6px; font-size: 0.85em; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir</button>
                    </div>
                </div>
            `}
        `}).join('');

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
            if (sale.clientId === clientId && !isFinancialSale(sale)) {
                clientSales.push(sale);
            }
        });

        const container = document.getElementById('clientHistoryList');
        
        if (clientSales.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma compra realizada por este cliente.</p>';
        } else {
            const totalValue = clientSales.reduce((sum, sale) => sum + (Number(sale.price) || 0), 0);
            const totalProducts = clientSales.length;
            const uniqueSales = new Set(clientSales.map(s => s.groupId || s.id)).size;

            const summaryHtml = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; border: 1px solid #eee;">
                    <div style="text-align: center; flex: 1; border-right: 1px solid #ddd;">
                        <div style="font-size: 0.85em; color: #666;">Pedidos</div>
                        <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${uniqueSales}</div>
                    </div>
                    <div style="text-align: center; flex: 1; border-right: 1px solid #ddd;">
                        <div style="font-size: 0.85em; color: #666;">Produtos</div>
                        <div style="font-weight: bold; color: #2c1810; font-size: 1.1em;">${totalProducts}</div>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <div style="font-size: 0.85em; color: #666;">Total Gasto</div>
                        <div style="font-weight: bold; color: #28a745; font-size: 1.1em;">${formatCurrency(totalValue)}</div>
                    </div>
                </div>
            `;

            container.innerHTML = summaryHtml + clientSales.reverse().map(sale => `
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

        document.getElementById('simulationCommission').innerHTML = formatCurrency(commission);
        document.getElementById('simulationPercentage').innerHTML = `Equivalente a ${percentage.toFixed(1)}% de comissão média`;
        document.getElementById('simulationResult').style.display = 'block';
        
    } catch (error) {
        console.error('Erro na simulação:', error);
        showNotification('Erro ao calcular', 'error');
    }
}

// ============================================
// RECUPERAÇÃO DE SENHA
// ============================================

function openForgotPasswordModal() {
    if (!document.getElementById('forgotPasswordModal')) {
        const modalHtml = `
            <div id="forgotPasswordModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Recuperar Senha</h3>
                        <button class="close-modal" onclick="closeForgotPasswordModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="color: #666; margin-bottom: 15px; font-size: 0.9em;">
                            Digite o e-mail cadastrado. Enviaremos um link seguro para você criar uma nova senha.
                        </p>
                        <div class="form-group">
                            <label>E-mail</label>
                            <input type="email" id="forgotPasswordEmail" class="input-field" placeholder="exemplo@email.com">
                        </div>
                        <button class="btn-primary" onclick="sendForgotPasswordEmail()" style="width: 100%; margin-top: 15px;">Enviar E-mail</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Puxa o e-mail que ela já estava tentando digitar na tela de login, para facilitar
    const loginEmail = document.getElementById('loginEmail').value;
    document.getElementById('forgotPasswordEmail').value = loginEmail || '';
    document.getElementById('forgotPasswordModal').classList.add('active');
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.classList.remove('active');
}

async function sendForgotPasswordEmail() {
    const email = document.getElementById('forgotPasswordEmail').value.trim();
    if (!email) {
        showNotification('Por favor, digite seu e-mail.', 'error');
        return;
    }

    showLoading();
    try {
        await auth.sendPasswordResetEmail(email);
        hideLoading();
        closeForgotPasswordModal();
        showNotification('E-mail enviado! Verifique sua caixa de entrada ou lixo eletrônico (spam).');
    } catch (error) {
        hideLoading();
        console.error('Erro ao enviar e-mail de recuperação:', error);
        if (error.code === 'auth/user-not-found') {
            showNotification('Não há conta cadastrada com este e-mail.', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showNotification('Formato de e-mail inválido.', 'error');
        } else {
            showNotification('Erro ao enviar e-mail: ' + error.message, 'error');
        }
    }
}

// ============================================
// MENSAGEM DE ANIVERSÁRIO NO DASHBOARD
// ============================================

function renderBirthdayBanner() {
    if (!currentUser || !currentUser.birthDate) return;
    
    let birthdayBanner = document.getElementById('dashboardBirthdayBanner');
    const today = new Date();
    const parts = currentUser.birthDate.split('-');
    
    if (parts.length === 3 && parseInt(parts[1], 10) === today.getMonth() + 1 && parseInt(parts[2], 10) === today.getDate()) {
        if (!birthdayBanner) {
            birthdayBanner = document.createElement('div');
            birthdayBanner.id = 'dashboardBirthdayBanner';
            birthdayBanner.style.cssText = 'background: linear-gradient(135deg, #fdfbf7, #f4e4d7); border: 1px solid #d4a574; color: #2c1810; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 8px rgba(212, 165, 116, 0.2);';
            
            const firstName = currentUser.name ? currentUser.name.split(' ')[0] : '';
            birthdayBanner.innerHTML = `
                <div style="font-size: 2.5em; line-height: 1;">🎂</div>
                <div>
                    <h3 style="margin: 0 0 5px 0; font-family: 'Cormorant Garamond', serif; font-size: 1.4em; color: #2c1810;">Feliz Aniversário, ${firstName}!</h3>
                    <p style="margin: 0; font-size: 0.9em; color: #555;">Desejamos um dia repleto de alegrias e muito sucesso em suas vendas!</p>
                </div>
            `;
            
            const container = document.querySelector('#dashboardTab');
            const grid = container.querySelector('.dashboard-grid');
            if (grid && container) {
                container.insertBefore(birthdayBanner, grid);
            } else if (container) {
                container.prepend(birthdayBanner);
            }
        }
    } else if (birthdayBanner) {
        birthdayBanner.remove();
    }
}

// ============================================
// CONFIGURAÇÃO DO LOGO
// ============================================

async function loadSystemLogo() {
    try {
        const snap = await configRef.child('public/logoUrl').once('value');
        const url = snap.val();
        if (url) applyLogoToAll(url);
    } catch (e) {
        console.error('Erro ao carregar logo:', e);
    }
}

function applyLogoToAll(url) {
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
        if (img.alt.toLowerCase().includes('logo') || img.alt.toLowerCase().includes('brígida') || img.classList.contains('system-logo') || img.src.includes('Z6XQpZzQ')) {
            img.src = url;
            img.classList.add('system-logo');
        }
    });
}

function setupAdminLogoEditor() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
        if (img.alt.toLowerCase().includes('logo') || img.alt.toLowerCase().includes('brígida') || img.classList.contains('system-logo') || img.src.includes('Z6XQpZzQ')) {
            const container = img.parentElement;
            if (container && !container.querySelector('.edit-logo-btn')) {
                if (window.getComputedStyle(container).position === 'static') {
                    container.style.position = 'relative';
                }
                const btn = document.createElement('button');
                btn.className = 'edit-logo-btn';
                btn.innerHTML = '✏️';
                btn.title = 'Alterar Logo';
                btn.style.cssText = 'position: absolute; bottom: -5px; right: -5px; background: #d4a574; color: #fff; border: 2px solid #fff; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10; opacity: 0; transition: opacity 0.2s ease; pointer-events: none;';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openLogoEditorModal();
                };
                container.appendChild(btn);
                
                // Exibir botão apenas ao passar o mouse por cima
                container.addEventListener('mouseenter', () => {
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                });
                container.addEventListener('mouseleave', () => {
                    btn.style.opacity = '0';
                    btn.style.pointerEvents = 'none';
                });
            }
        }
    });
}

function openLogoEditorModal() {
    if (!document.getElementById('editLogoModal')) {
        const modalHtml = `
            <div id="editLogoModal" class="modal-overlay" style="z-index: 3000;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Alterar Logo do Sistema</h3>
                        <button class="close-modal" onclick="document.getElementById('editLogoModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Cole o link direto da imagem (URL) que deseja usar como novo logo. O logo será atualizado em todos os lugares do painel e no catálogo das clientes.</p>
                        <div class="form-group">
                            <label>URL da Imagem</label>
                            <input type="text" id="systemLogoUrlInput" class="input-field" placeholder="https://...">
                        </div>
                        <button class="btn-primary" onclick="saveSystemLogo()" style="width: 100%; margin-top: 15px;">Salvar Logo</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    const logoImg = document.querySelector('img.system-logo') || document.querySelector('img[alt*="Logo"]') || document.querySelector('img[alt*="logo"]');
    document.getElementById('systemLogoUrlInput').value = logoImg ? logoImg.src : '';
    document.getElementById('editLogoModal').classList.add('active');
}

async function saveSystemLogo() {
    const url = document.getElementById('systemLogoUrlInput').value.trim();
    if (!url) {
        showNotification('Insira uma URL válida', 'error');
        return;
    }
    
    showLoading();
    try {
        await configRef.child('public').update({ logoUrl: url });
        applyLogoToAll(url);
        document.getElementById('editLogoModal').classList.remove('active');
        hideLoading();
        showNotification('Logo atualizado com sucesso!');
    } catch (e) {
        hideLoading();
        console.error(e);
        if (e.code === 'PERMISSION_DENIED') {
            showNotification('Permissão negada. Atualize as Regras do Firebase para permitir acesso público ao logo.', 'error');
        } else {
            showNotification('Erro ao salvar logo', 'error');
        }
    }
}

// ============================================
// REGISTRO (MULTI-TENANCY / ABRIR EMPRESA)
// ============================================

function openRegisterCompanyModal() {
    if (!document.getElementById('registerCompanyModal')) {
        const modalHtml = `
            <div id="registerCompanyModal" class="modal-overlay" style="z-index: 4000;">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Criar Conta (Empresa)</h3>
                        <button class="close-modal" onclick="document.getElementById('registerCompanyModal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Crie sua conta como Administrador para gerenciar sua equipe de revendedoras de forma isolada e segura.</p>
                        <div class="form-group">
                            <label>Nome / Nome da Empresa</label>
                            <input type="text" id="regCompanyName" class="input-field" placeholder="Ex: Brígida Semijoias">
                        </div>
                        <div class="form-group">
                            <label>E-mail de Acesso</label>
                            <input type="email" id="regCompanyEmail" class="input-field" placeholder="seu@email.com">
                        </div>
                        <div class="form-group">
                            <label>Senha</label>
                            <input type="password" id="regCompanyPassword" class="input-field" placeholder="Mínimo 6 caracteres">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Senha</label>
                            <input type="password" id="regCompanyConfirmPassword" class="input-field" placeholder="Digite a senha novamente">
                        </div>
                        <button class="btn-primary" onclick="registerNewCompany()" style="width: 100%; margin-top: 15px;">Criar Minha Empresa</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    document.getElementById('regCompanyName').value = '';
    document.getElementById('regCompanyEmail').value = '';
    document.getElementById('regCompanyPassword').value = '';
    if (document.getElementById('regCompanyConfirmPassword')) document.getElementById('regCompanyConfirmPassword').value = '';
    document.getElementById('registerCompanyModal').classList.add('active');
}

async function registerNewCompany() {
    const name = document.getElementById('regCompanyName').value.trim();
    const email = document.getElementById('regCompanyEmail').value.trim();
    const password = document.getElementById('regCompanyPassword').value;
    const confirmPassword = document.getElementById('regCompanyConfirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        showNotification('Preencha todos os campos.', 'error');
        return;
    }
    if (password.length < 6) {
        showNotification('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem.', 'error');
        return;
    }

    showLoading();
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const companyId = generateId();

        // 1. Gravar global_users para o login e roteamento
        await globalUsersRef.child(user.uid).set({
            companyId: companyId,
            role: 'admin',
            companies: {
                [companyId]: {
                    role: 'admin',
                    companyName: name
                }
            }
        });

        // 2. Mudar contexto para a nova empresa e criar dados de admin
        if (typeof setCompanyContext === 'function') setCompanyContext(companyId);
        
        await configRef.child('public').update({ companyName: name });
        
        await usersRef.child(user.uid).set({
            name: name,
            email: email,
            role: 'admin',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        document.getElementById('registerCompanyModal').classList.remove('active');
        hideLoading();
        showNotification('Conta criada com sucesso! Bem-vindo(a).');
    } catch (error) {
        hideLoading();
        console.error('Erro ao criar conta:', error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Este e-mail já está cadastrado no sistema.', 'error');
        } else {
            showNotification('Erro ao criar conta: ' + error.message, 'error');
        }
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadSystemLogo();
    
    // Injetar estilos para botões de fechar modal (maiores e vermelhos)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Menu Responsivo da Revendedora */
        .nav-bar {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 5px;
            padding-bottom: 5px;
        }
        .nav-btn {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            padding: 8px 5px !important;
            font-size: 0.9em !important;
            word-break: break-word !important;
            white-space: normal !important;
        }
        
        /* Menu Lateral Suspenso (Mobile) */
        .mobile-more-btn {
            display: none;
            background: none;
            color: var(--primary-light);
            border: none;
            border-radius: 4px;
            font-size: 2.0em;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto !important;
            margin-right: 20px;
            padding: 1px 5px !important;
        }
        
        .side-menu-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }
        
        .side-menu-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .side-menu {
            position: fixed;
            top: 0; right: -260px;
            width: 250px; height: 100%;
            background: var(--background);
            box-shadow: -2px 0 10px rgba(0,0,0,0.2);
            z-index: 9999;
            transition: right 0.3s;
            display: flex;
            flex-direction: column;
            padding-top: 20px;
        }
        
        .side-menu.active {
            right: 0;
        }
        
        .side-menu .close-btn {
            align-self: flex-end;
            background: none;
            border: none;
            font-size: 2em;
            cursor: pointer;
            margin-right: 15px;
            margin-bottom: 20px;
            color: #666;
            line-height: 1;
        }

        @media (max-width: 800px) {
            .mobile-hidden-tab {
                display: none !important;
            }
            .mobile-more-btn {
                display: flex !important;
            }
            .side-menu .mobile-hidden-tab {
                display: flex !important;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
                padding: 15px 20px !important;
                background: none !important;
                color: #333 !important;
                border: none !important;
                border-bottom: 1px solid #eee !important;
                width: 100%;
                border-radius: 0 !important;
                font-size: 1.1em !important;
            }
            .side-menu .mobile-hidden-tab span {
                display: inline-block !important;
                margin-bottom: 0 !important;
            }
            .side-menu .mobile-hidden-tab span:first-child {
                margin-right: 15px;
                font-size: 1.2em;
            }
            .side-menu .mobile-hidden-tab.active {
                background: #f8f9fa !important;
                border-left: 4px solid #2c1810 !important;
                font-weight: bold;
                color: #2c1810 !important;
            }
        }

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
        
        /* Estilos do Toggle Switch */
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; margin: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle-switch input:checked + .toggle-slider { background-color: #28a745; }
        .toggle-switch input:focus + .toggle-slider { box-shadow: 0 0 1px #28a745; }
        .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }
        
        /* Animação dos Diamantes Ocultos */
        @keyframes diamondSparkle {
            0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px rgba(212, 165, 116, 0.4)); }
            50% { opacity: 0.6; transform: scale(1.1); filter: drop-shadow(0 0 6px rgba(212, 165, 116, 0.9)); }
        }
        .hidden-diamond-icon {
            animation: diamondSparkle 1.5s infinite ease-in-out;
        }
        
        /* Barra de ações em formato de tags (wrap) para lista */
        .reseller-actions-wrap {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
            padding-bottom: 4px;
        }
    `;
    document.head.appendChild(style);

    // Permitir colar imagens nos editores de texto (conversão para Base64)
    document.addEventListener('paste', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('rich-text-content')) {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
                    e.preventDefault(); // Evita a colagem padrão se for arquivo
                    const blob = item.getAsFile();
                    
                    // Limite de segurança de 2MB para evitar sobrecarga no Realtime Database
                    if (blob.size > 2 * 1024 * 1024) {
                        if (typeof showNotification === 'function') {
                            showNotification('A imagem é muito grande (máx: 2MB). Reduza o tamanho ou insira a imagem por URL (botão "Imagem").', 'error');
                        } else {
                            alert('A imagem é muito grande. O tamanho máximo recomendado é 2MB.');
                        }
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imgHtml = `<img src="${event.target.result}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block;">`;
                        
                        // Insere a imagem onde o cursor de texto estiver posicionado
                        if (!document.execCommand('insertHTML', false, imgHtml)) {
                            // Fallback caso algum navegador bloqueie o execCommand
                            e.target.innerHTML += imgHtml;
                        }
                    };
                    reader.readAsDataURL(blob);
                    break; // Adiciona a primeira imagem encontrada na área de transferência e encerra o loop
                }
            }
        }
    });

    setupMobileMenu();

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

    // Abrir imagens da campanha em tela cheia ao clicar
    window.addEventListener('click', function(event) {
        if (event.target.tagName === 'IMG' && (event.target.closest('.action-rich-text') || event.target.closest('.rich-text-content'))) {
            viewImageFullscreen(event.target.src);
        }
    });

    // Injetar botão "Esqueci minha senha" na tela de login dinamicamente
    const loginPasswordInput = document.getElementById('loginPassword');
    if (loginPasswordInput && loginPasswordInput.parentNode) {
        const oldBtns = loginPasswordInput.parentNode.querySelectorAll('.login-helpers');
        oldBtns.forEach(btn => btn.remove());

        const forgotBtnContainer = document.createElement('div');
        forgotBtnContainer.className = 'login-helpers';
        forgotBtnContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: -10px; margin-bottom: 15px;';
        forgotBtnContainer.innerHTML = `
            <button type="button" onclick="openRegisterCompanyModal()" style="background: none; border: none; color: #d4a574; font-size: 0.9em; font-weight: bold; text-decoration: underline; cursor: pointer; padding: 0;">Abrir Minha Empresa</button>
            <button type="button" onclick="openForgotPasswordModal()" style="background: none; border: none; color: #666; font-size: 0.9em; text-decoration: underline; cursor: pointer; padding: 0;">Esqueci a senha?</button>
        `;
        loginPasswordInput.parentNode.insertBefore(forgotBtnContainer, loginPasswordInput.nextSibling);
    }

    // Event listeners
    document.getElementById('loginEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
});
