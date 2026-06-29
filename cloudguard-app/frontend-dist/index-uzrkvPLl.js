import{c as k}from"./createLucideIcon-BhJjBc0H.js";import{c as C}from"./clsx-B-dksMZM.js";/**
 * @license lucide-react v0.544.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],_=k("triangle-alert",j),m=n=>typeof n=="boolean"?`${n}`:n===0?"0":n,y=C,b=(n,a)=>e=>{var s;if(a?.variants==null)return y(n,e?.class,e?.className);const{variants:u,defaultVariants:d}=a,N=Object.keys(u).map(t=>{const l=e?.[t],o=d?.[t];if(l===null)return null;const i=m(l)||m(o);return u[t][i]}),c=e&&Object.entries(e).reduce((t,l)=>{let[o,i]=l;return i===void 0||(t[o]=i),t},{}),V=a==null||(s=a.compoundVariants)===null||s===void 0?void 0:s.reduce((t,l)=>{let{class:o,className:i,...f}=l;return Object.entries(f).every(h=>{let[v,r]=h;return Array.isArray(r)?r.includes({...d,...c}[v]):{...d,...c}[v]===r})?[...t,o,i]:t},[]);return y(n,N,V,e?.class,e?.className)};export{_ as T,b as c};
