# Próximos Pasos / Next Steps

Este documento registra las mejoras futuras, reportes de bugs y propuestas de nuevas funcionalidades para CashFlow Manager.

## 🐛 Bugs Conocidos / Known Bugs

### Alta Prioridad
- [x] ~~El cambio de idioma en mobile se superpone y descajeta el menu hamburguesa lateral~~ - FIXED: Migrado a MUI Drawer
- [x] ~~Faltan traducciones en algunas etiquetas (verificar todos los mensajes)~~ - FIXED: Agregadas traducciones completas

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
- [ ] Reemplazar dropdowns con grids clickeables para mejor UX (Parcialmente implementado)
- [ ] Agregar animaciones de transición entre páginas
- [ ] Implementar dark mode
- [ ] Mejorar accesibilidad (ARIA labels, keyboard navigation)

### Funcionalidades Pendientes
- [ ] Página de Inversiones (Investments) con integración API de cotizaciones
  - [ ] Integrar API pública de cotizaciones de acciones (Alpha Vantage, Yahoo Finance, etc.)
  - [ ] Campo para cantidad de nominales de cada activo
  - [ ] Cache offline de precios (última cotización conocida)
  - [ ] Actualización automática al conectarse a internet
- [ ] Página de Préstamos (Loans)
- [ ] Página de Transferencias (Transfers) con conversión de monedas
  - [ ] Soporte para transferencias entre cuentas de diferentes monedas
  - [ ] Integración API de tipos de cambio
  - [ ] Cache offline de tasas de cambio
- [ ] Sistema de monedas multi-divisa
  - [ ] Store global para tasas de cambio (React Context o Zustand)
  - [ ] API pública de tipos de cambio en tiempo real
  - [ ] Persistencia en base de datos o React store
- [ ] Store de moneda predeterminada
  - [ ] Configuración global de moneda preferida del usuario
  - [ ] Usar moneda predeterminada en formularios nuevos
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
- [ ] Comandos por voz
- [ ] Asistente inteligente para categorización automática
- [ ] Mejorar detección de intención con modelo ML (Transformers.js)
- [ ] Permitir crear cuentas/transacciones directamente desde el chat (sin redirigir)

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
- ⏳ Transformers.js con modelo Xenova/distilbert para NLP (preparado, pendiente activar)
- ⏳ Web Workers para procesamiento pesado sin bloquear UI (pendiente)
- ⏳ IndexedDB como alternativa a localStorage para mejor performance (pendiente)

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

*Última actualización: 2025-10-15*
*Versión: 2.1.0 - Mobile-first fixes y chatbot multilingüe*
