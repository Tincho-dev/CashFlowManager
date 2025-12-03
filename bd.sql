-------------------------------------------------------
-- 1. CREACIÓN DE TABLAS BASE (CON CORRECCIÓN DE TIPO Y PALABRA RESERVADA)
-------------------------------------------------------

-- Tabla Owner
CREATE TABLE Owner (
    Id          INT PRIMARY KEY IDENTITY(1,1),
    Name        NVARCHAR(32) NOT NULL,
    Description NVARCHAR(512) NULL
);

-- Tabla Assets
CREATE TABLE Assets (
    Id      INT PRIMARY KEY IDENTITY(1,1),
    Ticket  NVARCHAR(10) NULL,
    Price   FLOAT NULL
);

-- Tabla Currency: lista de monedas soportadas (normalizada)
CREATE TABLE Currency (
    Code        NVARCHAR(3) PRIMARY KEY,      -- p.ej. 'ARS','USD'
    Name        NVARCHAR(64) NOT NULL,
    Symbol      NVARCHAR(8) NULL,
    IsDefault   BIT NOT NULL DEFAULT 0
);

-- Tabla Category: categorías para clasificar transacciones
CREATE TABLE Category (
    Id          INT PRIMARY KEY IDENTITY(1,1),
    Name        NVARCHAR(64) NOT NULL,
    Description NVARCHAR(256) NULL,
    Color       NVARCHAR(7) NULL,             -- Color en formato hexadecimal (#RRGGBB)
    Icon        NVARCHAR(32) NULL             -- Nombre del icono (opcional)
);

-- Tabla Account
CREATE TABLE Account (
    Id              INT PRIMARY KEY IDENTITY(1,1),
    Name            NVARCHAR(64) NOT NULL,
    Description     NVARCHAR(512) NULL,
    Cbu             NVARCHAR(22) NULL,
    AccountNumber   NVARCHAR(10) NULL,
    Alias           NVARCHAR(128) NULL,
    Bank            NVARCHAR(32) NULL,
    OwnerId         INT NOT NULL,
    Balance         FLOAT NULL,
    Currency        NVARCHAR(3) NOT NULL DEFAULT 'ARS'
);

-- Tabla [Transaction] (Nombre de tabla entre corchetes)
CREATE TABLE [Transaction] (
    Id              INT PRIMARY KEY IDENTITY(1,1),
    FromAccountId   INT NOT NULL,
    Amount          FLOAT NOT NULL,
    ToAccountId     INT NOT NULL,
    Date            DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),  -- default fecha actual
    AuditDate       DATETIME2(7) NULL DEFAULT SYSUTCDATETIME(),      -- default fecha actual
    AssetId         INT NULL,
    CategoryId      INT NULL                                          -- FK a Category
);

-- Tabla CreditCard
CREATE TABLE CreditCard (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AccountId INT NOT NULL,            -- FK: cuenta bancaria propietaria de la tarjeta
    Name NVARCHAR(64) NULL,            -- nombre de la tarjeta / alias
    Last4 NVARCHAR(4) NULL,            -- últimos 4 dígitos (opcional)
    ClosingDay TINYINT NULL,           -- día de cierre de ciclo (1-31)
    DueDay TINYINT NULL,               -- día de vencimiento (1-31)
    TaxPercent DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- % de impuestos aplicados
    FixedFees DECIMAL(18,2) NOT NULL DEFAULT 0.00,  -- gastos fijos mensuales
    Bank NVARCHAR(32) NULL
);

-- Tabla Loan: representa un préstamo asociado a cuentas (prestatario y opcional prestador)
CREATE TABLE Loan (
    Id                  INT PRIMARY KEY IDENTITY(1,1),
    BorrowerAccountId   INT NOT NULL,                     -- FK a Account (quien recibe el préstamo)
    LenderAccountId     INT NULL,                         -- FK a Account (opcional, banco o prestador)
    Principal           DECIMAL(18,2) NOT NULL,           -- monto principal
    Currency            NVARCHAR(3) NOT NULL DEFAULT 'ARS', -- moneda del préstamo
    InterestRate        DECIMAL(9,6) NOT NULL DEFAULT 0.0, -- tasa anual en formato decimal (e.g. 0.3500 = 35%)
    StartDate           DATE NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    EndDate             DATE NULL,
    TermMonths          INT NULL,                         -- plazo en meses
    InstallmentCount    INT NULL,                         -- número total de cuotas
    PaymentFrequency    NVARCHAR(16) NULL DEFAULT 'Monthly', -- periodicidad
    Status              NVARCHAR(32) NOT NULL DEFAULT 'Active', -- Active/Closed/Defaulted
    CreatedAt           DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    Notes               NVARCHAR(512) NULL,
    CONSTRAINT CK_Loan_InterestRate CHECK (InterestRate >= 0),
    CONSTRAINT CK_Loan_Currency CHECK (Currency IN ('ARS','USD'))
);

-- Tabla LoanInstallment: cuotas normalizadas por préstamo
CREATE TABLE LoanInstallment (
    Id                  INT PRIMARY KEY IDENTITY(1,1),
    LoanId              INT NOT NULL,                     -- FK a Loan
    Sequence            INT NOT NULL,                     -- número de cuota (1..N)
    DueDate             DATE NOT NULL,
    PrincipalAmount     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    InterestAmount      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    FeesAmount          DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    TotalAmount         DECIMAL(18,2) NOT NULL AS (PrincipalAmount + InterestAmount + FeesAmount) PERSISTED,
    Paid                BIT NOT NULL DEFAULT 0,
    PaidDate            DATETIME2(7) NULL,
    PaymentAccountId    INT NULL,                         -- account used to pay esta cuota
    CONSTRAINT UQ_Loan_Installment UNIQUE (LoanId, Sequence),
    CONSTRAINT CK_Installment_Amounts CHECK (PrincipalAmount >= 0 AND InterestAmount >= 0 AND FeesAmount >= 0)
);

