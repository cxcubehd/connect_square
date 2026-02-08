/* @ts-self-types="./cs_wasm.d.ts" */

import * as wasm from "./cs_wasm_bg.wasm";
import { __wbg_set_wasm } from "./cs_wasm_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    select_move
} from "./cs_wasm_bg.js";
