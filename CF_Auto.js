/**
 * @file: 漫画站 CF 通行证全自动托管 (星锚学院：无敌终极最强修复版)
 * @author: Mo Ning (Star-Anchor Academy)
 * @version: 10.0.1 Stable
 */

// 使用解构赋值并赋初始值，防止变量未定义导致的崩溃
const { request, response, persistence, notification } = $loon;

// --- 性能优化：域名提取引擎 ---
const getTargetMeta = (url) => {
    if (!url) return null;
    const match = url.match(/^https?:\/\/([^/]+)/);
    if (!match) return null;
    const host = match[1];
    const parts = host.split('.');
    const main = parts.length > 2 ? parts.slice(-2).join('.') : host;
    return { host, main };
};

// 获取元数据，增加空值保护
const currentUrl = (typeof $request !== "undefined" && $request) ? $request.url : (typeof $response !== "undefined" && $response ? $response.url : null);
const meta = getTargetMeta(currentUrl);

if (meta) {
    const keyCookie = `CF_C_${meta.main}`;
    const keyTime = `CF_T_${meta.main}`;
    const TTL = 3 * 24 * 60 * 60 * 1000;

    // --- 逻辑 1：捕获 (Response 阶段) ---
    // 增加严格的环境检查：只有当 $response 确实存在时才运行
    if (typeof $response !== "undefined" && $response && $response.headers) {
        const status = $response.status || $response.statusCode;
        const setCookie = $response.headers["Set-Cookie"] || $response.headers["set-cookie"];

        if (setCookie && setCookie.includes("cf_clearance=")) {
            const val = setCookie.match(/cf_clearance=([^;]+)/)[0];
            persistence.write(val, keyCookie);
            persistence.write(Date.now().toString(), keyTime);
            notification.post("👑 通行证已构筑", meta.main, "保质期：3天。全系统绿灯放行中...");
        } 
        else if (status === 403 && persistence.read(keyCookie)) {
            persistence.remove(keyCookie);
            persistence.remove(keyTime);
            notification.post("⚠️ 协议失效", meta.main, "CF 守卫已更新，请前辈重新授权。");
        }
    } 

    // --- 逻辑 2：注入 (Request 阶段) ---
    // 增加严格的环境检查：只有当 $request 确实存在时才运行
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
            // 只有主页面访问才注入高级指纹，节省静态资源请求开销
            if (headers["Accept"]?.includes("text/html")) {
                headers["Sec-Fetch-Mode"] = "navigate";
                headers["Sec-Fetch-Dest"] = "document";
            }
            $done({ headers });
        } else {
            if (saved && delta >= TTL) {
                persistence.remove(keyCookie);
                persistence.remove(keyTime);
                notification.post("⌛ 期限已至", meta.main, "3天学术周期结束。");
            }
            $done({});
        }
    } else {
        $done({});
    }
} else {
    $done({});
}
