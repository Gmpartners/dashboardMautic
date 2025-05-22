import { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { metricsMailApi } from '../services/MetricsMailApiService';

const MetricsContext = createContext();

export const useMetrics = () => useContext(MetricsContext);

export const MetricsProvider = ({ children }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    dailyData: [],
    emailData: [],
    mauticAccounts: [],
    accounts: [], // Adicionado para guardar contas disponíveis
    totals: {
      sentCount: 0,
      deliveredCount: 0,
      openCount: 0,
      uniqueOpenCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    },
    averages: {
      openRate: 0,
      uniqueOpenRate: 0,
      clickRate: 0,
      uniqueClickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      ctr: 0,
      uniqueCtr: 0
    }
  });
  
  const [dateRange, setDateRange] = useState(() => {
    // Ajustado para criar datas em formato de string ISO
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0], // Formato YYYY-MM-DD
      to: today.toISOString().split('T')[0] // Formato YYYY-MM-DD
    };
  });
  
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState('none');
  const [selectedMautic, setSelectedMautic] = useState('Todos');
  const [selectedCampaigns, setSelectedCampaigns] = useState(['all']);
  const [selectedIndividualAccount, setSelectedIndividualAccount] = useState('all');
  const [showBounced, setShowBounced] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [allEmails, setAllEmails] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [emailMetricsLoading, setEmailMetricsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [noDataAvailable, setNoDataAvailable] = useState(false);
  
  const [sendsData, setSendsData] = useState(null);
  const [opensData, setOpensData] = useState(null);
  const [clicksData, setClicksData] = useState(null);
  const [ratesData, setRatesData] = useState(null);
  const [eventsData, setEventsData] = useState(null);
  const [lastSendData, setLastSendData] = useState(null);
  const [sendRateData, setSendRateData] = useState(null);
  
  const timersRef = useRef({
    safetyTimeout: null,
    loadingTimer: null
  });
  
  const pendingRequestsRef = useRef(0);
  
  const filtersRef = useRef({
    dateRange,
    selectedAccount,
    selectedEmail,
    selectedCampaigns,
    selectedIndividualAccount
  });
  
  const [filterChanged, setFilterChanged] = useState(false);
  const requestCache = useRef(new Map());
  
  // FIX: Melhora do log para diagnóstico
  const logFilterChanges = (newFilters, oldFilters) => {
    console.log('🔍 Filtros alterados:', {
      anterior: oldFilters,
      novo: newFilters,
      mudanças: {
        datas: newFilters.dateRange !== oldFilters.dateRange,
        conta: newFilters.selectedAccount !== oldFilters.selectedAccount,
        email: newFilters.selectedEmail !== oldFilters.selectedEmail,
        contaIndividual: newFilters.selectedIndividualAccount !== oldFilters.selectedIndividual
      }
    });
  };
  
  const getUserId = useCallback(() => {
    const storedUserId = localStorage.getItem('userId');
    
    if (storedUserId && storedUserId !== 'undefined' && storedUserId !== 'null') {
      return storedUserId;
    }
    
    try {
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      if (authUser && authUser.uid) {
        localStorage.setItem('userId', authUser.uid);
        return authUser.uid;
      }
    } catch (e) {
      console.error('Error retrieving user ID:', e);
    }
    
    return 'wBnoxuKZfUUluhg8jwUtQBB3Jgo2';
  }, []);
  
  useEffect(() => {
    const oldFilters = { ...filtersRef.current };
    
    filtersRef.current = {
      dateRange,
      selectedAccount,
      selectedEmail,
      selectedCampaigns,
      selectedIndividualAccount
    };
    
    // FIX: Log para diagnóstico de mudanças nos filtros
    logFilterChanges(filtersRef.current, oldFilters);
    
    setFilterChanged(true);
  }, [dateRange, selectedAccount, selectedEmail, selectedCampaigns, selectedIndividualAccount]);
  
  // Função corrigida para buscar contas
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setNoDataAvailable(false);
    
    try {
      const userId = getUserId();
      console.log('🔍 [MetricsContext] Buscando contas para o usuário:', userId);
      
      const response = await metricsMailApi.listAccounts(userId);
      console.log('🔍 [MetricsContext] Resposta da API de contas:', response);
      
      if (response && response.success && response.data) {
        let accountsData = Array.isArray(response.data) ? response.data : [response.data];
        
        const normalizedAccounts = accountsData.map((acc, index) => ({
          id: acc._id || acc.id || acc.accountId || `temp-account-${index}`,
          accountId: acc._id || acc.id || acc.accountId || `temp-account-${index}`,
          name: acc.name || `Conta ${index + 1}`,
          provider: acc.provider || 'mautic',
          url: acc.url
        }));
        
        console.log('✅ [MetricsContext] Contas normalizadas:', normalizedAccounts);
        
        // Atualiza o estado local
        setAccounts(normalizedAccounts);
        
        // Guarda as contas no data também, para serem acessíveis por outros componentes
        setData(prevData => ({
          ...prevData,
          accounts: normalizedAccounts
        }));
        
        if (normalizedAccounts.length === 0) {
          setNoDataAvailable(true);
          setLoadError("Nenhuma conta encontrada. Verifique se você está autenticado corretamente ou se o usuário tem contas associadas.");
        }
      } else {
        setAccounts([]);
        setNoDataAvailable(true);
        setLoadError("Não foi possível carregar contas. Verifique se o servidor está disponível.");
      }
    } catch (error) {
      console.error('❌ [MetricsContext] Erro ao buscar contas:', error);
      setAccounts([]);
      setLoadError(`Erro ao carregar contas: ${error.message || 'Falha na comunicação com o servidor'}`);
    } finally {
      setAccountsLoading(false);
      
      setTimeout(() => {
        setEmailMetricsLoading(false);
        setIsFiltering(false);
      }, 500);
    }
  }, [getUserId]);

  // Função vazia que retorna um array vazio - substituindo a busca de campanhas
  const fetchCampaigns = useCallback((accountId = null) => {
    // Simplesmente retorna um array vazio, já que a API não suporta busca de campanhas
    console.log('Campaign fetch skipped - API não suporta busca de campanhas');
    return Promise.resolve([]);
  }, []);

  // Função corrigida para buscar todos os emails
  const fetchAllEmails = useCallback(async () => {
    try {
      const userId = getUserId();
      const response = await metricsMailApi.getEmails(userId);
      
      if (response && response.success && response.data) {
        const emailsData = Array.isArray(response.data) ? response.data : [response.data];
        const normalizedEmails = emailsData.map(email => ({
          id: email._id || email.id,
          _id: email._id || email.id,
          subject: email.subject || email.name,
          name: email.name,
          account: {
            id: email.accountId,
            _id: email.accountId,
            name: accounts.find(acc => acc.id === email.accountId)?.name || 'Unknown Account'
          }
        }));
        
        console.log('✅ [MetricsContext] Emails normalizados:', normalizedEmails);
        setAllEmails(normalizedEmails);
        return normalizedEmails;
      }
    } catch (error) {
      console.error('❌ [MetricsContext] Erro ao buscar todos os emails:', error);
    }
    
    return [];
  }, [getUserId, accounts]);

  const fetchEmailsByAccount = useCallback(async (accountId) => {
    try {
      const userId = getUserId();
      const response = await metricsMailApi.getAccountEmails(userId, accountId);
      
      if (response && response.success && response.data) {
        const emailsData = Array.isArray(response.data) ? response.data : [response.data];
        return emailsData.map(email => ({
          id: email._id || email.id,
          _id: email._id || email.id,
          subject: email.subject || email.name,
          name: email.name,
          accountId: accountId,
          account: {
            id: accountId,
            _id: accountId,
            name: accounts.find(acc => acc.id === accountId)?.name || 'Unknown Account'
          }
        }));
      }
    } catch (error) {
      console.error(`❌ [MetricsContext] Erro ao buscar emails para conta ${accountId}:`, error);
    }
    
    return [];
  }, [getUserId, accounts]);
  
  const startGlobalTimeout = useCallback((timeoutDuration = 30000) => {
    if (timersRef.current.safetyTimeout) {
      clearTimeout(timersRef.current.safetyTimeout);
    }
    
    timersRef.current.safetyTimeout = setTimeout(() => {
      setEmailMetricsLoading(false);
      setIsFiltering(false);
      
      if (pendingRequestsRef.current > 0) {
        pendingRequestsRef.current = 0;
        setNoDataAvailable(true);
      }
    }, timeoutDuration);
    
    return () => {
      if (timersRef.current.safetyTimeout) {
        clearTimeout(timersRef.current.safetyTimeout);
      }
    };
  }, []);
  
  const trackRequest = useCallback((promise) => {
    pendingRequestsRef.current += 1;
    
    return promise
      .then(result => {
        pendingRequestsRef.current -= 1;
        return result;
      })
      .catch(error => {
        pendingRequestsRef.current -= 1;
        throw error;
      });
  }, []);
  
  const calculateRatesFromRawData = useCallback((sendsData, opensData, clicksData) => {
    if (!sendsData || !opensData || !clicksData) return null;
    
    const totalSends = sendsData.reduce((sum, item) => sum + (item.totalSends || 0), 0);
    const totalOpens = opensData.reduce((sum, item) => sum + (item.totalOpens || 0), 0);
    const totalClicks = clicksData.reduce((sum, item) => sum + (item.totalClicks || 0), 0);
    
    const openRate = totalSends > 0 ? (totalOpens / totalSends) * 100 : 0;
    const clickRate = totalSends > 0 ? (totalClicks / totalSends) * 100 : 0;
    const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
    
    console.log('📊 [MetricsContext] Taxas calculadas localmente:', {
      totalSends, totalOpens, totalClicks,
      openRate, clickRate, clickToOpenRate
    });
    
    return {
      deliveryRate: 100,
      openRate,
      clickRate,
      clickToOpenRate,
      bounceRate: 0,
      unsubscribeRate: 0
    };
  }, []);
  
  // Função corrigida para buscar dados diários
  const fetchDailyData = useCallback(async () => {
    try {
      const userId = getUserId();
      const { dateRange, selectedAccount, selectedEmail, selectedIndividualAccount } = filtersRef.current;
      
      // FIX: Garantir que o objeto de filtros está sendo construído corretamente
      const filters = {
        startDate: dateRange.from,
        endDate: dateRange.to
      };
      
      // Adicionar accountId aos filtros apenas se uma conta específica estiver selecionada
      if (selectedIndividualAccount !== 'all') {
        filters.accountId = selectedIndividualAccount;
      } else if (selectedAccount !== 'all') {
        // Para suportar seleção múltipla de contas, verifique se selectedAccount é um array
        if (Array.isArray(selectedAccount) && selectedAccount.length === 1 && selectedAccount[0] !== 'all') {
          // Procura a conta pelo nome para obter o ID
          const account = accounts.find(acc => acc.name === selectedAccount[0]);
          if (account) {
            filters.accountId = account.id || account.accountId;
            console.log(`🔍 [MetricsContext] Adicionando conta ao filtro por nome: ${selectedAccount[0]} -> ID: ${filters.accountId}`);
          }
        }
      }
      
      // Adicionar emailId aos filtros apenas se um email específico estiver selecionado
      if (selectedEmail !== 'none') {
        // Para suportar seleção múltipla de emails, verifique se selectedEmail é um array
        if (Array.isArray(selectedEmail) && selectedEmail.length === 1 && selectedEmail[0] !== 'none') {
          filters.emailId = selectedEmail[0];
          console.log(`🔍 [MetricsContext] Adicionando email ao filtro: ${filters.emailId}`);
        }
      }
      
      // FIX: Log detalhado de filtros
      console.log('🔍 [MetricsContext] Buscando dados diários com filtros:', JSON.stringify(filters, null, 2));
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout exceeded for daily metrics')), 15000);
      });
      
      let sendsResponse, opensResponse, clicksResponse, ratesResponse, lastSendResponse, sendRateResponse;
      
      try {
        const sendsPromise = trackRequest(metricsMailApi.getDailySends(userId, filters));
        sendsResponse = await Promise.race([sendsPromise, timeoutPromise]);
        
        if (sendsResponse?.success && Array.isArray(sendsResponse.data)) {
          console.log('✅ [MetricsContext] Dados diários de envios:', sendsResponse.data);
          setSendsData(sendsResponse.data);
        } else {
          console.warn('⚠️ [MetricsContext] Dados de envios inválidos:', sendsResponse);
          setSendsData([]);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar dados diários de envios:', error);
        setSendsData([]);
      }
      
      try {
        const opensPromise = trackRequest(metricsMailApi.getDailyOpens(userId, filters));
        opensResponse = await Promise.race([opensPromise, timeoutPromise]);
        
        if (opensResponse?.success && Array.isArray(opensResponse.data)) {
          console.log('✅ [MetricsContext] Dados diários de aberturas:', opensResponse.data);
          setOpensData(opensResponse.data);
        } else {
          console.warn('⚠️ [MetricsContext] Dados de aberturas inválidos:', opensResponse);
          setOpensData([]);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar dados diários de aberturas:', error);
        setOpensData([]);
      }
      
      try {
        const clicksPromise = trackRequest(metricsMailApi.getDailyClicks(userId, filters));
        clicksResponse = await Promise.race([clicksPromise, timeoutPromise]);
        
        if (clicksResponse?.success && Array.isArray(clicksResponse.data)) {
          console.log('✅ [MetricsContext] Dados diários de cliques:', clicksResponse.data);
          setClicksData(clicksResponse.data);
        } else {
          console.warn('⚠️ [MetricsContext] Dados de cliques inválidos:', clicksResponse);
          setClicksData([]);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar dados diários de cliques:', error);
        setClicksData([]);
      }
      
      try {
        const ratesPromise = trackRequest(metricsMailApi.getConversionRates(userId, filters));
        ratesResponse = await Promise.race([ratesPromise, timeoutPromise]);
        
        if (ratesResponse?.success && ratesResponse.data) {
          console.log('✅ [MetricsContext] Dados de taxas de conversão:', ratesResponse.data);
          const rates = ratesResponse.data;
          if (rates.openRate === 0 && rates.clickRate === 0 && rates.deliveryRate === 0) {
            console.warn('⚠️ [MetricsContext] Todas as taxas estão zeradas, tentando calcular localmente');
            const calculatedRates = calculateRatesFromRawData(sendsResponse?.data, opensResponse?.data, clicksResponse?.data);
            setRatesData(calculatedRates || rates);
          } else {
            setRatesData(rates);
          }
        } else {
          console.warn('⚠️ [MetricsContext] Dados de taxas inválidos:', ratesResponse);
          const calculatedRates = calculateRatesFromRawData(sendsResponse?.data, opensResponse?.data, clicksResponse?.data);
          setRatesData(calculatedRates);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar taxas de conversão:', error);
        const calculatedRates = calculateRatesFromRawData(sendsResponse?.data, opensResponse?.data, clicksResponse?.data);
        setRatesData(calculatedRates);
      }
      
      try {
        const lastSendPromise = trackRequest(metricsMailApi.getLastSend(userId, filters));
        lastSendResponse = await Promise.race([lastSendPromise, timeoutPromise]);
        
        if (lastSendResponse?.success) {
          console.log('✅ [MetricsContext] Dados do último envio:', lastSendResponse.data);
          setLastSendData(lastSendResponse.data);
        } else {
          setLastSendData(null);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar último envio:', error);
        setLastSendData(null);
      }
      
      try {
        const sendRatePromise = trackRequest(metricsMailApi.getSendRate(userId, filters));
        sendRateResponse = await Promise.race([sendRatePromise, timeoutPromise]);
        
        if (sendRateResponse?.success) {
          console.log('✅ [MetricsContext] Dados de taxa de envio:', sendRateResponse.data);
          setSendRateData(sendRateResponse.data);
        } else {
          setSendRateData(null);
        }
      } catch (error) {
        console.error('❌ [MetricsContext] Erro ao buscar taxa de envio:', error);
        setSendRateData(null);
      }
      
      return { 
        sendsData: sendsResponse?.data || [], 
        opensData: opensResponse?.data || [], 
        clicksData: clicksResponse?.data || [], 
        ratesData: ratesData,
        lastSendData: lastSendResponse?.data || null,
        sendRateData: sendRateResponse?.data || null,
        isEmpty: (!sendsResponse?.data?.length && !opensResponse?.data?.length && !clicksResponse?.data?.length)
      };
    } catch (error) {
      console.error('❌ [MetricsContext] Erro em fetchDailyData:', error);
      throw error;
    }
  }, [getUserId, trackRequest, ratesData, calculateRatesFromRawData, accounts]);

  const fetchMetricsByDate = useCallback(async (filters = {}) => {
    try {
      const userId = getUserId();
      const response = await metricsMailApi.getMetricsByDate(userId, filters);
      
      if (response && response.success) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching metrics by date:', error);
      return null;
    }
  }, [getUserId]);

  const fetchMetricsByAccount = useCallback(async (filters = {}) => {
    try {
      const userId = getUserId();
      const response = await metricsMailApi.getMetricsByAccount(userId, filters);
      
      if (response && response.success) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching metrics by account:', error);
      return null;
    }
  }, [getUserId]);

  const fetchOpens = useCallback(async (filters = {}) => {
    try {
      const userId = getUserId();
      const response = await metricsMailApi.getOpens(userId, filters);
      
      if (response && response.success) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching opens:', error);
      return [];
    }
  }, [getUserId]);
  
  // Função principal corrigida para buscar dados conforme estrutura da API
  const fetchData = useCallback(async () => {
    if (isFiltering) {
      return;
    }
    
    setEmailMetricsLoading(true);
    setIsFiltering(true);
    setLoadError(null);
    setNoDataAvailable(false);
    setLoadAttempts(prev => prev + 1);
    
    startGlobalTimeout(30000);
    
    try {
      const userId = getUserId();
      const { dateRange, selectedAccount, selectedEmail, selectedIndividualAccount } = filtersRef.current;
      
      // FIX: Garantir que os filtros estão corretos
      const filters = {
        startDate: dateRange.from,
        endDate: dateRange.to
      };
      
      // Adicionar accountId aos filtros apenas se uma conta específica estiver selecionada
      if (selectedIndividualAccount !== 'all') {
        filters.accountId = selectedIndividualAccount;
      } else if (selectedAccount !== 'all') {
        // Verificar se é um array de seleção de contas
        if (Array.isArray(selectedAccount) && selectedAccount.length > 0 && !selectedAccount.includes('all')) {
          // Mapear nomes de contas para IDs
          const accountIds = selectedAccount.map(accountName => {
            const account = accounts.find(acc => acc.name === accountName);
            return account ? (account.id || account.accountId) : null;
          }).filter(id => id !== null);
          
          if (accountIds.length === 1) {
            filters.accountId = accountIds[0];
            console.log(`🔍 [MetricsContext] Adicionando uma única conta ao filtro: ${filters.accountId}`);
          } else if (accountIds.length > 1) {
            filters.accountIds = accountIds.join(',');
            console.log(`🔍 [MetricsContext] Adicionando múltiplas contas ao filtro: ${filters.accountIds}`);
          }
        }
      }
      
      // Adicionar emailId aos filtros apenas se um email específico estiver selecionado
      if (selectedEmail !== 'none') {
        // Verificar se é um array de seleção de emails
        if (Array.isArray(selectedEmail) && selectedEmail.length > 0 && !selectedEmail.includes('none')) {
          if (selectedEmail.length === 1) {
            filters.emailId = selectedEmail[0];
            console.log(`🔍 [MetricsContext] Adicionando um único email ao filtro: ${filters.emailId}`);
          } else {
            filters.emailIds = selectedEmail.join(',');
            console.log(`🔍 [MetricsContext] Adicionando múltiplos emails ao filtro: ${filters.emailIds}`);
          }
        }
      }
      
      // FIX: Log detalhado dos filtros sendo utilizados
      console.log('🔍 [MetricsContext] Buscando métricas de email com filtros:', JSON.stringify(filters, null, 2));
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout exceeded for email metrics')), 20000);
      });
      
      const emailsPromise = trackRequest(metricsMailApi.getMetricsByEmail(userId, filters));
      const emailsResponse = await Promise.race([emailsPromise, timeoutPromise]);
      
      let hasDailyData = false;
      try {
        const dailyResult = await fetchDailyData();
        hasDailyData = !dailyResult.isEmpty;
      } catch (dailyError) {
        console.error('Error fetching daily data:', dailyError);
      }
      
      let hasEmailData = false;
      if (emailsResponse && emailsResponse.success && emailsResponse.data) {
        console.log('📊 [MetricsContext] Email metrics response:', emailsResponse);
        
        const responseData = emailsResponse.data;
        const mauticAccounts = new Set();
        let emailsData = [];
        
        // NOVA ESTRUTURA: Processar dados conforme formato da API mostrada no console
        let totals = {
          sentCount: 0,
          deliveredCount: 0,
          openCount: 0,
          uniqueOpenCount: 0,
          clickCount: 0,
          uniqueClickCount: 0,
          bounceCount: 0,
          unsubscribeCount: 0
        };
        
        let averages = {
          openRate: 0,
          uniqueOpenRate: 0,
          clickRate: 0,
          uniqueClickRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0,
          ctr: 0,
          uniqueCtr: 0
        };
        
        // Processar dados baseado na estrutura da API do console
        if (responseData.counts) {
          // Usar os dados de counts da API
          totals = {
            sentCount: responseData.counts.sentCount || 0,
            deliveredCount: responseData.counts.deliveredCount || responseData.counts.sentCount || 0,
            openCount: responseData.counts.openCount || 0,
            uniqueOpenCount: responseData.counts.uniqueOpenCount || 0,
            clickCount: responseData.counts.clickCount || 0,
            uniqueClickCount: responseData.counts.uniqueClickCount || 0,
            bounceCount: responseData.counts.bounceCount || 0,
            unsubscribeCount: responseData.counts.unsubscribeCount || 0
          };
          
          console.log('✅ [MetricsContext] Totais processados da API:', totals);
        }
        
        if (responseData.rates) {
          // Usar os dados de rates da API - TODOS os rates disponíveis
          averages = {
            openRate: responseData.rates.openRate || 0,
            uniqueOpenRate: responseData.rates.uniqueOpenRate || 0,
            clickRate: responseData.rates.clickRate || 0,
            uniqueClickRate: responseData.rates.uniqueClickRate || 0,
            bounceRate: responseData.rates.bounceRate || 0,
            unsubscribeRate: responseData.rates.unsubscribeRate || 0,
            ctr: responseData.rates.ctr || 0,
            uniqueCtr: responseData.rates.uniqueCtr || 0
          };
          
          console.log('✅ [MetricsContext] Médias processadas da API:', averages);
        }
        
        // Processar accounts se estão disponíveis
        if (responseData.accounts && Array.isArray(responseData.accounts)) {
          responseData.accounts.forEach(account => {
            if (account && account.name) {
              mauticAccounts.add(account.name);
            }
          });
        }
        
        // Processar recentEmails se estão disponíveis
        if (responseData.recentEmails && Array.isArray(responseData.recentEmails)) {
          emailsData = responseData.recentEmails.map(email => ({
            id: email._id || email.id,
            _id: email._id || email.id,
            subject: email.subject,
            fromName: email.fromName,
            accountName: email.accountName,
            metrics: email.metrics || {},
            account: email.account || {
              id: email.account?._id || email.account?.id,
              name: email.account?.name || email.accountName
            },
            campaign: email.campaign || null
          }));
          
          console.log('✅ [MetricsContext] Emails processados:', emailsData);
        } else if (responseData.emails && Array.isArray(responseData.emails)) {
          // Fallback para estrutura alternativa
          emailsData = responseData.emails;
        } else if (Array.isArray(responseData)) {
          // Fallback para quando data é um array direto
          emailsData = responseData;
        }
        
        hasEmailData = emailsData.length > 0 || Object.values(totals).some(val => val > 0);
        
        // Atualizar estado com os dados processados
        setData({
          dailyData: [], 
          emailData: emailsData,
          mauticAccounts: Array.from(mauticAccounts),
          accounts: accounts, // Manter a lista de contas atualizada
          totals,
          averages
        });
        
        console.log('✅ [MetricsContext] Dados finais atualizados no contexto:', {
          emailsCount: emailsData.length,
          totals,
          averages,
          mauticAccounts: Array.from(mauticAccounts)
        });
        
      } else {
        console.warn('⚠️ [MetricsContext] Resposta da API não contém dados válidos');
        setData(prevData => ({
          ...prevData,
          dailyData: [],
          emailData: [],
          mauticAccounts: [],
          accounts: accounts, // Manter a lista de contas atualizada
          totals: {
            sentCount: 0,
            deliveredCount: 0,
            openCount: 0,
            uniqueOpenCount: 0,
            clickCount: 0,
            uniqueClickCount: 0,
            bounceCount: 0,
            unsubscribeCount: 0
          },
          averages: {
            openRate: 0,
            uniqueOpenRate: 0,
            clickRate: 0,
            uniqueClickRate: 0,
            bounceRate: 0,
            unsubscribeRate: 0,
            ctr: 0,
            uniqueCtr: 0
          }
        }));
      }
      
      setLoadAttempts(0);
      
      if (!hasEmailData && !hasDailyData) {
        setNoDataAvailable(true);
      }
    } catch (error) {
      console.error('❌ [MetricsContext] Error fetching data:', error);
      let errorMessage = 'Falha na comunicação com o servidor';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'O servidor demorou muito para responder. Tente novamente mais tarde ou use um intervalo de datas menor.';
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Endpoint não encontrado. Verifique a configuração da API.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'Acesso negado. Verifique suas credenciais.';
      }
      
      setLoadError(`Erro ao carregar dados: ${errorMessage}`);
      setNoDataAvailable(true);
    } finally {
      setEmailMetricsLoading(false);
      setIsFiltering(false);
      setFilterChanged(false);
      
      if (timersRef.current.safetyTimeout) {
        clearTimeout(timersRef.current.safetyTimeout);
        timersRef.current.safetyTimeout = null;
      }
    }
  }, [fetchDailyData, isFiltering, getUserId, startGlobalTimeout, trackRequest, accounts]);
  
  const fetchEvents = useCallback(async (filters = {}, limit = 100, page = 1) => {
    try {
      const userId = getUserId();
      const { dateRange, selectedAccount, selectedEmail, selectedIndividualAccount } = filtersRef.current;
      
      // FIX: Garantir que os filtros estão corretos
      const eventFilters = {
        startDate: dateRange.from,
        endDate: dateRange.to,
        limit,
        page,
        ...filters
      };
      
      // Adicionar accountId aos filtros apenas se uma conta específica estiver selecionada
      if (selectedIndividualAccount !== 'all') {
        eventFilters.accountId = selectedIndividualAccount;
      } else if (selectedAccount !== 'all') {
        // Para suportar seleção múltipla de contas
        if (Array.isArray(selectedAccount) && selectedAccount.length > 0 && !selectedAccount.includes('all')) {
          // Mapear nomes de contas para IDs
          const accountIds = selectedAccount.map(accountName => {
            const account = accounts.find(acc => acc.name === accountName);
            return account ? (account.id || account.accountId) : null;
          }).filter(id => id !== null);
          
          if (accountIds.length === 1) {
            eventFilters.accountId = accountIds[0];
          } else if (accountIds.length > 1) {
            eventFilters.accountIds = accountIds.join(',');
          }
        }
      }
      
      // Adicionar emailId aos filtros apenas se um email específico estiver selecionado
      if (selectedEmail !== 'none') {
        // Para suportar seleção múltipla de emails
        if (Array.isArray(selectedEmail) && selectedEmail.length > 0 && !selectedEmail.includes('none')) {
          if (selectedEmail.length === 1) {
            eventFilters.emailId = selectedEmail[0];
          } else {
            eventFilters.emailIds = selectedEmail.join(',');
          }
        }
      }
      
      console.log('🔍 [MetricsContext] Buscando eventos com filtros:', eventFilters);
      
      const eventsResponse = await metricsMailApi.getRecentEvents(userId, eventFilters);
      
      if (eventsResponse && eventsResponse.success && eventsResponse.data) {
        console.log('✅ [MetricsContext] Dados de eventos:', eventsResponse.data);
        setEventsData(eventsResponse.data);
        return eventsResponse.data;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [MetricsContext] Erro ao buscar eventos:', error);
      return null;
    }
  }, [getUserId, accounts]);
  
  const resetFiltersAndRetry = useCallback(() => {
    // FIX: Garante o formato correto para as datas
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const formattedDateRange = {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
    
    console.log('🔄 [MetricsContext] Resetando filtros para valores padrão');
    
    setSelectedAccount('all');
    setSelectedEmail('none');
    setSelectedMautic('Todos');
    setSelectedCampaigns(['all']);
    setSelectedIndividualAccount('all');
    setDateRange(formattedDateRange);
    
    filtersRef.current = {
      dateRange: formattedDateRange,
      selectedAccount: 'all',
      selectedEmail: 'none',
      selectedCampaigns: ['all'],
      selectedIndividualAccount: 'all'
    };
    
    setSendsData(null);
    setOpensData(null);
    setClicksData(null);
    setRatesData(null);
    setEventsData(null);
    setLastSendData(null);
    setSendRateData(null);
    
    requestCache.current.clear();
    
    setTimeout(() => {
      fetchData();
    }, 100);
  }, [fetchData]);
  
  const refreshData = useCallback(() => {
    console.log("🔄 [MetricsContext] Atualizando dados com filtros atuais:", JSON.stringify(filtersRef.current, null, 2));
    requestCache.current.clear();
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchAccounts();
      
      if (accounts.length > 0) {
        // Simplesmente definir um array vazio para as campanhas,
        // já que a API não oferece suporte para busca de campanhas
        setCampaigns([]);
        
        const emailsData = await fetchAllEmails();
        setAllEmails(emailsData);
      }
    };
    
    loadInitialData();
  }, [fetchAccounts]);

  useEffect(() => {
    const loadEmailsOnly = async () => {
      if (accounts.length > 0) {
        // Pular o carregamento de campanhas
        setCampaigns([]);
        
        // Carregar apenas os emails
        const emailsData = await fetchAllEmails();
        setAllEmails(emailsData);
      }
    };
    
    loadEmailsOnly();
  }, [accounts, fetchAllEmails]);
  
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current && accounts.length > 0) {
      initialLoadRef.current = false;
      fetchData();
    }
  }, [fetchData, accounts]);
  
  useEffect(() => {
    if (!initialLoadRef.current && filterChanged) {
      const debounceTimer = setTimeout(() => {
        console.log("🔄 [MetricsContext] Filtros alterados, recarregando dados...");
        fetchData();
      }, 300);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [filterChanged, fetchData]);
  
  useEffect(() => {
    return () => {
      if (timersRef.current.safetyTimeout) {
        clearTimeout(timersRef.current.safetyTimeout);
      }
      if (timersRef.current.loadingTimer) {
        clearTimeout(timersRef.current.loadingTimer);
      }
    };
  }, []);
  
  window.refreshAccounts = fetchAccounts;
  window.metricsFetch = fetchData;
  window.resetMetricsFilters = resetFiltersAndRetry;
  
  const contextValue = {
    data,
    dateRange,
    setDateRange,
    selectedAccount,
    setSelectedAccount,
    selectedEmail,
    setSelectedEmail,
    selectedMautic,
    setSelectedMautic,
    selectedCampaigns,
    setSelectedCampaigns,
    selectedIndividualAccount,
    setSelectedIndividualAccount,
    showBounced,
    setShowBounced,
    activeView,
    setActiveView,
    accounts,
    campaigns,
    allEmails,
    accountsLoading,
    emailMetricsLoading,
    isFiltering,
    loadError,
    loadAttempts,
    noDataAvailable,
    refreshData,
    resetFiltersAndRetry,
    fetchEvents,
    fetchCampaigns,
    fetchAllEmails,
    fetchEmailsByAccount,
    fetchMetricsByDate,
    fetchMetricsByAccount,
    fetchOpens,
    sendsData,
    opensData,
    clicksData,
    ratesData,
    eventsData,
    lastSendData,
    sendRateData
  };
  
  return (
    <MetricsContext.Provider value={contextValue}>
      {children}
    </MetricsContext.Provider>
  );
};

export default MetricsContext;