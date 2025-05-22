import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Filter, RefreshCw, Check, ChevronDown, X, Search, Mail, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

// Importe o componente DateRangeSelector aprimorado
import DateRangeSelector from './DateRangeSelector';

const MetricsFilter = ({
  data,
  selectedAccounts,
  setSelectedAccounts,
  selectedEmails,
  setSelectedEmails,
  dateRange,
  setDateRange,
  isFiltering,
  refreshData,
  resetFiltersAndRetry,
  isMobile
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);
  const [isEmailSelectorOpen, setIsEmailSelectorOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [emails, setEmails] = useState([]);
  
  // Extrair contas únicas dos dados
  useEffect(() => {
    if (data) {
      // Extrair contas dos emails
      let accountList = [];
      if (data.emailData && Array.isArray(data.emailData)) {
        accountList = data.emailData
          .filter(email => email.account && email.account.name)
          .map(email => ({
            id: email.account.id || email.account.accountId,
            name: email.account.name,
          }));
      }
      
      // Adicionar contas específicas do objeto de contas, se disponível
      if (data.accounts && Array.isArray(data.accounts)) {
        accountList = [
          ...accountList,
          ...data.accounts.map(account => ({
            id: account.id || account.accountId,
            name: account.name,
          }))
        ];
      }
      
      // Remover duplicatas baseado no nome da conta
      const uniqueAccounts = Array.from(
        new Map(accountList.map(account => [account.name, account])).values()
      );
      
      // Log para depuração - contas encontradas
      console.log('✅ [MetricsFilter] Contas extraídas:', uniqueAccounts);
      setAccounts(uniqueAccounts);
      
      // Extrair dados de emails se disponíveis
      if (data.emailData && Array.isArray(data.emailData)) {
        const emailsData = data.emailData.map(email => ({
          id: email.id || email.emailId,
          subject: email.subject || 'Email sem assunto',
          sentDate: email.sentDate,
          accountName: email.account?.name || 'Conta desconhecida'
        }));
        
        // Log para depuração - emails encontrados
        console.log('✅ [MetricsFilter] Emails extraídos:', emailsData);
        setEmails(emailsData);
      }
    }
  }, [data]);
  
  // Funções de seleção corrigidas
  const handleAccountSelection = (accountNames) => {
    console.log('🔍 [MetricsFilter] Alterando seleção de contas:', accountNames);
    setSelectedAccounts(accountNames);
    
    // Reset email selection when account changes
    if (!accountNames.includes('all')) {
      console.log('🔍 [MetricsFilter] Resetando seleção de emails para "none" devido a seleção de contas');
      setSelectedEmails(['none']);
    }
  };
  
  const handleEmailSelection = (emailIds) => {
    console.log('🔍 [MetricsFilter] Alterando seleção de emails:', emailIds);
    setSelectedEmails(emailIds);
    
    // Reset account selection when emails are selected
    if (!emailIds.includes('none')) {
      console.log('🔍 [MetricsFilter] Resetando seleção de contas para "all" devido a seleção de emails');
      setSelectedAccounts(['all']);
    }
  };
  
  const handleDateRangeChange = (range) => {
    console.log('🔍 [MetricsFilter] Alterando intervalo de datas:', range);
    setDateRange(range);
    setIsCalendarOpen(false);  // Fechar o popover ao selecionar
  };
  
  const handleFilter = () => {
    console.log('🔍 [MetricsFilter] Aplicando filtros:', {
      contas: selectedAccounts,
      emails: selectedEmails,
      periodo: dateRange
    });
    refreshData();
  };
  
  const handleClearFilters = () => {
    console.log('🔍 [MetricsFilter] Limpando todos os filtros');
    setSelectedAccounts(['all']);
    setSelectedEmails(['none']);
    setDateRange({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
    resetFiltersAndRetry();
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="h-6 w-1 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-full mr-2"></div>
          <h3 className="text-lg font-medium text-white">Filtros e Configurações</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seletor de intervalo de datas - Componente Aprimorado */}
        <div>
          <label className="text-sm font-medium text-blue-300/80 mb-1.5 block flex items-center">
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Intervalo de Datas
          </label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10",
                  !dateRange && "text-white"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-400" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(new Date(dateRange.from), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(new Date(dateRange.to), "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(new Date(dateRange.from), "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0" 
              align="start"
            >
              {/* Aqui nós usamos o componente DateRangeSelector aprimorado */}
              <DateRangeSelector 
                dateRange={dateRange}
                onChange={handleDateRangeChange}
                onClose={() => setIsCalendarOpen(false)}
                isMobile={isMobile}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Seletor de contas - Melhorado visualmente */}
        <div>
          <label className="text-sm font-medium text-blue-300/80 mb-1.5 block flex items-center">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Contas
          </label>
          <Popover open={isAccountSelectorOpen} onOpenChange={setIsAccountSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                {selectedAccounts.includes('all') ? (
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-indigo-400" />
                    Todas as contas
                  </span>
                ) : (
                  <div className="flex items-center gap-2 overflow-hidden max-w-full">
                    <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="truncate">
                      {selectedAccounts.length} {selectedAccounts.length === 1 ? 'conta' : 'contas'}
                    </span>
                    <Badge variant="secondary" className="bg-indigo-600/30 text-indigo-300 text-xs ml-auto shrink-0">
                      {selectedAccounts.length}
                    </Badge>
                  </div>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 bg-[#0f1631]/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl rounded-xl">
              <Command className="bg-transparent">
                <CommandInput 
                  placeholder="Buscar contas..." 
                  className="text-white border-indigo-500/20 bg-[#1a2240]/50" 
                />
                <CommandList className="text-white max-h-[320px]">
                  <CommandEmpty className="py-8 text-center text-sm text-blue-300/70">
                    <Building2 className="h-12 w-12 mx-auto mb-2 text-indigo-400/50" />
                    Nenhuma conta encontrada.
                  </CommandEmpty>
                  <CommandGroup className="overflow-auto">
                    {/* Opção "Todas as contas" */}
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        handleAccountSelection(['all']);
                        setIsAccountSelectorOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer rounded-lg mx-2 my-1 p-3 transition-all duration-200",
                        selectedAccounts.includes('all') 
                          ? "bg-gradient-to-r from-indigo-600/40 to-blue-600/40 border border-indigo-500/50 shadow-md" 
                          : "hover:bg-indigo-500/20 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                        selectedAccounts.includes('all') 
                          ? "bg-indigo-500 border-indigo-500" 
                          : "border-indigo-400/40"
                      )}>
                        {selectedAccounts.includes('all') && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                        <span className="font-medium">Todas as contas</span>
                      </div>
                    </CommandItem>
                    
                    {/* Lista de contas individuais */}
                    {accounts.map((account) => (
                      <CommandItem
                        key={account.id || account.name}
                        value={account.name}
                        onSelect={() => {
                          const newSelection = selectedAccounts.includes(account.name)
                            ? selectedAccounts.filter(a => a !== account.name && a !== 'all')
                            : [...selectedAccounts.filter(a => a !== 'all'), account.name];
                          
                          // Se nenhuma conta selecionada, voltar para "todas"
                          if (newSelection.length === 0) {
                            handleAccountSelection(['all']);
                          } else {
                            handleAccountSelection(newSelection);
                          }
                          
                          // Log para depuração
                          console.log('🔍 [MetricsFilter] Item de conta selecionado:', account.name);
                          console.log('🔍 [MetricsFilter] Nova seleção de contas:', newSelection);
                        }}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer rounded-lg mx-2 my-1 p-3 transition-all duration-200",
                          selectedAccounts.includes(account.name) 
                            ? "bg-gradient-to-r from-indigo-600/40 to-blue-600/40 border border-indigo-500/50 shadow-md" 
                            : "hover:bg-indigo-500/20 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                          selectedAccounts.includes(account.name) 
                            ? "bg-indigo-500 border-indigo-500" 
                            : "border-indigo-400/40"
                        )}>
                          {selectedAccounts.includes(account.name) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span className="truncate">{account.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <div className="border-t border-indigo-500/30 p-3 flex justify-between bg-[#1a2240]/30">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      handleAccountSelection(['all']);
                      setIsAccountSelectorOpen(false);
                    }}
                    className="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200"
                  >
                    Limpar seleção
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setIsAccountSelectorOpen(false);
                      console.log('🔍 [MetricsFilter] Seleção final de contas:', selectedAccounts);
                    }}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Aplicar
                  </Button>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Seletor de emails - Melhorado visualmente */}
        <div>
          <label className="text-sm font-medium text-blue-300/80 mb-1.5 block flex items-center">
            <Mail className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
            Emails
          </label>
          <Popover open={isEmailSelectorOpen} onOpenChange={setIsEmailSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                {selectedEmails.includes('none') ? (
                  <span className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-indigo-400" />
                    Selecione emails
                  </span>
                ) : (
                  <div className="flex items-center gap-2 overflow-hidden max-w-full">
                    <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="truncate">
                      {selectedEmails.length} {selectedEmails.length === 1 ? 'email' : 'emails'}
                    </span>
                    <Badge variant="secondary" className="bg-purple-600/30 text-purple-300 text-xs ml-auto shrink-0">
                      {selectedEmails.length}
                    </Badge>
                  </div>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-[#0f1631]/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl rounded-xl">
              <Command className="bg-transparent">
                <CommandInput 
                  placeholder="Buscar emails..." 
                  className="text-white border-indigo-500/20 bg-[#1a2240]/50" 
                />
                <CommandList className="text-white max-h-[400px]">
                  <CommandEmpty className="py-8 text-center text-sm text-blue-300/70">
                    <Mail className="h-12 w-12 mx-auto mb-2 text-indigo-400/50" />
                    Nenhum email encontrado.
                  </CommandEmpty>
                  <CommandGroup className="overflow-auto">
                    {/* Opção "Nenhum email" */}
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        handleEmailSelection(['none']);
                        setIsEmailSelectorOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer rounded-lg mx-2 my-1 p-3 transition-all duration-200",
                        selectedEmails.includes('none') 
                          ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50 shadow-md" 
                          : "hover:bg-purple-500/20 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                        selectedEmails.includes('none') 
                          ? "bg-purple-500 border-purple-500" 
                          : "border-purple-400/40"
                      )}>
                        {selectedEmails.includes('none') && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <X className="h-4 w-4 text-purple-400" />
                        <span className="font-medium">Nenhum email (usar contas)</span>
                      </div>
                    </CommandItem>
                    
                    {/* Lista de emails individuais */}
                    {emails.map((email) => (
                      <CommandItem
                        key={email.id}
                        value={email.subject}
                        onSelect={() => {
                          const newSelection = selectedEmails.includes(email.id)
                            ? selectedEmails.filter(e => e !== email.id && e !== 'none')
                            : [...selectedEmails.filter(e => e !== 'none'), email.id];
                          
                          // Se nenhum email selecionado, voltar para "none"
                          if (newSelection.length === 0) {
                            handleEmailSelection(['none']);
                          } else {
                            handleEmailSelection(newSelection);
                          }
                          
                          // Log para depuração
                          console.log('🔍 [MetricsFilter] Item de email selecionado:', email.subject);
                          console.log('🔍 [MetricsFilter] ID do email selecionado:', email.id);
                          console.log('🔍 [MetricsFilter] Nova seleção de emails:', newSelection);
                        }}
                        className={cn(
                          "flex items-start gap-3 cursor-pointer rounded-lg mx-2 my-1 p-3 transition-all duration-200",
                          selectedEmails.includes(email.id) 
                            ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50 shadow-md" 
                            : "hover:bg-purple-500/20 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 mt-0.5 shrink-0",
                          selectedEmails.includes(email.id) 
                            ? "bg-purple-500 border-purple-500" 
                            : "border-purple-400/40"
                        )}>
                          {selectedEmails.includes(email.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-purple-400 shrink-0" />
                            <span className="truncate font-medium text-white leading-tight">
                              {email.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-300/70">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{email.accountName}</span>
                            <span className="text-purple-300/50">•</span>
                            <span className="shrink-0">
                              {email.sentDate ? 
                                new Date(email.sentDate).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <div className="border-t border-indigo-500/30 p-3 flex justify-between bg-[#1a2240]/30">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      handleEmailSelection(['none']);
                      setIsEmailSelectorOpen(false);
                    }}
                    className="text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all duration-200"
                  >
                    Limpar seleção
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setIsEmailSelectorOpen(false);
                      console.log('🔍 [MetricsFilter] Seleção final de emails:', selectedEmails);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Aplicar
                  </Button>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Botões de ação melhorados */}
        <div className="flex gap-2 items-end">
          <Button 
            onClick={handleFilter}
            disabled={isFiltering}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 border-0 hover:shadow-lg hover:shadow-indigo-600/30 text-white transition-all duration-200 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFiltering ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Filtrando...
              </>
            ) : (
              <>
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </>
            )}
          </Button>
          <Button 
            onClick={handleClearFilters}
            variant="outline" 
            className="bg-[#0f1631] border-indigo-500/20 hover:bg-[#192041] hover:border-indigo-500/40 text-white transition-all duration-200 hover:shadow-md"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Badge de filtragem ativa melhorados */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Badge para intervalo de datas */}
        {dateRange?.from && dateRange?.to && (
          <Badge 
            variant="outline" 
            className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1"
          >
            <CalendarIcon className="mr-1.5 h-3 w-3" />
            <span className="mr-1 font-medium">Período:</span>
            {format(new Date(dateRange.from), "dd/MM/yyyy", { locale: ptBR })} a {format(new Date(dateRange.to), "dd/MM/yyyy", { locale: ptBR })}
          </Badge>
        )}
        
        {/* Badge para contas selecionadas */}
        {!selectedAccounts.includes('all') && (
          <Badge 
            variant="outline" 
            className="bg-blue-500/20 text-blue-300 border-blue-400/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1"
          >
            <Building2 className="mr-1.5 h-3 w-3" />
            <span className="mr-1 font-medium">Contas:</span>
            {selectedAccounts.length} selecionadas
          </Badge>
        )}
        
        {/* Badge para emails selecionados */}
        {!selectedEmails.includes('none') && (
          <Badge 
            variant="outline" 
            className="bg-purple-500/20 text-purple-300 border-purple-400/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1"
          >
            <Mail className="mr-1.5 h-3 w-3" />
            <span className="mr-1 font-medium">Emails:</span>
            {selectedEmails.length} selecionados
          </Badge>
        )}
      </div>
    </div>
  );
};

export default MetricsFilter;