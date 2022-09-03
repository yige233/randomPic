import fs from 'fs';
import http from 'http';
import path from 'path';

const fsp = fs.promises;

class App {
    constructor() {};
    //将遍历文件夹的结果放在变量里
    picsCache = {
        cache: new Map(),
        time: 0, //时间戳
        flash: 60 * 10 //缓存过期时间：60秒*10=10分钟
    };
    //默认设置
    config = {
        port: 3000,
        allowedPicExt: [".jpg", ".jpeg", ".png"],
        dir: ["./Pics"]
    };
    //请求头，指示响应内容为json
    get headerJson() {
        return {
            'Content-Type': 'application/json; charset=utf-8'
        };
    };
    //获取时间戳，可以指定偏移量
    static now(offset = 0) {
        return Math.floor(new Date() / 1e3) + offset;
    };
    //测试文件夹是否存在
    static async testDir(dir) {
        return await fsp.stat(dir).then(res => res.isDirectory()).catch(err => false);
    };
    //创建文件夹
    static async makeDir(dir) {
        if (await App.testDir(dir)) return; //路径存在，直接返回
        const parentDir = path.parse(dir).dir;
        if (!await App.testDir(parentDir)) await makeDir(parentDir); //父路径不存在，创建父级路径
        await fsp.mkdir(dir).catch(err => {
            console.warn("创建文件夹失败:", err.message);
        });
    };
    //获取url上的请求参数
    static getParam(params = [], param = "") {
        if (params.length == 0) return false;
        for (let i of params) {
            if (i[0] == param) return decodeURIComponent(i[1]);
        };
        return false;
    };
    //将url拆分为请求路径和请求参数
    static splitUrl(url = "") {
        const pathLength = url.indexOf("?");
        if (pathLength == -1) return [url, ""];
        const paramsArr = [];
        const params = url.slice(pathLength + 1).split("&");
        for (let param of params) {
            const [name, value = ""] = param.split("=");
            paramsArr.push([name, value]);
        };
        return [url.slice(0, pathLength), paramsArr];
    };
    //获取文件mime type
    static getMimeType(picPath) {
        const mineTypeTable = new Map([
            [".jpg", "image/jpeg"],
            [".jpeg", "image/jpeg"],
            [".png", "image/png"],
            [".txt", "text/plain"]
        ]);
        const picExt = path.extname(picPath).toLocaleLowerCase();
        return mineTypeTable.get(picExt) || mineTypeTable.get(".txt");
    };
    //获取所有路径下的所有图片。传入一个包含文件夹路径的数组。
    async getAllPics(picDirs) {
        function assign(theNew, theOld) { //将新旧Map进行合并。
            theOld = new Map([...theOld, ...theNew]);
        };

        let singleFolder = async (dir, picsMap) => { //对单个文件夹进行获取文件的操作。
            try {
                const fsHandle = await fsp.readdir(dir); //读取文件夹
                for (let child of fsHandle) { //对于每一个项目：
                    const picPath = path.join(dir, child); //拼接为完整路径
                    const stat = await fsp.stat(picPath);
                    if (stat.isDirectory()) { //如果路径是文件夹，循环调用自身，获取该文件夹下面的图片，并将结果进行合并
                        assign(await singleFolder(picPath, picsMap), picsMap);
                    } else if (this.config.allowedPicExt.includes(path.extname(picPath).toLocaleLowerCase())) { //如果路径是图片：
                        const picName = picPath.replace(/[\\|\/]/g, ":");
                        picsMap.set(picName, {
                            pic: picName,
                            path: picPath,
                            size: stat.size
                        }); //将图片名=>图片路径的对应关系放入Map
                    };
                };
                return picsMap; //返回结果数组和Map
            } catch (err) {
                console.warn("读取文件夹时出现错误:", err);
                return picsMap;
            };
        };
        let picsMap = new Map();
        if (this.picsCache.time <= App.now(~this.picsCache.flash) || this.picsCache.cache.size == 0) { //如果缓存过期或者没有缓存：
            for (let dir of (Array.isArray(picDirs) ? picDirs : [picDirs])) assign(await singleFolder(dir, picsMap), picsMap); //循环遍历多个文件夹。
            this.picsCache.time = App.now(); //打上时间戳
            this.picsCache.cache = picsMap; //更新缓存
            return picsMap;
        };
        return this.picsCache.cache;
    };
    //根据不同操作，获取图片
    async getPics(options = "random", picName = "") {
        const picsMap = await this.getAllPics(this.config.dir);
        const picsArr = [...picsMap.keys()];
        if (picsMap.size == 0) return [false, "没有可用的图片。"]; //没有图片可用
        if (options == "exact") { //通过图片名精确查找图片
            if (picsMap.has(picName)) return [true, picsMap.get(picName)]; //返回该图片的路径
            return [false, "没有找到该图片。"];
        };
        return [true, picsMap.get(picsArr[Math.floor((Math.random() * picsArr.length))])]; //返回随机的图片名（不是路径）
    };
    //监听客户端请求并执行响应操作
    async onRequest(req, res) {
        const [reqPath, reqParams] = App.splitUrl(req.url);
        const json = {};
        res.setHeader('Access-Control-Allow-Origin', '*'); //允许跨域
        //仅允许get方法
        if (req.method.toLocaleLowerCase() != "get") {
            res.writeHead(501, this.headerJson);
            json.message = "只允许使用GET方法。";
            return res.end(JSON.stringify(json));
        };
        //获取随机图片名
        if (reqPath == "/random") {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            const [success, result] = await this.getPics();
            if (success) {
                res.statusCode = 200;
                json.pic = result.pic;
                json.size = result.size;
                json.cachedAt = this.picsCache.time;
            } else {
                res.statusCode = 404;
                json.message = result;
            };
            return res.end(JSON.stringify(json));
        };
        //获取特定图片，由name参数指定
        if (reqPath == "/pic") {
            const picName = App.getParam(reqParams, "name");
            if (!picName) {
                res.writeHead(404, this.headerJson);
                json.message = "需要参数 'name' 来获取指定的图片。";
                return res.end(JSON.stringify(json));
            };
            const [success, result] = await this.getPics("exact", picName);
            if (success) {
                try {
                    const blob = await fsp.readFile(result.path);
                    res.writeHead(200, {
                        'Content-Type': App.getMimeType(result.path)
                    });
                    return res.end(blob);
                } catch (err) {
                    console.warn("发送图片失败:", picName);
                    json.message = "服务端在发送图片时出现了错误。";
                    res.writeHead(500, this.headerJson);
                    return res.end(JSON.stringify(json));
                };
            } else {
                json.message = result;
                res.writeHead(404, this.headerJson);
                return res.end(JSON.stringify(json));
            };
        };
        //刷新缓存
        if (reqPath == "/fresh") {
            this.picsCache.time = 0;
            res.statusCode = 204;
            console.log("缓存被刷新:", App.now());
            return res.end();
        };
        json.message = "你是一个一个一个错误的请求路径哼哼啊啊啊啊啊啊啊啊啊啊啊啊啊啊";
        res.writeHead(404, this.headerJson);
        return res.end(JSON.stringify(json));
    };
    //开启服务，并从config.json中获取配置。
    async start(configJson = "config.json") {
        const configFile = await fsp.open(configJson, "r"),
            configRaw = await configFile.readFile(),
            config = JSON.parse(configRaw.toString());
        configFile.close();
        this.config = {
            port: config.port || 3000,
            allowedPicExt: config.allowedPicExt || [".jpg", ".jpeg", ".png"],
            dir: config.dir ? (Array.isArray(config.dir)) ? config.dir : [config.dir] : ["./Pics"]
        };
        for (let singleDir of this.config.dir) await App.makeDir(singleDir); //如文件夹不存在，则创建文件夹
        const server = http.createServer((req, res) => this.onRequest(req, res));
        server.listen(this.config.port, () => console.log(`服务器启动成功: http://localhost:${this.config.port}`)); //开启服务器
    };
};

new App().start();