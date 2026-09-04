# Onboarding y consentimiento

Pantallas: Términos → Datos → Transparencia → Ciberseguridad → Cuenta → Consentimiento granular → Perfil → Grupo.

Progreso local (`sentinel.onboarding`) antes de la cuenta; servidor (`users.onboarding.step`) después. Sobrevive reinicios.

Evidencia: `consents` (append-only): documento, versión, aceptado, timestamp cliente/servidor, idioma, plataforma, versión app. Re-consentimiento cuando cambia `TERMS_VERSION`.
