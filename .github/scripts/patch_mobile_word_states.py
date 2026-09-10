from pathlib import Path

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')
V3 = 'Waltiva Mobile UX v3:'
V31 = 'Waltiva Mobile UX v3.1:'

if V31 in s:
    print('Mobile UX v3.1 already applied')
    raise SystemExit(0)
if V3 not in s:
    raise SystemExit('Mobile UX v3 base was not found')


def rep(old: str, new: str, label: str, expected: int = 1):
    global s
    count = s.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), got {count}')
    s = s.replace(old, new, expected)


rep(
    ' * Waltiva Mobile UX v3: acciones nativas, teclado persistente y pinch zoom continuo.',
    ' * Waltiva Mobile UX v3.1: acciones nativas verificadas, teclado persistente y pinch zoom continuo.',
    'version marker',
)

# Inputs are legitimate native controls too (font name / font size combos).
rep(
    "        if (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute('role') === 'button') return el",
    "        if (/^(BUTTON|A|INPUT)$/.test(el.tagName) || el.getAttribute('role') === 'button') return el",
    'clickable input support',
)

# The Insertar -> Comentario command must add a comment. The separate viewer
# 'Comentarios' command continues opening the comments side panel.
rep(
    "            sheetRow('comment', icons.comment, 'Comentario', '', true),",
    "            sheetRow('add-comment', icons.comment, 'Comentario', '', true),",
    'insert sheet comment action',
)
rep(
    "                    makeButton('', 'Comentario', icons.comment, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"comment\"') +",
    "                    makeButton('', 'Comentario', icons.comment, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"add-comment\"') +",
    'quick insert comment action',
)

rep(
    "            case 'fontname': ok = clickControl(['.toolbar .combo-fontname', '.combo-fontname', '#font-combo']); break",
    "            case 'fontname': ok = clickControl(['#slot-field-fontname input', '#slot-field-fontname button', '.toolbar .combo-fontname input', '.combo-fontname input', '#font-combo']); break",
    'font name selectors',
)
rep(
    "            case 'fontsize': ok = clickControl(['.toolbar .combo-fontsize', '.combo-fontsize', '#fontsize-combo']); break",
    "            case 'fontsize': ok = clickControl(['#slot-field-fontsize input', '#slot-field-fontsize button', '.toolbar .combo-fontsize input', '.combo-fontsize input', '#fontsize-combo']); break",
    'font size selectors',
)
rep(
    "            case 'link': closeSheet(); ok = clickControl(['.toolbar .btn-insertlink', '.btn-insertlink', '[title*=\"Vínculo\"]', '[title*=\"Link\"]']); break",
    "            case 'link': closeSheet(); ok = clickControl(['.slot-inshyperlink button', '.btn-big-inserthyperlink', '.toolbar .btn-insertlink', '.btn-insertlink', '[title*=\"Vínculo\"]', '[title*=\"Link\"]']); break",
    'hyperlink selectors',
)
rep(
    "            case 'search': closeSheet(); ok = clickControl(['.btn-menu-search', '[title*=\"Buscar\"]', '[title*=\"Search\"]']); break",
    "            case 'search': closeSheet(); ok = clickControl(['#left-btn-searchbar', '.btn-menu-search', '[title*=\"Buscar\"]', '[title*=\"Search\"]']); break",
    'search selectors',
)
rep(
    "            case 'comment': closeSheet(); ok = clickControl(['.btn-comments', '.btn-menu-comments', '[title*=\"Comentario\"]', '[title*=\"Comment\"]'], 'Los comentarios no están disponibles.'); break",
    "            case 'add-comment': closeSheet(); ok = clickControl(['[id^=\"tlbtn-addcomment-\"]', '.slot-comment button', '.btn-big-add-comment'], 'No se puede añadir un comentario aquí.'); break\n            case 'comment': closeSheet(); ok = clickControl(['#left-btn-comments', '.btn-menu-comments', '.btn-comments', '[title*=\"Comentarios\"]', '[title*=\"Comments\"]'], 'Los comentarios no están disponibles.'); break",
    'comment actions',
)
rep(
    "            case 'equation': closeSheet(); ok = clickControl(['.toolbar .btn-insertequation', '.toolbar .btn-equation', '.btn-insertequation', '.btn-equation']); break",
    "            case 'equation': closeSheet(); ok = clickControl(['#tlbtn-insertequation', '.toolbar .btn-insertequation', '.toolbar .btn-equation', '.btn-insertequation', '.btn-equation']); break",
    'equation selectors',
)

path.write_text(s, encoding='utf-8')
print('Mobile UX v3.1 applied successfully')
