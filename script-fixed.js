// Configuração do Supabase
const SUPABASE_URL = 'https://gqcmjiikptcjtojtsvjg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxY21qaWlrcHRjanRvanRzdmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODM0MzQsImV4cCI6MjA4NTE1OTQzNH0.k0Ox-LVACHWglB-EPPDwnrEgg4LiNm5wJWkf9NoIeDU';

// Inicializar Supabase - SEM DECLARAÇÃO DUPLICADA
let supabaseClient;

try {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
    } else {
        console.error('Supabase library not loaded. Using fallback.');
        // Cliente mock já criado no HTML
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
    // Fallback garantido
    supabaseClient = {
        from: () => ({
            select: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
            insert: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
            upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
            delete: () => Promise.resolve({ data: null, error: new Error('Supabase not available') })
        })
    };
}

// Alias global para compatibilidade
window.supabase = supabaseClient;

// Variáveis globais
let currentUser = null;
let activities = [];
let projects = [];
let sectors = [];
let users = [];
let currentEditId = null;
let currentSectorEditId = null;
let currentUserEditId = null;
let activityModal = null;
let projectModal = null;
let sectorModal = null;
let userModal = null;

// Criar usuário admin LOCALMENTE para garantir login
function ensureAdminExists() {
    const adminUser = {
        id: 'admin',
        name: 'Administrador',
        email: 'admin@qualicode.com',
        password: btoa('admin123'), // Base64
        role: 'admin',
        sector: null,
        permissions: {
            activities: true,
            dashboard: true,
            projects: true,
            users: true,
            settings: true
        },
        active: true,
        created_at: new Date().toISOString()
    };
    
    // Verificar se admin já existe
    const adminExists = users.find(u => u.id === 'admin' || u.email === 'admin@qualicode.com');
    
    if (!adminExists) {
        users.push(adminUser);
        console.log('Admin user created locally:', adminUser);
        
        // Salvar no localStorage como backup
        localStorage.setItem('users', JSON.stringify(users));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Garantir que admin exista
    ensureAdminExists();
    
    // Carregar TUDO do Supabase
    loadAllDataFromSupabase();
    
    // Check authentication
    if (!checkAuthentication()) {
        showLoginScreen();
    } else {
        showMainApp();
    }
    
    // Initialize application
    initializeApplication();
});

// Carregar TUDO do Supabase - SEM LOCALSTORAGE
function loadAllDataFromSupabase() {
    console.log('Loading ALL data from Supabase only');
    
    if (typeof supabaseClient.from === 'function') {
        // Carregar usuários
        supabaseClient.from('users').select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erro ao carregar usuários:', error);
            } else if (data && data.length > 0) {
                users = data;
                console.log('Users loaded from Supabase:', users.length);
            }
        });
        
        // Carregar setores
        supabaseClient.from('sectors').select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erro ao carregar setores:', error);
            } else if (data && data.length > 0) {
                sectors = data;
                console.log('Sectors loaded from Supabase:', sectors.length);
            }
        });
        
        // Carregar atividades
        supabaseClient.from('activities').select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erro ao carregar atividades:', error);
            } else if (data && data.length > 0) {
                activities = data;
                console.log('Activities loaded from Supabase:', activities.length);
            }
        });
        
        // Carregar projetos
        supabaseClient.from('projects').select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erro ao carregar projetos:', error);
            } else if (data && data.length > 0) {
                projects = data;
                console.log('Projects loaded from Supabase:', projects.length);
            }
        });
    }
}
function checkAuthentication() {
    const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (session) {
        currentUser = JSON.parse(session);
        return true;
    }
    return false;
}

function showMainApp() {
    document.querySelector('.login-container').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.body.className = '';
    
    showPage('activities');
    renderProjects();
    renderSectorsTables();
    updateNavigationVisibility();
    
    if (currentUser && currentUser.permissions && currentUser.permissions.dashboard) {
        setTimeout(() => {
            initializeActivitySlider();
            populateDashboardFilters();
            refreshDashboard();
        }, 200);
    }
    
    loadUserProfile();
    
    // Renderizar usuários se tiver permissão
    if (currentUser && currentUser.permissions && currentUser.permissions.users) {
        renderUsers();
    }
    
    // Renderizar setores e popular dropdowns
    renderSectors();
    populateSectorDropdowns();
    
    // Renderizar atividades iniciais
    renderFilteredActivities(activities);
    
    // Renderizar projetos
    renderProjects();
    
    // Popular dropdown de responsáveis
    populateResponsibleDropdown();
    
    console.log('showMainApp executed');
}

function showLoginScreen() {
    document.querySelector('.login-container').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.body.className = 'login-body';
    
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
}

