import React from 'react';
import { Eye, MousePointer, Activity, TrendingUp, TrendingDown, Zap, Target, AlertTriangle } from 'lucide-react';
import { useMetrics } from '../../contexts/MetricsContext';
import MetricsFilter from '../../components/MetricsFilter.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '../../components/StatCard';

const DashboardMetrics = () => {
  const { 
    data, 
    dateRange, 
    setDateRange,
    refreshData,
    isFiltering,
    resetFiltersAndRetry 
  } = useMetrics();

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '0.0%';
    return value.toFixed(1) + '%';
  };

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
        {/* Header */}
        <div className="relative mb-8 animate-fade-in">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-30 bg-orange-600 blur-3xl"></div>
          <div className="absolute -top-10 right-40 w-32 h-32 rounded-full opacity-20 bg-purple-600 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-1 bg-gradient-to-b from-orange-500 to-purple-600 rounded-full"></div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Métricas de Performance</h1>
            </div>
            <p className="text-blue-300/80 mt-2 ml-4">
              Taxas e indicadores de performance das suas campanhas
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-[#202942]/60 backdrop-blur-md border border-white/8 rounded-xl p-5 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">Filtros e Configurações</h3>
            <MetricsFilter 
              data={data}
              dateRange={dateRange}
              setDateRange={setDateRange}
              isFiltering={isFiltering}
              refreshData={refreshData}
              resetFiltersAndRetry={resetFiltersAndRetry}
              isMobile={window.innerWidth < 768}
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
              icon={MousePointer}
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

        {/* Card informativo adicional */}
        <div className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl overflow-hidden shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
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
                      <span className="text-blue-300/70 text-sm">Taxa de Clique:</span>
                      <span className="text-white font-medium">{formatPercent(rates.clickRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">CTR:</span>
                      <span className="text-white font-medium">{formatPercent(rates.ctr)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white font-medium">Problemas</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Bounce:</span>
                      <span className="text-white font-medium">{formatPercent(rates.bounceRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Taxa de Descadastro:</span>
                      <span className="text-white font-medium">{formatPercent(rates.unsubscribeRate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">Total de Problemas:</span>
                      <span className="text-white font-medium">
                        {formatPercent(rates.bounceRate + rates.unsubscribeRate)}
                      </span>
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

export default DashboardMetrics;