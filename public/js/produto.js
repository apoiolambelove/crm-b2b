// Configuração central do produto único vendido pela LambeLove.
// Valores padrão/referenciais do sistema; não são travas comerciais.
const PRODUTO = {
  nome: 'Lambelove - Pele e Pêlo 150g',
  preco_padrao: 59.00,
  preco_normal: 59.00,
  preco_volume: 49.00,
  quantidade_minima: 10,
  quantidade_volume: 51,
  peso_unitario_kg: 0.2,
  caixa_padrao: { comprimento_cm: 40, largura_cm: 30, altura_cm: 20, tara_kg: 0.5 },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUTO };
}
