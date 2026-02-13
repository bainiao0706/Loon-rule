/**
 * @file: 漫画CF Cookie全自动托管
 * @author:bainiao0706
 * @version:9.9.9 Infinite
 */

const { request, response, persistence, notification } = $loon;

//
const TTL = 3 * 24 * 60 * 60 * 1000; // 3天保质期
const GLOBAL_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

// 
const getTargetMeta = (url) => {
    const host = url.match(/^https?:\/\/([^/]+)/)[1];
    const parts = host.split('.');
    const main = parts.slice(-2).join('.');
    return { host, main };
};

const meta = getTargetMeta(typeof $request !== "undefined" ? $request.url : $response.url);
const keyCookie = `CF_C_${meta.main}`;
const keyTime = `CF_T_${meta.main}`;

// 
if (typeof $response !== "undefined") {
    const status = $response.status || $response.statusCode;
    const setCookie = $response.headers["Set-Cookie"] || $response.headers["set-cookie"];

    // 
    if (setCookie && setCookie.includes("cf_clearance=")) {
        const val = setCookie.match(/cf_clearance=([^;]+)/)[0];
        persistence.write(val, keyCookie);
        persistence.write(Date.now().toString(), keyTime);
        notification.post("👑 通行证已构筑", meta.main, "保质期：3天。全系统绿灯放行中...");
    } 
    // 
    else if (status === 403 && persistence.read(keyCookie)) {
        persistence.remove(keyCookie);
        persistence.remove(keyTime);
        notification.post("⚠️ 协议失效", meta.main, "守卫已更新，请前辈重新授权。");
    }
    $done({});
} 

// 
else if (typeof $request !== "undefined") {
    // 
    const isMainPage = $request.headers["Accept"]?.includes("text/html");
    let headers = { ...$request.headers };
    
    const saved = persistence.read(keyCookie);
    const time = persistence.read(keyTime);
    const delta = Date.now() - (parseInt(time) || 0);

    // 
    headers["User-Agent"] = GLOBAL_UA;

    if (saved && delta < TTL) {
        // 
        if (!headers["Cookie"]?.includes("cf_clearance=")) {
            headers["Cookie"] = headers["Cookie"] ? `${headers["Cookie"]}; ${saved}` : saved;
        }

        //
        if (isMainPage) {
            headers["Sec-Fetch-Site"] = "none";
            headers["Sec-Fetch-Mode"] = "navigate";
            headers["Sec-Fetch-Dest"] = "document";
        }
        
        $done({ headers });
    } else {
        // 
        if (saved && delta >= TTL) {
            persistence.remove(keyCookie);
            persistence.remove(keyTime);
            notification.post("⌛ 期限已至", meta.main, "3天假期结束啦，期待前辈的再次激活。");
        }
        $done({ headers });
    }
}
