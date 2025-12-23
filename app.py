import os
import json
import base64
import shutil
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from datetime import datetime
from template_strings import nctu, academic
app = Flask(__name__)
# Absolute path to ensure it always finds the folder
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Create upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/api/fix-html', methods=['POST'])
def fix_html():
    """Refine full HTML content using Google Gemini API"""
    try:
        data = request.json
        html_content = data.get('html', '')
        api_key = data.get('api_key', '')
        instruction = data.get('instruction', 'Fix grammar, make the tone professional, and ensure HTML structure is clean.')

        if not html_content:
            return jsonify({'error': 'No HTML provided'}), 400
        if not api_key:
            return jsonify({'error': 'No API key provided'}), 400

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Prompt engineering to ensure it returns ONLY valid HTML matching the style
        prompt = f"""
        You are an expert HTML and Content Editor. 
        Your task is to refine the following HTML content based on this instruction: "{instruction}"
        
        Rules:
        1. Correct any grammar or spelling errors in the text content.
        2. Improve the professional tone of the text.
        3. DO NOT remove existing CSS classes (like 'title', 'content-block', 'page').
        4. DO NOT remove structural divs (like 'page', 'page-content').
        5. Return ONLY the raw HTML code inside the <body> tag. Do not return Markdown formatting (no ```html).
        
        Input HTML:
        {html_content}
        """

        response = model.generate_content(prompt)
        
        if not response.text:
            return jsonify({'error': 'No response from Gemini'}), 400

        # clean up if Gemini wraps in markdown
        cleaned_html = response.text.replace('```html', '').replace('```', '').strip()
        
        return jsonify({'success': True, 'fixed_html': cleaned_html})

    except Exception as e:
        print(f"HTML Fix Error: {e}")
        return jsonify({'error': str(e)}), 500
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'image' not in request.files: 
            return jsonify({'error': 'No image part'}), 400
        file = request.files['image']
        if file.filename == '': 
            return jsonify({'error': 'No selected file'}), 400
        
        ext = os.path.splitext(file.filename)[1]
        filename = secure_filename(f"img_{int(datetime.now().timestamp())}{ext}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        file.save(filepath)
        
        # Return URL relative to static
        return jsonify({'success': True, 'url': f'/static/uploads/{filename}'})
    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': str(e)}), 500

def prepare_images_for_export(blocks):
    """Encode images found in BLOCKS to Base64."""
    if not blocks: return []
    
    for blk in blocks:
        if blk.get('type') == 'image':
            url = blk.get('url') or blk.get('src', '')
            
            if url.startswith('/static/uploads/'):
                # Strip leading slash for os.path.join if needed, 
                # but better to assume it maps to UPLOAD_FOLDER
                filename = os.path.basename(url)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                
                if os.path.exists(filepath):
                    try:
                        with open(filepath, 'rb') as f:
                            b64 = base64.b64encode(f.read()).decode()
                            ext = os.path.splitext(filepath)[1].lower().replace('.', '')
                            mime = 'image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png'
                            blk['src'] = f"data:{mime};base64,{b64}"
                    except Exception as e:
                        print(f"Error encoding {filepath}: {e}")
            else:
                blk['src'] = url
    return blocks

def process_section_images(section):
    if 'blocks' in section:
        section['blocks'] = prepare_images_for_export(section['blocks'])
    if 'subsections' in section:
        for subsec in section['subsections']:
            process_section_images(subsec)

@app.route('/api/rephrase', methods=['POST'])
def rephrase_text():
    """Rephrase text using Google Gemini API"""
    try:
        data = request.json
        text = data.get('text', '')
        api_key = data.get('api_key', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        if not api_key:
            return jsonify({'error': 'No API key provided'}), 400
        
        import google.generativeai as genai
        
        # Configure API key
        genai.configure(api_key=api_key)
        
        # Create model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        prompt = f"Please rephrase the following text to be more professional and clear while maintaining the original meaning. Keep the same language (Chinese or English). Only return the rephrased text without any explanations:\n\n{text}"
        
        response = model.generate_content(prompt)
        
        if not response.text:
            return jsonify({'error': 'No response from Gemini'}), 400
        
        return jsonify({'success': True, 'rephrased': response.text.strip()})
        
    except Exception as e:
        print(f"Rephrase Error: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/generate-document', methods=['POST'])
def generate_document():
    try:
        data = request.json
        sections = data.get('sections', [])
        formatting = data.get('formatting', {})
        include_toc = data.get('include_toc', False)
        template = data.get('template', 'nctu')  # NEW: default to nctu
        
        for section in sections:
            process_section_images(section)

        # Select template
        if template == 'academic':
            full_html = academic.generate_full_html(sections, formatting, include_toc)
        else:
            full_html = nctu.generate_full_html(sections, formatting, include_toc)
            
        return jsonify({'success': True, 'html': full_html})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)