function login() {
    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        console.log('Login attempt:', email);
        console.log('Available users:', users.length);
        
        // Se não tiver usuários carregados, tentar carregar do Supabase
        if (users.length === 0) {
            console.log('No users loaded, trying to load from Supabase...');
            if (typeof supabaseClient.from === 'function') {
                supabaseClient.from('users').select('*').then(({ data, error }) => {
                    if (error) {
                        console.error('Erro ao carregar usuários:', error);
                        showNotification('Erro ao carregar usuários', 'error');
                        return;
                    } else if (data && data.length > 0) {
                        users = data;
                        console.log('Users loaded from Supabase:', users.length);
                        // Tentar login novamente após carregar
                        setTimeout(() => login(), 500);
                        return;
                    }
                });
            }
        }
        
        // Find user by email
        const user = users.find(u => u.email === email && u.active);
        
        if (!user) {
            console.log('User not found:', email);
            console.log('Available users:', users.map(u => ({ email: u.email, active: u.active })));
            showNotification('Email ou senha incorretos.', 'error');
            return;
        }
        
        // Verify password
        const decodedPassword = atob(user.password);
        if (decodedPassword !== password) {
            console.log('Password mismatch');
            showNotification('Email ou senha incorretos.', 'error');
            return;
        }
        
        console.log('Login successful for:', user.name);
        
        // Set current user
        currentUser = user;
        
        // Save session
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            sector: user.sector || null,
            permissions: user.permissions,
            loginTime: new Date().toISOString()
        };
        
        if (rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(sessionData));
            localStorage.setItem('rememberedEmail', email);
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            localStorage.removeItem('rememberedEmail');
        }
        
        showMainApp();
        showNotification(`Bem-vindo, ${user.name}!`);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Erro ao fazer login.', 'error');
    }
}

function initializeApplication() {
    try {
        // Initialize modals
        if (typeof bootstrap !== 'undefined') {
            activityModal = new bootstrap.Modal(document.getElementById('activityModal'));
            projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
            sectorModal = new bootstrap.Modal(document.getElementById('sectorModal'));
            userModal = new bootstrap.Modal(document.getElementById('userModal'));
            console.log('Modals initialized successfully');
        } else {
            console.error('Bootstrap not available, modals will not work');
        }
    } catch (error) {
        console.log('Bootstrap initialization error:', error.message);
    }
    
    // Setup event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    // Setup user form listener
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }
    
    // Setup sector form listener
    const sectorForm = document.getElementById('sectorForm');
    if (sectorForm) {
        sectorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSector();
        });
    }
    
    // Setup activity form listener
    const activityForm = document.getElementById('activityForm');
    if (activityForm) {
        activityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveActivity();
        });
    }
    
    // Setup project form listener
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProject();
        });
    }
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        const filterButton = document.getElementById('filterDropdown');
        const settingsButton = document.getElementById('settingsDropdown');
        const filterDropdown = document.querySelector('#filterDropdown + .dropdown-menu');
        const settingsDropdown = document.querySelector('#settingsDropdown + .dropdown-menu');
        
        // Fechar dropdown de filtros se clicar fora
        if (filterButton && filterDropdown && !filterButton.contains(e.target) && !filterDropdown.contains(e.target)) {
            filterDropdown.style.display = 'none';
        }
        
        // Fechar dropdown de configurações se clicar fora
        if (settingsButton && settingsDropdown && !settingsButton.contains(e.target) && !settingsDropdown.contains(e.target)) {
            settingsDropdown.style.display = 'none';
        }
    });
}

// Carregar usuários do Supabase (com fallback)
async function loadUsers() {
    try {
        if (typeof supabaseClient.from === 'function') {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .order('created_at', { ascending: true });
                
            if (error) {
                console.error('Erro ao carregar usuários do Supabase:', error);
                // Já temos usuários do localStorage
                return;
            }
            
            if (data && data.length > 0) {
                users = data;
                console.log('Usuários carregados do Supabase:', users.length);
                
                // Salvar no localStorage como backup
                localStorage.setItem('users', JSON.stringify(users));
            } else {
                console.log('Nenhum usuário encontrado no Supabase, usando localStorage');
            }
        }
    } catch (error) {
        console.error('Erro na conexão com Supabase:', error);
        // Já temos usuários do localStorage
    }
}

// Funções placeholder para evitar erros - IMPLEMENTADAS
function showPage(page) { 
    console.log('Showing page:', page);
    
    // Esconder todas as páginas
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.style.display = 'none');
    
    // Mostrar página solicitada
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Atualizar navegação
    updateActiveNavItem(page);
}

