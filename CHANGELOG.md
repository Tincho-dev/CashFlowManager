# Changelog

Este documento registra las funcionalidades completadas y bugs corregidos en CashFlow Manager.

## Versión 2.9.0 - 2025-12-03

### 🎉 Funcionalidades Completadas

#### UI/UX
- ✅ Navegación móvil mejorada con bottom navigation bar
- ✅ Responsive design optimizado para tablets
- ✅ Overflow horizontal y vertical corregido en mobile
- ✅ Mobile-first viewport configuration
- ✅ Dashboard con círculo de 3 colores (gastos fijos, variables, ahorros)
- ✅ Mejoras de estilos mobile en Import Records
- ✅ Dark mode implementado (ThemeContext con toggle, persiste en localStorage, respeta preferencia del sistema)
- ✅ Accesibilidad mejorada (ARIA labels en navegación, botones y controles principales)

#### Sistema de Cuentas y Transacciones
- ✅ Página de Préstamos (Loans) completa con gestión de cuotas, múltiples frecuencias de pago y tracking de estado
- ✅ Agrupación de cuentas con filtros por banco, moneda y rango de saldo
- ✅ Store de moneda y cuenta predeterminada en AppContext

#### Chatbot e Inteligencia Artificial (Formato TOON)
- ✅ Integración de modelo de IA offline (detección por keywords, ML modelo opcional con Transformers.js)
- ✅ Reconocimiento de texto (OCR) para extractos bancarios con Tesseract.js
- ✅ Procesamiento de imágenes para captura de gastos
- ✅ Soporte multilingüe (Español e Inglés)
- ✅ Guía de usuarios para crear cuentas/transacciones desde el chat
- ✅ Crear transacciones directamente desde el chat
- ✅ Reconocimiento de monedas en transacciones (USD, ARS, EUR, GBP, BRL)
- ✅ Solicitar información faltante al usuario
- ✅ Usar configuración de moneda y cuenta predeterminada
- ✅ Detección de intención mejorada con modelo ML (Transformers.js con fallback)

#### Sistema de Ayuda
- ✅ Tooltips informativos en toda la aplicación (cuentas, formularios, transacciones)
- ✅ Documentación in-app vía chatbot

#### Logging y Auditoría
- ✅ Sistema de logs completo para todas las operaciones
- ✅ Exportación de logs (JSON y CSV)
- ✅ Visor de logs (LogViewer.tsx) con filtros por nivel, categoría, fecha y búsqueda

#### Dashboard y Reportes
- ✅ Dashboard con gráficos interactivos (Chart.js/Recharts) - Line, Bar, Pie charts
- ✅ Reporte mensual/anual de gastos (SpendingAnalysisService)
- ✅ Análisis de tendencias con comparación histórica
- ✅ Comparación período a período
- ✅ Categorización automática de gastos
- ✅ Resumen ejecutivo exportable a CSV
- ✅ Reconocimiento automático de patrones de gasto
- ✅ Predicción de gastos futuros basada en patrones históricos

#### Refactoring Técnico
- ✅ Migración completa de CSS a SCSS modules (archivos CSS legacy eliminados)
- ✅ Custom hooks extraídos (useAccounts, useTransactions)
- ✅ Tests unitarios (255 tests para servicios, repositorios, hooks y componentes)
- ✅ Tests de integración para AccountService y TransactionService
- ✅ CI/CD pipeline con GitHub Actions (lint, test, deploy a Vercel)
- ✅ Bundle size optimizado con code splitting (chunk principal ~472KB)
- ✅ Utilidades de moneda (currencyUtils.ts)

#### Infraestructura
- ✅ Deploy automático configurado para Vercel
- ✅ Sistema de datos semilla (seedData) con datos iniciales
- ✅ DataAccessLayer para abstracción de base de datos y preparación para backend

### 🐛 Bugs Corregidos

- ✅ Cambio de idioma en mobile se superponía y descajetaba el menú hamburguesa lateral - Migrado a MUI Drawer
- ✅ Traducciones faltantes en algunas etiquetas - Agregadas traducciones completas
- ✅ Chatbot no reconocía el tipo de moneda - Mejorado reconocimiento de monedas
- ✅ Cuenta por defecto no funcionaba - Implementado store de configuración en AppContext
- ✅ Sistema de datos semilla faltante - Implementado sistema de seedData con datos iniciales
- ✅ Error en Inversiones: investment.quantity.toFixed is not a function - Agregadas validaciones de tipo en InvestmentCard
- ✅ Warnings de ESLint sobre dependencias en useEffect - Refactorizado ImportRecords.tsx con useCallback y useMemo
- ✅ Bundle size superior a 500KB después de minificación - Implementado code splitting, chunk principal reducido de 1333KB a 417KB

### 📦 Paquetes Utilizados

#### Producción
- `@xenova/transformers`: Modelos de IA ejecutables en el navegador
- `tesseract.js`: OCR (reconocimiento de texto en imágenes)
- `recharts`: Biblioteca de gráficos interactivos para React
- `@mui/material`: Componentes UI de Material Design
- `react-i18next`: Internacionalización
- `sql.js`: Base de datos SQLite en el navegador
- `lucide-react`: Iconos
- `xlsx`: Exportación a Excel
- `sass`: Preprocesador CSS para SCSS modules

---

*Última actualización: 2025-12-03*
