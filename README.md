# CRM B2B — Pedidos Comerciais (Netlify + Supabase)

Sistema web completo para uma representante comercial registrar pedidos B2B,
com aprovação/comissão controlada pelo administrador, dashboard, relatórios,
histórico de alterações e exportação em PDF/Excel.

> **Por que Node.js + Supabase em vez de Java/Spring Boot?**
> O Netlify hospeda apenas sites estáticos e **funções serverless** (Node.js,
> Go, etc.) — ele não roda aplicações Java/Spring Boot nem bancos MySQL.
> Este projeto foi montado para funcionar 100% dentro do Netlify:
> - **Frontend**: HTML5 + CSS3 + JavaScript puro (pasta `public/`)
> - **Backend**: Netlify Functions em Node.js (pasta `netlify/functions/`)
> - **Banco de dados**: Supabase (Postgres gerenciado, com camada gratuita),
>   acessado apenas pelas Functions — o frontend nunca fala direto com o banco.
>
> Os dados ficam gravados permanentemente no Supabase, então qualquer pessoa
> que acessar o site (de qualquer computador) verá os mesmos pedidos, sem
> perda de dados.

---

## 1. Estrutura do projeto

```
crm-netlify/
├── netlify.toml                 # config do Netlify (functions + redirects /api/*)
├── package.json                 # dependências das functions
├── supabase/
│   └── schema.sql                # script completo de criação do banco
├── netlify/functions/
│   ├── utils/
│   │   ├── db.js                 # conexão com o Supabase (service_role key)
│   │   ├── http.js               # respostas JSON + CORS
│   │   └── auth.js                # geração/validação de JWT
│   ├── auth.js                    # login (+ seed automático dos 2 usuários iniciais)
│   ├── pedidos.js                 # criar / listar / editar / excluir / status
│   ├── usuarios.js                # gestão de usuários (admin)
│   ├── dashboard.js               # indicadores do dashboard
│   ├── relatorio.js               # relatório mensal
│   └── historico.js               # log de auditoria (nunca apagado)
└── public/
    ├── index.html                 # login
    ├── dashboard.html
    ├── novo-pedido.html            # cadastro/edição de pedido (com busca de CEP)
    ├── pedidos.html                 # pesquisa, filtros, exportação PDF/Excel
    ├── relatorios.html              # relatório mensal
    ├── historico.html
    ├── usuarios.html                 # somente admin
    ├── css/style.css
    └── js/ (api.js, ui.js, masks.js)
```

## 2. Passo a passo — Banco de dados (Supabase)

1. Crie uma conta gratuita em **https://supabase.com** e clique em **New project**.
2. Anote a **Database Password** que você definir (não é usada aqui diretamente, mas guarde).
3. Assim que o projeto for criado, vá em **SQL Editor → New query**.
4. Copie todo o conteúdo do arquivo `supabase/schema.sql` deste projeto, cole e clique em **Run**.
   Isso cria as tabelas `usuarios`, `clientes`, `pedidos`, `historico`, a view `vw_pedidos`
   e os gatilhos que calculam a comissão de 15% automaticamente.
5. Vá em **Project Settings → API** e copie dois valores, que serão usados no passo 3:
   - **Project URL** → variável `SUPABASE_URL`
   - **service_role key** (em "Project API keys") → variável `SUPABASE_SERVICE_KEY`
   - ⚠️ A `service_role` key tem acesso total ao banco. **Nunca** a coloque no
     frontend — ela é usada apenas dentro das Netlify Functions, via variável de ambiente.

## 3. Passo a passo — Deploy no Netlify

### Opção A — Deploy direto pela interface (mais simples)
1. Suba esta pasta inteira para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em **https://app.netlify.com**, clique em **Add new site → Import an existing project**
   e selecione o repositório.
3. O Netlify já vai detectar as configurações pelo `netlify.toml`
   (pasta de functions e pasta `public` como publish directory). Não é
   necessário comando de build.
