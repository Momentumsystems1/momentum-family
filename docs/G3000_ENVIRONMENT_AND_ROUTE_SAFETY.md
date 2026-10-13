# G3000 / BAYMOVE — Environmental & Route Safety (product requirement)
Status: **APPROVED AS REQUIREMENT / NOT IMPLEMENTED**.
Decision date: 2026-10-14.
Product name: **BAYMOVE** (working brand); Google Cloud project: **G3000**.
Source of truth: recovered branch `recovery/my-cluster-core-20261013`.
This specification supersedes historical feature exclusions in `docs/PRODUCT_SPEC.md` **only for future roadmap**; it does not claim implementation or change the existing production screen flows.

## 1. Goal
Proactive, consent-based environmental and route safety for family members, senior relatives, children and travellers. A profile-specific risk and route context system, **not** a generic weather screen, a diagnosis, or a guarantee of safety.

Four independent contexts:
1. **Current position**: risk relevant to a consenting member where they are.
2. **Planned route / departure**: time-matched predicted conditions along an actual route (not just the destination).
3. **Saved recurrent journeys**: anticipate material changes before commute, school run, sports, travel, etc.
4. **Group safety**: send selected alerts to authorised guardians/family members, respecting each member's consent and role.

## 2. Core user stories / alert classes

| Risk | Signals | Intent / example | Limitations |
|---|---|---|---|
| Poor air quality | Air Quality API: AQI, PM2.5/PM10, pollutants, current + forecast (up to 96 h) | "Calidad del aire prevista desfavorable en la zona habitual" | No individual clinical evaluation; respect region coverage |
| Pollen and seasonal allergies | Pollen API: pollen types / tree, grass, weeds, daily forecast up to 5 days | "Polen elevado mañana cerca del colegio, si activaste este aviso" | Species coverage varies; no allergy diagnosis |
| Heat, dehydration, sun exposure | Weather API: feels-like temp, heat index, UV, duration of journey | "Se espera más calor: considera llevar agua" | Generic, non-medical phrasing |
| Sudden cooling / cold | Weather API: forecast temp, feels-like, wind chill, difference from routine baseline | "Temperatura sensiblemente más baja que en tu trayecto habitual: lleva abrigo" | Require meaningful, time-matched change |
| Strong wind gusts for motorbike / bike | Weather API: gust speed/direction, weather alert polygons, route/time | "Se prevén rachas intensas en la ruta en moto; revisa condiciones" | Mode-aware; do not assert a road is closed |
| Rain, thunderstorms, hail, fog | Weather API: precip type/probability, thunderstorm prob, visibility; authoritative alerts | "Visibilidad reducida prevista en tu ruta" | Forecast uncertainty; timely update |
| Freezing/icy road potential | Weather API: temperature/precip/ice-related forecast + AEMET/DGT where available | "Posibles condiciones favorables a hielo" | **Never** assert physical road ice confirmed from weather alone. Confirm road closure/ice via official feeds. |
| Rain and historic crash concentration | DGT/NAP and regional authoritative incidents, official accident-concentration segments; weather joined spatially/temporally | "Tramo señalado de riesgo y lluvia prevista" | Do not manufacture risk scores from unrelated data; explain source/date |
| Severe public alerts | Weather API publicAlerts for Spain + optional AEMET CAP | Notify if a valid authoritative advisory intersects origin, destination or sampled route | Preserve source, severity, issued/expiry, polygon, uncertainty |
| Anomalous journey changes | Seasonal/repeated route baseline, departure time, context-aware weather changes | "En el trayecto escolar habitual mañana se esperan fuertes lluvias" | Opt-in, reproducible and configurable |

## 3. Google services / API inventory for project G3000

Enable as needed, with separate keys by **security boundary**, not one key per feature:

### Client application keys (restricted by app identity)
- `G3000_MAPS_ANDROID_API_KEY` → Maps SDK for Android; Android package `com.momentumsystems.baymove` + actual signing SHA-1 (debug/release fingerprints per app, when available).
- `G3000_MAPS_IOS_API_KEY` → Maps SDK for iOS; bundle ID `com.momentumsystems.baymove`.
- `G3000_MAPS_WEB_API_KEY` → Maps JavaScript API; website referrer allowlist, **only if a genuine hosted web map is needed**. The recovered web canvas is currently only a spatial placeholder.

### Backend secret (no key in app or public source)
- `G3000_MAPS_SERVER_API_KEY` → allowlisted REST APIs: **Weather API, Air Quality API, Pollen API, Routes API, Places API (New), Geocoding API**.
- This is **one backend key** for the first integration; split by service or by environment later if risk/usage justifies it.
- API restriction = above allowlist only. Application restriction = backend's fixed egress IP(s) where applicable; if hosted with dynamic IP, plan a suitable secure backend-auth alternative before using the key (OAuth where supported, workload identity or a fixed egress). Never put this key in Expo `EXPO_PUBLIC_*`, frontend, client bundle, or read-only public config.
- The exact Google SDK/API list may be shortened after design; *enabling* an API does not itself require a separate key.
- No separate OAuth client ID for maps data. Google Sign-In, if adopted later, uses a different workflow.
- A Google Cloud project name and an API key are different from an Apple signing credential.

