// 예제 3 - 생성기 (입력 패널 + AI 액션 묶음 + 매끄러운 메시)
//
//   pload http://localhost:8800/plugins/generator.js
//   generator (생성기)     패널 보이기 / 숨기기
//
//   상자 격자   api.actions([{type: 'create_primitive', shape: 'cube', size, position}, ...]) - 한 묶음 = 되돌리기 한 번
//   나선        api.actions([{type: 'draw_sketch', shape: 'spline', points}]) - 맞춤점 스플라인
//   비틀린 탑   api.createMesh({..., smooth: 40}) - 40도보다 완만한 모서리는 법선을 이어 매끄럽게
//
// 액션은 엔진의 AI · MCP 가 쓰는 것과 같다 (create_primitive · draw_sketch · edit_selected · view_control · command ...).

/** @typedef {import('../types/lotcad-plugin').LotPluginApi} LotPluginApi */

export const abiVersion = 1;
export const name = 'Generator';

/** @type {LotPluginApi | null} */
let api = null;
let body = null, shown = true;
const inputs = {};

const val = (key, def, lo, hi) => {
    const v = parseFloat(inputs[key] && inputs[key].value);
    return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
};

// ── 상자 격자 ── 바닥 (z = 0) 에 rows × cols, 높이는 가운데로 갈수록 높게 + 흔들림
function boxGrid() {
    const rows = Math.round(val('rows', 6, 1, 20)), cols = Math.round(val('cols', 6, 1, 20));
    const gap = val('gap', 1.5, 0.1, 50), size = val('size', 1, 0.05, 50), jitter = val('jitter', 0.5, 0, 1);
    const acts = [];
    for (let r = 0; r < rows; ++r) {
        for (let c = 0; c < cols; ++c) {
            const u = cols > 1 ? c / (cols - 1) - 0.5 : 0, v = rows > 1 ? r / (rows - 1) - 0.5 : 0;
            const h = size * (1 + 3 * (1 - Math.hypot(u, v) * 1.4)) * (1 - jitter * 0.5 + jitter * Math.random());
            acts.push({ type: 'create_primitive', shape: 'cube', size: [size, size, Math.max(size * 0.2, h)],
                        position: [c * gap, r * gap, 0] });
        }
    }
    const notes = api.actions(acts);
    api.log(`box grid ${rows} × ${cols} (${notes.length} notes)`);
}

// ── 나선 ── z 축을 돌며 올라가는 스플라인
function helix() {
    const radius = val('radius', 2, 0.1, 100), turns = val('turns', 3, 0.25, 20), pitch = val('pitch', 1, 0.05, 50);
    const n = Math.max(8, Math.round(turns * 16)), pts = [];
    for (let i = 0; i <= n; ++i) {
        const t = (i / n) * turns * Math.PI * 2;
        pts.push([radius * Math.cos(t), radius * Math.sin(t), (t / (Math.PI * 2)) * pitch]);
    }
    const notes = api.actions([{ type: 'draw_sketch', shape: 'spline', points: pts, closed: false }]);
    api.log(`helix r ${radius} × ${turns} turns - ${notes.join(' / ')}`);
}

