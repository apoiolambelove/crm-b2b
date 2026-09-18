# Manual de Operação — CRM B2B LambeLove

## 1. Acesso
1. Abra o endereço do CRM.
2. Entre com seu usuário e senha.
3. O administrador acessa todas as áreas; a vendedora trabalha com seus próprios clientes/pedidos e com seu estoque de consignação.

## 2. Cadastrar o cliente primeiro
1. Abra **Clientes**.
2. Clique em **Novo Cliente**.
3. Preencha o nome da empresa (obrigatório).
4. Informe CNPJ, inscrição estadual, sócio, telefone, WhatsApp e e-mail quando disponíveis.
5. Preencha o endereço e CEP.
6. Salve o cliente.

> O pedido deve ser vinculado a um cliente cadastrado. Se o cliente ainda não existir, cadastre-o antes de criar o pedido.

## 3. Criar um pedido
1. Abra **Novo Pedido**.
2. Selecione/localize a empresa.
3. Confira os dados do cliente e o endereço de entrega.
4. Escolha a **Origem do Pedido**:
   - **Matriz**: a empresa separa e envia o pedido.
   - **Consignação**: a vendedora já está com o produto e faz a entrega na hora da venda.
5. Informe a quantidade.
6. Use as referências comerciais:
   - **Pedido mínimo de referência:** 10 unidades.
   - **Preço padrão de referência:** R$ 59,00 por unidade.
   - **Acima de 50 unidades:** R$ 49,00 por unidade é uma sugestão de preço.
   - **Importante:** quantidade e preço **não são travados pelo sistema**. A vendedora pode alterar ambos conforme a negociação e podem existir exceções comerciais.
7. O valor total do produto é calculado automaticamente.
8. Escolha a forma de pagamento: Pix, Transferência ou Cartão de Crédito.

### Regra mínima
- O pedido precisa ter **no mínimo 10 unidades**.
- Pedidos de 1 a 9 unidades não podem ser salvos.
- O preço é validado de acordo com a faixa de quantidade.

## 4. Frete — Matriz
1. Confirme o CEP do cliente.
2. Clique em **Calcular Frete**.
3. O CRM consulta o **Melhor Envio**, que já está configurado.
4. Escolha a opção de frete apresentada, conforme a política atual do sistema.
5. Confira o valor do frete e o total geral.

**Não altere a configuração do Melhor Envio sem necessidade.**

## 5. Frete — Consignação
Na consignação, a entrega é feita pela própria vendedora no momento da venda. Por isso, o frete da Matriz não é aplicado ao pedido de consignação.

## 6. Estoque de consignação
O administrador registra as unidades entregues fisicamente para cada vendedora na área **Consignação**.

Quando a vendedora cria uma venda como **Consignação**:
- o sistema verifica o estoque disponível;
- se houver estoque suficiente, a quantidade é baixada imediatamente;
- se não houver estoque suficiente, a venda é bloqueada.

Se uma venda de consignação ativa for cancelada, alterada para Matriz, tiver a quantidade reduzida/aumentada ou for excluída, o sistema registra o movimento de estoque correspondente para manter o saldo correto.

## 7. Pagamento Mercado Pago
Para uma cobrança online:
1. Cadastre o pedido normalmente.
2. Na tela **Pedidos**, localize o pedido.
3. Clique no ícone de pagamento.
4. O CRM cria uma cobrança no **Mercado Pago**.
5. O link é copiado e também pode ser visualizado para envio ao cliente.
6. O cliente realiza o pagamento pelos meios disponibilizados pelo Checkout do Mercado Pago, conforme habilitação da conta.
7. O Mercado Pago envia a notificação ao CRM.
8. O CRM consulta novamente o Mercado Pago e registra o status real do pagamento.
9. Quando o pagamento é aprovado, o pedido passa automaticamente para **Venda Concluída**.

### Segurança
Nunca coloque `MERCADO_PAGO_ACCESS_TOKEN`, `SUPABASE_SERVICE_KEY` ou `JWT_SECRET` no GitHub, em HTML ou em mensagens compartilhadas.

## 8. Acompanhar pedidos
Em **Pedidos**, use os filtros de:
- cliente;
- cidade;
- CNPJ;
- telefone;
- número do pedido;
- status;
- origem (Matriz/Consignação);
- forma de pagamento;
- período.

Também é possível exportar os dados para PDF e Excel.

## 9. Status
- **Aguardando Aprovação:** pedido cadastrado e aguardando análise.
- **Venda Concluída:** venda efetivada.
- **Pendente de Pagamento:** pedido aguardando pagamento.
- **Não Efetivada:** venda não realizada.
- **Cancelada:** pedido cancelado.

## 10. Fechamento da consignação
O administrador pode consultar as vendas de consignação concluídas e realizar o fechamento semanal por vendedora.

O fechamento considera somente:
- pedidos da origem **Consignação**;
- status **Venda Concluída**;
- pedidos ainda não incluídos em outro repasse;
- período selecionado.

O sistema calcula o valor vendido, a comissão e o valor a repassar.

## 11. Rotina recomendada
### Vendedora
1. Cadastrar o cliente.
2. Criar o pedido.
3. Escolher Matriz ou Consignação.
4. Conferir quantidade e preço.
5. Calcular frete quando for Matriz.
6. Escolher o pagamento.
7. Salvar.
8. Enviar o link Mercado Pago quando necessário.
9. Acompanhar o status.

### Administrador
1. Conferir pedidos.
2. Acompanhar pagamentos.
3. Controlar entregas de estoque consignado.
4. Conferir vendas de consignação.
5. Fazer o fechamento semanal.
6. Confirmar recebimentos/repasses.

## 12. Início limpo do sistema
Depois que a nova versão estiver publicada e testada, o arquivo `supabase/reset_sistema.sql` pode ser executado no SQL Editor do Supabase.

Ele apaga os dados operacionais:
- clientes;
- pedidos;
- histórico;
- movimentos de consignação;
- repasses;
- pagamentos de comissão.

Os **usuários/login são preservados** e a numeração dos pedidos volta a começar em **#1001**.

**Não execute o reset antes de conferir que o CRM final está funcionando.**
