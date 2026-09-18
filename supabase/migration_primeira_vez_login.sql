-- Migration: Adicionar suporte a troca de senha no primeiro acesso
-- Execute este script no SQL Editor do Supabase ANTES de redeploiar o código

-- Adiciona campo para rastrear se o usuário já alterou a senha
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS primeira_vez_login boolean NOT NULL DEFAULT true;

-- Adiciona campo para data/hora do primeiro acesso (opcional, para auditoria)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS primeiro_acesso_em timestamptz;

-- Índice para consultas de usuários que precisam alterar senha
CREATE INDEX IF NOT EXISTS idx_usuarios_primeira_vez_login 
ON usuarios (primeira_vez_login) 
WHERE ativo = true AND primeira_vez_login = true;
