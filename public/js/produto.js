// Configuração central do produto único vendido pela LambeLove.
// Se o preço, peso ou quantidade mínima mudar no futuro, basta editar aqui.
const PRODUTO = {
  nome: 'Lambelove - Pele e Pêlo 150g',
  preco_padrao: 59.00, // valor sugerido, mostrado no topo do cartão do produto
  // LIBERADO TEMPORARIAMENTE (fase inicial de negociação livre por pedido).
  // Antes disso os valores eram: preco_minimo 49.00 / preco_maximo 89.00 /
  // quantidade_minima 30. Pra voltar a travar, é só restaurar esses 3 números.
  preco_minimo: 0.01,
  preco_maximo: 9999.99,
  quantidade_minima: 1,
  peso_unitario_kg: 0.2, // 200g por unidade
  // Caixa padrão estimada para um pedido mínimo (30 unidades). Ajuste se necessário.
  caixa_padrao: { comprimento_cm: 40, largura_cm: 30, altura_cm: 20, tara_kg: 0.5 },
};

// Compatível com o navegador (script simples, sem bundler, usa as variáveis
// direto no escopo global) e com o Node/Netlify Functions (via require),
// sem quebrar nenhum dos dois ambientes.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUTO };
}
