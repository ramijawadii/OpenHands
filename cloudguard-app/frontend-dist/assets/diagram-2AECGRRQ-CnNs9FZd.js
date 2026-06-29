import{_ as l,s as k,g as R,q as E,p as I,a as _,b as F,K as D,z,G as y,E as C,H as G,l as P,L as W,d as B}from"./mermaid.core-3ZyUnAQH.js";import{p as H}from"./chunk-4BX2VUAB-CHzg0D3r.js";import{p as V}from"./wardley-L42UT6IY-DScRsHwg.js";import"./preload-helper-BXl3LOEh.js";import"./chunk-NISHYRIK-Ct6B0h5J.js";import"./diagrams-tab-CEFZC4BL.js";import"./value-CZvEfFZ9.js";import"./index-B_vvDCi1.js";import"./conversation-BhsElt5k.js";import"./QueryClientProvider-KSaUDx6b.js";import"./parse-pr-url-CqyL28xf.js";import"./createLucideIcon-BhJjBc0H.js";import"./gestures-N4KCzTNF.js";import"./index-CKfBDiq3.js";import"./clsx-B-dksMZM.js";import"./utils-V84uisFk.js";import"./declaration-DX3SAMYF.js";import"./open-hands-axios-CP1vehw7.js";import"./module-CWLbpm_7.js";import"./index-B1_PcPHy.js";import"./optimistic-user-message-store-BiDiAsHO.js";import"./tooltip-button-Cd4KxcC3.js";import"./query-client-config-CBuNZwXA.js";import"./i18next-Lgj2Bm8L.js";import"./retrieve-axios-error-message-CYr77e_f.js";import"./custom-toast-handlers-CYArpKfG.js";import"./option-service.api-D6_xlTTK.js";import"./infiniteQueryBehavior-BwrjvoxI.js";import"./use-user-providers-sKZ0P-QO.js";import"./use-settings-COY0sJh2.js";import"./use-config-BBttWa4v.js";import"./use-is-authed-QKhu6JIF.js";import"./constants-BTpTvwE4.js";import"./circle-check-D8PN7U2c.js";import"./useTranslation-B4rDXzC2.js";import"./useSingleSelectListState-Dr6CYBd_.js";import"./index-BmAXOgN_.js";import"./index-uzrkvPLl.js";import"./base-modal-blQmL4mr.js";import"./modal-body-CZJCRR8a.js";import"./modal-backdrop-D7s1NG10.js";import"./brand-button-BBzklV2C.js";import"./loading-spinner-DOh65jbJ.js";import"./chevron-down-lh244jhA.js";import"./index-JOFrrQ05.js";import"./typography-B4GS6cxw.js";import"./copy-qB861WIx.js";import"./chart-no-axes-column-l5UJ_kE2.js";import"./Trans-V5Li7sjA.js";import"./lock-Dfk9RvsV.js";import"./pencil-8sYrInIh.js";import"./settings-dropdown-input-DqKwo-g5.js";import"./optional-tag-DwNG8cY5.js";import"./chunk-S6H5EOGR-gklqXRk3.js";import"./trash-2-Be1nCOBs.js";import"./step-wNkEhWaM.js";var x={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},w={axes:[],curves:[],options:x},g=structuredClone(w),j=G.radar,q=l(()=>y({...j,...C().radar}),"getConfig"),b=l(()=>g.axes,"getAxes"),K=l(()=>g.curves,"getCurves"),N=l(()=>g.options,"getOptions"),U=l(r=>{g.axes=r.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),X=l(r=>{g.curves=r.map(t=>({name:t.name,label:t.label??t.name,entries:Y(t.entries)}))},"setCurves"),Y=l(r=>{if(r[0].axis==null)return r.map(e=>e.value);const t=b();if(t.length===0)throw new Error("Axes must be populated before curves for reference entries");return t.map(e=>{const a=r.find(o=>o.axis?.$refText===e.name);if(a===void 0)throw new Error("Missing entry for axis "+e.label);return a.value})},"computeCurveEntries"),Z=l(r=>{const t=r.reduce((e,a)=>(e[a.name]=a,e),{});g.options={showLegend:t.showLegend?.value??x.showLegend,ticks:t.ticks?.value??x.ticks,max:t.max?.value??x.max,min:t.min?.value??x.min,graticule:t.graticule?.value??x.graticule}},"setOptions"),J=l(()=>{z(),g=structuredClone(w)},"clear"),$={getAxes:b,getCurves:K,getOptions:N,setAxes:U,setCurves:X,setOptions:Z,getConfig:q,clear:J,setAccTitle:F,getAccTitle:_,setDiagramTitle:I,getDiagramTitle:E,getAccDescription:R,setAccDescription:k},Q=l(r=>{H(r,$);const{axes:t,curves:e,options:a}=r;$.setAxes(t),$.setCurves(e),$.setOptions(a)},"populate"),tt={parse:l(async r=>{const t=await V("radar",r);P.debug(t),Q(t)},"parse")},et=l((r,t,e,a)=>{const o=a.db,s=o.getAxes(),n=o.getCurves(),i=o.getOptions(),p=o.getConfig(),c=o.getDiagramTitle(),d=D(t),m=rt(d,p),u=i.max??Math.max(...n.map(f=>Math.max(...f.entries))),h=i.min,v=Math.min(p.width,p.height)/2;at(m,s,v,i.ticks,i.graticule),ot(m,s,v,p),M(m,s,n,h,u,i.graticule,p),T(m,n,i.showLegend,p),m.append("text").attr("class","radarTitle").text(c).attr("x",0).attr("y",-p.height/2-p.marginTop)},"draw"),rt=l((r,t)=>{const e=t.width+t.marginLeft+t.marginRight,a=t.height+t.marginTop+t.marginBottom,o={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return B(r,a,e,t.useMaxWidth??!0),r.attr("viewBox",`0 0 ${e} ${a}`),r.append("g").attr("transform",`translate(${o.x}, ${o.y})`)},"drawFrame"),at=l((r,t,e,a,o)=>{if(o==="circle")for(let s=0;s<a;s++){const n=e*(s+1)/a;r.append("circle").attr("r",n).attr("class","radarGraticule")}else if(o==="polygon"){const s=t.length;for(let n=0;n<a;n++){const i=e*(n+1)/a,p=t.map((c,d)=>{const m=2*d*Math.PI/s-Math.PI/2,u=i*Math.cos(m),h=i*Math.sin(m);return`${u},${h}`}).join(" ");r.append("polygon").attr("points",p).attr("class","radarGraticule")}}},"drawGraticule"),ot=l((r,t,e,a)=>{const o=t.length;for(let s=0;s<o;s++){const n=t[s].label,i=2*s*Math.PI/o-Math.PI/2;r.append("line").attr("x1",0).attr("y1",0).attr("x2",e*a.axisScaleFactor*Math.cos(i)).attr("y2",e*a.axisScaleFactor*Math.sin(i)).attr("class","radarAxisLine"),r.append("text").text(n).attr("x",e*a.axisLabelFactor*Math.cos(i)).attr("y",e*a.axisLabelFactor*Math.sin(i)).attr("class","radarAxisLabel")}},"drawAxes");function M(r,t,e,a,o,s,n){const i=t.length,p=Math.min(n.width,n.height)/2;e.forEach((c,d)=>{if(c.entries.length!==i)return;const m=c.entries.map((u,h)=>{const v=2*Math.PI*h/i-Math.PI/2,f=A(u,a,o,p),S=f*Math.cos(v),O=f*Math.sin(v);return{x:S,y:O}});s==="circle"?r.append("path").attr("d",L(m,n.curveTension)).attr("class",`radarCurve-${d}`):s==="polygon"&&r.append("polygon").attr("points",m.map(u=>`${u.x},${u.y}`).join(" ")).attr("class",`radarCurve-${d}`)})}l(M,"drawCurves");function A(r,t,e,a){const o=Math.min(Math.max(r,t),e);return a*(o-t)/(e-t)}l(A,"relativeRadius");function L(r,t){const e=r.length;let a=`M${r[0].x},${r[0].y}`;for(let o=0;o<e;o++){const s=r[(o-1+e)%e],n=r[o],i=r[(o+1)%e],p=r[(o+2)%e],c={x:n.x+(i.x-s.x)*t,y:n.y+(i.y-s.y)*t},d={x:i.x-(p.x-n.x)*t,y:i.y-(p.y-n.y)*t};a+=` C${c.x},${c.y} ${d.x},${d.y} ${i.x},${i.y}`}return`${a} Z`}l(L,"closedRoundCurve");function T(r,t,e,a){if(!e)return;const o=(a.width/2+a.marginRight)*3/4,s=-(a.height/2+a.marginTop)*3/4,n=20;t.forEach((i,p)=>{const c=r.append("g").attr("transform",`translate(${o}, ${s+p*n})`);c.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${p}`),c.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(i.label)})}l(T,"drawLegend");var it={draw:et},st=l((r,t)=>{let e="";for(let a=0;a<r.THEME_COLOR_LIMIT;a++){const o=r[`cScale${a}`];e+=`
		.radarCurve-${a} {
			color: ${o};
			fill: ${o};
			fill-opacity: ${t.curveOpacity};
			stroke: ${o};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${a} {
			fill: ${o};
			fill-opacity: ${t.curveOpacity};
			stroke: ${o};
		}
		`}return e},"genIndexStyles"),nt=l(r=>{const t=W(),e=C(),a=y(t,e.themeVariables),o=y(a.radar,r);return{themeVariables:a,radarOptions:o}},"buildRadarStyleOptions"),lt=l(({radar:r}={})=>{const{themeVariables:t,radarOptions:e}=nt(r);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${e.axisColor};
		stroke-width: ${e.axisStrokeWidth};
	}
	.radarAxisLabel {
		dominant-baseline: middle;
		text-anchor: middle;
		font-size: ${e.axisLabelFontSize}px;
		color: ${e.axisColor};
	}
	.radarGraticule {
		fill: ${e.graticuleColor};
		fill-opacity: ${e.graticuleOpacity};
		stroke: ${e.graticuleColor};
		stroke-width: ${e.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${e.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${st(t,e)}
	`},"styles"),me={parser:tt,db:$,renderer:it,styles:lt};export{me as diagram};
