# LambeLove CRM — versão limpa (sem troca de senha obrigatória)

Este pacote **remove** a troca de senha obrigatória no primeiro acesso e **adiciona** uma tela
para o administrador (Lambelove) resetar a senha de qualquer vendedora quando precisar.

## O que fazer, em ordem

### 1. Corrija as senhas no Supabase (SQL Editor) — ANTES de subir o código

```sql
-- Garante a extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Devolve a senha do admin para Julian@13 e destrava o login dele
UPDATE usuarios
SET senha_hash = crypt('Julian@13', gen_salt('bf', 10)),
    primeira_vez_login = false,
    atualizado_em = now()
WHERE nome_usuario ILIKE 'Lambelove';

-- Limpa a flag de "primeira vez" de todo mundo, pra ninguém ficar
-- preso em nenhuma tela de troca de senha antiga (a página não existe mais)
UPDATE usuarios
SET primeira_vez_login = false;
```

Depois de rodar isso, confirme com:
```sql
SELECT nome_usuario, perfil, primeira_vez_login FROM usuarios;
```
O Lambelove deve aparecer com `primeira_vez_login = false`. As vendedoras continuam com a
senha que estava valendo antes desse último reset (a `Trocar@2026`, se você seguiu o passo
anterior) — use a tela nova (`admin-reset-senha.html`) pra definir a senha de cada uma com calma,
sem pressa e sem SQL.

### 2. Suba os arquivos deste ZIP

```
netlify/functions/auth.js               → SOBRESCREVER (login limpo, sem troca de senha)
netlify/functions/admin-reset-senha.js  → ARQUIVO NOVO (reset de senha só pro admin)
public/index.html                       → SOBRESCREVER (sem redirecionamento)
public/admin-reset-senha.html           → ARQUIVO NOVO (tela de reset)
```

**Apague do seu repositório** (não estão mais nesse ZIP, pois não são mais usados):
```
netlify/functions/change-password.js
public/change-password.html
```
Se preferir não apagar por enquanto, sem problema — eles só ficam sem uso, não causam erro.

```bash
git add -A
git commit -m "fix: remove troca de senha obrigatoria, adiciona reset de senha pelo admin"
git push origin main
```

### 3. Teste

1. Login com `Lambelove` / `Julian@13` → deve ir direto pro dashboard, sem tela de troca de senha.
2. Acesse `/admin-reset-senha.html` (só funciona logado como admin).
3. Digite o usuário da vendedora (ex.: `Alessandra`) e uma senha nova (mín. 6 caracteres).
4. Peça pra ela testar o login com a senha que você definiu.

## Como funciona agora

- **Login:** simples, direto pro dashboard. Ninguém mais é forçado a trocar senha sozinho.
- **Reset de senha:** só o admin, autenticado, consegue resetar a senha de uma vendedora, pela
  tela `admin-reset-senha.html`. O endpoint bloqueia explicitamente qualquer tentativa de resetar
  a senha de uma conta com perfil `ADMIN` por essa via — inclusive a do próprio Lambelove.
- Toda troca de senha continua sendo registrada na tabela `historico` (ação `RESET_SENHA_ADMIN`),
  com quem fez e de qual IP.

## O que eu ainda não resolvi

Ainda não tenho o arquivo da sua função de **excluir usuário** (aquela que dava erro de acesso).
Se quiser que eu resolva isso também, me manda esse arquivo (provavelmente algo como
`netlify/functions/usuarios.js`) que eu já devolvo a correção.
