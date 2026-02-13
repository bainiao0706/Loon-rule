/**
 * @file: 漫画站 CF 通行证全自动托管 (星锚学院：无敌终极最强版)
 * @author: Mo Ning (Star-Anchor Academy)
 * @version: 9.9.9 Infinite
 */

const { request, response, persistence, notification } = $loon;

// --- 学术常数设置 ---
const TTL = 3 * 24 * 60 * 60 * 1000; // 3天保质期
const GLOBAL_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

// --- 性能优化：快速提取主域名 ---
const getTargetMeta = (url) => {
    const host = url.match(/^https?:\/\/([^/]+)/)[1];
    const parts = host.split('.');
    const main = parts.slice(-2).join('.');
    return { host, main };
};

const meta = getTargetMeta(typeof $request !== "undefined" ? $request.url : $response.url);
const keyCookie = `CF_C_${meta.main}`;
const keyTime = `CF_T_${meta.main}`;

// --- 逻辑 1：捕获 (Response) - 极速响应模式 ---
if (typeof $response !== "undefined") {
    const status = $response.status || $response.statusCode;
    const setCookie = $response.headers["Set-Cookie"] || $response.headers["set-cookie"];

    // 只有在包含核心验证字段时才执行存储逻辑，节省 I/O 功耗
    if (setCookie && setCookie.includes("cf_clearance=")) {
        const val = setCookie.match(/cf_clearance=([^;]+)/)[0];
        persistence.write(val, keyCookie);
        persistence.write(Date.now().toString(), keyTime);
        notification.post("👑 通行证已构筑", meta.main, "保质期：3天。全系统绿灯放行中...");
    } 
    // 智能自愈：403 异常感知
    else if (status === 403 && persistence.read(keyCookie)) {
        persistence.remove(keyCookie);
        persistence.remove(keyTime);
        notification.post("⚠️ 协议失效", meta.main, "CF 守卫已更新，请前辈重新授权。");
    }
    $done({});
} 

// --- 逻辑 2：注入 (Request) - 极致省电模式 ---
else if (typeof $request !== "undefined") {
    // 性能优化：跳过非必要的二进制/流媒体指纹伪装（如图片请求仅注入 Cookie）
    const isMainPage = $request.headers["Accept"]?.includes("text/html");
    let headers = { ...$request.headers };
    
    const saved = persistence.read(keyCookie);
    const time = persistence.read(keyTime);
    const delta = Date.now() - (parseInt(time) || 0);

    // 注入核心指纹
    headers["User-Agent"] = GLOBAL_UA;

    if (saved && delta < TTL) {
        // 动态注入 Cookie
        if (!headers["Cookie"]?.includes("cf_clearance=")) {
            headers["Cookie"] = headers["Cookie"] ? `${headers["Cookie"]}; ${saved}` : saved;
        }

        // 如果是主页面访问，增加高阶学术伪装，性能消耗极低
        if (isMainPage) {
            headers["Sec-Fetch-Site"] = "none";
            headers["Sec-Fetch-Mode"] = "navigate";
            headers["Sec-Fetch-Dest"] = "document";
        }
        
        $done({ headers });
    } else {
        // 过期清理逻辑
        if (saved && delta >= TTL) {
            persistence.remove(keyCookie);
            persistence.remove(keyTime);
            notification.post("⌛ 期限已至", meta.main, "3天学术周期结束，期待您的再次激活。");
        }
        $done({ headers });
    }
}
