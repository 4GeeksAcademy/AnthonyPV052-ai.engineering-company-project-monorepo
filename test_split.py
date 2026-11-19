import pandas as pd
import numpy as np
import pytest

def load_and_prepare():
    """Replica el pipeline de carga y split del script principal."""
    df = pd.read_csv("brasaland_sales.csv")
    df['month'] = pd.to_datetime(df['month'])
    df['month_dt'] = df['month']
    df['year'] = df['month'].dt.year
    df['month_num'] = df['month'].dt.month
    df['month_sin'] = np.sin(2 * np.pi * df['month_num'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month_num'] / 12)
    df = df.drop(columns=['month', 'revenue_usd', 'market'])
    df['covers_lag12'] = df['covers_served'].shift(12)
    df['ratio_yoy'] = df['covers_served'] / df['covers_lag12']
    df_model = df.dropna(subset=['covers_lag12']).copy()
    train = df_model[df_model['year'] <= 2023].copy()
    test = df_model[df_model['year'] >= 2024].copy()
    features = ['month_num', 'avg_ticket_usd']
    return df_model, train, test, features

def test_split_proportion():
    """Valida que el split respete aproximadamente 80/20."""
    df_model, train, test, _ = load_and_prepare()
    test_ratio = len(test) / len(df_model)
    # Tolerancia: 15% - 25% (el split temporal no puede ser exacto al 20%)
    assert 0.15 <= test_ratio <= 0.25, (
        f"El split no respeta la proporción 80/20: test = {test_ratio:.2%} "
        f"({len(test)}/{len(df_model)}). Debería estar entre 15% y 25%."
    )

def test_temporal_order():
    """Valida que no haya data leakage temporal (train < test)."""
    _, train, test, _ = load_and_prepare()
    assert train['month_dt'].max() < test['month_dt'].min(), (
        "Data leakage temporal: hay fechas de train posteriores o iguales a las de test."
    )

def test_no_date_overlap():
    """Valida que no haya fechas repetidas entre train y test."""
    _, train, test, _ = load_and_prepare()
    assert set(train['month_dt']).isdisjoint(set(test['month_dt'])), (
        "Data leakage: hay fechas que aparecen en train y en test."
    )

def test_no_target_in_features():
    """Valida que el target ni sus derivados estén en las features."""
    _, _, _, features = load_and_prepare()
    forbidden = ['covers_served', 'ratio_yoy', 'revenue_usd', 'covers_lag12']
    for col in forbidden:
        assert col not in features, (
            f"Data leakage: la columna '{col}' no debe estar en las features."
        )

def test_lag_correctness():
    """Valida que el lag de 12 meses esté bien calculado (sin usar datos futuros)."""
    df_model, _, _, _ = load_and_prepare()
    df_sorted = df_model.sort_values('month_dt').reset_index(drop=True)
    lookup = df_sorted.set_index('month_dt')['covers_served']
    for _, row in df_sorted.iterrows():
        fecha = row['month_dt']
        fecha_lag = fecha - pd.DateOffset(months=12)
        if fecha_lag in lookup.index:
            expected = lookup.loc[fecha_lag]
            actual = row['covers_lag12']
            assert actual == expected, (
                f"Lag incorrecto en {fecha}: esperado {expected}, obtenido {actual}"
            )