4. Antes de finalizar (ou depois, em **Site settings → Environment variables**),
   adicione as variáveis de ambiente:
   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | a Project URL copiada no passo 2 |
   | `SUPABASE_SERVICE_KEY` | a service_role key copiada no passo 2 |
   | `JWT_SECRET` | qualquer texto longo e aleatório (ex: gere em https://randomkeygen.com) |
5. Clique em **Deploy site**. Em 1–2 minutos o site estará no ar em uma URL
   `algumnome.netlify.app` (você pode trocar o subdomínio ou apontar um domínio próprio depois).

### Opção B — Deploy pela CLI do Netlify
```bash
npm install -g netlify-cli
cd crm-netlify
netlify login
netlify init          # conecta/local a um site novo
netlify env:set SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set SUPABASE_SERVICE_KEY "sua-service-role-key"
netlify env:set JWT_SECRET "um-segredo-bem-grande-e-aleatorio"
netlify deploy --prod
```

## 4. Primeiro acesso

Os dois usuários abaixo são criados **automaticamente**, com senha
criptografada em BCrypt, na primeira vez que alguém tentar fazer login
(o sistema verifica se a tabela `usuarios` está vazia e, se estiver, cria
os dois de uma vez):

| Usuário | Senha | Perfil |
|---|---|---|
| `Alessandra` | `Favilla` | Vendedora |
| `Lambelove` | `Julian@13` | Administrador |

Depois do primeiro login, você pode (como Administrador, em **Usuários**)
cadastrar novas pessoas, trocar senhas ou desativar usuários — as senhas
nunca ficam em texto puro no banco, apenas o hash BCrypt.

## 5. Testar localmente antes de publicar (opcional)

```bash
npm install
npm install -g netlify-cli
netlify dev
```
Isso abre o site em `http://localhost:8888` já servindo as functions e o
frontend juntos, lendo as variáveis de ambiente de um arquivo `.env` na raiz
(crie um com `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`).

## 6. O que já está implementado

- **Login com JWT** (expira em 8h → logout automático) e senhas com BCrypt.
- **Permissões por perfil**: Vendedora só edita pedidos "Aguardando Aprovação"
  e não pode excluir, alterar status ou mexer em usuários; Administrador
  tem acesso total, incluindo mudar status e gerenciar a equipe.
- **Cadastro de pedido** com todos os campos pedidos, busca automática de
  endereço por CEP (ViaCEP) e máscaras de telefone, CNPJ, CEP e moeda (R$).
- **Comissão de 15%** calculada automaticamente pelo banco (coluna gerada);
  só é considerada "aprovada" quando o Administrador marca o pedido como
  "Venda Concluída" — antes disso fica como "Comissão Pendente".
- **Dashboard** com todos os indicadores pedidos (pedidos do dia/mês,
  status, comissões previstas/aprovadas) e gráfico de vendas por mês.
- **Relatório mensal** por mês/ano com exportação em PDF, Excel e impressão.
- **Pesquisa/filtros** por cliente, cidade, CNPJ, telefone, número do
  pedido, período, status e forma de pagamento — com exportação PDF/Excel.
- **Histórico/auditoria**: toda criação, edição, exclusão e mudança de
  status grava usuário, data, hora e IP — nunca é apagado.
- **Tema claro/escuro**, layout com menu lateral responsivo (funciona em
  computador, tablet e celular).

## 7. Limitações a saber

- O Netlify Functions tem um limite de tempo de execução generoso para este
  tipo de uso (bem além do necessário aqui), mas se o volume de pedidos
  crescer muito no futuro, considere paginação nas listagens (hoje o
  limite é de 500 registros por consulta).
- CSRF clássico (baseado em cookies de sessão) não se aplica da mesma forma
  aqui porque a autenticação é feita por token JWT no header
  `Authorization`, que não é enviado automaticamente pelo navegador em
  requisições de terceiros — isso já elimina a superfície de ataque CSRF
  tradicional.
