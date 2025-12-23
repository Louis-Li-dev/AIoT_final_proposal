import html
import re

def generate_css(formatting):
    en_font = formatting.get('englishFont', "'Garamond', 'Georgia', serif")
    zh_font = formatting.get('chineseFont', "'SimSun', '宋体', serif")
    base_size = formatting.get('bodySize', '12')
    line_height = formatting.get('lineHeight', '1.8')
    
    return f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=Noto+Serif+TC:wght@400;500;700&display=swap');
        
        :root {{ 
            --margin-left: 30mm;
            --margin-right: 25mm;
            --margin-top: 25mm;
            --margin-bottom: 25mm;
        }}
        
        * {{ 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
        }}
        
        html, body {{ margin: 0; padding: 0; width: 100%; }}
        
        body {{ 
            background: #f5f5f5; 
            font-family: {en_font}, {zh_font}, serif; 
            font-size: {base_size}pt; 
            line-height: {line_height}; 
            color: #1a1a1a; 
        }}

        /* PAGE LAYOUT */
        .page {{ 
            position: relative; 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto 20mm; 
            background: white; 
            page-break-after: always; 
            break-after: page; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        
        .page:last-child {{ page-break-after: auto; }}
        
        .page-content {{ 
            padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
            min-height: calc(297mm - var(--margin-top) - var(--margin-bottom));
        }}
        
        /* PAGE NUMBERS */
        .page-number {{
            position: absolute;
            bottom: 15mm;
            right: 25mm;
            font-size: 10pt;
            color: #666;
            font-style: italic;
        }}
        
        /* RUNNING HEADER */
        .running-header {{
            position: absolute;
            top: 15mm;
            left: 30mm;
            right: 25mm;
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 0.5pt solid #ccc;
            padding-bottom: 5pt;
        }}

        /* SECTION WRAPPER */
        .section-wrapper {{ 
            page-break-inside: avoid; 
            break-inside: avoid; 
        }}

        /* TYPOGRAPHY */
        h1.title {{ 
            font-size: 18pt; 
            font-weight: 700; 
            text-align: center;
            margin: 0 0 8pt 0;
            color: #000; 
            line-height: 1.3;
            text-transform: uppercase;
            letter-spacing: 2pt;
        }}
        
        h2.subtitle {{ 
            font-size: 14pt; 
            font-weight: 600; 
            margin: 24pt 0 12pt 0; 
            color: #000;
            border-bottom: 1pt solid #000;
            padding-bottom: 4pt;
        }}
        
        h3.subsubtitle {{ 
            font-size: 12pt; 
            font-weight: 600; 
            margin: 18pt 0 10pt 0; 
            color: #000;
            font-style: italic;
        }}
        
        .section-number {{ 
            font-weight: 700; 
            margin-right: 8pt; 
        }}
        
        p {{ 
            margin: 0 0 12pt 0; 
            padding: 0; 
            text-align: justify;
            text-indent: 2em;
            hyphens: auto;
        }}
        
        p:first-of-type {{
            text-indent: 0;
        }}

        /* BLOCKS */
        .content-block {{ 
            margin-bottom: 14pt; 
        }}
        
        .align-left {{ text-align: justify; }}
        .align-center {{ text-align: center; text-indent: 0; }}

        /* ABSTRACT */
        .abstract {{
            margin: 24pt 40pt;
            padding: 12pt;
            border-left: 2pt solid #000;
            font-size: 11pt;
        }}
        
        .abstract-title {{
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1pt;
            margin-bottom: 8pt;
        }}

        /* FIGURES */
        .figure-group {{
            margin: 18pt 0;
            clear: both;
            page-break-inside: avoid;
        }}

        .figure-group.wrapped {{
            float: right;
            margin-left: 18pt;
            margin-bottom: 12pt;
            max-width: 45%;
        }}

        .figure-group.standalone {{
            display: block;
            margin: 24pt auto;
            max-width: 80%;
        }}

        .figure-row {{
            display: flex;
            gap: 10pt;
            margin-bottom: 10pt;
        }}

        .figure-row:last-child {{
            margin-bottom: 0;
        }}

        .figure-item {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}

        .figure-item img {{
            width: 100%;
            height: auto;
            border: 0.5pt solid #333;
            display: block;
        }}

        .figure-caption {{
            font-size: 10pt;
            color: #333;
            margin-top: 6pt;
            text-align: center;
            font-style: italic;
            line-height: 1.4;
        }}

        /* TABLES */
        .content-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 18pt 0;
            font-size: 11pt;
        }}
        
        .content-table th {{
            border-top: 1.5pt solid #000;
            border-bottom: 1pt solid #000;
            padding: 8pt;
            text-align: left;
            font-weight: 600;
        }}
        
        .content-table td {{
            border-bottom: 0.5pt solid #ccc;
            padding: 8pt;
        }}
        
        .content-table tr:last-child td {{
            border-bottom: 1.5pt solid #000;
        }}

        /* LISTS */
        ul.custom-list {{ 
            margin: 12pt 0; 
            padding-left: 0; 
            list-style: none; 
        }}
        
        ul.custom-list li {{ 
            margin-bottom: 8pt; 
            position: relative; 
            text-align: justify; 
            padding-left: 2.5em;
        }}
        
        ul.list-parens {{ counter-reset: list-counter; }}
        ul.list-parens li::before {{ 
            counter-increment: list-counter; 
            content: "(" counter(list-counter) ")"; 
            position: absolute; 
            left: 0; 
            font-weight: 500; 
        }}
        
        ul.list-roman {{ counter-reset: list-counter; list-style: lower-roman; }}
        ul.list-roman li {{ 
            list-style-position: outside; 
            margin-left: 2em; 
        }}
        
        ul.list-bullets li::before {{ 
            content: "•"; 
            position: absolute; 
            left: 1em; 
            font-weight: 700; 
        }}

        /* TABLE OF CONTENTS */
        .toc-list {{ 
            list-style: none; 
            padding: 0; 
            margin: 0; 
        }}
        
        .toc-item {{ 
            display: flex; 
            justify-content: space-between; 
            align-items: baseline; 
            margin-bottom: 10pt; 
            font-size: 12pt; 
        }}
        
        .toc-item.indent-1 {{ 
            margin-left: 20pt; 
            font-size: 11pt; 
        }}
        
        .toc-item.indent-2 {{ 
            margin-left: 40pt; 
            font-size: 10pt; 
        }}
        
        .toc-label {{ 
            font-weight: 400; 
            flex: 1; 
            padding-right: 10pt; 
        }}
        
        .toc-dots {{
            flex-grow: 1;
            border-bottom: 1pt dotted #999;
            margin: 0 8pt;
        }}
        
        .toc-page {{
            font-weight: 400;
        }}

        /* FOOTNOTES */
        .footnote {{
            font-size: 9pt;
            margin-top: 24pt;
            padding-top: 8pt;
            border-top: 0.5pt solid #999;
        }}

        /* BLOCKQUOTE */
        blockquote {{
            margin: 18pt 30pt;
            padding-left: 15pt;
            border-left: 2pt solid #666;
            font-style: italic;
            color: #333;
        }}

        /* PRINT STYLES */
        @media print {{ 
            body {{ 
                background: white; 
                padding: 0;
            }} 
            .page {{ 
                margin: 0; 
                box-shadow: none; 
                page-break-after: always;
            }} 
            @page {{ 
                size: A4; 
                margin: 0; 
            }} 
        }}
        
        @media screen {{ 
            body {{ 
                background: #e8e8e8; 
                padding: 20px 0; 
            }} 
            .page {{ 
                margin-bottom: 20px; 
            }} 
        }}
    </style>
    """

def process_text_formatting(text, theme_color='#000'):
    if not text: return ""
    s = html.escape(text)
    s = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*(.*?)\*', r'<em>\1</em>', s)
    s = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank" style="color: #000; text-decoration: underline;">\1</a>', s)
    return s.replace('\n', '<br>')

def render_section_content(section, numbering=""):
    lvl = section.get('level', 1)
    ttl = section.get('title', 'Untitled')
    
    tag = ['h1','h2','h3'][min(lvl-1, 2)]
    cls = ['title','subtitle','subsubtitle'][min(lvl-1, 2)]
    num_html = f'<span class="section-number">{numbering}</span>' if numbering else ''
    html_content = f'<{tag} class="{cls}">{num_html}{html.escape(ttl)}</{tag}>'
    
    # Blocks
    blocks = section.get('blocks') or ([{'type':'text','content':section.get('content'),'align':'left'}] if section.get('content') else [])
    
    for blk in blocks:
        b_type = blk.get('type', 'text')
        align = blk.get('align', 'left')
        
        # IMAGE BLOCK
        if b_type == 'image':
            images = blk.get('images', [])
            if images:
                layout = blk.get('layout', 'standalone')
                group_width = blk.get('groupWidth', 80)
                count = len(images)
                
                if count == 1:
                    rows_html = f'''
                    <div class="figure-row">
                        <div class="figure-item">
                            <img src="{images[0]['url']}" alt="{html.escape(images[0].get('caption', ''))}">
                            <div class="figure-caption">Figure: {html.escape(images[0].get('caption', ''))}</div>
                        </div>
                    </div>
                    '''
                else:
                    rows_html = '<div class="figure-row">'
                    for idx, img in enumerate(images):
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{img['url']}" alt="{html.escape(img.get('caption', ''))}">
                            <div class="figure-caption">Figure {idx+1}: {html.escape(img.get('caption', ''))}</div>
                        </div>
                        '''
                        if (idx + 1) % 2 == 0 and idx + 1 < count:
                            rows_html += '</div><div class="figure-row">'
                    rows_html += '</div>'
                
                wrapper_class = f"figure-group {layout}"
                html_content += f'<div class="{wrapper_class}" style="max-width: {group_width}%;">{rows_html}</div>'
                
        # TABLE BLOCK
        elif b_type == 'table':
            table_data = blk.get('tableData', [])
            if table_data:
                align_cls = "align-center" if align == "center" else "align-left"
                table_html = '<table class="content-table">'
                
                for row_idx, row in enumerate(table_data):
                    table_html += '<tr>'
                    for cell in row:
                        cell_content = process_text_formatting(cell) if cell else '—'
                        if row_idx == 0:
                            table_html += f'<th>{cell_content}</th>'
                        else:
                            table_html += f'<td>{cell_content}</td>'
                    table_html += '</tr>'
                
                table_html += '</table>'
                html_content += f'<div class="content-block {align_cls}">{table_html}</div>'
                
        # TEXT BLOCK
        elif b_type == 'text':
            raw = blk.get('content', '')
            align_cls = "align-center" if align == "center" else "align-left"
            html_content += f'<div class="content-block {align_cls}"><p>{process_text_formatting(raw)}</p></div>'
            
        # LIST BLOCK
        elif b_type == 'list':
            raw = blk.get('content', '')
            items = [x.strip() for x in raw.split('\n') if x.strip()]
            style = blk.get('listStyle', 'bullets')
            ul_cls = "custom-list " + ({'1':'list-parens','roman':'list-roman'}.get(style, 'list-bullets'))
            align_cls = "align-center" if align == "center" else "align-left"
            html_content += f'<ul class="{ul_cls} {align_cls}">' + ''.join([f'<li>{process_text_formatting(i)}</li>' for i in items]) + '</ul>'

    return html_content

def render_section_tree(section, numbering=""):
    html_out = render_section_content(section, numbering)
    if 'subsections' in section:
        for i, subsec in enumerate(section['subsections']): 
            html_out += render_section_tree(subsec, f"{numbering}.{i+1}" if numbering else f"{i+1}")
    return html_out

def get_toc_html(sections, doc_title="Document"):
    flat = []
    def flatten(secs, p_num=""):
        for i, s in enumerate(secs):
            n = f"{p_num}{i+1}"
            flat.append({**s, '_num': n, '_idx': len(flat)})
            if 'subsections' in s: flatten(s['subsections'], f"{n}.")
    flatten(sections)
    
    items = "".join([
        f'<li class="toc-item indent-{s.get("level",1)-1}">'
        f'<span class="toc-label">{s["_num"]} {html.escape(s.get("title","Untitled"))}</span>'
        f'<span class="toc-dots"></span>'
        f'<span class="toc-page">{s["_idx"]+2}</span>'
        f'</li>' 
        for s in flat
    ])
    
    return f'''
    <div class="page">
        <div class="running-header">{html.escape(doc_title)}</div>
        <div class="page-content">
            <h1 class="title">Table of Contents</h1>
            <ul class="toc-list">{items}</ul>
        </div>
        <div class="page-number">i</div>
    </div>
    '''

def generate_full_html(sections, formatting, include_toc, doc_title="Academic Document"):
    css = generate_css(formatting)
    body = get_toc_html(sections, doc_title) if include_toc else ""
    
    for page_num, sec in enumerate(sections):
        page_display = page_num + 1 if not include_toc else page_num + 2
        body += f'''
        <div class="page">
            <div class="running-header">{html.escape(doc_title)}</div>
            <div class="page-content">{render_section_tree(sec, str(page_num+1))}</div>
            <div class="page-number">{page_display}</div>
        </div>
        '''
    
    return f"<!DOCTYPE html><html lang='zh-TW'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>{html.escape(doc_title)}</title>{css}</head><body>{body}</body></html>"

def generate_preview_html(sections, formatting, doc_title="Academic Document"):
    """Generate preview for a single section or multiple sections without TOC"""
    return generate_full_html(sections, formatting, include_toc=False, doc_title=doc_title)