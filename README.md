# CashFlow Manager

Una aplicación integral de gestión de finanzas personales construida con React, TypeScript y SQLite.

## Documentación Adicional

Para más información sobre el proyecto, consulta los siguientes documentos:

- [📋 CashFlow Manager - Proyecto de Innovación](docs/CashFlow_Manager_Proyecto_Innovacion.md)
- [📖 Estado del Arte - App Financiera Coloquial](docs/Estado%20del%20arte-%20App%20financiera%20coloquial.docx.md)
- [💰 Inversión Fintech - Expansión y Escalabilidad Global](docs/Inversión%20Fintech-%20Expansión%20y%20Escalabilidad%20Globa....docx.md)
- [📝 Proyecto con Formato Innovación](docs/Proyecto%20con%20formato%20Innovacion.docx.md)
- [🎓 TFi GTEC 2](docs/TFi%20GTEC%202.docx.md)

---

## Características (Features)

### Funcionalidad Principal (Core Functionality)
- 📱 **Soporte PWA** - Instala como aplicación móvil o de escritorio con capacidad offline-first
- 💰 **Gestión de Cuentas (Account Management)** - Rastrea múltiples cuentas con diferentes monedas
- 📊 **Seguimiento de Ingresos y Gastos (Income & Expense Tracking)** - Monitorea tus ingresos y gastos
- 🔄 **Transacciones Recurrentes (Recurring Transactions)** - Configura pagos recurrentes automáticos
- 💳 **Múltiples Tipos de Pago (Multiple Payment Types)** - Soporte para tarjetas de crédito, débito, efectivo, transferencias y cheques
- 🌍 **Soporte Multi-Moneda (Multi-Currency Support)** - Maneja transacciones en USD, EUR, GBP, ARS y BRL
- 💱 **Tasas de Cambio en Tiempo Real (Real-Time Exchange Rates)** - Conversión automática de moneda con caché offline
- 📈 **Seguimiento de Inversiones (Investment Tracking)** - Monitorea tu portafolio de inversiones con precios de acciones en vivo
- 💵 **Gestión de Préstamos (Loan Management)** - Rastrea préstamos y pagos mensuales (Próximamente)
- 🔀 **Transferencias entre Cuentas (Account Transfers)** - Transfiere dinero entre tus propias cuentas con conversión de moneda (Próximamente)
- 📤 **Exportación a Excel (Excel Export)** - Exporta todos tus datos financieros a formato Excel
- 🗄️ **Base de Datos SQLite** - Almacenamiento local de datos con persistencia en el navegador
- ☁️ **Base para Sincronización en la Nube (Cloud Sync Foundation)** - Listo para integración con Google Sheets y SharePoint

### Características Impulsadas por IA 🤖 (AI-Powered Features)
- 🤖 **Chatbot IA Multilingüe (Multilingual AI Chatbot)** - Interfaz de lenguaje natural en inglés y español
  - Pregunta sobre tu saldo, cuentas y transacciones recientes
  - Obtén ayuda contextual sobre tipos de cuenta y categorías de transacciones
  - Te guía para crear cuentas y transacciones
  - Detección inteligente de intención basada en palabras clave
- 📸 **Procesamiento de Imágenes OCR (OCR Image Processing)** - Sube imágenes de extractos bancarios o recibos
  - Extracción automática de texto de imágenes
  - Detección inteligente de montos y fechas
  - Extrae múltiples transacciones de una sola imagen
- 📝 **Registro de Aplicación (Application Logging)** - Registro completo de auditoría de todas las operaciones
  - Rastrea todas las operaciones de cuentas y transacciones
  - Exporta registros en formato JSON o CSV
  - Filtra por categoría, nivel o rango de fechas
- 💡 **Tooltips Contextuales (Contextual Tooltips)** - Ayuda en línea en toda la aplicación
  - Aprende sobre diferentes tipos de cuenta
  - Comprende las categorías de transacciones
  - Obtén orientación sobre los campos de formularios

