import type { Database } from 'sql.js';
import { saveDatabase } from './database';
import { AccountCurrency } from '../types';

interface SeedOwner {
  name: string;
  description: string | null;
}

interface SeedAccount {
  name: string;
  description: string | null;
  cbu: string | null;
  accountNumber: string | null;
  alias: string | null;
  bank: string | null;
  ownerIndex: number; // Index in seedOwners array
  balance: string | null;
  currency: AccountCurrency;
}

interface SeedAsset {
  ticket: string | null;
  price: number | null;
}

interface SeedCategory {
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
}

interface SeedTransaction {
  fromAccountIndex: number;
  amount: number;
  toAccountIndex: number;
  date: string;
  auditDate: string | null;
  assetIndex: number | null;
  categoryIndex: number | null;
  description?: string;
}

interface SeedCreditCard {
  name: string;
  last4: string;
  closingDay: number;
  dueDay: number;
  taxPercent: number;
  fixedFees: number;
  bank: string;
  accountIndex: number; // Index in seedAccounts array
}

// Seed owners
const seedOwners: SeedOwner[] = [
  {
    name: 'Main User',
    description: 'Primary account holder',
  },
  {
    name: 'Business',
    description: 'Business accounts',
  },
];

// Seed assets
const seedAssets: SeedAsset[] = [
  {
    ticket: 'USD',
    price: 1.0,
  },
  {
    ticket: 'ARS',
    price: 0.001,
  },
];

// Seed categories
const seedCategories: SeedCategory[] = [
  {
    name: 'Alimentación',
    description: 'Gastos en comida, supermercado y restaurantes',
    color: '#4CAF50',
    icon: 'utensils',
  },
  {
    name: 'Transporte',
    description: 'Gastos en transporte público, combustible y vehículos',
    color: '#2196F3',
    icon: 'car',
  },
  {
    name: 'Vivienda',
    description: 'Alquiler, hipoteca y servicios del hogar',
    color: '#9C27B0',
    icon: 'home',
  },
  {
    name: 'Servicios',
    description: 'Agua, luz, gas, internet y teléfono',
    color: '#FF9800',
    icon: 'zap',
  },
  {
    name: 'Salud',
    description: 'Gastos médicos, medicamentos y seguros de salud',
    color: '#F44336',
    icon: 'heart',
  },
  {
    name: 'Entretenimiento',
    description: 'Ocio, suscripciones y actividades recreativas',
    color: '#E91E63',
    icon: 'music',
  },
  {
    name: 'Educación',
    description: 'Cursos, libros y materiales educativos',
    color: '#3F51B5',
    icon: 'book',
  },
  {
    name: 'Compras',
    description: 'Ropa, electrodomésticos y artículos personales',
    color: '#00BCD4',
    icon: 'shopping-bag',
  },
  {
    name: 'Transferencia',
    description: 'Transferencias entre cuentas propias',
    color: '#607D8B',
    icon: 'repeat',
  },
  {
    name: 'Ingresos',
    description: 'Salarios, bonos y otros ingresos',
    color: '#8BC34A',
    icon: 'dollar-sign',
  },
  {
    name: 'Inversiones',
    description: 'Compra y venta de activos financieros',
    color: '#FFC107',
    icon: 'trending-up',
  },
  {
    name: 'Otros',
    description: 'Gastos no categorizados',
    color: '#9E9E9E',
    icon: 'more-horizontal',
  },
];

