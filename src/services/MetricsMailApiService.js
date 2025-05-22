import axios from 'axios';

class MetricsMailApiService {
  constructor() {
    this.BASE_URL = import.meta.env.VITE_METRICS_API_URL || 'https://metrics.devoltaaojogo.com';
    this.API_KEY = import.meta.env.VITE_METRICS_API_KEY || 'MAaDylN2bs0Y01Ep66';
    this.AUTH_HEADER = 'x-api-key';
    this.MAX_RETRIES = 2;
    this.RETRY_DELAY = 1000;
    
    this.api = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        [this.AUTH_HEADER]: this.API_KEY
      },
      timeout: 30000
    });
    
    this.setupInterceptors();
    
    this.requestCount = {
      total: 0,
      success: 0,
      error: 0
    };
  }

  setupInterceptors() {
    this.api.interceptors.request.use(
      config => {
        this.requestCount.total++;
        
        config.headers[this.AUTH_HEADER] = this.API_KEY;
        
        if (config.params) {
          Object.keys(config.params).forEach(key => {
            if (config.params[key] === undefined || 
                config.params[key] === null || 
                config.params[key] === 'undefined' ||
                config.params[key] === '') {
              delete config.params[key];
            }
          });
          
          if (config.params.startDate && config.params.endDate) {
            const startDate = new Date(config.params.startDate);
            const endDate = new Date(config.params.endDate);
            const today = new Date();
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              
              config.params.startDate = thirtyDaysAgo.toISOString().split('T')[0];
              config.params.endDate = today.toISOString().split('T')[0];
            }
            else if (startDate > today || endDate > today) {
              config.params.endDate = today.toISOString().split('T')[0];
              
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              
              config.params.startDate = thirtyDaysAgo.toISOString().split('T')[0];
            }
          }
        }
        
        config.metadata = {
          startTime: new Date().getTime()
        };
        
        console.log(`🔍 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.params || {});
        return config;
      },
      error => {
        this.requestCount.error++;
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );
    
    this.api.interceptors.response.use(
      response => {
        this.requestCount.success++;
        
        const duration = new Date().getTime() - response.config.metadata.startTime;
        console.log(`✅ API Response (${duration}ms): ${response.config.method?.toUpperCase()} ${response.config.url}`);
        
        if (response.data && !response.data.success) {
          console.warn('API returned success: false', response.data);
        }
        
        return response.data;
      },
      error => {
        this.requestCount.error++;
        
        let errorMessage = error.message || 'Unknown error';
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        const config = error.config;
        
        if (!config) {
          console.error('API Error (no config):', error);
          return Promise.reject({
            message: errorMessage,
            status: statusCode,
            data: responseData
          });
        }
        
        const duration = new Date().getTime() - (config.metadata?.startTime || 0);
        console.error(`❌ API Error (${duration}ms): ${config.method?.toUpperCase()} ${config.url}`, { 
          status: statusCode, 
          message: errorMessage,
          data: responseData,
          requestParams: config.params
        });
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = `Request timeout: server took more than ${config.timeout/1000} seconds to respond`;
        } else if (statusCode) {
          errorMessage = `Error ${statusCode}: ${responseData?.message || errorMessage}`;
        }
        
        if (config.retryCount === undefined) {
          config.retryCount = 0;
        }
        
        if (config.retryCount < this.MAX_RETRIES && 
            (statusCode === 429 || statusCode === 500 || statusCode === 503 || error.code === 'ECONNABORTED')) {
          config.retryCount++;
          
          const delay = this.RETRY_DELAY * config.retryCount;
          console.log(`🔄 Retrying request (attempt ${config.retryCount}/${this.MAX_RETRIES}) in ${delay}ms`);
          
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(this.api(config));
            }, delay);
          });
        }
        
        return Promise.reject({
          message: responseData?.message || errorMessage,
          status: statusCode,
          data: responseData
        });
      }
    );
  }

  getRequestStats() {
    return {...this.requestCount};
  }

  updateApiKey(apiKey) {
    this.API_KEY = apiKey;
    this.api.defaults.headers[this.AUTH_HEADER] = apiKey;
    return this;
  }

  cleanParams(params) {
    if (!params) return {};
    
    const cleanedParams = { ...params };
    
    Object.keys(cleanedParams).forEach(key => {
      if (cleanedParams[key] === undefined || 
          cleanedParams[key] === null || 
          cleanedParams[key] === 'undefined' ||
          cleanedParams[key] === '' ||
          (key.includes('Id') && typeof cleanedParams[key] === 'string' && cleanedParams[key].startsWith('temp-'))) {
        delete cleanedParams[key];
      }
    });
    
    return cleanedParams;
  }

  async get(url, config = {}) {
    try {
      const safeConfig = { ...config };
      
      if (safeConfig.params) {
        safeConfig.params = this.cleanParams(safeConfig.params);
      }
      
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      safeConfig.cancelToken = source.token;
      
      try {
        const response = await this.api.get(url, safeConfig);
        return response;
      } catch (error) {
        if (!axios.isCancel(error) && (!error.response || error.code === 'ECONNABORTED')) {
          return {
            success: false,
            data: [],
            error: error.message
          };
        }
        
        throw error;
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }
      
      throw error;
    }
  }
  
  async post(url, data = {}, config = {}) {
    try {
      const cleanData = this.cleanParams(data);
      return await this.api.post(url, cleanData, config);
    } catch (error) {
      throw error;
    }
  }
  
  async put(url, data = {}, config = {}) {
    try {
      const cleanData = this.cleanParams(data);
      return await this.api.put(url, cleanData, config);
    } catch (error) {
      throw error;
    }
  }
  
  async delete(url, config = {}) {
    try {
      return await this.api.delete(url, config);
    } catch (error) {
      throw error;
    }
  }

  async listAccounts(userId) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    return await this.get(`/api/users/${userId}/accounts`);
  }
  
  async getAccount(userId, accountId) {
    if (!userId || !accountId) {
      return { success: false, data: null, message: "ID de usuário ou ID de conta não fornecido" };
    }
    return await this.get(`/api/users/${userId}/accounts/${accountId}`);
  }
  
  async getAccountWebhook(userId, accountId) {
    if (!userId || !accountId) {
      return { success: false, data: null, message: "ID de usuário ou ID de conta não fornecido" };
    }
    return await this.get(`/api/users/${userId}/accounts/${accountId}/webhook`);
  }
  
  async createAccount(userId, accountData) {
    if (!userId) {
      return { success: false, message: "ID de usuário não fornecido" };
    }
    return await this.post(`/api/users/${userId}/accounts`, accountData);
  }
  
  async updateAccount(userId, accountId, accountData) {
    if (!userId || !accountId) {
      return { success: false, message: "ID de usuário ou ID de conta não fornecido" };
    }
    return await this.put(`/api/users/${userId}/accounts/${accountId}`, accountData);
  }
  
  async deleteAccount(userId, accountId) {
    if (!userId || !accountId) {
      return { success: false, message: "ID de usuário ou ID de conta não fornecido" };
    }
    return await this.delete(`/api/users/${userId}/accounts/${accountId}`);
  }

  async getAccountEmails(userId, accountId) {
    if (!userId || !accountId) {
      return { success: false, data: [], message: "ID de usuário ou ID de conta não fornecido" };
    }
    return await this.get(`/api/users/${userId}/accounts/${accountId}/emails`);
  }

  async getMetricsByDate(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/by-date`, {
      params: cleanedFilters
    });
  }

  async getMetricsByAccount(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/by-account`, {
      params: cleanedFilters
    });
  }
  
  async getMetricsByEmail(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/by-email`, {
      params: cleanedFilters
    });
  }

  async getOpens(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/opens`, {
      params: cleanedFilters
    });
  }

  async getLastSend(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: null, message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/last-send`, {
      params: cleanedFilters
    });
  }

  async getConversionRates(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    return await this.get(`/api/users/${userId}/metrics/rates`, {
      params: this.cleanParams(filters)
    });
  }

  async getSendRate(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: null, message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/metrics/send-rate`, {
      params: cleanedFilters
    });
  }
  
  async getDailySends(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    try {
      const response = await this.get(`/api/users/${userId}/metrics/daily-sends`, {
        params: this.cleanParams(filters)
      });
      
      if (response && response.success) {
        let data = response.data;
        
        if (Array.isArray(data)) {
          const normalizedData = data.map(item => ({
            date: item.date,
            totalSends: item.totalSends || item.sends || item.count || 0
          }));
          
          return {
            ...response,
            data: normalizedData
          };
        } else if (data && Array.isArray(data.labels) && data.datasets) {
          const transformedData = data.labels.map((date, index) => ({
            date,
            totalSends: data.datasets[0]?.data[index] || 0
          }));
          
          return {
            ...response,
            data: transformedData
          };
        } else if (data && typeof data === 'object') {
          return {
            ...response,
            data: [{
              date: data.date,
              totalSends: data.totalSends || data.sends || data.count || 0
            }]
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar dados de envios diários:', error);
      return {
        success: false,
        data: [],
        message: error.message
      };
    }
  }
  
  async getDailyOpens(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const params = this.cleanParams({
      ...filters,
      uniqueOnly: filters.uniqueOnly || false
    });
    
    try {
      const response = await this.get(`/api/users/${userId}/metrics/daily-opens`, {
        params: params
      });
      
      if (response && response.success) {
        let data = response.data;
        
        if (Array.isArray(data)) {
          const normalizedData = data.map(item => ({
            date: item.date,
            totalOpens: item.totalOpens || item.opens || item.count || 0,
            uniqueOpens: item.uniqueOpens || 0
          }));
          
          return {
            ...response,
            data: normalizedData
          };
        } else if (data && Array.isArray(data.labels) && data.datasets) {
          const transformedData = data.labels.map((date, index) => ({
            date,
            totalOpens: data.datasets[0]?.data[index] || 0,
            uniqueOpens: data.datasets[1]?.data[index] || 0
          }));
          
          return {
            ...response,
            data: transformedData
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar dados de aberturas diárias:', error);
      return {
        success: false,
        data: [],
        message: error.message
      };
    }
  }
  
  async getDailyClicks(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const params = this.cleanParams({
      ...filters,
      uniqueOnly: filters.uniqueOnly || false
    });
    
    try {
      const response = await this.get(`/api/users/${userId}/metrics/daily-clicks`, {
        params: params
      });
      
      if (response && response.success) {
        let data = response.data;
        
        if (Array.isArray(data)) {
          const normalizedData = data.map(item => ({
            date: item.date,
            totalClicks: item.totalClicks || item.clicks || item.count || 0,
            uniqueClicks: item.uniqueClicks || 0
          }));
          
          return {
            ...response,
            data: normalizedData
          };
        } else if (data && Array.isArray(data.labels) && data.datasets) {
          const transformedData = data.labels.map((date, index) => ({
            date,
            totalClicks: data.datasets[0]?.data[index] || 0,
            uniqueClicks: data.datasets[1]?.data[index] || 0
          }));
          
          return {
            ...response,
            data: transformedData
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar dados de cliques diários:', error);
      return {
        success: false,
        data: [],
        message: error.message
      };
    }
  }
  
  async getRecentEvents(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const params = this.cleanParams({
      ...filters,
      limit: filters.limit || 100,
      page: filters.page || 1
    });
    
    return await this.get(`/api/users/${userId}/metrics/events`, { params });
  }

  async getEmails(userId, filters = {}) {
    if (!userId) {
      return { success: false, data: [], message: "ID de usuário não fornecido" };
    }
    
    const cleanedFilters = this.cleanParams(filters);
    
    return await this.get(`/api/users/${userId}/emails`, {
      params: cleanedFilters
    });
  }

  async getEmail(userId, emailId) {
    if (!userId || !emailId) {
      return { success: false, data: null, message: "ID de usuário ou ID de email não fornecido" };
    }
    
    return await this.get(`/api/users/${userId}/emails/${emailId}`);
  }
  
  async processMauticWebhook(webhookId, webhookData) {
    if (!webhookId) {
      return { success: false, message: "ID do webhook não fornecido" };
    }
    
    return await this.post(`/api/webhooks/${webhookId}`, webhookData);
  }
  
  async checkHealth() {
    try {
      const response = await this.api.get('/', { 
        timeout: 5000
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const metricsMailApi = new MetricsMailApiService();

window.metricsMailApi = metricsMailApi;