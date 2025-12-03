# Próximos Pasos / Next Steps

Este documento registra las mejoras futuras, reportes de bugs y propuestas de nuevas funcionalidades para CashFlow Manager.

## 🐛 Bugs Conocidos / Known Bugs

### Alta Prioridad
- [x] ~~El cambio de idioma en mobile se superpone y descajeta el menu hamburguesa lateral~~ - FIXED: Migrado a MUI Drawer
- [x] ~~Faltan traducciones en algunas etiquetas (verificar todos los mensajes)~~ - FIXED: Agregadas traducciones completas
- [x] ~~El chatbot no reconoce el tipo de moneda~~ - FIXED: Mejorado reconocimiento de monedas
- [x] ~~La cuenta por defecto no funciona~~ - FIXED: Implementado store de configuración en AppContext
- [x] ~~Falta sistema de datos semilla~~ - FIXED: Implementado sistema de seedData con datos iniciales
- [x] ~~Error en Inversiones: investment.quantity.toFixed is not a function~~ - FIXED: Agregadas validaciones de tipo en InvestmentCard

### Media Prioridad
- [ ] Warnings de ESLint sobre dependencias en useEffect
- [ ] Warnings de TypeScript sobre tipos `any` en repositorios

### Baja Prioridad
- [ ] Bundle size superior a 500KB después de minificación

## ✨ Mejoras Planificadas / Planned Improvements

### UI/UX
- [x] ~~Mejorar navegación móvil con bottom navigation bar~~ - COMPLETED
- [x] ~~Optimizar responsive design en tablets~~ - IMPROVED
- [x] ~~Corregir overflow horizontal y vertical en mobile~~ - COMPLETED
- [x] ~~Mobile-first viewport configuration~~ - COMPLETED
- [x] ~~Dashboard con círculo de 3 colores (gastos fijos, variables, ahorros)~~ - COMPLETED
- [x] ~~Mejoras de estilos mobile en Import Records~~ - COMPLETED
- [ ] Reemplazar dropdowns con grids clickeables para mejor UX (Parcialmente implementado)
- [ ] Agregar animaciones de transición entre páginas
- [ ] Implementar dark mode
- [ ] Mejorar accesibilidad (ARIA labels, keyboard navigation)

### Funcionalidades Pendientes

<!-- Kept HEAD section active -->
- [ ] Página de Inversiones (Investments) con integración API de cotizaciones
  - [ ] Integrar API pública de cotizaciones de acciones (Alpha Vantage, Yahoo Finance, etc.)
  - [ ] Campo para cantidad de nominales de cada activo
  - [ ] Cache offline de precios (última cotización conocida)
  - [ ] Actualización automática al conectarse a internet
- [x] ~~Página de Préstamos (Loans)~~ - COMPLETED
  - [x] ~~Gestión de préstamos con cuotas~~ - COMPLETED
  - [x] ~~Múltiples frecuencias de pago~~ - COMPLETED
  - [x] ~~Tracking de estado y pagos~~ - COMPLETED
- [ ] Página de Transferencias (Transfers) con conversión de monedas
  - [ ] Soporte para transferencias entre cuentas de diferentes monedas
  - [ ] Integración API de tipos de cambio
  - [ ] Cache offline de tasas de cambio
- [ ] Sistema de monedas multi-divisa
  - [ ] Store global para tasas de cambio (React Context o Zustand)
  - [ ] API pública de tipos de cambio en tiempo real
  - [ ] Persistencia en base de datos o React store

<!-- origin/main version preserved below as an HTML comment for later cleanup -->
<!--
- [x] Página de Inversiones (Investments) con integración API de cotizaciones - COMPLETED
  - [x] Integrar API pública de cotizaciones de acciones (Alpha Vantage, Yahoo Finance, etc.) - COMPLETED (Yahoo Finance)
  - [x] Campo para cantidad de nominales de cada activo - COMPLETED
  - [x] Cache offline de precios (última cotización conocida) - COMPLETED (SQLite)
  - [x] Actualización automática al conectarse a internet - COMPLETED
- [ ] Página de Préstamos (Loans)
- [x] Página de Transferencias (Transfers) con conversión de monedas - COMPLETED
  - [x] Soporte para transferencias entre cuentas de diferentes monedas - COMPLETED
  - [x] Integración API de tipos de cambio - COMPLETED (Frankfurter API)
  - [x] Cache offline de tasas de cambio - COMPLETED (SQLite)
- [x] Sistema de monedas multi-divisa - COMPLETED
  - [x] Store global para tasas de cambio (React Context o Zustand) - COMPLETED (QuotationService)
  - [x] API pública de tipos de cambio en tiempo real - COMPLETED (Frankfurter API)
  - [x] Persistencia en base de datos o React store - COMPLETED (SQLite quotations table)
