# LotCAD 웹 플러그인 예제

LotCAD 웹 엔진(3dEngine_web)에 붙여 쓰는 자바스크립트 플러그인 예제 모음입니다.
엔진 코드는 들어 있지 않습니다. 엔진은 따로 띄우고, 여기 있는 `.js` 파일을 그 엔진에 불러옵니다.
네이티브 판에서 플러그인 DLL을 따로 빌드해 엔진에 붙이는 것과 같은 관계입니다.

| 파일 | 하는 일 | 보여 주는 API |
|---|---|---|
| [plugins/template.js](plugins/template.js) | `hello` 명령 하나. 새 플러그인을 만들 때 복사해서 시작합니다 | 기본 틀, 명령, 리본 단추 |
| [plugins/stairs.js](plugins/stairs.js) | `stairs` / `계단`: 매개변수 계단. 속성 창에서 단 수·폭·높이를 고치면 형상이 다시 만들어집니다 | `createMesh`, `replaceMesh`, `setTag`, `addEntityProperty`, `onEntityChanged`, `transaction` |
| [plugins/scene_info.js](plugins/scene_info.js) | `sceneinfo`: 장면 정보 패널. 개수, 종류, 고른 것을 보여 주고 단추로 엔진 명령을 부릅니다 | `addPanel`, `on`, `scene`, `object`, `selection`, `select`, `command` |
| [plugins/generator.js](plugins/generator.js) | `generator`: 입력 패널에서 상자 격자, 나선 스플라인, 비틀린 탑을 만듭니다 | `actions` (AI 액션 묶음), 매끄러운 메시 (`smooth`) |

API 전체는 [types/lotcad-plugin.d.ts](types/lotcad-plugin.d.ts)에 정리되어 있습니다.
각 예제 위쪽의 `@typedef` 줄 덕분에 VS Code에서 자동 완성이 됩니다.

## 실행

1. 엔진을 띄웁니다. 엔진 폴더에서 `./run.sh`를 실행하면 `http://localhost:8000/WebGPUApp.html`이 뜹니다. 홈페이지 판을 써도 됩니다.
2. 이 폴더에서 `python3 serve.py`를 실행해 `http://localhost:8800/`을 띄웁니다.
   엔진과 주소가 달라서, 불러오려면 CORS 허용이 필요합니다. `serve.py`가 그 허용을 붙여 줍니다.
3. 엔진 명령행에서 불러옵니다.

```
pload http://localhost:8800/plugins/stairs.js
stairs
```

플러그인을 불러오는 다른 방법:

- **파일 고르기:** `pload`만 치거나 설정 메뉴의 '플러그인 불러오기'를 누르고 파일을 고릅니다. 서버가 필요 없습니다.
- **시작할 때 불러오기:** 엔진 주소 뒤에 `?plugin=주소`를 붙입니다. 여러 개는 쉼표로 이어 씁니다.
  예: `WebGPUApp.html?plugin=http://localhost:8800/plugins/stairs.js,http://localhost:8800/plugins/generator.js`
- **다시 불러오기:** `pload all`. 한 번 붙인 플러그인은 브라우저가 기억합니다.
- **목록과 내리기:** `plist`로 목록을 보고, `punload 이름`(또는 `id`, `all`)으로 내립니다.

### 고친 플러그인 다시 불러오기

`punload Stairs` 다음 `pload http://localhost:8800/plugins/stairs.js`를 실행합니다. `serve.py`는 캐시를 끄므로 고친 파일이 바로 반영됩니다.

## 플러그인 모양

```js
export const abiVersion = 1;            // 엔진 버전과 다르면 붙지 않습니다
export const name = 'MyPlugin';         // punload 이름, 딱지 owner. 없으면 파일 이름을 씁니다

let api = null;
export function load(a) {               // false를 돌려주면 붙이기를 취소합니다
    api = a;
    if (!api.registerCommand('mycmd', '내 명령', run)) return false;   // 엔진 명령과 이름이 겹치면 false
    api.addRibbonButton('내 탭/내 그룹', '내 명령', 'mycmd', '★');
    return true;
}
export function unload() { api = null; }   // 명령, 단추, 패널, 구독은 엔진이 지웁니다
```

- **파일 하나가 플러그인 하나입니다.** 파일 고르기로 불러오면 `import`로 다른 파일을 가져올 수 없습니다. 주소로 불러올 때는 가져올 수 있습니다.
- **스레드:** api 함수는 모두 엔진의 프레임 루프와 같은 스레드에서 바로 실행됩니다. 콜백 안에서 api를 불러도 됩니다.
- **오류 처리:** 콜백에서 난 예외는 엔진이 잡아 기록창에 적습니다. 화면은 계속 돕니다.
- **되돌리기:** `transaction(label, fn)` 안의 편집과 `actions([...])` 한 묶음은 각각 되돌리기 한 번으로 취소됩니다.
- **플러그인 객체:** `setTag`로 객체에 붙인 딱지는 .lot 파일에 저장됩니다. 플러그인 없이 열어도 형상은 보이고, 다시 붙이면 `onEntityLoaded`가 옵니다.

## 아직 없는 것 (엔진 쪽 API)

- **명령 결과:** `command()`는 성공 여부만 돌려줍니다. 만들어진 객체 id가 필요하면 `actions()`의 결과 줄('… 생성 id=12')이나 `created` 이벤트를 씁니다.
- **사용자 입력:** 점 받기(`getPoint`), 실시간 미리보기(jig), 대화형 도구가 없습니다. 입력은 패널로 받습니다.
- **객체 변경 이벤트:** 이동이나 속성 변경을 알려 주는 이벤트가 없습니다. `dirty`는 저장 표시가 바뀔 때만 옵니다.
  그래서 `scene_info.js`는 1초마다 장면을 비교합니다.
- **직접 부르는 함수:** 카메라, 레이어, 선·호, 솔리드 함수가 없습니다. 지금은 `command('...')`나 `actions()`로 부릅니다.