-- Tabla ExchangeRate: tipo de cambio histórico (From -> To)
CREATE TABLE ExchangeRate (
    Id              INT PRIMARY KEY IDENTITY(1,1),
    FromCurrency    NVARCHAR(3) NOT NULL,
    ToCurrency      NVARCHAR(3) NOT NULL,
    Rate            DECIMAL(18,8) NOT NULL,              -- valor multiplicador From * Rate = To
    EffectiveDate   DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    Source          NVARCHAR(128) NULL,
    CONSTRAINT UQ_ExchangeRate_FromToDate UNIQUE (FromCurrency, ToCurrency, EffectiveDate)
);

-------------------------------------------------------
-- 2. DEFINICIÓN DE FOREIGN KEYS (FK)
-------------------------------------------------------

-- FK 1: Account -> Owner
ALTER TABLE Account
ADD CONSTRAINT FK_Account_Owner FOREIGN KEY (OwnerId)
REFERENCES Owner (Id);

-- FK: Account.Currency -> Currency(Code)
ALTER TABLE Account
ADD CONSTRAINT FK_Account_Currency FOREIGN KEY (Currency) REFERENCES Currency (Code);

-- FK 2 & 3: [Transaction] -> Account (Usando el nombre de la tabla entre corchetes)
ALTER TABLE [Transaction]
ADD CONSTRAINT FK_Transaction_FromAccount FOREIGN KEY (FromAccountId)
REFERENCES Account (Id);

ALTER TABLE [Transaction]
ADD CONSTRAINT FK_Transaction_ToAccount FOREIGN KEY (ToAccountId)
REFERENCES Account (Id);

-- FK 4: [Transaction] -> Assets (Usando el nombre de la tabla entre corchetes)
ALTER TABLE [Transaction]
ADD CONSTRAINT FK_Transaction_Asset FOREIGN KEY (AssetId)
REFERENCES Assets (Id);

-- FK 5: [Transaction] -> Category
ALTER TABLE [Transaction]
ADD CONSTRAINT FK_Transaction_Category FOREIGN KEY (CategoryId)
REFERENCES Category (Id);

-- FK 5: CreditCard -> Account
ALTER TABLE CreditCard
ADD CONSTRAINT FK_CreditCard_Account FOREIGN KEY (AccountId)
REFERENCES Account (Id);

-- Agregar FK: Loan -> Account (Borrower y Lender)
ALTER TABLE Loan
ADD CONSTRAINT FK_Loan_BorrowerAccount FOREIGN KEY (BorrowerAccountId)
REFERENCES Account (Id);

ALTER TABLE Loan
ADD CONSTRAINT FK_Loan_LenderAccount FOREIGN KEY (LenderAccountId)
REFERENCES Account (Id);

-- FK: Loan.Currency -> Currency(Code)
ALTER TABLE Loan
ADD CONSTRAINT FK_Loan_Currency FOREIGN KEY (Currency) REFERENCES Currency (Code);

-- Agregar FK: LoanInstallment -> Loan
ALTER TABLE LoanInstallment
ADD CONSTRAINT FK_LoanInstallment_Loan FOREIGN KEY (LoanId)
REFERENCES Loan (Id);

-- Agregar FK: LoanInstallment -> Account (PaymentAccountId)
ALTER TABLE LoanInstallment
ADD CONSTRAINT FK_LoanInstallment_PaymentAccount FOREIGN KEY (PaymentAccountId)
REFERENCES Account (Id);

-- FKs para ExchangeRate -> Currency
ALTER TABLE ExchangeRate
ADD CONSTRAINT FK_ExchangeRate_FromCurrency FOREIGN KEY (FromCurrency) REFERENCES Currency (Code);

ALTER TABLE ExchangeRate
ADD CONSTRAINT FK_ExchangeRate_ToCurrency FOREIGN KEY (ToCurrency) REFERENCES Currency (Code);

-------------------------------------------------------
-- 3. SEED DATA (Datos iniciales)
-------------------------------------------------------

-- Insertar monedas por defecto
INSERT INTO Currency (Code, Name, Symbol, IsDefault) VALUES ('ARS', 'Peso Argentino', '$', 1);
INSERT INTO Currency (Code, Name, Symbol, IsDefault) VALUES ('USD', 'Dólar Estadounidense', 'US$', 0);

-- Insertar categorías por defecto
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Alimentación', 'Gastos en comida, supermercado y restaurantes', '#4CAF50', 'utensils');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Transporte', 'Gastos en transporte público, combustible y vehículos', '#2196F3', 'car');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Vivienda', 'Alquiler, hipoteca y servicios del hogar', '#9C27B0', 'home');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Servicios', 'Agua, luz, gas, internet y teléfono', '#FF9800', 'zap');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Salud', 'Gastos médicos, medicamentos y seguros de salud', '#F44336', 'heart');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Entretenimiento', 'Ocio, suscripciones y actividades recreativas', '#E91E63', 'music');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Educación', 'Cursos, libros y materiales educativos', '#3F51B5', 'book');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Compras', 'Ropa, electrodomésticos y artículos personales', '#00BCD4', 'shopping-bag');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Transferencia', 'Transferencias entre cuentas propias', '#607D8B', 'repeat');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Ingresos', 'Salarios, bonos y otros ingresos', '#8BC34A', 'dollar-sign');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Inversiones', 'Compra y venta de activos financieros', '#FFC107', 'trending-up');
INSERT INTO Category (Name, Description, Color, Icon) VALUES ('Otros', 'Gastos no categorizados', '#9E9E9E', 'more-horizontal');