# 心情 Commit 文档设计（草稿）

> 四千周视图里的"单日 commit"不是代码提交，而是一条**心情记录**。
> 每天记录当下的情绪，用海绵宝宝角色的颜色给情绪编码；一周 7 天的心情聚合成
> 热力图里那一格的颜色和深浅。本文定义这套映射和记录格式。
>
> 状态：**已定稿**（决策见第七节）。作为 `LifeCommitSource` 的真实数据契约，
> 落地时替换 `gui/electron/lifeWeeks.ts` 里的 `MockCommitSource`。

## 一、心情 → 角色 → 颜色 映射

比奇堡的每个角色代表一类情绪底色。核心五条是你定的，后面几条是我按情绪光谱补的建议，供你增删。

全部八类心情（核心五 + 补充三，已定全留）：

| `mood` 键名 | 心情簇 | 角色 | 颜色 | token | 现状 |
|---|---|---|---|---|---|
| `passion` | 热情 · 激情 · 冲劲 | 海绵宝宝 | 暖黄 | `sponge` | 已有 |
| `joy` | 开心 · 放纵 · 玩闹 | 派大星 | 粉 | `patrick` | 已有 |
| `sadness` | 伤心 · 忧郁 · 低落 | 章鱼哥 | 青（teal） | `squid` | 已有 |
| `greed` | 贪婪 · 算计 · 野心 | 痞老板 | 绿 | `plankton` | **需新增** |
| `wealth` | 富有 · 得到 · 回报 | 蟹老板 | 红 | `krabs` | **需新增** |
| `calm` | 平静 · 慵懒 · 治愈 | 小蜗 Gary | 蓝（blue） | `gary` | 已有 token |
| `focus` | 专注 · 求知 · 行动力 | 松鼠珊迪 | 棕褐 | `sandy` | **需新增** |
| `anxiety` | 焦虑 · 紧张 · 手忙脚乱 | 泡芙老师 | 米沙 | `puff` | **需新增** |
| （无） | 空虚 · 麻木 · 没记录 | —（默认） | 浅灰 | `past-untracked` | 已有，作"这天没记"的兜底 |

> `mood` 键名 → token 的绑定就是上表第 1、5 列，实现时直接照抄（见第八节 `MOOD_TOKEN` / `MOOD_RAMP`）。
> 章鱼哥（`sadness`）保持 teal、小蜗（`calm`）用纯蓝，两者拉开不撞色。

## 二、颜色 token —— 每个角色一条 4 级色带（A 方案已定）

主色用 **A 方案**：每个角色都做一条淡→饱和的 4 级色带（像现在 `sponge-1..4`），
主色决定用哪条带，周档位（1–4）决定用第几级。下面是全部八条色带的**起点值**，
饱和度压低以贴合 minimalist-ui，`-text` 是该角色在 tag/描边上的深字色。你来定稿。