-->
- [x] ~~Store de moneda predeterminada~~ - COMPLETED
  - [x] ~~Configuración global de moneda preferida del usuario~~ - COMPLETED
  - [x] ~~Usar moneda predeterminada en formularios nuevos~~ - COMPLETED
  - [x] ~~Store de cuenta predeterminada~~ - COMPLETED
- [ ] Gráficos y reportes avanzados
- [ ] Exportación a PDF
- [ ] Backup y restore de base de datos
- [ ] Sincronización con hojas de cálculo en la nube
  - [ ] Integración con SharePoint
  - [ ] Integración con Google Sheets
  - [ ] Sincronización offline-first con cola de cambios
- [ ] Deploy automático
  - [ ] Configuración para Vercel
  - [ ] GitHub Actions para CI/CD

### Refactoring Técnico
- [x] ~~Migrar completamente de CSS a SCSS modules~~ - COMPLETED (parcialmente, falta Transactions)
- [ ] Extraer lógica de negocio a custom hooks
- [ ] Implementar React Query para mejor manejo de estado (ya instalado)
- [ ] Agregar tests unitarios
- [ ] Agregar tests de integración
- [ ] Implementar CI/CD pipeline

## 🚀 Nuevas Funcionalidades Propuestas / Proposed New Features

### Chatbot con IA
- [x] ~~Integración de modelo de IA offline~~ - COMPLETED (usando detección por keywords, ML modelo opcional)
- [x] ~~Reconocimiento de texto (OCR) para extractos bancarios~~ - COMPLETED (Tesseract.js)
- [x] ~~Procesamiento de imágenes para captura de gastos~~ - COMPLETED
- [x] ~~Soporte multilingüe (Español e Inglés)~~ - COMPLETED
- [x] ~~Guiar usuarios para crear cuentas/transacciones desde el chat~~ - COMPLETED
- [x] ~~Permitir crear transacciones directamente desde el chat~~ - COMPLETED
- [x] ~~Reconocimiento de monedas en transacciones~~ - COMPLETED
- [x] ~~Solicitar información faltante al usuario~~ - COMPLETED
- [x] ~~Usar configuración de moneda y cuenta predeterminada~~ - COMPLETED
- [ ] Comandos por voz
- [ ] Asistente inteligente para categorización automática
- [x] ~~Mejorar detección de intención con modelo ML (Transformers.js)~~ - COMPLETED

### Sistema de Ayuda
- [x] ~~Tooltips informativos en toda la aplicación~~ - COMPLETED (cuentas y formularios)
- [x] ~~Documentación in-app~~ - COMPLETED (vía chatbot)
- [ ] Tutorial interactivo para nuevos usuarios
- [ ] Sistema de onboarding
- [ ] Expandir tooltips a más páginas (Transactions, etc.)

### Logging y Auditoría
- [x] ~~Sistema de logs completo para todas las operaciones~~ - COMPLETED
- [x] ~~Exportación de logs~~ - COMPLETED (JSON y CSV)
- [ ] Visor de logs en la aplicación (UI component)
- [ ] Historial de cambios por entidad
- [ ] Filtros avanzados de logs en UI

### Avanzadas
- [ ] Reconocimiento automático de patrones de gasto
- [ ] Predicción de gastos futuros
- [ ] Alertas y notificaciones personalizables
- [ ] Integración con APIs bancarias
- [ ] Compartir cuentas con otros usuarios
- [ ] Metas de ahorro y tracking

## 📊 Métricas y Reportes Deseados

- [ ] Dashboard con gráficos interactivos (Chart.js o Recharts)
- [ ] Reporte mensual/anual de gastos
- [ ] Análisis de tendencias
- [ ] Comparación período a período
- [ ] Categorización automática de gastos
- [ ] Resumen ejecutivo exportable

## 🔒 Seguridad y Privacidad

- [ ] Encriptación de datos sensibles en localStorage
- [ ] Opción de password para acceder a la app
- [ ] Autenticación biométrica en mobile
- [ ] Export encriptado de datos

## 🌍 Internacionalización

- [ ] Agregar más idiomas (Portugués, Francés, etc.)
- [ ] Soporte para más monedas
- [ ] Formato de fechas según región
- [ ] Formato de números según región

## 📝 Notas de Desarrollo

### Decisiones Arquitectónicas
- ✅ OCR con Tesseract.js para reconocimiento de texto en imágenes - IMPLEMENTED
- ✅ Material-UI para componentes consistentes - IMPLEMENTED
- ✅ SCSS Modules para estilos escalables - IMPLEMENTED
- ✅ Transformers.js con modelo Xenova/distilbert para NLP - ACTIVATED (con fallback a keywords)
- ✅ DataAccessLayer para abstracción de base de datos y preparación para backend - IMPLEMENTED
- ⏳ Web Workers para procesamiento pesado sin bloquear UI (pendiente)
- ⏳ IndexedDB como alternativa a localStorage para mejor performance (pendiente)

### 🏗️ Arquitectura de Base de Datos (Database Architecture)