// Seed accounts - Argentine banks with ARS and USD accounts
const seedAccounts: SeedAccount[] = [
  // BBVA accounts
  {
    name: 'BBVA Pesos',
    description: 'Cuenta corriente en pesos BBVA',
    cbu: '0170123456789012345678',
    accountNumber: '12345678',
    alias: 'bbva.pesos',
    bank: 'BBVA',
    ownerIndex: 0,
    balance: '150000.00',
    currency: AccountCurrency.ARS,
  },
  {
    name: 'BBVA Dólares',
    description: 'Caja de ahorro en dólares BBVA',
    cbu: '0170123456789012345679',
    accountNumber: '12345679',
    alias: 'bbva.dolares',
    bank: 'BBVA',
    ownerIndex: 0,
    balance: '500.00',
    currency: AccountCurrency.USD,
  },
  // Galicia accounts
  {
    name: 'Galicia Pesos',
    description: 'Cuenta corriente en pesos Galicia',
    cbu: '0070123456789012345678',
    accountNumber: '87654321',
    alias: 'galicia.pesos',
    bank: 'Galicia',
    ownerIndex: 0,
    balance: '250000.00',
    currency: AccountCurrency.ARS,
  },
  {
    name: 'Galicia Dólares',
    description: 'Caja de ahorro en dólares Galicia',
    cbu: '0070123456789012345679',
    accountNumber: '87654322',
    alias: 'galicia.dolares',
    bank: 'Galicia',
    ownerIndex: 0,
    balance: '1000.00',
    currency: AccountCurrency.USD,
  },
  // Uala accounts
  {
    name: 'Uala Pesos',
    description: 'Cuenta Uala en pesos - Alta tasa remuneradora',
    cbu: null,
    accountNumber: '98765432',
    alias: 'uala.pesos',
    bank: 'Uala',
    ownerIndex: 0,
    balance: '500000.00',
    currency: AccountCurrency.ARS,
  },
  {
    name: 'Uala Dólares',
    description: 'Cuenta Uala en dólares',
    cbu: null,
    accountNumber: '98765433',
    alias: 'uala.dolares',
    bank: 'Uala',
    ownerIndex: 0,
    balance: '200.00',
    currency: AccountCurrency.USD,
  },
  // Efectivo (cash)
  {
    name: 'Efectivo',
    description: 'Dinero en efectivo',
    cbu: null,
    accountNumber: null,
    alias: 'efectivo',
    bank: null,
    ownerIndex: 0,
    balance: '50000.00',
    currency: AccountCurrency.ARS,
  },
];

// Seed transactions
const seedTransactions: SeedTransaction[] = [
  {
    fromAccountIndex: 0, // BBVA Pesos
    amount: 5000.00,
    toAccountIndex: 2, // Galicia Pesos
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 1, // ARS
    categoryIndex: 8, // Transferencia
    description: 'Transferencia entre cuentas',
  },
  {
    fromAccountIndex: 4, // Uala Pesos
    amount: 2000.00,
    toAccountIndex: 6, // Efectivo
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 1, // ARS
    categoryIndex: 8, // Transferencia
    description: 'Extracción de efectivo',
  },
  {
    fromAccountIndex: 0, // BBVA Pesos
    amount: 15000.00,
    toAccountIndex: 0, // same - expense
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 1, // ARS
    categoryIndex: 0, // Alimentación
    description: 'Compra supermercado',
  },
  {
    fromAccountIndex: 2, // Galicia Pesos
    amount: 50000.00,
    toAccountIndex: 4, // Uala Pesos
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    auditDate: null,
    assetIndex: 1, // ARS
    categoryIndex: 10, // Inversiones
    description: 'Inversión en FCI',
  },
];

// Seed credit cards
const seedCreditCards: SeedCreditCard[] = [
  // BBVA Credit Cards
  {
    name: 'BBVA Visa',
    last4: '1234',
    closingDay: 27,
    dueDay: 9,
    taxPercent: 21,
    fixedFees: 2500,
    bank: 'BBVA',
    accountIndex: 0, // BBVA Pesos
  },
  {
    name: 'BBVA Mastercard',
    last4: '5678',
    closingDay: 27,
    dueDay: 9,
    taxPercent: 21,
    fixedFees: 2000,
    bank: 'BBVA',
    accountIndex: 0, // BBVA Pesos
  },
  // Galicia Credit Cards
  {
    name: 'Galicia Visa',
    last4: '4045',
    closingDay: 15,
    dueDay: 5,
    taxPercent: 21,
    fixedFees: 3000,
    bank: 'Galicia',
    accountIndex: 2, // Galicia Pesos
  },
  {
    name: 'Galicia Mastercard',
    last4: '9012',
    closingDay: 15,
    dueDay: 5,
    taxPercent: 21,
    fixedFees: 2500,
    bank: 'Galicia',
    accountIndex: 2, // Galicia Pesos
  },
  // Uala Credit Card (prepaid/debit-like)
  {
    name: 'Uala Mastercard',
    last4: '3456',
    closingDay: 1,
    dueDay: 1,
    taxPercent: 0,
    fixedFees: 0,
    bank: 'Uala',
    accountIndex: 4, // Uala Pesos
  },
];