### Mejoras de UI/UX 🎨 (UI/UX Enhancements)
- 🎨 **Diseño Material-UI** - Sistema de diseño moderno y consistente
- 📱 **Navegación Inferior Móvil (Mobile Bottom Navigation)** - Navegación fácil en dispositivos móviles
- 🌐 **Soporte Bilingüe (Bilingual Support)** - Soporte completo para inglés y español
- ♿ **Accesibilidad (Accessibility)** - Etiquetas ARIA y soporte de navegación por teclado

## Stack Tecnológico (Tech Stack)

- **Frontend**: React 19 con TypeScript
- **Framework de UI**: Material-UI (MUI) v7
- **Enrutamiento (Routing)**: React Router v7
- **Base de Datos (Database)**: SQL.js (SQLite en el navegador)
- **Herramienta de Construcción (Build Tool)**: Vite 7
- **PWA**: Vite PWA Plugin con Workbox
- **IA/ML (AI/ML)**: 
  - Tesseract.js para OCR (Reconocimiento Óptico de Caracteres)
  - @xenova/transformers (preparado para características NLP)
- **Exportación a Excel (Excel Export)**: Biblioteca XLSX
- **Iconos (Icons)**: Lucide React
- **Estilos (Styling)**: Módulos SCSS + temas MUI
- **i18n**: react-i18next

## Arquitectura (Architecture)

La aplicación sigue un patrón de arquitectura en capas:

### Capa de Datos (Data Layer)
- **Base de Datos (Database)** (`src/data/database.ts`) - Inicialización de SQLite y gestión de migraciones
- **Repositorios (Repositories)** (`src/data/repositories/`) - Capa de acceso a datos con operaciones CRUD
  - `AccountRepository.ts` - Operaciones de datos de cuentas (accounts)
  - `TransactionRepository.ts` - Operaciones de datos de transacciones (transactions)

### Capa de Servicios (Service Layer)
- **Servicios (Services)** (`src/services/`) - Capa de lógica de negocio
  - `AccountService.ts` - Lógica de gestión de cuentas con registro
  - `TransactionService.ts` - Gestión de transacciones con actualización automática de saldo y registro
  - `ChatbotService.ts` - Chatbot IA con procesamiento de lenguaje natural y OCR
  - `LoggingService.ts` - Registro de aplicación y auditoría

### Capa de Presentación (Presentation Layer)
- **Componentes (Components)** (`src/components/`) - Componentes UI reutilizables
  - `layout/` - Componentes de diseño (Header, Sidebar, BottomNavigation)
  - `accounts/` - Componentes específicos de cuentas (AccountCard, AccountDialog)
  - `chatbot/` - Interfaz del chatbot IA
  - `common/` - Componentes compartidos (InfoTooltip, PlaceholderPage)
- **Páginas (Pages)** (`src/pages/`) - Componentes a nivel de ruta
- **Contextos (Contexts)** (`src/contexts/`) - Contexto React para gestión de estado

### Utilidades (Utilities)
- **Exportación Excel (Excel Export)** (`src/utils/excelExport.ts`) - Funcionalidad de exportación de datos
- **Tipos (Types)** (`src/types/index.ts`) - Definiciones de tipos TypeScript

## Comenzando (Getting Started)

### Prerequisitos (Prerequisites)
- Node.js 18+ y npm

### Instalación (Installation)

1. Clona el repositorio:
```bash
git clone https://github.com/Tincho-dev/CashFlowManager.git
cd CashFlowManager
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre tu navegador y navega a `http://localhost:5173`

### Construcción para Producción (Build for Production)

```bash
npm run build
```

Los archivos listos para producción estarán en el directorio `dist`.

### Vista Previa de Construcción de Producción (Preview Production Build)

```bash
npm run preview
```

## Uso (Usage)

### Creando una Cuenta (Creating an Account)
1. Navega a la página "Cuentas" (Accounts)
2. Haz clic en "Agregar Cuenta" (Add Account)
3. Completa los detalles de la cuenta (nombre, tipo, saldo inicial, moneda)
4. Haz clic en "Crear" (Create)

### Agregando Transacciones (Adding Transactions)
1. Navega a "Ingresos" (Income) o "Gastos" (Expenses)
2. Haz clic en el botón "Agregar" (Add)
3. Selecciona una cuenta, ingresa el monto, descripción y otros detalles
4. Marca como recurrente si es una transacción regular

