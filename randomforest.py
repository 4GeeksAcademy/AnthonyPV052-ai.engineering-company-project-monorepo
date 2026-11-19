from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import numpy as np
import joblib

# Intentar importar matplotlib; si no está disponible, deshabilitar la parte gráfica
try:
    import matplotlib.pyplot as plt
    _HAS_MPL = True
except ImportError:
    _HAS_MPL = False
    print("⚠️  matplotlib no está instalado — se omitirá la generación del gráfico.")
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ============ 1. CARGA Y PREPROCESADO ============
df = pd.read_csv("brasaland_sales.csv")
df['month'] = pd.to_datetime(df['month'])

df['month_dt']  = df['month']                    # guardar para el gráfico
df['year']      = df['month'].dt.year
df['month_num'] = df['month'].dt.month
df['month_sin'] = np.sin(2 * np.pi * df['month_num'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month_num'] / 12)

df = df.drop(columns=['month', 'revenue_usd', 'market'])

# Target: ratio YoY (elimina la tendencia del negocio)
df['covers_lag12'] = df['covers_served'].shift(12) # desfase de 12 meses para calcular el ratio YoY
df['ratio_yoy']    = df['covers_served'] / df['covers_lag12']
df_model = df.dropna(subset=['covers_lag12']).copy() 

train = df_model[df_model['year'] <= 2023].copy()
test  = df_model[df_model['year'] >= 2024].copy()

features = ['month_num', 'avg_ticket_usd']
X_train, y_train = train[features].values, train['ratio_yoy'].values
X_test          = test[features].values
y_true          = test['covers_served'].values


# ============ 2. MODELO ============
modelo = RandomForestRegressor(
    n_estimators=500,
    max_depth=3,
    min_samples_leaf=3,
    random_state=42,
    n_jobs=-1,
)
modelo.fit(X_train, y_train)


# ============ 3. PREDICCIONES ============
ratio_pred        = modelo.predict(X_test)
covers_pred       = ratio_pred * test['covers_lag12'].values

ratio_train       = modelo.predict(X_train)
covers_pred_train = ratio_train * train['covers_lag12'].values


# ============ 4. MÉTRICAS DE ERROR ============
mse  = mean_squared_error(y_true, covers_pred)
rmse = np.sqrt(mse)
mae  = mean_absolute_error(y_true, covers_pred)
r2   = r2_score(y_true, covers_pred)

print("=" * 62)
print("MÉTRICAS SOBRE EL CONJUNTO DE TEST (2024-2025)")
print("=" * 62)
print(f"MSE : {mse:>18,.2f}")
print(f"RMSE: {rmse:>18,.0f}")
print(f"MAE : {mae:>18,.0f}  ({mae / y_true.mean() * 100:.1f}% de la media)")
print(f"R²  : {r2:>18.3f}")


# ============ 5. PSI ============
def calcular_psi(referencia, actual, n_bins=4):
    """PSI con bins por cuantiles de la unión (evita bins vacíos)."""
    combinado = np.concatenate([referencia, actual])
    cortes = np.quantile(combinado, np.linspace(0, 1, n_bins + 1))
    cortes = np.unique(cortes)
    cortes[0], cortes[-1] = -np.inf, np.inf

    ref_counts, _ = np.histogram(referencia, bins=cortes)
    cur_counts, _ = np.histogram(actual,     bins=cortes)

    ref_pct = (ref_counts + 1e-6) / (ref_counts.sum() + len(ref_counts) * 1e-6)
    cur_pct = (cur_counts + 1e-6) / (cur_counts.sum() + len(cur_counts) * 1e-6)
    return float(((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)).sum())

# PSI sobre la SALIDA del modelo (ratio_yoy) → mide estabilidad del MODELO
psi_ratio = calcular_psi(ratio_train, ratio_pred, n_bins=4)

# PSI sobre el NIVEL predicho (covers) → mide drift del NEGOCIO (crecimiento)
psi_covers = calcular_psi(covers_pred_train, covers_pred, n_bins=4)

print("\n" + "=" * 62)
print("PSI — Population Stability Index")
print("=" * 62)
print(f"PSI sobre ratio_yoy (salida del modelo): {psi_ratio:.4f}")
print(f"PSI sobre covers_pred (nivel del negocio): {psi_covers:.4f}")


# ============ 6. GINI ============
def gini(x):
    """Coeficiente de Gini. 0 = igualdad total, 1 = máxima desigualdad."""
    x = np.sort(np.asarray(x, dtype=float))
    n = len(x)
    index = np.arange(1, n + 1)
    return (2 * np.sum(index * x)) / (n * np.sum(x)) - (n + 1) / n

gini_real = gini(y_true)
gini_pred = gini(covers_pred)

print("\n" + "=" * 62)
print("GINI — desigualdad en la distribución de covers")
print("=" * 62)
print(f"Gini real    : {gini_real:.4f}")
print(f"Gini predicho: {gini_pred:.4f}")
print(f"Diferencia   : {abs(gini_real - gini_pred):.4f}")


# ============ 7. BASELINES ============
print("\n" + "=" * 62)
print("COMPARACIÓN CON BASELINES TRIVIALES")
print("=" * 62)
naive_pred = test['covers_lag12'].values
print(f"Naive t-12 × 1.00 → MAE: {mean_absolute_error(y_true, naive_pred):>7,.0f}"
      f"  R²: {r2_score(y_true, naive_pred):>6.3f}")
print(f"Naive t-12 × 1.05 → MAE: {mean_absolute_error(y_true, naive_pred * 1.05):>7,.0f}"
      f"  R²: {r2_score(y_true, naive_pred * 1.05):>6.3f}")
print(f"RandomForest      → MAE: {mae:>7,.0f}"
      f"  R²: {r2:>6.3f}")


if _HAS_MPL:
    # ============ 8. GRÁFICO CON ÁREA DE VARIABILIDAD ============
    # Intervalo A: dispersión de los 500 árboles sobre el ratio
    preds_arboles = np.array([arbol.predict(X_test) for arbol in modelo.estimators_])
    ratio_p05 = np.percentile(preds_arboles, 5,  axis=0)
    ratio_p50 = np.percentile(preds_arboles, 50, axis=0)
    ratio_p95 = np.percentile(preds_arboles, 95, axis=0)

    lag = test['covers_lag12'].values
    covers_p05 = ratio_p05 * lag
    covers_p50 = ratio_p50 * lag
    covers_p95 = ratio_p95 * lag

    # Intervalo B: banda de error ±1.645σ sobre los residuales de test
    residuales = y_true - covers_pred
    sigma_res  = residuales.std()
    covers_lower_res = covers_pred - 1.645 * sigma_res
    covers_upper_res = covers_pred + 1.645 * sigma_res

    fechas = test['month_dt'].values

    fig, ax = plt.subplots(figsize=(13, 5.5))
    ax.plot(fechas, y_true,      'o-',  color='black',    lw=2.0, label='Real')
    ax.plot(fechas, covers_pred, 's--', color='tab:blue', lw=1.5, label='Predicción puntual')
    ax.fill_between(fechas, covers_p05, covers_p95,
                    color='tab:blue', alpha=0.15,
                    label='Variabilidad de los 500 árboles (5–95%)')
    ax.fill_between(fechas, covers_lower_res, covers_upper_res,
                    color='tab:orange', alpha=0.15,
                    label='Banda de error ±1.645σ residual (90%)')

    ax.set_title('Predicción de covers 2024-2025 vs datos reales\n(con áreas de variabilidad)')
    ax.set_ylabel('Covers')
    ax.set_xlabel('Mes')
    ax.legend(loc='upper left', fontsize=9)
    ax.grid(alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig('prediccion_covers.png', dpi=120)
    plt.show()


# ============ 9. GUARDAR MODELO ============
joblib.dump(modelo, 'modelo_covers.joblib')
print("\nModelo guardado en 'modelo_covers.joblib'")
print("Gráfico guardado en 'prediccion_covers.png'")