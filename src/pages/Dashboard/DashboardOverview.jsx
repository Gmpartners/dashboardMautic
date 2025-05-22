import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMetrics } from '../../contexts/MetricsContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import MetricsFilter from '../../components/MetricsFilter.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '../../components/StatCard';
import {
  Eye, MousePointerClick, TrendingUp, TrendingDown, Target, Zap, AlertTriangle, Activity
} from 'lucide-react';

const formatPercent = (value) => {
  if (value === null || value === undefined) return '0.0%';
  return value.toFixed(1) + '%';
};

const ModernTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-lg bg-[#202942]/80 border border-white/10 rounded-lg p-3 shadow-2xl max-w-xs">
        <p className="text-white font-medium mb-2 text-sm">
          {label || 'Métrica'}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between my-1">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></div>
              <span className="text-white/80 text-xs">{entry.name}:</span>
            </div>
            <span className="font-semibold ml-4 text-white text-xs">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardOverview = (props) => {
  const { 
    data, 
    dateRange, 
    setDateRange,
    refreshData,
    isFiltering,
    resetFiltersAndRetry,
    sendsData,
    opensData,
    clicksData,
    ratesData,
    accounts
  } = useMetrics();
  
  const [selectedAccounts, setSelectedAccounts] = useState(['all']);
  const [selectedEmails, setSelectedEmails] = useState(['none']);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log('🔍 [DashboardOverview] Dados recebidos:', {
      data,
      averages: data?.averages,
      sendsData,
      opensData,
      clicksData,
      ratesData
    });
    
    if (accounts && accounts.length > 0) {
      console.table(accounts.map(acc => ({
        id: acc.id,
        accountId: acc.accountId,
        name: acc.name,
        provider: acc.provider || 'desconhecido'
      })));
    }
  }, [accounts, data, sendsData, opensData, clicksData, ratesData]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dailyChartData = useMemo(() => {
    console.log('🔄 [DashboardOverview] Processando dados diários para gráficos', {
      sendsData,
      opensData,
      clicksData
    });
    
    if (!sendsData && !opensData && !clicksData) {
      console.log('ℹ️ [DashboardOverview] Dados diários incompletos, retornando array vazio');
      return [];
    }
    
    const datesToAdd = {};
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      datesToAdd[dateStr] = {
        date: dateStr,
        sends: 0,
        opens: 0,
        uniqueOpens: 0,
        clicks: 0,
        uniqueClicks: 0
      };
    }
    
    if (Array.isArray(sendsData)) {
      sendsData.forEach(item => {
        if (item && item.date) {
          const dateStr = new Date(item.date).toISOString().split('T')[0];
          if (datesToAdd[dateStr]) {
            const sendValue = item.totalSends || item.sends || item.count || 0;
            datesToAdd[dateStr].sends = sendValue;
            console.log(`✅ Processado dado de envio: ${dateStr} = ${sendValue}`);
          }
        }
      });
    }
    
    if (Array.isArray(opensData)) {
      opensData.forEach(item => {
        if (item && item.date) {
          const dateStr = new Date(item.date).toISOString().split('T')[0];
          if (datesToAdd[dateStr]) {
            const openValue = item.totalOpens || item.opens || item.count || 0;
            const uniqueOpenValue = item.uniqueOpens || 0;
            datesToAdd[dateStr].opens = openValue;
            datesToAdd[dateStr].uniqueOpens = uniqueOpenValue;
            console.log(`✅ Processado dado de abertura: ${dateStr} = ${openValue} (únicos: ${uniqueOpenValue})`);
          }
        }
      });
    }
    
    if (Array.isArray(clicksData)) {
      clicksData.forEach(item => {
        if (item && item.date) {
          const dateStr = new Date(item.date).toISOString().split('T')[0];
          if (datesToAdd[dateStr]) {
            const clickValue = item.totalClicks || item.clicks || item.count || 0;
            const uniqueClickValue = item.uniqueClicks || 0;
            datesToAdd[dateStr].clicks = clickValue;
            datesToAdd[dateStr].uniqueClicks = uniqueClickValue;
            console.log(`✅ Processado dado de clique: ${dateStr} = ${clickValue} (únicos: ${uniqueClickValue})`);
          }
        }
      });
    }
    
    const result = Object.values(datesToAdd).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    console.log(`✅ [DashboardOverview] Dados diários processados: ${result.length} dias`, result);
    return result;
  }, [sendsData, opensData, clicksData, dateRange]);

  const formatDateTick = (value) => {
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  
  const logDebugState = useCallback(() => {
    console.group('🔍 [DashboardOverview] Estado atual');
    console.log('Contas selecionadas:', selectedAccounts);
    console.log('Emails selecionados:', selectedEmails);
    console.log('Período:', dateRange);
    console.log('Contas disponíveis:', accounts);
    console.log('Dados diários:', {
      sendsData,
      opensData,
      clicksData
    });
    console.log('Dados de métricas API:', {
      data,
      totais: data?.totals,
      médias: data?.averages
    });
    console.groupEnd();
  }, [selectedAccounts, selectedEmails, dateRange, accounts, sendsData, opensData, clicksData, data]);

  // Extrair os rates dos dados
  const rates = data?.averages || {
    openRate: 0,
    uniqueOpenRate: 0,
    clickRate: 0,
    uniqueClickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0,
    ctr: 0,
    uniqueCtr: 0
  };
  
  return (
    <div className="px-6 py-8 w-full overflow-auto bg-gradient-to-b from-[#0c1020] to-[#131a32]">
      <div className="mx-auto max-w-full">
        {/* Header com efeito de fundo */}
        <div className="relative mb-8 animate-fade-in">
          {/* Efeito de luz de background */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-30 bg-indigo-600 blur-3xl"></div>
          <div className="absolute -top-10 right-40 w-32 h-32 rounded-full opacity-20 bg-purple-600 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard de Métricas</h1>
            </div>
            <p className="text-blue-300/80 mt-2 ml-4">
              Visualize as taxas de performance das suas campanhas de email marketing
            </p>
          </div>
        </div>
        
        {/* Debug Button - mantenha para desenvolvimento */}
        <button 
          onClick={logDebugState}
          className="mb-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs rounded-lg opacity-70 hover:opacity-100 shadow-md shadow-purple-600/20 transition-all hover:shadow-lg hover:shadow-purple-600/30"
        >
          Debug: Ver estado no console
        </button>
        
        {/* Filtros */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-[#202942]/60 backdrop-blur-md border border-white/8 rounded-xl p-5 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">Filtros e Configurações</h3>
            <MetricsFilter 
              data={data}
              selectedAccounts={selectedAccounts}
              setSelectedAccounts={setSelectedAccounts}
              selectedEmails={selectedEmails}
              setSelectedEmails={setSelectedEmails}
              dateRange={dateRange}
              setDateRange={setDateRange}
              isFiltering={isFiltering}
              refreshData={refreshData}
              resetFiltersAndRetry={resetFiltersAndRetry}
              isMobile={isMobile}
            />
          </div>
        </div>
        
        {/* Cards de Rates - Layout responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Taxa de Abertura */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.1s' }}>
            <StatCard 
              title="Taxa de Abertura" 
              value={formatPercent(rates.openRate)}
              icon={Eye}
              colorScheme="blue"
            />
          </div>

          {/* Taxa de Abertura Única */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.2s' }}>
            <StatCard 
              title="Taxa de Abertura Única" 
              value={formatPercent(rates.uniqueOpenRate)}
              icon={Target}
              colorScheme="teal"
            />
          </div>

          {/* Taxa de Clique */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.3s' }}>
            <StatCard 
              title="Taxa de Clique" 
              value={formatPercent(rates.clickRate)}
              icon={MousePointerClick}
              colorScheme="orange"
            />
          </div>

          {/* Taxa de Clique Único */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.4s' }}>
            <StatCard 
              title="Taxa de Clique Único" 
              value={formatPercent(rates.uniqueClickRate)}
              icon={Zap}
              colorScheme="pink"
            />
          </div>
        </div>

        {/* Segunda linha de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* CTR (Click-to-Open Rate) */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.5s' }}>
            <StatCard 
              title="CTR (Clique por Abertura)" 
              value={formatPercent(rates.ctr)}
              icon={Activity}
              colorScheme="purple"
            />
          </div>

          {/* CTR Único */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.6s' }}>
            <StatCard 
              title="CTR Único" 
              value={formatPercent(rates.uniqueCtr)}
              icon={TrendingUp}
              colorScheme="indigo"
            />
          </div>

          {/* Taxa de Bounce */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.7s' }}>
            <StatCard 
              title="Taxa de Bounce" 
              value={formatPercent(rates.bounceRate)}
              icon={TrendingDown}
              colorScheme="red"
            />
          </div>

          {/* Taxa de Descadastro */}
          <div className="animate-fade-in-up transform transition-all duration-500" style={{ animationDelay: '0.8s' }}>
            <StatCard 
              title="Taxa de Descadastro" 
              value={formatPercent(rates.unsubscribeRate)}
              icon={AlertTriangle}
              colorScheme="yellow"
            />
          </div>
        </div>

        {/* Gráfico de Série Temporal */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="bg-[#202942]/60 backdrop-blur-md border border-white/8 rounded-xl p-1 shadow-xl mb-4">
            <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl overflow-hidden shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg text-white tracking-tight">Evolução de Métricas</CardTitle>
                    <CardDescription className="text-blue-300/70">
                      {dateRange.from} até {dateRange.to}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                      Envios
                    </Badge>
                    <Badge variant="outline" className="bg-purple-600/20 text-purple-400 border-purple-500/30">
                      Aberturas
                    </Badge>
                    <Badge variant="outline" className="bg-teal-600/20 text-teal-400 border-teal-500/30">
                      Aberturas Únicas
                    </Badge>
                    <Badge variant="outline" className="bg-pink-600/20 text-pink-400 border-pink-500/30">
                      Cliques
                    </Badge>
                    <Badge variant="outline" className="bg-orange-600/20 text-orange-400 border-orange-500/30">
                      Cliques Únicos
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDateTick}
                          tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }} 
                          stroke="rgba(255, 255, 255, 0.1)"
                          axisLine={false}
                          tickLine={false}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }} 
                          stroke="rgba(255, 255, 255, 0.1)"
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip 
                          content={<ModernTooltip />} 
                          cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          iconType="circle"
                          iconSize={8}
                        />
                        
                        <Line 
                          type="monotone" 
                          dataKey="sends" 
                          stroke="#3b82f6" 
                          name="Envios"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#0c1020' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="opens" 
                          stroke="#8b5cf6" 
                          name="Aberturas"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#0c1020' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="uniqueOpens" 
                          stroke="#14b8a6" 
                          name="Aberturas Únicas"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#0c1020' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="clicks" 
                          stroke="#ec4899" 
                          name="Cliques"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#0c1020' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="uniqueClicks" 
                          stroke="#f97316" 
                          name="Cliques Únicos"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#0c1020' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-[#1a2240]/40 rounded-lg">
                      <div className="w-16 h-16 mb-4 text-indigo-400 opacity-80">
                        <TrendingUp className="w-16 h-16" />
                      </div>
                      <p className="text-white mb-1">Nenhum dado disponível para o período selecionado</p>
                      <p className="text-blue-300/70 text-sm text-center max-w-md">
                        Tente ajustar seus filtros ou selecionar outro período para visualizar dados
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Card informativo adicional */}
        <div className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl overflow-hidden shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Resumo das Taxas de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-white font-medium">Engagement</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Abertura:</span>
                      <span className="text-white font-medium">{formatPercent(rates.openRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Abertura Única:</span>
                      <span className="text-white font-medium">{formatPercent(rates.uniqueOpenRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Clique:</span>
                      <span className="text-white font-medium">{formatPercent(rates.clickRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Clique Única:</span>
                      <span className="text-white font-medium">{formatPercent(rates.uniqueClickRate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white font-medium">Performance & Problemas</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">CTR:</span>
                      <span className="text-white font-medium">{formatPercent(rates.ctr)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">CTR Único:</span>
                      <span className="text-white font-medium">{formatPercent(rates.uniqueCtr)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Bounce:</span>
                      <span className="text-white font-medium">{formatPercent(rates.bounceRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Descadastro:</span>
                      <span className="text-white font-medium">{formatPercent(rates.unsubscribeRate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;