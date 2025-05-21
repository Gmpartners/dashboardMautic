import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, ChevronLeft, ChevronRight, Mail, ArrowUpDown, 
  GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, AlertCircle, 
  Building, RefreshCw, MousePointerClick, Calendar, Target, Zap, BarChart3
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import MetricsFilter from '../../components/MetricsFilter.jsx';
import { useMetrics } from '../../contexts/MetricsContext';
import { useAuthContext } from '../../hooks/useAuthContext';

/**
 * Componente DashboardEmails
 * Dashboard para análise detalhada de métricas por email
 * Integrado com Mautic via API própria
 */
const DashboardEmails = (props) => {
  const { user } = useAuthContext();
  const { 
    data, 
    accounts,
    emailMetricsLoading,
    dateRange, 
    setDateRange,
    selectedMautic, 
    setSelectedMautic,
    showBounced, 
    setShowBounced,
    isFiltering,
    refreshData,
    resetFiltersAndRetry,
    noDataAvailable,
    loadError
  } = useMetrics();

  // Estados locais
  const [selectedAccounts, setSelectedAccounts] = useState(['all']);
  const [selectedEmails, setSelectedEmails] = useState(['none']);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('lastSentDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const itemsPerPage = 15;
  const mainContentRef = useRef(null);
  
  // Configuração de colunas seguindo padrão do projeto
  const initialColumns = [
    { 
      id: 'subject', 
      name: 'Assunto', 
      visible: true, 
      sortable: true, 
      type: 'text',
      description: 'Assunto da campanha de email',
      priority: 1
    },
    { 
      id: 'campaign', 
      name: 'Campanha', 
      visible: true, 
      sortable: true, 
      type: 'text',
      description: 'Nome da campanha no Mautic',
      priority: 2
    },
    { 
      id: 'lastSentDate', 
      name: 'Data de Envio', 
      visible: true, 
      sortable: true, 
      type: 'date',
      description: 'Última data de envio da campanha',
      priority: 3
    },
    { 
      id: 'sentCount', 
      name: 'Enviados', 
      visible: true, 
      sortable: true, 
      type: 'number',
      description: 'Total de emails enviados',
      priority: 4
    },
    { 
      id: 'openCount', 
      name: 'Aberturas', 
      visible: true, 
      sortable: true, 
      type: 'number',
      description: 'Total de emails abertos',
      priority: 5
    },
    { 
      id: 'clickCount', 
      name: 'Cliques', 
      visible: true, 
      sortable: true, 
      type: 'number',
      description: 'Total de cliques nos emails',
      priority: 6
    },
    { 
      id: 'openRate', 
      name: 'Taxa de Abertura', 
      visible: true, 
      sortable: true,
      type: 'percentage',
      description: 'Percentual de emails abertos em relação aos enviados',
      priority: 7
    },
    { 
      id: 'clickRate', 
      name: 'Taxa de Clique', 
      visible: true, 
      sortable: true,
      type: 'percentage',
      description: 'Percentual de cliques em relação aos emails enviados',
      priority: 8
    },
    { 
      id: 'clickToOpenRate', 
      name: 'Clique/Abertura', 
      visible: true, 
      sortable: true,
      type: 'percentage',
      description: 'Percentual de cliques em relação aos emails abertos',
      priority: 9
    },
    { 
      id: 'bounceCount', 
      name: 'Bounces', 
      visible: showBounced, 
      sortable: true, 
      type: 'number',
      description: 'Número de emails que retornaram (bounce)',
      priority: 10
    },
    { 
      id: 'unsubscribeCount', 
      name: 'Descadastros', 
      visible: false, 
      sortable: true, 
      type: 'number',
      description: 'Número de descadastros gerados',
      priority: 11
    },
    { 
      id: 'unsubscribeRate', 
      name: 'Taxa de Descadastro', 
      visible: false, 
      sortable: true,
      type: 'percentage',
      description: 'Percentual de descadastros em relação aos emails enviados',
      priority: 12
    },
    { 
      id: 'account', 
      name: 'Conta', 
      visible: true, 
      sortable: true, 
      type: 'account',
      description: 'Conta Mautic responsável pelo email',
      priority: 13
    }
  ];
  
  const [columns, setColumns] = useState([...initialColumns]);
  const [draggingColumnId, setDraggingColumnId] = useState(null);

  // Effects seguindo padrão do projeto
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    setTimeout(() => {
      setMounted(true);
    }, 200);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccounts, selectedMautic, dateRange, showBounced, searchTerm]);

  useEffect(() => {
    setColumns(prev => 
      prev.map(col => 
        col.id === 'bounceCount' 
          ? { ...col, visible: showBounced } 
          : col
      )
    );
  }, [showBounced]);

  // Funções para calcular taxas
  const calculateOpenRate = useCallback((sent, opened) => {
    if (!sent || sent === 0) return 0;
    return (opened || 0) / sent * 100;
  }, []);

  const calculateClickRate = useCallback((opened, clicked) => {
    if (!opened || opened === 0) return 0;
    return (clicked || 0) / opened * 100;
  }, []);

  const calculateClickToSentRate = useCallback((sent, clicked) => {
    if (!sent || sent === 0) return 0;
    return (clicked || 0) / sent * 100;
  }, []);

  // Funções de formatação seguindo padrão do projeto
  const formatNumber = useCallback((num) => {
    if (num === null || num === undefined) return '0';
    if (num === 0) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }, []);
  
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return '-';
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return '-';
    }
  }, []);
  
  const formatPercent = useCallback((value) => {
    if (value === null || value === undefined) return '0%';
    return value.toFixed(1) + '%';
  }, []);

  // Extração de dados seguindo padrão do projeto
  const emailFilteredData = useMemo(() => {
    console.log('🔍 [DashboardEmails] Dados de email recebidos:', data?.emailData);
    return data?.emailData || [];
  }, [data]);

  // Função para obter valor da célula
  const getCellValue = useCallback((item, columnId) => {
    if (!item) return '';
    
    const metrics = item.metrics || item;
    
    switch (columnId) {
      case 'subject': 
        const subject = item.subject || metrics.subject;
        return typeof subject === 'object' ? (subject.name || subject.title || '-') : (subject || '-');
      case 'campaign': 
        const campaign = item.campaign || metrics.campaign;
        return typeof campaign === 'object' ? (campaign.name || campaign.title || '-') : (campaign || '-');
      case 'lastSentDate': 
        const sentDate = item.lastSentDate || item.sentDate || metrics.lastSentDate;
        return sentDate ? formatDate(sentDate) : '-';
      case 'sentCount': return metrics.sentCount || metrics.sent || 0;
      case 'openCount': return metrics.openCount || metrics.opened || 0;
      case 'clickCount': return metrics.clickCount || metrics.clicked || 0;
      case 'unsubscribeCount': return metrics.unsubscribeCount || metrics.unsubscribed || 0;
      case 'bounceCount': return metrics.bounceCount || metrics.bounced || 0;
      case 'openRate': 
        if (metrics.openRate !== undefined) return formatPercent(metrics.openRate);
        const sentForOpen = metrics.sentCount || metrics.sent || 0;
        const opened = metrics.openCount || metrics.opened || 0;
        return formatPercent(calculateOpenRate(sentForOpen, opened));
      case 'clickToOpenRate': 
        if (metrics.clickToOpenRate !== undefined) return formatPercent(metrics.clickToOpenRate);
        const openedForClick = metrics.openCount || metrics.opened || 0;
        const clicked = metrics.clickCount || metrics.clicked || 0;
        return formatPercent(calculateClickRate(openedForClick, clicked));
      case 'clickRate': 
        if (metrics.clickRate !== undefined) return formatPercent(metrics.clickRate);
        const sentForClickRate = metrics.sentCount || metrics.sent || 0;
        const clickedForRate = metrics.clickCount || metrics.clicked || 0;
        return formatPercent(calculateClickToSentRate(sentForClickRate, clickedForRate));
      case 'unsubscribeRate': 
        if (metrics.unsubscribeRate !== undefined) return formatPercent(metrics.unsubscribeRate);
        const sentForUnsub = metrics.sentCount || metrics.sent || 0;
        const unsubscribed = metrics.unsubscribeCount || metrics.unsubscribed || 0;
        return sentForUnsub > 0 ? formatPercent((unsubscribed / sentForUnsub) * 100) : '0%';
      case 'account': 
        const account = item.account || item.mauticAccount;
        if (typeof account === 'object') {
          return account?.name || account?.title || 'Conta não especificada';
        }
        return account || 'Conta não especificada';
      default: return '-';
    }
  }, [formatDate, formatPercent, calculateOpenRate, calculateClickRate, calculateClickToSentRate]);
  
  // Função para obter valor bruto para ordenação
  const getRawCellValue = useCallback((item, columnId) => {
    if (!item) return '';
    
    const metrics = item.metrics || item;
    
    switch (columnId) {
      case 'subject': 
        const subject = item.subject || metrics.subject;
        return typeof subject === 'object' ? (subject.name || subject.title || '') : (subject || '');
      case 'campaign': 
        const campaign = item.campaign || metrics.campaign;
        return typeof campaign === 'object' ? (campaign.name || campaign.title || '') : (campaign || '');
      case 'lastSentDate': 
        const sentDate = item.lastSentDate || item.sentDate || metrics.lastSentDate;
        return sentDate ? new Date(sentDate).getTime() : 0;
      case 'sentCount': return metrics.sentCount || metrics.sent || 0;
      case 'openCount': return metrics.openCount || metrics.opened || 0;
      case 'clickCount': return metrics.clickCount || metrics.clicked || 0;
      case 'unsubscribeCount': return metrics.unsubscribeCount || metrics.unsubscribed || 0;
      case 'bounceCount': return metrics.bounceCount || metrics.bounced || 0;
      case 'openRate': 
        if (metrics.openRate !== undefined) return parseFloat(metrics.openRate);
        const sentForOpen = metrics.sentCount || metrics.sent || 0;
        const opened = metrics.openCount || metrics.opened || 0;
        return calculateOpenRate(sentForOpen, opened);
      case 'clickToOpenRate': 
        if (metrics.clickToOpenRate !== undefined) return parseFloat(metrics.clickToOpenRate);
        const openedForClick = metrics.openCount || metrics.opened || 0;
        const clicked = metrics.clickCount || metrics.clicked || 0;
        return calculateClickRate(openedForClick, clicked);
      case 'clickRate': 
        if (metrics.clickRate !== undefined) return parseFloat(metrics.clickRate);
        const sentForClickRate = metrics.sentCount || metrics.sent || 0;
        const clickedForRate = metrics.clickCount || metrics.clicked || 0;
        return calculateClickToSentRate(sentForClickRate, clickedForRate);
      case 'unsubscribeRate': 
        if (metrics.unsubscribeRate !== undefined) return parseFloat(metrics.unsubscribeRate);
        const sentForUnsub = metrics.sentCount || metrics.sent || 0;
        const unsubscribed = metrics.unsubscribeCount || metrics.unsubscribed || 0;
        return sentForUnsub > 0 ? (unsubscribed / sentForUnsub) * 100 : 0;
      case 'account': 
        const account = item.account || item.mauticAccount;
        if (typeof account === 'object') {
          return account?.name || account?.title || '';
        }
        return account || '';
      default: return '';
    }
  }, [calculateOpenRate, calculateClickRate, calculateClickToSentRate]);
  
  // Filtros e ordenação
  const filteredData = useMemo(() => {
    let filtered = emailFilteredData;
    
    // Filtro por contas selecionadas
    if (!selectedAccounts.includes('all') && selectedAccounts.length > 0) {
      filtered = filtered.filter(item => {
        const accountName = item.account?.name || item.mauticAccount;
        return selectedAccounts.includes(accountName);
      });
    }
    
    // Filtro por conta Mautic
    if (selectedMautic && selectedMautic !== 'Todos') {
      filtered = filtered.filter(item => 
        (item.account?.name || item.mauticAccount) === selectedMautic
      );
    }
    
    // Filtro de bounces
    if (!showBounced) {
      filtered = filtered.filter(item => {
        const metrics = item.metrics || item;
        const bounces = metrics.bounceCount || metrics.bounced || 0;
        return bounces === 0;
      });
    }
    
    // Filtro por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const subject = item.subject || '';
        const campaign = item.campaign || '';
        const account = item.account?.name || item.mauticAccount || '';
        
        const subjectStr = typeof subject === 'object' ? (subject.name || subject.title || '') : String(subject);
        const campaignStr = typeof campaign === 'object' ? (campaign.name || campaign.title || '') : String(campaign);
        const accountStr = typeof account === 'object' ? (account.name || account.title || '') : String(account);
        
        return subjectStr.toLowerCase().includes(searchLower) ||
               campaignStr.toLowerCase().includes(searchLower) ||
               accountStr.toLowerCase().includes(searchLower);
      });
    }
    
    console.log('🔍 [DashboardEmails] Dados filtrados:', {
      original: emailFilteredData.length,
      filtered: filtered.length,
      filters: { selectedAccounts, selectedMautic, showBounced, searchTerm }
    });
    
    return filtered;
  }, [emailFilteredData, searchTerm, selectedAccounts, selectedMautic, showBounced]);
  
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = getRawCellValue(a, sortColumn);
      const bValue = getRawCellValue(b, sortColumn);
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection, getRawCellValue]);
  
  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  
  // Handlers
  const handleSort = useCallback((columnId) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);
  
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  }, [totalPages]);
  
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);
  
  const toggleColumnVisibility = useCallback((columnId) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);
  
  // Drag and Drop para colunas
  const handleDragStart = useCallback((e, columnId) => {
    setDraggingColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggingColumnId && draggingColumnId !== columnId) {
      const draggedColumnIndex = columns.findIndex(col => col.id === draggingColumnId);
      const targetColumnIndex = columns.findIndex(col => col.id === columnId);
      
      if (draggedColumnIndex !== -1 && targetColumnIndex !== -1) {
        const newColumns = [...columns];
        const [draggedColumn] = newColumns.splice(draggedColumnIndex, 1);
        newColumns.splice(targetColumnIndex, 0, draggedColumn);
        
        setColumns(newColumns);
      }
    }
  }, [draggingColumnId, columns]);
  
  const handleDragEnd = useCallback(() => {
    setDraggingColumnId(null);
  }, []);

  // Rendering de células seguindo padrão do projeto
  const renderCellContent = useCallback((columnId, value, item) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return value;
    
    const metrics = item.metrics || item;
    
    switch (column.type) {
      case 'percentage': {
        const numValue = parseFloat(value.replace(',', '.').replace('%', ''));
        let thresholds;
        let colorClass;
        
        if (columnId === 'unsubscribeRate') {
          thresholds = { low: 0.5, medium: 2, high: 5 };
          if (numValue < thresholds.low) colorClass = 'bg-green-500/20 text-green-300 border-green-500/20';
          else if (numValue < thresholds.medium) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
          else if (numValue < thresholds.high) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/20';
          else colorClass = 'bg-red-500/20 text-red-300 border-red-500/20';
        } else if (columnId === 'openRate') {
          thresholds = { low: 15, medium: 25, high: 35 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/20';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/20';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else if (columnId === 'clickRate') {
          thresholds = { low: 2, medium: 5, high: 10 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/20';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/20';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else if (columnId === 'clickToOpenRate') {
          thresholds = { low: 10, medium: 20, high: 30 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/20';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/20';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else {
          colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Badge variant="outline" className={`${colorClass}`}>
                    {value}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 px-3 py-2">
                <p className="font-medium">{column.description}</p>
                {columnId === 'openRate' && (
                  <div className="mt-1 text-xs space-y-1">
                    <p>Abertos: {formatNumber(metrics.openCount || metrics.opened || 0)}</p>
                    <p>Enviados: {formatNumber(metrics.sentCount || metrics.sent || 0)}</p>
                  </div>
                )}
                {columnId === 'clickRate' && (
                  <div className="mt-1 text-xs space-y-1">
                    <p>Cliques: {formatNumber(metrics.clickCount || metrics.clicked || 0)}</p>
                    <p>Enviados: {formatNumber(metrics.sentCount || metrics.sent || 0)}</p>
                  </div>
                )}
                {columnId === 'clickToOpenRate' && (
                  <div className="mt-1 text-xs space-y-1">
                    <p>Cliques: {formatNumber(metrics.clickCount || metrics.clicked || 0)}</p>
                    <p>Abertos: {formatNumber(metrics.openCount || metrics.opened || 0)}</p>
                  </div>
                )}
                {columnId === 'unsubscribeRate' && (
                  <div className="mt-1 text-xs space-y-1">
                    <p>Descadastros: {formatNumber(metrics.unsubscribeCount || metrics.unsubscribed || 0)}</p>
                    <p>Enviados: {formatNumber(metrics.sentCount || metrics.sent || 0)}</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      case 'number': {
        const numValue = parseInt(value, 10);
        let colorClass = "text-slate-300";
        let icon = null;
        
        if (columnId === 'bounceCount') {
          colorClass = numValue > 10 ? "text-red-400" : "text-slate-300";
          if (numValue > 0) icon = <AlertCircle className="h-3 w-3 mr-1" />;
        } else if (columnId === 'clickCount') {
          colorClass = numValue > 100 ? "text-green-400" : numValue > 50 ? "text-orange-400" : "text-slate-300";
          icon = <MousePointerClick className="h-3 w-3 mr-1" />;
        } else if (columnId === 'openCount') {
          colorClass = numValue > 100 ? "text-green-400" : numValue > 50 ? "text-orange-400" : "text-slate-300";
          icon = <Eye className="h-3 w-3 mr-1" />;
        } else if (columnId === 'sentCount') {
          icon = <Mail className="h-3 w-3 mr-1" />;
        }
        
        return (
          <div className={`font-medium ${colorClass} flex items-center`}>
            {icon}
            {formatNumber(numValue)}
          </div>
        );
      }
      
      case 'date': {
        if (value === '-') return <span className="text-slate-500">-</span>;
        
        const [datePart, timePart] = value.split(' ');
        
        return (
          <div className="flex flex-col">
            <span className="text-slate-300 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {datePart}
            </span>
            {timePart && <span className="text-slate-500 text-xs ml-4">{timePart}</span>}
          </div>
        );
      }
      
      case 'account': {
        if (value === '-' || value === 'Conta não especificada') {
          return <span className="text-slate-500">-</span>;
        }
        
        return (
          <div className="flex items-center">
            <Building className="h-3 w-3 mr-2 text-blue-400" />
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {value}
            </Badge>
          </div>
        );
      }
      
      case 'text':
      default: {
        if (value === '-') return <span className="text-slate-500">-</span>;
        
        if (columnId === 'subject') {
          return (
            <div className="flex items-center">
              <Target className="h-3 w-3 mr-2 text-orange-400" />
              <span className="text-slate-200 font-medium" title={value}>
                {value.length > 50 ? value.substring(0, 50) + '...' : value}
              </span>
            </div>
          );
        }
        
        if (columnId === 'campaign') {
          return (
            <div className="flex items-center">
              <Zap className="h-3 w-3 mr-2 text-green-400" />
              <span className="text-slate-300" title={value}>
                {value.length > 30 ? value.substring(0, 30) + '...' : value}
              </span>
            </div>
          );
        }
        
        return <span className="text-slate-300">{value}</span>;
      }
    }
  }, [columns, formatNumber]);

  // Estados de loading e erro seguindo padrão do projeto
  if (emailMetricsLoading && !loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-dark-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner-modern"></div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Carregando Emails</h2>
            <p className="text-slate-400">Buscando dados de campanhas de email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-dark-primary)' }}>
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto p-6 bg-slate-800 rounded-lg shadow-xl">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Erro ao carregar emails</h2>
            <p className="text-slate-300 mb-4">{loadError}</p>
            
            <div className="flex gap-3">
              <Button
                onClick={resetFiltersAndRetry}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Resetar filtros
              </Button>
              <Button
                onClick={refreshData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (noDataAvailable) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-dark-primary)' }}>
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto p-6 bg-slate-800 rounded-lg shadow-xl text-center">
          <Mail className="h-12 w-12 text-slate-500" />
          <h2 className="text-2xl font-bold text-white mb-2">Nenhum email encontrado</h2>
          <p className="text-slate-300 mb-4">
            Não há dados de email para o período e filtros selecionados.
          </p>
          <Button
            onClick={refreshData}
            className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Atualizar dados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-6 py-6 md:py-8 w-full overflow-auto transition-all duration-500 ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`} 
    style={{ background: 'var(--bg-dark-primary)' }}
    ref={mainContentRef}>
      
      {/* Loading overlay */}
      {isFiltering && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner-modern"></div>
              <p className="text-white">Atualizando dados...</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 stagger-item">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Mail className="h-6 w-6 text-orange-400" />
              </div>
              Análise por Email
            </h1>
            <p className="text-slate-400">
              Examine o desempenho detalhado de {sortedData.length} campanhas de email
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={refreshData}
              variant="outline"
              className="h-10 px-4 bg-slate-800 border-slate-700 text-green-400 hover:text-green-300 hover:bg-slate-700 button-modern"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 stagger-item">
          <MetricsFilter 
            data={data}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            selectedEmails={selectedEmails}
            setSelectedEmails={setSelectedEmails}
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedMautic={selectedMautic}
            setSelectedMautic={setSelectedMautic}
            showBounced={showBounced}
            setShowBounced={setShowBounced}
            isFiltering={isFiltering}
            refreshData={refreshData}
            resetFiltersAndRetry={resetFiltersAndRetry}
            isMobile={isMobile}
          />
        </div>

        {/* Controles da tabela */}
        <Card className="bg-[#1f2937] border-slate-700 text-white shadow-lg mb-6 stagger-item">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="col-span-1 relative">
                <Input
                  type="text"
                  placeholder="Pesquisar por assunto, campanha..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-slate-800 border-slate-700 rounded-lg pl-10 text-white focus-visible:ring-orange-500 h-11"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              
              {/* Controles */}
              <div className="col-span-1 lg:col-span-3 flex flex-wrap gap-2 sm:gap-3">
                <Button 
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  variant="outline" 
                  className="h-11 px-3 bg-slate-800 border-slate-700 text-orange-400 hover:text-orange-300 hover:bg-slate-700 button-modern"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Colunas ({columns.filter(col => col.visible).length})
                </Button>
              </div>
            </div>
            
            {/* Gerenciador de colunas */}
            {showColumnManager && (
              <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-lg max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-200">Gerenciar Colunas</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowColumnManager(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {columns.sort((a, b) => a.priority - b.priority).map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center p-2 bg-slate-900 border border-slate-700 rounded cursor-move hover:border-orange-500/50 transition-colors"
                      draggable
                      onDragStart={(e) => handleDragStart(e, column.id)}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical className="h-4 w-4 text-slate-500 mr-2 cursor-grab" />
                      <div className="flex-1 truncate text-sm text-slate-300">
                        {column.name}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={() => toggleColumnVisibility(column.id)}
                      >
                        {column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visualização em tabela */}
        <Card className="bg-[#1f2937] border-slate-700 text-white shadow-lg stagger-item">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg font-semibold">Tabela de Emails</CardTitle>
              </div>
              <div className="text-sm text-slate-400">
                {columns.filter(col => col.visible).length} colunas visíveis
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 overflow-auto">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-800/50 sticky top-0 z-10">
                  <TableRow className="border-b border-slate-700/50 hover:bg-transparent">
                    {columns.filter(col => col.visible).map(column => (
                      <TableHead 
                        key={column.id} 
                        className="text-slate-400 px-4 py-3 min-w-[120px] whitespace-nowrap"
                        draggable
                        onDragStart={(e) => handleDragStart(e, column.id)}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 cursor-move">
                            <GripVertical className="h-4 w-4 text-slate-500" />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium">{column.name}</span>
                                </TooltipTrigger>
                                {column.description && (
                                  <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
                                    {column.description}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          {column.sortable && (
                            <div 
                              className="ml-2 cursor-pointer hover:text-orange-400 transition-colors"
                              onClick={() => handleSort(column.id)}
                            >
                              {sortColumn === column.id ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-orange-400" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-orange-400" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <TableRow 
                        key={item.id || item.emailId || index} 
                        className={`border-b border-slate-700/50 transition-colors hover:bg-slate-700/20 ${
                          index % 2 === 0 ? 'bg-slate-800/20' : ''
                        }`}
                      >
                        {columns.filter(col => col.visible).map(column => (
                          <TableCell key={column.id} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {renderCellContent(column.id, getCellValue(item, column.id), item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={columns.filter(col => col.visible).length} 
                        className="text-center py-12 text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="h-10 w-10 text-slate-500 mb-2" />
                          <span className="text-lg font-medium">Nenhum email encontrado</span>
                          {searchTerm && (
                            <span className="text-sm text-slate-500 mt-1">
                              Tente modificar os filtros ou termos de pesquisa
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          {/* Paginação */}
          {totalPages > 0 && (
            <CardFooter className="p-4 sm:p-6 border-t border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-slate-400 order-2 sm:order-1">
                {sortedData.length > 0 ? (
                  `Exibindo ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, sortedData.length)} de ${formatNumber(sortedData.length)} emails`
                ) : (
                  'Nenhum resultado encontrado'
                )}
              </div>
              
              <div className="flex items-center space-x-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 h-9 button-modern"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                {/* Números de página */}
                <div className="hidden md:flex space-x-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className={`w-9 h-9 p-0 ${
                          currentPage === pageNum
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                        }`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Indicador móvel */}
                <div className="md:hidden">
                  <span className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 h-9 button-modern"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardEmails;