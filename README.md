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

### Querying the Database from VSCode

The application stores its SQLite database in the browser's localStorage. To inspect or query the data:

#### Method 1: Using Browser DevTools (Recommended)

1. Open your application in a browser (Chrome, Firefox, Edge, etc.)
2. Open Developer Tools (`F12` or `Right-click > Inspect`)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Navigate to **Local Storage** > `http://localhost:5173` (or your domain)
5. Find the key `cashflow_db` - this contains your database as a base64-encoded string

#### Method 2: Extracting and Querying with SQLite Tools

1. **Extract the database:**
   ```javascript
   // Open browser console and run:
   const dbData = localStorage.getItem('cashflow_db');
   const blob = new Blob([Uint8Array.from(atob(dbData), c => c.charCodeAt(0))], { type: 'application/octet-stream' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'cashflow.db';
   a.click();
   ```

2. **Open in VSCode with SQLite extension:**
   - Install the [SQLite Viewer extension](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer) or [SQLite](https://marketplace.visualstudio.com/items?itemName=alexcvzz.vscode-sqlite) extension
   - Right-click the downloaded `cashflow.db` file
   - Select "Open with SQLite Viewer" or use Command Palette: `SQLite: Open Database`

3. **Query using command-line tools:**
   ```bash
   sqlite3 cashflow.db
   # Now you can run SQL queries:
   SELECT * FROM accounts;
   SELECT * FROM transactions ORDER BY date DESC LIMIT 10;
   SELECT a.name, SUM(t.amount) as total
   FROM accounts a
   JOIN transactions t ON t.account_id = a.id
   WHERE t.type = 'INCOME'
   GROUP BY a.id;
   ```

#### Method 3: Using In-App Console (Advanced)

You can query the database directly from the browser console:

```javascript
// Access the database service
import { getDatabase } from './src/data/database';

// Get database instance
const db = getDatabase();

// Run queries
const result = db.exec('SELECT * FROM accounts');
console.table(result[0].values);

// Get all transactions
const transactions = db.exec('SELECT * FROM transactions ORDER BY date DESC LIMIT 10');
console.table(transactions[0].values);
```

#### Common SQL Queries

```sql
-- View all accounts with balances
SELECT id, name, type, balance, currency FROM accounts;

-- Recent transactions
SELECT t.*, a.name as account_name 
FROM transactions t 
JOIN accounts a ON t.account_id = a.id 
ORDER BY t.date DESC LIMIT 20;

-- Total balance by currency
SELECT currency, SUM(balance) as total_balance 
FROM accounts 
GROUP BY currency;

-- Monthly expense summary
SELECT 
  strftime('%Y-%m', date) as month,
  category,
  SUM(amount) as total
FROM transactions
WHERE type IN ('FIXED_EXPENSE', 'VARIABLE_EXPENSE')
GROUP BY month, category
ORDER BY month DESC, total DESC;
```

### Database Location

- **Browser**: `localStorage['cashflow_db']` (base64-encoded binary)
- **Format**: SQLite 3.x database file
- **Persistence**: Automatically saved after each database operation
- **Size**: Varies based on data, typically a few KB to a few MB

## PWA Features

The application can be installed as a Progressive Web App:

- **Offline Support** - Core functionality works without an internet connection
- **Install Prompt** - Install on mobile devices and desktops
- **Service Worker** - Caches assets for faster loading
- **Responsive Design** - Works on all screen sizes

## Deployment

### Deploy to Vercel

The easiest way to deploy CashFlow Manager is using Vercel:

#### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tincho-dev/CashFlowManager)

#### Manual Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   # For preview deployment
   vercel
   
   # For production deployment
   vercel --prod
   ```

#### Automatic Deployment with GitHub Actions

The repository includes a GitHub Actions workflow that automatically deploys to Vercel on every push to `main` and creates preview deployments for pull requests.

**Setup Steps:**

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Get your Vercel tokens:**
   - Go to [Vercel Account Settings > Tokens](https://vercel.com/account/tokens)
   - Create a new token and copy it

3. **Get your Project IDs:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Link your project
   vercel link
   
   # Get your project ID and org ID from .vercel/project.json
   cat .vercel/project.json
   ```

4. **Add GitHub Secrets:**
   - Go to your GitHub repository > Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Your Vercel organization ID
     - `VERCEL_PROJECT_ID`: Your Vercel project ID

5. **Push to GitHub:**
   - The workflow will automatically deploy to Vercel on push to `main`
   - Pull requests will get preview deployments

### Deploy to Other Platforms

#### Netlify

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add redirect rules in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

#### GitHub Pages

1. Update `vite.config.ts` with your repository base:
   ```typescript
   export default defineConfig({
     base: '/CashFlowManager/',
     // ... rest of config
   })
   ```

2. Build and deploy:
   ```bash
   npm run build
   npx gh-pages -d dist
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Style Guidelines

- **All styles must be SCSS modules** - Create `.module.scss` files and import them
- Never use inline styles in `.tsx` files (except for dynamic values)
- Use camelCase or BEM naming for CSS classes
- Keep styles modular and reusable

## License

MIT License - feel free to use this project for personal or commercial purposes.