### Usando el Chatbot IA 🤖 (Using the AI Chatbot)
1. Haz clic en el botón de chat flotante (esquina inferior derecha de la pantalla)
2. Haz preguntas en lenguaje natural:
   - "¿Cuál es mi saldo?" / "What's my balance?"
   - "Mostrar mis cuentas" / "Show my accounts"
   - "Listar transacciones recientes" / "List recent transactions"
   - "Ayuda" / "Help"
3. Sube imágenes de extractos bancarios o recibos:
   - Haz clic en "Subir Imagen" (Upload Image) en el chat
   - Selecciona una imagen con datos de transacciones
   - El chatbot extraerá y analizará el texto
4. Obtén ayuda contextual:
   - Pregunta sobre tipos de cuenta: "¿Qué es una cuenta corriente?" / "What's a checking account?"
   - Aprende sobre categorías: "Ayúdame a categorizar mis gastos" / "Help me categorize my expenses"

### Accediendo a los Registros de la Aplicación (Accessing Application Logs)
Los registros se almacenan en el localStorage del navegador y pueden ser:
- Exportados programáticamente vía `LoggingService.exportLogs()` (JSON)
- Exportados como CSV vía `LoggingService.exportLogsAsCSV()`
- Filtrados por categoría, nivel o rango de fechas
- Usados para auditorías y depuración

### Exportando Datos (Exporting Data)
1. Navega a "Exportar Datos" (Export Data)
2. Haz clic en "Exportar a Excel" (Export to Excel)
3. Tus datos serán descargados como un archivo Excel con múltiples hojas

## Almacenamiento de Datos (Data Storage)

Todos los datos se almacenan localmente en tu navegador usando SQLite (vía SQL.js). La base de datos se guarda automáticamente en localStorage después de cada operación, asegurando que tus datos persistan entre sesiones del navegador.

### Esquema de Base de Datos (Database Schema)

- **accounts** - Cuentas de usuario (corriente, ahorros, tarjetas de crédito, etc.)
- **transactions** - Todas las transacciones de ingresos y gastos
- **investments** - Seguimiento de portafolio de inversiones
- **loans** - Seguimiento de préstamos y deudas
- **transfers** - Transferencias de dinero entre cuentas
- **categories** - Categorías de transacciones

### Consultando la Base de Datos desde VSCode (Querying the Database from VSCode)

La aplicación almacena su base de datos SQLite en el localStorage del navegador. Para inspeccionar o consultar los datos:

#### Método 1: Usando DevTools del Navegador (Recomendado) (Using Browser DevTools - Recommended)

1. Abre tu aplicación en un navegador (Chrome, Firefox, Edge, etc.)
2. Abre las Herramientas de Desarrollador (`F12` o `Clic derecho > Inspeccionar`)
3. Ve a la pestaña **Application** (Chrome) o **Storage** (Firefox)
4. Navega a **Local Storage** > `http://localhost:5173` (o tu dominio)
5. Encuentra la clave `cashflow_db` - esta contiene tu base de datos como una cadena codificada en base64

#### Método 2: Extrayendo y Consultando con Herramientas SQLite (Extracting and Querying with SQLite Tools)

1. **Extrae la base de datos:**
   ```javascript
   // Abre la consola del navegador y ejecuta:
   const dbData = localStorage.getItem('cashflow_db');
   const blob = new Blob([Uint8Array.from(atob(dbData), c => c.charCodeAt(0))], { type: 'application/octet-stream' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'cashflow.db';
   a.click();
   ```

