# Modelo de datos (Mongo)

users, sessions, consents, permission_events, plans, billing_intents, permission_requests, groups, members, invitations, positions (TTL 30 d), positions_latest, events, meetings, convoys, camera_requests. Borrados: soft (`deleted_at`, `status=removed`).
