// 예제 2 - 장면 정보 패널 (패널 + 이벤트 + 엔진 명령 부르기)
//
//   pload http://localhost:8800/plugins/scene_info.js
//   sceneinfo              패널 보이기 / 숨기기
//
// 패널은 엔진이 띄운 창의 본문 (DOM 요소) 이다. 안은 평범한 DOM 으로 채운다.
// created · deleted · selection · dirty 이벤트가 오면 다음 프레임에 한 번만 다시 그린다 (한 번에 여럿이 와도).
// 옮기기 · 속성 고치기처럼 '객체가 바뀌었다' 는 이벤트는 아직 없어서 (dirty 는 저장 표시가 바뀔 때만) 1 초마다 견주어 본다.

/** @typedef {import('../types/lotcad-plugin').LotPluginApi} LotPluginApi */

export const abiVersion = 1;
export const name = 'SceneInfo';

/** @type {LotPluginApi | null} */
let api = null;
let body = null, shown = true, queued = false;
let listener = 0, timer = 0, lastKey = '';

const fmt = (v) => (Array.isArray(v) ? v.map((x) => (+x).toFixed(2)).join(' × ') : '');

function el(tag, text, style) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (style) Object.assign(e.style, style);
    return e;
}

function button(label, fn) {
    const b = el('button', label, {
        font: 'inherit', color: 'inherit', background: '#2a2a2a', border: '1px solid #444',
        borderRadius: '2px', padding: '2px 8px', marginRight: '4px', cursor: 'pointer',
    });
    b.addEventListener('click', fn);
    return b;
}

function render() {
    queued = false;
    if (!api || !body) return;
    const scene = api.scene(200);
    const sel = api.selection();
    const key = JSON.stringify(scene) + sel.join(',');
    if (key === lastKey) return;   // 그대로면 DOM 을 건드리지 않는다
    lastKey = key;
    body.textContent = '';
    if (!scene) { body.appendChild(el('div', '장면을 읽지 못했습니다')); return; }

    body.appendChild(el('div', `객체 ${scene.count}개 · 고른 것 ${sel.length}개 · 단위 ${scene.units}`, { marginBottom: '4px' }));
    if (scene.bounds) body.appendChild(el('div', `전체 크기 ${fmt(scene.bounds.size)}`, { color: '#999', marginBottom: '6px' }));

    // 종류별 개수
    const kinds = Object.keys(scene.kinds || {});
    if (kinds.length) {
        const t = el('div', '', { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' });
        kinds.forEach((k) => t.appendChild(el('span', `${k} ${scene.kinds[k]}`,
            { background: '#333', borderRadius: '8px', padding: '1px 7px' })));
        body.appendChild(t);
    }

    // 고른 것 - 줄을 누르면 그것만 고른다
    if (sel.length) {
        body.appendChild(el('div', '고른 것', { color: '#999', margin: '4px 0 2px' }));
        sel.slice(0, 30).forEach((id) => {
            const o = api.object(id);
            if (!o) return;
            const tag = o.plugin ? ` [${o.plugin.owner}/${o.plugin.type}]` : '';
            const row = el('div', `#${id} ${o.kind}${o.name ? ' ' + o.name : ''}${tag}  ${o.bounds ? fmt(o.bounds.size) : ''}`,
                { padding: '1px 2px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
            row.title = '이것만 고르기';
            row.addEventListener('click', () => api.select([id]));
            body.appendChild(row);
        });
        if (sel.length > 30) body.appendChild(el('div', `… 그 밖 ${sel.length - 30}개`, { color: '#999' }));
    }

    // 엔진 명령 - 명령행에 친 것과 같다
    const bar = el('div', '', { marginTop: '8px', borderTop: '1px solid #444', paddingTop: '6px' });
    bar.appendChild(button('모두 고르기', () => api.command('selectall')));
    bar.appendChild(button('고른 것 확대', () => api.command(sel.length ? 'focus' : 'zoom')));
    bar.appendChild(button('지우기', () => sel.length && api.command('delete')));
    body.appendChild(bar);
}

function refresh() {
    if (queued || !shown) return;
    queued = true;
    requestAnimationFrame(render);
}

function toggle() {
    shown = !shown;
    if (shown) { body.show(); refresh(); } else body.hide();
}

/** @param {LotPluginApi} a */
export function load(a) {
    api = a;
    if (!api.registerCommand('sceneinfo', '장면 정보', toggle)) return false;
    api.addRibbonButton('샘플/보기', '장면 정보', 'sceneinfo', 'ⓘ');
    api.addMenuItem('샘플', '장면 정보 패널', 'sceneinfo', 'ⓘ');
    body = api.addPanel('장면 정보', 'right');
    body.style.width = '300px';
    listener = api.on(['created', 'deleted', 'selection', 'dirty'], refresh);
    timer = setInterval(refresh, 1000);
    refresh();
    return true;
}

// 패널 · 명령 · 구독은 엔진이 지운다. 여기서는 잡아 둔 것만 놓는다 (타이머는 플러그인 것)
export function unload() {
    clearInterval(timer);
    if (api && listener) api.off(listener);
    api = null;
    body = null;
}
