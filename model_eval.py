import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit, learning_curve
from sklearn.metrics import mean_squared_error

# ============================================================
# 1. Preparar datos (igual que en tu script principal)
# ============================================================
df = pd.read_csv("brasaland_sales.csv")
df['month'] = pd.to_datetime(df['month'])
df['month_dt'] = df['month']
df['year'] = df['month'].dt.year
df['month_num'] = df['month'].dt.month
df['month_sin'] = np.sin(2 * np.pi * df['month_num'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month_num'] / 12)
df = df.drop(columns=['month', 'revenue_usd', 'market'])

# Calcular lag UNA VEZ aquí; es seguro porque es shift(12)
df['covers_lag12'] = df['covers_served'].shift(12)
df['ratio_yoy'] = df['covers_served'] / df['covers_lag12']
df_model = df.dropna(subset=['covers_lag12']).copy()

# ============================================================
# 2. Usar SOLO el periodo de entrenamiento (2016-2023) para CV
#    El test (2024-2025) se reserva para evaluación final.
# ============================================================
train = df_model[df_model['year'] <= 2023].copy()
train = train.sort_values('month_dt').reset_index(drop=True)

features = ['month_num', 'avg_ticket_usd']
X = train[features]
y = train['ratio_yoy']

# ============================================================
# 3. Modelo
# ============================================================
modelo = RandomForestRegressor(
    n_estimators=500, max_depth=3, min_samples_leaf=3,
    random_state=42, n_jobs=-1
)

# ============================================================
# 4. VALIDACIÓN CRUZADA TEMPORAL (TimeSeriesSplit)
#    - 5 folds, respeta el orden temporal.
#    - No hay fuga porque el lag es shift(12) y siempre usa el pasado.
# ============================================================
tscv = TimeSeriesSplit(n_splits=5)

rmse_folds = []
for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
    X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
    y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

    modelo_fold = RandomForestRegressor(
        n_estimators=500, max_depth=3, min_samples_leaf=3,
        random_state=42, n_jobs=-1
    )
    modelo_fold.fit(X_tr, y_tr)

    # Predicción en ratio y reconstrucción a covers
    ratio_pred = modelo_fold.predict(X_val)
    covers_pred = ratio_pred * train.iloc[val_idx]['covers_lag12'].values
    covers_real = train.iloc[val_idx]['covers_served'].values

    rmse = np.sqrt(mean_squared_error(covers_real, covers_pred))
    rmse_folds.append(rmse)
    print(f"Fold {fold}: {len(train_idx)} train / {len(val_idx)} val  →  RMSE = {rmse:,.0f}")

print(f"\nRMSE medio CV: {np.mean(rmse_folds):,.0f}  ±  {np.std(rmse_folds):,.0f}")

# ============================================================
# 5. CURVA DE APRENDIZAJE REAL (usando el bucle de TimeSeriesSplit)
# ============================================================
tscv = TimeSeriesSplit(n_splits=5)

tamanos_train = []
rmse_train_vals = []
rmse_val_vals = []

for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
    X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
    y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

    modelo_fold = RandomForestRegressor(
        n_estimators=500, max_depth=3, min_samples_leaf=3,
        random_state=42, n_jobs=-1
    )
    modelo_fold.fit(X_tr, y_tr)
    
    # Guardamos el tamaño del conjunto de entrenamiento
    tamanos_train.append(len(X_tr))

    # --- Error en TRAIN ---
    ratio_pred_train = modelo_fold.predict(X_tr)
    covers_pred_train = ratio_pred_train * train.iloc[train_idx]['covers_lag12'].values
    covers_real_train = train.iloc[train_idx]['covers_served'].values
    rmse_train = np.sqrt(mean_squared_error(covers_real_train, covers_pred_train))
    rmse_train_vals.append(rmse_train)

    # --- Error en VALIDATION ---
    ratio_pred_val = modelo_fold.predict(X_val)
    covers_pred_val = ratio_pred_val * train.iloc[val_idx]['covers_lag12'].values
    covers_real_val = train.iloc[val_idx]['covers_served'].values
    rmse_val = np.sqrt(mean_squared_error(covers_real_val, covers_pred_val))
    rmse_val_vals.append(rmse_val)

# --- GRÁFICO ---
plt.figure(figsize=(10, 5))
plt.plot(tamanos_train, rmse_train_vals, 'o-', color='tab:blue', label='Error de entrenamiento')
plt.plot(tamanos_train, rmse_val_vals, 's-', color='tab:orange', label='Error de validación')

plt.xlabel('Tamaño del conjunto de entrenamiento (nº de muestras)')
plt.ylabel('RMSE en covers')
plt.title('Curva de aprendizaje — RandomForest con TimeSeriesSplit')
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('learning_curve_real.png', dpi=120)
plt.show()

# ============================================================
# 6. DIAGNÓSTICO AUTOMÁTICO
# ============================================================
gap_final = np.mean(rmse_val_vals) - np.mean(rmse_train_vals)
train_final = np.mean(rmse_train_vals)
val_final = np.mean(rmse_val_vals)

print("\n" + "=" * 55)
print("DIAGNÓSTICO DEL MODELO")
print("=" * 55)
print(f"Error final de entrenamiento: {train_final:.4f}")
print(f"Error final de validación   : {val_final:.4f}")
print(f"Brecha (gap)                : {gap_final:.4f}")

if val_final > 1.5 * train_final and train_final < 0.02:
    print("→ OVERFITTING: el modelo memoriza (train muy bajo, val alto).")
elif val_final > 0.08 and abs(gap_final) < 0.02:
    print("→ UNDERFITTING: el modelo es demasiado simple (ambos errores altos).")
else:
    print("→ BUEN AJUSTE: train y validación están cerca y bajos.")