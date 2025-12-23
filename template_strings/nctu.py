import html
import re
def generate_css(formatting):
    en_font = formatting.get('englishFont', "'Times New Roman', serif")
    zh_font = formatting.get('chineseFont', "'DFKai-SB', '標楷體', serif")
    base_size = formatting.get('bodySize', '14')
    line_height = formatting.get('lineHeight', '1.6')
    
    return f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Roboto:wght@300;400;700&display=swap');
        
        :root {{ --sidebar-width: 65px; --content-padding: 50px; }}
        * {{ box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
        html, body {{ margin: 0; padding: 0; width: 100%; }}
        body {{ background: #fff; font-family: {en_font}, {zh_font}, sans-serif; font-size: {base_size}px; line-height: {line_height}; color: #333; }}

        /* LAYOUT */
        .page {{ position: relative; width: 210mm; min-height: 297mm; max-height: 297mm; margin: 0 auto; background: white; page-break-after: always; break-after: page; overflow: hidden; }}
        .page:last-child {{ page-break-after: auto; }}
        .page-sidebar {{ position: absolute; top: 0; left: 0; bottom: 0; width: var(--sidebar-width); background-color: #fcfcfc; border-right: 1px solid #e0e0e0; }}
        .page-content {{ margin-left: calc(var(--sidebar-width) + var(--content-padding)); margin-right: var(--content-padding); padding: 50px 0; min-height: calc(297mm - 100px); max-height: calc(297mm - 100px); overflow: visible; }}
        
        /* SECTION WRAPPER */
        .section-wrapper {{ page-break-inside: avoid; break-inside: avoid; }}
        .section-wrapper.break-and-blank {{ page-break-after: always; break-after: page; }}
        .section-wrapper.break-and-merge {{ page-break-after: auto; break-after: auto; }}
        
        /* CLEARFIX (for floats) */
        .page-content::after {{ content: ""; display: table; clear: both; }}

        /* TITLES */
        h1.title {{ font-size: 26px; font-weight: 700; border-bottom: 3px solid #eee; padding-bottom: 12px; margin-bottom: 25px; color: #2c3e50; line-height: 1.4; clear: both; }}
        h2.subtitle {{ font-size: 20px; font-weight: 600; margin-top: 30px; margin-bottom: 18px; color: #2c3e50; clear: both; }}
        h3.subsubtitle {{ font-size: 16px; font-weight: 600; margin-top: 25px; margin-bottom: 15px; color: #2c3e50; clear: both; }}
        .section-number {{ font-weight: 700; color: inherit; margin-right: 10px; }}
        p {{ margin: 0; padding: 0; white-space: pre-wrap; word-wrap: break-word; }}

        /* BLOCKS */
        .content-block {{ margin-bottom: 18px; }}
        .align-left {{ text-align: justify; }}
        .align-center {{ text-align: center; }}

        /* FIGURE GROUPS - NEW SYSTEM */
        .figure-group {{
            margin: 20px 0;
            clear: both;
        }}

        .figure-group.wrapped {{
            float: right;
            margin-left: 20px;
            margin-bottom: 15px;
            min-width: 150px;
        }}

        .figure-group.standalone {{
            display: block;
            margin: 25px auto;
        }}

        .figure-row {{
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
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
            height: 180px;
            object-fit: cover;
            border: 1px solid #eee;
            border-radius: 8px;
            display: block;
        }}

        .figure-caption {{
            font-size: 11px;
            color: #666;
            margin-top: 6px;
            text-align: center;
        }}

        /* LISTS */
        ul.custom-list {{ margin: 10px 0; padding-left: 0; list-style: none; }}
        ul.custom-list li {{ margin-bottom: 8px; position: relative; text-align: justify; }}
        ul.list-parens {{ counter-reset: list-counter; }}
        ul.list-parens li {{ padding-left: 2.5em; }}
        ul.list-parens li::before {{ counter-increment: list-counter; content: "(" counter(list-counter) ")"; position: absolute; left: 0; font-weight: 500; }}
        ul.list-arrows li {{ padding-left: 2.5em; }}
        ul.list-arrows li::before {{ content: ">>>"; position: absolute; left: 0; font-weight: 700; letter-spacing: -1px; font-size: 0.9em; }}
        ul.list-dot {{ list-style: disc inside; padding-left: 1em; }}
        ul.list-dot li {{ list-style-position: outside; margin-left: 1em; }}

        /* NAV & TOC */
        .section-nav-container {{ position: absolute; left: 12px; top: 40px; width: 42px; display: flex; flex-direction: column; gap: 12px; z-index: 30; }}
        .section-nav-pill {{ width: 42px; padding: 14px 6px; border-radius: 16px; color: #666; background-color: #f5f5f5; font-weight: 600; font-size: 12px; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px; box-shadow: 1px 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; min-height: 70px; transition: all 0.2s ease; }}
        .section-nav-pill.active {{ color: white; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); }}
        
        .toc-list {{ list-style: none; padding: 0; margin: 0; }}
        .toc-item {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; font-size: 16px; border-bottom: 1px dotted #ccc; padding-bottom: 8px; }}
        .toc-item.indent-1 {{ margin-left: 20px; font-size: 14px; }}
        .toc-label {{ font-weight: 600; flex: 1; color: #2c3e50; padding-right: 10px; }}

        @media print {{ body {{ background: white; }} .page {{ margin: 0; box-shadow: none; }} @page {{ size: A4; margin: 0; }} }}
        @media screen {{ body {{ background: #555; padding: 20px 0; }} .page {{ box-shadow: 0 0 15px rgba(0,0,0,0.3); margin-bottom: 20px; }} }}
    </style>
    """
def get_section_color(section):
    return section.get('customColor') or {'autobiography':'#3498db','study_plan':'#2ecc71','resume':'#7f8c8d'}.get(section.get('type'), '#95a5a6')

def get_pill_text(section):
    t = section.get('title', '')
    st = section.get('type', 'other')
    if t and st == 'other': return t[:2]
    return {'autobiography':'自傳','study_plan':'計畫','resume':'簡歷'}.get(st, t[:2] if t else '其他')

def process_text_formatting(text, theme_color):
    if not text: return ""
    s = html.escape(text)
    s = re.sub(r'\*\*(.*?)\*\*', f'<strong style="color: {theme_color}">\\1</strong>', s)
    s = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank" style="text-decoration: underline; color: inherit;">\1</a>', s)
    return s.replace('\n', '<br>')

def generate_nav_pills(sections, current_index):
    pills = ""
    for i, sec in enumerate(sections):
        if sec.get('level', 1) > 1: continue
        col = get_section_color(sec)
        active = i == current_index
        pills += f'<div class="section-nav-pill {"active" if active else ""}" style="background-color:{col if active else "#f5f5f5"};">{html.escape(get_pill_text(sec))}</div>'
    return pills

def render_section_content(section, numbering=""):
    lvl = section.get('level', 1)
    col = get_section_color(section)
    ttl = section.get('title', 'Untitled')
    
    tag = ['h1','h2','h3'][min(lvl-1, 2)]
    cls = ['title','subtitle','subsubtitle'][min(lvl-1, 2)]
    sty = f'color:{col};' + (f'border-color:{col};' if lvl==1 else '')
    num_html = f'<span class="section-number">{numbering}</span>' if numbering else ''
    html_content = f'<{tag} class="{cls}" style="{sty}">{num_html}{html.escape(ttl)}</{tag}>'
    
    # Blocks
    blocks = section.get('blocks') or ([{'type':'text','content':section.get('content'),'align':'left'}] if section.get('content') else [])
    for blk in blocks:
        b_type = blk.get('type', 'text')
        align = blk.get('align', 'left')
        
        # --- IMAGE BLOCK (NEW MULTI-IMAGE SYSTEM) ---
        if b_type == 'image':
            images = blk.get('images', [])
            if images:
                layout = blk.get('layout', 'standalone')
                group_width = blk.get('groupWidth', 75)
                count = len(images)
                
                # Build figure rows based on count
                if count == 1:
                    rows_html = f'''
                    <div class="figure-row">
                        <div class="figure-item">
                            <img src="{images[0]['url']}" alt="{html.escape(images[0].get('caption', ''))}">
                            <div class="figure-caption">{html.escape(images[0].get('caption', ''))}</div>
                        </div>
                    </div>
                    '''
                elif count == 2:
                    rows_html = '<div class="figure-row">'
                    for img in images:
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{img['url']}" alt="{html.escape(img.get('caption', ''))}">
                            <div class="figure-caption">{html.escape(img.get('caption', ''))}</div>
                        </div>
                        '''
                    rows_html += '</div>'
                elif count in [3, 5]:
                    # 2 top, 1 bottom OR 2 top, 3 bottom
                    top_count = 2
                    rows_html = '<div class="figure-row">'
                    for i in range(top_count):
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{images[i]['url']}" alt="{html.escape(images[i].get('caption', ''))}">
                            <div class="figure-caption">{html.escape(images[i].get('caption', ''))}</div>
                        </div>
                        '''
                    rows_html += '</div><div class="figure-row">'
                    for i in range(top_count, count):
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{images[i]['url']}" alt="{html.escape(images[i].get('caption', ''))}">
                            <div class="figure-caption">{html.escape(images[i].get('caption', ''))}</div>
                        </div>
                        '''
                    rows_html += '</div>'
                elif count in [4, 6]:
                    # 2x2 grid OR 2x3 grid
                    half = count // 2
                    rows_html = '<div class="figure-row">'
                    for i in range(half):
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{images[i]['url']}" alt="{html.escape(images[i].get('caption', ''))}">
                            <div class="figure-caption">{html.escape(images[i].get('caption', ''))}</div>
                        </div>
                        '''
                    rows_html += '</div><div class="figure-row">'
                    for i in range(half, count):
                        rows_html += f'''
                        <div class="figure-item">
                            <img src="{images[i]['url']}" alt="{html.escape(images[i].get('caption', ''))}">
                            <div class="figure-caption">{html.escape(images[i].get('caption', ''))}</div>
                        </div>
                        '''
                    rows_html += '</div>'
                else:
                    rows_html = ''
                
                wrapper_class = f"figure-group {layout}"
                html_content += f'<div class="{wrapper_class}" style="max-width: {group_width}%;">{rows_html}</div>'
                
        # --- TABLE BLOCK ---
        elif b_type == 'table':
            table_data = blk.get('tableData', [])
            if table_data:
                align_cls = "align-center" if align == "center" else "align-left"
                
                table_html = '<table class="content-table" style="width:100%; border-collapse:collapse; margin:10px 0;">'
                
                for row_idx, row in enumerate(table_data):
                    table_html += '<tr>'
                    for cell in row:
                        cell_content = process_text_formatting(cell, col) if cell else '&nbsp;'
                        # First row as header
                        if row_idx == 0:
                            table_html += f'<th style="border:1px solid #ddd; padding:8px; background:{col}15; font-weight:600; text-align:left;">{cell_content}</th>'
                        else:
                            table_html += f'<td style="border:1px solid #ddd; padding:8px;">{cell_content}</td>'
                    table_html += '</tr>'
                
                table_html += '</table>'
                html_content += f'<div class="content-block {align_cls}">{table_html}</div>'
        # --- TEXT BLOCK ---
        elif b_type == 'text':
            raw = blk.get('content', '')
            align_cls = "align-center" if align == "center" else "align-left"
            html_content += f'<div class="content-block {align_cls}"><p>{process_text_formatting(raw, col)}</p></div>'
            
        # --- LIST BLOCK ---
        elif b_type == 'list':
            raw = blk.get('content', '')
            items = [x.strip() for x in raw.split('\n') if x.strip()]
            style = blk.get('listStyle', 'dot')
            ul_cls = "custom-list " + ({'1':'list-parens','arrow':'list-arrows'}.get(style, 'list-dot'))
            mk_sty = f"color:{col};" if style=='arrow' else ""
            align_cls = "align-center" if align == "center" else "align-left"
            html_content += f'<ul class="{ul_cls} {align_cls}" style="{mk_sty}">' + ''.join([f'<li style="color:#333;">{process_text_formatting(i,col)}</li>' for i in items]) + '</ul>'

    # Clear floats at end of section just in case
    html_content += '<div style="clear:both;"></div>'
    
    return html_content

def render_section_tree(section, numbering=""):
    html_out = render_section_content(section, numbering)
    if 'subsections' in section:
        for i, subsec in enumerate(section['subsections']): html_out += render_section_tree(subsec, f"{numbering}.{i+1}" if numbering else f"{i+1}")
    return html_out

def get_toc_html(sections):
    flat = []
    def flatten(secs, p_num=""):
        for i, s in enumerate(secs):
            n = f"{p_num}{i+1}"
            flat.append({**s, '_num': n, '_idx': len(flat)})
            if 'subsections' in s: flatten(s['subsections'], f"{n}.")
    flatten(sections)
    items = "".join([f'<li class="toc-item indent-{s.get("level",1)-1}"><span class="toc-label">{s["_num"]} {html.escape(s.get("title","Untitled"))}</span><span class="toc-page">Page {s["_idx"]+2}</span></li>' for s in flat])
    return f'<div class="page"><div class="page-sidebar"></div><div class="section-nav-container"><div class="section-nav-pill active" style="background-color:#2c3e50;">目錄</div></div><div class="page-content"><h1 class="title" style="border-color:#2c3e50;">目錄 (Table of Contents)</h1><ul class="toc-list">{items}</ul></div></div>'

def generate_full_html(sections, formatting, include_toc):
    css = generate_css(formatting)
    body = get_toc_html(sections) if include_toc else ""
    for i, sec in enumerate(sections):
        body += f'<div class="page"><div class="page-sidebar"></div><div class="section-nav-container">{generate_nav_pills(sections, i)}</div><div class="page-content">{render_section_tree(sec, str(i+1))}</div></div>'
    return f"<!DOCTYPE html><html lang='zh-TW'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Portfolio Document</title>{css}</head><body>{body}</body></html>"

def generate_preview_html(sections, formatting):
    """Generate preview for a single section or multiple sections without TOC"""
    return generate_full_html(sections, formatting, include_toc=False)