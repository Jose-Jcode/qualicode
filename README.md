# QualiCode - Sistema de Gerenciamento

Sistema web para gerenciamento de atividades, projetos e setores com autenticação e controle de permissões.

## Recursos

- ✅ Gestão de atividades por setor
- ✅ Gerenciamento de projetos
- ✅ Dashboard com analytics
- ✅ Sistema de usuários com permissões
- ✅ Perfil de usuário com foto
- ✅ Modo claro/escuro
- ✅ Interface responsiva

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Hospedagem**: Netlify
- **UI Framework**: Bootstrap 5

## Instalação Local

### Pré-requisitos
- Node.js 16+ (opcional)
- Python 3.6+ (para servidor de desenvolvimento)

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/qualicode.git
cd qualicode
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

3. Edite `.env.local` com suas credenciais do Supabase:
```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
python -m http.server 8000
```

5. Abra no navegador: `http://localhost:8000`

## Configuração do Supabase

### Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Preencha os dados e aguarde a criação
4. Copie a URL e chave anônima em "Settings > API"

### Criar tabelas

Execute as seguintes migrations no Supabase SQL Editor:

```sql
-- Tabela de Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  sector TEXT,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Setores
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  responsible UUID REFERENCES users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Atividades
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  responsible UUID REFERENCES users(id),
  requesting_sector TEXT,
  start_date DATE,
  end_date DATE,
  classification TEXT,
  status TEXT DEFAULT 'pendente',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Deploy no Netlify

### Opção 1: Conectar GitHub (Recomendado)

1. Faça push do projeto no GitHub
2. Acesse [netlify.com](https://netlify.com)
3. Clique em "New site from Git"
4. Selecione seu repositório
5. Configure as variáveis de ambiente em "Site settings > Build & deploy > Environment"
6. Deploy automático a cada push!

### Opção 2: Deploy Manual

```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

## Uso

### Criar Conta
- Email: `admin@qualicode.com`
- Senha: `admin123` (altere após primeiro login)

### Funcionalidades Principais

- **Atividades**: Crie tarefas por setor com atribuição de responsáveis
- **Projetos**: Organize projetos com atividades vinculadas
- **Dashboard**: Visualize atividades em tempo real
- **Perfil**: Personalize seu perfil com foto e informações

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## Contato

- Email: contato@qualicode.com
- GitHub: [seu-usuario/qualicode](https://github.com/seu-usuario/qualicode)
