import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSignup } from "../../hooks/useSignup";
import { cn } from "@/lib/utils.js";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icons
import { 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle,
  ShieldCheck,
  X,
  Flame,
  AlertCircle
} from 'lucide-react';

// Password strength component
const PasswordStrength = ({ password }) => {
  const calculateStrength = (pass) => {
    if (!pass) return 0;
    
    let strength = 0;
    
    // Length check
    if (pass.length >= 8) strength += 1;
    
    // Contains lowercase
    if (/[a-z]/.test(pass)) strength += 1;
    
    // Contains uppercase
    if (/[A-Z]/.test(pass)) strength += 1;
    
    // Contains number
    if (/[0-9]/.test(pass)) strength += 1;
    
    // Contains special char
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    
    return strength;
  };
  
  const strength = calculateStrength(password);
  
  const getColor = () => {
    if (strength <= 1) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getLabel = () => {
    if (strength <= 1) return 'Fraca';
    if (strength <= 3) return 'Média';
    return 'Forte';
  };
  
  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 bg-[#0f1631]/60 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor()} transition-all duration-300`} 
            style={{ width: `${(strength / 5) * 100}%` }}
          ></div>
        </div>
        <span className={`text-xs font-medium ${
          strength <= 1 ? 'text-red-400' : 
          strength <= 3 ? 'text-yellow-400' : 
          'text-green-400'
        }`}>
          {getLabel()}
        </span>
      </div>
    </div>
  );
};

export default function Signup() {
  const { signup, isPending, error } = useSignup();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: "",
    general: ""
  });

  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 300);
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: "",
      general: ""
    };
    let isValid = true;

    if (!fullName) {
      errors.fullName = "O nome completo é obrigatório";
      isValid = false;
    } else if (fullName.length < 3) {
      errors.fullName = "O nome deve ter pelo menos 3 caracteres";
      isValid = false;
    }

    if (!email) {
      errors.email = "O email é obrigatório";
      isValid = false;
    } else if (!validateEmail(email)) {
      errors.email = "Digite um email válido";
      isValid = false;
    }

    if (!password) {
      errors.password = "A senha é obrigatória";
      isValid = false;
    } else if (password.length < 6) {
      errors.password = "A senha deve ter pelo menos 6 caracteres";
      isValid = false;
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "As senhas não coincidem";
      isValid = false;
    }

    if (!isTermsAccepted) {
      errors.terms = "Você precisa aceitar os termos e condições";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await signup(email, password, fullName);
    } catch (err) {
      console.error("Erro ao fazer cadastro:", err);
      setValidationErrors({
        ...validationErrors,
        general: "Ocorreu um erro ao tentar criar sua conta. Tente novamente."
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0c1020] to-[#131a32] overflow-auto">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, index) => (
            <div 
              key={index} 
              className="absolute rounded-full bg-indigo-500/10"
              style={{
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3 + 0.1,
                animation: `float ${Math.random() * 40 + 20}s infinite alternate ease-in-out`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-gradient-to-r from-indigo-500/5 to-indigo-500/0 blur-[80px] opacity-30"></div>
          <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-r from-indigo-500/5 to-indigo-500/0 blur-[80px] opacity-20"></div>
          <div className="absolute -bottom-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-r from-blue-500/5 to-blue-500/0 blur-[80px] opacity-20"></div>
        </div>
      </div>

      <div className="container mx-auto relative z-10 px-4 py-8 flex flex-col items-center justify-center flex-grow">
        
        <div className={cn(
          "w-full max-w-md mb-6",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          "transition-all duration-500"
        )}>
          <Link to="/login" className="inline-flex items-center text-blue-300/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para login
          </Link>
        </div>

        <div className={cn(
          "mb-6 flex items-center justify-center gap-3",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          "transition-all duration-500 delay-100"
        )}>
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 rounded-lg">
            <Flame className="h-8 w-8 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Email<span className="text-indigo-500">Insights</span></h1>
        </div>

        <Card className={cn(
          "w-full max-w-md bg-gradient-to-br from-[#202942] to-[#2a3452] border border-white/8 text-white rounded-xl backdrop-blur-xl shadow-xl",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          "transition-all duration-500 delay-200"
        )}>
          
          <CardHeader className="space-y-1 pt-6 pb-4">
            <CardTitle className="text-xl text-center font-bold text-white">
              Criar nova conta
            </CardTitle>
            <p className="text-center text-sm text-blue-300/70">
              Preencha os dados para acessar o Email Insights
            </p>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSignup} className="space-y-4">
              
              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  validationErrors.fullName ? "ring-1 ring-red-500/50" : ""
                )}>
                  <User className={cn(
                    "absolute left-3 top-3 h-4 w-4 text-indigo-400",
                    validationErrors.fullName ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationErrors.fullName) {
                        setValidationErrors({ ...validationErrors, fullName: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-10 transition-all duration-200 placeholder:text-blue-300/50",
                      validationErrors.fullName ? "border-red-500/50" : ""
                    )}
                  />
                </div>
                
                {validationErrors.fullName && (
                  <p className="text-red-400 text-xs flex items-center gap-1 ml-2">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  validationErrors.email ? "ring-1 ring-red-500/50" : ""
                )}>
                  <Mail className={cn(
                    "absolute left-3 top-3 h-4 w-4 text-indigo-400",
                    validationErrors.email ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-10 transition-all duration-200 placeholder:text-blue-300/50",
                      validationErrors.email ? "border-red-500/50" : ""
                    )}
                  />
                </div>
                
                {validationErrors.email && (
                  <p className="text-red-400 text-xs flex items-center gap-1 ml-2">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  validationErrors.password ? "ring-1 ring-red-500/50" : ""
                )}>
                  <Lock className={cn(
                    "absolute left-3 top-3 h-4 w-4 text-indigo-400",
                    validationErrors.password ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors({ ...validationErrors, password: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 pr-10 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-10 transition-all duration-200 placeholder:text-blue-300/50",
                      validationErrors.password ? "border-red-500/50" : ""
                    )}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 transition-all duration-200 text-blue-300/70 hover:text-indigo-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {password && <PasswordStrength password={password} />}
                
                {validationErrors.password && (
                  <p className="text-red-400 text-xs flex items-center gap-1 ml-2">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className={cn(
                  "relative",
                  validationErrors.confirmPassword ? "ring-1 ring-red-500/50" : ""
                )}>
                  <Lock className={cn(
                    "absolute left-3 top-3 h-4 w-4 text-indigo-400",
                    validationErrors.confirmPassword ? "text-red-400" : ""
                  )} />
                  
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationErrors.confirmPassword) {
                        setValidationErrors({ ...validationErrors, confirmPassword: "" });
                      }
                    }}
                    className={cn(
                      "pl-10 pr-10 bg-gradient-to-r from-[#0f1631] to-[#192041] border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-white focus-visible:ring-indigo-500 h-10 transition-all duration-200 placeholder:text-blue-300/50",
                      validationErrors.confirmPassword ? "border-red-500/50" : ""
                    )}
                  />
                  
                  {confirmPassword && (
                    <div className="absolute right-3 top-3">
                      {password === confirmPassword ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                
                {validationErrors.confirmPassword && (
                  <p className="text-red-400 text-xs flex items-center gap-1 ml-2">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="relative inline-flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={isTermsAccepted}
                      onChange={() => {
                        setIsTermsAccepted(!isTermsAccepted);
                        if (validationErrors.terms) {
                          setValidationErrors({ ...validationErrors, terms: "" });
                        }
                      }}
                      className={cn(
                        "w-4 h-4 rounded transition-colors duration-200 focus:ring-2 focus:ring-offset-2 cursor-pointer",
                        "border-2 appearance-none relative bg-gradient-to-r from-[#0f1631] to-[#192041]",
                        isTermsAccepted ? "border-indigo-500 bg-indigo-500" : "border-indigo-500/30",
                        "focus:ring-indigo-500",
                        validationErrors.terms ? "ring-1 ring-red-500/50" : ""
                      )}
                    />
                    {isTermsAccepted && (
                      <svg 
                        className="w-2.5 h-2.5 text-white absolute left-[3px] pointer-events-none" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <label htmlFor="terms" className="text-sm text-blue-300/70">
                    Eu concordo com os <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 transition-colors">Termos e Condições</Link> e <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">Política de Privacidade</Link>
                  </label>
                </div>
                
                {validationErrors.terms && (
                  <p className="text-red-400 text-xs flex items-center gap-1 ml-6">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.terms}
                  </p>
                )}
              </div>

              {(error || validationErrors.general) && (
                <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
                  <p className="text-sm text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error || validationErrors.general}
                  </p>
                </div>
              )}

              <div className="rounded-lg p-3 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300/70">
                    Nossa plataforma segue as melhores práticas de segurança para email marketing. Seus dados estão seguros e são tratados de acordo com as regulamentações de proteção de dados.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit"
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg",
                    "px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg",
                    isPending ? "opacity-80 cursor-not-allowed" : ""
                  )}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>Criando conta...</span>
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-blue-300/70">
                  Já tem uma conta?{' '}
                  <Link
                    to="/login"
                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Faça login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className={cn(
          "mt-6 mb-4 text-center text-xs text-blue-300/50",
          isLoaded ? "opacity-100" : "opacity-0",
          "transition-opacity duration-500 delay-300"
        )}>
          <p>&copy; 2025 Email Insights. Todos os direitos reservados.</p>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(8px, 8px); }
        }
      `}</style>
    </div>
  );
}