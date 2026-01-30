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

// Funções placeholder para evitar erros
function showPage(page) { console.log('Showing page:', page); }
function renderProjects() { console.log('Rendering projects'); }
function renderSectorsTables() { console.log('Rendering sectors tables'); }
function updateNavigationVisibility() { console.log('Updating navigation'); }
function initializeActivitySlider() { console.log('Initializing activity slider'); }
function populateDashboardFilters() { console.log('Populating dashboard filters'); }
function refreshDashboard() { console.log('Refreshing dashboard'); }
function loadUserProfile() { console.log('Loading user profile'); }
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
