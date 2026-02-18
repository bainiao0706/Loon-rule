/**
 * @file: kuro.js
 * @description: 库街区 & 鸣潮自动签到脚本
 */

const $ = new Env("库街区自动签到");
const saveKey = "kuro_token_key";
const kuroHeaderKey = "kuro_headers_storage";

if (typeof $request !== "undefined") {
    // --- 获取 Token 模式 ---
    getCookie();
} else {
    // --- 定时任务模式 ---
    checkIn();
}

// 1. 获取并保存 Token 的逻辑
function getCookie() {
    if ($request.url.indexOf("signIn") > -1) {
        const token = $request.headers["token"] || $request.headers["Token"];
        if (token) {
            $.setdata(token, saveKey);
            // 同时保存必要的 Header（如 devcode, source）以应对校验
            $.setdata(JSON.stringify($request.headers), kuroHeaderKey);
            $.msg($.name, "成功观测到身份凭证！", "Token 已存入稳态系统，可以开启自动签到。");
        }
    }
    $.done();
}

// 2. 执行签到请求的逻辑
async function checkIn() {
    const token = $.getdata(saveKey);
    const headersStr = $.getdata(kuroHeaderKey);
    
    if (!token) {
        $.msg($.name, "逻辑溢出：未发现 Token", "请先打开库街区 App 并手动签到一次以获取凭证。");
        return $.done();
    }

    const baseHeaders = JSON.parse(headersStr);
    
    // 任务 A: 库街区社区签到
    const bbsOptions = {
        url: "https://api.kurobbs.com/user/signIn",
        headers: baseHeaders,
        body: "gameId=2" // 这里的 gameId 请根据抓包实际情况修改，通常 2 为战双/通用
    };

    // 任务 B: 鸣潮游戏内签到
    const mcOptions = {
        url: "https://api.kurobbs.com/encourage/signIn/v2",
        headers: baseHeaders,
        body: "actId=1" // 鸣潮签到活动的标识符
    };

    $.post(bbsOptions, (err, resp, data) => {
        try {
            const res = JSON.parse(data);
            if (res.code === 200) {
                console.log("库街区签到成功");
            } else {
                console.log("库街区签到响应：" + res.msg);
            }
        } catch (e) { $.logErr(e); }
    });

    $.post(mcOptions, (err, resp, data) => {
        try {
            const res = JSON.parse(data);
            if (res.code === 200) {
                $.msg($.name, "任务完成", "鸣潮游戏签到成功！");
            } else {
                $.msg($.name, "签到异常", res.msg || "未知错误");
            }
        } catch (e) { $.logErr(e); }
        $.done();
    });
}

// --- 基础工具类注入 (简易版 Env) ---
function Env(name) {
    this.name = name;
    this.logErr = (e) => console.log(e);
    this.setdata = (val, key) => $persistentStore.write(val, key);
    this.getdata = (key) => $persistentStore.read(key);
    this.msg = (t, s, c) => $notification.post(t, s, c);
    this.post = (opt, cb) => $httpClient.post(opt, cb);
    this.done = (obj = {}) => $done(obj);
}
