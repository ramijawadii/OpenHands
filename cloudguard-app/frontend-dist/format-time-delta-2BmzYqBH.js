import{R as p,r as i,j as l}from"./chunk-NISHYRIK-Ct6B0h5J.js";import{u as f}from"./use-config-BBttWa4v.js";import{u as h}from"./use-is-authed-QKhu6JIF.js";import{u as m}from"./use-user-providers-sKZ0P-QO.js";import{c as u}from"./createLucideIcon-BhJjBc0H.js";import{u as g}from"./index-BmTgDRT9.js";import{C as y,T as k}from"./tooltip-button-Cd4KxcC3.js";import{g as v,c as M}from"./utils-V84uisFk.js";import{u as b}from"./useTranslation-B4rDXzC2.js";const H=()=>{const{data:t}=f(),{data:r}=h(),{providers:e}=m();return p.useMemo(()=>!t?.APP_MODE||!r?!1:t.APP_MODE==="oss"?e.length>0:!0,[t?.APP_MODE,r,e.length])};/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"m9 14 2 2 4-4",key:"df797q"}]],I=u("clipboard-check",C);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],j=u("settings",x);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M10 5H3",key:"1qgfaw"}],["path",{d:"M12 19H3",key:"yhmn1j"}],["path",{d:"M14 3v4",key:"1sua03"}],["path",{d:"M16 17v4",key:"1q0r14"}],["path",{d:"M21 12h-9",key:"1o4lsq"}],["path",{d:"M21 19h-5",key:"1rlt1p"}],["path",{d:"M21 5h-7",key:"1oszz2"}],["path",{d:"M8 10v4",key:"tgpxqk"}],["path",{d:"M8 12H3",key:"a7s4jb"}]],B=u("sliders-horizontal",_);/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],F=u("user-check",w),L=(t=20)=>{const{data:r}=h();return g({queryKey:["user","conversations","paginated",t],queryFn:({pageParam:e})=>y.getUserConversations(t,e),enabled:!!r,getNextPageParam:e=>e.next_page_id,initialPageParam:void 0})},U=({hasNextPage:t,isFetchingNextPage:r,fetchNextPage:e,threshold:o=100})=>{const a=i.useRef(null),n=i.useCallback(()=>{if(!a.current||r||!t)return;const{scrollTop:s,scrollHeight:c,clientHeight:d}=a.current;s+d>=c-o&&e()},[t,r,e,o]);return i.useEffect(()=>{const s=a.current;if(s)return s.addEventListener("scroll",n),()=>{s.removeEventListener("scroll",n)}},[n]),a};function z({conversationStatus:t}){const{t:r}=b(),e=i.useMemo(()=>{switch(t){case"STOPPED":return"bg-[#3C3C49]";case"RUNNING":return"bg-[#1FBD53]";case"STARTING":return"bg-[#FFD43B]";case"ERROR":return"bg-[#FF684E]";default:return"bg-[#3C3C49]"}},[t]),o=r(v(t));return l.jsx(k,{tooltip:o,ariaLabel:o,placement:"right",showArrow:!0,className:"p-0 border-0 bg-transparent hover:opacity-100",tooltipClassName:"bg-[var(--cg-bg-page)] text-[var(--cg-text-primary)] text-xs shadow-lg",children:l.jsx("div",{className:M("w-1.5 h-1.5 rounded-full",e)})})}const O=t=>{const e=new Date().getTime()-t.getTime(),o=Math.floor(e/1e3),a=Math.floor(o/60),n=Math.floor(a/60),s=Math.floor(n/24),c=Math.floor(s/30),d=Math.floor(c/12);return o<60?`${o}s`:a<60?`${a}m`:n<24?`${n}h`:s<30?`${s}d`:c<12?`${c}mo`:`${d}y`};export{I as C,j as S,F as U,B as a,z as b,L as c,U as d,O as f,H as u};
