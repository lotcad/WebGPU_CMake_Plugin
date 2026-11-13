// 새 플러그인의 출발점 - 복사해서 이름을 바꿔 쓴다.
//
//   pload http://localhost:8800/plugins/template.js
//   hello                  기록창에 인사 + 고른 개수

/** @typedef {import('../types/lotcad-plugin').LotPluginApi} LotPluginApi */

export const abiVersion = 1;          // 엔진의 플러그인 ABI - 다르면 붙지 않는다
export const name = 'Template';       // 플러그인 이름 (punload 이름 · 딱지 owner). 없으면 파일 이름

/** @type {LotPluginApi | null} */
let api = null;

/** @param {LotPluginApi} a */
export function load(a) {
    api = a;
    // 엔진 명령과 이름이 겹치면 false - 붙이지 않는다
    if (!api.registerCommand('hello', '인사', () => api.log(`hello - ${api.selection().length} selected`))) return false;
    api.addRibbonButton('샘플/기타', '인사', 'hello', '☺');
    return true;                      // false 를 돌려주면 취소 (등록한 것은 엔진이 지운다)
}

export function unload() { api = null; }
