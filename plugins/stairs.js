// 예제 1 - 계단 (매개변수 객체: 메시 + 딱지 + 엔티티 속성)
//
//   pload http://localhost:8800/plugins/stairs.js
//   stairs (계단)          계단 하나 - 고른 것이 있으면 그 오른쪽 끝에
//   속성 창 (props)         단 수 · 폭 · 단 높이 · 단 너비를 고치면 플러그인이 형상을 다시 만든다
//   punload Stairs         내리기 - 명령 · 리본 · 메뉴 · 속성은 엔진이 지운다
//
// 계단은 평범한 메시에 딱지 (owner Stairs · type stairs · data {steps, width, rise, run}) 를 붙인 것이다.
// 딱지는 .lot 에 저장된다. 플러그인 없이 열어도 형상은 보이고 (값은 읽기 전용), 다시 붙이면 onEntityLoaded 로 살아난다.

/** @typedef {import('../types/lotcad-plugin').LotPluginApi} LotPluginApi */

export const abiVersion = 1;
export const name = 'Stairs';

/** @type {LotPluginApi | null} */
let api = null;

// 축 정렬 상자 하나를 p (위치) · f (삼각형) 에 붙인다 - 바깥을 보는 반시계 감기
function box(p, f, x0, y0, z0, x1, y1, z1) {
    const b = p.length / 3;
    p.push(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
           x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
    [0, 2, 1, 0, 3, 2,   4, 5, 6, 4, 6, 7,     // 바닥 · 위
     0, 1, 5, 0, 5, 4,   2, 3, 7, 2, 7, 6,     // 앞 · 뒤
     1, 2, 6, 1, 6, 5,   3, 0, 4, 3, 4, 7]     // 오른쪽 · 왼쪽
        .forEach((i) => f.push(b + i));
}

// 객체 로컬: x 로 올라간다 (단마다 run), y 0..width, z 0..steps * rise. 단마다 바닥까지 찬 상자.
function stairsMesh(d) {
    const p = [], f = [];
    for (let i = 0; i < d.steps; ++i) box(p, f, i * d.run, 0, 0, (i + 1) * d.run, d.width, (i + 1) * d.rise);
    return { positions: p, indices: f, smooth: 0 };
}

// 속성 창 · 파일에서 온 값은 믿지 않는다
function clean(d) {
    const num = (v, def) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : def);
    return {
        steps: Math.max(1, Math.min(50, Math.round(num(d && d.steps, 10)))),
        width: num(d && d.width, 1.2),
        rise: num(d && d.rise, 0.18),
        run: num(d && d.run, 0.28),
    };
}

function makeStairs() {
    const d = clean({});
    let at = [0, 0, 0];
    const sel = api.selection();
    if (sel.length) {
        const o = api.object(sel[0]);
        if (o && o.bounds) at = [o.bounds.max[0], o.bounds.min[1], o.bounds.min[2]];
    }
    // 묶음 - 메시 + 딱지 + 고르기가 되돌리기 한 번
    api.transaction('stairs', () => {
        const id = api.createMesh(Object.assign(stairsMesh(d), { color: [0.72, 0.74, 0.78], position: at }));
        if (id < 0) { api.log('could not make the stairs mesh'); return; }
        api.setTag(id, 'stairs', d);
        api.select([id]);
        api.log(`stairs #${id} - ${d.steps} steps, total height ${(d.steps * d.rise).toFixed(2)}`);
    });
}

/** @param {LotPluginApi} a */
export function load(a) {
    api = a;
    if (!api.registerCommand('stairs', '계단', makeStairs)) return false;   // 이름이 겹치면 붙이지 않는다
    api.registerCommand('계단', '계단', makeStairs);
    api.addRibbonButton('샘플/형상', '계단', 'stairs', '▟');
    api.addMenuItem('샘플', '계단 만들기', 'stairs', '▟');
    api.addEntityProperty('stairs', 'steps', '단 수', 'int', 1, 50);
    api.addEntityProperty('stairs', 'width', '폭', 'float', 0.3, 10);
    api.addEntityProperty('stairs', 'rise', '단 높이', 'float', 0.05, 0.5);
    api.addEntityProperty('stairs', 'run', '단 너비', 'float', 0.1, 1);
    // 속성 창에서 값을 고쳤다 - 같은 자리에서 형상만 다시 (값과 함께 되돌리기 한 번)
    api.onEntityChanged((e) => { if (e.type === 'stairs') api.replaceMesh(e.id, stairsMesh(clean(e.data))); });
    // .lot 을 열었다 / 늦게 붙었다 - 저장된 형상이 그대로라 기록만
    api.onEntityLoaded((e) => { if (e.type === 'stairs') api.log(`stairs #${e.id} ready`); });
    return true;
}

export function unload() { api = null; }
