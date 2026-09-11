// Product copy (Spanish) and the Sentinel Orb function map.
export type OrbFamilyKey = "seguridad" | "coordinacion" | "navegacion" | "movilidad" | "inteligencia" | "personas" | "sistema";

export type OrbTool = { key: string; label: string; icon: string; capability?: string };
export type OrbFamily = { key: OrbFamilyKey; label: string; icon: string; tone: "cyan" | "green" | "blue" | "amber" | "violet" | "red"; tools: OrbTool[] };

export const ORB_FAMILIES: OrbFamily[] = [
  { key: "seguridad", label: "Seguridad", icon: "shield-checkmark", tone: "red", tools: [
    { key: "todo_bien", label: "¿Todo bien?", icon: "help-circle" },
    { key: "incidencia", label: "Incidencia", icon: "warning" },
    { key: "v16", label: "V16", icon: "flash" },
    { key: "emergencia", label: "Emergencia", icon: "alert-circle" },
    { key: "trayecto", label: "Trayecto protegido", icon: "walk" },
    { key: "road_reality", label: "Road Reality", icon: "videocam", capability: "roadReality" },
    { key: "camara", label: "Cámara", icon: "camera" },
  ] },
  { key: "coordinacion", label: "Coordinación", icon: "people-circle", tone: "green", tools: [
    { key: "quedar", label: "Quedar", icon: "calendar", capability: "meetings" },
    { key: "convoy", label: "Convoy", icon: "car-sport", capability: "convoy" },
    { key: "seguidme", label: "Seguidme", icon: "navigate", capability: "convoy" },
    { key: "compartir", label: "Compartir", icon: "share-social" },
    { key: "reagrupar", label: "Reagrupar", icon: "git-merge" },
    { key: "invitados", label: "Invitados", icon: "person-add" },
  ] },
  { key: "navegacion", label: "Navegación", icon: "compass", tone: "blue", tools: [
    { key: "navegar", label: "Navegar", icon: "navigate-circle" },
    { key: "pin", label: "Pin", icon: "location" },
    { key: "ir_persona", label: "Ir a persona", icon: "person" },
    { key: "casa", label: "Casa", icon: "home" },
    { key: "lugares", label: "Lugares", icon: "bookmark" },
    { key: "rutas", label: "Rutas habituales", icon: "repeat" },
  ] },
  { key: "movilidad", label: "Movilidad", icon: "speedometer", tone: "amber", tools: [
    { key: "anti_congestion", label: "Anti-congestión", icon: "trending-down", capability: "antiCongestion" },
    { key: "ahorro", label: "Ahorro de combustible", icon: "leaf", capability: "advancedMobility" },
    { key: "sostenible", label: "Movilidad sostenible", icon: "bicycle", capability: "advancedMobility" },
    { key: "multimodal", label: "Alternativas multimodales", icon: "train", capability: "advancedMobility" },
    { key: "cotidianas", label: "Rutas cotidianas", icon: "calendar-number", capability: "advancedMobility" },
  ] },
  { key: "inteligencia", label: "Inteligencia", icon: "sparkles", tone: "violet", tools: [
    { key: "patrones", label: "Patrones", icon: "analytics", capability: "familyMetrics" },
    { key: "metricas", label: "Métricas", icon: "stats-chart", capability: "familyMetrics" },
    { key: "historial", label: "Historial", icon: "time" },
    { key: "calidad", label: "Calidad de datos", icon: "checkmark-done" },
    { key: "confianza", label: "Confianza", icon: "ribbon" },
    { key: "incidencias", label: "Incidencias", icon: "list" },
  ] },
  { key: "personas", label: "Personas", icon: "people", tone: "cyan", tools: [
    { key: "miembros", label: "Miembros", icon: "people" },
    { key: "grupos", label: "Grupos", icon: "albums" },
    { key: "invitados_p", label: "Invitados", icon: "person-add" },
    { key: "responsables", label: "Responsables", icon: "shield" },
    { key: "permisos", label: "Permisos", icon: "key" },
  ] },
  { key: "sistema", label: "Sistema", icon: "settings", tone: "amber", tools: [
    { key: "perfil", label: "Perfil", icon: "person-circle" },
    { key: "privacidad", label: "Privacidad", icon: "lock-closed" },
    { key: "plan", label: "Plan", icon: "diamond" },
    { key: "integraciones", label: "Integraciones", icon: "extension-puzzle" },
    { key: "accesibilidad", label: "Accesibilidad", icon: "accessibility" },
    { key: "ajustes", label: "Ajustes", icon: "options" },
  ] },
];

