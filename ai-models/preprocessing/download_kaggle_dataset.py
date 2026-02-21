"""
Download A-Z Medicine Dataset from Kaggle
"""
import os
import sys

def download_dataset():
    """Download the Indian medicine dataset from Kaggle"""
    
    print("📥 Downloading A-Z Medicine Dataset from Kaggle...")
    
    # Check if kaggle is installed
    try:
        import kaggle
    except ImportError:
        print("❌ Kaggle package not found. Installing...")
        os.system(f'{sys.executable} -m pip install kaggle')
        import kaggle
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Download dataset
    try:
        print("\n🔐 Make sure you have:")
        print("   1. Kaggle account created")
        print("   2. API token downloaded from https://www.kaggle.com/settings")
        print("   3. Token saved at: C:\\Users\\Chris\\.kaggle\\kaggle.json")
        print("\nDownloading dataset (this may take a few minutes)...\n")
        
        kaggle.api.dataset_download_files(
            'shudhanshusingh/az-medicine-dataset-of-india',
            path=data_dir,
            unzip=True
        )
        
        print("✅ Dataset downloaded successfully!")
        print(f"📁 Location: {data_dir}")
        
        # List downloaded files
        files = os.listdir(data_dir)
        print(f"\n📋 Downloaded files: {files}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error downloading dataset: {e}")
        print("\n💡 Setup Instructions:")
        print("   1. Go to https://www.kaggle.com/settings")
        print("   2. Scroll to 'API' section")
        print("   3. Click 'Create New API Token'")
        print("   4. Save kaggle.json to: C:\\Users\\Chris\\.kaggle\\")
        return False

if __name__ == "__main__":
    success = download_dataset()
    if success:
        print("\n✅ Ready for next step: python preprocessing/filter_indian_medicines.py")
    else:
        print("\n⚠️  Please setup Kaggle API first")