```css
@theme {
  /* 海绵宝宝 · 热情黄（现有，未动） */
  --color-sponge-1: #fbf3db; --color-sponge-2: #f3e3a8;
  --color-sponge-3: #ebcf6f; --color-sponge-4: #e2b93e;
  --color-sponge-text: #956400;

  /* 派大星 · 开心粉 */
  --color-patrick-1: #fbe7ec; --color-patrick-2: #f4cdd8;
  --color-patrick-3: #e9a6b8; --color-patrick-4: #d97a95;
  --color-patrick-text: #a34d5e;

  /* 章鱼哥 · 忧郁青（teal 取向；若改纯蓝见第七节） */
  --color-squid-1: #e6f0ee; --color-squid-2: #c3ddd7;
  --color-squid-3: #93c2b8; --color-squid-4: #5fa093;
  --color-squid-text: #3e6b62;

  /* 痞老板 · 贪婪绿 */
  --color-plankton-1: #e9f2e4; --color-plankton-2: #cfe4c4;
  --color-plankton-3: #a9cf98; --color-plankton-4: #7bb267;
  --color-plankton-text: #4c7a3c;

  /* 蟹老板 · 富有红（比派大星粉更暖、偏砖红，拉开区分） */
  --color-krabs-1: #fae8e0; --color-krabs-2: #f2cdbd;
  --color-krabs-3: #e5a288; --color-krabs-4: #cf7355;
  --color-krabs-text: #a6522f;

  /* 小蜗 Gary · 平静蓝（纯蓝，和章鱼哥的青拉开） */
  --color-gary-1: #e1f0fb; --color-gary-2: #c2ddf2;
  --color-gary-3: #93c2e6; --color-gary-4: #5b9fd6;
  --color-gary-text: #1f6c9f;

  /* 松鼠珊迪 · 专注褐 */
  --color-sandy-1: #f2ecdf; --color-sandy-2: #e2d3b6;
  --color-sandy-3: #ccb182; --color-sandy-4: #b08f52;
  --color-sandy-text: #856b3a;

  /* 泡芙老师 · 焦虑沙 */
  --color-puff-1: #f4efe6; --color-puff-2: #e6dcc6;
  --color-puff-3: #d0c09a; --color-puff-4: #b3a06f;
  --color-puff-text: #8a7a55;
}
```

> 现有 `patrick`/`squid`/`gary` token 目前是"单一 bg + text"两个值（`patrick-bg` 等），
> 改成 4 级色带后要顺带更新用到它们的组件（`Tag.tsx`、`StatusDot.tsx` 等）的类名引用。

## 三、单日 commit（心情记录）格式

**一天只有一条 commit**（一个当日主心情），不是数组。最小结构：

```jsonc
{
  "date": "2026-07-07",
  "mood": "passion",
  "intensity": 2,
  "note": "重构四千周视图，手感对了"
}
```

- `mood`：映射表的类别键之一（对应八类心情簇）。
- `intensity`：`1 | 2 | 3` = 轻 / 中 / 强。决定这天在周里的分量、以及点开周视图后这天格子的深浅。
- `note`：可选自由文本，只在**周视图里 hover 某一天**时才展示（见第五节交互）。
- 没记录的一天 = 当月文件里没有这个 `date` 的条目，渲染为浅灰 `past-untracked`。

## 四、按周聚合（决定热力图那一格）

一格 = 一周（周起点仍是生日星期，见 `lifeWeeks.ts` 的 `weekIndexOf`）。一周最多 7 条单日 commit，
每条一个 mood。两个维度：

1. **主色（是什么颜色）**：本周 7 天里，按 `intensity` 加权出现最多的 `mood` 类别取胜（众数，平局取强度和更高者）。这决定这一格用哪个角色的颜色。
2. **档位（颜色多深，1–4）**：本周各天 `intensity` 总和（最多 7×3=21）映射到深浅：
   - `0` → 没记录，浅灰 `past-untracked`
   - `1–4` → `-1`
   - `5–9` → `-2`
   - `10–15` → `-3`
   - `16+` → `-4`
   （阈值可调，落地时替换 `lifeWeeks.ts` 的 `levelOf`。）

> **档位表现：A 方案（已定）**——主色选角色的色带，档位（1–4）选 `-1..-4` 的深浅，
> 没记录用浅灰 `past-untracked`。色带见第二节。

## 五、交互（两级：周格 → 周视图）

四千周网格里每格是一周，交互分两级：

1. **周网格（默认）**：一格一周，颜色 = 主色 + 档位（第四节）。
   - **hover 周格**：**不显示 note**。只给轻量周摘要（周序号 / 日期范围 / 年龄 / 当周主心情），保持信息密度低。
   - **点击周格**：下钻进入该周的**周视图**。
2. **周视图（点击后）**：展开这一周的 7 天明细，每天一个小格，颜色 = 那天 `mood` 的角色色带 + `intensity` 档位；没记录的天用浅灰。
   - **hover 某天**：此时才弹 tooltip 显示这天的 `note`（+ 日期、心情、强度）。
   - 提供返回/关闭回到周网格。

