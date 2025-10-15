# Próximos Pasos / Next Steps

Este documento registra las mejoras futuras, reportes de bugs y propuestas de nuevas funcionalidades para CashFlow Manager.

## 🐛 Bugs Conocidos / Known Bugs

### Alta Prioridad
- [ ] El cambio de idioma en mobile se superpone y descajeta el menu hamburguesa lateral
- [ ] Faltan traducciones en algunas etiquetas (verificar todos los mensajes)

### Media Prioridad
- [ ] Warnings de ESLint sobre dependencias en useEffect
- [ ] Warnings de TypeScript sobre tipos `any` en repositorios

### Baja Prioridad
- [ ] Bundle size superior a 500KB después de minificación

## ✨ Mejoras Planificadas / Planned Improvements

### UI/UX
- [ ] Mejorar navegación móvil con bottom navigation bar
- [ ] Reemplazar dropdowns con grids clickeables para mejor UX
- [ ] Optimizar responsive design en tablets
- [ ] Agregar animaciones de transición entre páginas
- [ ] Implementar dark mode
- [ ] Mejorar accesibilidad (ARIA labels, keyboard navigation)

### Funcionalidades Pendientes
- [ ] Página de Inversiones (Investments)
- [ ] Página de Préstamos (Loans)
- [ ] Página de Transferencias (Transfers)
- [ ] Gráficos y reportes avanzados
- [ ] Exportación a PDF
- [ ] Backup y restore de base de datos
- [ ] Sincronización entre dispositivos

### Refactoring Técnico
- [ ] Migrar completamente de CSS a SCSS modules
- [ ] Extraer lógica de negocio a custom hooks
- [ ] Implementar React Query para mejor manejo de estado
- [ ] Agregar tests unitarios
- [ ] Agregar tests de integración
- [ ] Implementar CI/CD pipeline

## 🚀 Nuevas Funcionalidades Propuestas / Proposed New Features

### Chatbot con IA
- [ ] Integración de modelo de IA offline (Transformers.js)
- [ ] Reconocimiento de texto (OCR) para extractos bancarios
- [ ] Procesamiento de imágenes para captura de gastos
- [ ] Comandos por voz
- [ ] Asistente inteligente para categorización automática

### Sistema de Ayuda
- [ ] Tooltips informativos en toda la aplicación
- [ ] Tutorial interactivo para nuevos usuarios
- [ ] Documentación in-app
- [ ] Sistema de onboarding

### Logging y Auditoría
- [ ] Sistema de logs completo para todas las operaciones
- [ ] Visor de logs en la aplicación
- [ ] Exportación de logs
- [ ] Historial de cambios por entidad

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
- Usar Transformers.js con modelo Xenova/distilbert para NLP
- OCR con Tesseract.js para reconocimiento de texto en imágenes
- Web Workers para procesamiento pesado sin bloquear UI
- IndexedDB como alternativa a localStorage para mejor performance

### Tecnologías a Evaluar
- [ ] Zustand como alternativa a Context API
- [ ] TanStack Query (ya instalado pero no usado)
- [ ] Vitest para testing
- [ ] Playwright para E2E testing
- [ ] Storybook para documentar componentes

---

*Última actualización: 2025-10-15*
