/*  q
 *  a
 */ q
const { request, response, persistence, notification } = $loon;

// 
const url = typeof $request !== "undefined" ? $request.url : $response.url;
const host = url.match(/^https?:\/\/([^\/]+)/)[1];
const key = `CF_TOKEN_${host}`;

// 
if (typeof $response !== "undefined") {
    const rawCookie = $response.headers["Set-Cookie"] || $response.headers["set-cookie"];
    if (rawCookie && rawCookie.includes("cf_clearance=")) {
        const val = rawCookie.match(/cf_clearance=([^;]+)/)[0];
        persistence.write(val, key);
        notification.post("实验室报告", host, "通行证同步成功，前辈可以继续阅读了...！");
    }
    $done({});
} 

// 
else if (typeof $request !== "undefined") {
    let headers = { ...$request.headers };
    const saved = persistence.read(key);
    if (saved && !headers["Cookie"]?.includes("cf_clearance=")) {
        headers["Cookie"] = headers["Cookie"] ? `${headers["Cookie"]}; ${saved}` : saved;
    }
    // 
    headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    $done({ headers });
}