> 一句话：note 是"日"级信息，只在周视图里 hover 天格时出现；周网格 hover 只给周级摘要，点击才下钻到天。

## 六、落地时要改的地方（定稿后）

- `gui/electron/lifeWeeks.ts`：`DayCommit` 从 `{ date, count }` 改为 `{ date, mood, intensity, note? }`（一天一条）；`MockCommitSource` 换成读真实记录的 `ShookCommitSource`。**数据按月切文件**：`.shook/moods/YYYY-MM.json`（每月一个文件，内容是该月的单日 commit 数组，一天一条），`ensureStateDirs` 里补建 `.shook/moods/` 目录，`.gitignore` 加 `.shook/moods/`。读取时按视图涉及的月份范围拉取对应文件，避免一次读全量。
- 聚合函数 `buildLifeWeeksData`：`level` 计算改为第四节的主色 + 档位规则，`LifeWeek` 上带出 `dominantMood`（选色用）和 `days: DayCommit[]`（周视图下钻用）。
- `gui/src/components/status/LifeGrid.tsx`：`fillForWeek` 改为"看 `dominantMood` 选角色色带 + level 选深浅"；周格 hover tooltip 只显示周摘要（去掉 note）；新增点击周格 → 周视图（7 天明细）的下钻交互，天格 hover 才显示 note。
- `gui/src/index.css`：加上第二节的八条色带 token。
- `gui/src/shook.d.ts` 与 `AGENTS.md` 的 GUI 章节：同步类型和数据来源说明。

## 七、已定（全部拍板完成）

- 主色档位：**A 方案**（每角色 4 级色带）。
- 心情类别：**核心五 + 补充三全留**（八类）。
- 数据落盘：**按月切文件** `.shook/moods/YYYY-MM.json`。
- 颜色取向：**章鱼哥 teal（`squid`）、小蜗 blue（`gary`）** 拉开区分。
- **一天一条 commit**（一个主心情），不是数组。
- 交互两级：**周格 hover 只给周摘要（无 note）→ 点击下钻周视图 → 天格 hover 才显示 note**。
- 类别键名沿用第三节的 `passion/joy/...`，不再改动。
- 八条色带色值暂用第二节起草值，暂不调。

至此设计已定稿，可进入落地（第六节清单）。

## 八、给实现模型的落地规格（照此编码，勿自由发挥）

> 这一节是给接手实现的模型/人看的确定性规格。所有类型、映射、算法、文件格式都在这里给全。
> 动手前先读现有 `gui/electron/lifeWeeks.ts`（当前数据层）和 `gui/src/components/status/LifeGrid.tsx`
> （当前渲染，已有「总览 / 100 周」两种模式），本节的改动是在这两个文件上演进，不是重写。

### 8.1 类型定义（`gui/electron/lifeWeeks.ts`，替换现有 `DayCommit` 等）

```ts
export type Mood =
  | 'passion' | 'joy' | 'sadness' | 'greed'
  | 'wealth' | 'calm' | 'focus' | 'anxiety'

export type DayCommit = {
  date: string          // 'YYYY-MM-DD'
  mood: Mood
  intensity: 1 | 2 | 3
  note?: string
}

export type LifeWeek = {
  weekIndex: number
  startDate: string         // 'YYYY-MM-DD'
  level: 0 | 1 | 2 | 3 | 4   // 0 = 本周无记录
  dominantMood: Mood | null  // null = 本周无记录（渲染浅灰）
  days: DayCommit[]          // 本周已记录的天（供周视图下钻，可空）
}

// LifeWeeksData 保持不变（birthDate/lifespanYears/totalWeeks/currentWeekIndex/trackedFromWeek/weeks）
// LifeCommitSource 接口不变：getDailyCommits(fromISO, toISO): Promise<DayCommit[]>
```

### 8.2 mood → token / 色带映射（新增，主进程与渲染层各放一份或共享）

```ts
export const MOOD_TOKEN: Record<Mood, string> = {
  passion: 'sponge', joy: 'patrick', sadness: 'squid', greed: 'plankton',
  wealth: 'krabs', calm: 'gary', focus: 'sandy', anxiety: 'puff',
}

// LifeGrid 用 SVG <rect fill="#..."> 直接上色，用这张 hex 表（值 = 第二节色带 -1..-4）
export const MOOD_RAMP: Record<Mood, [string, string, string, string]> = {
  passion:  ['#fbf3db', '#f3e3a8', '#ebcf6f', '#e2b93e'],
  joy:      ['#fbe7ec', '#f4cdd8', '#e9a6b8', '#d97a95'],
  sadness:  ['#e6f0ee', '#c3ddd7', '#93c2b8', '#5fa093'],
  greed:    ['#e9f2e4', '#cfe4c4', '#a9cf98', '#7bb267'],
  wealth:   ['#fae8e0', '#f2cdbd', '#e5a288', '#cf7355'],
  calm:     ['#e1f0fb', '#c2ddf2', '#93c2e6', '#5b9fd6'],
  focus:    ['#f2ecdf', '#e2d3b6', '#ccb182', '#b08f52'],
  anxiety:  ['#f4efe6', '#e6dcc6', '#d0c09a', '#b3a06f'],
}
export const PAST_UNTRACKED = '#f1efea'
```

### 8.3 周聚合（`buildLifeWeeksData` 内，替换现有 level/total 逻辑）

```ts
function levelOf(intensitySum: number): 0 | 1 | 2 | 3 | 4 {
  if (intensitySum <= 0) return 0
  if (intensitySum <= 4) return 1
  if (intensitySum <= 9) return 2
  if (intensitySum <= 15) return 3
  return 4
}

// 每周（days 为本周已记录的天）：
function aggregateWeek(days: DayCommit[]): { level: 0|1|2|3|4; dominantMood: Mood | null } {
  if (days.length === 0) return { level: 0, dominantMood: null }
  const score = new Map<Mood, number>()
  for (const d of days) score.set(d.mood, (score.get(d.mood) ?? 0) + d.intensity)
  // 众数：按 intensity 加权总分最高的 mood；平局取分高者（Map 迭代序保证稳定）
  let dominantMood: Mood = days[0].mood
  let best = -1
  for (const [mood, s] of score) if (s > best) { best = s; dominantMood = mood }
  const intensitySum = days.reduce((sum, d) => sum + d.intensity, 0)
  return { level: levelOf(intensitySum), dominantMood }
}
```

`buildLifeWeeksData` 里按 `weekIndexOf(day.date)` 分桶后，对每周调用 `aggregateWeek`，把结果连同 `days` 一起塞进 `LifeWeek`。

### 8.4 真实数据源（`ShookCommitSource`，替换 `MockCommitSource` 作为主源）

按月切文件 `.shook/moods/YYYY-MM.json`，文件内容是**该月单日 commit 的数组**（一天一条）。

```ts
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export class ShookCommitSource implements LifeCommitSource {
  constructor(private projectRoot: string) {}
  async getDailyCommits(fromISO: string, toISO: string): Promise<DayCommit[]> {
    const all: DayCommit[] = []
    for (const ym of monthsBetween(fromISO, toISO)) {           // ['2024-07','2024-08',...]
      const path = join(this.projectRoot, '.shook', 'moods', `${ym}.json`)
      try {
        const parsed = JSON.parse(await readFile(path, 'utf8')) as DayCommit[]
        if (Array.isArray(parsed)) all.push(...parsed)
      } catch { /* 文件不存在 = 该月无记录，跳过 */ }
    }
    return all.filter(d => d.date >= fromISO && d.date <= toISO)
  }
}

// 'YYYY-MM-DD' 两端之间涉及的所有 'YYYY-MM'（含端点月）
function monthsBetween(fromISO: string, toISO: string): string[] { /* 逐月自增到 toISO */ }
```

- `ipc.ts` 里构造：`new ShookCommitSource(PROJECT_ROOT)`，`lifeweeks:get` 仍走 `buildLifeWeeksData(source)`。
- `.shook/moods/` 目录：`statePersistence.ts` 的 `ensureStateDirs` 里补 `mkdir`；`.gitignore` 加 `.shook/moods/`。

### 8.5 空态兜底（没有真实数据时别让网格全灰）

保留 `MockCommitSource`，但**改成生成新结构**（一天一条，`mood` 从 8 类里确定性挑一个、`intensity` 1–3）。
`ipc.ts` 里：先用 `ShookCommitSource`，若其返回空（`.shook/moods/` 下无任何文件）则回退到 `MockCommitSource`，
保证首次打开有东西看。Mock 沿用现有 `mulberry32(hashString(date))` 的确定性写法，把 `count` 换成挑 mood。

### 8.6 渲染改动（`gui/src/components/status/LifeGrid.tsx`）

1. `LifeWeek` 类型加 `dominantMood`、`days`（同 8.1），`shook.d.ts` 同步。
2. `fillForWeek` 改为：
   ```ts
   function fillForWeek(week: LifeWeek, data: LifeWeeksData): string {
     if (week.weekIndex > data.currentWeekIndex) return FUTURE          // 未来近白
     if (!week.dominantMood || week.level === 0) return PAST_UNTRACKED  // 无记录浅灰
     return MOOD_RAMP[week.dominantMood][week.level - 1]
   }
   ```
3. 周格 hover tooltip：**去掉 note**，只显示周序号 / 日期范围 / 年龄 / 当周主心情（`dominantMood` 的中文簇名）。
4. 底部图例：现在是"少→多"的 sponge 单色阶，改成**8 类心情的角色色板**（每个一格 + 中文名），另加一格浅灰"未记录"。
5. 新增**点击周格 → 周视图**下钻（下方 8.7）。「总览 / 100 周」两种模式下点击都进周视图。

### 8.7 周视图（点击周格后）

- 布局建议（非强制，UI 手感你/实现者定）：在网格下方或覆盖层展开一个面板，横排 7 个较大的天格（按 `startDate` 起的周一…周日，标日期），每格颜色 = `MOOD_RAMP[day.mood][day.intensity-1]`，无记录的天用 `PAST_UNTRACKED`；面板顶部一行标题（该周日期范围）+ 返回按钮。
- 数据来自被点周的 `week.days`（已在 `LifeWeeksData` 里，无需再请求）。
- **hover 天格**才弹 tooltip：日期 + 心情中文名 + 强度（轻/中/强）+ `note`（若有）。
- 返回/点击面板外区域回到周网格。

### 8.8 完整月文件示例（`docs/examples/shook/moods.example.json` 一并加上）

```json
[
  { "date": "2026-07-01", "mood": "focus",   "intensity": 2, "note": "重构四千周数据层" },
  { "date": "2026-07-02", "mood": "passion", "intensity": 3, "note": "配色一次就对了" },
  { "date": "2026-07-03", "mood": "anxiety", "intensity": 2 },
  { "date": "2026-07-04", "mood": "joy",     "intensity": 3, "note": "周五放松" },
  { "date": "2026-07-06", "mood": "wealth",  "intensity": 1, "note": "季度奖金到账" },
  { "date": "2026-07-07", "mood": "calm",    "intensity": 1 }
]
```

（7-05 缺条 = 那天没记，渲染浅灰。文件名即 `.shook/moods/2026-07.json`。）

### 8.9 验证（实现完成后）

- `cd gui && npx tsc --noEmit` 通过。
- 手写一份 `.shook/moods/<当前月>.json`（照 8.8），打开 telemetry 页：对应周格应按主心情上色、深浅随强度；点击周格弹出 7 天面板；hover 天格显示 note。
- 删掉 `.shook/moods/` 下所有文件重启：网格回退到 Mock 的确定性假数据，不应全灰或报错。
