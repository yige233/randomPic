import fs from 'fs';
import http from 'http';
import path from 'path';

const fsp = fs.promises;

class App {
    constructor() {};
    picsCache = {
        cache: [],
        time: 0,
        flash: 60 * 10
    };
    config = {
        port: 3000,
        allowedPicExt: [".jpg", ".jpeg", ".png"],
        dir: ["./Pics"]
    };
    get headerJson() {
        return {
            'Content-Type': 'application/json; charset=utf-8'
        };
    };
    static now(offset = 0) {
        return Math.floor(new Date() / 1e3) + offset;
    };
    static async testDir(dir) {
        return await fsp.stat(dir).then(res => res.isDirectory()).catch(err => false);
    };
    static async makeDir(dir) {
        if (await App.testDir(dir)) return; //路径存在，直接返回
        const parentDir = path.parse(dir).dir;
        if (!await App.testDir(parentDir)) await makeDir(parentDir); //父路径不存在，创建父级路径
        await fsp.mkdir(dir).catch(err => {
            console.warn("创建文件夹失败:", err.message);
        });
    };
    static getParam(params = [], param = "") {
        if (params.length == 0) return false;
        for (let i of params) {
            if (i[0] == param) return decodeURIComponent(i[1]);
        };
        return false;
    };
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
    static getMimeType(picPath) {
        const picExt = path.extname(picPath).toLocaleLowerCase();
        if (picExt == ".png") return "image/png";
        if (picExt == ".jpg" || picExt == ".jpeg") return "image/jpeg";
        return false;
    };
    async getAllPics(picDirs, picsArr = [], picsMap = new Map()) {
        function assign(theNew, theOld) {
            theOld[0].push(...theNew[0]);
            theOld[1] = new Map([...theOld[1], ...theNew[1]]);
        };

        let singleFolder = async (dir, picsArr, picsMap) => {
            try {
                const fsHandle = await fsp.readdir(dir);
                for (let child of fsHandle) {
                    const picPath = path.join(dir, child);
                    const stat = await fsp.stat(picPath);
                    if (stat.isDirectory()) {
                        assign(await singleFolder(picPath, picsArr, picsMap), [picsArr, picsMap]);
                    } else if (this.config.allowedPicExt.includes(path.extname(picPath).toLocaleLowerCase())) {
                        const picName = picPath.replace(/[\\|\/]/g, ":");
                        picsArr.push(picName);
                        picsMap.set(picName, picPath);
                    };
                };
                return [picsArr, picsMap];
            } catch (err) {
                console.warn("读取文件夹时出现错误:", err);
                return [picsArr, picsMap];
            };
        };
        for (let dir of (Array.isArray(picDirs) ? picDirs : [picDirs])) assign(await singleFolder(dir, picsArr, picsMap), [picsArr, picsMap]);
        return [picsArr, picsMap];
    };
    async getPics(options = "random", picName = "") {
        const [picsArr, picsMap] = await (async () => {
            if (this.picsCache.time <= App.now(~this.picsCache.flash) || !this.picsCache.cache.length) {
                this.picsCache.cache = await this.getAllPics(this.config.dir);
                this.picsCache.time = App.now();
            };
            return this.picsCache.cache;
        })();
        if (picsMap.size == 0) return [false, "没有可用的图片。"];
        if (options == "exact") {
            if (picsMap.has(picName)) return [true, picsMap.get(picName)];
            return [false, "没有找到该图片。"];
        };
        return [true, picsArr[Math.floor((Math.random() * picsArr.length))]];
    };
    async server(req, res) {
        const [reqPath, reqParams] = App.splitUrl(req.url);
        const json = {};
        res.setHeader('Access-Control-Allow-Origin', '*'); //允许跨域
        //仅允许get方法
        if (req.method.toLocaleLowerCase() != "get") {
            res.writeHead(501, this.headerJson);
            json.message = "只允许使用GET方法。";
            return res.end(JSON.stringify(json));
        };
        //获取随机图片名称
        if (reqPath == "/random") {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            const [success, result] = await this.getPics();
            if (success) {
                res.statusCode = 200;
                json.pic = result;
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
                    res.writeHead(200, {
                        'Content-Type': App.getMimeType(result)
                    });
                    return res.end(await fsp.readFile(result));
                } catch (err) {
                    console.warn("发送图片失败:", picName);
                    res.writeHead(500, this.headerJson);
                    json.message = "服务端在发送图片时出现了错误。";
                    return res.end(JSON.stringify(json));
                };
            } else {
                res.writeHead(404, this.headerJson);
                json.message = result;
                return res.end(JSON.stringify(json));
            };
        };
        res.writeHead(404, this.headerJson);
        json.message = "你是一个一个一个错误的请求路径哼哼啊啊啊啊啊啊啊啊啊啊啊啊啊啊";
        return res.end(JSON.stringify(json));
    };
    async start(congfigFile = "config.json") {
        const configFile = await fsp.open(congfigFile, "r"),
            configRaw = await configFile.readFile(),
            config = JSON.parse(configRaw.toString());
        configFile.close();
        this.config = {
            port: config.port || 3000,
            allowedPicExt: config.allowedPicExt || [".jpg", ".jpeg", ".png"],
            dir: config.dir ? (Array.isArray(config.dir)) ? config.dir : [config.dir] : ["./Pics"]
        };
        for (let singleDir of this.config.dir) await App.makeDir(singleDir);
        const server = http.createServer();
        server.addListener("request", (req, res) => this.server(req, res));
        server.listen(this.config.port, () => console.log(`服务器启动成功: http://localhost:${this.config.port}`));
    };
};

new App().start();