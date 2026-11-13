import pandas as pd
import numpy as np
import pytest
from sklearn.model_selection import TimeSeriesSplit

# =====================================================================
# TEST 1: Prueba matemática de la estrategia TimeSeriesSplit
# =====================================================================
def test_timeseriessplit_preserves_chronological_order():
    """
    Valida que TimeSeriesSplit, al aplicarse sobre datos ordenados,
    garantiza que todos los índices de entrenamiento preceden
    estrictamente a los índices de validación en cada fold.
    """
    # Simulamos un dataset de 84 muestras ordenadas cronológicamente (0 a 83)
    n_samples = 84
    X = np.arange(n_samples).reshape(-1, 1)
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
        # 1. El índice máximo de train debe ser menor que el mínimo de validación
        assert max(train_idx) < min(val_idx), (
            f"Fuga temporal en el fold {fold}: "
            f"max(train)={max(train_idx)} >= min(val)={min(val_idx)}"
        )
        
        # 2. No debe haber solapamiento entre train y validación
        assert len(set(train_idx).intersection(set(val_idx))) == 0, (
            f"Solapamiento en el fold {fold}: hay índices repetidos."
        )
        
        # 3. Ambos conjuntos deben tener datos
        assert len(train_idx) > 0 and len(val_idx) > 0, (
            f"Fold {fold} contiene un conjunto vacío."
        )


# =====================================================================
# TEST 2: Prueba integrada con los datos reales (Fechas)
# =====================================================================
def test_timeseriessplit_on_real_dates():
    """
    Valida que, usando los datos reales ordenados por fecha,
    las fechas de entrenamiento en cada fold son estrictamente
    anteriores a las fechas de validación.
    """
    # Cargamos y preparamos los datos igual que en el pipeline
    df = pd.read_csv("brasaland_sales.csv")
    df['month'] = pd.to_datetime(df['month'])
    df['covers_lag12'] = df['covers_served'].shift(12)
    df_model = df.dropna(subset=['covers_lag12']).copy()
    
    # Filtramos el periodo de entrenamiento (hasta 2023) y ORDENAMOS
    train = df_model[df_model['month'].dt.year <= 2023].copy()
    train = train.sort_values('month').reset_index(drop=True)
    
    X_dates = train[['month']].values  # Solo necesitamos las fechas para este test
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X_dates), 1):
        fecha_max_train = X_dates[train_idx].max()
        fecha_min_val = X_dates[val_idx].min()
        
        assert fecha_max_train < fecha_min_val, (
            f"Fuga temporal en el fold {fold} con datos reales: "
            f"La fecha máxima de train ({fecha_max_train}) es mayor o igual "
            f"que la fecha mínima de validación ({fecha_min_val})."
        )