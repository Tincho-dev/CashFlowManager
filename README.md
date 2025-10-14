# CashFlow Manager

A comprehensive personal finance management application built with React, TypeScript, and SQLite.

## Features

- 📱 **PWA Support** - Install as a mobile or desktop app
- 💰 **Account Management** - Track multiple accounts with different currencies
- 📊 **Income & Expense Tracking** - Monitor your income and expenses
- 🔄 **Recurring Transactions** - Set up automatic recurring payments
- 💳 **Multiple Payment Types** - Support for credit cards, debit cards, cash, transfers, and checks
- 🌍 **Multi-Currency Support** - Handle transactions in USD, EUR, GBP, ARS, and BRL
- 📈 **Investment Tracking** - Monitor your investment portfolio
- 💵 **Loan Management** - Track loans and monthly payments
- 🔀 **Account Transfers** - Transfer money between your own accounts
- 📤 **Excel Export** - Export all your financial data to Excel format
- 🗄️ **SQLite Database** - Local data storage with browser persistence

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: React Router v6
- **Database**: SQL.js (SQLite in the browser)
- **Build Tool**: Vite
- **PWA**: Vite PWA Plugin with Workbox
- **Excel Export**: XLSX library
- **Icons**: Lucide React
- **Styling**: CSS Modules

## Architecture

The application follows a layered architecture pattern:

### Data Layer
- **Database** (`src/data/database.ts`) - SQLite initialization and migration management
- **Repositories** (`src/data/repositories/`) - Data access layer with CRUD operations
  - `AccountRepository.ts` - Account data operations
  - `TransactionRepository.ts` - Transaction data operations

### Service Layer
- **Services** (`src/services/`) - Business logic layer
  - `AccountService.ts` - Account management logic
  - `TransactionService.ts` - Transaction management with automatic balance updates

### Presentation Layer
- **Components** (`src/components/`) - Reusable UI components
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
