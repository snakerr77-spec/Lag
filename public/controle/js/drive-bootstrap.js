(() => {
  "use strict";

  const emptyData = city => ({
    resumo: {
      fonte: `Nenhuma planilha encontrada para ${city}`,
      atualizadoEm: "—",
      exames: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 },
      consultas: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0, quantidadeLinhas: 0 },
      geral: { faturamento: 0, pagamento: 0, lucro: 0, quantidade: 0 }
    },
    exames: [],
    consultas: []
  });

  const settings = window.LAGSettings;
  const activeCity = settings?.getActiveCity?.()
    || settings?.getCurrentUser?.()?.unit
    || "Cerquilho";
  const files = window.LAG_DRIVE_MANIFEST?.cities?.[activeCity] || [];
  const preferred = files[0];

  window.LAG_DASHBOARD_DATA = preferred?.dashboardData || emptyData(activeCity);
  window.LAG_DASHBOARD_ACTIVE_SOURCE = preferred || null;
})();
