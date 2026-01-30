-- DESABILITAR RLS COMPLETAMENTE - SOLUÇÃO FINAL
-- Execute este SQL diretamente no Supabase SQL Editor

-- 1. DESABILITAR RLS EM TODAS AS TABELAS (SEM RLS = SEM RESTRIÇÕES)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Enable all for users" ON users;
DROP POLICY IF EXISTS "Enable all for sectors" ON sectors;
DROP POLICY IF EXISTS "Enable all for activities" ON activities;
DROP POLICY IF EXISTS "Enable all for projects" ON projects;

DROP POLICY IF EXISTS "Enable all operations for users" ON users;
DROP POLICY IF EXISTS "Enable all operations for sectors" ON sectors;
DROP POLICY IF EXISTS "Enable all operations for activities" ON activities;
DROP POLICY IF EXISTS "Enable all operations for projects" ON projects;

-- 3. VERIFICAR RLS ESTÁ DESABILITADO
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'sectors', 'activities', 'projects');

-- 4. VERIFICAR USUÁRIO ADMIN
SELECT * FROM users WHERE id = 'admin';

-- 5. SE NÃO EXISTIR, CRIAR ADMIN
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

-- 6. VERIFICAÇÃO FINAL
SELECT '=== VERIFICAÇÃO FINAL ===' as status;
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Sectors:', COUNT(*) FROM sectors
UNION ALL
SELECT 'Activities:', COUNT(*) FROM activities
UNION ALL
SELECT 'Projects:', COUNT(*) FROM projects;

-- 7. TESTE DE CONEXÃO DIRETA
SELECT 'Teste de conexão bem-sucedido!' as connection_test, NOW() as timestamp;
