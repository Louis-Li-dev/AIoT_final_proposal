// Global State
let sections = [];
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';

// Section Types
const SECTION_TYPES = {
    'autobiography': { label: '自傳', color: '#3498db', defaultTitle: '自傳' },
    'study_plan': { label: '讀書計畫', color: '#2ecc71', defaultTitle: '讀書計畫' },
    'resume': { label: '簡歷', color: '#7f8c8d', defaultTitle: '簡歷' },
    'other': { label: '其他', color: '#95a5a6', defaultTitle: '' }
};

document.addEventListener('DOMContentLoaded', () => {
    if(sections.length === 0) addSection();
});

// --- TABS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    if(tabId === 'tab-design') btns[0].classList.add('active');
    else if(tabId === 'tab-data') btns[1].classList.add('active');
    else if(tabId === 'tab-ai') btns[2].classList.add('active');
}

// --- GEMINI API KEY MANAGEMENT ---
function saveApiKey() {
    const key = document.getElementById('geminiApiKey').value.trim();
    if(!key) {
        showToast('Please enter an API key', 'warning');
        return;
    }
    geminiApiKey = key;
    localStorage.setItem('gemini_api_key', key);
    
    // Show success banner
    const statusBanner = document.getElementById('apiKeyStatus');
    if(statusBanner) {
        statusBanner.style.display = 'flex';
    }
    showToast('API key saved', 'success');
}

function clearApiKey() {
    // Show inline confirm instead of blocking browser confirm
    const confirmEl = document.getElementById('apiKeyConfirm');
    if(confirmEl) confirmEl.style.display = 'flex';
}

function confirmClearApiKey() {
    geminiApiKey = '';
    localStorage.removeItem('gemini_api_key');
    const keyInput = document.getElementById('geminiApiKey');
    if(keyInput) keyInput.value = '';

    // Hide status banner & confirm UI
    const statusBanner = document.getElementById('apiKeyStatus');
    if(statusBanner) statusBanner.style.display = 'none';
    const confirmEl = document.getElementById('apiKeyConfirm');
    if(confirmEl) confirmEl.style.display = 'none';

    showToast('API key cleared', 'info');
}

function cancelClearApiKey() {
    const confirmEl = document.getElementById('apiKeyConfirm');
    if(confirmEl) confirmEl.style.display = 'none';
}

// Generic toast helper
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = message;
    container.appendChild(el);
    // Force reflow for animation
    void el.offsetWidth;
    el.classList.add('toast-in');
    setTimeout(() => {
        el.classList.remove('toast-in');
        el.classList.add('toast-out');
        setTimeout(() => container.removeChild(el), 450);
    }, duration);
}

function checkApiKeyStatus() {
    const statusBanner = document.getElementById('apiKeyStatus');
    if(statusBanner && geminiApiKey) {
        statusBanner.style.display = 'flex';
    }
}

// --- REPHRASE WITH GEMINI ---
let currentRephraseData = null;

async function rephraseBlock(sectionId, blockIndex, buttonElement) {
    const sec = findSectionById(sections, sectionId);
    if(!sec || !sec.blocks[blockIndex]) return;
    
    const block = sec.blocks[blockIndex];
    const text = block.content;
    
    if(!text || text.trim() === '') {
        showToast('No content to rephrase', 'warning');
        return;
    }
    
    if(!geminiApiKey) {
        showToast('Please set your Gemini API key in the AI Tools tab first', 'warning');
        switchTab('tab-ai');
        return;
    }
    
    const textarea = buttonElement.closest('.content-block').querySelector('textarea');
    const rect = textarea.getBoundingClientRect();
    
    const dialog = document.getElementById('rephraseDialog');
    const loadingDiv = document.getElementById('dialogLoading');
    const resultDiv = document.getElementById('dialogResult');
    const rephrasedText = document.getElementById('dialogRephrased');
    
    dialog.style.display = 'block';
    dialog.style.top = (rect.top + window.scrollY) + 'px';
    dialog.style.left = (rect.right + 20) + 'px';
    
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    currentRephraseData = { sectionId, blockIndex };
    
    try {
        const response = await fetch('/api/rephrase', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: text, api_key: geminiApiKey })
        });
        
        const data = await response.json();
        
        if(!data.success) {
            throw new Error(data.error || 'Rephrase failed');
        }
        
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        rephrasedText.textContent = data.rephrased;
        
    } catch(err) {
        showToast('Rephrase failed: ' + err.message, 'warning');
        closeRephraseDialog();
    }
}

function acceptRephrase() {
    if(!currentRephraseData) return;

    const rephrasedText = document.getElementById('dialogRephrased').textContent || '';
    const {sectionId, blockIndex} = currentRephraseData;

    // Use animated text replace + border glow
    animateTextReplace(sectionId, blockIndex, rephrasedText);

    closeRephraseDialog();
    showToast('Rephrase accepted', 'success');
}

