-- Script para criar usuário admin manualmente
-- Execute este SQL diretamente no Supabase SQL Editor

-- Inserir usuário administrador
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
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    sector = EXCLUDED.sector,
    permissions = EXCLUDED.permissions,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Verificar se o usuário foi criado
SELECT * FROM users WHERE id = 'admin';
