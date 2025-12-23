import html
import re

def process_text_formatting(text, theme_color=None):
    if not text: return ""
    s = html.escape(text)
    if theme_color:
        s = re.sub(r'\*\*(.*?)\*\*', f'<strong style="color: {theme_color}">\\1</strong>', s)
    else:
        s = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2" target="_blank" style="text-decoration: underline; color: inherit;">\1</a>', s)
    return s.replace('\n', '<br>')

def get_chinese_number(num):
    chinese_nums = ['', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾']
    return chinese_nums[num] if num < len(chinese_nums) else str(num)

def get_chinese_subsection(num):
    chinese_nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    return chinese_nums[num] if num < len(chinese_nums) else str(num)

def get_parenthesis_number(num):
    chinese_nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    return f"({chinese_nums[num]})" if num < len(chinese_nums) else f"({num})"

def render_recursive_tree(section, numbering, render_content_func):
    """Recursively render sections using the provided render function."""
    html_out = render_content_func(section, numbering)
    if 'subsections' in section:
        for i, subsec in enumerate(section['subsections']):
            sub_num = f"{numbering}.{i+1}" if numbering else f"{i+1}"
            html_out += render_recursive_tree(subsec, sub_num, render_content_func)
    return html_out