// ── 비틀린 탑 ── 정다각형 단면을 층마다 돌리고 줄여 쌓는다 (옆면 + 위 · 아래 뚜껑)
function tower() {
    const sides = Math.round(val('sides', 24, 3, 64)), floors = Math.round(val('floors', 30, 1, 200));
    const height = val('height', 12, 0.5, 500), twist = val('twist', 90, -720, 720) * Math.PI / 180;
    const r0 = val('base', 2, 0.1, 100), taper = val('taper', 0.5, 0.05, 2);
    const p = [], f = [];
    const ring = (l) => l * sides;
    for (let l = 0; l <= floors; ++l) {
        const s = l / floors, r = r0 * (1 + (taper - 1) * s), a0 = twist * s;
        for (let j = 0; j < sides; ++j) {
            const a = a0 + (j / sides) * Math.PI * 2;
            p.push(r * Math.cos(a), r * Math.sin(a), height * s);
        }
    }
    for (let l = 0; l < floors; ++l) {
        for (let j = 0; j < sides; ++j) {
            const a = ring(l) + j, b = ring(l) + (j + 1) % sides, c = ring(l + 1) + (j + 1) % sides, d = ring(l + 1) + j;
            f.push(a, b, c, a, c, d);   // 반시계 - 바깥을 본다
        }
    }
    const bottom = p.length / 3;
    p.push(0, 0, 0);
    const top = p.length / 3;
    p.push(0, 0, height);
    for (let j = 0; j < sides; ++j) {
        f.push(bottom, ring(0) + (j + 1) % sides, ring(0) + j);
        f.push(top, ring(floors) + j, ring(floors) + (j + 1) % sides);
    }
    api.transaction('tower', () => {
        const id = api.createMesh({ positions: p, indices: f, smooth: 40, color: [0.42, 0.62, 0.86], position: [0, 0, 0] });
        if (id < 0) { api.log('could not make the tower mesh'); return; }
        api.select([id]);
        api.log(`tower #${id} - ${sides} sides, ${floors} floors, ${f.length / 3} triangles`);
    });
}

// ── 패널 ──
function field(parent, key, label, value) {
    const row = document.createElement('label');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' });
    const t = document.createElement('span');
    t.textContent = label;
    Object.assign(t.style, { width: '70px', color: '#aaa' });
    const i = document.createElement('input');
    i.type = 'number';
    i.step = 'any';
    i.value = String(value);
    Object.assign(i.style, { width: '70px', font: 'inherit', color: 'inherit', background: '#101010', border: '1px solid #444' });
    row.appendChild(t);
    row.appendChild(i);
    parent.appendChild(row);
    inputs[key] = i;
}

function group(title, fields, label, fn) {
    const g = document.createElement('div');
    Object.assign(g.style, { borderBottom: '1px solid #444', padding: '4px 0 6px', marginBottom: '4px' });
    const h = document.createElement('div');
    h.textContent = title;
    Object.assign(h.style, { fontWeight: '600', marginBottom: '2px' });
    g.appendChild(h);
    fields.forEach((x) => field(g, x[0], x[1], x[2]));
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, { marginTop: '4px', font: 'inherit', color: 'inherit', background: '#2a2a2a', border: '1px solid #444', cursor: 'pointer' });
    b.addEventListener('click', fn);
    g.appendChild(b);
    body.appendChild(g);
}

function toggle() {
    shown = !shown;
    if (shown) body.show(); else body.hide();
}

/** @param {LotPluginApi} a */
export function load(a) {
    api = a;
    if (!api.registerCommand('generator', '생성기', toggle)) return false;
    api.registerCommand('boxgrid', '상자 격자', boxGrid);
    api.registerCommand('helix', '나선', helix);
    api.registerCommand('tower', '비틀린 탑', tower);
    api.addRibbonButton('샘플/생성', '생성기', 'generator', '⚙');
    api.addRibbonButton('샘플/생성', '비틀린 탑', 'tower', '♜');
    api.addMenuItem('샘플', '생성기 패널', 'generator', '⚙');

    body = api.addPanel('생성기', 'left');
    group('상자 격자', [['rows', '행', 6], ['cols', '열', 6], ['gap', '간격', 1.5], ['size', '한 변', 1], ['jitter', '흔들림 0~1', 0.5]],
          '만들기', boxGrid);
    group('나선 (스플라인)', [['radius', '반지름', 2], ['turns', '바퀴', 3], ['pitch', '한 바퀴 높이', 1]], '그리기', helix);
    group('비틀린 탑 (메시)', [['sides', '변 수', 24], ['floors', '층 수', 30], ['height', '높이', 12], ['twist', '비틀기 (도)', 90],
                               ['base', '밑 반지름', 2], ['taper', '위 / 아래', 0.5]], '만들기', tower);
    return true;
}

export function unload() { api = null; body = null; }
