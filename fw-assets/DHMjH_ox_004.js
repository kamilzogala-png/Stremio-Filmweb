(function(){const o=document.documentElement.clientWidth<768,l=typeof FilmwebSettings>"u";function a(...d){const[e,i,t,r]=d,n=document.createElement(e);if(i)for(const c in i)i.hasOwnProperty(c)&&n.setAttribute(c,i[c].join?i[c].join(" "):i[c]);return r&&(n.innerHTML=r),t&&t.appendChild&&t.appendChild(n),n}class s{static coreCss=`
            body { overflow: hidden!important; }
            .ws__wrapper { z-index: 9999; position: fixed; inset: 0; background: rgba(255,255,255,0.5); min-height: 50px; }
            .ws__topBarWrapper { z-index: 2; position: relative; background: #000; padding: 10px; color: #fff; }
            .ws__topBar { width: 1020px; max-width: 100%; margin: 0 auto; }
            .ws__topBar:after { content: ""; clear: both; display: table; }
            .ws__logo { width: 130px; height: 32px; background: url("https://fwcdn.pl/front/ogfx/beta/logo.svg") no-repeat center center / contain; float: left; }
            .ws__skip { display: flex; align-items: center; margin: 3px 0 0 8px; padding: 4px 12px; background: #FFC404; color: #000; transition: all .1s linear; font-size: 14px; border: 1px solid #FFC404; white-space: nowrap; float: right; cursor: pointer; border-radius: 2px; }
            .ws__skip:not(.ws__skip--inactive):hover { background: #ffd900; }
            .ws__skip--inactive { background: transparent; border: 1px solid #333; color: #333; cursor: default; }
            .ws__skip .ico { margin-left: .25rem }
            .ws__countdown { margin: 6px 0 0 10px; padding-top: 5px; font-size: 13px; float: right; text-align: right; opacity: 0; transition: opacity .3s ease; }
            .isStarting .ws__countdown { opacity: 1; }
            .ws__iframeWrapper { z-index: 1; width: 100%; height: 100%; }
            .ws__iframe { width: 100%; height: 100%; border: 0; }
        `;static circleCounterCss=`
            .ws__circleCounter { position: absolute; top: .5rem; right: .5rem; width: 32px; height: 32px; opacity: 0; transition: opacity .3s ease; border-radius: 50%; background: #242424; }
            .ws__circleCounter::before { content: ''; position: absolute; top:-16px; left:-16px; width: 64px; height: 64px; }
            .ws__circleCounter::after { content: ''; position: absolute; inset: 0; border: 1px solid #333333; border-radius: 50%; pointer-events: none; transition: border-color .3s ease; }
            .ws__circleCounter .counter, .ws__circleCounter .ico { color: #ccc; }
            .ws__circleCounter .ico { display: none; }
            .ws__circleCounter svg, .ws__circleCounter .counter { display: flex; position: absolute; justify-content: center; align-items: center; inset: 0; width: 32px; height: 32px; pointer-events: none; }
            .ws__circleCounter svg circle { stroke-dasharray: 100px; stroke-dashoffset: 0px; stroke-linecap: round; stroke-width: 1px; stroke: #ffc200; fill: none; }
            .ws__circleCounter svg { z-index: 1; transform: rotateY(-180deg) rotateZ(-90deg); }
            .isStarting .ws__circleCounter { opacity: 1; }
            .isStarting .ws__circleCounter svg circle { animation-name: countdown; animation-timing-function: linear; animation-fill-mode: forwards; }
            .ws__circleCounter.isDone { pointer-events: all; }
            .ws__circleCounter.isDone::after { border: 1px solid #ccc; }
            .ws__circleCounter.isDone .ico { display: flex; justify-content: center; align-items: center; position: absolute; inset: 0; }
            .ws__label { z-index: 1; position: absolute; top: 0; left: 0; width: 36px; height: 14px; font-size: 8px; line-height: 12px; pointer-events: none; border-radius: 0 0 2px 0; background-color: rgba(68, 68, 68, 0.56); color: #fff; text-align: center; }
            @keyframes countdown { from { stroke-dashoffset: 0px; } to { stroke-dashoffset: 100px; } }
        `;static invisibleCss=`
            html, body { background: #fff !important; }
            [class^="ad__"], .placeForAddon, .fa {  z-index: -1 !important; position: fixed !important; top: 100% !important; left: 100% !important; opacity: 0 !important; }
        `;static template=({reducedMobileSkip:e,timeLeft:i,messages:t})=>`
                <div class="ws__wrapper">
                ${e?`<div class="ws__label">${t.label}</div>
                        <div class="ws__circleCounter">
                          <span class="counter"></span>
                          <i class="ico ico--closeThinSmall"></i>
                          <svg><circle cx="50%" cy="50%" r="49%"></circle></svg>
                        </div>`:`<div class="ws__topBarWrapper">
                            <div class="ws__topBar">
                                <div class="ws__logo"></div>
                                <button class="ws__skip ws__skip--inactive">${t.skip}</button>
                                <div class="ws__countdown">
                                    <strong>${t.label}</strong> ${t.forwarding} <span class="counter"> ${i} </span>&nbsp;${t.seconds}
                                </div>
                            </div>
                        </div>`}
                    <div class="ws__iframeWrapper"></div>
                </div>
            `;constructor(e){e&&(this.config=e,this.timeLeft=this.config[o?"timeMobile":"timeDesktop"],this.countdown=null,this.init().catch(console.error))}get reducedMobileSkip(){return this.config.reducedSkip&&o}async init(){this.appendCss(),this.toggleClass(),this.render(),this.bindElements(),this.setCustomStyles(),await this.insertAd(),this.bindMessage(),this.reducedMobileSkip?this.initCircleCounter():this.initSkipMessage(),this.startCountdown(()=>{this.reducedMobileSkip||this.updateRemaining()})}appendCss(){let e=s.coreCss;this.config.hideOtherAds&&(e+=s.invisibleCss),this.reducedMobileSkip&&(e+=s.circleCounterCss),this.styleSheet=a("style",{type:"text/css",attribute:"ws"},document.getElementsByTagName("head")[0]),this.styleSheet.insertAdjacentHTML("beforeend",e)}toggleClass(){document.body.classList.toggle("ws")}render(){document.body.insertAdjacentHTML("afterbegin",s.template({timeLeft:this.timeLeft,reducedMobileSkip:this.reducedMobileSkip,messages:{label:this.reducedMobileSkip?"reklama":"REKLAMA:",forwarding:o?"przekierowanie za ":"Automatyczne przekierowanie nastąpi za",seconds:o?"sek.":"sekund",skip:o?"Przejdź do Filmwebu":'Przejdź do Filmwebu teraz<svg class="ico ico--arrowRight"><use xlink:href="#arrowRight"></use></svg>'}}))}bindElements(){this.element=document.querySelector(".ws__wrapper")}setCustomStyles(){this.element.style.background=this.config.background}async getCityId(){const e=JSON.parse(localStorage.getItem("userLocationPreference"));if(typeof e<"u"&&e!==null)return+e.location.city.id;const i=JSON.parse(localStorage.getItem("cache_logged_info"));return i&&i.prefs.city?i.prefs.city:await fetch((l?IRI.paths:FilmwebSettings).api+"/geoip/cinema?limit=1").then(function(t){return t.json()}).then(function(t){return t.shift()}).then(function(t){return t.city}).catch(function(){return-1})}async insertAd(){const e=await window.rodo.getGDPRApplies(),i=await window.rodo.getGDPRConsent({tcString:window.rodo.TC_STRING.WS}),{creationUrl:t,needCityId:r}=this.config;let n=`gdpr=${e}&gdpr_consent=${i}`;r&&(n+=`&cityId=${await this.getCityId()}`),a("iframe",{class:"ws__iframe",src:`${t}?${n}`},this.element.querySelector(".ws__iframeWrapper"))}bindMessage(){window.addEventListener("message",e=>{e.data&&typeof e.data.indexOf=="function"&&e.data.indexOf("ws_click_event_stop_countdown")>-1&&this.stopCountdown()})}initCircleCounter(){const e=this.element.querySelector(".ws__circleCounter"),i=e.querySelector(".counter");let t=typeof this.config.mobileSkipTimeout<"u"?this.config.mobileSkipTimeout:2;e.querySelector("circle").style.animationDuration=`${t}s`,i.textContent=t;const r=setInterval(()=>{--t,i.textContent=t,t<=0&&(clearInterval(r),i.textContent="",e.classList.add("isDone"),e.addEventListener("click",this.kill.bind(this)))},1e3)}initSkipMessage(){const e=this.element.querySelector(".ws__skip"),i=this.config[o?"mobileSkipTimeout":"displaySkipTimeout"],t=setTimeout(()=>{clearTimeout(t),e.classList.remove("ws__skip--inactive"),e.addEventListener("click",this.kill.bind(this))},(typeof i<"u"?i:2)*1e3)}startCountdown(e){this.countdown=setInterval(()=>{this.timeLeft--,e(),this.timeLeft<=0&&this.kill()},1e3),this.element.classList.add("isStarting")}stopCountdown(){this.countdown&&(clearInterval(this.countdown),this.countdown=null,this.reducedMobileSkip||this.element.classList.remove("isStarting"))}updateRemaining(){const e=this.element.querySelector(".counter");e&&(e.textContent=Math.max(0,this.timeLeft).toString())}kill(){this.stopCountdown(),this.toggleClass(),this.element.parentNode.removeChild(this.element),this.styleSheet.parentNode.removeChild(this.styleSheet),this.config.resolve("closed")}}window.welcomeScreen=new s(window.welcomeScreenConfig),window.IRI&&(IRI.welcomeScreen=window.welcomeScreen)})();
