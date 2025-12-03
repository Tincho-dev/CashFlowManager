import { createWorker } from 'tesseract.js';
import type { AccountService } from './AccountService';
import type { TransactionService } from './TransactionService';
import type { CreditCardService } from './CreditCardService';
import LoggingService, { LogCategory } from './LoggingService';
import { _testExports as ToonParserUtils } from './ToonParserService';
import type { ToonTransaction } from '../types/toon';
import { llmService, isLLMEnabled } from './LLMService';
import { appConfig } from '../config/appConfig';
import { AccountCurrency } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatbotResponse {
  message: string;
  action?: {
    type: 'create_account' | 'create_transaction' | 'query_balance' | 'list_accounts' | 'list_transactions' | 'parse_log' | 'create_credit_card' | 'currency_exchange';
    data?: unknown;
  };
}

class ChatbotService {
  private isInitialized = false;
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;
  private creditCardService: CreditCardService | null = null;
  private currentLanguage: string = 'en';
  private useLLM: boolean = false;

  async initialize(
    accountService: AccountService, 
    transactionService: TransactionService, 
    language: string = 'en',
    creditCardService?: CreditCardService
  ): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.accountService = accountService;
      this.transactionService = transactionService;
      this.creditCardService = creditCardService || null;
      this.currentLanguage = language;
      
