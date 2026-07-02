// Configuração central do produto único vendido pela LambeLove.
// Se o preço, peso ou quantidade mínima mudar no futuro, basta editar aqui.
const PRODUTO = {
  nome: 'Lambelove - Pele e Pêlo 150g',
  preco_padrao: 59.00,
  preco_minimo: 59.00,
  preco_maximo: 89.00,
  quantidade_minima: 30,
  peso_unitario_kg: 0.2, // 200g por unidade
  // Caixa padrão estimada para um pedido mínimo (30 unidades). Ajuste se necessário.
  caixa_padrao: { comprimento_cm: 40, largura_cm: 30, altura_cm: 20, tara_kg: 0.5 },
};
