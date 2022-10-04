## randomPic | 简单的api，用于随机输出图片

### 如何使用？

1. 前往[Releases](https://github.com/yige233/randomPic/releases/tag/v1.1)，下载`randomPicForWindows.zip`
2. 解压压缩包，找到`双击启动.cmd`，运行它。
3. 如果命令行黑框中给出了api的url链接（一般是[http://localhost:3000/](http://localhost:3000)），就说明api已经启动成功。
4. 为了使api能够输出图片，还需要向刚刚程序生成的`pics`文件夹中放入一些图片。

以上是默认情况，如果有修改config.json，情况可能会有所不同，比如程序试图使用的端口已经被占用、修改了程序使用的文件夹。

Q:黑框太丑，怎么办？

A:可以把它做成服务，随电脑启动而启动，且在后台持续运行，没有黑框。

1. 前往[Releases](https://github.com/yige233/randomPic/releases/tag/v1.1)，下载`randomPicForWindows.zip`
2. 解压压缩包，找到`安装服务.cmd`，使用管理员身份运行它。
3. 完成！
4. 如果需要卸载服务，那么找到`卸载服务.cmd`，使用管理员身份运行它。

### 一些说明

相对于原repo，这个仓库有如下主要更改：
* 图片文件夹路径改到了 ./pics （无关紧要
* 直接访问网站不再直接提供图片，需要使用下面列出的api：

| 请求路径 | 请求方法 | 请求参数 | 说明 |
| ------- | ------- | ------- | ----- |
|  /random  | get |  无 | 获取随机图片。这不会返回图片本身，而是返回图片的id，以及图片的大小。 |
| /pic  | get | name | 如果name参数正确，会直接返回图片本身。 |
| /fresh  | get | 无 | 刷新程序缓存的图片数据。一般在图片文件有增删，而api还没来得及更新时使用。不过这个api本身没有提供上传等功能…… |

比如：

`get http://localhost:3000/random`

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Date: Sat, 03 Sep 2022 13:28:11 GMT
Connection: close
Content-Length: 88

{
  "pic": "pics:(pid-62668066)春のささやき.png",
  "size": 5921969,
  "cachedAt": 1662211482
}
```


`get http://localhost:3000/pic?name=pics:(pid-62668066)春のささやき.png`

```
Access-Control-Allow-Origin: *
Connection: keep-alive
Content-Type: image/png
Date: Sat, 03 Sep 2022 13:33:30 GMT
Keep-Alive: timeout=5
Transfer-Encoding: chunked

*一堆图片二进制数据*
```

`get http://localhost:3000/fresh`
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Date: Sat, 03 Sep 2022 13:30:01 GMT
Connection: close
```

以及原repo提到的待添加功能，~~那是一个都没有实现~~

实现了多文件夹、遍历文件夹功能，并提供了一个config.json

#### config.json

| 配置项 | 默认值 | 说明 |
| ------- | ------- | ------- |
|  port  | 3000 | 程序使用的端口，如果和其他程序有冲突，就得改成其他的（建议在1000-65535之间） |
| allowedPicExt  | [".jpg", ".jpeg", ".png"] | 只检测拥有这个列表里的格式的文件。理论上讲也可以添加其他非图片的格式，不过这还需要稍微修改一下代码，以便于程序能够正确输出它的MimeType |
| dir  | ["./pics"] | 这项决定了程序将从哪里寻找图片。默认只寻找程序同目录下名为`pics`的文件夹。由于它是一个数组，所以可以添加多个不相干的文件夹。不存在的文件夹路径会自动新建。 |

