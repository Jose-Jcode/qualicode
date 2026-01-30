let activities = [];
let projects = [];
let sectors = [];
let activityCounter = 1;
let projectCounter = 1;
let sectorCounter = 1;
let currentEditId = null;
let currentProjectEditId = null;
let currentSectorEditId = null;
let activityModal = null;
let projectModal = null;
let sectorModal = null;
let userModal = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        // Show login screen if not authenticated
        showLoginScreen();
    }
    
    // Initialize everything immediately since Bootstrap is now in head
    initializeApplication();
    
    // Initialize UI if authenticated
    if (currentUser) {
        showPage('activities');
        renderProjects();
        renderSectorsTables();
        renderSectorFilters();
        
        // Load user profile
        loadUserProfile();
        
        // Initialize dashboard if user has permission
        if (currentUser.permissions.dashboard) {
            setTimeout(() => {
                initializeActivitySlider();
                populateDashboardFilters();
                refreshDashboard();
            }, 200);
        }
        
        updateClassificationOptionsForUser();
    }
});

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
    
    // Load data
    loadSectors();
    loadActivities();
    loadProjects();
    loadUsers();
    
    // Populate dropdowns that depend on users
    setTimeout(() => {
        populateResponsibleDropdown();
    }, 100);
    
    // Setup event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }
    
    // Setup filter checkbox listeners
    const selectAllSectorsFilter = document.getElementById('selectAllSectorsFilter');
    if (selectAllSectorsFilter) {
        selectAllSectorsFilter.addEventListener('change', function() {
            const sectorCheckboxes = document.querySelectorAll('#sectorFilterItems input[type="checkbox"]');
            sectorCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            renderSectorsTables();
        });
    }
}

// Funções diretas para dropdowns
function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown').nextElementSibling;
    if (dropdown) {
        dropdown.classList.toggle('show');
        // Fechar outros dropdowns
        document.getElementById('settingsDropdown').nextElementSibling.classList.remove('show');
        
        // Garantir posicionamento correto
        const button = document.getElementById('filterDropdown');
        const buttonRect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (buttonRect.bottom + 5) + 'px';
        dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';
        dropdown.style.left = 'auto';
        dropdown.style.zIndex = '1050';
    }
}

function toggleSettingsDropdown() {
    const dropdown = document.getElementById('settingsDropdown').nextElementSibling;
    if (dropdown) {
        dropdown.classList.toggle('show');
        // Fechar outros dropdowns
        document.getElementById('filterDropdown').nextElementSibling.classList.remove('show');
        
        // Garantir posicionamento correto
        const button = document.getElementById('settingsDropdown');
        const buttonRect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = (buttonRect.bottom + 5) + 'px';
        dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';
        dropdown.style.left = 'auto';
        dropdown.style.zIndex = '1050';
    }
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', function(event) {
    if (!event.target.closest('#filterDropdown') && !event.target.closest('#filterDropdown').nextElementSibling) {
        document.getElementById('filterDropdown').nextElementSibling.classList.remove('show');
    }
    if (!event.target.closest('#settingsDropdown') && !event.target.closest('#settingsDropdown').nextElementSibling) {
        document.getElementById('settingsDropdown').nextElementSibling.classList.remove('show');
    }
});

