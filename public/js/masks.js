// ---------- Máscaras ----------
function mascararTelefone(valor) {
  valor = valor.replace(/\D/g, '').slice(0, 11);
  if (valor.length > 10) return valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (valor.length > 6) return valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  if (valor.length > 2) return valor.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return valor;
}
function mascararCep(valor) {
  valor = valor.replace(/\D/g, '').slice(0, 8);
  if (valor.length > 5) return `${valor.slice(0, 5)}-${valor.slice(5)}`;
  return valor;
}
function mascararCnpj(valor) {
  valor = valor.replace(/\D/g, '').slice(0, 14);
  return valor
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
function mascararMoeda(valor) {
  valor = valor.replace(/\D/g, '');
  if (!valor) return '';
  const num = (Number(valor) / 100).toFixed(2);
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
function moedaParaNumero(valorMascarado) {
  return Number(String(valorMascarado).replace(/\./g, '').replace(',', '.')) || 0;
}

function aplicarMascaraEmTempoReal(input, fn) {
  input.addEventListener('input', () => {
    const posicao = input.selectionStart;
    const antes = input.value.length;
    input.value = fn(input.value);
    const depois = input.value.length;
    const novaPos = posicao + (depois - antes);
    input.setSelectionRange(novaPos, novaPos);
  });
}

// ---------- Consulta ViaCEP ----------
async function consultarCep(cep) {
  const limpo = cep.replace(/\D/g, '');
  if (limpo.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const data = await resp.json();
    if (data.erro) return null;
    return {
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    };
  } catch {
    return null;
  }
}
