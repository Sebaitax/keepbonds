import React, { useState, useEffect, useMemo, useRef, useContext, createContext } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Contacts } from '@capacitor-community/contacts';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';

/* ---------------- Internacionalización ---------------- */

// Español "neutro" (sin variante de país) e inglés "neutro": evita que
// toLocaleDateString/plurales se sientan atados a un país específico
// (Chile, España, EE.UU., etc.) cuando el dispositivo usa esa variante.
const LOCALE_BY_LANG = { es: 'es', en: 'en' };

const MONTHS_BY_LANG = {
  es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

function detectSystemLang(){
  try{
    const raw = (navigator.language || (navigator.languages && navigator.languages[0]) || 'es').toLowerCase();
    return raw.startsWith('es') ? 'es' : 'en';
  }catch(e){
    return 'es';
  }
}

const STRINGS = {
  es: {
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.change': 'Cambiar',
    'common.retry': 'Reintentar',
    'common.optional': 'opcional',
    'common.noResults': 'Sin resultados.',
    'common.you': 'Tú',
    'photoPrompt.header': 'Foto de perfil',
    'photoPrompt.gallery': 'Elegir de galería',
    'photoPrompt.camera': 'Tomar foto',
    'photoPrompt.cancel': 'Cancelar',

    'role.all': 'Todos',
    'role.Familia': 'Familia',
    'role.Amigos': 'Amigos',
    'role.Conocidos': 'Conocidos',
    'role.addOther': '+ Otro',
    'role.addPlaceholder': 'Ej: Compañeros de trabajo',
    'role.add': 'Añadir',

    'priority.Alta': 'Alta',
    'priority.Media': 'Media',
    'priority.Baja': 'Baja',
    'priority.label': (label) => `Prioridad ${label}`,

    'freq.Semanal': 'Semanal',
    'freq.Quincenal': 'Quincenal',
    'freq.Mensual': 'Mensual',
    'freq.Trimestral': 'Trimestral',

    'sort.name': 'Nombre',
    'sort.overdue': 'Más atrasados',
    'sort.birthday': 'Próx. cumpleaños',

    'dateMode.cyclic.label': 'Cíclica',
    'dateMode.cyclic.hint': 'Se repite cada año en la misma fecha, sin un año de referencia (ej: Día del padre, cumpleaños de una mascota).',
    'dateMode.yearly.label': 'Con año',
    'dateMode.yearly.hint': 'Tiene un año de referencia y cuenta cuántos han pasado (ej: aniversario de matrimonio).',

    'status.postponed': 'Pospuesto',
    'status.recent': 'Reciente',
    'status.warn': 'Un tiempo sin hablar',
    'status.alert': 'Hace mucho no hablan',

    'date.day': 'Día',
    'date.month': 'Mes',
    'date.year': 'Año',
    'date.clear': 'Quitar fecha',

    'crop.title': 'Ajusta la foto',
    'crop.hint': 'Arrastra para mover, usa el control para acercar.',
    'crop.use': 'Usar foto',

    'dates.namePlaceholder': 'Nombre de la fecha (ej: Aniversario, Día del padre...)',
    'dates.add': '+ Añadir fecha',
    'dates.today': 'hoy',
    'dates.inDays': (n) => `en ${n} día${n===1?'':'s'}`,
    'dates.years': (n) => `${n} año${n===1?'':'s'}`,

    'home.greeting': (name) => `Hola, ${name}`,
    'home.overdueTitle': (n) => `Te toca hablar con ${n} ${n===1?'persona':'personas'}`,
    'home.emptyTitle': 'Aún no tienes a nadie aquí',
    'home.emptyBody': 'Toca "Añadir" abajo para sumar a la primera persona de tu círculo.',
    'home.searchPlaceholder': 'Buscar por nombre...',
    'home.upcomingDates': 'Fechas próximas',
    'home.today': 'Hoy',
    'home.isToday': '¡Es hoy!',
    'home.days': (n) => `día${n===1?'':'s'}`,
    'home.turns': (age) => `Cumple ${age} años`,
    'home.prepared': '✓ Preparado',
    'home.prepareMe': 'Prepararme',
    'home.yourPeople': (n) => `Tu gente (${n})`,
    'home.noFilterResults': 'No hay personas en este filtro todavía.',
    'home.sinceLabel': 'sin hablar',
    'home.prepModalTitle': (name) => `Preparar el cumpleaños de ${name}`,
    'home.prepModalBody': 'Anota si lo celebra otro día, el plan que tienen, o cualquier detalle que quieras recordar.',
    'home.prepModalPlaceholder': 'Ej: este año lo celebra el sábado 6, no el día exacto...',
    'home.saveNote': 'Guardar nota',

    'notif.title': 'Notificaciones',
    'notif.subtitle': 'A quién te toca hablar y qué avisos vienen.',
    'notif.disabledWarning': 'Las notificaciones están desactivadas, así que estos avisos no van a llegar. Actívalas en Ajustes del sistema > Apps > KeepBonds > Notificaciones.',
    'notif.enable': 'Activar notificaciones',
    'notif.enableHint': 'Toca para permitir que la app te avise.',

    'detail.title': 'Detalle de contacto',
    'detail.message': 'Mensaje',
    'detail.whatsappGreeting': (name) => `Hola ${name}! ¿Cómo estás?`,
    'detail.addPhone': '+ Añadir teléfono para poder llamar o escribir',
    'detail.turns': (age) => `Cumple ${age} años`,
    'detail.daysSince': 'días sin hablar',
    'detail.legendRecent': 'Reciente',
    'detail.legendModerate': 'Moderado',
    'detail.legendMuchTime': 'Mucho tiempo',
    'detail.postponedTitle': 'Pospuesto',
    'detail.postponedBody': (name, date) => `No te vamos a marcar a ${name} como atrasada hasta el ${date}.`,
    'detail.cancelPostpone': 'Cancelar posponer',
    'detail.postponeTitle': 'Posponer',
    'detail.postponeBody': (name) => `Si no es buen momento para contactar a ${name}, deja de avisarte por un tiempo.`,
    'detail.oneWeek': '1 semana',
    'detail.twoWeeks': '2 semanas',
    'detail.oneMonth': '1 mes',
    'detail.importantDatesTitle': 'Fechas importantes',
    'detail.importantDatesBody': (name) => `Aniversarios u otras fechas que quieras recordar para ${name}.`,
    'detail.birthdayAlertTitle': 'Alerta de cumpleaños',
    'detail.birthdayAlertBody': (name) => `Avisarme antes del cumpleaños de ${name}`,
    'detail.daysLeft': (n) => ` · faltan ${n} día${n===1?'':'s'}`,
    'detail.birthdayNoteLabel': 'Nota para este cumpleaños',
    'detail.birthdayNotePlaceholder': 'Ej: lo celebra el sábado 6, no el día exacto...',
    'detail.notifTitle': 'Notificaciones',
    'detail.notifSubtitle': 'Avisos de este contacto',
    'detail.historyTitle': 'Historial de contacto',
    'detail.historyAgo': (n) => `hace ${n} ${n===1?'día':'días'}`,
    'detail.seeLess': 'Ver menos',
    'detail.seeAll': (n) => `Ver todo el historial (${n})`,
    'detail.notesTitle': 'Notas',
    'detail.notesSubtitle': 'Todo lo que quieras recordar de esta persona',
    'detail.notesPlaceholder': 'Sin notas todavía. Anota qué le gusta, cómo está, temas pendientes...',
    'detail.markToday': 'Marcar como hablado hoy',

    'add.title': 'Añadir persona',
    'add.addPhotoOptional': 'Añadir foto (opcional)',
    'add.back': 'Volver',
    'add.next': 'Siguiente',
    'add.skip': 'Omitir',
    'add.skipAndSave': 'Omitir y guardar',
    'add.saveAs': (n) => `Guardar a ${n}`,
    'add.q.thisPerson': 'esta persona',
    'add.q.source': '¿Cómo quieres añadir a esta persona?',
    'add.q.sourceHint': 'Te haremos unas preguntas cortas. Puedes omitir las que no sepas.',
    'add.q.sourceManualTitle': 'Escribirlo yo',
    'add.q.sourceManualSub': 'Solo necesitas su nombre',
    'add.q.sourceContactsTitle': 'Desde mis contactos',
    'add.q.sourceContactsSub': 'Traemos su nombre, teléfono y cumpleaños',
    'add.q.pick': '¿A quién quieres añadir?',
    'add.q.name': '¿Cómo se llama?',
    'add.q.nameHint': 'Escribe su nombre como tú le dices. La foto es opcional.',
    'add.q.nameHintContacts': 'Lo trajimos de tus contactos. Puedes cambiarlo y agregar una foto.',
    'add.q.role': (n) => `¿Qué es ${n} para ti?`,
    'add.q.birthday': (n) => `¿Cuándo está de cumpleaños ${n}?`,
    'add.q.birthdayHint': 'Te avisaremos unos días antes para que no se te pase.',
    'add.q.birthdayFound': 'Lo encontramos en tus contactos. Revísalo.',
    'add.q.priority': (n) => `¿Qué tan importante es no perder el contacto con ${n}?`,
    'add.q.prio.Alta': 'Mucho, no me dejes olvidarlo',
    'add.q.prio.Media': 'Normal',
    'add.q.prio.Baja': 'Sin presión',
    'add.q.prioHint.Alta': 'El aviso queda fijo en tu teléfono hasta que le hables.',
    'add.q.prioHint.Media': 'Un aviso cuando se cumpla el tiempo.',
    'add.q.prioHint.Baja': 'Te avisamos con más calma.',
    'add.q.freq': (n) => `¿Cada cuánto te gustaría hablar con ${n}?`,
    'add.q.freqLabel.Semanal': 'Cada semana',
    'add.q.freqLabel.Quincenal': 'Cada 2 semanas',
    'add.q.freqLabel.Mensual': 'Una vez al mes',
    'add.q.freqLabel.Trimestral': 'Cada 3 meses',
    'add.q.dates': (n) => `¿Hay otra fecha importante de ${n}?`,
    'add.q.datesHint': 'Un aniversario, el día que se conocieron, un santo...',
    'add.q.notes': (n) => `¿Algo que quieras recordar de ${n}?`,
    'add.q.notesHint': 'Qué le gusta, en qué anda, de qué hablar la próxima vez.',
    'add.heading': 'Sumar a tu círculo',
    'add.manual': 'Manual',
    'add.fromContacts': 'Desde contactos',
    'add.addPhoto': 'Añadir foto',
    'add.changePhoto': 'Cambiar foto',
    'add.removePhoto': 'Quitar',
    'add.nameLabel': 'Nombre',
    'add.namePlaceholder': 'Ej: María José Fuentes',
    'add.phoneLabel': (opt) => `Teléfono (${opt})`,
    'add.phonePlaceholder': 'Ej: +56 9 1234 5678',
    'add.chooseFromContacts': 'Elige de tus contactos',
    'add.loadingContacts': 'Cargando tus contactos...',
    'add.searchPlaceholder': 'Buscar...',
    'add.showingOf': (shown, total) => `Mostrando ${shown} de ${total}. Escribe para buscar el resto.`,
    'add.noPhone': 'Sin teléfono',
    'add.noDeviceContacts': 'No se encontraron contactos en tu teléfono.',
    'add.roleLabel': 'Rol',
    'add.birthdayLabel': (opt) => `Cumpleaños (${opt})`,
    'add.priorityLabel': 'Prioridad',
    'add.freqLabel': 'Frecuencia deseada de recordatorio',
    'add.importantDatesLabel': (opt) => `Fechas importantes (${opt})`,
    'add.notesLabel': 'Notas · qué le gusta o de qué hablar',
    'add.notesPlaceholder': 'Ej: le encanta el senderismo, anda buscando departamento, le gustan los vinilos de jazz...',
    'add.errorSelectContact': 'Selecciona un contacto de la lista.',
    'add.errorName': 'Ingresa un nombre para guardar el contacto.',
    'add.errorFutureBirthday': 'La fecha de cumpleaños no puede ser en el futuro.',
    'add.errorYear': 'Revisa el año de nacimiento, parece incorrecto.',
    'add.contactsError': (detail) => `No se pudo acceder a tus contactos${detail?`: ${detail}`:'.'} Si ya diste el permiso y sigue fallando, revísalo en Ajustes del sistema > Apps > KeepBonds > Permisos > Contactos.`,

    'edit.title': 'Editar persona',
    'edit.errorName': 'Ingresa un nombre para guardar los cambios.',
    'edit.deleteConfirm': 'Toca de nuevo para eliminar a esta persona',
    'edit.delete': 'Eliminar contacto',

    'settings.title': 'Ajustes',
    'settings.profile': 'Perfil',
    'settings.yourName': 'Tu nombre',
    'settings.greetingHint': 'Así te saluda la pantalla de Inicio.',
    'settings.permissions': 'Permisos',
    'settings.notifPermTitle': 'Notificaciones',
    'settings.notifPermBody': 'Avisos de cumpleaños y de contacto',
    'settings.activated': 'Activado',
    'settings.activate': 'Activar',
    'settings.contactsPermTitle': 'Contactos',
    'settings.contactsPermBody': 'Para añadir personas desde tu agenda',
    'settings.deniedHint': 'Si el botón no hace nada, es porque ya lo rechazaste antes: actívalo desde Ajustes del sistema > Apps > KeepBonds > Permisos.',
    'settings.appearance': 'Apariencia',
    'settings.darkTheme': 'Tema oscuro',
    'settings.darkThemeHint': 'Cambia la apariencia de toda la app',
    'settings.compactView': 'Vista compacta',
    'settings.compactViewHint': 'Lista de personas más densa',
    'settings.language': 'Idioma',
    'settings.languageHint': 'Elige el idioma de la app.',
    'settings.langEs': 'Español',
    'settings.langEn': 'English',
    'settings.defaultReminders': 'Recordatorios por defecto',
    'settings.remindWithLabel': 'Avisarme de cumpleaños con',
    'settings.desiredFreq': 'Frecuencia de contacto deseada',
    'settings.defaultsHint': 'Se usan al añadir una persona nueva; luego puedes ajustarlos por contacto.',
    'settings.data': 'Datos',
    'settings.offlineNote': 'Modo sin conexión: tus datos se guardan solo en este dispositivo, sin servidor ni nube.',
    'settings.backup': 'Respaldo local (exportar / importar)',
    'settings.deleteAllConfirm': 'Toca de nuevo para borrar todo',
    'settings.deleteAll': 'Borrar todos los datos',

    'bulk.assign': 'Asignar',
    'bulk.selected': (n) => `${n} seleccionado${n===1?'':'s'}`,
    'bulk.selectAll': 'Todos',
    'bulk.selectNone': 'Ninguno',
    'bulk.assignTo': (n) => `Asignar a ${n} contacto${n===1?'':'s'}`,
    'bulk.sheetTitle': (n) => `Asignar a ${n} contacto${n===1?'':'s'}`,
    'bulk.sheetBody': 'Elige solo lo que quieras cambiar; lo demás queda igual.',
    'bulk.apply': (n) => `Aplicar a ${n}`,
    'app.bulkAssigned': (n) => `Listo: ${n} contacto${n===1?'':'s'} actualizado${n===1?'':'s'}`,
    'today.subtitle': 'Llama, escribe o toca ✓ cuando ya hablaron.',
    'today.allGood': 'Estás al día con todos. ¡Bien!',
    'today.bdayIn': (age, n) => n===0 ? `¡Cumple ${age} hoy!` : `Cumple ${age} en ${n} día${n===1?'':'s'}`,
    'today.dateIn': (label, n) => n===0 ? `${label} es hoy` : `${label} en ${n} día${n===1?'':'s'}`,
    'notif.scheduledHeading': 'Próximos avisos',
    'today.markTalked': 'Ya hablamos',
    'today.showMore': (n) => `Ver ${n} más`,
    'today.showLess': 'Ver menos',
    'quicklog.daysSince': (n) => `${n}d sin hablar`,
    'quicklog.call': 'Llamar',
    'quicklog.message': 'Mensaje',
    'quicklog.register': 'Registrar',
    'quicklog.endCall': 'Terminar llamada',
    'quicklog.notePlaceholder': '¿De qué hablaron? (opcional)',
    'quicklog.noPhoneToast': (name) => `${name} no tiene teléfono guardado. Agrégalo editando el contacto.`,

    'backup.title': 'Respaldo local',
    'backup.export': 'Exportar',
    'backup.import': 'Importar',
    'backup.exportBody': 'Copia este texto y guárdalo (nota, correo a ti mismo) para poder restaurar tus contactos en otro dispositivo.',
    'backup.copy': 'Copiar al portapapeles',
    'backup.importBody': 'Pega aquí un respaldo exportado antes. Esto reemplazará tus contactos actuales.',
    'backup.importPlaceholder': 'Pega aquí el JSON del respaldo...',
    'backup.importAction': 'Importar y reemplazar',
    'backup.invalid': 'Ese texto no es un respaldo válido de KeepBonds. Revisa que sea el JSON completo copiado antes.',

    'tab.add': 'Añadir',

    'onboarding.welcomeTitle': 'Bienvenido a KeepBonds',
    'onboarding.welcomeBody1': 'Te ayuda a mantener cerca a las personas que quieres, y a estar al tanto de sus momentos importantes.',
    'onboarding.welcomeBody2': 'Avisa los cumpleaños con anticipación y te recuerda cuando llevas mucho tiempo sin hablar con alguien importante para ti.',
    'onboarding.continue': 'Continuar',
    'onboarding.nameTitle': '¿Cómo te llamas?',
    'onboarding.nameBody': 'Así te va a saludar la app cada vez que la abras.',
    'onboarding.namePlaceholder': 'Tu nombre',
    'onboarding.permsTitle': 'Antes de empezar',
    'onboarding.permsBody': 'Actívalos para aprovechar todas las funciones. Puedes cambiarlos después en Ajustes.',
    'onboarding.notifTitle': 'Notificaciones',
    'onboarding.notifBody': 'Para avisarte cumpleaños y recordatorios de contacto.',
    'onboarding.contactsTitle': 'Contactos',
    'onboarding.contactsOptional': '(opcional)',
    'onboarding.contactsBody': 'Solo si quieres agregar personas directamente desde tu agenda.',
    'onboarding.permitted': 'Permitido',
    'onboarding.permit': 'Permitir',
    'onboarding.notifError': 'No se pudo activar las notificaciones. Puedes intentarlo después en Ajustes.',
    'onboarding.contactsError': 'No se pudo activar el acceso a contactos. Puedes intentarlo después en Ajustes.',
    'onboarding.start': 'Empezar a usar KeepBonds',

    'app.exitTitle': '¿Salir de KeepBonds?',
    'app.exitBody': 'Tus datos quedan guardados en este dispositivo.',
    'app.exit': 'Salir',
    'app.defaultName': 'Tú',
    'app.allDeleted': 'Todos los contactos fueron borrados',
    'app.loggedToday': (name) => `Registrado: hablaste con ${name} hoy`,
    'app.callLogged': (name) => `Llamada registrada con ${name}`,
    'app.contactAdded': (name) => `${name} fue añadido a tu círculo`,
    'app.birthdayNoteSaved': (name) => `Nota guardada para ${name}`,
    'app.birthdayNoteDeleted': 'Nota eliminada',
    'app.changesSaved': 'Cambios guardados',
    'app.contactDeleted': (name) => `${name} fue eliminado de tu círculo`,
    'app.undo': 'Deshacer',
    'app.contactRestored': 'Contacto restaurado',
    'app.snoozed': (name, date) => `${name} pospuesto hasta ${date}`,
    'app.snoozeCancelled': 'Se canceló posponer',
    'app.dateAdded': (label) => `"${label}" añadida`,
    'app.dateDeleted': 'Fecha eliminada',
    'app.backupCopied': 'Respaldo copiado al portapapeles',
    'app.backupImported': 'Respaldo importado',

    'notifContent.birthdayTitle': 'Cumpleaños próximo',
    'notifContent.birthdayBody': (name, age, days) => `${name} cumple ${age} años en ${days} día${days===1?'':'s'}.`,
    'notifContent.birthdayPreviewToday': (age) => `¡Hoy cumple ${age} años!`,
    'notifContent.birthdayPreview': (age, days) => `Cumple ${age} años en ${days} día${days===1?'':'s'}.`,
    'notifContent.dateBody': (label, name, days) => `${label} de ${name} en ${days} día${days===1?'':'s'}.`,
    'notifContent.datePreviewToday': (label) => `¡Hoy! ${label}.`,
    'notifContent.datePreview': (label, days) => `${label} en ${days} día${days===1?'':'s'}.`,
    'notifContent.overdueTitle': 'Hace tiempo que no hablan',
    'notifContent.overdueBody': (name) => `Ya va harto tiempo sin hablar con ${name}. ¿Le escribes hoy?`,
    'notifContent.overduePreviewAlready': 'Ya va harto tiempo sin hablar. ¿Le escribes hoy?',
    'notifContent.overduePreview': (days) => `Si no hablan antes, te lo recordamos en ${days} día${days===1?'':'s'}.`,
  },

  en: {
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.change': 'Change',
    'common.retry': 'Retry',
    'common.optional': 'optional',
    'common.noResults': 'No results.',
    'common.you': 'You',
    'photoPrompt.header': 'Profile photo',
    'photoPrompt.gallery': 'Choose from gallery',
    'photoPrompt.camera': 'Take photo',
    'photoPrompt.cancel': 'Cancel',

    'role.all': 'All',
    'role.Familia': 'Family',
    'role.Amigos': 'Friends',
    'role.Conocidos': 'Acquaintances',
    'role.addOther': '+ Other',
    'role.addPlaceholder': 'E.g.: Coworkers',
    'role.add': 'Add',

    'priority.Alta': 'High',
    'priority.Media': 'Medium',
    'priority.Baja': 'Low',
    'priority.label': (label) => `${label} priority`,

    'freq.Semanal': 'Weekly',
    'freq.Quincenal': 'Biweekly',
    'freq.Mensual': 'Monthly',
    'freq.Trimestral': 'Quarterly',

    'sort.name': 'Name',
    'sort.overdue': 'Most overdue',
    'sort.birthday': 'Next birthday',

    'dateMode.cyclic.label': 'Recurring',
    'dateMode.cyclic.hint': 'Repeats every year on the same date, with no reference year (e.g. Father’s Day, a pet’s birthday).',
    'dateMode.yearly.label': 'With year',
    'dateMode.yearly.hint': 'Has a reference year and counts how many have passed (e.g. a wedding anniversary).',

    'status.postponed': 'Postponed',
    'status.recent': 'Recent',
    'status.warn': 'A while since you talked',
    'status.alert': 'It’s been a long time',

    'date.day': 'Day',
    'date.month': 'Month',
    'date.year': 'Year',
    'date.clear': 'Clear date',

    'crop.title': 'Adjust the photo',
    'crop.hint': 'Drag to move, use the slider to zoom.',
    'crop.use': 'Use photo',

    'dates.namePlaceholder': 'Date name (e.g. Anniversary, Father’s Day...)',
    'dates.add': '+ Add date',
    'dates.today': 'today',
    'dates.inDays': (n) => `in ${n} day${n===1?'':'s'}`,
    'dates.years': (n) => `${n} year${n===1?'':'s'}`,

    'home.greeting': (name) => `Hi, ${name}`,
    'home.overdueTitle': (n) => `Time to talk to ${n} ${n===1?'person':'people'}`,
    'home.emptyTitle': 'You don’t have anyone here yet',
    'home.emptyBody': 'Tap "Add" below to add the first person to your circle.',
    'home.searchPlaceholder': 'Search by name...',
    'home.upcomingDates': 'Upcoming dates',
    'home.today': 'Today',
    'home.isToday': 'It’s today!',
    'home.days': (n) => `day${n===1?'':'s'}`,
    'home.turns': (age) => `Turns ${age}`,
    'home.prepared': '✓ Ready',
    'home.prepareMe': 'Get ready',
    'home.yourPeople': (n) => `Your people (${n})`,
    'home.noFilterResults': 'No one in this filter yet.',
    'home.sinceLabel': 'since you talked',
    'home.prepModalTitle': (name) => `Get ready for ${name}’s birthday`,
    'home.prepModalBody': 'Note if they celebrate on a different day, your plans together, or anything else you want to remember.',
    'home.prepModalPlaceholder': 'E.g.: this year they’re celebrating on Saturday the 6th, not the exact day...',
    'home.saveNote': 'Save note',

    'notif.title': 'Notifications',
    'notif.subtitle': 'Who it’s time to talk to and what alerts are coming.',
    'notif.disabledWarning': 'Notifications are turned off, so these alerts won’t arrive. Enable them in System Settings > Apps > KeepBonds > Notifications.',
    'notif.enable': 'Enable notifications',
    'notif.enableHint': 'Tap to allow the app to notify you.',

    'detail.title': 'Contact detail',
    'detail.message': 'Message',
    'detail.whatsappGreeting': (name) => `Hi ${name}! How are you?`,
    'detail.addPhone': '+ Add a phone number to call or message',
    'detail.turns': (age) => `Turns ${age}`,
    'detail.daysSince': 'days since you talked',
    'detail.legendRecent': 'Recent',
    'detail.legendModerate': 'Moderate',
    'detail.legendMuchTime': 'A long time',
    'detail.postponedTitle': 'Postponed',
    'detail.postponedBody': (name, date) => `We won’t flag ${name} as overdue until ${date}.`,
    'detail.cancelPostpone': 'Cancel postpone',
    'detail.postponeTitle': 'Postpone',
    'detail.postponeBody': (name) => `If it’s not a good time to reach ${name}, stop being reminded for a while.`,
    'detail.oneWeek': '1 week',
    'detail.twoWeeks': '2 weeks',
    'detail.oneMonth': '1 month',
    'detail.importantDatesTitle': 'Important dates',
    'detail.importantDatesBody': (name) => `Anniversaries or other dates you want to remember for ${name}.`,
    'detail.birthdayAlertTitle': 'Birthday alert',
    'detail.birthdayAlertBody': (name) => `Remind me before ${name}’s birthday`,
    'detail.daysLeft': (n) => ` · ${n} day${n===1?'':'s'} left`,
    'detail.birthdayNoteLabel': 'Note for this birthday',
    'detail.birthdayNotePlaceholder': 'E.g.: they celebrate on Saturday the 6th, not the exact day...',
    'detail.notifTitle': 'Notifications',
    'detail.notifSubtitle': 'Alerts for this contact',
    'detail.historyTitle': 'Contact history',
    'detail.historyAgo': (n) => `${n} day${n===1?'':'s'} ago`,
    'detail.seeLess': 'See less',
    'detail.seeAll': (n) => `See full history (${n})`,
    'detail.notesTitle': 'Notes',
    'detail.notesSubtitle': 'Anything you want to remember about this person',
    'detail.notesPlaceholder': 'No notes yet. Jot down what they like, how they’re doing, things to follow up on...',
    'detail.markToday': 'Mark as talked today',

    'add.title': 'Add person',
    'add.addPhotoOptional': 'Add photo (optional)',
    'add.back': 'Back',
    'add.next': 'Next',
    'add.skip': 'Skip',
    'add.skipAndSave': 'Skip and save',
    'add.saveAs': (n) => `Save ${n}`,
    'add.q.thisPerson': 'this person',
    'add.q.source': 'How do you want to add this person?',
    'add.q.sourceHint': 'We’ll ask a few short questions. Skip any you don’t know.',
    'add.q.sourceManualTitle': 'Type it in',
    'add.q.sourceManualSub': 'You only need their name',
    'add.q.sourceContactsTitle': 'From my contacts',
    'add.q.sourceContactsSub': 'We bring their name, phone and birthday',
    'add.q.pick': 'Who do you want to add?',
    'add.q.name': 'What’s their name?',
    'add.q.nameHint': 'Write their name the way you call them. The photo is optional.',
    'add.q.nameHintContacts': 'We took it from your contacts. You can edit it and add a photo.',
    'add.q.role': (n) => `What is ${n} to you?`,
    'add.q.birthday': (n) => `When is ${n}’s birthday?`,
    'add.q.birthdayHint': 'We’ll remind you a few days before so you don’t miss it.',
    'add.q.birthdayFound': 'We found it in your contacts. Check it.',
    'add.q.priority': (n) => `How important is it to stay in touch with ${n}?`,
    'add.q.prio.Alta': 'A lot, don’t let me forget',
    'add.q.prio.Media': 'Normal',
    'add.q.prio.Baja': 'No pressure',
    'add.q.prioHint.Alta': 'The reminder stays on your phone until you talk.',
    'add.q.prioHint.Media': 'One reminder when the time comes.',
    'add.q.prioHint.Baja': 'We’ll remind you more gently.',
    'add.q.freq': (n) => `How often would you like to talk to ${n}?`,
    'add.q.freqLabel.Semanal': 'Every week',
    'add.q.freqLabel.Quincenal': 'Every 2 weeks',
    'add.q.freqLabel.Mensual': 'Once a month',
    'add.q.freqLabel.Trimestral': 'Every 3 months',
    'add.q.dates': (n) => `Any other important date for ${n}?`,
    'add.q.datesHint': 'An anniversary, the day you met, a name day...',
    'add.q.notes': (n) => `Anything you want to remember about ${n}?`,
    'add.q.notesHint': 'What they like, what they’re up to, what to talk about next time.',
    'add.heading': 'Add to your circle',
    'add.manual': 'Manual',
    'add.fromContacts': 'From contacts',
    'add.addPhoto': 'Add photo',
    'add.changePhoto': 'Change photo',
    'add.removePhoto': 'Remove',
    'add.nameLabel': 'Name',
    'add.namePlaceholder': 'E.g.: Jane Smith',
    'add.phoneLabel': (opt) => `Phone (${opt})`,
    'add.phonePlaceholder': 'E.g.: +1 555 123 4567',
    'add.chooseFromContacts': 'Choose from your contacts',
    'add.loadingContacts': 'Loading your contacts...',
    'add.searchPlaceholder': 'Search...',
    'add.showingOf': (shown, total) => `Showing ${shown} of ${total}. Type to search the rest.`,
    'add.noPhone': 'No phone',
    'add.noDeviceContacts': 'No contacts found on your phone.',
    'add.roleLabel': 'Role',
    'add.birthdayLabel': (opt) => `Birthday (${opt})`,
    'add.priorityLabel': 'Priority',
    'add.freqLabel': 'Desired reminder frequency',
    'add.importantDatesLabel': (opt) => `Important dates (${opt})`,
    'add.notesLabel': 'Notes · what they like or what to talk about',
    'add.notesPlaceholder': 'E.g.: loves hiking, apartment hunting, into jazz vinyl...',
    'add.errorSelectContact': 'Select a contact from the list.',
    'add.errorName': 'Enter a name to save the contact.',
    'add.errorFutureBirthday': 'The birthday can’t be in the future.',
    'add.errorYear': 'Check the birth year, it looks incorrect.',
    'add.contactsError': (detail) => `Couldn’t access your contacts${detail?`: ${detail}`:'.'} If you already granted permission and it keeps failing, check System Settings > Apps > KeepBonds > Permissions > Contacts.`,

    'edit.title': 'Edit person',
    'edit.errorName': 'Enter a name to save the changes.',
    'edit.deleteConfirm': 'Tap again to delete this person',
    'edit.delete': 'Delete contact',

    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.yourName': 'Your name',
    'settings.greetingHint': 'This is how the Home screen greets you.',
    'settings.permissions': 'Permissions',
    'settings.notifPermTitle': 'Notifications',
    'settings.notifPermBody': 'Birthday and contact reminders',
    'settings.activated': 'Enabled',
    'settings.activate': 'Enable',
    'settings.contactsPermTitle': 'Contacts',
    'settings.contactsPermBody': 'To add people from your address book',
    'settings.deniedHint': 'If the button does nothing, you already declined before: enable it from System Settings > Apps > KeepBonds > Permissions.',
    'settings.appearance': 'Appearance',
    'settings.darkTheme': 'Dark theme',
    'settings.darkThemeHint': 'Changes the look of the whole app',
    'settings.compactView': 'Compact view',
    'settings.compactViewHint': 'Denser list of people',
    'settings.language': 'Language',
    'settings.languageHint': 'Choose the app’s language.',
    'settings.langEs': 'Español',
    'settings.langEn': 'English',
    'settings.defaultReminders': 'Default reminders',
    'settings.remindWithLabel': 'Remind me of birthdays',
    'settings.desiredFreq': 'Desired contact frequency',
    'settings.defaultsHint': 'Used when adding a new person; you can adjust these per contact afterward.',
    'settings.data': 'Data',
    'settings.offlineNote': 'Offline mode: your data is stored only on this device, with no server or cloud.',
    'settings.backup': 'Local backup (export / import)',
    'settings.deleteAllConfirm': 'Tap again to delete everything',
    'settings.deleteAll': 'Delete all data',

    'bulk.assign': 'Assign',
    'bulk.selected': (n) => `${n} selected`,
    'bulk.selectAll': 'All',
    'bulk.selectNone': 'None',
    'bulk.assignTo': (n) => `Assign to ${n} contact${n===1?'':'s'}`,
    'bulk.sheetTitle': (n) => `Assign to ${n} contact${n===1?'':'s'}`,
    'bulk.sheetBody': 'Pick only what you want to change; everything else stays the same.',
    'bulk.apply': (n) => `Apply to ${n}`,
    'app.bulkAssigned': (n) => `Done: ${n} contact${n===1?'':'s'} updated`,
    'today.subtitle': 'Call, text, or tap ✓ once you’ve talked.',
    'today.allGood': 'You’re up to date with everyone. Nice!',
    'today.bdayIn': (age, n) => n===0 ? `Turns ${age} today!` : `Turns ${age} in ${n} day${n===1?'':'s'}`,
    'today.dateIn': (label, n) => n===0 ? `${label} is today` : `${label} in ${n} day${n===1?'':'s'}`,
    'notif.scheduledHeading': 'Upcoming alerts',
    'today.markTalked': 'We talked',
    'today.showMore': (n) => `Show ${n} more`,
    'today.showLess': 'Show less',
    'quicklog.daysSince': (n) => `${n}d since you talked`,
    'quicklog.call': 'Call',
    'quicklog.message': 'Message',
    'quicklog.register': 'Log',
    'quicklog.endCall': 'End call',
    'quicklog.notePlaceholder': 'What did you talk about? (optional)',
    'quicklog.noPhoneToast': (name) => `${name} doesn’t have a phone number saved. Add one by editing the contact.`,

    'backup.title': 'Local backup',
    'backup.export': 'Export',
    'backup.import': 'Import',
    'backup.exportBody': 'Copy this text and save it (a note, an email to yourself) so you can restore your contacts on another device.',
    'backup.copy': 'Copy to clipboard',
    'backup.importBody': 'Paste a backup you exported before. This will replace your current contacts.',
    'backup.importPlaceholder': 'Paste the backup JSON here...',
    'backup.importAction': 'Import and replace',
    'backup.invalid': 'That text isn’t a valid KeepBonds backup. Make sure it’s the full JSON you copied before.',

    'tab.add': 'Add',

    'onboarding.welcomeTitle': 'Welcome to KeepBonds',
    'onboarding.welcomeBody1': 'It helps you stay close to the people you care about, and stay on top of their important moments.',
    'onboarding.welcomeBody2': 'It gives you advance notice of birthdays and reminds you when it’s been a while since you talked to someone important to you.',
    'onboarding.continue': 'Continue',
    'onboarding.nameTitle': 'What’s your name?',
    'onboarding.nameBody': 'This is how the app will greet you every time you open it.',
    'onboarding.namePlaceholder': 'Your name',
    'onboarding.permsTitle': 'Before you start',
    'onboarding.permsBody': 'Turn these on to get the most out of the app. You can change them later in Settings.',
    'onboarding.notifTitle': 'Notifications',
    'onboarding.notifBody': 'To notify you about birthdays and contact reminders.',
    'onboarding.contactsTitle': 'Contacts',
    'onboarding.contactsOptional': '(optional)',
    'onboarding.contactsBody': 'Only needed if you want to add people straight from your address book.',
    'onboarding.permitted': 'Allowed',
    'onboarding.permit': 'Allow',
    'onboarding.notifError': 'Couldn’t enable notifications. You can try again later in Settings.',
    'onboarding.contactsError': 'Couldn’t enable contacts access. You can try again later in Settings.',
    'onboarding.start': 'Start using KeepBonds',

    'app.exitTitle': 'Exit KeepBonds?',
    'app.exitBody': 'Your data stays saved on this device.',
    'app.exit': 'Exit',
    'app.defaultName': 'You',
    'app.allDeleted': 'All contacts were deleted',
    'app.loggedToday': (name) => `Logged: you talked to ${name} today`,
    'app.callLogged': (name) => `Call logged with ${name}`,
    'app.contactAdded': (name) => `${name} was added to your circle`,
    'app.birthdayNoteSaved': (name) => `Note saved for ${name}`,
    'app.birthdayNoteDeleted': 'Note deleted',
    'app.changesSaved': 'Changes saved',
    'app.contactDeleted': (name) => `${name} was removed from your circle`,
    'app.undo': 'Undo',
    'app.contactRestored': 'Contact restored',
    'app.snoozed': (name, date) => `${name} postponed until ${date}`,
    'app.snoozeCancelled': 'Postpone cancelled',
    'app.dateAdded': (label) => `"${label}" added`,
    'app.dateDeleted': 'Date deleted',
    'app.backupCopied': 'Backup copied to clipboard',
    'app.backupImported': 'Backup imported',

    'notifContent.birthdayTitle': 'Birthday coming up',
    'notifContent.birthdayBody': (name, age, days) => `${name} turns ${age} in ${days} day${days===1?'':'s'}.`,
    'notifContent.birthdayPreviewToday': (age) => `They turn ${age} today!`,
    'notifContent.birthdayPreview': (age, days) => `Turns ${age} in ${days} day${days===1?'':'s'}.`,
    'notifContent.dateBody': (label, name, days) => `${name}’s ${label} in ${days} day${days===1?'':'s'}.`,
    'notifContent.datePreviewToday': (label) => `Today! ${label}.`,
    'notifContent.datePreview': (label, days) => `${label} in ${days} day${days===1?'':'s'}.`,
    'notifContent.overdueTitle': 'It’s been a while',
    'notifContent.overdueBody': (name) => `It’s been a long time since you talked to ${name}. Message them today?`,
    'notifContent.overduePreviewAlready': 'It’s been a long time since you talked. Message them today?',
    'notifContent.overduePreview': (days) => `If you don’t talk before then, we’ll remind you in ${days} day${days===1?'':'s'}.`,
  },
};

function translate(lang, key, ...args){
  const dict = STRINGS[lang] || STRINGS.es;
  const entry = dict[key] !== undefined ? dict[key] : STRINGS.es[key];
  if(entry === undefined) return key;
  return typeof entry === 'function' ? entry(...args) : entry;
}

const LangContext = createContext({ lang: 'es', setLang: ()=>{}, t: (key, ...args)=>translate('es', key, ...args) });
function useT(){ return useContext(LangContext); }

// Los roles integrados (Familia/Amigos/Conocidos) se traducen; un rol
// personalizado escrito por el usuario (ej. "Compañeros de trabajo") se
// muestra tal cual, en cualquier idioma, porque no es traducible.
function roleLabel(t, role){
  return BUILT_IN_ROLES.includes(role) ? t(`role.${role}`) : role;
}

async function hapticTap(style = ImpactStyle.Light){
  try{ await Haptics.impact({ style }); }catch(e){ /* no disponible fuera de un dispositivo real */ }
}

function makeId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function onlyDigits(s){
  return (s || "").replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/\+/g, "");
}

