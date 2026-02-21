"""
Filter Kaggle dataset from 200k to ~5k most common medicines
"""
import pandas as pd
import os

def filter_medicines():
    """Filter to most common and relevant medicines"""
    
    print("🔍 Filtering Indian medicines dataset...")
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw_indian_medicines')
    
    # Find the Indian medicine CSV file
    csv_file = os.path.join(data_dir, 'A_Z_medicines_dataset_of_India.csv')
    
    if not os.path.exists(csv_file):
        print(f"❌ File not found: {csv_file}")
        print("Run download script first!")
        return False
    
    print(f"📂 Reading: A_Z_medicines_dataset_of_India.csv")
    
    # Read dataset
    df = pd.read_csv(csv_file)
    print(f"📊 Total medicines in dataset: {len(df):,}")
    print(f"📋 Columns: {df.columns.tolist()}")
    
    # Show sample
    print("\n📝 Sample data:")
    print(df.head())
    
    # Filter criteria
    print("\n🎯 Applying filters...")
    
    original_count = len(df)
    
    # 1. Remove discontinued medicines
    if 'Is_discontinued' in df.columns:
        df = df[df['Is_discontinued'] == False]
        print(f"   ✓ After removing discontinued: {len(df):,} medicines")
    
    # 2. Remove very expensive medicines (outliers)
    if 'price(₹)' in df.columns:
        df = df[df['price(₹)'] < 3000]  # Keep medicines under ₹3000
        df = df[df['price(₹)'] > 1]  # Remove very cheap (likely errors)
        print(f"   ✓ After price filter (₹1-3000): {len(df):,} medicines")
    
    # 3. Keep only allopathy (modern medicine)
    if 'type' in df.columns:
        df = df[df['type'] == 'allopathy']
        print(f"   ✓ After type filter (allopathy only): {len(df):,} medicines")
    
    # 4. Keep only top manufacturers
    popular_manufacturers = [
        'Sun Pharma', 'Cipla', 'Dr Reddy', 'Lupin', 'Mankind Pharma',
        'Alembic', 'Zydus', 'Torrent', 'Glenmark', 'Abbott',
        'USV', 'Macleods', 'Micro Labs', 'Piramal', 'Glaxo SmithKline',
        'Alkem', 'Ajanta', 'Intas', 'Cadila', 'Elder Pharma'
    ]
    
    if 'manufacturer_name' in df.columns:
        # Keep manufacturers that contain any of the popular names
        mask = df['manufacturer_name'].str.contains('|'.join(popular_manufacturers), case=False, na=False)
        df = df[mask]
        print(f"   ✓ After manufacturer filter: {len(df):,} medicines")
    
    # 5. If still too many medicines, take top 5000 by price (most common/affordable)
    if len(df) > 5000:
        df = df.nsmallest(5000, 'price(₹)')
        print(f"   ✓ Kept top 5000 most affordable medicines: {len(df):,} medicines")
    
    print(f"\n✅ Filtered from {original_count:,} to {len(df):,} medicines ({(len(df)/original_count)*100:.1f}%)")
    
    # Save filtered dataset
    processed_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
    os.makedirs(processed_dir, exist_ok=True)
    output_file = os.path.join(processed_dir, 'indian_medicines_filtered_5k.csv')
    df.to_csv(output_file, index=False)
    print(f"💾 Saved to: indian_medicines_filtered.csv")
    
    # Show statistics
    print("\n📊 Statistics:")
    if 'Manufacturer' in df.columns or 'manufacturer' in df.columns:
        mfr_col = 'Manufacturer' if 'Manufacturer' in df.columns else 'manufacturer'
        print(f"   • Top manufacturers: {df[mfr_col].value_counts().head(10).to_dict()}")
    
    return True

if __name__ == "__main__":
    success = filter_medicines()
    if success:
        print("\n✅ Ready for next step: python preprocessing/map_to_generics.py")
