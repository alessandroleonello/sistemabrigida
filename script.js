        // Importações do Firebase
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import {
            getAuth,
            onAuthStateChanged,
            createUserWithEmailAndPassword,
            signInWithEmailAndPassword,
            signOut,
            signInAnonymously,
            signInWithCustomToken
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import {
            getFirestore,
            doc,
            setDoc,
            getDoc,
            collection,
            addDoc,
            query,
            where,
            onSnapshot,
            deleteDoc,
            updateDoc,
            serverTimestamp,
            writeBatch,
            getDocs,
            increment,
            Timestamp
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";



        // --- INICIALIZAÇÃO E AUTENTICAÇÃO ---
        let app, auth, db;
        let userId = null; // ID do usuário logado

        // Configuração do Firebase (para uso local/pessoal)
        // Como você não vai publicar, pode colocar os dados aqui.
        const firebaseConfig = {
         apiKey: "AIzaSyAyr32EibUO6RE4yp5ezEaRW1xtLq3UquI",
  authDomain: "brigida-semijoias.firebaseapp.com",
  databaseURL: "https://brigida-semijoias-default-rtdb.firebaseio.com",
  projectId: "brigida-semijoias",
  storageBucket: "brigida-semijoias.firebasestorage.app",
  messagingSenderId: "350076180515",
  appId: "1:350076180515:web:7b970020eaaf9eeaf43996"
        };

        // Pega o appId da configuração para usar nos caminhos do banco de dados
        const appId = firebaseConfig.appId;

        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            console.log("Firebase inicializado com sucesso.");

            // A autenticação agora será tratada pelo onAuthStateChanged
            // e pelos formulários de login/registro.

        } catch (error) {
            console.error("Erro ao inicializar o Firebase:", error);
            document.body.innerHTML = "<h1>Erro ao conectar ao sistema. Verifique o console.</h1>";

        }

        // Elementos da UI
        const pageAuth = document.getElementById('page-auth');
        const pageMainApp = document.getElementById('page-main-app');
        const userInfo = document.getElementById('user-info');
        const authError = document.getElementById('auth-error');

        // Monitorar estado de autenticação (Login/Logout real)
        onAuthStateChanged(auth, (user) => {
            if (user && !user.isAnonymous) {
                // Usuário está logado (com email/senha)
                userId = user.uid;
                pageAuth.style.display = 'none';
                pageMainApp.style.display = 'block';
                userInfo.textContent = `Logado como: ${user.email}`;
                showPage('page-dashboard'); // Vai para o dashboard após login


                // Inicia os listeners para carregar dados em tempo real
                startDataListeners();

            } else {
                // Usuário está deslogado ou anônimo
                userId = auth.currentUser?.uid; // Mantém o ID anônimo se houver
                pageAuth.style.display = 'flex';
                pageMainApp.style.display = 'none';
                userInfo.textContent = 'Não logado';
                // Para todos os listeners em tempo real para evitar vazamento de dados
                stopAllListeners();
                currentSaleItems = [];

                // Limpa as tabelas da UI de forma segura
                ['product-list-table', 'people-list-table', 'low-stock-list', 'history-list-table', 'consign-list-table', 'finance-history-table', 'maletas-list-table'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerHTML = '';
                });
                
                // (Adicione aqui a limpeza de outras tabelas no futuro)
                const billsTable = document.getElementById('bills-list-table');
                if (billsTable) billsTable.innerHTML = '';
                const paidBillsTable = document.getElementById('bills-paid-table');
                if (paidBillsTable) paidBillsTable.innerHTML = '';
                if (cashFlowChart) {
                    cashFlowChart.destroy();
                    cashFlowChart = null;
                }
                const saleClientSelect = document.getElementById('sale-client');
                if (saleClientSelect) {
                    saleClientSelect.innerHTML = '<option value="Consumidor Final">Consumidor Final</option>';
                }
            }
        });

        // --- LÓGICA DE CARREGAMENTO DE DADOS (FIRESTORE) ---

        // Array para guardar todas as nossas "escutas" (listeners) do Firestore
        let activeListeners = [];
        let allUserProducts = []; // Cache global de produtos
        let currentSaleItems = []; // "Carrinho" da venda atual
        let allUserPeople = []; // Cache global de pessoas
        let allMaletas = []; // Cache global de Maletas
        let currentMaletaItems = []; // Items da maleta sendo criada/editada
        let currentMaletaAverages = {}; // Armazena a média atual de cada categoria
        let personCadastroRedirect = 'page-vendas'; // NOVO: Para onde voltar após salvar pessoa
        let selectedLabelsState = {}; // Armazena os produtos e quantidades selecionados para etiquetas


        /**
  * Inicia todos os listeners de dados do usuário
  */
        function startDataListeners() {
            if (!userId) return;

            stopAllListeners();
            console.log(`Iniciando listeners para o usuário: ${userId}`);

            // Assegura que Produtos e Pessoas carregam primeiro
            loadProducts();
            loadPeople();
            loadCategories(); // Categories também é essencial para renderização
            loadPlanosContas(); // Carrega os planos de contas do financeiro
            loadMaletas(); // Carrega a lista de maletas configuradas

            // --- CARREGAMENTO DO DASHBOARD EM BACKGROUND (MELHORIA) ---
            // Cria promessas para os listeners que alimentam o Dashboard
            const salesPromise = new Promise(resolve => { loadSalesHistory(resolve); });
            const financialPromise = new Promise(resolve => { loadFinancialHistory(resolve); });

            // Espera que AMBOS Vendas e Financeiro tenham carregado pelo menos uma vez
            Promise.all([salesPromise, financialPromise]).then(() => {
                console.log("CARREGAMENTO DASHBOARD FINALIZADO. Atualizando UI.");
                updateDashboard();
            });
        }
        /**
         * Para (unsubscribe) todos os listeners ativos do Firestore.
         * Isso é CRUCIAL ao fazer logout.
         */
        function stopAllListeners() {
            console.log(`Parando ${activeListeners.length} listeners ativos`);
            activeListeners.forEach(unsubscribe => unsubscribe());
            activeListeners = [];
        }

        function loadProducts() {
            // Caminho seguro para os dados do usuário
            const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;
            const q = query(collection(db, collectionPath));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log(`Produtos recebidos: ${snapshot.size} docs`);
                const products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });

                products.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

                allUserProducts = products; // 1. Salva na cache global

                // 2. APLICA OS FILTROS ATUAIS (Texto e Data)
                // Em vez de chamar filterProducts, chamamos a nova função unificada
                applyProductViewFilters();

                // 3. Renderiza as listas de Estoque Baixo e Etiquetas (elas não precisam do filtro)
                renderLowStockList(allUserProducts); // Widget do Dashboard
                renderLabelList(allUserProducts);    // Lista de Etiquetas (inicial, sem filtro)
                updateSaleItemDatalist();            // Atualiza datalist de nova venda
                renderMaletasList();                 // Atualiza a tabela de maletas com o estoque real
                // 4. Atualiza os contadores do dashboard
                updateDashboard();
                updateEstoqueSummary();

            }, (error) => {
                console.error("Erro ao carregar produtos: ", error);
                showModal("Erro de Dados", "Não foi possível carregar seus produtos.");
            });

            activeListeners.push(unsubscribe);
        }
        /**
 * 1. Atualiza a TABELA PRINCIPAL de produtos (em "Visualizar Produtos")
 */
        function renderProductList(products) {
            const productTableBody = document.getElementById('product-list-table');
            if (!productTableBody) return; // Segurança

            productTableBody.innerHTML = '';

            if (products.length === 0) {
                productTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhum produto encontrado com esse filtro.</td></tr>';
                return;
            }
            
            // Calcula a demanda total de cada produto em TODAS as maletas
            const globalDemand = {};
            allMaletas.forEach(m => {
                m.items.forEach(i => {
                    globalDemand[i.id] = (globalDemand[i.id] || 0) + i.quantity;
                });
            });


            products.forEach(prod => {
                const tr = document.createElement('tr');
                tr.dataset.id = prod.id;
                
                const imgSrc = prod.fotoUrl ? prod.fotoUrl : 'https://placehold.co/40x40/e2e8f0/adb5bd?text=Sem+Foto';
                const previewSrc = prod.fotoUrl ? prod.fotoUrl : 'https://placehold.co/200x200/e2e8f0/adb5bd?text=Sem+Foto';

                const activeConsignments = getConsignments(prod.id);
                let consignmentsHtml = '';
                if (activeConsignments.length > 0) {
                    consignmentsHtml = '<div class="mt-1.5 flex flex-wrap gap-1">';
                   
                    activeConsignments.forEach(c => { // MODIFICADO: Adicionado <a> e data-attribute
                        consignmentsHtml += `<a href="#" class="consignment-tag-filter text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-max hover:bg-purple-100 hover:border-purple-300" data-client-name="${c.clientId}" title="Filtrar por ${c.clientId} (${c.quantity} un.)"><i data-lucide="package-minus" class="w-3 h-3 pointer-events-none"></i> ${c.clientId} (${c.quantity}x)</a>`;
                    }); // FIM DA MODIFICAÇÃO
                    consignmentsHtml += '</div>';
                }

                let categoryHtml = '';
                const catStr = prod.categoria || 'Sem Categoria';
                if (catStr === 'Sem Categoria') {
                    categoryHtml = '<span class="text-gray-400 text-sm">Sem Categoria</span>';
                } else {
                    const parts = catStr.split(' > ');
                    categoryHtml = '<div class="flex items-center flex-wrap gap-1">';
                    let accumulatedPath = '';
                    parts.forEach((part, idx) => {
                        accumulatedPath = accumulatedPath ? `${accumulatedPath} > ${part}` : part;
                        const isLast = idx === parts.length - 1;
                        
                        const baseClasses = isLast 
                            ? "px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md whitespace-nowrap cursor-pointer hover:bg-indigo-100 transition-colors category-tag-filter"
                            : "text-xs text-gray-500 whitespace-nowrap cursor-pointer hover:text-indigo-600 hover:underline transition-colors category-tag-filter";
                        
                        categoryHtml += `<span class="${baseClasses}" data-category-path="${accumulatedPath}" title="Filtrar por ${accumulatedPath}">${part}</span>`;
                        
                        if (!isLast) {
                            categoryHtml += `<i data-lucide="chevron-right" class="w-3 h-3 text-gray-400 shrink-0"></i>`;
                        }
                    });
                    categoryHtml += '</div>';
                }

                tr.innerHTML = `
            <td class="px-6 py-4"><input type="checkbox" class="rounded product-checkbox" data-id="${prod.id}"></td>
            <td class="px-6 py-4 min-w-[250px] break-words"> 
                <div class="flex items-center space-x-3">
                    <div class="relative group shrink-0">
                        <img src="${imgSrc}" alt="Foto" class="w-10 h-10 rounded-md object-cover border border-gray-200 cursor-pointer" onerror="this.src='https://placehold.co/40x40/e2e8f0/adb5bd?text=Erro'">
                        <div class="absolute z-[100] left-12 top-1/2 -translate-y-1/2 hidden group-hover:block bg-white p-1 border border-gray-200 rounded-lg shadow-xl pointer-events-none w-48 h-48">
                            <img src="${previewSrc}" alt="Preview" class="w-full h-full object-cover rounded-md" onerror="this.src='https://placehold.co/200x200/e2e8f0/adb5bd?text=Erro'">
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium truncate" title="${prod.nome}">${prod.nome}</div>
                        <div class="text-sm text-gray-500">${prod.ref}${prod.ref2 ? ' / ' + prod.ref2 : ''}</div>
                        ${consignmentsHtml}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">${categoryHtml}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium ${prod.estoque <= 0 ? 'text-red-800 bg-red-100' : (prod.estoque <= 5 ? 'text-yellow-800 bg-yellow-100' : 'text-green-800 bg-green-100')} rounded-full">
                    ${prod.estoque} un.
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">R$ ${prod.venda.toFixed(2).replace('.', ',')}</td>
            <td class="sticky right-0 px-6 py-4 whitespace-nowrap text-sm font-medium bg-white bg-opacity-95 shadow-sm">
                <div class="flex items-center space-x-2">
                    <button class="btn-edit-product text-indigo-600 hover:text-indigo-900" data-id="${prod.id}"><i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i></button>
                    <button class="btn-delete-product text-red-600 hover:text-red-900" data-id="${prod.id}"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
                </div>
            </td>
        `;
                productTableBody.appendChild(tr);
            });

            lucide.createIcons();
            updateProductSelectionCounter();
        }

        function updateProductSelectionCounter() {
            const totalFiltered = document.querySelectorAll('#product-list-table input.product-checkbox').length;
            const selectedCount = document.querySelectorAll('#product-list-table input.product-checkbox:checked').length;
            const counterEl = document.getElementById('product-filter-counter');
            if (counterEl) {
                if (selectedCount > 0) {
                    counterEl.innerHTML = `<span class="font-bold text-indigo-600">${selectedCount}</span> / <span class="font-bold text-gray-800">${totalFiltered}</span> produtos selecionados`;
                } else {
                    counterEl.innerHTML = `<span class="font-bold text-gray-800">${totalFiltered}</span> produtos filtrados`;
                }
            }
            
            const selectAllCheckbox = document.getElementById('select-all-products');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = (totalFiltered > 0 && totalFiltered === selectedCount);
            }
        }

        /**
         * Atualiza os cards da aba de Resumo de Estoque (Página Produtos)
         */
        function updateEstoqueSummary() {
            let fisicoQty = 0;
            let fisicoCost = 0;
            let fisicoSale = 0;

            let ruaQty = 0;
            let ruaCost = 0;
            let ruaSale = 0;

            let categoryCounts = {};
            const initCat = (cat) => {
                if (!categoryCounts[cat]) categoryCounts[cat] = { fisico: 0, rua: 0, total: 0 };
            };

            const getCategoryPaths = (catPath) => {
                if (!catPath || catPath === 'Sem Categoria') return ['Sem Categoria'];
                const parts = catPath.split(' > ');
                const paths = [];
                let current = '';
                for (const part of parts) {
                    current = current ? `${current} > ${part}` : part;
                    paths.push(current);
                }

                return paths;
            };

            // 1. Calcula o Estoque Físico
            allUserProducts.forEach(prod => {
                const qty = prod.estoque || 0;
                fisicoQty += qty;
                fisicoCost += (prod.custo || 0) * qty;
                fisicoSale += (prod.venda || 0) * qty;
                
                const cat = prod.categoria || 'Sem Categoria';
                const catPaths = getCategoryPaths(cat);
                catPaths.forEach(path => {
                    initCat(path);
                    categoryCounts[path].fisico += qty;
                    categoryCounts[path].total += qty;
                });
            });

            // 2. Calcula as Peças nas Ruas (Consignações Ativas)
            allSales.forEach(sale => {
                if (sale.type === 'consignacao' && sale.status === 'Ativa' && sale.items) {
                    sale.items.forEach(item => {
                        const qty = item.quantity || 1;
                        ruaQty += qty;
                        
                        // Tenta pegar o custo/venda do item salvo na venda, ou busca no produto atual
                        let custo = item.custo;
                        let venda = item.venda;
                        
                        if (custo === undefined || venda === undefined) {
                            const prod = allUserProducts.find(p => p.id === item.id);
                            if (prod) {
                                if (custo === undefined) custo = prod.custo || 0;
                                if (venda === undefined) venda = prod.venda || 0;
                            } else {
                                if (custo === undefined) custo = 0;
                                if (venda === undefined) venda = 0;
                            }
                        }
                        
                        let cat = item.categoria;
                        if (!cat) {
                            const prod = allUserProducts.find(p => p.id === item.id);
                            cat = prod ? (prod.categoria || 'Sem Categoria') : 'Sem Categoria';
                        }
                        const catPaths = getCategoryPaths(cat);
                        catPaths.forEach(path => {
                            initCat(path);
                            categoryCounts[path].rua += qty;
                            categoryCounts[path].total += qty;
                        });
                        
                        ruaCost += (custo || 0) * qty;
                        ruaSale += (venda || 0) * qty;
                    });
                }
            });

            // 3. Calcula o Total Geral
            const totalQty = fisicoQty + ruaQty;
            const totalCost = fisicoCost + ruaCost;
            const totalSale = fisicoSale + ruaSale;

            // 4. Atualiza a UI
            const formatCurrency = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;

            // Físico
            const elFisicoQty = document.getElementById('estoque-fisico-qty');
            const elFisicoCost = document.getElementById('estoque-fisico-cost');
            const elFisicoSale = document.getElementById('estoque-fisico-sale');
            if(elFisicoQty) elFisicoQty.textContent = `${fisicoQty} un.`;
            if(elFisicoCost) elFisicoCost.textContent = formatCurrency(fisicoCost);
            if(elFisicoSale) elFisicoSale.textContent = formatCurrency(fisicoSale);

            // Rua
            const elRuaQty = document.getElementById('estoque-rua-qty');
            const elRuaCost = document.getElementById('estoque-rua-cost');
            const elRuaSale = document.getElementById('estoque-rua-sale');
            if(elRuaQty) elRuaQty.textContent = `${ruaQty} un.`;
            if(elRuaCost) elRuaCost.textContent = formatCurrency(ruaCost);
            if(elRuaSale) elRuaSale.textContent = formatCurrency(ruaSale);

            // Total
            const elTotalQty = document.getElementById('estoque-total-qty');
            const elTotalCost = document.getElementById('estoque-total-cost');
            const elTotalSale = document.getElementById('estoque-total-sale');
            if(elTotalQty) elTotalQty.textContent = `${totalQty} un.`;
            if(elTotalCost) elTotalCost.textContent = formatCurrency(totalCost);
            if(elTotalSale) elTotalSale.textContent = formatCurrency(totalSale);

            // 5. Atualiza a UI das categorias
            const catContainer = document.getElementById('estoque-categorias-list');
            if (catContainer) {
                catContainer.innerHTML = '';
                
                // Agrupar categorias por raiz
                const rootCategories = {};
                
                Object.keys(categoryCounts).forEach(cat => {
                    if (categoryCounts[cat].total === 0) return;
                    
                    const parts = cat.split(' > ');
                    const root = parts[0];
                    
                    if (!rootCategories[root]) {
                        rootCategories[root] = [];
                    }
                    rootCategories[root].push(cat);
                });

                Object.keys(rootCategories).sort().forEach(root => {
                    const paths = rootCategories[root].sort();
                    const rootData = categoryCounts[root];
                    
                    if (!rootData) return;

                    const div = document.createElement('div');
                    div.className = 'bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col shadow-sm';
                    
                    let html = `
                        <div class="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                            <h4 class="font-bold text-indigo-700 uppercase tracking-wider text-sm truncate" title="${root}">${root}</h4>
                            <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full" title="Total">${rootData.total} un.</span>
                        </div>
                        
                        <div class="space-y-2 mb-3">
                            <div class="flex justify-between items-center text-xs">
                                <span class="text-gray-500 flex items-center"><i data-lucide="package" class="w-3 h-3 mr-1 text-blue-500"></i> Físico:</span>
                                <span class="font-bold text-gray-700">${rootData.fisico}</span>
                            </div>
                            <div class="flex justify-between items-center text-xs">
                                <span class="text-gray-500 flex items-center"><i data-lucide="truck" class="w-3 h-3 mr-1 text-purple-500"></i> Na Rua:</span>
                                <span class="font-bold text-gray-700">${rootData.rua}</span>
                            </div>
                        </div>
                    `;

                    // Se tiver subcategorias
                    if (paths.length > 1) {
                        html += `<div class="mt-2 pt-2 border-t border-gray-100">
                                    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Subcategorias</p>
                                    <ul class="space-y-1.5">`;
                        
                        paths.forEach(path => {
                            if (path === root) return; // Pula a raiz
                            
                            const data = categoryCounts[path];
                            const parts = path.split(' > ');
                            const depth = parts.length - 1;
                            const subName = parts[parts.length - 1];
                            const indent = depth > 1 ? `${(depth - 1) * 12}px` : '0px';
                            const isDeep = depth > 1;
                            
                            html += `
                                <li class="flex justify-between items-center text-xs" style="padding-left: ${indent};">
                                    <span class="text-gray-600 truncate pr-2 ${isDeep ? 'text-[11px]' : 'font-medium'}" title="${path}">
                                        ${isDeep ? '<span class="text-gray-300 mr-1 inline-block">↳</span>' : ''}${subName}
                                    </span>
                                    <span class="text-gray-500 font-semibold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap cursor-help" title="Físico: ${data.fisico} | Na Rua: ${data.rua}">
                                        ${data.total}
                                    </span>
                                </li>
                            `;
                        });
                        
                        html += `</ul></div>`;
                    }
                    
                    div.innerHTML = html;
                    catContainer.appendChild(div);
                });
                lucide.createIcons();
            }
        }

        /**
         * Atualiza todo o painel de Extrato Analítico (Filtros, Cards e Tabela)
         */

        /**
 * 2. Atualiza a lista de ESTOQUE BAIXO no Dashboard (COM LIMITE DE EXIBIÇÃO)
 */
        function renderLowStockList(allProducts) {
            const lowStockList = document.getElementById('low-stock-list');
            if (!lowStockList) return;

            lowStockList.innerHTML = ''; // Limpa a lista antiga

            // 1. Filtra todos os produtos com estoque baixo primeiro
            const lowStockProducts = allProducts.filter(prod => prod.estoque <= 5);

            // 2. Ordena a lista para mostrar os mais críticos (menor estoque) primeiro
            lowStockProducts.sort((a, b) => a.estoque - b.estoque);

            const lowStockCount = lowStockProducts.length;
            const MAX_ITEMS_TO_SHOW = 5; // Define um limite de quantos itens mostrar (ex: 5)

            // 3. Verifica se a lista está vazia
            if (lowStockCount === 0) {
                if (allProducts.length > 0) {
                    lowStockList.innerHTML = '<li class="text-gray-500 text-sm">Nenhum item com estoque baixo.</li>';
                } else {
                    lowStockList.innerHTML = '<li class="text-gray-500 text-sm">Nenhum produto cadastrado.</li>';
                }
                return; // Sai da função
            }

            // 4. Faz um loop apenas até o limite (MAX_ITEMS_TO_SHOW)
            for (let i = 0; i < lowStockCount && i < MAX_ITEMS_TO_SHOW; i++) {
                const prod = lowStockProducts[i];
                const li = document.createElement('li');
                li.className = 'flex justify-between';

                // Adiciona 'truncate' para evitar que nomes longos quebrem o layout
                li.innerHTML = `
            <span class="truncate pr-2" title="${prod.nome}">${prod.nome}</span> 
            <span class="font-medium whitespace-nowrap ${prod.estoque === 0 ? 'text-red-600' : 'text-yellow-600'}">
                ${prod.estoque} un.
            </span>
        `;
                lowStockList.appendChild(li);
            }

            // 5. Se houver mais itens do que o limite, mostra uma mensagem "e mais X"
            if (lowStockCount > MAX_ITEMS_TO_SHOW) {
                const remaining = lowStockCount - MAX_ITEMS_TO_SHOW;
                const li = document.createElement('li');
                li.className = 'text-sm text-gray-500 italic mt-2';
                li.textContent = `...e mais ${remaining} item(ns).`;
                lowStockList.appendChild(li);
            }
        }
        /**
         * 3. Atualiza a lista de SELEÇÃO DE PRODUTOS na aba "Gerar Etiquetas"
         */
        function renderLabelList(productsToRender) {
            const labelProductList = document.getElementById('label-product-list'); // Renomeado para 'label-product-list'
            if (!labelProductList) return;

            labelProductList.innerHTML = '';

            if (productsToRender.length === 0) {
                labelProductList.innerHTML = '<div class="text-gray-500 text-sm p-1">Nenhum produto encontrado com esse filtro.</div>';
                return;
            }

            productsToRender.forEach(prod => {
                // Verifica no estado se este produto está selecionado
                const isSelected = selectedLabelsState.hasOwnProperty(prod.id);
                // Se não estiver selecionado, usa o estoque (mínimo 1 para evitar campos zerados na geração)
                const defaultQty = Math.max(1, prod.estoque || 0);
                const savedQty = isSelected ? selectedLabelsState[prod.id] : defaultQty;

                const labelItem = document.createElement('div');
                labelItem.className = 'flex items-center justify-between space-x-2 p-1 hover:bg-gray-50 rounded-md';
                labelItem.innerHTML = `
            <label class="flex items-center space-x-2 cursor-pointer flex-grow overflow-hidden">
                <input 
                    type="checkbox" 
                    class="rounded label-product-checkbox" 
                    data-id="${prod.id}"
                    ${isSelected ? 'checked' : ''}
                >
                <span class="text-sm truncate" title="${prod.ref} - ${prod.nome} (Estoque: ${prod.estoque || 0})">
                    ${prod.ref} - ${prod.nome} <span class="text-gray-500 font-medium ml-1">(${prod.estoque || 0} no estoque)</span>
                </span>
            </label>
            <input 
                type="number" 
                value="${savedQty}" 
                min="1" 
                class="label-product-qty w-16 px-2 py-1 text-sm border rounded-md ${isSelected ? '' : 'bg-gray-100'}" 
                data-id="${prod.id}" 
                data-estoque="${defaultQty}"
                ${isSelected ? '' : 'disabled'}
            >
        `;
                labelProductList.appendChild(labelItem);
            });
        }

        /**
         * Atualiza o datalist de produtos na tela de Nova Venda e modais
         */
        function updateSaleItemDatalist() {
            const datalist = document.getElementById('sale-item-datalist');
            if (!datalist) return;
            datalist.innerHTML = '';
            allUserProducts.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.ref;
                option.textContent = prod.nome;
                datalist.appendChild(option);
            });
        }
        /**
         * Filtra a lista global de produtos (allUserProducts) com base em um termo.
         */
        function filterProducts(searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            if (!term) {
                return allUserProducts; // Retorna tudo se o filtro estiver vazio
            }

            return allUserProducts.filter(prod => {
                // Verifica se o termo existe no nome, ref ou categoria
                return (
                    (prod.nome && prod.nome.toLowerCase().includes(term)) ||
                    (prod.ref && prod.ref.toLowerCase().includes(term)) ||
                    (prod.ref2 && prod.ref2.toLowerCase().includes(term)) ||
                    (prod.categoria && prod.categoria.toLowerCase().includes(term))
                );
            });
        }

        /**
 * Cria o listener (onSnapshot) para a coleção de PESSOAS
 */
        function loadPeople() {
            const collectionPath = `artifacts/${appId}/users/${userId}/pessoas`;
            const q = query(collection(db, collectionPath));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log(`Pessoas recebidas: ${snapshot.size} docs`);
                const people = [];
                snapshot.forEach(doc => {
                    people.push({ id: doc.id, ...doc.data() });
                });
                people.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

                allUserPeople = people; // Salva na cache global

                // Aplica o filtro de busca atual (para a tabela principal)
                const currentSearchTerm = document.getElementById('people-search-input')?.value || '';
                const filteredPeople = filterPeople(currentSearchTerm);

                // --- ATUALIZAÇÃO: Chamar as TRÊS funções ---
                renderPeopleList(filteredPeople);       // 1. Tabela da pág. Pessoas
                renderPeopleDropdown(allUserPeople);    // 2. Dropdown da pág. Vendas
                renderSupplierDropdown(allUserPeople);  // 3. (NOVO) Dropdown da pág. Produtos

            }, (error) => {
                console.error("Erro ao carregar pessoas: ", error);
                showModal("Erro de Dados", "Não foi possível carregar sua lista de pessoas.");
            });

            activeListeners.push(unsubscribe);
        }
        /**
         * Helper: Encontra todas as consignações ativas para um determinado produto.
         * @param {string} productId - O ID do produto a ser procurado.
         * @returns {Array} - Um array de objetos, cada um representando uma consignação.
         */
        function getConsignments(productId) {
            if (!productId || !allSales || allSales.length === 0) {
                return [];
            }

            const consignments = [];
            // Itera sobre a cache global de vendas/consignações
            allSales.forEach(sale => {
                // Filtra apenas consignações ativas que têm itens
                if (sale.type === 'consignacao' && sale.status === 'Ativa' && sale.items) {
                    // Procura o produto dentro dos itens da consignação
                    const foundItem = sale.items.find(item => item.id === productId);
                    if (foundItem) {
                        // Se encontrou, adiciona à lista de retorno
                        consignments.push({ saleId: sale.id, clientId: sale.clientId, quantity: foundItem.quantity || 1 });
                    }
                }
            });
            return consignments;
        }
        /**
         * Atualiza a tabela de pessoas
         */
        function renderPeopleList(people) {
            const peopleTableBody = document.getElementById('people-list-table');
            peopleTableBody.innerHTML = '';

            // Remove o item de exemplo da tabela
            const exampleRow = peopleTableBody.querySelector('tr');
            if (exampleRow) exampleRow.remove();

            if (people.length === 0) {
                peopleTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma pessoa cadastrada ainda.</td></tr>';
                return;
            }

            const typeBadges = {
                'cliente': 'text-blue-800 bg-blue-100',
                'revendedor': 'text-purple-800 bg-purple-100',
                'fornecedor': 'text-gray-800 bg-gray-100'
            };
            const typeNames = {
                'cliente': 'Cliente Direto',
                'revendedor': 'Revendedor',
                'fornecedor': 'Fornecedor'
            };

            people.forEach(person => {
                const tr = document.createElement('tr');
                tr.dataset.id = person.id;
                tr.innerHTML = `
            <td class="px-6 py-4"><input type="checkbox" class="rounded person-checkbox" data-id="${person.id}"></td>
            <td class="px-6 py-4 whitespace-nowrap">${person.nome}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm">${person.email}</div>
                <div class="text-sm text-gray-500">${person.telefone}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium ${typeBadges[person.tipo] || 'text-gray-800 bg-gray-100'} rounded-full">
                    ${typeNames[person.tipo] || 'Não definido'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button class="btn-edit-person text-indigo-600 hover:text-indigo-900" data-id="${person.id}"><i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i></button>
                <button class="btn-delete-person text-red-600 hover:text-red-900" data-id="${person.id}"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
            </td>
        `;
                peopleTableBody.appendChild(tr);
            });

            // Re-cria os ícones de editar/excluir
            lucide.createIcons();
        }

        /**
         * Atualiza o <select> de Clientes/Revendedores na página de Vendas
         */
        function renderPeopleDropdown(people) {
            const select = document.getElementById('sale-client');
            if (!select) return; // Sai se o elemento não existir

            // Salva o valor que estava selecionado (se houver)
            const selectedValue = select.value;

            // Limpa as opções antigas, exceto a primeira
            select.innerHTML = '<option value="Consumidor Final">Consumidor Final</option>';

            // Filtra apenas por clientes e revendedores
            const clients = people.filter(p => p.tipo === 'cliente' || p.tipo === 'revendedor');

            clients.forEach(person => {
                const option = document.createElement('option');
                option.value = person.nome; // Usar o NOME como valor (ou person.id se preferir)
                option.textContent = `${person.nome} (${person.tipo})`;
                select.appendChild(option);
            });

            // Tenta restaurar o valor que estava selecionado
            select.value = selectedValue || 'Consumidor Final';
        }
        /**
         * Cria o listener (onSnapshot) para a coleção de CATEGORIAS
         */
        function loadCategories() {
            const collectionPath = `artifacts/${appId}/users/${userId}/categorias`;
            const q = query(collection(db, collectionPath));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log(`Categorias recebidas: ${snapshot.size} docs`);
                const categories = [];
                snapshot.forEach(doc => {
                    categories.push({ id: doc.id, ...doc.data() });
                });
                // Ordena por nome
                categories.sort((a, b) => a.nome.localeCompare(b.nome));

                renderCategories(categories);

            }, (error) => {
                console.error("Erro ao carregar categorias: ", error);
                // Não mostramos modal aqui para não ser intrusivo, apenas logamos
            });

            activeListeners.push(unsubscribe);
        }

        /**
         * Atualiza o <select> de categorias no formulário de produto
         */
        function renderCategories(categories) {
            const select = document.getElementById('prod-categoria');
            if (!select) return;

            // 1. Limpa apenas as opções que vieram do Firebase (para não duplicar)
            // Deixamos as opções padrão (Anéis, Brincos, etc.)
            select.querySelectorAll('option.custom-category').forEach(opt => opt.remove());

            // 2. Adiciona as novas opções
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nome;
                
                const depth = (cat.nome.match(/ > /g) || []).length;
                const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(depth);
                option.textContent = indent + cat.nome;
                option.className = 'custom-category'; // Marca como customizada

                // Evita adicionar duplicatas das opções padrão
                let exists = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value.toLowerCase() === cat.nome.toLowerCase()) {
                        exists = true;
                        break;
                    }
                }

                if (!exists) {
                    select.appendChild(option);
                }
            });

            // 3. Reordena todas as opções para agrupar categorias e subcategorias alfabeticamente
            const optionsArray = Array.from(select.options);
            optionsArray.sort((a, b) => a.value.localeCompare(b.value));
            select.innerHTML = '';
            optionsArray.forEach(opt => select.appendChild(opt));
        }

        /**
         * Cria o listener (onSnapshot) para a coleção de PLANOS DE CONTAS
         */
        function loadPlanosContas() {
            const collectionPath = `artifacts/${appId}/users/${userId}/planos_contas`;
            const q = query(collection(db, collectionPath));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const planos = [];
                snapshot.forEach(doc => planos.push({ id: doc.id, ...doc.data() }));
                planos.sort((a, b) => a.nome.localeCompare(b.nome));
                
                renderPlanosContas(planos);
            }, (error) => {
                console.error("Erro ao carregar planos de contas: ", error);
            });
            activeListeners.push(unsubscribe);
        }

        function renderPlanosContas(planos) {
            const select = document.getElementById('bill-plano-contas');
            if (!select) return;
            select.querySelectorAll('option.custom-plano').forEach(opt => opt.remove());
            planos.forEach(plano => {
                const option = document.createElement('option');
                option.value = plano.nome;
                option.textContent = plano.nome;
                option.className = 'custom-plano';
                select.appendChild(option);
            });
            
            const filterSelect = document.getElementById('bills-filter-plano');
            if (filterSelect) {
                filterSelect.querySelectorAll('option.custom-plano').forEach(opt => opt.remove());
                planos.forEach(plano => {
                    const option = document.createElement('option');
                    option.value = plano.nome;
                    option.textContent = plano.nome;
                    option.className = 'custom-plano';
                    filterSelect.appendChild(option);
                });
            }
        }
         /**
         * Cria o listener (onSnapshot) para a coleção de MALETAS
         */
        function loadMaletas() {
            const collectionPath = `artifacts/${appId}/users/${userId}/maletas`;
            const q = query(collection(db, collectionPath));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                allMaletas = [];
                snapshot.forEach(doc => allMaletas.push({ id: doc.id, ...doc.data() }));
                allMaletas.sort((a, b) => a.nome.localeCompare(b.nome));
                
                renderMaletasList();
            }, (error) => {
                console.error("Erro ao carregar maletas: ", error);
            });
            activeListeners.push(unsubscribe);
        }

        function renderMaletasList() {
            const tbody = document.getElementById('maletas-list-table');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (allMaletas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma maleta criada.</td></tr>';
                updateMaletasAverages();
                return;
            }

            // Calcula a demanda total de cada produto em TODAS as maletas
            const globalDemand = {};
            allMaletas.forEach(m => {
                m.items.forEach(i => {
                    globalDemand[i.id] = (globalDemand[i.id] || 0) + i.quantity;
                });
            });

            allMaletas.forEach(m => {
                const tr = document.createElement('tr');
                
                let totalItens = 0;
                let availableItens = 0;
                let sharedStockIssues = [];
                let totalVenda = 0;

                m.items.forEach(i => {
                    totalItens += i.quantity;
                    totalVenda += (i.venda || 0) * i.quantity;
                    const productInDB = allUserProducts.find(p => p.id === i.id);
                    const currentStock = productInDB ? productInDB.estoque : 0;
                    availableItens += Math.min(i.quantity, Math.max(0, currentStock));

                    // Verifica se o estoque atual é maior que zero, mas não é suficiente para atender a demanda de todas as maletas juntas
                    if (currentStock > 0 && currentStock < globalDemand[i.id]) {
                        if (productInDB) sharedStockIssues.push(`${productInDB.nome} (${currentStock}/${globalDemand[i.id]})`);
                    }
                });

                const availabilityClass = availableItens === totalItens ? 'text-green-600' : (availableItens === 0 ? 'text-red-600' : 'text-yellow-600');

                let sharedWarningHtml = '';
                if (sharedStockIssues.length > 0) {
                    const names = sharedStockIssues.slice(0, 3).join(', ') + (sharedStockIssues.length > 3 ? ' e outros' : '');
                    const tooltipText = `Estoque compartilhado: Você tem estoque de ${names}, mas não o suficiente para montar TODAS as maletas que os utilizam ao mesmo tempo.`;
                    sharedWarningHtml = `<span class="cursor-help" title="${tooltipText}"><i data-lucide="alert-triangle" class="w-4 h-4 text-orange-500 inline ml-2 pointer-events-none"></i></span>`;
                }

                tr.innerHTML = `
                    <td class="px-6 py-4"><input type="checkbox" class="rounded maleta-checkbox" data-id="${m.id}"></td>
                    <td class="px-6 py-4 font-medium text-gray-900"><span class="cursor-pointer text-indigo-600 hover:text-indigo-800 hover:underline btn-edit-maleta" data-id="${m.id}">${m.nome}</span></td>
                    <td class="px-6 py-4 text-gray-500">
                        <span class="font-medium ${availabilityClass}">${availableItens}/${totalItens} peças disponíveis</span> 
                        <span class="text-xs ml-1">(${m.items.length} produtos)</span>${sharedWarningHtml}
                    </td>
                    <td class="px-6 py-4 text-gray-700 font-medium whitespace-nowrap">R$ ${totalVenda.toFixed(2).replace('.', ',')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button class="btn-add-maleta-to-sale text-purple-600 hover:text-purple-900" data-id="${m.id}" title="Adicionar à Consignação"><i data-lucide="shopping-cart" class="w-5 h-5 pointer-events-none"></i></button>
                        <button class="btn-edit-maleta text-indigo-600 hover:text-indigo-900" data-id="${m.id}"><i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i></button>
                        <button class="btn-duplicate-maleta text-green-600 hover:text-green-900" data-id="${m.id}" title="Duplicar Maleta"><i data-lucide="copy" class="w-5 h-5 pointer-events-none"></i></button>
                        <button class="btn-delete-maleta text-red-600 hover:text-red-900" data-id="${m.id}"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
            updateMaletasAverages();
        }

        function updateMaletasAverages() {
            const container = document.getElementById('maletas-averages-list');
            const btnCreateFromAvg = document.getElementById('btn-create-maleta-from-avg');
            if (!container) return;

            container.innerHTML = '';
            currentMaletaAverages = {};
            
            const selectedCheckboxes = document.querySelectorAll('#maletas-list-table input.maleta-checkbox:checked');
            let maletasToCalculate = [];

            if (selectedCheckboxes.length > 0) {
                selectedCheckboxes.forEach(cb => {
                    const maleta = allMaletas.find(m => m.id === cb.dataset.id);
                    if (maleta) maletasToCalculate.push(maleta);
                });
            } else {
                maletasToCalculate = allMaletas;
            }

            if (maletasToCalculate.length === 0) {
                container.innerHTML = '<p class="text-sm text-gray-500 col-span-full">Nenhuma maleta cadastrada para calcular as médias.</p>';
                if(btnCreateFromAvg) btnCreateFromAvg.classList.add('hidden');
                return;
            }

            const exactCategoryTotals = {};
            const categoryTotals = {};
            const numMaletas = maletasToCalculate.length;

            const getCategoryPaths = (catPath) => {
                if (!catPath || catPath === 'Sem Categoria') return ['Sem Categoria'];
                const parts = catPath.split(' > ');
                const paths = [];
                let current = '';
                for (const part of parts) {
                    current = current ? `${current} > ${part}` : part;
                    paths.push(current);
                }
                return paths;
            };

            maletasToCalculate.forEach(maleta => {
                maleta.items.forEach(item => {
                    let cat = item.categoria;
                    if (!cat) {
                        const productInDB = allUserProducts.find(p => p.id === item.id);
                        cat = productInDB ? (productInDB.categoria || 'Sem Categoria') : 'Sem Categoria';
                    }
                    
                    exactCategoryTotals[cat] = (exactCategoryTotals[cat] || 0) + (item.quantity || 1);
                    
                    const catPaths = getCategoryPaths(cat);
                    catPaths.forEach(path => {
                        categoryTotals[path] = (categoryTotals[path] || 0) + (item.quantity || 1);
                    });
                });
            });

            // Preenche currentMaletaAverages com as categorias EXATAS para o assistente funcionar corretamente
            Object.keys(exactCategoryTotals).forEach(cat => {
                const avgQtyStr = (exactCategoryTotals[cat] / numMaletas).toFixed(1).replace('.0', '');
                const avgQty = parseFloat(avgQtyStr);
                if (avgQty > 0) {
                    currentMaletaAverages[cat] = Math.max(1, Math.round(avgQty));
                }
            });

            let hasCategories = false;
            const rootCategories = {};
            
            Object.keys(categoryTotals).forEach(cat => {
                if (categoryTotals[cat] === 0) return;
                
                const parts = cat.split(' > ');
                const root = parts[0];
                
                if (!rootCategories[root]) {
                    rootCategories[root] = [];
                }
                rootCategories[root].push(cat);
            });

            Object.keys(rootCategories).sort().forEach(root => {
                const paths = rootCategories[root].sort();
                const rootData = categoryTotals[root];
                
                if (!rootData) return;

                const avgQtyStr = (rootData / numMaletas).toFixed(1).replace('.0', '');
                const avgQty = parseFloat(avgQtyStr);

                if (avgQty > 0) {
                    hasCategories = true;
                    
                    const div = document.createElement('div');
                    div.className = 'bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col shadow-sm';
                    
                    let html = `
                        <div class="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100">
                            <h4 class="font-bold text-indigo-800 uppercase tracking-wider text-sm truncate" title="${root}">${root}</h4>
                            <span class="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full" title="Média">${avgQtyStr} un.</span>
                        </div>
                    `;

                    // Se tiver subcategorias
                    if (paths.length > 1) {
                        html += `<div class="mt-2 pt-1">
                                    <ul class="space-y-1.5">`;
                        
                        paths.forEach(path => {
                            if (path === root) return; // Pula a raiz
                            
                            const data = categoryTotals[path];
                            const subAvgStr = (data / numMaletas).toFixed(1).replace('.0', '');
                            const parts = path.split(' > ');
                            const depth = parts.length - 1;
                            const subName = parts[parts.length - 1];
                            const indent = depth > 1 ? `${(depth - 1) * 12}px` : '0px';
                            const isDeep = depth > 1;
                            
                            html += `
                                <li class="flex justify-between items-center text-xs" style="padding-left: ${indent};">
                                    <span class="text-indigo-700 truncate pr-2 ${isDeep ? 'text-[11px]' : 'font-medium'}" title="${path}">
                                        ${isDeep ? '<span class="text-indigo-300 mr-1 inline-block">↳</span>' : ''}${subName}
                                    </span>
                                    <span class="text-indigo-600 font-semibold bg-white border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                        ${subAvgStr}
                                    </span>
                                </li>
                            `;
                        });
                        
                        html += `</ul></div>`;
                    }
                    
                    div.innerHTML = html;
                    container.appendChild(div);
                }
            });
            
            if (btnCreateFromAvg) {
                if (hasCategories) btnCreateFromAvg.classList.remove('hidden');
                else btnCreateFromAvg.classList.add('hidden');
            }
        }
        // --- FIM DA LÓGICA DE CARREGAMENTO ---
        /**
         * Atualiza o <select> de Fornecedores no formulário de produto
         */
        function renderSupplierDropdown(people) {
            const select = document.getElementById('prod-fornecedor');
            if (!select) return;

            // Salva o valor que estava selecionado (se houver)
            const selectedValue = select.value;

            // Limpa as opções antigas, exceto a primeira (Nenhum)
            select.innerHTML = '<option value="">Nenhum</option>';

            // Filtra apenas por 'fornecedor'
            const suppliers = people.filter(p => p.tipo === 'fornecedor');

            suppliers.forEach(person => {
                const option = document.createElement('option');
                option.value = person.nome; // Salva o NOME como valor
                option.textContent = person.nome;
                select.appendChild(option);
            });

            // Tenta restaurar o valor que estava selecionado
            select.value = selectedValue || '';
        }
        // --- LÓGICA DE NAVEGAÇÃO DA SPA ---

        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const pages = document.querySelectorAll('.page');

        function showPage(pageId) {
            // 1. Esconde todas as páginas principais
            pages.forEach(page => page.classList.remove('active'));

            // 2. Mostra a página principal correta (se encontrada)
            const activePage = document.getElementById(pageId);
            if (activePage) {
                activePage.classList.add('active'); // Apenas torna a div da página visível

                // Se a página de vendas for ativada, redesenha os itens do carrinho
                if (pageId === 'page-vendas') {
                    renderSaleItems();
                    updateSaleTotals();
                }

                lucide.createIcons(); // Recria ícones para a página ativa
            } else {
                console.error(`Página com ID ${pageId} NÃO encontrada!`);
            }

            sidebarLinks.forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === pageId) {
                    link.classList.add('active');
                }
            });
        }

        // Event listener do sidebar (DEVE HAVER APENAS UM!)
        document.getElementById('sidebar').addEventListener('click', (e) => {
            const link = e.target.closest('a.sidebar-link');
            if (link && link.dataset.page) {
                e.preventDefault();
                showPage(link.dataset.page);
            
            // Fecha o menu lateral automaticamente em telas menores (mobile)
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (!sidebar.classList.contains('-translate-x-full')) {
                    toggleMobileSidebar();
                }
            }
            }
        });
        // --- FIM DA LÓGICA DE NAVEGAÇÃO ---

        function setupTabs(containerId, btnClass, contentClass) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.addEventListener('click', (e) => {
                const tabButton = e.target.closest(`.${btnClass}`);
                if (!tabButton) return;

                // --- AQUI ESTÁ A CORREÇÃO ---
                e.preventDefault(); // Impede que o botão tente submeter um formulário
                // --- FIM DA CORREÇÃO ---

                const tabId = tabButton.dataset.tab;

                // --- CORREÇÃO INICIA AQUI --- (Esta parte você já tinha)
                const pageContainer = container.closest('.page');
                if (!pageContainer) {
                    console.error("Erro no setupTabs: não foi possível encontrar o '.page' pai.");
                    return;
                }
                pageContainer.querySelectorAll(`.${contentClass}`).forEach(content => {
                    content.classList.add('hidden');
                });
                // --- CORREÇÃO TERMINA AQUI ---

                // Remove classe ativa dos botões
                container.querySelectorAll(`.${btnClass}`).forEach(btn => {
                    btn.classList.remove('text-indigo-600', 'border-indigo-500');
                    btn.classList.add('text-gray-500', 'border-transparent');
                });

                // Mostra o conteúdo correto
                document.getElementById(tabId)?.classList.remove('hidden');
                // Ativa o botão correto
                tabButton.classList.add('text-indigo-600', 'border-indigo-500');
                tabButton.classList.remove('text-gray-500', 'border-transparent');
            });
        }
        // Inicializa os sistemas de abas
        setupTabs('product-tabs', 'product-tab-btn', 'product-tab-content');
        setupTabs('vendas-tabs', 'vendas-tab-btn', 'vendas-tab-content');
        setupTabs('pessoas-tabs', 'pessoas-tab-btn', 'pessoas-tab-content');
        setupTabs('financeiro-tabs', 'financeiro-tab-btn', 'financeiro-tab-content');

        // --- LÓGICA DE AUTENTICAÇÃO (Formulários) ---

        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');

        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('text-indigo-600', 'border-indigo-600');
            tabLogin.classList.remove('text-gray-500');
            tabRegister.classList.add('text-gray-500');
            tabRegister.classList.remove('text-indigo-600', 'border-indigo-600');
            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
            authError.textContent = '';
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('text-indigo-600', 'border-indigo-600');
            tabRegister.classList.remove('text-gray-500');
            tabLogin.classList.add('text-gray-500');
            tabLogin.classList.remove('text-indigo-600', 'border-indigo-600');
            formRegister.classList.remove('hidden');
            formLogin.classList.add('hidden');
            authError.textContent = '';
        });

        // Registrar
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const pass = document.getElementById('register-password').value;
            authError.textContent = '';
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                // O onAuthStateChanged vai cuidar de redirecionar
            } catch (error) {
                console.error("Erro ao registrar:", error);
                authError.textContent = "Erro ao registrar: " + error.message;
            }
        });

        // Login
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            authError.textContent = '';
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                // O onAuthStateChanged vai cuidar de redirecionar
            } catch (error) {
                console.error("Erro ao entrar:", error);
                authError.textContent = "Erro ao entrar: " + error.message;
            }
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', async () => {
            try {
                await signOut(auth);
                // O onAuthStateChanged vai cuidar de redirecionar
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        });

        // --- LÓGICA DE PRODUTOS (Exemplos) ---
        let isCalculating = false;
        const prodCusto = document.getElementById('prod-custo');
        const prodMargem = document.getElementById('prod-margem');
        const prodVenda = document.getElementById('prod-venda');
        const prodRef = document.getElementById('prod-ref');
        // Calcular preço de venda
        function calcularPrecoVenda() {
            if (isCalculating) return; // Se já estiver calculando, não faz nada
            isCalculating = true; // Trava

            const custo = parseFloat(prodCusto.value) || 0;
            const margem = parseFloat(prodMargem.value) || 100; // 100% por padrão
            const venda = custo * (1 + (margem / 100));

            // Remove o .replace(',', '.') - o campo agora é type="number"
            prodVenda.value = venda.toFixed(2);

            isCalculating = false; // Libera a trava
        }

        /**
         * Calcula a Margem (%) baseada no Preço de Custo e Preço de Venda.
         */
        function calcularMargem() {
            if (isCalculating) return; // Se já estiver calculando, não faz nada
            isCalculating = true; // Trava

            const custo = parseFloat(prodCusto.value) || 0;
            const venda = parseFloat(prodVenda.value) || 0;

            if (custo > 0 && venda >= custo) {
                const margem = ((venda / custo) - 1) * 100;
                prodMargem.value = margem.toFixed(0);
            } else {
                prodMargem.value = '0';
            }

            isCalculating = false; // Libera a trava
        }
        // Gerar preview do código de barras
        function gerarBarcodePreview() {
            const ref = prodRef.value;
            if (ref) {
                JsBarcode("#barcode-preview", ref, {
                    format: "CODE128",
                    displayValue: true,
                    fontSize: 14,
                    margin: 10,
                    height: 50
                });
            } else {
                document.getElementById("barcode-preview").innerHTML = "";
            }
        }

        // Função para gerar código aleatório
        function generateRandomRef() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        // Função para gerar código ÚNICO (verifica no banco)
        async function generateUniqueRef() {
            if (!userId) throw new Error("Usuário não logado");
            
            let isUnique = false;
            let newRef = "";
            let attempts = 0;
            const maxAttempts = 5;

            while (!isUnique && attempts < maxAttempts) {
                newRef = generateRandomRef();
                // Verifica no Firestore
                const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                const q = query(collection(db, collectionPath), where("ref", "==", newRef));
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) isUnique = true;
                attempts++;
            }

            if (!isUnique) throw new Error("Não foi possível gerar um código único automaticamente.");
            return newRef;
        }

        // Listener para o botão de gerar código (Cadastro)
        document.getElementById('btn-gen-ref').addEventListener('click', async () => {
            const btn = document.getElementById('btn-gen-ref');
            const originalHtml = btn.innerHTML;

            if (prodRef.value.trim() !== '') {
                if (!confirm('Já existe um código digitado. Deseja gerar um novo e sobrescrever?')) {
                    return;
                }
            }
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full"></i>';
                
                const uniqueRef = await generateUniqueRef();
                prodRef.value = uniqueRef;
                gerarBarcodePreview();
            } catch (error) {
                console.error(error);
                showModal("Erro", "Falha ao gerar código: " + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });

        prodCusto.addEventListener('input', calcularPrecoVenda);
        prodMargem.addEventListener('input', calcularPrecoVenda);
        prodRef.addEventListener('input', gerarBarcodePreview);
        // Evita salvar automaticamente ao usar leitor de código de barras (Enter)
        prodRef.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
        prodVenda.addEventListener('input', calcularMargem);

        // Função para formatar o link de imagem do Google Drive como link direto
        function formatImageUrl(url) {
            if (!url) return null;
            const driveRegex = /(?:https?:\/\/)?(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/uc\?id=)([a-zA-Z0-9_-]+)/;
            const match = url.match(driveRegex);
            if (match && match[1]) {
                // Usa o endpoint de miniatura, que o Google Drive ainda permite em outros sites
                return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
            }
            return url;
        }

        // Função Helper para converter a imagem em Base64 (Necessário para desenhar no PDF)
        function getBase64FromImage(url) {
            return new Promise((resolve) => {
                if (!url) { resolve(null); return; }
                
                // Contorna o bloqueio de CORS do Google Drive usando um proxy público
                let fetchUrl = url;
                if (url.includes('drive.google.com')) {
                    fetchUrl = 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
                }

                const img = new Image();
                img.crossOrigin = "Anonymous"; // Permite contornar proteções básicas de CORS
                img.onload = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL("image/jpeg"));
                    } catch (err) {
                        console.error("Erro no Canvas ao processar imagem:", err);
                        resolve(null);
                    }
                };
                img.onerror = () => {
                    console.warn("Falha ao carregar imagem via proxy (link quebrado ou bloqueado):", fetchUrl);
                    resolve(null); // Se falhar, retorna vazio e não trava a geração
                };
                img.src = fetchUrl;
            });
        }

        // Salvar produto (Versão simplificada, sem foto)
        document.getElementById('form-add-product').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!userId) {
                showModal("Erro", "Você precisa estar logado para salvar produtos.");
                return;
            }

            const form = e.currentTarget;
            const saveButton = form.querySelector('button[type="submit"]');
            const originalButtonText = saveButton.innerHTML;

            // Desabilita o botão e mostra "Salvando..."
            saveButton.disabled = true;
            saveButton.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Salvando`;

            try {
                const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;

                // --- 3. VERIFICAR DUPLICIDADE DE REFERÊNCIA ---
                const newRef = document.getElementById('prod-ref').value.trim();
                if (!newRef) {
                    throw new Error("O Código de Referência é obrigatório.");
                }

                const productQuery = query(
                    collection(db, collectionPath),
                    where("ref", "==", newRef), // Onde a 'ref' é igual à nova ref
                    where("ownerId", "==", userId)
                );

                const querySnapshot = await getDocs(productQuery);

                if (!querySnapshot.empty) {
                    // Se a consulta não for vazia, significa que o produto JÁ EXISTE
                    throw new Error(`A referência "${newRef}" já está sendo usada por outro produto.`);
                }

                // ---- Salvar dados no Firestore (sem foto) ----
                const produto = {
                    nome: document.getElementById('prod-nome').value,
                    custo: parseFloat(prodCusto.value) || 0,
                    margem: parseFloat(prodMargem.value) || 0,
                    venda: parseFloat(prodVenda.value.replace(',', '.')) || 0,
                    categoria: document.getElementById('prod-categoria').value,
                    fornecedor: document.getElementById('prod-fornecedor').value,
                    ref: prodRef.value,
                    ref2: document.getElementById('prod-ref2').value.trim(),
                    estoque: parseInt(document.getElementById('prod-estoque').value) || 0,
                    descricao: document.getElementById('prod-desc').value,
                    // fotoUrl: null, // Não precisamos mais deste campo
                    fotoUrl: formatImageUrl(document.getElementById('prod-foto').value.trim()),
                    createdAt: serverTimestamp(),
                    ownerId: userId
                };

                const docRef = await addDoc(collection(db, collectionPath), produto);

                showModal("Sucesso", `Produto "${produto.nome}" salvo com sucesso.`);
                form.reset(); // Limpa o formulário
                gerarBarcodePreview(); // Limpa o preview do código de barras

            } catch (error) {
                console.error("Erro ao salvar produto: ", error);
                showModal("Erro", "Falha ao salvar o produto: " + error.message);
            } finally {
                // Reabilita o botão e restaura o texto
                saveButton.disabled = false;
                saveButton.innerHTML = originalButtonText;
            }
        });

        // --- LÓGICA DE VENDAS (Exemplo) ---

        const radioVendaDireta = document.querySelector('input[name="sale-type"][value="direta"]');
        const radioConsignacao = document.querySelector('input[name="sale-type"][value="consignacao"]');
        const fieldsVendaDireta = document.getElementById('fields-venda-direta');
        const fieldsConsignacao = document.getElementById('fields-consignacao');
        const btnFinalizeSale = document.getElementById('btn-finalize-sale');

        radioVendaDireta.addEventListener('change', () => {
            fieldsVendaDireta.style.display = 'block';
            fieldsConsignacao.style.display = 'none';
            btnFinalizeSale.textContent = 'Finalizar Venda';
            btnFinalizeSale.classList.replace('bg-blue-600', 'bg-green-600');
            btnFinalizeSale.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
        });

        radioConsignacao.addEventListener('change', () => {
            fieldsVendaDireta.style.display = 'none';
            fieldsConsignacao.style.display = 'block';
            btnFinalizeSale.textContent = 'Abrir Consignação';
            btnFinalizeSale.classList.replace('bg-green-600', 'bg-blue-600');
            btnFinalizeSale.classList.replace('hover:bg-green-700', 'hover:bg-blue-700');

            // --- LINHA ADICIONADA ---
            // Define a data de acerto para 30 dias no futuro
            document.getElementById('sale-due-date').value = getFutureDateString(30);
        });

        // --- LÓGICA DO MODAL (Substitui alert() e confirm()) ---

        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalClose = document.getElementById('modal-close');
        let modalTimeoutId = null;

        function showModal(title, message) {
            // Limpa qualquer timer de fechamento automático anterior
            if (modalTimeoutId) {
                clearTimeout(modalTimeoutId);
                modalTimeoutId = null;
            }

            modalTitle.textContent = title;
            modalBody.innerHTML = `<p>${message}</p>`; // Cuidado com XSS se message vier do usuário
            modalContainer.style.display = 'flex';

            // --- NOVO CÓDIGO ---
            // Verifica se o título é de 'Sucesso' para fechar automaticamente
            const titleLower = title.toLowerCase();
            if (titleLower.includes('sucesso')) {

                modalTimeoutId = setTimeout(() => {
                    hideModal();
                }, 2000); // 2000ms = 2 segundos
            }
            // Modais de "Erro" or "Atenção" não fecharão
        }

        function hideModal() {
            modalContainer.style.display = 'none';

            // --- NOVO CÓDIGO ---
            // Se um timer de fechamento estava agendado, cancela ele.
            if (modalTimeoutId) {
                clearTimeout(modalTimeoutId);
                modalTimeoutId = null;
            }
            
            const modalContent = document.getElementById('modal-content');
            if (modalContent) {
                modalContent.classList.remove('max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-full');
                modalContent.classList.add('max-w-4xl');
            }
        }
        // --- FUNÇÃO HELPER PARA CALCULAR DATAS ---
        /**
         * Retorna uma data futura formatada como 'YYYY-MM-DD'.
         * @param {number} daysToAdd - O número de dias a adicionar à data de hoje.
         */
        function getFutureDateString(daysToAdd) {
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + daysToAdd);

            // Formata para YYYY-MM-DD
            const year = futureDate.getFullYear();
            const month = String(futureDate.getMonth() + 1).padStart(2, '0'); // getMonth() é 0-indexado
            const day = String(futureDate.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        }
        // --- FIM DA FUNÇÃO HELPER ---
        
        /**
         * Helper para divisão automática de valores em duas caixas de pagamento.
         */
        function setupTwoSplitsLogic(container, rowSelector, inputSelector, getTotalCallback) {
            if (!container) return;
            container.addEventListener('input', (e) => {
                if (e.target.matches(inputSelector)) {
                    const splitRows = container.querySelectorAll(rowSelector);
                    if (splitRows.length === 2) {
                        const total = getTotalCallback();
                        const inputs = [
                            splitRows[0].querySelector(inputSelector),
                            splitRows[1].querySelector(inputSelector)
                        ];
                        if (e.target === inputs[0]) {
                            let remain = total - (parseFloat(inputs[0].value) || 0);
                            inputs[1].value = remain > 0 ? remain.toFixed(2) : "0.00";
                        } else if (e.target === inputs[1]) {
                            let remain = total - (parseFloat(inputs[1].value) || 0);
                            inputs[0].value = remain > 0 ? remain.toFixed(2) : "0.00";
                        }
                    }
                }
            });
        }

        /**
         * Converte um objeto Date do JS para uma string 'YYYY-MM-DD'.
         */
        function formatDateToYYYYMMDD(dateObj) {
            if (!dateObj || typeof dateObj.getFullYear !== 'function') {
                dateObj = new Date(); // Usa hoje como fallback se a data for inválida
            }
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // getMonth() é 0-indexado
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        modalClose.addEventListener('click', hideModal);
        modalContainer.addEventListener('click', (e) => {
            // Fecha se clicar fora do conteúdo
            if (e.target === modalContainer) {
                hideModal();
            }
        });

        // --- LÓGICA DAS PARCELAS (FINANCEIRO UI) ---
        const billIsInstallment = document.getElementById('bill-is-installment');
        const billInstallmentsGroup = document.getElementById('bill-installments-group');

        if (billIsInstallment) {
            billIsInstallment.addEventListener('change', () => {
                if (billIsInstallment.checked) {
                    billInstallmentsGroup.classList.remove('hidden');
                } else {
                    billInstallmentsGroup.classList.add('hidden');
                }
            });
        }

        // --- LÓGICA DE IMPORTAÇÃO CSV (PRODUTOS) ---
        const fileInput = document.getElementById('csv-file-input');
        const importButton = document.getElementById('btn-import-csv');
        const importStatus = document.getElementById('import-status');

        if (importButton) {
            importButton.addEventListener('click', async () => {
                if (!fileInput.files || fileInput.files.length === 0) {
                    showModal("Erro", "Por favor, selecione um arquivo CSV primeiro.");
                    return;
                }
                if (!userId) {
                    showModal("Erro", "Você precisa estar logado para importar produtos.");
                    return;
                }

                const file = fileInput.files[0];
                importButton.disabled = true; // Desabilita o botão durante o envio
                importStatus.textContent = 'Lendo arquivo';
                importStatus.classList.remove('text-red-600', 'text-green-600');
                importStatus.classList.add('text-blue-600');

                // Usar PapaParse para ler o CSV
                Papa.parse(file, {
                    header: true, // A primeira linha é o cabeçalho
                    skipEmptyLines: true,
                    complete: async (results) => {
                        console.log("Arquivo CSV lido:", results.data);
                        if (!results.data || results.data.length === 0) {
                            importStatus.textContent = 'Erro: Arquivo CSV vazio ou inválido.';
                            importStatus.classList.replace('text-blue-600', 'text-red-600');
                            importButton.disabled = false;
                            return;
                        }

                        // Inicia o processamento em lote
                        await processBatchUpload(results.data);
                        importButton.disabled = false;
                    },
                    error: (err) => {
                        console.error("Erro no PapaParse:", err);
                        importStatus.textContent = `Erro ao ler o arquivo: ${err.message}`;
                        importStatus.classList.replace('text-blue-600', 'text-red-600');
                        importButton.disabled = false;
                    }
                });
            });
        }

        async function processBatchUpload(products) {
            importStatus.textContent = `Processando ${products.length} produtos`;

            try {
                // Criar um "batch" (lote)
                const batch = writeBatch(db);
                const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;

                let validProductsCount = 0;

                for (const prod of products) {
                    // 1. Validar e limpar os dados
                    if (!prod.nome || !prod.ref) {
                        console.warn("Produto pulado (sem nome ou ref):", prod);
                        continue; // Pula este produto
                    }

                    const custo = parseFloat(prod.custo) || 0;
                    const margem = parseFloat(prod.margem) || 100;
                    const venda = custo * (1 + (margem / 100));

                    // 2. Criar o objeto do produto (Convertendo tudo para String para segurança)
                    const newProduct = {
                        nome: String(prod.nome || '').trim(),
                        ref: String(prod.ref || '').trim(),
                        custo: custo,
                        margem: margem,
                        venda: venda,
                        estoque: parseInt(prod.estoque) || 0,
                        categoria: prod.categoria ? String(prod.categoria).trim() : 'Sem Categoria',
                        descricao: String(prod.descricao || '').trim(),
                        createdAt: serverTimestamp(),
                        ownerId: userId
                    };

                    // 3. Adicionar ao lote (batch)
                    // Criamos um 'doc' novo com ID automático
                    const newDocRef = doc(collection(db, collectionPath));
                    batch.set(newDocRef, newProduct);
                    validProductsCount++;
                }

                if (validProductsCount === 0) {
                    importStatus.textContent = 'Nenhum produto válido encontrado no arquivo. Verifique as colunas.';
                    importStatus.classList.replace('text-blue-600', 'text-red-600');
                    return;
                }

                // 4. Enviar o lote inteiro para o Firebase de uma só vez
                await batch.commit();

                console.log("Lote enviado com sucesso!");
                importStatus.textContent = `Sucesso! ${validProductsCount} produtos importados.`;
                importStatus.classList.replace('text-blue-600', 'text-green-600');
                fileInput.value = ''; // Limpa o campo de arquivo

            } catch (error) {
                console.error("Erro ao enviar o lote para o Firebase:", error);
                importStatus.textContent = `Erro ao salvar no banco de dados: ${error.message}`;
                importStatus.classList.replace('text-blue-600', 'text-red-600');
                throw error; // <-- ADICIONE ESTA LINHA
            }
        }
        // --- FIM DA LÓGICA DE IMPORTAÇÃO ---
        // --- LÓGICA DE IMPORTAÇÃO EXCEL (.xlsx) ---
        const excelFileInput = document.getElementById('excel-file-input');
        const excelImportButton = document.getElementById('btn-import-excel');

        if (excelImportButton) {
            excelImportButton.addEventListener('click', () => {
                if (!excelFileInput.files || excelFileInput.files.length === 0) {
                    showModal("Erro", "Por favor, selecione um arquivo Excel (.xlsx) primeiro.");
                    return;
                }
                if (!userId) {
                    showModal("Erro", "Você precisa estar logado para importar produtos.");
                    return;
                }

                const file = excelFileInput.files[0];
                excelImportButton.disabled = true;
                importStatus.textContent = 'Lendo arquivo Excel...';
                importStatus.classList.remove('text-red-600', 'text-green-600');
                importStatus.classList.add('text-blue-600');

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        // XLSX é o objeto global da biblioteca SheetJS que importamos
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];

                        // Converte a planilha para JSON (array de objetos)
                        // A primeira linha do Excel DEVE ser o cabeçalho (nome, ref, custo, etc.)
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);

                        if (!jsonData || jsonData.length === 0) {
                            importStatus.textContent = 'Erro: Planilha Excel vazia ou em formato inválido.';
                            importStatus.classList.replace('text-blue-600', 'text-red-600');
                            excelImportButton.disabled = false;
                            return;
                        }

                        console.log("Arquivo Excel lido:", jsonData);

                        // REUTILIZA A MESMA FUNÇÃO de upload em lote!
                        await processBatchUpload(jsonData);

                        importStatus.textContent = `Sucesso! ${jsonData.length} produtos importados do Excel.`;
                        importStatus.classList.replace('text-blue-600', 'text-green-600');
                        excelImportButton.disabled = false;
                        excelFileInput.value = ''; // Limpa o input

                    } catch (err) {
                        console.error("Erro ao ler arquivo Excel:", err);
                        importStatus.textContent = `Erro ao ler Excel: ${err.message}`;
                        importStatus.classList.replace('text-blue-600', 'text-red-600');
                        excelImportButton.disabled = false;
                    }
                };

                reader.onerror = (err) => {
                    console.error("Erro no FileReader:", err);
                    importStatus.textContent = `Erro ao carregar arquivo: ${err.message}`;
                    importStatus.classList.replace('text-blue-600', 'text-red-600');
                    excelImportButton.disabled = false;
                };

                reader.readAsArrayBuffer(file);
            });
        }
        // --- FIM DA LÓGICA EXCEL ---
        // --- LÓGICA DE IMPORTAÇÃO POR "COLAR" (PASTE) ---
        const pasteInput = document.getElementById('paste-data-input');
        const pasteButton = document.getElementById('btn-import-paste');

        if (pasteButton) {
            pasteButton.addEventListener('click', () => {
                const textData = pasteInput.value;
                if (!textData || textData.trim().length === 0) {
                    showModal("Erro", "Por favor, cole os dados da sua planilha no campo de texto.");
                    return;
                }
                if (!userId) {
                    showModal("Erro", "Você precisa estar logado para importar produtos.");
                    return;
                }

                pasteButton.disabled = true;
                importStatus.textContent = 'Lendo dados colados...';
                importStatus.classList.remove('text-red-600', 'text-green-600');
                importStatus.classList.add('text-blue-600');

                // Usa PapaParse para ler o texto (TSV - Tab Separated Values)
                Papa.parse(textData, {
                    header: true,         // Usa a primeira linha como cabeçalho
                    skipEmptyLines: true,
                    delimiter: "\t",      // Define o separador como "Tab"
                    complete: async (results) => {
                        console.log("Dados colados lidos:", results.data);

                        if (!results.data || results.data.length === 0) {
                            importStatus.textContent = 'Erro: Dados colados vazios ou inválidos.';
                            importStatus.classList.replace('text-blue-600', 'text-red-600');
                            pasteButton.disabled = false;
                            return;
                        }

                        // REUTILIZA A MESMA FUNÇÃO de upload em lote que já temos!
                        await processBatchUpload(results.data);
                        pasteButton.disabled = false;
                    },
                    error: (err) => {
                        console.error("Erro no PapaParse (Paste):", err);
                        importStatus.textContent = `Erro ao ler dados: ${err.message}`;
                        importStatus.classList.replace('text-blue-600', 'text-red-600');
                        pasteButton.disabled = false;
                    }
                });
            });
        }
        // --- FIM DA LÓGICA DE "COLAR" ---
        // --- LÓGICA DE ADICIONAR CATEGORIA (MODAL) ---
        const btnAddCategory = document.getElementById('btn-add-category');

        if (btnAddCategory) {
            btnAddCategory.addEventListener('click', () => {
                // 1. Configurar o Modal
                modalTitle.textContent = 'Adicionar Nova Categoria';
                
                const categorySelect = document.getElementById('prod-categoria');
                let parentOptionsHtml = '<option value="">Nenhuma (Categoria Principal)</option>';
                if (categorySelect) {
                    Array.from(categorySelect.options).forEach(opt => {
                        parentOptionsHtml += `<option value="${opt.value}">${opt.textContent}</option>`;
                    });
                }

                modalBody.innerHTML = `
    <p class="text-sm text-gray-600 mb-4">Você pode criar uma categoria principal ou selecionar uma "Categoria Pai" para criar uma subcategoria (ex: Anéis > Ouro).</p>
    <div class="space-y-4">
        <div>
            <label for="new-category-parent" class="block text-sm font-medium">Categoria Pai (Opcional)</label>
            <select id="new-category-parent" class="w-full px-3 py-2 mt-1 border rounded-md">
                ${parentOptionsHtml}
            </select>
        </div>
        <div>
            <label for="new-category-name" class="block text-sm font-medium">Nome da Nova Categoria</label>
            <input type="text" id="new-category-name" required class="w-full px-3 py-2 mt-1 border rounded-md" placeholder="Ex: Ouro 18k">
            <p id="category-error" class="text-xs text-red-600 mt-1 hidden"></p>
        </div>
    </div>
    <div class="mt-6 text-right">
        <button type="button" id="btn-cancel-category" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2">Cancelar</button>
        <button type="button" id="btn-save-category" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Salvar</button>
    </div>
`;

                // 2. Mostrar o Modal
                modalContainer.style.display = 'flex';

                const saveBtn = document.getElementById('btn-save-category');
                const cancelBtn = document.getElementById('btn-cancel-category');
                const input = document.getElementById('new-category-name');
                const parentInput = document.getElementById('new-category-parent');
                const errorP = document.getElementById('category-error');

                // 3. Adicionar listener de Salvar
                saveBtn.onclick = async () => {
                    const rawName = input.value.trim();
                    const parentName = parentInput.value;
                    errorP.classList.add('hidden');

                    if (!rawName) {
                        errorP.textContent = 'Por favor, digite um nome.';
                        errorP.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        return;
                    }
                    
                    const categoryName = parentName ? `${parentName} > ${rawName}` : rawName;

                    if (!userId) {
                        showModal("Erro", "Usuário não logado.");
                        return;
                    }

                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Salvando';

                    try {
                        // Salva no Firestore
                        const categoryId = categoryName.toLowerCase();
                        const collectionPath = `artifacts/${appId}/users/${userId}/categorias`;
                        const docRef = doc(db, collectionPath, categoryId);

                        await setDoc(docRef, {
                            nome: categoryName,
                            createdAt: serverTimestamp()
                        });

                        // --- INÍCIO DA CORREÇÃO ---
                        // O 'onSnapshot' (em loadCategories) vai atualizar a lista.
                        // Damos um pequeno delay (100ms) para garantir que a lista foi
                        // renderizada pelo onSnapshot ANTES de tentarmos selecionar o novo valor.
                        setTimeout(() => {
                            document.getElementById('prod-categoria').value = categoryName;
                        }, 100); // 100ms de delay
                        // --- FIM DA CORREÇÃO ---

                        hideModal();

                    } catch (error) {
                        console.error("Erro ao salvar categoria:", error);
                        showModal("Erro", "Não foi possível salvar a nova categoria.");
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Salvar';
                    }
                };

                // 4. Adicionar listener de Cancelar
                cancelBtn.onclick = () => {
                    hideModal();
                };

                // 5. Adicionar listener para fechar com 'Esc' (opcional, mas bom)
                input.onkeydown = (e) => {
                    if (e.key === 'Escape') hideModal();
                    if (e.key === 'Enter') saveBtn.click();
                };

                // Foca no input
                input.focus();
            });
        }

        // --- LÓGICA DE GERENCIAR/EXCLUIR CATEGORIA ---
        const btnManageCategory = document.getElementById('btn-manage-category');

        if (btnManageCategory) {
            btnManageCategory.addEventListener('click', () => {
                // 1. Configurar o Título do Modal
                modalTitle.textContent = 'Gerenciar Categorias Criadas';

                // 2. Criar o Corpo do Modal
                const categoryList = document.createElement('ul');
                categoryList.className = 'space-y-2 max-h-60 overflow-y-auto';

                // 3. Buscar apenas as categorias customizadas (do Firebase)
                const select = document.getElementById('prod-categoria');
                const customOptions = select.querySelectorAll('option.custom-category');

                if (customOptions.length === 0) {
                    categoryList.innerHTML = '<p class="text-gray-500 text-sm">Você ainda não criou nenhuma categoria customizada.</p>';
                } else {
                    customOptions.forEach(option => {
                        const li = document.createElement('li');
                        li.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-md';
                        
                        const spanText = document.createElement('span');
                        spanText.textContent = option.textContent; // Usa o texto indentado
                        li.appendChild(spanText);

                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'btn-delete-category text-red-500 hover:text-red-700';
                        deleteButton.dataset.name = option.value; // Guarda o nome para exclusão
                        deleteButton.innerHTML = '<i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>';

                        li.appendChild(deleteButton);
                        categoryList.appendChild(li);
                    });
                }

                // 4. Limpa e insere o conteúdo no modal
                modalBody.innerHTML = '';
                modalBody.appendChild(categoryList);

                // 5. Adiciona um botão de fechar
                const footer = document.createElement('div');
                footer.className = 'mt-6 text-right';
                footer.innerHTML = '<button type="button" id="btn-close-manage" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>';
                modalBody.appendChild(footer);

                // 6. Mostra o modal
                modalContainer.style.display = 'flex';
                lucide.createIcons(); // Recria os ícones de lixeira

                // 7. Adiciona os listeners de clique

                // Fechar
                document.getElementById('btn-close-manage').onclick = hideModal;

                // Excluir
                modalBody.querySelectorAll('.btn-delete-category').forEach(button => {
                    button.onclick = (e) => {
                        const categoryName = e.currentTarget.dataset.name;
                        // Usamos a função showModal para confirmação
                        showDeleteCategoryConfirmation(categoryName);
                    };
                });
            });
        }

        function showDeleteCategoryConfirmation(categoryName) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Pergunta ao usuário
            modalTitle.textContent = 'Confirmar Exclusão';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir a categoria "<strong>${categoryName}</strong>"?</p>
        <p class="text-sm text-gray-600 mt-2">Isso não pode ser desfeito. Os produtos existentes que usam esta categoria não serão alterados.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir</button>
        </div>
    `;

            // 2. Mostra o modal de confirmação (que já estava aberto)
            modalContainer.style.display = 'flex';

            // 3. Listeners da confirmação
            document.getElementById('btn-confirm-cancel').onclick = () => {
                // Simplesmente fecha o modal de confirmação e volta
                hideModal();
            };

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    // Caminho do documento (ID é o nome em minúsculo)
                    const categoryId = categoryName.toLowerCase();
                    const collectionPath = `artifacts/${appId}/users/${userId}/categorias`;
                    const docRef = doc(db, collectionPath, categoryId);

                    // Exclui do Firebase
                    await deleteDoc(docRef);

                    // Fecha o modal
                    hideModal();

                    // O onSnapshot do 'loadCategories' vai
                    // atualizar a lista <select> automaticamente!

                } catch (error) {
                    console.error("Erro ao excluir categoria:", error);
                    showModal("Erro", "Não foi possível excluir a categoria.");
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir';
                }
            };
        }
        // --- FIM DA LÓGICA DE GERENCIAR ---

        // --- LÓGICA DE AÇÕES DA TABELA (EDITAR/EXCLUIR) ---
        const mainAppContainer = document.getElementById('page-main-app');
        if (mainAppContainer) {
            mainAppContainer.addEventListener('click', (e) => {

                // --- AÇÃO: Salvar Pessoa (BLOCO FINAL) ---
                const savePersonBtn = e.target.closest('#btn-save-person');
                if (savePersonBtn) {
                    e.preventDefault();

                    // 1. Acha o "painel" da aba onde o botão está
                    const tabContainer = savePersonBtn.closest('#tab-pessoas-add');

                    if (tabContainer) {
                        // 2. Acha o formulário DENTRO desse painel USANDO O ID
                        const form = tabContainer.querySelector('#form-add-person');

                        // 3. Verifica se o formulário foi encontrado
                        if (form) {
                            // 4. CHAMA A FUNÇÃO DE SALVAR
                            handleSavePerson(savePersonBtn, form);
                        } else {
                            // Este erro não deve mais acontecer
                            console.error("ERRO: O querySelector para '#form-add-person' falhou.");
                            showModal("Erro", "Ocorreu um erro ao encontrar o formulário (Ref: F-ID).");
                        }
                    } else {
                        // Este erro também não deve mais acontecer
                        console.error("Botão 'Salvar Pessoa' clicado, mas o 'pai' (tab-pessoas-add) não foi encontrado.");
                        showModal("Erro", "Ocorreu um erro ao encontrar o painel de cadastro (Ref: P-TAB).");
                    }
                    return; // Encerra o clique
                }
                // --- FIM DO BLOCO ---

                // --- AÇÃO: Excluir Produto ---
                const deleteBtn = e.target.closest('.btn-delete-product');
                if (deleteBtn && deleteBtn.dataset.id) {
                    const productId = deleteBtn.dataset.id;
                    console.log("Solicitando exclusão do produto:", productId);
                    showProductDeleteConfirmation(productId);
                    return; // Encerra
                }

                // --- AÇÃO: Editar Produto ---
                const editBtn = e.target.closest('.btn-edit-product');
                if (editBtn && editBtn.dataset.id) {
                    const productId = editBtn.dataset.id;
                    console.log("Solicitando edição do produto:", productId);
                    showEditProductModal(productId);
                    return; // Encerra
                }

                // --- AÇÃO: Remover Item da Venda ---
                const removeSaleItemBtn = e.target.closest('.btn-remove-sale-item');
                if (removeSaleItemBtn && removeSaleItemBtn.dataset.id) {
                    const itemId = removeSaleItemBtn.dataset.id;

                    // Encontra o item no carrinho
                    const itemIndex = currentSaleItems.findIndex(item => item.id === itemId);
                    if (itemIndex === -1) return; // Não achou

                    const item = currentSaleItems[itemIndex];

                    // SE A QUANTIDADE FOR 1, apenas remove
                    if (item.quantity === 1) {
                        currentSaleItems.splice(itemIndex, 1); // Remove o item
                        renderSaleItems();
                        updateSaleTotals();
                    } else {
                        // SE A QUANTIDADE FOR MAIOR QUE 1, pergunta
                        showQuantityDeleteConfirmation(itemId); // Chama o novo modal
                    }
                    return; // Encerra
                }

                // --- AÇÃO: Filtrar por tag de consignação (NOVO) ---
                const consignTag = e.target.closest('.consignment-tag-filter');
                if (consignTag) {
                    e.preventDefault();
                    const clientName = consignTag.dataset.clientName;
                    if (clientName) {
                        const searchInput = document.getElementById('product-search-input');
                        searchInput.value = clientName;
                        // Dispara o evento de input para acionar o filtro
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.focus();
                    }
                    return; // Encerra
                }

                // --- AÇÃO: Filtrar por tag de categoria (NOVO) ---
                const categoryTag = e.target.closest('.category-tag-filter');
                if (categoryTag) {
                    e.preventDefault();
                    const catPath = categoryTag.dataset.categoryPath;
                    if (catPath) {
                        const searchInput = document.getElementById('product-search-input');
                        searchInput.value = catPath;
                        // Dispara o evento de input para acionar o filtro
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.focus();
                    }
                    return; // Encerra
                }

// --- AÇÃO: Gerar Relatório Total (NOVO) ---
            const generateReportBtn = e.target.closest('#btn-generate-total-report');
            if (generateReportBtn) {
                e.preventDefault();
                console.log("Solicitando Relatório Geral...");
                
                // 1. Mostra o modal de carregamento
                showModal("Gerando Relatório", "Calculando balanço do sistema... Por favor, aguarde.");

                // 2. Coleta as opções dos checkboxes
                const options = {
                    includeProducts: document.getElementById('report-include-products').checked,
                    includePeople: document.getElementById('report-include-people').checked,
                    includeBills: document.getElementById('report-include-bills').checked
                };

                // Usamos um setTimeout para dar tempo do modal de "carregando" aparecer
                setTimeout(async () => {
                    try {
                        // 3. Calcula os dados
                        const data = await aggregateTotalReportData();
                        
                        // 4. Desenha o PDF
                        await drawTotalReportPDF(data, options);
                        
                        // 5. Fecha o modal de carregamento
                        hideModal();
                        
                    } catch (error) {
                        console.error("Erro ao gerar relatório geral:", error);
                        showModal("Erro", "Não foi possível gerar o relatório: " + error.message);
                    }
                }, 50); // 50ms de delay
                
                return; // Encerra o clique
            }

                // --- AÇÃO: Excluir Pessoa ---
                const deletePersonBtn = e.target.closest('.btn-delete-person');
                if (deletePersonBtn && deletePersonBtn.dataset.id) {
                    console.log("Solicitando exclusão da pessoa:", deletePersonBtn.dataset.id);
                    showPersonDeleteConfirmation(deletePersonBtn.dataset.id);
                    return; // Encerra
                }

                // --- AÇÃO: Editar Pessoa ---
                const editPersonBtn = e.target.closest('.btn-edit-person');
                if (editPersonBtn && editPersonBtn.dataset.id) {
                    console.log("Solicitando edição da pessoa:", editPersonBtn.dataset.id);
                    showEditPersonModal(editPersonBtn.dataset.id);
                    return; // Encerra
                }

                // --- AÇÃO: Realizar Acerto de Consignação ---
                const settleBtn = e.target.closest('.btn-settle-consignment');
                if (settleBtn && settleBtn.dataset.id) {
                    const consignmentId = settleBtn.dataset.id;
                    console.log("Solicitando acerto da consignação:", consignmentId);
                    showConsignmentSettlementModal(consignmentId); // Chama a tela de acerto (devolução/comissão)
                    return; // Encerra
                }

                // --- AÇÃO: Gerenciar/Editar Itens da Consignação ---
                const manageConsignBtn = e.target.closest('.btn-manage-consignment');
                if (manageConsignBtn && manageConsignBtn.dataset.id) {
                    const consignmentId = manageConsignBtn.dataset.id;
                    console.log("Solicitando edição de itens/data:", consignmentId);
                    showConsignmentEditModal(consignmentId); // Chama a tela de edição de itens/data
                    return; // Encerra
                }

                // --- AÇÃO: Excluir/Cancelar Consignação ---
                const deleteConsignBtn = e.target.closest('.btn-delete-consign');
                if (deleteConsignBtn && deleteConsignBtn.dataset.id) {
                    const consignmentId = deleteConsignBtn.dataset.id;
                    const clientId = deleteConsignBtn.dataset.clientId;
                    console.log("Solicitando cancelamento da consignação:", consignmentId);
                    showConsignmentCancelConfirmation(consignmentId, clientId); // Chama a tela de confirmação de cancelamento
                    return; // Encerra
                }
                // --- AÇÃO: Imprimir Relatório de Consignação (NOVO) ---
                const printConsignBtn = e.target.closest('.btn-print-consign-report');
                if (printConsignBtn && printConsignBtn.dataset.id) {
                    const consignmentId = printConsignBtn.dataset.id;
                    console.log("Solicitando impressão da consignação:", consignmentId);

                    // 1. Encontrar a consignação na cache global 'allSales'
                    const sale = allSales.find(s => s.id === consignmentId);

                    if (sale) {
                        // 2. Precisamos da string YYYY-MM-DD da data de vencimento
                        let dueDateString = '';
                        if (sale.dueDate && sale.dueDate.toDate) {
                            const dateObj = sale.dueDate.toDate(); // Converte Timestamp para Date (JS)
                            dueDateString = formatDateToYYYYMMDD(dateObj); // Usa a nova helper
                        } else {
                            console.warn("Não foi possível encontrar uma data de vencimento válida para o relatório.");
                            dueDateString = formatDateToYYYYMMDD(new Date()); // Usa hoje como fallback
                        }

                        // 3. Mostra o modal de escolha de impressão
                        showPrintConsignConfirmation(sale, dueDateString, false);

                    } else {
                        showModal("Erro", "Não foi possível encontrar os dados da consignação para imprimir.");
                    }
                    return; // Encerra
                }

                // --- AÇÃO: Exportar Consignação para Excel (NOVO) ---
                const exportConsignBtn = e.target.closest('.btn-export-consign-excel');
                if (exportConsignBtn && exportConsignBtn.dataset.id) {
                    const consignmentId = exportConsignBtn.dataset.id;
                    exportConsignmentToExcel(consignmentId);
                    return;
                }

                // --- AÇÃO: Criar Maleta a partir de Consignação (NOVO) ---
                const createMaletaBtn = e.target.closest('.btn-create-maleta-from-consign');
                if (createMaletaBtn && createMaletaBtn.dataset.id) {
                    const consignmentId = createMaletaBtn.dataset.id;
                    const sale = allSales.find(s => s.id === consignmentId);
                    if (sale && sale.items && sale.items.length > 0) {
                        const maletaSimulada = {
                            nome: `Kit de ${sale.clientId || 'Cliente'} (${new Date().toLocaleDateString('pt-BR')})`,
                            items: sale.items.map(item => ({
                                id: item.id,
                                nome: item.nome,
                                ref: item.ref,
                                venda: item.venda,
                                quantity: item.quantity || 1
                            }))
                        };
                        openMaletaModal(maletaSimulada, false);
                    } else {
                        showModal("Erro", "Não foi possível encontrar os itens desta consignação.");
                    }
                    return;
                }

                // --- AÇÃO: Excluir Venda (do Histórico) ---
                const deleteSaleBtn = e.target.closest('.btn-delete-sale');
                if (deleteSaleBtn && deleteSaleBtn.dataset.id) {
                    const saleId = deleteSaleBtn.dataset.id;
                    console.log("Solicitando exclusão da venda:", saleId);
                    showSaleDeleteConfirmation(saleId);
                    return; // Encerra
                }

                // --- AÇÃO: Ver Relatório da Venda ---
                const viewSaleReportBtn = e.target.closest('.btn-view-sale-report');
                if (viewSaleReportBtn && viewSaleReportBtn.dataset.id) {
                    const saleId = viewSaleReportBtn.dataset.id;
                    console.log("Solicitando relatório da venda:", saleId);
                    // Busca a venda na nossa cache global 'allSales'
                    const sale = allSales.find(s => s.id === saleId);
                    if (sale) {
                        generateSaleReportPDF(sale); // Chama a função que gera o PDF
                    } else {
                        showModal("Erro", "Venda não encontrada para gerar relatório.");
                    }
                    return; // Encerra
                }

                // --- AÇÃO: Marcar Conta como Paga ---
                const markPaidBtn = e.target.closest('.btn-mark-paid');
                if (markPaidBtn && markPaidBtn.dataset.id) {
                    const billId = markPaidBtn.dataset.id;
                    console.log("Solicitando marcar conta como paga:", billId);
                    showPaymentMethodModal(billId); // <-- MUDANÇA AQUI: Chama o novo modal
                    return; // Encerra
                }

// --- AÇÃO: Selecionar Todas as Contas (NOVO) ---
            if (e.target.id === 'select-all-bills') {
                const isChecked = e.target.checked;
                const allCheckboxes = document.querySelectorAll('#bills-list-table input.bill-checkbox');
                allCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                return; // Encerra, pois não é um clique em outro botão
            }
            
            // --- AÇÃO: Excluir Contas em Lote (NOVO) ---
            const batchDeleteBillsBtn = e.target.closest('#btn-batch-delete-bills');
            if (batchDeleteBillsBtn) {
                const idsToDelete = getSelectedBillIds();
                if (idsToDelete.length === 0) {
                    showModal("Atenção", "Selecione pelo menos uma conta para excluir.");
                } else {
                    showBatchBillDeleteConfirmation(idsToDelete);
                }
                return;
            }

            // --- AÇÃO: Editar Lançamento Financeiro (Extrato) ---
            const editFinanceEntryBtn = e.target.closest('.btn-edit-finance-entry');
            if (editFinanceEntryBtn && editFinanceEntryBtn.dataset.id) {
                const entryId = editFinanceEntryBtn.dataset.id;
                console.log("Solicitando edição de lançamento financeiro:", entryId);
                showEditFinanceEntryModal(entryId);
                return;
            }

            // --- AÇÃO: Editar Contas em Lote (NOVO) ---
            const batchEditBillsBtn = e.target.closest('#btn-batch-edit-bills');
            if (batchEditBillsBtn) {
                const idsToEdit = getSelectedBillIds();
                if (idsToEdit.length === 0) {
                    showModal("Atenção", "Selecione pelo menos uma conta para editar.");
                } else {
                    showBatchBillEditModal(idsToEdit);
                }
                return;
            }

            // --- AÇÃO: Nova Maleta ---
            const newMaletaBtn = e.target.closest('#btn-new-maleta');
            if (newMaletaBtn) {
                openMaletaModal(null);
                return;
            }

            // --- AÇÃO: Adicionar Maleta à Consignação (da lista) ---
            const addMaletaToSaleBtn = e.target.closest('.btn-add-maleta-to-sale');
            if (addMaletaToSaleBtn && addMaletaToSaleBtn.dataset.id) {
                const maletaId = addMaletaToSaleBtn.dataset.id;
                
                showPage('page-vendas');
                setTimeout(() => {
                    const tabVendasNew = document.querySelector('.vendas-tab-btn[data-tab="tab-vendas-new"]');
                    if (tabVendasNew) tabVendasNew.click();
                    processAddMaletaToSale(maletaId);
                }, 50);
                return;
            }

            // --- AÇÃO: Editar Maleta ---
            const editMaletaBtn = e.target.closest('.btn-edit-maleta');
            if (editMaletaBtn && editMaletaBtn.dataset.id) {
                const maleta = allMaletas.find(m => m.id === editMaletaBtn.dataset.id);
                if(maleta) openMaletaModal(maleta);
                return;
            }

            // --- AÇÃO: Duplicar Maleta ---
            const duplicateMaletaBtn = e.target.closest('.btn-duplicate-maleta');
            if (duplicateMaletaBtn && duplicateMaletaBtn.dataset.id) {
                const maleta = allMaletas.find(m => m.id === duplicateMaletaBtn.dataset.id);
                if(maleta) openMaletaModal(maleta, true);
                return;
            }

            // --- AÇÃO: Excluir Maleta ---
            const deleteMaletaBtn = e.target.closest('.btn-delete-maleta');
            if (deleteMaletaBtn && deleteMaletaBtn.dataset.id) {
                showMaletaDeleteConfirmation(deleteMaletaBtn.dataset.id);
                return;
            }

                // --- AÇÃO: Editar Conta a Pagar (NOVO) ---
                const editBillBtn = e.target.closest('.btn-edit-bill');
                if (editBillBtn && editBillBtn.dataset.id) {
                    const billId = editBillBtn.dataset.id;
                    console.log("Solicitando edição da conta:", billId);
                    showEditBillModal(billId); // Chama a nova função
                    return; // Encerra
                }

                // --- AÇÃO: Excluir Conta a Pagar ---
                const deleteBillBtn = e.target.closest('.btn-delete-bill');
                if (deleteBillBtn && deleteBillBtn.dataset.id) {
                    const billId = deleteBillBtn.dataset.id;
                    console.log("Solicitando exclusão da conta:", billId);
                    showBillDeleteConfirmation(billId); // Chama a função de confirmação
                    return; // Encerra
                }

                // --- AÇÃO: Cancelar Assinatura / Serviço Fixo (NOVO) ---
                const cancelSubBtn = e.target.closest('.btn-cancel-subscription');
                if (cancelSubBtn && cancelSubBtn.dataset.group) {
                    const groupId = cancelSubBtn.dataset.group;
                    const desc = cancelSubBtn.dataset.desc;
                    console.log("Solicitando cancelamento do serviço:", desc);
                    showCancelSubscriptionConfirmation(groupId, desc);
                    return; // Encerra
                }

                // --- AÇÃO: Estornar Conta Paga ---
                const unmarkPaidBtn = e.target.closest('.btn-unmark-paid');
                if (unmarkPaidBtn && unmarkPaidBtn.dataset.id) {
                    const billId = unmarkPaidBtn.dataset.id;
                    console.log("Solicitando estorno da conta:", billId);
                    handleUnmarkBillAsPaid(billId); // Chama a função de estorno
                    return; // Encerra
                }
           

        // --- AÇÃO: Filtrar por tag de Plano de Contas (Financeiro) ---
                const planoTag = e.target.closest('.badge-plano-filter');
                if (planoTag) {
                    e.preventDefault();
                    const planoName = planoTag.dataset.plano;
                    if (planoName) {
                        const filterSelect = document.getElementById('bills-filter-plano');
                        if (filterSelect) {
                           if (filterSelect.value === planoName){
                                filterSelect.value = "Todos"; // Reseta para "Todos" se já estiver selecionado o mesmo plano
                            } else {
                                filterSelect.value = planoName ; // Reseta o filtro se o plano não for encontrado   
                           }
                            // Dispara o evento de 'change' para atualizar a tabela na hora
                            filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    return; // Encerra
                    }
            });
        }

        // --- FIM DA LÓGICA DE AÇÕES ---
        // Event listener para seleção de maletas
        const maletasListTable = document.getElementById('maletas-list-table');
        if (maletasListTable) {
            maletasListTable.addEventListener('change', (e) => {
                if (e.target.classList.contains('maleta-checkbox')) {
                    updateMaletasAverages();
                    const selectAllCb = document.getElementById('select-all-maletas');
                    if (selectAllCb) {
                        const totalCheckboxes = document.querySelectorAll('#maletas-list-table input.maleta-checkbox').length;
                        const checkedCheckboxes = document.querySelectorAll('#maletas-list-table input.maleta-checkbox:checked').length;
                        selectAllCb.checked = totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes;
                    }
                }
            });
        }
        
        const selectAllMaletas = document.getElementById('select-all-maletas');
        if (selectAllMaletas) {
            selectAllMaletas.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('#maletas-list-table input.maleta-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateMaletasAverages();
            });
        }
        // --- LÓGICA DE AÇÕES EM LOTE (PRODUTOS) ---

        const btnBatchDelete = document.getElementById('btn-batch-delete');
        const btnBatchEdit = document.getElementById('btn-batch-edit');
        const selectAllCheckbox = document.getElementById('select-all-products');

        /**
         * Helper: Pega os IDs de todos os produtos selecionados
         */
        function getSelectedProductIds() {
            const selectedCheckboxes = document.querySelectorAll('#product-list-table input.product-checkbox:checked');
            const ids = [];
            selectedCheckboxes.forEach(cb => {
                if (cb.dataset.id) {
                    ids.push(cb.dataset.id);
                }
            });
            return ids;
        }

        // --- Lógica do "Selecionar Todos" ---
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('click', () => {
                const allCheckboxes = document.querySelectorAll('#product-list-table input.product-checkbox');
                allCheckboxes.forEach(cb => {
                    cb.checked = selectAllCheckbox.checked;
                });
                if (typeof updateProductSelectionCounter === 'function') {
                    updateProductSelectionCounter();
                }
            });
        }

        const productListTableEl = document.getElementById('product-list-table');
        if (productListTableEl) {
            productListTableEl.addEventListener('change', (e) => {
                if (e.target.classList.contains('product-checkbox')) {
                    if (typeof updateProductSelectionCounter === 'function') {
                        updateProductSelectionCounter();
                    }
                }
            });
        }

        // --- Lógica do "Excluir em Lote" ---
        if (btnBatchDelete) {
            btnBatchDelete.addEventListener('click', () => {
                const idsToDelete = getSelectedProductIds();

                if (idsToDelete.length === 0) {
                    showModal("Atenção", "Selecione pelo menos um produto para excluir.");
                    return;
                }

                showBatchDeleteConfirmation(idsToDelete);
            });
        }

        /**
         * Mostra o modal de confirmação para EXCLUIR em lote.
         */
        function showBatchDeleteConfirmation(ids) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            modalTitle.textContent = 'Confirmar Exclusão em Lote';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir <strong>${ids.length}</strong> produto(s) selecionado(s)?</p>
        <p class="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir</button>
        </div>
    `;

            modalContainer.style.display = 'flex';

            document.getElementById('btn-confirm-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    // Usar WriteBatch para excluir todos de uma vez
                    const batch = writeBatch(db);
                    const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;

                    ids.forEach(id => {
                        const docRef = doc(db, collectionPath, id);
                        batch.delete(docRef);
                    });

                    await batch.commit(); // Envia o lote

                    hideModal();
                    selectAllCheckbox.checked = false; // Desmarca o "Selecionar Todos"
                    // O onSnapshot vai atualizar a UI!

                } catch (error) {
                    console.error("Erro ao excluir em lote:", error);
                    showModal("Erro", "Não foi possível excluir os produtos.");
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir';
                }
            };
        }

/**
 * Helper: Pega os IDs de todas as CONTAS selecionadas
 */
function getSelectedBillIds() {
    const selectedCheckboxes = document.querySelectorAll('#bills-list-table input.bill-checkbox:checked');
    const ids = [];
    selectedCheckboxes.forEach(cb => {
        if (cb.dataset.id) {
            ids.push(cb.dataset.id);
        }
    });
    return ids;
}

/**
 * Mostra o modal de confirmação para EXCLUIR CONTAS em lote.
 */
function showBatchBillDeleteConfirmation(ids) {
    if (!userId) {
        showModal("Erro", "Usuário não logado.");
        return;
    }

    modalTitle.textContent = 'Confirmar Exclusão em Lote';
    modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir <strong>${ids.length}</strong> conta(s) selecionada(s)?</p>
        <p class="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita. Elas serão removidas permanentemente.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir</button>
        </div>
    `;

    modalContainer.style.display = 'flex';
    document.getElementById('btn-confirm-cancel').onclick = hideModal;

    document.getElementById('btn-confirm-delete').onclick = async () => {
        const deleteBtn = document.getElementById('btn-confirm-delete');
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Excluindo...';

        try {
            const batch = writeBatch(db);
            const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

            ids.forEach(id => {
                const docRef = doc(db, collectionPath, id);
                batch.delete(docRef);
            });

            await batch.commit(); // Envia o lote
            hideModal();
            document.getElementById('select-all-bills').checked = false; 

        } catch (error) {
            console.error("Erro ao excluir contas em lote:", error);
            showModal("Erro", "Não foi possível excluir as contas.");
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Sim, Excluir';
        }
    };
}

/**
 * Mostra o modal de EDIÇÃO de CONTAS em lote.
 */
function showBatchBillEditModal(ids) {
    if (!userId) {
        showModal("Erro", "Usuário não logado.");
        return;
    }
    
    const planoSelectHTML = document.getElementById('bill-plano-contas').innerHTML;

    modalTitle.textContent = `Editar ${ids.length} Conta(s)`;
    modalBody.innerHTML = `
        <form id="form-batch-edit-bills">
            <p class="text-sm text-gray-600 mb-4">Marque os campos que você deseja atualizar para todas as contas selecionadas.</p>
            
            <div class="space-y-4">
                <div class="p-4 border rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="batch-edit-bill-due-date-toggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <label for="batch-edit-bill-due-date-toggle" class="ml-2 block text-sm font-medium">Atualizar Data de Vencimento</label>
                    </div>
                    <div id="batch-edit-bill-due-date-group" class="mt-2 hidden">
                        <label class="block text-sm font-medium">Nova Data de Vencimento</label>
                        <input type="date" id="batch-edit-bill-due-date" class="w-full px-3 py-2 mt-1 border rounded-md">
                    </div>
                </div>

                <div class="p-4 border rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="batch-edit-bill-plano-toggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <label for="batch-edit-bill-plano-toggle" class="ml-2 block text-sm font-medium">Atualizar Plano de Contas</label>
                    </div>
                    <div id="batch-edit-bill-plano-group" class="mt-2 hidden">
                        <select id="batch-edit-bill-plano" class="w-full px-3 py-2 mt-1 border rounded-md">${planoSelectHTML}</select>
                    </div>
                </div>
                
                <div class="p-4 border rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="batch-edit-bill-payment-toggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <label for="batch-edit-bill-payment-toggle" class="ml-2 block text-sm font-medium">Atualizar Forma de Pagamento (Prevista)</label>
                    </div>
                    <div id="batch-edit-bill-payment-group" class="mt-2 hidden">
                        <label class="block text-sm font-medium">Nova Forma de Pagamento</label>
                        <select id="batch-edit-bill-payment-method" class="w-full px-3 py-2 mt-1 border rounded-md">
                            <option value="Não definido">Não definido</option>
                            <option>Pix</option>
                            <option>Cartão de Crédito</option>
                            <option>Boleto</option>
                            <option>Dinheiro</option>
                            <option>Débito em Conta</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mt-6 text-right space-x-2">
                <button type="button" id="btn-cancel-batch-edit-bill" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" id="btn-save-batch-edit-bill" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Atualizar Contas</button>
            </div>
        </form>
    `;

    modalContainer.style.display = 'flex';

    // Lógica interna do modal (mostrar/esconder campos)
    const dueDateToggle = document.getElementById('batch-edit-bill-due-date-toggle');
    const dueDateGroup = document.getElementById('batch-edit-bill-due-date-group');
    dueDateToggle.addEventListener('change', () => dueDateGroup.classList.toggle('hidden', !dueDateToggle.checked));

    const planoToggle = document.getElementById('batch-edit-bill-plano-toggle');
    const planoGroup = document.getElementById('batch-edit-bill-plano-group');
    planoToggle.addEventListener('change', () => planoGroup.classList.toggle('hidden', !planoToggle.checked));

    const paymentToggle = document.getElementById('batch-edit-bill-payment-toggle');
    const paymentGroup = document.getElementById('batch-edit-bill-payment-group');
    paymentToggle.addEventListener('change', () => paymentGroup.classList.toggle('hidden', !paymentToggle.checked));

    // Lógica dos botões
    document.getElementById('btn-cancel-batch-edit-bill').onclick = hideModal;

    document.getElementById('form-batch-edit-bills').onsubmit = async (e) => {
        e.preventDefault();

        const updateDueDate = dueDateToggle.checked;
        const updatePayment = paymentToggle.checked;
        const updatePlano = planoToggle.checked;

        if (!updateDueDate && !updatePayment && !updatePlano) {
            showModal("Atenção", "Marque pelo menos um campo para atualizar.");
            return;
        }

        const saveBtn = document.getElementById('btn-save-batch-edit-bill');
        saveBtn.disabled = true;
        saveBtn.innerHTML = "Atualizando...";

        try {
            const updatedData = {};
            if (updateDueDate) {
                const newDate = document.getElementById('batch-edit-bill-due-date').value;
                if (!newDate) throw new Error("A nova data de vencimento não pode estar vazia.");
                updatedData.vencimento = newDate;
            }
            if (updatePayment) {
                updatedData.paymentMethod = document.getElementById('batch-edit-bill-payment-method').value;
            }
            if (updatePlano) {
                updatedData.planoContas = document.getElementById('batch-edit-bill-plano').value;
            }

            const batch = writeBatch(db);
            const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
            
            for (const id of ids) {
                const docRef = doc(db, collectionPath, id);
                batch.update(docRef, updatedData);
            }

            await batch.commit();
            hideModal();
            document.getElementById('select-all-bills').checked = false;
            showModal("Sucesso!", `${ids.length} contas foram atualizadas.`);

        } catch (error) {
            console.error("Erro ao editar contas em lote:", error);
            showModal("Erro", "Não foi possível atualizar as contas: " + error.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Atualizar Contas';
        }
    };
}
        // --- Lógica do "Editar em Lote" ---
        if (btnBatchEdit) {
            btnBatchEdit.addEventListener('click', () => {
                const idsToEdit = getSelectedProductIds();

                if (idsToEdit.length === 0) {
                    showModal("Atenção", "Selecione pelo menos um produto para editar.");
                    return;
                }

                showBatchEditModal(idsToEdit);
            });
        }

        /**
         * Mostra o modal de EDIÇÃO em lote.
         */
        function showBatchEditModal(ids) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // Pegar a lista de categorias do <select> principal para replicar no modal
            const categorySelectHTML = document.getElementById('prod-categoria').innerHTML;
            // Pega a lista de fornecedores do <select> principal
            const supplierSelectHTML = document.getElementById('prod-fornecedor').innerHTML; // <-- ADICIONE ESTA LINHA


            modalTitle.textContent = `Editar ${ids.length} Produto(s)`;
            modalBody.innerHTML = `
        <form id="form-batch-edit">
            <p class="text-sm text-gray-600 mb-4">Marque os campos que você deseja atualizar para todos os produtos selecionados. Campos desmarcados não serão alterados.</p>
            
            <div class="space-y-4">
                <!-- Atualizar Categoria -->
                <div class="p-4 border rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="batch-edit-cat-toggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <label for="batch-edit-cat-toggle" class="ml-2 block text-sm font-medium">Atualizar Categoria</label>
                    </div>
                    <div id="batch-edit-cat-group" class="mt-2 hidden">
                        <label class="block text-sm font-medium">Nova Categoria</label>
                        <select id="batch-edit-categoria" class="w-full px-3 py-2 mt-1 border rounded-md">
                            ${categorySelectHTML}
                        </select>
                    </div>
                </div>
                
                <!-- Atualizar Margem -->
                <div class="p-4 border rounded-lg">
                    <div class="flex items-center">
                        <input type="checkbox" id="batch-edit-margin-toggle" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <label for="batch-edit-margin-toggle" class="ml-2 block text-sm font-medium">Atualizar Margem de Lucro</Elabel>
                    </div>
                    <div id="batch-edit-margin-group" class="mt-2 hidden">
                        <label class="block text-sm font-medium">Nova Margem (%)</Elabel>
                        <input type="number" id="batch-edit-margem" class="w-full px-3 py-2 mt-1 border rounded-md" placeholder="Ex: 100">
                        <p class="text-xs text-gray-500 mt-1">O preço de venda será recalculado (requer leitura de dados).</p>
                    </div>
                </div>
            </div>

            <div class="mt-6 text-right space-x-2">
                <button type="button" id="btn-cancel-batch-edit" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" id="btn-save-batch-edit" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Atualizar Produtos</button>
            </div>
        </form>
    `;

            modalContainer.style.display = 'flex';

            // Lógica interna do modal (mostrar/esconder campos)
            const catToggle = document.getElementById('batch-edit-cat-toggle');
            const catGroup = document.getElementById('batch-edit-cat-group');
            catToggle.addEventListener('change', () => catGroup.classList.toggle('hidden', !catToggle.checked));

            const marginToggle = document.getElementById('batch-edit-margin-toggle');
            const marginGroup = document.getElementById('batch-edit-margin-group');
            marginToggle.addEventListener('change', () => marginGroup.classList.toggle('hidden', !marginToggle.checked));

            // Lógica dos botões
            document.getElementById('btn-cancel-batch-edit').onclick = hideModal;

            document.getElementById('form-batch-edit').onsubmit = async (e) => {
                e.preventDefault();

                const updateCat = catToggle.checked;
                const updateMargin = marginToggle.checked;

                if (!updateCat && !updateMargin) {
                    showModal("Atenção", "Marque pelo menos um campo (Categoria ou Margem) para atualizar.");
                    return;
                }

                const saveBtn = document.getElementById('btn-save-batch-edit');
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Atualizando`;

                const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                const batch = writeBatch(db);

                try {
                    const updatedData = {};

                    // --- Preparar dados da Categoria (Simples) ---
                    if (updateCat) {
                        updatedData.categoria = document.getElementById('batch-edit-categoria').value;
                    }

                    // --- Preparar dados da Margem (Complexo: requer leitura) ---
                    if (updateMargin) {
                        const newMargem = parseFloat(document.getElementById('batch-edit-margem').value);
                        if (isNaN(newMargem)) {
                            throw new Error("Valor da margem é inválido.");
                        }

                        // Precisamos ler cada produto para saber o CUSTO antes de atualizar
                        // a margem e o preço de venda.
                        for (const id of ids) {
                            const docRef = doc(db, collectionPath, id);
                            const docSnap = await getDoc(docRef); // Causa 1 leitura por item!

                            if (docSnap.exists()) {
                                const product = docSnap.data();
                                const custo = product.custo || 0;
                                const newVenda = custo * (1 + (newMargem / 100));

                                // Adiciona ao lote (batch)
                                batch.update(docRef, {
                                    ...updatedData, // Adiciona a categoria (se marcada)
                                    margem: newMargem,
                                    venda: newVenda
                                });
                            }
                        }
                    } else if (updateCat) {
                        // Se só atualizou a categoria (sem margem), faz um update simples
                        for (const id of ids) {
                            const docRef = doc(db, collectionPath, id);
                            batch.update(docRef, updatedData); // updatedData só contém a categoria
                        }
                    }

                    // Envia o lote
                    await batch.commit();

                    hideModal();
                    selectAllCheckbox.checked = false; // Desmarca o "Selecionar Todos"
                    // O onSnapshot vai atualizar a UI!

                } catch (error) {
                    console.error("Erro ao editar em lote:", error);
                    showModal("Erro", "Não foi possível atualizar os produtos: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = 'Atualizar Produtos';
                }
            };
        }
        // --- FIM DAS AÇÕES EM LOTE ---
        // --- LÓGICA DE EXCLUIR PESSOA ---
        function showPersonDeleteConfirmation(personId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Pergunta ao usuário
            modalTitle.textContent = 'Confirmar Exclusão';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir esta pessoa?</p>
        <p class="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir</button>
        </div>
    `;

            // 2. Mostra o modal
            modalContainer.style.display = 'flex';

            // 3. Listeners da confirmação
            document.getElementById('btn-confirm-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    // Caminho do documento
                    const collectionPath = `artifacts/${appId}/users/${userId}/pessoas`;
                    const docRef = doc(db, collectionPath, personId);

                    // Exclui do Firebase
                    await deleteDoc(docRef);

                    hideModal();
                    // O 'onSnapshot' (loadPeople) vai
                    // atualizar a lista automaticamente!

                } catch (error) {
                    console.error("Erro ao excluir pessoa:", error);
                    showModal("Erro", "Não foi possível excluir a pessoa.");
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir';
                }
            };
        }
        // --- FIM EXCLUIR PESSOA ---
        // --- LÓGICA DE EDITAR PESSOA ---
        async function showEditPersonModal(personId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Buscar os dados da pessoa
            try {
                const collectionPath = `artifacts/${appId}/users/${userId}/pessoas`;
                const docRef = doc(db, collectionPath, personId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    showModal("Erro", "Pessoa não encontrada. Pode ter sido excluída.");
                    return;
                }

                const person = docSnap.data();

                // 3. Montar o HTML do formulário de edição (baseado no form-add-person)
                modalTitle.textContent = 'Editar Pessoa';
                modalBody.innerHTML = `
            <form id="form-edit-person">
                <h3 class="text-lg font-medium">Dados da Pessoa</h3>
                <div class="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
                    <!-- Campos Obrigatórios -->
                    <div class="md:col-span-3">
                        <label class="block text-sm font-medium">Tipo de Cadastro</label>
                        <select id="edit-person-type" required class="w-full px-3 py-2 mt-1 border rounded-md md:w-1/3">
                            <option value="cliente">Cliente Direto</option>
                            <option value="revendedor">Revendedor</option>
                            <option value="fornecedor">Fornecedor</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Nome Completo</label>
                        <input type="text" id="edit-person-name" name="edit-person-name" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.nome || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Email</label>
                        <input type="email" id="edit-person-email" name="edit-person-email" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.email || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Telefone</label>
                        <input type="tel" id="edit-person-phone" name="edit-person-phone" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.telefone || ''}">
                    </div>
                    <div class="md:col-span-3">
                        <label class="block text-sm font-medium">Endereço</label>
                        <input type="text" id="edit-person-address" name="edit-person-address" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.endereco || ''}">
                    </div>
                    
                    <!-- Campos Opcionais -->
                    <hr class="md:col-span-3">
                    <h3 class="text-lg font-medium md:col-span-3">Dados Adicionais (Opcional)</h3>
                    <div>
                        <label class="block text-sm font-medium">CPF</label>
                        <input type="text" id="edit-person-cpf" class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.cpf || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">RG</label>
                        <input type="text" id="edit-person-rg" class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.rg || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Instagram</label>
                        <input type="text" id="edit-person-insta" class="w-full px-3 py-2 mt-1 border rounded-md" value="${person.instagram || ''}">
                    </div>
                </div>
                <div class="mt-6 text-right space-x-2">
                    <button type="button" id="btn-cancel-edit-person" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                    <button type="submit" id="btn-save-edit-person" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Atualizar Pessoa</button>
                </div>
            </form>
        `;

                // 4. Mostrar o Modal
                modalContainer.style.display = 'flex';

                // 5. Seta o valor correto do <select>
                document.getElementById('edit-person-type').value = person.tipo;

                // 6. Adicionar listeners aos botões do Modal
                document.getElementById('btn-cancel-edit-person').onclick = hideModal;

                document.getElementById('form-edit-person').onsubmit = async (e) => {
                    e.preventDefault();

                    const saveBtn = document.getElementById('btn-save-edit-person');
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Atualizando`;

                    try {
                        // Monta o objeto atualizado
                        const updatedPerson = {
                            nome: document.getElementById('edit-person-name').value,
                            email: document.getElementById('edit-person-email').value,
                            telefone: document.getElementById('edit-person-phone').value,
                            endereco: document.getElementById('edit-person-address').value,
                            tipo: document.getElementById('edit-person-type').value,
                            cpf: document.getElementById('edit-person-cpf').value || null,
                            rg: document.getElementById('edit-person-rg').value || null,
                            instagram: document.getElementById('edit-person-insta').value || null,
                            // Não atualizamos o createdAt
                        };

                        // Validação
                        if (!updatedPerson.nome || !updatedPerson.email || !updatedPerson.telefone || !updatedPerson.endereco) {
                            throw new Error("Campos obrigatórios (Nome, Email, Tel, Endereço) não podem estar vazios.");
                        }

                        // Envia a atualização (usando o docRef original)
                        await updateDoc(docRef, updatedPerson);

                        hideModal();
                        // O onSnapshot (loadPeople) vai atualizar a UI automaticamente!

                    } catch (error) {
                        console.error("Erro ao atualizar pessoa:", error);
                        showModal("Erro", "Falha ao atualizar: " + error.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Atualizar Pessoa';
                    }
                };

            } catch (error) {
                console.error("Erro ao buscar pessoa para edição: ", error);
                showModal("Erro", "Não foi possível carregar os dados desta pessoa.");
            }
        }
        // --- FIM EDITAR PESSOA ---
        // --- LÓGICA DE EXCLUIR VENDA ---
        function showSaleDeleteConfirmation(saleId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Busca a venda na cache para mostrar detalhes
            const sale = allSales.find(s => s.id === saleId);
            if (!sale) {
                showModal("Erro", "Venda não encontrada na lista atual.");
                return;
            }

            // 2. Pergunta ao usuário
            modalTitle.textContent = 'Confirmar Exclusão da Venda';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir esta venda (${sale.type}) para "${sale.clientId || 'Consumidor Final'}"?</p>
        <p class="font-medium text-red-600 mt-2">Esta ação irá:</p>
        <ul class="list-disc list-inside text-sm text-red-600">
            <li>Excluir o registro da venda.</li>
            <li>Devolver os itens vendidos ao estoque.</li>
            <li>Excluir o lançamento financeiro associado (se houver).</li>
        </ul>
        <p class="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir Venda</button>
        </div>
    `;

            // 3. Mostra o modal
            modalContainer.style.display = 'flex';

            // 4. Listeners da confirmação
            document.getElementById('btn-confirm-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    await handleDeleteSale(sale); // Chama a função principal de exclusão
                    hideModal();
                    // O 'onSnapshot' (loadSalesHistory, loadFinancialHistory, loadProducts)
                    // vai atualizar tudo automaticamente!

                } catch (error) {
                    console.error("Erro ao excluir venda:", error);
                    showModal("Erro", "Não foi possível excluir a venda: " + error.message);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir Venda';
                }
            };
        }
        // --- FIM EXCLUIR VENDA (Confirmação) ---
        // --- LÓGICA DE EXCLUIR VENDA (Ação Principal) ---
        async function handleDeleteSale(sale) {
            if (!userId || !sale || !sale.id) {
                throw new Error("Dados inválidos para exclusão da venda.");
            }

            const batch = writeBatch(db);
            const productCollectionPath = `artifacts/${appId}/users/${userId}/produtos`;
            const saleCollectionPath = `artifacts/${appId}/users/${userId}/vendas`;
            const financeCollectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

            // --- 1. VERIFICAR QUAIS PRODUTOS AINDA EXISTEM ANTES DE ATUALIZAR ---
            const productsToUpdate = [];
            if (sale.items && sale.items.length > 0) {
                // Loop de Verificação (Leitura)
                for (const item of sale.items) {
                    // Verificamos se o item.id é válido
                    if (item.id) {
                        const productRef = doc(db, productCollectionPath, item.id);
                        try {
                            const productSnap = await getDoc(productRef);
                            if (productSnap.exists()) {
                                // Se o produto existe, guardamos a ref e a quantidade a devolver
                                productsToUpdate.push({ ref: productRef, qty: item.quantity || 1 });
                            } else {
                                // O produto foi deletado, apenas loga e ignora
                                console.warn(`Produto ${item.id} da venda ${sale.id} não existe mais. Estoque não será devolvido.`);
                            }
                        } catch (readError) {
                            console.error(`Erro ao verificar produto ${item.id}:`, readError);
                            // Não para o processo, apenas não devolve o estoque deste item
                        }
                    } else {
                        console.warn("Item da venda sem ID:", item);
                    }
                }
            }

            // --- 2. Devolver itens ao estoque (APENAS OS QUE EXISTEM) ---
            // Loop de Escrita (dentro do Batch)
            productsToUpdate.forEach(p => {
                batch.update(p.ref, {
                    estoque: increment(p.qty)
                });
            });

            // --- 3. Excluir o lançamento financeiro associado (se houver) ---
            const financeQuery = query(
                collection(db, financeCollectionPath),
                where("saleId", "==", sale.id),
                where("ownerId", "==", userId)
            );

            const financeSnapshot = await getDocs(financeQuery); // Leitura
            if (!financeSnapshot.empty) {
                financeSnapshot.forEach(financeDoc => {
                    console.log("Excluindo lançamento financeiro associado:", financeDoc.id);
                    batch.delete(financeDoc.ref); // Escrita
                });
            } else {
                console.log("Nenhum lançamento financeiro encontrado para a venda:", sale.id);
            }

            // --- 4. Excluir o documento da venda ---
            const saleRef = doc(db, saleCollectionPath, sale.id);
            batch.delete(saleRef); // Escrita

            // --- 5. Executar o Lote ---
            await batch.commit();
            console.log("Venda e operações associadas excluídas com sucesso:", sale.id);
        }
        // --- FIM EXCLUIR VENDA (Ação Principal) ---
        // --- LÓGICA DE MARCAR CONTA COMO PAGA (COM MODAL) ---
        function showPaymentMethodModal(billId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Encontra a conta na cache
            const bill = allFinancialEntries.find(entry => entry.id === billId);
            if (!bill) {
                showModal("Erro", "Não foi possível encontrar a conta para pagar.");
                return;
            }

            // 2. Constrói o HTML do Modal
            modalTitle.textContent = 'Confirmar Pagamento da Conta';
            modalBody.innerHTML = `
        <p class="text-sm text-gray-600">Confirme o pagamento para:</p>
        <p class="text-lg font-medium my-2">${bill.descricao}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
                <label for="bill-payment-value" class="block text-sm font-medium">Valor Total Pago (R$)</label>
                <input type="number" step="0.01" id="bill-payment-value" class="w-full px-3 py-2 mt-1 border rounded-md font-bold text-lg text-red-600" value="${bill.valor.toFixed(2)}" required>
                <p class="text-xs text-gray-500 mt-1">Previsto: R$ ${bill.valor.toFixed(2).replace('.', ',')}</p>
            </div>
            <div>
                <label for="bill-payment-date" class="block text-sm font-medium">Data do Pagamento</label>
                <input type="date" id="bill-payment-date" class="w-full px-3 py-2 mt-1 border rounded-md" required>
            </div>
        </div>

        <div class="mt-4">
            <label class="block text-sm font-medium mb-2">Formas de Pagamento</label>
            <div id="payment-splits-container" class="space-y-2">
                <!-- JS vai popular -->
            </div>
            <button type="button" id="btn-add-payment-split" class="mt-2 text-sm text-indigo-600 hover:underline font-medium flex items-center">
                <i data-lucide="plus" class="w-4 h-4 mr-1"></i> Adicionar outra forma
            </button>
            <p id="split-error" class="text-xs text-red-600 mt-1 hidden"></p>
        </div>
        
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-cancel-pay" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-pay" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Confirmar Pagamento</button>
        </div>
    `;

            // 3. Mostra o Modal
            modalContainer.style.display = 'flex';
            document.getElementById('bill-payment-date').value = formatDateToYYYYMMDD(new Date());
            
            const container = document.getElementById('payment-splits-container');
            const btnAddSplit = document.getElementById('btn-add-payment-split');
            const totalInput = document.getElementById('bill-payment-value');
            const errorP = document.getElementById('split-error');

            function addSplitRow(method, value) {
                const row = document.createElement('div');
                row.className = 'flex items-center space-x-2 split-row';
                row.innerHTML = `
                    <select class="split-method flex-1 px-3 py-2 border rounded-md">
                        <option value="Dinheiro" ${method === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                        <option value="Pix" ${method === 'Pix' ? 'selected' : ''}>Pix</option>
                        <option value="Transferência Bancária" ${method === 'Transferência Bancária' ? 'selected' : ''}>Transferência Bancária</option>
                        <option value="Cartão de Crédito" ${method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                        <option value="Cartão de Débito" ${method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                        <option value="Boleto" ${method === 'Boleto' ? 'selected' : ''}>Boleto</option>
                    </select>
                    <input type="number" step="0.01" class="split-value w-32 px-3 py-2 border rounded-md" value="${value.toFixed(2)}">
                    <button type="button" class="btn-remove-split text-red-500 hover:text-red-700 px-2">
                        <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                `;
                container.appendChild(row);
                lucide.createIcons();
                row.querySelector('.btn-remove-split').onclick = () => row.remove();
            }

            // Inicializa com uma linha
            addSplitRow(bill.paymentMethod || 'Dinheiro', bill.valor);

            btnAddSplit.onclick = () => addSplitRow('Pix', 0);

            setupTwoSplitsLogic(
                container,
                '.split-row',
                '.split-value',
                () => parseFloat(totalInput.value) || 0
            );

            totalInput.addEventListener('input', () => {
                const splitRows = container.querySelectorAll('.split-row');
                if (splitRows.length === 1) {
                    const valInput = splitRows[0].querySelector('.split-value');
                    if (valInput) valInput.value = parseFloat(totalInput.value || 0).toFixed(2);
                }
            });

            // 4. Ligar os botões do modal
            document.getElementById('btn-cancel-pay').onclick = hideModal;

            document.getElementById('btn-confirm-pay').onclick = async () => {
                const saveBtn = document.getElementById('btn-confirm-pay');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Pagando...';
                errorP.classList.add('hidden');
                
                const newValor = parseFloat(totalInput.value);
                const paymentDateStr = document.getElementById('bill-payment-date').value;

                if (isNaN(newValor) || newValor <= 0) {
                    showModal("Erro", "O valor pago deve ser maior que zero.");
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Confirmar Pagamento';
                    return;
                }
                
                if (!paymentDateStr) {
                    showModal("Erro", "A data de pagamento é obrigatória.");
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Confirmar Pagamento';
                    return;
                }
                
                const splitRows = container.querySelectorAll('.split-row');
                const paymentSplits = [];
                let splitsTotal = 0;

                splitRows.forEach(row => {
                    const method = row.querySelector('.split-method').value;
                    const val = parseFloat(row.querySelector('.split-value').value) || 0;
                    if (val > 0) {
                        paymentSplits.push({ method, value: val });
                        splitsTotal += val;
                    }
                });

                if (paymentSplits.length === 0) {
                    errorP.textContent = "Adicione pelo menos uma forma de pagamento com valor maior que zero.";
                    errorP.classList.remove('hidden');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Confirmar Pagamento';
                    return;
                }

                if (Math.abs(splitsTotal - newValor) > 0.01) {
                    errorP.textContent = `A soma das formas de pagamento (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao Valor Total (R$ ${newValor.toFixed(2)}).`;
                    errorP.classList.remove('hidden');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Confirmar Pagamento';
                    return;
                }

                let mainPaymentMethod = paymentSplits.length === 1 ? paymentSplits[0].method : 'Múltiplas Formas';

                try {
                    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                    const billRef = doc(db, collectionPath, billId);
                    
                    const dateObj = new Date(paymentDateStr + 'T00:00:00');
                    const paymentDateTimestamp = Timestamp.fromDate(dateObj);

                    await updateDoc(billRef, {
                        pago: true,
                        data: paymentDateTimestamp, // Atualiza a data para a escolhida
                        paymentMethod: mainPaymentMethod,
                        paymentSplits: paymentSplits,
                        valor: newValor // Salva o novo valor (com juros/desconto)
                    });

                    hideModal();
                    showModal("Sucesso!", "Conta marcada como paga e registrada com sucesso.");
                    // O onSnapshot (loadFinancialHistory) vai atualizar as tabelas!

                } catch (error) {
                    console.error("Erro ao marcar conta como paga:", error);
                    showModal("Erro", "Não foi possível marcar a conta como paga: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Confirmar Pagamento';
                }
            };
        }
        // --- FIM MARCAR CONTA COMO PAGA ---
        /**
         * Estorna uma conta (marca como NÃO paga)
         */
        async function handleUnmarkBillAsPaid(billId) {
            if (!userId || !billId) {
                showModal("Erro", "ID da conta inválido para estornar.");
                return;
            }

            try {
                const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                const billRef = doc(db, collectionPath, billId);

                // Simplesmente define 'pago' como false
                // O 'vencimento' original ainda está lá, então ela voltará para a lista A Pagar
                await updateDoc(billRef, {
                    pago: false
                });

                showModal("Sucesso!", "Conta estornada e movida de volta para 'A Pagar'.");
                // O onSnapshot (loadFinancialHistory) vai atualizar as tabelas automaticamente!

            } catch (error) {
                console.error("Erro ao estornar conta:", error);
                showModal("Erro", "Não foi possível estornar a conta: " + error.message);
            }
        }
        // --- FIM ESTORNAR CONTA ---

        // --- LÓGICA DE EXCLUIR CONTA (Confirmação) ---
        function showBillDeleteConfirmation(billId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Busca a conta na cache (allFinancialEntries)
            const bill = allFinancialEntries.find(entry => entry.id === billId);
            if (!bill) {
                showModal("Erro", "Conta não encontrada na lista atual.");
                return;
            }

            // 2. Pergunta ao usuário
            modalTitle.textContent = 'Confirmar Exclusão da Conta';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir a conta:</p>
        <p class="mt-2 text-lg font-bold">"${bill.descricao}" - R$ ${bill.valor.toFixed(2).replace('.', ',')}</p>
        <p class="font-medium text-red-600 mt-2">Esta ação não pode ser desfeita.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir Conta</button>
        </div>
    `;

            // 3. Mostra o modal
            modalContainer.style.display = 'flex';

            // 4. Listeners da confirmação
            document.getElementById('btn-confirm-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    await handleDeleteBill(billId); // Chama a função principal de exclusão
                    hideModal();
                    // O 'onSnapshot' (loadFinancialHistory) vai atualizar tudo automaticamente!

                } catch (error) {
                    console.error("Erro ao excluir conta:", error);
                    showModal("Erro", "Não foi possível excluir a conta: " + error.message);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir Conta';
                }
            };
        }
        // --- FIM EXCLUIR CONTA (Confirmação) ---

        // --- LÓGICA DE ATUALIZAÇÃO DO DASHBOARD (FINAL E CORRIGIDA) ---

        function updateDashboard() {
            console.log("--- Iniciando Atualização do Dashboard ---");

            // Elementos do Dashboard
            const warningsCountEl = document.getElementById('dashboard-warnings-count');
            const warningsDetailsEl = document.getElementById('dashboard-warnings-details');
            const warningsListEl = document.getElementById('dashboard-warnings-list');
            const warningsPlaceholderEl = document.getElementById('dashboard-warnings-placeholder');
            const salesValueEl = document.getElementById('dashboard-sales-value');
            const salesCountEl = document.getElementById('dashboard-sales-count');
            const balanceValueEl = document.getElementById('dashboard-balance-value');
            const balanceDetailsEl = document.getElementById('dashboard-balance-details');
            const lowstockCountEl = document.getElementById('dashboard-lowstock-count');

            // Funções Helper
            const formatCurrency = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;

            // Datas de Comparação em UTC (Corrigindo o fuso horário)
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);
            const tenDaysFromNowUTC = new Date(todayUTC);
            tenDaysFromNowUTC.setUTCDate(todayUTC.getUTCDate() + 10);

            console.log(`Data de Hoje (UTC para filtro): ${todayUTC.toISOString().split('T')[0]}`);
            console.log(`Data Limite Avisos (UTC + 10 dias): ${tenDaysFromNowUTC.toISOString().split('T')[0]}`);

            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            let warningItems = [];
            let consignmentsDueCount = 0;
            let billsDueCount = 0;

            // --- 1. Calcular Avisos ---

            // a) Consignações vencendo
            console.log(`Verificando ${allSales.length} vendas/consignações...`);
            allSales.forEach(sale => {
                if (sale.type === 'consignacao' && sale.status === 'Ativa' && sale.dueDate) {
                    // Cria a data de vencimento em UTC
                    const dueDateUTC = new Date(sale.dueDate + 'T00:00:00Z'); // 'Z' garante que seja UTC

                    // Compara (se a data de vencimento for HOJE ou antes de 10 dias)
                    if (dueDateUTC <= tenDaysFromNowUTC) {
                        console.log(`AVISO CONSIGNAÇÃO: ${sale.clientId} vence em ${sale.dueDate}`);
                        consignmentsDueCount++;
                        const diffTime = dueDateUTC.getTime() - todayUTC.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let daysText = diffDays === 0 ? 'vence hoje' : (diffDays === 1 ? 'vence amanhã' : `vence em ${diffDays} dias`);
                        if (diffDays < 0) daysText = `venceu há ${Math.abs(diffDays)} dia(s)`;

                        warningItems.push({
                            type: 'consign',
                            date: dueDateUTC,
                            text: `Acerto Consignação (${sale.clientId || 'N/D'}) ${daysText}.`,
                            class: 'text-red-700 bg-red-50',
                            targetPage: 'page-vendas',
                            targetTab: 'tab-vendas-consign'
                        });
                    }
                }
            });

            // b) Contas a Pagar vencendo
            console.log(`Verificando ${allFinancialEntries.length} lançamentos financeiros...`);
            allFinancialEntries.forEach(entry => {
                if (entry.tipo === 'Saída' && !entry.pago && entry.vencimento) {
                    // Cria a data de vencimento em UTC
                    const dueDateUTC = new Date(entry.vencimento + 'T00:00:00Z'); // 'Z' garante que seja UTC

                    // Compara
                    if (dueDateUTC <= tenDaysFromNowUTC) {
                        console.log(`AVISO CONTA: ${entry.descricao} VENCE EM ${entry.vencimento}`);
                        billsDueCount++;
                        const diffTime = dueDateUTC.getTime() - todayUTC.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        let daysText = diffDays === 0 ? 'vence hoje' : (diffDays === 1 ? 'vence amanhã' : `vence em ${diffDays} dias`);
                        if (diffDays < 0) daysText = `venceu há ${Math.abs(diffDays)} dia(s)`;

                        warningItems.push({
                            type: 'bill',
                            date: dueDateUTC,
                            text: `Conta "${entry.descricao}" ${daysText}.`,
                            class: diffDays < 0 ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50',
                            targetPage: 'page-financeiro',
                            targetTab: 'tab-financeiro-bills'
                        });
                    } else {
                        // LOG DE CONTA OK
                        console.log(`Conta ${entry.descricao} está OK (vence depois de ${tenDaysFromNowUTC.toISOString().split('T')[0]})`);
                    }
                }
            });

            // Atualiza Card de Avisos
            const totalWarnings = consignmentsDueCount + billsDueCount;
            if (warningsCountEl) warningsCountEl.textContent = totalWarnings;
            if (warningsDetailsEl) warningsDetailsEl.textContent = `${consignmentsDueCount} acerto(s), ${billsDueCount} conta(s)`;

            // Atualiza Lista de Avisos
            if (warningsListEl) {
                warningsListEl.innerHTML = '';
                if (totalWarnings === 0) {
                    warningsListEl.innerHTML = '<li id="dashboard-warnings-placeholder" class="text-sm text-gray-500">Nenhum aviso importante no momento.</li>';
                } else {
                    warningItems.sort((a, b) => a.date - b.date);
                    warningItems.forEach(item => {
                        const li = document.createElement('li');
                        li.className = `flex items-center p-3 space-x-3 rounded-md cursor-pointer hover:bg-gray-200 ${item.class}`;
                        li.dataset.targetPage = item.targetPage;
                        li.dataset.targetTab = item.targetTab;

                        li.innerHTML = `
                    <i data-lucide="${item.type === 'consign' ? 'calendar-clock' : 'file-text'}"></i>
                    <span>${item.text}</span>
                `;
                        warningsListEl.appendChild(li);
                    });
                    lucide.createIcons();
                }
            }

            // --- 2. Calcular Vendas do Mês --- (Código igual)
            let monthlySalesValue = 0;
            let monthlySalesCount = 0;
            allSales.forEach(sale => {
                if (sale.createdAt && sale.createdAt.toDate) {
                    const saleDate = sale.createdAt.toDate();
                    if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {

                        if (sale.type === 'direta' && sale.status === 'Finalizada') {
                            monthlySalesCount++;
                            monthlySalesValue += sale.total;
                        } else if (sale.type === 'consignacao' && sale.status === 'Finalizada' && sale.settlement) {
                            monthlySalesCount++;
                            monthlySalesValue += sale.settlement.totalSold;
                        }
                    }
                }
            });
            if (salesValueEl) salesValueEl.textContent = formatCurrency(monthlySalesValue);
            if (salesCountEl) salesCountEl.textContent = `${monthlySalesCount} venda(s) realizada(s)`;

            // --- 3. Calcular Caixa do Mês --- 
            let monthlyRevenue = 0;
            let monthlyExpenses = 0;
            allFinancialEntries.forEach(entry => {
                if (entry.data && entry.data.toDate) {
                    const entryDate = entry.data.toDate();
                    if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
                        if (entry.tipo === 'Entrada') {
                            monthlyRevenue += entry.valor;
                        } else if (entry.tipo === 'Saída' && entry.pago === true) {
                            monthlyExpenses += entry.valor;
                        }
                    }
                }
            });
            const monthlyBalance = monthlyRevenue - monthlyExpenses;

            if (balanceValueEl) balanceValueEl.textContent = formatCurrency(monthlyBalance);
            if (balanceDetailsEl) balanceDetailsEl.textContent = `Ent: ${formatCurrency(monthlyRevenue)}, Saí: ${formatCurrency(monthlyExpenses)}`;

            // Ajusta cor do saldo
            balanceValueEl.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
            if (monthlyBalance > 0) {
                balanceValueEl.classList.add('text-green-600');
            } else if (monthlyBalance < 0) {
                balanceValueEl.classList.add('text-red-600');
            } else {
                balanceValueEl.classList.add('text-blue-600');
            }


            // --- 4. Calcular Estoque Zerado/Baixo --- (Código igual)
            let lowStockCount = 0;
            allUserProducts.forEach(prod => {
                if (prod.estoque <= 5) {
                    lowStockCount++;
                }
            });
            if (lowstockCountEl) lowstockCountEl.textContent = lowStockCount;

            console.log("--- Finalizando Atualização do Dashboard ---");
        }
        // --- FIM DA ATUALIZAÇÃO DO DASHBOARD ---
        // --- LÓGICA DE NAVEGAÇÃO DO DASHBOARD ---
        const dashboardPage = document.getElementById('page-dashboard');

        if (dashboardPage) {
            dashboardPage.addEventListener('click', (e) => {
                let targetPage = null;
                let targetTab = null;

                // 1. Verifica clique nos CARDS
                const cardVendas = e.target.closest('#card-link-vendas');
                const cardFinanceiro = e.target.closest('#card-link-financeiro');
                const cardProdutos = e.target.closest('#card-link-produtos');
                const widgetProdutos = e.target.closest('#widget-link-produtos'); // Widget de estoque baixo

                // 2. Verifica clique nos AVISOS (<li>)
                const warningLi = e.target.closest('#dashboard-warnings-list li[data-target-page]');
                // 3. Verifica clique nos botões de AÇÃO RÁPIDA
                const actionBtn = e.target.closest('.dashboard-action-btn');
                const newBillBtn = e.target.closest('#btn-dashboard-new-bill');
                const newIncomeBtn = e.target.closest('#btn-dashboard-new-income');
                const newTransferBtn = e.target.closest('#btn-dashboard-new-transfer');

                if (newTransferBtn) {
                    e.preventDefault();
                    showPage('page-financeiro');
                    setTimeout(() => {
                        const tabButton = document.querySelector('#page-financeiro button[data-tab="tab-financeiro-history"]');
                        if (tabButton) tabButton.click();
                        
                        // Aciona o clique no botão original de transferência
                        const btnNewTransferOriginal = document.getElementById('btn-new-transfer');
                        if (btnNewTransferOriginal) btnNewTransferOriginal.click();
                    }, 50);
                    return;
                }

                if (newIncomeBtn) {
                    e.preventDefault();
                    showPage('page-financeiro');
                    setTimeout(() => {
                        const tabButton = document.querySelector('#page-financeiro button[data-tab="tab-financeiro-history"]');
                        if (tabButton) tabButton.click();
                        
                        // Aciona o clique no botão original de nova entrada
                        const btnNewIncomeOriginal = document.getElementById('btn-new-income');
                        if (btnNewIncomeOriginal) btnNewIncomeOriginal.click();
                    }, 50);
                    return;
                }

                if (newBillBtn) {
                    e.preventDefault();
                    showPage('page-financeiro');
                    setTimeout(() => {
                        const tabButton = document.querySelector('#page-financeiro button[data-tab="tab-financeiro-bills"]');
                        if (tabButton) tabButton.click();
                        
                        // Abre o modal de nova despesa
                        const modalAddBill = document.getElementById('modal-add-bill');
                        if (modalAddBill) {
                            modalAddBill.classList.remove('hidden');
                            lucide.createIcons();
                            const billDueDateInput = document.getElementById('bill-due-date');
                            if (billDueDateInput && !billDueDateInput.value) {
                                billDueDateInput.value = getFutureDateString(30); 
                            }
                        }
                    }, 50);
                    return;
                }

                if (cardVendas) {
                    targetPage = 'page-vendas';
                    targetTab = 'tab-vendas-new'; // Vai para "Nova Venda"
                } else if (cardFinanceiro) {
                    targetPage = 'page-financeiro';
                    targetTab = 'tab-financeiro-summary'; // Vai para "Resumo do Caixa"
                } else if (cardProdutos || widgetProdutos) {
                    targetPage = 'page-produtos';
                    targetTab = 'tab-produtos-view'; // Vai para "Visualizar Produtos"
                } else if (warningLi) {
                    targetPage = warningLi.dataset.targetPage;
                    targetTab = warningLi.dataset.targetTab;
                } else if (actionBtn) {
                    targetPage = actionBtn.dataset.targetPage;
                    targetTab = actionBtn.dataset.targetTab;
                }

                // 3. Executa a navegação
                if (targetPage) {
                    e.preventDefault(); // Previne qualquer ação padrão

                    // 1. Muda para a página principal
                    showPage(targetPage);

                    // 2. Clica na aba interna específica (se houver)
                    if (targetTab) {
                        // Usamos um setTimeout para garantir que a página mudou antes de clicar na aba
                        setTimeout(() => {
                            // Busca o botão de aba DENTRO da página que está ativa
                            const tabButton = document.querySelector(`#${targetPage} button[data-tab="${targetTab}"]`);
                            if (tabButton) {
                                tabButton.click(); // Simula o clique na aba correta
                            } else {
                                console.warn(`Não foi possível encontrar a aba: ${targetTab}`);
                            }
                        }, 50); // 50ms de delay é o suficiente
                    }
                }
            });
        }
        // --- FIM DA LÓGICA DO DASHBOARD ---

        // --- LÓGICA DE EXCLUIR CONTA (Ação Principal) ---
        async function handleDeleteBill(billId) {
            if (!userId || !billId) {
                throw new Error("ID da conta inválido para exclusão.");
            }

            try {
                const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                const billRef = doc(db, collectionPath, billId);
                await deleteDoc(billRef);

                console.log("Conta excluída com sucesso:", billId);
            } catch (error) {
                console.error("Erro ao excluir conta:", error);
                throw error; // Re-lança para ser pego pelo catch da confirmação
            }
        }
        // --- FIM EXCLUIR CONTA (Ação Principal) ---

        // --- LÓGICA PARA CANCELAR SERVIÇO / ASSINATURA ---
        function showCancelSubscriptionConfirmation(groupId, descricao) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // Tira os marcadores de parcela do nome se existirem (Ex: "Netflix (Jan/2025)" -> "Netflix")
            const cleanDesc = descricao.split('(')[0].trim();

            modalTitle.textContent = 'Confirmar Cancelamento';
            modalBody.innerHTML = `
                <p>Você tem certeza que deseja cancelar as próximas cobranças de:</p>
                <p class="mt-2 text-lg font-bold text-orange-600">"${cleanDesc}"?</p>
                <p class="text-sm text-gray-600 mt-2">Esta ação irá procurar no banco de dados e <b>apagar todas as despesas futuras (não pagas)</b> que fazem parte deste mesmo serviço ou parcelamento.</p>
                <div class="mt-6 text-right space-x-2">
                    <button type="button" id="btn-cancel-sub-back" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Não, Voltar</button>
                    <button type="button" id="btn-confirm-delete-sub" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Cancelar Serviço</button>
                </div>
            `;

            modalContainer.style.display = 'flex';

            document.getElementById('btn-cancel-sub-back').onclick = hideModal;

            document.getElementById('btn-confirm-delete-sub').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete-sub');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Cancelando...';

                try {
                    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                    // Busca apenas as contas desse grupo que ainda NÃO foram pagas
                    const q = query(
                        collection(db, collectionPath),
                        where("groupId", "==", groupId),
                        where("pago", "==", false)
                    );

                    const snapshot = await getDocs(q);
                    
                    if (snapshot.empty) {
                        showModal("Aviso", "Nenhuma despesa pendente encontrada para este serviço/grupo.");
                        hideModal();
                        return;
                    }

                    // Apaga tudo usando WriteBatch (em lote para economizar escritas e ser rápido)
                    const batch = writeBatch(db);
                    snapshot.forEach(docSnap => {
                        batch.delete(docSnap.ref);
                    });

                    await batch.commit();

                    hideModal();
                    showModal("Sucesso!", `Assinatura cancelada com sucesso! ${snapshot.size} despesa(s) futura(s) foram apagadas do seu painel.`);

                } catch (error) {
                    console.error("Erro ao cancelar serviço:", error);
                    showModal("Erro", "Não foi possível cancelar o serviço: " + error.message);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Cancelar Serviço';
                }
            };
        }
        // --- FIM CANCELAR SERVIÇO ---

        // --- LÓGICA DE CANCELAMENTO DE CONSIGNAÇÃO ---
        function showConsignmentCancelConfirmation(consignmentId, clientId) {
            // Busca o documento da consignação (deve estar na cache allSales)
            const consignment = allSales.find(s => s.id === consignmentId);
            if (!consignment) {
                showModal("Erro", "Consignação não encontrada para cancelamento.");
                return;
            }

            modalTitle.textContent = 'Confirmar Cancelamento de Consignação';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja CANCELAR a consignação com <strong>${clientId || 'N/D'}</strong>?</p>
        <p class="font-medium text-red-600 mt-2">Esta ação irá:</p>
        <ul class="list-disc list-inside text-sm text-red-600">
            <li>Excluir o registro da consignação.</li>
            <li>Devolver TODOS os ${consignment.items ? consignment.items.length : 0} produtos consignados ao estoque.</li>
        </ul>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-cancel-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Não, Manter Ativa</button>
            <button type="button" id="btn-confirm-cancel-consign" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Devolver Tudo e Cancelar</button>
        </div>
    `;

            modalContainer.style.display = 'flex';
            document.getElementById('btn-cancel-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-cancel-consign').onclick = async () => {
                const confirmBtn = document.getElementById('btn-confirm-cancel-consign');
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Cancelando...';

                try {
                    const batch = writeBatch(db);
                    const productCollectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                    const saleCollectionPath = `artifacts/${appId}/users/${userId}/vendas`;

                    // 1. Devolver TODOS os itens originais ao estoque
                    if (consignment.items && consignment.items.length > 0) {
                        for (const item of consignment.items) {
                            const productRef = doc(db, productCollectionPath, item.id);
                            batch.update(productRef, { estoque: increment(item.quantity || 1) });
                        }
                    }

                    // 2. Excluir o documento da consignação
                    const saleRef = doc(db, saleCollectionPath, consignmentId);
                    batch.delete(saleRef);

                    await batch.commit();

                    hideModal();
                    showModal("Sucesso!", "Consignação cancelada e estoque devolvido com sucesso.");

                } catch (error) {
                    console.error("Erro inicial ao cancelar consignação (batch):", error);

                    // Verifica se o erro é especificamente sobre um documento não encontrado
                    // O código 'not-found' é comum, mas a mensagem pode ser mais confiável em alguns casos
                    if (error.code === 'not-found' || (error.message && error.message.includes('No document to update'))) {
                        console.warn("Falha ao atualizar estoque (produto pode ter sido excluído). Tentando excluir apenas a consignação...");
                        try {
                            // Tenta excluir APENAS a consignação em uma nova operação
                            const saleCollectionPath = `artifacts/${appId}/users/${userId}/vendas`;
                            const saleRef = doc(db, saleCollectionPath, consignmentId);
                            await deleteDoc(saleRef); // Executa a exclusão da consignação separadamente

                            hideModal();
                            showModal("Sucesso Parcial", "Consignação cancelada, mas o estoque de um ou mais itens não pôde ser atualizado (produto excluído).");

                        } catch (deleteError) {
                            console.error("Erro ao tentar excluir apenas a consignação:", deleteError);
                            showModal("Erro Grave", "Não foi possível cancelar a consignação nem atualizar o estoque. Erro: " + deleteError.message);
                        }
                    } else {
                        // Se for outro tipo de erro, mostra a mensagem original
                        showModal("Erro", "Não foi possível cancelar a consignação: " + error.message);
                    }
                } finally {
                    // Garante que o botão seja reabilitado independentemente do resultado
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Sim, Devolver Tudo e Cancelar';
                }
            };
        }
        // --- FIM LÓGICA DE CANCELAMENTO ---


        // --- LÓGICA DE EDIÇÃO COMPLETA DA CONSIGNAÇÃO ATIVA (ATUALIZADA COM CONFIRMAÇÃO DE "0") ---
        async function showConsignmentEditModal(consignmentId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // Busca a consignação na nossa cache allSales
            const originalConsignment = allSales.find(s => s.id === consignmentId);
            if (!originalConsignment) {
                showModal("Erro", "Consignação não encontrada.");
                return;
            }

            // Fazemos cópias profundas dos itens para edição
            let editConsignmentItems = JSON.parse(JSON.stringify(originalConsignment.items || []));

            // Criamos um mapa do estado ORIGINAL para consulta de estoque
            const originalQtyMap = new Map();
            originalConsignment.items.forEach(item => {
                originalQtyMap.set(item.id, item.quantity);
            });

            const clientName = originalConsignment.clientId;
            const clientSelectHTML = document.getElementById('sale-client').innerHTML;

            // --- Funções Internas de Edição ---

            // 1. Atualiza os totais (R$) no modal
            const updateEditTotals = () => {
                let subtotal = 0;
                editConsignmentItems.forEach(p => { subtotal += (p.venda * (p.quantity || 0)); });

                const subtotalEl = document.getElementById('edit-consign-subtotal');
                const totalEl = document.getElementById('edit-consign-total');
                if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
                if (totalEl) totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            };

            // 2. Desenha a lista de itens no modal
            const renderEditItems = () => {
                const tableBody = document.getElementById('edit-consign-items-list');
                if (!tableBody) return;
                tableBody.innerHTML = '';

                if (editConsignmentItems.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="py-2 text-center text-gray-500">Nenhum item na consignação.</td></tr>';
                } else {
                    editConsignmentItems.forEach((product, index) => {
                        const tr = document.createElement('tr');
                        tr.className = 'border-b';

                        tr.innerHTML = `
                    <td class="py-2 pr-2"><div class="font-medium">${product.nome}</div></td>
                    <td class="py-2 px-2">${product.ref}</td>
                    <td class="py-2 px-2">
                        <input type="number" value="${product.quantity}" min="0" 
                               class="edit-consign-qty w-16 px-2 py-1 text-sm border rounded-md" 
                               data-id="${product.id}">
                    </td>
                    <td class="py-2 pl-2 text-right">
                        <button class="btn-remove-edit-item text-red-500 hover:text-red-700" data-id="${product.id}" title="Remover item">
                            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                    </td>
                `;
                        tableBody.appendChild(tr);
                    });
                    lucide.createIcons();
                }
                updateEditTotals();
            };

            // 3. Adiciona um NOVO item (chamado pelo botão "Adicionar")
            const handleEditAddItem = async (refCode) => {
                const addItemInput = document.getElementById('edit-item-ref');
                const errorP = document.getElementById('edit-consign-error');
                if (!refCode || !addItemInput || !errorP) return;

                errorP.innerHTML = ''; // Limpa erros antigos

                try {
                    const product = await findProductByRef(refCode); // 1. Encontra o produto

                    if (!product) {
                        if (errorP) errorP.textContent = `Produto com referência "${refCode}" não foi encontrado.`;
                        addItemInput.value = ''; // Limpa o input
                    } else {
                        // 2. Verifica se o item já está no carrinho de edição
                        const existingItem = editConsignmentItems.find(item => item.id === product.id);
                        const currentQtyInCart = existingItem ? existingItem.quantity : 0;

                        // 3. Verifica o estoque disponível no banco de dados
                        if ((currentQtyInCart + 1) > product.estoque) {
                            // 4. Mostra erro INLINE se não houver estoque
                            if (errorP) {
                                errorP.innerHTML = `Estoque insuficiente para "${product.nome}". (${product.estoque} un. disponíveis)`;
                            }
                            addItemInput.value = ''; // Limpa o input

                        } else {
                            // 5. Estoque OK - adiciona ou incrementa
                            if (existingItem) {
                                existingItem.quantity += 1; // Incrementa a quantidade
                            } else {
                                editConsignmentItems.push({ ...product, quantity: 1 }); // Adiciona novo com quantity: 1
                            }

                            renderEditItems(); // Atualiza a tabela de itens
                            addItemInput.value = ''; // Limpa o input
                        }
                    }
                } catch (error) {
                    console.error("Erro ao adicionar item:", error);
                    if (errorP) errorP.textContent = "Falha ao adicionar produto: " + error.message;
                }
                addItemInput.focus();
            };

            // --- Montar o Modal (HTML ATUALIZADO) ---
            modalTitle.textContent = `Gerenciar Consignação de ${clientName}`;
            modalBody.innerHTML = `
        <form id="form-edit-consignment" class="grid grid-cols-1 gap-6 lg:grid-cols-2 max-h-[75vh] overflow-y-auto">
            
            <div class="space-y-4">
                <h4 class="text-lg font-medium">Itens e Data de Acerto</h4>
                <div class="flex mt-4 space-x-2">
                    <input type="text" id="edit-item-ref" list="sale-item-datalist" placeholder="Adicionar Nome ou Cód. de Ref." class="flex-1 px-3 py-2 border rounded-md">
                    <button type="button" id="btn-add-edit-item" class="px-4 py-2 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">Adicionar</button>
                </div>
                <p id="edit-consign-error" class="text-sm text-red-600 mt-1 h-8"></p>
                <div class="mt-2 overflow-x-auto border rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th class="py-2 text-left text-sm font-medium text-gray-500">Produto</th>
                                <th class="py-2 text-left text-sm font-medium text-gray-500">Ref.</th>
                                <th class="py-2 text-left text-sm font-medium text-gray-500">Qtd.</th>
                                <th class="py-2 text-left text-sm font-medium text-gray-500">Ação</th>
                            </tr>
                        </thead>
                        <tbody id="edit-consign-items-list" class="divide-y">
                        </tbody>
                    </table>
                </div>
                <div>
                    <label class="block text-sm font-medium">Nova Data do Acerto</label>
                    <input type="date" id="edit-sale-due-date" class="w-full px-3 py-2 mt-1 border rounded-md" value="${originalConsignment.dueDate && originalConsignment.dueDate.toDate ? originalConsignment.dueDate.toDate().toISOString().split('T')[0] : ''}">
                </div>
            </div>
            
            <div class="p-6 space-y-4 bg-gray-50 rounded-lg flex-direction-col">
                <h4 class="text-lg font-medium">Resumo e Ações</h4>
                <div>
                    <label class="block text-sm font-medium">Cliente / Revendedor:</label>
                    <select id="edit-consign-client" class="w-full px-3 py-2 mt-1 border rounded-md bg-white">
                        ${clientSelectHTML}
                    </select>
                </div>
                <div class="pt-4 border-t">
                    <div class="flex justify-between font-medium">
                        <span>Subtotal de Itens:</span>
                        <span id="edit-consign-subtotal">R$ 0,00</span>
                    </div>
                    <div class="flex justify-between font-bold text-xl mt-2">
                        <span>VALOR TOTAL:</span>
                        <span id="edit-consign-total">R$ 0,00</span>
                    </div>
                </div>
                <p class="text-sm text-red-600 pt-4 border-t">Atenção: A atualização irá alterar o estoque.</p>
                <button type="submit" id="btn-update-consign" class="w-full px-4 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    Atualizar Consignação e Estoque
                </button>
            </div>
        </form>
    `;

            // 4. Mostrar e Ligar Eventos

            modalContainer.style.display = 'flex';
            renderEditItems(); // Primeira renderização
            
            // Pré-seleciona o cliente atual no dropdown
            document.getElementById('edit-consign-client').value = originalConsignment.clientId || 'Consumidor Final';

            // Ligar Adicionar Item
            const btnAddItem = document.getElementById('btn-add-edit-item');
            const itemRefInput = document.getElementById('edit-item-ref');
            btnAddItem.onclick = () => handleEditAddItem(itemRefInput.value.trim());
            itemRefInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); btnAddItem.click(); }
            });

            const formEdit = document.getElementById('form-edit-consignment');

            // --- LISTENER DE MUDANÇA (ATUALIZADO COM CONFIRMAÇÃO) ---
            if (formEdit) {
                formEdit.addEventListener('change', (e) => {
                    if (e.target.classList.contains('edit-consign-qty')) {
                        const input = e.target;
                        const itemId = input.dataset.id;
                        const newQuantity = parseInt(input.value, 10);
                        const errorP = document.getElementById('edit-consign-error');
                        if (errorP) errorP.innerHTML = ''; // Limpa erros

                        const item = editConsignmentItems.find(i => i.id === itemId);
                        if (!item) return;

                        const currentQuantityInCart = item.quantity; // <-- Salva a quantidade "antiga"

                        const productInDB = allUserProducts.find(p => p.id === itemId);
                        const availableStock = productInDB ? productInDB.estoque : 0;

                        const originalQty = originalQtyMap.get(itemId) || 0;
                        const maxAllowed = originalQty + availableStock;

                        // Valida se o número é válido (>= 0)
                        if (isNaN(newQuantity) || newQuantity < 0) {
                            if (errorP) errorP.textContent = "Quantidade deve ser 0 ou mais.";
                            input.value = currentQuantityInCart; // Reverte
                            return;
                        }

                        // Valida o estoque
                        if (newQuantity > maxAllowed) {
                            if (errorP) errorP.innerHTML = `Estoque insuficiente. Máximo permitido: ${maxAllowed} ( ${originalQty} já consignados + ${availableStock} em estoque)`;
                            input.value = currentQuantityInCart; // Reverte
                            return;
                        }

                        // --- INÍCIO DA MODIFICAÇÃO (Lógica do "0") ---
                        if (newQuantity === 0) {
                            // NÃO DELETA AINDA. Pergunta primeiro.
                            const confirmed = confirm(`Tem certeza que deseja remover "${item.nome}" desta consignação?\n\nIsso irá zerar a quantidade e remover o item da lista ao salvar.`);

                            if (confirmed) {
                                // Sim, deletar
                                editConsignmentItems = editConsignmentItems.filter(i => i.id !== itemId);
                                renderEditItems(); // Redesenha (sem o item)
                            } else {
                                // Não, reverter
                                input.value = currentQuantityInCart; // Coloca o valor antigo de volta no input
                                return; // Sai sem atualizar os totais
                            }
                        } else {
                            // Quantidade é > 0 e válida, apenas atualiza
                            item.quantity = newQuantity;
                        }
                        // --- FIM DA MODIFICAÇÃO ---

                        updateEditTotals(); // Atualiza o R$ total
                    }
                });

                // Lidar com clique no botão de excluir (lógica inalterada)
                formEdit.addEventListener('click', (e) => {
                    const removeBtn = e.target.closest('.btn-remove-edit-item');
                    if (removeBtn && removeBtn.dataset.id) {
                        const itemId = removeBtn.dataset.id;

                        // Filtra a lista, removendo o item
                        editConsignmentItems = editConsignmentItems.filter(i => i.id !== itemId);

                        // Redesenha a lista inteira
                        renderEditItems();
                        e.preventDefault();
                    }
                });
            }


            // --- Ligar o Save Final (Lógica de estoque já estava correta) ---
            document.getElementById('form-edit-consignment').onsubmit = async (e) => {
                e.preventDefault();

                const saveBtn = document.getElementById('btn-update-consign');
                const originalBtnText = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<i class="animate-spin ..."></i>Atualizando...`;

                // Filtra itens com quantidade 0 antes de salvar (caso algum tenha passado)
                editConsignmentItems = editConsignmentItems.filter(item => item.quantity > 0);

                const newSubtotal = editConsignmentItems.reduce((sum, item) => sum + (item.venda * (item.quantity || 1)), 0);
                const newDueDate = document.getElementById('edit-sale-due-date').value;
                const newClientId = document.getElementById('edit-consign-client').value;

                try {
                    if (!newDueDate) throw new Error("A data de acerto é obrigatória.");

                    // 1. Calcula o diferencial de estoque (Lógica de Mapa Aprimorada)
                    const originalRefMap = {};
                    originalConsignment.items.forEach(item => {
                        originalRefMap[item.ref] = (originalRefMap[item.ref] || 0) + (item.quantity || 1);
                    });

                    const newRefMap = {};
                    editConsignmentItems.forEach(item => {
                        newRefMap[item.ref] = (newRefMap[item.ref] || 0) + (item.quantity || 1);
                    });

                    const batch = writeBatch(db);
                    const productCollectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                    const saleRef = doc(db, `artifacts/${appId}/users/${userId}/vendas`, consignmentId);

                    const allRefs = new Set([...Object.keys(originalRefMap), ...Object.keys(newRefMap)]);

                    // 2. Preparar o Batch (Lógica de Estoque Aprimorada)
                    for (const ref of allRefs) {
                        const originalQty = originalRefMap[ref] || 0;
                        const newQty = newRefMap[ref] || 0;
                        const diff = newQty - originalQty;

                        if (diff !== 0) {
                            const product = allUserProducts.find(p => p.ref === ref);
                            if (product && product.id) {
                                const productRef = doc(db, productCollectionPath, product.id);
                                batch.update(productRef, { estoque: increment(diff * -1) });
                            } else {
                                console.warn(`Não foi possível encontrar o ID do produto para a ref ${ref} ao atualizar estoque.`);
                            }
                        }
                    }

                    // 3. Atualizar o documento da Consignação
                    const dateObject = new Date(newDueDate + 'T00:00:00');
                    const newDueDateTimestamp = Timestamp.fromDate(dateObject);

                    batch.update(saleRef, {
                        dueDate: newDueDateTimestamp,
                        items: editConsignmentItems, // Salva a nova lista (filtrada)
                        subtotal: newSubtotal,
                        total: newSubtotal,
                        clientId: newClientId
                    });

                    // 4. Executar o Batch
                    await batch.commit();

                    // 5. Sucesso e opções de impressão do novo PDF
                    hideModal();
                    const updatedSaleDataForPDF = {
                        id: consignmentId,
                        clientId: newClientId,
                        items: editConsignmentItems,
                        total: newSubtotal
                    };
                    showPrintConsignConfirmation(updatedSaleDataForPDF, newDueDate, true);

                } catch (error) {
                    console.error("Erro ao atualizar consignação:", error);
                    showModal("Erro", "Falha ao atualizar consignação: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnText;
                }
            };
        }
        // --- FIM EXCLUIR VENDA (Ação Principal) ---
        // --- LÓGICA DE ACERTO DE CONSIGNAÇÃO (VERSÃO ATUALIZADA COM QUANTIDADE) ---
        async function showConsignmentSettlementModal(consignmentId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Acha a consignação na nossa "cache" global
            const consignment = allSales.find(s => s.id === consignmentId);
            if (!consignment) {
                showModal("Erro", "Consignação não encontrada.");
                return;
            }

            // --- Variáveis de ESTADO do Modal (COM LÓGICA DE "UNPACK") ---

            let itemsToSettle = [];
            let itemsReturned = [];
            let savedCommission = 0;
            let savedDiscount = 0;
            let savedDiscountReason = "";

            const draftKey = `settlementDraft_${consignmentId}`;
            const draftData = localStorage.getItem(draftKey);

            // Tenta recuperar o estado salvo no LocalStorage
            if (draftData) {
                try {
                    const parsedDraft = JSON.parse(draftData);
                    itemsToSettle = parsedDraft.itemsToSettle || [];
                    itemsReturned = parsedDraft.itemsReturned || [];
                    savedCommission = parsedDraft.commissionPercent || 0;
                    savedDiscount = parsedDraft.discount || 0;
                    savedDiscountReason = parsedDraft.discountReason || "";
                } catch (e) {
                    console.error("Erro ao ler rascunho salvo:", e);
                    localStorage.removeItem(draftKey);
                }
            }

            // Se não houver rascunho, inicia com os dados originais
            if (itemsToSettle.length === 0 && itemsReturned.length === 0 && !draftData) {
                if (consignment.items) {
                    consignment.items.forEach(item => {
                        const qty = item.quantity || 1;
                        for (let i = 0; i < qty; i++) {
                            const singleItem = { ...item };
                            delete singleItem.quantity;
                            itemsToSettle.push(singleItem);
                        }
                    });
                }
            }

            function saveSettlementDraft() {
                const commissionInput = document.getElementById('settle-commission');
                const discountInput = document.getElementById('settle-discount');
                const discountReasonInput = document.getElementById('settle-discount-reason');
                const commission = commissionInput ? parseFloat(commissionInput.value) || 0 : savedCommission;
                const discount = discountInput ? parseFloat(discountInput.value) || 0 : savedDiscount;
                const discountReason = discountReasonInput ? discountReasonInput.value : savedDiscountReason;
                
                const draft = { itemsToSettle, itemsReturned, commissionPercent: commission, discount, discountReason };
                localStorage.setItem(draftKey, JSON.stringify(draft));
            }

            // 2. Montar o HTML do Modal (idêntico ao anterior)
            modalTitle.innerHTML = `Realizar Acerto de Consignação <button type="button" id="btn-reset-draft" class="ml-4 text-xs font-normal text-red-600 hover:underline inline-block focus:outline-none" title="Limpar tudo e começar do zero">Recomeçar do zero</button>`;
            modalBody.innerHTML = `
    <div class="grid grid-cols-2 gap-6">
        <div>
            <h4 class="text-lg font-medium">Devolução de Itens</h4>
            <p class="text-sm text-gray-500">Digite a Ref. dos itens devolvidos.</p>
            
            <div class="flex space-x-2 mt-4">
                <input type="text" id="settle-ref-input" list="sale-item-datalist" placeholder="Digitar Nome ou Ref. ou usar leitor" class="w-full px-3 py-2 border rounded-md">
                <button type="button" id="btn-return-item" class="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600">Devolver</button>
            </div>
            <p id="settle-error" class="text-xs text-red-600 mt-1 h-4"></p>
            
            <div class="flex justify-between items-end mt-4 mb-2">
                <h5 class="font-medium">Itens Consignados (Originais):</h5>
                <span id="count-consigned" class="text-sm font-bold text-gray-500">0 un.</span>
            </div>
            <ul id="settle-list-consigned" class="h-32 overflow-y-auto space-y-1 p-2 border rounded-md bg-gray-50">
                </ul>
            
            <div class="flex justify-between items-end mt-4 mb-2">
                <h5 class="font-medium">Itens Devolvidos (Voltando ao Estoque):</h5>
                <span id="count-returned" class="text-sm font-bold text-red-500">0 un.</span>
            </div>
            <ul id="settle-list-returned" class="h-32 overflow-y-auto space-y-1 p-2 border rounded-md bg-gray-50">
                </ul>
        </div>
        
        <div>
            <h4 class="text-lg font-medium">Acerto Financeiro</h4>
            <p class="text-sm text-gray-500">Itens vendidos e cálculo de comissão.</p>
            
            <div class="flex justify-between items-end mt-4 mb-2">
                <h5 class="font-medium">Itens Vendidos (Não devolvidos):</h5>
                <span id="count-sold" class="text-sm font-bold text-green-600">0 un.</span>
            </div>
            <div id="settle-list-sold" class="mt-2 p-2 border rounded-md bg-gray-50 h-48 overflow-y-auto">
                </div>
            
            <div class="space-y-3 mt-4">
                <div class="flex justify-between font-medium">
                    <span>Total Vendido:</span>
                    <span id="settle-total-sold">R$ 0,00</span>
                </div>
                <div class="flex items-center justify-between">
                    <label for="settle-commission" class="text-sm font-medium">Comissão do Revendedor (%):</label>
                    <input type="number" id="settle-commission" value="${savedCommission}" class="w-24 px-3 py-2 text-sm border rounded-md">
                </div>
                <div class="flex items-center justify-between mt-2">
                    <label for="settle-discount" class="text-sm font-medium">Desconto (R$):</label>
                    <input type="number" id="settle-discount" value="${savedDiscount}" step="0.01" class="w-24 px-3 py-2 text-sm border rounded-md">
                </div>
                <div class="flex flex-col mt-2 mb-4">
                    <label for="settle-discount-reason" class="text-sm font-medium">Motivo do Desconto:</label>
                    <input type="text" id="settle-discount-reason" value="${savedDiscountReason}" placeholder="Opcional" class="w-full px-3 py-2 mt-1 text-sm border rounded-md">
                </div>
                <div class="flex justify-between font-bold text-lg text-green-600 mt-4">
                    <span>VALOR A PAGAR:</span>
                    <span id="settle-final-amount">R$ 0,00</span>
                </div>
                <div class="mt-4 border-t pt-4">
                    <label class="block text-sm font-medium mb-2">Formas de Pagamento</label>
                    <div id="settle-payment-splits-container" class="space-y-2">
                    </div>
                    <button type="button" id="btn-add-settle-payment-split" class="mt-2 text-sm text-indigo-600 hover:underline font-medium flex items-center">
                        <i data-lucide="plus" class="w-4 h-4 mr-1"></i> Adicionar outra forma
                    </button>
                    <p id="settle-split-error" class="text-xs text-red-600 mt-1 hidden"></p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="mt-6 pt-4 border-t text-right space-x-2">
       <button type="button" id="btn-cancel-settle" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
       <button type="button" id="btn-finalize-settle" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Finalizar Acerto</button>
    </div>
`;

            // 3. Mostrar o Modal
            const modalContent = document.getElementById('modal-content');
            if (modalContent) {
                modalContent.classList.remove('max-w-4xl');
                modalContent.classList.add('max-w-6xl');
            }
            modalContainer.style.display = 'flex';

            // --- 4. Funções Internas do Modal (ATUALIZADAS) ---
            const listConsigned = document.getElementById('settle-list-consigned');
            const listReturned = document.getElementById('settle-list-returned');
            const listSold = document.getElementById('settle-list-sold');
            const totalSoldSpan = document.getElementById('settle-total-sold');
            const commissionInput = document.getElementById('settle-commission');
            const discountInput = document.getElementById('settle-discount');
            const discountReasonInput = document.getElementById('settle-discount-reason');
            const finalAmountSpan = document.getElementById('settle-final-amount');
            const refInput = document.getElementById('settle-ref-input');
            const errorP = document.getElementById('settle-error');
            
            const container = document.getElementById('settle-payment-splits-container');
            const btnAddSplit = document.getElementById('btn-add-settle-payment-split');
            const splitErrorP = document.getElementById('settle-split-error');

            function addSettleSplitRow(method = 'Pix', value = 0) {
                const row = document.createElement('div');
                row.className = 'flex items-center space-x-2 settle-split-row mt-2';
                row.innerHTML = `
                    <select class="settle-split-method flex-1 px-3 py-2 border rounded-md">
                        <option value="Dinheiro" ${method === 'Dinheiro' ? 'selected' : ''}>Dinheiro (Caixa Físico)</option>
                        <option value="Pix" ${method === 'Pix' ? 'selected' : ''}>Pix (Conta Bancária)</option>
                        <option value="Transferência Bancária" ${method === 'Transferência Bancária' ? 'selected' : ''}>Transferência Bancária (Conta Bancária)</option>
                        <option value="Cartão de Crédito" ${method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito (Conta Bancária)</option>
                        <option value="Cartão de Débito" ${method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito (Conta Bancária)</option>
                    </select>
                    <input type="number" step="0.01" class="settle-split-value w-32 px-3 py-2 border rounded-md" value="${value.toFixed(2)}">
                    <button type="button" class="btn-remove-settle-split text-red-500 hover:text-red-700 px-2">
                        <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                `;
                container.appendChild(row);
                lucide.createIcons();
                row.querySelector('.btn-remove-settle-split').onclick = () => { row.remove(); if (container.children.length === 0) addSettleSplitRow('Pix', 0); };
            }
            addSettleSplitRow('Pix', 0);
            btnAddSplit.onclick = () => addSettleSplitRow('Dinheiro', 0);

            setupTwoSplitsLogic(
                container,
                '.settle-split-row',
                '.settle-split-value',
                () => {
                    const totalStr = finalAmountSpan.textContent.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
                    return parseFloat(totalStr) || 0;
                }
            );

            // Função para desenhar as 3 listas (AGORA AGRUPA OS ITENS)
            function redrawListsAndCalculate() {
                listConsigned.innerHTML = '';
                listReturned.innerHTML = '';
                listSold.innerHTML = '';

                let totalSold = 0;
                let countSold = 0;
                let countReturned = 0;
                let countConsigned = 0;

                // --- 1. Lista de VENDIDOS (itemsToSettle) ---
                // Agrupa os itens restantes (vendidos) para exibição limpa
                const soldGroups = {};
                itemsToSettle.forEach(item => {
                    if (!soldGroups[item.ref]) {
                        soldGroups[item.ref] = { ...item, count: 0, totalValue: 0 };
                    }
                    soldGroups[item.ref].count += 1;
                    soldGroups[item.ref].totalValue += item.venda;
                    totalSold += item.venda; // Adiciona ao total
                    countSold++;
                });

                if (Object.keys(soldGroups).length === 0) {
                    listSold.innerHTML = '<p class="text-sm text-gray-500 p-1">Nenhum item vendido (ou todos devolvidos).</p>';
                } else {
                    for (const ref in soldGroups) {
                        const item = soldGroups[ref];
                        listSold.innerHTML += `<li class="flex justify-between text-sm p-1">
                    <span>${item.nome} (${item.ref}) x ${item.count}</span> 
                    <span>R$ ${item.totalValue.toFixed(2).replace('.', ',')}</span>
                </li>`;
                    }
                }

                // --- 2. Lista de DEVOLVIDOS (itemsReturned) ---
                // Agrupa os itens devolvidos
                const returnedGroups = {};
                itemsReturned.forEach(item => {
                    if (!returnedGroups[item.ref]) {
                        returnedGroups[item.ref] = { ...item, count: 0 };
                    }
                    returnedGroups[item.ref].count += 1;
                    countReturned++;
                });

                if (Object.keys(returnedGroups).length === 0) {
                    listReturned.innerHTML = '<p class="text-sm text-gray-500 p-1">Nenhum item devolvido ainda.</p>';
                } else {
                    for (const ref in returnedGroups) {
                        const item = returnedGroups[ref];
                        listReturned.innerHTML += `<li class="text-sm p-1 text-gray-700 line-through">
                    ${item.nome} (${item.ref}) x ${item.count}
                </li>`;
                    }
                }

                // --- 3. Lista de CONSIGNADOS (Originais) ---
                // Mostra a lista original (agrupada) do que foi pego
                if (consignment.items.length === 0) {
                    listConsigned.innerHTML = '<p class="text-sm text-gray-500 p-1">Nenhum item nesta consignação.</p>';
                } else {
                    consignment.items.forEach(item => {
                        const qty = item.quantity || 1;
                        countConsigned += qty;
                        listConsigned.innerHTML += `<li class="text-sm p-1 text-gray-700">
                    ${item.nome} (${item.ref}) x ${qty}
                </li>`;
                    });
                }

                // --- Atualiza os Contadores na Interface ---
                document.getElementById('count-sold').textContent = `${countSold} un.`;
                document.getElementById('count-returned').textContent = `${countReturned} un.`;
                document.getElementById('count-consigned').textContent = `${countConsigned} un.`;

                // --- 4. Cálculo Financeiro (atualizado) ---
                const commissionPercent = parseFloat(commissionInput.value) || 0;
                const discountValue = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
                const baseAmount = totalSold - discountValue;
                const commissionAmount = (baseAmount > 0 ? baseAmount : 0) * (commissionPercent / 100);
                const finalAmount = baseAmount - commissionAmount;

                totalSoldSpan.textContent = `R$ ${totalSold.toFixed(2).replace('.', ',')}`;
                finalAmountSpan.textContent = `R$ ${finalAmount.toFixed(2).replace('.', ',')}`;
                
                const splitRows = container.querySelectorAll('.settle-split-row');
                if (splitRows.length === 1) {
                    const valInput = splitRows[0].querySelector('.settle-split-value');
                    if (valInput) valInput.value = finalAmount.toFixed(2);
                }
            }

            // "Ligar" botão de reiniciar rascunho
            const btnResetDraft = document.getElementById('btn-reset-draft');
            if (btnResetDraft) {
                btnResetDraft.onclick = () => {
                    if(confirm("Tem certeza que deseja apagar o progresso deste acerto e começar do zero?")) {
                        localStorage.removeItem(draftKey);
                        hideModal();
                        showConsignmentSettlementModal(consignmentId); // Recarrega o modal limpo
                    }
                };
            }

            // "Ligar" botão de Devolver Item (LÓGICA INALTERADA, MAS FUNCIONA CORRETAMENTE AGORA)
            document.getElementById('btn-return-item').onclick = () => {
                const refCode = refInput.value.trim();
                errorP.textContent = '';
                if (!refCode) return;

                const lowerRefCode = refCode.toLowerCase();

                // Procura o item na lista 'itemsToSettle' por ref ou nome
                const itemIndex = itemsToSettle.findIndex(item => 
                    (item.ref && item.ref.toLowerCase() === lowerRefCode) ||
                    (item.nome && item.nome.toLowerCase() === lowerRefCode)
                );

                if (itemIndex > -1) {
                    // Achou!
                    // Remove 1 item de 'itemsToSettle' e o move para 'itemsReturned'
                    const [returnedItem] = itemsToSettle.splice(itemIndex, 1);
                    itemsReturned.push(returnedItem);

                    refInput.value = ''; // Limpa o input
                    redrawListsAndCalculate(); // Atualiza a UI
                    saveSettlementDraft(); // Salva o estado localmente
                } else {
                    // Não achou (ou já foi devolvido)
                    errorP.textContent = 'Ref. não encontrada ou já devolvida.';
                    
                    // Toca o som de erro
                    const audio = new Audio('erro.mp3');
                    audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                    
                }
                refInput.focus();
            };
            refInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('btn-return-item').click();
            });

            // "Ligar" input de comissão
            commissionInput.addEventListener('input', () => {
                redrawListsAndCalculate();
                saveSettlementDraft();
            });
            if (discountInput) {
                discountInput.addEventListener('input', () => {
                    redrawListsAndCalculate();
                    saveSettlementDraft();
                });
            }
            if (discountReasonInput) {
                discountReasonInput.addEventListener('input', () => {
                    saveSettlementDraft();
                });
            }

            // "Ligar" botões de fechar
            document.getElementById('btn-cancel-settle').onclick = hideModal;

            // "Ligar" botão FINALIZAR (ATUALIZADO PARA REAGRUPAR OS ITENS)
            document.getElementById('btn-finalize-settle').onclick = async () => {
                const finalSaveBtn = document.getElementById('btn-finalize-settle');
                finalSaveBtn.disabled = true;
                finalSaveBtn.innerHTML = `<i class="animate-spin ..."></i>Finalizando`;

                try {
                    // --- 1. Re-agrupar os itens VENDIDOS (itemsToSettle) ---
                    const soldGroups = {};
                    let totalSold = 0;
                    itemsToSettle.forEach(item => {
                        if (!soldGroups[item.ref]) {
                            // Salva o item original, mas zera a quantidade
                            soldGroups[item.ref] = { ...item, quantity: 0 };
                        }
                        soldGroups[item.ref].quantity += 1; // Incrementa a quantidade
                        totalSold += item.venda; // Adiciona ao total
                    });
                    // Converte o objeto de grupos de volta para um array
                    const itemsSoldGrouped = Object.values(soldGroups);

                    // --- 1b. Calcular dados financeiros ---
                    const commissionPercent = parseFloat(commissionInput.value) || 0;
                    const discountAmountValue = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
                    const discountReasonValue = discountReasonInput ? discountReasonInput.value.trim() : "";
                    const baseAmount = totalSold - discountAmountValue;
                    const commissionAmount = (baseAmount > 0 ? baseAmount : 0) * (commissionPercent / 100);
                    const finalAmountPaid = baseAmount - commissionAmount;
                    
                    const splitRows = container.querySelectorAll('.settle-split-row');
                    const paymentSplits = [];
                    let splitsTotal = 0;

                    splitRows.forEach(row => {
                        const method = row.querySelector('.settle-split-method').value;
                        const splitVal = parseFloat(row.querySelector('.settle-split-value').value) || 0;
                        if (splitVal > 0) {
                            paymentSplits.push({ method, value: splitVal });
                            splitsTotal += splitVal;
                        }
                    });

                    if (paymentSplits.length === 0) {
                        splitErrorP.textContent = "Adicione pelo menos uma forma de pagamento com valor maior que zero.";
                        splitErrorP.classList.remove('hidden');
                        finalSaveBtn.disabled = false;
                        finalSaveBtn.innerHTML = 'Finalizar Acerto';
                        return;
                    }

                    if (Math.abs(splitsTotal - finalAmountPaid) > 0.01) {
                        splitErrorP.textContent = `A soma das formas de pagamento (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao Valor a Pagar (R$ ${finalAmountPaid.toFixed(2)}).`;
                        splitErrorP.classList.remove('hidden');
                        finalSaveBtn.disabled = false;
                        finalSaveBtn.innerHTML = 'Finalizar Acerto';
                        return;
                    }
                    let mainPaymentMethod = paymentSplits.length === 1 ? paymentSplits[0].method : 'Múltiplas Formas';
                    splitErrorP.classList.add('hidden');

                    // --- 2. Preparar o Lote (Batch) ---
                    const batch = writeBatch(db);
                    const productCollectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                    const saleCollectionPath = `artifacts/${appId}/users/${userId}/vendas`;
                    const financeCollectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

                    // --- 2a. Atualizar Estoque (Devolver itens) ---
                    // Agrupar itemsReturned para não sobrescrever o incremento no mesmo doc no batch
                    const returnedStockMap = {};
                    for (const item of itemsReturned) {
                        returnedStockMap[item.id] = (returnedStockMap[item.id] || 0) + 1;
                    }
                    for (const itemId in returnedStockMap) {
                        const productRef = doc(db, productCollectionPath, itemId);
                        batch.update(productRef, {
                            estoque: increment(returnedStockMap[itemId])
                        });
                    }

                    // --- 2b. Atualizar a Venda (Consignação) Original ---
                    const saleRef = doc(db, saleCollectionPath, consignmentId);
                    batch.update(saleRef, {
                        status: 'Finalizada',
                        items: itemsSoldGrouped, // <-- SALVA A LISTA AGRUPADA CORRETA
                        paymentMethod: mainPaymentMethod,
                        paymentSplits: paymentSplits,
                        total: totalSold, // O 'total' da venda passa a ser o 'totalVendido'
                        subtotal: totalSold, // O 'subtotal' também
                        settlement: {
                            totalSold: totalSold,
                            commissionPercent: commissionPercent,
                            commissionAmount: commissionAmount,
                            discountAmount: discountAmountValue,
                            discountReason: discountReasonValue,
                            finalAmountPaid: finalAmountPaid,
                            settledAt: serverTimestamp()
                        }
                    });

                    // --- 2c. Criar o Lançamento Financeiro ---
                    const financeData = {
                        descricao: `Acerto Consignação (Rev: ${consignment.clientId})`,
                        valor: finalAmountPaid,
                        tipo: 'Entrada',
                        data: serverTimestamp(),
                        vencimento: null,
                        pago: true,
                        saleId: consignmentId,
                        ownerId: userId,
                        paymentMethod: mainPaymentMethod,
                        paymentSplits: paymentSplits
                    };
                    const newFinanceRef = doc(collection(db, financeCollectionPath));
                    batch.set(newFinanceRef, financeData);

                    // --- 3. Executar o Lote ---
                    await batch.commit();

                    // Limpa o rascunho salvo, pois foi finalizado com sucesso
                    localStorage.removeItem(draftKey);

                    // --- 4. Gerar o Relatório ---
                    const settlementData = {
                        totalSold: totalSold,
                        commissionPercent: commissionPercent,
                        commissionAmount: commissionAmount,
                        discountAmount: discountAmountValue,
                        discountReason: discountReasonValue,
                        finalAmountPaid: finalAmountPaid,
                        paymentMethod: mainPaymentMethod
                    };

                    // Passa os VENDIDOS (agrupados) e os DEVOLVIDOS (desagrupados)
                    await generateSettlementReport(consignment, itemsSoldGrouped, itemsReturned, settlementData);

                    // --- 5. Sucesso ---
                    hideModal();
                    showModal("Sucesso!", "Acerto finalizado com sucesso.");

                } catch (error) {
                    console.error("Erro ao finalizar acerto:", error);
                    showModal("Erro", "Não foi possível finalizar o acerto: " + error.message);
                    finalSaveBtn.disabled = false;
                    finalSaveBtn.innerHTML = 'Finalizar Acerto';
                }
            }; // Fim do onclick


            // 5. Chamar a função pela primeira vez para popular tudo
            redrawListsAndCalculate();
        }

        /**
  * Gera um Relatório de Acerto em PDF (ATUALIZADO PARA QUANTIDADES)
  */
        async function generateSettlementReport(consignment, itemsSoldGrouped, itemsReturnedFlattened, settlementData) {
            // Puxa as bibliotecas globais
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            // Função helper para formatar dinheiro
            const formatCurrency = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;

            // --- 1. Título e Cabeçalho ---
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Relatório de Acerto de Consignação', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');

            // Posição Y dinâmica para o cabeçalho
            const leftMargin = 15;
            const rightMargin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - leftMargin - rightMargin;
            let currentY = 35;
            const lineSpacing = 7;

            const clientText = `Cliente (Revendedor): ${consignment.clientId}`;
            doc.text(clientText, leftMargin, currentY, { maxWidth: maxWidth });
            const clientTextLines = doc.splitTextToSize(clientText, maxWidth);
            currentY += (clientTextLines.length * lineSpacing); // Move o Y

            doc.text(`Data do Acerto: ${new Date().toLocaleDateString('pt-BR')}`, leftMargin, currentY);
            currentY += lineSpacing;

            const withdrawalDate = consignment.createdAt?.toDate ? consignment.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/D';
            doc.text(`Data da Retirada: ${withdrawalDate}`, leftMargin, currentY);
            currentY += 10; // Espaço antes da tabela

            // --- 2. Tabela de Itens Vendidos (itemsSoldGrouped) ---
            if (itemsSoldGrouped.length > 0) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Itens Vendidos', leftMargin, currentY);
                currentY += 7;

                // ATUALIZADO: Cabeçalho com Quantidade e Total
                const soldHead = [['Qtd.', 'Ref.', 'Produto Vendido', 'Valor Unit. (R$)', 'Valor Total (R$)']];
                let totalSoldQty = 0;
                const soldBody = itemsSoldGrouped.map(item => {
                    totalSoldQty += item.quantity;
                    return [
                        item.quantity, // Adiciona a quantidade
                        item.ref,
                        item.nome,
                        item.venda.toFixed(2),
                        (item.venda * item.quantity).toFixed(2) // Calcula o total da linha
                    ];
                });

                // Linha de Resumo (agora usa colSpan 4)
                soldBody.push([
                    { content: `Total de Peças: ${totalSoldQty} un. | Total Vendido:`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: settlementData.totalSold.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: soldHead,
                    body: soldBody,
                    theme: 'striped',
                    headStyles: { fillColor: [22, 160, 133] }, // Cor Verde
                    columnStyles: { // Alinhamento das novas colunas
                        0: { halign: 'center' }, // Qtd
                        3: { halign: 'right' },  // Valor Unit
                        4: { halign: 'right' }   // Valor Total
                    }
                });
                currentY = doc.lastAutoTable.finalY + 10; // Atualiza a posição
            }

            // --- 3. Tabela de Itens Devolvidos (itemsReturnedFlattened) ---

            // REAGRUPA os itens retornados (que estão "flat")
            const returnedGroups = {};
            itemsReturnedFlattened.forEach(item => {
                if (!returnedGroups[item.ref]) {
                    returnedGroups[item.ref] = { ...item, count: 0 };
                }
                returnedGroups[item.ref].count += 1;
            });
            const returnedBodyData = Object.values(returnedGroups); // Agora é uma lista agrupada

            if (returnedBodyData.length > 0) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Itens Devolvidos (Retornando ao Estoque)', leftMargin, currentY);
                currentY += 7;

                const returnedHead = [['Qtd.', 'Ref.', 'Produto Devolvido']]; // Cabeçalho com Qtd
                let totalReturnedQty = 0;
                const returnedBody = returnedBodyData.map(item => {
                    totalReturnedQty += item.count;
                    return [
                        item.count, // A quantidade devolvida
                        item.ref,
                        item.nome
                    ];
                });

                returnedBody.push([
                    { content: 'Total Devolvido:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalReturnedQty} un.`, styles: { fontStyle: 'bold', halign: 'center' } }
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: returnedHead,
                    body: returnedBody,
                    theme: 'grid',
                    headStyles: { fillColor: [192, 57, 43] }, // Cor Vermelha
                    columnStyles: {
                        0: { halign: 'center' } // Qtd
                    }
                });
                currentY = doc.lastAutoTable.finalY + 10;
            }

            // --- 4. Resumo Financeiro (atualizado) ---
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Resumo Financeiro', leftMargin, currentY);
            currentY += 7;

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Total Vendido: ${formatCurrency(settlementData.totalSold)}`, 20, currentY);
            currentY += 7;
            doc.text(`Comissão (${settlementData.commissionPercent}%): - ${formatCurrency(settlementData.commissionAmount)}`, 20, currentY);
            currentY += 7;
            
            if (settlementData.discountAmount && settlementData.discountAmount > 0) {
                doc.text(`Desconto: - ${formatCurrency(settlementData.discountAmount)}`, 20, currentY);
                currentY += 5;
                if (settlementData.discountReason) {
                    doc.setFontSize(10);
                    doc.text(`Motivo: ${settlementData.discountReason}`, 25, currentY);
                    currentY += 5;
                    doc.setFontSize(12);
                }
                currentY += 2;
            }

            doc.text(`Comissão (${settlementData.commissionPercent}%): - ${formatCurrency(settlementData.commissionAmount)}`, 20, currentY);
            currentY += 7;

            doc.text(`Forma de Pagamento: ${settlementData.paymentMethod}`, 20, currentY);
            currentY += 7;

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`VALOR TOTAL A PAGAR: ${formatCurrency(settlementData.finalAmountPaid)}`, 20, currentY);

            // --- 5. Abrir o PDF ---
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        }
        // --- FIM DA GERAÇÃO DE RELATÓRIO ---
        /**
         * Gera um Relatório de Venda (Direta ou Consignação Finalizada) em PDF
         */
        async function generateSaleReportPDF(sale) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            const formatCurrency = (val) => `R$ ${val !== undefined && val !== null ? val.toFixed(2).replace('.', ',') : '0,00'}`;

            // --- 1. Título e Cabeçalho ---
            const reportTitle = sale.type === 'direta' ? 'Relatório de Venda Direta' : 'Relatório de Consignação Finalizada';
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(reportTitle, 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Cliente: ${sale.clientId || 'Consumidor Final'}`, 15, 35);
            const saleDate = sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/D';
            doc.text(`Data da Venda: ${saleDate}`, 15, 42);

            let currentY = 55;

            // --- 2. Tabela de Itens Vendidos ---
            let totalQty = 0;
            if (sale.items && sale.items.length > 0) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Itens Vendidos', 15, currentY);
                currentY += 7;

                const soldHead = [['Qtd.', 'Ref.', 'Produto', 'Valor Unit. (R$)', 'Total (R$)']];
                const soldBody = sale.items.map(item => {
                    const qty = parseInt(item.quantity) || 1;
                    totalQty += qty;
                    return [
                        qty,
                        item.ref,
                        item.nome,
                        item.venda.toFixed(2),
                        (item.venda * qty).toFixed(2)
                    ];
                });

                doc.autoTable({
                    startY: currentY,
                    head: soldHead,
                    body: soldBody,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185] }, // Cor Azul
                    columnStyles: { 0: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
                });
                currentY = doc.lastAutoTable.finalY + 10;
            }

            // --- 3. Resumo Financeiro ---
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Resumo Financeiro', 15, currentY);
            currentY += 7;

            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Total de Peças: ${totalQty} un.`, 20, currentY);
            currentY += 7;
            doc.text(`Subtotal: ${formatCurrency(sale.subtotal)}`, 20, currentY);
            currentY += 7;
            doc.text(`Desconto (${sale.discountPercent}%): - ${formatCurrency(sale.discountAmount)}`, 20, currentY);

            // Mostra detalhes da comissão se for consignação finalizada
            if (sale.type === 'consignacao' && sale.settlement) {
                currentY += 7;
                doc.text(`Comissão (${sale.settlement.commissionPercent}%): - ${formatCurrency(sale.settlement.commissionAmount)}`, 20, currentY);
                if (sale.settlement.discountAmount && sale.settlement.discountAmount > 0) {
                    currentY += 7;
                    doc.text(`Desconto (Acerto): - ${formatCurrency(sale.settlement.discountAmount)}`, 20, currentY);
                    if (sale.settlement.discountReason) {
                        currentY += 5;
                        doc.setFontSize(10);
                        doc.text(`Motivo: ${sale.settlement.discountReason}`, 25, currentY);
                        doc.setFontSize(12);
                    }
                }
                currentY += 7;
                doc.text(`Comissão (${sale.settlement.commissionPercent}%): - ${formatCurrency(sale.settlement.commissionAmount)}`, 20, currentY);
            }

            currentY += 7;
            doc.text(`Forma de Pagamento: ${sale.paymentMethod || 'N/D'}`, 20, currentY);
            currentY += 9; // Mais espaço antes do total

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            const finalTotal = (sale.type === 'consignacao' && sale.settlement) ? sale.settlement.finalAmountPaid : sale.total;
            doc.text(`VALOR TOTAL PAGO: ${formatCurrency(finalTotal)}`, 20, currentY);

            // --- 4. Abrir o PDF ---
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        }
        // --- FIM DA GERAÇÃO DE RELATÓRIO DE VENDA ---
        // --- LÓGICA DE GERAR ETIQUETAS (PDF) ---

        // --- LÓGICA DO MENU LATERAL (SIDEBAR) ---
        let isDesktopCollapsed = false;

        window.toggleDesktopSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            const texts = document.querySelectorAll('.sidebar-text');
            const title = document.getElementById('sidebar-title');
            const userInfo = document.getElementById('user-info');
            const collapseIcon = document.getElementById('collapse-icon');
            const logoutBtn = document.getElementById('btn-logout');
            
            // Elementos de Imagem (Logo e Favicon)
            const sidebarLogo = document.getElementById('sidebar-logo');
            const sidebarFavicon = document.getElementById('sidebar-favicon');

            isDesktopCollapsed = !isDesktopCollapsed;

            if (isDesktopCollapsed) {
                sidebar.classList.remove('w-64');
                sidebar.classList.add('w-20');
                
                texts.forEach(t => t.classList.add('hidden'));
                title.classList.add('hidden');
                userInfo.classList.add('hidden');
                
                // Ajusta botão de sair
                logoutBtn.classList.remove('space-x-2', 'px-3');
                logoutBtn.classList.add('px-0');
                
                collapseIcon.setAttribute('data-lucide', 'chevron-right');
                
                // Troca para o Favicon
                if (sidebarLogo) sidebarLogo.classList.add('hidden');
                if (sidebarFavicon) sidebarFavicon.classList.remove('hidden');
            } else {
                sidebar.classList.add('w-64');
                sidebar.classList.remove('w-20');
                
                texts.forEach(t => t.classList.remove('hidden'));
                title.classList.remove('hidden');
                userInfo.classList.remove('hidden');
                
                logoutBtn.classList.add('space-x-2', 'px-3');
                logoutBtn.classList.remove('px-0');
                
                collapseIcon.setAttribute('data-lucide', 'chevron-left');
                
                // Troca para o Logo
                if (sidebarLogo) sidebarLogo.classList.remove('hidden');
                if (sidebarFavicon) sidebarFavicon.classList.add('hidden');
            }
            lucide.createIcons();
        };

        window.toggleMobileSidebar = function() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        };

        // Definições de layout das etiquetas PIMACO (em mm)
        // Convertido de cm (valor * 10)
        // Definições de layout das etiquetas PIMACO (em mm)
        // Baseado nas imagens fornecidas (valores em cm convertidos para mm)
        const LABEL_DEFINITIONS = {
            // --- Folha A4 (210 x 297 mm) ---
            "A4048": { pageFormat: 'a4', width: 33, height: 17, marginTop: 12.5, marginLeft: 7, cols: 6, rows: 16 },
            "A4049": { pageFormat: 'a4', width: 26, height: 15, marginTop: 13.5, marginLeft: 8, cols: 7, rows: 18, padding: 1 },
            "A4050": { pageFormat: 'a4', width: 101.6, height: 55.8, marginTop: 9, marginLeft: 4.7, cols: 2, rows: 5 },
            "A4051": { pageFormat: 'a4', width: 40.7, height: 21.2, marginTop: 10.7, marginLeft: 4.5, cols: 5, rows: 13 },
            "A4054": { pageFormat: 'a4', width: 101.6, height: 25.4, marginTop: 8.8, marginLeft: 4.7, cols: 2, rows: 11 },
            "A4055": { pageFormat: 'a4', width: 66.1, height: 31, marginTop: 9, marginLeft: 7.2, cols: 3, rows: 9 },
            "A4056": { pageFormat: 'a4', width: 66.1, height: 25.4, marginTop: 8.8, marginLeft: 7.2, cols: 3, rows: 11 },
            "A4060": { pageFormat: 'a4', width: 66.1, height: 38.1, marginTop: 15.2, marginLeft: 7.2, cols: 3, rows: 7 },
            "A4261": { pageFormat: 'a4', width: 66.1, height: 46.5, marginTop: 9.1, marginLeft: 7.2, cols: 3, rows: 6 },
            "A4062": { pageFormat: 'a4', width: 101.6, height: 33.9, marginTop: 12.9, marginLeft: 4.7, cols: 2, rows: 8 },
            "A4063": { pageFormat: 'a4', width: 101.6, height: 38.1, marginTop: 15.2, marginLeft: 4.7, cols: 2, rows: 7 },
            "A4264": { pageFormat: 'a4', width: 66.1, height: 71.9, marginTop: 4.7, marginLeft: 7.2, cols: 3, rows: 4 },
            "A4265": { pageFormat: 'a4', width: 101.6, height: 67.8, marginTop: 13, marginLeft: 4.7, cols: 2, rows: 4 },
            "A4067": { pageFormat: 'a4', width: 200, height: 288.5, marginTop: 4.3, marginLeft: 5, cols: 1, rows: 1 },
            "A4268": { pageFormat: 'a4', width: 199.9, height: 143.4, marginTop: 5.1, marginLeft: 5.1, cols: 1, rows: 2 },

            // --- Folha Carta (215.9 x 279.4 mm) ---
            "3080": { pageFormat: 'letter', width: 69.8, height: 25.4, marginTop: 12.7, marginLeft: 4.8, cols: 3, rows: 10 },
            "3081": { pageFormat: 'letter', width: 106.8, height: 25.4, marginTop: 12.7, marginLeft: 4, cols: 2, rows: 10 },
            "3082": { pageFormat: 'letter', width: 106.8, height: 33.9, marginTop: 21.2, marginLeft: 4, cols: 2, rows: 7 },
            "5580": { pageFormat: 'letter', width: 69.8, height: 25.4, marginTop: 12.7, marginLeft: 4.8, cols: 3, rows: 10 },
            "6080": { pageFormat: 'letter', width: 69.8, height: 25.4, marginTop: 12.7, marginLeft: 4.8, cols: 3, rows: 10 },
            "6081": { pageFormat: 'letter', width: 106.8, height: 25.4, marginTop: 12.7, marginLeft: 4, cols: 2, rows: 10 },
            "6082": { pageFormat: 'letter', width: 106.8, height: 33.9, marginTop: 21.2, marginLeft: 4, cols: 2, rows: 7 },
            "6083": { pageFormat: 'letter', width: 106.8, height: 50.8, marginTop: 12.7, marginLeft: 4, cols: 2, rows: 5 },
            "6084": { pageFormat: 'letter', width: 106.8, height: 84.7, marginTop: 12.7, marginLeft: 4, cols: 2, rows: 3 },
            "6085": { pageFormat: 'letter', width: 215.9, height: 279.4, marginTop: 0, marginLeft: 0, cols: 1, rows: 1 }, // Página inteira
            "6086": { pageFormat: 'letter', width: 212.7, height: 138.1, marginTop: 1.6, marginLeft: 1.6, cols: 1, rows: 2 }, // Largura 0 na tabela, assumido como página - margens
            "6087": { pageFormat: 'letter', width: 47.5, height: 12.7, marginTop: 12.7, marginLeft: 14.5, cols: 4, rows: 20 },
            "6088": { pageFormat: 'letter', width: 106.4, height: 138.1, marginTop: 1.6, marginLeft: 1.6, cols: 2, rows: 2 },
            "6089": { pageFormat: 'letter', width: 47.5, height: 16.9, marginTop: 12.7, marginLeft: 14.5, cols: 4, rows: 15 },
            "6092": { pageFormat: 'letter', width: 29.1, height: 17, marginTop: 16.9, marginLeft: 13, cols: 7, rows: 9 },
            "6093": { pageFormat: 'letter', width: 52, height: 27.4, marginTop: 15.1, marginLeft: 14.5, cols: 4, rows: 6 },
            "6094": { pageFormat: 'letter', width: 67.5, height: 48.5, marginTop: 16.7, marginLeft: 19, cols: 3, rows: 4 },
            "6095": { pageFormat: 'letter', width: 96.3, height: 59.3, marginTop: 21.2, marginLeft: 17, cols: 2, rows: 4 },
            "8096": { pageFormat: 'letter', width: 69.8, height: 30, marginTop: 12.7, marginLeft: 3.2, cols: 3, rows: 8 },
            "8098": { pageFormat: 'letter', width: 101.6, height: 42.3, marginTop: 12.7, marginLeft: 12.7, cols: 2, rows: 6 },
            "8099F": { pageFormat: 'letter', width: 83.8, height: 46.6, marginTop: 23.3, marginLeft: 27.2, cols: 2, rows: 5 },
            "8099L": { pageFormat: 'letter', width: 34.1, height: 16.9, marginTop: 12.7, marginLeft: 34.1, cols: 5, rows: 15 },

            // --- Genéricos (Mantidos) ---
            "gen-30x15": { pageFormat: 'a4', width: 30, height: 15, marginTop: 5, marginLeft: 5, cols: 6, rows: 18 },
            "gen-40x20": { pageFormat: 'a4', width: 40, height: 20, marginTop: 5, marginLeft: 5, cols: 5, rows: 14 },
            "gen-50x25": { pageFormat: 'a4', width: 50, height: 25, marginTop: 5, marginLeft: 5, cols: 4, rows: 11 },
            "gen-60x40": { pageFormat: 'a4', width: 60, height: 40, marginTop: 5, marginLeft: 5, cols: 3, rows: 7 }
        };
        // Adiciona margens direitas/inferiores (assumindo que são iguais)
        Object.keys(LABEL_DEFINITIONS).forEach(key => {
            const def = LABEL_DEFINITIONS[key];
            def.marginRight = def.marginLeft;
            def.marginBottom = def.marginTop;
        });

        const btnGenerateLabels = document.getElementById('btn-generate-labels');

        if (btnGenerateLabels) {
            btnGenerateLabels.addEventListener('click', async () => {
                // 1. Pegar IDs e Quantidades
                const selectedCheckboxes = document.querySelectorAll('#label-product-list input.label-product-checkbox:checked');
                const productsToPrint = []; // Array de objetos {id, qty}

                selectedCheckboxes.forEach(cb => {
                    const id = cb.dataset.id;
                    const qtyInput = labelProductListContainer.querySelector(`.label-product-qty[data-id="${id}"]`);
                    const qty = parseInt(qtyInput.value) || 1; // Pega o valor, ou 1 se for inválido

                    productsToPrint.push({ id, qty });
                });

                if (productsToPrint.length === 0) {
                    showModal("Atenção", "Selecione pelo menos um produto para gerar etiquetas.");
                    return;
                }

                // 2. Pegar formato da etiqueta (igual)
                const formatKey = document.getElementById('label-format').value;
                const definition = LABEL_DEFINITIONS[formatKey];

                if (!definition) {
                    showModal("Erro", "Formato de etiqueta não reconhecido ou ainda não implementado.");
                    return;
                }

                // 3. Mostrar "Carregando" (igual)
                showModal("Gerando PDF", "Buscando dados e preparando o arquivo. Por favor, aguarde.");

                try {
                    // 4. Buscar dados completos dos produtos (passando o novo array)
                    const productsWithData = await fetchProductsByIds(productsToPrint);

                    // Ler opções de início (para reutilizar folhas)
                    const startRow = parseInt(document.getElementById('label-start-row').value) || 1;
                    const startCol = parseInt(document.getElementById('label-start-col').value) || 1;

                    // 5. Gerar o PDF (passando o novo array)
                    await generateLabelPDF(productsWithData, definition, { startRow, startCol });

                    hideModal(); // Esconde o "Carregando"

                } catch (error) {
                    console.error("Erro ao gerar PDF:", error);
                    showModal("Erro", "Não foi possível gerar o PDF: " + error.message);
                }
            });
        }

        /**
         * Helper: Busca dados de produtos por um array de IDs
         */
        /**
         * Helper: Busca dados de produtos por um array de objetos {id, qty}
         */
        async function fetchProductsByIds(productsToFetch) {
            const productsWithData = [];
            if (!userId || productsToFetch.length === 0) return productsWithData;

            const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;

            // Mapeia ID -> Quantidade, para sabermos depois
            const qtyMap = new Map();
            productsToFetch.forEach(p => qtyMap.set(p.id, p.qty));

            // Busca os documentos (em paralelo)
            const readPromises = [];
            productsToFetch.forEach(p => {
                const docRef = doc(db, collectionPath, p.id);
                readPromises.push(getDoc(docRef));
            });

            const docSnapshots = await Promise.all(readPromises);

            // Anexa os dados do Firestore à quantidade solicitada
            docSnapshots.forEach(docSnap => {
                if (docSnap.exists()) {
                    productsWithData.push({
                        id: docSnap.id,
                        ...docSnap.data(),
                        qtyToPrint: qtyMap.get(docSnap.id) // <-- Anexa a quantidade!
                    });
                }
            });

            return productsWithData;
        }
        /**
 /**
  * Função principal que desenha o PDF (Layout: Preço, Barcode, Nome/Ref)
  */
        async function generateLabelPDF(productsWithData, def, startOptions = {}) {
            const { jsPDF } = window.jspdf;

            const doc = new jsPDF({
                unit: 'mm',
                format: def.pageFormat || 'a4',
                orientation: 'portrait'
            });

            const canvas = document.getElementById('barcode-canvas');

            // Cálculos de espaçamento (iguais a antes)
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const gapH = (def.cols > 1) ? (pageW - def.marginLeft - def.marginRight - (def.cols * def.width)) / (def.cols - 1) : 0;
            const gapV = (def.rows > 1) ? (pageH - def.marginTop - def.marginBottom - (def.rows * def.height)) / (def.rows - 1) : 0;

            // Configura posição inicial (baseado no input do usuário)
            let col = (startOptions.startCol || 1) - 1;
            let row = (startOptions.startRow || 1) - 1;

            // Validações básicas para evitar erros de índice
            if (col < 0) col = 0;
            if (row < 0) row = 0;
            while (col >= def.cols) { col -= def.cols; row++; } // Wrap se coluna exceder
            if (row >= def.rows) { row = 0; col = 0; } // Reseta se linha exceder (nova página)

        // Conta o total de etiquetas para não criar uma página extra em branco no final
        let totalLabels = 0;
        productsWithData.forEach(p => totalLabels += p.qtyToPrint);
        let labelsPrinted = 0;

            for (const product of productsWithData) {
                for (let i = 0; i < product.qtyToPrint; i++) {
                labelsPrinted++;

                    const x = def.marginLeft + (col * (def.width + gapH));
                    const y = def.marginTop + (row * (def.height + gapV));

                    const labelH = def.height;
                    const labelW = def.width;
                    
                    // Ajuste para etiquetas pequenas (altura < 20mm) para evitar sobreposição
                    const isSmallLabel = labelH < 20;
                    // Use o padding da definição, ou o padrão se não existir
                    const padding = def.padding !== undefined ? def.padding : (isSmallLabel ? 1 : 2);
                    // --- LAYOUT EM 3 ZONAS (TOPO, MEIO, BASE) ---

                    // ZONA 1: PREÇO (Topo)
                    // Se for pequena, reduz o espaço do topo
                    const yPos_Price = y + padding + (isSmallLabel ? 2 : 1);

                    // ZONA 3: NOME/REF (Base)
                    // Se for pequena, reduz a margem inferior para aproveitar mais espaço
                    const yPos_BottomText = y + labelH - padding - (isSmallLabel ? 3.5 : 2.5);

                    // ZONA 2: BARCODE (Meio)
                    // O barcode ocupa o espaço entre o Preço e o Nome/Ref
                    const gapTop = isSmallLabel ? 1 : 3;
                    const gapBottom = isSmallLabel ? 2.5 : 2;
                    
                    const barcodeAreaStartY = yPos_Price + gapTop;
                    const barcodeAreaEndY = yPos_BottomText - gapBottom;
                    
                    let availableH = barcodeAreaEndY - barcodeAreaStartY;
                    const minBarcodeH = isSmallLabel ? 3 : 5;
                    
                    let barcodeDisplayHeight = Math.max(minBarcodeH, availableH);
                    let yPos_Barcode = barcodeAreaStartY;
                    
                    // Ajuste de segurança para não invadir o texto em etiquetas muito pequenas
                    if (isSmallLabel && availableH < minBarcodeH) {
                         yPos_Barcode = barcodeAreaEndY - barcodeDisplayHeight;
                    }

                    // --- DESENHA OS ELEMENTOS ---

                    // 1. Preço (NO TOPO)
                    doc.setFontSize(9); // Fonte maior
                    doc.setFont(undefined, 'bold');
                    const preco = `R$ ${product.venda.toFixed(2).replace('.', ',')}`;
                    doc.text(preco, x + labelW / 2, yPos_Price, { align: 'center', maxWidth: labelW - (padding * 2) });

                    // 2. Código de Barras (NO MEIO)
                    try {
                        JsBarcode(canvas, product.ref, {
                            format: "CODE128", width: 1.5, height: 40,
                            fontSize: 10, margin: 0, displayValue: false
                        });
                        const barcodeDataUrl = canvas.toDataURL('image/png');
                        const barcodePdfWidth = labelW - (padding * 2); // Ocupa a largura com padding
                        const barcodePdfX = x + padding; // Centralizado com padding

                        doc.addImage(barcodeDataUrl, 'PNG', barcodePdfX, yPos_Barcode, barcodePdfWidth, barcodeDisplayHeight);
                    } catch (e) {
                        console.error("Erro ao gerar barcode:", e);
                        doc.text(`Erro Barcode`, x + labelW / 2, yPos_Barcode + (barcodeDisplayHeight / 2), { align: 'center' });
                    }

                    // 3. Nome e Referência (EMBAIXO, EM LINHA ÚNICA)
                    const fontSize = isSmallLabel ? 5 : 6;
                    doc.setFontSize(fontSize); // Fonte ajustada
                    doc.setFont(undefined, 'normal');

                    // Trunca o nome do produto para não ficar muito longo
                    const maxNameChars = isSmallLabel ? 12 : 20;
                    const nomeTruncado = product.nome.length > maxNameChars ? product.nome.substring(0, maxNameChars) + '...' : product.nome;
                    
                    let displayRef = product.ref;
                    if (product.ref2) {
                        displayRef += ` / ${product.ref2}`;
                    }

                    const refText = `Ref: ${displayRef} | ${nomeTruncado}`;

                    doc.text(refText, x + labelW / 2, yPos_BottomText, { align: 'center', maxWidth: labelW - (padding * 2) });

                    // --- Avança para a próxima etiqueta ---
                    col++;
                    if (col >= def.cols) { col = 0; row++; }
                    if (row >= def.rows) { 
                        col = 0; 
                        row = 0; 
                        if (labelsPrinted < totalLabels) {
                            doc.addPage(); 
                        }
                    }

                } // --- Fim do loop INTERNO (quantidade) ---

            } // --- Fim do loop EXTERNO (produto) ---

            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        }

        /**
         * Exporta os itens de uma consignação para Excel (.xlsx)
         */
        function exportConsignmentToExcel(consignmentId) {
            const sale = allSales.find(s => s.id === consignmentId);
            if (!sale) {
                showModal("Erro", "Consignação não encontrada.");
                return;
            }

            if (!sale.items || sale.items.length === 0) {
                showModal("Aviso", "Esta consignação não possui itens para exportar.");
                return;
            }

            // Prepara os dados
            const dataToExport = sale.items.map(item => {
                let categoria = item.categoria || "";
                let ref2 = item.ref2 || "";
                let fotoUrl = item.fotoUrl || "";

                if (!categoria || !ref2 || !fotoUrl) {
                    const productInCache = allUserProducts.find(p => p.id === item.id || p.ref === item.ref);
                    if (productInCache) {
                        if (!categoria) categoria = productInCache.categoria;
                        if (!ref2) ref2 = productInCache.ref2;
                        if (!fotoUrl) fotoUrl = productInCache.fotoUrl || "";
                    }
                }
                
                if (!categoria) categoria = "N/D";

                return {
                    "Nome": item.nome,
                    "Código": item.ref,
                    "Ref. 2": ref2 || "",
                    "Categoria": categoria,
                    "Quantidade": item.quantity || 1,
                    "Preço": item.venda,
                    "Link da Imagem": fotoUrl
                };
            });

            // Cria a planilha
            const ws = XLSX.utils.json_to_sheet(dataToExport);

            // Cria o workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Itens Consignados");

            // Nome do arquivo
            const clientName = (sale.clientId || "Cliente").replace(/[^a-z0-9]/gi, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `Consignacao_${clientName}_${dateStr}.xlsx`;

            // Download
            XLSX.writeFile(wb, filename);
        }

        /**
         * Exibe um modal customizado para perguntar se o usuário quer imprimir com ou sem fotos
         */
        function showPrintConsignConfirmation(saleData, dueDateString, isUpdate = false) {
            modalTitle.textContent = isUpdate ? 'Consignação Atualizada' : 'Opções de Impressão';
            modalBody.innerHTML = `
                <p class="text-lg font-medium mb-2 text-gray-800">${isUpdate ? 'A consignação foi atualizada com sucesso!' : 'Gerar Comprovante'}</p>
                <p class="text-gray-600">Deseja gerar o comprovante de consignação <strong>COM</strong> ou <strong>SEM</strong> as fotos dos produtos?</p>
                <p class="text-sm text-gray-500 mt-3 bg-gray-50 p-3 rounded border border-gray-200">
                    <i data-lucide="info" class="w-4 h-4 inline mr-1 text-indigo-500"></i>
                    A opção <strong>"Com Fotos"</strong> pode demorar alguns segundos a mais para carregar e inserir as imagens no arquivo PDF.
                </p>
                <div class="mt-6 text-right space-x-2">
                    <button type="button" id="btn-print-cancel" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Não Imprimir</button>
                    <button type="button" id="btn-print-without-photos" class="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">Imprimir SEM Fotos</button>
                    <button type="button" id="btn-print-with-photos" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Imprimir COM Fotos</button>
                </div>
            `;
            modalContainer.style.display = 'flex';
            lucide.createIcons();

            document.getElementById('btn-print-cancel').onclick = hideModal;

            document.getElementById('btn-print-without-photos').onclick = async () => {
                hideModal();
                try {
                    await generateConsignmentOpeningReport(saleData, saleData.id, dueDateString, false);
                } catch(e) {
                    console.error("Erro ao gerar PDF:", e);
                    showModal("Erro", "Houve um problema ao gerar o PDF sem fotos.");
                }
            };

            document.getElementById('btn-print-with-photos').onclick = async () => {
                hideModal();
                try {
                    await generateConsignmentOpeningReport(saleData, saleData.id, dueDateString, true);
                } catch(e) {
                    console.error("Erro ao gerar PDF:", e);
                    showModal("Erro", "Houve um problema ao gerar o PDF com fotos.");
                }
            };
        }

        /**
        * Gera um Comprovante de Retirada de Consignação em PDF
        * (CORRIGIDO com quebra de linha dinâmica para o NOME DO CLIENTE no CABEÇALHO e na ASSINATURA)
        */
        async function generateConsignmentOpeningReport(saleData, newSaleId, dueDateString, includeImages = false) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const formatCurrency = (val) => `R$ ${val !== undefined && val !== null ? val.toFixed(2).replace('.', ',') : '0,00'}`;
            const today = new Date().toLocaleDateString('pt-BR');

            // Converte a string YYYY-MM-DD para uma data JS e depois para o formato PT-BR
            const dueDate = new Date(dueDateString + 'T00:00:00').toLocaleDateString('pt-BR');

            // --- 1. Título e Cabeçalho (COM POSIÇÃO Y DINÂMICA) ---
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Comprovante de Retirada (Consignação)', 105, 20, { align: 'center' });

            // Define as margens e a posição Y inicial
            const leftMargin = 15;
            const rightMargin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const maxWidth = pageWidth - leftMargin - rightMargin; // Largura útil (aprox. 180mm)
            let currentY = 35; // Posição Y inicial (abaixo do título)
            const lineSpacing = 7; // Espaço entre as linhas do cabeçalho
            const smallLineSpacing = 5; // Espaço menor para textos de 8-10pt

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            currentY += lineSpacing; // Move o Y para a próxima linha

            doc.setFontSize(12);

            // --- Linha Cliente/Revendedor (Cabeçalho) ---
            const clientText = `Cliente/Revendedor(a): ${saleData.clientId || 'N/D'}`;
            // Desenha o texto com quebra de linha automática
            doc.text(clientText, leftMargin, currentY, { maxWidth: maxWidth });

            // Calcula quantas linhas o texto do cliente usou
            const clientTextLines = doc.splitTextToSize(clientText, maxWidth);
            // Move o Y para baixo com base no número de linhas que o nome ocupou
            currentY += (clientTextLines.length * lineSpacing);

            // --- Fim da correção do cabeçalho ---

            doc.text(`Data da Retirada: ${today}`, leftMargin, currentY);
            currentY += lineSpacing; // Move o Y para a próxima linha

            doc.setFont(undefined, 'bold');
            doc.text(`Data Prevista do Acerto: ${dueDate}`, leftMargin, currentY);
            currentY += lineSpacing; // Move o Y para a próxima linha

            doc.setFont(undefined, 'normal');
            currentY += 10; // Adiciona um espaço extra antes da tabela

            // --- 2. Tabela de Itens Consignados ---
            if (saleData.items && saleData.items.length > 0) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Itens Retirados', leftMargin, currentY); // Usa o Y dinâmico
                currentY += 7;

                let itemsToPrint = saleData.items;
                // Se o usuário optou por gerar com imagens, baixamos e processamos antes
                if (includeImages) {
                    showModal("Carregando...", "Baixando e processando as imagens para o PDF. Por favor, aguarde.");
                    itemsToPrint = await Promise.all(saleData.items.map(async (item) => {
                        let base64 = null;
                        let fotoUrl = item.fotoUrl;
                        // Se não encontrar foto na venda salva, busca no histórico de produtos vivos
                        if (!fotoUrl) {
                            const prodInCache = allUserProducts.find(p => p.id === item.id || p.ref === item.ref);
                            if (prodInCache) fotoUrl = prodInCache.fotoUrl;
                        }
                        if (fotoUrl) {
                            base64 = await getBase64FromImage(fotoUrl);
                        }
                        return { ...item, base64 };
                    }));
                    hideModal();
                }

                // Cabeçalho e corpo da tabela
                const tableHead = includeImages 
                    ? [['Qtd.', 'Imagem', 'Ref.', 'Produto', 'Valor Unit. (R$)', 'Valor Total (R$)']]
                    : [['Qtd.', 'Ref.', 'Produto', 'Valor Unit. (R$)', 'Valor Total (R$)']];

                let totalQty = 0;
                const tableBody = itemsToPrint.map(item => {
                    const venda = parseFloat(item.venda) || 0;
                    const qtd = parseInt(item.quantity) || 1;
                    totalQty += qtd;
                    const row = [
                        qtd,
                        item.ref || '',
                        item.nome || '',
                        venda.toFixed(2).replace('.', ','),
                        (venda * qtd).toFixed(2).replace('.', ',')
                    ];
                    // Adiciona uma coluna vazia como "placeholder" para desenhar a imagem por cima
                    if (includeImages) {
                        row.splice(1, 0, '');
                    }
                    return row;
                });

                tableBody.push([
                    {
                        content: `Total de Peças: ${totalQty} un. | Valor Total Consignado:`,
                        colSpan: includeImages ? 5 : 4,
                        styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, fillColor: [240, 240, 240] }
                    },
                    {
                        content: formatCurrency(saleData.total),
                        styles: { fontStyle: 'bold', fontSize: 11, fillColor: [240, 240, 240], halign: 'right' }
                    }
                ]);

                let columnStyles = {
                    0: { halign: 'center' }
                };
                if (includeImages) {
                    columnStyles[1] = { halign: 'center', cellWidth: 15 };
                    columnStyles[4] = { halign: 'right' };
                    columnStyles[5] = { halign: 'right' };
                } else {
                    columnStyles[3] = { halign: 'right' };
                    columnStyles[4] = { halign: 'right' };
                }

                let autoTableConfig = {
                    startY: currentY,
                    head: tableHead,
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229] },
                    columnStyles: columnStyles,
                    didParseCell: function (data) {
                        if (data.row.index === tableBody.length - 1) {
                            data.cell.styles.fillColor = [224, 231, 255];
                            data.cell.styles.textColor = [0, 0, 0];
                        }
                    }
                };

                // A propriedade bodyStyles só é injetada se includeImages for verdadeiro
                // Isso evita passar 'undefined' e causar sobreposição de linhas
                if (includeImages) {
                    autoTableConfig.bodyStyles = { minCellHeight: 12 };
                    autoTableConfig.didDrawCell = function (data) {
                        if (data.section === 'body' && data.column.index === 1) {
                            const itemRow = itemsToPrint[data.row.index];
                            // Verificação segura para evitar o "TypeError" caso o index não exista ou seja nulo
                            if (itemRow && itemRow.base64) {
                                const imgBase64 = itemRow.base64;
                                const dim = 10;
                                const x = data.cell.x + (data.cell.width - dim) / 2;
                                const y = data.cell.y + (data.cell.height - dim) / 2;
                                try {
                                    doc.addImage(imgBase64, 'JPEG', x, y, dim, dim);
                                } catch (e) {
                                    console.error("Erro ao desenhar imagem no PDF:", e);
                                }
                            }
                        }
                    };
                }

                doc.autoTable(autoTableConfig);
                currentY = doc.lastAutoTable.finalY + 15; // Atualiza o Y para depois da tabela
            }

            // --- 3. Linhas de Assinatura (COM CORREÇÃO DE QUEBRA DE LINHA) ---
            doc.setFontSize(10);
            // Posição Y inicial da assinatura
            let signatureY = currentY + 10;

            // Assinatura da Loja (Esquerda)
            doc.text('________________________________________', 30, signatureY);
            doc.text('Assinatura Responsável (Loja)', 30, signatureY + smallLineSpacing);

            // --- Assinatura do Revendedor (Direita) ---
            doc.text('________________________________________', 120, signatureY);

            // Define o texto da assinatura
            const signatureText = `Assinatura Revendedor(a) (${saleData.clientId || ''})`;
            const signatureMaxWidth = 80; // Largura máxima (180mm total - 100mm de margem esquerda)
            const signatureXPos = 120;
            let signatureTextY = signatureY + smallLineSpacing;

            // Desenha o texto da assinatura com quebra de linha
            doc.text(signatureText, signatureXPos, signatureTextY, { maxWidth: signatureMaxWidth });

            // Calcula quantas linhas o texto da assinatura usou
            const signatureTextLines = doc.splitTextToSize(signatureText, signatureMaxWidth);
            // Calcula a nova posição Y para a linha de declaração, baseada na altura do texto da assinatura
            let declarationYPos = signatureTextY + (signatureTextLines.length * smallLineSpacing);

            // --- Declaração (Direita) ---
            doc.setFontSize(8);
            const declarationText = 'Declaro que recebi os produtos listados acima para venda em consignação.';
            const declarationMaxWidth = 80; // Mesma largura máxima
            const declarationXPos = 120;

            // Garante um pequeno espaço entre a assinatura e a declaração
            declarationYPos += 1;

            doc.text(declarationText, declarationXPos, declarationYPos, { maxWidth: declarationMaxWidth });

            // --- 4. Abrir o PDF ---
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        }
        // --- LÓGICA DE ATIVAÇÃO DOS CAMPOS DE QTD DAS ETIQUETAS ---
        const labelProductListContainer = document.getElementById('label-product-list');
        
        if (labelProductListContainer) {
            // Usamos 'input' para capturar tanto a mudança do checkbox quanto a digitação na quantidade
            labelProductListContainer.addEventListener('input', (e) => {
                const target = e.target;
                const productId = target.dataset.id;
        
                if (!productId) return;
        
                // Caso 1: O Checkbox foi alterado
                if (target.classList.contains('label-product-checkbox')) {
                    const qtyInput = labelProductListContainer.querySelector(`.label-product-qty[data-id="${productId}"]`);
        
                    if (target.checked) {
                        // Adiciona ao estado
                        const qty = parseInt(qtyInput.value) || 1;
                        selectedLabelsState[productId] = qty;
        
                        // Atualiza a UI
                        qtyInput.disabled = false;
                        qtyInput.classList.remove('bg-gray-100');
                        qtyInput.focus();
                        qtyInput.select();
                    } else {
                        // Remove do estado
                        delete selectedLabelsState[productId];
        
                        // Atualiza a UI
                        qtyInput.disabled = true;
                        qtyInput.classList.add('bg-gray-100');
                        qtyInput.value = 1; // Reseta o valor na UI
                    }
                }
        
                // Caso 2: A Quantidade foi alterada
                if (target.classList.contains('label-product-qty')) {
                    const newQty = parseInt(target.value) || 1;
                    // Atualiza o estado apenas se o produto já estiver selecionado
                    if (selectedLabelsState.hasOwnProperty(productId)) {
                        selectedLabelsState[productId] = newQty;
                    }
                }
            });
        }
        
        // --- LÓGICA DE SELECIONAR TODOS E APLICAR QTD EM LOTE ---
        const labelSelectAllBtn = document.getElementById('label-select-all');
        const btnApplyBatchQty = document.getElementById('btn-apply-batch-qty');
        const labelBatchQty = document.getElementById('label-batch-qty');
        
        if (labelSelectAllBtn) {
            labelSelectAllBtn.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const checkboxes = document.querySelectorAll('#label-product-list .label-product-checkbox');
                
                checkboxes.forEach(cb => {
                    if (cb.checked !== isChecked) {
                        cb.checked = isChecked;
                        // Dispara o evento de input para o listener do container atualizar o estado e a UI
                        cb.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });
        }
        
        if (btnApplyBatchQty) {
            btnApplyBatchQty.addEventListener('click', (e) => {
                e.preventDefault();
                const newQty = parseInt(labelBatchQty.value);
                
                if (isNaN(newQty) || newQty < 1) {
                    showModal("Erro", "Insira uma quantidade válida maior que zero.");
                    return;
                }
                
                const selectedCheckboxes = document.querySelectorAll('#label-product-list .label-product-checkbox:checked');
                
                if (selectedCheckboxes.length === 0) {
                    showModal("Atenção", "Selecione pelo menos um produto na lista para aplicar a quantidade.");
                    return;
                }

                selectedCheckboxes.forEach(cb => {
                    const productId = cb.dataset.id;
                    const qtyInput = document.querySelector(`.label-product-qty[data-id="${productId}"]`);
                    
                    if (qtyInput) {
                        qtyInput.value = newQty;
                        // Dispara o evento para atualizar o estado interno 'selectedLabelsState'
                        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });
        }
        // --- FIM DA LÓGICA DE ATIVAÇÃO ---
        // --- LÓGICA DOS FILTROS DA PÁGINA "VISUALIZAR PRODUTOS" ---
        const productSearchInput = document.getElementById('product-search-input');
        const productDateStart = document.getElementById('product-date-start');
        const productDateEnd = document.getElementById('product-date-end');
        const productInStockOnly = document.getElementById('product-in-stock-only');
        const productNoPhotoOnly = document.getElementById('product-no-photo-only');
        const productClearFilters = document.getElementById('product-clear-filters');

        // "Ligar" os listeners para chamar a função de filtro unificada
        if (productSearchInput) {
            productSearchInput.addEventListener('input', applyProductViewFilters);
            productSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    productSearchInput.value = ''; // Limpa o campo sem atualizar a tabela
                }
            });
        }
        if (productDateStart) productDateStart.addEventListener('change', applyProductViewFilters);
        if (productDateEnd) productDateEnd.addEventListener('change', applyProductViewFilters);
        if (productInStockOnly) productInStockOnly.addEventListener('change', applyProductViewFilters);
        if (productNoPhotoOnly) productNoPhotoOnly.addEventListener('change', applyProductViewFilters);

        // "Ligar" o botão de limpar
        if (productClearFilters) {
            productClearFilters.addEventListener('click', (e) => {
                e.preventDefault();
                productSearchInput.value = '';
                productDateStart.value = '';
                productDateEnd.value = '';
                if (productInStockOnly) productInStockOnly.checked = false;
                if (productNoPhotoOnly) productNoPhotoOnly.checked = false;
                applyProductViewFilters(); // Re-executa com filtros limpos
            });
        }
        // --- FIM DOS FILTROS ---
        // --- LÓGICA DO FILTRO DE BUSCA (PESSOAS) ---
        const peopleSearchInput = document.getElementById('people-search-input');

        /**
         * Filtra a lista global de pessoas (allUserPeople) com base em um termo.
         */
        function filterPeople(searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            if (!term) {
                return allUserPeople; // Retorna tudo se o filtro estiver vazio
            }

            return allUserPeople.filter(person => {
                // Verifica se o termo existe no nome, email ou cpf (se houver)
                return (
                    (person.nome && person.nome.toLowerCase().includes(term)) ||
                    (person.email && person.email.toLowerCase().includes(term)) ||
                    (person.cpf && person.cpf.toLowerCase().includes(term)) ||
                    (person.telefone && person.telefone.toLowerCase().includes(term))
                );
            });
        }

        /**
         * Aplica TODOS os filtros da página de pessoas (texto e tipo) e atualiza a tabela
         */
        function applyPeopleFilters() {
            const searchTerm = document.getElementById('people-search-input').value.toLowerCase().trim();
            const filterType = document.getElementById('people-type-filter').value; // ex: 'cliente', 'revendedor', 'todos'

            let filtered = allUserPeople; // Começa com a lista completa

            // 1. Filtro por Texto (lógica que você já tinha em filterPeople)
            if (searchTerm) {
                filtered = filtered.filter(person =>
                    (person.nome && person.nome.toLowerCase().includes(searchTerm)) ||
                    (person.email && person.email.toLowerCase().includes(searchTerm)) ||
                    (person.cpf && person.cpf.toLowerCase().includes(searchTerm)) ||
                    (person.telefone && person.telefone.toLowerCase().includes(searchTerm))
                );
            }

            // 2. Filtro por Tipo
            if (filterType !== 'todos') {
                filtered = filtered.filter(person => person.tipo === filterType);
            }

            // 3. Renderiza o resultado final
            renderPeopleList(filtered);
        }

        if (peopleSearchInput) {
            peopleSearchInput.addEventListener('input', applyPeopleFilters);
            peopleSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    peopleSearchInput.value = '';
                }
            });
        }
        // NOVO BLOCO (para ligar o dropdown)
        const peopleTypeFilter = document.getElementById('people-type-filter');
        if (peopleTypeFilter) {
            peopleTypeFilter.addEventListener('change', applyPeopleFilters);
        }
        // --- FIM DO FILTRO DE BUSCA (PESSOAS) ---
        /**
 * Aplica TODOS os filtros da página Visualizar Produtos (texto e data) e atualiza a tabela
 */
        function applyProductViewFilters() {
            // 1. Lê os valores de todos os filtros
            const searchTerm = document.getElementById('product-search-input').value.toLowerCase().trim();
            const startDate = document.getElementById('product-date-start').value ? new Date(document.getElementById('product-date-start').value + 'T00:00:00') : null;
            const endDate = document.getElementById('product-date-end').value ? new Date(document.getElementById('product-date-end').value + 'T23:59:59') : null;
            const inStockOnly = document.getElementById('product-in-stock-only')?.checked;
            const noPhotoOnly = document.getElementById('product-no-photo-only')?.checked;

            let filtered = allUserProducts; // Começa com a lista global completa

            // 2. Filtra por Texto (lógica que você já tinha)
            if (searchTerm) {
                filtered = filtered.filter(prod => {
                    const textMatch = (prod.nome && prod.nome.toLowerCase().includes(searchTerm)) ||
                        (prod.ref && prod.ref.toLowerCase().includes(searchTerm)) ||
                        (prod.ref2 && prod.ref2.toLowerCase().includes(searchTerm)) ||
                        (prod.categoria && prod.categoria.toLowerCase().includes(searchTerm));

                    if (textMatch) return true;

                    // Verifica se está com alguma revendedora que bate com o texto
                    const consignments = getConsignments(prod.id);
                    return consignments.some(c => c.clientId && c.clientId.toLowerCase().includes(searchTerm));
                });
            }

            // 3. Filtra por Data de Início (usa o 'createdAt' do produto)
            if (startDate) {
                filtered = filtered.filter(prod => {
                    if (!prod.createdAt || !prod.createdAt.toDate) return false; // Ignora produtos sem data
                    const productDate = prod.createdAt.toDate();
                    return productDate >= startDate;
                });
            }

            // 4. Filtra por Data de Fim
            if (endDate) {
                filtered = filtered.filter(prod => {
                    if (!prod.createdAt || !prod.createdAt.toDate) return false; // Ignora produtos sem data
                    const productDate = prod.createdAt.toDate();
                    return productDate <= endDate;
                });
            }

            // 5. Filtra por Estoque > 0
            if (inStockOnly) {
                filtered = filtered.filter(prod => prod.estoque > 0);
            }

            // 6. Filtra por Sem Foto
            if (noPhotoOnly) {
                filtered = filtered.filter(prod => !prod.fotoUrl || prod.fotoUrl.trim() === '');
            }

            // 5. Renderiza o resultado final na tabela
            renderProductList(filtered);
        }
        // --- LÓGICA DOS FILTROS DA ABA ETIQUETAS ---
        const labelSearchInput = document.getElementById('label-search-input');
        const labelDateStart = document.getElementById('label-date-start');
        const labelDateEnd = document.getElementById('label-date-end');
        const labelClearFilters = document.getElementById('label-clear-filters');

        /**
         * Filtra a lista 'allUserProducts' e chama 'renderLabelList'
         */
        function applyLabelFilters() {
            const searchTerm = labelSearchInput.value.toLowerCase().trim();
            const startDate = labelDateStart.value ? new Date(labelDateStart.value + 'T00:00:00') : null;
            const endDate = labelDateEnd.value ? new Date(labelDateEnd.value + 'T23:59:59') : null;

            let filtered = allUserProducts;

            // 1. Filtro por Nome/Ref
            if (searchTerm) {
                filtered = filtered.filter(prod =>
                    (prod.nome && prod.nome.toLowerCase().includes(searchTerm)) ||
                    (prod.ref && prod.ref.toLowerCase().includes(searchTerm))
                );
            }

            // 2. Filtro por Data de Início (usa o 'createdAt' do produto)
            if (startDate) {
                filtered = filtered.filter(prod => {
                    if (!prod.createdAt || !prod.createdAt.toDate) return false;
                    const productDate = prod.createdAt.toDate();
                    return productDate >= startDate;
                });
            }

            // 3. Filtro por Data de Fim
            if (endDate) {
                filtered = filtered.filter(prod => {
                    if (!prod.createdAt || !prod.createdAt.toDate) return false;
                    const productDate = prod.createdAt.toDate();
                    return productDate <= endDate;
                });
            }

            // Redesenha APENAS a lista de etiquetas
            renderLabelList(filtered);
        }

        // "Ligar" os listeners
        if (labelSearchInput) {
            labelSearchInput.addEventListener('input', applyLabelFilters);
            labelSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    labelSearchInput.value = ''; // Limpa o campo sem atualizar a tabela
                }
            });
        }
        if (labelDateStart) labelDateStart.addEventListener('change', applyLabelFilters);
        if (labelDateEnd) labelDateEnd.addEventListener('change', applyLabelFilters);

        if (labelClearFilters) {
            labelClearFilters.addEventListener('click', (e) => {
                e.preventDefault();
                labelSearchInput.value = '';
                labelDateStart.value = '';
                labelDateEnd.value = '';
                applyLabelFilters(); // Re-executa com filtros limpos
            });
        }
        // --- FIM FILTROS ETIQUETAS ---
        // --- LÓGICA DA PÁGINA DE VENDAS E FINANCEIRO ---

        // Cache global
        let allSales = [];
        let allFinancialEntries = [];
        let cashFlowChart = null; // Guarda a instância do gráfico
        let expensesPieChart = null; // Guarda a instância do gráfico de pizza
        let currentBillMetricFilter = 'all'; // Filtro ativo dos cards de contas a pagar

        // Elementos da UI de Venda
        const btnAddSaleItem = document.getElementById('btn-add-sale-item');
        const saleItemRefInput = document.getElementById('sale-item-ref');
        const saleItemsListBody = document.getElementById('sale-items-list');
        const saleDiscountInput = document.getElementById('sale-discount');
        const saleSubtotalSpan = document.getElementById('sale-subtotal');
        const saleDiscountValueSpan = document.getElementById('sale-discount-value');
        const saleTotalSpan = document.getElementById('sale-total');

        // --- Funções de Carregamento (Listeners) ---

     /**
 * Cria o listener (onSnapshot) para a coleção de VENDAS
 * e atualiza o Histórico E as Consignações
 */
function loadSalesHistory(resolve) {
    const collectionPath = `artifacts/${appId}/users/${userId}/vendas`;
    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`Vendas/Consignações recebidas: ${snapshot.size} docs`);
        allSales = [];
        snapshot.forEach(doc => {
            allSales.push({ id: doc.id, ...doc.data() });
        });

        // Ordena por data de criação (mais novas primeiro)
        allSales.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : new Date().getTime();
            const timeB = b.createdAt ? b.createdAt.toMillis() : new Date().getTime();
            return timeB - timeA;
        });

        // Separa as listas
        const activeConsignments = allSales.filter(s => s.type === 'consignacao' && s.status === 'Ativa');
        const completedSales = allSales.filter(s => s.type === 'direta' || s.status === 'Finalizada');

        // Renderiza as duas tabelas
        renderConsignList(activeConsignments);
        renderSalesHistoryList(completedSales);

        // --- LINHA ADICIONADA ---
        // Chama a atualização do Dashboard CADA VEZ que as vendas mudarem
        updateDashboard(); 
        updateEstoqueSummary();
        // --- FIM DA LINHA ADICIONADA ---

        // Re-renderiza a lista de produtos para atualizar as tags de consignação ativa
        if (allUserProducts && allUserProducts.length > 0) {
            applyProductViewFilters();
        }

        if (resolve) { // Chama resolve AQUI
            resolve();
            resolve = null; // Evita múltiplas chamadas
        }

    }, (error) => {
        console.error("Erro ao carregar vendas: ", error);
        showModal("Erro de Dados", "Não foi possível carregar seu histórico de vendas.");
    });

    activeListeners.push(unsubscribe);
}
   /**
 * Cria o listener (onSnapshot) para a coleção de LANÇAMENTOS FINANCEIROS
 */
function loadFinancialHistory(resolve) {
    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log(`Lançamentos financeiros recebidos: ${snapshot.size} docs`);
        allFinancialEntries = [];
        snapshot.forEach(doc => {
            allFinancialEntries.push({ id: doc.id, ...doc.data() });
        });

        // Ordena por data (mais novos primeiro)
        allFinancialEntries.sort((a, b) => {
            const timeA = a.data ? a.data.toMillis() : new Date().getTime();
            const timeB = b.data ? b.data.toMillis() : new Date().getTime();
            return timeB - timeA;
        });

        // --- NOVA FUNÇÃO: Prorrogar contas fixas automaticamente ---
        await checkAndExtendFixedBills();

        // --- ATUALIZAÇÃO: Chamar as QUATRO funções ---
        updateFinanceHistoryUI();                       // Extrato Analítico
        updateFinancialSummary();    
                           // Resumo do Caixa
        renderBillsTab(allFinancialEntries);            // Tabela Contas a Pagar
        renderCashFlowChart();                          // Gráfico
        
        // --- LINHA ADICIONADA ---
        // Chama a atualização do Dashboard CADA VEZ que o financeiro mudar
        updateDashboard();
        // --- FIM DA LINHA ADICIONADA ---

        if (resolve) { // Chama resolve AQUI
            resolve();
            resolve = null; // Evita múltiplas chamadas
        }
    }, (error) => {
        console.error("Erro ao carregar lançamentos: ", error);
        showModal("Erro de Dados", "Não foi possível carregar seu histórico financeiro.");
    });

    activeListeners.push(unsubscribe);
}
    let isExtendingBills = false;
async function checkAndExtendFixedBills() {
    if (!userId || allFinancialEntries.length === 0 || isExtendingBills) return;
    isExtendingBills = true;

    try {
        const fixedGroups = {};
        
        // Agrupa todas as despesas fixas ativas (que têm groupId)
        allFinancialEntries.forEach(entry => {
            if (entry.isFixed && entry.groupId) {
                if (!fixedGroups[entry.groupId]) {
                    fixedGroups[entry.groupId] = { entries: [], hasUnpaid: false };
                }
                fixedGroups[entry.groupId].entries.push(entry);
                if (!entry.pago) {
                    fixedGroups[entry.groupId].hasUnpaid = true;
                }
            }
        });

        const batch = writeBatch(db);
        let hasExtensions = false;
        const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

        for (const groupId in fixedGroups) {
            const groupData = fixedGroups[groupId];
            
            // Ignora grupos cancelados ou já totalmente pagos (sem contas pendentes)
            if (!groupData.hasUnpaid) continue;

            const entries = groupData.entries;
            
            // Encontra a conta com o vencimento mais longe no futuro
            entries.sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
            const latestEntry = entries[0];

            if (!latestEntry.vencimento) continue;

            const latestDate = new Date(latestEntry.vencimento + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Diferença em meses entre hoje e a última conta projetada
            const monthsDiff = (latestDate.getFullYear() - today.getFullYear()) * 12 + (latestDate.getMonth() - today.getMonth());

            // Se a última conta estiver a 3 meses ou menos de distância, gera mais 12 meses
            if (monthsDiff <= 3) {
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                
                // Usa a descrição original se existir, senão tenta extrair removendo o sufixo " (Mês/Ano)"
                const descriptionBase = latestEntry.originalDescription || latestEntry.descricao.replace(/\s\([A-Z][a-z]{2}\/\d{4}\)$/, '');

                for (let i = 1; i <= 12; i++) {
                    const nextDate = new Date(latestDate);
                    nextDate.setMonth(nextDate.getMonth() + i);

                    const m = nextDate.getMonth();
                    const y = nextDate.getFullYear();
                    const desc = `${descriptionBase} (${monthNames[m]}/${y})`;

                    const newBillRef = doc(collection(db, collectionPath));
                    batch.set(newBillRef, {
                        descricao: desc,
                        originalDescription: descriptionBase,
                        valor: latestEntry.valor,
                        tipo: 'Saída',
                        data: serverTimestamp(),
                        vencimento: nextDate.toISOString().split('T')[0],
                        pago: false,
                        paymentMethod: 'Não definido',
                        planoContas: latestEntry.planoContas || 'Despesas Gerais',
                        isInstallment: false,
                        isFixed: true,
                        groupId: groupId,
                        ownerId: userId
                    });
                }
                hasExtensions = true;
            }
        }

        if (hasExtensions) {
            await batch.commit();
            console.log("Despesas fixas prorrogadas automaticamente (+12 meses).");
        }
    } catch (error) {
        console.error("Erro ao prorrogar despesas fixas:", error);
    } finally {
        isExtendingBills = false;
    }
}
        // --- Funções de Renderização (Desenhar Tabelas) ---

        /**
    * Desenha a tabela de Consignações Ativas (em Vendas)
    * (ATUALIZADO com botão de Imprimir)
    */
        function renderConsignList(consignments) {
            const tableBody = document.getElementById('consign-list-table');
            // Assegura que o cabeçalho seja sticky (se você o moveu)
            const tableHead = tableBody.previousElementSibling?.querySelector('thead tr');
            tableBody.innerHTML = '';

            if (tableHead) {
                tableHead.querySelectorAll('th').forEach(th => th.classList.add('whitespace-nowrap'));
                const lastTh = tableHead.querySelector('th:last-child');
                if (lastTh) {
                    lastTh.classList.add('sticky', 'right-0', 'bg-gray-50', 'bg-opacity-95');
                }
            }

            if (consignments.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma consignação ativa.</td></tr>';
                return;
            }

            consignments.forEach(c => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50";

                let dueDate = null;
                let dateString = 'N/D';
                let diffDays = Infinity;
                let dateClass = 'text-gray-700';

                // Verifica se é um Timestamp válido
                if (c.dueDate instanceof Timestamp) {
                    try {
                        dueDate = c.dueDate.toDate(); // Converte Timestamp para Date JS
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);
                        const dueDateStart = new Date(dueDate);
                        dueDateStart.setHours(0, 0, 0, 0);
                        const diffTime = dueDateStart.getTime() - todayStart.getTime();
                        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        dateString = dueDate.toLocaleDateString('pt-BR');

                        if (diffDays < 0) dateClass = 'font-bold text-red-600';
                        else if (diffDays <= 3) dateClass = 'font-medium text-yellow-600';

                    } catch (e) {
                        console.error("Erro ao converter data da consignação:", e);
                        dateString = "Erro Data";
                        dateClass = 'text-red-600';
                    }
                }

                const daysText = diffDays === Infinity ? '' :
                    diffDays < 0 ? `(venceu há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''})` :
                        diffDays === 0 ? '(vence hoje)' :
                            diffDays === 1 ? '(vence amanhã)' :
                                `(vence em ${diffDays} dias)`;

                tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${c.clientId || 'Não informado'}</td>
            
            <td class="px-6 py-4 whitespace-nowrap">${c.createdAt && c.createdAt.toDate ? c.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/D'}</td>
            
            <td class="px-6 py-4 whitespace-nowrap ${dateClass}">${dateString} ${daysText}</td>
            
            <td class="px-6 py-4 whitespace-nowrap">R$ ${c.total ? c.total.toFixed(2).replace('.', ',') : '0,00'}</td>
            
            <td class="sticky right-0 px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 bg-white bg-opacity-95 shadow-sm">
                
                <button class="btn-manage-consignment text-indigo-600 hover:text-indigo-900" data-id="${c.id}" title="Editar Itens/Data">
                    <i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
                
                <button class="btn-print-consign-report text-gray-500 hover:text-gray-800" data-id="${c.id}" title="Imprimir Comprovante">
                    <i data-lucide="printer" class="w-5 h-5 pointer-events-none"></i>
                </button>
                
                <button class="btn-export-consign-excel text-green-600 hover:text-green-800" data-id="${c.id}" title="Exportar Excel">
                    <i data-lucide="file-spreadsheet" class="w-5 h-5 pointer-events-none"></i>
                </button>
                
                <button class="btn-create-maleta-from-consign text-purple-600 hover:text-purple-800" data-id="${c.id}" title="Salvar como Maleta">
                    <i data-lucide="briefcase" class="w-5 h-5 pointer-events-none"></i>
                </button>
                
                <button class="btn-settle-consignment px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700" data-id="${c.id}" title="Realizar Acerto">Acertar</button>
                
                <button class="btn-delete-consign text-red-600 hover:text-red-900" data-id="${c.id}" data-client-id="${c.clientId || ''}" title="Cancelar Consignação">
                    <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </td>
        `;
                tableBody.appendChild(tr);
            });

            lucide.createIcons();
        }
        /**
                 * Desenha a tabela de Histórico de Vendas (em Vendas)
                 */
        function renderSalesHistoryList(sales) {
            const tableBody = document.getElementById('history-list-table');
            tableBody.innerHTML = ''; // Limpa o exemplo

            if (sales.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma venda registrada.</td></tr>';
                return;
            }

            sales.forEach(s => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50";

                const typeBadge = s.type === 'direta'
                    ? 'text-green-800 bg-green-100'
                    : 'text-blue-800 bg-blue-100';
                const typeName = s.type === 'direta' ? 'Venda Direta' : 'Consignação';

                tr.innerHTML = `
            <td class="px-6 py-4">${s.createdAt.toDate().toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4">${s.clientId || 'Consumidor Final'}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium ${typeBadge} rounded-full">${typeName}</span></td>
            <td class="px-6 py-4">R$ ${s.total.toFixed(2).replace('.', ',')}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
    <button class="btn-view-sale-report px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200" data-id="${s.id}"><i data-lucide="file-text" class="w-4 h-4 inline mr-1 pointer-events-none"></i>Ver</button>
    <button class="btn-delete-sale text-red-600 hover:text-red-900" data-id="${s.id}"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
</td>
        `;
                tableBody.appendChild(tr);
            });
            lucide.createIcons();
        }
/**
         * Atualiza todo o painel de Extrato Analítico (Filtros, Cards e Tabela)
         */
        function updateFinanceHistoryUI() {
            if (!allFinancialEntries) return;

            // Pega apenas as pagas
            let filtered = allFinancialEntries.filter(entry => {
                if (entry.tipo === 'Entrada') return true;
                if (entry.tipo === 'Saída' && entry.pago === true) return true;
                return false;
            });

            const searchTerm = document.getElementById('history-search-input')?.value.toLowerCase().trim() || '';
            const filterType = document.getElementById('history-filter-type')?.value || 'Todos';
            const filterAccount = document.getElementById('history-filter-account')?.value || 'Todos';
            const filterStart = document.getElementById('history-filter-start')?.value;
            const filterEnd = document.getElementById('history-filter-end')?.value;
            const sortOrder = document.getElementById('history-sort-order')?.value || 'data_desc';

            // Filtro por Data
            if (filterStart || filterEnd) {
                let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
                let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

                filtered = filtered.filter(entry => {
                    if (!entry.data || !entry.data.toDate) return false;
                    const entryDate = entry.data.toDate();
                    if (startObj && entryDate < startObj) return false;
                    if (endObj && entryDate > endObj) return false;
                    return true;
                });
            }

            // Filtro por Busca
            if (searchTerm) {
                filtered = filtered.filter(entry => entry.descricao && entry.descricao.toLowerCase().includes(searchTerm));
            }

            // Filtro por Tipo
            if (filterType !== 'Todos') {
                filtered = filtered.filter(entry => entry.tipo === filterType);
            }

            // Filtro por Caixa / Conta Bancária
            if (filterAccount !== 'Todos') {
                filtered = filtered.filter(entry => {
                    const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) 
                        ? entry.paymentSplits 
                        : [{ method: entry.paymentMethod, value: entry.valor }];
                    
                    const hasFisico = splits.some(s => s.method === 'Dinheiro');
                    const hasBanco = splits.some(s => s.method !== 'Dinheiro');

                    if (filterAccount === 'Físico') return hasFisico;
                    if (filterAccount === 'Banco') return hasBanco;
                    return true;
                });
            }

            // Ordenação
            filtered.sort((a, b) => {
                if (sortOrder === 'valor_desc') return b.valor - a.valor;
                if (sortOrder === 'valor_asc') return a.valor - b.valor;
                
                const timeA = a.data ? a.data.toDate().getTime() : 0;
                const timeB = b.data ? b.data.toDate().getTime() : 0;
                
                if (sortOrder === 'data_asc') return timeA - timeB;
                return timeB - timeA; // data_desc default
            });

            // Calcula Totais (Cards)
            let totalIn = 0;
            let totalOut = 0;
            filtered.forEach(entry => {
                if (entry.tipo === 'Entrada') totalIn += entry.valor;
                if (entry.tipo === 'Saída') totalOut += entry.valor;
            });

            const metricIn = document.getElementById('metric-history-in');
            const metricOut = document.getElementById('metric-history-out');
            const metricBalance = document.getElementById('metric-history-balance');

            if (metricIn) metricIn.textContent = `R$ ${totalIn.toFixed(2).replace('.', ',')}`;
            if (metricOut) metricOut.textContent = `R$ ${totalOut.toFixed(2).replace('.', ',')}`;
            if (metricBalance) {
                const balance = totalIn - totalOut;
                metricBalance.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
                metricBalance.className = `text-xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`;
            }

            renderFinancialHistoryList(filtered);
        }
        /**
      * Renderiza as linhas na tabela de Extrato Analítico
         */
        function renderFinancialHistoryList(paidEntries) {
            const tableBody = document.getElementById('finance-history-table');
             if(!tableBody) return;
            tableBody.innerHTML = '';
            if (paidEntries.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhum lançamento encontrado para os filtros atuais.</td></tr>';
                return;
            }

            paidEntries.forEach(entry => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50";

                const isEntrada = entry.tipo === 'Entrada';
                const typeBadge = isEntrada
                    ? 'text-green-800 bg-green-100'
                    : 'text-red-800 bg-red-100';
                const typeClass = isEntrada ? 'text-green-600' : 'text-red-600';
                const typePrefix = isEntrada ? '+' : '-';

                const entryDate = entry.data ? entry.data.toDate().toLocaleDateString('pt-BR') : 'Processando';
                 
                // Detalha as formas de pagamento lindamente
                const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod || 'Dinheiro', value: entry.valor }];
                let paymentStr = splits.map(s => {
                    let badgeColor = s.method === 'Dinheiro' ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    return `<span class="inline-block px-2 py-0.5 text-[10px] font-medium rounded border ${badgeColor} mr-1 mb-1 shadow-sm">${s.method}: R$ ${s.value.toFixed(2).replace('.',',')}</span>`;
                }).join('');

               
                tr.innerHTML = `
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${entryDate}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium">${entry.descricao}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-[11px] font-medium ${typeBadge} rounded-full shadow-sm">${entry.tipo}</span></td>
            <td class="px-6 py-4 text-sm">${paymentStr}</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold ${typeClass}">${typePrefix} R$ ${entry.valor.toFixed(2).replace('.', ',')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="btn-edit-finance-entry text-indigo-600 hover:text-indigo-900" data-id="${entry.id}" title="Editar Lançamento">
                    <i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i>
                </button>
            </td>
        `;

                tableBody.appendChild(tr);
            });
            lucide.createIcons();
        }
        /**
  * Calcula e atualiza o Resumo do Caixa (Receita, Despesa, Saldo)
  * (CORRIGIDO: Agora só conta despesas que foram pagas, e com suporte a períodos)
  */
        function updateFinancialSummary() {
            const revenueEl = document.getElementById('summary-revenue');
            const expensesEl = document.getElementById('summary-expenses');
            const balanceEl = document.getElementById('summary-balance');
            
            const filterStart = document.getElementById('summary-filter-start')?.value;
            const filterEnd = document.getElementById('summary-filter-end')?.value;

            // Garante que os elementos existem
            if (!revenueEl || !expensesEl || !balanceEl) {
                console.warn("Elementos do resumo financeiro não encontrados.");
                return;
            }

            let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
            let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

            let monthlyRevenue = 0;
            let monthlyExpenses = 0;
            let caixaFisicoVal = 0;
            let caixaBancoVal = 0;
            
            let pendingBillsVal = 0;
            let lateBillsVal = 0;
            let expectedConsignmentsVal = 0;
            let expensesByPlan = {}; // Dados para o gráfico de pizza

            // 1. Loop de Lançamentos Pagos e A Pagar
            allFinancialEntries.forEach(entry => {
                if (entry.data && entry.data.toDate) {
                    const entryDate = entry.data.toDate();
                    let includeEntry = true;
                    
                    if (startObj && entryDate < startObj) includeEntry = false;
                    if (endObj && entryDate > endObj) includeEntry = false;

                    if (includeEntry) {
                        const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod, value: entry.valor }];

                        if (entry.tipo === 'Entrada') {
                            monthlyRevenue += entry.valor;
                            splits.forEach(s => {
                                if (s.method === 'Dinheiro') caixaFisicoVal += s.value;
                                else caixaBancoVal += s.value;
                            });
                        }
                        else if (entry.tipo === 'Saída' && entry.pago === true) {
                            monthlyExpenses += entry.valor;
                            splits.forEach(s => {
                                if (s.method === 'Dinheiro') caixaFisicoVal -= s.value;
                                else caixaBancoVal -= s.value;
                            });
                            
                            // Alimenta os dados do gráfico de Pizza
                            const plano = entry.planoContas || 'Despesas Gerais';
                            expensesByPlan[plano] = (expensesByPlan[plano] || 0) + entry.valor;
                        }
                    }
                }
                
                // 2. Loop de Pendências (Apenas Saídas não pagas e com vencimento válido)
                if (entry.tipo === 'Saída' && entry.pago === false && entry.vencimento) {
                    const dueDate = new Date(entry.vencimento + 'T00:00:00');
                    let includePending = true;
                    
                    if (startObj && dueDate < startObj) includePending = false;
                    if (endObj && dueDate > endObj) includePending = false;

                    if (includePending) {
                        pendingBillsVal += entry.valor;
                    }

                    // Contas Atrasadas são mostradas como um indicador CRÍTICO global, baseado na data de hoje
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    if (dueDate < todayStart) {
                        lateBillsVal += entry.valor;
                    }
                }
            });
            
            // 3. Loop de Consignações Abertas
            allSales.forEach(sale => {
                if (sale.type === 'consignacao' && sale.status === 'Ativa') {
                    let includeConsign = true;
                    if (sale.dueDate && sale.dueDate.toDate) {
                        const dueDate = sale.dueDate.toDate();
                        if (startObj && dueDate < startObj) includeConsign = false;
                        if (endObj && dueDate > endObj) includeConsign = false;
                    }

                    if (includeConsign) {
                        expectedConsignmentsVal += (sale.total || 0);
                    }
                }
            });

            const monthlyBalance = monthlyRevenue - monthlyExpenses;

            // Formata como moeda
            const formatCurrency = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;

            // Atualiza o HTML
            revenueEl.textContent = formatCurrency(monthlyRevenue);
            expensesEl.textContent = `- ${formatCurrency(monthlyExpenses)}`; // Mantém o sinal de menos
            balanceEl.textContent = formatCurrency(monthlyBalance);

            // Atualiza saldos dos Caixas
            const caixaFisicoEl = document.getElementById('summary-caixa-fisico');
            const caixaBancoEl = document.getElementById('summary-caixa-banco');
            if (caixaFisicoEl) {
                caixaFisicoEl.textContent = formatCurrency(caixaFisicoVal);
                caixaFisicoEl.className = `text-2xl font-bold ${caixaFisicoVal < 0 ? 'text-red-600' : 'text-gray-800'}`;
            }
            if (caixaBancoEl) {
                caixaBancoEl.textContent = formatCurrency(caixaBancoVal);
                caixaBancoEl.className = `text-2xl font-bold ${caixaBancoVal < 0 ? 'text-red-600' : 'text-gray-800'}`;
            }
            
            // Atualizar os titulos
            let periodText = 'Todo o Período';
            if (filterStart && filterEnd) {
                const s = filterStart.split('-').reverse().join('/');
                const e = filterEnd.split('-').reverse().join('/');
                periodText = `${s} a ${e}`;
            } else if (filterStart) {
                periodText = `A partir de ${filterStart.split('-').reverse().join('/')}`;
            } else if (filterEnd) {
                periodText = `Até ${filterEnd.split('-').reverse().join('/')}`;
            }
            
            const suffix = ` (${periodText})`;
            const revTitle = document.getElementById('summary-revenue-title');
            const expTitle = document.getElementById('summary-expenses-title');
            const balTitle = document.getElementById('summary-balance-title');
            if(revTitle) revTitle.textContent = `Receita${suffix}`;
            if(expTitle) expTitle.textContent = `Despesas${suffix}`;
            if(balTitle) balTitle.textContent = `Saldo${suffix}`;

            // Ajusta a cor do saldo (opcional)
            balanceEl.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
            if (monthlyBalance > 0) {
                balanceEl.classList.add('text-green-600');
            } else if (monthlyBalance < 0) {
                balanceEl.classList.add('text-red-600');
            } else {
                balanceEl.classList.add('text-blue-600'); // Ou cinza, se preferir
            }
            
            // Atualiza os novos Cards de Projeção
            const pendingBillsEl = document.getElementById('summary-pending-bills');
            const lateBillsEl = document.getElementById('summary-late-bills');
            const expectedConsignEl = document.getElementById('summary-expected-consign');
            if (pendingBillsEl) pendingBillsEl.textContent = formatCurrency(pendingBillsVal);
            if (lateBillsEl) lateBillsEl.textContent = formatCurrency(lateBillsVal);
            if (expectedConsignEl) expectedConsignEl.textContent = formatCurrency(expectedConsignmentsVal);

            // Renderiza Gráfico de Pizza
            renderExpensesPieChart(expensesByPlan, suffix);
        }

        const summaryFilterStart = document.getElementById('summary-filter-start');
        const summaryFilterEnd = document.getElementById('summary-filter-end');
        const summaryBtnMonth = document.getElementById('summary-btn-filter-month');
        const summaryBtnClear = document.getElementById('summary-clear-filters');

        if (summaryFilterStart) summaryFilterStart.addEventListener('change', updateFinancialSummary);
        if (summaryFilterEnd) summaryFilterEnd.addEventListener('change', updateFinancialSummary);

        if (summaryBtnMonth) {
            summaryBtnMonth.addEventListener('click', (e) => {
                e.preventDefault();
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                if (summaryFilterStart) summaryFilterStart.value = formatDateToYYYYMMDD(firstDay);
                if (summaryFilterEnd) summaryFilterEnd.value = formatDateToYYYYMMDD(lastDay);
                updateFinancialSummary();
            });
        }

        if (summaryBtnClear) {
            summaryBtnClear.addEventListener('click', (e) => {
                e.preventDefault();
                if (summaryFilterStart) summaryFilterStart.value = '';
                if (summaryFilterEnd) summaryFilterEnd.value = '';
                updateFinancialSummary();
            });
        }

     /**
 * Desenha as tabelas de Contas a Pagar E Contas Pagas (em Financeiro)
 * (ATUALIZADA com checkboxes)
 */
function renderBillsTab(entries) {
    const tableBodyToPay = document.getElementById('bills-list-table');
    const tableBodyPaid = document.getElementById('bills-paid-table');

    // Pega o cabeçalho da tabela A Pagar para adicionar o checkbox
    const tableHeadToPay = tableBodyToPay.parentElement?.querySelector('thead');
    
    if (!tableBodyToPay || !tableBodyPaid || !tableHeadToPay) return; 

    tableBodyToPay.innerHTML = '';
    tableBodyPaid.innerHTML = '';
    
    // --- Adiciona Cabeçalho com Checkbox para "Contas a Pagar" ---
    tableHeadToPay.innerHTML = `
        <tr>
            <th class="w-12 px-4 py-3"><input type="checkbox" id="select-all-bills" class="rounded"></th>
            <th
                class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Descrição</th>
            <th
                class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Vencimento</th>
            <th
                class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Valor</th>
            <th
                class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Ação</th>
        </tr>
    `;
    
    // Filtra apenas as Saídas
    const allBills = entries.filter(entry => entry.tipo === 'Saída');

    // Separa em A Pagar e Pagas
    let billsToPay = allBills.filter(bill => !bill.pago);

    let billsPaidFiltered = allBills.filter(bill => bill.pago && bill.data && bill.data.toDate);
    const searchTerm = document.getElementById('bills-search-input')?.value.toLowerCase().trim() || '';

    const filterPlano = document.getElementById('bills-filter-plano')?.value || 'Todos';
    if (filterPlano !== 'Todos') {
        billsToPay = billsToPay.filter(bill => {
            const billPlano = bill.planoContas || 'Despesas Gerais';
            return billPlano === filterPlano;
        });
        // Aplica o filtro de plano também para as contas pagas
        billsPaidFiltered = billsPaidFiltered.filter(bill => {
            const billPlano = bill.planoContas || 'Despesas Gerais';
            return billPlano === filterPlano;
        });
    }

    const filterStartDate = document.getElementById('bills-filter-start')?.value;
    const filterEndDate = document.getElementById('bills-filter-end')?.value;

    // --- NOVO: Atualiza o texto visual indicando o período filtrado ---
    let periodText = 'Todo o período';
    if (filterStartDate && filterEndDate) {
        const startStr = filterStartDate.split('-').reverse().join('/');
        const endStr = filterEndDate.split('-').reverse().join('/');
        periodText = `De ${startStr} até ${endStr}`;
    } else if (filterStartDate) {
        const startStr = filterStartDate.split('-').reverse().join('/');
        periodText = `A partir de ${startStr}`;
    } else if (filterEndDate) {
        const endStr = filterEndDate.split('-').reverse().join('/');
        periodText = `Até ${endStr}`;
    }

    const periodToPaySpan = document.getElementById('bills-to-pay-period');
    const periodPaidSpan = document.getElementById('bills-paid-period');
    if (periodToPaySpan) periodToPaySpan.textContent = periodText;
    if (periodPaidSpan) periodPaidSpan.textContent = periodText;
    // --- FIM DA ATUALIZAÇÃO DO TEXTO ---

    if (filterStartDate || filterEndDate) {
        
        let startObj = null;
        let endObj = null;
        if (filterStartDate) {
            const [y, m, d] = filterStartDate.split('-');
            startObj = new Date(y, m - 1, d, 0, 0, 0);
        }
        if (filterEndDate) {
            const [y, m, d] = filterEndDate.split('-');
            endObj = new Date(y, m - 1, d, 23, 59, 59);
        }

        // Filtro de data para Contas a Pagar (baseado no vencimento)
        billsToPay = billsToPay.filter(bill => {
            if (!bill.vencimento) return false;
            let isValid = true;

            // Usamos a comparação de string direta (YYYY-MM-DD) para evitar falhas de Fuso Horário do JS
            if (filterStartDate && bill.vencimento < filterStartDate) isValid = false;
            if (filterEndDate && bill.vencimento > filterEndDate) isValid = false;
            return isValid;
        });

        // Filtro de data para Contas Pagas (baseado na data de pagamento)
        billsPaidFiltered = billsPaidFiltered.filter(bill => {
            const paymentDate = bill.data.toDate();
            let isValid = true;
            
            if (startObj && paymentDate < startObj) isValid = false;
            if (endObj && paymentDate > endObj) isValid = false;
            return isValid;
        });
    }

    // Aplica o filtro de Busca por Texto
    if (searchTerm) {
        billsToPay = billsToPay.filter(bill => bill.descricao && bill.descricao.toLowerCase().includes(searchTerm));
        billsPaidFiltered = billsPaidFiltered.filter(bill => bill.descricao && bill.descricao.toLowerCase().includes(searchTerm));
    }

    let totalToPaySum = 0;
    let totalPaidSum = 0;
    let totalLateSum = 0;
    let totalSoonSum = 0;
    let visibleToPaySum = 0; // Soma apenas o que aparecer na tabela
    let visibleRowsCount = 0; // Conta quantas linhas apareceram

    if (billsToPay.length === 0) {
        // Atualiza colspan para 5 colunas
        tableBodyToPay.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma conta a pagar encontrada.</td></tr>';
    } else {
        
        // 1. Pega o valor do dropdown de ordenação
        const sortOrder = document.getElementById('bills-sort-order')?.value || 'vencimento';

        // 2. Aplica a ordenação
        billsToPay.sort((a, b) => {
            if (sortOrder === 'valor_desc') {
                return (b.valor || 0) - (a.valor || 0);
            } else if (sortOrder === 'valor_asc') {
                return (a.valor || 0) - (b.valor || 0);
            } else {
                const dateA = a.vencimento ? new Date(a.vencimento) : new Date(9999, 0, 1);
                const dateB = b.vencimento ? new Date(b.vencimento) : new Date(9999, 0, 1);
                return dateA - dateB;
            }
        });

        // 3. Renderiza as linhas
        billsToPay.forEach(bill => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50";

            let dueDateString = 'N/D';
            let dateClass = 'text-gray-700';
            let diffDays = Infinity;
            if (bill.vencimento) {
                const dueDate = new Date(bill.vencimento + 'T00:00:00');
                dueDateString = dueDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                const diffTime = dueDate.getTime() - new Date().setHours(0, 0, 0, 0);
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) dateClass = 'font-bold text-red-600';
                else if (diffDays <= 10) dateClass = 'font-medium text-yellow-600';

                if (diffDays < 0) totalLateSum += bill.valor;
                else if (diffDays >= 0 && diffDays <= 10) totalSoonSum += bill.valor;
            }
            
            totalToPaySum += bill.valor;

            // --- FILTRO DO MICRO-CARD (Oculta a linha se não bater com a métrica ativa) ---
            let showRow = true;
            if (currentBillMetricFilter === 'late' && diffDays >= 0) showRow = false;
            if (currentBillMetricFilter === 'soon' && (diffDays < 0 || diffDays > 10)) showRow = false;

            if (!showRow) return; // Pula este item se o filtro estiver barrando

            visibleRowsCount++;
            visibleToPaySum += bill.valor;

            // Badge do Plano de Contas
            const planoNome = bill.planoContas || 'Despesas Gerais';
            let corBadge = "bg-indigo-100 text-indigo-800"; // Cor padrão
            if (planoNome === filterPlano && filterPlano !== 'Todos') {
                corBadge = "bg-indigo-100 text-indigo-800 ring-2 ring-indigo-600"; // Contorno escuro
            }
            const planoBadge = `<span class="badge-plano-filter cursor-pointer hover:bg-indigo-200 transition-colors ${corBadge} px-2 py-0.5 rounded text-[10px] font-medium mr-1" data-plano="${planoNome}" title="Filtrar por ${planoNome}">${planoNome}</span>`;

            // --- NOVO: Botão de Cancelar Assinatura (só aparece se tiver groupId) ---
            let cancelSubBtnHtml = '';
            if (bill.groupId) {
                cancelSubBtnHtml = `<button class="btn-cancel-subscription text-orange-500 hover:text-orange-700 ml-2" data-group="${bill.groupId}" data-desc="${bill.descricao}" title="Cancelar Serviço (Apagar Futuras)"><i data-lucide="calendar-x" class="w-4 h-4 pointer-events-none"></i></button>`;
            }

            // --- INÍCIO DA ALTERAÇÃO NO HTML ---
            tr.innerHTML = `
                <td class="px-4 py-3"><input type="checkbox" class="bill-checkbox rounded" data-id="${bill.id}"></td>
                
                <td class="px-4 py-3">
                    <div class="font-medium">${bill.descricao}</div>
                    <div class="text-xs text-gray-500 mt-0.5">${planoBadge} ${bill.paymentMethod || 'Não definido'}</div>
                </td>
                <td class="px-4 py-3 ${dateClass}">${dueDateString}</td>
                <td class="px-4 py-3">R$ ${bill.valor.toFixed(2).replace('.', ',')}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <button class="btn-mark-paid px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700" data-id="${bill.id}">Pagar</button>
                    
                    <button class="btn-edit-bill text-indigo-600 hover:text-indigo-900 ml-2" data-id="${bill.id}" title="Editar Conta">
                        <i data-lucide="edit-2" class="w-4 h-4 pointer-events-none"></i>
                    </button>
                    
                    <button class="btn-delete-bill text-red-500 hover:text-red-700 ml-2" data-id="${bill.id}" title="Excluir Conta"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                    ${cancelSubBtnHtml}
                </td>
            `;
            // --- FIM DA ALTERAÇÃO NO HTML ---
            tableBodyToPay.appendChild(tr);
        });
        
        // Se filtrou tudo e não sobrou nada para exibir:
        if (billsToPay.length > 0 && visibleRowsCount === 0) {
            tableBodyToPay.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma conta encontrada para o filtro de métrica selecionado.</td></tr>';
        }
    }
    
    // Atualiza os Mini-Cards de Métricas
    const metricLateEl = document.getElementById('metric-bills-late');
    const metricSoonEl = document.getElementById('metric-bills-soon');
    const metricTotalEl = document.getElementById('metric-bills-total');
    if (metricLateEl) metricLateEl.textContent = `R$ ${totalLateSum.toFixed(2).replace('.', ',')}`;
    if (metricSoonEl) metricSoonEl.textContent = `R$ ${totalSoonSum.toFixed(2).replace('.', ',')}`;
    if (metricTotalEl) metricTotalEl.textContent = `R$ ${totalToPaySum.toFixed(2).replace('.', ',')}`;

    // --- Renderiza Tabela PAGAS (Filtradas) ---
    if (billsPaidFiltered.length === 0) {
        tableBodyPaid.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhuma conta paga no período selecionado.</td></tr>';
    } else {
        billsPaidFiltered.sort((a, b) => b.data.toDate() - a.data.toDate());
        billsPaidFiltered.forEach(bill => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50";
            const paymentDate = bill.data ? bill.data.toDate().toLocaleDateString('pt-BR') : 'N/D';
            
            const planoNome = bill.planoContas || 'Despesas Gerais';
            let corBadge = "bg-indigo-100 text-indigo-800";
            if (planoNome === filterPlano && filterPlano !== 'Todos') {
                corBadge = "bg-indigo-100 text-indigo-800 ring-2 ring-indigo-600";
            }
            const planoBadge = `<span class="badge-plano-filter cursor-pointer hover:bg-indigo-200 transition-colors ${corBadge} px-2 py-0.5 rounded text-[10px] font-medium mr-1" data-plano="${planoNome}" title="Filtrar por ${planoNome}">${planoNome}</span>`;
            tr.innerHTML = `
                <td class="px-4 py-3">
                    <div class="text-gray-700 font-medium">${bill.descricao}</div>
                    <div class="text-xs text-gray-500 mt-0.5">${planoBadge}</div>
                </td>
                <td class="px-4 py-3 text-gray-500">${paymentDate}</td>
                <td class="px-4 py-3 text-gray-500">R$ ${bill.valor.toFixed(2).replace('.', ',')}</td>
                <td class="px-4 py-3">
                    <button class="btn-unmark-paid px-3 py-1 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700" data-id="${bill.id}">Estornar</button>
                </td>
            `;
            tableBodyPaid.appendChild(tr);
            totalPaidSum += bill.valor;
        });
    }

    // Atualiza os totais no rodapé das tabelas
    const totalToPayEl = document.getElementById('bills-to-pay-total');
    const totalPaidEl = document.getElementById('bills-paid-total');
    if (totalToPayEl) totalToPayEl.textContent = `R$ ${totalToPaySum.toFixed(2).replace('.', ',')}`;
    if (totalPaidEl) totalPaidEl.textContent = `R$ ${totalPaidSum.toFixed(2).replace('.', ',')}`;

    lucide.createIcons(); // Recria icones
}
        /**
         * Renderiza o gráfico de fluxo de caixa dos últimos 30 dias
         */
        function renderCashFlowChart() {
            const ctx = document.getElementById('cash-flow-chart');
            if (!ctx) return; // Sai se o canvas não estiver na tela

            // --- 1. Processar os dados ---
            const labels = []; // Ex: ['29/09', '30/09', ..., '28/10']
            const dailyData = {}; // Guarda { '28/10': { entradas: 0, saidas: 0 } }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 29); // 29 dias atrás + hoje = 30 dias

            // Preenche os labels e o objeto de dados
            for (let i = 0; i < 30; i++) {
                const date = new Date(thirtyDaysAgo);
                date.setDate(thirtyDaysAgo.getDate() + i);

                const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                labels.push(label);
                dailyData[label] = { entradas: 0, saidas: 0 };
            }

            // Filtra os lançamentos dos últimos 30 dias
            const recentEntries = allFinancialEntries.filter(entry => {
                if (!entry.data || !entry.data.toDate) return false;
                const entryDate = entry.data.toDate();
                entryDate.setHours(0, 0, 0, 0);
                return entryDate >= thirtyDaysAgo && entryDate <= today;
            });

            // Preenche o objeto 'dailyData' com os valores
            recentEntries.forEach(entry => {
                const entryLabel = entry.data.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (dailyData[entryLabel]) {
                    if (entry.tipo === 'Entrada') {
                        dailyData[entryLabel].entradas += entry.valor;
                    } else if (entry.tipo === 'Saída') {
                        dailyData[entryLabel].saidas += entry.valor;
                    }
                }
            });

            // Converte o objeto 'dailyData' em arrays para o gráfico
            const entradasData = labels.map(label => dailyData[label].entradas);
            const saidasData = labels.map(label => dailyData[label].saidas * -1); // Deixa como negativo para o gráfico

            // --- 2. Desenhar o Gráfico ---

            // Destrói o gráfico anterior, se existir (MUITO IMPORTANTE)
            if (cashFlowChart) {
                cashFlowChart.destroy();
            }

            // Cria o novo gráfico
            cashFlowChart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Entradas',
                            data: entradasData,
                            backgroundColor: 'rgba(22, 160, 133, 0.7)', // Verde
                            borderColor: 'rgba(22, 160, 133, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Saídas',
                            data: saidasData, // Já está negativo
                            backgroundColor: 'rgba(192, 57, 43, 0.7)', // Vermelho
                            borderColor: 'rgba(192, 57, 43, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true, // Empilha entradas e saídas no mesmo dia
                        },
                        y: {
                            stacked: true,
                            ticks: {
                                // Formata o eixo Y para mostrar "R$"
                                callback: function (value, index, values) {
                                    return `R$ ${value}`;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                // Formata a dica (tooltip) para mostrar "R$"
                                label: function (context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    
    /**
     * Renderiza o Gráfico de Pizza de Despesas por Categoria
     */
    function renderExpensesPieChart(expensesByPlan, suffixString) {
        const ctx = document.getElementById('expenses-pie-chart');
        if (!ctx) return;

        if (expensesPieChart) {
            expensesPieChart.destroy();
        }
        
        const pieSuffix = document.getElementById('summary-pie-title-suffix');
        if (pieSuffix) pieSuffix.textContent = suffixString;

        const labels = Object.keys(expensesByPlan);
        const data = Object.values(expensesByPlan);

        if (labels.length === 0) {
            // Gráfico vazio (placeholder)
            expensesPieChart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: { labels: ['Nenhuma despesa'], datasets: [{ data: [1], backgroundColor: ['#f3f4f6'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { enabled: false }, legend: { display: false } }, cutout: '75%' }
            });
            return;
        }

        // Paleta de cores vibrantes e limpas
        const bgColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

        expensesPieChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: bgColors.slice(0, labels.length), borderWidth: 2, borderColor: '#ffffff' }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true, padding: 15 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let lbl = context.label || '';
                                if (lbl) lbl += ': ';
                                if (context.parsed !== null) lbl += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                                return lbl;
                            }
                        }
                    }
                }
            }
        });
    }
    // --- FIM DA LÓGICA DOS GRÁFICOS ---
        /**
 * Evento principal: Adicionar item à venda (COM AGRUPAMENTO DE QTD)
 */
        async function handleAddSaleItem(e) {
            if (e) e.preventDefault(); // Impede o 'Enter' de submeter o formulário

            const refCode = saleItemRefInput.value.trim();
            if (!refCode) return;

            // Trava o input para evitar cliques duplos
            saleItemRefInput.disabled = true;
            btnAddSaleItem.disabled = true;

            try {
                const product = await findProductByRef(refCode);

                if (!product) {
                    const audio = new Audio('erro.mp3');
                    audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                    showModal("Erro", `Produto com referência "${refCode}" não foi encontrado.`);
                } // Bloco NOVO com verificação de estoque
                else {
                    // --- LÓGICA DE VERIFICAÇÃO DE ESTOQUE E AGRUPAMENTO ---
                    const existingItem = currentSaleItems.find(item => item.id === product.id);
                    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

                    // Verifica se a (quantidade no carrinho + 1) é maior que o estoque
                    // O estoque do produto é (product.estoque)
                    if ((currentQtyInCart + 1) > product.estoque) {
                        // Erro: Sem estoque
                        showModal("Estoque Insuficiente",
                            `Você não pode adicionar este item.<br><br>
<strong>Produto:</strong> "${product.nome}" (Ref: ${product.ref})<br>
 <strong>Estoque disponível:</strong> ${product.estoque} un.<br>
<strong>Você já tem:</strong> ${currentQtyInCart} un. no carrinho.`);

                        saleItemRefInput.value = ''; // Limpa o input mesmo se der erro

                    } else {
                        // Estoque OK, pode adicionar/incrementar
                        if (existingItem) {
                            existingItem.quantity += 1;
                        } else {
                            currentSaleItems.push({ ...product, quantity: 1 });
                        }
                        // Atualiza a UI (só se for bem sucedido)
                        renderSaleItems();
                        updateSaleTotals();
                        saleItemRefInput.value = '';
                    }
                    // --- FIM DA LÓGICA ---
                }
            } catch (error) {
                console.error("Erro ao buscar produto:", error);
                showModal("Erro", "Falha ao buscar produto: " + error.message);
            }

            // Libera o input
            saleItemRefInput.disabled = false;
            btnAddSaleItem.disabled = false;
            saleItemRefInput.focus();
        }
        async function findProductByRef(refCode) {
            if (!userId || !refCode) return null;
            
            // Busca ignorando maiúsculas/minúsculas no cache local de produtos
            const lowerTerm = refCode.toLowerCase();
            const product = allUserProducts.find(p => 
                (p.ref && p.ref.toLowerCase() === lowerTerm) ||
                (p.ref2 && p.ref2.toLowerCase() === lowerTerm) ||
                (p.nome && p.nome.toLowerCase() === lowerTerm)
            );
            
            return product || null;
        }

        /**
      * Desenha os itens do "carrinho" (currentSaleItems) na tabela (COM QTD)
      */
        function renderSaleItems() {
            saleItemsListBody.innerHTML = ''; // Limpa a tabela

            // Atualiza o contador de itens (do passo anterior)
            const itemCountSpan = document.getElementById('sale-item-list-count');
            if (itemCountSpan) {
                // Conta a QUANTIDADE TOTAL de peças, não apenas as linhas
                const totalCount = currentSaleItems.reduce((sum, item) => sum + item.quantity, 0);
                itemCountSpan.textContent = totalCount;
            }

            if (currentSaleItems.length === 0) {
                saleItemsListBody.innerHTML = '<tr><td colspan="6" class="py-2 text-center text-gray-500">Nenhum item adicionado.</td></tr>';
                return;
            }

            const searchTerm = document.getElementById('sale-item-search')?.value.toLowerCase().trim() || '';
            let visibleCount = 0;

            currentSaleItems.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = 'border-b';
                const itemTotal = item.venda * item.quantity;

                // Filtro de pesquisa
                if (searchTerm && !item.nome.toLowerCase().includes(searchTerm) && !item.ref.toLowerCase().includes(searchTerm)) {
                    tr.style.display = 'none';
                } else {
                    visibleCount++;
                }

                tr.innerHTML = `
            <td class="py-2 pr-2">
                <div class="font-medium">${item.nome}</div>
            </td>
            <td class="py-2 px-2">${item.ref}</td>
            <td class="py-2 px-2">R$ ${item.venda.toFixed(2).replace('.', ',')}</td>
            
            <!-- Nova Coluna Qtd. -->
            <td class="py-2 px-2">
                <input 
                    type="number" 
                    value="${item.quantity}" 
                    min="1" 
                    class="sale-item-qty w-16 px-2 py-1 text-sm border rounded-md" 
                    data-id="${item.id}" 
                >
            </td>
            
            <!-- Nova Coluna Preço Total -->
            <td class="py-2 px-2 font-medium">R$ ${itemTotal.toFixed(2).replace('.', ',')}</td>
            
            <td class="py-2 pl-2 text-right">
                <!-- Botão agora usa o ID, não o index -->
                <button class="btn-remove-sale-item text-red-500 hover:text-red-700" data-id="${item.id}">
                    <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                </button>
            </td>
        `;
                saleItemsListBody.appendChild(tr);
            });

            if (visibleCount === 0 && currentSaleItems.length > 0) {
                saleItemsListBody.innerHTML = '<tr><td colspan="6" class="py-2 text-center text-gray-500">Nenhum item encontrado na pesquisa.</td></tr>';
            }

            lucide.createIcons(); // Recria os ícones de lixeira
        }
        /**
     * Recalcula e atualiza os totais da venda (COM QTD)
     */
        function updateSaleTotals() {
            const saleSubtotalSpan = document.getElementById('sale-subtotal');
            const saleDiscountValueSpan = document.getElementById('sale-discount-value');
            const saleTotalSpan = document.getElementById('sale-total');

            // --- Calcula valores (COM QTD) ---
            let subtotal = 0;
            currentSaleItems.forEach(item => {
                subtotal += (item.venda * item.quantity); // Multiplica pela quantidade
            });

            const discountPercent = parseFloat(saleDiscountInput.value) || 0;
            const discountAmount = subtotal * (discountPercent / 100);
            const total = subtotal - discountAmount;

            // --- Atualiza o HTML ---
            saleSubtotalSpan.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            saleDiscountValueSpan.textContent = `- R$ ${discountAmount.toFixed(2).replace('.', ',')}`;
            saleTotalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
            
            // Se houver apenas 1 forma de pagamento, atualiza o valor dela automaticamente
            const splitRows = document.querySelectorAll('.sale-split-row');
            if (splitRows.length === 1) {
                const valInput = splitRows[0].querySelector('.sale-split-value');
                if (valInput) valInput.value = total.toFixed(2);
            }
        }
        // --- "LIGA" OS EVENTOS DA PÁGINA DE VENDAS ---
        if (btnAddSaleItem) {
            btnAddSaleItem.addEventListener('click', handleAddSaleItem);
            saleItemRefInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleAddSaleItem(e);
                }
            });
            saleDiscountInput.addEventListener('input', updateSaleTotals);
            
            const saleItemSearchInput = document.getElementById('sale-item-search');
            if (saleItemSearchInput) {
                saleItemSearchInput.addEventListener('input', renderSaleItems);
            }
            
            // Inicializa a divisão de pagamentos da Venda Direta
            const btnAddSaleSplit = document.getElementById('btn-add-sale-payment-split');
            if (btnAddSaleSplit) {
                btnAddSaleSplit.onclick = () => addSaleSplitRow('Pix', 0);
                addSaleSplitRow('Dinheiro', 0);
                
                setupTwoSplitsLogic(
                    document.getElementById('sale-payment-splits-container'),
                    '.sale-split-row',
                    '.sale-split-value',
                    () => {
                        let subtotal = 0;
                        currentSaleItems.forEach(item => { subtotal += (item.venda * item.quantity); });
                        const discountPercent = parseFloat(saleDiscountInput.value) || 0;
                        return subtotal - (subtotal * (discountPercent / 100));
                    }
                );
            }
        }
        
        function addSaleSplitRow(method = 'Dinheiro', value = 0) {
            const container = document.getElementById('sale-payment-splits-container');
            if(!container) return;
            const row = document.createElement('div');
            row.className = 'flex flex-wrap sm:flex-nowrap items-center gap-2 sale-split-row mt-2';
            row.innerHTML = `
                <select class="sale-split-method flex-1 px-3 py-2 border rounded-md">
                    <option value="Dinheiro" ${method === 'Dinheiro' ? 'selected' : ''}>Dinheiro (Caixa Físico)</option>
                    <option value="Pix" ${method === 'Pix' ? 'selected' : ''}>Pix (Conta Bancária)</option>
                    <option value="Transferência Bancária" ${method === 'Transferência Bancária' ? 'selected' : ''}>Transferência Bancária (Conta Bancária)</option>
                    <option value="Cartão de Crédito" ${method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito (Conta Bancária)</option>
                    <option value="Cartão de Débito" ${method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito (Conta Bancária)</option>
                </select>
                <input type="number" step="0.01" class="sale-split-value w-32 px-3 py-2 border rounded-md" value="${value.toFixed(2)}">
                <button type="button" class="btn-remove-sale-split text-red-500 hover:text-red-700 px-2">
                    <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                </button>
            `;
            container.appendChild(row);
            lucide.createIcons();
            row.querySelector('.btn-remove-sale-split').onclick = () => { row.remove(); if (container.children.length === 0) addSaleSplitRow('Dinheiro', 0); };
        }

        renderSaleItems();
        updateSaleTotals();
        document.getElementById('sale-due-date').value = getFutureDateString(30);

        // --- FIM DA LÓGICA DE VENDAS E FINANCEIRO ---
        // --- "LIGA" OS INPUTS DE QUANTIDADE NA TABELA DE VENDAS (COM VERIFICAÇÃO DE ESTOQUE) ---
        if (saleItemsListBody) {
            saleItemsListBody.addEventListener('change', (e) => {
                // Verifica se o evento foi em um input de Qtd.
                if (e.target.classList.contains('sale-item-qty')) {
                    const input = e.target;
                    const itemId = input.dataset.id;

                    // Encontra o item no carrinho
                    const item = currentSaleItems.find(i => i.id === itemId);
                    if (!item) return; // Item não encontrado (segurança)

                    const oldQuantity = item.quantity; // Salva a quantidade anterior
                    let newQuantity = parseInt(input.value, 10);

                    // Validação 1: Garante que a quantidade é pelo menos 1
                    if (isNaN(newQuantity) || newQuantity < 1) {
                        newQuantity = 1;
                        input.value = 1; // Corrige o campo visualmente
                    }

                    // Validação 2: Verifica o estoque (item.estoque foi copiado quando o item foi adicionado)
                    if (newQuantity > item.estoque) {
                        // Se for maior, mostra o erro e reverte
                        showModal("Estoque Insuficiente",
                            `Você não pode definir essa quantidade.<br><br>
                    <strong>Produto:</strong> "${item.nome}" (Ref: ${item.ref})<br>
                    <strong>Estoque disponível:</strong> ${item.estoque} un.`);

                        input.value = oldQuantity; // Reverte o valor no campo de input
                        return; // Não atualiza a quantidade no carrinho
                    }

                    // Se passou em ambas as validações:
                    item.quantity = newQuantity; // Atualiza a quantidade no carrinho
                    renderSaleItems(); // Redesenha a tabela (para atualizar o Preço Total da linha)
                    updateSaleTotals(); // Recalcula o Subtotal
                }
            });
        }
        // --- FIM DO LISTENER DE QTD ---

        // --- LÓGICA DAS MALETAS (CRIAR E ADICIONAR À VENDA) ---
        function openMaletaModal(maleta = null, isDuplicate = false) {
            currentMaletaItems = maleta ? JSON.parse(JSON.stringify(maleta.items)) : [];
            const isEdit = maleta && maleta.id && !isDuplicate;
            let initialName = '';
            if (maleta) {
                initialName = isDuplicate && maleta.id ? `${maleta.nome} (Cópia)` : maleta.nome;
            }

            modalTitle.textContent = isEdit ? 'Editar Maleta' : 'Nova Maleta';
            modalBody.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium">Nome do Kit / Maleta</label>
                        <input type="text" id="maleta-name" class="w-full px-3 py-2 mt-1 border rounded-md" value="${initialName}" placeholder="Ex: Maleta Prata Mês 10" required>
                    </div>
                    <div class="flex mt-4 space-x-2">
                        <input type="text" id="maleta-item-ref" list="sale-item-datalist" placeholder="Adicionar Nome, Cód. de Ref. ou usar leitor" class="flex-1 px-3 py-2 border rounded-md">
                        <button type="button" id="btn-add-maleta-item" class="px-4 py-2 font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">Adicionar à Maleta</button>
                    </div>
                    <p id="maleta-error" class="text-sm text-red-600 mt-1 h-4"></p>
                    <div class="mt-4 border rounded-lg max-h-[60vh] overflow-y-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50 sticky top-0">
                                <tr>
                                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Produto</th>
                                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Ref.</th>
                                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-500 w-24">Qtd.</th>
                                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Ação</th>
                                </tr>
                            </thead>
                            <tbody id="maleta-items-list" class="bg-white divide-y">
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-6 text-right space-x-2 border-t pt-4">
                        <button type="button" id="btn-cancel-maleta" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                        <button type="button" id="btn-save-maleta" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Salvar Maleta</button>
                    </div>
                </div>
            `;

            modalContainer.style.display = 'flex';
            renderMaletaItemsTable();

            const btnAdd = document.getElementById('btn-add-maleta-item');
            const inputRef = document.getElementById('maleta-item-ref');
            const btnSave = document.getElementById('btn-save-maleta');
            const btnCancel = document.getElementById('btn-cancel-maleta');
            const errorP = document.getElementById('maleta-error');

            const addItemToMaleta = async () => {
                const ref = inputRef.value.trim();
                if (!ref) return;
                const prod = await findProductByRef(ref);
                if (!prod) {
                    errorP.textContent = "Produto não encontrado.";
                    const audio = new Audio('erro.mp3');
                    audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                    return;
                }
                errorP.textContent = "";
                const existing = currentMaletaItems.find(i => i.id === prod.id);
                if (existing) {
                    existing.quantity++;
                } else {
                    currentMaletaItems.push({
                        id: prod.id,
                        nome: prod.nome,
                        ref: prod.ref,
                        venda: prod.venda,
                        quantity: 1
                    });
                }
                inputRef.value = '';
                renderMaletaItemsTable();
                inputRef.focus();
            };

            btnAdd.onclick = addItemToMaleta;
            inputRef.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addItemToMaleta(); } };
            btnCancel.onclick = hideModal;

            btnSave.onclick = async () => {
                const nome = document.getElementById('maleta-name').value.trim();
                if (!nome) { errorP.textContent = "Nome da maleta é obrigatório."; return; }
                if (currentMaletaItems.length === 0) { errorP.textContent = "Adicione pelo menos um item à maleta."; return; }

                btnSave.disabled = true;
                btnSave.innerHTML = "Salvando...";

                try {
                    const collectionPath = `artifacts/${appId}/users/${userId}/maletas`;
                    
                    // Limpa as propriedades auxiliares (como categoria e estoque) antes de salvar no banco
                    const itemsToSave = currentMaletaItems.map(item => ({
                        id: item.id,
                        nome: item.nome,
                        ref: item.ref,
                        venda: item.venda,
                        quantity: item.quantity
                    }));

                    if (isEdit) {
                        const docRef = doc(db, collectionPath, maleta.id);
                        await updateDoc(docRef, { nome, items: itemsToSave });
                    } else {
                        await addDoc(collection(db, collectionPath), {
                            nome,
                            items: itemsToSave,
                            createdAt: serverTimestamp(),
                            ownerId: userId
                        });
                    }
                    hideModal();
                    showModal("Sucesso", isEdit ? "Maleta atualizada com sucesso." : "Nova maleta criada.");
                } catch (e) {
                    errorP.textContent = "Erro: " + e.message;
                    btnSave.disabled = false;
                    btnSave.innerHTML = "Salvar Maleta";
                }
            };
        }

        function renderMaletaItemsTable() {
            const tbody = document.getElementById('maleta-items-list');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (currentMaletaItems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-gray-500">Nenhum item adicionado à maleta.</td></tr>';
                return;
            }
            // Calcula a demanda total de cada produto em TODAS as maletas
        const globalDemand = {};
        allMaletas.forEach(m => {
            m.items.forEach(i => {
                globalDemand[i.id] = (globalDemand[i.id] || 0) + i.quantity;
            });
        });

            // Enriquecer e ordenar currentMaletaItems
            currentMaletaItems.forEach(item => {
                const productInDB = allUserProducts.find(p => p.id === item.id);
                item.currentStock = productInDB ? productInDB.estoque : 0;
                item.categoria = productInDB ? (productInDB.categoria || 'Sem Categoria') : 'Desconhecida';
                item.fotoUrl = productInDB ? productInDB.fotoUrl : null;
            });

            const categoryStats = {};
            currentMaletaItems.forEach(item => {
                if (!categoryStats[item.categoria]) {
                    categoryStats[item.categoria] = { total: 0, available: 0 };
                }
                categoryStats[item.categoria].total += item.quantity;
                categoryStats[item.categoria].available += Math.min(item.quantity, Math.max(0, item.currentStock));
            });

            currentMaletaItems.sort((a, b) => {
                // Ordenar por Categoria
                if (a.categoria < b.categoria) return -1;
                if (a.categoria > b.categoria) return 1;
                
                // Dentro da mesma categoria, produtos sem estoque ficam primeiro
                const aOutOfStock = a.currentStock <= 0 ? 1 : 0;
                const bOutOfStock = b.currentStock <= 0 ? 1 : 0;
                if (aOutOfStock !== bOutOfStock) {
                    return bOutOfStock - aOutOfStock; 
                }
                
                // Por último, ordem alfabética de nome
                return (a.nome || '').localeCompare(b.nome || '');
            });

            let currentCategory = null;

            currentMaletaItems.forEach(item => {
                if (item.categoria !== currentCategory) {
                    currentCategory = item.categoria;
                    const stats = categoryStats[currentCategory];
                    
                    let categoryHtml = '';
                    const catStr = currentCategory || 'Sem Categoria';
                    if (catStr === 'Sem Categoria') {
                        categoryHtml = '<span class="text-gray-500 normal-case tracking-normal">Sem Categoria</span>';
                    } else {
                        const parts = catStr.split(' > ');
                        if (parts.length === 1) {
                            categoryHtml = `<span class="px-2 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-md border border-gray-300 whitespace-nowrap">${parts[0]}</span>`;
                        } else {
                            categoryHtml = '<div class="flex items-center flex-wrap gap-1">';
                            parts.forEach((part, idx) => {
                                if (idx < parts.length - 1) {
                                    categoryHtml += `<span class="text-xs text-gray-500 normal-case tracking-normal">${part}</span>`;
                                    categoryHtml += `<i data-lucide="chevron-right" class="w-3 h-3 text-gray-400 shrink-0"></i>`;
                                } else {
                                    categoryHtml += `<span class="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md whitespace-nowrap">${part}</span>`;
                                }
                            });
                            categoryHtml += '</div>';
                        }
                    }

                    const catTr = document.createElement('tr');
                    catTr.className = 'bg-gray-100 font-semibold text-gray-700 uppercase tracking-wider text-xs';
                    catTr.innerHTML = `<td colspan="4" class="px-4 py-2">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center">${categoryHtml}</span>
                            <span class="normal-case tracking-normal text-[11px] text-gray-500 font-medium">(${stats.available}/${stats.total} disp.)</span>
                        </div>
                    </td>`;
                    tbody.appendChild(catTr);
                }

                const currentStock = item.currentStock;
                const stockBadge = currentStock <= 0 
                    ? `<span class="ml-2 px-1.5 py-0.5 text-[10px] font-medium text-red-800 bg-red-100 rounded-full" title="Produto sem estoque">Sem estoque</span>`
                    : `<span class="ml-2 text-[10px] text-gray-500">(${currentStock} un.)</span>`;

                let sharedWarningHtml = '';
                const demand = globalDemand[item.id] || 0;
                if (currentStock > 0 && currentStock < demand) {
                    const tooltipText = `Estoque compartilhado (${currentStock}/${demand}): Você tem estoque, mas não o suficiente para montar TODAS as maletas que usam esta peça.`;
                    sharedWarningHtml = `<span class="cursor-help" title="${tooltipText}"><i data-lucide="alert-triangle" class="w-4 h-4 text-orange-500 inline ml-1 pointer-events-none"></i></span>`;
                }

                const imgSrc = item.fotoUrl ? item.fotoUrl : 'https://placehold.co/40x40/e2e8f0/adb5bd?text=Sem+Foto';
                const previewSrc = item.fotoUrl ? item.fotoUrl : 'https://placehold.co/200x200/e2e8f0/adb5bd?text=Sem+Foto';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-4 py-2 pl-6">
                        <div class="flex items-center space-x-3">
                            <div class="relative group shrink-0">
                                <img src="${imgSrc}" alt="Foto" class="w-8 h-8 rounded-md object-cover border border-gray-200 cursor-pointer" onerror="this.src='https://placehold.co/40x40/e2e8f0/adb5bd?text=Erro'">
                                <div class="absolute z-[100] left-10 top-1/2 -translate-y-1/2 hidden group-hover:block bg-white p-1 border border-gray-200 rounded-lg shadow-xl pointer-events-none w-48 h-48">
                                    <img src="${previewSrc}" alt="Preview" class="w-full h-full object-cover rounded-md" onerror="this.src='https://placehold.co/200x200/e2e8f0/adb5bd?text=Erro'">
                                </div>
                            </div>
                            <div class="text-sm font-medium">
                                ${item.nome} ${stockBadge}${sharedWarningHtml}
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-2 text-sm">${item.ref}</td>
                    <td class="px-4 py-2">
                        <input type="number" min="1" value="${item.quantity}" class="w-16 px-2 py-1 text-sm border rounded-md maleta-item-qty" data-id="${item.id}">
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap">
                        <button type="button" class="btn-swap-maleta-item text-blue-500 hover:text-blue-700 mr-3" data-id="${item.id}" title="Trocar Produto">
                            <i data-lucide="refresh-cw" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                        <button type="button" class="btn-remove-maleta-item text-red-500 hover:text-red-700" data-id="${item.id}" title="Remover da Maleta">
                            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();

            tbody.querySelectorAll('.maleta-item-qty').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    const val = parseInt(e.target.value) || 1;
                    const id = e.target.dataset.id;
                    const it = currentMaletaItems.find(i => i.id === id);
                    if (it) {
                        it.quantity = val < 1 ? 1 : val;
                        e.target.value = it.quantity;
                    }
                });
            });
            tbody.querySelectorAll('.btn-remove-maleta-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    currentMaletaItems = currentMaletaItems.filter(i => i.id !== id);
                    renderMaletaItemsTable();
                });
            });

            tbody.querySelectorAll('.btn-swap-maleta-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    currentSwapItemId = e.currentTarget.dataset.id;
                    const itemToSwap = currentMaletaItems.find(i => i.id === currentSwapItemId);
                    
                    const modalSwap = document.getElementById('modal-swap-item');
                    if (modalSwap && itemToSwap) {
                        document.getElementById('swap-item-current-name').textContent = itemToSwap.nome;
                        const searchInput = document.getElementById('swap-catalog-search');
                        if (searchInput) searchInput.value = '';
                        renderSwapCatalog();
                        modalSwap.classList.remove('hidden');
                    }
                });
            });
        }

        // --- MODAL DE TROCA DE PRODUTO DA MALETA ---
        const modalSwapItem = document.getElementById('modal-swap-item');
        const btnCloseSwapItem = document.getElementById('btn-close-swap-item');
        const btnCancelSwapItem = document.getElementById('btn-cancel-swap-item');
        let currentSwapItemId = null;

        function renderSwapCatalog(searchTerm = '') {
            const grid = document.getElementById('swap-catalog-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            
            // Apenas produtos com estoque > 0
            let productsToSwap = allUserProducts.filter(p => p.estoque > 0);
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                productsToSwap = productsToSwap.filter(p => 
                    p.nome.toLowerCase().includes(term) || p.ref.toLowerCase().includes(term) || (p.categoria && p.categoria.toLowerCase().includes(term))
                );
            }
            
            if (productsToSwap.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center p-4 text-gray-500">Nenhum produto em estoque encontrado.</div>`;
                return;
            }
            
            // Agrupar por categoria
            const groupedProducts = {};
            productsToSwap.forEach(prod => {
                const cat = prod.categoria || 'Sem Categoria';
                if (!groupedProducts[cat]) groupedProducts[cat] = [];
                groupedProducts[cat].push(prod);
            });

            const sortedCats = Object.keys(groupedProducts).sort();

            sortedCats.forEach(cat => {
                const products = groupedProducts[cat];
                products.sort((a, b) => a.nome.localeCompare(b.nome));

                const parts = cat.split(' > ');
                const depth = parts.length - 1;
                const leafName = parts[parts.length - 1];

                // Header da Categoria/Subcategoria em lista
                const headerDiv = document.createElement('div');
                headerDiv.className = 'col-span-full mt-4 mb-2 pb-1 border-b border-gray-300';
                
                if (cat !== 'Sem Categoria') {
                    const indentPadding = depth > 0 ? `padding-left: ${depth * 1}rem;` : '';
                    const iconHtml = depth > 0 ? '<span class="text-gray-400 mr-2">↳</span>' : '';
                    
                    headerDiv.innerHTML = `
                        <h5 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center" style="${indentPadding}">
                            ${iconHtml} ${leafName}
                        </h5>
                    `;
                } else {
                    headerDiv.innerHTML = `
                        <h5 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Sem Categoria</h5>
                    `;
                }
                grid.appendChild(headerDiv);

                products.forEach(prod => {
                    const imgSrc = prod.fotoUrl ? prod.fotoUrl : 'https://placehold.co/150x150/e2e8f0/adb5bd?text=Sem+Foto';
                    
                    const card = document.createElement('div');
                    card.className = `bg-white border border-gray-200 rounded-lg p-2 flex flex-col items-center text-center shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all swap-catalog-item`;
                    card.dataset.id = prod.id;
                    card.title = "Clique para selecionar este produto";
                    
                    card.innerHTML = `
                        <div class="relative w-full">
                            <img src="${imgSrc}" alt="${prod.nome}" class="w-full h-24 object-cover rounded mb-2" onerror="this.src='https://placehold.co/150x150/e2e8f0/adb5bd?text=Erro'">
                        </div>
                        <span class="text-[10px] text-gray-500 font-medium w-full truncate">${prod.ref}</span>
                        <span class="text-xs font-semibold text-gray-800 leading-tight w-full line-clamp-2 mt-0.5 mb-1" title="${prod.nome}">${prod.nome}</span>
                        <div class="mt-auto pt-1 w-full border-t border-gray-100 flex justify-between items-center text-[10px]">
                            <span class="text-gray-500">Estoque: ${prod.estoque}</span>
                            <span class="text-green-600 font-bold">R$ ${prod.venda.toFixed(2).replace('.',',')}</span>
                        </div>
                    `;
                    
                    grid.appendChild(card);
                });
            });
        }

        if (modalSwapItem) {
            const closeSwapModal = () => {
                modalSwapItem.classList.add('hidden');
                currentSwapItemId = null;
                const searchInput = document.getElementById('swap-catalog-search');
                if(searchInput) searchInput.value = '';
            };

            if (btnCloseSwapItem) btnCloseSwapItem.addEventListener('click', closeSwapModal);
            if (btnCancelSwapItem) btnCancelSwapItem.addEventListener('click', closeSwapModal);
            modalSwapItem.addEventListener('click', (e) => {
                if (e.target === modalSwapItem) closeSwapModal();
            });

            const swapCatalogGrid = document.getElementById('swap-catalog-grid');
            if (swapCatalogGrid) {
                swapCatalogGrid.addEventListener('click', (e) => {
                    const card = e.target.closest('.swap-catalog-item');
                    if (card && card.dataset.id) {
                        const newProductId = card.dataset.id;
                        const newProduct = allUserProducts.find(p => p.id === newProductId);
                        
                        if (newProduct && currentSwapItemId) {
                            const oldItemIndex = currentMaletaItems.findIndex(i => i.id === currentSwapItemId);
                            if (oldItemIndex > -1) {
                                const oldQty = currentMaletaItems[oldItemIndex].quantity;
                                
                                // Verifica se o NOVO produto já existe em outra linha da maleta
                                const existingIndex = currentMaletaItems.findIndex(i => i.id === newProduct.id);
                                if (existingIndex > -1 && existingIndex !== oldItemIndex) {
                                    currentMaletaItems[existingIndex].quantity += oldQty;
                                    currentMaletaItems.splice(oldItemIndex, 1);
                                } else {
                                    // Substitui os dados preservando a quantidade
                                    currentMaletaItems[oldItemIndex] = {
                                        id: newProduct.id,
                                        nome: newProduct.nome,
                                        ref: newProduct.ref,
                                        venda: newProduct.venda,
                                        quantity: oldQty
                                    };
                                }
                                
                                renderMaletaItemsTable();
                                closeSwapModal();
                            }
                        }
                    }
                });
            }

            const swapCatalogSearch = document.getElementById('swap-catalog-search');
            if (swapCatalogSearch) {
                swapCatalogSearch.addEventListener('input', (e) => {
                    renderSwapCatalog(e.target.value);
                });
            }
        }

        function showMaletaDeleteConfirmation(maletaId) {
            const maleta = allMaletas.find(m => m.id === maletaId);
            if (!maleta) return;
            modalTitle.textContent = 'Excluir Maleta';
            modalBody.innerHTML = `
                <p>Deseja excluir a maleta <strong>${maleta.nome}</strong>?</p>
                <div class="mt-6 text-right space-x-2">
                    <button type="button" id="btn-cancel-del" class="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                    <button type="button" id="btn-confirm-del" class="px-4 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Excluir</button>
                </div>
            `;
            modalContainer.style.display = 'flex';
            document.getElementById('btn-cancel-del').onclick = hideModal;
            document.getElementById('btn-confirm-del').onclick = async () => {
                const btn = document.getElementById('btn-confirm-del');
                btn.disabled = true;
                btn.textContent = "Excluindo...";
                try {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/maletas`, maletaId));
                    hideModal();
                } catch (e) {
                    showModal("Erro", "Falha ao excluir maleta: " + e.message);
                    btn.disabled = false;
                    btn.textContent = "Excluir";
                }
            };
        }
        
        if (btnAddSaleItem) {
            const btnAddMaletaSale = document.getElementById('btn-add-maleta-sale');
            if(btnAddMaletaSale) {
                btnAddMaletaSale.addEventListener('click', () => {
                    if(allMaletas.length === 0) {
                        openMaletaModal(null);
                        return;
                    }
                    let options = allMaletas.map(m => `<option value="${m.id}">${m.nome} (${m.items.length} produtos)</option>`).join('');
                    modalTitle.textContent = "Adicionar Maleta à Venda";
                    modalBody.innerHTML = `
                        <div class="space-y-4">
                            <p class="text-sm text-gray-600">Selecione a maleta. O sistema verificará o estoque de cada item no momento da adição.</p>
                            <div>
                                <select id="select-maleta-id" class="w-full px-3 py-2 mt-1 border rounded-md">
                                    ${options}
                                </select>
                            </div>
                            <div class="mt-6 text-right space-x-2">
                                <button type="button" id="btn-cancel-add-maleta" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                                <button type="button" id="btn-confirm-add-maleta" class="px-6 py-2 font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">Adicionar Itens</button>
                            </div>
                        </div>
                    `;
                    modalContainer.style.display = 'flex';
                    document.getElementById('btn-cancel-add-maleta').onclick = hideModal;
                    document.getElementById('btn-confirm-add-maleta').onclick = () => {
                        const maletaId = document.getElementById('select-maleta-id').value;
                        processAddMaletaToSale(maletaId);
                    };
                });
            }
        }

        function processAddMaletaToSale(maletaId) {
            const maleta = allMaletas.find(m => m.id === maletaId);
            if (!maleta) return;

            let addedCount = 0;
            let warningMessages = [];

            maleta.items.forEach(mItem => {
                const productInDB = allUserProducts.find(p => p.id === mItem.id);
                if (!productInDB) {
                    warningMessages.push(`- "${mItem.nome}": Produto não encontrado ou excluído.`);
                    return;
                }

                const existingItem = currentSaleItems.find(i => i.id === productInDB.id);
                const currentQtyInCart = existingItem ? existingItem.quantity : 0;
                const requestedQty = mItem.quantity;

                if ((currentQtyInCart + requestedQty) > productInDB.estoque) {
                    const availableToAdd = productInDB.estoque - currentQtyInCart;
                    if (availableToAdd > 0) {
                        if (existingItem) existingItem.quantity += availableToAdd;
                        else currentSaleItems.push({ ...productInDB, quantity: availableToAdd });
                        warningMessages.push(`- "${productInDB.nome}": Adicionado apenas ${availableToAdd} un. (Estoque insuficiente para as ${requestedQty} originais)`);
                        addedCount += availableToAdd;
                    } else {
                        warningMessages.push(`- "${productInDB.nome}": Sem estoque disponível.`);
                    }
                } else {
                    if (existingItem) existingItem.quantity += requestedQty;
                    else currentSaleItems.push({ ...productInDB, quantity: requestedQty });
                    addedCount += requestedQty;
                }
            });

            renderSaleItems();
            updateSaleTotals();

            if (warningMessages.length > 0) {
                showModal("Atenção - Estoque Insuficiente", `A maleta foi adicionada, mas houve divergência de estoque:<br><br>${warningMessages.join('<br>')}`);
            } else {
                hideModal();
                setTimeout(() => showModal("Sucesso", `Maleta "${maleta.nome}" adicionada com sucesso!`), 200);
            }
        }
        
        // --- LÓGICA DO ASSISTENTE (WIZARD) DE MALETA PELA MÉDIA ---
        const btnCreateFromAvg = document.getElementById('btn-create-maleta-from-avg');
        const modalWizardMaleta = document.getElementById('modal-wizard-maleta');
        const btnCloseWizardMaleta = document.getElementById('btn-close-wizard-maleta');
        const btnWizardPrev = document.getElementById('btn-wizard-prev');
        const btnWizardNext = document.getElementById('btn-wizard-next');
        const btnWizardSkip = document.getElementById('btn-wizard-skip');
        const btnWizardAddItem = document.getElementById('btn-wizard-add-item');
        const wizardItemRefInput = document.getElementById('wizard-item-ref');
        const wizardCatalogSearch = document.getElementById('wizard-catalog-search');
        const wizardCatalogGrid = document.getElementById('wizard-catalog-grid');

        let wizardCategories = [];
        let wizardCurrentIndex = 0;
        let wizardItems = []; // list of {id, nome, ref, venda, quantity, categoria, currentStock, fotoUrl}

        if (btnCreateFromAvg) {
            btnCreateFromAvg.addEventListener('click', () => {
                wizardCategories = Object.keys(currentMaletaAverages).map(cat => ({
                    name: cat,
                    target: currentMaletaAverages[cat]
                })).filter(c => c.target > 0);
                const rootGroups = {};
                Object.keys(currentMaletaAverages).forEach(cat => {
                    const target = currentMaletaAverages[cat];
                    if (target > 0) {
                        const root = cat.split(' > ')[0];
                        if (!rootGroups[root]) rootGroups[root] = { targetTotal: 0, subcats: {} };
                        rootGroups[root].subcats[cat] = target;
                        rootGroups[root].targetTotal += target;
                    }
                });

                wizardCategories = Object.keys(rootGroups).sort().map(root => ({
                    name: root,
                    target: rootGroups[root].targetTotal,
                    subcats: rootGroups[root].subcats
                }));

                if (wizardCategories.length === 0) {
                    showModal("Aviso", "A média de produtos é zero para todas as categorias.");
                    return;
                }

                wizardCurrentIndex = 0;
                wizardItems = []; 
                
                modalWizardMaleta.classList.remove('hidden');
                renderWizardStep();
                if(wizardCatalogSearch) wizardCatalogSearch.value = '';
            });
        }
        
        function renderWizardStep() {
            const currentCat = wizardCategories[wizardCurrentIndex];
            
            document.getElementById('wizard-maleta-title').textContent = `Gerar Maleta (Passo ${wizardCurrentIndex + 1} de ${wizardCategories.length})`;
            
            let categoryHtml = '';
            const catStr = currentCat.name || 'Sem Categoria';
            if (catStr === 'Sem Categoria') {
                categoryHtml = '<span class="text-gray-500 normal-case tracking-normal">Sem Categoria</span>';
            } else {
                const parts = catStr.split(' > ');
                if (parts.length === 1) {
                    categoryHtml = `<span class="px-2 py-1 text-sm font-bold text-gray-700 bg-gray-200 rounded-md border border-gray-300 whitespace-nowrap uppercase tracking-wider">${parts[0]}</span>`;
                } else {
                    categoryHtml = '<div class="flex items-center flex-wrap gap-1">';
                    parts.forEach((part, idx) => {
                        if (idx < parts.length - 1) {
                            categoryHtml += `<span class="text-sm text-gray-500 normal-case tracking-normal font-medium">${part}</span>`;
                            categoryHtml += `<i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 shrink-0"></i>`;
                        } else {
                            categoryHtml += `<span class="px-2 py-1 text-sm font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md whitespace-nowrap uppercase tracking-wider">${part}</span>`;
                        }
                    });
                    categoryHtml += '</div>';
                }
                categoryHtml = `<span class="px-2 py-1 text-sm font-bold text-gray-700 bg-gray-200 rounded-md border border-gray-300 whitespace-nowrap uppercase tracking-wider">${catStr}</span>`;
            }
            document.getElementById('wizard-category-name').innerHTML = categoryHtml;
            
            const itemsInThisCat = wizardItems.filter(i => {
                const root = (i.categoria || 'Sem Categoria').split(' > ')[0];
                return root === currentCat.name;
            });
            const totalQtyInThisCat = itemsInThisCat.reduce((sum, i) => sum + i.quantity, 0);
            
            document.getElementById('wizard-category-progress').textContent = `${totalQtyInThisCat} / ${currentCat.target} peças`;
            const progressPercent = Math.min(100, (totalQtyInThisCat / currentCat.target) * 100);
            document.getElementById('wizard-category-progress-bar').style.width = `${progressPercent}%`;

            const subcatsProgressContainer = document.getElementById('wizard-subcats-progress');
            if (subcatsProgressContainer) {
                subcatsProgressContainer.innerHTML = '';
                const subcatKeys = Object.keys(currentCat.subcats).sort();
                if (subcatKeys.length > 1 || (subcatKeys.length === 1 && subcatKeys[0] !== currentCat.name)) {
                    subcatKeys.forEach(subcat => {
                        const target = currentCat.subcats[subcat];
                        const itemsInSubcat = wizardItems.filter(i => (i.categoria || 'Sem Categoria') === subcat);
                        const qtyInSubcat = itemsInSubcat.reduce((sum, i) => sum + i.quantity, 0);
                        
                        const subName = subcat.split(' > ').pop();
                        const isComplete = qtyInSubcat >= target;
                        const badgeClass = isComplete ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                        
                        subcatsProgressContainer.innerHTML += `
                            <span class="text-xs font-medium px-2 py-1 rounded border ${badgeClass}" title="${subcat}">
                                ${subName}: ${qtyInSubcat}/${target}
                            </span>
                        `;
                    });
                }
            }

            btnWizardPrev.classList.toggle('hidden', wizardCurrentIndex === 0);
            
            if (wizardCurrentIndex === wizardCategories.length - 1) {
                btnWizardNext.innerHTML = 'Finalizar <i data-lucide="check" class="w-4 h-4 ml-1"></i>';
                btnWizardNext.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                btnWizardNext.classList.add('bg-green-600', 'hover:bg-green-700');
            } else {
                btnWizardNext.innerHTML = 'Próxima <i data-lucide="chevron-right" class="w-4 h-4 ml-1"></i>';
                btnWizardNext.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
                btnWizardNext.classList.remove('bg-green-600', 'hover:bg-green-700');
            }

            if (totalQtyInThisCat >= currentCat.target) {
                btnWizardNext.classList.add('ring-2', 'ring-offset-2', wizardCurrentIndex === wizardCategories.length - 1 ? 'ring-green-500' : 'ring-indigo-500');
            } else {
                btnWizardNext.classList.remove('ring-2', 'ring-offset-2', 'ring-green-500', 'ring-indigo-500');
            }

            const searchTerm = wizardCatalogSearch ? wizardCatalogSearch.value : '';
            renderWizardCatalog(searchTerm);

            renderWizardItemsTable();
            wizardItemRefInput.value = '';
            wizardItemRefInput.focus();
            document.getElementById('wizard-error').classList.add('hidden');
            lucide.createIcons();
        }

        function renderWizardCatalog(searchTerm = '') {
            const currentCat = wizardCategories[wizardCurrentIndex];
            const grid = document.getElementById('wizard-catalog-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            
            let productsInCat = allUserProducts.filter(p => {
                const pCat = p.categoria || 'Sem Categoria';
                return currentCat.subcats.hasOwnProperty(pCat) && p.estoque > 0;
            });
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                productsInCat = productsInCat.filter(p => 
                    p.nome.toLowerCase().includes(term) || p.ref.toLowerCase().includes(term)
                );
            }
            
            if (productsInCat.length === 0) {
                grid.innerHTML = `<div class="col-span-full text-center p-4 text-gray-500">Nenhum produto encontrado.</div>`;
                return;
            }
            
            // Agrupar por subcategoria
            const groupedProducts = {};
            productsInCat.forEach(prod => {
                const cat = prod.categoria || 'Sem Categoria';
                if (!groupedProducts[cat]) groupedProducts[cat] = [];
                groupedProducts[cat].push(prod);
            });

            const sortedCats = Object.keys(groupedProducts).sort();

            sortedCats.forEach(cat => {
                const products = groupedProducts[cat];
                products.sort((a, b) => a.nome.localeCompare(b.nome));

                const parts = cat.split(' > ');
                const depth = parts.length - 1;
                const leafName = parts[parts.length - 1];

                // Header da Categoria/Subcategoria em lista
                const headerDiv = document.createElement('div');
                headerDiv.className = 'col-span-full mt-3 mb-1 pb-1 border-b border-gray-200';
                
                if (cat !== 'Sem Categoria') {
                    // Usamos style.paddingLeft para simular indentação visual na hierarquia
                    const indentPadding = depth > 0 ? `padding-left: ${depth * 1}rem;` : '';
                    const iconHtml = depth > 0 ? '<span class="text-gray-400 mr-2">↳</span>' : '';
                    
                    headerDiv.innerHTML = `
                        <h5 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center" style="${indentPadding}">
                            ${iconHtml} ${leafName}
                        </h5>
                    `;
                } else {
                    headerDiv.innerHTML = `
                        <h5 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Sem Categoria</h5>
                    `;
                }
                grid.appendChild(headerDiv);

                products.forEach(prod => {
                    const imgSrc = prod.fotoUrl ? prod.fotoUrl : 'https://placehold.co/150x150/e2e8f0/adb5bd?text=Sem+Foto';
                    
                    const existing = wizardItems.find(i => i.id === prod.id);
                    const addedQty = existing ? existing.quantity : 0;
                    const availableStock = prod.estoque - addedQty;
                    
                    const isOutOfStock = availableStock <= 0;
                    const opacityClass = isOutOfStock ? 'opacity-50 grayscale' : 'cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all';
                    const stockText = isOutOfStock ? '<span class="text-red-600 font-bold">Esgotado</span>' : `Estoque: ${availableStock}`;
                    
                    const card = document.createElement('div');
                    card.className = `bg-white border border-gray-200 rounded-lg p-2 flex flex-col items-center text-center shadow-sm ${opacityClass} wizard-catalog-item`;
                    if (!isOutOfStock) {
                        card.dataset.id = prod.id;
                        card.title = "Clique para adicionar 1 unidade";
                    }
                    
                    card.innerHTML = `
                        <div class="relative w-full">
                            <img src="${imgSrc}" alt="${prod.nome}" class="w-full h-20 object-cover rounded mb-2" onerror="this.src='https://placehold.co/150x150/e2e8f0/adb5bd?text=Erro'">
                        </div>
                        <span class="text-[10px] text-gray-500 font-medium w-full truncate">${prod.ref}</span>
                        <span class="text-xs font-semibold text-gray-800 leading-tight w-full line-clamp-2 mt-0.5 mb-1" title="${prod.nome}">${prod.nome}</span>
                        <div class="mt-auto pt-1 w-full border-t border-gray-100 text-[10px] text-gray-500">
                            ${stockText}
                        </div>
                    `;
                    
                    grid.appendChild(card);
                });
            });
        }

        function renderWizardItemsTable() {
            const currentCat = wizardCategories[wizardCurrentIndex];
            const tbody = document.getElementById('wizard-items-list');
            tbody.innerHTML = '';
            
            const itemsInThisCat = wizardItems.filter(i => {
                const root = (i.categoria || 'Sem Categoria').split(' > ')[0];
                return root === currentCat.name;
            });
            
            if (itemsInThisCat.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-gray-500 text-sm">Nenhum item selecionado.</td></tr>';
                return;
            }
            
            itemsInThisCat.forEach(item => {
                const tr = document.createElement('tr');
                
                const isSubCat = item.categoria && item.categoria.includes(' > ');
                const subCatName = isSubCat ? item.categoria.split(' > ').pop() : '';
                const subCatHtml = isSubCat ? `<span class="bg-gray-100 text-gray-600 px-1 rounded text-[9px] uppercase">${subCatName}</span>` : '';
                
                tr.innerHTML = `
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900 line-clamp-1" title="${item.nome}">${item.nome}</div>
                        <div class="text-[11px] text-gray-500 mt-0.5">Ref: ${item.ref} ${subCatHtml}</div>
                    </td>
                    <td class="px-4 py-3">
                        <input type="number" min="1" max="${item.currentStock}" value="${item.quantity}" class="w-14 px-2 py-1 text-sm border rounded-md wizard-item-qty" data-id="${item.id}">
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <button type="button" class="btn-remove-wizard-item text-red-500 hover:text-red-700" data-id="${item.id}" title="Remover">
                            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
            
            tbody.querySelectorAll('.wizard-item-qty').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    const val = parseInt(e.target.value) || 1;
                    const id = e.target.dataset.id;
                    const it = wizardItems.find(i => i.id === id);
                    if (it) {
                        let finalVal = val < 1 ? 1 : val;
                        if (finalVal > it.currentStock) {
                            finalVal = it.currentStock;
                        }
                        it.quantity = finalVal;
                        e.target.value = it.quantity;
                        renderWizardStep();
                    }
                });
            });
            
            tbody.querySelectorAll('.btn-remove-wizard-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    wizardItems = wizardItems.filter(i => i.id !== id);
                    renderWizardStep(); 
                });
            });
        }
        
        async function handleWizardAddItem() {
            const refCode = wizardItemRefInput.value.trim();
            const errorP = document.getElementById('wizard-error');
            errorP.classList.add('hidden');
            
            if (!refCode) return;
            
            const prod = await findProductByRef(refCode);
            if (!prod) {
                errorP.textContent = "Produto não encontrado.";
                errorP.classList.remove('hidden');
                const audio = new Audio('erro.mp3');
                audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                return;
            }
            
            const currentCat = wizardCategories[wizardCurrentIndex];
            const prodCat = prod.categoria || 'Sem Categoria';
            const prodRoot = prodCat.split(' > ')[0];
            
            if (!currentCat.subcats.hasOwnProperty(prodCat)) {
                if (prodRoot === currentCat.name) {
                     errorP.textContent = `Atenção: Este produto é de "${prodCat}", mas a média não pede essa subcategoria.`;
                } else {
                     errorP.textContent = `Atenção: Este produto é da categoria "${prodRoot}". O passo atual é para "${currentCat.name}".`;
                }
                errorP.classList.remove('hidden');
                const audio = new Audio('erro.mp3');
                audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                return;
            }
            
            const existing = wizardItems.find(i => i.id === prod.id);
            if (existing) {
                if (existing.quantity < prod.estoque) {
                    existing.quantity++;
                } else {
                    errorP.textContent = `Estoque insuficiente para "${prod.nome}".`;
                    errorP.classList.remove('hidden');
                    const audio = new Audio('erro.mp3');
                    audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                    return;
                }
            } else {
                if (prod.estoque > 0) {
                    wizardItems.push({
                        id: prod.id,
                        nome: prod.nome,
                        ref: prod.ref,
                        venda: prod.venda,
                        categoria: prodCat,
                        currentStock: prod.estoque,
                        fotoUrl: prod.fotoUrl,
                        quantity: 1
                    });
                } else {
                    errorP.textContent = `Produto sem estoque: "${prod.nome}".`;
                    errorP.classList.remove('hidden');
                    const audio = new Audio('erro.mp3');
                    audio.play().catch(err => console.log("Erro ao reproduzir o som:", err));
                    return;
                }
            }
            
            wizardItemRefInput.value = '';
            renderWizardStep();
        }

        if (btnWizardAddItem) {
            btnWizardAddItem.addEventListener('click', handleWizardAddItem);
            wizardItemRefInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleWizardAddItem();
                }
            });
        }

        if (btnWizardNext) {
            btnWizardNext.addEventListener('click', () => {
                if (wizardCurrentIndex < wizardCategories.length - 1) {
                    wizardCurrentIndex++;
                    if(wizardCatalogSearch) wizardCatalogSearch.value = '';
                    renderWizardStep();
                } else {
                    finishWizardMaleta();
                }
            });
        }

        if (btnWizardPrev) {
            btnWizardPrev.addEventListener('click', () => {
                if (wizardCurrentIndex > 0) {
                    wizardCurrentIndex--;
                    if(wizardCatalogSearch) wizardCatalogSearch.value = '';
                    renderWizardStep();
                }
            });
        }

        if (btnWizardSkip) {
            btnWizardSkip.addEventListener('click', () => {
                if (wizardCurrentIndex < wizardCategories.length - 1) {
                    wizardCurrentIndex++;
                    if(wizardCatalogSearch) wizardCatalogSearch.value = '';
                    renderWizardStep();
                } else {
                    finishWizardMaleta();
                }
            });
        }

        const closeWizard = () => {
            modalWizardMaleta.classList.add('hidden');
            wizardItems = [];
        };

        if (btnCloseWizardMaleta) btnCloseWizardMaleta.addEventListener('click', closeWizard);
        if (modalWizardMaleta) {
            modalWizardMaleta.addEventListener('click', (e) => {
                if (e.target === modalWizardMaleta) closeWizard();
            });
        }
        
        if (wizardCatalogSearch) {
            wizardCatalogSearch.addEventListener('input', (e) => {
                renderWizardCatalog(e.target.value);
            });
        }
        
        if (wizardCatalogGrid) {
            wizardCatalogGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.wizard-catalog-item');
                if (card && card.dataset.id) {
                    const prodId = card.dataset.id;
                    const prod = allUserProducts.find(p => p.id === prodId);
                    if (prod) {
                        const existing = wizardItems.find(i => i.id === prod.id);
                        if (existing) {
                            if (existing.quantity < prod.estoque) {
                                existing.quantity++;
                            }
                        } else {
                            if (prod.estoque > 0) {
                                wizardItems.push({ id: prod.id, nome: prod.nome, ref: prod.ref, venda: prod.venda, categoria: prod.categoria || 'Sem Categoria', currentStock: prod.estoque, fotoUrl: prod.fotoUrl, quantity: 1 });
                            }
                        }
                        renderWizardStep();
                    }
                }
            });
        }

        function finishWizardMaleta() {
            modalWizardMaleta.classList.add('hidden');
            
            const generatedMaleta = {
                nome: `Maleta Automática (${new Date().toLocaleDateString('pt-BR')})`,
                items: wizardItems.map(item => ({
                    id: item.id,
                    nome: item.nome,
                    ref: item.ref,
                    venda: item.venda,
                    quantity: item.quantity
                }))
            };
            
            openMaletaModal(generatedMaleta, false);
        }
        // --- FIM WIZARD ---
        // --- FIM DA LÓGICA DE MALETAS ---

        // --- MODAL DE CONFIRMAÇÃO PARA EXCLUIR QTD ---
        function showQuantityDeleteConfirmation(itemId) {
            const itemIndex = currentSaleItems.findIndex(item => item.id === itemId);
            if (itemIndex === -1) return;
            const item = currentSaleItems[itemIndex];

            modalTitle.textContent = `Remover "${item.nome}"`;
            modalBody.innerHTML = `
        <p>Você tem ${item.quantity} unidades deste item no carrinho. Como deseja remover?</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-remove-one" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Remover Apenas 1</button>
            <button type="button" id="btn-remove-all" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Remover Todos (${item.quantity})</button>
            <button type="button" id="btn-remove-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
        </div>
    `;

            modalContainer.style.display = 'flex';

            // Listeners do modal
            document.getElementById('btn-remove-one').onclick = () => {
                item.quantity -= 1;
                if (item.quantity === 0) { // Se só tinha 1 (embora o 'if' anterior devesse pegar isso, é uma segurança)
                    currentSaleItems.splice(itemIndex, 1);
                }
                renderSaleItems();
                updateSaleTotals();
                hideModal();
            };

            document.getElementById('btn-remove-all').onclick = () => {
                currentSaleItems.splice(itemIndex, 1); // Remove a linha inteira
                renderSaleItems();
                updateSaleTotals();
                hideModal();
            };

            document.getElementById('btn-remove-cancel').onclick = hideModal;
        }
        // --- FIM DO MODAL DE EXCLUIR QTD ---
        // --- LÓGICA DE FINALIZAR A VENDA ---

        const formNewSale = document.getElementById('form-new-sale');

        /**
   * Limpa o formulário de venda e o carrinho (CORRIGIDO PARA RESETAR PARA CONSIGNAÇÃO)
   */
        function resetSaleForm() {
            currentSaleItems = []; // Limpa o array do carrinho
            
            const saleItemSearchInput = document.getElementById('sale-item-search');
            if (saleItemSearchInput) saleItemSearchInput.value = '';

            renderSaleItems();     // Limpa a tabela de itens na UI
            updateSaleTotals();    // Zera os totais na UI

            // Reseta todos os campos do formulário para seus valores padrão HTML
            if (formNewSale) {
                formNewSale.reset();
            }

            // Seleciona explicitamente a opção "Consignação"
            const radioConsignacao = document.querySelector('input[name="sale-type"][value="consignacao"]');
            if (radioConsignacao) {
                radioConsignacao.checked = true; // Garante que o botão de rádio "Consignação" esteja marcado

                // Dispara manualmente o evento 'change' no botão de rádio "Consignação".
                // Isso acionará o seu event listener existente que é responsável por:
                // 1. Mostrar a div 'fields-consignacao'
                // 2. Esconder a div 'fields-venda-direta'
                // 3. Alterar o texto e a cor do botão 'btn-finalize-sale'
                radioConsignacao.dispatchEvent(new Event('change'));
            }

            // Define a data de acerto padrão para 30 dias no futuro novamente,
            // já que formNewSale.reset() pode ter limpado o campo.
            const dueDateInput = document.getElementById('sale-due-date');
            if (dueDateInput) {
                dueDateInput.value = getFutureDateString(30);
            }

            // Foca no campo de adicionar item para a próxima venda
            const saleItemRefInput = document.getElementById('sale-item-ref');
            if (saleItemRefInput) {
                saleItemRefInput.focus();
            }
            
            const splitContainer = document.getElementById('sale-payment-splits-container');
            if (splitContainer) {
                splitContainer.innerHTML = '';
                addSaleSplitRow('Dinheiro', 0);
            }
            const errorP = document.getElementById('sale-split-error');
            if(errorP) errorP.classList.add('hidden');
        }


        /**
       * Função principal: Salva a Venda/Consignação no Firestore (COM QTD e Validação de Data Aprimorada)
       */
        async function handleFinalizeSale(e) {
            e.preventDefault();

            // Verificações iniciais
            if (!userId) {
                showModal("Erro", "Você precisa estar logado para registrar uma venda.");
                return;
            }
            if (currentSaleItems.length === 0) {
                showModal("Atenção", "Adicione pelo menos um item para registrar a venda.");
                return;
            }

            // Controle do Botão
            const saveButton = document.getElementById('btn-finalize-sale');
            const originalButtonText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Salvando...`;

            try {
                // --- 1. Coletar dados ---
                const saleType = document.querySelector('input[name="sale-type"]:checked').value;
                const clientId = document.getElementById('sale-client').value;

                // --- Leitura e Validação da Data (APRIMORADO) ---
                let dueDateString = null;
                let dueDateTimestamp = null; // Variável para o Timestamp final

                if (saleType === 'consignacao') {
                    dueDateString = document.getElementById('sale-due-date').value;
                    // Validação explícita com return
                    if (!dueDateString || dueDateString.trim() === "") {
                        showModal("Erro", "A data de acerto é obrigatória para consignação.");
                        saveButton.disabled = false; // Reabilita o botão antes de sair
                        saveButton.innerHTML = originalButtonText;
                        return; // PARA a função AQUI se a data for inválida/vazia
                    }

                    // --- Conversão da Data para Timestamp (APRIMORADO) ---
                    try {
                        // Tenta criar o Date JS a partir da string 'YYYY-MM-DD'
                        // Adicionar 'T00:00:00' força a interpretação no fuso horário local
                        const dateObject = new Date(dueDateString + 'T00:00:00');

                        // Verifica se a data criada é válida
                        if (isNaN(dateObject.getTime())) {
                            console.error("Erro: Data inválida detectada após parsing:", dueDateString);
                            showModal("Erro", `A data de acerto fornecida (${dueDateString}) parece ser inválida.`);
                            saveButton.disabled = false; // Reabilita o botão
                            saveButton.innerHTML = originalButtonText;
                            return; // PARA a função AQUI
                        }
                        // Converte para Timestamp Firestore SE a data for válida
                        dueDateTimestamp = Timestamp.fromDate(dateObject);

                    } catch (dateError) {
                        console.error("Erro ao converter data para Timestamp:", dateError);
                        showModal("Erro", "Ocorreu um erro ao processar a data de acerto.");
                        saveButton.disabled = false; // Reabilita o botão
                        saveButton.innerHTML = originalButtonText;
                        return; // PARA a função AQUI
                    }
                } // Fim do bloco if (saleType === 'consignacao')

                // --- Cálculo de Total (COM QTD) ---
                let subtotal = 0;
                currentSaleItems.forEach(item => { subtotal += (item.venda * item.quantity); });

                const discountPercent = parseFloat(saleDiscountInput.value) || 0;
                const discountAmount = subtotal * (discountPercent / 100);
                const total = subtotal - discountAmount;

                let paymentSplits = [];
                let mainPaymentMethod = null;

                if (saleType === 'direta') {
                    let splitsTotal = 0;
                    const splitRows = document.querySelectorAll('.sale-split-row');
                    splitRows.forEach(row => {
                        const method = row.querySelector('.sale-split-method').value;
                        const val = parseFloat(row.querySelector('.sale-split-value').value) || 0;
                        if (val > 0) {
                            paymentSplits.push({ method, value: val });
                            splitsTotal += val;
                        }
                    });

                    if (paymentSplits.length === 0) {
                        const errP = document.getElementById('sale-split-error');
                        errP.textContent = "Adicione pelo menos uma forma de pagamento com valor maior que zero.";
                        errP.classList.remove('hidden');
                        saveButton.disabled = false;
                        saveButton.innerHTML = originalButtonText;
                        return;
                    }

                    if (Math.abs(splitsTotal - total) > 0.01) {
                        const errP = document.getElementById('sale-split-error');
                        errP.textContent = `A soma das formas de pagamento (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao Valor Total (R$ ${total.toFixed(2)}).`;
                        errP.classList.remove('hidden');
                        saveButton.disabled = false;
                        saveButton.innerHTML = originalButtonText;
                        return;
                    }
                    document.getElementById('sale-split-error').classList.add('hidden');
                    mainPaymentMethod = paymentSplits.length === 1 ? paymentSplits[0].method : 'Múltiplas Formas';
                }

                // --- Mapeia Itens Vendidos (COM QTD) ---
                const itemsSold = currentSaleItems.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    ref: p.ref,
                    venda: p.venda,
                    custo: p.custo, // Mantém o custo para referência futura, se necessário
                    quantity: p.quantity,
                    fotoUrl: p.fotoUrl || null
                }));

                // --- 2. Preparar o Pacote (Batch) ---
                const batch = writeBatch(db);
                const saleCollectionPath = `artifacts/${appId}/users/${userId}/vendas`;
                const productCollectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                const financeCollectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

                // --- 2a. Criar o documento de Venda ---
                const saleData = {
                    type: saleType,
                    status: (saleType === 'direta') ? 'Finalizada' : 'Ativa',
                    clientId: clientId,
                    paymentMethod: (saleType === 'direta') ? mainPaymentMethod : null,
                    paymentSplits: (saleType === 'direta') ? paymentSplits : null,
                    items: itemsSold,
                    subtotal: subtotal,
                    discountPercent: discountPercent,
                    discountAmount: discountAmount,
                    total: total,
                    dueDate: dueDateTimestamp, // Usa a variável que foi validada e convertida
                    createdAt: serverTimestamp(),
                    ownerId: userId
                };
                const newSaleRef = doc(collection(db, saleCollectionPath));
                batch.set(newSaleRef, saleData);

                // --- 2b. Atualizar o estoque (COM QTD) ---
                for (const item of currentSaleItems) {
                    const productRef = doc(db, productCollectionPath, item.id);
                    batch.update(productRef, {
                        estoque: increment(item.quantity * -1) // Subtrai a quantidade vendida
                    });
                }

                // --- 2c. Criar o Lançamento Financeiro (Apenas para Venda Direta) ---
                if (saleType === 'direta') {
                    const financeData = {
                        descricao: `Venda Direta #${newSaleRef.id.substring(0, 6)}`,
                        valor: total, // Valor final com desconto
                        tipo: 'Entrada',
                        data: serverTimestamp(), // Data em que a venda foi finalizada
                        vencimento: null, // Venda direta não tem vencimento
                        pago: true, // Venda direta já entra como paga
                        saleId: newSaleRef.id, // Link para a venda
                        ownerId: userId,
                            paymentMethod: mainPaymentMethod,
                            paymentSplits: paymentSplits
                    };
                    const newFinanceRef = doc(collection(db, financeCollectionPath));
                    batch.set(newFinanceRef, financeData);
                }

                // --- 3. Executar o Pacote (Batch) ---
                await batch.commit();

                // --- 4. Sucesso ---
                if (saleType === 'consignacao') {
                    // Chama a nova função de relatório de abertura
                    // Passa os dados que acabamos de preparar (saleData)
                    // Passa o ID da nova venda (newSaleRef.id)
                    // Passa a string da data de vencimento (dueDateString) para formatação
                    const includeImages = document.getElementById('sale-include-images')?.checked || false;
                    await generateConsignmentOpeningReport(saleData, newSaleRef.id, dueDateString, includeImages);
                }

                showModal("Sucesso!", `Venda do tipo "${saleType}" registrada com sucesso.`);
                resetSaleForm(); // Limpa tudo

            } catch (error) {
                // O catch agora pega erros gerais do Firestore ou outros inesperados
                console.error("Erro ao finalizar venda:", error);
                showModal("Erro", "Não foi possível salvar a venda: " + error.message);
            } finally {
                // Garante que o botão seja reativado mesmo se houver erro
                saveButton.disabled = false;
                saveButton.innerHTML = originalButtonText;
            }
        }

        // --- FUNÇÃO PARA SALVAR PESSOA (ATUALIZADA COM REDIRECIONAMENTO DINÂMICO) ---
        async function handleSavePerson(saveButton, formAddPerson) {
            if (!userId) {
                showModal("Erro", "Você não está logado.");
                return;
            }

            if (!saveButton || !formAddPerson) {
                console.error("Erro interno: handleSavePerson foi chamada sem botão ou formulário.");
                return;
            }

            const originalButtonText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Salvando`;

            let personData = {}; // Definido aqui para estar acessível no 'finally'

            try {
                // 1. Coletar os dados do formulário
                personData = {
                    nome: document.getElementById('person-name').value,
                    email: document.getElementById('person-email').value,
                    telefone: document.getElementById('person-phone').value,
                    endereco: document.getElementById('person-address').value,
                    tipo: document.getElementById('person-type').value,
                    cpf: document.getElementById('person-cpf').value || null,
                    rg: document.getElementById('person-rg').value || null,
                    instagram: document.getElementById('person-insta').value || null,
                    createdAt: serverTimestamp(),
                    ownerId: userId
                };

                // 2. Validar campos obrigatórios
                if (!personData.nome || !personData.email || !personData.telefone || !personData.endereco) {
                    throw new Error("Campos obrigatórios (Nome, Email, Tel, Endereço) não podem estar vazios.");
                }

                // 3. Salvar no Firestore
                const collectionPath = `artifacts/${appId}/users/${userId}/pessoas`;
                const docRef = await addDoc(collection(db, collectionPath), personData);

                showModal("Sucesso!", `"${personData.nome}" foi salvo(a) com sucesso.`);
                formAddPerson.reset(); // Reseta o formulário

                // 4. BÔNUS: Redirecionar de volta para a página de origem
                if (personCadastroRedirect === 'page-produtos') {
                    // --- REDIRECIONAR DE VOLTA PARA PRODUTOS ---
                    showPage('page-produtos');

                    // Clica na aba "Cadastrar Produto"
                    const tabProdutosAdd = document.querySelector('.product-tab-btn[data-tab="tab-produtos-add"]');
                    if (tabProdutosAdd) tabProdutosAdd.click();

                    // Espera o 'onSnapshot' (loadPeople) atualizar a lista de fornecedores
                    setTimeout(() => {
                        const select = document.getElementById('prod-fornecedor');
                        if (select) {
                            select.value = personData.nome; // Pré-seleciona o novo fornecedor
                        }
                    }, 500); // 500ms de delay

                } else {
                    // --- REDIRECIONAR DE VOLTA PARA VENDAS (Comportamento padrão) ---
                    showPage('page-vendas');

                    // Clica na aba "Nova Venda"
                    const tabVendasNew = document.querySelector('.vendas-tab-btn[data-tab="tab-vendas-new"]');
                    if (tabVendasNew) tabVendasNew.click();

                    // Espera o 'onSnapshot' (loadPeople) atualizar a lista de clientes
                    setTimeout(() => {
                        const select = document.getElementById('sale-client');
                        if (select) {
                            select.value = personData.nome; // Pré-seleciona o novo cliente
                        }
                    }, 500);
                }

                // Reseta a variável de redirecionamento para o padrão (Vendas)
                personCadastroRedirect = 'page-vendas';

            } catch (error) {
                console.error("Erro ao salvar pessoa:", error);
                showModal("Erro", "Não foi possível salvar: " + error.message);
            } finally {
                saveButton.disabled = false;
                saveButton.innerHTML = originalButtonText;
            }
        }
        // --- "LIGA" O ATALHO DE CADASTRO DE CLIENTE (EM VENDAS) ---
        const btnAddNewClientSale = document.getElementById('btn-add-new-client-sale');

        if (btnAddNewClientSale) {
            btnAddNewClientSale.addEventListener('click', (e) => {
                e.preventDefault();
                personCadastroRedirect = 'page-vendas'; // <-- ADICIONE ESTA LINHA
                console.log("Atalho: Cadastrar novo cliente");

                // 1. Muda o sistema para a página 'Pessoas'
                showPage('page-pessoas');

                // 2. Encontra e "clica" na aba 'Cadastrar Pessoa'
                const tabButton = document.querySelector('#pessoas-tabs .pessoas-tab-btn[data-tab="tab-pessoas-add"]');
                if (tabButton) {
                    tabButton.click(); // Simula um clique, o que aciona a nossa função setupTabs
                }

                // 3. (Bônus) Foca no campo "Nome" para cadastro rápido
                // Usamos um pequeno delay para dar tempo da aba trocar
                setTimeout(() => {
                    const personNameInput = document.getElementById('person-name');
                    if (personNameInput) {
                        personNameInput.focus();
                    }
                }, 100); // 100ms
            });
        }
        // --- FIM DO ATALHO ---
        // --- "LIGA" O ATALHO DE CADASTRO DE FORNECEDOR (EM PRODUTOS) ---
        const btnAddSupplier = document.getElementById('btn-add-supplier');

        if (btnAddSupplier) {
            btnAddSupplier.addEventListener('click', (e) => {
                e.preventDefault();
                personCadastroRedirect = 'page-produtos'; // <-- ADICIONE ESTA LINHA

                console.log("Atalho: Cadastrar novo fornecedor...");

                // 1. Muda o sistema para a página 'Pessoas'
                showPage('page-pessoas');

                // 2. Encontra e "clica" na aba 'Cadastrar Pessoa'
                const tabButton = document.querySelector('#pessoas-tabs .pessoas-tab-btn[data-tab="tab-pessoas-add"]');
                if (tabButton) {
                    tabButton.click();
                }

                // 3. (Bônus) Pré-seleciona "Fornecedor" no tipo e foca no nome
                setTimeout(() => {
                    const personTypeSelect = document.getElementById('person-type');
                    const personNameInput = document.getElementById('person-name');
                    if (personTypeSelect) {
                        personTypeSelect.value = 'fornecedor'; // Pré-seleciona
                    }
                    if (personNameInput) {
                        personNameInput.focus();
                    }
                }, 100); // 100ms
            });
        }
        // --- FIM DO ATALHO FORNECEDOR ---

        // --- "LIGA" O BOTÃO DE NOVA ENTRADA AVULSA ---
        const btnNewIncome = document.getElementById('btn-new-income');
        if (btnNewIncome) {
            btnNewIncome.addEventListener('click', () => {
                modalTitle.textContent = 'Nova Entrada Avulsa';
                modalBody.innerHTML = `
                    <form id="form-new-income" class="space-y-4 mt-4">
                        <div>
                            <label class="block text-sm font-medium">Descrição (Origem da receita)</label>
                            <input type="text" id="income-desc" required class="w-full px-3 py-2 mt-1 border rounded-md" placeholder="Ex: Aporte, Empréstimo, Rendimento, etc.">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Valor Total (R$)</label>
                            <input type="number" id="income-value" step="0.01" required class="w-full px-3 py-2 mt-1 border rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Data do Recebimento</label>
                            <input type="date" id="income-date" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${formatDateToYYYYMMDD(new Date())}">
                        </div>
                        <div class="mt-4 border-t pt-4">
                            <label class="block text-sm font-medium mb-2">Formas de Recebimento (Define qual Caixa)</label>
                            <div id="income-payment-splits-container" class="space-y-2">
                                <!-- JS vai popular -->
                            </div>
                            <button type="button" id="btn-add-income-payment-split" class="mt-2 text-sm text-indigo-600 hover:underline font-medium flex items-center">
                                <i data-lucide="plus" class="w-4 h-4 mr-1"></i> Adicionar outra forma
                            </button>
                            <p id="income-split-error" class="text-xs text-red-600 mt-1 hidden"></p>
                        </div>
                        <div class="mt-6 text-right space-x-2 border-t pt-4">
                            <button type="button" id="btn-cancel-income" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                            <button type="submit" id="btn-save-income" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Registrar Entrada</button>
                        </div>
                    </form>
                `;
                modalContainer.style.display = 'flex';

                const container = document.getElementById('income-payment-splits-container');
                const btnAddSplit = document.getElementById('btn-add-income-payment-split');
                const totalInput = document.getElementById('income-value');
                const errorP = document.getElementById('income-split-error');

                function addSplitRow(method, value) {
                    const row = document.createElement('div');
                    row.className = 'flex items-center space-x-2 split-row';
                    row.innerHTML = `
                        <select class="split-method flex-1 px-3 py-2 border rounded-md">
                            <option value="Dinheiro" ${method === 'Dinheiro' ? 'selected' : ''}>Dinheiro (Caixa Físico)</option>
                            <option value="Pix" ${method === 'Pix' ? 'selected' : ''}>Pix (Conta Bancária)</option>
                            <option value="Transferência Bancária" ${method === 'Transferência Bancária' ? 'selected' : ''}>Transferência Bancária (Conta Bancária)</option>
                            <option value="Cartão de Crédito" ${method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito (Conta Bancária)</option>
                            <option value="Cartão de Débito" ${method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito (Conta Bancária)</option>
                            <option value="Boleto" ${method === 'Boleto' ? 'selected' : ''}>Boleto (Conta Bancária)</option>
                        </select>
                        <input type="number" step="0.01" class="split-value w-32 px-3 py-2 border rounded-md" value="${value.toFixed(2)}">
                        <button type="button" class="btn-remove-split text-red-500 hover:text-red-700 px-2">
                            <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                        </button>
                    `;
                    container.appendChild(row);
                    lucide.createIcons();
                    row.querySelector('.btn-remove-split').onclick = () => { row.remove(); if(container.children.length === 0) addSplitRow('Dinheiro', 0); };
                }

                addSplitRow('Dinheiro', 0);
                btnAddSplit.onclick = () => addSplitRow('Pix', 0);

                // Atualiza o valor do split automaticamente se houver apenas uma linha
                totalInput.addEventListener('input', () => {
                    const splitRows = container.querySelectorAll('.split-row');
                    if (splitRows.length === 1) {
                        const valInput = splitRows[0].querySelector('.split-value');
                        if (valInput) valInput.value = parseFloat(totalInput.value || 0).toFixed(2);
                    }
                });

                setupTwoSplitsLogic(
                    container,
                    '.split-row',
                    '.split-value',
                    () => parseFloat(totalInput.value) || 0
                );

                document.getElementById('btn-cancel-income').onclick = hideModal;

                document.getElementById('form-new-income').onsubmit = async (e) => {
                    e.preventDefault();
                    const saveBtn = document.getElementById('btn-save-income');
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = "Salvando...";
                    errorP.classList.add('hidden');

                    try {
                        const desc = document.getElementById('income-desc').value.trim();
                        const val = parseFloat(totalInput.value);
                        const dateStr = document.getElementById('income-date').value;

                        if (!desc || isNaN(val) || val <= 0 || !dateStr) {
                            throw new Error("Preencha todos os campos corretamente.");
                        }
                        
                        const splitRows = container.querySelectorAll('.split-row');
                        const paymentSplits = [];
                        let splitsTotal = 0;

                        splitRows.forEach(row => {
                            const method = row.querySelector('.split-method').value;
                            const splitVal = parseFloat(row.querySelector('.split-value').value) || 0;
                            if (splitVal > 0) {
                                paymentSplits.push({ method, value: splitVal });
                                splitsTotal += splitVal;
                            }
                        });

                        if (paymentSplits.length === 0) {
                            errorP.textContent = "Adicione pelo menos uma forma de pagamento com valor maior que zero.";
                            errorP.classList.remove('hidden');
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = 'Registrar Entrada';
                            return;
                        }

                        if (Math.abs(splitsTotal - val) > 0.01) {
                            errorP.textContent = `A soma das formas de pagamento (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao Valor Total (R$ ${val.toFixed(2)}).`;
                            errorP.classList.remove('hidden');
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = 'Registrar Entrada';
                            return;
                        }

                        let mainPaymentMethod = paymentSplits.length === 1 ? paymentSplits[0].method : 'Múltiplas Formas';

                        const dateObj = new Date(dateStr + 'T00:00:00');
                        const timestamp = Timestamp.fromDate(dateObj);

                        const financeData = {
                            descricao: desc,
                            valor: val,
                            tipo: 'Entrada',
                            data: timestamp,
                            vencimento: null,
                            pago: true, // Entradas avulsas já entram como pagas (recebidas)
                            ownerId: userId,
                            paymentMethod: mainPaymentMethod,
                            paymentSplits: paymentSplits
                        };

                        const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                        await addDoc(collection(db, collectionPath), financeData);

                        hideModal();
                        showModal("Sucesso!", "Entrada avulsa registrada com sucesso.");
                    } catch (error) {
                        console.error("Erro ao registrar entrada:", error);
                        showModal("Erro", "Falha ao registrar entrada: " + error.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = "Registrar Entrada";
                    }
                };
            });
        }

        // --- "LIGA" O BOTÃO DE TRANSFERÊNCIA ENTRE CAIXAS ---
        const btnNewTransfer = document.getElementById('btn-new-transfer');
        if (btnNewTransfer) {
            btnNewTransfer.addEventListener('click', () => {
                modalTitle.textContent = 'Transferência entre Caixas';
                modalBody.innerHTML = `
                    <form id="form-new-transfer" class="space-y-4 mt-4">
                        <div>
                            <label class="block text-sm font-medium">Tipo de Transferência</label>
                            <select id="transfer-type" class="w-full px-3 py-2 mt-1 border rounded-md">
                                <option value="to_bank">Depósito (Dinheiro Físico ➔ Banco)</option>
                                <option value="to_cash">Saque (Banco ➔ Dinheiro Físico)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Valor (R$)</label>
                            <input type="number" id="transfer-value" step="0.01" required class="w-full px-3 py-2 mt-1 border rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Data da Movimentação</label>
                            <input type="date" id="transfer-date" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${formatDateToYYYYMMDD(new Date())}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Descrição / Observação (Opcional)</label>
                            <input type="text" id="transfer-desc" class="w-full px-3 py-2 mt-1 border rounded-md" placeholder="Ex: Depósito ref. ao fim de semana">
                        </div>
                        <div class="mt-6 text-right space-x-2">
                            <button type="button" id="btn-cancel-transfer" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                            <button type="submit" id="btn-save-transfer" class="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Realizar Transferência</button>
                        </div>
                    </form>
                `;
                modalContainer.style.display = 'flex';

                document.getElementById('btn-cancel-transfer').onclick = hideModal;

                document.getElementById('form-new-transfer').onsubmit = async (e) => {
                    e.preventDefault();
                    const saveBtn = document.getElementById('btn-save-transfer');
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = "Processando...";

                    try {
                        const type = document.getElementById('transfer-type').value;
                        const val = parseFloat(document.getElementById('transfer-value').value);
                        const dateStr = document.getElementById('transfer-date').value;
                        const customDesc = document.getElementById('transfer-desc').value.trim();

                        if (isNaN(val) || val <= 0 || !dateStr) {
                            throw new Error("Preencha o valor e a data corretamente.");
                        }

                        const dateObj = new Date(dateStr + 'T00:00:00');
                        const timestamp = Timestamp.fromDate(dateObj);
                        
                        let descOut, descIn, methodOut, methodIn;
                        
                        // Define a lógica de "De onde sai" e "Pra onde vai"
                        if (type === 'to_bank') {
                            descOut = customDesc || "Depósito Bancário (Saída do Caixa Físico)";
                            descIn = customDesc || "Depósito Bancário (Entrada na Conta)";
                            methodOut = 'Dinheiro';
                            methodIn = 'Transferência Bancária';
                        } else {
                            descOut = customDesc || "Saque (Saída da Conta Bancária)";
                            descIn = customDesc || "Saque (Entrada no Caixa Físico)";
                            methodOut = 'Transferência Bancária';
                            methodIn = 'Dinheiro';
                        }

                        const batch = writeBatch(db);
                        const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

                        // 1. Cria a Saída
                        const docOutRef = doc(collection(db, collectionPath));
                        batch.set(docOutRef, {
                            descricao: descOut,
                            valor: val,
                            tipo: 'Saída',
                            data: timestamp,
                            vencimento: null,
                            pago: true,
                            ownerId: userId,
                            paymentMethod: methodOut
                        });

                        // 2. Cria a Entrada
                        const docInRef = doc(collection(db, collectionPath));
                        batch.set(docInRef, {
                            descricao: descIn,
                            valor: val,
                            tipo: 'Entrada',
                            data: timestamp,
                            vencimento: null,
                            pago: true,
                            ownerId: userId,
                            paymentMethod: methodIn
                        });

                        // Dispara as duas ações juntas
                        await batch.commit();

                        hideModal();
                        showModal("Sucesso!", "Transferência realizada com sucesso.");
                    } catch (error) {
                        console.error("Erro ao realizar transferência:", error);
                        showModal("Erro", "Falha na transferência: " + error.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = "Realizar Transferência";
                    }
                };
            });
        }

        // --- "LIGA" O MODAL DE NOVA CONTA ---
        const btnOpenAddBill = document.getElementById('btn-open-add-bill');
        const modalAddBill = document.getElementById('modal-add-bill');
        const btnCloseModalAddBill = document.getElementById('btn-close-modal-add-bill');
        const btnCancelFormBill = document.getElementById('btn-cancel-form-bill');

        if (btnOpenAddBill && modalAddBill) {
            btnOpenAddBill.addEventListener('click', () => {
                modalAddBill.classList.remove('hidden');
                lucide.createIcons(); // Garante a renderização dos ícones (ex: botão de adicionar plano)
                const billDueDateInput = document.getElementById('bill-due-date');
                if (billDueDateInput && !billDueDateInput.value) {
                    billDueDateInput.value = getFutureDateString(30); // Padrão: 30 dias no futuro
                }
            });
            
            const closeAddBillModal = () => { modalAddBill.classList.add('hidden'); };
            
            if (btnCloseModalAddBill) btnCloseModalAddBill.addEventListener('click', closeAddBillModal);
            if (btnCancelFormBill) btnCancelFormBill.addEventListener('click', closeAddBillModal);
            
            // Fecha o modal se o usuário clicar no fundo escuro fora da janela
            modalAddBill.addEventListener('click', (e) => {
                if (e.target === modalAddBill) closeAddBillModal();
            });
        }

        // --- "LIGA" O FORMULÁRIO DE ADICIONAR CONTA/DESPESA ---
        const formAddBill = document.getElementById('form-add-bill');

        if (formAddBill) {
            formAddBill.addEventListener('submit', async (e) => {
                e.preventDefault(); // Impede recarregamento
                if (!userId) {
                    showModal("Erro", "Você não está logado.");
                    return;
                }

                const saveButton = formAddBill.querySelector('button[type="submit"]');
                const originalButtonText = saveButton.innerHTML;
                saveButton.disabled = true;
                saveButton.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Salvando`;

                try {
                    // 1. Coletar dados
                    const description = document.getElementById('bill-desc').value;
                    const totalValue = parseFloat(document.getElementById('bill-value').value);
                    const firstDueDate = document.getElementById('bill-due-date').value; // Formato YYYY-MM-DD
                    const isInstallment = document.getElementById('bill-is-installment').checked;
                    const isPaid = document.getElementById('bill-is-paid').checked;
                    const installmentCount = isInstallment ? parseInt(document.getElementById('bill-installments-count').value) : 1;
                    const planoContas = document.getElementById('bill-plano-contas').value;
                    const paymentMethod = document.getElementById('bill-payment-method-pre').value;
                    const installmentValueType = isInstallment ? document.getElementById('bill-installment-value-type').value : 'total';
                    const finalPaymentMethod = (isPaid && paymentMethod === 'Não definido') ? 'Dinheiro' : paymentMethod;

                    const isFixed = document.getElementById('bill-is-fixed').checked;
                    const fixedCount = isFixed ? parseInt(document.getElementById('bill-fixed-count').value) : 1;

                    // 2. Validações
                    if (!description || isNaN(totalValue) || totalValue <= 0 || !firstDueDate) {
                        throw new Error("Descrição, Valor e Data de Vencimento são obrigatórios.");
                    }
                    if (isInstallment && (isNaN(installmentCount) || installmentCount < 2)) {
                        throw new Error("Número de parcelas inválido (mínimo 2).");
                    }
                    if (isFixed && (isNaN(fixedCount) || fixedCount < 1 || fixedCount > 600)) {
                        throw new Error("Número de meses para projeção inválido (1 a 600).");
                    }
                    
                    // Cria um identificador único de grupo para contas fixas ou parceladas
                    const groupId = (isInstallment || isFixed) ? `group_${Date.now()}` : null;

                    // 3. Preparar Lote (Batch)
                    const batch = writeBatch(db);
                    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;

                    let iterations = 1;
                    if (isInstallment) iterations = installmentCount;
                    if (isFixed) iterations = fixedCount;

                    let installmentValue;
                    if (isInstallment) {
                        if (installmentValueType === 'total') {
                            installmentValue = totalValue / installmentCount;
                        } else {
                            installmentValue = totalValue; // O valor digitado já é o da parcela
                        }
                    } else {
                        installmentValue = totalValue;
                    }
                    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

                    // 4. Loop para criar os lançamentos (1 ou N)
                    for (let i = 0; i < iterations; i++) {
                        const currentDueDate = new Date(firstDueDate + 'T00:00:00'); // Adiciona T00:00:00
                        currentDueDate.setMonth(currentDueDate.getMonth() + i); // Adiciona 'i' meses à data da primeira parcela
                        
                        let desc = description;
                        if (isInstallment) {
                            desc = `${description} (${i + 1}/${installmentCount})`;
                        } else if (isFixed) {
                            const m = currentDueDate.getMonth();
                            const y = currentDueDate.getFullYear();
                            desc = `${description} (${monthNames[m]}/${y})`;
                        }
                        
                        const isThisPaid = isPaid && i === 0;

                        const billData = {
                            descricao: desc,
                            originalDescription: description,
                            valor: installmentValue,
                            tipo: 'Saída',
                            data: isThisPaid ? Timestamp.fromDate(currentDueDate) : serverTimestamp(), // Se paga, registra na data escolhida
                            vencimento: currentDueDate.toISOString().split('T')[0], // Salva como YYYY-MM-DD
                            pago: isThisPaid,
                            paymentMethod: isThisPaid ? finalPaymentMethod : 'Não definido',
                            planoContas: planoContas,
                            isInstallment: isInstallment,
                            isFixed: isFixed,
                            groupId: groupId,
                            installmentNumber: isInstallment ? i + 1 : null,
                            totalInstallments: isInstallment ? installmentCount : null,
                            ownerId: userId
                        };

                        const newBillRef = doc(collection(db, collectionPath));
                        batch.set(newBillRef, billData); // Adiciona ao lote
                    }

                    // 5. Executar o Lote
                    await batch.commit();

                    showModal("Sucesso!", `Conta "${description}" registrada com sucesso.`);
                    formAddBill.reset();
                    // Desmarca o checkbox de parcela e esconde o campo
                    if (document.getElementById('bill-is-installment')) {
                        document.getElementById('bill-is-installment').checked = false;
                        document.getElementById('bill-installments-group').classList.add('hidden');
                    }
                    if (document.getElementById('bill-is-fixed')) {
                        document.getElementById('bill-is-fixed').checked = false;
                        document.getElementById('bill-fixed-group').classList.add('hidden');
                    }

                    // O onSnapshot (loadFinancialHistory) vai atualizar as tabelas!
                    
                    // Fecha o modal da nova conta
                    if (modalAddBill) modalAddBill.classList.add('hidden');

                } catch (error) {
                    console.error("Erro ao adicionar conta:", error);
                    showModal("Erro", "Não foi possível registrar a conta: " + error.message);
                } finally {
                    saveButton.disabled = false;
                    saveButton.innerHTML = originalButtonText;
                }
            });
        }
        // --- FIM DO FORMULÁRIO CONTA/DESPESA ---
        // --- "LIGA" O PREENCHIMENTO AUTOMÁTICO DE DATA EM CONTAS A PAGAR ---
        const btnTabContasAPagar = document.getElementById('btn-tab-contas-a-pagar');

        if (btnTabContasAPagar) {
            btnTabContasAPagar.addEventListener('click', () => {
                // Define a data de vencimento para 30 dias no futuro
                const billDueDateInput = document.getElementById('bill-due-date');
                // Só preenche se estiver vazio, para não sobrescrever o que você já digitou
                if (!billDueDateInput.value) {
                    billDueDateInput.value = getFutureDateString(30);
                }
            });
        }
        // --- FIM DO PREENCHIMENTO DE DATA ---
        // --- "LIGA" O DROPDOWN DE ORDENAÇÃO DE CONTAS A PAGAR ---
        const billsSortOrder = document.getElementById('bills-sort-order');
        if (billsSortOrder) {
            billsSortOrder.addEventListener('change', () => {
                // Re-renderiza a tabela de contas usando a cache global
                // A função renderBillsTab vai ler o novo valor do dropdown
                if (allFinancialEntries) {
                    renderBillsTab(allFinancialEntries);
                }
            });
        }
        const billsFilterPlano = document.getElementById('bills-filter-plano');
        if (billsFilterPlano) {
            billsFilterPlano.addEventListener('change', () => {
                if (allFinancialEntries) {
                    renderBillsTab(allFinancialEntries);
                }
            });
        }

        const billsFilterStart = document.getElementById('bills-filter-start');
        const billsFilterEnd = document.getElementById('bills-filter-end');
        const billsClearDateFilter = document.getElementById('bills-clear-date-filter');

        if (billsFilterStart) {
            billsFilterStart.addEventListener('change', () => {
                if (allFinancialEntries) renderBillsTab(allFinancialEntries);
            });
        }
        if (billsFilterEnd) {
            billsFilterEnd.addEventListener('change', () => {
                if (allFinancialEntries) renderBillsTab(allFinancialEntries);
            });
        }
        if (billsClearDateFilter) {
            billsClearDateFilter.addEventListener('click', (e) => {
                e.preventDefault();
                if (billsFilterStart) billsFilterStart.value = '';
                if (billsFilterEnd) billsFilterEnd.value = '';
                if (allFinancialEntries) renderBillsTab(allFinancialEntries);
            });
        }
        
        const billsSearchInput = document.getElementById('bills-search-input');
        if (billsSearchInput) {
            billsSearchInput.addEventListener('input', () => {
                if (allFinancialEntries) renderBillsTab(allFinancialEntries);
            });
        }
        
         
        // --- "LIGA" OS EVENTOS DO NOVO PAINEL DE EXTRATO ANALÍTICO ---
        const histSearch = document.getElementById('history-search-input');
        const histType = document.getElementById('history-filter-type');
        const histAccount = document.getElementById('history-filter-account');
        const histStart = document.getElementById('history-filter-start');
        const histEnd = document.getElementById('history-filter-end');
        const histSort = document.getElementById('history-sort-order');
        const histClear = document.getElementById('history-clear-filters');

        [histSearch, histType, histAccount, histStart, histEnd, histSort].forEach(el => {
            if (el) {
                if (el.tagName === 'SELECT' || el.type === 'date') el.addEventListener('change', updateFinanceHistoryUI);
                else el.addEventListener('input', updateFinanceHistoryUI);
            }
        });

        if (histClear) {
            histClear.addEventListener('click', (e) => {
                e.preventDefault();
                if(histSearch) histSearch.value = '';
                if(histType) histType.value = 'Todos';
                if(histAccount) histAccount.value = 'Todos';
                if(histStart) histStart.value = '';
                if(histEnd) histEnd.value = '';
                if(histSort) histSort.value = 'data_desc';
                updateFinanceHistoryUI();
            });
        }

        // --- FILTROS DE MÉTRICAS (MICRO-CARDS CLICÁVEIS) ---
        const cardFilterLate = document.getElementById('card-filter-late');
        const cardFilterSoon = document.getElementById('card-filter-soon');
        const cardFilterAll = document.getElementById('card-filter-all');

        function updateBillMetricCardsUI() {
            // Tira o destaque de todos e aplica uma opacidade leve para mostrar que estão inativos
            [cardFilterLate, cardFilterSoon, cardFilterAll].forEach(card => {
                if (card) {
                    card.classList.remove('ring-2', 'ring-indigo-500', 'scale-105');
                    card.style.opacity = '0.5';
                }
            });

            // Descobre qual está ativo
            let activeCard = cardFilterAll;
            if (currentBillMetricFilter === 'late') activeCard = cardFilterLate;
            if (currentBillMetricFilter === 'soon') activeCard = cardFilterSoon;

            // Dá destaque ao ativo
            if (activeCard) {
                activeCard.classList.add('ring-2', 'ring-indigo-500', 'scale-105');
                activeCard.style.opacity = '1';
            }
        }

        // Função Helper genérica para alternar o filtro
        function toggleMetricFilter(metricName) {
            // Se clicar no que já está ativo, ele reseta para o "Todos" (all)
            currentBillMetricFilter = currentBillMetricFilter === metricName ? 'all' : metricName;
            updateBillMetricCardsUI();
            if (allFinancialEntries) renderBillsTab(allFinancialEntries);
        }

        if (cardFilterLate) cardFilterLate.addEventListener('click', () => toggleMetricFilter('late'));
        if (cardFilterSoon) cardFilterSoon.addEventListener('click', () => toggleMetricFilter('soon'));
        if (cardFilterAll) cardFilterAll.addEventListener('click', () => { currentBillMetricFilter = 'all'; updateBillMetricCardsUI(); if (allFinancialEntries) renderBillsTab(allFinancialEntries); });

        updateBillMetricCardsUI(); // Chama na inicialização para ativar visualmente o card de "Total"

        // --- FIM DO NOVO BLOCO ---
        // --- "LIGA" O FORMULÁRIO DE VENDA ---
        if (formNewSale) {
            formNewSale.addEventListener('submit', handleFinalizeSale);
        }
        // --- FIM DA LÓGICA DE FINALIZAR VENDA ---
        /**
         * Mostra o modal de confirmação para EXCLUIR um produto.
         */
        function showProductDeleteConfirmation(productId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Pergunta ao usuário
            modalTitle.textContent = 'Confirmar Exclusão';
            modalBody.innerHTML = `
        <p>Você tem certeza que deseja excluir este produto?</p>
        <p class="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
        <div class="mt-6 text-right space-x-2">
            <button type="button" id="btn-confirm-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="button" id="btn-confirm-delete" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Sim, Excluir</button>
        </div>
    `;

            // 2. Mostra o modal
            modalContainer.style.display = 'flex';

            // 3. Listeners da confirmação
            document.getElementById('btn-confirm-cancel').onclick = hideModal;

            document.getElementById('btn-confirm-delete').onclick = async () => {
                const deleteBtn = document.getElementById('btn-confirm-delete');
                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Excluindo';

                try {
                    // Caminho do documento
                    const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                    const docRef = doc(db, collectionPath, productId);

                    // Exclui do Firebase
                    await deleteDoc(docRef);

                    // Fecha o modal
                    hideModal();

                    // O 'onSnapshot' (que já está rodando) vai
                    // atualizar a lista automaticamente!

                } catch (error) {
                    console.error("Erro ao excluir produto:", error);
                    showModal("Erro", "Não foi possível excluir o produto.");
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Sim, Excluir';
                }
            };
        }

        // --- LÓGICA DE ADICIONAR PLANO DE CONTAS (MODAL) ---
        const btnAddPlano = document.getElementById('btn-add-plano');
        const btnAddPlanoFilter = document.getElementById('btn-add-plano-filter');

        const openAddPlanoModal = () => {
                modalTitle.textContent = 'Adicionar Plano de Contas';
                modalBody.innerHTML = `
                    <p class="text-sm text-gray-600 mb-4">Crie uma categoria para organizar suas despesas (ex: Água, Luz, Salários).</p>
                    <div>
                        <label class="block text-sm font-medium">Nome do Plano</label>
                        <input type="text" id="new-plano-name" required class="w-full px-3 py-2 mt-1 border rounded-md" placeholder="Ex: Fornecedores">
                        <p id="plano-error" class="text-xs text-red-600 mt-1 hidden"></p>
                    </div>
                    <div class="mt-6 text-right">
                        <button type="button" id="btn-cancel-plano" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2">Cancelar</button>
                        <button type="button" id="btn-save-plano" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Salvar</button>
                    </div>
                `;
                modalContainer.style.display = 'flex';

                const input = document.getElementById('new-plano-name');
                input.focus();

                document.getElementById('btn-cancel-plano').onclick = hideModal;

                document.getElementById('btn-save-plano').onclick = async () => {
                    const name = input.value.trim();
                    const errorP = document.getElementById('plano-error');
                    if (!name) {
                        errorP.textContent = 'Digite um nome válido.';
                        errorP.classList.remove('hidden');
                        return;
                    }
                    document.getElementById('btn-save-plano').disabled = true;
                    document.getElementById('btn-save-plano').textContent = 'Salvando...';
                    try {
                        const planoId = name.toLowerCase();
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/planos_contas`, planoId);
                        await setDoc(docRef, { nome: name, createdAt: serverTimestamp() });
                        setTimeout(() => { 
                            const modalSelect = document.getElementById('bill-plano-contas');
                            const filterSelect = document.getElementById('bills-filter-plano');
                            if (modalSelect) modalSelect.value = name; 
                            if (filterSelect) {
                                filterSelect.value = name;
                                filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, 100);
                        hideModal();
                    } catch (error) {
                        console.error("Erro ao salvar plano:", error);
                        showModal("Erro", "Não foi possível salvar o plano de contas.");
                    }
                };
        };

        if (btnAddPlano) btnAddPlano.addEventListener('click', openAddPlanoModal);
        if (btnAddPlanoFilter) btnAddPlanoFilter.addEventListener('click', openAddPlanoModal);

        // --- LÓGICA DE GERENCIAR PLANO DE CONTAS ---
        const btnManagePlano = document.getElementById('btn-manage-plano');
        const btnManagePlanoFilter = document.getElementById('btn-manage-plano-filter');

        const openManagePlanoModal = () => {
                modalTitle.textContent = 'Gerenciar Planos de Contas';
                const list = document.createElement('ul');
                list.className = 'space-y-2 max-h-60 overflow-y-auto';
                
                const customOptions = document.getElementById('bill-plano-contas').querySelectorAll('option.custom-plano');
                
                if (customOptions.length === 0) {
                    list.innerHTML = '<p class="text-gray-500 text-sm">Nenhum plano customizado criado ainda.</p>';
                } else {
                    customOptions.forEach(opt => {
                        const li = document.createElement('li');
                        li.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-md';
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.textContent = opt.value;
                        li.appendChild(nameSpan);

                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'flex items-center space-x-3';

                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn-edit-plano text-indigo-500 hover:text-indigo-700';
                        editBtn.dataset.name = opt.value;
                        editBtn.innerHTML = '<i data-lucide="edit-2" class="w-5 h-5 pointer-events-none"></i>';

                        const delBtn = document.createElement('button');
                        delBtn.className = 'btn-delete-plano text-red-500 hover:text-red-700';
                        delBtn.dataset.name = opt.value;
                        delBtn.innerHTML = '<i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>';
                        
                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(delBtn);
                        li.appendChild(actionsDiv);
                        list.appendChild(li);
                    });
                }

                modalBody.innerHTML = '';
                modalBody.appendChild(list);
                modalBody.innerHTML += '<div class="mt-6 text-right"><button id="btn-close-manage-plano" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button></div>';
                
                modalContainer.style.display = 'flex';
                lucide.createIcons();

                document.getElementById('btn-close-manage-plano').onclick = hideModal;

                modalBody.querySelectorAll('.btn-edit-plano').forEach(btn => {
                    btn.onclick = async (e) => {
                        const oldName = e.currentTarget.dataset.name;
                        const newName = window.prompt("Digite o novo nome para o plano de contas:", oldName);
                        
                        if (!newName || newName.trim() === "" || newName.trim() === oldName) return;

                        const newNameTrimmed = newName.trim();
                        const oldId = oldName.toLowerCase();
                        const newId = newNameTrimmed.toLowerCase();

                        try {
                            const batch = writeBatch(db);
                            
                            // 1. Cria o novo plano
                            const newPlanRef = doc(db, `artifacts/${appId}/users/${userId}/planos_contas`, newId);
                            batch.set(newPlanRef, { nome: newNameTrimmed, createdAt: serverTimestamp() });

                            // 2. Exclui o plano antigo (se o ID base for diferente)
                            if (oldId !== newId) {
                                const oldPlanRef = doc(db, `artifacts/${appId}/users/${userId}/planos_contas`, oldId);
                                batch.delete(oldPlanRef);
                            }

                            // 3. Atualiza os lançamentos antigos que utilizavam esse plano
                            const lancamentosRef = collection(db, `artifacts/${appId}/users/${userId}/lancamentos`);
                            const q = query(lancamentosRef, where("planoContas", "==", oldName));
                            const snapshot = await getDocs(q);
                            
                            snapshot.forEach(docSnap => {
                                batch.update(docSnap.ref, { planoContas: newNameTrimmed });
                            });

                            await batch.commit();
                            hideModal();
                            setTimeout(() => showModal("Sucesso!", `Plano renomeado para "${newNameTrimmed}".`), 300);

                        } catch (err) {
                            console.error("Erro ao editar plano:", err);
                            hideModal();
                            setTimeout(() => showModal("Erro", "Erro ao editar: " + err.message), 300);
                        }
                    };
                });

                modalBody.querySelectorAll('.btn-delete-plano').forEach(btn => {
                    btn.onclick = (e) => {
                        const name = e.currentTarget.dataset.name;
                        if (confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) {
                            deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/planos_contas`, name.toLowerCase()))
                                .then(hideModal)
                                .catch(err => showModal("Erro", "Erro ao excluir: " + err.message));
                        }
                    };
                });
        };

        if (btnManagePlano) btnManagePlano.addEventListener('click', openManagePlanoModal);
        if (btnManagePlanoFilter) btnManagePlanoFilter.addEventListener('click', openManagePlanoModal);

        /**
         * Mostra o modal de EDIÇÃO de um produto.
         */
        async function showEditProductModal(productId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Buscar os dados do produto
            try {
                const collectionPath = `artifacts/${appId}/users/${userId}/produtos`;
                const docRef = doc(db, collectionPath, productId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    showModal("Erro", "Produto não encontrado. Pode ter sido excluído.");
                    return;
                }

                const product = docSnap.data();

                // 2. Pegar a lista de categorias do <select> principal para replicar no modal
                const categorySelectHTML = document.getElementById('prod-categoria').innerHTML;
                const supplierSelectHTML = document.getElementById('prod-fornecedor').innerHTML;

                // 3. Montar o HTML do formulário de edição
                modalTitle.textContent = 'Editar Produto';
                modalBody.innerHTML = `
            <form id="form-edit-product" class="grid grid-cols-1 gap-6 md:grid-cols-3">
                <!-- Coluna 1: Infos Principais -->
                <div class="space-y-4 md:col-span-2">
                    <h3 class="text-lg font-medium">Detalhes do Produto</h3>
                    <div>
                        <label class="block text-sm font-medium">Nome do Produto</label>
                        <input type="text" id="edit-prod-nome" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.nome}">
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label class="block text-sm font-medium">Custo (R$)</label>
                            <input type="number" id="edit-prod-custo" step="0.01" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.custo || 0}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Margem (%)</label>
                            <input type="number" id="edit-prod-margem" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.margem || 100}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Venda (R$)</label>
                            <input type="number" id="edit-prod-venda" step="0.01" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.venda.toFixed(2)}">
                        </div>                        
                    </div>
                    <div>
                        <label class="block text-sm font-medium">URL da Imagem (Opcional)</label>
                        <input type="url" id="edit-prod-foto" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.fotoUrl || ''}" placeholder="https://exemplo.com/imagem.jpg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Descrição</label>
                        <textarea id="edit-prod-desc" rows="4" class="w-full px-3 py-2 mt-1 border rounded-md">${product.descricao || ''}</textarea>
                    </div>
                </div>
                <!-- Coluna 2: Estoque e Categoria -->
                <div class="space-y-4 md:col-span-1">
                    <h3 class="text-lg font-medium">Organização</h3>
                    <div>
                        <label class="block text-sm font-medium">Categoria</label>
                        <select id="edit-prod-categoria" class="w-full px-3 py-2 mt-1 border rounded-md">
                            ${categorySelectHTML}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Fornecedor</label>
                        <select id="edit-prod-fornecedor" class="w-full px-3 py-2 mt-1 border rounded-md">
                            ${supplierSelectHTML}
                        </select>
                    </div>
                     <div>
                        <label class="block text-sm font-medium">Qtd. em Estoque</label>
                        <input type="number" id="edit-prod-estoque" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.estoque || 0}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Cód. Referência</label>
                        <div class="flex space-x-2">
                            <input type="text" id="edit-prod-ref" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.ref}">
                            <button type="button" id="btn-gen-edit-ref" class="px-3 py-2 mt-1 text-white bg-gray-500 rounded-md hover:bg-gray-600" title="Gerar Código Automático">
                                <i data-lucide="wand-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">2ª Referência (Opcional)</label>
                        <input type="text" id="edit-prod-ref2" class="w-full px-3 py-2 mt-1 border rounded-md" value="${product.ref2 || ''}">
                    </div>
                   
                    <div class="p-4 border rounded-md">
                        <h4 class="font-medium text-center">Código de Barras</h4>
                        <svg id="edit-barcode-preview" class="w-full h-auto mt-2"></svg>
                    </div>
                </div>
                <!-- Ações -->
                <div class="md:col-span-3 text-right space-x-2">
                    <button type="button" id="btn-cancel-edit" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                    <button type="submit" id="btn-save-edit" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Atualizar Produto</button>
                </div>
            </form>
        `;

                // 4. Mostrar o Modal
                modalContainer.style.display = 'flex';

                // 5. Ativar a lógica INTERNA do modal

                // Seta o valor correto do <select>
                document.getElementById('edit-prod-categoria').value = product.categoria;
                document.getElementById('edit-prod-fornecedor').value = product.fornecedor || ''; // <-- ADICIONE ESTA LINHA

                // Lógica para calcular preço de venda (igual à do form principal)
                const editCusto = document.getElementById('edit-prod-custo');
                const editMargem = document.getElementById('edit-prod-margem');
                const editVenda = document.getElementById('edit-prod-venda');

                let isEditCalculating = false;

                function calcularEditPrecoVenda() {
                    if (isEditCalculating) return;
                    isEditCalculating = true;
                    const custo = parseFloat(editCusto.value) || 0;
                    const margem = parseFloat(editMargem.value) || 100;
                    const venda = custo * (1 + (margem / 100));
                    editVenda.value = venda.toFixed(2);
                    isEditCalculating = false;
                }

                function calcularEditMargem() {
                    if (isEditCalculating) return;
                    isEditCalculating = true;
                    const custo = parseFloat(editCusto.value) || 0;
                    const venda = parseFloat(editVenda.value) || 0;
                    if (custo > 0 && venda >= custo) {
                        const margem = (((venda / custo) - 1) * 100);
                        editMargem.value = margem.toFixed(0);
                    }
                    isEditCalculating = false;
                }

                editCusto.addEventListener('input', calcularEditPrecoVenda);
                editMargem.addEventListener('input', calcularEditPrecoVenda);

                // Lógica para gerar barcode (igual à do form principal)
                const editRef = document.getElementById('edit-prod-ref');
                function gerarEditBarcodePreview() {
                    const ref = editRef.value;
                    if (ref) {
                        JsBarcode("#edit-barcode-preview", ref, {
                            format: "CODE128", displayValue: true, fontSize: 14, margin: 10, height: 50
                        });
                    } else {
                        document.getElementById("edit-barcode-preview").innerHTML = "";
                    }
                }
                editRef.addEventListener('input', gerarEditBarcodePreview);
                // Evita salvar automaticamente ao usar leitor de código de barras (Enter) na edição
                editRef.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') e.preventDefault();
                });
                
                // Listener para o botão de gerar código (Edição)
                document.getElementById('btn-gen-edit-ref').onclick = async () => {
                    const btn = document.getElementById('btn-gen-edit-ref');
                    const originalHtml = btn.innerHTML;

                    if (editRef.value.trim() !== '') {
                        if (!confirm('Já existe um código digitado. Deseja gerar um novo e sobrescrever?')) {
                            return;
                        }
                    }
                    
                    try {
                        btn.disabled = true;
                        btn.innerHTML = '<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full"></i>';
                        
                        const uniqueRef = await generateUniqueRef();
                        editRef.value = uniqueRef;
                        gerarEditBarcodePreview();
                    } catch (error) {
                        console.error(error);
                        showModal("Erro", "Falha ao gerar código: " + error.message);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                };

                gerarEditBarcodePreview(); // Gera o barcode inicial

                // 6. Adicionar listeners aos botões do Modal
                document.getElementById('btn-cancel-edit').onclick = hideModal;

                document.getElementById('form-edit-product').onsubmit = async (e) => {
                    e.preventDefault();

                    const saveBtn = document.getElementById('btn-save-edit');
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = `<i class="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2" role="status"></i>Atualizando`;

                    try {
                        // --- VERIFICAR DUPLICIDADE DE REFERÊNCIA (NA EDIÇÃO) ---
                        const newRef = document.getElementById('edit-prod-ref').value.trim();
                        const originalRef = product.ref; // 'product' vem da função 'showEditProductModal'

                        // Só precisamos verificar se a referência FOI ALTERADA
                        if (newRef !== originalRef) {
                            console.log("Referência alterada. Verificando duplicidade...");
                            const productQuery = query(
                                collection(db, collectionPath),
                                where("ref", "==", newRef),
                                where("ownerId", "==", userId)
                            );

                            const querySnapshot = await getDocs(productQuery);

                            if (!querySnapshot.empty) {
                                // A nova referência já existe em outro produto
                                throw new Error(`A referência "${newRef}" já está sendo usada por outro produto.`);
                            }
                        }
                        // --- FIM DA VERIFICAÇÃO ---
                        // Monta o objeto atualizado
                        const updatedProduct = {
                            nome: document.getElementById('edit-prod-nome').value,
                            custo: parseFloat(editCusto.value) || 0,
                            margem: parseFloat(editMargem.value) || 0,
                            venda: parseFloat(editVenda.value) || 0,
                            categoria: document.getElementById('edit-prod-categoria').value,
                            fornecedor: document.getElementById('edit-prod-fornecedor').value,
                            ref: document.getElementById('edit-prod-ref').value,
                            ref2: document.getElementById('edit-prod-ref2').value.trim(),
                            estoque: parseInt(document.getElementById('edit-prod-estoque').value) || 0,
                            descricao: document.getElementById('edit-prod-desc').value,
                            // Não mexemos na fotoUrl aqui, ela permanece a mesma
                            fotoUrl: formatImageUrl(document.getElementById('edit-prod-foto').value.trim()),
                        };

                        // Envia a atualização
                        await updateDoc(docRef, updatedProduct);

                        hideModal();
                        // O onSnapshot vai atualizar a UI automaticamente!

                    } catch (error) {
                        console.error("Erro ao atualizar produto:", error);
                        showModal("Erro", "Falha ao atualizar o produto: " + error.message);
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Atualizar Produto';
                    }
                };


            } catch (error) {
                console.error("Erro ao buscar produto para edição: ", error);
                showModal("Erro", "Não foi possível carregar os dados do produto.");
            }
        }

        /**
    * Mostra o modal de EDIÇÃO de uma Conta a Pagar.
    */
        async function showEditBillModal(billId) {
            if (!userId) {
                showModal("Erro", "Usuário não logado.");
                return;
            }

            // 1. Encontra a conta na cache global
            const bill = allFinancialEntries.find(entry => entry.id === billId);
            if (!bill) {
                showModal("Erro", "Conta não encontrada para edição.");
                return;
            }

            // Pega as opções de planos de contas já renderizadas na tela principal
            const planoSelectHTML = document.getElementById('bill-plano-contas').innerHTML;

            // 2. Monta o HTML do Modal (baseado no seu form-add-bill)
            modalTitle.textContent = 'Editar Conta a Pagar';
            modalBody.innerHTML = `
        <form id="form-edit-bill" novalidate class="space-y-4 mt-4">
            <div>
                <label class="block text-sm font-medium">Descrição</label>
                <input type="text" id="edit-bill-desc" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${bill.descricao}">
            </div>
            <div>
                <label class="block text-sm font-medium">Valor (R$)</label>
                <input type="number" id="edit-bill-value" step="0.01" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${bill.valor}">
            </div>
            <div>
                <label class="block text-sm font-medium">Data de Vencimento</label>
                <input type="date" id="edit-bill-due-date" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${bill.vencimento}">
            </div>
            <div>
                <label class="block text-sm font-medium">Plano de Contas</label>
                <select id="edit-bill-plano-contas" class="w-full px-3 py-2 mt-1 border rounded-md">
                    ${planoSelectHTML}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium">Forma de Pagamento (Prevista)</label>
                <select id="edit-bill-payment-method-pre" class="w-full px-3 py-2 mt-1 border rounded-md">
                    <option value="Não definido">Não definido</option>
                    <option>Pix</option>
                    <option>Cartão de Crédito</option>
                    <option>Boleto</option>
                    <option>Dinheiro</option>
                    <option>Débito em Conta</option>
                </select>
            </div>
            <div class="mt-6 text-right space-x-2">
                <button type="button" id="btn-cancel-edit-bill" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" id="btn-save-edit-bill" class="px-6 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Salvar Alterações</button>
            </div>
        </form>
    `;

            // 3. Pré-seleciona o método de pagamento
            document.getElementById('edit-bill-payment-method-pre').value = bill.paymentMethod || 'Não definido';
            document.getElementById('edit-bill-plano-contas').value = bill.planoContas || 'Despesas Gerais';

            // 4. Mostra o Modal
            modalContainer.style.display = 'flex';

            // 5. Adiciona Listeners aos botões do modal
            document.getElementById('btn-cancel-edit-bill').onclick = hideModal;

            const formEditBill = document.getElementById('form-edit-bill');
            formEditBill.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-save-edit-bill');
                saveBtn.disabled = true;
                saveBtn.innerHTML = "Salvando...";

                try {
                    // Coleta dados
                    const updatedDesc = document.getElementById('edit-bill-desc').value;
                    const updatedValue = parseFloat(document.getElementById('edit-bill-value').value);
                    const updatedDueDate = document.getElementById('edit-bill-due-date').value;
                    const updatedPlanoContas = document.getElementById('edit-bill-plano-contas').value;
                    const updatedPaymentMethod = document.getElementById('edit-bill-payment-method-pre').value;

                    // Valida
                    if (!updatedDesc || isNaN(updatedValue) || updatedValue <= 0 || !updatedDueDate) {
                        throw new Error("Descrição, Valor e Data de Vencimento são obrigatórios.");
                    }

                    // Prepara atualização
                    const updatedBillData = {
                        descricao: updatedDesc,
                        valor: updatedValue,
                        vencimento: updatedDueDate,
                        planoContas: updatedPlanoContas,
                        paymentMethod: updatedPaymentMethod
                        // Não mexe em 'pago', 'tipo', 'data' (registro), etc.
                    };

                    // Atualiza no Firestore
                    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                    const billRef = doc(db, collectionPath, billId);
                    await updateDoc(billRef, updatedBillData);

                    hideModal();
                    showModal("Sucesso!", "Conta atualizada com sucesso.");
                    // O onSnapshot vai cuidar de redesenhar a tabela

                } catch (error) {
                    console.error("Erro ao atualizar conta:", error);
                    showModal("Erro", "Não foi possível atualizar a conta: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = "Salvar Alterações";
                }
            };
        }
       
        /**
         * Mostra o modal de EDIÇÃO de um Lançamento Financeiro (Extrato).
         */
        function showEditFinanceEntryModal(entryId) {
            if (!userId) return;
            
            const entry = allFinancialEntries.find(e => e.id === entryId);
            if (!entry) {
                showModal("Erro", "Lançamento não encontrado.");
                return;
            }

            // Prepara a data para o input date (YYYY-MM-DD)
            let dateStr = '';
            if (entry.data && entry.data.toDate) {
                dateStr = formatDateToYYYYMMDD(entry.data.toDate());
            }
            
            const existingSplits = entry.paymentSplits && entry.paymentSplits.length > 0 
                ? entry.paymentSplits 
                : [{ method: entry.paymentMethod || 'Dinheiro', value: entry.valor }];

            modalTitle.textContent = 'Editar Lançamento Financeiro';
            modalBody.innerHTML = `
                <form id="form-edit-finance-entry" class="space-y-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium">Descrição</label>
                        <input type="text" id="edit-entry-desc" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${entry.descricao}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium">Valor Total (R$)</label>
                            <input type="number" id="edit-entry-value" step="0.01" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${entry.valor}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium">Data</label>
                            <input type="date" id="edit-entry-date" required class="w-full px-3 py-2 mt-1 border rounded-md" value="${dateStr}">
                        </div>
                    </div>
                    
                    <div class="mt-4 border-t pt-4">
                        <label class="block text-sm font-medium mb-2">Formas de Pagamento (Define qual Caixa)</label>
                        <div id="edit-payment-splits-container" class="space-y-2">
                            <!-- JS vai popular -->
                        </div>
                        <button type="button" id="btn-add-edit-payment-split" class="mt-2 text-sm text-indigo-600 hover:underline font-medium flex items-center">
                            <i data-lucide="plus" class="w-4 h-4 mr-1"></i> Adicionar outra forma
                        </button>
                        <p id="edit-split-error" class="text-xs text-red-600 mt-1 hidden"></p>
                    </div>

                    <div class="mt-6 text-right space-x-2 border-t pt-4">
                        <button type="button" id="btn-cancel-edit-entry" class="px-6 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                        <button type="submit" id="btn-save-edit-entry" class="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Salvar Alterações</button>
                    </div>
                </form>
            `;

            modalContainer.style.display = 'flex';
            
            const container = document.getElementById('edit-payment-splits-container');
            const btnAddSplit = document.getElementById('btn-add-edit-payment-split');
            const totalInput = document.getElementById('edit-entry-value');
            const errorP = document.getElementById('edit-split-error');

            function addSplitRow(method, value) {
                const row = document.createElement('div');
                row.className = 'flex items-center space-x-2 split-row';
                row.innerHTML = `
                    <select class="split-method flex-1 px-3 py-2 border rounded-md">
                        <option value="Dinheiro" ${method === 'Dinheiro' ? 'selected' : ''}>Dinheiro (Caixa Físico)</option>
                        <option value="Pix" ${method === 'Pix' ? 'selected' : ''}>Pix (Conta Bancária)</option>
                        <option value="Transferência Bancária" ${method === 'Transferência Bancária' ? 'selected' : ''}>Transferência Bancária (Conta Bancária)</option>
                        <option value="Cartão de Crédito" ${method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito (Conta Bancária)</option>
                        <option value="Cartão de Débito" ${method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito (Conta Bancária)</option>
                        <option value="Boleto" ${method === 'Boleto' ? 'selected' : ''}>Boleto (Conta Bancária)</option>
                    </select>
                    <input type="number" step="0.01" class="split-value w-32 px-3 py-2 border rounded-md" value="${value.toFixed(2)}">
                    <button type="button" class="btn-remove-split text-red-500 hover:text-red-700 px-2">
                        <i data-lucide="x" class="w-5 h-5 pointer-events-none"></i>
                    </button>
                `;
                container.appendChild(row);
                lucide.createIcons();
                row.querySelector('.btn-remove-split').onclick = () => row.remove();
            }

            existingSplits.forEach(split => addSplitRow(split.method, split.value));
            btnAddSplit.onclick = () => addSplitRow('Pix', 0);

            setupTwoSplitsLogic(
                container,
                '.split-row',
                '.split-value',
                () => parseFloat(totalInput.value) || 0
            );

            totalInput.addEventListener('input', () => {
                const splitRows = container.querySelectorAll('.split-row');
                if (splitRows.length === 1) {
                    const valInput = splitRows[0].querySelector('.split-value');
                    if (valInput) valInput.value = parseFloat(totalInput.value || 0).toFixed(2);
                }
            });

            document.getElementById('btn-cancel-edit-entry').onclick = hideModal;

            document.getElementById('form-edit-finance-entry').onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-save-edit-entry');
                saveBtn.disabled = true;
                saveBtn.innerHTML = "Salvando...";
                errorP.classList.add('hidden');

                try {
                    const desc = document.getElementById('edit-entry-desc').value.trim();
                    const val = parseFloat(totalInput.value);
                    const dateVal = document.getElementById('edit-entry-date').value;

                    if (!desc || isNaN(val) || val <= 0 || !dateVal) {
                        throw new Error("Preencha todos os campos corretamente.");
                    }
                    
                    const splitRows = container.querySelectorAll('.split-row');
                    const paymentSplits = [];
                    let splitsTotal = 0;

                    splitRows.forEach(row => {
                        const method = row.querySelector('.split-method').value;
                        const splitVal = parseFloat(row.querySelector('.split-value').value) || 0;
                        if (splitVal > 0) {
                            paymentSplits.push({ method, value: splitVal });
                            splitsTotal += splitVal;
                        }
                    });

                    if (paymentSplits.length === 0) {
                        errorP.textContent = "Adicione pelo menos uma forma de pagamento com valor maior que zero.";
                        errorP.classList.remove('hidden');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Salvar Alterações';
                        return;
                    }

                    if (Math.abs(splitsTotal - val) > 0.01) {
                        errorP.textContent = `A soma das formas de pagamento (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao Valor Total (R$ ${val.toFixed(2)}).`;
                        errorP.classList.remove('hidden');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = 'Salvar Alterações';
                        return;
                    }

                    let mainPaymentMethod = paymentSplits.length === 1 ? paymentSplits[0].method : 'Múltiplas Formas';

                    const dateObj = new Date(dateVal + 'T00:00:00');
                    const timestamp = Timestamp.fromDate(dateObj);

                    const collectionPath = `artifacts/${appId}/users/${userId}/lancamentos`;
                    const entryRef = doc(db, collectionPath, entryId);

                    await updateDoc(entryRef, {
                        descricao: desc,
                        valor: val,
                        data: timestamp,
                        paymentMethod: mainPaymentMethod,
                        paymentSplits: paymentSplits
                    });

                    hideModal();
                    showModal("Sucesso!", "Lançamento atualizado com sucesso.");
                } catch (error) {
                    console.error("Erro ao editar lançamento:", error);
                    showModal("Erro", "Falha ao editar: " + error.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = "Salvar Alterações";
                }
            };
        }

       /**
 * PASSO 1 DO RELATÓRIO: Calcula todos os dados para o balanço geral
 * Usa as variáveis globais (caches) para evitar releituras do DB.
 */
async function aggregateTotalReportData() {
    const reportData = {
        products: { totalStock: 0, totalCost: 0, totalSale: 0 },
        people: { total: 0, fornecedor: 0, cliente: 0, revendedor: 0, outros: 0 },
        salesByMonth: {}, // Ex: {'2025-10': { direta: { qty: 0, val: 0 }, ... }}
        activeConsign: { qty: 0, val: 0 },
        billsToPay: { qty: 0, val: 0 },
        billsPaid: { qty: 0, val: 0 },
        financialsByMonth: {}, // Ex: {'2025-10': { in: 0, out: 0 }}
        financialTotals: { in: 0, out: 0, balance: 0, physicalIn: 0, physicalOut: 0, bankIn: 0, bankOut: 0, physicalBalance: 0, bankBalance: 0 }
    };

    // 1. Processar Produtos
    allUserProducts.forEach(prod => {
        const stock = prod.estoque || 0;
        reportData.products.totalStock += stock;
        reportData.products.totalCost += (prod.custo || 0) * stock;
        reportData.products.totalSale += (prod.venda || 0) * stock;
    });

    // 2. Processar Pessoas
    allUserPeople.forEach(person => {
        reportData.people.total++;
        const tipo = person.tipo || 'outros';
        if (reportData.people.hasOwnProperty(tipo)) {
            reportData.people[tipo]++;
        }
    });

    // 3. Processar Vendas (Ativas e Finalizadas)
    allSales.forEach(sale => {
        if (sale.status === 'Ativa' && sale.type === 'consignacao') {
            // Consignações Abertas
            reportData.activeConsign.qty++;
            reportData.activeConsign.val += sale.total || 0;
        } else if (sale.status === 'Finalizada') {
            // Vendas Concluídas (para estatística mensal)
            const date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // "2025-11"
            
            if (!reportData.salesByMonth[key]) {
                reportData.salesByMonth[key] = {
                    direta: { qty: 0, val: 0 },
                    consignacao: { qty: 0, val: 0 }
                };
            }
            
            const type = sale.type; // 'direta' ou 'consignacao'
            const value = (type === 'consignacao') ? (sale.settlement?.totalSold || 0) : (sale.total || 0);
            
            if (reportData.salesByMonth[key][type]) {
                reportData.salesByMonth[key][type].qty++;
                reportData.salesByMonth[key][type].val += value;
            }
        }
    });

    // 4. Processar Financeiro (Contas e Resumo Mensal)
    allFinancialEntries.forEach(entry => {
        const date = entry.data?.toDate ? entry.data.toDate() : new Date();
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // "2025-11"

        if (!reportData.financialsByMonth[key]) {
            reportData.financialsByMonth[key] = { in: 0, out: 0 };
        }
        
        if (entry.tipo === 'Entrada') {
            reportData.financialsByMonth[key].in += entry.valor;
            reportData.financialTotals.in += entry.valor;
            const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod, value: entry.valor }];
            splits.forEach(s => { if (s.method === 'Dinheiro') reportData.financialTotals.physicalIn += s.value; else reportData.financialTotals.bankIn += s.value; });
        } else if (entry.tipo === 'Saída') {
            if (entry.pago === true) {
                // Conta Paga
                reportData.billsPaid.qty++;
                reportData.billsPaid.val += entry.valor;
                // Contabiliza no resumo mensal
                reportData.financialsByMonth[key].out += entry.valor;
                reportData.financialTotals.out += entry.valor;
                const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod, value: entry.valor }];
                splits.forEach(s => { if (s.method === 'Dinheiro') reportData.financialTotals.physicalOut += s.value; else reportData.financialTotals.bankOut += s.value; });
            } else {
                // Conta a Pagar
                reportData.billsToPay.qty++;
                reportData.billsToPay.val += entry.valor;
            }
        }
    });
    
    reportData.financialTotals.balance = reportData.financialTotals.in - reportData.financialTotals.out;
    reportData.financialTotals.physicalBalance = reportData.financialTotals.physicalIn - reportData.financialTotals.physicalOut;
    reportData.financialTotals.bankBalance = reportData.financialTotals.bankIn - reportData.financialTotals.bankOut;
    
    return reportData;
}

/**
 * PASSO 2 DO RELATÓRIO: Desenha o PDF com os dados calculados
 */
async function drawTotalReportPDF(reportData, options) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const formatCurrency = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;
    const leftMargin = 15;
    const rightMargin = 195;
    let currentY = 20;

    // --- TÍTULO ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Balanço Geral do Sistema', 105, currentY, { align: 'center' });
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, currentY, { align: 'center' });
    currentY += 15;

    // --- SEÇÃO DE PRODUTOS/ESTOQUE (Obrigatório) ---
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Resumo de Estoque', leftMargin, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Quantidade total de produtos em estoque: ${reportData.products.totalStock} un.`, leftMargin, currentY);
    currentY += 5;
    doc.text(`Valor total de CUSTO do estoque: ${formatCurrency(reportData.products.totalCost)}`, leftMargin, currentY);
    currentY += 5;
    doc.text(`Valor total de VENDA do estoque: ${formatCurrency(reportData.products.totalSale)}`, leftMargin, currentY);
    currentY += 10;

    // --- SEÇÃO DE PESSOAS (Obrigatório) ---
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Resumo de Pessoas', leftMargin, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total de pessoas cadastradas: ${reportData.people.total}`, leftMargin, currentY);
    currentY += 5;
    doc.text(`- Fornecedores: ${reportData.people.fornecedor}`, leftMargin + 5, currentY);
    currentY += 5;
    doc.text(`- Revendedores: ${reportData.people.revendedor}`, leftMargin + 5, currentY);
    currentY += 5;
    doc.text(`- Clientes Diretos: ${reportData.people.cliente}`, leftMargin + 5, currentY);
    currentY += 10;

    // --- SEÇÃO DE VENDAS E FINANCEIRO (Obrigatório) ---
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Resumo de Vendas e Financeiro', leftMargin, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    // Consignações Ativas
    doc.text(`Consignações Ativas: ${reportData.activeConsign.qty} (Total: ${formatCurrency(reportData.activeConsign.val)})`, leftMargin, currentY);
    currentY += 5;
    // Contas a Pagar
    doc.text(`Contas a Pagar: ${reportData.billsToPay.qty} (Total: ${formatCurrency(reportData.billsToPay.val)})`, leftMargin, currentY);
    currentY += 5;
    // Contas Pagas
    doc.text(`Contas Pagas (Este Mês): ${reportData.billsPaid.qty} (Total: ${formatCurrency(reportData.billsPaid.val)})`, leftMargin, currentY);
    currentY += 10;
    
    // Resumo Financeiro Total
    doc.setFont(undefined, 'bold');
    doc.text('Financeiro Geral (Todas as Datas):', leftMargin, currentY);
    currentY += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Entradas Totais: ${formatCurrency(reportData.financialTotals.in)}`, leftMargin + 5, currentY);
    currentY += 5;
    doc.text(`Saídas Totais (Pagas): ${formatCurrency(reportData.financialTotals.out)}`, leftMargin + 5, currentY);
    currentY += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`Saldo Geral: ${formatCurrency(reportData.financialTotals.balance)}`, leftMargin + 5, currentY);
    currentY += 7;

    doc.setFontSize(11);
    doc.text(`Divisão de Caixas:`, leftMargin + 5, currentY);
    currentY += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`- Caixa Físico (Dinheiro): ${formatCurrency(reportData.financialTotals.physicalBalance)}`, leftMargin + 10, currentY);
    currentY += 5;
    doc.text(`- Conta Bancária (Pix, Cartão, etc): ${formatCurrency(reportData.financialTotals.bankBalance)}`, leftMargin + 10, currentY);
    currentY += 10;
    doc.setFontSize(10); // Volta pro tamanho de fonte normal

    // Função helper para pular página se necessário
    const checkPageBreak = (y) => {
        if (y > 270) { // Perto do fim da página A4 (297mm)
            doc.addPage();
            return 20; // Y inicial da nova página
        }
        return y;
    };
    
    currentY = checkPageBreak(currentY);

    // --- Resumo Mensal de Vendas (Tabela) ---
    const salesMonths = Object.keys(reportData.salesByMonth).sort();
    if (salesMonths.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Vendas Concluídas por Mês', leftMargin, currentY);
        currentY += 7;
        
        const head = [['Mês', 'Vendas Diretas (Qtd)', 'Vendas Diretas (R$)', 'Consignações (Qtd)', 'Consignações (R$)']];
        const body = salesMonths.map(key => {
            const monthData = reportData.salesByMonth[key];
            return [
                key,
                monthData.direta.qty,
                formatCurrency(monthData.direta.val),
                monthData.consignacao.qty,
                formatCurrency(monthData.consignacao.val)
            ];
        });
        
        doc.autoTable({
            startY: currentY,
            head: head,
            body: body,
            headStyles: { fillColor: [79, 70, 229] } // Indigo
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }
    
    currentY = checkPageBreak(currentY);

    // --- Resumo Mensal Financeiro (Tabela) ---
    const financialMonths = Object.keys(reportData.financialsByMonth).sort();
    if (financialMonths.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Fluxo de Caixa por Mês (Lançamentos Pagos)', leftMargin, currentY);
        currentY += 7;
        
        const head = [['Mês', 'Total Entradas (R$)', 'Total Saídas (R$)']];
        const body = financialMonths.map(key => {
            const monthData = reportData.financialsByMonth[key];
            return [
                key,
                formatCurrency(monthData.in),
                formatCurrency(monthData.out)
            ];
        });
        
        doc.autoTable({
            startY: currentY,
            head: head,
            body: body,
            headStyles: { fillColor: [22, 160, 133] } // Verde
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- SEÇÕES OPCIONAIS ---
    
    // Lista de Produtos (Opcional)
    if (options.includeProducts) {
        currentY = checkPageBreak(currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Detalhes do Estoque', leftMargin, currentY);
        currentY += 7;
        
        const head = [['Ref.', 'Nome', 'Estoque (un)', 'Custo (R$)', 'Venda (R$)']];
        const body = allUserProducts.map(prod => [
            prod.ref,
            prod.nome,
            prod.estoque,
            formatCurrency(prod.custo),
            formatCurrency(prod.venda)
        ]);
        
        doc.autoTable({ startY: currentY, head: head, body: body, theme: 'striped' });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // Lista de Pessoas (Opcional)
    if (options.includePeople) {
        currentY = checkPageBreak(currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Lista de Pessoas Cadastradas', leftMargin, currentY);
        currentY += 7;
        
        const head = [['Nome', 'Tipo', 'Telefone', 'Email']];
        const body = allUserPeople.map(p => [
            p.nome,
            p.tipo,
            p.telefone,
            p.email
        ]);
        
        doc.autoTable({ startY: currentY, head: head, body: body, theme: 'striped' });
        currentY = doc.lastAutoTable.finalY + 10;
    }
    
    // Lista de Contas (Opcional)
    if (options.includeBills) {
        currentY = checkPageBreak(currentY);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Detalhes das Contas a Pagar', leftMargin, currentY);
        currentY += 7;
        
        const head = [['Vencimento', 'Descrição', 'Valor (R$)']];
        const body = allFinancialEntries
            .filter(e => e.tipo === 'Saída' && !e.pago)
            .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)) // Ordena por data
            .map(bill => [
                bill.vencimento ? new Date(bill.vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/D',
                bill.descricao,
                formatCurrency(bill.valor)
            ]);
        
        doc.autoTable({ startY: currentY, head: head, body: body, theme: 'grid' });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- Fim do Documento ---
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
}

        // --- DETALHES DA RECEITA (CARD CLICÁVEL) ---
        const cardSummaryRevenue = document.getElementById('card-summary-revenue');
        if (cardSummaryRevenue) {
            cardSummaryRevenue.addEventListener('click', showMonthlyRevenueDetails);
        }
        
        const cardSummaryExpenses = document.getElementById('card-summary-expenses');
        if (cardSummaryExpenses) {
            cardSummaryExpenses.addEventListener('click', showMonthlyExpensesDetails);
        }
        
        const cardSummaryBalance = document.getElementById('card-summary-balance');
        if (cardSummaryBalance) {
            cardSummaryBalance.addEventListener('click', () => {
                document.querySelector('.financeiro-tab-btn[data-tab="tab-financeiro-history"]')?.click();
            });
        }
        
        const cardSummaryCaixaFisico = document.getElementById('card-summary-caixa-fisico');
        if (cardSummaryCaixaFisico) {
            cardSummaryCaixaFisico.addEventListener('click', () => showCashDetails('fisico'));
        }

        const cardSummaryCaixaBanco = document.getElementById('card-summary-caixa-banco');
        if (cardSummaryCaixaBanco) {
            cardSummaryCaixaBanco.addEventListener('click', () => showCashDetails('banco'));
        }
        
        // Atalhos Clicáveis dos Novos Cards de Projeção
        const cardSummaryPendingBills = document.getElementById('card-summary-pending-bills');
        if (cardSummaryPendingBills) {
            cardSummaryPendingBills.addEventListener('click', () => {
                document.querySelector('.financeiro-tab-btn[data-tab="tab-financeiro-bills"]')?.click();
            });
        }
        
        const cardSummaryLateBills = document.getElementById('card-summary-late-bills');
        if (cardSummaryLateBills) {
            cardSummaryLateBills.addEventListener('click', () => {
                document.querySelector('.financeiro-tab-btn[data-tab="tab-financeiro-bills"]')?.click();
                currentBillMetricFilter = 'late'; // Ativa automaticamente o filtro e foca nas atrasadas
                updateBillMetricCardsUI();
                if (allFinancialEntries) renderBillsTab(allFinancialEntries);
            });
        }
        
        const cardSummaryExpectedConsign = document.getElementById('card-summary-expected-consign');
        if (cardSummaryExpectedConsign) {
            cardSummaryExpectedConsign.addEventListener('click', () => {
                showPage('page-vendas');
                setTimeout(() => { document.querySelector('.vendas-tab-btn[data-tab="tab-vendas-consign"]')?.click(); }, 50);
            });
        }

        function showMonthlyRevenueDetails() {
            if (!userId) return;

            const filterStart = document.getElementById('summary-filter-start')?.value;
            const filterEnd = document.getElementById('summary-filter-end')?.value;
            let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
            let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

            // Filtrar lançamentos
            const monthlyRevenueEntries = allFinancialEntries.filter(entry => {
                if (entry.data && entry.data.toDate) {
                    const entryDate = entry.data.toDate();
                    let includeEntry = true;
                    if (startObj && entryDate < startObj) includeEntry = false;
                    if (endObj && entryDate > endObj) includeEntry = false;

                    if (includeEntry) {
                        return entry.tipo === 'Entrada';
                    }
                }
                return false;
            });

            // Ordenar por data (mais recentes primeiro)
            monthlyRevenueEntries.sort((a, b) => b.data.toDate() - a.data.toDate());

            // Construir o HTML da tabela
            let tableHTML = `
                <div class="overflow-x-auto border rounded-lg mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Descrição</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;

            if (monthlyRevenueEntries.length === 0) {
                tableHTML += '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Nenhuma receita registrada neste período.</td></tr>';
            } else {
                let total = 0;
                monthlyRevenueEntries.forEach(entry => {
                    const entryDate = entry.data.toDate().toLocaleDateString('pt-BR');
                    total += entry.valor;
                    tableHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${entryDate}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">${entry.descricao}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm"><span class="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">${entry.tipo}</span></td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 text-right">+ R$ ${entry.valor.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                        <tr class="bg-gray-50 font-bold border-t-2">
                            <td colspan="3" class="px-4 py-3 text-right text-gray-900 uppercase text-xs tracking-wider">Total:</td>
                            <td class="px-4 py-3 text-right text-green-600">R$ ${total.toFixed(2).replace('.', ',')}</td>
                        </tr>
                `;
            }

            tableHTML += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 text-right">
                    <button type="button" id="btn-close-revenue-details" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>
                </div>
            `;

            let periodText = 'Todo o Período';
            if (filterStart && filterEnd) {
                const s = filterStart.split('-').reverse().join('/');
                const e = filterEnd.split('-').reverse().join('/');
                periodText = `${s} a ${e}`;
            } else if (filterStart) {
                periodText = `A partir de ${filterStart.split('-').reverse().join('/')}`;
            } else if (filterEnd) {
                periodText = `Até ${filterEnd.split('-').reverse().join('/')}`;
            }
            modalTitle.textContent = `Detalhes da Receita (${periodText})`;
            modalBody.innerHTML = tableHTML;
            modalContainer.style.display = 'flex';

            document.getElementById('btn-close-revenue-details').onclick = hideModal;
        }

        function showMonthlyExpensesDetails() {
            if (!userId) return;

            const filterStart = document.getElementById('summary-filter-start')?.value;
            const filterEnd = document.getElementById('summary-filter-end')?.value;
            let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
            let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

            // Filtrar lançamentos (Apenas Saídas Pagas)
            const monthlyExpensesEntries = allFinancialEntries.filter(entry => {
                if (entry.data && entry.data.toDate) {
                    const entryDate = entry.data.toDate();
                    let includeEntry = true;
                    if (startObj && entryDate < startObj) includeEntry = false;
                    if (endObj && entryDate > endObj) includeEntry = false;

                    if (includeEntry) {
                        // Pega apenas as Saídas que já foram marcadas como "Pagas"
                        return entry.tipo === 'Saída' && entry.pago === true;
                    }
                }
                return false;
            });

            // Ordenar por data (mais recentes primeiro)
            monthlyExpensesEntries.sort((a, b) => b.data.toDate() - a.data.toDate());

            // Construir o HTML da tabela
            let tableHTML = `
                <div class="overflow-x-auto border rounded-lg mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Descrição</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;

            if (monthlyExpensesEntries.length === 0) {
                tableHTML += '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Nenhuma despesa registrada neste período.</td></tr>';
            } else {
                let total = 0;
                monthlyExpensesEntries.forEach(entry => {
                    const entryDate = entry.data.toDate().toLocaleDateString('pt-BR');
                    total += entry.valor;
                    tableHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${entryDate}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">${entry.descricao}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm"><span class="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">${entry.tipo}</span></td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 text-right">- R$ ${entry.valor.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                        <tr class="bg-gray-50 font-bold border-t-2">
                            <td colspan="3" class="px-4 py-3 text-right text-gray-900 uppercase text-xs tracking-wider">Total:</td>
                            <td class="px-4 py-3 text-right text-red-600">- R$ ${total.toFixed(2).replace('.', ',')}</td>
                        </tr>
                `;
            }

            tableHTML += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 text-right">
                    <button type="button" id="btn-close-expenses-details" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>
                </div>
            `;

            let periodText = 'Todo o Período';
            if (filterStart && filterEnd) {
                const s = filterStart.split('-').reverse().join('/');
                const e = filterEnd.split('-').reverse().join('/');
                periodText = `${s} a ${e}`;
            } else if (filterStart) {
                periodText = `A partir de ${filterStart.split('-').reverse().join('/')}`;
            } else if (filterEnd) {
                periodText = `Até ${filterEnd.split('-').reverse().join('/')}`;
            }
            modalTitle.textContent = `Detalhes das Despesas (${periodText})`;
            modalBody.innerHTML = tableHTML;
            modalContainer.style.display = 'flex';

            document.getElementById('btn-close-expenses-details').onclick = hideModal;
        }

        function showPendingBillsDetails() {
            if (!userId) return;

            const filterStart = document.getElementById('summary-filter-start')?.value;
            const filterEnd = document.getElementById('summary-filter-end')?.value;
            let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
            let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

            // Filtrar lançamentos (Apenas Saídas NÃO Pagas baseadas na data de vencimento)
            const pendingBillsEntries = allFinancialEntries.filter(entry => {
                if (entry.vencimento) {
                    const entryDate = new Date(entry.vencimento + 'T00:00:00');
                    let includeEntry = true;
                    if (startObj && entryDate < startObj) includeEntry = false;
                    if (endObj && entryDate > endObj) includeEntry = false;

                    if (includeEntry) {
                        return entry.tipo === 'Saída' && entry.pago === false;
                    }
                }
                return false;
            });

            // Ordenar por data de vencimento (mais próximos primeiro)
            pendingBillsEntries.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

            // Construir o HTML da tabela
            let tableHTML = `
                <div class="overflow-x-auto border rounded-lg mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Vencimento</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Descrição</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;

            if (pendingBillsEntries.length === 0) {
                tableHTML += '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Nenhuma conta a pagar para este período.</td></tr>';
            } else {
                let total = 0;
                pendingBillsEntries.forEach(entry => {
                    const dueDate = new Date(entry.vencimento + 'T00:00:00');
                    const entryDateString = dueDate.toLocaleDateString('pt-BR');
                    
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const diffTime = dueDate.getTime() - todayStart.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let statusBadge = '';
                    if (diffDays < 0) {
                        statusBadge = '<span class="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Atrasada</span>';
                    } else if (diffDays <= 10) {
                        statusBadge = '<span class="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Próxima</span>';
                    } else {
                        statusBadge = '<span class="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">No Prazo</span>';
                    }

                    total += entry.valor;
                    tableHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${entryDateString}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">${entry.descricao}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm">${statusBadge}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 text-right">R$ ${entry.valor.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                        <tr class="bg-gray-50 font-bold border-t-2">
                            <td colspan="3" class="px-4 py-3 text-right text-gray-900 uppercase text-xs tracking-wider">Total a Pagar:</td>
                            <td class="px-4 py-3 text-right text-red-600">R$ ${total.toFixed(2).replace('.', ',')}</td>
                        </tr>
                `;
            }

            tableHTML += `
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 text-right">
                    <button type="button" id="btn-close-pending-details" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>
                </div>
            `;

            let periodText = 'Todo o Período';
            if (filterStart && filterEnd) {
                const s = filterStart.split('-').reverse().join('/');
                const e = filterEnd.split('-').reverse().join('/');
                periodText = `${s} a ${e}`;
            } else if (filterStart) {
                periodText = `A partir de ${filterStart.split('-').reverse().join('/')}`;
            } else if (filterEnd) {
                periodText = `Até ${filterEnd.split('-').reverse().join('/')}`;
            }
            modalTitle.textContent = `Contas a Pagar (${periodText})`;
            modalBody.innerHTML = tableHTML;
            modalContainer.style.display = 'flex';

            document.getElementById('btn-close-pending-details').onclick = hideModal;
        }

        function showCashDetails(type) {
            if (!userId) return;

            const filterStart = document.getElementById('summary-filter-start')?.value;
            const filterEnd = document.getElementById('summary-filter-end')?.value;
            let startObj = filterStart ? new Date(filterStart + 'T00:00:00') : null;
            let endObj = filterEnd ? new Date(filterEnd + 'T23:59:59') : null;

            // Filtrar lançamentos (Entradas, e Saídas Pagas)
            const cashEntries = allFinancialEntries.filter(entry => {
                if (entry.data && entry.data.toDate) {
                    const entryDate = entry.data.toDate();
                    let includeEntry = true;
                    if (startObj && entryDate < startObj) includeEntry = false;
                    if (endObj && entryDate > endObj) includeEntry = false;

                    if (includeEntry) {
                        const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod, value: entry.valor }];
                        const hasDinheiro = splits.some(s => s.method === 'Dinheiro');
                        const hasBanco = splits.some(s => s.method !== 'Dinheiro');
                        if (type === 'fisico' && !hasDinheiro) return false;
                        if (type === 'banco' && !hasBanco) return false;

                        if (entry.tipo === 'Entrada') return true;
                        if (entry.tipo === 'Saída' && entry.pago === true) return true;
                    }
                }
                return false;
            });

            // Ordenar por data (mais recentes primeiro)
            cashEntries.sort((a, b) => b.data.toDate() - a.data.toDate());

            let tableHTML = `
                <div class="overflow-x-auto border rounded-lg mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Descrição</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;

            if (cashEntries.length === 0) {
                tableHTML += '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Nenhuma movimentação registrada neste caixa para o período.</td></tr>';
            } else {
                cashEntries.forEach(entry => {
                    const entryDate = entry.data.toDate().toLocaleDateString('pt-BR');
                    const isEntrada = entry.tipo === 'Entrada';
                    const valClass = isEntrada ? 'text-green-600' : 'text-red-600';
                    const valPrefix = isEntrada ? '+' : '-';
                    const badgeClass = isEntrada ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100';

                    const splits = (entry.paymentSplits && entry.paymentSplits.length > 0) ? entry.paymentSplits : [{ method: entry.paymentMethod, value: entry.valor }];
                    const valueForType = splits.filter(s => type === 'fisico' ? s.method === 'Dinheiro' : s.method !== 'Dinheiro').reduce((sum, s) => sum + s.value, 0);
                    if (valueForType <= 0) return;
                    
                    let paymentMethodLabel = entry.paymentMethod || '';
                    if (splits.length > 1) {
                        paymentMethodLabel = '<br><span class="text-xs text-gray-500">(Parte de um valor dividido)</span>';
                    } else {
                        paymentMethodLabel = '';
                    }

                    tableHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${entryDate}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">${entry.descricao}${paymentMethodLabel}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm"><span class="px-2 py-1 text-xs font-medium ${badgeClass} rounded-full">${entry.tipo}</span></td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium ${valClass} text-right">${valPrefix} R$ ${valueForType.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `;
                });
            }

            tableHTML += `</tbody></table></div>
                <div class="mt-6 text-right">
                    <button type="button" id="btn-close-cash-details" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>
                </div>`;

            const titlePrefix = type === 'fisico' ? 'Caixa Físico' : 'Conta Bancária';
            modalTitle.textContent = `Extrato - ${titlePrefix}`;
            modalBody.innerHTML = tableHTML;
            modalContainer.style.display = 'flex';
            document.getElementById('btn-close-cash-details').onclick = hideModal;
        }

        // --- INICIALIZAÇÃO FINAL ---

        // Renderiza ícones
        lucide.createIcons();

        console.log("Sistema Brígida pronto.");

        // Garante que a data padrão seja definida ao carregar/mostrar a página de vendas
        const initialDueDateInput = document.getElementById('sale-due-date');
        if (initialDueDateInput && !initialDueDateInput.value) { // Define apenas se estiver vazio
            initialDueDateInput.value = getFutureDateString(30);
        }
        
        // Inicializa as datas da Visão Geral para o mês atual
        const sumStart = document.getElementById('summary-filter-start');
        const sumEnd = document.getElementById('summary-filter-end');
        if (sumStart && sumEnd && !sumStart.value && !sumEnd.value) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            sumStart.value = formatDateToYYYYMMDD(firstDay);
            sumEnd.value = formatDateToYYYYMMDD(lastDay);
        }