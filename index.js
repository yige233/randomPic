import fs from 'fs';
import http from 'http';
import path from 'path';

const fsp = fs.promises;
const headerJson = {
    'Content-Type': 'application/json; charset=utf-8'
};

const dir = './pics'; //这里配置图片文件夹路径
const allowedPicExt = [".jpg", ".jpeg", ".png"]; //这里配置允许的图片类型
const port = 3000; //这里配置服务器使用的端口


//路径是否存在
async function testDir(dir) {
    return await fsp.stat(dir).then(res => res.isDirectory()).catch(err => false);
};

//创建路径
async function makeDir(dir) {
    if (await testDir(dir)) return; //路径存在，直接返回
    const parentDir = path.parse(dir).dir;
    if (!await testDir(parentDir)) await makeDir(parentDir); //父路径不存在，创建父级路径
    await fsp.mkdir(dir).catch(err => {
        console.warn("创建文件夹失败:", err.message);
    });
};

// 获取图片
async function getPics(picDir, options = "random", picName = "") {
    const PicsArr = []; //仅包含图片名的数组
    const Pics = new Map(); //包含图片名-图片路径对的Map
    await fsp.readdir(picDir).then(async res => {
        for (let pic of res) {
            PicsArr.push(pic);
            const picPath = path.join(picDir, pic);
            await fsp.stat(picPath).then(stat => {
                if (!stat.isDirectory() && allowedPicExt.includes(path.extname(picPath).toLocaleLowerCase())) Pics.set(pic, picPath);
            });
        };
    }).catch(err => {
        console.warn("获取图片文件列表失败:", err);
        return;
    });
    if (Pics.size == 0) return [false, "没有可用的图片。"];
    if (options == "exact") {
        if (Pics.has(picName)) return [true, Pics.get(picName)];
        return [false, "没有找到该图片。"];
    };
    return [true, PicsArr[Math.floor(Math.random() * (PicsArr.length + 1))]];
};

//切分url，以获取请求路径和请求参数
function splitUrl(url = "") {
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

//查询特定参数
function getParam(params = [], param = "") {
    if (params.length == 0) return false;
    for (let i of params) {
        if (i[0] == param) return decodeURIComponent(i[1]);
    };
    return false;
};

//根据扩展名获取mimetype
function getMimeType(picPath) {
    const picExt = path.extname(picPath).toLocaleLowerCase();
    if (picExt == ".png") return "image/png";
    if (picExt == ".jpg" || picExt == ".jpeg") return "image/jpeg";
    return false;
};

//监听请求
async function server(req, res) {
    const [reqPath, reqParams] = splitUrl(req.url);
    const json = {};
    res.setHeader('Access-Control-Allow-Origin', '*'); //允许跨域
    //仅允许get方法
    if (req.method.toLocaleLowerCase() != "get") {
        res.writeHead(501, headerJson);
        json.message = "只允许使用GET方法。";
        return res.end(JSON.stringify(json));
    };
    //获取随机图片名称
    if (reqPath == "/random") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        const [success, result] = await getPics(dir);
        if (success) {
            res.statusCode = 200;
            json.pic = result;
        } else {
            res.statusCode = 404;
            json.message = result;
        };
        return res.end(JSON.stringify(json));
    };
    //获取特定图片，由name参数指定
    if (reqPath == "/pic") {
        const picName = getParam(reqParams, "name");
        if (!picName) {
            res.writeHead(404, headerJson);
            json.message = "需要参数 'name' 来获取指定的图片。";
            return res.end(JSON.stringify(json));
        };
        const [success, result] = await getPics(dir, "exact", picName);
        if (success) {
            try {
                res.writeHead(200, {
                    'Content-Type': getMimeType(result)
                });
                return res.end(await fsp.readFile(result));
            } catch (err) {
                console.warn("发送图片失败:", picName);
                res.writeHead(500, headerJson);
                json.message = "服务端在发送图片时出现了错误。";
                return res.end(JSON.stringify(json));
            };
        } else {
            res.writeHead(404, headerJson);
            json.message = result;
            return res.end(JSON.stringify(json));
        };
    };
    res.writeHead(404, headerJson);
    json.message = "你是一个一个一个错误的请求路径哼哼啊啊啊啊啊啊啊啊啊啊啊啊啊啊";
    return res.end(JSON.stringify(json));
};

//创建文件夹，并开启服务器
await makeDir(dir).then(() => http.createServer(server).listen(port, () => console.log(`服务器启动成功: http://localhost:${port}`)));