function loadSectors() {
    const stored = localStorage.getItem('sectors');
    if (stored) {
        sectors = JSON.parse(stored);
        // Find the highest sector number to continue the sequence
        const highestNumber = sectors.reduce((max, sector) => {
            const match = sector.id.match(/^SEC#(\d+)$/);
            if (match) {
                return Math.max(max, parseInt(match[1]));
            }
            return max;
        }, 0);
        sectorCounter = highestNumber + 1;
    } else {
        sectors = [
            {
                id: 'SEC#1',
                name: 'Qualidade',
                description: 'Setor responsável pela gestão da qualidade',
                icon: 'bi-shield-check'
            },
            {
                id: 'SEC#2',
                name: 'Planejamento',
                description: 'Setor responsável pelo planejamento estratégico',
                icon: 'bi-clipboard-data'
            }
        ];
        sectorCounter = 3;
        saveSectors();
    }
}

function saveSectors() {
    localStorage.setItem('sectors', JSON.stringify(sectors));
}

function loadActivities() {
    const stored = localStorage.getItem('activities');
    if (stored) {
        activities = JSON.parse(stored);
        // Find the highest activity number to continue the sequence
        const highestNumber = activities.reduce((max, activity) => {
            const match = activity.id.match(/^#(\d+)$/);
            if (match) {
                return Math.max(max, parseInt(match[1]));
            }
            return max;
        }, 0);
        activityCounter = highestNumber + 1;
    } else {
        activities = [];
        activityCounter = 1;
        saveActivities();
    }
}

function loadProjects() {
    const stored = localStorage.getItem('projects');
    if (stored) {
        projects = JSON.parse(stored);
        // Find the highest project number to continue the sequence
        const highestNumber = projects.reduce((max, project) => {
            const match = project.id.match(/^PRJ#(\d+)$/);
            if (match) {
                return Math.max(max, parseInt(match[1]));
            }
            return max;
        }, 0);
        projectCounter = highestNumber + 1;
    } else {
        projects = [];
        projectCounter = 1;
        saveProjects();
    }
}

function saveActivities() {
    localStorage.setItem('activities', JSON.stringify(activities));
    renderSectorsTables();
}

function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

function generateId() {
    return `#${activityCounter++}`;
}

function generateProjectId() {
    return `PRJ#${projectCounter++}`;
}

function generateSectorId() {
    return `SEC#${sectorCounter++}`;
}

function renderActivities() {
    // Função vazia pois atividades gerais foram removidas
    // Todas as atividades agora são exibidas em seus setores
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
    const statusMap = {
        'Pendente': 'pendente',
        'Em Andamento': 'em-andamento',
        'Congelado': 'congelado',
        'Concluída': 'concluida',
        'Cancelada': 'cancelada'
    };
    return statusMap[status] || 'pendente';
}

function getClassificationClass(classification) {
    if (!classification) return '';
    return classification.startsWith('setor-') ? 'classification-setor' : 'classification-projeto';
}

function getClassificationLabel(classification) {
    const labels = {
        'setor-qualidade': 'Qualidade',
        'setor-planejamento': 'Planejamento',
        'projeto-caixas-preta': 'Caixas Preta',
        'projeto-inobag': 'Inobag'
    };
    return labels[classification] || classification;
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

function openModal() {
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
    const form = document.getElementById('activityForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const classification = document.getElementById('classification').value;
    let sector = null;
    
    // Extract sector from classification
    if (classification.startsWith('setor-')) {
        sector = classification.replace('setor-', '');
        // Find the sector name from its ID
        const sectorObj = sectors.find(s => s.id === sector);
        if (sectorObj) {
            sector = sectorObj.name;
        }
    }
    
    // Se estiver editando, usar o status selecionado. Se for nova atividade, usar status de aprovação
    const status = currentEditId 
        ? document.getElementById('status').value 
        : getActivityApprovalStatus(sector);
    
    const activityData = {
        description: document.getElementById('description').value.trim(),
        responsible: document.getElementById('responsible').value.trim(),
        requestingSector: document.getElementById('requestingSector').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        classification: classification,
        status: status,
        notes: document.getElementById('notes').value.trim(),
        createdBy: currentUser.name,
        createdAt: new Date().toISOString()
    };
    
    // Validate dates
    if (new Date(activityData.endDate) < new Date(activityData.startDate)) {
        showNotification('A data de término não pode ser anterior à data de início.', 'error');
        return;
    }
    
    if (currentEditId) {
        const index = activities.findIndex(a => a.id === currentEditId);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...activityData };
        }
    } else {
        activities.push({
            id: generateId(),
            ...activityData
        });
    }
    
    saveActivities();
    renderProjects();
    renderSectorsTables();
    updateClassificationOptionsForUser();
    activityModal.hide();
    
    const message = activityData.status === 'Pendente Aprovação' 
        ? 'Atividade criada e aguardando aprovação!'
        : (currentEditId ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!');
    
    showNotification(message);
}

function deleteActivity(id) {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
        activities = activities.filter(a => a.id !== id);
        saveActivities();
        renderProjects();
        showNotification('Atividade excluída com sucesso!');
    }
}

function showNotification(message, type = 'success') {
    try {
        const notification = document.createElement('div');
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-success';
        
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '1050';
        notification.style.maxWidth = '400px';
        notification.style.wordWrap = 'break-word';
        
        const icon = type === 'error' ? 'bi-exclamation-triangle' : 
                     type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle';
        
        notification.innerHTML = `
            <i class="bi ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds for error messages, 3 seconds for others
        const timeout = type === 'error' ? 5000 : 3000;
        
        setTimeout(() => {
            try {
                if (notification.parentNode) {
                    notification.remove();
                }
            } catch (error) {
                console.error('Error removing notification:', error);
            }
        }, timeout);
        
    } catch (error) {
        console.error('Error showing notification:', error);
        // Fallback: simple alert
        alert(message);
    }
}

document.getElementById('activityForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveActivity();
});

// Navigation functions
function showPage(page) {
    const activitiesPage = document.getElementById('activitiesPage');
    const dashboardPage = document.getElementById('dashboardPage');
    const projectsPage = document.getElementById('projectsPage');
    const profilePage = document.getElementById('profilePage');
    const usersPage = document.getElementById('usersPage');
    const settingsPage = document.getElementById('settingsPage');
    const activitiesLink = document.getElementById('activitiesLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const projectsLink = document.getElementById('projectsLink');
    const profileLink = document.getElementById('profileLink');
    const usersLink = document.getElementById('usersLink');
    const settingsLink = document.getElementById('settingsLink');
    
    // Check permissions
    if (!hasPermission(page)) {
        showNotification('Você não tem permissão para acessar esta página.', 'error');
        return;
    }
    
    // Hide all pages
    activitiesPage.style.display = 'none';
    dashboardPage.style.display = 'none';
    projectsPage.style.display = 'none';
    profilePage.style.display = 'none';
    usersPage.style.display = 'none';
    settingsPage.style.display = 'none';
    
    // Remove active class from all links
    activitiesLink.classList.remove('active');
    dashboardLink.classList.remove('active');
    projectsLink.classList.remove('active');
    profileLink.classList.remove('active');
    usersLink.classList.remove('active');
    settingsLink.classList.remove('active');
    
    // Show selected page and set active link
    if (page === 'activities') {
        activitiesPage.style.display = 'block';
        activitiesLink.classList.add('active');
    } else if (page === 'dashboard') {
        dashboardPage.style.display = 'block';
        dashboardLink.classList.add('active');
        setTimeout(() => {
            initializeActivitySlider();
        }, 100);
    } else if (page === 'projects') {
        projectsPage.style.display = 'block';
        projectsLink.classList.add('active');
    } else if (page === 'profile') {
        profilePage.style.display = 'block';
        profileLink.classList.add('active');
        loadProfilePage();
    } else if (page === 'users') {
        usersPage.style.display = 'block';
        usersLink.classList.add('active');
        loadUsers();
    } else if (page === 'settings') {
        settingsPage.style.display = 'block';
        settingsLink.classList.add('active');
        loadSettings();
    }
}

// Notes Management Functions
let notesVisibility = true;

function toggleNotesVisibility() {
    notesVisibility = !notesVisibility;
    const icon = document.getElementById('notesVisibilityIcon');
    
    if (notesVisibility) {
        icon.className = 'bi bi-eye';
        showNotification('Anotações visíveis ao passar o mouse');
    } else {
        icon.className = 'bi bi-eye-slash';
        showNotification('Anotações ocultas');
    }
}

function renderResponsibleWithAvatar(responsibleName) {
    // Primeiro, tenta encontrar o usuário pelo nome exato
    let user = users.find(u => u.name === responsibleName);
    
    // Se não encontrar, tenta encontrar pelo nome do perfil
    if (!user) {
        const userProfiles = localStorage.getItem('userProfiles');
        if (userProfiles) {
            const allProfiles = JSON.parse(userProfiles);
            for (const email in allProfiles) {
                if (allProfiles[email].name === responsibleName) {
                    user = users.find(u => u.email === email);
                    break;
                }
            }
        }
    }
    
    const initials = responsibleName.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
    const bgColor = user ? '#007bff' : '#6c757d';
    
    // Tenta buscar o avatar do perfil do usuário
    let avatarImg = '';
    if (user) {
        const userProfiles = localStorage.getItem('userProfiles');
        if (userProfiles) {
            const allProfiles = JSON.parse(userProfiles);
            const profile = allProfiles[user.email];
            if (profile && profile.avatar) {
                avatarImg = profile.avatar;
            }
        }
    }
    
    return `
        <div style="display: flex; align-items: center; gap: 6px;">
            <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background-color: ${bgColor};
                background-size: cover;
                background-position: center;
                ${avatarImg ? `background-image: url('${avatarImg}');` : ''}
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 11px;
                font-weight: bold;
                flex-shrink: 0;
                overflow: hidden;
            ">
                ${!avatarImg ? initials : ''}
            </div>
            <span>${responsibleName}</span>
        </div>
    `;
}

function renderActivityNotes(notes, activityId) {
    if (!notes || notes.trim() === '') {
        return '';
    }
    
    const visibilityClass = notesVisibility ? '' : 'notes-hidden';
    
    return `
        <div class="activity-notes ${visibilityClass}" id="notes-${activityId}">
            <i class="bi bi-info-circle notes-icon"></i>
            <div class="notes-tooltip">${notes}</div>
        </div>
    `;
}

// Activity Sector Permission System
function canUserCreateActivityInSector(sector) {
    if (!currentUser) return false;
    
    // Admin can create activities in any sector
    if (currentUser.role === 'admin') return true;
    
    // Manager and Supervisor can create activities in any sector
    if (currentUser.role === 'manager' || currentUser.role === 'supervisor') return true;
    
    // Users can only create activities in their own sector
    return currentUser.sector === sector;
}

function getActivityApprovalStatus(sector) {
    if (!currentUser) return 'Pendente';
    
    // Admin, Manager, Supervisor activities are auto-approved
    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'supervisor') {
        return 'Em Andamento';
    }
    
    // Other roles need approval for sectors different from their own
    if (currentUser.sector !== sector) {
        return 'Pendente Aprovação';
    }
    
    // Own sector activities are auto-approved
    return 'Em Andamento';
}

function updateClassificationOptionsForUser() {
    const classificationSelect = document.getElementById('classification');
    if (!classificationSelect) return;
    
    const sectorsGroup = document.getElementById('sectorsGroup');
    const projectsGroup = document.getElementById('projectsGroup');
    
    if (!sectorsGroup || !projectsGroup) return;
    
    // Clear existing options
    sectorsGroup.innerHTML = '';
    projectsGroup.innerHTML = '';
    
    // Add sector options based on user permissions
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = `setor-${sector.id}`;
        
        if (canUserCreateActivityInSector(sector.name)) {
            option.textContent = sector.name;
        } else {
            option.textContent = `${sector.name} (Solicitação)`;
            option.title = `Atividades neste setor ficarão pendentes de aprovação`;
        }
        
        sectorsGroup.appendChild(option);
    });
    
    // Add project options (all users can create project activities)
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = `projeto-${project.id}`;
        option.textContent = `Projeto: ${project.name}`;
        projectsGroup.appendChild(option);
    });
}

function showUserSectorFirst() {
    if (!currentUser || !currentUser.sector) return;
    
    // Find user's sector by name
    const userSector = sectors.find(s => s.name === currentUser.sector);
    if (!userSector) return;
    
    // Collapse all sectors first
    document.querySelectorAll('.sector-content').forEach(content => {
        content.classList.add('collapsed');
    });
    
    // Reset all icons to chevron-right
    document.querySelectorAll('[id^="sector-icon-"]').forEach(icon => {
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
    });
    
    // Expand user's sector
    const userSectorContent = document.getElementById(`sector-content-${userSector.id}`);
    const userSectorIcon = document.getElementById(`sector-icon-${userSector.id}`);
    
    if (userSectorContent && userSectorIcon) {
        userSectorContent.classList.remove('collapsed');
        userSectorIcon.classList.remove('bi-chevron-right');
        userSectorIcon.classList.add('bi-chevron-down');
        
        // Scroll to user's sector
        setTimeout(() => {
            userSectorContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function isActivityOverdue(activity) {
    if (activity.status === 'Concluída' || activity.status === 'Cancelada' || activity.status === 'Congelado') {
        return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(activity.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    return endDate < today;
}

function getOverdueDays(activity) {
    if (!isActivityOverdue(activity)) {
        return 0;
    }
    
    const today = new Date();
    const endDate = new Date(activity.endDate);
    const diffTime = Math.abs(today - endDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}
let statusChart = null;
let sectorChart = null;

function initializeDashboard() {
    populateDashboardFilters();
    refreshDashboard();
}

function populateDashboardFilters() {
    // Populate sector filter
    const sectorFilter = document.getElementById('dashboardSectorFilter');
    sectorFilter.innerHTML = '<option value="">Todos</option>';
    sectors.forEach(sector => {
        sectorFilter.innerHTML += `<option value="${sector.id}">${sector.name}</option>`;
    });
    
    // Populate month filter
    const monthFilter = document.getElementById('dashboardMonthFilter');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthFilter.innerHTML = '<option value="">Todos</option>';
    months.forEach((month, index) => {
        monthFilter.innerHTML += `<option value="${index + 1}">${month}</option>`;
    });
    
    // Populate year filter
    const yearFilter = document.getElementById('dashboardYearFilter');
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '<option value="">Todos</option>';
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
        yearFilter.innerHTML += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
    }
}

function refreshDashboard() {
    const filteredActivities = getFilteredActivities();
    updateStatisticsCards(filteredActivities);
    updateCharts(filteredActivities);
}

function getFilteredActivities() {
    const statusFilter = document.getElementById('dashboardStatusFilter').value;
    const sectorFilter = document.getElementById('dashboardSectorFilter').value;
    const monthFilter = document.getElementById('dashboardMonthFilter').value;
    const yearFilter = document.getElementById('dashboardYearFilter').value;
    
    return activities.filter(activity => {
        // Status filter
        if (statusFilter && activity.status !== statusFilter) return false;
        
        // Sector filter (by classification or requesting sector)
        if (sectorFilter) {
            const sector = sectors.find(s => s.id === sectorFilter);
            if (sector) {
                const isClassificationMatch = activity.classification === `setor-${sector.id}`;
                const isRequestingMatch = activity.requestingSector === sector.name;
                if (!isClassificationMatch && !isRequestingMatch) return false;
            }
        }
        
        // Date filters
        if (activity.startDate) {
            const startDate = new Date(activity.startDate);
            if (monthFilter && startDate.getMonth() + 1 !== parseInt(monthFilter)) return false;
            if (yearFilter && startDate.getFullYear() !== parseInt(yearFilter)) return false;
        }
        
        return true;
    });
}

function updateStatisticsCards(filteredActivities) {
    const total = filteredActivities.length;
    const pending = filteredActivities.filter(a => a.status === 'Pendente').length;
    const inProgress = filteredActivities.filter(a => a.status === 'Em Andamento').length;
    const completed = filteredActivities.filter(a => a.status === 'Concluída').length;
    
    document.getElementById('totalActivities').textContent = total;
    document.getElementById('pendingActivities').textContent = pending;
    document.getElementById('inProgressActivities').textContent = inProgress;
    document.getElementById('completedActivities').textContent = completed;
}

function updateCharts(filteredActivities) {
    updateStatusChart(filteredActivities);
    updateSectorChart(filteredActivities);
}

function updateStatusChart(filteredActivities) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    const statusCounts = {
        'Pendente': 0,
        'Em Andamento': 0,
        'Concluída': 0,
        'Cancelada': 0
    };
    
    filteredActivities.forEach(activity => {
        if (statusCounts.hasOwnProperty(activity.status)) {
            statusCounts[activity.status]++;
        }
    });
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#ffc107',
                    '#17a2b8',
                    '#28a745',
                    '#dc3545'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateSectorChart(filteredActivities) {
    const ctx = document.getElementById('sectorChart').getContext('2d');
    
    const sectorCounts = {};
    
    filteredActivities.forEach(activity => {
        let sectorName = 'Não classificado';
        
        // Try to get sector from classification
        if (activity.classification && activity.classification.startsWith('setor-')) {
            const sectorId = activity.classification.replace('setor-', '');
            const sector = sectors.find(s => s.id === sectorId);
            if (sector) {
                sectorName = sector.name;
            }
        }
        // Try to get from requesting sector
        else if (activity.requestingSector) {
            sectorName = activity.requestingSector;
        }
        
        sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
    });
    
    if (sectorChart) {
        sectorChart.destroy();
    }
    
    sectorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(sectorCounts),
            datasets: [{
                label: 'Atividades',
                data: Object.values(sectorCounts),
                backgroundColor: '#0d6efd',
                borderColor: '#0a58ca',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function applyDashboardFilters() {
    refreshDashboard();
}

function clearDashboardFilters() {
    document.getElementById('dashboardStatusFilter').value = '';
    document.getElementById('dashboardSectorFilter').value = '';
    document.getElementById('dashboardMonthFilter').value = '';
    document.getElementById('dashboardYearFilter').value = '';
    refreshDashboard();
}

// Users Management
let users = [];
let currentUser = null;
let currentUserEditId = null;

function generateUserId() {
    if (users.length === 0) return 'USER#001';
    const highestNumber = users.reduce((max, user) => {
        const match = user.id.match(/^USER#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `USER#${String(highestNumber + 1).padStart(3, '0')}`;
}

function loadUsers() {
    const saved = localStorage.getItem('users');
    if (saved) {
        users = JSON.parse(saved);
    } else {
        // Create default admin user and test user
        users = [{
            id: 'USER#001',
            name: 'Administrador',
            email: 'admin@qualicode.com',
            password: btoa('admin123'), // Simple encoding for demo
            role: 'admin',
            sector: 'Qualidade',
            permissions: {
                activities: true,
                dashboard: true,
                projects: true,
                users: true,
                settings: true
            },
            active: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 'USER#002',
            name: 'Gerente de Planejamento',
            email: 'planejamento@qualicode.com',
            password: btoa('planej123'),
            role: 'manager',
            sector: 'Planejamento',
            permissions: {
                activities: true,
                dashboard: true,
                projects: true,
                users: false,
                settings: false
            },
            active: true,
            createdAt: new Date().toISOString()
        }];
        saveUsers();
    }
    
    renderUsers();
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
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

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');
    
    if (users.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
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
            <td>${formatDate(user.createdAt)}</td>
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

function populateSectorDropdown() {
    const userSectorSelect = document.getElementById('userSector');
    if (!userSectorSelect) return;
    
    // Limpar todas as opções
    userSectorSelect.innerHTML = '';
    
    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione um setor';
    userSectorSelect.appendChild(defaultOption);
    
    // Adicionar setores dinamicamente
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        option.textContent = sector.name;
        userSectorSelect.appendChild(option);
    });
}

function openUserModal() {
    // Check if modal exists and is initialized
    if (!userModal) {
        userModal = new bootstrap.Modal(document.getElementById('userModal'));
    }
    
    currentUserEditId = null;
    document.getElementById('userModalTitle').textContent = 'Novo Usuário';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    
    // Populate sector dropdown
    populateSectorDropdown();
    
    // Set default permissions
    document.getElementById('perm_activities').checked = true;
    document.getElementById('perm_dashboard').checked = true;
    document.getElementById('perm_projects').checked = false;
    document.getElementById('perm_users').checked = false;
    document.getElementById('perm_settings').checked = false;
    document.getElementById('userActive').checked = true;
    
    userModal.show();
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    currentUserEditId = id;
    document.getElementById('userModalTitle').textContent = 'Editar Usuário';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userConfirmPassword').value = '';
    
    // Populate sector dropdown
    populateSectorDropdown();
    
    document.getElementById('userRole').value = user.role || 'user';
    document.getElementById('userSector').value = user.sector || '';
    
    // Load permissions
    document.getElementById('perm_activities').checked = user.permissions.activities;
    document.getElementById('perm_dashboard').checked = user.permissions.dashboard;
    document.getElementById('perm_projects').checked = user.permissions.projects;
    document.getElementById('perm_users').checked = user.permissions.users;
    document.getElementById('perm_settings').checked = user.permissions.settings;
    document.getElementById('userActive').checked = user.active;
    
    userModal.show();
}

function saveUser() {
    const form = document.getElementById('userForm');
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
            profile: true // Profile is always available
        },
        active: document.getElementById('userActive').checked
    };
    
    if (currentUserEditId) {
        const index = users.findIndex(u => u.id === currentUserEditId);
        if (index !== -1) {
            // Keep existing password if not provided
            if (!password) {
                userData.password = users[index].password;
            }
            users[index] = { ...users[index], ...userData };
        }
    } else {
        userData.id = generateUserId();
        userData.password = btoa(password);
        users.push(userData);
    }
    
    saveUsers();
    renderUsers();
    userModal.hide();
    
    showNotification(currentUserEditId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
}

function deleteUser(id) {
    if (id === currentUser?.id) {
        showNotification('Você não pode excluir seu próprio usuário.', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        users = users.filter(u => u.id !== id);
        saveUsers();
        renderUsers();
        showNotification('Usuário excluído com sucesso!');
    }
}

// Authentication System
function checkAuthentication() {
    const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (session) {
        currentUser = JSON.parse(session);
        showMainApp();
        return true;
    }
    return false;
}

function showMainApp() {
    document.querySelector('.login-container').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.body.className = '';
    
    // Show activities page by default
    showPage('activities');
    
    // Initialize UI components immediately
    renderProjects();
    renderSectorsTables();
    renderSectorFilters();
    updateClassificationOptionsForUser();
    
    updateNavigationVisibility();
    
    // Show user's sector first after a short delay
    setTimeout(() => {
        showUserSectorFirst();
    }, 300);
    
    // Initialize dashboard if user has permission
    if (currentUser.permissions.dashboard) {
        setTimeout(() => {
            initializeActivitySlider();
            populateDashboardFilters();
            refreshDashboard();
        }, 200);
    }
    
    // Load user profile
    loadUserProfile();
    
    console.log('showMainApp executed, activities:', activities.length, 'projects:', projects.length);
}

function showLoginScreen() {
    document.querySelector('.login-container').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.body.className = 'login-body';
    
    // Check for remembered credentials
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    
    if (rememberedEmail) {
        document.getElementById('loginEmail').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    } else {
        document.getElementById('loginEmail').value = '';
        document.getElementById('rememberMe').checked = false;
    }
    
    if (rememberedPassword) {
        document.getElementById('loginPassword').value = rememberedPassword;
    } else {
        document.getElementById('loginPassword').value = '';
    }
}

function login() {
    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        console.log('Login attempt with email:', email);
        console.log('Available users:', users.length);
        
        // Find user by email
        const user = users.find(u => u.email === email && u.active);
        
        if (!user) {
            console.log('User not found or inactive');
            showNotification('Email ou senha incorretos.', 'error');
            return;
        }
        
        console.log('User found:', user.name);
        
        // Verify password (simple btoa decode for demo)
        const decodedPassword = atob(user.password);
        if (decodedPassword !== password) {
            console.log('Password mismatch');
            showNotification('Email ou senha incorretos.', 'error');
            return;
        }
        
        console.log('Password correct, logging in');
        
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
            // Save credentials for auto-fill
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
            // Clear remembered credentials
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
        }
        
        showMainApp();
        showNotification(`Bem-vindo, ${user.name}!`);
        
        // Redirect to first accessible page
        if (user.permissions.activities) {
            showPage('activities');
        } else if (user.permissions.dashboard) {
            showPage('dashboard');
        } else if (user.permissions.projects) {
            showPage('projects');
        } else if (user.permissions.users) {
            showPage('users');
        } else if (user.permissions.settings) {
            showPage('settings');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showNotification('Erro ao fazer login. Verifique o console.', 'error');
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        // Clear session
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        currentUser = null;
        
        // Show login screen
        showLoginScreen();
        
        // Clear form
        document.getElementById('loginForm').reset();
        
        showNotification('Você saiu do sistema.');
    }
}

function hasPermission(page) {
    if (!currentUser) return false;
    
    // Profile page is always available for all authenticated users
    if (page === 'profile') return true;
    
    const permissions = currentUser.permissions;
    
    switch(page) {
        case 'activities':
            return permissions.activities || permissions.admin;
        case 'dashboard':
            return permissions.dashboard || permissions.admin;
        case 'projects':
            return permissions.projects || permissions.admin;
        case 'users':
            return permissions.users || permissions.admin;
        case 'settings':
            return permissions.settings || permissions.admin;
        default:
            return permissions.admin;
    }
}

function updateNavigationVisibility() {
    if (!currentUser) return;
    
    // Hide/show navigation items based on permissions
    document.getElementById('activitiesLink').style.display = currentUser.permissions.activities ? 'block' : 'none';
    document.getElementById('dashboardLink').style.display = currentUser.permissions.dashboard ? 'block' : 'none';
    document.getElementById('projectsLink').style.display = currentUser.permissions.projects ? 'block' : 'none';
    document.getElementById('usersLink').style.display = currentUser.permissions.users ? 'block' : 'none';
    document.getElementById('settingsLink').style.display = currentUser.permissions.settings ? 'block' : 'none';
    
    // Profile link is always visible for authenticated users
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.style.display = 'block';
    }
}

function renderProjects() {
    const container = document.getElementById('projectsCardsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (projects.length === 0) {
        document.getElementById('projectsEmptyState').style.display = 'block';
        return;
    }
    
    document.getElementById('projectsEmptyState').style.display = 'none';
    
    projects.forEach(project => {
        const projectActivities = activities.filter(activity => activity.classification === `projeto-${project.id}`);
        
        const projectCard = `
            <div class="col-12 mb-4">
                <div class="card project-card" id="project-${project.id}">
                    <div class="card-header d-flex justify-content-between align-items-center" onclick="toggleProjectCard('${project.id}')" style="cursor: pointer;">
                        <h6 class="mb-0">
                            <i class="bi bi-chevron-right ms-1" id="expand-icon-${project.id}"></i>
                            ${project.name}
                        </h6>
                        <div onclick="event.stopPropagation();">
                            <button class="btn btn-sm btn-success me-1" onclick="addActivityToProject('${project.id}')" title="Adicionar Tarefa">
                                <i class="bi bi-plus-lg"></i> Adicionar Tarefa
                            </button>
                            <button class="btn btn-sm btn-action btn-edit me-1" onclick="editProject('${project.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-action btn-delete" onclick="deleteProject('${project.id}')" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="project-body" id="project-body-${project.id}" style="display: none;">
                        <div class="card-body">
                            <div class="project-info mb-3">
                                <div class="row">
                                    <div class="col-md-4">
                                        <small class="text-muted">Descrição:</small><br>
                                        <strong>${project.description}</strong>
                                    </div>
                                    <div class="col-md-2">
                                        <small class="text-muted">Responsável:</small><br>
                                        <strong>${project.responsible}</strong>
                                    </div>
                                    <div class="col-md-2">
                                        <small class="text-muted">Status:</small><br>
                                        <span class="status-badge status-${getStatusClass(project.status)}">${project.status}</span>
                                    </div>
                                    <div class="col-md-2">
                                        <small class="text-muted">Início:</small><br>
                                        <strong>${formatDate(project.startDate)}</strong>
                                    </div>
                                    <div class="col-md-2">
                                        <small class="text-muted">Término:</small><br>
                                        <strong>${formatDate(project.endDate)}</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="project-activities">
                                <h6 class="mb-3">Atividades do Projeto</h6>
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead class="table-light">
                                            <tr>
                                                <th>ID</th>
                                                <th>Descrição</th>
                                                <th>Responsável</th>
                                                <th>Data Início</th>
                                                <th>Data Término</th>
                                                <th>Status</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${projectActivities.length > 0 ? projectActivities.map(activity => `
                                                <tr class="activity-row">
                                                    <td><span class="text-id">${activity.id}</span></td>
                                                    <td>
                                                        <div class="description-cell" title="${activity.description}">
                                                            ${activity.description}
                                                            ${isActivityOverdue(activity) ? `
                                                                <i class="bi bi-exclamation-triangle-fill text-danger ms-1" 
                                                                   style="font-size: 0.8em; cursor: help;" 
                                                                   title="Atrasada há ${getOverdueDays(activity)} dias"></i>
                                                            ` : ''}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        ${renderResponsibleWithAvatar(activity.responsible)}
                                                    </td>
                                                    <td>${formatDate(activity.startDate)}</td>
                                                    <td>${formatDate(activity.endDate)}</td>
                                                    <td>
                                                        <span class="status-badge status-${getStatusClass(activity.status)}">
                                                            ${activity.status}
                                                        </span>
                                                        ${renderActivityNotes(activity.notes, activity.id)}
                                                    </td>
                                                    <td>
                                                        <button class="btn btn-sm btn-action btn-edit" onclick="editActivity('${activity.id}')" title="Editar">
                                                            <i class="bi bi-pencil"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-action btn-delete" onclick="deleteActivity('${activity.id}')" title="Excluir">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('') : `
                                                <tr>
                                                    <td colspan="7" class="text-center text-muted py-3">
                                                        <i class="bi bi-inbox me-1"></i>
                                                        Nenhuma atividade neste projeto
                                                    </td>
                                                </tr>
                                            `}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += projectCard;
    });
}

function renderActivities() {
    console.log('renderActivities called');
}

function openProjectModal() {
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
    const form = document.getElementById('projectForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const projectData = {
        name: document.getElementById('projectName').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        responsible: document.getElementById('projectResponsible').value.trim(),
        startDate: document.getElementById('projectStartDate').value,
        endDate: document.getElementById('projectEndDate').value,
        status: document.getElementById('projectStatus').value
    };
    
    if (new Date(projectData.endDate) < new Date(projectData.startDate)) {
        alert('A data de término não pode ser anterior à data de início.');
        return;
    }
    
    if (currentProjectEditId) {
        const index = projects.findIndex(p => p.id === currentProjectEditId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...projectData };
        }
    } else {
        projects.push({
            id: generateProjectId(),
            ...projectData
        });
    }
    
    saveProjects();
    renderProjects();
    updateClassificationOptions();
    projectModal.hide();
    
    showNotification(currentProjectEditId ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');
}

function deleteProject(id) {
    if (confirm('Tem certeza que deseja excluir este projeto? Todas as atividades relacionadas serão desclassificadas.')) {
        // Remove classificação das atividades do projeto
        activities.forEach(activity => {
            if (activity.classification === `projeto-${id}`) {
                activity.classification = '';
            }
        });
        
        projects = projects.filter(p => p.id !== id);
        saveProjects();
        saveActivities();
        renderProjects();
        renderActivities();
        updateClassificationOptionsForUser();
        showNotification('Projeto excluído com sucesso!');
    }
}

document.getElementById('projectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveProject();
});

document.getElementById('sectorForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveSector();
});

// Event listener para "Ver Todos"
document.addEventListener('DOMContentLoaded', function() {
    const selectAllCheckbox = document.getElementById('selectAllSectorsFilter');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSectorFilterChange);
    }
});

// Sectors Functions
function renderSectorsTables() {
    const container = document.getElementById('sectorsTables');
    
    if (sectors.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-building display-1 text-muted"></i>
                <h4 class="text-muted mt-3">Nenhum setor cadastrado</h4>
                <p class="text-muted">Clique em "Cadastrar Setor" para começar</p>
            </div>
        `;
        return;
    }
    
    // Obtém setores selecionados
    const selectedSectors = getSelectedSectors();
    
    // Mostra resumo dos filtros
    if (selectedSectors.length > 0 && selectedSectors.length < sectors.length) {
        const filterSummary = document.createElement('div');
        filterSummary.className = 'filter-summary';
        filterSummary.innerHTML = `
            <i class="bi bi-funnel-fill me-2"></i>
            Mostrando ${selectedSectors.length} de ${sectors.length} setores: 
            ${selectedSectors.map(s => `<strong>${s.name}</strong>`).join(', ')}
        `;
        container.innerHTML = '';
        container.appendChild(filterSummary);
    } else {
        container.innerHTML = '';
    }
    
    // Renderiza apenas os setores selecionados
    sectors.forEach(sector => {
        if (selectedSectors.some(s => s.id === sector.id)) {
            const sectorActivities = getActivitiesByClassification(`setor-${sector.id}`);
            const sectorElement = document.createElement('div');
            sectorElement.className = 'sector-section mb-4';
            sectorElement.id = `sector-${sector.id}`;
            
            sectorElement.innerHTML = `
                <div class="sector-header card-header" onclick="toggleSectorContent('${sector.id}')">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="section-title mb-0">
                            <i class="bi ${sector.icon} me-2"></i>
                            ${sector.name}
                            <span class="badge bg-secondary ms-2">${sectorActivities.length} atividades</span>
                            <i class="bi bi-chevron-down ms-2" id="sector-icon-${sector.id}"></i>
                        </h6>
                        <div class="sector-actions">
                            ${canUserCreateActivityInSector(sector.name) ? `
                                <button class="btn btn-sm btn-success me-2" onclick="event.stopPropagation(); openSectorActivityModal('${sector.id}')" title="Nova Tarefa">
                                    <i class="bi bi-plus-lg"></i> Nova Tarefa
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-action btn-edit me-1" onclick="event.stopPropagation(); editSector('${sector.id}')" title="Editar Setor">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-action btn-delete" onclick="event.stopPropagation(); deleteSector('${sector.id}')" title="Excluir Setor">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="sector-content" id="sector-content-${sector.id}">
                    <p class="text-muted small mb-3 px-3">${sector.description}</p>
                    <div class="px-3">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Descrição</th>
                                        <th>Responsável</th>
                                        <th>Setor Solicitante</th>
                                        <th>Data Início</th>
                                        <th>Data Término</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sectorActivities.length > 0 ? sectorActivities.map(activity => `
                                        <tr class="activity-row">
                                            <td><span class="text-id">${activity.id}</span></td>
                                            <td>
                                                <div class="description-cell" title="${activity.description}">
                                                    ${activity.description}
                                                    ${isActivityOverdue(activity) ? `
                                                        <i class="bi bi-exclamation-triangle-fill text-danger ms-1" 
                                                           style="font-size: 0.8em; cursor: help;" 
                                                           title="Atrasada há ${getOverdueDays(activity)} dias"></i>
                                                    ` : ''}
                                                </div>
                                            </td>
                                            <td>
                                                ${renderResponsibleWithAvatar(activity.responsible)}
                                            </td>
                                            <td>
                                                <i class="bi bi-building me-1"></i>
                                                ${activity.requestingSector || '-'}
                                            </td>
                                            <td>${formatDate(activity.startDate)}</td>
                                            <td>${formatDate(activity.endDate)}</td>
                                            <td>
                                                <span class="status-badge status-${getStatusClass(activity.status)}">
                                                    ${activity.status}
                                                </span>
                                                ${renderActivityNotes(activity.notes, activity.id)}
                                            </td>
                                            <td>
                                                <button class="btn btn-sm btn-action btn-edit" onclick="editActivity('${activity.id}')" title="Editar">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-action btn-delete" onclick="deleteActivity('${activity.id}')" title="Excluir">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="8" class="text-center text-muted py-3">
                                                <i class="bi bi-inbox me-1"></i>
                                                Nenhuma atividade neste setor
                                            </td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(sectorElement);
        }
    });
}

function renderSectorFilters() {
    const container = document.getElementById('sectorFilterItems');
    if (!container) return;
    
    // Add "Ver Todos" checkbox
    container.innerHTML = `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" id="selectAllSectorsFilter" checked>
            <label class="form-check-label" for="selectAllSectorsFilter">
                <i class="bi bi-check-all"></i> Ver Todos
            </label>
        </div>
    `;
    
    // Add sector checkboxes
    sectors.forEach(sector => {
        container.innerHTML += `
            <div class="form-check">
                <input class="form-check-input sector-checkbox" type="checkbox" value="${sector.id}" id="sector_${sector.id}" checked>
                <label class="form-check-label" for="sector_${sector.id}">
                    <i class="bi ${sector.icon}"></i> ${sector.name}
                </label>
            </div>
        `;
    });
    
    // Add event listeners
    const selectAllCheckbox = document.getElementById('selectAllSectorsFilter');
    const sectorCheckboxes = document.querySelectorAll('.sector-checkbox');
    
    selectAllCheckbox.addEventListener('change', function() {
        sectorCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        renderSectorsTables();
    });
    
    sectorCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Se desmarcar algum setor, desmarca "Ver Todos"
            if (!this.checked) {
                selectAllCheckbox.checked = false;
            }
            
            // Se marcar todos os setores individualmente, marca "Ver Todos"
            const allChecked = Array.from(sectorCheckboxes).every(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            
            // Re-renderiza as tabelas
            renderSectorsTables();
        });
    });
    
    // Renderiza as tabelas após criar os filtros
    renderSectorsTables();
}

function handleSectorFilterChange() {
    const selectAllCheckbox = document.getElementById('selectAllSectorsFilter');
    const sectorCheckboxes = document.querySelectorAll('#sectorFilterItems input[type="checkbox"]');
    
    // Se desmarcar algum setor específico, desmarca "Ver Todos"
    if (!this.checked && this.id !== 'selectAllSectorsFilter') {
        selectAllCheckbox.checked = false;
    }
    
    // Se marcar "Ver Todos", marca todos os setores
    if (this.id === 'selectAllSectorsFilter' && this.checked) {
        sectorCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    }
    
    // Se marcar todos os setores individualmente, marca "Ver Todos"
    if (this.id !== 'selectAllSectorsFilter') {
        const allChecked = Array.from(sectorCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }
    
    // Re-renderiza as tabelas
    renderSectorsTables();
}

function getSelectedSectors() {
    const sectorCheckboxes = document.querySelectorAll('#sectorFilterItems input[type="checkbox"]:checked');
    return Array.from(sectorCheckboxes).map(checkbox => {
        const sectorId = checkbox.value;
        return sectors.find(s => s.id === sectorId);
    }).filter(Boolean);
}

function toggleSectorContent(sectorId) {
    const content = document.getElementById(`sector-content-${sectorId}`);
    const icon = document.getElementById(`sector-icon-${sectorId}`);
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-down');
    } else {
        content.classList.add('collapsed');
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
    }
}

function expandAllSectors() {
    sectors.forEach(sector => {
        const content = document.getElementById(`sector-content-${sector.id}`);
        const icon = document.getElementById(`sector-icon-${sector.id}`);
        
        if (content && icon) {
            content.classList.remove('collapsed');
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
        }
    });
}

function collapseAllSectors() {
    sectors.forEach(sector => {
        const content = document.getElementById(`sector-content-${sector.id}`);
        const icon = document.getElementById(`sector-icon-${sector.id}`);
        
        if (content && icon) {
            content.classList.add('collapsed');
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
        }
    });
}

function openSectorModal() {
    // Check if modal exists and is initialized
    if (!sectorModal) {
        sectorModal = new bootstrap.Modal(document.getElementById('sectorModal'));
    }
    
    currentSectorEditId = null;
    document.getElementById('sectorModalTitle').textContent = 'Novo Setor';
    document.getElementById('sectorForm').reset();
    document.getElementById('sectorId').value = '';
    
    sectorModal.show();
}

function editSector(id) {
    const sector = sectors.find(s => s.id === id);
    if (!sector) return;
    
    currentSectorEditId = id;
    document.getElementById('sectorModalTitle').textContent = 'Editar Setor';
    document.getElementById('sectorId').value = sector.id;
    document.getElementById('sectorName').value = sector.name;
    document.getElementById('sectorDescription').value = sector.description;
    document.getElementById('sectorIcon').value = sector.icon;
    
    sectorModal.show();
}

function saveSector() {
    const form = document.getElementById('sectorForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const sectorData = {
        name: document.getElementById('sectorName').value.trim(),
        description: document.getElementById('sectorDescription').value.trim(),
        icon: document.getElementById('sectorIcon').value
    };
    
    if (currentSectorEditId) {
        const index = sectors.findIndex(s => s.id === currentSectorEditId);
        if (index !== -1) {
            sectors[index] = { ...sectors[index], ...sectorData };
        }
    } else {
        sectors.push({
            id: generateSectorId(),
            ...sectorData
        });
    }
    
    saveSectors();
    renderSectorsTables();
    updateClassificationOptions();
    sectorModal.hide();
    
    showNotification(currentSectorEditId ? 'Setor atualizado com sucesso!' : 'Setor criado com sucesso!');
}

function deleteSector(id) {
    if (confirm('Tem certeza que deseja excluir este setor? Todas as atividades relacionadas serão desclassificadas.')) {
        // Remove classificação das atividades do setor
        activities.forEach(activity => {
            if (activity.classification === `setor-${id}`) {
                activity.classification = '';
            }
        });
        
        sectors = sectors.filter(s => s.id !== id);
        saveSectors();
        saveActivities();
        renderSectorsTables();
        renderActivities();
        updateClassificationOptionsForUser();
        showNotification('Setor excluído com sucesso!');
    }
}

function generateSectorId() {
    return 'SEC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function openSectorActivityModal(sectorId) {
    // Check if modal exists and is initialized
    if (!activityModal) {
        activityModal = new bootstrap.Modal(document.getElementById('activityModal'));
    }
    
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Nova Atividade';
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    
    // Find sector by ID to get the name
    const sector = sectors.find(s => s.id === sectorId);
    if (sector) {
        document.getElementById('classification').value = `setor-${sector.name}`;
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    const approvalStatus = getActivityApprovalStatus(sector ? sector.name : null);
    // Note: approvalStatus field doesn't exist in HTML, status will be set in saveActivity
    
    activityModal.show();
}

function openProjectActivityModal(projectId) {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Nova Atividade do Projeto';
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('classification').value = `projeto-${projectId}`;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    activityModal.show();
}

function getActivitiesByClassification(classification) {
    return activities.filter(activity => activity.classification === classification);
}

function toggleProjectCard(projectId) {
    const projectBody = document.getElementById(`project-body-${projectId}`);
    const icon = document.getElementById(`expand-icon-${projectId}`);
    
    if (projectBody.style.display === 'none') {
        projectBody.style.display = 'block';
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-down');
    } else {
        projectBody.style.display = 'none';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
    }
}

function addActivityToProject(projectId) {
    // Check if modal exists and is initialized
    if (!activityModal) {
        activityModal = new bootstrap.Modal(document.getElementById('activityModal'));
    }
    
    currentEditId = null;
    
    // Check if elements exist before trying to set them
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Nova Tarefa';
    }
    
    const activityForm = document.getElementById('activityForm');
    if (activityForm) {
        activityForm.reset();
    }
    
    const activityId = document.getElementById('activityId');
    if (activityId) {
        activityId.value = '';
    }
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    const startDate = document.getElementById('startDate');
    if (startDate) {
        startDate.value = today;
    }
    
    // Pre-select the project in classification
    const classificationSelect = document.getElementById('classification');
    if (classificationSelect) {
        // Wait a moment for the modal to be ready
        setTimeout(() => {
            classificationSelect.value = `projeto-${projectId}`;
        }, 100);
    }
    
    // Store the project context
    window.currentProjectContext = projectId;
    
    console.log('Opening activity modal for project:', projectId);
    activityModal.show();
}

function generateActivityId() {
    if (activities.length === 0) return 'ACT#001';
    const highestNumber = activities.reduce((max, activity) => {
        const match = activity.id.match(/^ACT#(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `ACT#${String(highestNumber + 1).padStart(3, '0')}`;
}



// Profile Functions
let userProfile = {
    name: '',
    email: '',
    role: '',
    avatar: '',
    darkMode: false
};

function loadUserProfile() {
    // Always create a fresh profile for the current user
    if (currentUser) {
        // Try to load existing profile for this specific user
        const storedProfiles = localStorage.getItem('userProfiles');
        let allProfiles = {};
        
        if (storedProfiles) {
            allProfiles = JSON.parse(storedProfiles);
        }
        
        // Get profile for current user or create new one
        if (allProfiles[currentUser.email]) {
            userProfile = allProfiles[currentUser.email];
        } else {
            userProfile = {
                name: currentUser.name || 'Usuário',
                email: currentUser.email || '',
                role: currentUser.role || 'Usuário',
                avatar: '', // Each user has their own avatar
                darkMode: false
            };
            allProfiles[currentUser.email] = userProfile;
            localStorage.setItem('userProfiles', JSON.stringify(allProfiles));
        }
    }
    
    updateSidebarProfile();
    applyDarkMode();
}

function saveUserProfile() {
    try {
        console.log('saveUserProfile called for user:', currentUser?.email);
        
        // Save profile for current user in the profiles object
        if (currentUser && currentUser.email) {
            console.log('Current user exists, proceeding...');
            
            // Get existing profiles or create new object
            let allProfiles = {};
            try {
                const storedProfiles = localStorage.getItem('userProfiles');
                if (storedProfiles) {
                    allProfiles = JSON.parse(storedProfiles);
                    console.log('Loaded existing profiles, count:', Object.keys(allProfiles).length);
                }
            } catch (parseError) {
                console.warn('Error parsing existing profiles, starting fresh:', parseError);
                allProfiles = {};
            }
            
            // Update current user profile
            allProfiles[currentUser.email] = userProfile;
            console.log('Updated profile for:', currentUser.email);
            
            // Convert to string and check size
            const profilesString = JSON.stringify(allProfiles);
            console.log('Profiles string length:', profilesString.length);
            
            // Check if data is too large for localStorage (2MB limit for safety)
            if (profilesString.length > 2 * 1024 * 1024) {
                console.warn('User profiles data is too large:', profilesString.length);
                showNotification('Erro: Dados de perfil muito grandes. Use uma imagem menor.', 'error');
                return false;
            }
            
            // Save to localStorage
            try {
                localStorage.setItem('userProfiles', profilesString);
                console.log('Successfully saved to localStorage');
                return true;
            } catch (storageError) {
                console.error('LocalStorage error:', storageError);
                showNotification('Erro ao salvar no armazenamento local. Limpe alguns dados.', 'error');
                return false;
            }
        } else {
            console.warn('No current user or email found');
            showNotification('Erro: Usuário não encontrado.', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error in saveUserProfile:', error);
        showNotification('Erro ao salvar perfil: ' + error.message, 'error');
        return false;
    }
}

function updateSidebarProfile() {
    const nameElement = document.getElementById('sidebarProfileName');
    const emailElement = document.getElementById('sidebarProfileEmail');
    const avatarElement = document.getElementById('sidebarProfileAvatar');
    
    if (nameElement) nameElement.textContent = userProfile.name;
    if (emailElement) emailElement.textContent = userProfile.email;
    
    if (avatarElement) {
        if (userProfile.avatar) {
            avatarElement.innerHTML = `<img src="${userProfile.avatar}" alt="Profile">`;
        } else {
            avatarElement.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    }
}

function loadProfilePage() {
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const roleInput = document.getElementById('profileRole');
    const avatarLarge = document.getElementById('profileAvatarLarge');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (nameInput) nameInput.value = userProfile.name;
    if (emailInput) emailInput.value = userProfile.email;
    if (roleInput) roleInput.value = userProfile.role;
    if (darkModeToggle) darkModeToggle.checked = userProfile.darkMode;
    
    if (avatarLarge) {
        if (userProfile.avatar) {
            avatarLarge.innerHTML = `<img src="${userProfile.avatar}" alt="Profile">`;
        } else {
            avatarLarge.innerHTML = '<i class="bi bi-person-circle"></i>';
        }
    }
}

function saveProfile() {
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const currentPasswordInput = document.getElementById('profileCurrentPassword');
    const newPasswordInput = document.getElementById('profileNewPassword');
    const confirmPasswordInput = document.getElementById('profileConfirmPassword');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Validate basic fields
    if (!nameInput.value.trim() || !emailInput.value.trim()) {
        showNotification('Nome e e-mail são obrigatórios.', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
        showNotification('E-mail inválido.', 'error');
        return;
    }
    
    // Check password change
    if (currentPasswordInput.value || newPasswordInput.value || confirmPasswordInput.value) {
        if (!currentPasswordInput.value || !newPasswordInput.value || !confirmPasswordInput.value) {
            showNotification('Preencha todos os campos de senha.', 'error');
            return;
        }
        
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            showNotification('Nova senha e confirmação não conferem.', 'error');
            return;
        }
        
        if (newPasswordInput.value.length < 6) {
            showNotification('A nova senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        
        // Here you would validate current password against stored password
        // For now, we'll just update it
        if (currentUser) {
            currentUser.password = newPasswordInput.value;
            saveUsers();
        }
    }
    
    // Update profile
    userProfile.name = nameInput.value.trim();
    userProfile.email = emailInput.value.trim();
    userProfile.darkMode = darkModeToggle.checked;
    
    // Update current user if exists
    if (currentUser) {
        currentUser.name = userProfile.name;
        currentUser.email = userProfile.email;
        saveUsers();
    }
    
    saveUserProfile();
    updateSidebarProfile();
    applyDarkMode();
    
    // Clear password fields
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    
    showNotification('Perfil atualizado com sucesso!');
}

function resetProfileForm() {
    loadProfilePage();
    document.getElementById('profileCurrentPassword').value = '';
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
}

// Profile Image Upload - Nova implementação simples
document.getElementById('profileImageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar arquivo
    if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        event.target.value = '';
        return;
    }
    
    if (!file.type.match('image.*')) {
        alert('Selecione apenas arquivos de imagem.');
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
        
        // Atualizar avatar grande na página de perfil
        const avatarLarge = document.getElementById('profileAvatarLarge');
        if (avatarLarge) {
            avatarLarge.innerHTML = `<img src="${e.target.result}" alt="Profile" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;">`;
        }
        
        alert('Foto de perfil atualizada com sucesso!');
    };
    
    reader.onerror = function() {
        alert('Erro ao ler o arquivo.');
    };
    
    reader.readAsDataURL(file);
    
    // Limpar input
    event.target.value = '';
});

function applyDarkMode() {
    const body = document.body;
    if (userProfile.darkMode) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

function toggleDarkMode() {
    userProfile.darkMode = !userProfile.darkMode;
    saveUserProfile();
    applyDarkMode();
}

// Event listeners - wrapped in try-catch to prevent crashes
document.addEventListener('DOMContentLoaded', function() {
    try {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', toggleDarkMode);
        }
        
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveProfile();
            });
        }
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
});
let currentSlide = 1;
const totalSlides = 4;
let slideInterval;
let isPaused = false;

function initializeActivitySlider() {
    updateSlideIndicator();
    startSlideAutoPlay();
    renderActivitySlides();
    setupSliderHoverEvents();
}

function setupSliderHoverEvents() {
    const sliderCard = document.getElementById('activitySliderCard');
    if (!sliderCard) return;
    
    // Pausar quando mouse entra no slider
    sliderCard.addEventListener('mouseenter', () => {
        isPaused = true;
        stopSlideAutoPlay();
        console.log('Slider pausado (mouse entrou)');
    });
    
    // Retomar quando mouse sai do slider
    sliderCard.addEventListener('mouseleave', () => {
        isPaused = false;
        resetSlideAutoPlay();
        console.log('Slider retomado (mouse saiu)');
    });
}

function renderActivitySlides() {
    renderLatestActivities();
    renderCompletedActivities();
    renderOverdueActivities();
    renderInProgressActivities();
}

function renderLatestActivities() {
    const container = document.getElementById('latestActivities');
    if (!container) return;
    
    const latestActivities = activities
        .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
        .slice(0, 3);
    
    if (latestActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-activities">
                <i class="bi bi-inbox"></i>
                <p>Nenhuma atividade encontrada</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = latestActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-item-header">
                <span class="activity-item-id">${activity.id}</span>
                <span class="activity-item-status status-badge status-${getStatusClass(activity.status)}">${activity.status}</span>
            </div>
            <div class="activity-item-description">
                ${activity.description}
                ${renderActivityNotes(activity.notes, activity.id)}
            </div>
            <div class="activity-item-meta">
                <div style="font-size: 0.9em;">${renderResponsibleWithAvatar(activity.responsible)}</div>
                <span><i class="bi bi-calendar"></i> ${formatDate(activity.startDate)}</span>
            </div>
        </div>
    `).join('');
}

function renderCompletedActivities() {
    const container = document.getElementById('completedActivitiesList');
    if (!container) return;
    
    const completedActivities = activities
        .filter(a => a.status === 'Concluída')
        .sort((a, b) => new Date(b.endDate || b.startDate) - new Date(a.endDate || a.startDate))
        .slice(0, 3);
    
    if (completedActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-activities">
                <i class="bi bi-check-circle"></i>
                <p>Nenhuma atividade concluída</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = completedActivities.map(activity => `
        <div class="activity-item completed">
            <div class="activity-item-header">
                <span class="activity-item-id">${activity.id}</span>
                <span class="activity-item-status status-badge status-concluida">Concluída</span>
            </div>
            <div class="activity-item-description">
                ${activity.description}
                ${renderActivityNotes(activity.notes, activity.id)}
            </div>
            <div class="activity-item-meta">
                <div style="font-size: 0.9em;">${renderResponsibleWithAvatar(activity.responsible)}</div>
                <span><i class="bi bi-calendar-check"></i> ${formatDate(activity.endDate)}</span>
            </div>
        </div>
    `).join('');
}

function renderOverdueActivities() {
    const container = document.getElementById('overdueActivities');
    if (!container) return;
    
    const overdueActivities = activities
        .filter(a => isActivityOverdue(a))
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
        .slice(0, 3);
    
    if (overdueActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-activities">
                <i class="bi bi-check-circle"></i>
                <p>Nenhuma tarefa atrasada</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = overdueActivities.map(activity => `
        <div class="activity-item overdue">
            <div class="activity-item-header">
                <span class="activity-item-id">${activity.id}</span>
                <span class="activity-item-status status-badge status-pendente">Atrasada</span>
            </div>
            <div class="activity-item-description">
                ${activity.description}
                ${renderActivityNotes(activity.notes, activity.id)}
            </div>
            <div class="activity-item-meta">
                <div style="font-size: 0.9em;">${renderResponsibleWithAvatar(activity.responsible)}</div>
                <span><i class="bi bi-exclamation-triangle"></i> ${getOverdueDays(activity)} dias de atraso</span>
                <span><i class="bi bi-calendar"></i> Prevista: ${formatDate(activity.endDate)}</span>
            </div>
        </div>
    `).join('');
}

function renderInProgressActivities() {
    const container = document.getElementById('inProgressActivitiesList');
    if (!container) return;
    
    const inProgressActivities = activities
        .filter(a => a.status === 'Em Andamento')
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3);
    
    if (inProgressActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-activities">
                <i class="bi bi-arrow-repeat"></i>
                <p>Nenhuma atividade em andamento</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = inProgressActivities.map(activity => `
        <div class="activity-item in-progress">
            <div class="activity-item-header">
                <span class="activity-item-id">${activity.id}</span>
                <span class="activity-item-status status-badge status-em-andamento">Em Andamento</span>
            </div>
            <div class="activity-item-description">
                ${activity.description}
                ${renderActivityNotes(activity.notes, activity.id)}
            </div>
            <div class="activity-item-meta">
                <div style="font-size: 0.9em;">${renderResponsibleWithAvatar(activity.responsible)}</div>
                <span><i class="bi bi-calendar"></i> Início: ${formatDate(activity.startDate)}</span>
                <span><i class="bi bi-calendar-check"></i> Previsão: ${formatDate(activity.endDate)}</span>
            </div>
        </div>
    `).join('');
}

function showSlide(slideNumber) {
    console.log(`showSlide: slideNumber=${slideNumber}`);
    
    // Hide all slides
    document.querySelectorAll('.slide').forEach(slide => {
        slide.style.display = 'none';
    });
    
    // Show current slide
    const currentSlideElement = document.querySelector(`[data-slide="${slideNumber}"]`);
    if (currentSlideElement) {
        currentSlideElement.style.display = 'block';
        console.log(`showSlide: mostrando slide ${slideNumber}`);
    } else {
        console.log(`showSlide: slide ${slideNumber} não encontrado`);
    }
    
    currentSlide = slideNumber;
    updateSlideIndicator();
    updateNavigationButtons();
}

function nextSlide() {
    const nextSlideNumber = currentSlide === totalSlides ? 1 : currentSlide + 1;
    console.log(`nextSlide: currentSlide=${currentSlide}, nextSlideNumber=${nextSlideNumber}`);
    showSlide(nextSlideNumber);
    
    // Reset timer apenas se não estiver pausado
    if (!isPaused) {
        resetSlideAutoPlay();
    }
}

function previousSlide() {
    const prevSlideNumber = currentSlide === 1 ? totalSlides : currentSlide - 1;
    showSlide(prevSlideNumber);
    
    // Reset timer apenas se não estiver pausado
    if (!isPaused) {
        resetSlideAutoPlay();
    }
}

function updateSlideIndicator() {
    const indicator = document.getElementById('slideIndicator');
    if (indicator) {
        indicator.textContent = `${currentSlide}/${totalSlides}`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    
    // Buttons are always enabled since it's a circular slider
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
}

function startSlideAutoPlay() {
    // Limpar intervalo anterior se existir
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
    
    // Não iniciar se estiver pausado
    if (isPaused) {
        console.log('startSlideAutoPlay: pausado, não iniciando');
        return;
    }
    
    console.log('startSlideAutoPlay: iniciando autoplay');
    slideInterval = setInterval(() => {
        // Verificar novamente se não está pausado antes de avançar
        if (!isPaused) {
            console.log('startSlideAutoPlay: executando nextSlide');
            nextSlide();
        } else {
            console.log('startSlideAutoPlay: pausado, não executando nextSlide');
        }
    }, 4000); // 4 segundos
}

function stopSlideAutoPlay() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

function resetSlideAutoPlay() {
    stopSlideAutoPlay();
    if (!isPaused) {
        startSlideAutoPlay();
    }
}