function openWhatsApp(phone, message){
  const digits = onlyDigits(phone);
  if(!digits) return;
  try{ window.location.href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`; }catch(e){ /* no-op */ }
}

function birthdayPayloadToIso(b){
  if(!b || !b.year || !b.month || !b.day) return null;
  const mm = String(b.month).padStart(2,'0');
  const dd = String(b.day).padStart(2,'0');
  return `${b.year}-${mm}-${dd}`;
}

async function pickContactPhoto(lang = "es"){
  try{
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 900,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader: translate(lang, 'photoPrompt.header'),
      promptLabelPhoto: translate(lang, 'photoPrompt.gallery'),
      promptLabelPicture: translate(lang, 'photoPrompt.camera'),
      promptLabelCancel: translate(lang, 'photoPrompt.cancel'),
    });
    return photo.dataUrl || null;
  }catch(e){
    // El usuario canceló, o el selector no está disponible fuera de un dispositivo real.
    return null;
  }
}

const PHOTO_CROP_PREVIEW_SIZE = 280;
const PHOTO_CROP_OUTPUT_SIZE = 500;

function PhotoCropModal({src, onCancel, onConfirm}){
  const {t} = useT();
  const [naturalSize, setNaturalSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({x:0, y:0});
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(()=>{
    let cancelled = false;
    setNaturalSize(null); setZoom(1); setPos({x:0, y:0});
    const img = new Image();
    img.onload = () => { if(!cancelled) setNaturalSize({w:img.naturalWidth, h:img.naturalHeight}); };
    img.src = src;
    return ()=>{ cancelled = true; };
  }, [src]);

  const baseScale = naturalSize ? Math.max(PHOTO_CROP_PREVIEW_SIZE/naturalSize.w, PHOTO_CROP_PREVIEW_SIZE/naturalSize.h) : 1;

  function clamp(p, z){
    if(!naturalSize) return p;
    const scaledW = naturalSize.w * baseScale * z;
    const scaledH = naturalSize.h * baseScale * z;
    const maxX = Math.max(0, (scaledW - PHOTO_CROP_PREVIEW_SIZE)/2);
    const maxY = Math.max(0, (scaledH - PHOTO_CROP_PREVIEW_SIZE)/2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }

  function onPointerDown(e){
    dragRef.current = { startX:e.clientX, startY:e.clientY, origX:pos.x, origY:pos.y };
    try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(err){ /* no-op */ }
  }
  function onPointerMove(e){
    if(!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }, zoom));
  }
  function onPointerUp(){ dragRef.current = null; }

  function onZoomChange(v){
    const z = Number(v);
    setZoom(z);
    setPos(p=>clamp(p, z));
  }

  function confirm(){
    if(!naturalSize || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_CROP_OUTPUT_SIZE; canvas.height = PHOTO_CROP_OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    const ratio = PHOTO_CROP_OUTPUT_SIZE / PHOTO_CROP_PREVIEW_SIZE;
    const s = baseScale * zoom * ratio;
    const drawW = naturalSize.w * s;
    const drawH = naturalSize.h * s;
    const cx = PHOTO_CROP_OUTPUT_SIZE/2 + pos.x * ratio;
    const cy = PHOTO_CROP_OUTPUT_SIZE/2 + pos.y * ratio;
    ctx.save();
    ctx.beginPath();
    ctx.arc(PHOTO_CROP_OUTPUT_SIZE/2, PHOTO_CROP_OUTPUT_SIZE/2, PHOTO_CROP_OUTPUT_SIZE/2, 0, Math.PI*2);
    ctx.clip();
    ctx.drawImage(imgRef.current, cx - drawW/2, cy - drawH/2, drawW, drawH);
    ctx.restore();
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  }

  return (
    <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:70}}>
      <div className="card sheet-pop" onClick={e=>e.stopPropagation()} style={{width:"88%", maxWidth:340, padding:"20px 18px", textAlign:"center"}}>
        <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".95rem"}}>{t('crop.title')}</p>
        <p style={{margin:"0 0 16px", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('crop.hint')}</p>
        <div
          style={{
            width:PHOTO_CROP_PREVIEW_SIZE, height:PHOTO_CROP_PREVIEW_SIZE, borderRadius:"999px", overflow:"hidden", margin:"0 auto",
            position:"relative", background:"var(--surface-2)", touchAction:"none", cursor:"grab",
            border:"1px solid var(--line)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {naturalSize && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              style={{
                position:"absolute",
                left:"50%", top:"50%",
                width: naturalSize.w * baseScale * zoom,
                height: naturalSize.h * baseScale * zoom,
                maxWidth:"none",
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                userSelect:"none", pointerEvents:"none",
              }}
            />
          )}
        </div>
        <input
          type="range" min="1" max="3" step="0.01" value={zoom}
          onChange={e=>onZoomChange(e.target.value)}
          style={{width:"100%", marginTop:16}}
        />
        <div style={{display:"flex", gap:8, marginTop:16}}>
          <button onClick={onCancel} className="segbtn" style={{flex:1, textAlign:"center"}}>{t('common.cancel')}</button>
          <button onClick={confirm} className="btn-primary" style={{flex:1, padding:"10px 0", fontSize:".85rem"}} disabled={!naturalSize}>
            {t('crop.use')}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_STYLE = {
  "Familia":   { bg:"var(--sage-deep)",       tag:"var(--sage-soft)", tagText:"var(--sage-deep)" },
  "Amigos":    { bg:"var(--terracotta-deep)", tag:"var(--terracotta-soft)", tagText:"var(--terracotta-deep)" },
  "Conocidos": { bg:"var(--ink-soft)",         tag:"var(--surface-2)", tagText:"var(--ink-soft)" },
};

const PRIORITY_STYLE = {
  "Alta":  { bg:"var(--terracotta-soft)", text:"var(--terracotta-deep)" },
  "Media": { bg:"var(--sage-soft)",       text:"var(--sage-deep)" },
  "Baja":  { bg:"var(--surface-2)",       text:"var(--ink-soft)" },
};

const THRESHOLDS = {
  "Alta":  { ok:3,  warn:7  },
  "Media": { ok:7,  warn:14 },
  "Baja":  { ok:14, warn:30 },
};

function initials(name){
  return name.split(" ").filter(Boolean).slice(0,2).map(w=>Array.from(w)[0]).join("").toUpperCase();
}

function isSnoozed(c){
  return !!(c.snoozedUntil && c.snoozedUntil > todayISO());
}

function contactStatus(c, tr){
  const translateFn = tr || ((key)=>translate('es', key));
  const th = THRESHOLDS[c.priority] || THRESHOLDS.Media;
  const days = daysSinceContact(c);
  if(isSnoozed(c)) return { level:"ok", color:"var(--sage)", label:translateFn('status.postponed') };
  if (days <= th.ok) return { level:"ok", color:"var(--sage)", label:translateFn('status.recent') };
  if (days <= th.warn) return { level:"warn", color:"var(--terracotta)", label:translateFn('status.warn') };
  return { level:"alert", color:"var(--terracotta-deep)", label:translateFn('status.alert') };
}

function todayISO(){ return new Date().toISOString().slice(0,10); }
function isoDaysAgo(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10);
}
function isoDaysFromNow(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function normalizeHistory(h){
  if(!Array.isArray(h)) return [];
  return h.map(item => typeof item === "string" ? {date:item, note:""} : {date:item.date, note:item.note || ""});
}
function daysSince(iso){
  const d = new Date(iso+"T00:00:00");
  const t = new Date(todayISO()+"T00:00:00");
  return Math.round((t-d)/86400000);
}
function daysSinceContact(c){
  if(c.history && c.history[0]) return Math.max(0, daysSince(c.history[0].date));
  return 0;
}
function formatDateEs(iso, lang='es'){
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString(LOCALE_BY_LANG[lang] || 'es', {day:'numeric', month:'short'});
}
function formatTodayLong(lang='es'){
  const s = new Date().toLocaleDateString(LOCALE_BY_LANG[lang] || 'es', {weekday:'long', day:'numeric', month:'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nextBirthdayInfo(birthday){
  if(!birthday) return null;
  const [y,m,d] = birthday.split("-").map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  let next = new Date(today.getFullYear(), m-1, d);
  if(next < today) next = new Date(today.getFullYear()+1, m-1, d);
  const daysIn = Math.round((next - today) / 86400000);
  const turningAge = next.getFullYear() - y;
  return { daysIn, turningAge };
}
function formatBirthdayShort(birthday, lang='es'){
  const [, m, d] = birthday.split("-").map(Number);
  return new Date(2000, m-1, d).toLocaleDateString(LOCALE_BY_LANG[lang] || 'es', {day:'numeric', month:'short'});
}
function formatBirthdayLong(birthday, lang='es'){
  const [, m, d] = birthday.split("-").map(Number);
  return new Date(2000, m-1, d).toLocaleDateString(LOCALE_BY_LANG[lang] || 'es', {day:'numeric', month:'long'});
}

function daysInMonth(year, month){
  return new Date(year, month, 0).getDate();
}

const CYCLIC_PLACEHOLDER_YEAR = 2004; // año bisiesto ficticio: solo para poder elegir 29 de febrero en fechas cíclicas

function DateSelect({value, onChange, minYear, maxYear, allowClear, showYear=true}){
  const {lang, t} = useT();
  const months = MONTHS_BY_LANG[lang];
  const today = new Date();
  const maxY = maxYear || today.getFullYear();
  const minY = minYear || (today.getFullYear() - 120);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  useEffect(()=>{
    const [ny, nm, nd] = value ? value.split("-").map(Number) : [null, null, null];
    setYear(ny || ""); setMonth(nm || ""); setDay(nd || "");
  }, [value]);

  function commit(ny, nm, nd){
    let clampedD = nd;
    if(ny && nm && nd) clampedD = Math.min(nd, daysInMonth(ny, nm));
    setYear(showYear ? ny : ""); setMonth(nm); setDay(clampedD);
    if(ny && nm && clampedD){
      onChange(`${ny}-${String(nm).padStart(2,'0')}-${String(clampedD).padStart(2,'0')}`);
    } else if(!nm && !clampedD && (!showYear || !ny)){
      onChange("");
    }
  }

  const yearForCommit = showYear ? (year || "") : CYCLIC_PLACEHOLDER_YEAR;
  const dayCount = month ? daysInMonth(yearForCommit || CYCLIC_PLACEHOLDER_YEAR, month) : 31;
  const years = [];
  for(let yy=maxY; yy>=minY; yy--) years.push(yy);

  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns: showYear ? "1fr 1.5fr 1fr" : "1fr 1.5fr", gap:8}}>
        <select className="input" value={day} onChange={e=>commit(yearForCommit||"", month||"", Number(e.target.value))}>
          <option value="">{t('date.day')}</option>
          {Array.from({length:dayCount}, (_,i)=>i+1).map(dd=><option key={dd} value={dd}>{dd}</option>)}
        </select>
        <select className="input" value={month} onChange={e=>commit(yearForCommit||"", Number(e.target.value), day||"")}>
          <option value="">{t('date.month')}</option>
          {months.map((mo,i)=><option key={mo} value={i+1}>{mo}</option>)}
        </select>
        {showYear && (
          <select className="input" value={year} onChange={e=>commit(Number(e.target.value), month||"", day||"")}>
            <option value="">{t('date.year')}</option>
            {years.map(yy=><option key={yy} value={yy}>{yy}</option>)}
          </select>
        )}
      </div>
      {allowClear && value && (
        <button onClick={()=>commit("", "", "")} style={{marginTop:6, fontSize:".74rem", fontWeight:700, color:"var(--terracotta-deep)"}}>
          {t('date.clear')}
        </button>
      )}
    </div>
  );
}

/* ---------------- Notificaciones locales reales ---------------- */

function computeUpcomingAlerts(contacts, now = new Date(), tr){
  const translateFn = tr || ((key, ...args)=>translate('es', key, ...args));
  const alerts = [];

  for(const c of contacts){
    if(!c.notif) continue;

    if(c.birthday){
      const info = nextBirthdayInfo(c.birthday);
      const [, m, d] = c.birthday.split("-").map(Number);
      let next = new Date(now.getFullYear(), m-1, d);
      if(next < now) next = new Date(now.getFullYear()+1, m-1, d);
      const fireDate = new Date(next);
      fireDate.setDate(fireDate.getDate() - (c.remind || 5));
      fireDate.setHours(9,0,0,0);
      if(fireDate > now){
        alerts.push({
          id: c.id*1000 + 1,
          contactId: c.id,
          contactName: c.name,
          role: c.role,
          type: "birthday",
          daysUntilFire: Math.max(1, Math.ceil((fireDate - now) / 86400000)),
          previewDays: info.daysIn,
          fireDate,
          title: translateFn('notifContent.birthdayTitle'),
          // body: para la notificación real del sistema, el día que llegue (en ese momento sí faltan "remind" días).
          body: translateFn('notifContent.birthdayBody', c.name, info.turningAge, c.remind),
          // previewBody: para mostrar en la app HOY, donde lo que falta es el cumpleaños real, no el aviso.
          previewBody: info.daysIn===0
            ? translateFn('notifContent.birthdayPreviewToday', info.turningAge)
            : translateFn('notifContent.birthdayPreview', info.turningAge, info.daysIn),
        });
      }
    }

    const importantDates = c.importantDates || [];
    for(let idx=0; idx<importantDates.length; idx++){
      const d = importantDates[idx];
      const info = nextBirthdayInfo(d.date);
      const [, m, day] = d.date.split("-").map(Number);
      let next = new Date(now.getFullYear(), m-1, day);
      if(next < now) next = new Date(now.getFullYear()+1, m-1, day);
      const fireDate = new Date(next);
      fireDate.setDate(fireDate.getDate() - (c.remind || 5));
      fireDate.setHours(9,0,0,0);
      if(fireDate > now){
        alerts.push({
          id: c.id*1000 + 10 + idx,
          contactId: c.id,
          contactName: c.name,
          role: c.role,
          type: "important-date",
          label: d.label,
          daysUntilFire: Math.max(1, Math.ceil((fireDate - now) / 86400000)),
          previewDays: info.daysIn,
          fireDate,
          title: d.label,
          body: translateFn('notifContent.dateBody', d.label, c.name, c.remind),
          previewBody: info.daysIn===0
            ? translateFn('notifContent.datePreviewToday', d.label)
            : translateFn('notifContent.datePreview', d.label, info.daysIn),
        });
      }
    }

    if(isSnoozed(c)) continue;

    const th = THRESHOLDS[c.priority] || THRESHOLDS.Media;
    const daysSince_ = daysSinceContact(c);
    const daysUntilOverdue = (th.warn + 1) - daysSince_;
    if(daysUntilOverdue > 0){
      const fireDate = new Date(now);
      fireDate.setDate(fireDate.getDate() + daysUntilOverdue);
      fireDate.setHours(11,0,0,0);
      const alreadyOverdue = daysSince_ > th.warn;
      alerts.push({
        id: c.id*1000 + 2,
        contactId: c.id,
        contactName: c.name,
        role: c.role,
        priority: c.priority,
        type: "overdue",
        daysUntilFire: daysUntilOverdue,
        previewDays: daysUntilOverdue,
        fireDate,
        title: translateFn('notifContent.overdueTitle'),
        // body: para la notificación real del sistema, el día que llegue (en ese momento sí lleva harto tiempo).
        body: translateFn('notifContent.overdueBody', c.name),
        // previewBody: para mostrar en la app HOY, sin adelantar algo que todavía no pasa.
        previewBody: alreadyOverdue
          ? translateFn('notifContent.overduePreviewAlready')
          : translateFn('notifContent.overduePreview', daysUntilOverdue),
      });
    }
  }

  return alerts.sort((a,b)=>a.previewDays - b.previewDays);
}

async function scheduleNotifications(contacts, lang='es'){
  try{
    // Solo revisa el permiso (no lo pide) — pedirlo es responsabilidad de un botón
    // explícito (bienvenida o Ajustes), no de este efecto en segundo plano.
    const perm = await LocalNotifications.checkPermissions();
    if(perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    if(pending.notifications.length){
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n=>({ id:n.id })) });
    }

    // Los avisos "hace mucho que no hablas" de prioridad Alta quedan fijos
    // (ongoing) en la barra hasta que registras el contacto. Aquí quitamos los
    // que ya se entregaron pero cuya tarea ya se cumplió (o el contacto ya no existe).
    const delivered = await LocalNotifications.getDeliveredNotifications();
    const deliveredIds = new Set(delivered.notifications.map(n=>n.id));
    const stale = delivered.notifications.filter(n=>{
      if(n.id % 1000 !== 2) return false;
      const c = contacts.find(c=>c.id === Math.floor(n.id / 1000));
      return !c || !c.notif || contactStatus(c).level !== "alert";
    });
    if(stale.length){
      await LocalNotifications.removeDeliveredNotifications({ notifications: stale });
      stale.forEach(n=>deliveredIds.delete(n.id));
    }

    const tr = (key, ...args) => translate(lang, key, ...args);
    const alerts = computeUpcomingAlerts(contacts, new Date(), tr);
    const isPinned = (a) => a.type === "overdue" && a.priority === "Alta";
    const notifications = alerts.map(a=>({
      id:a.id, title:a.title, body:a.body, schedule:{ at:a.fireDate },
      extra:{ contactId:a.contactId },
      ...(isPinned(a) ? { ongoing:true, autoCancel:false } : {}),
    }));

    // Prioridad Alta que ya está atrasada y cuyo aviso no está en la barra
    // (por ejemplo, el usuario lo deslizó en Android 14+, donde el sistema
    // permite descartar notificaciones fijas): lo volvemos a mostrar a las 11:00.
    const now = new Date();
    for(const c of contacts){
      const id = c.id*1000 + 2;
      if(c.priority !== "Alta" || !c.notif || deliveredIds.has(id)) continue;
      if(contactStatus(c).level !== "alert") continue;
      const at = new Date(now);
      at.setHours(11,0,0,0);
      if(at <= now) at.setDate(at.getDate() + 1);
      notifications.push({
        id, title:tr('notifContent.overdueTitle'), body:tr('notifContent.overdueBody', c.name),
        schedule:{ at }, extra:{ contactId:c.id }, ongoing:true, autoCancel:false,
      });
    }

    if(notifications.length){
      await LocalNotifications.schedule({ notifications });
    }
  }catch(e){
    /* El plugin no está disponible fuera de un dispositivo Android/iOS real: no hacemos nada. */
  }
}

function Avatar({name, role, photo, size=44}){
  if(photo){
    return (
      <img src={photo} alt=""
        style={{width:size, height:size, borderRadius:"999px", objectFit:"cover", flexShrink:0}} />
    );
  }
  const style = ROLE_STYLE[role] || ROLE_STYLE.Conocidos;
  return (
    <div style={{
        width:size, height:size, borderRadius:"999px", background:style.bg, color:"#FBF8EE",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"var(--font-display)", fontWeight:600, fontSize:size*0.38, flexShrink:0
      }}>
      {initials(name)}
    </div>
  );
}

function RoleTag({role}){
  const {t} = useT();
  const s = ROLE_STYLE[role] || ROLE_STYLE.Conocidos;
  return <span className="chip" style={{background:s.tag, color:s.tagText, border:"none"}}>{roleLabel(t, role)}</span>;
}

function PriorityBadge({priority}){
  const {t} = useT();
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.Media;
  return (
    <span style={{background:s.bg, color:s.text, fontWeight:700, fontSize:".72rem", padding:".3rem .7rem", borderRadius:"999px"}}>
      {t('priority.label', t(`priority.${priority}`))}
    </span>
  );
}

function StatusDot({color}){
  return <span style={{width:9, height:9, borderRadius:"999px", background:color, flexShrink:0, display:"inline-block"}} />;
}

/* ---------------- Screens ---------------- */

const SORT_MODES = ["name", "overdue", "birthday"];
const UPCOMING_WINDOW_DAYS = 30;
// Una fecha a 7 días o menos ya es motivo para hablar (entra a "Te toca hablar con").
const TODAY_DATE_DAYS = 7;
// Urgencia para ordenar "Hoy te toca": qué tan pasado está alguien respecto de
// SU propio plazo, multiplicado por el peso de su prioridad. Así 9 días sin
// hablar con alguien de prioridad Alta va antes que 41 días con alguien de Baja.
const PRIORITY_WEIGHT = { Alta:1.5, Media:1, Baja:0.6 };
function overdueRatio(c){
  const th = THRESHOLDS[c.priority] || THRESHOLDS.Media;
  return (daysSinceContact(c) / th.warn) * (PRIORITY_WEIGHT[c.priority] || 1);
}

function HomeScreen({contacts, filter, setFilter, onOpenContact, onOpenSettings, onSetBirthdayNote, onBulkAssign, onLogCall, onToast, onAdd, userName, compact, customRoles, onOverlayChange, closeSignal}){
  const {lang, t} = useT();
  const roles = ["Todos", ...BUILT_IN_ROLES, ...customRoles];
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("name");
  const filtered = useMemo(()=>{
    const byRole = filter==="Todos" ? contacts : contacts.filter(c=>c.role===filter);
    const q = query.trim().toLowerCase();
    const byQuery = q ? byRole.filter(c=>c.name.toLowerCase().includes(q)) : byRole;
    const sorted = [...byQuery];
    if(sortMode==="overdue") sorted.sort((a,b)=>daysSinceContact(b)-daysSinceContact(a));
    else if(sortMode==="birthday") sorted.sort((a,b)=>{
      const ai = a.birthday ? nextBirthdayInfo(a.birthday).daysIn : Infinity;
      const bi = b.birthday ? nextBirthdayInfo(b.birthday).daysIn : Infinity;
      return ai - bi;
    });
    else sorted.sort((a,b)=>a.name.localeCompare(b.name, lang));
    return sorted;
  }, [contacts, filter, query, sortMode, lang]);
  const upcoming = useMemo(()=>{
    const birthdays = contacts
      .filter(c=>c.birthday)
      .map(c=>({ contact:c, isBirthday:true, label:"Cumpleaños", date:c.birthday, ...nextBirthdayInfo(c.birthday) }));
    const dates = contacts.flatMap(c =>
      (c.importantDates||[]).map(d=>({ contact:c, isBirthday:false, label:d.label, date:d.date, dateId:d.id, ...nextBirthdayInfo(d.date) }))
    );
    // Solo lo que viene pronto: una fecha a 300 días no es algo para mirar hoy.
    return [...birthdays, ...dates].filter(u=>u.daysIn<=UPCOMING_WINDOW_DAYS).sort((a,b)=>a.daysIn-b.daysIn);
  }, [contacts]);
  // "Te toca hablar con" (vive en la campana): atrasados + quienes tienen una
  // fecha a ≤7 días, una sola vez cada uno, con todos sus motivos.
  const todayItems = useMemo(()=>{
    const today = todayISO();
    const datesByContact = new Map();
    for(const u of upcoming){
      if(!datesByContact.has(u.contact.id)) datesByContact.set(u.contact.id, []);
      datesByContact.get(u.contact.id).push(u);
    }
    const items = [];
    for(const c of contacts){
      const dates = datesByContact.get(c.id) || [];
      const soon = dates.filter(u=>u.daysIn<=TODAY_DATE_DAYS);
      const talkedToday = c.history && c.history[0] && c.history[0].date===today;
      const isOverdue = contactStatus(c).level!=="ok";
      if(!isOverdue && (soon.length===0 || talkedToday)) continue;
      const soonest = soon.length ? Math.min(...soon.map(u=>u.daysIn)) : null;
      const score = (soonest!=null ? TODAY_DATE_DAYS + 1 - soonest : 0) + (isOverdue ? overdueRatio(c) : 0);
      items.push({ contact:c, dates, overdue:isOverdue, score });
    }
    return items.sort((a,b)=>b.score-a.score);
  }, [contacts, upcoming]);
  const [prepModalId, setPrepModalId] = useState(null);
  const [prepDraft, setPrepDraft] = useState("");
  const prepContact = contacts.find(c=>c.id===prepModalId) || null;
  const [notifOpen, setNotifOpen] = useState(false);
  // Modo selección para asignar rol/prioridad/frecuencia a varios contactos a la vez.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(()=>new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const alerts = useMemo(()=>computeUpcomingAlerts(contacts, new Date(), t), [contacts, t]);

  // Le avisamos a App() cuando hay una hoja/modal local abierta, para que el botón
  // "atrás" del sistema la cierre en vez de preguntar si se quiere salir de la app.
  // La limpieza también avisa "ya no hay overlay" si HomeScreen se desmonta (se
  // navega a otra pantalla) mientras seguía marcado como abierto.
  useEffect(()=>{
    onOverlayChange(notifOpen || prepModalId!=null || selectMode);
    return ()=>onOverlayChange(false);
  }, [notifOpen, prepModalId, selectMode]);
  useEffect(()=>{
    if(!closeSignal) return;
    // "Atrás" cierra primero la hoja de asignación y luego sale del modo selección.
    if(bulkOpen){ setBulkOpen(false); return; }
    setNotifOpen(false); setPrepModalId(null); exitSelectMode();
  }, [closeSignal]);

  function exitSelectMode(){ setSelectMode(false); setSelectedIds(new Set()); setBulkOpen(false); }
  function toggleSelected(id){
    hapticTap();
    setSelectedIds(prev=>{ const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  const allFilteredSelected = filtered.length>0 && filtered.every(c=>selectedIds.has(c.id));
  function toggleSelectAll(){
    setSelectedIds(prev=>{
      const next = new Set(prev);
      if(allFilteredSelected) filtered.forEach(c=>next.delete(c.id));
      else filtered.forEach(c=>next.add(c.id));
      return next;
    });
  }
  function applyBulk(patch){
    onBulkAssign([...selectedIds], patch);
    exitSelectMode();
  }

  function openPrepModal(c){ setPrepModalId(c.id); setPrepDraft(c.birthdayNote || ""); }
  function savePrepNote(){ onSetBirthdayNote(prepModalId, prepDraft.trim()); setPrepModalId(null); }
  function cycleSort(){ setSortMode(m=>SORT_MODES[(SORT_MODES.indexOf(m)+1) % SORT_MODES.length]); }

  return (
    <div className="screen-enter" style={{position:"relative", height:"100%", display:"flex", flexDirection:"column"}}>
      <div className="screen-scroll" style={{padding:"18px 18px 92px"}}>

        <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between"}}>
          <div>
            <h1 className="font-display" style={{fontSize:"1.7rem", fontWeight:600, margin:0, lineHeight:1.1}}>{t('home.greeting', userName)}</h1>
            <p style={{margin:"2px 0 0", fontSize:".84rem", color:"var(--ink-soft)"}}>{formatTodayLong(lang)}</p>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={onOpenSettings} className="icon-btn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button onClick={()=>setNotifOpen(true)} className="icon-btn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
              {todayItems.length>0 && <span className="badge-count">{todayItems.length>99?"99+":todayItems.length}</span>}
            </button>
          </div>
        </div>

        {upcoming.length>0 && (
        <div style={{marginTop:18}}>
          <p className="field-label" style={{marginBottom:8}}>{t('home.upcomingDates')}</p>
          <div className="hscroll" style={{display:"flex", gap:10, paddingBottom:4}}>
            {upcoming.map((u)=>{
              const {contact:c, isBirthday, label, date, daysIn, turningAge, dateId} = u;
              const urgent = daysIn<=7;
              return (
                <div key={isBirthday ? `${c.id}-bday` : `${c.id}-${dateId}`} className="card" style={{minWidth:150, padding:14, scrollSnapAlign:"start", flexShrink:0, position:"relative",
                      background: urgent ? "linear-gradient(165deg, var(--terracotta-soft), var(--surface) 70%)" : "var(--surface)"}}>
                  <div style={{position:"absolute", top:12, right:12}}>
                    <Avatar name={c.name} role={c.role} photo={c.photo} size={28} />
                  </div>
                  <p className="field-label" style={{margin:0, maxWidth:"75%", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.name.split(" ")[0]}</p>
                  <p className="font-display tabular" style={{margin:"6px 0 0", fontSize:"1.9rem", fontWeight:600, lineHeight:1,
                        color: urgent ? "var(--terracotta-deep)" : "var(--ink)"}}>
                    {daysIn===0 ? t('home.today') : daysIn}
                  </p>
                  <p style={{margin:"2px 0 0", fontSize:".7rem", color:"var(--ink-soft)"}}>
                    {daysIn===0 ? t('home.isToday') : t('home.days', daysIn)} · {formatBirthdayShort(date, lang)}
                  </p>
                  {isBirthday ? (
                    <p style={{margin:"1px 0 0", fontSize:".7rem", color:"var(--ink-faint)"}}>
                      {t('home.turns', turningAge)}
                    </p>
                  ) : (
                    <p style={{margin:"1px 0 0", fontSize:".7rem", color:"var(--ink-faint)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                      {label}
                    </p>
                  )}
                  {isBirthday && (c.birthdayNote ? (
                    <button onClick={()=>openPrepModal(c)}
                      style={{marginTop:10, width:"100%", textAlign:"left", background:"var(--surface)",
                              border:"1px solid var(--line)", borderRadius:".8rem", padding:"6px 8px"}}>
                      <p style={{margin:0, fontSize:".68rem", fontWeight:700, color:"var(--sage-deep)"}}>{t('home.prepared')}</p>
                      <p style={{margin:"2px 0 0", fontSize:".68rem", color:"var(--ink-soft)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                        {c.birthdayNote}
                      </p>
                    </button>
                  ) : (
                    <button onClick={()=>openPrepModal(c)} className="chip"
                      style={{marginTop:10, width:"100%", textAlign:"center", border:"1px solid var(--terracotta)",
                              color:"var(--terracotta-deep)", background:"var(--surface)"}}>
                      {t('home.prepareMe')}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {contacts.length===0 ? (
          <div className="card" style={{marginTop:28, padding:"32px 22px", textAlign:"center"}}>
            <div style={{margin:"0 auto 16px", width:64, height:64, borderRadius:"999px", background:"var(--sage-soft)",
                  display:"flex", alignItems:"center", justifyContent:"center"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p style={{fontWeight:700, margin:"0 0 6px", fontSize:".95rem"}}>{t('home.emptyTitle')}</p>
            <p style={{margin:0, fontSize:".82rem", color:"var(--ink-soft)", lineHeight:1.5}}>
              {t('home.emptyBody')}
            </p>
          </div>
        ) : (
        <React.Fragment>
        <div style={{marginTop:16, position:"relative"}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" style={{position:"absolute", left:13, top:"50%", transform:"translateY(-50%)"}}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input className="input" style={{paddingLeft:36, paddingRight: query ? 36 : undefined}} placeholder={t('home.searchPlaceholder')} value={query} onChange={e=>setQuery(e.target.value)} />
          {query && (
            <button onClick={()=>setQuery("")} style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div style={{marginTop:20}}>
          <div className="hscroll" style={{display:"flex", gap:8}}>
            {roles.map(r=>(
              <button key={r} className="chip" data-active={filter===r} onClick={()=>setFilter(r)}>
                {r==="Todos" ? t('role.all') : roleLabel(t, r)}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginTop:16, display:"flex", flexDirection:"column", gap: compact ? 6 : 10}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            {selectMode ? (
              <React.Fragment>
                <p className="field-label" style={{margin:0}}>{t('bulk.selected', selectedIds.size)}</p>
                <div style={{display:"flex", gap:6}}>
                  <button onClick={toggleSelectAll} className="chip" style={{border:"1px solid var(--line)"}}>
                    {allFilteredSelected ? t('bulk.selectNone') : t('bulk.selectAll')}
                  </button>
                  <button onClick={exitSelectMode} className="chip" style={{border:"1px solid var(--line)"}}>{t('common.cancel')}</button>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <p className="field-label" style={{margin:0}}>{t('home.yourPeople', filtered.length)}</p>
                <div style={{display:"flex", gap:6}}>
                  <button onClick={()=>{ hapticTap(); setSelectMode(true); }} className="chip" style={{border:"1px solid var(--line)", display:"inline-flex", alignItems:"center", gap:5}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/></svg>
                    {t('bulk.assign')}
                  </button>
                  <button onClick={cycleSort} className="chip" style={{border:"1px solid var(--line)", display:"inline-flex", alignItems:"center", gap:5}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
                    {t(`sort.${sortMode}`)}
                  </button>
                </div>
              </React.Fragment>
            )}
          </div>
          {filtered.map(c=>{
            const st = contactStatus(c);
            const isSel = selectedIds.has(c.id);
            return (
              <button key={c.id} onClick={()=> selectMode ? toggleSelected(c.id) : onOpenContact(c.id)}
                className="card" style={{display:"flex", alignItems:"center", gap:12, padding: compact ? "8px 10px" : 12, textAlign:"left", width:"100%",
                  outline: isSel ? "2px solid var(--sage-deep)" : "none", outlineOffset:-2}}>
                {selectMode && (
                  <span style={{width:22, height:22, borderRadius:999, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                        border: isSel ? "none" : "2px solid var(--line)", background: isSel ? "var(--sage-deep)" : "transparent"}}>
                    {isSel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F6F3E9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                  </span>
                )}
                <Avatar name={c.name} role={c.role} photo={c.photo} size={compact ? 32 : 44} />
                <div style={{flex:1, minWidth:0}}>
                  <p style={{margin:0, fontWeight:700, fontSize: compact ? ".84rem" : ".92rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.name}</p>
                  {!compact && (
                    <div style={{display:"flex", alignItems:"center", gap:6, marginTop:2}}>
                      <RoleTag role={c.role} />
                      <span style={{fontSize:".72rem", color:"var(--ink-faint)"}}>· {t('priority.label', t(`priority.${c.priority}`))}</span>
                      {c.notes && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                          <path d="M4 19.5V6a2 2 0 0 1 2-2h9l5 5v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 4v4a1 1 0 0 0 1 1h4"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <span className="status-pill tabular"
                    style={{background:`color-mix(in srgb, ${st.color} 16%, var(--surface))`, color:st.color}}>
                    <StatusDot color={st.color} />{daysSinceContact(c)}d
                  </span>
                  {!compact && <p style={{margin:"4px 0 0", fontSize:".68rem", color:"var(--ink-faint)"}}>{t('home.sinceLabel')}</p>}
                </div>
              </button>
            );
          })}
          {filtered.length===0 && <p style={{color:"var(--ink-faint)", fontSize:".85rem"}}>{t('home.noFilterResults')}</p>}
        </div>
        </React.Fragment>
        )}
      </div>

      {prepModalId && prepContact && (
        <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.45)", display:"flex", alignItems:"flex-end", zIndex:45}}
             onClick={()=>setPrepModalId(null)}>
          <div className="card sheet-pop" onClick={e=>e.stopPropagation()}
               style={{width:"100%", borderBottomLeftRadius:0, borderBottomRightRadius:0, padding:"16px 18px 22px"}}>
            <div style={{width:36, height:4, background:"var(--line)", borderRadius:999, margin:"0 auto 12px"}} />
            <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".92rem"}}>{t('home.prepModalTitle', prepContact.name.split(" ")[0])}</p>
            <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>
              {t('home.prepModalBody')}
            </p>
            <textarea
              autoFocus
              className="input" rows={4} style={{resize:"none", fontFamily:"var(--font-body)", lineHeight:1.5}}
              placeholder={t('home.prepModalPlaceholder')}
              value={prepDraft} onChange={e=>setPrepDraft(e.target.value)}
            />
            <button onClick={savePrepNote} className="btn-primary" style={{width:"100%", padding:"12px 0", marginTop:10, fontSize:".88rem"}}>
              {t('home.saveNote')}
            </button>
          </div>
        </div>
      )}

      {!selectMode && (
        <button onClick={()=>{ hapticTap(); onAdd(); }} className="btn-primary"
          style={{position:"absolute", right:16, bottom:"calc(16px + env(safe-area-inset-bottom,0px))", zIndex:30, display:"flex", alignItems:"center", gap:8,
                  padding:"14px 20px 14px 16px", borderRadius:999, fontSize:".95rem", boxShadow:"0 10px 24px -6px rgba(54,47,36,.45)"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          {t('tab.add')}
        </button>
      )}

      {selectMode && selectedIds.size>0 && !bulkOpen && (
        <div style={{position:"absolute", left:14, right:14, bottom:12, zIndex:30}}>
          <button onClick={()=>{ hapticTap(); setBulkOpen(true); }} className="btn-primary"
            style={{width:"100%", padding:"13px 0", fontSize:".9rem", boxShadow:"0 6px 18px rgba(54,47,36,.25)"}}>
            {t('bulk.assignTo', selectedIds.size)}
          </button>
        </div>
      )}

      {bulkOpen && (
        <BulkAssignSheet count={selectedIds.size} customRoles={customRoles}
          onClose={()=>setBulkOpen(false)} onApply={applyBulk} />
      )}

      {notifOpen && (
        <NotificationsSheet alerts={alerts} todayItems={todayItems} onClose={()=>setNotifOpen(false)}
          onLogCall={onLogCall} onToast={onToast}
          onPrepare={(c)=>{ setNotifOpen(false); openPrepModal(c); }}
          onOpenContact={(id)=>{ setNotifOpen(false); onOpenContact(id); }} />
      )}
    </div>
  );
}

// Hoja para asignar rol / prioridad / frecuencia a varios contactos a la vez.
// Cada grupo parte vacío ("sin cambio"); tocar de nuevo la opción activa la desmarca.
function BulkAssignSheet({count, customRoles, onClose, onApply}){
  const {t} = useT();
  const {sheetRef, sheetStyle, handleProps} = useDraggableSheet(onClose);
  const [role, setRole] = useState(null);
  const [priority, setPriority] = useState(null);
  const [freq, setFreq] = useState(null);
  const toggle = (set) => (v) => set(cur => cur===v ? null : v);
  const patch = {};
  if(role) patch.role = role;
  if(priority) patch.priority = priority;
  if(freq) patch.freq = freq;
  const empty = Object.keys(patch).length === 0;

  return (
    <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.45)", display:"flex", alignItems:"flex-end", zIndex:46}}
         onClick={onClose}>
      <div ref={sheetRef} className="card sheet-pop" onClick={e=>e.stopPropagation()}
           style={{width:"100%", borderBottomLeftRadius:0, borderBottomRightRadius:0, padding:"16px 18px 22px", maxHeight:"88%", display:"flex", flexDirection:"column", ...sheetStyle}}>
        <div {...handleProps}>
          <div style={{width:44, height:5, background:"var(--line)", borderRadius:999, margin:"0 auto 12px"}} />
          <p style={{fontWeight:700, margin:"0 0 2px", fontSize:".95rem"}}>{t('bulk.sheetTitle', count)}</p>
          <p style={{margin:"0 0 14px", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('bulk.sheetBody')}</p>
        </div>
        <div className="screen-scroll" style={{display:"flex", flexDirection:"column", gap:16}}>
          <div>
            <p className="field-label" style={{marginBottom:6}}>{t('add.roleLabel')}</p>
            <RoleSelector role={role} setRole={toggle(setRole)} customRoles={customRoles} />
          </div>
          <div>
            <p className="field-label" style={{marginBottom:6}}>{t('add.priorityLabel')}</p>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
              {["Alta","Media","Baja"].map(p=> <button key={p} className="segbtn" data-active={priority===p} onClick={()=>toggle(setPriority)(p)}>{t(`priority.${p}`)}</button>)}
            </div>
          </div>
          <div>
            <p className="field-label" style={{marginBottom:6}}>{t('add.freqLabel')}</p>
            <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8}}>
              {["Semanal","Quincenal","Mensual","Trimestral"].map(f=> <button key={f} className="segbtn" data-active={freq===f} onClick={()=>toggle(setFreq)(f)}>{t(`freq.${f}`)}</button>)}
            </div>
          </div>
        </div>
        <button disabled={empty} onClick={()=>{ hapticTap(ImpactStyle.Medium); onApply(patch); }} className="btn-primary"
          style={{width:"100%", padding:"12px 0", marginTop:14, fontSize:".88rem", opacity: empty ? .45 : 1}}>
          {t('bulk.apply', count)}
        </button>
      </div>
    </div>
  );
}

// Hoja inferior que se puede arrastrar desde su barrita: hacia arriba crece
// (hasta 95% de la pantalla) y hacia abajo se achica hasta mostrar el título
// y un poco de contenido. Si se sigue bajando, la hoja se desliza fuera de la
// pantalla siguiendo el dedo y al soltar se cierra (si bajó poco, vuelve).
// Un toque sin arrastrar alterna entre tamaño normal y expandido.
function useDraggableSheet(onClose){
  const sheetRef = useRef(null);
  const dragRef = useRef(null);
  const [height, setHeight] = useState(null);
  const [offset, setOffset] = useState(0);

  function onPointerDown(e){
    const sheet = sheetRef.current;
    if(!sheet) return;
    // Alto mínimo: encabezado (barrita + título) + padding inferior + una fila.
    const minH = Math.min(e.currentTarget.offsetHeight + 22 + 64, sheet.offsetHeight);
    dragRef.current = { startY:e.clientY, startH:sheet.offsetHeight, parentH:sheet.parentElement.clientHeight, minH, moved:false, offset:0 };
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e){
    const d = dragRef.current;
    if(!d) return;
    const dy = e.clientY - d.startY;
    if(Math.abs(dy) > 4) d.moved = true;
    if(!d.moved) return;
    const raw = d.startH - dy;
    d.offset = Math.max(0, d.minH - raw);
    setHeight(Math.max(d.minH, Math.min(d.parentH*0.95, raw)));
    setOffset(d.offset);
  }
  function onPointerUp(){
    const d = dragRef.current;
    if(!d) return;
    dragRef.current = null;
    if(!d.moved){
      setHeight(h => (h != null && h > d.parentH*0.9) ? null : d.parentH*0.95);
      return;
    }
    setOffset(0);
    if(d.offset > d.minH*0.35) onClose();
  }

  return {
    sheetRef,
    sheetStyle: height != null
      ? { height, maxHeight:"95%", transform: offset ? `translateY(${offset}px)` : undefined, animation: "none" }
      : null,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel:onPointerUp,
                   style:{ touchAction:"none", userSelect:"none", WebkitUserSelect:"none", cursor:"grab", margin:"-16px -18px 0", padding:"16px 18px 0" } },
  };
}

function NotificationsSheet({alerts: allAlerts, todayItems, onClose, onOpenContact, onLogCall, onToast, onPrepare}){
  const {t} = useT();
  // Quien ya está en "Te toca hablar con" no se repite en "Próximos avisos".
  const inToday = new Set(todayItems.map(i=>i.contact.id));
  const alerts = allAlerts.filter(a=>!inToday.has(a.contactId));
  const {sheetRef, sheetStyle, handleProps} = useDraggableSheet(onClose);
  const [permStatus, setPermStatus] = useState("unknown");

  useEffect(()=>{
    let cancelled = false;
    LocalNotifications.checkPermissions()
      .then(p=>{ if(!cancelled) setPermStatus(p.display); })
      .catch(()=>{ if(!cancelled) setPermStatus("unavailable"); });
    return ()=>{ cancelled = true; };
  }, []);

  async function enableNotifications(){
    try{
      const p = await LocalNotifications.requestPermissions();
      setPermStatus(p.display);
    }catch(e){ /* no-op */ }
  }

  return (
    <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.45)", display:"flex", alignItems:"flex-end", zIndex:46}}
         onClick={onClose}>
      <div ref={sheetRef} className="card sheet-pop" onClick={e=>e.stopPropagation()}
           style={{width:"100%", borderBottomLeftRadius:0, borderBottomRightRadius:0, padding:"16px 18px 22px", maxHeight:"78%", display:"flex", flexDirection:"column", ...sheetStyle}}>
        <div {...handleProps}>
          <div style={{width:44, height:5, background:"var(--line)", borderRadius:999, margin:"0 auto 12px"}} />
          <p style={{fontWeight:700, margin:"0 0 2px"}}>{t('notif.title')}</p>
          <p style={{margin:"0 0 12px", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('notif.subtitle')}</p>
        </div>

        {permStatus==="denied" && (
          <div className="card" style={{padding:12, marginBottom:12, background:"var(--terracotta-soft)", boxShadow:"none"}}>
            <p style={{margin:"0 0 8px", fontSize:".8rem", color:"var(--terracotta-deep)"}}>
              {t('notif.disabledWarning')}
            </p>
          </div>
        )}
        {permStatus==="prompt" && (
          <button onClick={enableNotifications} className="card" style={{padding:12, marginBottom:12, textAlign:"left", boxShadow:"none"}}>
            <p style={{margin:0, fontSize:".82rem", fontWeight:700, color:"var(--sage-deep)"}}>{t('notif.enable')}</p>
            <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('notif.enableHint')}</p>
          </button>
        )}

        <div className="screen-scroll" style={{display:"flex", flexDirection:"column", gap:8}}>
          <TodaySection items={todayItems} limit={Infinity} onLogCall={onLogCall} onToast={onToast}
            onOpenContact={onOpenContact} onPrepare={onPrepare} />
          {alerts.length>0 && <p className="field-label" style={{margin:"10px 0 0"}}>{t('notif.scheduledHeading')}</p>}
          {alerts.map(a=>(
            <button key={a.id} onClick={()=>onOpenContact(a.contactId)} className="card"
              style={{display:"flex", alignItems:"center", gap:10, padding:10, textAlign:"left", boxShadow:"none"}}>
              <div style={{width:34, height:34, borderRadius:"999px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                    background: a.type==="overdue" ? "var(--sage-soft)" : "var(--terracotta-soft)"}}>
                {a.type==="overdue" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                ) : a.type==="birthday" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M5 22v-8a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8"/><path d="M3 22h18"/><path d="M8 10V8a4 4 0 0 1 8 0v2"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17.75 5.8 21l1.2-6.9L2 9.3l6.9-1L12 2l3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>
                )}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{margin:0, fontWeight:700, fontSize:".86rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{a.contactName}</p>
                <p style={{margin:0, fontSize:".76rem", color:"var(--ink-soft)"}}>{a.previewBody}</p>
              </div>
              <span style={{fontSize:".72rem", color:"var(--ink-faint)", flexShrink:0}}>{a.previewDays}d</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ring({pct, color, size=120, children}){
  const bg = `conic-gradient(${color} ${pct*360}deg, var(--surface-2) 0deg)`;
  return (
    <div style={{width:size, height:size, borderRadius:"999px", background:bg, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={{width:size-16, height:size-16, borderRadius:"999px", background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
        {children}
      </div>
    </div>
  );
}

function DetailScreen({contact, onBack, onEdit, onMarkedToday, onSetRemind, onToggleNotif, onSetNotes, onSetBirthdayNote, onSnooze, onCancelSnooze, onAddImportantDate, onDeleteImportantDate}){
  const {lang, t} = useT();
  const st = contactStatus(contact, t);
  const th = THRESHOLDS[contact.priority] || THRESHOLDS.Media;
  const daysSinceLast = daysSinceContact(contact);
  const pct = Math.min(daysSinceLast / th.warn, 1);
  const remindOptions = [3,5,7,14];
  const bday = contact.birthday ? nextBirthdayInfo(contact.birthday) : null;
  const [notesDraft, setNotesDraft] = useState(contact.notes || "");
  const [birthdayNoteDraft, setBirthdayNoteDraft] = useState(contact.birthdayNote || "");
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const snoozed = isSnoozed(contact);
  useEffect(()=>{ setNotesDraft(contact.notes || ""); setBirthdayNoteDraft(contact.birthdayNote || ""); setHistoryExpanded(false); }, [contact.id]);

  return (
    <div className="screen-enter" style={{height:"100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", padding:"16px 14px 4px"}}>
        <button onClick={onBack} style={{width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{flex:1, textAlign:"center", fontWeight:700, fontSize:".8rem", color:"var(--ink-soft)", letterSpacing:".04em", textTransform:"uppercase"}}>{t('detail.title')}</p>
        <button onClick={onEdit} style={{width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
      </div>

      <div className="screen-scroll" style={{padding:"6px 20px 40px"}}>
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginTop:6}}>
          <Avatar name={contact.name} role={contact.role} photo={contact.photo} size={84} />
          <h2 className="font-display" style={{margin:"12px 0 4px", fontSize:"1.4rem", fontWeight:600}}>{contact.name}</h2>
          <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"center"}}>
            <RoleTag role={contact.role} />
            <PriorityBadge priority={contact.priority} />
          </div>
          {contact.phone && (
            <div style={{display:"flex", gap:8, marginTop:8}}>
              <button onClick={()=>{ hapticTap(); try{ window.location.href = `tel:${contact.phone}`; }catch(e){} }}
                className="chip" style={{border:"1px solid var(--sage)", color:"var(--sage-deep)", display:"inline-flex", alignItems:"center", gap:5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.66 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.23a2 2 0 0 1 2.11-.45c.86.32 1.75.54 2.65.66A2 2 0 0 1 22 16.92z"/>
                </svg>
                {contact.phone}
              </button>
              <button onClick={()=>{ hapticTap(); openWhatsApp(contact.phone, t('detail.whatsappGreeting', contact.name.split(" ")[0])); }}
                className="chip" style={{border:"1px solid var(--terracotta)", color:"var(--terracotta-deep)", display:"inline-flex", alignItems:"center", gap:5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                {t('detail.message')}
              </button>
            </div>
          )}
          {!contact.phone && (
            <button onClick={onEdit} className="chip" style={{marginTop:8, border:"1px dashed var(--line)", color:"var(--ink-faint)"}}>
              {t('detail.addPhone')}
            </button>
          )}
          {bday && (
            <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"center", marginTop:8}}>
              <span className="chip" style={{background:"var(--surface-2)", border:"none", color:"var(--ink-soft)"}}>
                {formatBirthdayLong(contact.birthday, lang)}
              </span>
              <span className="chip" style={{background:"var(--terracotta-soft)", border:"none", color:"var(--terracotta-deep)"}}>
                {t('detail.turns', bday.turningAge)}
              </span>
            </div>
          )}
        </div>

        <div style={{display:"flex", justifyContent:"center", marginTop:22}}>
          <Ring pct={pct} color={st.color} size={140}>
            <span className="font-display tabular" style={{fontSize:"2.1rem", fontWeight:600, lineHeight:1}}>{daysSinceLast}</span>
            <span style={{fontSize:".68rem", color:"var(--ink-soft)", marginTop:2}}>{t('detail.daysSince')}</span>
          </Ring>
        </div>
        <p style={{textAlign:"center", marginTop:10, fontSize:".82rem", color:st.color, fontWeight:700}}>{st.label}</p>
        <div style={{display:"flex", justifyContent:"center", gap:16, marginTop:8}}>
          {[{level:"ok", color:"var(--sage)", label:t('detail.legendRecent')},
            {level:"warn", color:"var(--terracotta)", label:t('detail.legendModerate')},
            {level:"alert", color:"var(--terracotta-deep)", label:t('detail.legendMuchTime')}].map(l=>(
            <div key={l.level} style={{display:"flex", alignItems:"center", gap:5, opacity: st.level===l.level ? 1 : .38}}>
              <span style={{width:7, height:7, borderRadius:"999px", background:l.color}} />
              <span style={{fontSize:".68rem", fontWeight: st.level===l.level ? 800 : 600, color:"var(--ink-soft)"}}>{l.label}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{marginTop:14, padding:16}}>
          {snoozed ? (
            <React.Fragment>
              <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".9rem"}}>{t('detail.postponedTitle')}</p>
              <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>
                {t('detail.postponedBody', contact.name.split(" ")[0], formatDateEs(contact.snoozedUntil, lang))}
              </p>
              <button onClick={()=>{ hapticTap(); onCancelSnooze(); }} className="segbtn" style={{textAlign:"center"}}>
                {t('detail.cancelPostpone')}
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".9rem"}}>{t('detail.postponeTitle')}</p>
              <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>
                {t('detail.postponeBody', contact.name.split(" ")[0])}
              </p>
              <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
                <button className="segbtn" onClick={()=>{ hapticTap(); onSnooze(7); }}>{t('detail.oneWeek')}</button>
                <button className="segbtn" onClick={()=>{ hapticTap(); onSnooze(14); }}>{t('detail.twoWeeks')}</button>
                <button className="segbtn" onClick={()=>{ hapticTap(); onSnooze(30); }}>{t('detail.oneMonth')}</button>
              </div>
            </React.Fragment>
          )}
        </div>

        <div className="card" style={{marginTop:14, padding:16}}>
          <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".9rem"}}>{t('detail.importantDatesTitle')}</p>
          <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>
            {t('detail.importantDatesBody', contact.name.split(" ")[0])}
          </p>
          <ImportantDatesEditor
            key={contact.id}
            dates={contact.importantDates}
            onAdd={(d)=>{ hapticTap(); onAddImportantDate(d); }}
            onDelete={(id)=>{ hapticTap(); onDeleteImportantDate(id); }}
          />
        </div>

        {contact.birthday && (
          <div className="card" style={{marginTop:14, padding:16}}>
            <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".9rem"}}>{t('detail.birthdayAlertTitle')}</p>
            <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>
              {t('detail.birthdayAlertBody', contact.name.split(" ")[0])}
              {bday && t('detail.daysLeft', bday.daysIn)}
            </p>
            <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
              {remindOptions.map(d=>(
                <button key={d} className="segbtn" data-active={contact.remind===d} onClick={()=>onSetRemind(d)}>
                  {d}d
                </button>
              ))}
            </div>
            <div style={{marginTop:12}}>
              <p className="field-label" style={{marginBottom:6}}>{t('detail.birthdayNoteLabel')}</p>
              <textarea
                className="input" rows={2} style={{resize:"none", fontFamily:"var(--font-body)", lineHeight:1.5}}
                placeholder={t('detail.birthdayNotePlaceholder')}
                value={birthdayNoteDraft}
                onChange={e=>setBirthdayNoteDraft(e.target.value)}
                onBlur={()=>onSetBirthdayNote(birthdayNoteDraft)}
              />
            </div>
          </div>
        )}

        <div className="card" style={{marginTop:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div>
            <p style={{fontWeight:700, margin:0, fontSize:".9rem"}}>{t('detail.notifTitle')}</p>
            <p style={{margin:"2px 0 0", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('detail.notifSubtitle')}</p>
          </div>
          <button className="switch-track" data-on={contact.notif} onClick={onToggleNotif}>
            <span className="switch-thumb" />
          </button>
        </div>

        {contact.history && contact.history.length>0 && (
          <div className="card" style={{marginTop:14, padding:16}}>
            <p style={{fontWeight:700, margin:"0 0 10px", fontSize:".9rem"}}>{t('detail.historyTitle')}</p>
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {(historyExpanded ? contact.history : contact.history.slice(0,5)).map((h, i)=>(
                <div key={h.date+i} style={{display:"flex", flexDirection:"column", gap:3}}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <div style={{width:8, height:8, borderRadius:"999px", background: i===0 ? "var(--sage)" : "var(--line)", flexShrink:0}} />
                    <span style={{fontSize:".84rem", fontWeight:600}}>{formatDateEs(h.date, lang)}</span>
                    <span style={{fontSize:".76rem", color:"var(--ink-faint)"}}>· {t('detail.historyAgo', daysSince(h.date))}</span>
                  </div>
                  {h.note && (
                    <p style={{margin:"0 0 0 18px", fontSize:".78rem", color:"var(--ink-soft)", fontStyle:"italic"}}>
                      "{h.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
            {contact.history.length>5 && (
              <button onClick={()=>setHistoryExpanded(x=>!x)}
                style={{marginTop:10, fontSize:".76rem", fontWeight:700, color:"var(--sage-deep)"}}>
                {historyExpanded ? t('detail.seeLess') : t('detail.seeAll', contact.history.length)}
              </button>
            )}
          </div>
        )}

        <div className="card" style={{marginTop:14, padding:16}}>
          <p style={{fontWeight:700, margin:"0 0 4px", fontSize:".9rem"}}>{t('detail.notesTitle')}</p>
          <p style={{margin:"0 0 10px", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('detail.notesSubtitle')}</p>
          <textarea
            className="input"
            rows={4}
            style={{resize:"none", fontFamily:"var(--font-body)", lineHeight:1.5}}
            placeholder={t('detail.notesPlaceholder')}
            value={notesDraft}
            onChange={e=>setNotesDraft(e.target.value)}
            onBlur={()=>onSetNotes(notesDraft)}
          />
        </div>

        <button onClick={()=>{ hapticTap(ImpactStyle.Medium); onMarkedToday(); }} className="btn-primary" style={{width:"100%", padding:"14px 0", marginTop:20, fontSize:".95rem"}}>
          {t('detail.markToday')}
        </button>
      </div>
    </div>
  );
}

const BUILT_IN_ROLES = ["Familia","Amigos","Conocidos"];

function RoleSelector({role, setRole, customRoles}){
  const {t} = useT();
  const all = [...BUILT_IN_ROLES, ...customRoles];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function confirmAdd(){
    const trimmed = draft.trim();
    if(!trimmed){ setAdding(false); return; }
    // Si ya existe un rol con el mismo nombre (sin distinguir mayúsculas), lo
    // reusamos en vez de crear uno nuevo casi-duplicado (ej. "familia" vs "Familia").
    const existing = all.find(r=>r.toLowerCase()===trimmed.toLowerCase());
    setRole(existing || trimmed);
    setDraft(""); setAdding(false);
  }

  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
        {all.map(r=>(
          <button key={r} className="segbtn" data-active={role===r} onClick={()=>setRole(r)}
            style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
            {roleLabel(t, r)}
          </button>
        ))}
        {!adding && (
          <button className="segbtn" onClick={()=>setAdding(true)}>{t('role.addOther')}</button>
        )}
      </div>
      {adding && (
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <input autoFocus className="input" placeholder={t('role.addPlaceholder')} value={draft}
            onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") confirmAdd(); }} />
          <button onClick={confirmAdd} className="btn-primary" style={{padding:"0 16px", fontSize:".85rem"}}>{t('role.add')}</button>
        </div>
      )}
    </div>
  );
}

const IMPORTANT_DATE_MODE_KEYS = ["cyclic", "yearly"];

function ImportantDatesEditor({dates, onAdd, onDelete}){
  const {lang, t} = useT();
  const [addingDate, setAddingDate] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [dateMode, setDateMode] = useState("cyclic");
  const [dateValue, setDateValue] = useState("");

  function saveDate(){
    if(!dateLabel.trim() || !dateValue) return;
    onAdd({ id: makeId(), label: dateLabel.trim(), mode: dateMode, date: dateValue });
    setAddingDate(false); setDateLabel(""); setDateValue(""); setDateMode("cyclic");
  }

  return (
    <div>
      {dates && dates.length>0 && (
        <div style={{display:"flex", flexDirection:"column", gap:8, marginBottom: addingDate ? 12 : 0}}>
          {dates.map(d=>{
            const info = nextBirthdayInfo(d.date);
            return (
              <div key={d.id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"var(--surface-2)", borderRadius:".8rem"}}>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{margin:0, fontWeight:700, fontSize:".84rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{d.label}</p>
                  <p style={{margin:0, fontSize:".72rem", color:"var(--ink-faint)"}}>
                    {formatBirthdayShort(d.date, lang)} · {info.daysIn===0 ? t('dates.today') : t('dates.inDays', info.daysIn)}
                    {d.mode==="yearly" && info.turningAge>0 && ` · ${t('dates.years', info.turningAge)}`}
                  </p>
                </div>
                <button onClick={()=>onDelete(d.id)} style={{width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      {addingDate ? (
        <div>
          <input className="input" placeholder={t('dates.namePlaceholder')}
            value={dateLabel} onChange={e=>setDateLabel(e.target.value)} style={{marginBottom:8}} />
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8}}>
            {IMPORTANT_DATE_MODE_KEYS.map(key=>(
              <button key={key} className="segbtn" data-active={dateMode===key}
                onClick={()=>{ setDateMode(key); setDateValue(""); }}>
                {t(`dateMode.${key}.label`)}
              </button>
            ))}
          </div>
          <p style={{margin:"0 0 8px", fontSize:".72rem", color:"var(--ink-faint)"}}>{t(`dateMode.${dateMode}.hint`)}</p>
          <DateSelect value={dateValue} onChange={setDateValue} showYear={dateMode==="yearly"} maxYear={new Date().getFullYear()} />
          <div style={{display:"flex", gap:8, marginTop:10}}>
            <button onClick={()=>{ setAddingDate(false); setDateLabel(""); setDateValue(""); setDateMode("cyclic"); }}
              className="segbtn" style={{textAlign:"center", flex:1}}>
              {t('common.cancel')}
            </button>
            <button onClick={saveDate} className="btn-primary" style={{flex:1, padding:"10px 0", fontSize:".85rem"}}>{t('common.save')}</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAddingDate(true)} className="segbtn" style={{textAlign:"center"}}>
          {t('dates.add')}
        </button>
      )}
    </div>
  );
}

// Añadir persona como asistente: una pregunta por pantalla, con "Siguiente"
// abajo (y "Omitir" en los pasos opcionales). Primero se elige si se escribe
// a mano o se trae desde los contactos del teléfono.
function AddScreen({onSave, onCancel, defaultFreq, customRoles}){
  const {lang, t} = useT();
  const [mode, setMode] = useState(null); // null | manual | contacts
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState("");
  const [role, setRole] = useState("Familia");
  const [birthday, setBirthday] = useState("");
  const [birthdayFromDevice, setBirthdayFromDevice] = useState(false);
  const [priority, setPriority] = useState("Media");
  const [freq, setFreq] = useState(defaultFreq || "Quincenal");
  const [notes, setNotes] = useState("");
  const [importantDates, setImportantDates] = useState([]);
  const [error, setError] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [contactsStatus, setContactsStatus] = useState("idle"); // idle | loading | error | loaded
  const [contactsErrorMsg, setContactsErrorMsg] = useState("");
  const [cropSrc, setCropSrc] = useState(null);

  const priorities = ["Alta","Media","Baja"];
  const freqs = ["Semanal","Quincenal","Mensual","Trimestral"];
  const steps = mode==="contacts"
    ? ["source","pick","name","role","birthday","priority","freq","dates","notes"]
    : ["source","name","role","birthday","priority","freq","dates","notes"];
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const optionalSteps = ["birthday","dates","notes"];
  const first = name.trim().split(" ")[0] || t('add.q.thisPerson');

  const q = deviceQuery.trim().toLowerCase();
  const filteredDevice = q
    ? deviceContacts.filter(d=>d.name.toLowerCase().includes(q))
    : deviceContacts.slice(0, 30);

  async function loadDeviceContacts(){
    setContactsStatus("loading"); setContactsErrorMsg("");

    // Llamamos a getContacts directamente: el propio plugin revisa el permiso,
    // muestra el diálogo del sistema si hace falta, y sigue solo si lo aceptas.
    // (Pedir el permiso aparte y luego llamar a getContacts duplica el flujo
    // de permisos de Android y puede hacer que el segundo pedido falle.)
    try{
      const { contacts } = await Contacts.getContacts({ projection:{ name:true, phones:true, birthday:true } });
      const mapped = contacts
        .map(c=>({
          id: c.contactId,
          name: c.name?.display || [c.name?.given, c.name?.family].filter(Boolean).join(" "),
          phone: c.phones?.[0]?.number || "",
          birthday: birthdayPayloadToIso(c.birthday),
        }))
        .filter(c=>c.name && c.name.trim())
        .sort((a,b)=>a.name.localeCompare(b.name, lang));
      setDeviceContacts(mapped);
      setContactsStatus("loaded");
    }catch(err){
      setContactsStatus("error");
      const detail = err?.message || err?.errorMessage || (typeof err === "string" ? err : "");
      setContactsErrorMsg(t('add.contactsError', detail));
      console.error("Contacts.getContacts error", err);
    }
  }

  useEffect(()=>{
    if(mode==="contacts" && contactsStatus==="idle"){
      loadDeviceContacts();
    }
  }, [mode, contactsStatus]);

  async function choosePhoto(){
    const dataUrl = await pickContactPhoto(lang);
    if(dataUrl) setCropSrc(dataUrl);
  }

  function chooseMode(m){
    hapticTap();
    setMode(m); setError("");
    setName(""); setPhone(""); setBirthday(""); setBirthdayFromDevice(false);
    setStepIdx(1);
  }

  function pickDevice(d){
    hapticTap();
    setName(d.name);
    setPhone(d.phone || "");
    setBirthday(d.birthday || "");
    setBirthdayFromDevice(!!d.birthday);
    setError("");
    setStepIdx(i=>i+1);
  }

  function birthdayError(){
    if(!birthday) return "";
    if(birthday > todayISO()) return t('add.errorFutureBirthday');
    if(Number(birthday.slice(0,4)) < new Date().getFullYear() - 120) return t('add.errorYear');
    return "";
  }

  function back(){
    setError("");
    if(stepIdx===0){ onCancel(); return; }
    if(stepIdx===1) setMode(null);
    setStepIdx(i=>i-1);
  }

  function save(overrides = {}){
    hapticTap(ImpactStyle.Medium);
    onSave({ name:name.trim(), phone:phone.trim(), photo, role, birthday, priority, freq, notes:notes.trim(), importantDates, ...overrides });
  }

  function next(){
    if(step==="name" && !name.trim()){ setError(t('add.errorName')); return; }
    if(step==="birthday"){ const e = birthdayError(); if(e){ setError(e); return; } }
    setError("");
    hapticTap();
    if(isLast){ save(); return; }
    setStepIdx(i=>i+1);
  }

  function skip(){
    setError("");
    hapticTap();
    if(step==="birthday"){ setBirthday(""); setBirthdayFromDevice(false); }
    if(step==="dates") setImportantDates([]);
    if(step==="notes"){ save({ notes:"" }); return; }
    setStepIdx(i=>i+1);
  }

  const questionStyle = {margin:0, fontSize:"1.6rem", fontWeight:700, lineHeight:1.15};
  const hintStyle = {margin:"6px 0 0", fontSize:".9rem", color:"var(--ink-soft)", lineHeight:1.45};
  const bigOption = (active) => ({
    display:"flex", alignItems:"center", gap:14, width:"100%", textAlign:"left", padding:"16px 14px",
    borderRadius:"1.1rem", background: active ? "var(--sage-soft)" : "var(--surface)",
    border: active ? "2px solid var(--sage-deep)" : "1.5px solid var(--line)",
  });
  const showFooter = step!=="source" && step!=="pick";
  const nextDisabled = step==="name" && !name.trim();

  return (
    <div className="screen-enter" style={{height:"100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", gap:12, padding:"14px 16px 4px"}}>
        <button onClick={back} className="icon-btn" aria-label={t('add.back')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{flex:1, display:"flex", gap:4}}>
          {steps.map((s,i)=>(
            <span key={s} style={{flex:1, height:5, borderRadius:999, background: i<=stepIdx && mode ? "var(--sage-deep)" : "var(--line)", transition:"background .2s ease"}} />
          ))}
        </div>
        <button onClick={onCancel} style={{fontSize:".88rem", fontWeight:600, color:"var(--ink-soft)", padding:"6px 2px"}}>
          {t('common.cancel')}
        </button>
      </div>

      <div key={step} className="screen-scroll screen-enter" style={{padding:"22px 20px 24px", display:"flex", flexDirection:"column", gap:16}}>

        {step==="source" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.source')}</h2>
              <p style={hintStyle}>{t('add.q.sourceHint')}</p>
            </div>
            {[
              { m:"manual", title:t('add.q.sourceManualTitle'), sub:t('add.q.sourceManualSub'),
                icon:<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/> },
              { m:"contacts", title:t('add.q.sourceContactsTitle'), sub:t('add.q.sourceContactsSub'),
                icon:<React.Fragment><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></React.Fragment> },
            ].map(o=>(
              <button key={o.m} onClick={()=>chooseMode(o.m)} style={bigOption(false)}>
                <span style={{width:46, height:46, borderRadius:999, background:"var(--terracotta-soft)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{o.icon}</svg>
                </span>
                <span style={{flex:1, minWidth:0}}>
                  <span style={{display:"block", fontWeight:700, fontSize:"1rem"}}>{o.title}</span>
                  <span style={{display:"block", fontSize:".82rem", color:"var(--ink-soft)", marginTop:2}}>{o.sub}</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </React.Fragment>
        )}

        {step==="pick" && (
          <React.Fragment>
            <h2 className="font-display" style={questionStyle}>{t('add.q.pick')}</h2>
            {contactsStatus==="loading" && (
              <p style={{fontSize:".85rem", color:"var(--ink-soft)", margin:0}}>{t('add.loadingContacts')}</p>
            )}
            {contactsStatus==="error" && (
              <div className="card" style={{padding:12}}>
                <p style={{margin:"0 0 10px", fontSize:".82rem", color:"var(--terracotta-deep)"}}>{contactsErrorMsg}</p>
                <button onClick={loadDeviceContacts} className="segbtn" style={{width:"100%"}}>{t('common.retry')}</button>
              </div>
            )}
            {contactsStatus==="loaded" && (
              <React.Fragment>
                <input className="input" placeholder={t('add.searchPlaceholder')} value={deviceQuery} onChange={e=>setDeviceQuery(e.target.value)} />
                {!q && deviceContacts.length>30 && (
                  <p style={{margin:"-6px 0 0", fontSize:".74rem", color:"var(--ink-faint)"}}>{t('add.showingOf', 30, deviceContacts.length)}</p>
                )}
                <div style={{display:"flex", flexDirection:"column", gap:6}}>
                  {filteredDevice.map(d=>(
                    <button key={d.id} onClick={()=>pickDevice(d)} className="card"
                      style={{display:"flex", alignItems:"center", gap:10, padding:10, textAlign:"left", boxShadow:"none"}}>
                      <div style={{width:38, height:38, borderRadius:999, background:"var(--surface-2)", color:"var(--ink-soft)",
                            display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:700, fontSize:".85rem", flexShrink:0}}>
                        {initials(d.name)}
                      </div>
                      <div style={{minWidth:0, flex:1}}>
                        <p style={{margin:0, fontWeight:700, fontSize:".9rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{d.name}</p>
                        <p style={{margin:0, fontSize:".74rem", color:"var(--ink-faint)"}}>{d.phone || t('add.noPhone')}</p>
                      </div>
                    </button>
                  ))}
                  {filteredDevice.length===0 && (
                    <p style={{fontSize:".82rem", color:"var(--ink-faint)", margin:0}}>
                      {deviceContacts.length===0 ? t('add.noDeviceContacts') : t('common.noResults')}
                    </p>
                  )}
                </div>
              </React.Fragment>
            )}
          </React.Fragment>
        )}

        {step==="name" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.name')}</h2>
              <p style={hintStyle}>{mode==="contacts" ? t('add.q.nameHintContacts') : t('add.q.nameHint')}</p>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:14}}>
              <Avatar name={name || "?"} role={role} photo={photo} size={68} />
              <div style={{display:"flex", flexDirection:"column", gap:6, alignItems:"flex-start"}}>
                <button onClick={choosePhoto} className="segbtn" style={{padding:".5rem .9rem"}}>
                  {photo ? t('add.changePhoto') : t('add.addPhotoOptional')}
                </button>
                {photo && (
                  <button onClick={()=>setPhoto("")} style={{fontSize:".8rem", fontWeight:700, color:"var(--terracotta-deep)", padding:"2px 4px"}}>
                    {t('add.removePhoto')}
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="field-label" style={{marginBottom:6}}>{t('add.nameLabel')}</p>
              <input autoFocus={mode==="manual"} className="input" style={{fontSize:"1.05rem", padding:".85rem .9rem"}}
                placeholder={t('add.namePlaceholder')} value={name}
                onChange={e=>{setName(e.target.value); setError("");}}
                onKeyDown={e=>{ if(e.key==="Enter") next(); }} />
            </div>
            <div>
              <p className="field-label" style={{marginBottom:6}}>{t('add.phoneLabel', t('common.optional'))}</p>
              <input type="tel" className="input" placeholder={t('add.phonePlaceholder')} value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
          </React.Fragment>
        )}

        {step==="role" && (
          <React.Fragment>
            <h2 className="font-display" style={questionStyle}>{t('add.q.role', first)}</h2>
            <RoleSelector role={role} setRole={setRole} customRoles={customRoles} />
          </React.Fragment>
        )}

        {step==="birthday" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.birthday', first)}</h2>
              <p style={hintStyle}>{t('add.q.birthdayHint')}</p>
            </div>
            {birthdayFromDevice && (
              <p style={{margin:0, padding:"10px 12px", borderRadius:".8rem", background:"var(--sage-soft)", color:"var(--sage-deep)", fontSize:".84rem", fontWeight:600}}>
                {t('add.q.birthdayFound')}
              </p>
            )}
            <DateSelect value={birthday} onChange={v=>{setBirthday(v); setBirthdayFromDevice(false); setError("");}} allowClear />
          </React.Fragment>
        )}

        {step==="priority" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.priority', first)}</h2>
            </div>
            {priorities.map(p=>(
              <button key={p} onClick={()=>setPriority(p)} style={{...bigOption(priority===p), flexDirection:"column", alignItems:"flex-start", gap:3}}>
                <span style={{fontWeight:700, fontSize:"1rem"}}>{t(`add.q.prio.${p}`)}</span>
                <span style={{fontSize:".82rem", color:"var(--ink-soft)", lineHeight:1.4}}>{t(`add.q.prioHint.${p}`)}</span>
              </button>
            ))}
          </React.Fragment>
        )}

        {step==="freq" && (
          <React.Fragment>
            <h2 className="font-display" style={questionStyle}>{t('add.q.freq', first)}</h2>
            {freqs.map(f=>(
              <button key={f} onClick={()=>setFreq(f)} style={{...bigOption(freq===f), justifyContent:"space-between"}}>
                <span style={{fontWeight:700, fontSize:"1rem"}}>{t(`add.q.freqLabel.${f}`)}</span>
                {freq===f && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
              </button>
            ))}
          </React.Fragment>
        )}

        {step==="dates" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.dates', first)}</h2>
              <p style={hintStyle}>{t('add.q.datesHint')}</p>
            </div>
            <ImportantDatesEditor
              dates={importantDates}
              onAdd={(d)=>setImportantDates(ds=>[...ds, d])}
              onDelete={(id)=>setImportantDates(ds=>ds.filter(d=>d.id!==id))}
            />
          </React.Fragment>
        )}

        {step==="notes" && (
          <React.Fragment>
            <div>
              <h2 className="font-display" style={questionStyle}>{t('add.q.notes', first)}</h2>
              <p style={hintStyle}>{t('add.q.notesHint')}</p>
            </div>
            <textarea className="input" rows={5} style={{resize:"none", fontFamily:"var(--font-body)", lineHeight:1.5}}
              placeholder={t('add.notesPlaceholder')}
              value={notes} onChange={e=>setNotes(e.target.value)} />
          </React.Fragment>
        )}

        {error && (
          <p role="alert" style={{margin:0, padding:"10px 12px", background:"var(--terracotta-soft)", color:"var(--terracotta-deep)",
                borderRadius:".8rem", fontSize:".84rem", fontWeight:600}}>
            {error}
          </p>
        )}
      </div>

      {showFooter && (
        <div style={{display:"flex", gap:10, padding:"10px 20px 14px", borderTop:"1px solid var(--line)", background:"var(--cream)"}}>
          {optionalSteps.includes(step) && (
            <button onClick={skip} className="segbtn" style={{flex:1, padding:"14px 0", fontSize:".95rem"}}>
              {isLast ? t('add.skipAndSave') : t('add.skip')}
            </button>
          )}
          <button onClick={next} className="btn-primary" disabled={nextDisabled}
            style={{flex:2, padding:"14px 0", fontSize:".98rem", opacity: nextDisabled ? .45 : 1}}>
            {isLast ? t('add.saveAs', first) : t('add.next')}
          </button>
        </div>
      )}

      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onCancel={()=>setCropSrc(null)}
          onConfirm={(cropped)=>{ setPhoto(cropped); setCropSrc(null); }}
        />
      )}
    </div>
  );
}

function EditContactScreen({contact, onSave, onCancel, onDelete, customRoles}){
  const {lang, t} = useT();
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone || "");
  const [photo, setPhoto] = useState(contact.photo || "");
  const [role, setRole] = useState(contact.role);
  const [birthday, setBirthday] = useState(contact.birthday || "");
  const [priority, setPriority] = useState(contact.priority);
  const [freq, setFreq] = useState(contact.freq || "Quincenal");
  const [importantDates, setImportantDates] = useState(contact.importantDates || []);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);

  const priorities = ["Alta","Media","Baja"];
  const freqs = ["Semanal","Quincenal","Mensual","Trimestral"];

  async function choosePhoto(){
    const dataUrl = await pickContactPhoto(lang);
    if(dataUrl) setCropSrc(dataUrl);
  }

  function submit(){
    if(!name.trim()){ setError(t('edit.errorName')); return; }
    if(birthday){
      const today = todayISO();
      if(birthday > today){ setError(t('add.errorFutureBirthday')); return; }
      const year = Number(birthday.slice(0,4));
      const thisYear = new Date().getFullYear();
      if(year < thisYear - 120){ setError(t('add.errorYear')); return; }
    }
    hapticTap(ImpactStyle.Medium);
    onSave({ name:name.trim(), phone:phone.trim(), photo, role, birthday, priority, freq, importantDates });
  }

  return (
    <div className="screen-enter" style={{height:"100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", padding:"16px 14px 4px"}}>
        <button onClick={onCancel} style={{fontSize:".9rem", color:"var(--ink-soft)", padding:"6px 4px"}}>
          {t('common.cancel')}
        </button>
        <p style={{flex:1, textAlign:"center", fontWeight:700, fontSize:".8rem", color:"var(--ink-soft)", letterSpacing:".04em", textTransform:"uppercase"}}>{t('edit.title')}</p>
        <button onClick={submit} style={{fontSize:".9rem", fontWeight:700, color:"var(--terracotta-deep)", padding:"6px 4px"}}>
          {t('common.save')}
        </button>
      </div>

      {error && (
        <p style={{margin:"8px 20px 0", padding:"10px 12px", background:"var(--terracotta-soft)", color:"var(--terracotta-deep)",
              borderRadius:".8rem", fontSize:".82rem", fontWeight:600}}>
          {error}
        </p>
      )}

      <div className="screen-scroll" style={{padding:"10px 20px 40px", display:"flex", flexDirection:"column", gap:18}}>
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
          <Avatar name={name || "?"} role={role} photo={photo} size={84} />
          <div style={{display:"flex", gap:8}}>
            <button onClick={choosePhoto} className="segbtn" style={{padding:".5rem .9rem"}}>
              {photo ? t('add.changePhoto') : t('add.addPhoto')}
            </button>
            {photo && (
              <button onClick={()=>setPhoto("")} className="segbtn" style={{padding:".5rem .9rem", color:"var(--terracotta-deep)"}}>
                {t('add.removePhoto')}
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.nameLabel')}</p>
          <input className="input" value={name} onChange={e=>{setName(e.target.value); setError("");}} />
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.phoneLabel', t('common.optional'))}</p>
          <input type="tel" className="input" placeholder={t('add.phonePlaceholder')} value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.roleLabel')}</p>
          <RoleSelector role={role} setRole={setRole} customRoles={customRoles} />
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.birthdayLabel', t('common.optional'))}</p>
          <DateSelect value={birthday} onChange={v=>{setBirthday(v); setError("");}} allowClear />
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.priorityLabel')}</p>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
            {priorities.map(p=> <button key={p} className="segbtn" data-active={priority===p} onClick={()=>setPriority(p)}>{t(`priority.${p}`)}</button>)}
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.freqLabel')}</p>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8}}>
            {freqs.map(f=> <button key={f} className="segbtn" data-active={freq===f} onClick={()=>setFreq(f)}>{t(`freq.${f}`)}</button>)}
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:6}}>{t('add.importantDatesLabel', t('common.optional'))}</p>
          <ImportantDatesEditor
            dates={importantDates}
            onAdd={(d)=>setImportantDates(ds=>[...ds, d])}
            onDelete={(id)=>setImportantDates(ds=>ds.filter(d=>d.id!==id))}
          />
        </div>

        <button
          onClick={()=>{ hapticTap(); if(confirmingDelete){ onDelete(); } else setConfirmingDelete(true); }}
          className="segbtn" style={{textAlign:"center", color:"var(--terracotta-deep)", borderColor:"var(--terracotta)", marginTop:8}}>
          {confirmingDelete ? t('edit.deleteConfirm') : t('edit.delete')}
        </button>
      </div>
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onCancel={()=>setCropSrc(null)}
          onConfirm={(cropped)=>{ setPhoto(cropped); setCropSrc(null); }}
        />
      )}
    </div>
  );
}

function SettingsScreen({settings, onUpdate, onBack, onOpenBackup, onDeleteAll}){
  const {t} = useT();
  const [nameDraft, setNameDraft] = useState(settings.userName);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [notifStatus, setNotifStatus] = useState("unknown");
  const [contactsStatus, setContactsStatus] = useState("unknown");
  const remindOptions = [3,5,7,14];
  const freqs = ["Semanal","Quincenal","Mensual","Trimestral"];

  useEffect(()=>{
    let cancelled = false;
    LocalNotifications.checkPermissions()
      .then(p=>{ if(!cancelled) setNotifStatus(p.display); })
      .catch(()=>{ if(!cancelled) setNotifStatus("unavailable"); });
    Contacts.checkPermissions()
      .then(p=>{ if(!cancelled) setContactsStatus(p.contacts); })
      .catch(()=>{ if(!cancelled) setContactsStatus("unavailable"); });
    return ()=>{ cancelled = true; };
  }, []);

  async function requestNotifPerm(){
    try{ const p = await LocalNotifications.requestPermissions(); setNotifStatus(p.display); }catch(e){ /* no-op */ }
  }
  async function requestContactsPerm(){
    try{
      // Pedimos el permiso a través de getContacts para no duplicar el flujo
      // de permisos de Android (ver nota en AddScreen).
      await Contacts.getContacts({ projection:{ name:true } });
      setContactsStatus("granted");
    }catch(e){
      Contacts.checkPermissions().then(p=>setContactsStatus(p.contacts)).catch(()=>setContactsStatus("denied"));
    }
  }

  return (
    <div className="screen-enter" style={{height:"100%", display:"flex", flexDirection:"column"}}>
      <div style={{display:"flex", alignItems:"center", padding:"16px 14px 4px"}}>
        <button onClick={onBack} style={{width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{flex:1, textAlign:"center", fontWeight:700, fontSize:".8rem", color:"var(--ink-soft)", letterSpacing:".04em", textTransform:"uppercase"}}>{t('settings.title')}</p>
        <div style={{width:36}} />
      </div>

      <div className="screen-scroll" style={{padding:"10px 20px 40px", display:"flex", flexDirection:"column", gap:22}}>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.profile')}</p>
          <div className="card" style={{padding:14}}>
            <p className="field-label" style={{marginBottom:6}}>{t('settings.yourName')}</p>
            <input className="input" value={nameDraft}
              onChange={e=>setNameDraft(e.target.value)}
              onBlur={()=>onUpdate("userName", nameDraft.trim() || t('common.you'))} />
            <p style={{margin:"6px 0 0", fontSize:".72rem", color:"var(--ink-faint)"}}>{t('settings.greetingHint')}</p>
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.language')}</p>
          <div className="card" style={{padding:14}}>
            <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8}}>
              <button className="segbtn" data-active={settings.language==="es"} onClick={()=>onUpdate("language", "es")}>{t('settings.langEs')}</button>
              <button className="segbtn" data-active={settings.language==="en"} onClick={()=>onUpdate("language", "en")}>{t('settings.langEn')}</button>
            </div>
            <p style={{margin:"10px 0 0", fontSize:".72rem", color:"var(--ink-faint)"}}>{t('settings.languageHint')}</p>
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.permissions')}</p>
          <div className="card" style={{padding:14, display:"flex", flexDirection:"column", gap:14}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <div style={{width:38, height:38, borderRadius:"999px", background:"var(--sage-soft)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{margin:0, fontWeight:700, fontSize:".88rem"}}>{t('settings.notifPermTitle')}</p>
                <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('settings.notifPermBody')}</p>
              </div>
              <button onClick={requestNotifPerm} className="segbtn" data-active={notifStatus==="granted"} style={{flexShrink:0, padding:".5rem .8rem"}}>
                {notifStatus==="granted" ? t('settings.activated') : t('settings.activate')}
              </button>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <div style={{width:38, height:38, borderRadius:"999px", background:"var(--terracotta-soft)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{margin:0, fontWeight:700, fontSize:".88rem"}}>{t('settings.contactsPermTitle')}</p>
                <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('settings.contactsPermBody')}</p>
              </div>
              <button onClick={requestContactsPerm} className="segbtn" data-active={contactsStatus==="granted"} style={{flexShrink:0, padding:".5rem .8rem"}}>
                {contactsStatus==="granted" ? t('settings.activated') : t('settings.activate')}
              </button>
            </div>
            {(notifStatus==="denied" || contactsStatus==="denied") && (
              <p style={{margin:0, fontSize:".72rem", color:"var(--ink-faint)"}}>
                {t('settings.deniedHint')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.appearance')}</p>
          <div className="card" style={{padding:14, display:"flex", flexDirection:"column", gap:14}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <p style={{fontWeight:700, margin:0, fontSize:".88rem"}}>{t('settings.darkTheme')}</p>
                <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('settings.darkThemeHint')}</p>
              </div>
              <button className="switch-track" data-on={settings.theme==="dark"}
                onClick={()=>onUpdate("theme", settings.theme==="dark" ? "light" : "dark")}>
                <span className="switch-thumb" />
              </button>
            </div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <p style={{fontWeight:700, margin:0, fontSize:".88rem"}}>{t('settings.compactView')}</p>
                <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('settings.compactViewHint')}</p>
              </div>
              <button className="switch-track" data-on={settings.compact}
                onClick={()=>onUpdate("compact", !settings.compact)}>
                <span className="switch-thumb" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.defaultReminders')}</p>
          <div className="card" style={{padding:14}}>
            <p className="field-label" style={{marginBottom:6}}>{t('settings.remindWithLabel')}</p>
            <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
              {remindOptions.map(d=>(
                <button key={d} className="segbtn" data-active={settings.defaultRemind===d} onClick={()=>onUpdate("defaultRemind", d)}>
                  {d}d
                </button>
              ))}
            </div>
            <p className="field-label" style={{margin:"14px 0 6px"}}>{t('settings.desiredFreq')}</p>
            <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8}}>
              {freqs.map(f=>(
                <button key={f} className="segbtn" data-active={settings.defaultFreq===f} onClick={()=>onUpdate("defaultFreq", f)}>
                  {t(`freq.${f}`)}
                </button>
              ))}
            </div>
            <p style={{margin:"10px 0 0", fontSize:".72rem", color:"var(--ink-faint)"}}>{t('settings.defaultsHint')}</p>
          </div>
        </div>

        <div>
          <p className="field-label" style={{marginBottom:10}}>{t('settings.data')}</p>
          <div className="card" style={{padding:14, display:"flex", flexDirection:"column", gap:10}}>
            <p style={{margin:0, fontSize:".78rem", color:"var(--ink-soft)"}}>
              {t('settings.offlineNote')}
            </p>
            <button onClick={onOpenBackup} className="segbtn" style={{textAlign:"center"}}>
              {t('settings.backup')}
            </button>
            <button
              onClick={()=>{ if(confirmingDelete){ onDeleteAll(); setConfirmingDelete(false); } else setConfirmingDelete(true); }}
              className="segbtn" style={{textAlign:"center", color:"var(--terracotta-deep)", borderColor:"var(--terracotta)"}}>
              {confirmingDelete ? t('settings.deleteAllConfirm') : t('settings.deleteAll')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Motivos por los que alguien aparece en "Te toca hablar con", en una línea:
// fechas que vienen (cumpleaños, fechas importantes) y días sin hablar.
function todayReasons(item, t){
  const parts = item.dates.map(u => u.isBirthday
    ? t('today.bdayIn', u.turningAge, u.daysIn)
    : t('today.dateIn', u.label, u.daysIn));
  if(item.overdue) parts.push(t('quicklog.daysSince', daysSinceContact(item.contact)));
  return parts.join(" · ");
}

// "Te toca hablar con": una sola lista con la gente atrasada y la que tiene una
// fecha cerca, sin repetir a nadie. Llamar, escribir y ✓ para registrar la
// conversación (con nota opcional). Muestra 3 y el resto al tocar "Ver más".
function TodaySection({items, limit=3, onLogCall, onToast, onOpenContact, onPrepare}){
  const {t} = useT();
  const [callingId, setCallingId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);

  function callContact(c){
    hapticTap();
    if(!c.phone){
      onToast(t('quicklog.noPhoneToast', c.name.split(" ")[0]));
      return;
    }
    try{ window.location.href = `tel:${c.phone}`; }catch(e){ /* no-op */ }
    setCallingId(c.id);
  }
  function messageContact(c){
    hapticTap();
    openWhatsApp(c.phone, t('detail.whatsappGreeting', c.name.split(" ")[0]));
  }
  function openNoteFor(id){
    hapticTap();
    setCallingId(null);
    setNoteId(id);
    setNoteDraft("");
  }
  function saveNote(){
    hapticTap(ImpactStyle.Medium);
    onLogCall(noteId, noteDraft);
    setNoteId(null); setNoteDraft("");
  }

  if(items.length===0){
    return (
      <div className="card" style={{padding:"12px 14px", display:"flex", alignItems:"center", gap:10, background:"var(--sage-soft)", boxShadow:"none", flexShrink:0}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        <p style={{margin:0, fontWeight:700, fontSize:".86rem", color:"var(--sage-deep)"}}>{t('today.allGood')}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{padding:"14px 12px 10px", background:"linear-gradient(170deg, var(--terracotta-soft), var(--surface) 45%)", boxShadow:"none", flexShrink:0}}>
      <div style={{padding:"0 4px 10px"}}>
        <p style={{margin:0, fontWeight:700, fontSize:".95rem", color:"var(--terracotta-deep)"}}>{t('home.overdueTitle', items.length)}</p>
        <p style={{margin:"2px 0 0", fontSize:".76rem", color:"var(--ink-soft)"}}>{t('today.subtitle')}</p>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:6}}>
        {shown.map(item=>{
          const c = item.contact;
          const isCalling = callingId===c.id;
          const isNoting = noteId===c.id;
          const soonBirthday = item.dates.find(u=>u.isBirthday && u.daysIn<=TODAY_DATE_DAYS);
          const hasSoonDate = item.dates.some(u=>u.daysIn<=TODAY_DATE_DAYS);
          return (
            <div key={c.id} style={{padding:8, borderRadius:".9rem", background:"var(--surface)", border:"1px solid var(--line)"}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <button onClick={()=>onOpenContact(c.id)} style={{flex:1, minWidth:0, display:"flex", alignItems:"center", gap:10, textAlign:"left"}}>
                  <Avatar name={c.name} role={c.role} photo={c.photo} size={34} />
                  <span style={{minWidth:0}}>
                    <span style={{display:"block", fontWeight:700, fontSize:".86rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.name}</span>
                    <span style={{display:"block", fontSize:".72rem", lineHeight:1.35, color: hasSoonDate ? "var(--terracotta-deep)" : "var(--ink-faint)", fontWeight: hasSoonDate ? 700 : 400}}>
                      {todayReasons(item, t)}
                    </span>
                  </span>
                </button>
                {!isCalling && !isNoting && (
                  <React.Fragment>
                    <button onClick={()=>callContact(c)} className="icon-btn" style={{width:36, height:36}} title={t('quicklog.call')} aria-label={t('quicklog.call')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.66 2.65a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.43-1.23a2 2 0 0 1 2.11-.45c.86.32 1.75.54 2.65.66A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </button>
                    {c.phone && (
                      <button onClick={()=>messageContact(c)} className="icon-btn" style={{width:36, height:36}} title={t('quicklog.message')} aria-label={t('quicklog.message')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                      </button>
                    )}
                    <button onClick={()=>openNoteFor(c.id)} className="icon-btn" style={{width:36, height:36, background:"var(--sage-deep)"}} title={t('quicklog.register')} aria-label={t('quicklog.register')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F6F3E9" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                  </React.Fragment>
                )}
                {isCalling && (
                  <button onClick={()=>openNoteFor(c.id)} className="chip"
                    style={{background:"var(--terracotta-deep)", color:"#F6F3E9", border:"none", flexShrink:0}}>
                    {t('quicklog.endCall')}
                  </button>
                )}
              </div>
              {soonBirthday && !isNoting && (
                <button onClick={()=>onPrepare(c)} className="chip"
                  style={{marginTop:8, marginLeft:44, border:"1px solid var(--terracotta)", color:"var(--terracotta-deep)", background:"var(--surface)", maxWidth:"calc(100% - 44px)", overflow:"hidden", textOverflow:"ellipsis"}}>
                  {c.birthdayNote ? `${t('home.prepared')}: ${c.birthdayNote}` : t('home.prepareMe')}
                </button>
              )}
              {isNoting && (
                <div style={{marginTop:8}}>
                  <textarea autoFocus className="input" rows={2} style={{resize:"none", fontFamily:"var(--font-body)"}}
                    placeholder={t('quicklog.notePlaceholder')}
                    value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} />
                  <div style={{display:"flex", gap:8, marginTop:6}}>
                    <button onClick={()=>setNoteId(null)} className="segbtn" style={{flex:1, padding:"8px 0", fontSize:".82rem"}}>{t('common.cancel')}</button>
                    <button onClick={saveNote} className="btn-primary" style={{flex:2, padding:"8px 0", fontSize:".82rem"}}>{t('today.markTalked')}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {items.length>limit && (
        <button onClick={()=>setExpanded(e=>!e)} style={{width:"100%", padding:"10px 0 2px", fontSize:".82rem", fontWeight:700, color:"var(--terracotta-deep)"}}>
          {expanded ? t('today.showLess') : t('today.showMore', items.length-limit)}
        </button>
      )}
    </div>
  );
}

function BackupSheet({contacts, onClose, onImport, onCopied}){
  const {t} = useT();
  const {sheetRef, sheetStyle, handleProps} = useDraggableSheet(onClose);
  const [tab, setTab] = useState("export");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const exportText = useMemo(()=>JSON.stringify(contacts, null, 2), [contacts]);

  function copy(){
    try{
      navigator.clipboard.writeText(exportText);
      onCopied();
    }catch(e){ /* el portapapeles puede no estar disponible: el usuario puede seleccionar y copiar manualmente */ }
  }

  function doImport(){
    try{
      const parsed = JSON.parse(importText);
      if(!Array.isArray(parsed) || parsed.some(c=>!c.name)) throw new Error("shape");
      onImport(parsed);
      setImportText(""); setImportError("");
    }catch(e){
      setImportError(t('backup.invalid'));
    }
  }

  return (
    <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.45)", display:"flex", alignItems:"flex-end", zIndex:50}} onClick={onClose}>
      <div ref={sheetRef} className="card sheet-pop" onClick={e=>e.stopPropagation()}
        style={{width:"100%", borderBottomLeftRadius:0, borderBottomRightRadius:0, padding:"16px 18px 22px", maxHeight:"84%", display:"flex", flexDirection:"column", ...sheetStyle}}>
        <div {...handleProps}>
          <div style={{width:44, height:5, background:"var(--line)", borderRadius:999, margin:"0 auto 12px"}} />
          <p style={{fontWeight:700, margin:"0 0 10px", fontSize:".95rem"}}>{t('backup.title')}</p>
        </div>
        <div style={{display:"flex", gap:8, marginBottom:12}}>
          <button className="chip" data-active={tab==="export"} onClick={()=>setTab("export")} style={{flex:1, textAlign:"center"}}>{t('backup.export')}</button>
          <button className="chip" data-active={tab==="import"} onClick={()=>setTab("import")} style={{flex:1, textAlign:"center"}}>{t('backup.import')}</button>
        </div>

        <div className="screen-scroll">
          {tab==="export" ? (
            <div>
              <p style={{fontSize:".78rem", color:"var(--ink-soft)", margin:"0 0 10px"}}>
                {t('backup.exportBody')}
              </p>
              <textarea readOnly className="input" rows={8} style={{fontFamily:"monospace", fontSize:".72rem", resize:"none"}}
                value={exportText} onFocus={e=>e.target.select()} />
              <button onClick={copy} className="btn-primary" style={{width:"100%", padding:"12px 0", marginTop:10, fontSize:".88rem"}}>
                {t('backup.copy')}
              </button>
            </div>
          ) : (
            <div>
              <p style={{fontSize:".78rem", color:"var(--ink-soft)", margin:"0 0 10px"}}>
                {t('backup.importBody')}
              </p>
              <textarea className="input" rows={8} style={{fontFamily:"monospace", fontSize:".72rem", resize:"none"}}
                placeholder={t('backup.importPlaceholder')} value={importText}
                onChange={e=>{setImportText(e.target.value); setImportError("");}} />
              {importError && <p style={{color:"var(--terracotta-deep)", fontSize:".76rem", fontWeight:600, margin:"8px 0 0"}}>{importError}</p>}
              <button onClick={doImport} className="btn-primary" style={{width:"100%", padding:"12px 0", marginTop:10, fontSize:".88rem"}}>
                {t('backup.importAction')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STORAGE_KEY = "keepbonds_contacts_v2";

function normalizeContact(c){
  let history = normalizeHistory(c.history);
  // Migración: versiones anteriores guardaban "lastContact" como número fijo
  // que nunca avanzaba con el paso del tiempo. Si no hay historial pero sí
  // ese número viejo, lo convertimos en una fecha real para no perder el dato.
  if(history.length === 0 && typeof c.lastContact === "number"){
    history = [{ date: isoDaysAgo(c.lastContact), note:"" }];
  }
  return {
    id: c.id,
    name: c.name,
    phone: c.phone || "",
    photo: c.photo || "",
    role: c.role || "Conocidos",
    priority: c.priority || "Media",
    birthday: c.birthday || null,
    remind: c.remind || 5,
    notif: c.notif !== undefined ? c.notif : true,
    notes: c.notes || "",
    birthdayNote: c.birthdayNote || "",
    history,
    freq: c.freq || "Quincenal",
    importantDates: Array.isArray(c.importantDates)
      ? c.importantDates.filter(d=>d && d.date).map(d=>({ id: d.id || makeId(), label: d.label || "Fecha importante", mode: d.mode || "yearly", date: d.date }))
      : [],
    snoozedUntil: c.snoozedUntil || null,
  };
}

function loadContacts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed.map(normalizeContact);
    }
  }catch(e){ /* localStorage no disponible o dato corrupto: seguimos con la app vacía */ }
  return [];
}

const SETTINGS_KEY = "keepbonds_settings_v1";
const DEFAULT_SETTINGS = { userName:"", theme:"light", compact:false, defaultRemind:5, defaultFreq:"Quincenal", onboarded:false, language:null };

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    const merged = raw ? {...DEFAULT_SETTINGS, ...JSON.parse(raw)} : {...DEFAULT_SETTINGS};
    if(!merged.language) merged.language = detectSystemLang();
    return merged;
  }catch(e){ /* localStorage no disponible: usamos valores por defecto */ }
  return {...DEFAULT_SETTINGS, language: detectSystemLang()};
}

function OnboardingScreen({onFinish}){
  const {t} = useT();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [notifGranted, setNotifGranted] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [permError, setPermError] = useState("");

  function finish(){
    onFinish(name.trim());
  }

  async function askNotifications(){
    setPermError("");
    try{
      const p = await LocalNotifications.requestPermissions();
      setNotifGranted(p.display === "granted");
    }catch(e){
      setPermError(t('onboarding.notifError'));
    }
  }

  async function askContacts(){
    setPermError("");
    try{
      // Igual que en Añadir persona: llamamos a getContacts directamente para que
      // el propio plugin gestione el permiso en un solo paso.
      await Contacts.getContacts({ projection:{ name:true } });
      setContactsGranted(true);
    }catch(e){
      setPermError(t('onboarding.contactsError'));
    }
  }

  return (
    <div className="screen-enter" style={{height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", padding:"32px 28px", paddingTop:"calc(32px + env(safe-area-inset-top, 0px))"}}>
      {step===0 && (
        <div style={{textAlign:"center"}}>
          <img src="icon-foreground.png" alt="" width={120} height={120} style={{margin:"0 auto 22px", display:"block"}} />
          <h1 className="font-display" style={{fontSize:"1.6rem", fontWeight:600, margin:"0 0 12px"}}>{t('onboarding.welcomeTitle')}</h1>
          <p style={{fontSize:".92rem", color:"var(--ink-soft)", lineHeight:1.6, margin:"0 0 6px"}}>
            {t('onboarding.welcomeBody1')}
          </p>
          <p style={{fontSize:".92rem", color:"var(--ink-soft)", lineHeight:1.6, margin:0}}>
            {t('onboarding.welcomeBody2')}
          </p>
          <button onClick={()=>setStep(1)} className="btn-primary" style={{width:"100%", padding:"14px 0", marginTop:32, fontSize:".95rem"}}>
            {t('onboarding.continue')}
          </button>
        </div>
      )}

      {step===1 && (
        <div style={{textAlign:"center"}}>
          <h1 className="font-display" style={{fontSize:"1.5rem", fontWeight:600, margin:"0 0 10px"}}>{t('onboarding.nameTitle')}</h1>
          <p style={{fontSize:".88rem", color:"var(--ink-soft)", margin:"0 0 24px"}}>
            {t('onboarding.nameBody')}
          </p>
          <input
            autoFocus
            className="input"
            style={{textAlign:"center", fontSize:"1.05rem"}}
            placeholder={t('onboarding.namePlaceholder')}
            value={name}
            onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") setStep(2); }}
          />
          <button onClick={()=>setStep(2)} className="btn-primary" style={{width:"100%", padding:"14px 0", marginTop:24, fontSize:".95rem"}}>
            {t('onboarding.continue')}
          </button>
        </div>
      )}

      {step===2 && (
        <div>
          <h1 className="font-display" style={{fontSize:"1.4rem", fontWeight:600, margin:"0 0 8px", textAlign:"center"}}>{t('onboarding.permsTitle')}</h1>
          <p style={{fontSize:".85rem", color:"var(--ink-soft)", margin:"0 0 22px", textAlign:"center", lineHeight:1.5}}>
            {t('onboarding.permsBody')}
          </p>

          <div className="card" style={{padding:14, marginBottom:12, textAlign:"left"}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <div style={{width:38, height:38, borderRadius:"999px", background:"var(--sage-soft)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage-deep)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{margin:0, fontWeight:700, fontSize:".88rem"}}>{t('onboarding.notifTitle')}</p>
                <p style={{margin:"2px 0 0", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('onboarding.notifBody')}</p>
              </div>
              <button onClick={askNotifications} className="segbtn" data-active={notifGranted} style={{flexShrink:0, padding:".5rem .8rem"}}>
                {notifGranted ? t('settings.activated') : t('settings.activate')}
              </button>
            </div>
          </div>

          <div className="card" style={{padding:14, marginBottom:24, textAlign:"left"}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <div style={{width:38, height:38, borderRadius:"999px", background:"var(--terracotta-soft)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <p style={{margin:0, fontWeight:700, fontSize:".88rem"}}>{t('onboarding.contactsTitle')} <span style={{fontWeight:400, color:"var(--ink-faint)"}}>{t('onboarding.contactsOptional')}</span></p>
                <p style={{margin:"2px 0 0", fontSize:".78rem", color:"var(--ink-soft)"}}>{t('onboarding.contactsBody')}</p>
              </div>
              <button onClick={askContacts} className="segbtn" data-active={contactsGranted} style={{flexShrink:0, padding:".5rem .8rem"}}>
                {contactsGranted ? t('onboarding.permitted') : t('onboarding.permit')}
              </button>
            </div>
          </div>

          {permError && (
            <p style={{margin:"0 0 16px", padding:"10px 12px", background:"var(--terracotta-soft)", color:"var(--terracotta-deep)",
                  borderRadius:".8rem", fontSize:".8rem", fontWeight:600, textAlign:"center"}}>
              {permError}
            </p>
          )}

          <button onClick={finish} className="btn-primary" style={{width:"100%", padding:"14px 0", fontSize:".95rem"}}>
            {t('onboarding.start')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [contacts, setContacts] = useState(loadContacts);
  const [screen, setScreen] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [toast, setToast] = useState("");
  const [backupOpen, setBackupOpen] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [homeHasOverlay, setHomeHasOverlay] = useState(false);
  const [homeCloseSignal, setHomeCloseSignal] = useState(0);
  const [settings, setSettings] = useState(loadSettings);
  const lang = settings.language || "es";
  const t = useMemo(()=> (key, ...args) => translate(lang, key, ...args), [lang]);
  const langCtx = useMemo(()=>({ lang, setLang:(l)=>updateSetting("language", l), t }), [lang, t]);

  // Los roles personalizados no se guardan aparte: se derivan de los roles que
  // ya están en uso en los contactos, así el filtro y el selector siempre
  // reflejan lo que realmente existe (y desaparecen solos si ya no se usan).
  const customRoles = useMemo(()=>{
    const set = new Set();
    for(const c of contacts) if(c.role && !BUILT_IN_ROLES.includes(c.role)) set.add(c.role);
    return [...set];
  }, [contacts]);

  useEffect(()=>{
    try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }catch(e){ /* no-op: modo offline sin persistencia disponible */ }
  },[settings]);

  useEffect(()=>{
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)); }catch(e){ /* no-op: modo offline sin persistencia disponible */ }
    scheduleNotifications(contacts, lang);
  },[contacts, lang]);

  useEffect(()=>{
    if(!toast) return;
    const hasAction = typeof toast === "object" && toast.actionLabel;
    const t = setTimeout(()=>setToast(""), hasAction ? 4000 : 2200);
    return ()=>clearTimeout(t);
  },[toast]);

  // Botón/gesto "atrás" del sistema: primero cierra hojas abiertas, luego vuelve
  // a Inicio pantalla por pantalla, y solo si ya está en Inicio pregunta si salir.
  // Sin esto, Capacitor cierra la app de inmediato (no hay historial real que "deshacer").
  useEffect(()=>{
    let handle;
    CapApp.addListener('backButton', () => {
      if(confirmExitOpen){ setConfirmExitOpen(false); return; }
      if(backupOpen){ setBackupOpen(false); return; }
      if(homeHasOverlay){ setHomeCloseSignal(s=>s+1); return; }
      if(screen === "edit"){ setScreen("detail"); return; }
      if(screen !== "home"){ setScreen("home"); return; }
      setConfirmExitOpen(true);
    }).then(h => { handle = h; }).catch(()=>{ /* plugin no disponible fuera de Android/iOS */ });
    return () => { handle && handle.remove(); };
  }, [screen, backupOpen, confirmExitOpen, homeHasOverlay]);

  // Tocar una notificación abre la ficha del contacto, desde donde se registra
  // la conversación (y así se apaga el aviso fijo de prioridad Alta).
  useEffect(()=>{
    let handle;
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const id = action?.notification?.extra?.contactId;
      if(id == null) return;
      setSelectedId(id); setScreen("detail");
    }).then(h => { handle = h; }).catch(()=>{ /* plugin no disponible fuera de Android/iOS */ });
    return () => { handle && handle.remove(); };
  }, []);

  function updateSetting(key, value){
    setSettings(s=>({...s, [key]:value}));
  }

  function deleteAllData(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    setContacts([]);
    setScreen("home");
    setToast(t('app.allDeleted'));
  }

  const selected = contacts.find(c=>c.id===selectedId) || null;

  function markToday(id){
    const c = contacts.find(c=>c.id===id);
    const today = todayISO();
    setContacts(cs=>cs.map(c=> c.id===id
      ? {...c, history:[{date:today, note:""}, ...((c.history||[]).filter(h=>h.date!==today))].slice(0,12)}
      : c));
    if(c) setToast(t('app.loggedToday', c.name.split(" ")[0]));
  }

  function logCall(id, note){
    const c = contacts.find(c=>c.id===id);
    const today = todayISO();
    const trimmedNote = (note || "").trim();
    setContacts(cs=>cs.map(c=>{
      if(c.id!==id) return c;
      return {...c, history:[{date:today, note:trimmedNote}, ...((c.history||[]).filter(h=>h.date!==today))].slice(0,12)};
    }));
    if(c) setToast(t('app.callLogged', c.name.split(" ")[0]));
  }

  function addContact(data){
    const nextId = Math.max(0, ...contacts.map(c=>c.id), 0) + 1;
    setContacts(cs=>[{ id:nextId, name:data.name, phone:data.phone || "", photo:data.photo || "", role:data.role, priority:data.priority,
                        birthday:data.birthday || null, remind:settings.defaultRemind, notif:true,
                        notes:data.notes || "", history:[{date:todayISO(), note:""}], freq:data.freq || settings.defaultFreq,
                        importantDates:data.importantDates || [] }, ...cs]);
    setToast(t('app.contactAdded', data.name.split(" ")[0]));
    setScreen("home");
  }

  function bulkAssign(ids, patch){
    const idSet = new Set(ids);
    setContacts(cs=>cs.map(c=>idSet.has(c.id) ? {...c, ...patch} : c));
    setToast(t('app.bulkAssigned', ids.length));
  }

  function setNotes(id, notes){
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, notes} : c));
  }

  function setBirthdayNote(id, birthdayNote){
    const c = contacts.find(c=>c.id===id);
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, birthdayNote} : c));
    if(c) setToast(birthdayNote ? t('app.birthdayNoteSaved', c.name.split(" ")[0]) : t('app.birthdayNoteDeleted'));
  }

  function updateContact(id, data){
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, ...data} : c));
    setToast(t('app.changesSaved'));
    setScreen("detail");
  }

  function deleteContact(id){
    const idx = contacts.findIndex(c=>c.id===id);
    if(idx===-1) return;
    const c = contacts[idx];
    setContacts(cs=>cs.filter(c=>c.id!==id));
    setScreen("home");
    setToast({
      text: t('app.contactDeleted', c.name.split(" ")[0]),
      actionLabel: t('app.undo'),
      onAction: () => {
        setContacts(cs=>{
          const copy = [...cs];
          copy.splice(Math.min(idx, copy.length), 0, c);
          return copy;
        });
        setToast(t('app.contactRestored'));
      },
    });
  }

  function snoozeContact(id, days){
    const c = contacts.find(c=>c.id===id);
    const until = isoDaysFromNow(days);
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, snoozedUntil:until} : c));
    if(c) setToast(t('app.snoozed', c.name.split(" ")[0], formatDateEs(until, lang)));
  }

  function cancelSnooze(id){
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, snoozedUntil:null} : c));
    setToast(t('app.snoozeCancelled'));
  }

  function addImportantDate(id, data){
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, importantDates:[...(c.importantDates||[]), data]} : c));
    setToast(t('app.dateAdded', data.label));
  }

  function deleteImportantDate(id, dateId){
    setContacts(cs=>cs.map(c=>c.id===id ? {...c, importantDates:(c.importantDates||[]).filter(d=>d.id!==dateId)} : c));
    setToast(t('app.dateDeleted'));
  }

  if(!settings.onboarded){
    return (
      <LangContext.Provider value={langCtx}>
        <div className={`app-root ${settings.theme==="dark" ? "theme-dark" : ""}`}>
          <OnboardingScreen onFinish={(name)=>{
            setSettings(s=>({...s, userName: name || t('app.defaultName'), onboarded:true}));
          }} />
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={langCtx}>
    <div className={`app-root ${settings.theme==="dark" ? "theme-dark" : ""}`}>
      <div style={{flex:1, position:"relative", minHeight:0}}>
        {screen==="home" && (
          <HomeScreen
            contacts={contacts}
            filter={filter}
            setFilter={setFilter}
            onOpenContact={(id)=>{ setSelectedId(id); setScreen("detail"); }}
            onOpenSettings={()=>setScreen("settings")}
            onSetBirthdayNote={setBirthdayNote}
            onBulkAssign={bulkAssign}
            onLogCall={logCall}
            onToast={setToast}
            onAdd={()=>setScreen("add")}
            userName={settings.userName}
            compact={settings.compact}
            customRoles={customRoles}
            onOverlayChange={setHomeHasOverlay}
            closeSignal={homeCloseSignal}
          />
        )}
        {screen==="detail" && selected && (
          <DetailScreen
            contact={selected}
            onBack={()=>setScreen("home")}
            onEdit={()=>setScreen("edit")}
            onMarkedToday={()=>markToday(selected.id)}
            onSetRemind={(d)=>setContacts(cs=>cs.map(c=>c.id===selected.id?{...c,remind:d}:c))}
            onToggleNotif={()=>setContacts(cs=>cs.map(c=>c.id===selected.id?{...c,notif:!c.notif}:c))}
            onSetNotes={(notes)=>setNotes(selected.id, notes)}
            onSetBirthdayNote={(note)=>setBirthdayNote(selected.id, note)}
            onSnooze={(days)=>snoozeContact(selected.id, days)}
            onCancelSnooze={()=>cancelSnooze(selected.id)}
            onAddImportantDate={(data)=>addImportantDate(selected.id, data)}
            onDeleteImportantDate={(dateId)=>deleteImportantDate(selected.id, dateId)}
          />
        )}
        {screen==="edit" && selected && (
          <EditContactScreen
            contact={selected}
            onSave={(data)=>updateContact(selected.id, data)}
            onCancel={()=>setScreen("detail")}
            onDelete={()=>deleteContact(selected.id)}
            customRoles={customRoles}
          />
        )}
        {screen==="add" && (
          <AddScreen onSave={addContact} onCancel={()=>setScreen("home")} defaultFreq={settings.defaultFreq} customRoles={customRoles} />
        )}
        {screen==="settings" && (
          <SettingsScreen
            settings={settings}
            onUpdate={updateSetting}
            onBack={()=>setScreen("home")}
            onOpenBackup={()=>setBackupOpen(true)}
            onDeleteAll={deleteAllData}
          />
        )}
        {toast && (
          <div className="toast" style={typeof toast === "object" ? {display:"flex", alignItems:"center", gap:10} : undefined}>
            <span>{typeof toast === "string" ? toast : toast.text}</span>
            {typeof toast === "object" && toast.actionLabel && (
              <button onClick={()=>{ toast.onAction(); setToast(""); }}
                style={{fontWeight:800, color:"var(--cream)", textDecoration:"underline", flexShrink:0}}>
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
        {backupOpen && (
          <BackupSheet
            contacts={contacts}
            onClose={()=>setBackupOpen(false)}
            onCopied={()=>setToast(t('app.backupCopied'))}
            onImport={(parsed)=>{ setContacts(parsed.map(normalizeContact)); setBackupOpen(false); setToast(t('app.backupImported')); }}
          />
        )}
        {confirmExitOpen && (
          <div className="sheet-backdrop" style={{position:"absolute", inset:0, background:"rgba(54,47,36,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60}}
               onClick={()=>setConfirmExitOpen(false)}>
            <div className="card sheet-pop" onClick={e=>e.stopPropagation()} style={{width:"80%", padding:"20px 18px", textAlign:"center"}}>
              <p style={{fontWeight:700, margin:"0 0 6px", fontSize:".95rem"}}>{t('app.exitTitle')}</p>
              <p style={{margin:"0 0 18px", fontSize:".82rem", color:"var(--ink-soft)"}}>{t('app.exitBody')}</p>
              <div style={{display:"flex", gap:10}}>
                <button onClick={()=>setConfirmExitOpen(false)} className="segbtn" style={{flex:1, textAlign:"center"}}>{t('common.cancel')}</button>
                <button onClick={()=>CapApp.exitApp()} className="btn-primary" style={{flex:1, padding:"10px 0", fontSize:".85rem"}}>{t('app.exit')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </LangContext.Provider>
  );
}