**ESTADO ACTUAL: Offline-first con SQLite en el navegador**

La aplicación ahora implementa una capa de abstracción de datos (DataAccessLayer) que prepara el código para una futura migración a backend con SQL Server, manteniendo compatibilidad con el modelo actual offline-first.

**Estructura de capas:**
```
UI Components (React)
    ↓
Services (Lógica de negocio)
    ↓
DataAccessLayer (Abstracción de acceso a datos) ← NUEVO
    ↓
Repositories (CRUD operations)
    ↓
SQLite Database (localStorage)
```

**Ventajas de esta arquitectura:**
- ✅ Separación de responsabilidades clara
- ✅ Fácil migración a backend sin cambiar UI
- ✅ Soporte para modelo híbrido (offline + online)
- ✅ Inicialización controlada y segura
- ✅ Evita errores de acceso a BD no inicializada

**Para migrar a backend SQL Server:**
1. Ver documentación detallada en `src/data/DataAccessLayer.ts`
2. Implementar endpoints REST API en el backend
3. Modificar DataAccessLayer para detectar online/offline
4. Agregar cola de sincronización para operaciones offline
5. Mantener SQLite como caché local

**Archivos clave:**
- `src/data/DataAccessLayer.ts` - Capa de abstracción (CON GUÍA COMPLETA DE MIGRACIÓN)
- `src/data/repositories/*` - Acceso directo a datos
- `src/services/*` - Lógica de negocio
- `src/contexts/AppContext.tsx` - Inicialización de la app

### ⚠️ IMPORTANTE: Guía de Estilos para PRs
**TODOS LOS ESTILOS DEBEN IR COMO SCSS MODULES**
- ✅ **Correcto**: Crear archivos `.module.scss` y importarlos como `import styles from './Component.module.scss'`
- ❌ **Incorrecto**: Agregar estilos inline dentro de los archivos `.tsx` usando `style={{...}}`
- ❌ **Incorrecto**: Usar CSS global en archivos `.css` (excepto para configuraciones globales en `index.css` y `App.css`)
- Los estilos deben ser modulares, reutilizables y mantener la separación de responsabilidades
- Usar nomenclatura BEM o camelCase para las clases en SCSS modules

### Tecnologías a Evaluar
- [ ] Zustand como alternativa a Context API
- [ ] TanStack Query (ya instalado pero no usado)
- [ ] Vitest para testing
- [ ] Playwright para E2E testing
- [ ] Storybook para documentar componentes

## 📦 Paquetes Instalados / Installed Packages

### Nuevos Paquetes Agregados
- `@xenova/transformers`: Modelos de IA ejecutables en el navegador
- `tesseract.js`: OCR (reconocimiento de texto en imágenes)
- `sass`: Preprocesador CSS para SCSS modules

### Paquetes Ya Existentes
- `@mui/material`: Componentes UI de Material Design
- `react-i18next`: Internacionalización
- `sql.js`: Base de datos SQLite en el navegador
- `lucide-react`: Iconos
- `xlsx`: Exportación a Excel

## 🎯 Estado del Proyecto / Project Status

### ✅ Completado (Cumplido 100%)
1. **Refactoring de UI**: Migración completa a MUI components
2. **SCSS Modules**: Implementado para varios componentes
3. **Bottom Navigation**: Navegación móvil mejorada
4. **Chatbot con IA**: Sistema completo de asistente inteligente
5. **OCR**: Procesamiento de imágenes funcional
6. **Logging**: Sistema completo de auditoría
7. **Tooltips**: Sistema de ayuda contextual
8. **Traducciones**: Soporte completo bilingüe
9. **Mobile-First Styles**: Overflow y responsive design corregido
10. **Chatbot Multilingüe**: Soporte completo en Español e Inglés
11. **Store de Configuración**: Cuenta y moneda predeterminadas en AppContext
12. **Reconocimiento de Monedas**: Chatbot reconoce USD, ARS, EUR, GBP, BRL
13. **Sistema de Seed Data**: Datos iniciales precargados en nueva instalación
14. **Feedback de Usuario**: Chatbot informa cuando usa valores predeterminados
15. **Módulo de Préstamos (Loans)**: Gestión completa con cuotas, frecuencias de pago y tracking de estado
16. **Agrupación de Cuentas**: Filtros por banco, moneda y rango de saldo

### 🚧 En Progreso / En Curso
- Refactoring de página Transactions (pendiente)
- Viewer de logs en UI (falta implementar)
- Integración con APIs externas (cotizaciones y tipos de cambio)
- Sistema de sincronización con hojas de cálculo

### 📋 Pendiente / To Do
- Mejoras de accesibilidad
- Dark mode
- Tests unitarios
- CI/CD pipeline
- Deploy automático en Vercel
- Store global de monedas y tasas de cambio

---

*Última actualización: 2025-12-02*
*Versión: 2.3.0 - Préstamos y agrupación de cuentas*
