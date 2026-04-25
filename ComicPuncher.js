/**
 *Pica与禁漫天堂 自动签到脚本
 */

const $ = new Env("ComicPuncher");

// 获取插件面板配置的参数
const args = getArgs();
const PICA_USER = args.pica_email;
const PICA_PW = args.pica_password;
const JM_USER = args.jm_username;
const JM_PW = args.jm_password;

// 哔咔核心常量
const PICA_SECRET = "~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn";
const PICA_API_KEY = "C69BAF41DA5ABD1FFEDC6D2FEA56B";

async function run() {
    if (PICA_USER && PICA_PW) {
        await picaPunch();
    } else {
        $.log("未配置哔咔账号，跳过");
    }

    if (JM_USER && JM_PW) {
        await jmPunch();
    } else {
        $.log("未配置禁漫账号，跳过");
    }
    $.done();
}

// 哔咔签到逻辑
async function picaPunch() {
    $.log("正在执行哔咔签到...");
    try {
        const ts = Math.floor(Date.now() / 1000).toString();
        const nonce = "b1ab87b4800d4d4590a11701b8551afa";
        
        const sign = (path, method) => {
            const raw = (path + ts + nonce + method + PICA_API_KEY).toLowerCase();
            return $crypto.hmac("sha256", PICA_SECRET, raw, "hex");
        };

        // 登录获取 Token
        const loginPath = "auth/sign-in";
        const loginRes = await $.http.post({
            url: `https://picaapi.picacomic.com/${loginPath}`,
            headers: getPicaHeaders(loginPath, "POST", sign),
            body: JSON.stringify({ email: PICA_USER, password: PICA_PW })
        });

        const loginData = JSON.parse(loginRes.body);
        if (loginData.message !== "success") throw new Error("登录失败: " + loginData.message);
        
        const token = loginData.data.token;
        $.log("哔咔登录成功");

        // 执行签到打卡
        const punchPath = "users/punch-in";
        const punchRes = await $.http.post({
            url: `https://picaapi.picacomic.com/${punchPath}`,
            headers: { ...getPicaHeaders(punchPath, "POST", sign), "authorization": token }
        });

        const punchData = JSON.parse(punchRes.body);
        $.log("哔咔签到结果: " + (punchData.message === "success" ? "成功" : punchData.message));
    } catch (e) {
        $.log("哔咔错误: " + e.message);
    }
}

// 禁漫签到活跃逻辑
async function jmPunch() {
    $.log("正在执行禁漫活跃任务...");
    try {
        const url = "https://18comic.vip/login";
        await $.http.post({
            url: url,
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `username=${encodeURIComponent(JM_USER)}&password=${encodeURIComponent(JM_PW)}`
        });
        $.log("禁漫登录请求已发送");
    } catch (e) {
        $.log("禁漫错误: " + e.message);
    }
}

// 辅助函数：构造请求头
function getPicaHeaders(path, method, signFunc) {
    const ts = Math.floor(Date.now() / 1000).toString();
    return {
        "api-key": PICA_API_KEY,
        "signature": signFunc(path, method),
        "time": ts,
        "nonce": "b1ab87b4800d4d4590a11701b8551afa",
        "app-channel": "2",
        "app-version": "2.2.1.2.3.3",
        "app-platform": "android",
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent": "okhttp/3.8.1",
        "accept": "application/vnd.picacomic.com.v1+json"
    };
}

// 获取参数
function getArgs() {
    const obj = {};
    if (typeof $argument !== "undefined" && $argument) {
        $argument.split("&").forEach(item => {
            const [key, val] = item.split("=");
            obj[key] = decodeURIComponent(val);
        });
    }
    return obj;
}

// 环境封装
function Env(name) {
    this.name = name;
    this.log = (m) => console.log(`[${this.name}] ${m}`);
    this.http = {
        post: (opts) => new Promise(res => $httpClient.post(opts, (err, resp, body) => res({ err, resp, body })))
    };
    this.done = () => $done();
}

run();