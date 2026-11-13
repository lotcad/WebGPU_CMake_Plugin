// LotCAD 웹 플러그인 API (abiVersion 1) - 편집기 자동 완성 · 검사용. 실행에는 필요 없다.
// 엔진 쪽: 3dEngine_web/src/js/lot_plugins.js (makeApi) · src/app/lot_app_plugins.cpp. 네이티브 api/lotcad/lotcad_plugin.h 의 CAD_* 와 같은 자리.
//
// 플러그인 파일 (ES module):
//   export const abiVersion = 1;
//   export const name = 'MyPlugin';
//   export function load(api: LotPluginApi): boolean | void;   // false = 취소
//   export function unload(): void;                            // 선택

export type Vec3 = [number, number, number];

export interface Bounds { min: Vec3; max: Vec3; center: Vec3; size: Vec3; }

export interface PluginTag<T = any> { owner: string; type: string; data: T; }

/** api.object(id) - 엔진 AI 가 보는 객체 요약 (종류마다 radius · length · points · text ... 가 더 붙는다) */
export interface ObjectInfo {
    id: number;
    kind: string;                 // 'mesh' · 'solid' · 'line' · 'polyline' · 'circle' · 'arc' · 'spline' · 'text' · 'dimension' ...
    name?: string;
    layer: string;
    color?: Vec3;
    visible?: boolean;
    transform: { position: Vec3; rotation: Vec3; scale: Vec3; };
    bounds?: Bounds;
    plugin?: PluginTag;
    [key: string]: any;
}

/** api.scene(max) - 장면 요약 */
export interface SceneInfo {
    count: number;
    selected: number;
    kinds: Record<string, number>;
    bounds?: Bounds;
    units: 'm' | 'mm';
    layers: { id: number; name: string; visible: boolean; locked: boolean; count: number; }[];
    objects: { id: number; kind: string; name?: string; layer: string; center: Vec3; size?: Vec3; [key: string]: any; }[];
    more?: number;                // max 를 넘어 빠진 개수
}

/** createMesh / replaceMesh 의 메시. 좌표는 객체 로컬, 삼각형은 바깥에서 볼 때 반시계 */
export interface MeshData {
    positions: ArrayLike<number>; // x, y, z, x, y, z, ...
    indices: ArrayLike<number>;   // a, b, c, ...
    smooth?: number;              // 이 각도 (도) 보다 완만한 모서리는 매끄럽게. 0 = 평평
    color?: Vec3;                 // 0..1 (createMesh 만)
    position?: Vec3;              // 객체 자리 (createMesh 만)
}

/** AI 액션 하나 - type 과 그 액션의 인자를 한 객체에 */
export interface AiAction {
    type: 'create_primitive' | 'draw_sketch' | 'edit_selected' | 'view_control' | 'command' | 'file' | 'analyze' | string;
    [param: string]: any;
}

export type EventKind = 'created' | 'deleted' | 'selection' | 'dirty';
export type PropertyKind = 'float' | 'int' | 'bool' | 'text';
export interface EntityEvent<T = any> { id: number; type: string; data: T; }

/** addPanel 이 주는 본문 - 평범한 div 에 show / hide 가 붙은 것 */
export interface PanelBody extends HTMLDivElement { show(): void; hide(): void; }

export interface LotPluginApi {
    readonly id: number;
    readonly name: string;
    readonly abiVersion: number;

    // ── 명령 (CAD_RegisterCommand · CAD_ExecuteCommand) ──
    /** 명령행 이름 등록. 엔진 명령 · 다른 플러그인과 겹치거나 빈칸이 들면 false */
    registerCommand(name: string, title: string, fn: () => void): boolean;
    registerCommand(name: string, fn: () => void): boolean;
    unregisterCommand(name: string): boolean;
    /** 명령행 한 줄을 친 것처럼 (예: 'selectall', 'zoom', 'section plane z 1'). 성공 여부만 돌려준다 */
    command(text: string): boolean;

    // ── UI (CAD_AddUiItem) - 반환 = 항목 id (0 = 실패). path 는 '탭/그룹' (리본) · '메뉴' (메뉴바) ──
    addMenuItem(path: string, title: string, command: string, icon?: string): number;
    addSeparator(path: string): number;
    addToolButton(path: string, title: string, command: string, icon?: string): number;
    addRibbonButton(path: string, title: string, command: string, icon?: string): number;
    removeUiItem(itemId: number): boolean;
    /** 떠 있는 창 - 엔진이 띄우고 본문을 준다. 안은 플러그인이 DOM 으로 채운다 */
    addPanel(title: string, dock?: 'right' | 'left' | 'bottom'): PanelBody;

    // ── 이벤트 (CAD_AddEventListener) - 반환 = 구독 id (0 = 실패) ──
    on(kinds: EventKind | EventKind[] | number, fn: (kind: EventKind, id: number) => void): number;
    off(listener: number): boolean;

    // ── 장면 · 선택 ──
    scene(maxObjects?: number): SceneInfo | null;
    object(objectId: number): ObjectInfo | null;
    selection(): number[];
    select(ids: number | number[]): void;

    // ── 만들기 ──
    /** 반환 = 새 객체 id (-1 = 실패) */
    createMesh(mesh: MeshData): number;
    replaceMesh(objectId: number, mesh: MeshData): boolean;
    /** AI 액션 묶음 - 한 번에 되돌리기 한 번. 반환 = 결과 줄들 ('… 생성 id=12' 등) */
    actions(actions: AiAction[] | { actions: AiAction[] } | string): string[];

    // ── 플러그인 객체 (CAD_SetPluginTag · CAD_AddEntityProperty) ──
    /** owner 는 이 플러그인 이름. data 는 JSON 으로 .lot 에 저장된다 */
    setTag(objectId: number, type: string, data?: any): boolean;
    clearTag(objectId: number): boolean;
    getTag(objectId: number): PluginTag | null;
    /** 이 플러그인 딱지가 붙은 객체 전부 */
    tagged(): { id: number; type: string; data: any; }[];
    /** 속성 창에 딱지 data 의 key 를 보이고 고치게 한다 (min / max 로 자른다) */
    addEntityProperty(type: string, key: string, label: string, kind: PropertyKind | number, min?: number, max?: number): boolean;
    /** .lot 을 열었을 때 · 이 플러그인이 늦게 붙었을 때 딱지 객체마다 */
    onEntityLoaded(fn: ((e: EntityEvent) => void) | null): void;
    /** 속성 창에서 값을 고쳤을 때 (값은 이미 바뀌어 있다 - 형상을 맞춘다) */
    onEntityChanged(fn: ((e: EntityEvent) => void) | null): void;

    // ── 기타 ──
    /** fn 안의 편집을 되돌리기 한 번으로 */
    transaction<T>(label: string, fn: () => T): T;
    /** 기록창 (명령행 위) 에 '이름: 글' */
    log(text: string): void;
}
