/**
 * @file:Manga_Cloudflare_Verification_Cookie
 * @author:bainiao0706
 * @version:9.9.9
 */

//
const { request, response, persistence, notification } = $loon;

//
const getTargetMeta = (url) => {
    if (!url) return null;
    const match = url.match(/^https?:\/\/([^/]+)/);
    if (!match) return null;
    const host = match[1];
    const parts = host.split('.');
    const main = parts.length > 2 ? parts.slice(-2).join('.') : host;
    return { host, main };
};

// 
const currentUrl = (typeof $request !== "undefined" && $request) ? $request.url : (typeof $response !== "undefined" && $response ? $response.url : null);
const meta = getTargetMeta(currentUrl);

if (meta) {
    const keyCookie = `CF_C_${meta.main}`;
    const keyTime = `CF_T_${meta.main}`;
    const TTL = 3 * 24 * 60 * 60 * 1000;

    // 
    if (typeof $response !== "undefined" && $response && $response.headers) {
        const status = $response.status || $response.statusCode;
        const setCookie = $response.headers["Set-Cookie"] || $response.headers["set-cookie"];

        if (setCookie && setCookie.includes("cf_clearance=")) {
            const val = setCookie.match(/cf_clearance=([^;]+)/)[0];
            persistence.write(val, keyCookie);
            persistence.write(Date.now().toString(), keyTime);
            notification.post("👑 通行证已构筑", meta.main, "假期还有：3天。前辈快来玩耍吧...");
        } 
        else if (status === 403 && persistence.read(keyCookie)) {
            persistence.remove(keyCookie);
            persistence.remove(keyTime);
            notification.post("⚠️ 协议失效", meta.main, "大魔王出现啦，前辈快来帮我一下啦。");
        }
    } 

    // 
    else if (typeof $request !== "undefined" && $request && $request.headers) {
        let headers = { ...$request.headers };
        const saved = persistence.read(keyCookie);
        const time = persistence.read(keyTime);
        const delta = Date.now() - (parseInt(time) || 0);

        headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

        if (saved && delta < TTL) {
            if (!headers["Cookie"]?.includes("cf_clearance=")) {
                headers["Cookie"] = headers["Cookie"] ? `${headers["Cookie"]}; ${saved}` : saved;
            }
            // 
            if (headers["Accept"]?.includes("text/html")) {
                headers["Sec-Fetch-Mode"] = "navigate";
                headers["Sec-Fetch-Dest"] = "document";
            }
            $done({ headers });
        } else {
            if (saved && delta >= TTL) {
                persistence.remove(keyCookie);
                persistence.remove(keyTime);
                notification.post("⌛ 假期结束啦", meta.main, "前辈不要忘了我哦~。");
            }
            $done({});
        }
    } else {
        $done({});
    }
} else {
    $done({});
}
