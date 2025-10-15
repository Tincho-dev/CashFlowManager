# CashFlow Manager

A comprehensive personal finance management application built with React, TypeScript, and SQLite.

## Features

### Core Functionality
- 📱 **PWA Support** - Install as a mobile or desktop app
- 💰 **Account Management** - Track multiple accounts with different currencies
- 📊 **Income & Expense Tracking** - Monitor your income and expenses
- 🔄 **Recurring Transactions** - Set up automatic recurring payments
- 💳 **Multiple Payment Types** - Support for credit cards, debit cards, cash, transfers, and checks
- 🌍 **Multi-Currency Support** - Handle transactions in USD, EUR, GBP, ARS, and BRL
- 📈 **Investment Tracking** - Monitor your investment portfolio (Coming Soon)
- 💵 **Loan Management** - Track loans and monthly payments (Coming Soon)
- 🔀 **Account Transfers** - Transfer money between your own accounts (Coming Soon)
- 📤 **Excel Export** - Export all your financial data to Excel format
- 🗄️ **SQLite Database** - Local data storage with browser persistence

### NEW: AI-Powered Features 🤖
- 🤖 **AI Chatbot Assistant** - Natural language interface to query your finances
  - Ask about your balance, accounts, and recent transactions
  - Get contextual help about account types and transaction categories
  - Voice-like interaction with intelligent keyword detection
- 📸 **OCR Image Processing** - Upload images of bank statements or receipts
  - Automatic text extraction from images
  - Smart detection of amounts and dates
  - Extract multiple transactions from a single image
- 📝 **Application Logging** - Complete audit trail of all operations
  - Track all account and transaction operations
  - Export logs in JSON or CSV format
  - Filter by category, level, or date range
- 💡 **Contextual Tooltips** - Inline help throughout the application
  - Learn about different account types
  - Understand transaction categories
  - Get guidance on form fields

### UI/UX Enhancements 🎨
- 🎨 **Material-UI Design** - Modern, consistent design system
- 📱 **Mobile Bottom Navigation** - Easy navigation on mobile devices
- 🌐 **Bilingual Support** - Full support for English and Spanish
- ♿ **Accessibility** - ARIA labels and keyboard navigation support

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **UI Framework**: Material-UI (MUI) v7
- **Routing**: React Router v7
- **Database**: SQL.js (SQLite in the browser)
- **Build Tool**: Vite 7
- **PWA**: Vite PWA Plugin with Workbox
- **AI/ML**: 
  - Tesseract.js for OCR (Optical Character Recognition)
  - @xenova/transformers (prepared for NLP features)
- **Excel Export**: XLSX library
- **Icons**: Lucide React
- **Styling**: SCSS Modules + MUI theming
- **i18n**: react-i18next

## Architecture

The application follows a layered architecture pattern:

### Data Layer
- **Database** (`src/data/database.ts`) - SQLite initialization and migration management
- **Repositories** (`src/data/repositories/`) - Data access layer with CRUD operations
  - `AccountRepository.ts` - Account data operations
  - `TransactionRepository.ts` - Transaction data operations

### Service Layer
- **Services** (`src/services/`) - Business logic layer
  - `AccountService.ts` - Account management logic with logging
  - `TransactionService.ts` - Transaction management with automatic balance updates and logging
  - `ChatbotService.ts` - AI chatbot with natural language processing and OCR
  - `LoggingService.ts` - Application logging and audit trail

### Presentation Layer
- **Components** (`src/components/`) - Reusable UI components
  - `layout/` - Layout components (Header, Sidebar, BottomNavigation)
  - `accounts/` - Account-specific components (AccountCard, AccountDialog)
  - `chatbot/` - AI chatbot interface
  - `common/` - Shared components (InfoTooltip, PlaceholderPage)
- **Pages** (`src/pages/`) - Route-level components
- **Contexts** (`src/contexts/`) - React context for state management

### Utilities
- **Excel Export** (`src/utils/excelExport.ts`) - Data export functionality
- **Types** (`src/types/index.ts`) - TypeScript type definitions

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Tincho-dev/CashFlowManager.git
cd CashFlowManager
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Creating an Account
1. Navigate to the "Accounts" page
2. Click "Add Account"
3. Fill in the account details (name, type, initial balance, currency)
4. Click "Create"

### Adding Transactions
1. Navigate to "Income" or "Expenses"
2. Click the "Add" button
3. Select an account, enter the amount, description, and other details
4. Mark as recurring if it's a regular transaction

### Using the AI Chatbot 🤖
1. Click the floating chat button (bottom right of the screen)
2. Ask questions in natural language:
   - "What's my balance?"
   - "Show my accounts"
   - "List recent transactions"
   - "Help"
3. Upload images of bank statements or receipts:
   - Click "Upload Image" in the chat
   - Select an image with transaction data
   - The chatbot will extract and analyze the text
4. Get contextual help:
   - Ask about account types: "What's a checking account?"
   - Learn about categories: "Help me categorize my expenses"

### Accessing Application Logs
Logs are stored in browser localStorage and can be:
- Exported programmatically via `LoggingService.exportLogs()` (JSON)
- Exported as CSV via `LoggingService.exportLogsAsCSV()`
- Filtered by category, level, or date range
- Used for audit trails and debugging
5. Click "Create"

### Exporting Data
1. Navigate to "Export Data"
2. Click "Export to Excel"
3. Your data will be downloaded as an Excel file with multiple sheets

## Data Storage

All data is stored locally in your browser using SQLite (via SQL.js). The database is automatically saved to localStorage after each operation, ensuring your data persists across browser sessions.

### Database Schema

- **accounts** - User accounts (checking, savings, credit cards, etc.)
- **transactions** - All income and expense transactions
- **investments** - Investment portfolio tracking
- **loans** - Loan and debt tracking
- **transfers** - Money transfers between accounts
- **categories** - Transaction categories

## PWA Features

The application can be installed as a Progressive Web App:

- **Offline Support** - Core functionality works without an internet connection
- **Install Prompt** - Install on mobile devices and desktops
- **Service Worker** - Caches assets for faster loading
- **Responsive Design** - Works on all screen sizes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.