// Animate replacing text one-by-one and show border glow for 3s
function animateTextReplace(sectionId, blockIndex, newText) {
    const sec = findSectionById(sections, sectionId);
    if(!sec || !sec.blocks[blockIndex]) return;
    const blk = sec.blocks[blockIndex];

    blk._updating = true;
    renderSections();

    // Find the textarea element in DOM for this block
    const selector = `.content-block[data-sec-id="${sectionId}"][data-block-index="${blockIndex}"] textarea`;
    const textarea = document.querySelector(selector);
    const container = document.querySelector(`.content-block[data-sec-id="${sectionId}"][data-block-index="${blockIndex}"]`);

    // Add visual updating class (uses --section-color if present)
    if(container) {
        container.classList.add('updating-anim');
        // Remove after 3s
        setTimeout(()=>{ container.classList.remove('updating-anim'); }, 3000);
    }

    // Typewriter effect: fast per-character update
    let i = 0;
    const speed = Math.max(6, Math.min(20, Math.floor(1600 / Math.max(1, newText.length)))); // adjust to ~1.6s overall
    // If textarea exists, update it directly to show the effect without re-rendering each char
    if(textarea) {
        textarea.focus();
        const interval = setInterval(()=>{
            i++;
            textarea.value = newText.slice(0, i);
            if(i >= newText.length) {
                clearInterval(interval);
                // persist final text
                blk.content = newText;
                blk._updating = false;
                renderSections();
            }
        }, speed);
    } else {
        // Fallback: progressively set data and re-render
        const interval = setInterval(()=>{
            i++;
            blk.content = newText.slice(0, i);
            renderSections();
            if(i >= newText.length) {
                clearInterval(interval);
                blk._updating = false;
                renderSections();
            }
        }, 12);
    }
}

function declineRephrase() {
    closeRephraseDialog();
}

function closeRephraseDialog() {
    document.getElementById('rephraseDialog').style.display = 'none';
    currentRephraseData = null;
}