export const AVATAR_COLORS = ["#22D3EE", "#60A5FA", "#34D399", "#A78BFA", "#FBBF24", "#FB7185", "#F97316"];
export const SYMBOLS = ["pin", "shield", "car", "star", "heart"];

export const PERSON_ACTIONS = [
  { key: "estado", label: "Estado", icon: "pulse" },
  { key: "eta", label: "ETA", icon: "time" },
  { key: "todo_bien", label: "¿Todo bien?", icon: "help-circle" },
  { key: "ir_hasta", label: "Ir hasta esta persona", icon: "navigate" },
  { key: "reunirse", label: "Reunirse", icon: "calendar" },
  { key: "seguir", label: "Seguir", icon: "footsteps" },
  { key: "camino_casa", label: "Camino a casa", icon: "home" },
  { key: "mensaje", label: "Mensaje", icon: "chatbubble" },
  { key: "llamar", label: "Llamar", icon: "call" },
  { key: "actividad", label: "Actividad reciente", icon: "list" },
  { key: "camara", label: "Cámara", icon: "camera" },
  { key: "comparticion", label: "Compartición", icon: "share-social" },
  { key: "incidencia", label: "Incidencia", icon: "warning" },
];

export const ONBOARDING = {
  terms: {
    title: "Antes de empezar, ¿aceptas las condiciones de uso de Sentinel?",
    body: "Sentinel es una aplicación de movilidad y seguridad cuyas funciones dependen de los permisos que tú concedes de forma explícita.",
    primary: "Aceptar y continuar", secondary: "Leer condiciones completas",
  },
  data: {
    title: "¿Quieres saber cómo utiliza Sentinel tus datos?",
    body: "Según los permisos que actives, distintas funciones pueden tratar tu ubicación actual o aproximada, rutas, ETA, estado de movimiento, modo de movilidad, eventos de seguridad, cámara, micrófono, información del dispositivo, eventos V16 y métricas de movilidad. El acceso depende siempre de permisos explícitos y de la compartición que configures.",
    primary: "Entendido", secondary: "Revisar información completa",
  },
  transparency: {
    title: "Sentinel no utiliza funciones ocultas",
    body: "Siempre podrás saber qué está accediendo Sentinel, qué comparte, con quién, por qué, desde cuándo y hasta cuándo.",
    bullets: ["Sin seguimiento oculto", "Sin activación oculta de la cámara", "Sin activación oculta del micrófono",
      "Sin acceso remoto invisible a cámaras", "Sin permisos temporales permanentes"],
    primary: "Entendido",
  },
  security: {
    title: "Protegemos tus datos y tus conexiones",
    body: "Comunicaciones cifradas cuando es técnicamente aplicable, sesiones autenticadas, permisos temporales y revocables, historial de accesos, expiración de sesión, tokens seguros y separación entre datos personales, de grupo y temporales.",
    primary: "Entendido", secondary: "Más información",
  },
};

export const EDUCATION = {
  miniorb: "Este es tu grupo. Tócalo para abrir el orbe de miembros.",
  orb: "Este es el Orbe Sentinel. Desde aquí accedes a las herramientas según el contexto.",
  privacy: "Aquí puedes ver exactamente qué compartes y con quién.",
};
