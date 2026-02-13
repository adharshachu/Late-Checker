import pandas as pd

pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

try:
    file_path = r'd:\Private\Late Checker\Transaction_2026-02-12_2026-02-12.xlsx'
    # Read first 15 rows
    df = pd.read_excel(file_path, header=None, nrows=15)
    
    print("All rows raw data (first 15):")
    for index, row in df.iterrows():
        # Filter out nan values for cleaner view
        clean_row = [str(x) for x in row if str(x) != 'nan']
        print(f"Row {index}: {clean_row}")

except Exception as e:
    print(f"Error reading excel: {e}")
