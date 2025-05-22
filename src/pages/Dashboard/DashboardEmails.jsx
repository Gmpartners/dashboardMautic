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

const COLUMNS_STORAGE_KEY = 'dashboardEmails_columns_config';

const getInitialColumns = (showBounced = false) => [
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

  const [selectedAccounts, setSelectedAccounts] = useState(['all']);
  const [selectedEmails, setSelectedEmails] = useState(['none']);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('lastSentDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [columns, setColumns] = useState(() => getInitialColumns(showBounced));
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  
  const itemsPerPage = 15;
  const mainContentRef = useRef(null);

  const loadColumnsConfig = useCallback(() => {
    try {
      const savedConfig = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        if (Array.isArray(parsedConfig) && parsedConfig.length > 0) {
          const defaultColumns = getInitialColumns(showBounced);
          
          const restoredColumns = parsedConfig.map(savedCol => {
            const defaultCol = defaultColumns.find(col => col.id === savedCol.id);
            if (defaultCol) {
              return {
                ...defaultCol,
                visible: savedCol.visible !== undefined ? savedCol.visible : defaultCol.visible,
                priority: savedCol.priority !== undefined ? savedCol.priority : defaultCol.priority
              };
            }
            return savedCol;
          });
          
          const missingColumns = defaultColumns.filter(defaultCol => 
            !parsedConfig.find(savedCol => savedCol.id === defaultCol.id)
          );
          
          const finalColumns = [...restoredColumns, ...missingColumns];
          setColumns(finalColumns);
          return finalColumns;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração das colunas:', error);
    }
    
    const defaultColumns = getInitialColumns(showBounced);
    setColumns(defaultColumns);
    return defaultColumns;
  }, [showBounced]);

  const saveColumnsConfig = useCallback((columnsToSave) => {
    try {
      const configToSave = columnsToSave.map(col => ({
        id: col.id,
        name: col.name,
        visible: col.visible,
        sortable: col.sortable,
        type: col.type,
        description: col.description,
        priority: col.priority
      }));
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(configToSave));
      console.log('✅ Configuração das colunas salva com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar configuração das colunas:', error);
    }
  }, []);

  const resetColumnsToDefault = useCallback(() => {
    const defaultColumns = getInitialColumns(showBounced);
    setColumns(defaultColumns);
    localStorage.removeItem(COLUMNS_STORAGE_KEY);
    console.log('🔄 Colunas resetadas para configuração padrão');
  }, [showBounced]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    loadColumnsConfig();
    
    setTimeout(() => {
      setMounted(true);
    }, 200);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    loadColumnsConfig();
  }, [loadColumnsConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccounts, selectedMautic, dateRange, showBounced, searchTerm]);

  useEffect(() => {
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === 'bounceCount' 
          ? { ...col, visible: showBounced } 
          : col
      );
      saveColumnsConfig(newColumns);
      return newColumns;
    });
  }, [showBounced, saveColumnsConfig]);

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

  const emailFilteredData = useMemo(() => {
    console.log('🔍 [DashboardEmails] Dados de email recebidos:', data?.emailData);
    return data?.emailData || [];
  }, [data]);

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
  
  const filteredData = useMemo(() => {
    let filtered = emailFilteredData;
    
    if (!selectedAccounts.includes('all') && selectedAccounts.length > 0) {
      filtered = filtered.filter(item => {
        const accountName = item.account?.name || item.mauticAccount;
        return selectedAccounts.includes(accountName);
      });
    }
    
    if (selectedMautic && selectedMautic !== 'Todos') {
      filtered = filtered.filter(item => 
        (item.account?.name || item.mauticAccount) === selectedMautic
      );
    }
    
    if (!showBounced) {
      filtered = filtered.filter(item => {
        const metrics = item.metrics || item;
        const bounces = metrics.bounceCount || metrics.bounced || 0;
        return bounces === 0;
      });
    }
    
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
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  
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
    const newColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(newColumns);
    saveColumnsConfig(newColumns);
  }, [columns, saveColumnsConfig]);
  
  const handleDragStart = useCallback((e, columnId) => {
    console.log('🔄 Iniciando drag da coluna:', columnId);
    setDraggingColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
    e.target.style.opacity = '0.5';
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e, columnId) => {
    e.preventDefault();
    if (draggingColumnId && draggingColumnId !== columnId) {
      setDraggedOverColumn(columnId);
    }
  }, [draggingColumnId]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverColumn(null);
    }
  }, []);
  
  const handleDrop = useCallback((e, targetColumnId) => {
    e.preventDefault();
    console.log('🎯 Drop na coluna:', targetColumnId, 'vindo de:', draggingColumnId);
    
    setDraggedOverColumn(null);
    
    if (!draggingColumnId || draggingColumnId === targetColumnId) {
      console.log('❌ Drop cancelado - mesmo elemento ou sem origem');
      return;
    }

    const draggedIndex = columns.findIndex(col => col.id === draggingColumnId);
    const targetIndex = columns.findIndex(col => col.id === targetColumnId);
    
    console.log('📊 Índices:', { draggedIndex, targetIndex });
    
    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
      const newColumns = [...columns];
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);
      
      console.log('✅ Nova ordem das colunas:', newColumns.map(c => c.name));
      setColumns(newColumns);
      saveColumnsConfig(newColumns);
    }
  }, [draggingColumnId, columns, saveColumnsConfig]);
  
  const handleDragEnd = useCallback((e) => {
    console.log('🏁 Finalizando drag');
    setDraggingColumnId(null);
    setDraggedOverColumn(null);
    
    if (e.target) {
      e.target.style.opacity = '1';
    }
  }, []);

  const reorderColumn = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    
    console.log('🔄 Reordenando colunas:', { fromIndex, toIndex, movedColumn: movedColumn.name });
    setColumns(newColumns);
    saveColumnsConfig(newColumns);
  }, [columns, saveColumnsConfig]);

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
          if (numValue < thresholds.low) colorClass = 'bg-green-500/20 text-green-300 border-green-500/30';
          else if (numValue < thresholds.medium) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
          else if (numValue < thresholds.high) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
          else colorClass = 'bg-red-500/20 text-red-300 border-red-500/30';
        } else if (columnId === 'openRate') {
          thresholds = { low: 15, medium: 25, high: 35 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/30';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else if (columnId === 'clickRate') {
          thresholds = { low: 2, medium: 5, high: 10 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/30';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else if (columnId === 'clickToOpenRate') {
          thresholds = { low: 10, medium: 20, high: 30 };
          if (numValue > thresholds.high) colorClass = 'bg-green-500/20 text-green-300 border-green-500/30';
          else if (numValue > thresholds.medium) colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
          else if (numValue > thresholds.low) colorClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
          else colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        } else {
          colorClass = 'bg-slate-700/50 text-slate-400 border-slate-600/50';
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Badge variant="outline" className={`${colorClass} rounded-lg shadow-sm`}>
                    {value}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-[#0f1631]/95 backdrop-blur-xl border border-indigo-500/30 text-white px-3 py-2 rounded-lg shadow-xl">
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
        let colorClass = "text-white";
        let icon = null;
        
        if (columnId === 'bounceCount') {
          colorClass = numValue > 10 ? "text-red-400" : "text-white";
          if (numValue > 0) icon = <AlertCircle className="h-3 w-3 mr-1" />;
        } else if (columnId === 'clickCount') {
          colorClass = numValue > 100 ? "text-green-400" : numValue > 50 ? "text-orange-400" : "text-white";
          icon = <MousePointerClick className="h-3 w-3 mr-1 text-purple-400" />;
        } else if (columnId === 'openCount') {
          colorClass = numValue > 100 ? "text-green-400" : numValue > 50 ? "text-orange-400" : "text-white";
          icon = <Eye className="h-3 w-3 mr-1 text-teal-400" />;
        } else if (columnId === 'sentCount') {
          icon = <Mail className="h-3 w-3 mr-1 text-indigo-400" />;
        }
        
        return (
          <div className={`font-medium ${colorClass} flex items-center`}>
            {icon}
            {formatNumber(numValue)}
          </div>
        );
      }
      
      case 'date': {
        if (value === '-') return <span className="text-blue-300/70">-</span>;
        
        const [datePart, timePart] = value.split(' ');
        
        return (
          <div className="flex flex-col">
            <span className="text-white flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-indigo-400" />
              {datePart}
            </span>
            {timePart && <span className="text-blue-300/70 text-xs ml-4">{timePart}</span>}
          </div>
        );
      }
      
      case 'account': {
        if (value === '-' || value === 'Conta não especificada') {
          return <span className="text-blue-300/70">-</span>;
        }
        
        return (
          <div className="flex items-center">
            <Building className="h-3 w-3 mr-2 text-indigo-400" />
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 rounded-lg shadow-sm">
              {value}
            </Badge>
          </div>
        );
      }
      
      case 'text':
      default: {
        if (value === '-') return <span className="text-blue-300/70">-</span>;
        
        if (columnId === 'subject') {
          return (
            <div className="flex items-center">
                                <Target className="h-3 w-3 mr-2 text-indigo-400" />
              <span className="text-white font-medium" title={value}>
                {value.length > 50 ? value.substring(0, 50) + '...' : value}
              </span>
            </div>
          );
        }
        
        if (columnId === 'campaign') {
          return (
            <div className="flex items-center">
              <Zap className="h-3 w-3 mr-2 text-green-400" />
              <span className="text-white" title={value}>
                {value.length > 30 ? value.substring(0, 30) + '...' : value}
              </span>
            </div>
          );
        }
        
        return <span className="text-white">{value}</span>;
      }
    }
  }, [columns, formatNumber]);

  if (emailMetricsLoading && !loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0c1020] to-[#131a32]">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner-modern"></div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Carregando Emails</h2>
            <p className="text-blue-300/70">Buscando dados de campanhas de email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0c1020] to-[#131a32]">
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto p-6 bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Erro ao carregar emails</h2>
            <p className="text-blue-300/70 mb-4">{loadError}</p>
            
            <div className="flex gap-3">
              <Button
                onClick={resetFiltersAndRetry}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Resetar filtros
              </Button>
              <Button
                onClick={refreshData}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0c1020] to-[#131a32]">
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto p-6 bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl text-center">
          <Mail className="h-12 w-12 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Nenhum email encontrado</h2>
          <p className="text-blue-300/70 mb-4">
            Não há dados de email para o período e filtros selecionados.
          </p>
          <Button
            onClick={refreshData}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Atualizar dados
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-6 py-8 w-full overflow-auto bg-gradient-to-b from-[#0c1020] to-[#131a32] transition-all duration-500 ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`} 
    ref={mainContentRef}>
      
      {isFiltering && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner-modern"></div>
              <p className="text-white">Atualizando dados...</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-full">
        <div className="relative mb-8 animate-fade-in">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">Análise por Email</h1>
              </div>
              <p className="text-blue-300/80 mt-2">
                Examine o desempenho detalhado de {sortedData.length} campanhas de email
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={refreshData}
                variant="outline"
                className="h-10 px-4 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2 text-indigo-400" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="bg-[#202942]/60 backdrop-blur-md border border-white/8 rounded-xl p-5 shadow-xl">
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
        </div>

        <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl mb-6 animate-fade-in">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="col-span-1 relative">
                <Input
                  type="text"
                  placeholder="Pesquisar por assunto, campanha..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg pl-10 text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
              </div>
              
              <div className="col-span-1 lg:col-span-3 flex flex-wrap gap-2 sm:gap-3">
                <Button 
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  variant="outline" 
                  className="h-11 px-3 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2 text-indigo-400" />
                  Colunas ({columns.filter(col => col.visible).length})
                </Button>
              </div>
            </div>
            
            {showColumnManager && (
              <div className="mt-4 p-4 bg-[#0f1631]/60 backdrop-blur-md border border-indigo-500/20 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-white">Gerenciar Colunas</h4>
                    <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                      {columns.filter(col => col.visible).length} visíveis
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetColumnsToDefault}
                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 transition-all duration-200 text-xs"
                    >
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowColumnManager(false)}
                      className="text-blue-300/70 hover:text-white hover:bg-indigo-500/20 transition-all duration-200"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {columns.map((column, index) => (
                      <div
                        key={`${column.id}-${index}`}
                        className={`flex items-center p-3 rounded-lg cursor-move transition-all duration-200 shadow-sm hover:shadow-md select-none ${
                          draggingColumnId === column.id 
                            ? 'bg-gradient-to-r from-indigo-600/50 to-purple-600/50 border-indigo-400/50 scale-105 opacity-70' 
                            : draggedOverColumn === column.id
                            ? 'bg-gradient-to-r from-indigo-500/40 to-blue-500/40 border-indigo-400/40 scale-102 border-l-4 border-l-indigo-400'
                            : 'bg-gradient-to-r from-[#1a2240] to-[#2a3452] border-indigo-500/20 hover:border-indigo-500/40'
                        } border`}
                        draggable={true}
                        onDragStart={(e) => {
                          console.log('🚀 Drag start no gerenciador:', column.name);
                          handleDragStart(e, column.id);
                        }}
                        onDragOver={(e) => {
                          handleDragOver(e);
                        }}
                        onDragEnter={(e) => {
                          handleDragEnter(e, column.id);
                        }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          console.log('📦 Drop no gerenciador:', column.name);
                          handleDrop(e, column.id);
                        }}
                        onDragEnd={handleDragEnd}
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className={`h-5 w-5 cursor-grab active:cursor-grabbing transition-colors ${
                            draggingColumnId === column.id ? 'text-indigo-300' : 'text-indigo-400'
                          }`} />
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-indigo-500/30 text-indigo-300 rounded text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white">{column.name}</span>
                              {column.description && (
                                <span className="text-xs text-blue-300/70 mt-0.5 line-clamp-1">
                                  {column.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-1 ${
                              column.visible 
                                ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                                : 'bg-slate-600/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {column.visible ? 'Visível' : 'Oculta'}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-300/70 hover:text-white hover:bg-indigo-500/20 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnVisibility(column.id);
                            }}
                          >
                            {column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-indigo-500/20 flex justify-between items-center text-xs text-blue-300/70">
                  <span>💡 Arraste para reordenar • Clique no olho para mostrar/ocultar</span>
                  <span>{columns.length} colunas no total</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-lg font-semibold text-white">Tabela de Emails</CardTitle>
              </div>
              <div className="text-sm text-blue-300/70">
                {columns.filter(col => col.visible).length} colunas visíveis
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 overflow-auto">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#1a2240]/60 backdrop-blur-sm sticky top-0 z-10">
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    {columns.filter(col => col.visible).map((column, index) => (
                      <TableHead 
                        key={`header-${column.id}-${index}`}
                        className={`text-blue-300/80 px-4 py-3 min-w-[120px] whitespace-nowrap transition-all duration-200 select-none ${
                          draggedOverColumn === column.id ? 'bg-indigo-500/20 border-l-4 border-indigo-400' : ''
                        }`}
                        draggable={true}
                        onDragStart={(e) => {
                          console.log('🚀 Drag start no header:', column.name);
                          handleDragStart(e, column.id);
                        }}
                        onDragOver={(e) => {
                          handleDragOver(e);
                        }}
                        onDragEnter={(e) => {
                          handleDragEnter(e, column.id);
                        }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          console.log('📦 Drop no header:', column.name);
                          handleDrop(e, column.id);
                        }}
                        onDragEnd={handleDragEnd}
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}
                      >
                        <div className="flex items-center justify-between group">
                          <div className={`flex items-center gap-2 cursor-move transition-all duration-200 ${
                            draggingColumnId === column.id ? 'opacity-50 scale-95' : ''
                          }`}>
                            <GripVertical className="h-4 w-4 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                            <div className="flex items-center gap-1">
                              <span className="w-5 h-5 bg-indigo-500/30 text-indigo-300 rounded text-xs flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium">{column.name}</span>
                                  </TooltipTrigger>
                                  {column.description && (
                                    <TooltipContent className="bg-[#0f1631]/95 backdrop-blur-xl border border-indigo-500/30 text-white rounded-lg shadow-xl">
                                      {column.description}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          
                          {column.sortable && (
                            <div 
                              className="ml-2 cursor-pointer hover:text-indigo-400 transition-colors p-1 rounded hover:bg-indigo-400/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSort(column.id);
                              }}
                            >
                              {sortColumn === column.id ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4 text-indigo-400" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-indigo-400" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-indigo-400/50 opacity-0 group-hover:opacity-100" />
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
                        className={`border-b border-white/5 transition-all duration-200 hover:bg-[#1a2240]/40 ${
                          index % 2 === 0 ? 'bg-[#1a2240]/20' : ''
                        }`}
                      >
                        {columns.filter(col => col.visible).map(column => (
                          <TableCell key={column.id} className="px-4 py-3 text-white whitespace-nowrap">
                            {renderCellContent(column.id, getCellValue(item, column.id), item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={columns.filter(col => col.visible).length} 
                        className="text-center py-12 text-blue-300/70"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="h-10 w-10 text-indigo-400 mb-2" />
                          <span className="text-lg font-medium text-white">Nenhum email encontrado</span>
                          {searchTerm && (
                            <span className="text-sm text-blue-300/70 mt-1">
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
          
          {totalPages > 0 && (
            <CardFooter className="p-4 sm:p-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-blue-300/70 order-2 sm:order-1">
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
                  className="border-indigo-500/20 bg-[#0f1631]/60 text-white hover:bg-[#192041] hover:border-indigo-500/40 h-9 transition-all duration-200 shadow-md hover:shadow-lg"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
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
                        className={`w-9 h-9 p-0 transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-md'
                            : 'border-indigo-500/20 bg-[#0f1631]/60 text-white hover:bg-[#192041] hover:border-indigo-500/40'
                        }`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="md:hidden">
                  <span className="px-3 py-2 bg-[#0f1631]/60 border border-indigo-500/20 rounded-lg text-white text-sm">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-indigo-500/20 bg-[#0f1631]/60 text-white hover:bg-[#192041] hover:border-indigo-500/40 h-9 transition-all duration-200 shadow-md hover:shadow-lg"
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