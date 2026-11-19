## Se optó por **Random Forest** por las siguientes razones:

1. **Tamaño del dataset**: con 84 observaciones de entrenamiento, el riesgo de sobreajuste de XGBoost es significativo. Random Forest, al combinar árboles independientes, ofrece una estimación más estable.
2. **Robustez y simplicidad**: la menor sensibilidad a hiperparámetros permite obtener un modelo competitivo sin una búsqueda exhaustiva, lo cual es valioso dado el reducido conjunto de datos.
3. **Interpretabilidad y transparencia**: la importancia de variables y la lógica de bagging son más fáciles de comunicar a stakeholders no técnicos.
4. **Resultados empíricos**: el modelo de Random Forest alcanzó un MAE de 3.639 covers (5,7% sobre la media) y un R² de 0,56 en el conjunto de test, superando claramente a los baselines triviales. Aunque no se realizó una comparación directa con XGBoost, la teoría y las características del dataset respaldan la elección de Random Forest como la opción más prudente.

# MÉTRICAS
==============================================================
MÉTRICAS SOBRE EL CONJUNTO DE TEST (2024-2025)
==============================================================
MSE :      18,378,432.15
RMSE:              4,287
MAE :              3,639  (5.7% de la media)
R²  :              0.562

==============================================================
PSI — Population Stability Index
==============================================================
PSI sobre ratio_yoy (salida del modelo): 0.2459
PSI sobre covers_pred (nivel del negocio): 6.6743   <-- Alto debido al crecimiento del negocio en los años 2024-2025

==============================================================
GINI — desigualdad en la distribución de covers
==============================================================
Gini real    : 0.0554
Gini predicho: 0.0594
Diferencia   : 0.0039     <-- Baja diferencia, el modelo predijo de forma correcta la distribución de ventas

==============================================================
COMPARACIÓN CON BASELINES TRIVIALES
==============================================================
Naive t-12 × 1.00 → MAE:   5,019  R²:  0.214
Naive t-12 × 1.05 → MAE:   4,923  R²:  0.228
RandomForest      → MAE:   3,639  R²:  0.562  <-- el modelo obtuvo mejores resultados