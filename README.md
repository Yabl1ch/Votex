# Votex

> **Votex** — Автоматизированный инструмент развертывания неуязвимой VPN-инфраструктуры на чистый VPS с многоуровневым харднингом, защитой от ботов, устойчивостью к ТСПУ/DPI и встроенной умной маршрутизацией (Smart Routing).

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Phase 1: Completed](https://img.shields.io/badge/Phase%201-Completed%20%26%20Verified-22c55e.svg)](ROADMAP.md)
[![Platform: Linux VPS](https://img.shields.io/badge/Platform-Ubuntu%20%7C%20Debian-4ade80.svg)](scripts/votex-install.sh)
[![Tests: Passing](https://img.shields.io/badge/Tests-16%2F16%20Passing-brightgreen.svg)](tests/)

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
| **Фаза 2** | Инициализация ядра Tauri v2 и нативного SSH-модуля (Rust) | Запланирована | Rust Core, потоковый SSH терминал, AES-GCM Vault |
| **Фаза 3** | Фронтенд и дизайн-система `organic-glass-bento-ui` | Запланирована | Bento Grid, стеклянные компоненты, SVG-иконки |
| **Фаза 4** | Реализация экранов, бизнес-логики и бенчмарков | Запланирована | Provisioning, Dashboard, Reports, Security |
| **Фаза 5** | Релизная сборка `.exe`, публикация на GitHub и выпуск MVP | Запланирована | Релизный Windows бинарник, GitHub Release v1.0.0 |

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

## Тестирование и верификация (Quality Assurance)

В репозитории реализован автоматический тестовый набор на Python 3 (`tests/`):

- `tests/test_votex_install_syntax.py`:
  - Проверка синтаксиса bash-скрипта через `bash -n scripts/votex-install.sh`.
  - Валидация наличия всех директив харднинга (sysctl, fail2ban, ufw, systemd).
  - Проверка отсутствия неразрешенных Unicode-эмодзи (соответствие регламенту).
- `tests/test_subscription_service.py`:
  - Тестирование генерации Base64-подписки и парсинг всех 5 протокольных ссылок.
  - Тестирование генерации JSON-профиля со Smart Routing, DNS, Burst Observatory и фрагментацией TLS.
  - Тестирование встроенного HTTP-сервера (проверка ответов 404 на некорректные токены и 200 на валидные запросы).
- `tests/test_benchmark_report.py`:
  - Валидация схемы структурированного JSON-отчета `/var/log/votex-report.json`.

Запуск тестов:
```powershell
python tests/run_tests.py
```

---

## Лицензия

Проект распространяется под открытой лицензией MIT. Подробности см. в файле [LICENSE](LICENSE).