// --- DATA MANAGEMENT ---
function saveDraft() {
    // Show progress
    const progressDiv = document.getElementById('saveProgress');
    const progressBar = document.getElementById('saveProgressBar');
    const progressText = document.getElementById('saveProgressText');
    const statusBanner = document.getElementById('saveStatus');
    
    if(progressDiv) {
        progressDiv.style.display = 'block';
        progressBar.style.width = '30%';
        progressText.textContent = 'Preparing...';
    }
    
    setTimeout(() => {
        const data = { timestamp: new Date().toISOString(), sections: sections };
        const json = JSON.stringify(data, null, 2);
        
        if(progressBar) progressBar.style.width = '70%';
        if(progressText) progressText.textContent = 'Creating file...';
        
        setTimeout(() => {
            const blob = new Blob([json], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `nctu_portfolio_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a); 
            URL.revokeObjectURL(url);
            
            // Complete
            if(progressBar) progressBar.style.width = '100%';
            if(progressText) progressText.textContent = '✓ Done';
            
            setTimeout(() => {
                if(progressDiv) progressDiv.style.display = 'none';
                if(progressBar) progressBar.style.width = '0%';
                
                // Show status banner
                if(statusBanner) {
                    const timeEl = document.getElementById('saveStatusTime');
                    if(timeEl) timeEl.textContent = 'Saved at ' + new Date().toLocaleTimeString();
                    statusBanner.style.display = 'block';
                    setTimeout(() => {
                        statusBanner.style.display = 'none';
                    }, 5000);
                }
            }, 800);
        }, 300);
    }, 300);
}

function loadDraft(input) {
    const file = input.files[0];
    if(!file) return;
    
    const progressDiv = document.getElementById('loadProgress');
    const progressBar = document.getElementById('loadProgressBar');
    const progressText = document.getElementById('loadProgressText');
    const statusBanner = document.getElementById('loadStatus');
    
    if(progressDiv) {
        progressDiv.style.display = 'block';
        progressBar.style.width = '20%';
        progressText.textContent = 'Reading file...';
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if(progressBar) progressBar.style.width = '50%';
            if(progressText) progressText.textContent = 'Parsing data...';
            
            const data = JSON.parse(e.target.result);
            
            if(progressBar) progressBar.style.width = '80%';
            if(progressText) progressText.textContent = 'Loading sections...';
            
            setTimeout(() => {
                if(data.sections && Array.isArray(data.sections)) {
                    sections = data.sections;
                    renderSections();
                    // Temporary show 'complete' indicators for image blocks that are already complete
                    function markCompletes(list){
                        list.forEach(sec=>{
                            if(sec.blocks && Array.isArray(sec.blocks)){
                                sec.blocks.forEach(blk=>{
                                    if(blk.type === 'image' && blk.images && blk.images.length >= blk.imageCount){
                                        blk._justCompleted = true;
                                        setTimeout(()=>{ blk._justCompleted = false; renderSections(); }, 3000);
                                    }
                                });
                            }
                            if(sec.subsections) markCompletes(sec.subsections);
                        });
                    }
                    markCompletes(sections);
                    
                    // Complete
                    if(progressBar) progressBar.style.width = '100%';
                    if(progressText) progressText.textContent = '✓ Done';
                    
                    setTimeout(() => {
                        if(progressDiv) progressDiv.style.display = 'none';
                        if(progressBar) progressBar.style.width = '0%';
                        
                        // Show status banner
                        if(statusBanner) {
                            const infoEl = document.getElementById('loadStatusInfo');
                            if(infoEl) infoEl.textContent = `Loaded ${sections.length} section(s) from ${file.name}`;
                            statusBanner.style.display = 'block';
                            setTimeout(() => {
                                statusBanner.style.display = 'none';
                            }, 5000);
                        }
                    }, 800);
                } else {
                    throw new Error('Invalid file format');
                }
            }, 300);
        } catch(err) { 
            if(progressDiv) progressDiv.style.display = 'none';
            alert("Error parsing JSON: " + err.message); 
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    input.value = '';
}

// --- SECTION MANAGEMENT ---
function addSection(parentId = null) {
    let newLevel = 1;
    let parent = null;
    if (parentId) {
        parent = findSectionById(sections, parentId);
        if (parent) newLevel = (parent.level || 1) + 1;
    }

    const section = {
        id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: '',
        type: 'other',
        customColor: null,
        level: newLevel,
        blocks: [], 
        subsections: [],
        // pageBreak: 'merge'  // 'merge' or 'blank'
    };
    
    addBlockToSectionData(section, 'text');

    if (parent) parent.subsections.push(section);
    else sections.push(section);
    
    renderSections();
}

function findSectionById(list, id) {
    for (let sec of list) {
        if (sec.id === id) return sec;
        if (sec.subsections) {
            const found = findSectionById(sec.subsections, id);
            if (found) return found;
        }
    }
    return null;
}

function removeSection(id) {
    function removeFrom(list) {
        for(let i=0; i<list.length; i++) {
            if(list[i].id === id) { 
                list.splice(i,1); 
                return true; 
            }
            if(list[i].subsections && removeFrom(list[i].subsections)) return true;
        }
        return false;
    }
    removeFrom(sections);
    renderSections();
}

function updateSection(id, field, value) {
    const sec = findSectionById(sections, id);
    if(!sec) return;
    sec[field] = value;
    if(field === 'type' && value !== 'other') {
        sec.title = SECTION_TYPES[value].defaultTitle;
        sec.customColor = null;
        renderSections();
    }
}

// --- BLOCK MANAGEMENT ---
function addBlockToSectionData(section, type) {
    section.blocks = section.blocks || [];
    const block = {
        id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: type, 
        content: '',
        align: 'left',   
        listStyle: '1',  
        url: '',         
        caption: '',     
        width: 100,
        rows: 3,
        cols: 3,
        tableData: null,
        // Image block properties
        layout: 'standalone',
        imageCount: 1,
        images: [],
        groupWidth: 50  // UPDATED: Default 50% for wrapped
    };
    section.blocks.push(block);
}

function addBlock(sectionId, type) {
    const sec = findSectionById(sections, sectionId);
    if(sec) { 
        addBlockToSectionData(sec, type); 
        renderSections(); 
    }
}

function updateBlock(sectionId, blockIndex, field, value) {
    const sec = findSectionById(sections, sectionId);
    if(sec && sec.blocks[blockIndex]) {
        sec.blocks[blockIndex][field] = value;
        
        if(field === 'content') {
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(ta => {
                const onchangeAttr = ta.getAttribute('onchange');
                if(onchangeAttr && onchangeAttr.includes(`'${sectionId}'`) && onchangeAttr.includes(`, ${blockIndex},`)) {
                    ta.value = value;
                }
            });
        }
        
        if(field !== 'content') renderSections();
    }
}

function updateBlockLayout(sectionId, blockIndex, layout) {
    const sec = findSectionById(sections, sectionId);
    if(sec && sec.blocks[blockIndex]) {
        const block = sec.blocks[blockIndex];
        block.layout = layout;
        
        // Auto-adjust width based on layout
        if(layout === 'wrapped') {
            // For wrapped, default to 50% and clamp to 40-60%
            if(!block.groupWidth || block.groupWidth < 40 || block.groupWidth > 60) {
                block.groupWidth = 50;
            } else {
                // ensure within bounds
                block.groupWidth = Math.max(40, Math.min(60, block.groupWidth));
            }
        } else {
            // For standalone, suggest 70% if current width is too small
            if(!block.groupWidth || block.groupWidth < 40) {
                block.groupWidth = 70;
            }
        }
        
        renderSections();
    }
}
function removeBlock(sectionId, blockIndex) {
    const sec = findSectionById(sections, sectionId);
    if(sec) { 
        sec.blocks.splice(blockIndex, 1); 
        renderSections(); 
    }
}

function moveBlock(sectionId, blockIndex, direction) {
    const sec = findSectionById(sections, sectionId);
    if(!sec) return;
    
    const newIndex = blockIndex + direction;
    if(newIndex >= 0 && newIndex < sec.blocks.length) {
        const temp = sec.blocks[blockIndex];
        sec.blocks[blockIndex] = sec.blocks[newIndex];
        sec.blocks[newIndex] = temp;
        renderSections();
    }
}

// --- TABLE FUNCTIONS ---
function initializeTable(sectionId, blockIndex) {
    const sec = findSectionById(sections, sectionId);
    if(!sec || !sec.blocks[blockIndex]) return;
    
    const block = sec.blocks[blockIndex];
    const rows = parseInt(block.rows) || 3;
    const cols = parseInt(block.cols) || 3;
    
    block.tableData = Array(rows).fill(null).map(() => Array(cols).fill(''));
    renderSections();
}

function updateTableDimensions(sectionId, blockIndex, dimension, value) {
    const sec = findSectionById(sections, sectionId);
    if(!sec || !sec.blocks[blockIndex]) return;
    
    const block = sec.blocks[blockIndex];
    const oldRows = block.tableData ? block.tableData.length : 0;
    const oldCols = block.tableData && block.tableData[0] ? block.tableData[0].length : 0;
    
    block[dimension] = parseInt(value);
    const newRows = parseInt(block.rows) || 3;
    const newCols = parseInt(block.cols) || 3;
    
    if(!block.tableData) {
        block.tableData = Array(newRows).fill(null).map(() => Array(newCols).fill(''));
    } else {
        if(newRows > oldRows) {
            for(let i = oldRows; i < newRows; i++) {
                block.tableData.push(Array(oldCols).fill(''));
            }
        } else if(newRows < oldRows) {
            block.tableData = block.tableData.slice(0, newRows);
        }
        
        block.tableData = block.tableData.map(row => {
            if(newCols > oldCols) {
                return [...row, ...Array(newCols - oldCols).fill('')];
            } else if(newCols < oldCols) {
                return row.slice(0, newCols);
            }
            return row;
        });
    }
    
    renderSections();
}

function updateTableCell(sectionId, blockIndex, row, col, value) {
    const sec = findSectionById(sections, sectionId);
    if(!sec || !sec.blocks[blockIndex]) return;
    
    const block = sec.blocks[blockIndex];
    if(block.tableData && block.tableData[row]) {
        block.tableData[row][col] = value;
    }
}

// --- IMAGE FUNCTIONS (NEW MULTI-IMAGE SYSTEM) ---
function uploadBlockImage(sectionId, blockIndex, input) {
    const file = input.files[0];
    if(!file) return;

    const formData = new FormData();
    formData.append('image', file);
    
    fetch('/api/upload-image', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const sec = findSectionById(sections, sectionId);
                if(sec && sec.blocks[blockIndex]) {
                    if(!sec.blocks[blockIndex].images) {
                        sec.blocks[blockIndex].images = [];
                    }
                    sec.blocks[blockIndex].images.push({
                        url: data.url,
                        caption: ''
                    });
                    // If block just reached completion, mark and auto-clear after 3s
                    const blk = sec.blocks[blockIndex];
                    if(blk.images.length >= blk.imageCount) {
                        blk._justCompleted = true;
                        renderSections();
                        setTimeout(() => { blk._justCompleted = false; renderSections(); }, 3000);
                    }
                }
                renderSections();
            } else {
                alert("Upload failed: " + (data.error || "Unknown error"));
            }
        })
        .catch(err => { 
            console.error(err); 
            alert("Upload failed. Check console.");
        });
}

function updateImageCaption(sectionId, blockIndex, imageIndex, caption) {
    const sec = findSectionById(sections, sectionId);
    if(sec && sec.blocks[blockIndex] && sec.blocks[blockIndex].images[imageIndex]) {
        sec.blocks[blockIndex].images[imageIndex].caption = caption;
    }
}

function removeImage(sectionId, blockIndex, imageIndex) {
    const sec = findSectionById(sections, sectionId);
    if(sec && sec.blocks[blockIndex]) {
        sec.blocks[blockIndex].images.splice(imageIndex, 1);
        renderSections();
    }
}

// --- RENDERING UI ---
function renderSections() {
    document.getElementById('sectionsContainer').innerHTML = renderSectionList(sections);
    
    if(geminiApiKey) {
        const keyInput = document.getElementById('geminiApiKey');
        if(keyInput) keyInput.value = geminiApiKey;
    }
    
    // Check and show API key status
    checkApiKeyStatus();
    
    // No-op: animations are handled inline (updating-anim, _justCompleted)
}

function renderSectionList(list, parentNum = '', indent = 0) {
    return list.map((sec, idx) => {
        const num = parentNum ? `${parentNum}.${idx + 1}` : `${idx + 1}`;
        const typeInfo = SECTION_TYPES[sec.type] || SECTION_TYPES.other;
        const color = sec.customColor || typeInfo.color;
        const title = sec.type === 'other' ? sec.title : typeInfo.defaultTitle;
        const level = sec.level || (indent + 1);

        if(!sec.blocks) sec.blocks = [];

        let blocksHtml = sec.blocks.map((blk, i) => {
            const isFirst = i === 0;
            const isLast = i === sec.blocks.length - 1;

            const commonControls = `
                <div style="display:flex; gap:4px;">
                    <button class="btn-small" onclick="moveBlock('${sec.id}', ${i}, -1)" ${isFirst?'disabled style="opacity:0.3"':''} title="Move Up">⬆</button>
                    <button class="btn-small" onclick="moveBlock('${sec.id}', ${i}, 1)" ${isLast?'disabled style="opacity:0.3"':''} title="Move Down">⬇</button>
                    <button onclick="removeBlock('${sec.id}', ${i})" class="btn-danger">×</button>
                </div>
            `;

            // --- NEW IMAGE BLOCK RENDERING ---
            // --- NEW IMAGE BLOCK RENDERING ---
            // --- NEW IMAGE BLOCK RENDERING ---
            if(blk.type === 'image') {
                const hasImages = blk.images && blk.images.length > 0;
                const needsMore = blk.images && blk.images.length < blk.imageCount;
                const groupWidth = blk.groupWidth || 50;  // UPDATED: default 50
                const isWrapped = blk.layout === 'wrapped';
                
                // Adjust slider range based on layout
                // For wrapped layout use 40-60% range per request
                const minWidth = isWrapped ? 40 : 40;
                const maxWidth = isWrapped ? 60 : 100;
                
                // Build images HTML separately to avoid nested template parsing issues
                let imagesHtml = '';
                const wrapperStyleLocal = (isWrapped) ? `width:${groupWidth}%; display:inline-block; vertical-align:top;` : `width:100%;`;
                imagesHtml += `<div class="images-wrapper" style="${wrapperStyleLocal} margin:10px 0;"><div class="images-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:10px;">`;
                imagesHtml += (blk.images || []).map((img, imgIdx) => `
                            <div style="position:relative; border:1px solid #ddd; border-radius:4px; padding:5px;">
                                <img src="${img.url}" style="width:100%; height:80px; object-fit:cover; border-radius:4px;">
                                <input type="text" placeholder="Caption..." value="${img.caption||''}" 
                                       onchange="updateImageCaption('${sec.id}', ${i}, ${imgIdx}, this.value)"
                                       style="width:100%; margin-top:4px; padding:2px; font-size:10px;">
                                <button onclick="removeImage('${sec.id}', ${i}, ${imgIdx})" 
                                        style="position:absolute; top:2px; right:2px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer;">×</button>
                            </div>
                            `).join('');
                imagesHtml += (needsMore || !hasImages ? `
                                <label class="file-upload-btn" style="height:80px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#f8f9fa; border:2px dashed #ddd; border-radius:4px;">
                                    <span style="font-size:24px;">+</span>
                                    <input type="file" accept="image/*" onchange="uploadBlockImage('${sec.id}', ${i}, this)" style="display:none;">
                                </label>
                            ` : '');
                imagesHtml += `</div></div>`;

                return `
                <div class="content-block" data-sec-id="${sec.id}" data-block-index="${i}" style="border-left:3px solid ${color}; --section-color: ${color};">
                    <div class="block-header">
                        <span class="block-type-label">📷 Figure Group</span>
                        ${commonControls}
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end;">
                        <div style="flex:1;">
                            <label style="font-size:11px; display:block; margin-bottom:4px;">Number of Figures:</label>
                            <select onchange="updateBlock('${sec.id}', ${i}, 'imageCount', parseInt(this.value))" style="width:100%; padding:6px;">
                                ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${blk.imageCount===n?'selected':''}>${n} figure${n>1?'s':''}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; display:block; margin-bottom:4px;">Layout:</label>
                            <select onchange="updateBlockLayout('${sec.id}', ${i}, this.value)" style="width:100%; padding:6px;">
                                <option value="standalone" ${blk.layout==='standalone'?'selected':''}>Standalone</option>
                                <option value="wrapped" ${blk.layout==='wrapped'?'selected':''}>Wrapped Text</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; display:block; margin-bottom:4px;">Width: ${groupWidth}%</label>
                            <input type="range" min="${minWidth}" max="${maxWidth}" value="${groupWidth}" 
                                   onchange="updateBlock('${sec.id}', ${i}, 'groupWidth', parseInt(this.value))"
                                   oninput="this.previousElementSibling.textContent = 'Width: ' + this.value + '%'"
                                   style="width:100%;">
                            <div style="font-size:9px; color:#999; margin-top:2px;">${isWrapped ? 'Wrapped: 40-60%' : 'Standalone: 40-100%'}</div>
                        </div>
                    </div>
                    
                    ${imagesHtml}
                    
                    ${hasImages ? `
                            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <div style="flex:1; height:4px; background:#e5e7eb; border-radius:2px; overflow:hidden;">
                                    <div style="width:${(blk.images.length / blk.imageCount) * 100}%; height:100%; background:linear-gradient(90deg, #10b981, #059669); transition:width 0.3s;"></div>
                                </div>
                                ${blk._justCompleted ? `<span class="complete-indicator" style="font-size:11px; font-weight:600; color:#10b981; white-space:nowrap;">✓ Complete</span>` : `<span style="font-size:11px; font-weight:600; color:#10b981; white-space:nowrap;">${blk.images.length}/${blk.imageCount}</span>`}
                            </div>
                        ` : ''}
                </div>`;
            }
            // --- TABLE BLOCK ---
            else if(blk.type === 'table') {
                const hasData = blk.tableData && blk.tableData.length > 0;
                
                return `
                <div class="content-block" data-sec-id="${sec.id}" data-block-index="${i}" style="border-left:3px solid ${color}; --section-color: ${color};">
                    <div class="block-header">
                        <span class="block-type-label">📊 Table Block</span>
                        ${commonControls}
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="font-size:11px; display:block; margin-bottom:4px;">Rows:</label>
                            <input type="number" min="1" max="20" value="${blk.rows || 3}" 
                                onchange="updateTableDimensions('${sec.id}', ${i}, 'rows', this.value)"
                                style="width:100%; padding:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; display:block; margin-bottom:4px;">Columns:</label>
                            <input type="number" min="1" max="10" value="${blk.cols || 3}" 
                                onchange="updateTableDimensions('${sec.id}', ${i}, 'cols', this.value)"
                                style="width:100%; padding:4px;">
                        </div>
                        ${!hasData ? `
                            <button onclick="initializeTable('${sec.id}', ${i})" class="btn-small" style="align-self:flex-end; white-space:nowrap;">
                                Create Table
                            </button>
                        ` : ''}
                    </div>
                    
                    ${hasData ? `
                        <div style="overflow-x:auto;">
                            <table class="editable-table">
                                ${blk.tableData.map((row, rowIdx) => `
                                    <tr>
                                        ${row.map((cell, colIdx) => `
                                            <td>
                                                <input type="text" value="${cell}" 
                                                    onchange="updateTableCell('${sec.id}', ${i}, ${rowIdx}, ${colIdx}, this.value)"
                                                    placeholder="Cell ${rowIdx+1},${colIdx+1}">
                                            </td>
                                        `).join('')}
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    ` : '<p style="font-size:12px; color:#999; text-align:center; padding:20px;">Configure dimensions and click "Create Table"</p>'}
                </div>`;
            }
            // --- TEXT/LIST BLOCKS ---
            else {
                return `
                <div class="content-block" data-sec-id="${sec.id}" data-block-index="${i}" style="--section-color: ${color};">
                    <div class="block-header">
                        <span class="block-type-label">${blk.type === 'text' ? '📝 Text' : '🔢 List'}</span>
                        <div class="block-controls">
                            ${blk.type === 'list' ? `
                                <select class="btn-small" onchange="updateBlock('${sec.id}', ${i}, 'listStyle', this.value)">
                                    <option value="1" ${blk.listStyle==='1'?'selected':''}>1. Numbered</option>
                                    <option value="arrow" ${blk.listStyle==='arrow'?'selected':''}>>> Arrow</option>
                                    <option value="dot" ${blk.listStyle==='dot'?'selected':''}>• Bullet</option>
                                </select>` : ''}
                            
                            <select class="btn-small" onchange="updateBlock('${sec.id}', ${i}, 'align', this.value)">
                                <option value="left" ${blk.align==='left'?'selected':''}>Left</option>
                                <option value="center" ${blk.align==='center'?'selected':''}>Center</option>
                            </select>
                            ${commonControls}
                        </div>
                    </div>
                    <textarea placeholder="Content..." onchange="updateBlock('${sec.id}', ${i}, 'content', this.value)" 
                            style="min-height:${blk.type==='list'?'80px':'60px'}; font-family: 'DFKai-SB', '標楷體', 'Times New Roman', serif;">${blk.content}</textarea>
                    ${blk.type === 'text' ? `
                        <button onclick="rephraseBlock('${sec.id}', ${i}, this)" class="btn-rephrase" style="margin-top:6px;">
                            ✨ Rephrase by Gemini
                        </button>
                    ` : ''}
                </div>`;
            }
        }).join('');

        const canAddSubsection = level < 3; 

        return `
        <div class="section-card" style="border-left: 5px solid ${color}; margin-left: ${indent * 20}px">
            <div class="section-header">
                <span class="section-number" style="background:${color}20; color:${color}">#${num}</span>
                <div style="flex:1; margin-left:10px;">
                    ${sec.type === 'other' ? `<input type="text" value="${sec.title}" placeholder="Title" onchange="updateSection('${sec.id}', 'title', this.value)" style="width:100%; font-family: 'DFKai-SB', '標楷體', 'Times New Roman', serif;">` : `<strong>${title}</strong>`}
                </div>
                <button onclick="previewSingleSection('${sec.id}')" class="btn-small">▶ Run</button>
                <button onclick="removeSection('${sec.id}')" class="btn-small btn-danger">×</button>
            </div>
            
            <div class="control-row" style="margin:5px 0 10px;">
                <div class="control-group"><label>Type</label><select onchange="updateSection('${sec.id}','type',this.value)">${Object.keys(SECTION_TYPES).map(k => `<option value="${k}" ${sec.type===k?'selected':''}>${SECTION_TYPES[k].label}</option>`).join('')}</select></div>
                ${sec.type === 'other' ? `<div class="control-group"><label>Color</label><input type="color" value="${color}" onchange="updateSection('${sec.id}','customColor',this.value)"></div>` : ''}
            </div>
            <div class="blocks-container">${blocksHtml}</div>
                        
            <div class="block-btn-actions">
                <button onclick="addBlock('${sec.id}', 'text')" class="btn-add-block">+ Text</button>
                <button onclick="addBlock('${sec.id}', 'list')" class="btn-add-block">+ List</button>
                <button onclick="addBlock('${sec.id}', 'table')" class="btn-add-block" style="background:#f0fdf4; color:#16a34a; border-color:#86efac;">+ Table</button>
                <button onclick="addBlock('${sec.id}', 'image')" class="btn-add-block" style="background:#fff7ed; color:#d97706; border-color:#fdba74;">+ Image</button>
            </div>
            
            ${canAddSubsection ? `<div style="margin-top:10px; text-align:right;"><button class="btn-small" onclick="addSection('${sec.id}')">+ Sub-section</button></div>` : ''}
        </div>
        ${renderSectionList(sec.subsections, num, indent+1)}`;
    }).join('');
}

// --- API FUNCTIONS ---
async function previewSingleSection(sectionId) {
    const sec = findSectionById(sections, sectionId); 
    if(!sec) return;
    
    const templateSelect = document.getElementById('templateSelect');
    const template = templateSelect ? templateSelect.value : 'nctu';
    
    try {
        const res = await fetch('/api/generate-document', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({
                sections:[sec], 
                formatting:{
                    englishFont: document.getElementById('englishFont').value,
                    chineseFont: document.getElementById('chineseFont').value,
                    bodySize: document.getElementById('bodySize').value,
                    lineHeight: document.getElementById('lineHeight').value
                }, 
                include_toc: false,
                template: template
            })
        });
        const data = await res.json();
        if(data.success) {
            showPreview(data.html);
        } else {
            alert("Error: " + data.error);
        }
    } catch(e) { 
        alert("Error: " + e); 
    }
}

