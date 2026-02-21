"""
Flask Backend for MediAI - OCR Medicine Scanner
Run this with: python flask_ocr_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
from PIL import Image, ImageEnhance, ImageFilter
import re
import os

# Try to import OpenCV for advanced preprocessing
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
    print("✅ OpenCV available for advanced image preprocessing")
except ImportError:
    OPENCV_AVAILABLE = False
    print("⚠️  OpenCV not installed. Basic preprocessing only. Install with: pip install opencv-python")

app = Flask(__name__)
CORS(app)  # Allow requests from Next.js frontend

# Try to import and configure Tesseract
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    
    # Try different common Tesseract paths
    tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Tesseract-OCR\tesseract.exe'
    ]
    
    for path in tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            TESSERACT_AVAILABLE = True
            print(f"✅ Tesseract found at: {path}")
            break
    
    if not TESSERACT_AVAILABLE:
        print("⚠️  Tesseract not found. OCR features will be limited.")
        print("📥 Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
except ImportError:
    print("⚠️  pytesseract not installed. Install with: pip install pytesseract")
    print("📥 Also install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki")

@app.route('/ocr-scan', methods=['POST'])
def ocr_scan():
    try:
        # Check if Tesseract is available
        if not TESSERACT_AVAILABLE:
            return jsonify({
                'error': 'OCR not available',
                'message': 'Tesseract OCR is not installed. Please install it from: https://github.com/UB-Mannheim/tesseract/wiki',
                'extracted_text': ''
            }), 503
        
        data = request.json
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        # Try multiple orientations for better results
        best_text = ""
        best_medicine = None
        
        for angle in [0, -5, 5, -10, 10]:  # Try slight rotations
            rotated = image.rotate(angle, expand=True, fillcolor='white') if angle != 0 else image
            processed_image = preprocess_image(rotated)
            extracted_text = perform_enhanced_ocr(processed_image)
            
            # Try to find medicine name
            medicine_name = extract_medicine_name(extracted_text)
            
            if medicine_name:
                best_medicine = medicine_name
                best_text = extracted_text
                print(f"✅ Found medicine at {angle}° rotation: {medicine_name}")
                break
            
            # Keep the longest text
            if len(extracted_text.strip()) > len(best_text.strip()):
                best_text = extracted_text
        
        extracted_text = best_text
        print(f"📝 Raw OCR output: {extracted_text[:200]}")  # Debug print
        
        # Check if any text was extracted
        if not extracted_text.strip():
            return jsonify({
                'error': 'No text found in image',
                'message': 'Could not extract any text. Please take a clearer photo with visible text.'
            }), 400
        
        # Extract medicine name using pattern matching
        if not best_medicine:
            medicine_name = extract_medicine_name(extracted_text)
        else:
            medicine_name = best_medicine
        
        # If no medicine name found, return error
        if not medicine_name:
            print(f"DEBUG: Extracted text = '{extracted_text}'")
            print(f"DEBUG: Extracted text length = {len(extracted_text)}")
            print(f"DEBUG: Extracted text stripped = '{extracted_text.strip()}'")
            return jsonify({
                'error': 'Medicine not found',
                'message': 'Could not identify medicine name. Please upload a clear photo of medicine packaging.',
                'extracted_text': extracted_text.strip()
            }), 400
        
        # Calculate confidence (simple heuristic)
        confidence = calculate_confidence(extracted_text, medicine_name)
        
        return jsonify({
            'medicine_name': medicine_name,
            'extracted_text': extracted_text.strip(),
            'confidence': confidence
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def preprocess_image(image):
    """
    Preprocess image for better OCR accuracy
    """
    if OPENCV_AVAILABLE:
        # Advanced preprocessing with OpenCV
        # Convert PIL Image to OpenCV format
        img_array = np.array(image)
        
        # Convert to grayscale if color
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply multiple preprocessing techniques
        # 1. Resize if too small
        height, width = gray.shape
        if height < 300 or width < 300:
            scale = max(300 / height, 300 / width)
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # 2. Denoise
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # 3. Increase contrast using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrasted = clahe.apply(denoised)
        
        # 4. Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            contrasted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 5. Morphological operations to remove noise
        kernel = np.ones((1, 1), np.uint8)
        morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Convert back to PIL Image
        return Image.fromarray(morph)
    else:
        # Basic preprocessing with PIL only
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize if too small
        width, height = image.size
        if width < 300 or height < 300:
            scale = max(300 / width, 300 / height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.LANCZOS)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        
        return image


def perform_enhanced_ocr(image):
    """
    Perform OCR with multiple configurations and combine results
    """
    texts = []
    
    # Configuration 1: Assume single uniform block of text
    text1 = pytesseract.image_to_string(image, config='--psm 6 --oem 3')
    texts.append(text1)
    
    # Configuration 2: Treat as sparse text (good for bottles/boxes)
    text2 = pytesseract.image_to_string(image, config='--psm 11 --oem 3')
    texts.append(text2)
    
    # Configuration 3: Single text line
    text3 = pytesseract.image_to_string(image, config='--psm 7 --oem 3')
    texts.append(text3)
    
    # Configuration 4: Single word (for clear brand names)
    text4 = pytesseract.image_to_string(image, config='--psm 8 --oem 3')
    texts.append(text4)
    
    # Get all extracted texts and combine unique valid words
    all_words = []
    for text in texts:
        words = text.split()
        all_words.extend(words)
    
    # Combine and get the longest result (usually more complete)
    combined = max(texts, key=lambda x: len(x.strip()))
    
    # If combined is mostly garbage, try to extract readable words
    readable_words = [w for w in all_words if len(w) >= 3 and w.isalpha()]
    if readable_words and len(combined.strip()) < 50:
        combined = ' '.join(readable_words)
    
    return combined


def extract_medicine_name(text):
    """
    Extract medicine name from OCR text using improved pattern matching
    """
    if not text or len(text.strip()) < 2:
        return None
    
    # Clean text
    text = ' '.join(text.split())
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    print(f"🔍 Analyzing lines: {lines[:10]}")  # Debug
    
    # Common Indian medicine brands and patterns
    indian_medicines = [
        'Crocin', 'Dolo', 'Paracetamol', 'Combiflam', 'Vicks', 'Disprin',
        'Ibuprofen', 'Aspirin', 'Cetrizine', 'Sinarest', 'Allegra', 'Omnacortil',
        'Azithromycin', 'Amoxicillin', 'Augmentin', 'Ciprofloxacin', 'Metformin',
        'Amlodipine', 'Atorvastatin', 'Pantoprazole', 'Omeprazole', 'Ranitidine',
        'NoCough', 'Benadryl', 'Chericof', 'Ascoril', 'Alex', 'Phensedyl',
        'Glycodin', 'Tossex', 'Corex', 'DX', 'Coldact', 'Grilinctus',
        'Uromacron', 'Norfloxacin', 'Ofloxacin', 'Levofloxacin', 'Moxifloxacin'
    ]
    
    # Extract all words that are at least 3 characters and mostly alphabetic
    words = re.findall(r'\b[A-Za-z]{3,}(?:\s*[A-Z]{2})?\b', text)
    
    print(f"🔍 Extracted words: {words[:20]}")  # Debug
    
    # Pattern 1: Check for known medicines (case insensitive)
    for word in words:
        for med in indian_medicines:
            if med.lower() == word.lower():
                # Look for dosage nearby in original text
                dosage_match = re.search(rf'{word}\s*(\d+\s*(?:mg|ml|g))', text, re.IGNORECASE)
                if dosage_match:
                    return f"{med} {dosage_match.group(1)}"
                return med
            # Partial match (at least 70% similar)
            if len(word) >= 4 and (word.lower() in med.lower() or med.lower() in word.lower()):
                if len(word) >= len(med) * 0.7:
                    return med
    
    # Pattern 2: Look for "DX" suffix (common in cough syrups)
    dx_match = re.search(r'([A-Za-z]+)\s*DX', text, re.IGNORECASE)
    if dx_match:
        return f"{dx_match.group(1)} DX"
    
    # Pattern 3: Check for "cough", "cold", "fever" related medicines
    health_keywords = ['cough', 'cold', 'fever', 'pain', 'allerg']
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in health_keywords):
            # Extract capitalized words from this line
            caps_words = re.findall(r'\b[A-Z][a-z]{2,}\b', line)
            if caps_words:
                return caps_words[0]
    
    # Pattern 2: Medicine name with dosage (e.g., "Paracetamol 500mg", "DOLO 650")
    patterns = [
        r'([A-Z][a-z]+(?:[A-Z][a-z]+)*)\s+(\d+\s*(?:mg|g|ml|mcg))',  # Paracetamol 500mg
        r'([A-Z]{3,})\s+(\d+)',  # DOLO 650
        r'([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)\s*[-:]\s*(\d+\s*(?:mg|g|ml))',  # Medicine: 500mg
        r'([A-Z][a-zA-Z]+)\s+(?:Tablets?|Capsules?|Syrup)\s*(\d+\s*(?:mg|g|ml))?',  # Aspirin Tablet 100mg
    ]
    
    for pattern in patterns:
        for line in lines:
            match = re.search(pattern, line)
            if match:
                if match.lastindex >= 2 and match.group(2):
                    return f"{match.group(1)} {match.group(2)}"
                return match.group(1)
    
    # Pattern 3: Look for capitalized words (likely brand names)
    for line in lines:
        # Find words that are all caps or start with capital (3+ letters)
        words = re.findall(r'\b[A-Z][A-Za-z]{2,}\b', line)
        if words:
            # Filter out common words
            excluded = ['TABLET', 'TABLETS', 'CAPSULE', 'CAPSULES', 'SYRUP', 'MG', 'ML', 
                       'PACK', 'STRIP', 'PHARMA', 'PHARMACEUTICAL', 'MFD', 'EXP', 
                       'BATCH', 'MRP', 'COMPOSITION', 'USES', 'DOSAGE']
            
            for word in words:
                if word.upper() not in excluded and len(word) >= 4:
                    # Look for dosage nearby
                    dosage_match = re.search(rf'{word}\s*(\d+\s*(?:mg|g|ml))', line, re.IGNORECASE)
                    if dosage_match:
                        return f"{word} {dosage_match.group(1)}"
                    return word
    
    # Pattern 4: First meaningful line (often the medicine name)
    for line in lines:
        clean_line = line.strip()
        if len(clean_line) >= 4 and not clean_line.startswith(('MRP', 'Rs.', 'Batch', 'Mfg', 'Exp')):
            # Extract first meaningful word
            words = clean_line.split()
            if words and len(words[0]) >= 3:
                return words[0]
    
    return None


def calculate_confidence(text, medicine_name):
    """
    Calculate confidence score based on text quality.
    Simple heuristic - can be improved with proper ML.
    """
    if not text or not medicine_name:
        return 0.3
    
    # Factors that increase confidence:
    # - Text length
    # - Presence of numbers (dosage)
    # - Presence of common medicine-related keywords
    
    score = 0.5
    
    if len(text) > 20:
        score += 0.1
    
    if re.search(r'\d+\s*(?:mg|g|ml)', text, re.IGNORECASE):
        score += 0.2
    
    keywords = ['tablet', 'capsule', 'syrup', 'medicine', 'pharma', 'pharmaceutical']
    for keyword in keywords:
        if keyword in text.lower():
            score += 0.05
    
    return min(score, 0.95)  # Cap at 95%


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'OCR server is running'})


if __name__ == '__main__':
    print("🚀 MediAI Flask OCR Server starting...")
    print("📷 Ready to scan medicine photos!")
    print("⚡ Running on http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=True)
