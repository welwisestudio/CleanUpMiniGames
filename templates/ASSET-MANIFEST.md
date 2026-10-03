# Реестр графики и звука

Для большого проекта AI ведёт машинный JSON рядом с этим документом. Не включать токены и секретные ссылки авторизации.

Для новой графики requestedModel всегда Nano Banana 2 через Higgsfield MCP. ActualModel фиксируется по ответу сервиса; технический backend alias не означает разрешение выбрать другую модель.

| Asset ID | Назначение | Master | Runtime path | Model requested / actual | Job ID | Принят? |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

Генерация и удаление фона — разные этапы. `requestedModel` относится к созданию графики; Background Remover фиксируется отдельно. `masterPath` хранит исходник, `cutoutPath` — принятый PNG с alpha, `runtimePath` — экспорт. Для готового alpha или фона сцены укажи `not_needed` и причину. Статусы обработки: planned / submitted / completed / failed / blocked / not_needed; completed не заменяет приёмку.

Карточка генерации и обработки:

```json
{
  "id": "tool-example",
  "status": "planned",
  "prompt": "FULL EXACT PROMPT",
  "referenceFiles": [],
  "provider": "Higgsfield",
  "requestedModel": "nano_banana_2",
  "actualModel": null,
  "jobId": null,
  "generatedAt": null,
  "masterPath": null,
  "cutoutPath": null,
  "backgroundRemoval": {
    "required": true,
    "provider": "Higgsfield",
    "appUrl": "https://higgsfield.ai/apps/image-background-remover",
    "toolName": null,
    "status": "planned",
    "inputMediaId": null,
    "inputJobId": null,
    "inputSha256": null,
    "operationJobId": null,
    "parameters": null,
    "processedAt": null,
    "outputSize": null,
    "outputSha256": null,
    "sourceToCutoutTransform": null,
    "reason": null,
    "alphaReview": {
      "status": "NOT RUN",
      "hasTransparentPixels": null,
      "hasOpaquePixels": null,
      "lightDarkGamePreviewPaths": [],
      "notes": ""
    }
  },
  "runtimePath": null,
  "sourceSize": null,
  "cropPixels": null,
  "pivotNormalized": null,
  "workingPointNormalized": null,
  "exportCommand": null,
  "review": { "accepted": false, "notes": "" }
}
```

Для звука: файл, событие, длительность, loop, громкость, источник/лицензия, правило остановки. Для изображений: alpha, поля, маска, разрешение, hash. Повторный экспорт обязан сохранять принятые исправления.
