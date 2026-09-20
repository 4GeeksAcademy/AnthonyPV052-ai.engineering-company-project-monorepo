# Demo DEV-55: ejecución asíncrona con Celery

## Endpoint seleccionado

El endpoint seleccionado es `POST /reporting/pipeline-runs`. Este endpoint dispara una corrida manual del pipeline de desempeño de negocio y ahora encola la tarea Celery `tasks.run_pipeline`, respondiendo inmediatamente con HTTP `202 Accepted` y un `task_id`. El estado puede consultarse con `GET /tasks/{task_id}`.

### Justificación

Es un buen candidato porque ejecuta un pipeline pesado que puede leer datos, calcular KPIs y escribir resultados en la base de datos. Si se ejecutara de forma síncrona, mantendría ocupado el proceso de FastAPI y aumentaría el riesgo de timeouts. Al ejecutarlo en Celery, la API responde rápidamente, el worker procesa la operación de forma independiente, los fallos transitorios se reintentan con backoff exponencial de `1s`, `2s` y `4s`, y el fallo definitivo se registra en `celery_dead_letter_queue`.

## Fragmento de log con reintento

El mismo `task_id` se conserva durante los cuatro intentos. Tras tres reintentos, la tarea termina en fallo y se registra en la DLQ:

```text
[2026-09-20 16:31:29,837: WARNING/ForkPoolWorker-2] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=1 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:29,850: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 1s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:30,841: WARNING/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=2 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:30,849: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 2s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:32,844: WARNING/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=3 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:32,848: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 4s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:36,847: ERROR/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=4 status=failure error=Controlled Flower DLQ demonstration failure
```# Demo DEV-55: ejecución asíncrona con Celery

## Endpoint seleccionado

El endpoint seleccionado es `POST /reporting/pipeline-runs`. Este endpoint dispara una corrida manual del pipeline de desempeño de negocio y ahora encola la tarea Celery `tasks.run_pipeline`, respondiendo inmediatamente con HTTP `202 Accepted` y un `task_id`. El estado puede consultarse con `GET /tasks/{task_id}`.

### Justificación

Es un buen candidato porque ejecuta un pipeline pesado que puede leer datos, calcular KPIs y escribir resultados en la base de datos. Si se ejecutara de forma síncrona, mantendría ocupado el proceso de FastAPI y aumentaría el riesgo de timeouts. Al ejecutarlo en Celery, la API responde rápidamente, el worker procesa la operación de forma independiente, los fallos transitorios se reintentan con backoff exponencial de `1s`, `2s` y `4s`, y el fallo definitivo se registra en `celery_dead_letter_queue`.

## Fragmento de log con reintento

El mismo `task_id` se conserva durante los cuatro intentos. Tras tres reintentos, la tarea termina en fallo y se registra en la DLQ:

```text
[2026-09-20 16:31:29,837: WARNING/ForkPoolWorker-2] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=1 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:29,850: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 1s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:30,841: WARNING/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=2 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:30,849: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 2s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:32,844: WARNING/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=3 status=retry error=Controlled Flower DLQ demonstration failure
[2026-09-20 16:31:32,848: INFO/MainProcess] Task tasks.demo_failure[ce1f2239-45f6-464a-a6d1-acab0531e44d] retry: Retry in 4s: RuntimeError('Controlled Flower DLQ demonstration failure')
[2026-09-20 16:31:36,847: ERROR/ForkPoolWorker-1] task_id=ce1f2239-45f6-464a-a6d1-acab0531e44d attempt=4 status=failure error=Controlled Flower DLQ demonstration failure
```
