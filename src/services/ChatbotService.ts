// import { pipeline, env } from '@xenova/transformers';
import { createWorker } from 'tesseract.js';
import type { AccountService } from './AccountService';
import type { TransactionService } from './TransactionService';
import LoggingService, { LogCategory } from './LoggingService';

// Configure transformers.js to use local models
// env.allowLocalModels = false;
// env.allowRemoteModels = true;

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
  // private classifier: any = null;
  private isInitialized = false;
  private accountService: AccountService | null = null;
  private transactionService: TransactionService | null = null;

  async initialize(accountService: AccountService, transactionService: TransactionService): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.accountService = accountService;
      this.transactionService = transactionService;

      // Load a lightweight sentiment/classification model
      // Using distilbert for intent classification
      // TODO: Use ML model for better intent classification in the future
      // this.classifier = await pipeline(
      //   'text-classification',
      //   'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      // );

      this.isInitialized = true;
      LoggingService.info(LogCategory.SYSTEM, 'CHATBOT_INITIALIZED', {
        model: 'distilbert-base-uncased-finetuned-sst-2-english',
      });
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'CHATBOT_INIT_ERROR', {
        error: String(error),
      });
      throw error;
    }
  }

  async processMessage(message: string): Promise<ChatbotResponse> {
    if (!this.isInitialized) {
      return {
        message: 'Chatbot is still initializing. Please wait a moment...',
      };
    }

    LoggingService.info(LogCategory.USER, 'CHATBOT_MESSAGE', { message });

    try {
      // Simple intent detection based on keywords
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

  private detectIntent(message: string): string {
    // Simple keyword-based intent detection
    // In a production app, you'd use the ML model for this
    
    if (message.includes('balance') || message.includes('saldo') || message.includes('total')) {
      return 'balance';
    }
    
    if (message.includes('list accounts') || message.includes('show accounts') || 
        message.includes('mis cuentas') || message.includes('listar cuentas')) {
      return 'list_accounts';
    }
    
    if (message.includes('transactions') || message.includes('transacciones') || 
        message.includes('movimientos') || message.includes('gastos')) {
      return 'list_transactions';
    }
    
    if (message.includes('create account') || message.includes('new account') || 
        message.includes('crear cuenta') || message.includes('nueva cuenta')) {
      return 'create_account';
    }
    
    if (message.includes('add transaction') || message.includes('new transaction') || 
        message.includes('agregar gasto') || message.includes('nuevo gasto')) {
      return 'create_transaction';
    }
    
    if (message.includes('help') || message.includes('ayuda') || message.includes('?')) {
      return 'help';
    }
    
    return 'unknown';
  }

  private handleBalanceQuery(): ChatbotResponse {
    if (!this.accountService) {
      return { message: 'Account service not available.' };
    }

    const total = this.accountService.getTotalBalance();
    const accounts = this.accountService.getAllAccounts();

    let response = `Your total balance is $${total.toFixed(2)}.\n\n`;
    
    if (accounts.length > 0) {
      response += 'Account breakdown:\n';
      accounts.forEach(account => {
        response += `- ${account.name}: ${account.currency} $${account.balance.toFixed(2)}\n`;
      });
    }

    return { message: response };
  }

  private handleListAccounts(): ChatbotResponse {
    if (!this.accountService) {
      return { message: 'Account service not available.' };
    }

    const accounts = this.accountService.getAllAccounts();

    if (accounts.length === 0) {
      return { message: 'You don\'t have any accounts yet. Would you like to create one?' };
    }

    let response = `You have ${accounts.length} account(s):\n\n`;
    accounts.forEach(account => {
      response += `📊 ${account.name} (${account.type})\n`;
      response += `   Balance: ${account.currency} $${account.balance.toFixed(2)}\n\n`;
    });

    return { message: response };
  }

  private handleListTransactions(): ChatbotResponse {
    if (!this.transactionService) {
      return { message: 'Transaction service not available.' };
    }

    // Get recent transactions (last 10)
    const allTransactions = this.transactionService.getAllTransactions();
    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    if (recentTransactions.length === 0) {
      return { message: 'You don\'t have any transactions yet.' };
    }

    let response = `Here are your last ${recentTransactions.length} transactions:\n\n`;
    recentTransactions.forEach(tx => {
      const emoji = tx.type === 'INCOME' ? '💰' : '💸';
      response += `${emoji} ${tx.description || 'No description'}\n`;
      response += `   Amount: $${tx.amount.toFixed(2)} | Date: ${tx.date}\n`;
      if (tx.category) response += `   Category: ${tx.category}\n`;
      response += '\n';
    });

    return { message: response };
  }

  private handleCreateAccountIntent(): ChatbotResponse {
    return {
      message: 'To create an account, please use the "Add Account" button in the Accounts page. ' +
               'I can help you understand what type of account to create:\n\n' +
               '- **Checking**: For daily transactions\n' +
               '- **Savings**: For storing money\n' +
               '- **Credit Card**: To track credit card spending\n' +
               '- **Cash**: For physical cash\n' +
               '- **Investment**: For investment accounts',
    };
  }

  private handleCreateTransactionIntent(): ChatbotResponse {
    return {
      message: 'To add a transaction, please use the "Add" button in the Income or Expenses page. ' +
               'I can help you understand the different transaction types:\n\n' +
               '- **Income**: Money you receive\n' +
               '- **Fixed Expenses**: Regular recurring expenses (rent, subscriptions)\n' +
               '- **Variable Expenses**: Expenses that vary (groceries, entertainment)',
    };
  }

  private handleHelp(): ChatbotResponse {
    return {
      message: `I'm your CashFlow Manager assistant! Here's what I can help you with:\n\n` +
               `💰 **Balance**: Ask "What's my balance?" to see your total balance\n` +
               `📊 **Accounts**: Ask "List my accounts" to see all your accounts\n` +
               `📝 **Transactions**: Ask "Show my transactions" to see recent transactions\n` +
               `❓ **Help**: Ask "Help" anytime to see this message\n\n` +
               `You can also ask me questions about account types, expense categories, and more!\n\n` +
               `Note: To create accounts or transactions, please use the buttons in the app interface.`,
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
