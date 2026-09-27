export function taxasMensais(selicAnual) {
  return {
    poupanca: selicAnual > 8.5 ? 0.005 : (1 + 0.7 * selicAnual / 100) ** (1 / 12) - 1,
    selic: (1 + selicAnual / 100) ** (1 / 12) - 1,
  };
}

export function simularRendimento({ saldoCentavos, aporteMensalCentavos = 0, meses = 12, selicAnual }) {
  const taxas = taxasMensais(selicAnual);
  let cofre = saldoCentavos / 100;
  let poupanca = cofre;
  let selic = cofre;
  const aporte = aporteMensalCentavos / 100;
  const serie = [{ mes: 0, cofre, poupanca, selic }];
  for (let mes = 1; mes <= meses; mes++) {
    cofre += aporte;
    poupanca = poupanca * (1 + taxas.poupanca) + aporte;
    selic = selic * (1 + taxas.selic) + aporte;
    serie.push({ mes, cofre, poupanca, selic });
  }
  const centavos = x => Math.round(x * 100) / 100;
  return {
    selicAnual,
    taxasMensais: { poupanca: Math.round(taxas.poupanca * 1e6) / 1e6, selic: Math.round(taxas.selic * 1e6) / 1e6 },
    serie: serie.map(p => ({ mes: p.mes, cofre: centavos(p.cofre), poupanca: centavos(p.poupanca), selic: centavos(p.selic) })),
    aviso: 'Simulação educativa com valores brutos (sem IR, taxas e TR). Não é recomendação de investimento.',
  };
}
