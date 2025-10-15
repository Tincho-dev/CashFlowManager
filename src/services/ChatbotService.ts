import { pipeline, env } from '@xenova/transformers';
import { createWorker } from 'tesseract.js';
import type { AccountService } from './AccountService';
import type { TransactionService } from './TransactionService';
import LoggingService, { LogCategory } from './LoggingService';
import { TransactionType, Currency } from '../types';

// Configure transformers.js to use remote models
env.allowLocalModels = false;
env.allowRemoteModels = true;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatbotResponse {
  message: string;
  action?: {
    type: 'create_account' | 'create_transaction' | 'query_balance' | 'list_accounts' | 'list_transactions';
    data?: unknown;
  };
}

class ChatbotService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private classifier: any = null;
  private isInitialized = false;
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;
  private currentLanguage: string = 'en';
  private useMLModel = true; // Flag to enable/disable ML model
  private defaultCurrency: Currency = Currency.USD;
  private defaultAccountId: number | null = null;

  async initialize(
    accountService: AccountService, 
    transactionService: TransactionService, 
    language: string = 'en',
    defaultCurrency: Currency = Currency.USD,
    defaultAccountId: number | null = null
  ): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.accountService = accountService;
      this.transactionService = transactionService;
      this.currentLanguage = language;
      this.defaultCurrency = defaultCurrency;
      this.defaultAccountId = defaultAccountId;

      // Try to load the ML model for better intent classification
      if (this.useMLModel) {
        try {
          LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_ML_LOADING', {
            model: 'distilbert-base-uncased',
          });

          // Load a lightweight sentiment/classification model
          // Using distilbert for intent classification
          this.classifier = await pipeline(
            'text-classification',
            'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
          );

          LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
            model: 'ml-transformers-distilbert',
            language,
          });
        } catch (mlError) {
          // Fall back to keyword-based detection if ML model fails to load
          LoggingService.warning(LogCategory.SYSTEM, 'CHATBOT_ML_FALLBACK', {
            error: String(mlError),
            fallback: 'keyword-based',
          });
          this.useMLModel = false;
          this.classifier = null;

          LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
            model: 'keyword-based-multilingual',
            language,
          });
        }
      } else {
        LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
          model: 'keyword-based-multilingual',
          language,
        });
      }

      this.isInitialized = true;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_INIT_ERROR', {
        error: String(error),
      });
      throw error;
    }
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  setDefaultCurrency(currency: Currency): void {
    this.defaultCurrency = currency;
  }

  setDefaultAccount(accountId: number | null): void {
    this.defaultAccountId = accountId;
  }

  async processMessage(message: string): Promise<ChatbotResponse> {
    if (!this.isInitialized) {
      return {
        message: 'Chatbot is still initializing. Please wait a moment...',
      };
    }

    LoggingService.info(LogCategory.USER, 'CHATBOT_MESSAGE', { message });

    try {
      // Detect intent using ML model or keyword-based fallback
      const intent = await this.detectIntent(message.toLowerCase());

      switch (intent) {
        case 'balance':
          return this.handleBalanceQuery();
        
        case 'list_accounts':
          return this.handleListAccounts();
        
        case 'list_transactions':
          return this.handleListTransactions();
        
        case 'create_account':
          return this.handleCreateAccountIntent();
        
        case 'create_transaction':
          return this.handleCreateTransactionIntent();
        
        case 'create_transaction_direct':
          return this.handleDirectTransactionCreation(message);
        
        case 'help':
          return this.handleHelp();
        
        default:
          if (this.currentLanguage === 'es') {
            return {
              message: `Entendí tu mensaje, pero no estoy seguro de cómo ayudar con eso todavía. Prueba preguntándome:\n- Verificar tu saldo\n- Listar tus cuentas\n- Listar transacciones recientes\n- Crear una nueva cuenta\n- Agregar una transacción\n- Obtener ayuda`,
            };
          }
          return {
            message: `I understood your message, but I'm not sure how to help with that yet. Try asking me to:\n- Check your balance\n- List your accounts\n- List recent transactions\n- Create a new account\n- Add a transaction\n- Get help`,
          };
      }
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_PROCESS_ERROR', {
        error: String(error),
        message,
      });
      return {
        message: 'Sorry, I encountered an error processing your request. Please try again.',
      };
    }
  }

  private async detectIntent(message: string): Promise<string> {
    // Use ML model if available, otherwise fall back to keyword-based detection
    if (this.useMLModel && this.classifier) {
      try {
        // Use ML model to detect sentiment/intent
        // The model gives sentiment (POSITIVE/NEGATIVE) which we can use as a signal
        const result = await this.classifier(message);
        
        // Log ML inference for debugging
        LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_ML_INFERENCE', {
          message,
          mlResult: result,
        });

        // ML model helps but we still need keyword matching for specific intents
        // The ML model's sentiment can help us understand user intent better
        // For now, we'll use it as supplementary information
      } catch (mlError) {
        LoggingService.warning(LogCategory.SYSTEM, 'CHATBOT_ML_INFERENCE_ERROR', {
          error: String(mlError),
        });
      }
    }

    // Keyword-based intent detection (works with or without ML)
    // This is our primary method for intent classification
    
    if (message.includes('balance') || message.includes('saldo') || message.includes('total')) {
      return 'balance';
    }
    
    if (message.includes('list accounts') || message.includes('show accounts') || 
        message.includes('mis cuentas') || message.includes('listar cuentas')) {
      return 'list_accounts';
    }
    
    if (message.includes('transactions') || message.includes('transacciones') || 
        message.includes('movimientos') || message.includes('gastos') && 
        !message.match(/\$?\d+/)) {
      return 'list_transactions';
    }
    
    if (message.includes('create account') || message.includes('new account') || 
        message.includes('crear cuenta') || message.includes('nueva cuenta')) {
      return 'create_account';
    }
    
    // Detect transaction creation with amounts (e.g., "add expense $50 for groceries")
    const hasAmount = message.match(/\$?\d+(\.\d{2})?/) || message.match(/\d+\s*(dollars|pesos|usd)/i);
    const isExpense = message.match(/(gasto|expense|spent|gastado|compré|bought|pagué|paid)/i);
    const isIncome = message.match(/(ingreso|income|earned|ganado|recibí|received|cobré)/i);
    
    if (hasAmount && (isExpense || isIncome)) {
      return 'create_transaction_direct';
    }
    
    if (message.includes('add transaction') || message.includes('new transaction') || 
        message.includes('agregar gasto') || message.includes('nuevo gasto') ||
        message.includes('registrar') || message.includes('record')) {
      return 'create_transaction';
    }
    
    if (message.includes('help') || message.includes('ayuda') || message.includes('?')) {
      return 'help';
    }
    
    return 'unknown';
  }

  private handleBalanceQuery(): ChatbotResponse {
    if (!this.accountService) {
      return { message: this.currentLanguage === 'es' ? 'Servicio de cuentas no disponible.' : 'Account service not available.' };
    }

    const total = this.accountService.getTotalBalance();
    const accounts = this.accountService.getAllAccounts();

    let response = this.currentLanguage === 'es' 
      ? `Tu balance total es $${total.toFixed(2)}.\n\n`
      : `Your total balance is $${total.toFixed(2)}.\n\n`;
    
    if (accounts.length > 0) {
      response += this.currentLanguage === 'es' ? 'Desglose de cuentas:\n' : 'Account breakdown:\n';
      accounts.forEach(account => {
        response += `- ${account.name}: ${account.currency} $${account.balance.toFixed(2)}\n`;
      });
    }

    return { message: response };
  }

  private handleListAccounts(): ChatbotResponse {
    if (!this.accountService) {
      return { message: this.currentLanguage === 'es' ? 'Servicio de cuentas no disponible.' : 'Account service not available.' };
    }

    const accounts = this.accountService.getAllAccounts();

    if (accounts.length === 0) {
      return { 
        message: this.currentLanguage === 'es' 
          ? 'No tienes cuentas todavía. ¿Te gustaría crear una?' 
          : 'You don\'t have any accounts yet. Would you like to create one?' 
      };
    }

    let response = this.currentLanguage === 'es' 
      ? `Tienes ${accounts.length} cuenta(s):\n\n`
      : `You have ${accounts.length} account(s):\n\n`;
    
    accounts.forEach(account => {
      response += `📊 ${account.name} (${account.type})\n`;
      const balanceLabel = this.currentLanguage === 'es' ? '   Saldo' : '   Balance';
      response += `${balanceLabel}: ${account.currency} $${account.balance.toFixed(2)}\n\n`;
    });

    return { message: response };
  }

  private handleListTransactions(): ChatbotResponse {
    if (!this.transactionService) {
      return { message: this.currentLanguage === 'es' ? 'Servicio de transacciones no disponible.' : 'Transaction service not available.' };
    }

    // Get recent transactions (last 10)
    const allTransactions = this.transactionService.getAllTransactions();
    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    if (recentTransactions.length === 0) {
      return { 
        message: this.currentLanguage === 'es' 
          ? 'No tienes transacciones todavía.' 
          : 'You don\'t have any transactions yet.' 
      };
    }

    let response = this.currentLanguage === 'es'
      ? `Aquí están tus últimas ${recentTransactions.length} transacciones:\n\n`
      : `Here are your last ${recentTransactions.length} transactions:\n\n`;
    
    recentTransactions.forEach(tx => {
      const emoji = tx.type === 'INCOME' ? '💰' : '💸';
      const noDesc = this.currentLanguage === 'es' ? 'Sin descripción' : 'No description';
      response += `${emoji} ${tx.description || noDesc}\n`;
      const amountLabel = this.currentLanguage === 'es' ? '   Monto' : '   Amount';
      const dateLabel = this.currentLanguage === 'es' ? 'Fecha' : 'Date';
      response += `${amountLabel}: $${tx.amount.toFixed(2)} | ${dateLabel}: ${tx.date}\n`;
      if (tx.category) {
        const catLabel = this.currentLanguage === 'es' ? '   Categoría' : '   Category';
        response += `${catLabel}: ${tx.category}\n`;
      }
      response += '\n';
    });

    return { message: response };
  }

  private handleCreateAccountIntent(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: 'Para crear una cuenta, por favor usa el botón "Agregar Cuenta" en la página de Cuentas. ' +
                 'Puedo ayudarte a entender qué tipo de cuenta crear:\n\n' +
                 '- **Checking (Cuenta Corriente)**: Para transacciones diarias\n' +
                 '- **Savings (Ahorros)**: Para guardar dinero\n' +
                 '- **Credit Card (Tarjeta de Crédito)**: Para rastrear gastos con tarjeta\n' +
                 '- **Cash (Efectivo)**: Para dinero físico\n' +
                 '- **Investment (Inversión)**: Para cuentas de inversión\n\n' +
                 '💡 Consejo: Ve a la página de Cuentas y haz clic en "Agregar Cuenta" para comenzar.',
      };
    }
    return {
      message: 'To create an account, please use the "Add Account" button in the Accounts page. ' +
               'I can help you understand what type of account to create:\n\n' +
               '- **Checking**: For daily transactions\n' +
               '- **Savings**: For storing money\n' +
               '- **Credit Card**: To track credit card spending\n' +
               '- **Cash**: For physical cash\n' +
               '- **Investment**: For investment accounts\n\n' +
               '💡 Tip: Go to the Accounts page and click "Add Account" to get started.',
    };
  }

  private handleCreateTransactionIntent(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: 'Para agregar una transacción, por favor usa el botón "Agregar" en la página de Ingresos o Gastos. ' +
                 'Puedo ayudarte a entender los diferentes tipos de transacciones:\n\n' +
                 '- **Income (Ingresos)**: Dinero que recibes\n' +
                 '- **Fixed Expenses (Gastos Fijos)**: Gastos recurrentes regulares (alquiler, suscripciones)\n' +
                 '- **Variable Expenses (Gastos Variables)**: Gastos que varían (comestibles, entretenimiento)\n\n' +
                 '💡 Consejo: Ve a la página de Ingresos o Gastos y haz clic en "Agregar" para registrar.',
      };
    }
    return {
      message: 'To add a transaction, please use the "Add" button in the Income or Expenses page. ' +
               'I can help you understand the different transaction types:\n\n' +
               '- **Income**: Money you receive\n' +
               '- **Fixed Expenses**: Regular recurring expenses (rent, subscriptions)\n' +
               '- **Variable Expenses**: Expenses that vary (groceries, entertainment)\n\n' +
               '💡 Tip: Go to the Income or Expenses page and click "Add" to record a transaction.',
    };
  }

  private handleDirectTransactionCreation(message: string): ChatbotResponse {
    if (!this.accountService || !this.transactionService) {
      return { 
        message: this.currentLanguage === 'es' 
          ? 'Los servicios no están disponibles.' 
          : 'Services not available.' 
      };
    }

    try {
      // Parse transaction details from message
      const transactionData = this.parseTransactionFromMessage(message);
      
      if (!transactionData.amount) {
        return {
          message: this.currentLanguage === 'es'
            ? '❌ No pude detectar el monto. Por favor incluye un monto como "$50" o "100 dólares".\n\n' +
              '💡 Ejemplo: "Gasté $50 en comida" o "Recibí $1000 de salario en pesos"'
            : '❌ I couldn\'t detect the amount. Please include an amount like "$50" or "100 dollars".\n\n' +
              '💡 Example: "I spent $50 on food" or "I received $1000 salary in pesos"',
        };
      }

      // Get accounts
      const accounts = this.accountService.getAllAccounts();
      if (accounts.length === 0) {
        return {
          message: this.currentLanguage === 'es'
            ? '❌ No tienes cuentas. Por favor crea una cuenta primero.'
            : '❌ You don\'t have any accounts. Please create an account first.',
        };
      }

      // Use default account if set, otherwise try to match from message, or use first account
      let targetAccount = accounts[0];
      
      // Try to use default account first
      if (this.defaultAccountId) {
        const defaultAcc = this.accountService.getAccount(this.defaultAccountId);
        if (defaultAcc) {
          targetAccount = defaultAcc;
        }
      }
      
      // Try to match account from message
      const accountMatch = message.match(/cuenta\s+(\w+)|account\s+(\w+)|in\s+(\w+)|from\s+(\w+)|de\s+(\w+)/i);
      if (accountMatch) {
        const accountName = (accountMatch[1] || accountMatch[2] || accountMatch[3] || accountMatch[4] || accountMatch[5])?.toLowerCase();
        if (accountName) {
          const matchedAccount = accounts.find(acc => acc.name.toLowerCase().includes(accountName));
          if (matchedAccount) {
            targetAccount = matchedAccount;
          }
        }
      }

      // Inform user if we're using defaults
      let usedDefaultsInfo = '';
      const isDefaultAccount = this.defaultAccountId && targetAccount.id === this.defaultAccountId;
      const isDefaultCurrency = transactionData.currency === this.defaultCurrency && 
                               !message.toLowerCase().match(/(usd|ars|eur|gbp|brl|peso|dollar|euro|pound|real)/);
      
      if (isDefaultAccount || isDefaultCurrency) {
        const defaults: string[] = [];
        if (isDefaultAccount) {
          defaults.push(this.currentLanguage === 'es' ? 'cuenta predeterminada' : 'default account');
        }
        if (isDefaultCurrency) {
          defaults.push(this.currentLanguage === 'es' ? 'moneda predeterminada' : 'default currency');
        }
        
        usedDefaultsInfo = this.currentLanguage === 'es'
          ? `\n\n💡 Usé tu ${defaults.join(' y ')}.`
          : `\n\n💡 I used your ${defaults.join(' and ')}.`;
      }

      // Create the transaction
      const transaction = this.transactionService.createTransaction(
        targetAccount.id,
        transactionData.type,
        transactionData.amount,
        transactionData.currency,
        transactionData.description,
        transactionData.date,
        transactionData.category
      );

      // Build success message
      const emoji = transactionData.type === TransactionType.INCOME ? '💰' : '💸';
      const typeLabel = this.currentLanguage === 'es'
        ? (transactionData.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto')
        : (transactionData.type === TransactionType.INCOME ? 'Income' : 'Expense');
      
      let successMessage = this.currentLanguage === 'es'
        ? `${emoji} **Transacción creada exitosamente!**\n\n`
        : `${emoji} **Transaction created successfully!**\n\n`;
      
      successMessage += this.currentLanguage === 'es'
        ? `• Tipo: ${typeLabel}\n`
        : `• Type: ${typeLabel}\n`;
      
      successMessage += this.currentLanguage === 'es'
        ? `• Monto: ${transaction.currency} $${transaction.amount.toFixed(2)}\n`
        : `• Amount: ${transaction.currency} $${transaction.amount.toFixed(2)}\n`;
      
      successMessage += this.currentLanguage === 'es'
        ? `• Descripción: ${transaction.description}\n`
        : `• Description: ${transaction.description}\n`;
      
      if (transaction.category) {
        successMessage += this.currentLanguage === 'es'
          ? `• Categoría: ${transaction.category}\n`
          : `• Category: ${transaction.category}\n`;
      }
      
      successMessage += this.currentLanguage === 'es'
        ? `• Cuenta: ${targetAccount.name}\n`
        : `• Account: ${targetAccount.name}\n`;
      
      successMessage += this.currentLanguage === 'es'
        ? `• Fecha: ${transaction.date}\n\n`
        : `• Date: ${transaction.date}\n\n`;
      
      const newBalance = this.accountService.getAccount(targetAccount.id)?.balance || 0;
      successMessage += this.currentLanguage === 'es'
        ? `Nuevo saldo de ${targetAccount.name}: ${targetAccount.currency} $${newBalance.toFixed(2)}`
        : `New balance for ${targetAccount.name}: ${targetAccount.currency} $${newBalance.toFixed(2)}`;

      successMessage += usedDefaultsInfo;

      return { message: successMessage };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_CREATE_TRANSACTION_ERROR', {
        error: String(error),
        message,
      });
      
      return {
        message: this.currentLanguage === 'es'
          ? '❌ Ocurrió un error al crear la transacción. Por favor intenta de nuevo.'
          : '❌ An error occurred while creating the transaction. Please try again.',
      };
    }
  }

  private parseTransactionFromMessage(message: string): {
    type: TransactionType;
    amount: number;
    currency: Currency;
    description: string;
    date: string;
    category?: string;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Detect transaction type
    const isIncome = lowerMessage.match(/(ingreso|income|earned|ganado|recibí|received|cobré|cobrar|salary|salario)/i);
    const type = isIncome ? TransactionType.INCOME : TransactionType.VARIABLE_EXPENSE;
    
    // Extract amount
    let amount = 0;
    const amountMatch = message.match(/\$?\s*(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }
    
    // Detect currency - use default if not explicitly specified
    let currency: Currency = this.defaultCurrency;
    if (lowerMessage.includes('usd') || lowerMessage.includes('dollar') || lowerMessage.includes('dólar')) {
      currency = Currency.USD;
    } else if (lowerMessage.includes('ars') || lowerMessage.includes('peso')) {
      currency = Currency.ARS;
    } else if (lowerMessage.includes('eur') || lowerMessage.includes('euro')) {
      currency = Currency.EUR;
    } else if (lowerMessage.includes('gbp') || lowerMessage.includes('pound') || lowerMessage.includes('libra')) {
      currency = Currency.GBP;
    } else if (lowerMessage.includes('brl') || lowerMessage.includes('real') || lowerMessage.includes('reais')) {
      currency = Currency.BRL;
    }
    
    // Extract description
    let description = this.currentLanguage === 'es' ? 'Transacción desde chatbot' : 'Transaction from chatbot';
    
    // Try to extract description from common patterns
    const descPatterns = [
      /(?:for|para|por|de)\s+([a-záéíóúñ\s]+?)(?:\s+in\s+|\s+en\s+|$)/i,
      /(?:bought|compré|pagué|paid)\s+([a-záéíóúñ\s]+?)(?:\s+for|\s+por|$)/i,
      /(?:on|en)\s+([a-záéíóúñ\s]+?)(?:\s+\$|\s+for|$)/i,
    ];
    
    for (const pattern of descPatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        description = match[1].trim();
        break;
      }
    }
    
    // Detect category from keywords
    let category: string | undefined;
    const categoryMap: { [key: string]: string[] } = {
      'Groceries': ['groceries', 'food', 'comida', 'supermercado', 'mercado', 'alimentos'],
      'Transportation': ['transport', 'taxi', 'uber', 'bus', 'metro', 'transporte', 'gasolina', 'gas'],
      'Entertainment': ['entertainment', 'movie', 'cine', 'entretenimiento', 'diversión', 'juegos'],
      'Utilities': ['utilities', 'electricity', 'water', 'gas', 'internet', 'servicios', 'luz', 'agua'],
      'Rent/Mortgage': ['rent', 'mortgage', 'alquiler', 'renta', 'vivienda'],
      'Salary': ['salary', 'salario', 'sueldo', 'pago'],
      'Freelance': ['freelance', 'freelancing', 'proyecto', 'project'],
    };
    
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        category = cat;
        break;
      }
    }
    
    // Get current date
    const date = new Date().toISOString().split('T')[0];
    
    return {
      type,
      amount,
      currency,
      description,
      date,
      category,
    };
  }

  private handleHelp(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: `¡Soy tu asistente de CashFlow Manager! Aquí está lo que puedo ayudarte:\n\n` +
                 `💰 **Saldo**: Pregunta "¿Cuál es mi saldo?" para ver tu balance total\n` +
                 `📊 **Cuentas**: Pregunta "Lista mis cuentas" para ver todas tus cuentas\n` +
                 `📝 **Transacciones**: Pregunta "Muestra mis transacciones" para ver transacciones recientes\n` +
                 `➕ **Crear Cuenta**: Di "crear cuenta" y te guiaré en el proceso\n` +
                 `💸 **Agregar Transacción**: Di "gasté $50 en comida" o "recibí $1000 de salario"\n` +
                 `❓ **Ayuda**: Pregunta "Ayuda" en cualquier momento para ver este mensaje\n\n` +
                 `**Ejemplos de transacciones:**\n` +
                 `• "Gasté $25 en transporte"\n` +
                 `• "Pagué $100 por la luz"\n` +
                 `• "Recibí $2000 de salario"\n` +
                 `• "Compré comida por $45"\n\n` +
                 `**Monedas soportadas:**\n` +
                 `Puedes especificar la moneda en tus transacciones:\n` +
                 `• USD (dólar) - "gasté $50 usd"\n` +
                 `• ARS (peso argentino) - "gasté $1000 pesos"\n` +
                 `• EUR (euro) - "gasté 50 euros"\n` +
                 `• GBP (libra) - "gasté 50 libras"\n` +
                 `• BRL (real) - "gasté 100 reais"\n` +
                 `Si no especificas moneda, usaré tu moneda predeterminada: ${this.defaultCurrency}`,
      };
    }
    return {
      message: `I'm your CashFlow Manager assistant! Here's what I can help you with:\n\n` +
               `💰 **Balance**: Ask "What's my balance?" to see your total balance\n` +
               `📊 **Accounts**: Ask "List my accounts" to see all your accounts\n` +
               `📝 **Transactions**: Ask "Show my transactions" to see recent transactions\n` +
               `➕ **Create Account**: Say "create account" and I'll guide you through the process\n` +
               `💸 **Add Transaction**: Say "I spent $50 on food" or "I received $1000 salary"\n` +
               `❓ **Help**: Ask "Help" anytime to see this message\n\n` +
               `**Transaction examples:**\n` +
               `• "I spent $25 on transportation"\n` +
               `• "Paid $100 for utilities"\n` +
               `• "Received $2000 salary"\n` +
               `• "Bought groceries for $45"\n\n` +
               `**Supported currencies:**\n` +
               `You can specify currency in your transactions:\n` +
               `• USD (dollar) - "I spent $50 usd"\n` +
               `• ARS (argentine peso) - "I spent $1000 pesos"\n` +
               `• EUR (euro) - "I spent 50 euros"\n` +
               `• GBP (pound) - "I spent 50 pounds"\n` +
               `• BRL (real) - "I spent 100 reais"\n` +
               `If you don't specify currency, I'll use your default currency: ${this.defaultCurrency}`,
    };
  }

  async processImage(imageFile: File): Promise<string> {
    try {
      LoggingService.info(LogCategory.USER, 'CHATBOT_OCR_START', {
        fileName: imageFile.name,
        fileSize: imageFile.size,
      });

      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageFile);
      await worker.terminate();

      LoggingService.info(LogCategory.USER, 'CHATBOT_OCR_COMPLETE', {
        textLength: text.length,
      });

      return text;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_OCR_ERROR', {
        error: String(error),
      });
      throw error;
    }
  }

  async analyzeImageText(text: string): Promise<ChatbotResponse> {
    // Analyze OCR text for potential transaction data
    const lines = text.split('\n').filter(line => line.trim());
    
    // Simple pattern matching for common transaction formats
    const amounts: number[] = [];
    const potentialDates: string[] = [];
    
    lines.forEach(line => {
      // Look for amounts (e.g., $123.45, 123.45, etc.)
      const amountMatch = line.match(/\$?\d+[.,]\d{2}/g);
      if (amountMatch) {
        amounts.push(...amountMatch.map(a => parseFloat(a.replace(/[$,]/g, ''))));
      }
      
      // Look for dates (simple pattern)
      const dateMatch = line.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g);
      if (dateMatch) {
        potentialDates.push(...dateMatch);
      }
    });

    let response = 'I analyzed the image and found:\n\n';
    
    if (amounts.length > 0) {
      response += `💵 Amounts detected: ${amounts.map(a => `$${a.toFixed(2)}`).join(', ')}\n`;
    }
    
    if (potentialDates.length > 0) {
      response += `📅 Dates detected: ${potentialDates.join(', ')}\n`;
    }
    
    if (amounts.length === 0 && potentialDates.length === 0) {
      response += 'No transaction data was clearly detected.\n';
    }
    
    response += '\nTo add these transactions, please use the Income or Expenses page.';
    
    return { message: response };
  }
}

export default new ChatbotService();
