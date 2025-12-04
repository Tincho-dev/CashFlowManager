# Próximos Pasos / Next Steps

Este documento registra las mejoras futuras pendientes de implementar para CashFlow Manager.

> **Nota**: Las funcionalidades completadas están documentadas en [CHANGELOG.md](./CHANGELOG.md)

## 🎯 Foco Principal del Proyecto

La aplicación tiene como enfoque principal:
- **Formato TOON**: Transaction Output Oriented Notation para parseo de datos financieros con IA
- **Mobile-First**: Diseño y desarrollo orientado a dispositivos móviles
- **Offline-First**: Funciona sin conexión con SQLite en el navegador
- **Chatbot con IA**: Registro de transacciones por lenguaje natural e importación de datos

---

## 🤖 Inteligencia Artificial y TOON (Alta Prioridad)

### Backend con IA Potente
- [ ] Implementar backend con modelo de IA más potente (GPT-4, Claude, etc.)
  - [ ] API REST para procesamiento de texto con LLM
  - [ ] Mantener fallback al cliente (Transformers.js) cuando esté offline
  - [ ] Sincronización de resultados entre cliente y servidor
  - [ ] Rate limiting y autenticación para el endpoint de IA

### Mejoras del Chatbot
- [ ] Comandos por voz (Web Speech API)
- [ ] Asistente inteligente para categorización automática con LLM
- [ ] Aprendizaje de correcciones del usuario (feedback loop)

---

## 📲 Mobile-First y UX (Alta Prioridad)

### Interfaz de Usuario
- [ ] Reemplazar dropdowns con grids clickeables para mejor UX táctil
- [ ] Agregar animaciones de transición entre páginas
- [ ] Gestos de swipe para navegación y acciones rápidas

### Sistema de Ayuda
- [ ] Tutorial interactivo para nuevos usuarios
- [ ] Sistema de onboarding paso a paso

---

## 💱 Sistema Financiero (Media Prioridad)

### Inversiones
- [ ] Integrar API pública de cotizaciones de acciones (Alpha Vantage, Yahoo Finance)
- [ ] Cache offline de precios (última cotización conocida)
- [ ] Actualización automática al conectarse a internet

### Transferencias y Multi-divisa
- [ ] Página de Transferencias con conversión de monedas
- [ ] Store global para tasas de cambio (Zustand o Context)
- [ ] Integración API de tipos de cambio en tiempo real
- [ ] Cache offline de tasas de cambio

### Datos y Backup
- [ ] Exportación a PDF de reportes
- [ ] Backup y restore de base de datos
- [ ] Sincronización con hojas de cálculo en la nube
  - [ ] Integración con SharePoint
  - [ ] Integración con Google Sheets
  - [ ] Sincronización offline-first con cola de cambios

---

## 🔒 Seguridad y Privacidad (Media Prioridad)

- [ ] Encriptación de datos sensibles en localStorage
- [ ] Opción de password para acceder a la app
- [ ] Autenticación biométrica en mobile (Face ID, fingerprint)
- [ ] Export encriptado de datos

---

## 📊 Reportes y Métricas (Baja Prioridad)

- [ ] Alertas y notificaciones personalizables
- [ ] Historial de cambios por entidad (audit trail detallado)
- [ ] Metas de ahorro y tracking de progreso

---

## 🌍 Internacionalización (Baja Prioridad)

- [ ] Agregar más idiomas (Portugués, Francés, etc.)
- [ ] Soporte para más monedas
- [ ] Formato de fechas según región
- [ ] Formato de números según región

---

## 🛠️ Técnico (Baja Prioridad)

### Performance
- [ ] Web Workers para procesamiento pesado sin bloquear UI
- [ ] IndexedDB como alternativa a localStorage para mejor performance
- [ ] Implementar React Query / TanStack Query para manejo de estado server

### Testing y Documentación
- [ ] E2E testing con Playwright
- [ ] Storybook para documentar componentes

### Integraciones Futuras
- [ ] Integración con APIs bancarias (Open Banking)
- [ ] Compartir cuentas con otros usuarios

---

## 🏗️ Arquitectura para Backend con IA

La aplicación está preparada para integrar un backend con IA más potente:

```
Cliente (Mobile/Web)
    ↓
Transformers.js (Offline IA) ←→ Backend API (Online IA potente)
    ↓
DataAccessLayer
    ↓
SQLite (Local) ←→ SQL Server (Servidor)
```

**Archivos clave para la integración:**
- `src/services/LLMService.ts` - Providers para ChatGPT, Ollama, Gemini
- `src/services/ToonParserService.ts` - Parser de formato TOON
- `src/config/appConfig.ts` - Configuración de providers
- `src/data/DataAccessLayer.ts` - Abstracción para migración a backend

**Para implementar backend con IA:**
1. Crear API REST (Node.js, Python FastAPI, etc.)
2. Endpoint `/api/parse` que reciba texto y devuelva formato TOON
3. Modificar `LLMService.ts` para usar el endpoint cuando esté online
4. Mantener `Transformers.js` como fallback offline
5. Implementar cola de sincronización para operaciones offline

---

## ⚠️ Guía de Estilos para PRs

**TODOS LOS ESTILOS DEBEN IR COMO SCSS MODULES**
- ✅ Crear archivos `.module.scss` e importarlos como `import styles from './Component.module.scss'`
- ❌ No usar estilos inline en archivos `.tsx` con `style={{...}}`
- ❌ No usar CSS global (excepto `index.css` y `App.css`)

---

*Última actualización: 2025-12-03*