function updateActiveNavItem(page) {
    // Remover active de todos os itens
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Adicionar active ao item atual
    const activeItem = document.querySelector('[onclick="showPage(\'' + page + '\')"]');
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

function renderProjects() { 
    console.log('Rendering projects');
    const tbody = document.getElementById('projectsTableBody');
    if (tbody) {
        tbody.innerHTML = projects.map(project => `
            <tr>
                <td>${project.id}</td>
                <td>${project.name}</td>
                <td>${project.status}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProject('${project.id}')">Editar</button>
                </td>
            </tr>
        `).join('');
    }
}

function renderSectorsTables() {
    console.log('Rendering sectors tables for activities page');
    const container = document.getElementById('sectorsTables');
    
    if (!container) {
        console.log('sectorsTables container not found');
        return;
    }
    
    if (sectors.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-building display-4 text-muted"></i>
                <h5 class="mt-3 text-muted">Nenhum setor cadastrado</h5>
                <p class="text-muted">Clique na engrenagem e selecione "Cadastrar Setor" para começar.</p>
            </div>
        `;
        return;
    }
    
    // Renderizar setores como cards expansíveis
    container.innerHTML = sectors.map(sector => {
        const sectorActivities = activities.filter(activity => 
            activity.classification === sector.id || activity.requestingSector === sector.name
        );
        
        return `
            <div class="sector-card mb-4" id="sector_${sector.id}">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center" style="cursor: pointer;" onclick="toggleSector('${sector.id}')">
                        <div class="d-flex align-items-center">
                            <div class="sector-icon me-3">
                                <i class="bi ${sector.icon || 'bi-building'}"></i>
                            </div>
                            <div>
                                <h6 class="mb-1">${sector.name}</h6>
                                <small class="text-muted">${sectorActivities.length} atividade(s)</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-primary me-2">${sectorActivities.length}</span>
                            <i class="bi bi-chevron-down" id="sector_icon_${sector.id}"></i>
                        </div>
                    </div>
                    <div class="card-body" id="sector_body_${sector.id}" style="display: none;">
                        <div class="sector-description mb-3">
                            <p class="text-muted small mb-2">${sector.description || ''}</p>
                            <small class="text-muted">Responsável: ${sector.responsible || '-'}</small>
                            ${currentUser && currentUser.role === 'admin' ? `
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSector('${sector.id}')" title="Excluir Setor">
                                        <i class="bi bi-trash"></i> Excluir Setor
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${sectorActivities.length === 0 ? `
                            <div class="text-center py-3">
                                <i class="bi bi-inbox display-5 text-muted"></i>
                                <p class="text-muted mt-2">Nenhuma atividade neste setor</p>
                                <button class="btn btn-sm btn-primary" onclick="openActivityModalForSector('${sector.id}')">
                                    <i class="bi bi-plus-lg"></i> Adicionar Atividade
                                </button>
                            </div>
                        ` : `
                            <div class="activities-list">
                                ${sectorActivities.map(activity => `
                                    <div class="activity-item border-bottom pb-2 mb-2">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div class="flex-grow-1">
                                                <div class="d-flex align-items-center mb-1">
                                                    <span class="badge bg-${getStatusColor(activity.status)} me-2">${activity.status}</span>
                                                    <strong>${activity.description}</strong>
                                                </div>
                                                <p class="text-muted small mb-1">${activity.notes || ''}</p>
                                                <div class="d-flex align-items-center text-muted small">
                                                    <i class="bi bi-person-circle me-1"></i>
                                                    <span class="me-3">${activity.responsible}</span>
                                                    <i class="bi bi-calendar me-1"></i>
                                                    <span>${formatDate(activity.startDate)}</span>
                                                </div>
                                            </div>
                                            <div class="ms-2">
                                                <button class="btn btn-sm btn-outline-primary" onclick="editActivity('${activity.id}')" title="Editar">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                <div class="text-center mt-3">
                                    <button class="btn btn-sm btn-primary" onclick="openActivityModalForSector('${sector.id}')">
                                        <i class="bi bi-plus-lg"></i> Adicionar Atividade
                                    </button>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Sectors tables rendered successfully:', sectors.length);
}

function toggleSector(sectorId) {
    const body = document.getElementById(`sector_body_${sectorId}`);
    const icon = document.getElementById(`sector_icon_${sectorId}`);
    
    if (body) {
        if (body.style.display === 'none') {
            body.style.display = 'block';
            if (icon) icon.className = 'bi bi-chevron-up';
        } else {
            body.style.display = 'none';
            if (icon) icon.className = 'bi bi-chevron-down';
        }
    }
}

function expandAllSectors() {
    sectors.forEach(sector => {
        const body = document.getElementById(`sector_body_${sector.id}`);
        const icon = document.getElementById(`sector_icon_${sector.id}`);
        if (body) body.style.display = 'block';
        if (icon) icon.className = 'bi bi-chevron-up';
    });
    showNotification('Todos os setores expandidos');
}

function collapseAllSectors() {
    sectors.forEach(sector => {
        const body = document.getElementById(`sector_body_${sector.id}`);
        const icon = document.getElementById(`sector_icon_${sector.id}`);
        if (body) body.style.display = 'none';
        if (icon) icon.className = 'bi bi-chevron-down';
    });
    showNotification('Todos os setores recolhidos');
}

function openActivityModalForSector(sectorId) {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    
    // Abrir modal de atividade com setor pré-selecionado
    if (typeof openModal === 'function') {
        openModal();
        // Pré-selecionar o setor
        setTimeout(() => {
            const classificationSelect = document.getElementById('classification');
            if (classificationSelect) {
                classificationSelect.value = sectorId;
            }
        }, 100);
    }
}

function getStatusColor(status) {
    const colors = {
        'Pendente': 'warning',
        'Em Andamento': 'info',
        'Congelado': 'secondary',
        'Concluída': 'success',
        'Cancelada': 'danger'
    };
    return colors[status] || 'secondary';
}

function updateNavigationVisibility() { 
    console.log('Updating navigation');
    // Mostrar/esconder itens baseado em permissões
    if (currentUser && currentUser.permissions) {
        const dashboardItem = document.querySelector('[onclick="showPage(\'dashboard\')"]');
        const usersItem = document.querySelector('[onclick="showPage(\'users\')"]');
        
        if (dashboardItem) {
            dashboardItem.style.display = currentUser.permissions.dashboard ? 'block' : 'none';
        }
        if (usersItem) {
            usersItem.style.display = currentUser.permissions.users ? 'block' : 'none';
        }
    }
}

function initializeActivitySlider() { 
    console.log('Initializing activity slider');
    // Placeholder para slider de atividades
}

function populateDashboardFilters() { 
    console.log('Populating dashboard filters');
    // Placeholder para filtros do dashboard
}

function refreshDashboard() { 
    console.log('Refreshing dashboard');
    // Placeholder para refresh do dashboard
}

function loadUserProfile() { 
    console.log('Loading user profile');
    
    // Carregar perfil do localStorage
    const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
    userProfile = userProfiles[currentUser.email] || {
        name: currentUser.name,
        email: currentUser.email,
        avatar: null,
        darkMode: false
    };
    
    // Atualizar elementos do perfil na página
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    
    if (profileName) profileName.textContent = userProfile.name;
    if (profileEmail) profileEmail.textContent = userProfile.email;
    
    // Atualizar sidebar
    updateSidebarProfile();
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        // Clear session
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        
        // Clear current user
        currentUser = null;
        userProfile = null;
        
        // Show login screen
        showLoginScreen();
        
        showNotification('Sessão encerrada com sucesso!');
    }
}

function updateSidebarProfile() {
    const nameElement = document.getElementById('sidebarProfileName');
    const emailElement = document.getElementById('sidebarProfileEmail');
    const avatarElement = document.getElementById('sidebarProfileAvatar');
    
    if (nameElement) nameElement.textContent = userProfile.name || currentUser.name;
    if (emailElement) emailElement.textContent = userProfile.email || currentUser.email;
    
    if (avatarElement) {
        if (userProfile.avatar) {
            avatarElement.innerHTML = `<img src="${userProfile.avatar}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
        } else {
            avatarElement.innerHTML = `<i class="bi bi-person-circle" style="font-size: 40px; color: #6c757d;"></i>`;
        }
    }
}

// Funções para modais - IMPLEMENTADAS
function openUserModal() {
    console.log('Opening user modal');
    
    // Check if modal exists and is initialized
    if (!userModal) {
        console.log('Initializing user modal...');
        if (typeof bootstrap !== 'undefined') {
            userModal = new bootstrap.Modal(document.getElementById('userModal'));
        } else {
            console.error('Bootstrap not available for modal');
            return;
        }
    }
    
    currentUserEditId = null;
    document.getElementById('userModalTitle').textContent = 'Novo Usuário';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    
    // Set default permissions
    document.getElementById('perm_activities').checked = true;
    document.getElementById('perm_dashboard').checked = true;
    document.getElementById('perm_projects').checked = false;
    document.getElementById('perm_users').checked = false;
    document.getElementById('perm_settings').checked = false;
    document.getElementById('userActive').checked = true;
    
    // Show modal
    try {
        userModal.show();
        console.log('User modal shown successfully');
    } catch (error) {
        console.error('Error showing user modal:', error);
    }
}

// Funções para Setor - IMPLEMENTADAS
function openSectorModal() {
    console.log('Opening sector modal');
    
    // Check if modal exists and is initialized
    if (!sectorModal) {
        console.log('Initializing sector modal...');
        if (typeof bootstrap !== 'undefined') {
            sectorModal = new bootstrap.Modal(document.getElementById('sectorModal'));
        } else {
            console.error('Bootstrap not available for modal');
            return;
        }
    }
    
    currentSectorEditId = null;
    document.getElementById('sectorModalTitle').textContent = 'Novo Setor';
    document.getElementById('sectorForm').reset();
    document.getElementById('sectorId').value = '';
    
    // Show modal
    try {
        sectorModal.show();
        console.log('Sector modal shown successfully');
    } catch (error) {
        console.error('Error showing sector modal:', error);
    }
}

function saveSector() {
    console.log('Saving sector...');
    
    const form = document.getElementById('sectorForm');
    if (!form) {
        console.error('Sector form not found');
        showNotification('Formulário não encontrado', 'error');
        return;
    }
    
    console.log('Form found, validating...');
    
    // Validar campos obrigatórios
    const sectorName = document.getElementById('sectorName').value.trim();
        return;
    }
    
    const sectorId = document.getElementById('sectorId').value;
    const sectorData = {
        name: document.getElementById('sectorName').value.trim(),
        description: document.getElementById('sectorDescription').value.trim(),
        icon: document.getElementById('sectorIcon').value,
        created_at: new Date().toISOString()
    };
    
    if (!sectorId) {
        sectorData.id = generateSectorId();
        sectors.push(sectorData);
        console.log('New sector added:', sectorData);
    } else {
        const index = sectors.findIndex(s => s.id === sectorId);
        if (index !== -1) {
            sectors[index] = { ...sectors[index], ...sectorData };
            console.log('Sector updated:', sectorData);
        }
    }
    
    // Salvar DIRETAMENTE no Supabase
    if (typeof supabaseClient.from === 'function') {
        supabaseClient.from('sectors').upsert(sectorData).then(({ error }) => {
            if (error) {
                console.error('Erro ao salvar setor no Supabase:', error);
                showNotification('Erro ao salvar setor', 'error');
            } else {
                console.log('Setor salvo no Supabase com sucesso');
                showNotification('Setor salvo com sucesso!');
            }
        });
    }
    
    // Atualizar interface
    renderSectors();
    populateSectorDropdowns();
    renderSectorsTables();
    
    // Fechar modal
    if (sectorModal) {
        sectorModal.hide();
    }
    
    console.log('Sector save completed successfully');
}

function renderSectors() {
    console.log('Rendering sectors table');
    const tbody = document.getElementById('sectorsTableBody');
    const emptyState = document.getElementById('sectorsEmptyState');
    
    if (!tbody) {
        console.log('Sectors table body not found, looking for alternative containers');
        // Tentar encontrar container alternativo
        const altContainer = document.getElementById('sectorsContainer');
        if (altContainer) {
            console.log('Found sectorsContainer, rendering there');
            altContainer.innerHTML = sectors.map(sector => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <div class="sector-icon me-3">
                                    <i class="bi ${sector.icon || 'bi-building'}"></i>
                                </div>
                                <div>
                                    <h6 class="mb-1">${sector.name}</h6>
                                    <p class="text-muted small mb-0">${sector.description || ''}</p>
                                    <small class="text-muted">Responsável: ${sector.responsible || '-'}</small>
                                </div>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="editSector('${sector.id}')" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteSector('${sector.id}')" title="Excluir">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        return;
    }
    
    if (sectors.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    tbody.innerHTML = sectors.map(sector => `
        <tr>
            <td><span class="text-id">${sector.id}</span></td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="sector-icon me-2">
                        <i class="bi ${sector.icon || 'bi-building'}"></i>
                    </div>
                    <div class="fw-semibold">${sector.name}</div>
                </div>
            </td>
            <td>${sector.description || '-'}</td>
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi bi-person-circle me-2"></i>
                    ${sector.responsible || '-'}
                </div>
            </td>
            <td>${formatDate(sector.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-action btn-edit me-1" onclick="editSector('${sector.id}')" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-action btn-delete" onclick="deleteSector('${sector.id}')" title="Excluir">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    console.log('Sectors rendered successfully:', sectors.length);
}

function editSector(id) {
    console.log('Editing sector:', id);
    const sector = sectors.find(s => s.id === id);
    if (!sector) return;
    
    currentSectorEditId = id;
    document.getElementById('sectorModalTitle').textContent = 'Editar Setor';
    document.getElementById('sectorId').value = sector.id;
    document.getElementById('sectorName').value = sector.name;
    document.getElementById('sectorDescription').value = sector.description || '';
    document.getElementById('sectorIcon').value = sector.icon || 'bi-building';
    
    if (sectorModal) {
        sectorModal.show();
    }
}

function deleteSector(id) {
    if (confirm('Tem certeza que deseja excluir este setor?')) {
        // Encontrar setor antes de remover
        const sectorToDelete = sectors.find(s => s.id === id);
        const sectorName = sectorToDelete?.name || '';
        
        // Remover setor do array
        sectors = sectors.filter(s => s.id !== id);
        
        // Remover atividades associadas a este setor
        activities = activities.filter(activity => 
            activity.classification !== id && activity.requestingSector !== sectorName
        );
        
        // Excluir DIRETAMENTE do Supabase
        if (typeof supabaseClient.from === 'function') {
            supabaseClient.from('sectors').delete().eq('id', id).then(({ error }) => {
                if (error) {
                    console.error('Erro ao excluir setor do Supabase:', error);
                    showNotification('Erro ao excluir setor', 'error');
                } else {
                    console.log('Setor excluído do Supabase com sucesso');
                    showNotification('Setor excluído com sucesso!');
                }
            });
            
            // Excluir atividades associadas do Supabase
            supabaseClient.from('activities').delete().or(`classification.eq.${id},requestingSector.eq.${sectorName}`).then(({ error }) => {
                if (error) {
                    console.error('Erro ao excluir atividades do Supabase:', error);
                } else {
                    console.log('Atividades associadas excluídas do Supabase com sucesso');
                }
            });
        }
        
        // Atualizar interface
        renderSectors();
        populateSectorDropdowns();
        renderSectorsTables();
        renderFilteredActivities(activities);
        
        console.log('Sector and associated activities deleted successfully');
    }
}

function populateResponsibleDropdown() {
    const responsibleSelect = document.getElementById('responsible');
    if (!responsibleSelect) {
        console.log('Element responsible not found');
        return;
    }
    
    console.log('populateResponsibleDropdown called, users count:', users.length);
    
    // Limpar select
    responsibleSelect.innerHTML = '';
    
    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione um responsável';
    responsibleSelect.appendChild(defaultOption);
    
    // Carregar perfis de usuários
    const userProfiles = localStorage.getItem('userProfiles');
    const allProfiles = userProfiles ? JSON.parse(userProfiles) : {};
    
    // Adicionar usuários como opções
    users.forEach(user => {
        // Usar nome do perfil se disponível, caso contrário usar nome do usuário
        const profile = allProfiles[user.email];
        const displayName = profile && profile.name ? profile.name : user.name;
        
        console.log('Adding user option:', displayName);
        const option = document.createElement('option');
        option.value = displayName;
        option.textContent = displayName;
        responsibleSelect.appendChild(option);
    });
    
    console.log('populateResponsibleDropdown completed');
}

function populateSectorDropdowns() {
    console.log('Populating sector dropdowns');
    
    // Popula dropdown de classificação de atividades
    const sectorsGroup = document.getElementById('sectorsGroup');
    if (sectorsGroup) {
        sectorsGroup.innerHTML = sectors.map(sector => 
            `<option value="${sector.id}">${sector.name}</option>`
        ).join('');
    }
    
    // Popula dropdown de setor do usuário
    const userSector = document.getElementById('userSector');
    if (userSector) {
        userSector.innerHTML = '<option value="">Selecione um setor</option>' + 
            sectors.map(sector => 
                `<option value="${sector.name}">${sector.name}</option>`
            ).join('');
    }
}

function openModal() {
    console.log('Opening activity modal');
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Nova Atividade';
    populateResponsibleDropdown();
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    // Check if modal exists and is initialized
    if (!activityModal) {
        activityModal = new bootstrap.Modal(document.getElementById('activityModal'));
    }
    
    activityModal.show();
}

function editActivity(id) {
    console.log('Editing activity:', id);
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Editar Atividade';
    populateResponsibleDropdown();
    document.getElementById('activityId').value = activity.id;
    document.getElementById('description').value = activity.description;
    document.getElementById('responsible').value = activity.responsible;
    document.getElementById('requestingSector').value = activity.requestingSector || '';
    document.getElementById('startDate').value = activity.startDate;
    document.getElementById('endDate').value = activity.endDate;
    document.getElementById('status').value = activity.status;
    document.getElementById('classification').value = activity.classification || '';
    document.getElementById('notes').value = activity.notes || '';
    
    activityModal.show();
}

function saveActivity() {
    console.log('Saving activity...');
    const form = document.getElementById('activityForm');
    if (!form) {
        console.error('Activity form not found');
        showNotification('Formulário não encontrado', 'error');
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const activityId = document.getElementById('activityId').value;
    const activityData = {
        description: document.getElementById('description').value.trim(),
        responsible: document.getElementById('responsible').value,
        requestingSector: document.getElementById('requestingSector').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        status: document.getElementById('status').value,
        classification: document.getElementById('classification').value,
        notes: document.getElementById('notes').value.trim(),
        created_at: new Date().toISOString()
    };
    
    if (!activityId) {
        activityData.id = generateActivityId();
        activities.push(activityData);
        console.log('New activity added:', activityData);
    } else {
        const index = activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...activityData };
            console.log('Activity updated:', activities[index]);
        }
    }
    
    // Salvar DIRETAMENTE no Supabase
    if (typeof supabaseClient.from === 'function') {
        supabaseClient.from('activities').upsert(activityData).then(({ error }) => {
            if (error) {
                console.error('Erro ao salvar atividade no Supabase:', error);
                showNotification('Erro ao salvar atividade', 'error');
            } else {
                console.log('Atividade salva no Supabase com sucesso');
                showNotification('Atividade salva com sucesso!');
            }
        });
    }
    
    // Atualizar interface
    renderFilteredActivities(activities);
    renderSectorsTables();
    
    // Fechar modal
    if (activityModal) {
        activityModal.hide();
    }
    
    console.log('Activity save completed successfully');
}

// Profile Image Upload - Nova implementação simples
document.getElementById('profileImageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar arquivo
    if (file.size > 2 * 1024 * 1024) {
        showNotification('A imagem deve ter no máximo 2MB.', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.match('image.*')) {
        showNotification('Selecione apenas arquivos de imagem.', 'error');
        event.target.value = '';
        return;
    }
    
    // Ler arquivo
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Salvar no perfil
        userProfile.avatar = e.target.result;
        
        // Salvar no localStorage
        const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        profiles[currentUser.email] = userProfile;
        localStorage.setItem('userProfiles', JSON.stringify(profiles));
        
        // Atualizar interface
        updateSidebarProfile();
        loadUserProfile();
        
        // Atualizar avatar grande na página de perfil
        const avatarLarge = document.getElementById('profileAvatarLarge');
        if (avatarLarge) {
            avatarLarge.innerHTML = `<img src="${e.target.result}" alt="Profile" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;">`;
        }
        
        showNotification('Foto de perfil atualizada com sucesso!');
    };
    
    reader.onerror = function() {
        showNotification('Erro ao ler o arquivo.', 'error');
    };
    
    reader.readAsDataURL(file);
});

function openProjectModal() {
    console.log('Opening project modal');
    
    if (!projectModal) {
        projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
    }
    
    currentProjectEditId = null;
    document.getElementById('projectModalTitle').textContent = 'Novo Projeto';
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('projectStartDate').value = today;
    
    projectModal.show();
}

function editProject(id) {
    console.log('Editing project:', id);
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    currentProjectEditId = id;
    document.getElementById('projectModalTitle').textContent = 'Editar Projeto';
    document.getElementById('projectId').value = project.id;
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDescription').value = project.description;
    document.getElementById('projectResponsible').value = project.responsible;
    document.getElementById('projectStartDate').value = project.startDate;
    document.getElementById('projectEndDate').value = project.endDate;
    document.getElementById('projectStatus').value = project.status;
    
    projectModal.show();
}

function saveProject() {
    console.log('Saving project...');
    const form = document.getElementById('projectForm');
    if (!form) {
        console.error('Project form not found');
        showNotification('Formulário não encontrado', 'error');
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const projectId = document.getElementById('projectId').value;
    const projectData = {
        name: document.getElementById('projectName').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        responsible: document.getElementById('projectResponsible').value.trim(),
        startDate: document.getElementById('projectStartDate').value,
        endDate: document.getElementById('projectEndDate').value,
        status: document.getElementById('projectStatus').value,
        created_at: new Date().toISOString()
    };
    
    if (!projectId) {
        projectData.id = generateProjectId();
        projects.push(projectData);
        console.log('New project added:', projectData);
    } else {
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...projectData };
            console.log('Project updated:', projectData);
        }
    }
    
    // Salvar DIRETAMENTE no Supabase
    if (typeof supabaseClient.from === 'function') {
        supabaseClient.from('projects').upsert(projectData).then(({ error }) => {
            if (error) {
                console.error('Erro ao salvar projeto no Supabase:', error);
                showNotification('Erro ao salvar projeto', 'error');
            } else {
                console.log('Projeto salvo no Supabase com sucesso');
                showNotification('Projeto salvo com sucesso!');
            }
        });
    }
    
    // Atualizar interface
    renderProjects();
    renderSectorsTables();
    
    // Fechar modal
    if (projectModal) {
        projectModal.hide();
    }
    
    console.log('Project save completed successfully');
}

function generateProjectId() {
    if (projects.length === 0) return 'PROJ#001';
    const highestNumber = projects.reduce((max, project) => {
        const match = project.id.match(/^PROJ#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `PROJ#${String(highestNumber + 1).padStart(3, '0')}`;
}

function renderProjects() {
    console.log('Rendering projects');
    const tbody = document.getElementById('projectsTableBody');
    const emptyState = document.getElementById('projectsEmptyState');
    
    if (!tbody) {
        console.log('Projects table body not found');
        return;
    }
    
    if (projects.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    tbody.innerHTML = projects.map(project => `
        <tr>
            <td><span class="text-id">${project.id}</span></td>
            <td>${project.name}</td>
            <td>${project.status}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProject('${project.id}')">Editar</button>
            </td>
        </tr>
    `).join('');
    
    console.log('Projects rendered successfully:', projects.length);
}

function toggleFilterDropdown() {
    console.log('Toggling filter dropdown');
    const dropdown = document.querySelector('#filterDropdown + .dropdown-menu');
    
    if (!dropdown) {
        console.error('Filter dropdown menu not found');
        return;
    }
    
    // Toggle visibility
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        // Position dropdown
        const button = document.getElementById('filterDropdown');
        if (button) {
            const rect = button.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = rect.bottom + 'px';
            dropdown.style.right = 'auto';
            dropdown.style.left = rect.left + 'px';
            dropdown.style.zIndex = '1000';
            dropdown.style.minWidth = '250px';
        }
    }
}

function toggleSettingsDropdown() {
    console.log('Toggling settings dropdown');
    const dropdown = document.querySelector('#settingsDropdown + .dropdown-menu');
    
    if (!dropdown) {
        console.error('Settings dropdown menu not found');
        return;
    }
    
    // Toggle visibility
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        // Position dropdown
        const button = document.getElementById('settingsDropdown');
        if (button) {
            const rect = button.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = rect.bottom + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
            dropdown.style.left = 'auto';
            dropdown.style.zIndex = '1000';
            dropdown.style.minWidth = '200px';
        }
    }
}

function applyActivityFilters() {
    console.log('Applying activity filters');
    
    // Fechar dropdown de filtros
    const filterDropdown = document.querySelector('#filterDropdown + .dropdown-menu');
    if (filterDropdown) {
        filterDropdown.style.display = 'none';
    }
    
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const sectorFilter = document.getElementById('sectorFilter')?.value || '';
    const responsibleFilter = document.getElementById('responsibleFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    
    let filteredActivities = [...activities];
    
    // Filtrar por status
    if (statusFilter) {
        filteredActivities = filteredActivities.filter(activity => 
            activity.status === statusFilter
        );
    }
    
    // Filtrar por setor
    if (sectorFilter) {
        filteredActivities = filteredActivities.filter(activity => 
            activity.classification === sectorFilter
        );
    }
    
    // Filtrar por responsável
    if (responsibleFilter) {
        filteredActivities = filteredActivities.filter(activity => 
            activity.responsible === responsibleFilter
        );
    }
    
    // Filtrar por data
    if (dateFilter) {
        const today = new Date();
        filteredActivities = filteredActivities.filter(activity => {
            const activityDate = new Date(activity.startDate);
            switch (dateFilter) {
                case 'today':
                    return activityDate.toDateString() === today.toDateString();
                case 'week':
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return activityDate >= today && activityDate <= weekFromNow;
                case 'month':
                    return activityDate.getMonth() === today.getMonth() && 
                           activityDate.getFullYear() === today.getFullYear();
                default:
                    return true;
            }
        });
    }
    
    renderFilteredActivities(filteredActivities);
    showNotification(`${filteredActivities.length} atividades encontradas`);
}

function generateSectorId() {
    if (sectors.length === 0) return 'SECTOR#001';
    const highestNumber = sectors.reduce((max, sector) => {
        const match = sector.id.match(/^SECTOR#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `SECTOR#${String(highestNumber + 1).padStart(3, '0')}`;
}

function generateActivityId() {
    if (activities.length === 0) return 'ACT#001';
    const highestNumber = activities.reduce((max, activity) => {
        const match = activity.id.match(/^ACT#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `ACT#${String(highestNumber + 1).padStart(3, '0')}`;
}

function clearActivityFilters() {
    console.log('Clearing activity filters');
    
    // Limpar todos os filtros
    const statusFilter = document.getElementById('statusFilter');
    const sectorFilter = document.getElementById('sectorFilter');
    const responsibleFilter = document.getElementById('responsibleFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (sectorFilter) sectorFilter.value = '';
    if (responsibleFilter) responsibleFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    
    // Renderizar todas as atividades
    renderFilteredActivities(activities);
    
    // Fechar dropdown de filtros
    const filterDropdown = document.querySelector('#filterDropdown + .dropdown-menu');
    if (filterDropdown) {
        filterDropdown.style.display = 'none';
    }
    
    showNotification('Filtros limpos');
}

function saveUser() {
    console.log('Saving user...');
    
    const form = document.getElementById('userForm');
    if (!form) {
        console.error('User form not found');
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('userPassword').value;
    const confirmPassword = document.getElementById('userConfirmPassword').value;
    
    // Validate passwords for new users
    if (!userId && password !== confirmPassword) {
        showNotification('As senhas não conferem!', 'error');
        return;
    }
    
    if (!userId && password.length < 6) {
        showNotification('A senha deve ter no mínimo 6 caracteres!', 'error');
        return;
    }
    
    const userData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        role: document.getElementById('userRole').value,
        sector: document.getElementById('userSector').value,
        permissions: {
            activities: document.getElementById('perm_activities').checked,
            dashboard: document.getElementById('perm_dashboard').checked,
            projects: document.getElementById('perm_projects').checked,
            users: document.getElementById('perm_users').checked,
            settings: document.getElementById('perm_settings').checked,
            profile: true
        },
        active: document.getElementById('userActive').checked,
        created_at: new Date().toISOString()
    };
    
    if (!userId) {
        userData.id = generateUserId();
        userData.password = btoa(password);
        users.push(userData);
    } else {
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            if (!password) {
                userData.password = users[index].password;
            } else {
                userData.password = btoa(password);
            }
            users[index] = { ...users[index], ...userData };
        }
    }
    
    // Salvar no localStorage
    localStorage.setItem('users', JSON.stringify(users));
    
    // Tentar salvar no Supabase
    if (typeof supabaseClient.from === 'function') {
        supabaseClient.from('users').upsert(userData).then(({ error }) => {
            if (error) {
                console.error('Erro ao salvar usuário no Supabase:', error);
            } else {
                console.log('Usuário salvo no Supabase com sucesso');
            }
        });
    }
    
    renderUsers();
    
    if (userModal) {
        userModal.hide();
    }
    
    showNotification(userId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
}

function generateUserId() {
    if (users.length === 0) return 'USER#001';
    const highestNumber = users.reduce((max, user) => {
        const match = user.id.match(/^USER#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `USER#${String(highestNumber + 1).padStart(3, '0')}`;
}

function renderUsers() {
    console.log('Rendering users table');
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');
    
    if (!tbody) {
        console.log('Users table body not found');
        return;
    }
    
    if (users.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    tbody.innerHTML = users.map(user => `
        <tr>
            <td><span class="text-id">${user.id}</span></td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-2">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div>
                        <div class="fw-semibold">${user.name}</div>
                        ${!user.active ? '<small class="text-muted">Inativo</small>' : ''}
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge bg-secondary">${getRoleLabel(user.role || 'user')}</span>
                ${user.sector ? `<span class="badge bg-info ms-1">${user.sector}</span>` : ''}
            </td>
            <td>
                <div class="permission-badges">
                    ${user.permissions.activities ? '<span class="badge bg-primary me-1">Atividades</span>' : ''}
                    ${user.permissions.dashboard ? '<span class="badge bg-info me-1">Dashboard</span>' : ''}
                    ${user.permissions.projects ? '<span class="badge bg-success me-1">Projetos</span>' : ''}
                    ${user.permissions.users ? '<span class="badge bg-warning me-1">Usuários</span>' : ''}
                    ${user.permissions.settings ? '<span class="badge bg-secondary">Configurações</span>' : ''}
                </div>
            </td>
            <td>
                <span class="status-badge status-${user.active ? 'active' : 'inactive'}">
                    ${user.active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-action btn-edit me-1" onclick="editUser('${user.id}')" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-action btn-delete" onclick="deleteUser('${user.id}')" title="Excluir">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getRoleLabel(role) {
    const roles = {
        'admin': 'Administrador',
        'manager': 'Gerente',
        'supervisor': 'Supervisor',
        'analyst': 'Analista',
        'leader': 'Líder',
        'assistant': 'Assistente',
        'user': 'Usuário',
        'viewer': 'Visualizador'
    };
    return roles[role] || 'Usuário';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function editUser(id) {
    console.log('Editing user:', id);
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    currentUserEditId = id;
    document.getElementById('userModalTitle').textContent = 'Editar Usuário';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userConfirmPassword').value = '';
    
    document.getElementById('userRole').value = user.role || 'user';
    document.getElementById('userSector').value = user.sector || '';
    
    // Load permissions
    document.getElementById('perm_activities').checked = user.permissions.activities;
    document.getElementById('perm_dashboard').checked = user.permissions.dashboard;
    document.getElementById('perm_projects').checked = user.permissions.projects;
    document.getElementById('perm_users').checked = user.permissions.users;
    document.getElementById('perm_settings').checked = user.permissions.settings;
    document.getElementById('userActive').checked = user.active;
    
    if (userModal) {
        userModal.show();
    }
}

function deleteUser(id) {
    if (id === currentUser?.id) {
        showNotification('Você não pode excluir seu próprio usuário.', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        users = users.filter(u => u.id !== id);
        localStorage.setItem('users', JSON.stringify(users));
        renderUsers();
        showNotification('Usuário excluído com sucesso!');
    }
}
function showNotification(message, type = 'success') { 
    console.log('Notification:', message, type);
    // Criar notificação visual simples
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : 'success'} position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