2. **Abre en VSCode con extensión SQLite:**
   - Instala la [extensión SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer) o la extensión [SQLite](https://marketplace.visualstudio.com/items?itemName=alexcvzz.vscode-sqlite)
   - Haz clic derecho en el archivo `cashflow.db` descargado
   - Selecciona "Open with SQLite Viewer" o usa la Paleta de Comandos: `SQLite: Open Database`

3. **Consulta usando herramientas de línea de comandos:**
   ```bash
   sqlite3 cashflow.db
   # Ahora puedes ejecutar consultas SQL:
   SELECT * FROM accounts;
   SELECT * FROM transactions ORDER BY date DESC LIMIT 10;
   SELECT a.name, SUM(t.amount) as total
   FROM accounts a
   JOIN transactions t ON t.account_id = a.id
   WHERE t.type = 'INCOME'
   GROUP BY a.id;
   ```

#### Método 3: Usando la Consola de la Aplicación (Avanzado) (Using In-App Console - Advanced)

Puedes consultar la base de datos directamente desde la consola del navegador:

```javascript
// Accede al servicio de base de datos
import { getDatabase } from './src/data/database';

// Obtén la instancia de la base de datos
const db = getDatabase();

// Ejecuta consultas
const result = db.exec('SELECT * FROM accounts');
console.table(result[0].values);

// Obtén todas las transacciones
const transactions = db.exec('SELECT * FROM transactions ORDER BY date DESC LIMIT 10');
console.table(transactions[0].values);
```

#### Consultas SQL Comunes (Common SQL Queries)

```sql
-- Ver todas las cuentas con saldos
SELECT id, name, type, balance, currency FROM accounts;

-- Transacciones recientes
SELECT t.*, a.name as account_name 
FROM transactions t 
JOIN accounts a ON t.account_id = a.id 
ORDER BY t.date DESC LIMIT 20;

-- Saldo total por moneda
SELECT currency, SUM(balance) as total_balance 
FROM accounts 
GROUP BY currency;

-- Resumen mensual de gastos
SELECT 
  strftime('%Y-%m', date) as month,
  category,
  SUM(amount) as total
FROM transactions
WHERE type IN ('FIXED_EXPENSE', 'VARIABLE_EXPENSE')
GROUP BY month, category
ORDER BY month DESC, total DESC;
```

### Ubicación de la Base de Datos (Database Location)

- **Navegador (Browser)**: `localStorage['cashflow_db']` (binario codificado en base64)
- **Formato (Format)**: Archivo de base de datos SQLite 3.x
- **Persistencia (Persistence)**: Se guarda automáticamente después de cada operación de base de datos
- **Tamaño (Size)**: Varía según los datos, típicamente desde unos KB hasta unos MB

## Características Avanzadas (Advanced Features)

### Sistema de Cambio de Moneda (Currency Exchange System)

La aplicación incluye un sofisticado sistema de cambio de moneda:

- **Tasas en Tiempo Real (Real-Time Rates)** - Obtiene tasas de cambio en vivo de exchangerate-api.com
- **Offline-First** - Almacena en caché las tasas localmente para uso sin conexión
- **Auto-Actualización (Auto-Update)** - Actualiza automáticamente las tasas cuando está en línea (cada hora)
- **Multi-Moneda (Cross-Currency)** - Soporta conversiones entre todas las monedas soportadas
- **Moneda Predeterminada (Default Currency)** - Establece tu moneda predeterminada preferida globalmente

El almacén de monedas persiste las tasas de cambio en localStorage y se actualiza automáticamente cuando te reconectas a internet.

### Integración de Precios de Acciones (Stock Price Integration)

Para el seguimiento de inversiones, la app se integra con APIs de precios de acciones:

- **Precios en Vivo (Live Prices)** - Obtiene precios de acciones en tiempo real de Yahoo Finance
- **Caché Offline (Offline Caching)** - Almacena los últimos precios conocidos para acceso sin conexión
- **Auto-Actualización (Auto-Refresh)** - Actualiza precios cuando se restaura la conexión
- **Sistema de Cola (Queue System)** - Encola actualizaciones mientras está sin conexión y las procesa cuando está en línea
- **Soporte de Símbolos (Symbol Support)** - Rastrea acciones por símbolo de ticker (ej., AAPL, GOOGL)

### Base para Sincronización en la Nube (Cloud Sync Foundation)

La infraestructura está preparada para sincronización con hojas de cálculo en la nube:

- **Cola Offline-First** - Los cambios se encolan cuando está sin conexión y se sincronizan cuando está en línea
- **Listo para Google Sheets** - Estructura preparada para integración con Google Sheets
- **Listo para SharePoint** - Estructura preparada para integración con SharePoint
- **Sincronización Automática (Automatic Sync)** - Se sincroniza automáticamente cuando se restaura la conexión

> **Nota**: La implementación completa de OAuth para Google Sheets y SharePoint requiere un servicio backend. La implementación actual proporciona la base y puede extenderse con flujos OAuth apropiados.

## Características PWA (PWA Features)

La aplicación puede instalarse como una Progressive Web App:

- **Soporte Offline (Offline Support)** - La funcionalidad principal funciona sin conexión a internet
- **Prompt de Instalación (Install Prompt)** - Instala en dispositivos móviles y escritorios
- **Service Worker** - Almacena en caché los recursos para carga más rápida
- **Diseño Responsivo (Responsive Design)** - Diseño mobile-first optimizado para todos los tamaños de pantalla
- **Sin Scroll Horizontal (No Horizontal Scroll)** - Viewport correctamente restringido para dispositivos móviles

## Despliegue (Deployment)

### Desplegar en Vercel (Deploy to Vercel)

La forma más fácil de desplegar CashFlow Manager es usando Vercel:

#### Despliegue con Un Clic (One-Click Deploy)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tincho-dev/CashFlowManager)

#### Despliegue Manual (Manual Deployment)

1. **Instala Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Inicia sesión en Vercel:**
   ```bash
   vercel login
   ```

3. **Despliega:**
   ```bash
   # Para despliegue de vista previa
   vercel
   
   # Para despliegue de producción
   vercel --prod
   ```

#### Despliegue Automático con GitHub Actions (Automatic Deployment with GitHub Actions)

El repositorio incluye un workflow de GitHub Actions que despliega automáticamente a Vercel en cada push a `main` y crea despliegues de vista previa para pull requests.

**Pasos de Configuración (Setup Steps):**

1. **Crea una cuenta en Vercel** en [vercel.com](https://vercel.com)

2. **Obtén tus tokens de Vercel:**
   - Ve a [Configuración de Cuenta de Vercel > Tokens](https://vercel.com/account/tokens)
   - Crea un nuevo token y cópialo

3. **Obtén tus IDs de Proyecto:**
   ```bash
   # Instala Vercel CLI
   npm install -g vercel
   
   # Vincula tu proyecto
   vercel link
   
   # Obtén tu project ID y org ID de .vercel/project.json
   cat .vercel/project.json
   ```

4. **Agrega Secretos de GitHub (Add GitHub Secrets):**
   - Ve a tu repositorio de GitHub > Settings > Secrets and variables > Actions
   - Agrega los siguientes secretos:
     - `VERCEL_TOKEN`: Tu token de Vercel
     - `VERCEL_ORG_ID`: Tu ID de organización de Vercel
     - `VERCEL_PROJECT_ID`: Tu ID de proyecto de Vercel

5. **Sube a GitHub (Push to GitHub):**
   - El workflow desplegará automáticamente a Vercel en push a `main`
   - Los pull requests obtendrán despliegues de vista previa

### Desplegar en Otras Plataformas (Deploy to Other Platforms)

#### Netlify

1. Conecta tu repositorio de GitHub a Netlify
2. Configura los ajustes de construcción:
   - Comando de construcción (Build command): `npm run build`
   - Directorio de publicación (Publish directory): `dist`
3. Agrega reglas de redirección en `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

#### GitHub Pages

1. Actualiza `vite.config.ts` con la base de tu repositorio:
   ```typescript
   export default defineConfig({
     base: '/CashFlowManager/',
     // ... resto de la configuración
   })
   ```

2. Construye y despliega:
   ```bash
   npm run build
   npx gh-pages -d dist
   ```

## Contribuyendo (Contributing)

¡Las contribuciones son bienvenidas! Por favor, siéntete libre de enviar un Pull Request.

### Guías de Estilo (Style Guidelines)

- **Todos los estilos deben ser módulos SCSS** - Crea archivos `.module.scss` e impórtalos
- Nunca uses estilos en línea en archivos `.tsx` (excepto para valores dinámicos)
- Usa camelCase o nomenclatura BEM para clases CSS
- Mantén los estilos modulares y reutilizables

## Licencia (License)

Licencia MIT - siéntete libre de usar este proyecto para propósitos personales o comerciales.