async function generateDocument() {
    showProgress('Generating...', 20);
    const fmt = { 
        englishFont: document.getElementById('englishFont').value, 
        chineseFont: document.getElementById('chineseFont').value, 
        bodySize: document.getElementById('bodySize').value, 
        lineHeight: document.getElementById('lineHeight').value 
    };
    
    const template = document.getElementById('templateSelect').value;
    const pageBreakMode = document.getElementById('pageBreakMode').value;  // NEW
    
    try {
        const res = await fetch('/api/generate-document', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({
                sections:sections, 
                formatting:fmt, 
                include_toc:document.getElementById('includeToc').checked,
                template: template,
                page_break_mode: pageBreakMode  // NEW
            })
        });
        const data = await res.json();
        if(data.success) { 
            generatedHTML=data.html; 
            updateProgress(100,'Done'); 
            setTimeout(()=>{
                hideProgress(); 
                showPreview(generatedHTML); 
                document.getElementById('exportSection').style.display='block';
            },500); 
        }
    } catch(e) { hideProgress(); alert(e); }
}

async function generateDocument() {
    showProgress('Generating...', 20);
    const fmt = { 
        englishFont: document.getElementById('englishFont').value, 
        chineseFont: document.getElementById('chineseFont').value, 
        bodySize: document.getElementById('bodySize').value, 
        lineHeight: document.getElementById('lineHeight').value 
    };
    
    const template = document.getElementById('templateSelect').value;
    
    try {
        const res = await fetch('/api/generate-document', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({
                sections:sections, 
                formatting:fmt, 
                include_toc:document.getElementById('includeToc').checked,
                template: template
            })
        });
        const data = await res.json();
        if(data.success) { 
            generatedHTML=data.html; 
            updateProgress(100,'Done'); 
            setTimeout(()=>{
                hideProgress(); 
                showPreview(generatedHTML); 
                document.getElementById('exportSection').style.display='block';
            },500); 
        }
    } catch(e) { hideProgress(); alert(e); }
}
function showPreview(html) { document.getElementById('previewPanel').style.display='block'; const d=document.getElementById('visualPreviewFrame').contentWindow.document; d.open(); d.write(html); d.close(); }
function closePreview() { document.getElementById('previewPanel').style.display='none'; }
function exportHTML() { const b=new Blob([generatedHTML],{type:'text/html'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=(document.getElementById('exportFilename').value||'document')+'.html'; a.click(); }
function printDocument() { document.getElementById('visualPreviewFrame').contentWindow.print(); }
function showProgress(t,p) { document.getElementById('progressContainer').style.display='block'; document.getElementById('progressBar').style.width=p+'%'; document.getElementById('progressText').innerText=t; }
function updateProgress(p,t) { showProgress(t,p); } function hideProgress() { document.getElementById('progressContainer').style.display='none'; }



let generatedFixedHtml = ""; // Store result temporarily

let isMinimized = false;
function openHtmlFixDialog() {
    const dialog = document.getElementById('htmlFixDialog');
    const btn = document.getElementById('aiPolishBtn');
    
    // 1. Calculate Origin for Animation
    if (btn) {
        const rect = btn.getBoundingClientRect();
        // Set origin to the button's center so it "pops" from there
        dialog.style.transformOrigin = `${rect.left + rect.width/2}px ${rect.top + rect.height/2}px`;
    }

    // 2. Reset Classes (Start Compact)
    dialog.style.display = 'flex';
    void dialog.offsetWidth; // Force reflow
    
    dialog.classList.remove('is-fullscreen'); // Ensure we start small
    dialog.classList.remove('is-minimized');
    dialog.classList.add('is-open');
    
    // 3. Reset Content Views
    document.getElementById('htmlFixInput').style.display = 'block';
    document.getElementById('htmlFixCompare').style.display = 'none';
    document.getElementById('htmlFixLoading').style.display = 'none';
}

function closeHtmlFixDialog() {
    const dialog = document.getElementById('htmlFixDialog');
    dialog.classList.remove('is-open');
    
    // Wait for animation to finish before hiding
    setTimeout(() => {
        dialog.style.display = 'none';
    }, 300);
}

function toggleMinimizeDialog() {
    const dialog = document.getElementById('htmlFixDialog');
    isMinimized = !isMinimized;
    
    if (isMinimized) {
        dialog.classList.add('is-minimized');
    } else {
        dialog.classList.remove('is-minimized');
    }
}

function resetHtmlFix() {
    document.getElementById('htmlFixInput').style.display = 'block';
    document.getElementById('htmlFixCompare').style.display = 'none';
}

async function processHtmlFix() {
    const apiKey = localStorage.getItem('gemini_api_key'); // Assuming you stored it here
    if (!apiKey) {
        showToast("Please save your API Key in the AI Tools tab first.", "error");
        return;
    }

    const instruction = document.getElementById('htmlFixInstruction').value;
    const previewFrame = document.getElementById('visualPreviewFrame');
    // Get ONLY the body content to save tokens, but keep structure
    const currentHtml = previewFrame.contentDocument.body.innerHTML;

    // UI Loading State
    document.getElementById('htmlFixLoading').style.display = 'block';
    
    try {
        const response = await fetch('/api/fix-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html: currentHtml,
                api_key: apiKey,
                instruction: instruction
            })
        });

        const data = await response.json();

        if (data.success) {
            generatedFixedHtml = data.fixed_html;
            showHtmlComparison(currentHtml, generatedFixedHtml);
        } else {
            showToast(data.error || "AI Error", "error");
        }
    } catch (e) {
        showToast("Network error occurred.", "error");
        console.error(e);
    } finally {
        document.getElementById('htmlFixLoading').style.display = 'none';
    }
}