### Complementary non-Google services, **not all required immediately**
- **DGT NAP (DATEX II)**: official road incidents and marked high-risk segments; may require dataset-specific registration or feed onboarding. No universal "DGT API key".
- **AEMET OpenData / CAP**: optional official severe weather advisory corroboration, not a prerequisite for starting with Google Weather publicAlerts (Spain currently covered). If used, create a separate `AEMET_OPENDATA_API_KEY` server secret, track expiration/rotation. AEMET announced a 3-month expiry for new keys in July 2026.
- **TomTom**: optional routing/traffic adapter where useful; server-only `TOMTOM_API_KEY`, separate from Google.
- **Firebase**: mobile push via FCM and app registration when we implement notifications. This is **not** another Google Maps API key. Keep server-side sending identity in secure cloud IAM / secret manager; never upload service-account JSON to GitHub.
- **Google Gemini**: optional future language generation, not required to classify hazards.

### Services we DO NOT need to enable merely for this feature
- Solar API, Maps 3D SDK for Android, Map Management API. Weather/Air Quality/Pollen are independently available and need no "enable all" step.

## 4. System flow (target, not implemented)

Mobile location + permissions → authenticated API → route samples and ETA →
environmental provider adapters (Weather, Air Quality, Pollen) + DGT official road sources →
time/location matching → deterministic candidate generation → rules and data confidence →
deduplicated, rate-limited notification → user's push + optionally authorised circle.

The engine must distinguish:
- **official active alert** (cite agency),
- **forecast probability / possible risk** (with data timestamp + provider),
- **historic risk segment** (with source date; not a current incident),
- **confirmed road status** (current official incident),
- **stale/unavailable feed** (show unavailable; never fabricate or suppress critical uncertainty).

Alert object design: id, memberId, guardianRecipients[], ruleId, riskType,
severity, confidence, mode, routeId?, geometry?, validFrom, validUntil,
observedAt, provider, sourceUrl?, officialAlertId?, dedupeKey, rationale,
actionText, deliveryStatus, acknowledgedAt?; no raw health diagnosis in shared payload.

Decision rules: configurable preferences by family and travel mode; thresholds are proposals requiring validation with real data and official agency guidance. Do not hardcode medically definitive thresholds or a claim that any route is safe.

## 5. Personalization / privacy
- Granular explicit opt-in for live location, stored routes, environmental alerts, guardian sharing, vulnerable-person-specific alert preferences and background tracking (if ever implemented).
- "Asthma, allergies, elderly relative, child" are **user story examples**, not automatic labels. Prefer non-diagnostic preference flags (e.g., `air_quality_alerts: true`, `pollen_alerts: true`) over storing medical diagnoses.
- Health data and minors are especially sensitive. Conduct GDPR privacy/security review, appropriate consent/guardian authorisation, data minimization and retention schedule before launch.
- Sensitive warnings by default notify the person's device only; an authorised circle receives them only under explicit settings and consent.
- Provide pause, remove and history controls; avoid passive family surveillance.

## 6. Alert UX and anti-noise
- Preview before departure: route-dependent wind, rain/fog, AQI/pollen, UV/temp changes; a short bullet explanation and source time.
- At departure and on route: only meaningful/new adverse changes; suppress repeats by unique incident + route/time window. No distraction-causing notifications while driving; queue for safe use / audible brief if legal and opted in.
- Routine departure reminder: gentle weather/pack appropriately alert once; not a recurring alarm for benign conditions.
- Color/priority categories: information (e.g. extra water), preventive warning (e.g. gusts), verified authority severe alert.
- Offline/unknown: display last timestamp and say that an update is not available rather than imply current safety.

## 7. Efficiency and cost control
- Event/itinerary-driven requests rather than polling every GPS movement.
- Cache by geospatial cell + forecast time bucket; sample enough points along a route to catch local hazards without unnecessary calls.
- Deduplicate at family/route level where allowed by licensing, throttle notifications, TTL suited to source update cadence, respect Google Maps Platform EEA terms and caching/display rules.
- Set **billing budgets**, usage alerting and service quotas before enabling sustained polling. Budgets are not automatic spending shutoffs.
- Never enable Solar/3D "just in case"; turn off services not used.
- Keep Google frontend Maps key separate from backend environmental and routing key.

## 8. Acceptance tests (not yet done)
1. Spain: weather alert from agency overlaps a planned route → correct severity, source, expiry, and recipient.
2. Adverse AQI/PM near a consenting member → informational alert with provider and local timestamp; other members cannot infer health details.
3. Daily saved trip with substantial forecast temperature change → single appropriate reminder, no spam.
4. Motorbike journey with high wind gust forecast → clear conditional warning before departure, not an assertion of accident risk certainty.
5. Suspected icy conditions → label as *potential*; only official highway info can confirm road ice/cut.
6. Pollen data unavailable → "sin datos", no green/healthy fabricated status.
7. Offline / provider down / budget exceeded → graceful degradation, never fabricate safe conditions.
8. Revoked permission or member removal → immediately stop personal notifications and background jobs.
9. Demonstrate costs over 100, 1,000 and 10,000 users using real measured call frequency; do not assume unlimited free tiers.

## 9. Execution priority
P1: recover real map, login, family/group, consent, location.
P2: weather + air quality + pollen provider adapters; display current conditions and sources.
P3: route-aware and saved journey warnings, controlled scheduling & push.
P4: DGT/AEMET official road enrichment, risk calibration and safety tests.
P5: sensor-based accident detection / continuous background monitoring after core reliability proof.

## Authoritative documentation
- https://developers.google.com/maps/documentation/weather/overview
- https://developers.google.com/maps/documentation/weather/weather-alerts
- https://developers.google.com/maps/documentation/weather/coverage
- https://developers.google.com/maps/documentation/air-quality/overview
- https://developers.google.com/maps/documentation/pollen/overview
- https://developers.google.com/maps/documentation/routes/
- https://developers.google.com/maps/api-security-best-practices
- https://opendata.aemet.es/dist/
- https://opendata.aemet.es/centrodedescargas/novedades
- https://nap.dgt.es/es/dataset
