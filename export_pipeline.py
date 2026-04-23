import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import PolynomialFeatures, StandardScaler


FINAL_DATA_PATH = "data/processed/final_dengue_weather.csv"
OUTPUT_PATH = "models/pipeline.pkl"


def build_engineered_dataset(df: pd.DataFrame):
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["Region", "Date"]).reset_index(drop=True)

    thresholds = df.groupby("Region")["Dengue_Cases"].transform(lambda x: x.quantile(0.75))
    df["Is_Outbreak"] = (df["Dengue_Cases"] > thresholds).astype(int)

    df["rfh_lag1"] = df.groupby("Region")["rfh"].shift(1)
    df["rfh_lag1"] = df.groupby("Region")["rfh_lag1"].transform(lambda x: x.bfill())

    weather_cols = ["rfh", "rfh_avg", "rfh_lag1"]
    poly = PolynomialFeatures(degree=2, include_bias=False)
    poly_features = poly.fit_transform(df[weather_cols])
    poly_col_names = list(poly.get_feature_names_out(weather_cols))
    poly_df = pd.DataFrame(poly_features, columns=poly_col_names, index=df.index)

    df = pd.concat([df.drop(columns=weather_cols), poly_df], axis=1)

    scaler = StandardScaler()
    df[poly_col_names] = scaler.fit_transform(df[poly_col_names])

    return df, scaler, poly, poly_col_names


def train_best_model(df_engineered: pd.DataFrame):
    drop_cols = ["Month", "Year", "Region", "Dengue_Cases", "Dengue_Deaths", "Date", "Is_Outbreak"]
    X = df_engineered.drop(columns=drop_cols)
    y = df_engineered["Is_Outbreak"]
    feature_columns = list(X.columns)

    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    rf_params = {
        "n_estimators": [50, 100, 200],
        "max_depth": [5, 10, 15],
        "min_samples_split": [2, 5],
    }

    grid_rf = GridSearchCV(
        RandomForestClassifier(random_state=42),
        rf_params,
        cv=5,
        scoring="accuracy",
    )
    grid_rf.fit(X_train, y_train)
    return grid_rf.best_estimator_, feature_columns, grid_rf.best_params_, grid_rf.best_score_


def main():
    source_df = pd.read_csv(FINAL_DATA_PATH)
    engineered_df, scaler, poly, poly_col_names = build_engineered_dataset(source_df)
    best_model, feature_columns, best_params, best_cv_score = train_best_model(engineered_df)

    regions = sorted(source_df["Region"].dropna().unique().tolist())
    region_default_lag = (
        source_df.sort_values(["Region", "Date"])
        .groupby("Region")["rfh"]
        .last()
        .to_dict()
    )

    bundle = (
        best_model,
        scaler,
        feature_columns,
        {
            "poly_feature_order": poly_col_names,
            "regions": regions,
            "region_default_lag": region_default_lag,
            "best_params": best_params,
            "best_cv_score": float(best_cv_score),
        },
    )
    joblib.dump(bundle, OUTPUT_PATH)

    print(f"Saved: {OUTPUT_PATH}")
    print(f"Features ({len(feature_columns)}): {feature_columns}")
    print(f"Best Params: {best_params}")
    print(f"Best CV Score: {best_cv_score:.4f}")


if __name__ == "__main__":
    main()
