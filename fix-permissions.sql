-- Script para corrigir permissões RLS - PERMITIR TUDO
-- Execute este SQL diretamente no Supabase SQL Editor

-- 1. Desabilitar RLS completamente (solução mais radical)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Enable all operations for users" ON users;
DROP POLICY IF EXISTS "Enable all operations for sectors" ON sectors;
DROP POLICY IF EXISTS "Enable all operations for activities" ON activities;
DROP POLICY IF EXISTS "Enable all operations for projects" ON projects;

-- 3. Reabilitar RLS com políticas simplificadas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas únicas que permitem TUDO
CREATE POLICY "Enable all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for sectors" ON sectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- 5. Verificar se o usuário admin existe
SELECT * FROM users WHERE id = 'admin';

-- 6. Se não existir, criar novamente
INSERT INTO users (id, name, email, password, role, sector, permissions, active, created_at) 
VALUES (
    'admin',
    'Administrador',
    'admin@qualicode.com',
    'YWRtaW4xMjM=', -- Base64 para 'admin123'
    'admin',
    NULL,
    '{"activities": true, "dashboard": true, "projects": true, "users": true, "settings": true}',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 7. Verificação final
SELECT 'Users table:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Sectors table:', COUNT(*) FROM sectors
UNION ALL
SELECT 'Activities table:', COUNT(*) FROM activities
UNION ALL
SELECT 'Projects table:', COUNT(*) FROM projects;
