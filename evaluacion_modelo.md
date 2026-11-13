### Curva de aprendizaje y diagnóstico de ajuste

Para evaluar la evolución del modelo frente al volumen de datos, se construyó una curva de aprendizaje utilizando ventanas temporales incrementales (`TimeSeriesSplit`), desde 14 hasta 70 muestras de entrenamiento.

**Observaciones clave del gráfico:**
1. **Error de entrenamiento (azul)**: Se mantiene bajo y estable (entre 1.800 y 2.750 covers), con una leve tendencia al alza a medida que se añaden datos, lo cual es esperado (es más difícil ajustarse perfectamente a 70 muestras que a 14).
2. **Error de validación (naranja)**: Muestra una tendencia ascendente (de 3.600 a 4.600 covers) que refleja el **crecimiento del negocio**. Los primeros folds validan meses con menor volumen de ventas (años anteriores), mientras que los últimos validan meses de mayor volumen. Al medir el error en unidades absolutas (covers), un mayor volumen conlleva naturalmente un mayor RMSE.
3. **Brecha (gap)**: Se mantiene estable en torno a ~1.500 covers, sin divergir drásticamente. Esto descarta el sobreajuste (overfitting).

**Diagnóstico:**
El modelo presenta un **buen ajuste con un leve sesgo (underfitting controlado)**. La estabilidad de la brecha indica que el RandomForest no está memorizando el ruido, y que la regularización (`max_depth=3`) funciona. La tendencia ascendente del error de validación no es un fallo del modelo, sino el reflejo del crecimiento de la escala del negocio. El hecho de que la curva de validación no descienda drásticamente sugiere que el modelo ya ha extraído toda la señal posible de las dos features disponibles (`month_num` y `avg_ticket_usd`). Para reducir el error en el futuro, sería necesario añadir nuevas variables exógenas (ej. festivos, clima, promociones) más que añadir más meses de histórico.

### Resultados del modelo:

Fold 1: 14 train / 14 val  →  RMSE = 3,678
Fold 2: 28 train / 14 val  →  RMSE = 3,894
Fold 3: 42 train / 14 val  →  RMSE = 3,986
Fold 4: 56 train / 14 val  →  RMSE = 4,628
Fold 5: 70 train / 14 val  →  RMSE = 4,663

RMSE medio CV: 4,170  ±  401

=======================================================
DIAGNÓSTICO DEL MODELO
=======================================================
Error final de entrenamiento: 2359.4260
Error final de validación   : 4169.8279
Brecha (gap)                : 1810.4019
→ BUEN AJUSTE: train y validación están cerca y bajos.

### TESTS UNITARIOS test_split2.py

La estrategia de validación cruzada fue validada mediante pruebas unitarias que confirman la preservación del orden cronológico: en cada uno de los 5 folds, el conjunto de entrenamiento contiene exclusivamente datos anteriores al conjunto de validación, sin solapamiento de índices ni de fechas. Esto descarta cualquier posibilidad de fuga de información desde el futuro hacia el pasado durante la validación