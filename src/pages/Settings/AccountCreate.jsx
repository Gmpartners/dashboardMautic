import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Layers, Database, Key, RefreshCw, Mail, Server, CheckCircle, AlertCircle, CheckCheck, X, User, Lock, Copy, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { metricsMailApi } from '../../services/MetricsMailApiService';

const AccountCreate = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const webhookUrlRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    provider: 'mautic',
    url: '',
    username: '',
    password: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [feedback, setFeedback] = useState({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
  
  const [webhookInfo, setWebhookInfo] = useState({
    webhookUrl: null,
    accountId: null,
    copied: false
  });
  
  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 200);
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const handleSelectChange = (name, value) => {
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const showFeedback = (type, title, message) => {
    setFeedback({
      show: true,
      type,
      title,
      message
    });
    
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, 5000);
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formState.name.trim()) {
      errors.name = 'Nome da conta é obrigatório';
    }
    
    if (!formState.url.trim()) {
      errors.url = 'URL do Mautic é obrigatória';
    } else if (!/^https?:\/\/.+/i.test(formState.url)) {
      errors.url = 'URL inválida, deve começar com http:// ou https://';
    }
    
    if (!formState.username.trim()) {
      errors.username = 'Nome de usuário é obrigatório';
    }
    
    if (!formState.password.trim()) {
      errors.password = 'Senha é obrigatória';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showFeedback(
        'error',
        'Erro de validação',
        'Corrija os erros no formulário antes de prosseguir.'
      );
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userId = localStorage.getItem('userId') || '1';
      
      const accountData = {
        name: formState.name.trim(),
        provider: formState.provider,
        url: formState.url.trim(),
        username: formState.username.trim(),
        password: formState.password.trim()
      };
      
      const response = await metricsMailApi.createAccount(userId, accountData);
      
      let accountId = null;
      
      if (response.data && response.data.accountId) {
        accountId = response.data.accountId;
      } else if (response.accountId) {
        accountId = response.accountId;
      } else if (response.data && response.data.id) {
        accountId = response.data.id;
      } else if (response.id) {
        accountId = response.id;
      }
      
      if (!accountId) {
        throw new Error("Não foi possível obter o ID da conta criada.");
      }
      
      localStorage.setItem('lastCreatedAccountId', accountId);
      
      const webhook = await getAccountWebhook(accountId);
      
      if (webhook && webhook.webhookUrl) {
        setWebhookInfo({
          webhookUrl: webhook.webhookUrl,
          accountId: accountId,
          copied: false
        });
      }
      
      try {
        const campaignsResponse = await metricsMailApi.getMauticCampaigns(userId, accountId);
      } catch (campaignError) {
      }
      
      showFeedback(
        'success',
        'Conta criada com sucesso!',
        `A conta ${formState.name} foi criada com sucesso. ID: ${accountId}`
      );
      
      if (typeof window.refreshAccounts === 'function') {
        window.refreshAccounts();
      }
      
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      
      showFeedback(
        'error',
        'Erro ao criar conta',
        error.message || "Ocorreu um erro ao criar a conta. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const getAccountWebhook = async (accountId) => {
    if (!accountId) return null;
    
    try {
      setWebhookLoading(true);
      const userId = localStorage.getItem('userId') || '1';
      const webhookInfo = await metricsMailApi.getAccountWebhook(userId, accountId);
      return webhookInfo.data || webhookInfo;
    } catch (error) {
      console.error('Erro ao obter webhook da conta:', error);
      return null;
    } finally {
      setWebhookLoading(false);
    }
  };
  
  const regenerateWebhook = async () => {
    if (!webhookInfo.accountId) return;
    
    setWebhookLoading(true);
    try {
      const userId = localStorage.getItem('userId') || '1';
      const response = await metricsMailApi.getAccountWebhook(userId, webhookInfo.accountId);
      
      if (response && (response.webhookUrl || (response.data && response.data.webhookUrl))) {
        const webhookUrl = response.webhookUrl || response.data.webhookUrl;
        setWebhookInfo(prev => ({
          ...prev,
          webhookUrl: webhookUrl,
          copied: false
        }));
        
        showFeedback(
          'success',
          'Webhook regenerado',
          'A URL do webhook foi regenerada com sucesso.'
        );
      }
    } catch (error) {
      console.error('Erro ao regenerar webhook:', error);
      showFeedback(
        'error',
        'Erro ao regenerar webhook',
        error.message || 'Não foi possível regenerar o webhook. Tente novamente.'
      );
    } finally {
      setWebhookLoading(false);
    }
  };
  
  const copyWebhookUrl = () => {
    if (webhookInfo.webhookUrl) {
      navigator.clipboard.writeText(webhookInfo.webhookUrl);
      setWebhookInfo(prev => ({ ...prev, copied: true }));
      
      setTimeout(() => {
        setWebhookInfo(prev => ({ ...prev, copied: false }));
      }, 3000);
    }
  };
  
  return (
    <div className={`px-6 py-8 w-full overflow-auto bg-gradient-to-b from-[#0c1020] to-[#131a32] min-h-screen transition-all duration-500 ${
      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      
      {feedback.show && (
        <div 
          className={`fixed top-6 right-6 z-50 max-w-md transition-all duration-500 transform ${
            feedback.show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
        >
          <div 
            className={`px-6 py-4 rounded-xl shadow-xl backdrop-blur-xl border ${
              feedback.type === 'success' 
                ? 'bg-green-900/80 border-green-500/30' 
                : 'bg-red-900/80 border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {feedback.type === 'success' ? (
                  <CheckCheck className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <div>
                  <h4 className="font-medium text-white">{feedback.title}</h4>
                  <p className={`text-sm ${feedback.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
                    {feedback.message}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setFeedback(prev => ({ ...prev, show: false }))}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-full">
        <div className="relative mb-8 animate-fade-in">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">Nova Conta</h1>
              </div>
              <p className="text-blue-300/80 mt-2">
                Configure uma nova conta para integração com o Mautic
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="h-10 px-4 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                Voltar para Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl mb-8 animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-lg font-semibold text-white">
                Informações da Conta
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} ref={formRef}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <Label 
                    htmlFor="name" 
                    className="text-blue-300/80 flex items-center gap-1.5 font-medium"
                  >
                    <Layers className="h-4 w-4 text-indigo-400" />
                    Nome da Conta
                  </Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="Ex: Marketing Principal"
                    className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                    value={formState.name}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  {validationErrors.name && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  <Label 
                    htmlFor="provider" 
                    className="text-blue-300/80 flex items-center gap-1.5 font-medium"
                  >
                    <Database className="h-4 w-4 text-indigo-400" />
                    Provedor
                  </Label>
                  <Select
                    onValueChange={(value) => handleSelectChange('provider', value)}
                    defaultValue={formState.provider}
                  >
                    <SelectTrigger 
                      id="provider" 
                      className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                    >
                      <SelectValue placeholder="Selecione o provedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202942] border-indigo-500/20 rounded-lg">
                      <SelectItem value="mautic" className="text-white hover:bg-indigo-500/20">Mautic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Label 
                    htmlFor="url" 
                    className="text-blue-300/80 flex items-center gap-1.5 font-medium"
                  >
                    <Server className="h-4 w-4 text-indigo-400" />
                    URL do Mautic
                  </Label>
                  <Input 
                    id="url"
                    name="url"
                    placeholder="https://mautic.seudominio.com"
                    className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                    value={formState.url}
                    onChange={handleInputChange}
                    autoComplete="url"
                  />
                  {validationErrors.url && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.url}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  <Label 
                    htmlFor="username" 
                    className="text-blue-300/80 flex items-center gap-1.5 font-medium"
                  >
                    <User className="h-4 w-4 text-indigo-400" />
                    Nome de Usuário
                  </Label>
                  <Input 
                    id="username"
                    name="username"
                    placeholder="Seu nome de usuário do Mautic"
                    className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                    value={formState.username}
                    onChange={handleInputChange}
                    autoComplete="username"
                  />
                  {validationErrors.username && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.username}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 md:col-span-2">
                  <Label 
                    htmlFor="password" 
                    className="text-blue-300/80 flex items-center gap-1.5 font-medium"
                  >
                    <Lock className="h-4 w-4 text-indigo-400" />
                    Senha
                  </Label>
                  <Input 
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha do Mautic"
                    className="w-full bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-11 transition-all duration-200"
                    value={formState.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                  />
                  {validationErrors.password && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 border-t border-white/10 pt-6">
                <Label className="text-blue-300/80 flex items-center gap-1.5 mb-3 font-medium">
                  <Link className="h-4 w-4 text-indigo-400" />
                  URL do Webhook
                </Label>
                
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    ref={webhookUrlRef} 
                    className="bg-[#0f1631]/60 backdrop-blur-sm border border-indigo-500/20 text-white px-4 py-3 rounded-lg font-mono text-sm flex-1 overflow-hidden shadow-inner"
                  >
                    {webhookInfo.webhookUrl || "URL do webhook será gerada após a criação da conta"}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-11 px-3 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
                    onClick={copyWebhookUrl}
                    disabled={!webhookInfo.webhookUrl}
                  >
                    {webhookInfo.copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar URL
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
                    onClick={regenerateWebhook}
                    disabled={webhookLoading || !webhookInfo.accountId}
                  >
                    {webhookLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-blue-300/70 text-sm mb-3">
                  Configure esta URL no seu painel Mautic para receber eventos de emails.
                </p>
                
                {webhookInfo.webhookUrl && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={() => navigate('/')}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Ir para Dashboard
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button 
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 rounded-xl shadow-xl animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-500/20 text-indigo-400 p-3 rounded-lg border border-indigo-500/30">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Instruções para Webhook</h3>
                <p className="text-blue-300/70 mb-3 text-sm">
                  Após criar a conta, você receberá uma URL de webhook. Esta URL deve ser configurada no seu painel Mautic em:
                </p>
                <ol className="text-blue-300/70 space-y-2 text-sm list-decimal pl-4">
                  <li>Acesse seu painel do Mautic e navegue até Configurações</li>
                  <li>Clique em "Webhooks" no menu lateral</li>
                  <li>Adicione um novo webhook com a URL fornecida</li>
                  <li>Configure os eventos: email_on_open, email_on_send, email_on_click, email_on_bounce, email_on_unsubscribe</li>
                </ol>
                <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <p className="text-indigo-300 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Após criar a conta, copie a URL do webhook fornecida para configurar no seu Mautic
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountCreate;