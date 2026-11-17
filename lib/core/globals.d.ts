// What the core uses of its host beyond ES2024: structuredClone, which Node 17+, every browser
// and Tauri's webviews have. The core's own check (tsconfig.json) has no DOM or Node types, so it
// declares it here; a host's own types declare it too.
declare function structuredClone<T>(value: T): T;
