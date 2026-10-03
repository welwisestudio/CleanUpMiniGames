# YouTube Playables SDK — Unity Integration Skill

Полноценное руководство по интеграции YouTube Playables SDK в Unity WebGL проекты.
Составлено на основе официальной документации и реального опыта интеграции (включая все допущенные ошибки).

---

## Содержание

1. [Архитектура интеграции](#архитектура)
2. [Файл 1: index.html (WebGL Template)](#indexhtml)
3. [Файл 2: YouTubePlayables.jslib](#jslib)
4. [Файл 3: YouTubePlayablesSDK.cs](#cs-wrapper)
5. [Файл 4: GameController — подключение](#gamecontroller)
6. [Обязательные требования платформы](#требования)
7. [Критические ошибки и ловушки](#ошибки)
8. [Чеклист перед публикацией](#чеклист)

---

## Архитектура

```
index.html
  └─ загружает https://www.youtube.com/game_api/v1  ← ПЕРВЫМ, до любого кода
  └─ вызывает ytgame.game.firstFrameReady()         ← сразу при загрузке страницы
  └─ динамически создаёт <script> с nonce           ← ВАЖНО: нужен nonce для CSP
  └─ загружает Unity

YouTubePlayables.jslib  (Assets/Plugins/WebGL/)
  └─ мост между C# и JS SDK
  └─ все функции через mergeInto(LibraryManager.library, {...})

YouTubePlayablesSDK.cs  (Assets/Scripts/Utilities/)
  └─ MonoBehaviour синглтон, name = "YouTubePlayablesSDK" (обязательно!)
  └─ DllImport только под #if UNITY_WEBGL && !UNITY_EDITOR
  └─ в Editor — no-op или симуляция

GameController.cs
  └─ подписывается на события AudioEnabledChanged, GamePaused, GameResumed
  └─ вызывает YouTubePlayablesSDK.GameReady() после полной инициализации
```

---

## index.html

### Ключевые правила:
- SDK-скрипт — **первый тег `<script>` в `<head>`**, до любого другого JS
- `firstFrameReady()` вызывается сразу после загрузки SDK — **из HTML**, не из C#
- `gameReady()` вызывается из C# когда игра полностью интерактивна
- Динамически создаваемые `<script>` теги **ОБЯЗАТЕЛЬНО** получают `nonce` (CSP YouTube)
- Обработка нулевого viewport на Android: слушать `resize` и проверять `window.innerHeight !== 0`

```html
<!DOCTYPE html>
<html lang="en-us">
<head>
    <meta charset="utf-8">
    <title>{{{ PRODUCT_NAME }}}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%; overflow: hidden;
            background: #000 url('Background.jpg') center/cover no-repeat;
        }
        #game-wrapper { position: absolute; overflow: hidden; }
        #unity-canvas {
            position: absolute; top:0; left:0;
            width:100%; height:100%; display:block;
            background:#000; outline:none;
        }
        /* ... loading screen styles ... */
    </style>

    <!-- ШАГ 1: SDK ПЕРВЫМ, до любого кода -->
    <script src="https://www.youtube.com/game_api/v1"></script>

    <!-- ШАГ 2: firstFrameReady сразу после загрузки SDK -->
    <script>
        if (typeof ytgame !== 'undefined' && ytgame.game) {
            ytgame.game.firstFrameReady();
        }
    </script>
</head>
<body>
    <div id="game-wrapper">
        <canvas id="unity-canvas" tabindex="-1"></canvas>
        <!-- loading screen HTML -->
    </div>

    <script>
        var TARGET_ASPECT = 11 / 16; // порог фиксации соотношения сторон

        function resizeCanvas() {
            var screenW = window.innerWidth;
            var screenH = window.innerHeight;
            // ВАЖНО: на Android WebView viewport может быть 0 при старте
            if (screenH === 0) return;

            var wrapper = document.getElementById('game-wrapper');
            if (screenW / screenH <= TARGET_ASPECT) {
                wrapper.style.cssText =
                    'width:'+screenW+'px;height:'+screenH+'px;left:0;top:0;';
            } else {
                var w = Math.round(screenH * TARGET_ASPECT);
                wrapper.style.cssText =
                    'width:'+w+'px;height:'+screenH+'px;'
                    +'left:'+Math.round((screenW-w)/2)+'px;top:0;';
            }
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Отключить scroll и контекстное меню
        window.addEventListener('wheel', function(e){ e.preventDefault(); }, {passive:false});
        window.addEventListener('contextmenu', function(e){ e.preventDefault(); });

        // ВАЖНО: при динамическом создании <script> нужен nonce для CSP YouTube
        var loaderScript = document.createElement('script');
        loaderScript.src = 'Build/{{{ LOADER_FILENAME }}}';
        loaderScript.nonce = document.querySelector('script[nonce]')?.nonce ?? '';
        loaderScript.onload = function() {
            createUnityInstance(document.getElementById('unity-canvas'), {
                dataUrl:            'Build/{{{ DATA_FILENAME }}}',
                frameworkUrl:       'Build/{{{ FRAMEWORK_FILENAME }}}',
                codeUrl:            'Build/{{{ CODE_FILENAME }}}',
                streamingAssetsUrl: 'StreamingAssets',
                companyName:        '{{{ COMPANY_NAME }}}',
                productName:        '{{{ PRODUCT_NAME }}}',
                productVersion:     '{{{ PRODUCT_VERSION }}}',
                matchWebGLToCanvasSize: true,
            }, function(progress) {
                document.getElementById('progress-bar-fill').style.width
                    = (progress * 100) + '%';
            })
            .then(function(instance) {
                window.unityInstance = instance;
                // скрыть loading screen
                var ls = document.getElementById('loading-screen');
                ls.classList.add('hidden');
                setTimeout(function(){ ls.style.display='none'; }, 600);
                document.getElementById('unity-canvas').focus({preventScroll:true});
            })
            .catch(function(err) {
                if (typeof ytgame !== 'undefined' && ytgame.health) {
                    ytgame.health.logError();
                }
                console.error(err);
            });
        };
        document.body.appendChild(loaderScript);
    </script>
</body>
</html>
```

---

## jslib

Файл: `Assets/Plugins/WebGL/YouTubePlayables.jslib`

### Критически важные нюансы:

**1. `getLanguage()` — это `Promise<string>`, НЕ синхронный вызов.**
Нельзя вернуть строку напрямую в C#. Нужен callback через SendMessage.

**2. Проверять `IN_PLAYABLES_ENV` перед вызовом ads.**
Вне YouTube SDK существует как no-op: `ytgame.ads` определён, но Promise никогда не resolve/reject → игра зависает навсегда.

**3. `logError()` / `logWarning()` — NO параметров** по документации.

**4. `requestRewardedAd(rewardId)` возвращает `Promise<boolean>`.**
`true` = пользователь заработал награду, `false` = не заработал. Promise reject = ошибка, награду не давать.

```javascript
mergeInto(LibraryManager.library, {

    YT_GameReady: function() {
        if (typeof ytgame !== 'undefined' && ytgame.game) {
            ytgame.game.gameReady();
        }
    },

    // ASYNC: getLanguage() возвращает Promise<string>, не строку!
    // Результат приходит через SendMessage callback
    YT_GetLanguageAsync: function() {
        if (typeof ytgame !== 'undefined' && ytgame.system) {
            ytgame.system.getLanguage()
                .then(function(lang) {
                    SendMessage('YouTubePlayablesSDK', 'OnLanguageReceived', lang || 'en');
                })
                .catch(function() {
                    SendMessage('YouTubePlayablesSDK', 'OnLanguageReceived', 'en');
                });
        } else {
            SendMessage('YouTubePlayablesSDK', 'OnLanguageReceived', 'en');
        }
    },

    YT_IsAudioEnabled: function() {
        if (typeof ytgame !== 'undefined' && ytgame.system) {
            return ytgame.system.isAudioEnabled() ? 1 : 0;
        }
        return 1;
    },

    YT_RegisterCallbacks: function() {
        if (typeof ytgame === 'undefined') return;
        if (ytgame.system) {
            ytgame.system.onAudioEnabledChange(function(isEnabled) {
                SendMessage('YouTubePlayablesSDK', 'OnAudioEnabledChanged', isEnabled ? '1' : '0');
            });
            ytgame.system.onPause(function() {
                SendMessage('YouTubePlayablesSDK', 'OnGamePaused', '');
            });
            ytgame.system.onResume(function() {
                SendMessage('YouTubePlayablesSDK', 'OnGameResumed', '');
            });
        }
    },

    YT_SendScore: function(score) {
        if (typeof ytgame !== 'undefined' && ytgame.engagement) {
            ytgame.engagement.sendScore({ value: score });
        }
    },

    // ВАЖНО: проверять IN_PLAYABLES_ENV!
    // Без этого no-op SDK даёт висящий Promise → игра зависает
    YT_RequestInterstitialAd: function() {
        var inYT = typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV;
        if (inYT && ytgame.ads) {
            ytgame.ads.requestInterstitialAd()
                .then(function() {
                    SendMessage('YouTubePlayablesSDK', 'OnInterstitialAdClosed', '1');
                })
                .catch(function() {
                    SendMessage('YouTubePlayablesSDK', 'OnInterstitialAdClosed', '0');
                });
        } else {
            // Вне YouTube — сразу закрываем, иначе Time.timeScale = 0 навсегда
            SendMessage('YouTubePlayablesSDK', 'OnInterstitialAdClosed', '0');
        }
    },

    // rewardId — обязательный параметр, должен быть уникальным per reward type
    // Promise<boolean>: true = заработал, false = не заработал
    YT_RequestRewardedAd: function(rewardIdPtr) {
        var rewardId = UTF8ToString(rewardIdPtr);
        var inYT = typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV;
        if (inYT && ytgame.ads) {
            ytgame.ads.requestRewardedAd(rewardId)
                .then(function(isRewardEarned) {
                    // isRewardEarned: boolean из Promise<boolean>
                    SendMessage('YouTubePlayablesSDK', 'OnRewardedAdResult', isRewardEarned ? '1' : '0');
                })
                .catch(function() {
                    // Ошибка или отклонение — награду НЕ давать
                    SendMessage('YouTubePlayablesSDK', 'OnRewardedAdResult', '0');
                });
        } else {
            // Вне YouTube — simulate success для тестирования
            SendMessage('YouTubePlayablesSDK', 'OnRewardedAdResult', '1');
        }
    },

    // По документации logError/logWarning — без параметров
    YT_LogError: function() {
        if (typeof ytgame !== 'undefined' && ytgame.health) {
            ytgame.health.logError();
        }
    },

    YT_LogWarning: function() {
        if (typeof ytgame !== 'undefined' && ytgame.health) {
            ytgame.health.logWarning();
        }
    },

    // Cloud saves — ОБЯЗАТЕЛЬНО по требованиям платформы
    // saveData принимает строку (JSON), loadData возвращает строку через callback
    YT_SaveData: function(dataPtr) {
        var data = UTF8ToString(dataPtr);
        if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV && ytgame.game) {
            ytgame.game.saveData(data).catch(function() {});
        } else {
            // Fallback для не-YouTube окружения
            try { localStorage.setItem('YT_SAVE', data); } catch(e) {}
        }
    },

    YT_LoadData: function() {
        if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV && ytgame.game) {
            ytgame.game.loadData()
                .then(function(data) {
                    SendMessage('YouTubePlayablesSDK', 'OnLoadDataCompleted', data || '');
                })
                .catch(function() {
                    SendMessage('YouTubePlayablesSDK', 'OnLoadDataCompleted', '');
                });
        } else {
            var saved = '';
            try { saved = localStorage.getItem('YT_SAVE') || ''; } catch(e) {}
            SendMessage('YouTubePlayablesSDK', 'OnLoadDataCompleted', saved);
        }
    }

});
```

---

## C# Wrapper

Файл: `Assets/Scripts/Utilities/YouTubePlayablesSDK.cs`

### Критически важные нюансы:

**1. `gameObject.name = "YouTubePlayablesSDK"` — обязательно!**
SendMessage из JS ищет объект по имени. Если имя не совпадает — callbacks не придут.

**2. `DontDestroyOnLoad` — нужен** если игра перезагружает сцену.

**3. Язык — асинхронный.** `getLanguage()` это Promise, результат приходит в `OnLanguageReceived`.
Значит, язык нельзя читать в `Start()` синхронно. Нужен callback или инициализация с задержкой.

**4. `onPause` — ОБЯЗАТЕЛЬНО остановить Time.timeScale = 0** и сохранить прогресс.

```csharp
using System;
using System.Runtime.InteropServices;
using UnityEngine;

public class YouTubePlayablesSDK : MonoBehaviour
{
    public static YouTubePlayablesSDK Instance { get; private set; }

    // События для подписки из GameController
    public static event Action<bool>   AudioEnabledChanged;
    public static event Action         GamePaused;
    public static event Action         GameResumed;
    public static event Action<string> LanguageReceived;    // async!
    public static event Action<string> LoadDataCompleted;

    private static Action _onInterstitialClosed;
    private static Action _onRewardedSuccess;
    private static Action _onRewardedFail;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void   YT_GameReady();
    [DllImport("__Internal")] private static extern void   YT_GetLanguageAsync();
    [DllImport("__Internal")] private static extern int    YT_IsAudioEnabled();
    [DllImport("__Internal")] private static extern void   YT_RegisterCallbacks();
    [DllImport("__Internal")] private static extern void   YT_SendScore(int score);
    [DllImport("__Internal")] private static extern void   YT_RequestInterstitialAd();
    [DllImport("__Internal")] private static extern void   YT_RequestRewardedAd(string rewardId);
    [DllImport("__Internal")] private static extern void   YT_LogError();
    [DllImport("__Internal")] private static extern void   YT_LogWarning();
    [DllImport("__Internal")] private static extern void   YT_SaveData(string data);
    [DllImport("__Internal")] private static extern void   YT_LoadData();
#endif

    private void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        // Имя ОБЯЗАТЕЛЬНО должно совпадать с именем в SendMessage в jslib
        gameObject.name = "YouTubePlayablesSDK";
        DontDestroyOnLoad(gameObject);

#if UNITY_WEBGL && !UNITY_EDITOR
        YT_RegisterCallbacks();
        YT_GetLanguageAsync(); // запускаем async получение языка
#endif
    }

    public static void GameReady()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_GameReady();
#endif
    }

    // Язык — асинхронный! Подписаться на LanguageReceived
    public static void RequestLanguage()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_GetLanguageAsync();
#else
        // В редакторе — сразу English
        Instance?.OnLanguageReceived("en");
#endif
    }

    public static bool IsAudioEnabled()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        return YT_IsAudioEnabled() == 1;
#else
        return true;
#endif
    }

    public static void SendScore(int score)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_SendScore(score);
#endif
    }

    public static void RequestInterstitialAd(Action onClosed = null)
    {
        _onInterstitialClosed = onClosed;
        Debug.Log("[YT Ads] RequestInterstitialAd");
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_RequestInterstitialAd();
#else
        Debug.Log("[YT Ads] Interstitial skipped (Editor)");
        onClosed?.Invoke();
#endif
    }

    // rewardId должен быть уникальным для каждого типа награды
    // Пример: "skip-level-reward", "extra-life-reward"
    public static void RequestRewardedAd(string rewardId = "reward",
        Action onSuccess = null, Action onFail = null)
    {
        _onRewardedSuccess = onSuccess;
        _onRewardedFail    = onFail;
        Debug.Log($"[YT Ads] RequestRewardedAd rewardId={rewardId}");
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_RequestRewardedAd(rewardId);
#else
        Debug.Log("[YT Ads] Rewarded skipped (Editor) — success");
        onSuccess?.Invoke();
#endif
    }

    public static void SaveData(string json)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_SaveData(json);
#else
        PlayerPrefs.SetString("YT_SAVE", json);
        PlayerPrefs.Save();
#endif
    }

    public static void LoadData(Action<string> onComplete)
    {
        LoadDataCompleted += onComplete;
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_LoadData();
#else
        string saved = PlayerPrefs.GetString("YT_SAVE", "");
        Instance?.OnLoadDataCompleted(saved);
#endif
    }

    public static void LogError()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_LogError();
#else
        Debug.LogError("[YT] Error logged");
#endif
    }

    public static void LogWarning()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        YT_LogWarning();
#else
        Debug.LogWarning("[YT] Warning logged");
#endif
    }

    // ── Callbacks от JavaScript через SendMessage ──

    private void OnAudioEnabledChanged(string value)
        => AudioEnabledChanged?.Invoke(value == "1");

    private void OnGamePaused(string _)
        => GamePaused?.Invoke();

    private void OnGameResumed(string _)
        => GameResumed?.Invoke();

    private void OnLanguageReceived(string lang)
        => LanguageReceived?.Invoke(lang);

    private void OnLoadDataCompleted(string data)
    {
        var cb = LoadDataCompleted;
        LoadDataCompleted = null;
        cb?.Invoke(data);
    }

    private void OnInterstitialAdClosed(string result)
    {
        Debug.Log($"[YT Ads] InterstitialClosed result={result}");
        var cb = _onInterstitialClosed;
        _onInterstitialClosed = null;
        cb?.Invoke();
    }

    private void OnRewardedAdResult(string result)
    {
        Debug.Log($"[YT Ads] RewardedResult={result} ({(result=="1"?"success":"fail")})");
        if (result == "1")
        {
            var cb = _onRewardedSuccess;
            _onRewardedSuccess = _onRewardedFail = null;
            cb?.Invoke();
        }
        else
        {
            var cb = _onRewardedFail;
            _onRewardedSuccess = _onRewardedFail = null;
            cb?.Invoke();
        }
    }

    public static LanguageType MapLanguage(string bcp47)
    {
        if (string.IsNullOrEmpty(bcp47)) return LanguageType.English;
        var code = bcp47.ToLower();
        if (code.StartsWith("ru")) return LanguageType.Russian;
        if (code.StartsWith("tr")) return LanguageType.Turkish;
        if (code.StartsWith("de")) return LanguageType.German;
        // Добавить другие языки по необходимости
        return LanguageType.English;
    }
}
```

---

## GameController — подключение

### Что нужно сделать в `Start()`:

```csharp
private void Start()
{
    // 1. Получить язык АСИНХРОННО
    YouTubePlayablesSDK.LanguageReceived += OnLanguageReceived;
    YouTubePlayablesSDK.RequestLanguage();

    // 2. Применить начальное состояние аудио
    OnSystemAudioChanged(YouTubePlayablesSDK.IsAudioEnabled());

    // 3. Загрузить cloud save ПЕРЕД стартом игры
    YouTubePlayablesSDK.LoadData(OnSaveDataLoaded);
}

private void OnLanguageReceived(string bcp47)
{
    YouTubePlayablesSDK.LanguageReceived -= OnLanguageReceived;
    Language = YouTubePlayablesSDK.MapLanguage(bcp47);
    // Обновить текстовые элементы если уже загружены
}

private void OnSaveDataLoaded(string json)
{
    // Применить сохранение
    // Только ПОСЛЕ этого вызывать GameReady и StartCurrentLevel
    StartCurrentLevel();
    YouTubePlayablesSDK.GameReady(); // ← ТОЛЬКО когда игра полностью готова
}
```

### Подписки на события (OnEnable/OnDisable):

```csharp
private void OnEnable()
{
    YouTubePlayablesSDK.AudioEnabledChanged += OnSystemAudioChanged;
    YouTubePlayablesSDK.GamePaused          += OnSystemPause;
    YouTubePlayablesSDK.GameResumed         += OnSystemResume;
}

private void OnDisable()
{
    YouTubePlayablesSDK.AudioEnabledChanged -= OnSystemAudioChanged;
    YouTubePlayablesSDK.GamePaused          -= OnSystemPause;
    YouTubePlayablesSDK.GameResumed         -= OnSystemResume;
}

// ОБЯЗАТЕЛЬНО: onPause должен остановить ВСЁ, включая Time.timeScale
private void OnSystemPause()
{
    Time.timeScale = 0;
    BGSoundSource.Pause();
    FXSoundSource.Pause();
    // ОБЯЗАТЕЛЬНО сохранить прогресс при паузе
    SaveProgress();
}

private void OnSystemResume()
{
    Time.timeScale = 1;
    BGSoundSource.UnPause();
    FXSoundSource.UnPause();
}

private void OnSystemAudioChanged(bool isEnabled)
{
    // YouTube mute переопределяет игровые настройки
    BGSoundSource.volume = isEnabled ? SaveSystem.GetBGSoundInfo() : 0f;
    FXSoundSource.volume = isEnabled ? SaveSystem.GetFXSoundInfo() : 0f;
}
```

---

## Требования

### ОБЯЗАТЕЛЬНЫЕ (провал сертификации):

| Требование | Реализация |
|---|---|
| SDK загружен ПЕРВЫМ | `<script src="...game_api/v1">` первый тег в `<head>` |
| `firstFrameReady()` при загрузочном экране | Вызов из HTML сразу после SDK |
| `gameReady()` только когда игра интерактивна | Из C# после полной инициализации |
| `gameReady()` НЕ вызывать пока загрузка | Не вызывать до завершения `LoadData` |
| Cloud saves через `loadData`/`saveData` | Реализовать, НЕ PlayerPrefs в WebGL |
| `saveData` только ПОСЛЕ `loadData` | Ждать callback от LoadData |
| Аудио через `isAudioEnabled` + `onAudioEnabledChange` | Подписка + инициализация |
| Пауза/resume через `onPause`/`onResume` | `Time.timeScale = 0/1` + аудио |
| Отзывчивый дизайн (все ratio) | CSS/JS resize или pillarbox |
| НЕТ внешних ссылок и шаринга | Проверить UI сцены |
| НЕТ кнопок выхода/quit | Проверить UI сцены |
| Только относительные пути к файлам | Проверить все ссылки в HTML |
| Имена файлов: только `[a-zA-Z0-9_\-.]` | Переименовать файлы с пробелами |

### Размер билда:

| Лимит | Значение |
|---|---|
| Начальный бандл (до `gameReady`) | < 30 МБ, рекомендуется < 15 МБ |
| Общий бандл | < 250 МБ |
| Один файл | < 30 МБ, рекомендуется < 512 КБ |
| Cloud save | < 3 МБ, рекомендуется < 500 КБ |
| JS heap | < 512 МБ (критично для iOS Safari) |

### Unity Player Settings для WebGL:

```
Compression Format:    None  (YouTube CDN сжимает сам, pre-compressed не поддерживается)
Threads Support:       Disabled
Exception Support:     Explicitly Thrown Only (Full добавляет ~10 МБ)
Memory Initial Size:   64 МБ
Scripting Backend:     IL2CPP
Managed Stripping:     Maximal
```

### Текстуры — уменьшение размера:

- Формат WebGL override: **RGBA Crunched DXT5** (RGBA) / **RGB Crunched DXT1** (RGB)
- NPOT текстуры с DXT **не сжимаются** (ошибка "multiple of 4")
- Решение: использовать **Unity Sprite Atlas** — он генерирует POT текстуры

---

## Ошибки

### 1. `getLanguage()` — это Promise, не строка ⚠️

```javascript
// НЕПРАВИЛЬНО — вернёт "[object Promise]"
var lang = ytgame.system.getLanguage();

// ПРАВИЛЬНО — через async/await или .then()
ytgame.system.getLanguage().then(function(lang) {
    SendMessage('YouTubePlayablesSDK', 'OnLanguageReceived', lang);
});
```

### 2. Реклама зависает вне YouTube ⚠️

```javascript
// НЕПРАВИЛЬНО — no-op SDK определяет ytgame.ads, но Promise никогда не завершается
if (typeof ytgame !== 'undefined' && ytgame.ads) {
    ytgame.ads.requestRewardedAd(id).then(...); // ← зависнет навсегда
}

// ПРАВИЛЬНО — проверить IN_PLAYABLES_ENV
var inYT = typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV;
if (inYT && ytgame.ads) {
    ytgame.ads.requestRewardedAd(id).then(...);
} else {
    SendMessage(..., '0'); // ← немедленный fallback
}
```

### 3. Нет nonce на динамическом `<script>` ⚠️

```javascript
// НЕПРАВИЛЬНО — CSP заблокирует на YouTube
var s = document.createElement('script');
s.src = 'Build/loader.js';
document.body.appendChild(s);

// ПРАВИЛЬНО
var s = document.createElement('script');
s.src = 'Build/loader.js';
s.nonce = document.querySelector('script[nonce]')?.nonce ?? '';
document.body.appendChild(s);
```

### 4. `firstFrameReady()` из C# Awake() — слишком поздно ⚠️

`firstFrameReady` должен быть вызван когда виден загрузочный экран — то есть **до** загрузки Unity. Вызывать из HTML сразу после загрузки SDK.

### 5. `gameReady()` слишком рано ⚠️

Нельзя вызывать пока загрузочный экран виден. Нужно вызывать только после завершения всей инициализации — включая `LoadData`.

### 6. `onPause` без остановки `Time.timeScale` ⚠️

Документация: "Game MUST pause all execution". Только аудио недостаточно — нужно `Time.timeScale = 0`.

### 7. `requestRewardedAd` без `rewardId` ⚠️

`rewardId` обязателен. Должен быть уникальным для каждого типа награды (skip level, extra life, etc.) и постоянным между сессиями.

### 8. Cloud saves через PlayerPrefs в WebGL ⚠️

Документация: "Game MUST NOT use any other mechanism to save user progress." В WebGL нужно использовать `ytgame.game.saveData()` / `loadData()`. PlayerPrefs как fallback только вне YouTube.

### 9. Android: viewport = 0 при старте ⚠️

YouTube загружает игру в скрытый WebView. `window.innerHeight = 0`. Без проверки `if (screenH === 0) return;` в `resizeCanvas()` канвас получит нулевой размер.

### 10. Имена файлов с пробелами ⚠️

YouTube требует `[a-zA-Z0-9_\-.]`. Файлы вроде `"2 shape copy 2.png"` провалят валидацию. Переименовать все ассеты перед публикацией.

---

## Чеклист

### SDK Integration:
- [ ] `<script src="game_api/v1">` — первый тег в `<head>`
- [ ] `firstFrameReady()` вызывается из HTML при загрузке
- [ ] `gameReady()` вызывается из C# только когда игра интерактивна
- [ ] `gameReady()` НЕ вызывается до завершения `LoadData`
- [ ] `isAudioEnabled()` — применяется при старте
- [ ] `onAudioEnabledChange` — зарегистрирован
- [ ] `onPause` — останавливает `Time.timeScale` и аудио, сохраняет прогресс
- [ ] `onResume` — восстанавливает `Time.timeScale` и аудио
- [ ] `getLanguage()` — используется async через callback
- [ ] `loadData` — вызывается при старте, `saveData` — только после него
- [ ] `saveData` — вызывается при значимом прогрессе и в `onPause`

### Реклама (Public Preview):
- [ ] `requestInterstitialAd()` — без rewardId, Promise<void>
- [ ] `requestRewardedAd(rewardId)` — с уникальным rewardId, проверка boolean
- [ ] `IN_PLAYABLES_ENV` проверяется перед вызовом ads
- [ ] Reward не выдаётся если Promise вернул `false` или reject

### Техническое:
- [ ] Нет `preventDefault()` на Esc
- [ ] `nonce` добавлен на динамически создаваемые `<script>`
- [ ] `resizeCanvas` обрабатывает `window.innerHeight === 0`
- [ ] Compression = None в Player Settings
- [ ] Начальный бандл < 30 МБ (проверить Python analyzer)
- [ ] Имена файлов — только `[a-zA-Z0-9_\-.]`

### UI сцены:
- [ ] Нет кнопок "Выход" / "Quit"
- [ ] Нет внешних ссылок
- [ ] Нет sharing prompts
- [ ] Нет дополнительных user agreement экранов
- [ ] Canvas Scaler — Scale With Screen Size, Expand

### Перед сабмитом:
- [ ] Запустить Python bundle analyzer
- [ ] Проверить в Chrome с CSP override headers из документации
- [ ] Проверить на Android WebView (viewport = 0 при старте)
- [ ] Настроить монетизацию в YouTube Playables Developer Portal если используются ads

---

## Audit Addendum: MUST / SHOULD Requirements

Use this section as the final certification-oriented checklist. It consolidates the
YouTube Playables documentation requirements and the practical Unity/WebGL details
that are easy to miss.

### Key Integration Files

Always inspect these files during integration/review:

`Assets/WebGLTemplates/YouTubePlayables/index.html`
- Loads `https://www.youtube.com/game_api/v1` before Unity/game code.
- Calls `ytgame.game.firstFrameReady()` from HTML while the loading screen is visible.
- Starts/awaits `ytgame.game.loadData()` before creating the Unity instance.
- Stores loaded cloud save data in a shared JS variable such as
  `window.YT_PLAYABLES_CLOUD_SAVE` so the Unity WebGL save wrapper can consume it.
- Dynamically loads the Unity loader script with CSP nonce.
- Handles `window.innerHeight === 0`.
- Uses relative `Build/...` and `StreamingAssets` paths only.
- Does not call `preventDefault()` for `Escape`.

`Assets/Plugins/WebGL/YouTubePlayables.jslib`
- Bridges C# to `ytgame.game.gameReady()`.
- Bridges async `ytgame.system.getLanguage()` through `SendMessage`.
- Bridges `isAudioEnabled`, `onAudioEnabledChange`, `onPause`, `onResume`.
- Calls `ytgame.ads.requestInterstitialAd()` only when
  `ytgame.IN_PLAYABLES_ENV` is true.
- Calls `ytgame.ads.requestRewardedAd(rewardId)` only when
  `ytgame.IN_PLAYABLES_ENV` is true.
- Sends rewarded result `1` only when the promise resolves with `true`.
- Sends rewarded result `0` on promise `false` or reject.
- Bridges `ytgame.game.saveData(data)` and `ytgame.game.loadData()`.
- Has local fallback only for Editor/local browser testing.
- Logs ad requests/results clearly enough to distinguish real YouTube runtime from
  local simulation.

`Assets/Watermelon Core/Modules/Save/Scripts/Plugins/WebGL/webgLibrary.jslib`
- If Watermelon/WebGL save wrapper is used, it must read initial data loaded from
  YouTube cloud save.
- Its `save()` path should forward saved JSON to `ytgame.game.saveData(data)`.
- It must not create a second competing save source that can overwrite cloud data
  before `loadData()` completes.

`Assets/Project Files/Game/Scripts/YouTubePlayables/YouTubePlayablesSDK.cs`
- Must create/own a GameObject named exactly `YouTubePlayablesSDK`; JS
  `SendMessage` depends on that name.
- Should be `DontDestroyOnLoad`.
- Registers system callbacks on WebGL.
- Applies YouTube audio state at startup and on change.
- Pauses gameplay/audio on YouTube pause and resumes on YouTube resume.
- Saves progress on YouTube pause.
- Logs Editor/local simulation distinctly from real WebGL calls.

`Assets/Watermelon Core/Modules/Monetization/Scripts/Advertisement/Providers/YouTubePlayables/YouTubePlayablesAdHandler.cs`
- Adapts the project ads layer to YouTube Playables ads.
- Interstitial must call the final callback with the actual resolved/skipped state.
- Rewarded must grant only on rewarded success.
- Reward IDs must be stable and unique per reward type/placement.

`Assets/Project Files/Data/Monetization Settings.asset`
- `isModuleActive` should be enabled when ads are used.
- Banner should be disabled unless YouTube supports/approves a banner flow.
- Interstitial and Rewarded Video provider should point to the YouTube Playables
  provider.
- Privacy/Terms links should not be exposed as in-game clickable links in Playables.

`ProjectSettings/ProjectSettings.asset`
- WebGL template should be `PROJECT:YouTubePlayables`.
- Compression Format should be `None`.
- Threads Support should be disabled.
- Exception support should be kept lightweight after testing.

### SDK Boot

**MUST**
- Load `https://www.youtube.com/game_api/v1` before any game code. In a Unity WebGL
  template it must be the first SDK/game-related `<script>` in `<head>`.
- Call `ytgame.game.firstFrameReady()` when a visible loading/splash screen is
  already available. For Unity this should be done in `index.html`, before Unity
  starts loading.
- Call `ytgame.game.gameReady()` only when the game is truly interactive: main menu
  visible or the game is ready to play.
- Do not call `gameReady()` while a non-interactive loading/splash screen is still
  blocking the user.
- If cloud saves are used, finish `ytgame.game.loadData()` before calling
  `gameReady()` and before any `saveData()`.

**SHOULD**
- Keep the initial bundle before `gameReady()` as small as possible; target under
  15 MiB even though the hard limit is 30 MiB.
- Lazy-load anything not required for first interaction.

### Unity WebGL Template

**MUST**
- Use only relative file paths in `index.html` and generated bundle references.
- Add `nonce` to dynamically created `<script>` tags, especially the Unity loader:
  `loaderScript.nonce = document.querySelector('script[nonce]')?.nonce ?? '';`
- Handle hidden Android WebView startup where `window.innerHeight` can be `0`.
- Do not call `preventDefault()` on `Escape` key events.

**SHOULD**
- Fill the available viewport. If the game uses a fixed gameplay aspect, center it
  with pillarbox/letterbox padding.
- Keep the game state intact on resize; do not reload or restart because of viewport
  changes.

### Ads

**MUST**
- Use only YouTube-provided ads APIs for Playables monetization.
- Do not use off-platform ad SDKs or external monetization services in Playables.
- Configure monetization in YouTube Playables Developer Portal when ads are enabled.
- Check `ytgame.IN_PLAYABLES_ENV` before calling ads. The local/no-op SDK can expose
  ads functions but leave promises unresolved.
- `requestInterstitialAd()` takes no `rewardId` and returns `Promise<void>`.
- `requestRewardedAd(rewardId)` requires a stable, non-user-data reward ID and
  returns `Promise<boolean>`.
- Award rewarded currency/items only if the rewarded promise resolves with `true`.
  Do not award on `false` or reject.
- Continue to respect YouTube audio and pause/resume callbacks while ads are used.

**SHOULD**
- Log every ad request path in Unity and JS:
  request start, `IN_PLAYABLES_ENV`, reward ID/placement, resolve/reject, reward
  granted/not granted.
- Treat Editor/local WebGL success as simulation only. Real ads can only be verified
  in the YouTube Playables environment/test suite.
- Use stable readable reward IDs per reward type, for example:
  `reward-skip-level`, `reward-x3-coins`, `reward-extra-life`.

### Cloud Saves

**MUST**
- Use `ytgame.game.loadData()` and `ytgame.game.saveData(data)` for WebGL Playables
  progress. Do not rely on PlayerPrefs/localStorage as the primary save mechanism
  inside YouTube.
- Await/load cloud data before first save. Saving before load can overwrite older
  progress and may be rejected.
- Keep save payload under 3 MiB. Prefer under 500 KiB.
- Maintain compatibility with save data from previous game versions.

**SHOULD**
- Save automatically at meaningful milestones: level change, rewarded unlock,
  currency grant, store unlock.
- Save on `ytgame.system.onPause`.
- If the project already has a WebGL save wrapper, bridge that wrapper to
  `saveData/loadData` instead of creating a second competing save path.
- Keep a local fallback only for Editor/local browser testing.

### Audio

**MUST**
- Respect `ytgame.system.isAudioEnabled()` on startup.
- Subscribe to `ytgame.system.onAudioEnabledChange`.
- When YouTube mute is active, output no game audio.
- YouTube mute must override in-game audio controls.
- Respect device volume controls.

**SHOULD**
- Avoid a global mute button if YouTube already provides one.
- Separate music/sfx controls are okay, but they must still be gated by YouTube mute.

### Pause / Resume

**MUST**
- Use only Playables `ytgame.system.onPause` and `ytgame.system.onResume` for
  platform pause/resume. Do not use Page Visibility API as the platform signal.
- Pause all execution on `onPause`: gameplay, timers, interactions, music/audio,
  network calls where applicable, and rendering-side effects.
- Resume only after `onResume`.

**SHOULD**
- Force-save progress in `onPause`.
- Preserve the previous `Time.timeScale` and restore it carefully on resume.

### Localization

**MUST**
- Support English.
- Do not use browser language APIs such as `navigator.language` or
  `navigator.languages` as the Playables language source.

**SHOULD**
- Use `ytgame.system.getLanguage()`. It is async/promise-based in current docs, so
  call it through a callback/Promise bridge, not as a synchronous return value.

### UI / Product Rules

**MUST**
- Support touch and mouse for all interactions.
- Do not lock orientation or posture.
- Do not show in-game sharing prompts.
- Do not show clickable external links in the game UI.
- Do not show an extra user agreement.
- Do not show an in-game exit/quit button.
- Do not show IAP/off-platform purchase UI in Playables.
- Do not place confusing icons that look like YouTube close/mute/menu controls near
  actual Playables controls.
- Render text and graphics clearly across supported sizes/aspect ratios.

**SHOULD**
- Support keyboard input where it naturally fits the game.
- Allow `Esc` to close in-game modals/dialogs if keyboard is supported.
- Add generous touch padding around UI controls.

### Privacy / External Calls

**MUST**
- Do not make external calls except Google/YouTube APIs required by Playables
  technical requirements.
- Do not attempt to bypass external call prevention.
- Do not access clipboard except explicit user paste action.

**Implementation note**
- Disable generic network checks such as `https://google.com` pings in Playables
  startup unless they are explicitly required and accepted by review.
- Hide Privacy/Terms/external-link buttons inside the playable; those belong in
  YouTube metadata, not in clickable in-game UI.

### Stability / Build

**MUST**
- Initial bundle size under 30 MiB.
- Total bundle size under 250 MiB unless an exception applies.
- Every individual file under 30 MiB.
- Peak JS heap under 512 MiB.
- Use standards-compliant Web APIs compatible with YouTube-supported browsers and
  YouTube Android/iOS apps.
- Bundle file names may only contain `[a-zA-Z0-9_\-.]`.

**SHOULD**
- Every individual file under 512 KiB where practical.
- Finish loading and allow interaction in under 5 seconds.
- Use Unity WebGL settings appropriate for Playables:
  - WebGL template: custom YouTube Playables template.
  - Compression Format: `None`.
  - Threads Support: disabled.
  - Exception Support: Explicitly Thrown Only when possible.
  - IL2CPP scripting backend.
  - Managed Stripping Level: High/Maximal after testing.
- Run the Playables bundle analyzer before submission.

### Practical Verification

- Unity Editor can only verify the C# path and simulated callbacks. It cannot show
  real YouTube ads.
- Local browser WebGL can verify template loading, logs, resize behavior, and local
  fallback, but real ad behavior still requires YouTube Playables environment.
- For ads, verify both Unity logs and browser console logs:
  - interstitial request/resolve/reject
  - rewarded request with reward ID
  - rewarded `true` grants reward
  - rewarded `false`/reject does not grant reward
- After changing `Assets/WebGLTemplates/...` or `.jslib`, rebuild WebGL. Existing
  files in `Build/` are not updated until a new build is made.

---

## YouTube Review Feedback Addendum

Use this section as a mandatory extra pass before submitting a Playables build.
It is based on real YouTube review feedback and SDK Test Suite failures.

### 1. Cloud save payload must be less than 3 MiB

**Review symptom**
- SDK Test Suite item `Cloud save data < 3 MiB` does not pass.

**Requirement**
- Every string passed to `ytgame.game.saveData(data)` must be less than `3 MiB`.
- Prefer much smaller saves. A normal casual game save should usually be below
  `500 KiB`.

**Implementation rule**
- Add a size guard before calling `saveData`.
- Measure UTF-8 bytes, not C# string length.

```csharp
private const int MaxCloudSaveBytes = 3 * 1024 * 1024;

public static void SaveData(string data)
{
    if (data == null)
        data = string.Empty;

    if (System.Text.Encoding.UTF8.GetByteCount(data) >= MaxCloudSaveBytes)
    {
        Debug.LogWarning("[YouTube Playables] Cloud save skipped: data must be less than 3 MiB.");
        YouTubePlayablesSDK.LogWarning();
        return;
    }

    // Call ytgame.game.saveData(data) through jslib.
}
```

**Audit checklist**
- [ ] Save data is compact JSON or another compact string format.
- [ ] No screenshots, audio, base64 blobs, analytics history, or large logs are saved.
- [ ] Save size is checked before every `saveData` call.
- [ ] Oversized save does not overwrite an existing valid cloud save.

### 2. Game progress must call saveData after material progress

**Review symptom**
- After completing levels and reloading, the game starts from the beginning.
- Android and browser reviews can report this separately.

**Requirement**
- The game must call `ytgame.game.saveData(data)` when the player makes material
  progress that the game implies is saved.

**Material progress examples**
- Level completed or level index changed.
- Currency earned or spent.
- Rewarded ad grant applied.
- Shop item, skin, upgrade, or unlock purchased.
- Settings/language changed if the UI presents them as persistent.

**Implementation rule**
- Do not rely on Unity `PlayerPrefs` as the primary WebGL Playables storage.
- Bridge existing save providers/wrappers to YouTube `loadData/saveData`.
- Load cloud data before the first save, otherwise the first local/default save can
  overwrite real player progress.
- Save again on `ytgame.system.onPause`.

**Audit checklist**
- [ ] `loadData()` completes before game initialization writes defaults.
- [ ] `saveData()` is called after level change.
- [ ] `saveData()` is called after currency/store/unlock changes.
- [ ] `saveData()` is called after rewarded reward is actually granted.
- [ ] `saveData()` is called from platform pause handling.
- [ ] Local fallback is used only outside YouTube Playables.

### 3. YouTube mute must override in-game audio controls

**Review symptom**
- User enables the YouTube mute button.
- User toggles in-game music/sound off and on.
- Audio becomes audible again even though YouTube mute is still enabled.

**Requirement**
- `ytgame.system.isAudioEnabled()` must be respected at startup.
- `ytgame.system.onAudioEnabledChange(...)` must be subscribed.
- When YouTube mute is active, no game audio may be output.
- In-game music/SFX sliders may exist, but they must never override YouTube mute.

**Implementation rule**
- Treat YouTube audio state as a master gate above all in-game audio settings.
- If the project uses a custom Web Audio/Howler bridge, mute that bridge too.
  `AudioListener.volume = 0` is not enough for JS audio that bypasses Unity audio.

```csharp
private static void ApplyAudioState(bool enabled)
{
    AudioListener.pause = !enabled;
    AudioListener.volume = enabled ? 1f : 0f;

    // Required when the project uses Web Audio / Howler / JS audio providers.
    Plugins.Audio.Core.WebAudio.Mute(!enabled);
}
```

**Audit checklist**
- [ ] Startup reads `ytgame.system.isAudioEnabled()`.
- [ ] Runtime changes use `ytgame.system.onAudioEnabledChange(...)`.
- [ ] In-game sliders update only the game's own music/SFX volumes.
- [ ] Final audible output is still gated by YouTube mute.
- [ ] Web Audio / Howler / custom JS audio is muted when YouTube mute is active.
- [ ] Ad pause/resume does not unmute against YouTube mute state.

### 4. Background music and third-party content must be cleared

**Review symptom**
- Review flags a known track, for example `Cake and Balloons` by David Sharp.

**Requirement**
- The playable must not include unlicensed third-party content: music, logos,
  names, photos, likenesses, car/product designs, or distinctive art copied from
  another game/product/service.

**Implementation rule**
- Do not ship placeholder/example audio from SDKs, Unity samples, asset packs, or
  old prototypes unless the license explicitly permits this use and attribution is
  acceptable for Playables.
- Prefer custom-made, commissioned, or clearly licensed royalty-free tracks with
  documentation kept outside the build.

**Audit checklist**
- [ ] Background music source and license are known.
- [ ] Example/demo audio files are removed or replaced.
- [ ] Asset-pack music is allowed for commercial playable distribution.
- [ ] No recognizable brands, real car designs, logos, celebrity likenesses, or
      copied game art are visible.

### 5. Web Audio template files must be present when the project uses WebAudioJS.jslib

**Review/build symptom**
- Browser console error:
  `TypeError: window.InitAudio is not a function`.

**Cause**
- `Assets/Plugins/Audio/Core/WebAudioJS.jslib` calls `window.InitAudio(...)`, but
  the active WebGL template does not load the JavaScript audio bridge.

**Implementation rule**
- If the project uses this audio plugin, the active Playables WebGL template must
  include the audio bridge before Unity loads.

```html
<script src="./Web Audio Plugin/howler.min.js"></script>
<script src="./Web Audio Plugin/WebAudio.js"></script>
```

**Audit checklist**
- [ ] The active template, not an unused template, contains the Web Audio scripts.
- [ ] `Web Audio Plugin/howler.min.js` exists next to the template `index.html`.
- [ ] `Web Audio Plugin/WebAudio.js` exists next to the template `index.html`.
- [ ] Scripts load before `createUnityInstance(...)`.
- [ ] A fresh WebGL build was made after template changes.

### 6. Do not force a fixed aspect ratio unless the game truly requires it

**Review/product symptom**
- Game is letterboxed/pillarboxed incorrectly, cropped, or fails layout checks on
  some devices.

**Requirement**
- Playables should render clearly across supported sizes/aspect ratios.
- Do not lock orientation or posture.

**Implementation rule**
- If the Unity game already adapts to resolution, let the wrapper fill the viewport.
- Avoid hardcoded template values such as `TARGET_ASPECT = 11 / 16` unless the game
  design explicitly needs a fixed playfield.

```javascript
function resizeCanvas() {
    var screenW = window.innerWidth;
    var screenH = window.innerHeight;
    if (screenH === 0) return;

    wrapper.style.width  = screenW + 'px';
    wrapper.style.height = screenH + 'px';
    wrapper.style.left   = '0';
    wrapper.style.top    = '0';
}
```

**Audit checklist**
- [ ] No unnecessary `TARGET_ASPECT` clamp in the template.
- [ ] Unity canvas uses `matchWebGLToCanvasSize: true`.
- [ ] UI is tested in portrait, landscape, narrow, and wide browser sizes.
- [ ] Text/buttons do not overlap after resize.
