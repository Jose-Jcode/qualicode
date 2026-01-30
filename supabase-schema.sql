-- Schema SQL para Supabase - QualiCode System

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    sector VARCHAR(255),
    permissions JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir usuário administrador padrão
INSERT INTO users (id, name, email, password, role, sector, permissions, active) 
VALUES (
    'admin',
    'Administrador',
    'admin@qualicode.com',
    'YWRtaW4xMjM=', -- Base64 para 'admin123'
    'admin',
    NULL,
    '{"activities": true, "dashboard": true, "projects": true, "users": true, "settings": true}',
    true
) ON CONFLICT (id) DO NOTHING;

-- Tabela de Setores
CREATE TABLE IF NOT EXISTS sectors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'bi-building',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir setores padrão
INSERT INTO sectors (id, name, description, icon) VALUES
    ('SEC#1', 'Qualidade', 'Setor responsável pela gestão da qualidade', 'bi-shield-check'),
    ('SEC#2', 'Planejamento', 'Setor responsável pelo planejamento estratégico', 'bi-clipboard-data')
ON CONFLICT (id) DO NOTHING;

-- Tabela de Atividades
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    responsible VARCHAR(255),
    sector VARCHAR(255),
    classification VARCHAR(255),
    requestingSector VARCHAR(255),
    startDate DATE,
    endDate DATE,
    startTime TIME,
    endTime TIME,
    status VARCHAR(50) DEFAULT 'Pendente',
    priority VARCHAR(50) DEFAULT 'Média',
    progress INTEGER DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Em Andamento',
    startDate DATE,
    endDate DATE,
    progress INTEGER DEFAULT 0,
    activities TEXT[], -- Array de IDs de atividades
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_activities_sector ON activities(sector);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_classification ON activities(classification);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Usuários podem ver todos os dados (sistema colaborativo)
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update users" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete users" ON users
    FOR DELETE USING (true);

CREATE POLICY "Users can view all sectors" ON sectors
    FOR SELECT USING (true);

CREATE POLICY "Users can insert sectors" ON sectors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update sectors" ON sectors
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete sectors" ON sectors
    FOR DELETE USING (true);

CREATE POLICY "Users can view all activities" ON activities
    FOR SELECT USING (true);

CREATE POLICY "Users can insert activities" ON activities
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update activities" ON activities
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete activities" ON activities
    FOR DELETE USING (true);

CREATE POLICY "Users can view all projects" ON projects
    FOR SELECT USING (true);

CREATE POLICY "Users can insert projects" ON projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update projects" ON projects
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete projects" ON projects
    FOR DELETE USING (true);