/**
 * Seeds the database with initial data if it's empty
 * @param db - Database instance
 * @returns true if seeding was performed, false if data already exists
 */
export const seedDatabase = (db: Database): boolean => {
  try {
    // Check if there are already owners in the database
    const ownersResult = db.exec('SELECT COUNT(*) as count FROM Owner');
    if (ownersResult.length > 0 && ownersResult[0].values.length > 0) {
      const ownerCount = ownersResult[0].values[0][0] as number;
      if (ownerCount > 0) {
        console.log('Database already has data. Skipping seed.');
        return false;
      }
    }

    console.log('Seeding database with initial data...');

    // Insert seed owners and track their IDs
    const ownerIds: number[] = [];
    const ownerStmt = db.prepare(
      'INSERT INTO Owner (Name, Description) VALUES (?, ?)'
    );

    seedOwners.forEach(owner => {
      ownerStmt.run([owner.name, owner.description]);
      
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        ownerIds.push(id);
        console.log(`Created owner: ${owner.name} (ID: ${id})`);
      }
    });
    ownerStmt.free();

    // Insert seed assets and track their IDs
    const assetIds: number[] = [];
    const assetStmt = db.prepare(
      'INSERT INTO Assets (Ticket, Price) VALUES (?, ?)'
    );

    seedAssets.forEach(asset => {
      assetStmt.run([asset.ticket, asset.price]);
      
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        assetIds.push(id);
        console.log(`Created asset: ${asset.ticket} (ID: ${id})`);
      }
    });
    assetStmt.free();

    // Insert seed categories and track their IDs
    const categoryIds: number[] = [];
    const categoryStmt = db.prepare(
      'INSERT INTO Category (Name, Description, Color, Icon) VALUES (?, ?, ?, ?)'
    );

    seedCategories.forEach(category => {
      categoryStmt.run([category.name, category.description, category.color, category.icon]);
      
      const result = db.exec('SELECT last_insert_rowid()');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0] as number;
        categoryIds.push(id);
        console.log(`Created category: ${category.name} (ID: ${id})`);
      }
    });
    categoryStmt.free();

    // Insert seed accounts and track their IDs
    const accountIds: number[] = [];
    const accountStmt = db.prepare(
      'INSERT INTO Account (Name, Description, Cbu, AccountNumber, Alias, Bank, OwnerId, Balance, Currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    seedAccounts.forEach(account => {
      const ownerId = ownerIds[account.ownerIndex];
      if (ownerId) {
        accountStmt.run([
          account.name,
          account.description,
          account.cbu,
          account.accountNumber,
          account.alias,
          account.bank,
          ownerId,
          account.balance,
          account.currency,
        ]);
        
        const result = db.exec('SELECT last_insert_rowid()');
        if (result.length > 0 && result[0].values.length > 0) {
          const id = result[0].values[0][0] as number;
          accountIds.push(id);
          console.log(`Created account: ${account.name} (ID: ${id})`);
        }
      }
    });
    accountStmt.free();

    // Insert seed transactions
    const txStmt = db.prepare(
      'INSERT INTO [Transaction] (FromAccountId, Amount, ToAccountId, Date, AuditDate, AssetId, CategoryId, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    seedTransactions.forEach(tx => {
      const fromAccountId = accountIds[tx.fromAccountIndex];
      const toAccountId = accountIds[tx.toAccountIndex];
      const assetId = tx.assetIndex !== null ? assetIds[tx.assetIndex] : null;
      const categoryId = tx.categoryIndex !== null ? categoryIds[tx.categoryIndex] : null;
      
      if (fromAccountId && toAccountId) {
        txStmt.run([
          fromAccountId,
          tx.amount,
          toAccountId,
          tx.date,
          tx.auditDate,
          assetId,
          categoryId,
          tx.description || null,
        ]);
        console.log(`Created transaction: ${tx.amount} from account ${fromAccountId} to ${toAccountId} - ${tx.description || 'no description'}`);
      }
    });
    txStmt.free();

    // Insert seed credit cards
    const ccStmt = db.prepare(
      'INSERT INTO CreditCard (AccountId, Name, Last4, ClosingDay, DueDay, TaxPercent, FixedFees, Bank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    seedCreditCards.forEach(cc => {
      const accountId = accountIds[cc.accountIndex];
      if (accountId) {
        ccStmt.run([
          accountId,
          cc.name,
          cc.last4,
          cc.closingDay,
          cc.dueDay,
          cc.taxPercent,
          cc.fixedFees,
          cc.bank,
        ]);
        console.log(`Created credit card: ${cc.name} (${cc.last4}) for account ID ${accountId}`);
      }
    });
    ccStmt.free();

    // Insert seed investments (if we have investment accounts)
    // Account indices: 0=BBVA Pesos, 1=BBVA Dólares, 2=Galicia Pesos, 3=Galicia Dólares, 4=Uala Pesos, 5=Uala Dólares, 6=Efectivo
    if (accountIds.length >= 6) {
      const investmentStmt = db.prepare(
        `INSERT INTO investments 
         (account_id, type, name, symbol, quantity, purchase_price, amount, commission, currency, purchase_date, current_value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const investments = [
        {
          accountId: accountIds[3], // Galicia Dólares
          type: 'STOCKS',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          quantity: 10,
          purchasePrice: 150.00,
          amount: 1503.75, // 10 * 150 + 3.75 commission (0.25%)
          commission: 3.75,
          currency: AccountCurrency.USD,
          purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          currentValue: 1550.00, // Will be updated by quotation service
        },
        {
          accountId: accountIds[3], // Galicia Dólares
          type: 'STOCKS',
          name: 'Microsoft Corporation',
          symbol: 'MSFT',
          quantity: 5,
          purchasePrice: 300.00,
          amount: 1503.75, // 5 * 300 + 3.75 commission
          commission: 3.75,
          currency: AccountCurrency.USD,
          purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          currentValue: 1520.00,
        },
        {
          accountId: accountIds[2], // Galicia Pesos
          type: 'MUTUAL_FUNDS',
          name: 'FIMA Premium',
          symbol: 'FIMA',
          quantity: 1000,
          purchasePrice: 350.00,
          amount: 350000, // 1000 * 350
          commission: 0,
          currency: AccountCurrency.ARS,
          purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          currentValue: 360000.00,
        },
        {
          accountId: accountIds[4], // Uala Pesos
          type: 'STOCKS',
          name: 'S&P 500 ETF',
          symbol: 'SPY',
          quantity: 2,
          purchasePrice: 52000.00,
          amount: 104000, // 2 * 52000
          commission: 0,
          currency: AccountCurrency.ARS,
          purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          currentValue: 108000.00,
        },
      ];

      investments.forEach(inv => {
        investmentStmt.run([
          inv.accountId,
          inv.type,
          inv.name,
          inv.symbol,
          inv.quantity,
          inv.purchasePrice,
          inv.amount,
          inv.commission,
          inv.currency,
          inv.purchaseDate,
          inv.currentValue,
        ]);
        console.log(`Created investment: ${inv.name} for account ID ${inv.accountId}`);
      });
      investmentStmt.free();
    }

    // Insert seed quotations
    const quotationStmt = db.prepare(
      'INSERT INTO quotations (symbol, price, currency, last_updated) VALUES (?, ?, ?, ?)'
    );

    const quotations = [
      { symbol: 'AAPL', price: 155.00, currency: AccountCurrency.USD },
      { symbol: 'MSFT', price: 304.00, currency: AccountCurrency.USD },
      { symbol: 'GOOGL', price: 145.00, currency: AccountCurrency.USD },
      { symbol: 'GGAL.BA', price: 360.00, currency: AccountCurrency.ARS },
      { symbol: 'YPF.BA', price: 25000.00, currency: AccountCurrency.ARS },
      { symbol: 'USD/ARS', price: 1050.00, currency: AccountCurrency.ARS },
    ];

    const now = new Date().toISOString();
    quotations.forEach(q => {
      quotationStmt.run([q.symbol, q.price, q.currency, now]);
      console.log(`Created quotation: ${q.symbol} = ${q.price} ${q.currency}`);
    });
    quotationStmt.free();

    // Save the database after seeding
    saveDatabase(db);

    console.log('Database seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};
