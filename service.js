import nodeWindows from "node-windows";
import path from 'path';

const Service = nodeWindows.Service;
const [, , option = "install"] = process.argv;

const svc = new Service({
    name: 'randomPicAPI',
    description: '一个可以提供随机图片的HTTP API',
    script: path.resolve("./index.js"),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

svc.on('install', () => {
    console.log("服务名称：", svc.name);
    console.log("服务安装完成……");
    svc.start();
    console.log('服务运行状态:', svc.exists);
});

svc.on('uninstall', () => {
    console.log("服务卸载完成……");
    console.log("服务运行状态:", svc.exists);
});

svc.on("alreadyinstalled", () => {
    console.log("服务已经安装了，无法重复安装……");
});

svc.on("alreadyuninstalled", () => {
    console.log("服务已经卸载了，无法重复卸载……");
});

if (option == "install") {
    svc.install();
} else if (option == "uninstall") {
    svc.uninstall();
} else {
    console.log("未知的命令:", option);
    console.log("使用 install 参数安装服务");
    console.log("使用 uninstall 参数卸载服务");
};