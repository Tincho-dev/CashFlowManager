import { createWorker } from 'tesseract.js';
import type { AccountService } from './AccountService';
import type { TransactionService } from './TransactionService';
import LoggingService, { LogCategory } from './LoggingService';
import { llmService, isLLMEnabled } from './LLMService';
import { appConfig } from '../config/appConfig';

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
  private isInitialized = false;
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;
  private currentLanguage: string = 'en';
  private useLLM: boolean = false;

  async initialize(
    accountService: AccountService, 
    transactionService: TransactionService, 
    language: string = 'en'
  ): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.accountService = accountService;
      this.transactionService = transactionService;
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
          return this.handleCreateAccountIntent();
        
        case 'create_transaction':
          return this.handleCreateTransactionIntent();
        
        case 'help':
          return this.handleHelp();
        
        default:
          if (this.currentLanguage === 'es') {
            return {
              message: `Entendí tu mensaje, pero no estoy seguro de cómo ayudar con eso todavía. Prueba preguntándome:\n- Verificar tu saldo\n- Listar tus cuentas\n- Listar transacciones recientes\n- Obtener ayuda`,
            };
          }
          return {
            message: `I understood your message, but I'm not sure how to help with that yet. Try asking me to:\n- Check your balance\n- List your accounts\n- List recent transactions\n- Get help`,
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
    
    if (message.includes('create account') || message.includes('new account') || 
        message.includes('crear cuenta') || message.includes('nueva cuenta')) {
      return 'create_account';
    }
    
    if (message.includes('add transaction') || message.includes('new transaction') || 
        message.includes('agregar transacción') || message.includes('nueva transacción') ||
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

  private handleCreateAccountIntent(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: 'Para crear una cuenta, por favor usa el botón "Agregar Cuenta" en la página de Cuentas. ' +
                 'Puedo ayudarte a entender qué campos completar:\n\n' +
                 '- **Nombre**: El nombre de tu cuenta\n' +
                 '- **Banco**: El banco donde tienes la cuenta\n' +
                 '- **Saldo**: El saldo inicial\n' +
                 '- **Moneda**: USD o ARS\n\n' +
                 '💡 Consejo: Ve a la página de Cuentas y haz clic en el botón + para comenzar.',
      };
    }
    return {
      message: 'To create an account, please use the "Add Account" button in the Accounts page. ' +
               'I can help you understand what fields to fill:\n\n' +
               '- **Name**: Your account name\n' +
               '- **Bank**: The bank where you have the account\n' +
               '- **Balance**: The initial balance\n' +
               '- **Currency**: USD or ARS\n\n' +
               '💡 Tip: Go to the Accounts page and click the + button to get started.',
    };
  }

  private handleCreateTransactionIntent(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: 'Para agregar una transacción, por favor usa el botón "+" en la página de Transacciones. ' +
                 'Las transacciones transfieren dinero entre cuentas:\n\n' +
                 '- **Cuenta Origen**: De dónde sale el dinero\n' +
                 '- **Cuenta Destino**: A dónde va el dinero\n' +
                 '- **Monto**: Cuánto se transfiere\n' +
                 '- **Fecha**: Cuándo ocurrió\n\n' +
                 '💡 Consejo: Ve a la página de Transacciones y haz clic en "+" para registrar.',
      };
    }
    return {
      message: 'To add a transaction, please use the "+" button in the Transactions page. ' +
               'Transactions transfer money between accounts:\n\n' +
               '- **From Account**: Where the money comes from\n' +
               '- **To Account**: Where the money goes\n' +
               '- **Amount**: How much is transferred\n' +
               '- **Date**: When it happened\n\n' +
               '💡 Tip: Go to the Transactions page and click "+" to record a transaction.',
    };
  }

  private handleHelp(): ChatbotResponse {
    if (this.currentLanguage === 'es') {
      return {
        message: `¡Soy tu asistente de CashFlow Manager! Aquí está lo que puedo ayudarte:\n\n` +
                 `💰 **Saldo**: Pregunta "¿Cuál es mi saldo?" para ver tu balance total\n` +
                 `📊 **Cuentas**: Pregunta "Lista mis cuentas" para ver todas tus cuentas\n` +
                 `📝 **Transacciones**: Pregunta "Muestra mis transacciones" para ver transacciones recientes\n` +
                 `➕ **Crear Cuenta**: Di "crear cuenta" para ver instrucciones\n` +
                 `💸 **Agregar Transacción**: Di "agregar transacción" para ver instrucciones\n` +
                 `❓ **Ayuda**: Pregunta "Ayuda" en cualquier momento para ver este mensaje`,
      };
    }
    return {
      message: `I'm your CashFlow Manager assistant! Here's what I can help you with:\n\n` +
               `💰 **Balance**: Ask "What's my balance?" to see your total balance\n` +
               `📊 **Accounts**: Ask "List my accounts" to see all your accounts\n` +
               `📝 **Transactions**: Ask "Show my transactions" to see recent transactions\n` +
               `➕ **Create Account**: Say "create account" for instructions\n` +
               `💸 **Add Transaction**: Say "add transaction" for instructions\n` +
               `❓ **Help**: Ask "Help" anytime to see this message`,
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
    
    response += '\nTo add transactions, please use the Transactions page.';
    
    return { message: response };
  }
}

export default new ChatbotService();
