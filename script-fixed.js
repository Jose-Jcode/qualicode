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
    
    // Carregar usuários do localStorage primeiro
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
        console.log('Users loaded from localStorage:', users.length);
    }
    
    // Garantir que admin exista
    ensureAdminExists();
    
    // Tentar carregar do Supabase (se disponível)
    loadUsers();
    
    // Check authentication
    if (!checkAuthentication()) {
        showLoginScreen();
    } else {
        showMainApp();
    }
    
    // Initialize application
    initializeApplication();
});

// Authentication System
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
        
        // Find user by email
        const user = users.find(u => u.email === email && u.active);
        
        if (!user) {
            console.log('User not found:', email);
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
            localStorage.setItem('rememberedPassword', password);
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
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
    console.log('Rendering sectors tables');
    // Implementação básica
    const activitiesContainer = document.getElementById('activitiesContainer');
    if (activitiesContainer && activities.length > 0) {
        activitiesContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <h5>${activity.description}</h5>
                <p>Status: ${activity.status}</p>
            </div>
        `).join('');
    }
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
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    
    if (currentUser) {
        if (profileName) profileName.textContent = currentUser.name;
        if (profileEmail) profileEmail.textContent = currentUser.email;
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
