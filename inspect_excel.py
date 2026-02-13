import pandas as pd

try:
    file_path = r'd:\Private\Late Checker\Transaction_2026-02-12_2026-02-12.xlsx'
    # Read first 20 rows, no header assumption
    df = pd.read_excel(file_path, header=None, nrows=20)
    print("First 20 rows:")
    print(df)
except Exception as e:
    print(f"Error reading excel: {e}")