      // Check if LLM is available (when not in local mode)
      this.useLLM = isLLMEnabled();
      if (this.useLLM) {
        await llmService.initialize();
        LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
          model: llmService.getProviderName(),
          language,
          useLLM: true,
        });
      } else {
        LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
          model: 'keyword-based-multilingual',
          language,
          useLLM: false,
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

  setCreditCardService(creditCardService: CreditCardService): void {
    this.creditCardService = creditCardService;
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
  }
  
  isUsingLLM(): boolean {
    return this.useLLM && !appConfig.isLocal;
  }

  async processMessage(message: string): Promise<ChatbotResponse> {
    if (!this.isInitialized) {
      return {
        message: 'Chatbot is still initializing. Please wait a moment...',
      };
    }

    LoggingService.info(LogCategory.USER, 'CHATBOT_MESSAGE', { message });

    try {
      // Detect intent using keyword-based detection
      const intent = this.detectIntent(message.toLowerCase());

      switch (intent) {
        case 'balance':
          return this.handleBalanceQuery();
        
        case 'list_accounts':
          return this.handleListAccounts();
        
        case 'list_transactions':
          return this.handleListTransactions();
        
        case 'create_account':
          return this.handleCreateAccount(message);
        
        case 'create_transaction':
          return this.handleCreateTransaction(message);
        
        case 'create_credit_card':
          return this.handleCreateCreditCard(message);
        
        case 'currency_exchange':
          return this.handleCurrencyExchange(message);
        
        case 'parse_log':
          return this.handleParseLog(message);
        
        case 'help':
          return this.handleHelp();
        
        default:
          // Try to parse as financial log as a last resort
          if (this.looksLikeFinancialLog(message)) {
            return this.handleParseLog(message);
          }
          
          if (this.currentLanguage === 'es') {
            return {
              message: `Entendí tu mensaje, pero no estoy seguro de cómo ayudar con eso todavía. Prueba preguntándome:\n- Verificar tu saldo\n- Listar tus cuentas\n- Listar transacciones recientes\n- Crear una cuenta\n- Agregar un gasto\n- Crear una tarjeta de crédito\n- Obtener ayuda`,
            };
          }
          return {
            message: `I understood your message, but I'm not sure how to help with that yet. Try asking me to:\n- Check your balance\n- List your accounts\n- List recent transactions\n- Create an account\n- Add an expense\n- Create a credit card\n- Get help`,
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

  private detectIntent(message: string): string {
    // Keyword-based intent detection
    
    // Check for specific command patterns first (priority order)
    
    // Credit card creation
    if ((message.includes('tarjeta') && (message.includes('crea') || message.includes('agrega'))) ||
        (message.includes('credit card') && (message.includes('create') || message.includes('add')))) {
      return 'create_credit_card';
    }
    
    // Currency exchange
    if ((message.includes('compre') || message.includes('compré') || message.includes('cambiar') || message.includes('cambio')) &&
        (message.includes('usd') || message.includes('dolar') || message.includes('dolares') || message.includes('pesos'))) {
      return 'currency_exchange';
    }
    
    // Account creation - more specific patterns
    if ((message.includes('agrega') && message.includes('cuenta')) ||
        (message.includes('crea') && message.includes('cuenta')) ||
        message.includes('create account') || message.includes('new account') || 
        message.includes('crear cuenta') || message.includes('nueva cuenta')) {
      return 'create_account';
    }
    
    // Transaction/expense creation - more specific patterns
    if ((message.includes('agrega') && (message.includes('gasto') || message.includes('transacción'))) ||
        message.includes('add transaction') || message.includes('new transaction') || 
        message.includes('agregar transacción') || message.includes('nueva transacción') ||
        (message.includes('gasto') && message.includes('concepto'))) {
      return 'create_transaction';
    }
    
    // Check for log parsing intent (financial text patterns)
    if (this.looksLikeFinancialLog(message)) {
      return 'parse_log';
    }
    
    if (message.includes('balance') || message.includes('saldo') || message.includes('total')) {
      return 'balance';
    }
    
    if (message.includes('list accounts') || message.includes('show accounts') || 
        message.includes('mis cuentas') || message.includes('listar cuentas')) {
      return 'list_accounts';
    }
    
    if (message.includes('transactions') || message.includes('transacciones') || 
        message.includes('movimientos')) {
      return 'list_transactions';
    }
    
    if (message.includes('help') || message.includes('ayuda') || message.includes('?')) {
      return 'help';
    }
    
    return 'unknown';
  }

  /**
   * Checks if the message looks like a financial log entry
   * (contains amounts with patterns like "1000", "50k", "$100", etc.)
   */
  private looksLikeFinancialLog(message: string): boolean {
    // Check for amount patterns
    const hasAmount = /\d+(?:[.,]\d+)?k?\b/.test(message);
    
    // Check for financial keywords
    const financialKeywords = [
      'gasto', 'pago', 'compra', 'transferencia', 'ingreso', 'sueldo',
      'efectivo', 'bbva', 'galicia', 'uala', 'lemon',
      'pan', 'leche', 'taxi', 'nafta', 'alquiler', 'expensas'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasFinancialKeyword = financialKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasAmount && hasFinancialKeyword;
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
        const balance = account.balance ? parseFloat(account.balance) : 0;
        const currencySymbol = account.currency === 'ARS' ? '$' : 'US$';
        response += `- ${account.name}: ${currencySymbol} ${balance.toFixed(2)} (${account.currency})\n`;
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
      const balance = account.balance ? parseFloat(account.balance) : 0;
      const currencySymbol = account.currency === 'ARS' ? '$' : 'US$';
      response += `📊 ${account.name} (${account.currency})\n`;
      const balanceLabel = this.currentLanguage === 'es' ? '   Saldo' : '   Balance';
      response += `${balanceLabel}: ${currencySymbol} ${balance.toFixed(2)}\n`;
      if (account.bank) {
        response += `   Banco: ${account.bank}\n`;
      }
      response += '\n';
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
      response += `💸 ID: ${tx.id}\n`;
      const amountLabel = this.currentLanguage === 'es' ? '   Monto' : '   Amount';
      const dateLabel = this.currentLanguage === 'es' ? 'Fecha' : 'Date';
      response += `${amountLabel}: $${tx.amount.toFixed(2)} | ${dateLabel}: ${new Date(tx.date).toLocaleDateString()}\n`;
      response += `   From: ${tx.fromAccountId} → To: ${tx.toAccountId}\n\n`;
    });

    return { message: response };
  }

  /**
   * Creates an account based on natural language input
   * Examples:
   * - "agrega una cuenta llamada uala, con la descripcion de 'alta tasa remuneradora'"
   * - "agrega una cuenta en pesos llamada bbva"
   * - "agrega en el banco galicia una cuenta llamada fima"
   */
  private handleCreateAccount(message: string): ChatbotResponse {
    if (!this.accountService) {
      return { message: this.currentLanguage === 'es' ? 'Servicio de cuentas no disponible.' : 'Account service not available.' };
    }

    const lower = message.toLowerCase();
    
    // Extract account name - look for "llamada/llamado" pattern
    let accountName = '';
    const nameMatch = lower.match(/llamad[ao]\s+['"]?([^'"]+)['"]?/i) ||
                      lower.match(/cuenta\s+(?:en\s+\w+\s+)?['"]?([a-záéíóú]+)['"]?/i) ||
                      lower.match(/named?\s+['"]?([^'"]+)['"]?/i);
    if (nameMatch) {
      // Clean up the name - remove trailing patterns like "con la descripcion"
      accountName = nameMatch[1].split(/\s*,?\s*con\s+la\s+descripc/i)[0].trim();
    }
    
    // Extract description
    let description: string | null = null;
    const descMatch = lower.match(/descripci[oó]n\s+(?:de\s+)?['"]([^'"]+)['"]/i) ||
                      lower.match(/description\s+['"]([^'"]+)['"]/i);
    if (descMatch) {
      description = descMatch[1];
    }
    
    // Extract bank
    let bank: string | null = null;
    const bankPatterns = [
      /banco\s+(bbva|galicia|santander|macro|nacion|provincia|patagonia|hipotecario)/i,
      /(?:en\s+el?\s+)?(?:banco\s+)?(bbva|galicia|santander|macro)/i,
    ];
    for (const pattern of bankPatterns) {
      const bankMatch = lower.match(pattern);
      if (bankMatch) {
        bank = bankMatch[1].charAt(0).toUpperCase() + bankMatch[1].slice(1);
        break;
      }
    }
    
    // Detect currency
    let currency: AccountCurrency = AccountCurrency.ARS; // Default to ARS
    if (lower.includes('dolar') || lower.includes('dolares') || lower.includes('usd') || lower.includes('u$d')) {
      currency = AccountCurrency.USD;
    }
    
    // If no account name found, provide instructions
    if (!accountName) {
      if (this.currentLanguage === 'es') {
        return {
          message: 'No pude identificar el nombre de la cuenta. Por favor usa un formato como:\n\n' +
                   '- "agrega una cuenta llamada BBVA"\n' +
                   '- "agrega una cuenta en pesos llamada uala, con la descripcion de \'alta tasa remuneradora\'"\n' +
                   '- "agrega en el banco galicia una cuenta llamada fima"',
        };
      }
      return {
        message: 'I couldn\'t identify the account name. Please use a format like:\n\n' +
                 '- "create an account named BBVA"\n' +
                 '- "add an account in pesos called uala with description \'high interest rate\'"',
      };
    }
    
    try {
      // Get the first owner (default)
      const accounts = this.accountService.getAllAccounts();
      let ownerId = 1;
      if (accounts.length > 0) {
        ownerId = accounts[0].ownerId;
      }
      
      // Create the account
      const newAccount = this.accountService.createAccount(
        accountName.charAt(0).toUpperCase() + accountName.slice(1), // Capitalize
        ownerId,
        description,
        null, // CBU
        null, // Account number
        accountName.toLowerCase().replace(/\s+/g, '.'), // Alias
        bank,
        '0.00', // Initial balance
        currency
      );
      
      LoggingService.info(LogCategory.USER, 'CHATBOT_CREATE_ACCOUNT', {
        accountId: newAccount.id,
        name: newAccount.name,
        bank,
        currency,
      });
      
      if (this.currentLanguage === 'es') {
        return {
          message: `✅ ¡Cuenta creada exitosamente!\n\n` +
                   `📊 **${newAccount.name}**\n` +
                   `   ID: ${newAccount.id}\n` +
                   `   Banco: ${bank || 'No especificado'}\n` +
                   `   Moneda: ${currency}\n` +
                   `   Descripción: ${description || 'Sin descripción'}\n\n` +
                   `La cuenta ya está disponible para usar.`,
          action: {
            type: 'create_account',
            data: newAccount,
          },
        };
      }
      return {
        message: `✅ Account created successfully!\n\n` +
                 `📊 **${newAccount.name}**\n` +
                 `   ID: ${newAccount.id}\n` +
                 `   Bank: ${bank || 'Not specified'}\n` +
                 `   Currency: ${currency}\n` +
                 `   Description: ${description || 'No description'}\n\n` +
                 `The account is now ready to use.`,
        action: {
          type: 'create_account',
          data: newAccount,
        },
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_CREATE_ACCOUNT_ERROR', {
        error: String(error),
        message,
      });
      if (this.currentLanguage === 'es') {
        return { message: 'Ocurrió un error al crear la cuenta. Por favor intenta de nuevo.' };
      }
      return { message: 'An error occurred while creating the account. Please try again.' };
    }
  }

  /**
   * Creates a transaction based on natural language input
   * Examples:
   * - "agrega un gasto de 2000 pesos en concepto de 'merienda familiar'"
   */
  private handleCreateTransaction(message: string): ChatbotResponse {
    if (!this.accountService || !this.transactionService) {
      return { message: this.currentLanguage === 'es' ? 'Servicios no disponibles.' : 'Services not available.' };
    }

    const lower = message.toLowerCase();
    
    // Extract amount
    let amount = 0;
    const amountMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:pesos|ars|\$)?/i) ||
                        lower.match(/de\s+(\d+(?:[.,]\d+)?)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }
    
    // Extract description/concept
    let description: string | null = null;
    const descMatch = lower.match(/concepto\s+(?:de\s+)?['"]([^'"]+)['"]/i) ||
                      lower.match(/para\s+['"]([^'"]+)['"]/i);
    if (descMatch) {
      description = descMatch[1];
    }
    
    // Detect source account from keywords
    const accounts = this.accountService.getAllAccounts();
    let fromAccount = accounts[0]; // Default to first account
    const { origen } = ToonParserUtils.extractSourceAccount(message);
    const DEFAULT_CASH_ACCOUNT = 'Efectivo';
    if (origen !== DEFAULT_CASH_ACCOUNT) {
      const matchingAccount = accounts.find(a => 
        a.name.toLowerCase().includes(origen.toLowerCase()) ||
        a.bank?.toLowerCase().includes(origen.toLowerCase())
      );
      if (matchingAccount) {
        fromAccount = matchingAccount;
      }
    }
    
    if (amount <= 0) {
      if (this.currentLanguage === 'es') {
        return {
          message: 'No pude identificar el monto. Por favor usa un formato como:\n\n' +
                   '- "agrega un gasto de 2000 pesos en concepto de \'merienda familiar\'"\n' +
                   '- "registra 5000 en compras del super"',
        };
      }
      return {
        message: 'I couldn\'t identify the amount. Please use a format like:\n\n' +
                 '- "add an expense of 2000 pesos for \'family snack\'"\n' +
                 '- "record 5000 in grocery shopping"',
      };
    }
    
    try {
      // Infer category from description
      const category = ToonParserUtils.inferCategory(description || message);
      
      // Create the transaction (same account for expense type transactions)
      const newTransaction = this.transactionService.createTransaction(
        fromAccount.id,
        fromAccount.id, // Same account indicates an expense, not a transfer
        amount,
        new Date().toISOString(),
        null,
        null,
        null, // Category ID - could be enhanced by mapping category string to ID
        undefined,
        undefined,
        description || category
      );
      
      if (!newTransaction) {
        throw new Error('Transaction creation failed');
      }
      
      LoggingService.info(LogCategory.USER, 'CHATBOT_CREATE_TRANSACTION', {
        transactionId: newTransaction.id,
        amount,
        description,
        fromAccountId: fromAccount.id,
      });
      
      if (this.currentLanguage === 'es') {
        return {
          message: `✅ ¡Gasto registrado exitosamente!\n\n` +
                   `💸 **$${amount.toFixed(2)}**\n` +
                   `   Descripción: ${description || 'Sin descripción'}\n` +
                   `   Cuenta: ${fromAccount.name}\n` +
                   `   Categoría: ${category}\n` +
                   `   Fecha: ${new Date().toLocaleDateString()}\n`,
          action: {
            type: 'create_transaction',
            data: newTransaction,
          },
        };
      }
      return {
        message: `✅ Expense recorded successfully!\n\n` +
                 `💸 **$${amount.toFixed(2)}**\n` +
                 `   Description: ${description || 'No description'}\n` +
                 `   Account: ${fromAccount.name}\n` +
                 `   Category: ${category}\n` +
                 `   Date: ${new Date().toLocaleDateString()}\n`,
        action: {
          type: 'create_transaction',
          data: newTransaction,
        },
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_CREATE_TRANSACTION_ERROR', {
        error: String(error),
        message,
      });
      if (this.currentLanguage === 'es') {
        return { message: 'Ocurrió un error al crear la transacción. Por favor intenta de nuevo.' };
      }
      return { message: 'An error occurred while creating the transaction. Please try again.' };
    }
  }

  /**
   * Creates a credit card based on natural language input
   * Example: "crea la tarjeta de credito del banco galicia terminada en 4045"
   */
  private handleCreateCreditCard(message: string): ChatbotResponse {
    if (!this.creditCardService || !this.accountService) {
      if (this.currentLanguage === 'es') {
        return { 
          message: 'Servicio de tarjetas de crédito no disponible. Por favor, configura el chatbot con el servicio de tarjetas.' 
        };
      }
      return { message: 'Credit card service not available. Please configure the chatbot with the credit card service.' };
    }

    const lower = message.toLowerCase();
    
    // Extract bank
    let bank: string | null = null;
    const bankMatch = lower.match(/banco\s+(bbva|galicia|santander|macro|nacion|provincia|patagonia|hipotecario)/i) ||
                      lower.match(/(bbva|galicia|santander|macro)/i);
    if (bankMatch) {
      bank = bankMatch[1].charAt(0).toUpperCase() + bankMatch[1].slice(1);
    }
    
    // Extract last 4 digits
    let last4: string | null = null;
    const last4Match = lower.match(/terminad[ao]\s+en\s+(\d{4})/i) ||
                       lower.match(/ending\s+(?:in\s+)?(\d{4})/i) ||
                       lower.match(/(\d{4})$/);
    if (last4Match) {
      last4 = last4Match[1];
    }
    
    // Find account by bank name
    const accounts = this.accountService.getAllAccounts();
    let accountId: number | null = null;
    if (bank) {
      const matchingAccount = accounts.find(a => 
        a.bank?.toLowerCase() === bank?.toLowerCase()
      );
      if (matchingAccount) {
        accountId = matchingAccount.id;
      }
    }
    
    if (!accountId && accounts.length > 0) {
      accountId = accounts[0].id; // Default to first account
    }
    
    if (!accountId) {
      if (this.currentLanguage === 'es') {
        return { 
          message: 'No hay cuentas disponibles para asociar la tarjeta de crédito. Por favor, crea una cuenta primero.' 
        };
      }
      return { message: 'No accounts available to link the credit card. Please create an account first.' };
    }
    
    // Detect card type
    let cardName = bank ? `${bank} ` : '';
    if (lower.includes('visa')) {
      cardName += 'Visa';
    } else if (lower.includes('master') || lower.includes('mastercard')) {
      cardName += 'Mastercard';
    } else if (lower.includes('amex') || lower.includes('american express')) {
      cardName += 'American Express';
    } else {
      cardName += 'Tarjeta'; // Default name
    }
    
    try {
      // Create the credit card
      const newCard = this.creditCardService.createCreditCard(
        accountId,
        cardName,
        last4,
        15, // Default closing day
        5,  // Default due day
        21, // Default tax percent (IVA Argentina)
        0,  // Fixed fees
        bank
      );
      
      LoggingService.info(LogCategory.USER, 'CHATBOT_CREATE_CREDIT_CARD', {
        creditCardId: newCard.id,
        name: cardName,
        bank,
        last4,
      });
      
      if (this.currentLanguage === 'es') {
        return {
          message: `✅ ¡Tarjeta de crédito creada exitosamente!\n\n` +
                   `💳 **${cardName}**\n` +
                   `   Últimos 4 dígitos: ${last4 || 'No especificado'}\n` +
                   `   Banco: ${bank || 'No especificado'}\n` +
                   `   Cuenta asociada ID: ${accountId}\n` +
                   `   Día de cierre: 15\n` +
                   `   Día de vencimiento: 5\n\n` +
                   `Puedes editar los detalles en la página de Tarjetas de Crédito.`,
          action: {
            type: 'create_credit_card',
            data: newCard,
          },
        };
      }
      return {
        message: `✅ Credit card created successfully!\n\n` +
                 `💳 **${cardName}**\n` +
                 `   Last 4 digits: ${last4 || 'Not specified'}\n` +
                 `   Bank: ${bank || 'Not specified'}\n` +
                 `   Linked account ID: ${accountId}\n` +
                 `   Closing day: 15\n` +
                 `   Due day: 5\n\n` +
                 `You can edit the details on the Credit Cards page.`,
        action: {
          type: 'create_credit_card',
          data: newCard,
        },
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_CREATE_CREDIT_CARD_ERROR', {
        error: String(error),
        message,
      });
      if (this.currentLanguage === 'es') {
        return { message: 'Ocurrió un error al crear la tarjeta de crédito. Por favor intenta de nuevo.' };
      }
      return { message: 'An error occurred while creating the credit card. Please try again.' };
    }
  }

  /**
   * Handles currency exchange messages
   * Example: "compre 50usd con pesos de uala, 1450 cada dolar"
   */
  private handleCurrencyExchange(message: string): ChatbotResponse {
    if (!this.accountService || !this.transactionService) {
      return { message: this.currentLanguage === 'es' ? 'Servicios no disponibles.' : 'Services not available.' };
    }

    const lower = message.toLowerCase();
    
    // Extract USD amount
    let usdAmount = 0;
    const usdMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:usd|u\$d|dolares?)/i);
    if (usdMatch) {
      usdAmount = parseFloat(usdMatch[1].replace(',', '.'));
    }
    
    // Extract exchange rate
    let exchangeRate = 0;
    const rateMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:cada|por|\/|x)\s*(?:dolar|usd)/i) ||
                      lower.match(/(?:a|al?)\s+(\d+(?:[.,]\d+)?)/i);
    if (rateMatch) {
      exchangeRate = parseFloat(rateMatch[1].replace(',', '.'));
    }
    
    // Detect source account
    const accounts = this.accountService.getAllAccounts();
    const { origen } = ToonParserUtils.extractSourceAccount(message);
    
    let sourceAccount = accounts.find(a => 
      a.name.toLowerCase().includes(origen.toLowerCase()) ||
      a.bank?.toLowerCase().includes(origen.toLowerCase())
    );
    
    if (!sourceAccount) {
      sourceAccount = accounts.find(a => a.currency === AccountCurrency.ARS);
    }
    
    // Find or use USD account
    const destAccount = accounts.find(a => a.currency === AccountCurrency.USD);
    
    if (!sourceAccount || !destAccount) {
      if (this.currentLanguage === 'es') {
        return {
          message: 'No encontré cuentas en pesos y dólares para realizar el cambio. ' +
                   'Por favor asegúrate de tener cuentas en ambas monedas.',
        };
      }
      return {
        message: 'I couldn\'t find accounts in pesos and dollars for the exchange. ' +
                 'Please make sure you have accounts in both currencies.',
      };
    }
    
    if (usdAmount <= 0 || exchangeRate <= 0) {
      if (this.currentLanguage === 'es') {
        return {
          message: 'No pude identificar el monto y/o el tipo de cambio. Por favor usa un formato como:\n\n' +
                   '- "compre 50usd con pesos de uala, 1450 cada dolar"\n' +
                   '- "cambié 100 dolares a 1500 pesos"',
        };
      }
      return {
        message: 'I couldn\'t identify the amount and/or exchange rate. Please use a format like:\n\n' +
                 '- "bought 50usd with pesos from uala, 1450 per dollar"\n' +
                 '- "exchanged 100 dollars at 1500 pesos"',
      };
    }
    
    const arsAmount = usdAmount * exchangeRate;
    
    try {
      // Create a transaction for the exchange
      const newTransaction = this.transactionService.createTransaction(
        sourceAccount.id,
        destAccount.id,
        arsAmount,
        new Date().toISOString(),
        null,
        null,
        null,
        undefined,
        undefined,
        this.currentLanguage === 'es' 
          ? `Compra de ${usdAmount} USD a ${exchangeRate} ARS/USD`
          : `Purchase of ${usdAmount} USD at ${exchangeRate} ARS/USD`
      );
      
      if (!newTransaction) {
        throw new Error('Transaction creation failed');
      }
      
      LoggingService.info(LogCategory.USER, 'CHATBOT_CURRENCY_EXCHANGE', {
        transactionId: newTransaction.id,
        usdAmount,
        arsAmount,
        exchangeRate,
        fromAccountId: sourceAccount.id,
        toAccountId: destAccount.id,
      });
      
      if (this.currentLanguage === 'es') {
        return {
          message: `✅ ¡Cambio de moneda registrado!\n\n` +
                   `💱 **${usdAmount} USD**\n` +
                   `   Monto en pesos: $${arsAmount.toFixed(2)}\n` +
                   `   Tipo de cambio: ${exchangeRate} ARS/USD\n` +
                   `   Cuenta origen: ${sourceAccount.name}\n` +
                   `   Cuenta destino: ${destAccount.name}\n\n` +
                   `💡 Nota: Este es un registro de la transacción. Para un cambio completo de moneda, usa la página de Cambio de Moneda.`,
          action: {
            type: 'currency_exchange',
            data: newTransaction,
          },
        };
      }
      return {
        message: `✅ Currency exchange recorded!\n\n` +
                 `💱 **${usdAmount} USD**\n` +
                 `   Amount in pesos: $${arsAmount.toFixed(2)}\n` +
                 `   Exchange rate: ${exchangeRate} ARS/USD\n` +
                 `   Source account: ${sourceAccount.name}\n` +
                 `   Destination account: ${destAccount.name}\n\n` +
                 `💡 Note: This is a transaction record. For a complete currency exchange, use the Currency Exchange page.`,
        action: {
          type: 'currency_exchange',
          data: newTransaction,
        },
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_CURRENCY_EXCHANGE_ERROR', {
        error: String(error),
        message,
      });
      if (this.currentLanguage === 'es') {
        return { message: 'Ocurrió un error al registrar el cambio de moneda. Por favor intenta de nuevo.' };
      }
      return { message: 'An error occurred while recording the currency exchange. Please try again.' };
    }
  }

  private handleHelp(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: `¡Soy tu asistente de CashFlow Manager! Aquí está lo que puedo ayudarte:\n\n` +
                 `💰 **Saldo**: Pregunta "¿Cuál es mi saldo?" para ver tu balance total\n` +
                 `📊 **Cuentas**: Pregunta "Lista mis cuentas" para ver todas tus cuentas\n` +
                 `📝 **Transacciones**: Pregunta "Muestra mis transacciones" para ver transacciones recientes\n` +
                 `➕ **Crear Cuenta**: Di "agrega una cuenta llamada X" para crear una cuenta\n` +
                 `💸 **Agregar Gasto**: Di "agrega un gasto de X pesos en concepto de 'Y'"\n` +
                 `💳 **Tarjeta de Crédito**: Di "crea la tarjeta del banco X terminada en Y"\n` +
                 `💱 **Cambio de Moneda**: Di "compre 50usd con pesos de X, Y cada dolar"\n` +
                 `📒 **Parsear Log**: Escribe un gasto informal como "1000 pan bbva" y lo procesaré\n` +
                 `❓ **Ayuda**: Pregunta "Ayuda" en cualquier momento para ver este mensaje`,
      };
    }
    return {
      message: `I'm your CashFlow Manager assistant! Here's what I can help you with:\n\n` +
               `💰 **Balance**: Ask "What's my balance?" to see your total balance\n` +
               `📊 **Accounts**: Ask "List my accounts" to see all your accounts\n` +
               `📝 **Transactions**: Ask "Show my transactions" to see recent transactions\n` +
               `➕ **Create Account**: Say "add an account named X" to create an account\n` +
               `💸 **Add Expense**: Say "add an expense of X for 'Y'"\n` +
               `💳 **Credit Card**: Say "create the credit card from bank X ending in Y"\n` +
               `💱 **Currency Exchange**: Say "bought 50usd with pesos from X, Y per dollar"\n` +
               `📒 **Parse Log**: Write an informal expense like "1000 bread bbva" and I'll process it\n` +
               `❓ **Help**: Ask "Help" anytime to see this message`,
    };
  }

  /**
   * Handles parsing of informal financial log text using TOON format
   */
  private handleParseLog(message: string): ChatbotResponse {
    try {
      // Parse the message using ToonParserService (synchronous pattern-based parsing)
      const transactions = ToonParserUtils.parseTextWithoutLLM(message);
      const result = {
        transactions,
        count: transactions.length,
        raw: transactions.map(t => `${t.monto} ${t.nota} ${t.origen}`).join('\n'),
      };

      if (result.transactions.length === 0) {
        if (this.currentLanguage === 'es') {
          return {
            message: 'No pude detectar transacciones en tu mensaje. Intenta con un formato como:\n' +
                     '"1000 pan bbva" o "50k transferencia a Juan galicia"',
          };
        }
        return {
          message: 'I couldn\'t detect any transactions in your message. Try a format like:\n' +
                   '"1000 bread bbva" or "50k transfer to John from bank"',
        };
      }

      // Format the response
      let response = this.currentLanguage === 'es'
        ? `📊 **Transacción(es) detectada(s): ${result.count}**\n\n`
        : `📊 **Transaction(s) detected: ${result.count}**\n\n`;

      response += '```\n' + result.raw + '\n```\n\n';

      // Add details for each transaction
      result.transactions.forEach((tx: ToonTransaction, index: number) => {
        response += this.currentLanguage === 'es'
          ? `**${index + 1}.** ${tx.nota}\n`
          : `**${index + 1}.** ${tx.nota}\n`;
        
        const montoStr = tx.moneda === 'USD' ? `US$ ${tx.monto.toFixed(2)}` : `$ ${tx.monto.toFixed(2)}`;
        
        response += this.currentLanguage === 'es'
          ? `   💵 Monto: ${montoStr}\n`
          : `   💵 Amount: ${montoStr}\n`;
        
        response += this.currentLanguage === 'es'
          ? `   📅 Fecha: ${tx.fecha}\n`
          : `   📅 Date: ${tx.fecha}\n`;
        
        response += this.currentLanguage === 'es'
          ? `   🏦 Origen: ${tx.origen} → Destino: ${tx.destino}\n`
          : `   🏦 From: ${tx.origen} → To: ${tx.destino}\n`;
        
        response += this.currentLanguage === 'es'
          ? `   🏷️ Categoría: ${tx.categoria}\n\n`
          : `   🏷️ Category: ${tx.categoria}\n\n`;
      });

      LoggingService.info(LogCategory.USER, 'TOON_PARSE_SUCCESS', {
        input: message,
        transactionCount: result.count,
        transactions: result.transactions,
      });

      return {
        message: response,
        action: {
          type: 'parse_log',
          data: result,
        },
      };
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'TOON_PARSE_ERROR', {
        error: String(error),
        message,
      });

      if (this.currentLanguage === 'es') {
        return {
          message: 'Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
        };
      }
      return {
        message: 'An error occurred while processing your message. Please try again.',
      };
    }
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
    
    response += '\nTo add transactions, please use the Transactions page.';
    
    return { message: response };
  }
}

export default new ChatbotService();
