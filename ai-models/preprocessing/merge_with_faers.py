"""
Merge Indian medicines with FAERS (side effects) and SIDER data
"""
import pandas as pd
import os

def merge_datasets():
    """
    Merge Indian medicines with side effects and interactions data
    """
    print("🔗 Merging Indian medicines with FAERS and SIDER data...")
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    # Load Indian medicines with generics
    indian_file = os.path.join(data_dir, 'indian_medicines_with_generics.csv')
    if not os.path.exists(indian_file):
        print("❌ Indian medicines file not found. Run map_to_generics.py first")
        return False
    
    indian_df = pd.read_csv(indian_file)
    print(f"📊 Loaded {len(indian_df):,} Indian medicines")
    
    # Load FAERS processed data
    faers_file = os.path.join(data_dir, 'faers_full_processed.csv')
    if os.path.exists(faers_file):
        faers_df = pd.read_csv(faers_file)
        print(f"📊 Loaded {len(faers_df):,} FAERS records")
        
        # Merge on generic name (case-insensitive)
        indian_df['generic_lower'] = indian_df['generic_name'].str.lower()
        
        if 'drug_name' in faers_df.columns:
            faers_df['drug_lower'] = faers_df['drug_name'].str.lower()
            merged_faers = indian_df.merge(
                faers_df,
                left_on='generic_lower',
                right_on='drug_lower',
                how='left'
            )
            print(f"✅ Merged with FAERS: {len(merged_faers[merged_faers['drug_name'].notna()]):,} matches")
        else:
            print("⚠️  No drug_name column in FAERS data")
            merged_faers = indian_df
    else:
        print("⚠️  FAERS file not found, skipping...")
        merged_faers = indian_df
    
    # Load SIDER data
    sider_file = os.path.join(data_dir, 'side_effects_cleaned.csv')
    if os.path.exists(sider_file):
        sider_df = pd.read_csv(sider_file)
        print(f"📊 Loaded {len(sider_df):,} SIDER records")
        
        # Merge with SIDER
        if 'drug_name' in sider_df.columns:
            sider_df['drug_lower'] = sider_df['drug_name'].str.lower()
            final_df = merged_faers.merge(
                sider_df,
                left_on='generic_lower',
                right_on='drug_lower',
                how='left',
                suffixes=('_faers', '_sider')
            )
            print(f"✅ Merged with SIDER: {len(final_df[final_df['drug_name_sider'].notna()]):,} matches")
        else:
            print("⚠️  No drug_name column in SIDER data")
            final_df = merged_faers
    else:
        print("⚠️  SIDER file not found, skipping...")
        final_df = merged_faers
    
    # Clean up temporary columns
    final_df = final_df.drop(['generic_lower'], axis=1, errors='ignore')
    
    # Save final merged dataset
    output_file = os.path.join(data_dir, 'training_dataset.csv')
    final_df.to_csv(output_file, index=False)
    print(f"\n💾 Saved final training dataset: training_dataset.csv")
    print(f"📊 Total records: {len(final_df):,}")
    print(f"📋 Total columns: {len(final_df.columns)}")
    
    # Show statistics
    print("\n📊 Dataset Summary:")
    print(f"   • Indian brand names: {len(final_df):,}")
    print(f"   • Unique generics: {final_df['generic_name'].nunique():,}")
    
    if 'side_effect' in final_df.columns or 'reaction' in final_df.columns:
        se_col = 'side_effect' if 'side_effect' in final_df.columns else 'reaction'
        print(f"   • Records with side effects: {final_df[se_col].notna().sum():,}")
    
    print("\n✅ Dataset ready for training!")
    
    return True

if __name__ == "__main__":
    success = merge_datasets()
    if success:
        print("\n🚀 Next steps:")
        print("   1. python training/train_interaction_model.py")
        print("   2. python training/train_side_effect_model.py")