function showHtmlComparison(originalHtml, fixedHtml) {
    const dialog = document.getElementById('htmlFixDialog');

    // 1. Switch Content
    document.getElementById('htmlFixInput').style.display = 'none';
    document.getElementById('htmlFixCompare').style.display = 'flex';

    // 2. TRIGGER EXPANSION ANIMATION
    dialog.classList.add('is-fullscreen');

    // 3. Load Iframes (rest of your existing code...)
    const previewFrame = document.getElementById('visualPreviewFrame');
    const styles = previewFrame.contentDocument.head.innerHTML;
    
    const frameOriginal = document.getElementById('frameOriginal');
    const frameFixed = document.getElementById('frameFixed');

    frameOriginal.contentDocument.open();
    frameOriginal.contentDocument.write(`<html><head>${styles}</head><body>${originalHtml}</body></html>`);
    frameOriginal.contentDocument.close();

    frameFixed.contentDocument.open();
    frameFixed.contentDocument.write(`<html><head>${styles}</head><body>${fixedHtml}</body></html>`);
    frameFixed.contentDocument.close();
}

function acceptHtmlFix() {
    const previewFrame = document.getElementById('visualPreviewFrame');
    
    // Inject the fixed HTML into the main preview
    previewFrame.contentDocument.body.innerHTML = generatedFixedHtml;
    
    closeHtmlFixDialog();
    showToast("✨ Page polished successfully!", "success");
}

// Helper to match your existing toast style
function showToast(msg, type) {
    // Reuse your existing toast logic if available, or:
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}