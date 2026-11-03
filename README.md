# Votex

> **Votex** — Автоматизированный инструмент развертывания неуязвимой VPN-инфраструктуры на чистый VPS с многоуровневым харднингом, защитой от ботов, устойчивостью к ТСПУ/DPI, встроенной умной маршрутизацией (Smart Routing) и фирменной десктопной дизайн-системой **organic-glass-bento-ui**.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Phase 1: Completed](https://img.shields.io/badge/Phase%201-Completed%20%26%20Verified-22c55e.svg)](ROADMAP.md)
[![Phase 2: Completed](https://img.shields.io/badge/Phase%202-Completed%20%26%20Verified-22c55e.svg)](ROADMAP.md)
[![Phase 3: Completed](https://img.shields.io/badge/Phase%203-Completed%20%26%20Verified-22c55e.svg)](ROADMAP.md)
[![Platform: Windows Desktop | Linux VPS](https://img.shields.io/badge/Platform-Tauri%20v2%20%7C%20Linux%20VPS-4ade80.svg)](scripts/votex-install.sh)
[![Tests: Passing](https://img.shields.io/badge/Tests-29%2F29%20Passing-brightgreen.svg)](tests/)

---

## Архитектурные принципы

```
                    ПОЛЬЗОВАТЕЛЬСКИЙ ТРАФИК
                               │
                               ▼
                [ DNS-проверка и анализ домена ]
                               │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
     Сегмент РФ          Зарубежный веб / ИИ    Реклама и Мусор
    (.ru, Банки,          (YouTube, Discord,      (Apple Relay,
     Госуслуги)            Gemini, Claude)         BitTorrent)
            │                   │                   │
            ▼                   ▼                   ▼
       [ DIRECT ]          [ PROXY ]           [ BLOCK ]
    Напрямую без VPN    Мультипротокольный      Сброс соединения
    (Макс. скорость,      туннель VPS           (Защита от абуз,
     нет банов банков)   (Обход ТСПУ/DPI)        чистый трафик)
```

- **One-Click Hardening**: Тюнинг ядра Linux (TCP BBR + fq), защита от брутфорса Fail2ban, фаервол UFW с политикой default deny.
- **Мультипротокольный стек All-In-One**: VLESS Reality Vision, VLESS Reality SplitHTTP (xhttp), VLESS Reality gRPC, Hysteria 2 (UDP) и Shadowsocks-2022.
- **Smart Routing (Умная маршрутизация)**: Автоматическое разделение трафика:
  - Российские сервисы, банки и госсайты (`.ru`, `.su`, Yandex, VK, Ozon, Gosuslugi, Сбербанк, Т-Банк) идут напрямую (**Direct**).
  - Заблокированные ресурсы и ИИ-сервисы (Gemini, Claude, OpenAI, YouTube, Discord) идут через зашифрованный туннель (**Proxy**).
  - Реклама, трекеры и BitTorrent блокируются (**Block**).
- **TLS Client Fragmentation**: Фрагментация пакетов на уровне клиента (`packets: 1-3`, `length: 100-200`, `interval: 10-20ms`) для гарантированного обхода сигнатурного анализа ТСПУ/DPI.
- **Burst Observatory**: Клиентский механизм автоматического выбора наименее нагруженного и самого быстрого протокола с бесшовным переключением при попытке блокировки.
- **Легковесный десктоп**: Приложение на базе **Tauri v2 + Rust + React 19 / TypeScript** с фирменной дизайн-системой **organic-glass-bento-ui**.

---

## Статус разработки

| Фаза | Наименование | Статус | Артефакты / Результаты |
|---|---|---|---|
| **Фаза 1** | **Серверный монолит и инфраструктурный харднинг** | **Завершена (100%)** | `scripts/votex-install.sh`, `scripts/sub-service.py`, тесты `tests/` |
| **Фаза 2** | **Инициализация ядра Tauri v2 и нативного SSH-модуля (Rust)** | **Завершена (100%)** | `src-tauri/` (IPC, потоковый SSH, AES-GCM Vault), React 19 UI, тесты |
| **Фаза 3** | **Фронтенд и дизайн-система `organic-glass-bento-ui`** | **Завершена (100%)** | Библиотека Bento-компонентов, CSS-токены, Framer Motion, 6 вкладок, SVG-only |
| **Фаза 4** | Реализация экранов, бизнес-логики и бенчмарков | Запланирована | Сквозная интеграция IPC, глубокая аналитика, фоновые замеры |
| **Фаза 5** | Релизная сборка `.exe`, публикация на GitHub и выпуск MVP | Запланирована | Релизный Windows бинарник, GitHub Release v1.0.0 |

---

## Дизайн-система `organic-glass-bento-ui`

Интерфейс Votex строго следует авторской дизайн-системе `organic-glass-bento-ui`:

### 1. Визуальные константы и токены
- **Холст (Canvas)**: Глубокий обсидиановый фон Deep Forest Obsidian (`#06100C`), холст `#091712`, фирменный точечный паттерн Dot-Matrix (`background-size: 22px 22px`, точечный градиент `radial-gradient(rgba(74, 222, 128, 0.12) 1px, transparent 1px)`).
- **Матовое стекло**: Высокая степень размытия `backdrop-filter: blur(24px) saturate(160%)` и подложка `rgba(15, 34, 26, 0.65)`.
- **Грани и световой блик**: Тонкая граница `rgba(74, 222, 128, 0.18)` с мягким свечением и верхний блик `inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)`.
- **Концентрические радиусы**: Геометрическое правило скруглений $R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$ (внешний радиус карточки `rounded-2xl` 16–20px, внутренние элементы `rounded-xl` 10–12px).
- **Природная изумрудно-мятная палитра**: Акцент `#22C55E`, мятный `#4ADE80`, шалфейный `#86EFAC`, текст `#ECFDF5`. Категорический запрет на дефолтные фиолетовые и синие палитры!
- **Векторная иконографика (SVG-only)**: Чистые иконки Lucide React. Строжайший запрет на Unicode-эмодзи в интерфейсе и коде.

### 2. Библиотека компонентов (`src/components/bento/`)
- **`BentoGrid`**: Модульная адаптивная сетка с парящими отступами от краев окна (`padding: 16px–24px`) и стабильным шагом (`gap: 16px–20px`).
- **`BentoCard`**: Изолированный блок с матовым размытием, верхним бликом и мягким свечением при наведении.
- **`GlassButton`**: Пружинная физика нажатия Framer Motion (`stiffness: 320, damping: 26`), изумрудный градиент и строгое предотвращение нежелательного переноса текста (`whitespace-nowrap`).
- **`GlassInput`**: Поле ввода с мягкой зеленой подсветкой фокуса, поддержкой префиксных и постфиксных иконок, кнопкой скрытия пароля.
- **`StatusBadge` / `GlassBadge`**: Плашка статуса («Online», «Active», «Protected») с двухслойным пульсирующим светодиодным индикатором.
- **`SpeedGauge`**: Радиальный спидометр на базе SVG-арки для визуализации скоростей Download и Upload в Мбит/с.
- **`LatencyBar`**: Горизонтальные сравнительные столбчатые графики задержки (Handshake Latency) для 5 протоколов.
- **`TerminalView`**: Полноценный эмулятор терминала со стеклянной затемненной подложкой, моноширинным шрифтом, автоскроллом, кнопкой быстрого копирования всего вывода и подсветкой синтаксиса этапов `[VOTEX-STEP]` и `[VOTEX-INFO]`.

### 3. Структура экранов приложения
- **Sidebar**: Боковая органическая стеклянная панель навигации с Votex логотипом, плавной индикацией активной вкладки (`framer-motion` `layoutId="activeNavIndicator"`), мини-монитором пинга и статусом защищенного хранилища.
- **6 вкладок с мягкими переходами `AnimatePresence` (fade-in & slide-up)**:
  1. `DashboardPage` (Главная) — Мониторинг VPS, быстрая ссылка на подписку для Happ в 1 клик, пинг, матрица активных протоколов.
  2. `ProvisioningPage` (Мастер установки) — Форма VPS, кнопки валидации и развертывания, живой терминал выполнения скрипта `votex-install.sh`.
  3. `ReportsPage` (Отчёты и бенчмарки скорости) — Спидометр скорости, сравнительные столбчатые графики задержки 5 протоколов, кнопка «Повторить тест скорости».
  4. `SubscriptionPage` (Подписка и маршрутизация) — URL подписки, регенерация токена, интерактивная карта Smart Routing (Direct РФ / Tunnel / Block) и параметры TLS-фрагментации.
  5. `SecurityPage` (Безопасность и UFW) — Статистика отраженных атак Fail2ban, таблица заблокированных IP, матрица портов UFW, параметры ядра Linux и управление службами.
  6. `SettingsPage` (Настройки) — Тайм-аут SSH, выбор темы (Obsidian Deep Forest / Sage Glass), проверка обновлений на GitHub и управление локальным Encrypted Vault.

---

## Серверный скрипт развертывания (`scripts/votex-install.sh`)

Скрипт `scripts/votex-install.sh` представляет собой автономный, идемпотентный и защищенный bash-файл со строгим контролем ошибок (`set -euo pipefail`), выполняющий за один проход:

1. **Pre-flight проверки**:
   - Валидация прав суперпользователя (`EUID == 0`).
   - Определение архитектуры процессора (`x86_64` / `amd64` и `aarch64` / `arm64`).
   - Автоматическое отказоустойчивое определение внешнего IPv4 сервера.
2. **Инфраструктурный харднинг**:
   - Тюнинг ядра в `/etc/sysctl.d/99-votex.conf`: включение алгоритма TCP BBR + fq, защита от SYN-flood (`tcp_syncookies = 1`), защита от IP-спуфинга (`rp_filter = 1`), оптимизация буферов TCP до 16 МБ.
   - Развертывание Fail2ban: джейл для `sshd` на порту 22 (лимит 4 попытки, окно 10 минут, бан на 24 часа через ufw).
   - Настройка фаервола UFW: дефолтный запрет входящих (`default deny incoming`), открытие только белого списка VPN-портов.
3. **Мультипротокольный стек All-In-One**:
   - Автоматическая установка стабильных бинарников Xray-core и Hysteria 2.
   - Генерация ключей X25519 (`xray x25519`), `shortId` (16 hex-символов), UUID клиента, паролей Shadowsocks-2022 и Hysteria 2.
   - Маскировка SNI под `addons.mozilla.org`.
   - Автогенерация самоподписанного TLS-сертификата для Hysteria 2.
   - Настройка systemd-сервисов с автоперезапуском при сбоях (`xray.service`, `hysteria-server.service`).
4. **Служба раздачи подписки (`votex-subscription`)**:
   - Демон на Python 3 (`/etc/votex/sub-service.py`) на порту `18080`, управляемый systemd (`votex-subscription.service`).
   - Эндпоинт со случайным токеном: `GET /sub/{SUBSCRIPTION_TOKEN}`.
   - Обычный запрос: Base64-подписка с 5 протоколами и мета-заголовками (`Profile-Title`, `Subscription-Userinfo`, `Profile-Update-Interval`).
   - Запрос от клиентов Happ / sing-box / v2rayN или с параметром `?format=json`: полный JSON-профиль с `burstObservatory`, умной маршрутизацией и TLS-фрагментацией.
5. **Автоматический бенчмарк**:
   - Замер Handshake Latency до Cloudflare и Google DNS.
   - Замер пропускной способности канала через скачивание блока данных CDN.
   - Генерация отчета `/var/log/votex-report.json` и вывод маркеров `VOTEX_JSON_REPORT_START` / `VOTEX_JSON_REPORT_END` в stdout.

---

## Матрица портов и фаервола (UFW)

Политика фаервола по умолчанию: **Входящий трафик запрещен (`DENY INCOMING`)**, исходящий разрешен (`ALLOW OUTGOING`).

| Порт | Протокол | Назначение / Служба | Защита и маскировка |
|---|---|---|---|
| **22** | TCP | SSH Server | Fail2ban (бан на 24ч при 4 ошибках) |
| **20443** | TCP | VLESS Reality XTLS-Vision | SNI: `addons.mozilla.org`, fallback: 443 |
| **2053** | TCP | VLESS Reality SplitHTTP (xhttp) | SNI: `addons.mozilla.org`, Anti-DPI Chunks |
| **8443** | TCP | VLESS Reality gRPC | SNI: `addons.mozilla.org`, service: `yabl1ch-grpc` |
| **2083** | UDP | Hysteria 2 (QUIC) | Salamander Auth, SNI: `addons.mozilla.org` |
| **2088** | TCP/UDP | Shadowsocks-2022 | Метод: `2022-blake3-aes-128-gcm` |
| **18080** | TCP | Votex Subscription Microservice | Секретный токенизированный путь `/sub/{TOKEN}` |

Все остальные входящие порты заблокированы фаерволом UFW.

---

## Архитектура нативного ядра Tauri v2 и Rust Core

Приложение Votex построено на базе гибридной архитектуры: легковесный веб-интерфейс на React 19 + TypeScript + Tailwind CSS v4 и высокопроизводительный системный бэкенд на Rust с фреймворком **Tauri v2**.

### Контракты IPC-команд Rust

| Команда Tauri IPC | Входные аргументы | Возвращаемое значение | Назначение |
|---|---|---|---|
| `run_provisioning` | `host`, `port`, `username`, `password` | `Result<VotexReport, String>` | Асинхронное подключение по SSH, выполнение `votex-install.sh`, потоковая трансляция логов через событие `ssh-log`, парсинг и сохранение отчета в Vault |
| `test_connection` | `host`, `port` | `Result<ConnectionTestResult, String>` | Быстрый асинхронный TCP-пинг порта 22 с замером задержки рукопожатия до старта настройки |
| `fetch_server_metrics`| `host` | `Result<ServerMetrics, String>` | Опрос доступности портов SSH (22), подписки (18080) и Reality (20443) |
| `get_saved_vps` | — | `Result<Option<VaultRecord>, String>` | Извлечение расшифрованных учетных данных последней успешной конфигурации из Vault |
| `save_saved_vps` | `record: VaultRecord` | `Result<Option<()>, String>` | Принудительное зашифрованное сохранение рекорда в локальный Vault |
| `clear_saved_vps` | — | `Result<(), String>` | Безопасное удаление сохраненных данных VPS с локального диска |
| `run_quick_ping` | `host`, `port?` | `Result<u64, String>` | Измерение текущей сетевой задержки до указанного порта в миллисекундах |

### Защищенное локальное хранилище (Encrypted Vault)

Модуль `src-tauri/src/vault.rs` реализует шифрование данных VPS (IP, порт, токен подписки, URL) по стандарту **AES-256-GCM**:
- Ключ шифрования (32 байта) детерминированно вычисляется через SHA-256 на основе аппаратных данных текущего компьютера пользователя (`COMPUTERNAME`, `USERNAME`, `PROCESSOR_IDENTIFIER` и локальная соль).
- Для каждого сохранения генерируется криптографически стойкий случайный 12-байтный одноразовый вектор (Nonce) через `rand::thread_rng()`.
- Данные защищены от подделки и повреждения 16-байтным тегом аутентификации Poly1305.

---

## Тестирование и верификация (Quality Assurance)

Проект следует принципу непрерывной самопроверки (Self-Verification). В репозитории реализовано три независимых контура тестирования (29/29 тестов проходят):

### 1. Нативное тестирование Rust Core (`src-tauri`):
```powershell
cd src-tauri
cargo test
```
- 8 тестов: шифрование AES-GCM, защита от модификации данных, парсинг маркеров JSON, граничные условия пинга.

### 2. Сборка и проверка типов фронтенда (React 19 + TypeScript):
```powershell
pnpm build
```
- Компиляция TypeScript (`tsc --noEmit`) с флагом `strict: true`.
- Сборка продакшен-бандла Vite + Tailwind CSS v4 без предупреждений и ошибок типов.

### 3. Автоматизированные тесты на Python 3 (`tests/`):
```powershell
python tests/run_tests.py
```
- 21 тест: синтаксис bash, харднинг, запрет эмодзи, токены `organic-glass-bento-ui`, экспорт всех 6 страниц и Bento-компонентов, предотвращение переноса текста (`whitespace-nowrap`).

---

## Лицензия

Проект распространяется под открытой лицензией MIT. Подробности см. в файле [LICENSE](LICENSE).
